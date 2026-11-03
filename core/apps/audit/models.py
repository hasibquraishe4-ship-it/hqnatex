from django.conf import settings
from django.db import models

from apps.common.models import UUIDTimestampModel
from apps.tenancy.models import Tenant


class AuditLog(UUIDTimestampModel):
    tenant = models.ForeignKey(
        Tenant, on_delete=models.SET_NULL, null=True, blank=True, related_name="audit_logs"
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=160)
    object_type = models.CharField(max_length=160)
    object_id = models.UUIDField(null=True, blank=True)
    request_id = models.CharField(max_length=80, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "audit_logs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tenant", "created_at"], name="ix_audit_tenant_created"),
            models.Index(fields=["actor"], name="ix_audit_actor"),
        ]
