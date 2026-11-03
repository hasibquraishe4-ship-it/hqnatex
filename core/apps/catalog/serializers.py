from django.db.models import Q
from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field

from .models import Package, PackagePrice, Service, ServiceCategory, ServiceTechnicalField, ServiceTechnicalProfile, Technology, ServiceTechnology


class ServiceCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceCategory
        fields = ["id", "tenant", "code", "name_english", "name_dari", "name_pashto", "status", "created_at", "updated_at"]
        read_only_fields = ["id", "tenant", "created_at", "updated_at"]


class ServiceTechnicalProfileSerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(source="service.name_english", read_only=True)
    fields_count = serializers.IntegerField(source="fields.count", read_only=True)

    class Meta:
        model = ServiceTechnicalProfile
        fields = [
            "id",
            "tenant",
            "service",
            "service_name",
            "name",
            "version",
            "status",
            "is_default",
            "metadata",
            "fields_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "tenant", "created_at", "updated_at"]

    def validate_service(self, service):
        if service.tenant_id != self.context["request"].tenant_id:
            raise serializers.ValidationError(
                "Service belongs to another tenant."
            )

        relation_changed = (
            self.instance is None
            or str(
                getattr(
                    self.instance,
                    "service_id",
                    "",
                )
            )
            != str(service.id)
        )

        if (
            relation_changed
            and service.status != "active"
        ):
            raise serializers.ValidationError(
                "Inactive service cannot be selected for a new catalog configuration."
            )

        return service


class ServiceTechnicalFieldSerializer(serializers.ModelSerializer):
    technical_profile_name = serializers.CharField(source="technical_profile.name", read_only=True)

    class Meta:
        model = ServiceTechnicalField
        fields = [
            "id",
            "tenant",
            "service",
            "technical_profile",
            "technical_profile_name",
            "key",
            "label_english",
            "label_dari",
            "label_pashto",
            "field_type",
            "required",
            "options",
            "sort_order",
            "status",
        ]
        read_only_fields = ["id", "tenant"]

    def validate_service(self, service):
        if service.tenant_id != self.context["request"].tenant_id:
            raise serializers.ValidationError(
                "Service belongs to another tenant."
            )

        relation_changed = (
            self.instance is None
            or str(
                getattr(
                    self.instance,
                    "service_id",
                    "",
                )
            )
            != str(service.id)
        )

        if (
            relation_changed
            and service.status != "active"
        ):
            raise serializers.ValidationError(
                "Inactive service cannot be selected for a new catalog configuration."
            )

        return service


class ServiceSerializer(serializers.ModelSerializer):
    technical_fields = ServiceTechnicalFieldSerializer(many=True, read_only=True)
    category_name = serializers.CharField(source="category.name_english", read_only=True)

    class Meta:
        model = Service
        fields = ["id", "tenant", "category", "category_name", "code", "name_english", "name_dari", "name_pashto", "status", "translation_status", "pricing_model", "technical_summary", "supports_equipment", "supports_noc", "capabilities", "source_status", "technical_fields", "created_at", "updated_at"]
        read_only_fields = ["id", "tenant", "source_status", "created_at", "updated_at"]

    def validate_category(self, category):
        if category.tenant_id != self.context["request"].tenant_id:
            raise serializers.ValidationError("Category belongs to another tenant.")
        return category


class PackagePriceSerializer(serializers.ModelSerializer):
    class Meta:
        model = PackagePrice
        fields = ["id", "tenant", "package", "amount", "currency", "effective_from", "effective_to", "status", "source_note", "created_at"]
        read_only_fields = ["id", "tenant", "created_at"]

    def validate(self, attrs):
        request = self.context["request"]
        package = attrs.get("package", getattr(self.instance, "package", None))
        if package and package.tenant_id != request.tenant_id:
            raise serializers.ValidationError({"package": "Package belongs to another tenant."})
        start = attrs.get("effective_from", getattr(self.instance, "effective_from", None))
        end = attrs.get("effective_to", getattr(self.instance, "effective_to", None))
        if start and end and end < start:
            raise serializers.ValidationError({"effective_to": "Must be on or after effective_from."})
        if package and start:
            qs = PackagePrice.objects.filter(tenant_id=request.tenant_id, package=package, status="active")
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            candidate_end = end
            overlap = qs.filter(Q(effective_to__isnull=True) | Q(effective_to__gte=start))
            if candidate_end:
                overlap = overlap.filter(effective_from__lte=candidate_end)
            if overlap.exists():
                raise serializers.ValidationError({"effective_from": "Price period overlaps an existing active price period."})
        return attrs


class PackageSerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(source="service.name_english", read_only=True)
    current_price = serializers.SerializerMethodField()

    class Meta:
        model = Package
        fields = ["id", "tenant", "service", "service_name", "code", "name_english", "name_dari", "name_pashto", "package_type", "speed_mbps", "quota_gb", "period_months", "status", "metadata", "current_price", "created_at", "updated_at"]
        read_only_fields = ["id", "tenant", "created_at", "updated_at"]

    def validate_service(self, service):
        if service.tenant_id != self.context["request"].tenant_id:
            raise serializers.ValidationError(
                "Service belongs to another tenant."
            )

        relation_changed = (
            self.instance is None
            or str(
                getattr(
                    self.instance,
                    "service_id",
                    "",
                )
            )
            != str(service.id)
        )

        if (
            relation_changed
            and service.status != "active"
        ):
            raise serializers.ValidationError(
                "Inactive service cannot be selected for a new catalog configuration."
            )

        return service

    def validate(self, attrs):
        attrs = super().validate(attrs)

        service = attrs.get(
            "service",
            getattr(
                self.instance,
                "service",
                None,
            ),
        )

        service_changed = (
            self.instance is None
            or (
                "service" in attrs
                and service is not None
                and str(
                    getattr(
                        self.instance,
                        "service_id",
                        "",
                    )
                )
                != str(service.id)
            )
        )

        activating = (
            self.instance is None
            or (
                "status" in attrs
                and attrs.get("status")
                == Package.Status.ACTIVE
                and getattr(
                    self.instance,
                    "status",
                    None,
                )
                != Package.Status.ACTIVE
            )
        )

        if (
            service
            and service.status != "active"
            and (
                service_changed
                or activating
            )
        ):
            raise serializers.ValidationError(
                {
                    "service":
                    "Package cannot be created or activated under an inactive service."
                }
            )

        return attrs

    @extend_schema_field({
        "type": "object",
        "nullable": True,
        "properties": {
            "amount": {"type": "string"},
            "currency": {"type": "string"},
            "effective_from": {"type": "string", "format": "date"},
            "effective_to": {"type": "string", "format": "date", "nullable": True},
        },
    })
    def get_current_price(self, obj):
        price = obj.current_price()
        if not price:
            return None
        return {"amount": str(price.amount), "currency": price.currency, "effective_from": price.effective_from, "effective_to": price.effective_to}



class TechnologySerializer(serializers.ModelSerializer):
    class Meta:
        model = Technology
        fields = [
            "id",
            "tenant",
            "code",
            "name_english",
            "name_dari",
            "name_pashto",
            "description",
            "status",
            "metadata",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "tenant",
            "created_at",
            "updated_at",
        ]


class ServiceTechnologySerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(
        source="service.name_english",
        read_only=True,
    )
    technology_name = serializers.CharField(
        source="technology.name_english",
        read_only=True,
    )

    class Meta:
        model = ServiceTechnology
        fields = [
            "id",
            "tenant",
            "service",
            "service_name",
            "technology",
            "technology_name",
            "is_default",
            "status",
            "metadata",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "tenant",
            "created_at",
            "updated_at",
        ]

    def _tenant_id(self):
        request = self.context.get("request")
        return getattr(request, "tenant_id", None)

    def validate_service(self, service):
        tenant_id = self._tenant_id()

        if tenant_id and str(service.tenant_id) != str(tenant_id):
            raise serializers.ValidationError(
                "Service belongs to another tenant."
            )

        relation_changed = (
            self.instance is None
            or str(
                getattr(
                    self.instance,
                    "service_id",
                    "",
                )
            )
            != str(service.id)
        )

        if (
            relation_changed
            and service.status != "active"
        ):
            raise serializers.ValidationError(
                "Inactive service cannot receive a new technology assignment."
            )

        return service

    def validate_technology(self, technology):
        tenant_id = self._tenant_id()

        if tenant_id and str(technology.tenant_id) != str(tenant_id):
            raise serializers.ValidationError(
                "Technology belongs to another tenant."
            )

        return technology

    def validate(self, attrs):
        attrs = super().validate(attrs)

        tenant_id = self._tenant_id()

        service = attrs.get(
            "service",
            getattr(self.instance, "service", None),
        )

        technology = attrs.get(
            "technology",
            getattr(self.instance, "technology", None),
        )

        status = attrs.get(
            "status",
            getattr(
                self.instance,
                "status",
                ServiceTechnology.Status.ACTIVE,
            ),
        )

        is_default = attrs.get(
            "is_default",
            getattr(self.instance, "is_default", False),
        )

        if (
            service is not None
            and technology is not None
            and str(service.tenant_id)
            != str(technology.tenant_id)
        ):
            raise serializers.ValidationError(
                {
                    "technology":
                        "Service and technology must belong "
                        "to the same tenant."
                }
            )

        if is_default and status != ServiceTechnology.Status.ACTIVE:
            raise serializers.ValidationError(
                {
                    "is_default":
                        "Default technology must be active."
                }
            )

        if is_default and tenant_id and service is not None:
            qs = ServiceTechnology.objects.filter(
                tenant_id=tenant_id,
                service=service,
                is_default=True,
                status=ServiceTechnology.Status.ACTIVE,
            )

            if self.instance is not None:
                qs = qs.exclude(pk=self.instance.pk)

            if qs.exists():
                raise serializers.ValidationError(
                    {
                        "is_default":
                            "This service already has an active "
                            "default technology."
                    }
                )

        return attrs
