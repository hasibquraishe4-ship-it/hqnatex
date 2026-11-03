from django.db import models

from apps.common.models import UUIDTimestampModel
from apps.companies.models import Company
from apps.tenancy.models import Tenant


class Partner(UUIDTimestampModel):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"
        SUSPENDED = "suspended", "Suspended"

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.PROTECT,
        related_name="partners",
    )
    company = models.ForeignKey(
        Company,
        on_delete=models.PROTECT,
        related_name="partners",
    )

    code = models.CharField(max_length=64)
    legal_name = models.CharField(max_length=255)
    trade_name = models.CharField(max_length=255, blank=True)

    tax_id = models.CharField(max_length=120, blank=True)
    registration_no = models.CharField(max_length=120, blank=True)

    phone = models.CharField(max_length=64, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)

    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.ACTIVE,
    )

    class Meta:
        db_table = "partners_partners"
        ordering = ["legal_name"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "company", "code"],
                name="uq_partner_tenant_company_code",
            ),
            models.UniqueConstraint(
                fields=["tenant", "id"],
                name="uq_partner_tenant_id",
            ),
        ]
        indexes = [
            models.Index(
                fields=["tenant", "company", "status"],
                name="ix_partner_tenant_status",
            ),
        ]

    def __str__(self) -> str:
        return self.legal_name
