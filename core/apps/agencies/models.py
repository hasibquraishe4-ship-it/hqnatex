from django.db import models

from apps.branches.models import Branch
from apps.common.models import UUIDTimestampModel
from apps.companies.models import Company
from apps.tenancy.models import Tenant


class Agency(UUIDTimestampModel):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"
        SUSPENDED = "suspended", "Suspended"

    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="agencies")
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="agencies")
    branch = models.ForeignKey(
        Branch, on_delete=models.PROTECT, null=True, blank=True, related_name="agencies"
    )
    code = models.CharField(max_length=64)
    name = models.CharField(max_length=255)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ACTIVE)

    class Meta:
        db_table = "agencies_agencies"
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "code"], name="uq_agency_tenant_code"),
            models.UniqueConstraint(fields=["tenant", "id"], name="uq_agency_tenant_id"),
        ]
        indexes = [models.Index(fields=["tenant", "status"], name="ix_agency_tenant_status")]

    def __str__(self) -> str:
        return self.name
