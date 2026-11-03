import uuid
from django.db import models

class LanguageCatalog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=16, unique=True)
    name_native = models.CharField(max_length=120)
    name_english = models.CharField(max_length=120)
    locale = models.CharField(max_length=40, blank=True)
    direction = models.CharField(max_length=3, default="ltr")
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "language_catalogs"
        indexes = [models.Index(fields=["is_active", "sort_order"], name="ix_lang_active_sort")]

class TranslationKey(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    namespace = models.CharField(max_length=120, default="ui")
    key = models.CharField(max_length=220, unique=True)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=24, default="active")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "translation_keys"
        indexes = [models.Index(fields=["namespace", "status"], name="ix_trkey_ns_status")]

class TranslationValue(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    translation_key = models.ForeignKey(TranslationKey, on_delete=models.CASCADE, db_column="translation_key_id", related_name="values")
    language = models.ForeignKey(LanguageCatalog, on_delete=models.PROTECT, db_column="language_id", related_name="translations")
    value = models.TextField()
    status = models.CharField(max_length=24, default="active")
    updated_by_user_id = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "translation_values"
        constraints = [
            models.UniqueConstraint(fields=["translation_key", "language"], name="uq_trvalue_key_lang"),
        ]
        indexes = [models.Index(fields=["language", "status"], name="ix_trvalue_lang_status")]

class LocalizedEntity(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey("tenancy.Tenant", on_delete=models.PROTECT, db_column="tenant_id")
    company = models.ForeignKey("companies.Company", on_delete=models.PROTECT, null=True, blank=True, db_column="company_id")
    language = models.ForeignKey(LanguageCatalog, on_delete=models.PROTECT, db_column="language_id")
    entity_type = models.CharField(max_length=120)
    entity_id = models.UUIDField()
    field_name = models.CharField(max_length=120)
    value = models.TextField()
    status = models.CharField(max_length=24, default="active")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "localized_entities"
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "company", "language", "entity_type", "entity_id", "field_name"],
                name="uq_locent_scope_field",
            ),
        ]
        indexes = [
            models.Index(fields=["tenant", "company", "entity_type", "entity_id"], name="ix_locent_scope_entity"),
        ]
