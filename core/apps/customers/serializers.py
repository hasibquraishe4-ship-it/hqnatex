import ipaddress
import uuid
from decimal import Decimal, InvalidOperation

from django.utils import timezone
from django.db import transaction
from rest_framework import serializers

from apps.catalog.models import ServiceTechnicalField
from .models import (
    Customer,
    CustomerEquipmentAssignment,
    CustomerServiceTechnicalValue,
    CustomerService,
    CustomerTicket,
    ServiceAgencyHistory,
    ServiceChangeRequest,
    ServicePackageHistory,
    ServiceStatusHistory,
    ServiceActivation,
    InstallationWorkOrder,
    ProvisioningJob,
    IPAssignment,
    RadiusAccount,
    TechnicalTestResult,
    ActivationChecklist,
    FieldVisit,
    ServiceSuspension,
    ServiceTermination,
    DecommissionRecord,
    TechnicalChangeHistory,
    TechnicalAttachment,
)


class CustomerSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.legal_name", read_only=True)
    branch_name = serializers.CharField(source="branch.name", read_only=True)
    agency_name = serializers.CharField(source="agency.name", read_only=True)
    active_subscriptions_count = serializers.SerializerMethodField()
    total_subscriptions_count = serializers.SerializerMethodField()
    outstanding_balance = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = [
            "id",
            "tenant",
            "company",
            "company_name",
            "branch",
            "branch_name",
            "agency",
            "agency_name",
            "code",
            "customer_type",
            "display_name",
            "father_name",
            "national_id",
            "phone",
            "alt_phone",
            "email",
            "province",
            "district",
            "address",
            "organization_name",
            "registration_number",
            "tin",
            "contact_person",
            "external_reference",
            "notes",
            "contacts",
            "addresses",
            "documents",
            "status",
            "active_subscriptions_count",
            "total_subscriptions_count",
            "outstanding_balance",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "tenant", "company", "created_at", "updated_at"]
        extra_kwargs = {"code": {"required": False}}

    def get_active_subscriptions_count(self, obj):
        return obj.services.filter(status="active").count()

    def get_total_subscriptions_count(self, obj):
        return obj.services.count()

    def get_outstanding_balance(self, obj):
        try:
            from apps.billing.models import Receivable
            recs = Receivable.objects.filter(customer=obj, status__in=["open", "partial"])
            total = sum((r.outstanding_amount for r in recs), Decimal("0.00"))
            return str(total)
        except Exception:
            return "0.00"

    def validate(self, attrs):
        request = self.context["request"]
        tenant_id = request.tenant_id
        company_id = request.company_id
        branch = attrs.get("branch", getattr(self.instance, "branch", None))
        agency = attrs.get("agency", getattr(self.instance, "agency", None))
        if branch and (
            branch.tenant_id != tenant_id
            or str(branch.company_id) != str(company_id)
        ):
            raise serializers.ValidationError(
                {"branch": "Branch does not belong to the active tenant/company."}
            )
        if agency and (
            agency.tenant_id != tenant_id
            or str(agency.company_id) != str(company_id)
        ):
            raise serializers.ValidationError(
                {"agency": "Agency does not belong to the active tenant/company."}
            )
        if branch and agency and agency.branch_id and agency.branch_id != branch.id:
            raise serializers.ValidationError({"agency": "Agency does not belong to the selected branch."})
        if not attrs.get("code") and self.instance is None:
            attrs["code"] = f"CUS-{uuid.uuid4().hex[:10].upper()}"
        return attrs


def _validate_technical_values(service, values):
    definitions = list(ServiceTechnicalField.objects.filter(service=service, status="active").order_by("sort_order", "key"))
    allowed = {field.key: field for field in definitions}
    unknown = sorted(set(values) - set(allowed))
    if unknown:
        raise serializers.ValidationError({"technical_values": [f"Unknown technical field: {key}" for key in unknown]})
    missing = [field.key for field in definitions if field.required and values.get(field.key) in (None, "")]
    if missing:
        raise serializers.ValidationError({"technical_values": [f"Required technical field: {key}" for key in missing]})
    for key, value in values.items():
        field = allowed[key]
        if value in (None, ""):
            continue
        try:
            if field.field_type == "integer":
                int(value)
            elif field.field_type == "decimal":
                Decimal(str(value))
            elif field.field_type == "boolean" and not isinstance(value, bool):
                raise ValueError("boolean required")
            elif field.field_type == "ip":
                ipaddress.ip_address(str(value))
            elif field.field_type == "cidr":
                ipaddress.ip_network(str(value), strict=False)
            elif field.field_type == "choice" and value not in field.options:
                raise ValueError("invalid choice")
        except (ValueError, InvalidOperation) as exc:
            raise serializers.ValidationError({"technical_values": {key: f"Invalid {field.field_type} value."}}) from exc


def _active_technical_field_map(service):
    return {
        field.key: field
        for field in service.technical_fields.filter(
            status="active"
        ).order_by(
            "sort_order",
            "key",
        )
    }


