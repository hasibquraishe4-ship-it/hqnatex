from datetime import date
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.agencies.models import Agency
from apps.billing.models import Payment, PaymentAllocation
from apps.billing.services import post_payment
from apps.branches.models import Branch
from apps.common.tenant import set_current_tenant
from apps.companies.models import Company
from apps.customers.models import CustomerService
from apps.iam.models import Permission, Role, RolePermission, TenantMembership
from apps.revenue.models import ShareRule
from apps.sales.models import Sale, SaleItem
from apps.sales.services import post_sale
from apps.tenancy.models import Tenant


PERMISSIONS = [
    ("sales.view", "View sales"),
    ("sales.manage", "Manage draft sales"),
    ("sales.post", "Post sales"),
    ("billing.view", "View invoices, receivables, payments and receipts"),
    ("billing.manage", "Manage draft payments and allocations"),
    ("billing.payments.post", "Post allocated payments"),
    ("revenue.view", "View revenue and share allocations"),
    ("revenue.rules.manage", "Manage effective-dated revenue share rules"),
    ("revenue.settlements.view", "View agency settlements"),
    ("revenue.settlements.manage", "Create and manage agency settlements"),
]


class Command(BaseCommand):
    help = "Seed FULL-03 Sales, Billing/AR, Payments and Revenue Sharing."

    def handle(self, *args, **options):
        permission_objects = []
        for key, name in PERMISSIONS:
            obj, _ = Permission.objects.update_or_create(key=key, defaults={"name": name})
            permission_objects.append(obj)

        tenants = Tenant.objects.filter(code__startswith="ISP", status="active").order_by("code")
        if tenants.count() < 20:
            raise RuntimeError("FULL-03 requires the 20 canonical test tenants.")

        for tenant in tenants:
            with transaction.atomic():
                set_current_tenant(tenant.id, local=True)

                role = Role.objects.filter(tenant=tenant, key="tenant_admin").first()
                if role:
                    for permission in permission_objects:
                        RolePermission.objects.get_or_create(tenant=tenant, role=role, permission=permission)

                company = Company.objects.filter(tenant=tenant, is_primary=True).first()
                branch = Branch.objects.filter(tenant=tenant, company=company).first()
                agency = Agency.objects.filter(tenant=tenant, company=company).first()
                cs = (
                    CustomerService.objects.select_related("customer", "service", "package")
                    .filter(tenant=tenant, package__isnull=False)
                    .order_by("created_at")
                    .first()
                )
                membership = (
                    TenantMembership.objects.select_related("user")
                    .filter(tenant=tenant, status="active")
                    .order_by("created_at")
                    .first()
                )
                actor = membership.user if membership else None
                if not all([company, branch, agency, cs, cs.package]):
                    raise RuntimeError(f"Missing FULL-01/FULL-02 seed dependencies for {tenant.code}")

                ShareRule.objects.update_or_create(
                    tenant=tenant,
                    code="DSL-CENTRAL-DEFAULT",
                    defaults={
                        "company": company,
                        "agency": None,
                        "service": cs.service,
                        "status": ShareRule.Status.ACTIVE,
                        "effective_from": date(2026, 1, 1),
                        "effective_to": None,
                        "partner_share_percent": Decimal("70.0000"),
                        "company_base_share_percent": Decimal("30.0000"),
                        "agency_gross_share_percent": Decimal("0.0000"),
                        "agency_tax_enabled": False,
                        "agency_tax_percent": Decimal("0.0000"),
                        "source_note": "Seed example only; percentages are configurable effective-dated data.",
                    },
                )

                ShareRule.objects.update_or_create(
                    tenant=tenant,
                    code="DSL-AGENCY-DEFAULT",
                    defaults={
                        "company": company,
                        "agency": agency,
                        "service": cs.service,
                        "status": ShareRule.Status.ACTIVE,
                        "effective_from": date(2026, 1, 1),
                        "effective_to": None,
                        "partner_share_percent": Decimal("70.0000"),
                        "company_base_share_percent": Decimal("15.0000"),
                        "agency_gross_share_percent": Decimal("15.0000"),
                        "agency_tax_enabled": True,
                        "agency_tax_percent": Decimal("10.0000"),
                        "source_note": "Seed example only; agency tax is after gross share and outside the 100% split.",
                    },
                )

                price = cs.package.current_price(date(2026, 9, 14))
                if price is None:
                    raise RuntimeError(f"No effective package price for {tenant.code}/{cs.package.code}")

                sale, _ = Sale.objects.get_or_create(
                    tenant=tenant,
                    sale_number=f"FULL03-{tenant.code}-001",
                    defaults={
                        "company": company,
                        "branch": branch,
                        "agency": agency,
                        "customer": cs.customer,
                        "customer_service": cs,
                        "sale_type": Sale.SaleType.RENEWAL,
                        "status": Sale.Status.DRAFT,
                        "sale_date": date(2026, 9, 14),
                        "currency": price.currency,
                        "discount_amount": Decimal("0.00"),
                        "notes": "FULL-03 canonical seed sale",
                    },
                )
                if sale.status == Sale.Status.DRAFT:
                    SaleItem.objects.update_or_create(
                        tenant=tenant,
                        sale=sale,
                        line_no=1,
                        defaults={
                            "item_type": SaleItem.ItemType.PACKAGE,
                            "service": cs.service,
                            "package": cs.package,
                            "description_snapshot": cs.package.name_english,
                            "quantity": Decimal("1.000"),
                            "unit_price": price.amount,
                            "share_eligible": True,
                            "metadata": {"seed": "FULL-03"},
                        },
                    )
                    sale.recalculate_totals()
                    post_sale(sale.id, actor=actor)

                invoice = sale.invoices.first()
                receivable = invoice.receivables.first()

                payment, _ = Payment.objects.get_or_create(
                    tenant=tenant,
                    payment_number=f"FULL03-{tenant.code}-PAY-001",
                    defaults={
                        "company": company,
                        "branch": branch,
                        "agency": agency,
                        "customer": cs.customer,
                        "status": Payment.Status.DRAFT,
                        "payment_date": date(2026, 9, 14),
                        "amount": (invoice.total / Decimal("2")).quantize(Decimal("0.01")),
                        "currency": invoice.currency,
                        "method": Payment.Method.CASH,
                        "reference": "FULL-03 seed partial collection",
                    },
                )
                if payment.status == Payment.Status.DRAFT:
                    PaymentAllocation.objects.update_or_create(
                        tenant=tenant,
                        payment=payment,
                        receivable=receivable,
                        defaults={"amount": payment.amount},
                    )
                    post_payment(payment.id, actor=actor)

        self.stdout.write(self.style.SUCCESS(f"FULL-03 seed complete for {tenants.count()} tenants."))
        self.stdout.write("SEED_SHARE_EXAMPLE=partner70/company15/agency15; agency_tax=10% of agency gross")
        self.stdout.write("IMPORTANT=Seed percentages are data, not hard-coded runtime business logic.")
        self.stdout.write("PAYMENT_CREATES_REVENUE=false")
        self.stdout.write("TREASURY_GL_STATUS=pending FULL-04")
