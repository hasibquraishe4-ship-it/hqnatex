from django.db import models

from apps.common.models import UUIDTimestampModel


class Tenant(UUIDTimestampModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        ACTIVE = "active", "Active"
        SUSPENDED = "suspended", "Suspended"
        CLOSED = "closed", "Closed"

    code = models.CharField(max_length=64, unique=True)
    name = models.CharField(max_length=255)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.DRAFT)
    timezone = models.CharField(max_length=64, default="Asia/Kabul")
    default_language = models.CharField(max_length=8, default="en")

    class Meta:
        db_table = "tenancy_tenants"
        ordering = ["name"]

    def __str__(self) -> str:
        return f"{self.code} - {self.name}"
