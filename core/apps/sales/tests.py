from datetime import date
from decimal import Decimal

from django.db import connection, transaction
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.agencies.models import Agency
from apps.billing.models import Invoice, Payment, PaymentAllocation, Receipt, Receivable
from apps.billing.services import post_payment
from apps.branches.models import Branch
from apps.catalog.models import Package, PackagePrice, Service, ServiceCategory
from apps.common.tenant import set_current_tenant
from apps.companies.models import Company
from apps.customers.models import Customer, CustomerService
from apps.iam.models import MembershipRole, Permission, Role, RolePermission, TenantMembership, User
from apps.revenue.models import RevenueTransaction, ShareRule
from apps.sales.models import Sale, SaleItem
from apps.sales.services import post_sale
from apps.tenancy.models import Tenant


class Full03FinancialFlowTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        keys = [
            "sales.view", "sales.manage", "sales.post",
            "billing.view", "billing.manage", "billing.payments.post",
            "revenue.view", "revenue.rules.manage",
        ]
        cls.permissions = [Permission.objects.create(key=k, name=k) for k in keys]
        cls.tenant_a = Tenant.objects.create(code="F03-A", name="FULL03 A", status="active")
        cls.tenant_b = Tenant.objects.create(code="F03-B", name="FULL03 B", status="active")
        cls.user_a = User.objects.create_user(email="f03a@example.invalid", password="TestPass123!", full_name="A")
        cls.user_b = User.objects.create_user(email="f03b@example.invalid", password="TestPass123!", full_name="B")
        cls.data = {}

        for tenant, user, suffix in (
            (cls.tenant_a, cls.user_a, "A"),
            (cls.tenant_b, cls.user_b, "B"),
        ):
            with transaction.atomic():
                set_current_tenant(tenant.id, local=True)
                company = Company.objects.create(
                    tenant=tenant, code=suffix, legal_name=f"Company {suffix}", is_primary=True
                )
                branch = Branch.objects.create(tenant=tenant, company=company, code="HQ", name="HQ")
                agency = Agency.objects.create(
                    tenant=tenant, company=company, branch=branch, code="MAIN", name="Main Agency"
                )
                membership = TenantMembership.objects.create(tenant=tenant, user=user, status="active")
                role = Role.objects.create(tenant=tenant, key="manager", name="Manager", status="active")
                for perm in cls.permissions:
                    RolePermission.objects.create(tenant=tenant, role=role, permission=perm)
                MembershipRole.objects.create(tenant=tenant, membership=membership, role=role)

                category = ServiceCategory.objects.create(tenant=tenant, code="DSL", name_english="DSL")
                service = Service.objects.create(
                    tenant=tenant, category=category, code="ADSL", name_english="ADSL",
                    name_dari="ADSL", name_pashto="ADSL", status="active", translation_status="complete"
                )
                package = Package.objects.create(
                    tenant=tenant, service=service, code=f"PKG-{suffix}", name_english="Test Package",
                    package_type="unlimited", speed_mbps=10, period_months=1, status="active"
                )
                PackagePrice.objects.create(
                    tenant=tenant, package=package, amount=1000, currency="AFN",
                    effective_from=date(2026, 1, 1), status="active"
                )
                customer = Customer.objects.create(
                    tenant=tenant, company=company, branch=branch, agency=agency,
                    code=f"CUS-{suffix}", display_name=f"Customer {suffix}"
                )
                customer_service = CustomerService.objects.create(
                    tenant=tenant, customer=customer, service=service, package=package,
                    branch=branch, agency=agency, identifier=f"DSL-{suffix}", status="pending"
                )
                rule = ShareRule.objects.create(
                    tenant=tenant, company=company, agency=agency, service=service,
                    code=f"RULE-{suffix}", status="active", effective_from=date(2026, 1, 1),
                    partner_share_percent=Decimal("70"), company_base_share_percent=Decimal("15"),
                    agency_gross_share_percent=Decimal("15"), agency_tax_enabled=True,
                    agency_tax_percent=Decimal("10"),
                )
                cls.data[suffix] = {
                    "tenant": tenant, "company": company, "branch": branch, "agency": agency,
                    "service": service, "package": package, "customer": customer,
                    "customer_service": customer_service, "rule": rule,
                }

    def token(self, user):
        return str(RefreshToken.for_user(user).access_token)

    def client_for(self, user, tenant):
        client = APIClient()
        client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self.token(user)}",
            HTTP_X_TENANT_ID=str(tenant.id),
        )
        return client

    def make_sale(self, suffix="A", amount=Decimal("1000.00"), discount=Decimal("0.00")):
        d = self.data[suffix]
        sale = Sale.objects.create(
            tenant=d["tenant"], company=d["company"], branch=d["branch"], agency=d["agency"],
            customer=d["customer"], customer_service=d["customer_service"],
            sale_number=f"SALE-{suffix}-{Sale.objects.count()+1}",
            sale_type="renewal", sale_date=date(2026, 9, 14), currency="AFN",
            discount_amount=discount,
        )
        SaleItem.objects.create(
            tenant=d["tenant"], sale=sale, line_no=1, item_type="package",
            service=d["service"], package=d["package"], description_snapshot="Test Package",
            quantity=Decimal("1"), unit_price=amount, share_eligible=True,
        )
        sale.recalculate_totals()
        return sale

    def test_post_sale_creates_invoice_receivable_revenue_and_share_snapshot(self):
        with transaction.atomic():
            set_current_tenant(self.tenant_a.id, local=True)
            sale = self.make_sale("A")
            post_sale(sale.id, actor=self.user_a)
            self.assertEqual(Invoice.objects.filter(sale=sale).count(), 1)
            self.assertEqual(Receivable.objects.filter(invoice__sale=sale).count(), 1)
            revenue = RevenueTransaction.objects.get(sale=sale)
            self.assertEqual(revenue.gross_amount, Decimal("1000.00"))
            allocations = {x.allocation_type: x.amount for x in revenue.allocations.all()}
            self.assertEqual(allocations["partner"], Decimal("700.00"))
            self.assertEqual(allocations["company_base"], Decimal("150.00"))
            self.assertEqual(allocations["agency_gross"], Decimal("150.00"))
            self.assertEqual(allocations["agency_tax"], Decimal("15.00"))
            self.assertEqual(allocations["agency_net"], Decimal("135.00"))

    def test_payment_is_not_revenue(self):
        with transaction.atomic():
            set_current_tenant(self.tenant_a.id, local=True)
            sale = self.make_sale("A")
            post_sale(sale.id, actor=self.user_a)
            receivable = Receivable.objects.get(invoice__sale=sale)
            before = RevenueTransaction.objects.count()
            payment = Payment.objects.create(
                tenant=self.tenant_a, company=self.data["A"]["company"],
                branch=self.data["A"]["branch"], agency=self.data["A"]["agency"],
                customer=self.data["A"]["customer"], payment_number="PAY-NOT-REV",
                payment_date=date(2026, 9, 14), amount=Decimal("400.00"), currency="AFN"
            )
            PaymentAllocation.objects.create(
                tenant=self.tenant_a, payment=payment, receivable=receivable, amount=Decimal("400.00")
            )
            post_payment(payment.id, actor=self.user_a)
            self.assertEqual(RevenueTransaction.objects.count(), before)
            self.assertEqual(Receipt.objects.filter(payment=payment).count(), 1)
            receivable.refresh_from_db()
            self.assertEqual(receivable.status, "partial")
            self.assertEqual(receivable.outstanding_amount, Decimal("600.00"))

    def test_overallocation_is_rejected(self):
        with transaction.atomic():
            set_current_tenant(self.tenant_a.id, local=True)
            sale = self.make_sale("A")
            post_sale(sale.id, actor=self.user_a)
            receivable = Receivable.objects.get(invoice__sale=sale)
            payment = Payment.objects.create(
                tenant=self.tenant_a, company=self.data["A"]["company"],
                branch=self.data["A"]["branch"], agency=self.data["A"]["agency"],
                customer=self.data["A"]["customer"], payment_number="PAY-OVER",
                payment_date=date(2026, 9, 14), amount=Decimal("1100.00"), currency="AFN"
            )
            PaymentAllocation.objects.create(
                tenant=self.tenant_a, payment=payment, receivable=receivable, amount=Decimal("1100.00")
            )
            with self.assertRaises(Exception):
                post_payment(payment.id, actor=self.user_a)

    def test_sale_level_discount_requires_future_allocation_rule(self):
        with transaction.atomic():
            set_current_tenant(self.tenant_a.id, local=True)
            sale = self.make_sale("A", discount=Decimal("10.00"))
            with self.assertRaises(Exception):
                post_sale(sale.id, actor=self.user_a)

    def test_sale_api_isolation(self):
        with transaction.atomic():
            set_current_tenant(self.tenant_a.id, local=True)
            self.make_sale("A")
        with transaction.atomic():
            set_current_tenant(self.tenant_b.id, local=True)
            self.make_sale("B")
        response = self.client_for(self.user_a, self.tenant_a).get("/api/v1/sales/")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(all(row["customer_name"] == "Customer A" for row in response.json()["results"]))

    def test_cross_tenant_sale_rejected(self):
        payload = {
            "company": str(self.data["A"]["company"].id),
            "branch": str(self.data["A"]["branch"].id),
            "agency": str(self.data["A"]["agency"].id),
            "customer": str(self.data["B"]["customer"].id),
            "customer_service": str(self.data["A"]["customer_service"].id),
            "sale_type": "renewal",
            "sale_date": "2026-09-14",
            "currency": "AFN",
            "discount_amount": "0.00",
        }
        response = self.client_for(self.user_a, self.tenant_a).post("/api/v1/sales/", payload, format="json")
        self.assertEqual(response.status_code, 400)

    def test_database_rls_filters_sales(self):
        with transaction.atomic():
            set_current_tenant(self.tenant_a.id, local=True)
            self.make_sale("A")
        with transaction.atomic():
            set_current_tenant(self.tenant_b.id, local=True)
            self.make_sale("B")
        with transaction.atomic():
            set_current_tenant(self.tenant_a.id, local=True)
            with connection.cursor() as cursor:
                cursor.execute("SELECT sale_number FROM sales_sales ORDER BY sale_number")
                rows = [r[0] for r in cursor.fetchall()]
                self.assertTrue(rows)
                self.assertTrue(all("-A-" in x for x in rows))

    def test_used_share_rule_is_immutable(self):
        with transaction.atomic():
            set_current_tenant(self.tenant_a.id, local=True)
            sale = self.make_sale("A")
            post_sale(sale.id, actor=self.user_a)
        client = self.client_for(self.user_a, self.tenant_a)
        response = client.patch(
            f"/api/v1/revenue/share-rules/{self.data['A']['rule'].id}/",
            {"agency_tax_percent": "12.0000"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