def _sync_customer_service_technical_rows(
    customer_service,
):
    """
    CustomerService.technical_values -> normalized row table.

    Only keys defined by the current ServiceTechnicalField
    schema are persisted as technical values.

    Unknown/legacy seed metadata is intentionally removed.

    Previous-service / removed-field rows are preserved
    as INACTIVE history rather than hard-deleted.
    """

    allowed = _active_technical_field_map(
        customer_service.service
    )

    raw_values = (
        customer_service.technical_values
        if isinstance(
            customer_service.technical_values,
            dict,
        )
        else {}
    )

    normalized = {
        key: value
        for key, value in raw_values.items()
        if key in allowed
    }

    if normalized != raw_values:
        CustomerService.objects.filter(
            pk=customer_service.pk,
        ).update(
            technical_values=normalized,
            updated_at=timezone.now(),
        )

        customer_service.technical_values = (
            normalized
        )

    active_row_ids = []

    for key, value in normalized.items():
        technical_field = allowed[key]

        row, _ = (
            CustomerServiceTechnicalValue.objects
            .update_or_create(
                tenant_id=customer_service.tenant_id,
                customer_service=customer_service,
                technical_field=technical_field,
                defaults={
                    "company_id":
                        customer_service.company_id,
                    "key_snapshot":
                        technical_field.key,
                    "value":
                        value,
                    "status":
                        CustomerServiceTechnicalValue.Status.ACTIVE,
                },
            )
        )

        active_row_ids.append(
            row.id
        )

    other_rows = (
        CustomerServiceTechnicalValue.objects
        .filter(
            tenant_id=customer_service.tenant_id,
            customer_service=customer_service,
            status=(
                CustomerServiceTechnicalValue
                .Status.ACTIVE
            ),
        )
    )

    if active_row_ids:
        other_rows = other_rows.exclude(
            id__in=active_row_ids
        )

    other_rows.update(
        status=(
            CustomerServiceTechnicalValue
            .Status.INACTIVE
        ),
        updated_at=timezone.now(),
    )

    return normalized


def _sync_customer_service_json_from_rows(
    customer_service,
):
    """
    Active technical row table -> CustomerService JSON mirror.
    """

    rows = (
        CustomerServiceTechnicalValue.objects
        .filter(
            tenant_id=customer_service.tenant_id,
            customer_service=customer_service,
            status=(
                CustomerServiceTechnicalValue
                .Status.ACTIVE
            ),
            technical_field__service_id=(
                customer_service.service_id
            ),
            technical_field__status="active",
        )
        .select_related(
            "technical_field"
        )
        .order_by(
            "technical_field__sort_order",
            "technical_field__key",
        )
    )

    values = {
        row.technical_field.key: row.value
        for row in rows
    }

    current = (
        customer_service.technical_values
        if isinstance(
            customer_service.technical_values,
            dict,
        )
        else {}
    )

    if current != values:
        CustomerService.objects.filter(
            pk=customer_service.pk,
        ).update(
            technical_values=values,
            updated_at=timezone.now(),
        )

        customer_service.technical_values = (
            values
        )

    return values


class CustomerServiceSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.display_name", read_only=True)
    customer_phone = serializers.CharField(source="customer.phone", read_only=True)
    service_name = serializers.CharField(source="service.name_english", read_only=True)
    service_code = serializers.CharField(source="service.code", read_only=True)
    service_category_name = serializers.CharField(source="service.category.name_english", read_only=True)
    package_name = serializers.CharField(source="package.name_english", read_only=True)
    package_code = serializers.CharField(source="package.code", read_only=True)
    branch_name = serializers.CharField(source="branch.name", read_only=True)
    agency_name = serializers.CharField(source="agency.name", read_only=True)
    days_remaining = serializers.SerializerMethodField()

    class Meta:
        model = CustomerService
        fields = [
            "id",
            "tenant",
            "company",
            "customer",
            "customer_name",
            "customer_phone",
            "service",
            "service_name",
            "service_code",
            "service_category_name",
            "package",
            "package_name",
            "package_code",
            "branch",
            "branch_name",
            "agency",
            "agency_name",
            "identifier",
            "username",
            "status",
            "billing_cycle",
            "base_price",
            "discount",
            "final_price",
            "currency",
            "activation_date",
            "next_renewal_date",
            "auto_renewal",
            "sales_channel",
            "technical_values",
            "started_at",
            "ended_at",
            "notes",
            "days_remaining",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "tenant", "company", "created_at", "updated_at"]

    def get_days_remaining(self, obj):
        target = obj.next_renewal_date or (obj.ended_at.date() if obj.ended_at else None)
        if not target:
            return None
        return (target - timezone.localdate()).days

    def validate(self, attrs):
        request = self.context["request"]
        tenant_id = request.tenant_id
        company_id = request.company_id
        customer = attrs.get("customer", getattr(self.instance, "customer", None))
        service = attrs.get("service", getattr(self.instance, "service", None))
        package = attrs.get("package", getattr(self.instance, "package", None))
        branch = attrs.get("branch", getattr(self.instance, "branch", None))
        agency = attrs.get("agency", getattr(self.instance, "agency", None))
        values = attrs.get("technical_values", getattr(self.instance, "technical_values", {})) or {}
        for name, obj in (("customer", customer), ("service", service), ("package", package), ("branch", branch), ("agency", agency)):
            if obj is not None and obj.tenant_id != tenant_id:
                raise serializers.ValidationError({name: f"{name.title()} belongs to another tenant."})
        if package and service and package.service_id != service.id:
            raise serializers.ValidationError({"package": "Package does not belong to the selected service."})

        creating = self.instance is None

        service_changed = (
            creating
            or (
                "service" in attrs
                and service is not None
                and str(getattr(self.instance, "service_id", ""))
                != str(service.id)
            )
        )

        if service_changed and "technical_values" not in attrs:
            values = {}
            attrs["technical_values"] = {}

        package_changed = (
            (
                creating
                and package is not None
            )
            or (
                "package" in attrs
                and str(getattr(self.instance, "package_id", "") or "")
                != str(getattr(package, "id", "") or "")
            )
        )

        target_status = attrs.get(
            "status",
            getattr(
                self.instance,
                "status",
                CustomerService.Status.DRAFT,
            ),
        )

        activating = (
            target_status == CustomerService.Status.ACTIVE
            and (
                creating
                or getattr(
                    self.instance,
                    "status",
                    None,
                )
                != CustomerService.Status.ACTIVE
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
                    "Inactive service cannot be used for a new or newly activated customer service."
                }
            )

        if (
            package
            and (
                package_changed
                or activating
            )
        ):
            if package.status != "active":
                raise serializers.ValidationError(
                    {
                        "package":
                        "Inactive package cannot be used for a new or newly activated customer service."
                    }
                )

            if package.service.status != "active":
                raise serializers.ValidationError(
                    {
                        "package":
                        "Package belongs to an inactive service."
                    }
                )
        if customer and str(customer.company_id) != str(company_id):
            raise serializers.ValidationError(
                {"customer": "Customer does not belong to the active company."}
            )
        if branch and str(branch.company_id) != str(company_id):
            raise serializers.ValidationError(
                {"branch": "Branch does not belong to the active company."}
            )
        if agency and str(agency.company_id) != str(company_id):
            raise serializers.ValidationError(
                {"agency": "Agency does not belong to the active company."}
            )
        if customer and branch and branch.company_id != customer.company_id:
            raise serializers.ValidationError({"branch": "Branch does not belong to the customer's company."})
        if customer and agency and agency.company_id != customer.company_id:
            raise serializers.ValidationError({"agency": "Agency does not belong to the customer's company."})
        if service and (
            creating
            or service_changed
            or activating
            or "technical_values" in attrs
        ):
            _validate_technical_values(
                service,
                values,
            )

        return attrs

    def create(self, validated_data):
        with transaction.atomic():
            obj = super().create(
                validated_data
            )

            _sync_customer_service_technical_rows(
                obj
            )

            return obj

    def update(
        self,
        instance,
        validated_data,
    ):
        with transaction.atomic():
            old_service_id = (
                instance.service_id
            )

            target_service = (
                validated_data.get(
                    "service",
                    instance.service,
                )
            )

            service_changed = (
                target_service is not None
                and str(old_service_id)
                != str(target_service.id)
            )

            # IMPORTANT:
            # The DB integrity trigger requires every
            # technical row to belong to the CustomerService
            # current service.
            #
            # Therefore previous-service rows must be made
            # inactive BEFORE changing CustomerService.service.
            if service_changed:
                (
                    CustomerServiceTechnicalValue.objects
                    .filter(
                        tenant_id=instance.tenant_id,
                        customer_service=instance,
                        status=(
                            CustomerServiceTechnicalValue
                            .Status.ACTIVE
                        ),
                    )
                    .update(
                        status=(
                            CustomerServiceTechnicalValue
                            .Status.INACTIVE
                        ),
                        updated_at=timezone.now(),
                    )
                )

            obj = super().update(
                instance,
                validated_data,
            )

            _sync_customer_service_technical_rows(
                obj
            )

            return obj


class CustomerServiceTechnicalValueSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(
        source="customer_service.customer.display_name",
        read_only=True,
    )
    service_identifier = serializers.CharField(
        source="customer_service.identifier",
        read_only=True,
    )
    service_code = serializers.CharField(
        source="customer_service.service.code",
        read_only=True,
    )
    service_name = serializers.CharField(
        source="customer_service.service.name_english",
        read_only=True,
    )

    technical_field_key = serializers.CharField(
        source="technical_field.key",
        read_only=True,
    )
    technical_field_label_english = serializers.CharField(
        source="technical_field.label_english",
        read_only=True,
    )
    technical_field_label_dari = serializers.CharField(
        source="technical_field.label_dari",
        read_only=True,
    )
    technical_field_label_pashto = serializers.CharField(
        source="technical_field.label_pashto",
        read_only=True,
    )
    field_type = serializers.CharField(
        source="technical_field.field_type",
        read_only=True,
    )
    required = serializers.BooleanField(
        source="technical_field.required",
        read_only=True,
    )

    class Meta:
        model = CustomerServiceTechnicalValue
        fields = [
            "id",
            "tenant",
            "company",
            "customer_service",
            "customer_name",
            "service_identifier",
            "service_code",
            "service_name",
            "technical_field",
            "technical_field_key",
            "technical_field_label_english",
            "technical_field_label_dari",
            "technical_field_label_pashto",
            "field_type",
            "required",
            "key_snapshot",
            "value",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "tenant",
            "company",
            "key_snapshot",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        request = self.context.get("request")

        customer_service = attrs.get(
            "customer_service",
            getattr(self.instance, "customer_service", None),
        )
        technical_field = attrs.get(
            "technical_field",
            getattr(self.instance, "technical_field", None),
        )

        if customer_service is None:
            raise serializers.ValidationError(
                {"customer_service": "Customer service is required."}
            )

        if technical_field is None:
            raise serializers.ValidationError(
                {"technical_field": "Technical field is required."}
            )

        # CSTV_RELATION_IMMUTABILITY
        #
        # customer_service + technical_field define the
        # identity/scope of an existing normalized value.
        # Moving an existing row would leave the old
        # CustomerService JSON mirror stale and would also
        # rewrite historical meaning.
        if self.instance is not None:
            if (
                "customer_service" in attrs
                and customer_service.pk
                != self.instance.customer_service_id
            ):
                raise serializers.ValidationError(
                    {
                        "customer_service":
                        "Customer service cannot be changed "
                        "after the technical value is created."
                    }
                )

            if (
                "technical_field" in attrs
                and technical_field.pk
                != self.instance.technical_field_id
            ):
                raise serializers.ValidationError(
                    {
                        "technical_field":
                        "Technical field cannot be changed "
                        "after the technical value is created."
                    }
                )

        if request is not None:
            if str(customer_service.tenant_id) != str(request.tenant_id):
                raise serializers.ValidationError(
                    {
                        "customer_service":
                        "Customer service does not belong to the active tenant."
                    }
                )

            if str(customer_service.company_id) != str(request.company_id):
                raise serializers.ValidationError(
                    {
                        "customer_service":
                        "Customer service does not belong to the active company."
                    }
                )

            if str(technical_field.tenant_id) != str(request.tenant_id):
                raise serializers.ValidationError(
                    {
                        "technical_field":
                        "Technical field does not belong to the active tenant."
                    }
                )

        if technical_field.service_id != customer_service.service_id:
            raise serializers.ValidationError(
                {
                    "technical_field":
                    "Technical field does not belong to the selected service."
                }
            )

        if technical_field.status != "active":
            raise serializers.ValidationError(
                {
                    "technical_field":
                    "Technical field is not active."
                }
            )

        attrs["key_snapshot"] = technical_field.key

        return attrs

    def create(self, validated_data):
        with transaction.atomic():
            obj = super().create(
                validated_data
            )

            _sync_customer_service_json_from_rows(
                obj.customer_service
            )

            return obj

    def update(
        self,
        instance,
        validated_data,
    ):
        with transaction.atomic():
            obj = super().update(
                instance,
                validated_data,
            )

            _sync_customer_service_json_from_rows(
                obj.customer_service
            )

            return obj


class CustomerEquipmentAssignmentSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer_service.customer.display_name", read_only=True)
    service_identifier = serializers.CharField(source="customer_service.identifier", read_only=True)
    service_name = serializers.CharField(source="customer_service.service.name_english", read_only=True)

    class Meta:
        model = CustomerEquipmentAssignment
        fields = [
            "id",
            "tenant",
            "company",
            "customer_service",
            "customer_name",
            "service_identifier",
            "service_name",
            "equipment_type",
            "model_name",
            "serial_number",
            "mac_address",
            "inventory_ref",
            "ownership_type",
            "assigned_date",
            "returned_date",
            "condition",
            "deposit_amount",
            "status",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "tenant", "company", "created_at", "updated_at"]


class ServiceAgencyHistorySerializer(serializers.ModelSerializer):
    from_agency_name = serializers.CharField(source="from_agency.name", read_only=True)
    to_agency_name = serializers.CharField(source="to_agency.name", read_only=True)
    from_branch_name = serializers.CharField(source="from_branch.name", read_only=True)
    to_branch_name = serializers.CharField(source="to_branch.name", read_only=True)
    customer_name = serializers.CharField(source="customer_service.customer.display_name", read_only=True)
    service_identifier = serializers.CharField(source="customer_service.identifier", read_only=True)

    class Meta:
        model = ServiceAgencyHistory
        fields = [
            "id",
            "tenant",
            "company",
            "customer_service",
            "customer_name",
            "service_identifier",
            "from_agency",
            "from_agency_name",
            "to_agency",
            "to_agency_name",
            "from_branch",
            "from_branch_name",
            "to_branch",
            "to_branch_name",
            "reason",
            "effective_date",
            "approved_by",
            "user_name",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "tenant", "company", "created_at", "updated_at"]


class CustomerTicketSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.display_name", read_only=True)
    service_name = serializers.CharField(source="service.name_english", read_only=True)
    service_identifier = serializers.CharField(source="customer_service.identifier", read_only=True)

    class Meta:
        model = CustomerTicket
        fields = [
            "id",
            "tenant",
            "company",
            "ticket_number",
            "customer",
            "customer_name",
            "customer_service",
            "service_identifier",
            "service",
            "service_name",
            "category",
            "priority",
            "status",
            "subject",
            "description",
            "assigned_team",
            "assigned_user",
            "opened_at",
            "closed_at",
            "resolution",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "tenant", "company", "created_at", "updated_at"]
        extra_kwargs = {"ticket_number": {"required": False}}


    # HQNATEX_CALLCENTER_TICKET_SCOPE_V1
    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get("request")
        tenant_id = getattr(request, "tenant_id", None)
        company_id = getattr(request, "company_id", None)

        for key in ("customer", "customer_service", "service"):
            field = fields.get(key)
            queryset = getattr(field, "queryset", None)
            if queryset is None:
                continue
            if not tenant_id or not company_id:
                field.queryset = queryset.none()
                continue
            names = {f.name for f in queryset.model._meta.fields}
            if "tenant" not in names:
                field.queryset = queryset.none()
                continue
            queryset = queryset.filter(tenant_id=tenant_id)
            if "company" in names:
                queryset = queryset.filter(company_id=company_id)
            field.queryset = queryset

        return fields

    def validate(self, attrs):
        request = self.context.get("request")
        tenant_id = getattr(request, "tenant_id", None)
        company_id = getattr(request, "company_id", None)
        if not tenant_id or not company_id:
            raise serializers.ValidationError(
                "Active tenant/company context is required."
            )

        def effective(key):
            return attrs.get(key, getattr(self.instance, key, None))

        customer = effective("customer")
        subscription = effective("customer_service")
        service = effective("service")

        for key, obj in (
            ("customer", customer),
            ("customer_service", subscription),
            ("service", service),
        ):
            if obj is None:
                continue
            if str(getattr(obj, "tenant_id", "")) != str(tenant_id):
                raise serializers.ValidationError({
                    key: "Relation is outside the active tenant."
                })
            related_company = getattr(obj, "company_id", None)
            if related_company is not None and (
                str(related_company) != str(company_id)
            ):
                raise serializers.ValidationError({
                    key: "Relation is outside the active company."
                })

        if customer is None:
            raise serializers.ValidationError({
                "customer": "Customer is required."
            })

        if subscription is not None:
            if str(subscription.customer_id) != str(customer.pk):
                raise serializers.ValidationError({
                    "customer_service":
                    "Subscription does not belong to the selected customer."
                })
            if service is not None and (
                str(subscription.service_id) != str(service.pk)
            ):
                raise serializers.ValidationError({
                    "service":
                    "Service does not match the selected subscription."
                })

        if not attrs.get("ticket_number") and self.instance is None:
            attrs["ticket_number"] = f"TCK-{uuid.uuid4().hex[:8].upper()}"
        if not attrs.get("opened_at") and self.instance is None:
            attrs["opened_at"] = timezone.now()

        target_status = attrs.get(
            "status", getattr(self.instance, "status", "open")
        )
        previous = getattr(self.instance, "status", None)
        if target_status in {"resolved", "closed", "cancelled"}:
            if effective("closed_at") is None:
                attrs["closed_at"] = timezone.now()
        elif previous != target_status:
            attrs["closed_at"] = None

        opened = attrs.get(
            "opened_at", getattr(self.instance, "opened_at", None)
        )
        closed = attrs.get(
            "closed_at", getattr(self.instance, "closed_at", None)
        )
        if opened and closed and closed < opened:
            raise serializers.ValidationError({
                "closed_at": "Closing time cannot precede opening time."
            })
        return attrs


    def validate_assigned_user(self, value):
        # Preserve unchanged legacy labels; validate every new assignment.
        value = str(value).strip()
        if not value:
            return ""
        if self.instance is not None and value == self.instance.assigned_user:
            return value

        membership = ticket_assignee_memberships(
            self.context.get("request")
        ).filter(membership__user__email=value).first()
        if membership is None:
            raise serializers.ValidationError(
                "Select an active user belonging to the active company."
            )
        return membership.membership.user.email


class ServicePackageHistorySerializer(serializers.ModelSerializer):
    old_package_name = serializers.CharField(source="old_package.name_english", read_only=True)
    new_package_name = serializers.CharField(source="new_package.name_english", read_only=True)

    class Meta:
        model = ServicePackageHistory
        fields = [
            "id",
            "tenant",
            "company",
            "customer_service",
            "old_package",
            "old_package_name",
            "new_package",
            "new_package_name",
            "reason",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "tenant", "company", "created_at", "updated_at"]


class ServiceStatusHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceStatusHistory
        fields = [
            "id",
            "tenant",
            "company",
            "customer_service",
            "from_status",
            "to_status",
            "reason",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "tenant", "company", "created_at", "updated_at"]


class ServiceChangeRequestSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer_service.customer.display_name", read_only=True)
    service_identifier = serializers.CharField(source="customer_service.identifier", read_only=True)

    class Meta:
        model = ServiceChangeRequest
        fields = ["id", "tenant", "company", "customer_service", "customer_name", "service_identifier", "change_type", "requested_values", "status", "reason", "created_at", "updated_at"]
        read_only_fields = ["id", "tenant", "company", "created_at", "updated_at"]

    def validate_customer_service(self, customer_service):
        request = self.context["request"]
        if customer_service.tenant_id != request.tenant_id:
            raise serializers.ValidationError(
                "Customer service belongs to another tenant."
            )
        if str(customer_service.company_id) != str(request.company_id):
            raise serializers.ValidationError(
                "Customer service belongs to another company."
            )
        return customer_service


class ServiceActivationSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer_service.customer.display_name", read_only=True)
    service_identifier = serializers.CharField(source="customer_service.identifier", read_only=True)
    service_name = serializers.CharField(source="customer_service.service.name_english", read_only=True)

    class Meta:
        model = ServiceActivation
        fields = [
            "id", "tenant", "company", "customer_service", "customer_name",
            "service_identifier", "service_name", "activation_type", "status",
            "requested_at", "scheduled_at", "activated_at", "activated_by", "notes",
            "created_at", "updated_at"
        ]
        read_only_fields = ["id", "tenant", "company", "created_at", "updated_at"]

    def validate_customer_service(self, cs):
        req = self.context.get("request")

        if req and (
            cs.tenant_id != req.tenant_id
            or str(cs.company_id)
            != str(req.company_id)
        ):
            raise serializers.ValidationError(
                "Customer service belongs to another tenant/company."
            )

        relation_changed = (
            self.instance is None
            or str(
                getattr(
                    self.instance,
                    "customer_service_id",
                    "",
                )
            )
            != str(cs.id)
        )

        if relation_changed:
            if cs.service.status != "active":
                raise serializers.ValidationError(
                    "Customer service uses an inactive service and cannot receive a new activation."
                )

            if (
                cs.package_id
                and cs.package.status != "active"
            ):
                raise serializers.ValidationError(
                    "Customer service uses an inactive package and cannot receive a new activation."
                )

        return cs


class InstallationWorkOrderSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer_service.customer.display_name", read_only=True)
    service_identifier = serializers.CharField(source="customer_service.identifier", read_only=True)
    customer_address = serializers.CharField(source="customer_service.customer.address", read_only=True)
    customer_phone = serializers.CharField(source="customer_service.customer.phone", read_only=True)

    class Meta:
        model = InstallationWorkOrder
        fields = [
            "id", "tenant", "company", "customer_service", "customer_name",
            "service_identifier", "customer_address", "customer_phone",
            "activation", "order_number", "work_type", "assigned_team_id",
            "technician_name", "technician_phone", "scheduled_at", "completed_at",
            "status", "notes", "created_at", "updated_at"
        ]
        read_only_fields = ["id", "tenant", "company", "created_at", "updated_at"]
        extra_kwargs = {"order_number": {"required": False}}

    def validate(self, attrs):
        if not attrs.get("order_number") and self.instance is None:
            attrs["order_number"] = f"WO-{uuid.uuid4().hex[:8].upper()}"

        cs = attrs.get(
            "customer_service",
            getattr(
                self.instance,
                "customer_service",
                None,
            ),
        )

        activation = attrs.get(
            "activation",
            getattr(
                self.instance,
                "activation",
                None,
            ),
        )

        req = self.context.get("request")

        if req and cs and (
            cs.tenant_id != req.tenant_id
            or str(cs.company_id) != str(req.company_id)
        ):
            raise serializers.ValidationError(
                {
                    "customer_service":
                        "Customer service belongs to another tenant/company."
                }
            )

        if req and activation and (
            activation.tenant_id != req.tenant_id
            or str(activation.company_id) != str(req.company_id)
        ):
            raise serializers.ValidationError(
                {
                    "activation":
                        "Activation belongs to another tenant/company."
                }
            )

        if (
            activation
            and cs
            and str(activation.customer_service_id)
            != str(cs.id)
        ):
            raise serializers.ValidationError(
                {
                    "activation":
                        "Activation must belong to the selected customer service."
                }
            )

        return attrs


class ProvisioningJobSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer_service.customer.display_name", read_only=True)
    service_identifier = serializers.CharField(source="customer_service.identifier", read_only=True)

    class Meta:
        model = ProvisioningJob
        fields = [
            "id", "tenant", "company", "customer_service", "customer_name",
            "service_identifier", "activation", "job_number", "provisioning_type",
            "target_system", "payload", "response_log", "retry_count",
            "status", "requested_at", "executed_at", "created_at", "updated_at"
        ]
        read_only_fields = ["id", "tenant", "company", "created_at", "updated_at"]
        extra_kwargs = {"job_number": {"required": False}}

    def validate(self, attrs):
        if not attrs.get("job_number") and self.instance is None:
            attrs["job_number"] = f"PRV-{uuid.uuid4().hex[:8].upper()}"

        cs = attrs.get(
            "customer_service",
            getattr(
                self.instance,
                "customer_service",
                None,
            ),
        )

        activation = attrs.get(
            "activation",
            getattr(
                self.instance,
                "activation",
                None,
            ),
        )

        req = self.context.get("request")

        if req and cs and (
            cs.tenant_id != req.tenant_id
            or str(cs.company_id) != str(req.company_id)
        ):
            raise serializers.ValidationError(
                {
                    "customer_service":
                        "Customer service belongs to another tenant/company."
                }
            )

        if req and activation and (
            activation.tenant_id != req.tenant_id
            or str(activation.company_id) != str(req.company_id)
        ):
            raise serializers.ValidationError(
                {
                    "activation":
                        "Activation belongs to another tenant/company."
                }
            )

        if (
            activation
            and cs
            and str(activation.customer_service_id)
            != str(cs.id)
        ):
            raise serializers.ValidationError(
                {
                    "activation":
                        "Activation must belong to the selected customer service."
                }
            )

        return attrs


class IPAssignmentSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer_service.customer.display_name", read_only=True)
    service_identifier = serializers.CharField(source="customer_service.identifier", read_only=True)

    class Meta:
        model = IPAssignment
        fields = [
            "id", "tenant", "company", "customer_service", "customer_name",
            "service_identifier", "ip_resource_id", "assignment_type",
            "ip_address", "subnet_mask", "cidr_prefix", "gateway",
            "primary_dns", "secondary_dns", "vlan_id", "assigned_at",
            "released_at", "status", "created_at", "updated_at"
        ]
        read_only_fields = ["id", "tenant", "company", "created_at", "updated_at"]

    def validate(self, attrs):
        ip = attrs.get("ip_address")

        if ip:
            try:
                ipaddress.ip_address(ip)
            except ValueError:
                raise serializers.ValidationError(
                    {
                        "ip_address":
                            "Invalid IP address format."
                    }
                )

        cs = attrs.get(
            "customer_service",
            getattr(
                self.instance,
                "customer_service",
                None,
            ),
        )

        req = self.context.get("request")

        if req and cs and (
            cs.tenant_id != req.tenant_id
            or str(cs.company_id)
            != str(req.company_id)
        ):
            raise serializers.ValidationError(
                {
                    "customer_service":
                        "Customer service belongs to another tenant/company."
                }
            )

        ip_resource_id = attrs.get(
            "ip_resource_id",
            getattr(
                self.instance,
                "ip_resource_id",
                "",
            ),
        )

        if ip_resource_id:
            try:
                resource_uuid = uuid.UUID(
                    str(ip_resource_id)
                )
            except (
                ValueError,
                TypeError,
                AttributeError,
            ):
                raise serializers.ValidationError(
                    {
                        "ip_resource_id":
                            "Invalid network resource ID."
                    }
                )

            from apps.noc.models import (
                NetworkResource,
            )

            resource = (
                NetworkResource.objects
                .filter(
                    id=resource_uuid
                )
                .first()
            )

            if resource is None:
                raise serializers.ValidationError(
                    {
                        "ip_resource_id":
                            "Network resource does not exist."
                    }
                )

            if req and (
                resource.tenant_id
                != req.tenant_id
                or str(
                    resource.company_id
                )
                != str(
                    req.company_id
                )
            ):
                raise serializers.ValidationError(
                    {
                        "ip_resource_id":
                            "Network resource belongs to another tenant/company."
                    }
                )

            if cs and (
                resource.tenant_id
                != cs.tenant_id
                or str(
                    resource.company_id
                )
                != str(
                    cs.company_id
                )
            ):
                raise serializers.ValidationError(
                    {
                        "ip_resource_id":
                            "Network resource must belong to the same tenant/company as the customer service."
                    }
                )

            if resource.resource_type not in {
                "ip_pool",
                "ip_prefix",
            }:
                raise serializers.ValidationError(
                    {
                        "ip_resource_id":
                            "Network resource must be an IP Pool or IP Prefix."
                    }
                )

            attrs[
                "ip_resource_id"
            ] = str(resource.id)

        return attrs


class RadiusAccountSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer_service.customer.display_name", read_only=True)
    service_identifier = serializers.CharField(source="customer_service.identifier", read_only=True)

    class Meta:
        model = RadiusAccount
        fields = [
            "id", "tenant", "company", "customer_service", "customer_name",
            "service_identifier", "username", "profile_id", "service_type",
            "framed_protocol", "framed_ip_address", "simultaneous_use",
            "rate_limit_up_kbps", "rate_limit_down_kbps", "nas_ip_address",
            "status", "last_auth_at", "created_at", "updated_at"
        ]
        read_only_fields = ["id", "tenant", "company", "last_auth_at", "created_at", "updated_at"]

    def validate_customer_service(self, cs):
        req = self.context.get("request")

        if req and (
            cs.tenant_id != req.tenant_id
            or str(cs.company_id)
            != str(req.company_id)
        ):
            raise serializers.ValidationError(
                "Customer service belongs to another tenant/company."
            )

        return cs

    def validate_username(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "RADIUS username is required."
            )

        req = self.context.get("request")

        if req:
            qs = RadiusAccount.objects.filter(
                tenant_id=req.tenant_id,
                username=value,
            )

            if self.instance is not None:
                qs = qs.exclude(
                    pk=self.instance.pk
                )

            if qs.exists():
                raise serializers.ValidationError(
                    "RADIUS username already exists in this tenant."
                )

        return value

    def validate(self, attrs):
        framed_ip_address = attrs.get(
            "framed_ip_address",
            getattr(
                self.instance,
                "framed_ip_address",
                "",
            ),
        )

        nas_ip_address = attrs.get(
            "nas_ip_address",
            getattr(
                self.instance,
                "nas_ip_address",
                "",
            ),
        )

        simultaneous_use = attrs.get(
            "simultaneous_use",
            getattr(
                self.instance,
                "simultaneous_use",
                1,
            ),
        )

        rate_limit_up_kbps = attrs.get(
            "rate_limit_up_kbps",
            getattr(
                self.instance,
                "rate_limit_up_kbps",
                None,
            ),
        )

        rate_limit_down_kbps = attrs.get(
            "rate_limit_down_kbps",
            getattr(
                self.instance,
                "rate_limit_down_kbps",
                None,
            ),
        )

        if framed_ip_address:
            try:
                ipaddress.ip_address(
                    framed_ip_address
                )
            except ValueError:
                raise serializers.ValidationError(
                    {
                        "framed_ip_address":
                            "Invalid framed IP address format."
                    }
                )

        if nas_ip_address:
            try:
                ipaddress.ip_address(
                    nas_ip_address
                )
            except ValueError:
                raise serializers.ValidationError(
                    {
                        "nas_ip_address":
                            "Invalid NAS IP address format."
                    }
                )

        if (
            simultaneous_use is not None
            and simultaneous_use < 1
        ):
            raise serializers.ValidationError(
                {
                    "simultaneous_use":
                        "Simultaneous use must be at least 1."
                }
            )

        if (
            rate_limit_up_kbps is not None
            and rate_limit_up_kbps < 0
        ):
            raise serializers.ValidationError(
                {
                    "rate_limit_up_kbps":
                        "Upload rate limit cannot be negative."
                }
            )

        if (
            rate_limit_down_kbps is not None
            and rate_limit_down_kbps < 0
        ):
            raise serializers.ValidationError(
                {
                    "rate_limit_down_kbps":
                        "Download rate limit cannot be negative."
                }
            )

        return attrs


class TechnicalTestResultSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer_service.customer.display_name", read_only=True)
    service_identifier = serializers.CharField(source="customer_service.identifier", read_only=True)

    class Meta:
        model = TechnicalTestResult
        fields = [
            "id", "tenant", "company", "customer_service", "customer_name",
            "service_identifier", "activation", "test_type", "result",
            "measured_values", "tested_at", "tested_by", "raw_output",
            "created_at", "updated_at"
        ]
        read_only_fields = ["id", "tenant", "company", "created_at", "updated_at"]

    def validate_customer_service(self, cs):
        req = self.context.get("request")

        if req and (
            cs.tenant_id != req.tenant_id
            or str(cs.company_id)
            != str(req.company_id)
        ):
            raise serializers.ValidationError(
                "Customer service belongs to another tenant/company."
            )

        return cs

    def validate(self, attrs):
        cs = attrs.get(
            "customer_service",
            getattr(
                self.instance,
                "customer_service",
                None,
            ),
        )

        activation = attrs.get(
            "activation",
            getattr(
                self.instance,
                "activation",
                None,
            ),
        )

        req = self.context.get(
            "request"
        )

        if req and activation and (
            activation.tenant_id
            != req.tenant_id
            or str(
                activation.company_id
            )
            != str(
                req.company_id
            )
        ):
            raise serializers.ValidationError(
                {
                    "activation":
                        "Activation belongs to another tenant/company."
                }
            )

        if (
            activation
            and cs
            and str(
                activation.customer_service_id
            )
            != str(
                cs.id
            )
        ):
            raise serializers.ValidationError(
                {
                    "activation":
                        "Activation must belong to the selected customer service."
                }
            )

        return attrs


class ActivationChecklistSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer_service.customer.display_name", read_only=True)
    service_identifier = serializers.CharField(source="customer_service.identifier", read_only=True)

    class Meta:
        model = ActivationChecklist
        fields = [
            "id", "tenant", "company", "customer_service", "customer_name",
            "service_identifier", "activation", "checklist_item_id",
            "checklist_label", "is_mandatory", "result", "checked_by",
            "checked_at", "notes", "created_at", "updated_at"
        ]
        read_only_fields = ["id", "tenant", "company", "created_at", "updated_at"]

    def validate_customer_service(self, cs):
        req = self.context.get("request")

        if req and (
            cs.tenant_id != req.tenant_id
            or str(cs.company_id)
            != str(req.company_id)
        ):
            raise serializers.ValidationError(
                "Customer service belongs to another tenant/company."
            )

        return cs

    def validate(self, attrs):
        cs = attrs.get(
            "customer_service",
            getattr(
                self.instance,
                "customer_service",
                None,
            ),
        )

        activation = attrs.get(
            "activation",
            getattr(
                self.instance,
                "activation",
                None,
            ),
        )

        req = self.context.get(
            "request"
        )

        if req and activation and (
            activation.tenant_id
            != req.tenant_id
            or str(
                activation.company_id
            )
            != str(
                req.company_id
            )
        ):
            raise serializers.ValidationError(
                {
                    "activation":
                        "Activation belongs to another tenant/company."
                }
            )

        if (
            activation
            and cs
            and str(
                activation.customer_service_id
            )
            != str(
                cs.id
            )
        ):
            raise serializers.ValidationError(
                {
                    "activation":
                        "Activation must belong to the selected customer service."
                }
            )

        return attrs


class FieldVisitSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer_service.customer.display_name", read_only=True)
    service_identifier = serializers.CharField(source="customer_service.identifier", read_only=True)

    class Meta:
        model = FieldVisit
        fields = [
            "id", "tenant", "company", "customer_service", "customer_name",
            "service_identifier", "fault_ticket", "installation_work_order",
            "visit_type", "technician_name", "visited_at", "result", "notes",
            "created_at", "updated_at"
        ]
        read_only_fields = ["id", "tenant", "company", "created_at", "updated_at"]

    def validate_customer_service(self, cs):
        req = self.context.get("request")
        if req and (cs.tenant_id != req.tenant_id or str(cs.company_id) != str(req.company_id)):
            raise serializers.ValidationError("Customer service belongs to another tenant/company.")
        return cs


class ServiceSuspensionSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer_service.customer.display_name", read_only=True)
    service_identifier = serializers.CharField(source="customer_service.identifier", read_only=True)

    class Meta:
        model = ServiceSuspension
        fields = [
            "id", "tenant", "company", "customer_service", "customer_name",
            "service_identifier", "suspended_at", "resumed_at", "reason",
            "notes", "status", "created_at", "updated_at"
        ]
        read_only_fields = ["id", "tenant", "company", "created_at", "updated_at"]

    def validate_customer_service(self, cs):
        req = self.context.get("request")
        if req and (cs.tenant_id != req.tenant_id or str(cs.company_id) != str(req.company_id)):
            raise serializers.ValidationError("Customer service belongs to another tenant/company.")
        return cs


class ServiceTerminationSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer_service.customer.display_name", read_only=True)
    service_identifier = serializers.CharField(source="customer_service.identifier", read_only=True)

    class Meta:
        model = ServiceTermination
        fields = [
            "id", "tenant", "company", "customer_service", "customer_name",
            "service_identifier", "requested_at", "terminated_at", "reason",
            "refund_amount", "penalty_amount", "status", "notes",
            "created_at", "updated_at"
        ]
        read_only_fields = ["id", "tenant", "company", "created_at", "updated_at"]

    def validate_customer_service(self, cs):
        req = self.context.get("request")
        if req and (cs.tenant_id != req.tenant_id or str(cs.company_id) != str(req.company_id)):
            raise serializers.ValidationError("Customer service belongs to another tenant/company.")
        return cs


class DecommissionRecordSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer_service.customer.display_name", read_only=True)
    service_identifier = serializers.CharField(source="customer_service.identifier", read_only=True)

    class Meta:
        model = DecommissionRecord
        fields = [
            "id", "tenant", "company", "customer_service", "customer_name",
            "service_identifier", "termination", "resource_type", "resource_id",
            "released_at", "technician_name", "status", "notes",
            "created_at", "updated_at"
        ]
        read_only_fields = ["id", "tenant", "company", "created_at", "updated_at"]

    def validate_customer_service(self, cs):
        req = self.context.get("request")
        if req and (cs.tenant_id != req.tenant_id or str(cs.company_id) != str(req.company_id)):
            raise serializers.ValidationError("Customer service belongs to another tenant/company.")
        return cs


class TechnicalChangeHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = TechnicalChangeHistory
        fields = [
            "id", "tenant", "company", "customer_service", "entity_type",
            "entity_id", "field_name", "old_value", "new_value", "changed_by",
            "changed_at", "created_at", "updated_at"
        ]
        read_only_fields = ["id", "tenant", "company", "created_at", "updated_at"]


class TechnicalAttachmentSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer_service.customer.display_name", read_only=True)
    service_identifier = serializers.CharField(source="customer_service.identifier", read_only=True)

    class Meta:
        model = TechnicalAttachment
        fields = [
            "id", "tenant", "company", "customer_service", "customer_name",
            "service_identifier", "activation", "installation", "fault_ticket",
            "title", "document_type", "file_url", "file_size_bytes",
            "uploaded_by", "created_at", "updated_at"
        ]
        read_only_fields = ["id", "tenant", "company", "created_at", "updated_at"]

    def validate_customer_service(self, cs):
        req = self.context.get("request")
        if req and (cs.tenant_id != req.tenant_id or str(cs.company_id) != str(req.company_id)):
            raise serializers.ValidationError("Customer service belongs to another tenant/company.")
        return cs



# HQNATEX_TICKET_ASSIGNEES_BACKEND_V1
def ticket_assignee_memberships(request):
    from apps.iam.models import CompanyMembership, TenantMembership, User
    from django.db.models.functions import Length

    tenant_id = getattr(request, "tenant_id", None)
    company_id = getattr(request, "company_id", None)
    queryset = CompanyMembership.objects.select_related("membership__user")
    if not tenant_id or not company_id:
        return queryset.none()

    return queryset.filter(
        tenant_id=tenant_id,
        company_id=company_id,
        company__tenant_id=tenant_id,
        company__status="active",
        status=CompanyMembership.Status.ACTIVE,
        membership__tenant_id=tenant_id,
        membership__status=TenantMembership.Status.ACTIVE,
        membership__user__status=User.Status.ACTIVE,
    ).annotate(
        assignee_email_length=Length("membership__user__email"),
    ).filter(
        assignee_email_length__lte=160,
    ).exclude(
        membership__user__email="",
    ).order_by("membership__user__full_name", "membership__user_id")
