from django.conf import settings
from django.db import models
from apps.common.models import UUIDTimestampModel
from apps.tenancy.models import Tenant

class TenantDatabase(UUIDTimestampModel):
    MODE_CHOICES = [
        ("shared", "Shared Pool"),
        ("database", "Database Per Tenant"),
        ("dedicated", "Dedicated Cluster"),
    ]
    tenant = models.OneToOneField(Tenant, on_delete=models.PROTECT, related_name="database_registry")
    mode = models.CharField(max_length=24, choices=MODE_CHOICES, default="database")
    db_alias = models.SlugField(max_length=80, unique=True)
    db_name = models.CharField(max_length=120, unique=True)
    db_host = models.CharField(max_length=255)
    db_port = models.PositiveIntegerField(default=5432)
    db_user = models.CharField(max_length=120)
    password_secret_ref = models.CharField(max_length=255)
    status = models.CharField(max_length=24, default="pending", db_index=True)
    schema_version = models.CharField(max_length=64, blank=True)
    last_migrated_at = models.DateTimeField(null=True, blank=True)
    last_backup_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "platform_tenant_databases"

class PrivilegedAccessSession(UUIDTimestampModel):
    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="privileged_access_sessions")
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="requested_privileged_sessions")
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="approved_privileged_sessions", null=True, blank=True)
    reason = models.TextField()
    status = models.CharField(max_length=24, default="pending", db_index=True)
    starts_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    source_ip = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        db_table = "platform_privileged_access_sessions"

class TenantFeatureFlag(UUIDTimestampModel):
    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="platform_feature_flags")
    key = models.CharField(max_length=120)
    enabled = models.BooleanField(default=False)
    config = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "platform_tenant_feature_flags"
        constraints = [
            models.UniqueConstraint(fields=["tenant", "key"], name="uq_platform_tenant_feature_key")
        ]

class TenantStorageQuota(UUIDTimestampModel):
    tenant = models.OneToOneField(Tenant, on_delete=models.PROTECT, related_name="storage_quota")
    max_bytes = models.BigIntegerField(default=0)
    used_bytes = models.BigIntegerField(default=0)
    max_files = models.BigIntegerField(default=0)
    used_files = models.BigIntegerField(default=0)

    class Meta:
        db_table = "platform_tenant_storage_quotas"

class TenantMigrationLedger(UUIDTimestampModel):
    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="migration_ledger")
    database_alias = models.CharField(max_length=80)
    migration_label = models.CharField(max_length=255)
    status = models.CharField(max_length=24, db_index=True)
    started_at = models.DateTimeField()
    completed_at = models.DateTimeField(null=True, blank=True)
    checksum = models.CharField(max_length=128, blank=True)
    error_text = models.TextField(blank=True)

    class Meta:
        db_table = "platform_tenant_migration_ledger"
