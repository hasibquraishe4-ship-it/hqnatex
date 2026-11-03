import uuid
from decimal import Decimal, ROUND_HALF_UP

from django.db import models
from django.db.models import Q, Sum
from django.utils import timezone

from apps.agencies.models import Agency
from apps.branches.models import Branch
from apps.common.models import UUIDTimestampModel
from apps.companies.models import Company
from apps.customers.models import Customer, CustomerService
from apps.sales.models import Sale, SaleItem
from apps.tenancy.models import Tenant


MONEY_PLACES = Decimal("0.01")


def money(value):
    return Decimal(value or 0).quantize(MONEY_PLACES, rounding=ROUND_HALF_UP)


class Invoice(UUIDTimestampModel):
    class Status(models.TextChoices):
        ISSUED = "issued", "Issued"
        PARTIAL = "partial", "Partially Paid"
        PAID = "paid", "Paid"
        VOID = "void", "Void"

    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="invoices")
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="invoices")
    branch = models.ForeignKey(Branch, on_delete=models.PROTECT, null=True, blank=True, related_name="invoices")
    agency = models.ForeignKey(Agency, on_delete=models.PROTECT, null=True, blank=True, related_name="invoices")
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name="invoices")
    customer_service = models.ForeignKey(
        CustomerService, on_delete=models.PROTECT, null=True, blank=True, related_name="invoices"
    )
    sale = models.ForeignKey(Sale, on_delete=models.PROTECT, related_name="invoices")
    invoice_number = models.CharField(max_length=120)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ISSUED)
    issue_date = models.DateField(default=timezone.localdate)
    due_date = models.DateField(null=True, blank=True)
    currency = models.CharField(max_length=8, default="AFN")
    subtotal = models.DecimalField(max_digits=18, decimal_places=2)
    discount_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=18, decimal_places=2)
    issued_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "billing_invoices"
        ordering = ["-issue_date", "-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "invoice_number"], name="uq_invoice_tenant_number"),
            models.UniqueConstraint(fields=["tenant", "id"], name="uq_invoice_tenant_id"),
            models.UniqueConstraint(fields=["tenant", "sale"], name="uq_invoice_tenant_sale"),
            models.CheckConstraint(condition=Q(total__gte=0), name="ck_invoice_total_nonnegative"),
        ]
        indexes = [
            models.Index(fields=["tenant", "issue_date", "status"], name="ix_invoice_tenant_status"),
            models.Index(fields=["tenant", "customer"], name="ix_invoice_tenant_customer"),
        ]


class InvoiceItem(UUIDTimestampModel):
    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="invoice_items")
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="invoice_items_company_scope")
    invoice = models.ForeignKey(Invoice, on_delete=models.PROTECT, related_name="items")
    sale_item = models.ForeignKey(SaleItem, on_delete=models.PROTECT, null=True, blank=True, related_name="invoice_items")
    line_no = models.PositiveIntegerField()
    item_type = models.CharField(max_length=20)
    description_snapshot = models.CharField(max_length=255)
    quantity = models.DecimalField(max_digits=14, decimal_places=3)
    unit_price = models.DecimalField(max_digits=18, decimal_places=2)
    line_total = models.DecimalField(max_digits=18, decimal_places=2)

    class Meta:
        db_table = "billing_invoice_items"
        ordering = ["invoice", "line_no"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "id"], name="uq_invoice_item_tenant_id"),
            models.UniqueConstraint(fields=["tenant", "invoice", "line_no"], name="uq_invoice_item_line"),
        ]


class Receivable(UUIDTimestampModel):
    class Status(models.TextChoices):
        OPEN = "open", "Open"
        PARTIAL = "partial", "Partial"
        PAID = "paid", "Paid"
        VOID = "void", "Void"

    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="receivables")

    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="receivables_company_scope")
    invoice = models.ForeignKey(Invoice, on_delete=models.PROTECT, related_name="receivables")
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name="receivables")
    original_amount = models.DecimalField(max_digits=18, decimal_places=2)
    currency = models.CharField(max_length=8, default="AFN")
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.OPEN)

    class Meta:
        db_table = "billing_receivables"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "id"], name="uq_receivable_tenant_id"),
            models.UniqueConstraint(fields=["tenant", "invoice"], name="uq_receivable_tenant_invoice"),
            models.CheckConstraint(condition=Q(original_amount__gte=0), name="ck_receivable_nonnegative"),
        ]
        indexes = [models.Index(fields=["tenant", "customer", "status"], name="ix_receivable_customer_status")]

    @property
    def allocated_amount(self):
        total = self.allocations.filter(payment__status=Payment.Status.POSTED).aggregate(v=Sum("amount"))["v"]
        return money(total or 0)

    @property
    def outstanding_amount(self):
        return max(money(self.original_amount - self.allocated_amount), Decimal("0.00"))


