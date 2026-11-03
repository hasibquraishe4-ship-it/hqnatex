import uuid
from django.db.models import Q, F
from django.db import models
from django.utils import timezone
from apps.common.models import UUIDTimestampModel
from apps.tenancy.models import Tenant
from apps.companies.models import Company

class ExpenseCategory(UUIDTimestampModel):
    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name='expense_categories')
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name='expense_categories')
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50)

    class Meta:
        db_table = 'expense_categories'
        unique_together = ('tenant', 'company', 'code')

class Expense(UUIDTimestampModel):
    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name='expenses')
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name='expenses')
    category = models.ForeignKey(ExpenseCategory, on_delete=models.PROTECT, related_name='expenses')
    amount = models.DecimalField(max_digits=18, decimal_places=2)
    expense_date = models.DateField(default=timezone.localdate)
    description = models.TextField(blank=True)

    class Meta:
        db_table = 'expenses'


class BudgetCommitment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey("tenancy.Tenant", on_delete=models.PROTECT, null=False, blank=False, db_column="tenant_id")
    company = models.ForeignKey("companies.Company", on_delete=models.PROTECT, null=False, blank=False, db_column="company_id")
    branch = models.ForeignKey("branches.Branch", on_delete=models.PROTECT, null=True, blank=True, db_column="branch_id")
    agency = models.ForeignKey("agencies.Agency", on_delete=models.PROTECT, null=True, blank=True, db_column="agency_id")
    budget_line_id = models.UUIDField(null=False, blank=False)
    commitment_date = models.DateField()
    source_type = models.CharField(max_length=100)
    source_id = models.UUIDField(null=True, blank=True)
    amount = models.DecimalField(max_digits=18, decimal_places=2)
    currency = models.CharField(max_length=3, default="company/default configured currency")
    status = models.CharField(max_length=24)
    released_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "budget_commitments"
        constraints = [models.UniqueConstraint(fields=["tenant", "company", "budget_line_id", "source_type", "source_id"], name="uq_budget_commitments_0")]

class BudgetLine(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey("tenancy.Tenant", on_delete=models.PROTECT, null=False, blank=False, db_column="tenant_id")
    company = models.ForeignKey("companies.Company", on_delete=models.PROTECT, null=False, blank=False, db_column="company_id")
    branch = models.ForeignKey("branches.Branch", on_delete=models.PROTECT, null=True, blank=True, db_column="branch_id")
    agency = models.ForeignKey("agencies.Agency", on_delete=models.PROTECT, null=True, blank=True, db_column="agency_id")
    budget_version_id = models.UUIDField(null=False, blank=False)
    line_no = models.IntegerField()
    expense_category_id = models.UUIDField(null=True, blank=True)
    cost_center_id = models.UUIDField(null=True, blank=True)
    period_start = models.DateField()
    period_end = models.DateField()
    planned_amount = models.DecimalField(max_digits=18, decimal_places=2)
    currency = models.CharField(max_length=3, default="company/default configured currency")
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "budget_lines"
        constraints = [models.UniqueConstraint(fields=["tenant", "company", "budget_version_id", "line_no"], name="uq_budget_lines_0")]

class BudgetVersion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey("tenancy.Tenant", on_delete=models.PROTECT, null=False, blank=False, db_column="tenant_id")
    company = models.ForeignKey("companies.Company", on_delete=models.PROTECT, null=False, blank=False, db_column="company_id")
    budget_id = models.UUIDField(null=False, blank=False)
    version_no = models.IntegerField()
    effective_from = models.DateField()
    effective_to = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=24)
    reason = models.TextField(null=True, blank=True)
    approved_by_user_id = models.UUIDField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "budget_versions"
        constraints = [models.UniqueConstraint(fields=["tenant", "company", "budget_id", "version_no"], name="uq_budget_versions_0")]

class Budget(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey("tenancy.Tenant", on_delete=models.PROTECT, null=False, blank=False, db_column="tenant_id")
    company = models.ForeignKey("companies.Company", on_delete=models.PROTECT, null=False, blank=False, db_column="company_id")
    budget_code = models.CharField(max_length=80)
    name = models.CharField(max_length=180)
    fiscal_year = models.IntegerField()
    currency = models.CharField(max_length=3, default="company/default configured currency")
    status = models.CharField(max_length=24)
    description = models.TextField(null=True, blank=True)
    approved_by_user_id = models.UUIDField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "budgets"
        constraints = [models.UniqueConstraint(fields=["tenant", "company", "budget_code"], name="uq_budgets_0")]
