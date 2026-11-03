import uuid
from django.db import models
from django.db.models import F, Q

class Department(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey("tenancy.Tenant", on_delete=models.PROTECT, db_column="tenant_id")
    company = models.ForeignKey("companies.Company", on_delete=models.PROTECT, db_column="company_id")
    branch = models.ForeignKey("branches.Branch", on_delete=models.PROTECT, null=True, blank=True, db_column="branch_id")
    parent = models.ForeignKey("self", on_delete=models.PROTECT, null=True, blank=True, db_column="parent_id", related_name="children")
    code = models.CharField(max_length=80)
    name = models.CharField(max_length=180)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=24, default="active")
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "departments"
        constraints = [
            models.UniqueConstraint(fields=["tenant", "company", "code"], name="uq_department_scope_code"),
        ]
        indexes = [
            models.Index(fields=["tenant", "company", "status"], name="ix_dept_scope_status"),
        ]

class Position(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey("tenancy.Tenant", on_delete=models.PROTECT, db_column="tenant_id")
    company = models.ForeignKey("companies.Company", on_delete=models.PROTECT, db_column="company_id")
    department = models.ForeignKey(Department, on_delete=models.PROTECT, null=True, blank=True, db_column="department_id", related_name="positions")
    code = models.CharField(max_length=80)
    name = models.CharField(max_length=180)
    level = models.CharField(max_length=80, blank=True)
    min_salary = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True)
    max_salary = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=24, default="active")
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "positions"
        constraints = [
            models.UniqueConstraint(fields=["tenant", "company", "code"], name="uq_position_scope_code"),
            models.CheckConstraint(
                condition=Q(min_salary__isnull=True) | Q(max_salary__isnull=True) | Q(max_salary__gte=F("min_salary")),
                name="ck_position_salary_range",
            ),
        ]
        indexes = [
            models.Index(fields=["tenant", "company", "status"], name="ix_pos_scope_status"),
        ]

# HQNATEX_FULL_HR_PAYROLL_V1_MODELS_BEGIN
from .models_full import *  # noqa: F401,F403
# HQNATEX_FULL_HR_PAYROLL_V1_MODELS_END
