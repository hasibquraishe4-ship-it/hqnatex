from decimal import Decimal

from django.db import models
from django.db.models import Q
from django.utils import timezone

from apps.common.models import UUIDTimestampModel
from apps.tenancy.models import Tenant


class ServiceCategory(UUIDTimestampModel):
    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="service_categories")
    code = models.CharField(max_length=64)
    name_english = models.CharField(max_length=160)
    name_dari = models.CharField(max_length=160, blank=True)
    name_pashto = models.CharField(max_length=160, blank=True)
    status = models.CharField(max_length=16, default="active")

    class Meta:
        db_table = "catalog_service_categories"
        ordering = ["name_english"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "code"], name="uq_service_category_tenant_code"),
            models.UniqueConstraint(fields=["tenant", "id"], name="uq_service_category_tenant_id"),
        ]

    def __str__(self):
        return self.name_english


class Service(UUIDTimestampModel):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"

    class TranslationStatus(models.TextChoices):
        COMPLETE = "complete", "Complete"
        PENDING = "pending", "Pending"

    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="services")
    category = models.ForeignKey(ServiceCategory, on_delete=models.PROTECT, related_name="services")
    code = models.CharField(max_length=80)
    name_english = models.CharField(max_length=200)
    name_dari = models.CharField(max_length=200, blank=True)
    name_pashto = models.CharField(max_length=200, blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ACTIVE)
    translation_status = models.CharField(
        max_length=16, choices=TranslationStatus.choices, default=TranslationStatus.PENDING
    )
    pricing_model = models.CharField(max_length=80, blank=True)
    technical_summary = models.TextField(blank=True)
    supports_equipment = models.BooleanField(null=True, blank=True)
    supports_noc = models.BooleanField(null=True, blank=True)
    capabilities = models.JSONField(default=dict, blank=True)
    source_status = models.CharField(max_length=40, default="tenant_defined")

    class Meta:
        db_table = "catalog_services"
        ordering = ["category__name_english", "name_english"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "code"], name="uq_service_tenant_code"),
            models.UniqueConstraint(fields=["tenant", "id"], name="uq_service_tenant_id"),
        ]
        indexes = [models.Index(fields=["tenant", "status"], name="ix_service_tenant_status")]

    def __str__(self):
        return self.name_english




class Technology(UUIDTimestampModel):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.PROTECT,
        related_name="technologies",
    )
    code = models.CharField(max_length=100)
    name_english = models.CharField(max_length=255)
    name_dari = models.CharField(max_length=255, blank=True, default="")
    name_pashto = models.CharField(max_length=255, blank=True, default="")
    description = models.TextField(blank=True, default="")
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.ACTIVE,
    )
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "catalog_technologies"
        ordering = ["name_english"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "code"],
                name="uq_technology_tenant_code",
            ),
            models.UniqueConstraint(
                fields=["tenant", "id"],
                name="uq_technology_tenant_id",
            ),
        ]
        indexes = [
            models.Index(
                fields=["tenant", "status"],
                name="ix_technology_tenant_status",
            ),
        ]

    def __str__(self):
        return self.name_english


class ServiceTechnology(UUIDTimestampModel):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.PROTECT,
        related_name="service_technologies",
    )
    service = models.ForeignKey(
        Service,
        on_delete=models.CASCADE,
        related_name="technology_links",
    )
    technology = models.ForeignKey(
        Technology,
        on_delete=models.PROTECT,
        related_name="service_links",
    )
    is_default = models.BooleanField(default=False)
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.ACTIVE,
    )
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "catalog_service_technologies"
        ordering = ["service", "technology"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "service", "technology"],
                name="uq_service_technology_link",
            ),
            models.UniqueConstraint(
                fields=["tenant", "id"],
                name="uq_service_technology_tenant_id",
            ),
        
            models.UniqueConstraint(
                fields=["tenant", "service"],
                condition=models.Q(
                    is_default=True,
                    status="active",
                ),
                name="uq_service_one_active_default_technology",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(is_default=False)
                    | models.Q(status="active")
                ),
                name="ck_service_technology_default_active",
            ),
]
        indexes = [
            models.Index(
                fields=["tenant", "service", "status"],
                name="ix_service_technology_status",
            ),
        ]

    def __str__(self):
        return f"{self.service_id}:{self.technology_id}"



