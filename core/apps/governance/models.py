from django.db.models import Q, F
import uuid
from django.db import models
from django.utils import timezone

class SecurityEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey("tenancy.Tenant", on_delete=models.PROTECT, db_column="tenant_id")
    company = models.ForeignKey("companies.Company", on_delete=models.PROTECT, null=True, blank=True, db_column="company_id")
    event_code = models.CharField(max_length=100)
    category = models.CharField(max_length=80)
    severity = models.CharField(max_length=20, default="info")
    source = models.CharField(max_length=120, blank=True)
    status = models.CharField(max_length=24, default="open")
    actor_user_id = models.UUIDField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    request_id = models.CharField(max_length=120, blank=True)
    object_type = models.CharField(max_length=120, blank=True)
    object_id = models.UUIDField(null=True, blank=True)
    occurred_at = models.DateTimeField(default=timezone.now)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolution_notes = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "security_events"
        indexes = [
            models.Index(fields=["tenant", "company", "occurred_at"], name="ix_sec_evt_scope_time"),
            models.Index(fields=["tenant", "severity", "status"], name="ix_sec_evt_sev_status"),
        ]

class Setting(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey("tenancy.Tenant", on_delete=models.PROTECT, db_column="tenant_id")
    company = models.ForeignKey("companies.Company", on_delete=models.PROTECT, null=True, blank=True, db_column="company_id")
    branch = models.ForeignKey("branches.Branch", on_delete=models.PROTECT, null=True, blank=True, db_column="branch_id")
    agency = models.ForeignKey("agencies.Agency", on_delete=models.PROTECT, null=True, blank=True, db_column="agency_id")
    scope_type = models.CharField(max_length=20, default="tenant")
    key = models.CharField(max_length=190)
    value = models.JSONField(default=dict, blank=True)
    value_type = models.CharField(max_length=30, default="json")
    is_secret = models.BooleanField(default=False)
    status = models.CharField(max_length=24, default="active")
    effective_from = models.DateTimeField(default=timezone.now)
    effective_to = models.DateTimeField(null=True, blank=True)
    created_by_user_id = models.UUIDField(null=True, blank=True)
    updated_by_user_id = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "settings"
        indexes = [
            models.Index(fields=["tenant", "company", "key"], name="ix_settings_scope_key"),
            models.Index(fields=["tenant", "status"], name="ix_settings_status"),
        ]

class SettingHistory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey("tenancy.Tenant", on_delete=models.PROTECT, db_column="tenant_id")
    company = models.ForeignKey("companies.Company", on_delete=models.PROTECT, null=True, blank=True, db_column="company_id")
    setting = models.ForeignKey(Setting, on_delete=models.PROTECT, db_column="setting_id", related_name="history")
    action = models.CharField(max_length=30)
    old_value = models.JSONField(null=True, blank=True)
    new_value = models.JSONField(null=True, blank=True)
    changed_by_user_id = models.UUIDField(null=True, blank=True)
    change_reason = models.TextField(blank=True)
    changed_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "setting_histories"
        indexes = [
            models.Index(fields=["tenant", "company", "setting", "changed_at"], name="ix_sethist_scope_time"),
        ]

class ModuleSetting(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey("tenancy.Tenant", on_delete=models.PROTECT, db_column="tenant_id")
    company = models.ForeignKey("companies.Company", on_delete=models.PROTECT, null=True, blank=True, db_column="company_id")
    branch = models.ForeignKey("branches.Branch", on_delete=models.PROTECT, null=True, blank=True, db_column="branch_id")
    agency = models.ForeignKey("agencies.Agency", on_delete=models.PROTECT, null=True, blank=True, db_column="agency_id")
    module_key = models.CharField(max_length=120)
    enabled = models.BooleanField(default=True)
    config = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=24, default="active")
    effective_from = models.DateTimeField(default=timezone.now)
    effective_to = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "module_settings"
        indexes = [
            models.Index(fields=["tenant", "company", "module_key"], name="ix_modset_scope_key"),
            models.Index(fields=["tenant", "status"], name="ix_modset_status"),
        ]


class NumberingSeries(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey("tenancy.Tenant", on_delete=models.PROTECT, null=False, blank=False, db_column="tenant_id")
    company = models.ForeignKey("companies.Company", on_delete=models.PROTECT, null=False, blank=False, db_column="company_id")
    series_key = models.CharField(max_length=120)
    prefix = models.CharField(max_length=40, null=True, blank=True)
    next_number = models.BigIntegerField(default=1)
    padding = models.SmallIntegerField(default=6)
    reset_policy = models.CharField(max_length=20, default="none")
    last_reset_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "numbering_series"
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "company", "series_key"],
                name="uq_numbering_series_0",
            ),
            models.CheckConstraint(
                condition=models.Q(next_number__gte=1),
                name="ck_numbering_series_next_number_gte_1",
            ),
            models.CheckConstraint(
                condition=models.Q(padding__gte=1, padding__lte=20),
                name="ck_numbering_series_padding_1_20",
            ),
        ]
        indexes = [
            models.Index(
                fields=["tenant", "company", "series_key"],
                name="ix_numseries_scope_key",
            ),
        ]
