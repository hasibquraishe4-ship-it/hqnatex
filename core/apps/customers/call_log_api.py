# HQNATEX_CUSTOMER_CALL_LOG_API_V1
from django.db import transaction
from django.utils import timezone
from django.db.models import Count, Q
from rest_framework import serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.common.api import CompanyScopedModelViewSet
from apps.iam.models import CompanyMembership
from .models import CustomerCallLog


class CustomerCallLogSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(
        source="customer.display_name", read_only=True,
    )
    ticket_number = serializers.CharField(
        source="ticket.ticket_number", read_only=True,
    )
    operator_name = serializers.CharField(
        source="operator.full_name", read_only=True,
    )
    operator_email = serializers.CharField(
        source="operator.email", read_only=True,
    )
    duration_seconds = serializers.ReadOnlyField()

    class Meta:
        model = CustomerCallLog
        fields = [
            "id", "tenant", "company", "customer", "customer_name",
            "ticket", "ticket_number", "operator", "operator_name",
            "operator_email", "phone_number", "direction",
            "started_at", "ended_at", "duration_seconds", "outcome",
            "subject", "notes", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "tenant", "company", "operator",
            "created_at", "updated_at",
        ]

    def to_internal_value(self, data):
        if not hasattr(data, "keys"):
            raise serializers.ValidationError("Expected an object.")
        allowed = {
            "customer", "ticket", "phone_number", "direction",
            "started_at", "ended_at", "outcome", "subject", "notes",
        }
        unexpected = set(data.keys()) - allowed
        if unexpected:
            raise serializers.ValidationError({
                str(key): "This field is not accepted."
                for key in sorted(unexpected)
            })
        return super().to_internal_value(data)

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get("request")
        tenant_id = getattr(request, "tenant_id", None)
        company_id = getattr(request, "company_id", None)
        for key in ("customer", "ticket"):
            field = fields[key]
            field.queryset = (
                field.queryset.filter(
                    tenant_id=tenant_id, company_id=company_id,
                )
                if tenant_id and company_id else field.queryset.none()
            )
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

        ticket = effective("ticket")
        customer = effective("customer")

        for key, obj in (("customer", customer), ("ticket", ticket)):
            if obj is not None and (
                str(obj.tenant_id) != str(tenant_id)
                or str(obj.company_id) != str(company_id)
            ):
                raise serializers.ValidationError({
                    key: "Relation is outside the active company."
                })

        if ticket is not None:
            if customer is None:
                if "customer" in attrs:
                    raise serializers.ValidationError({
                        "customer": "A linked ticket requires its customer."
                    })
                customer = ticket.customer
                attrs["customer"] = customer
                if (
                    str(customer.tenant_id) != str(tenant_id)
                    or str(customer.company_id) != str(company_id)
                ):
                    raise serializers.ValidationError({
                        "ticket": "Ticket customer is outside the active company."
                    })
            if str(customer.pk) != str(ticket.customer_id):
                raise serializers.ValidationError({
                    "ticket": "Ticket does not belong to the selected customer."
                })

        started = effective("started_at")
        ended = effective("ended_at")
        if started and ended and ended < started:
            raise serializers.ValidationError({
                "ended_at": "Ending time cannot precede starting time."
            })
        return attrs


class CustomerCallLogViewSet(CompanyScopedModelViewSet):
    queryset = CustomerCallLog.objects.select_related(
        "customer", "ticket", "operator",
    ).all()
    serializer_class = CustomerCallLogSerializer
    permission_read = "customers.view"
    permission_write = "customers.manage"
    http_method_names = ["get", "post", "put", "patch", "head", "options"]

    def get_queryset(self):
        queryset = super().get_queryset()
        for key in ("direction", "outcome", "customer", "ticket", "operator"):
            value = self.request.query_params.get(key)
            if value:
                field = self.serializer_class().fields.get(key)
                if key in ("direction", "outcome"):
                    if value not in field.choices:
                        raise serializers.ValidationError({
                            key: "Invalid filter value."
                        })
                else:
                    try:
                        value = serializers.UUIDField().run_validation(value)
                    except serializers.ValidationError:
                        raise serializers.ValidationError({
                            key: "Invalid UUID filter."
                        })
                queryset = queryset.filter(**{key: value})

        term = self.request.query_params.get("search", "").strip()
        if term:
            queryset = queryset.filter(
                Q(phone_number__icontains=term)
                | Q(subject__icontains=term)
                | Q(customer__display_name__icontains=term)
                | Q(ticket__ticket_number__icontains=term)
            )

        queryset = queryset.order_by("-started_at", "-id")
        if self.request.method in ("PUT", "PATCH"):
            queryset = queryset.select_for_update(of=("self",))
        return queryset

    # HQNATEX_CALLCENTER_AGENTS_READONLY_V1
    @action(detail=False, methods=["get"], url_path="agents")
    def agents(self, request):
        memberships = (
            CompanyMembership.objects
            .select_related("membership__user", "company")
            .filter(
                tenant_id=request.tenant_id,
                company_id=request.company_id,
                status="active",
                company__status="active",
                membership__status="active",
                membership__user__status="active",
                membership__membership_roles__tenant_id=request.tenant_id,
                membership__membership_roles__role__status="active",
                membership__membership_roles__role__role_permissions__tenant_id=request.tenant_id,
                membership__membership_roles__role__role_permissions__permission__key="customers.view",
            )
            .distinct()
            .order_by("membership__user__full_name", "membership__user__email")
        )
        results = []
        for grant in memberships:
            user = grant.membership.user
            roles = list(
                grant.membership.membership_roles
                .filter(
                    tenant_id=request.tenant_id,
                    role__status="active",
                    role__role_permissions__tenant_id=request.tenant_id,
                    role__role_permissions__permission__key="customers.view",
                )
                .values_list("role__key", flat=True)
                .distinct()
            )
            results.append({
                "membership_id": str(grant.membership_id),
                "user_id": str(user.pk),
                "name": user.full_name or user.email,
                "email": user.email,
                "roles": roles,
                "status": "active",
            })
        return Response(results)

    # HQNATEX_CALLCENTER_SUPERVISOR_CALL_SUMMARY_V1
    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):
        queryset = self.get_queryset()
        outcomes = {
            row["outcome"]: row["total"]
            for row in queryset.values("outcome")
            .annotate(total=Count("id"))
        }
        return Response({
            "total": queryset.count(),
            "today": queryset.filter(
                started_at__date=timezone.localdate()
            ).count(),
            "inbound": queryset.filter(direction="inbound").count(),
            "outbound": queryset.filter(direction="outbound").count(),
            "outcomes": {
                key: outcomes.get(key, 0)
                for key in (
                    "answered", "missed", "no_answer",
                    "busy", "failed", "cancelled",
                )
            },
            "live_presence": {
                "available": False,
                "reason": "Telephony presence is not configured.",
            },
        })

    @transaction.atomic
    def perform_create(self, serializer):
        serializer.validated_data["operator"] = self.request.user
        # Existing shared save and audit behavior.
        super().perform_create(serializer)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)