class ServiceTechnicalProfile(UUIDTimestampModel):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        ARCHIVED = "archived", "Archived"
        DRAFT = "draft", "Draft"

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.PROTECT,
        related_name="service_technical_profiles",
    )
    service = models.ForeignKey(
        Service,
        on_delete=models.CASCADE,
        related_name="technical_profiles",
    )
    name = models.CharField(max_length=160)
    version = models.CharField(max_length=32, default="v1.0")
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.ACTIVE,
    )
    is_default = models.BooleanField(default=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "catalog_service_technical_profiles"
        ordering = ["service", "-is_default", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "service", "name", "version"],
                name="uq_service_technical_profile",
            ),
            models.UniqueConstraint(
                fields=["tenant", "id"],
                name="uq_service_technical_profile_tenant_id",
            ),
        ]
        indexes = [
            models.Index(
                fields=["tenant", "service", "status"],
                name="ix_service_tech_profile_status",
            ),
        ]

    def __str__(self):
        return f"{self.service.name_english} - {self.name} ({self.version})"


class ServiceTechnicalField(UUIDTimestampModel):
    class FieldType(models.TextChoices):
        TEXT = "text", "Text"
        INTEGER = "integer", "Integer"
        DECIMAL = "decimal", "Decimal"
        BOOLEAN = "boolean", "Boolean"
        DATE = "date", "Date"
        IP = "ip", "IP Address"
        CIDR = "cidr", "CIDR"
        CHOICE = "choice", "Choice"

    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="service_technical_fields")
    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name="technical_fields")
    technical_profile = models.ForeignKey(
        ServiceTechnicalProfile,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="fields",
    )
    key = models.CharField(max_length=100)
    label_english = models.CharField(max_length=160)
    label_dari = models.CharField(max_length=160, blank=True)
    label_pashto = models.CharField(max_length=160, blank=True)
    field_type = models.CharField(max_length=16, choices=FieldType.choices, default=FieldType.TEXT)
    required = models.BooleanField(default=False)
    options = models.JSONField(default=list, blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=16, default="active")

    class Meta:
        db_table = "catalog_service_technical_fields"
        ordering = ["service", "sort_order", "key"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "service", "key"], name="uq_service_technical_field"),
        ]


class Package(UUIDTimestampModel):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"

    class PackageType(models.TextChoices):
        UNLIMITED = "unlimited", "Unlimited"
        LIMITED = "limited", "Limited"
        CONTRACT = "contract", "Contract"
        VOUCHER = "voucher", "Voucher"
        FEE = "fee", "Fee"
        RENTAL = "rental", "Rental"

    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="packages")
    service = models.ForeignKey(Service, on_delete=models.PROTECT, related_name="packages")
    code = models.CharField(max_length=100)
    name_english = models.CharField(max_length=200)
    name_dari = models.CharField(max_length=200, blank=True)
    name_pashto = models.CharField(max_length=200, blank=True)
    package_type = models.CharField(max_length=20, choices=PackageType.choices)
    speed_mbps = models.DecimalField(max_digits=12, decimal_places=3, null=True, blank=True)
    quota_gb = models.DecimalField(max_digits=14, decimal_places=3, null=True, blank=True)
    period_months = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ACTIVE)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "catalog_packages"
        ordering = ["service", "name_english"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "code"], name="uq_package_tenant_code"),
            models.UniqueConstraint(fields=["tenant", "id"], name="uq_package_tenant_id"),
            models.UniqueConstraint(fields=["tenant", "id", "service"], name="uq_package_tenant_id_service"),
        ]
        indexes = [models.Index(fields=["tenant", "service", "status"], name="ix_package_service_status")]

    def current_price(self, at=None):
        at = at or timezone.localdate()
        return (
            self.prices.filter(status="active", effective_from__lte=at)
            .filter(Q(effective_to__isnull=True) | Q(effective_to__gte=at))
            .order_by("-effective_from", "-created_at")
            .first()
        )


class PackagePrice(UUIDTimestampModel):
    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="package_prices")
    package = models.ForeignKey(Package, on_delete=models.PROTECT, related_name="prices")
    amount = models.DecimalField(max_digits=18, decimal_places=2)
    currency = models.CharField(max_length=8, default="AFN")
    effective_from = models.DateField()
    effective_to = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=16, default="active")
    source_note = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = "catalog_package_prices"
        ordering = ["package", "-effective_from"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "package", "effective_from"], name="uq_package_price_effective_from"
            ),
            models.CheckConstraint(
                condition=Q(effective_to__isnull=True) | Q(effective_to__gte=models.F("effective_from")),
                name="ck_package_price_date_order",
            ),
            models.CheckConstraint(condition=Q(amount__gte=Decimal("0")), name="ck_package_price_nonnegative"),
        ]
        indexes = [models.Index(fields=["tenant", "package", "status"], name="ix_package_price_status")]
