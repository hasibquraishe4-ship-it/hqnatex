from django.db import transaction
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.agencies.models import Agency
from apps.branches.models import Branch
from apps.common.tenant import set_current_company, set_current_tenant
from apps.companies.models import Company
from apps.customers.models import Customer
from apps.iam.models import (
    CompanyMembership,
    MembershipRole,
    Permission,
    Role,
    RolePermission,
    TenantMembership,
    User,
)
from apps.noc.models import NetworkResource
from apps.tenancy.models import Tenant


class Stage11CompanyScopeTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.tenant = Tenant.objects.create(
            code="S11-A",
            name="Stage11 Tenant A",
            status="active",
        )

        cls.other_tenant = Tenant.objects.create(
            code="S11-B",
            name="Stage11 Tenant B",
            status="active",
        )

        cls.user = User.objects.create_user(
            email="stage11@example.invalid",
            password="TestPass123!",
            full_name="Stage11 User",
        )

        with transaction.atomic():
            set_current_tenant(cls.tenant.id, local=True)

            cls.membership = TenantMembership.objects.create(
                tenant=cls.tenant,
                user=cls.user,
                status=TenantMembership.Status.ACTIVE,
            )

            cls.role = Role.objects.create(
                tenant=cls.tenant,
                key="stage11_viewer",
                name="Stage11 Viewer",
                status="active",
            )

            for key in ("customers.view", "noc.view"):
                permission = Permission.objects.create(
                    key=key,
                    name=key,
                )

                RolePermission.objects.create(
                    tenant=cls.tenant,
                    role=cls.role,
                    permission=permission,
                )

            MembershipRole.objects.create(
                tenant=cls.tenant,
                membership=cls.membership,
                role=cls.role,
            )

            cls.company_a = Company.objects.create(
                tenant=cls.tenant,
                code="S11-CA",
                legal_name="Stage11 Company A",
                status="active",
                is_primary=True,
            )

            cls.company_b = Company.objects.create(
                tenant=cls.tenant,
                code="S11-CB",
                legal_name="Stage11 Company B",
                status="active",
                is_primary=False,
            )

            cls.company_ungranted = Company.objects.create(
                tenant=cls.tenant,
                code="S11-CU",
                legal_name="Stage11 Ungranted",
                status="active",
                is_primary=False,
            )

            cls.company_suspended = Company.objects.create(
                tenant=cls.tenant,
                code="S11-CS",
                legal_name="Stage11 Suspended",
                status="active",
                is_primary=False,
            )

            CompanyMembership.objects.create(
                tenant=cls.tenant,
                membership=cls.membership,
                company=cls.company_a,
                status=CompanyMembership.Status.ACTIVE,
                is_default=True,
            )

            CompanyMembership.objects.create(
                tenant=cls.tenant,
                membership=cls.membership,
                company=cls.company_b,
                status=CompanyMembership.Status.ACTIVE,
                is_default=False,
            )

            CompanyMembership.objects.create(
                tenant=cls.tenant,
                membership=cls.membership,
                company=cls.company_suspended,
                status=CompanyMembership.Status.SUSPENDED,
                is_default=False,
            )

        with transaction.atomic():
            set_current_tenant(cls.other_tenant.id, local=True)

            cls.other_company = Company.objects.create(
                tenant=cls.other_tenant,
                code="S11-OTHER",
                legal_name="Other Tenant Company",
                status="active",
                is_primary=True,
            )

        cls.objects = {}

        for label, company in (
            ("A", cls.company_a),
            ("B", cls.company_b),
        ):
            with transaction.atomic():
                set_current_tenant(cls.tenant.id, local=True)
                set_current_company(company.id, local=True)

                branch = Branch.objects.create(
                    tenant=cls.tenant,
                    company=company,
                    code=f"HQ-{label}",
                    name=f"HQ {label}",
                    status="active",
                )

                agency = Agency.objects.create(
                    tenant=cls.tenant,
                    company=company,
                    branch=branch,
                    code=f"AG-{label}",
                    name=f"Agency {label}",
                    status="active",
                )

                customer = Customer.objects.create(
                    tenant=cls.tenant,
                    company=company,
                    branch=branch,
                    agency=agency,
                    code=f"CUS-{label}",
                    display_name=f"Customer {label}",
                )

                resource = NetworkResource.objects.create(
                    tenant=cls.tenant,
                    company=company,
                    branch=branch,
                    code=f"PORT-{label}",
                    name=f"Port {label}",
                    resource_type="dslam_port",
                )

                cls.objects[label] = {
                    "customer": customer,
                    "resource": resource,
                }

    def token(self):
        return str(
            RefreshToken.for_user(self.user).access_token
        )

    def api_client(self, company=None):
        client = APIClient()

        headers = {
            "HTTP_AUTHORIZATION": f"Bearer {self.token()}",
            "HTTP_X_TENANT_ID": str(self.tenant.id),
        }

        if company is not None:
            headers["HTTP_X_COMPANY_ID"] = str(company.id)

        client.credentials(**headers)
        return client

    @staticmethod
    def result_rows(response):
        payload = response.json()

        if isinstance(payload, dict):
            return payload.get("results", payload)

        return payload

    def test_missing_company_header_is_rejected(self):
        response = self.api_client().get(
            "/api/v1/customers/"
        )
        self.assertEqual(response.status_code, 400)

    def test_invalid_company_header_is_rejected(self):
        client = APIClient()

        client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self.token()}",
            HTTP_X_TENANT_ID=str(self.tenant.id),
            HTTP_X_COMPANY_ID="not-a-uuid",
        )

        response = client.get(
            "/api/v1/customers/"
        )

        self.assertEqual(response.status_code, 400)

    def test_ungranted_company_is_rejected(self):
        response = self.api_client(
            self.company_ungranted
        ).get(
            "/api/v1/customers/"
        )

        self.assertEqual(response.status_code, 403)

    def test_suspended_company_grant_is_rejected(self):
        response = self.api_client(
            self.company_suspended
        ).get(
            "/api/v1/customers/"
        )

        self.assertEqual(response.status_code, 403)

    def test_cross_tenant_company_is_rejected(self):
        response = self.api_client(
            self.other_company
        ).get(
            "/api/v1/customers/"
        )

        self.assertEqual(response.status_code, 403)

    def test_company_a_customer_isolation(self):
        response = self.api_client(
            self.company_a
        ).get(
            "/api/v1/customers/"
        )

        self.assertEqual(response.status_code, 200)

        codes = [
            row["code"]
            for row in self.result_rows(response)
        ]

        self.assertEqual(codes, ["CUS-A"])

    def test_company_b_customer_isolation(self):
        response = self.api_client(
            self.company_b
        ).get(
            "/api/v1/customers/"
        )

        self.assertEqual(response.status_code, 200)

        codes = [
            row["code"]
            for row in self.result_rows(response)
        ]

        self.assertEqual(codes, ["CUS-B"])

    def test_company_a_noc_isolation(self):
        response = self.api_client(
            self.company_a
        ).get(
            "/api/v1/noc/resources/"
        )

        self.assertEqual(response.status_code, 200)

        codes = [
            row["code"]
            for row in self.result_rows(response)
        ]

        self.assertEqual(codes, ["PORT-A"])