class Payment(UUIDTimestampModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        POSTED = "posted", "Posted"
        VOID = "void", "Void"

    class Method(models.TextChoices):
        CASH = "cash", "Cash"
        BANK = "bank", "Bank"
        ELECTRONIC = "electronic", "Electronic"
        OTHER = "other", "Other"

    class TreasuryStatus(models.TextChoices):
        PENDING = "pending_treasury", "Pending Treasury"
        RECONCILED = "reconciled", "Reconciled"
        LEGACY_INCOMPLETE = "legacy_incomplete", "Legacy / Incomplete"

    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="payments")
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="payments")
    branch = models.ForeignKey(Branch, on_delete=models.PROTECT, null=True, blank=True, related_name="payments")
    agency = models.ForeignKey(Agency, on_delete=models.PROTECT, null=True, blank=True, related_name="payments")
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name="payments")
    payment_number = models.CharField(max_length=120)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.DRAFT)
    payment_date = models.DateField(default=timezone.localdate)
    amount = models.DecimalField(max_digits=18, decimal_places=2)
    currency = models.CharField(max_length=8, default="AFN")
    method = models.CharField(max_length=20, choices=Method.choices, default=Method.CASH)
    reference = models.CharField(max_length=160, blank=True)
    treasury_status = models.CharField(max_length=24, choices=TreasuryStatus.choices, default=TreasuryStatus.PENDING)
    posted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "billing_payments"
        ordering = ["-payment_date", "-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "payment_number"], name="uq_payment_tenant_number"),
            models.UniqueConstraint(fields=["tenant", "id"], name="uq_payment_tenant_id"),
            models.CheckConstraint(condition=Q(amount__gt=0), name="ck_payment_amount_positive"),
        ]
        indexes = [
            models.Index(fields=["tenant", "payment_date", "status"], name="ix_payment_tenant_status"),
            models.Index(fields=["tenant", "customer"], name="ix_payment_tenant_customer"),
        ]


class PaymentAllocation(UUIDTimestampModel):
    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="payment_allocations")
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="payment_allocations_company_scope")
    payment = models.ForeignKey(Payment, on_delete=models.PROTECT, related_name="allocations")
    receivable = models.ForeignKey(Receivable, on_delete=models.PROTECT, related_name="allocations")
    amount = models.DecimalField(max_digits=18, decimal_places=2)

    class Meta:
        db_table = "billing_payment_allocations"
        ordering = ["payment", "created_at"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "id"], name="uq_payment_allocation_tenant_id"),
            models.UniqueConstraint(fields=["tenant", "payment", "receivable"], name="uq_payment_allocation_target"),
            models.CheckConstraint(condition=Q(amount__gt=0), name="ck_payment_allocation_positive"),
        ]


class Receipt(UUIDTimestampModel):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        VOID = "void", "Void"

    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="receipts")

    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="receipts_company_scope")
    payment = models.ForeignKey(Payment, on_delete=models.PROTECT, related_name="receipts")
    receipt_number = models.CharField(max_length=120)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ACTIVE)
    amount = models.DecimalField(max_digits=18, decimal_places=2)
    currency = models.CharField(max_length=8, default="AFN")
    issued_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "billing_receipts"
        ordering = ["-issued_at"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "receipt_number"], name="uq_receipt_tenant_number"),
            models.UniqueConstraint(fields=["tenant", "id"], name="uq_receipt_tenant_id"),
            models.UniqueConstraint(fields=["tenant", "payment"], name="uq_receipt_tenant_payment"),
        ]


class CreditNoteItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey("tenancy.Tenant", on_delete=models.PROTECT, null=False, blank=False, db_column="tenant_id")
    company = models.ForeignKey("companies.Company", on_delete=models.PROTECT, null=False, blank=False, db_column="company_id")
    credit_note_id = models.UUIDField(null=False, blank=False)
    line_no = models.IntegerField()
    invoice_item_id = models.UUIDField(null=True, blank=True)
    description = models.TextField()
    quantity = models.DecimalField(max_digits=18, decimal_places=4, default=1)
    unit_amount = models.DecimalField(max_digits=18, decimal_places=2)
    line_amount = models.DecimalField(max_digits=18, decimal_places=2)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "credit_note_items"
        constraints = [models.UniqueConstraint(fields=["tenant", "company", "credit_note_id", "line_no"], name="uq_credit_note_items_0")]

class CreditNote(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey("tenancy.Tenant", on_delete=models.PROTECT, null=False, blank=False, db_column="tenant_id")
    company = models.ForeignKey("companies.Company", on_delete=models.PROTECT, null=False, blank=False, db_column="company_id")
    branch = models.ForeignKey("branches.Branch", on_delete=models.PROTECT, null=True, blank=True, db_column="branch_id")
    agency = models.ForeignKey("agencies.Agency", on_delete=models.PROTECT, null=True, blank=True, db_column="agency_id")
    credit_note_number = models.CharField(max_length=80)
    invoice_id = models.UUIDField(null=False, blank=False)
    receivable_id = models.UUIDField(null=True, blank=True)
    customer_id = models.UUIDField(null=False, blank=False)
    note_date = models.DateField()
    reason = models.TextField()
    total_amount = models.DecimalField(max_digits=18, decimal_places=2)
    currency = models.CharField(max_length=3, default="company/default configured currency")
    status = models.CharField(max_length=24)
    approved_by_user_id = models.UUIDField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    journal_entry_id = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "credit_notes"
        constraints = [models.UniqueConstraint(fields=["tenant", "company", "credit_note_number"], name="uq_credit_notes_0")]

class DebitNoteItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey("tenancy.Tenant", on_delete=models.PROTECT, null=False, blank=False, db_column="tenant_id")
    company = models.ForeignKey("companies.Company", on_delete=models.PROTECT, null=False, blank=False, db_column="company_id")
    debit_note_id = models.UUIDField(null=False, blank=False)
    line_no = models.IntegerField()
    invoice_item_id = models.UUIDField(null=True, blank=True)
    description = models.TextField()
    quantity = models.DecimalField(max_digits=18, decimal_places=4, default=1)
    unit_amount = models.DecimalField(max_digits=18, decimal_places=2)
    line_amount = models.DecimalField(max_digits=18, decimal_places=2)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "debit_note_items"
        constraints = [models.UniqueConstraint(fields=["tenant", "company", "debit_note_id", "line_no"], name="uq_debit_note_items_0")]

class DebitNote(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey("tenancy.Tenant", on_delete=models.PROTECT, null=False, blank=False, db_column="tenant_id")
    company = models.ForeignKey("companies.Company", on_delete=models.PROTECT, null=False, blank=False, db_column="company_id")
    branch = models.ForeignKey("branches.Branch", on_delete=models.PROTECT, null=True, blank=True, db_column="branch_id")
    agency = models.ForeignKey("agencies.Agency", on_delete=models.PROTECT, null=True, blank=True, db_column="agency_id")
    debit_note_number = models.CharField(max_length=80)
    invoice_id = models.UUIDField(null=False, blank=False)
    receivable_id = models.UUIDField(null=True, blank=True)
    customer_id = models.UUIDField(null=False, blank=False)
    note_date = models.DateField()
    reason = models.TextField()
    total_amount = models.DecimalField(max_digits=18, decimal_places=2)
    currency = models.CharField(max_length=3, default="company/default configured currency")
    status = models.CharField(max_length=24)
    approved_by_user_id = models.UUIDField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    journal_entry_id = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "debit_notes"
        constraints = [models.UniqueConstraint(fields=["tenant", "company", "debit_note_number"], name="uq_debit_notes_0")]
