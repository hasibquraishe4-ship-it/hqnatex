from django.db import models
from django.db.models import Q

from apps.common.models import UUIDTimestampModel
from apps.tenancy.models import Tenant


class Company(UUIDTimestampModel):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"
        SUSPENDED = "suspended", "Suspended"

    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="companies")
    code = models.CharField(max_length=64)
    legal_name = models.CharField(max_length=255)
    trade_name = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ACTIVE)
    is_primary = models.BooleanField(default=False)

    class Meta:
        db_table = "companies_companies"
        ordering = ["legal_name"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "code"], name="uq_company_tenant_code"),
            models.UniqueConstraint(fields=["tenant", "id"], name="uq_company_tenant_id"),
            models.UniqueConstraint(
                fields=["tenant"], condition=Q(is_primary=True), name="uq_one_primary_company_per_tenant"
            ),
        ]
        indexes = [models.Index(fields=["tenant", "status"], name="ix_company_tenant_status")]

    def __str__(self) -> str:
        return self.legal_name
