from datetime import date

from django.db import connection, transaction
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.agencies.models import Agency
from apps.branches.models import Branch
from apps.catalog.models import Package, PackagePrice, Service, ServiceCategory, ServiceTechnicalField
from apps.common.tenant import set_current_company, set_current_tenant
from apps.companies.models import Company
from apps.iam.models import CompanyMembership, MembershipRole, Permission, Role, RolePermission, TenantMembership, User
from apps.noc.models import NetworkResource
from apps.tenancy.models import Tenant
from .models import Customer, CustomerService


class Full02DomainTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.permissions = []
        for key in ("customers.view", "customers.manage", "services.view", "services.manage", "packages.view", "packages.manage", "noc.view", "noc.manage"):
            cls.permissions.append(Permission.objects.create(key=key, name=key))
        cls.tenant_a = Tenant.objects.create(code="F02-A", name="FULL02 A", status="active")
        cls.tenant_b = Tenant.objects.create(code="F02-B", name="FULL02 B", status="active")
        cls.user_a = User.objects.create_user(email="f02a@example.invalid", password="TestPass123!", full_name="A")
        cls.user_b = User.objects.create_user(email="f02b@example.invalid", password="TestPass123!", full_name="B")
        cls.data = {}
        for tenant, user, suffix in ((cls.tenant_a, cls.user_a, "A"), (cls.tenant_b, cls.user_b, "B")):
            with transaction.atomic():
                set_current_tenant(tenant.id, local=True)
                company = Company.objects.create(tenant=tenant, code=suffix, legal_name=f"Company {suffix}", is_primary=True)
                set_current_company(company.id, local=True)
                branch = Branch.objects.create(tenant=tenant, company=company, code="HQ", name="HQ")
                agency = Agency.objects.create(tenant=tenant, company=company, branch=branch, code="MAIN", name="Main")
                membership = TenantMembership.objects.create(tenant=tenant, user=user, status="active")
                CompanyMembership.objects.create(
                    tenant=tenant,
                    membership=membership,
                    company=company,
                    status=CompanyMembership.Status.ACTIVE,
                    is_default=True,
                )
                role = Role.objects.create(tenant=tenant, key="manager", name="Manager", status="active")
                for perm in cls.permissions:
                    RolePermission.objects.create(tenant=tenant, role=role, permission=perm)
                MembershipRole.objects.create(tenant=tenant, membership=membership, role=role)
                category = ServiceCategory.objects.create(tenant=tenant, code="DSL", name_english="DSL")
                service = Service.objects.create(tenant=tenant, category=category, code="ADSL", name_english="ADSL", name_dari="ADSL", name_pashto="ADSL", status="active", translation_status="complete", supports_noc=True)
                ServiceTechnicalField.objects.create(tenant=tenant, service=service, key="dsl_number", label_english="DSL Number", field_type="text", required=True)
                package = Package.objects.create(tenant=tenant, service=service, code=f"PKG-{suffix}", name_english="Test Package", package_type="unlimited", speed_mbps=10, period_months=1, status="active")
                PackagePrice.objects.create(tenant=tenant, package=package, amount=1000, currency="AFN", effective_from=date(2026,1,1), status="active")
                customer = Customer.objects.create(tenant=tenant, company=company, branch=branch, agency=agency, code=f"CUS-{suffix}", display_name=f"Customer {suffix}")
                customer_service = CustomerService.objects.create(tenant=tenant, customer=customer, service=service, package=package, branch=branch, agency=agency, identifier=f"DSL-{suffix}", status="pending", technical_values={"dsl_number": f"DSL-{suffix}"})
                resource = NetworkResource.objects.create(
                    tenant=tenant,
                    company=company,
                    branch=branch,
                    code=f"PORT-{suffix}",
                    name=f"Port {suffix}",
                    resource_type="dslam_port",
                )
                cls.data[suffix] = {"company": company, "branch": branch, "agency": agency, "service": service, "package": package, "customer": customer, "customer_service": customer_service, "resource": resource}

    def token(self, user):
        return str(RefreshToken.for_user(user).access_token)

    def client_for(self, user, tenant):
        client = APIClient()

        company = (
            self.data["A"]["company"]
            if tenant.id == self.tenant_a.id
            else self.data["B"]["company"]
        )

        client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self.token(user)}",
            HTTP_X_TENANT_ID=str(tenant.id),
            HTTP_X_COMPANY_ID=str(company.id),
        )

        return client

    def test_customer_api_isolation(self):
        response = self.client_for(self.user_a, self.tenant_a).get("/api/v1/customers/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([r["code"] for r in response.json()["results"]], ["CUS-A"])

    def test_database_rls_filters_service_catalog(self):
        with transaction.atomic():
            set_current_tenant(self.tenant_a.id, local=True)
            with connection.cursor() as cursor:
                cursor.execute("SELECT code FROM catalog_services ORDER BY code")
                self.assertEqual([r[0] for r in cursor.fetchall()], ["ADSL"])

    def test_cross_tenant_package_rejected(self):
        client = self.client_for(self.user_a, self.tenant_a)
        payload = {
            "customer": str(self.data["A"]["customer"].id),
            "service": str(self.data["A"]["service"].id),
            "package": str(self.data["B"]["package"].id),
            "branch": str(self.data["A"]["branch"].id),
            "agency": str(self.data["A"]["agency"].id),
            "identifier": "DSL-A-NEW",
            "status": "pending",
            "technical_values": {"dsl_number": "DSL-A-NEW"},
        }
        response = client.post("/api/v1/customer-services/", payload, format="json")
        self.assertEqual(response.status_code, 400)

    def test_required_technical_field_enforced(self):
        client = self.client_for(self.user_a, self.tenant_a)
        payload = {
            "customer": str(self.data["A"]["customer"].id),
            "service": str(self.data["A"]["service"].id),
            "package": str(self.data["A"]["package"].id),
            "identifier": "DSL-A-NO-TECH",
            "status": "pending",
            "technical_values": {},
        }
        response = client.post("/api/v1/customer-services/", payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("technical_values", response.json())

    def test_current_package_price(self):
        with transaction.atomic():
            set_current_tenant(self.tenant_a.id, local=True)
            price = self.data["A"]["package"].current_price(date(2026, 9, 13))
            self.assertIsNotNone(price)
            self.assertEqual(str(price.amount), "1000.00")
