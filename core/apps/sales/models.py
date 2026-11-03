from decimal import Decimal, ROUND_HALF_UP

from django.db import models
from django.db.models import Q, Sum
from django.utils import timezone

from apps.agencies.models import Agency
from apps.branches.models import Branch
from apps.catalog.models import Package, Service
from apps.common.models import UUIDTimestampModel
from apps.companies.models import Company
from apps.customers.models import Customer, CustomerService
from apps.tenancy.models import Tenant


MONEY_PLACES = Decimal("0.01")


def money(value):
    return Decimal(value or 0).quantize(MONEY_PLACES, rounding=ROUND_HALF_UP)


class Sale(UUIDTimestampModel):
    class SaleType(models.TextChoices):
        NEW = "new", "New"
        RENEWAL = "renewal", "Renewal"
        CHANGE = "change", "Change"
        MIXED = "mixed", "Mixed"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        POSTED = "posted", "Posted"
        CANCELLED = "cancelled", "Cancelled"

    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="sales")
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="sales")
    branch = models.ForeignKey(Branch, on_delete=models.PROTECT, null=True, blank=True, related_name="sales")
    agency = models.ForeignKey(Agency, on_delete=models.PROTECT, null=True, blank=True, related_name="sales")
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name="sales")
    customer_service = models.ForeignKey(
        CustomerService, on_delete=models.PROTECT, null=True, blank=True, related_name="sales"
    )
    sale_number = models.CharField(max_length=100)
    sale_type = models.CharField(max_length=16, choices=SaleType.choices, default=SaleType.RENEWAL)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.DRAFT)
    sale_date = models.DateField(default=timezone.localdate)
    currency = models.CharField(max_length=8, default="AFN")
    subtotal = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    posted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "sales_sales"
        ordering = ["-sale_date", "-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "sale_number"], name="uq_sale_tenant_number"),
            models.UniqueConstraint(fields=["tenant", "id"], name="uq_sale_tenant_id"),
            models.CheckConstraint(condition=Q(subtotal__gte=0), name="ck_sale_subtotal_nonnegative"),
            models.CheckConstraint(condition=Q(discount_amount__gte=0), name="ck_sale_discount_nonnegative"),
            models.CheckConstraint(condition=Q(total__gte=0), name="ck_sale_total_nonnegative"),
        ]
        indexes = [
            models.Index(fields=["tenant", "sale_date", "status"], name="ix_sale_tenant_date_status"),
            models.Index(fields=["tenant", "customer"], name="ix_sale_tenant_customer"),
            models.Index(fields=["tenant", "agency"], name="ix_sale_tenant_agency"),
        ]

    def recalculate_totals(self, save=True):
        subtotal = self.items.aggregate(v=Sum("line_total"))["v"] or Decimal("0")
        subtotal = money(subtotal)
        total = money(subtotal - money(self.discount_amount))
        self.subtotal = subtotal
        self.total = max(total, Decimal("0.00"))
        if save:
            self.save(update_fields=["subtotal", "total", "updated_at"])
        return self.total


class SaleItem(UUIDTimestampModel):
    class ItemType(models.TextChoices):
        SERVICE = "service", "Service"
        PACKAGE = "package", "Package"
        INSTALLATION = "installation", "Installation"
        RENTAL = "rental", "Rental"
        FEE = "fee", "Fee"
        EQUIPMENT = "equipment", "Equipment"

    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="sale_items")

    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="sale_items_company_scope")
    sale = models.ForeignKey(Sale, on_delete=models.PROTECT, related_name="items")
    line_no = models.PositiveIntegerField()
    item_type = models.CharField(max_length=20, choices=ItemType.choices)
    service = models.ForeignKey(Service, on_delete=models.PROTECT, null=True, blank=True, related_name="sale_items")
    package = models.ForeignKey(Package, on_delete=models.PROTECT, null=True, blank=True, related_name="sale_items")
    description_snapshot = models.CharField(max_length=255)
    quantity = models.DecimalField(max_digits=14, decimal_places=3, default=1)
    unit_price = models.DecimalField(max_digits=18, decimal_places=2)
    line_total = models.DecimalField(max_digits=18, decimal_places=2)
    share_eligible = models.BooleanField(default=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "sales_sale_items"
        ordering = ["sale", "line_no"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "id"], name="uq_sale_item_tenant_id"),
            models.UniqueConstraint(fields=["tenant", "sale", "line_no"], name="uq_sale_item_line"),
            models.CheckConstraint(condition=Q(quantity__gt=0), name="ck_sale_item_quantity_positive"),
            models.CheckConstraint(condition=Q(unit_price__gte=0), name="ck_sale_item_unit_price_nonnegative"),
            models.CheckConstraint(condition=Q(line_total__gte=0), name="ck_sale_item_total_nonnegative"),
        ]
        indexes = [models.Index(fields=["tenant", "sale"], name="ix_sale_item_tenant_sale")]

    def save(self, *args, **kwargs):
        self.line_total = money(Decimal(self.quantity) * Decimal(self.unit_price))
        super().save(*args, **kwargs)
