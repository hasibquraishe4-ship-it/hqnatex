from django.db import models

from apps.common.models import UUIDTimestampModel
from apps.companies.models import Company
from apps.tenancy.models import Tenant


class Branch(UUIDTimestampModel):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"

    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="branches")
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="branches")
    code = models.CharField(max_length=64)
    name = models.CharField(max_length=255)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ACTIVE)

    class Meta:
        db_table = "branches_branches"
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "code"], name="uq_branch_tenant_code"),
            models.UniqueConstraint(fields=["tenant", "id"], name="uq_branch_tenant_id"),
        ]
        indexes = [models.Index(fields=["tenant", "status"], name="ix_branch_tenant_status")]

    def __str__(self) -> str:
        return self.name
