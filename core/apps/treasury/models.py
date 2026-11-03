import uuid
from django.utils import timezone
from django.db.models import Q, F
from django.db import models
from apps.common.models import UUIDTimestampModel
from apps.tenancy.models import Tenant
from apps.companies.models import Company

# V1C46_R1_4_CANONICAL_CASH_BANK_CONTRACT_BEGIN
# Explicit canonical Treasury semantic contract.
# These constants intentionally do not alter Django field choices.
CASH_BANK_TRANSACTION_OUTBOUND_DIRECTION = 'credit'
CASH_BANK_TRANSACTION_POSTED_STATUS = 'posted'
# V1C46_R1_4_CANONICAL_CASH_BANK_CONTRACT_END

class CashBankAccount(UUIDTimestampModel):
    class AccountType(models.TextChoices):
        CASH = "cash", "Cash"
        BANK = "bank", "Bank"

    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name='cash_bank_accounts')
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name='cash_bank_accounts')
    account_name = models.CharField(max_length=255)
    account_number = models.CharField(max_length=100)
    currency = models.CharField(max_length=8, default='AFN')
    account_type = models.CharField(
        max_length=16,
        choices=AccountType.choices,
    )
    gl_account = models.ForeignKey(
        "finance.Account",
        on_delete=models.PROTECT,
        related_name="cash_bank_accounts",
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'cash_bank_accounts'
        unique_together = ('tenant', 'company', 'account_number')

class BankStatement(UUIDTimestampModel):
    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name='bank_statements')
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name='bank_statements')
    account = models.ForeignKey(CashBankAccount, on_delete=models.PROTECT, related_name='statements')
    statement_date = models.DateField()
    
    class Meta:
        db_table = 'bank_statements'
        unique_together = ('tenant', 'account', 'statement_date')


