import uuid
from django.db.models import Q, F
from django.db import models
from django.utils import timezone
from apps.common.models import UUIDTimestampModel
from apps.tenancy.models import Tenant
from apps.companies.models import Company

class AccountingPeriod(UUIDTimestampModel):
    class Status(models.TextChoices):
        OPEN = 'open', 'Open'
        CLOSED = 'closed', 'Closed'
        LOCKED = 'locked', 'Locked'

    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name='accounting_periods')
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name='accounting_periods')
    name = models.CharField(max_length=100)
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)

    class Meta:
        db_table = 'accounting_periods'
        unique_together = ('tenant', 'company', 'start_date', 'end_date')

class JournalEntry(UUIDTimestampModel):
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        POSTED = 'posted', 'Posted'

    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name='journal_entries')
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name='journal_entries')
    entry_number = models.CharField(max_length=120)
    entry_date = models.DateField(default=timezone.localdate)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)

    class Meta:
        db_table = 'journal_entries'
        unique_together = ('tenant', 'company', 'entry_number')

class JournalEntryLine(UUIDTimestampModel):
    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name='journal_lines')
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name='journal_lines')
    journal_entry = models.ForeignKey(JournalEntry, on_delete=models.CASCADE, related_name='lines')
    account_code = models.CharField(max_length=50)
    amount = models.DecimalField(max_digits=18, decimal_places=2)
    direction = models.CharField(max_length=10, choices=[('debit', 'Debit'), ('credit', 'Credit')])

    class Meta:
        db_table = 'journal_entry_lines'


class AccountingPeriodLock(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey("tenancy.Tenant", on_delete=models.PROTECT, null=False, blank=False, db_column="tenant_id")
    company = models.ForeignKey("companies.Company", on_delete=models.PROTECT, null=False, blank=False, db_column="company_id")
    period_id = models.UUIDField(null=False, blank=False)
    lock_scope = models.CharField(max_length=40, default="all")
    locked_at = models.DateTimeField()
    locked_by_user_id = models.UUIDField(null=False, blank=False)
    reason = models.TextField()
    released_at = models.DateTimeField(null=True, blank=True)
    released_by_user_id = models.UUIDField(null=True, blank=True)
    release_reason = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "accounting_period_locks"
        constraints = [models.UniqueConstraint(fields=["tenant", "company", "period_id", "lock_scope", "released_at"], name="uq_accounting_period_locks_0")]

class AccountingPostingRuleLine(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey("tenancy.Tenant", on_delete=models.PROTECT, null=False, blank=False, db_column="tenant_id")
    company = models.ForeignKey("companies.Company", on_delete=models.PROTECT, null=False, blank=False, db_column="company_id")
    posting_rule_id = models.UUIDField(null=False, blank=False)
    line_no = models.IntegerField()
    side = models.CharField(max_length=6)
    account_id = models.UUIDField(null=False, blank=False)
    cost_center_required = models.BooleanField(default=False)
    amount_expression = models.CharField(max_length=240)
    dimensions_json = models.JSONField(default=dict)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "accounting_posting_rule_lines"
        constraints = [models.UniqueConstraint(fields=["tenant", "company", "posting_rule_id", "line_no"], name="uq_accounting_posting_rule_lines_0")]

class AccountingPostingRule(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey("tenancy.Tenant", on_delete=models.PROTECT, null=False, blank=False, db_column="tenant_id")
    company = models.ForeignKey("companies.Company", on_delete=models.PROTECT, null=False, blank=False, db_column="company_id")
    code = models.CharField(max_length=100)
    name = models.CharField(max_length=180)
    source_domain = models.CharField(max_length=80)
    source_event = models.CharField(max_length=120)
    priority = models.IntegerField(default=100)
    effective_from = models.DateField()
    effective_to = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    version_no = models.IntegerField(default=1)
    approved_by_user_id = models.UUIDField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "accounting_posting_rules"
        constraints = [models.UniqueConstraint(fields=["tenant", "company", "code", "version_no"], name="uq_accounting_posting_rules_0")]

class CostCenter(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey("tenancy.Tenant", on_delete=models.PROTECT, null=False, blank=False, db_column="tenant_id")
    company = models.ForeignKey("companies.Company", on_delete=models.PROTECT, null=False, blank=False, db_column="company_id")
    branch = models.ForeignKey("branches.Branch", on_delete=models.PROTECT, null=True, blank=True, db_column="branch_id")
    agency = models.ForeignKey("agencies.Agency", on_delete=models.PROTECT, null=True, blank=True, db_column="agency_id")
    parent_id = models.UUIDField(null=True, blank=True)
    code = models.CharField(max_length=80)
    name = models.CharField(max_length=180)
    description = models.TextField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    effective_from = models.DateField()
    effective_to = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "cost_centers"
        constraints = [models.UniqueConstraint(fields=["tenant", "company", "code"], name="uq_cost_centers_0")]

class OpeningBalance(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey("tenancy.Tenant", on_delete=models.PROTECT, null=False, blank=False, db_column="tenant_id")
    company = models.ForeignKey("companies.Company", on_delete=models.PROTECT, null=False, blank=False, db_column="company_id")
    branch = models.ForeignKey("branches.Branch", on_delete=models.PROTECT, null=True, blank=True, db_column="branch_id")
    agency = models.ForeignKey("agencies.Agency", on_delete=models.PROTECT, null=True, blank=True, db_column="agency_id")
    period_id = models.UUIDField(null=False, blank=False)
    account_id = models.UUIDField(null=False, blank=False)
    cost_center_id = models.UUIDField(null=True, blank=True)
    debit_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    credit_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default="company/default configured currency")
    description = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=24)
    approved_by_user_id = models.UUIDField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    posted_journal_entry_id = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "opening_balances"
        constraints = [models.UniqueConstraint(fields=["tenant", "company", "period_id", "account_id", "branch", "agency", "cost_center_id"], name="uq_opening_balances_0")]

# HQNATEX-ACCOUNTING-POSTING-RECORD-IDEMPOTENCY-V1
class AccountingPostingRecord(UUIDTimestampModel):
    """
    Durable source-event -> journal mapping used by the accounting posting
    engine to guarantee idempotent posting across retries and concurrency.
    """

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.PROTECT,
        related_name="accounting_posting_records",
    )
    company = models.ForeignKey(
        Company,
        on_delete=models.PROTECT,
        related_name="accounting_posting_records",
    )
    source_domain = models.CharField(max_length=80)
    source_event = models.CharField(max_length=120)
    source_id = models.UUIDField()
    journal_entry = models.ForeignKey(
        JournalEntry,
        on_delete=models.PROTECT,
        related_name="posting_records",
    )

    class Meta:
        db_table = "accounting_posting_records"
        constraints = [
            models.UniqueConstraint(
                fields=[
                    "tenant",
                    "company",
                    "source_domain",
                    "source_event",
                    "source_id",
                ],
                name="uq_accounting_posting_records_source",
            ),
        ]
        indexes = [
            models.Index(
                fields=[
                    "tenant",
                    "company",
                    "source_domain",
                    "source_event",
                ],
                name="ix_acc_post_rec_source",
            ),
            models.Index(
                fields=[
                    "tenant",
                    "company",
                    "journal_entry",
                ],
                name="ix_acc_post_rec_journal",
            ),
        ]

