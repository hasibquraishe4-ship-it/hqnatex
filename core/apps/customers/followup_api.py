# HQNATEX_CALLCENTER_FOLLOWUP_API_V2

from django.db.models import Q
from django.utils import timezone

from rest_framework import serializers
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.common.api import CompanyScopedModelViewSet

from .models import CustomerFollowUp


class CustomerFollowUpSerializer(serializers.ModelSerializer):
    customer_label = serializers.SerializerMethodField()
    ticket_number = serializers.CharField(
        source="ticket.ticket_number",
        read_only=True,
    )
    assigned_to_name = serializers.SerializerMethodField()

    class Meta:
        model = CustomerFollowUp
        fields = (
            "id",
            "customer",
            "customer_label",
            "ticket",
            "ticket_number",
            "call_log",
            "assigned_to",
            "assigned_to_name",
            "scheduled_at",
            "subject",
            "notes",
            "outcome",
            "status",
            "priority",
            "completed_at",
            "cancelled_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "assigned_to",
            "status",
            "completed_at",
            "cancelled_at",
            "created_at",
            "updated_at",
        )

    def get_customer_label(self, obj):
        customer = obj.customer

        for attr in (
            "display_name",
            "name",
            "full_name",
            "customer_name",
            "code",
        ):
            value = getattr(customer, attr, None)
            if value:
                return str(value)

        return str(customer)

    def get_assigned_to_name(self, obj):
        user = obj.assigned_to
        if user is None:
            return ""

        getter = getattr(user, "get_full_name", None)

        if callable(getter):
            value = getter()
            if value:
                return value

        for attr in ("email", "username"):
            value = getattr(user, attr, None)
            if value:
                return str(value)

        return str(user)

    def _scope_ids(self):
        request = self.context.get("request")

        tenant = getattr(request, "tenant", None)
        company = getattr(request, "company", None)

        tenant_id = getattr(
            tenant,
            "pk",
            getattr(request, "tenant_id", None),
        )
        company_id = getattr(
            company,
            "pk",
            getattr(request, "company_id", None),
        )

        return tenant_id, company_id

    def validate(self, attrs):
        instance = self.instance

        customer = attrs.get(
            "customer",
            getattr(instance, "customer", None),
        )
        ticket = attrs.get(
            "ticket",
            getattr(instance, "ticket", None),
        )
        call_log = attrs.get(
            "call_log",
            getattr(instance, "call_log", None),
        )

        tenant_id, company_id = self._scope_ids()

        for field, obj in (
            ("customer", customer),
            ("ticket", ticket),
            ("call_log", call_log),
        ):
            if obj is None:
                continue

            obj_tenant_id = getattr(obj, "tenant_id", None)
            obj_company_id = getattr(obj, "company_id", None)

            if (
                tenant_id is not None
                and obj_tenant_id is not None
                and str(obj_tenant_id) != str(tenant_id)
            ):
                raise serializers.ValidationError({
                    field: "Object is outside the active tenant."
                })

            if (
                company_id is not None
                and obj_company_id is not None
                and str(obj_company_id) != str(company_id)
            ):
                raise serializers.ValidationError({
                    field: "Object is outside the active company."
                })

        if ticket is not None and customer is not None:
            if str(ticket.customer_id) != str(customer.pk):
                raise serializers.ValidationError({
                    "ticket":
                    "Ticket does not belong to the selected customer."
                })

        if call_log is not None and customer is not None:
            if (
                call_log.customer_id is not None
                and str(call_log.customer_id)
                != str(customer.pk)
            ):
                raise serializers.ValidationError({
                    "call_log":
                    "Call log does not belong to the selected customer."
                })

        if (
            ticket is not None
            and call_log is not None
            and call_log.ticket_id is not None
            and str(call_log.ticket_id)
            != str(ticket.pk)
        ):
            raise serializers.ValidationError({
                "call_log":
                "Call log ticket does not match the selected ticket."
            })

        return attrs

    def create(self, validated_data):
        request = self.context.get("request")

        if (
            request is not None
            and getattr(request, "user", None) is not None
            and request.user.is_authenticated
        ):
            validated_data.setdefault(
                "assigned_to",
                request.user,
            )

        return super().create(validated_data)


class CustomerFollowUpViewSet(CompanyScopedModelViewSet):
    queryset = CustomerFollowUp.objects.select_related(
        "customer",
        "ticket",
        "call_log",
        "assigned_to",
    ).all()

    serializer_class = CustomerFollowUpSerializer

    def get_queryset(self):
        queryset = (
            super()
            .get_queryset()
            .select_related(
                "customer",
                "ticket",
                "call_log",
                "assigned_to",
            )
        )

        p = self.request.query_params

        status_value = p.get("status")
        priority_value = p.get("priority")
        customer = p.get("customer")
        ticket = p.get("ticket")
        assigned_to = p.get("assigned_to")
        scheduled_from = p.get("scheduled_from")
        scheduled_to = p.get("scheduled_to")
        term = (p.get("q") or "").strip()

        if status_value:
            queryset = queryset.filter(status=status_value)

        if priority_value:
            queryset = queryset.filter(priority=priority_value)

        if customer:
            queryset = queryset.filter(customer_id=customer)

        if ticket:
            queryset = queryset.filter(ticket_id=ticket)

        if assigned_to:
            queryset = queryset.filter(
                assigned_to_id=assigned_to
            )

        if scheduled_from:
            queryset = queryset.filter(
                scheduled_at__gte=scheduled_from
            )

        if scheduled_to:
            queryset = queryset.filter(
                scheduled_at__lte=scheduled_to
            )

        if term:
            queryset = queryset.filter(
                Q(subject__icontains=term)
                | Q(notes__icontains=term)
                | Q(outcome__icontains=term)
                | Q(ticket__ticket_number__icontains=term)
            )

        return queryset.order_by(
            "scheduled_at",
            "-created_at",
        )

    @action(detail=False, methods=["get"])
    def summary(self, request):
        queryset = self.get_queryset()
        pending = queryset.filter(
            status=CustomerFollowUp.Status.PENDING
        )
        now = timezone.now()

        return Response({
            "total": queryset.count(),
            "pending": pending.count(),
            "completed": queryset.filter(
                status=CustomerFollowUp.Status.COMPLETED
            ).count(),
            "cancelled": queryset.filter(
                status=CustomerFollowUp.Status.CANCELLED
            ).count(),
            "overdue": pending.filter(
                scheduled_at__lt=now
            ).count(),
        })

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        obj = self.get_object()

        obj.status = CustomerFollowUp.Status.COMPLETED
        obj.completed_at = timezone.now()
        obj.cancelled_at = None

        if "outcome" in request.data:
            obj.outcome = str(
                request.data.get("outcome") or ""
            )

        obj.save(
            update_fields=[
                "status",
                "completed_at",
                "cancelled_at",
                "outcome",
                "updated_at",
            ]
        )

        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        obj = self.get_object()

        obj.status = CustomerFollowUp.Status.CANCELLED
        obj.cancelled_at = timezone.now()
        obj.completed_at = None

        obj.save(
            update_fields=[
                "status",
                "cancelled_at",
                "completed_at",
                "updated_at",
            ]
        )

        return Response(self.get_serializer(obj).data)
