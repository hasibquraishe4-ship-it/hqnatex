import uuid
from django.utils import timezone
from django.db.models import Q, F
from django.db import models
from apps.common.models import UUIDTimestampModel
from apps.tenancy.models import Tenant
from apps.companies.models import Company

class TaxRule(UUIDTimestampModel):
    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name='tax_rules')
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name='tax_rules')
    name = models.CharField(max_length=255)
    rate = models.DecimalField(max_digits=5, decimal_places=2)
    effective_date = models.DateField()
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'tax_rules'
        unique_together = ('tenant', 'company', 'name', 'effective_date')

class TaxLiability(UUIDTimestampModel):
    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name='tax_liabilities')
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name='tax_liabilities')
    period = models.CharField(max_length=20)
    amount = models.DecimalField(max_digits=18, decimal_places=2)
    status = models.CharField(max_length=20, choices=[('pending', 'Pending'), ('paid', 'Paid')], default='pending')

    class Meta:
        db_table = 'tax_liabilities'


class TaxAdjustment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey("tenancy.Tenant", on_delete=models.PROTECT, null=False, blank=False, db_column="tenant_id")
    company = models.ForeignKey("companies.Company", on_delete=models.PROTECT, null=False, blank=False, db_column="company_id")
    tax_liability_id = models.UUIDField(null=False, blank=False)
    adjustment_type = models.CharField(max_length=40)
    amount = models.DecimalField(max_digits=18, decimal_places=2)
    currency = models.CharField(max_length=3, default="company/default configured currency")
    reason = models.TextField()
    status = models.CharField(max_length=24)
    approved_by_user_id = models.UUIDField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    journal_entry_id = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "tax_adjustments"

class TaxDeclarationLine(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey("tenancy.Tenant", on_delete=models.PROTECT, null=False, blank=False, db_column="tenant_id")
    company = models.ForeignKey("companies.Company", on_delete=models.PROTECT, null=False, blank=False, db_column="company_id")
    tax_declaration_id = models.UUIDField(null=False, blank=False)
    line_no = models.IntegerField()
    tax_liability_id = models.UUIDField(null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    taxable_base = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=18, decimal_places=2)
    currency = models.CharField(max_length=3, default="company/default configured currency")
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "tax_declaration_lines"
        constraints = [models.UniqueConstraint(fields=["tenant", "company", "tax_declaration_id", "line_no"], name="uq_tax_declaration_lines_0")]

class TaxDeclaration(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey("tenancy.Tenant", on_delete=models.PROTECT, null=False, blank=False, db_column="tenant_id")
    company = models.ForeignKey("companies.Company", on_delete=models.PROTECT, null=False, blank=False, db_column="company_id")
    declaration_number = models.CharField(max_length=80)
    period_start = models.DateField()
    period_end = models.DateField()
    filing_date = models.DateField(null=True, blank=True)
    currency = models.CharField(max_length=3, default="company/default configured currency")
    declared_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    status = models.CharField(max_length=24)
    submitted_at = models.DateTimeField(null=True, blank=True)
    submitted_by_user_id = models.UUIDField(null=True, blank=True)
    evidence_json = models.JSONField(default=dict)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "tax_declarations"
        constraints = [models.UniqueConstraint(fields=["tenant", "company", "declaration_number"], name="uq_tax_declarations_0")]

class TaxPayment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey("tenancy.Tenant", on_delete=models.PROTECT, null=False, blank=False, db_column="tenant_id")
    company = models.ForeignKey("companies.Company", on_delete=models.PROTECT, null=False, blank=False, db_column="company_id")
    branch = models.ForeignKey("branches.Branch", on_delete=models.PROTECT, null=True, blank=True, db_column="branch_id")
    agency = models.ForeignKey("agencies.Agency", on_delete=models.PROTECT, null=True, blank=True, db_column="agency_id")
    tax_liability_id = models.UUIDField(null=False, blank=False)
    payment_id = models.UUIDField(null=True, blank=True)
    payment_date = models.DateField()
    amount = models.DecimalField(max_digits=18, decimal_places=2)
    currency = models.CharField(max_length=3, default="company/default configured currency")
    status = models.CharField(max_length=24)
    reference = models.CharField(max_length=180, null=True, blank=True)
    journal_entry_id = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "tax_payments"
        constraints = [models.UniqueConstraint(fields=["tenant", "company", "tax_liability_id", "payment_id"], name="uq_tax_payments_0")]

class TaxRuleVersion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey("tenancy.Tenant", on_delete=models.PROTECT, null=False, blank=False, db_column="tenant_id")
    company = models.ForeignKey("companies.Company", on_delete=models.PROTECT, null=False, blank=False, db_column="company_id")
    tax_rule_id = models.UUIDField(null=False, blank=False)
    version_no = models.IntegerField()
    calculation_method = models.CharField(max_length=60)
    rate_percent = models.DecimalField(max_digits=12, decimal_places=6, null=True, blank=True)
    fixed_amount = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True)
    parameters_json = models.JSONField(default=dict)
    effective_from = models.DateField()
    effective_to = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=24)
    approved_by_user_id = models.UUIDField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "tax_rule_versions"
        constraints = [models.UniqueConstraint(fields=["tenant", "company", "tax_rule_id", "version_no"], name="uq_tax_rule_versions_0")]