class BankReconciliationLine(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey("tenancy.Tenant", on_delete=models.PROTECT, null=False, blank=False, db_column="tenant_id")
    company = models.ForeignKey("companies.Company", on_delete=models.PROTECT, null=False, blank=False, db_column="company_id")
    bank_reconciliation_id = models.UUIDField(null=False, blank=False)
    bank_statement_line_id = models.UUIDField(null=True, blank=True)
    cash_bank_transaction_id = models.UUIDField(null=True, blank=True)
    match_type = models.CharField(max_length=30)
    matched_amount = models.DecimalField(max_digits=18, decimal_places=2)
    difference_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    reason = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "bank_reconciliation_lines"
        constraints = [models.UniqueConstraint(fields=["tenant", "company", "bank_reconciliation_id", "bank_statement_line_id", "cash_bank_transaction_id"], name="uq_bank_reconciliation_lines_0")]

class BankReconciliation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey("tenancy.Tenant", on_delete=models.PROTECT, null=False, blank=False, db_column="tenant_id")
    company = models.ForeignKey("companies.Company", on_delete=models.PROTECT, null=False, blank=False, db_column="company_id")
    cash_bank_account_id = models.UUIDField(null=False, blank=False)
    bank_statement_id = models.UUIDField(null=True, blank=True)
    period_start = models.DateField()
    period_end = models.DateField()
    statement_balance = models.DecimalField(max_digits=18, decimal_places=2)
    system_balance = models.DecimalField(max_digits=18, decimal_places=2)
    difference = models.DecimalField(max_digits=18, decimal_places=2)
    status = models.CharField(max_length=24)
    reconciled_by_user_id = models.UUIDField(null=True, blank=True)
    reconciled_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "bank_reconciliations"
        constraints = [models.UniqueConstraint(fields=["tenant", "company", "cash_bank_account_id", "period_start", "period_end"], name="uq_bank_reconciliations_0")]

class BankStatementLine(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey("tenancy.Tenant", on_delete=models.PROTECT, null=False, blank=False, db_column="tenant_id")
    company = models.ForeignKey("companies.Company", on_delete=models.PROTECT, null=False, blank=False, db_column="company_id")
    bank_statement_id = models.UUIDField(null=False, blank=False)
    line_no = models.IntegerField()
    transaction_date = models.DateField()
    value_date = models.DateField(null=True, blank=True)
    direction = models.CharField(max_length=6)
    amount = models.DecimalField(max_digits=18, decimal_places=2)
    currency = models.CharField(max_length=3, default="company/default configured currency")
    bank_reference = models.CharField(max_length=180, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    matched_cash_bank_transaction_id = models.UUIDField(null=True, blank=True)
    match_status = models.CharField(max_length=24, default="unmatched")
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "bank_statement_lines"
        constraints = [models.UniqueConstraint(fields=["tenant", "company", "bank_statement_id", "line_no"], name="uq_bank_statement_lines_0")]

class CashBankTransaction(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey("tenancy.Tenant", on_delete=models.PROTECT, null=False, blank=False, db_column="tenant_id")
    company = models.ForeignKey("companies.Company", on_delete=models.PROTECT, null=False, blank=False, db_column="company_id")
    branch = models.ForeignKey("branches.Branch", on_delete=models.PROTECT, null=True, blank=True, db_column="branch_id")
    agency = models.ForeignKey("agencies.Agency", on_delete=models.PROTECT, null=True, blank=True, db_column="agency_id")
    cash_bank_account_id = models.UUIDField(null=False, blank=False)
    transaction_date = models.DateField()
    movement_type = models.CharField(max_length=40)
    direction = models.CharField(max_length=6)
    amount = models.DecimalField(max_digits=18, decimal_places=2)
    currency = models.CharField(max_length=3, default="company/default configured currency")
    source_type = models.CharField(max_length=100)
    source_id = models.UUIDField(null=True, blank=True)
    reference = models.CharField(max_length=180, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=24)
    transfer_group_id = models.UUIDField(null=True, blank=True)
    journal_entry_id = models.UUIDField(null=True, blank=True)
    posted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "cash_bank_transactions"
        constraints = [models.UniqueConstraint(fields=["tenant", "company", "source_type", "source_id", "cash_bank_account_id"], name="uq_cash_bank_transactions_0")]

class PaymentMethod(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey("tenancy.Tenant", on_delete=models.PROTECT, null=False, blank=False, db_column="tenant_id")
    company = models.ForeignKey("companies.Company", on_delete=models.PROTECT, null=False, blank=False, db_column="company_id")
    code = models.CharField(max_length=80)
    name = models.CharField(max_length=160)
    method_type = models.CharField(max_length=40)
    is_active = models.BooleanField(default=True)
    config_json = models.JSONField(default=dict)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "payment_methods"
        constraints = [models.UniqueConstraint(fields=["tenant", "company", "code"], name="uq_payment_methods_0")]

class Refund(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey("tenancy.Tenant", on_delete=models.PROTECT, null=False, blank=False, db_column="tenant_id")
    company = models.ForeignKey("companies.Company", on_delete=models.PROTECT, null=False, blank=False, db_column="company_id")
    branch = models.ForeignKey("branches.Branch", on_delete=models.PROTECT, null=True, blank=True, db_column="branch_id")
    agency = models.ForeignKey("agencies.Agency", on_delete=models.PROTECT, null=True, blank=True, db_column="agency_id")
    refund_number = models.CharField(max_length=80)
    payment_id = models.UUIDField(null=False, blank=False)
    invoice_id = models.UUIDField(null=True, blank=True)
    customer_id = models.UUIDField(null=True, blank=True)
    refund_date = models.DateField()
    amount = models.DecimalField(max_digits=18, decimal_places=2)
    currency = models.CharField(max_length=3, default="company/default configured currency")
    reason = models.TextField()
    status = models.CharField(max_length=24)
    approved_by_user_id = models.UUIDField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    cash_bank_transaction_id = models.UUIDField(null=True, blank=True)
    journal_entry_id = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "refunds"
        constraints = [models.UniqueConstraint(fields=["tenant", "company", "refund_number"], name="uq_refunds_0")]
