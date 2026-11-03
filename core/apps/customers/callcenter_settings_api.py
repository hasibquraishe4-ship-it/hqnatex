from datetime import time
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from rest_framework import serializers
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.common.api import CompanyScopedModelViewSet
from .models import (
    CustomerCallCenterSettings,
    default_customer_callcenter_settings,
)


class CustomerCallCenterSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerCallCenterSettings
        fields = ["id", "configuration", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_configuration(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Expected a settings object.")

        defaults = default_customer_callcenter_settings()
        if set(value) != set(defaults):
            raise serializers.ValidationError("Settings sections are incomplete or unknown.")

        hours = value["business_hours"]
        if not isinstance(hours, dict) or set(hours) != {"timezone", "days"}:
            raise serializers.ValidationError({"business_hours": "Invalid schedule."})
        try:
            ZoneInfo(hours["timezone"])
        except (ZoneInfoNotFoundError, TypeError):
            raise serializers.ValidationError({"business_hours": "Invalid timezone."})

        days = hours["days"]
        if not isinstance(days, dict) or set(days) != set(defaults["business_hours"]["days"]):
            raise serializers.ValidationError({"business_hours": "All seven days are required."})
        for day, schedule in days.items():
            if not isinstance(schedule, dict) or set(schedule) != {"enabled", "open", "close"}:
                raise serializers.ValidationError({"business_hours": f"Invalid {day} schedule."})
            if not isinstance(schedule["enabled"], bool):
                raise serializers.ValidationError({"business_hours": f"Invalid {day} status."})
            try:
                opening, closing = time.fromisoformat(schedule["open"]), time.fromisoformat(schedule["close"])
            except (TypeError, ValueError):
                raise serializers.ValidationError({"business_hours": f"Invalid {day} hours."})
            if opening >= closing:
                raise serializers.ValidationError({"business_hours": f"{day} closing must follow opening."})

        priorities = {"low", "normal", "high", "urgent"}
        sla = value["sla"]
        if not isinstance(sla, dict) or set(sla) != {"first_response_minutes", "resolution_minutes"}:
            raise serializers.ValidationError({"sla": "Invalid SLA settings."})
        for name, values in sla.items():
            if not isinstance(values, dict) or set(values) != priorities:
                raise serializers.ValidationError({"sla": f"Invalid {name} priorities."})
            if any(type(v) is not int or v < 1 or v > 10080 for v in values.values()):
                raise serializers.ValidationError({"sla": f"{name} must be 1–10080 minutes."})

        allowed_outcomes = set(defaults["outcomes"])
        outcomes = value["outcomes"]
        if not isinstance(outcomes, list) or not outcomes or len(outcomes) != len(set(outcomes)):
            raise serializers.ValidationError({"outcomes": "Choose unique call outcomes."})
        if not set(outcomes) <= allowed_outcomes:
            raise serializers.ValidationError({"outcomes": "Unknown call outcome."})

        rubric = value["quality_rubric"]
        if not isinstance(rubric, list) or not 1 <= len(rubric) <= 10:
            raise serializers.ValidationError({"quality_rubric": "Use 1–10 criteria."})
        keys = [item.get("key") for item in rubric if isinstance(item, dict)]
        if len(keys) != len(rubric) or len(set(keys)) != len(keys):
            raise serializers.ValidationError({"quality_rubric": "Criteria must be unique."})
        if any(type(item.get("weight")) is not int or item["weight"] < 1 for item in rubric):
            raise serializers.ValidationError({"quality_rubric": "Weights must be positive integers."})
        if sum(item["weight"] for item in rubric) != 100:
            raise serializers.ValidationError({"quality_rubric": "Weights must total 100."})

        queues = value["queues"]
        if not isinstance(queues, list) or len(queues) > 30:
            raise serializers.ValidationError({"queues": "Use up to 30 queues."})
        queue_keys = []
        for queue in queues:
            if not isinstance(queue, dict) or set(queue) != {"key", "name", "agents"}:
                raise serializers.ValidationError({"queues": "Invalid queue entry."})
            if not isinstance(queue["key"], str) or not queue["key"].strip():
                raise serializers.ValidationError({"queues": "Queue key is required."})
            if not isinstance(queue["name"], str) or not queue["name"].strip():
                raise serializers.ValidationError({"queues": "Queue name is required."})
            if not isinstance(queue["agents"], list) or any(not isinstance(e, str) for e in queue["agents"]):
                raise serializers.ValidationError({"queues": "Queue agents must be email addresses."})
            queue_keys.append(queue["key"].strip().lower())
        if len(set(queue_keys)) != len(queue_keys):
            raise serializers.ValidationError({"queues": "Queue keys must be unique."})
        return value


class CustomerCallCenterSettingsViewSet(CompanyScopedModelViewSet):
    queryset = CustomerCallCenterSettings.objects.all()
    serializer_class = CustomerCallCenterSettingsSerializer
    permission_read = "customers.view"
    permission_write = "customers.manage"
    http_method_names = ["get", "put", "head", "options"]

    def get_queryset(self):
        return super().get_queryset().filter(
            tenant_id=self.request.tenant_id,
            company_id=self.request.company_id,
        )

    @action(detail=False, methods=["get", "put"], url_path="current")
    def current(self, request):
        instance = self.get_queryset().first()
        if request.method == "GET":
            if instance:
                return Response(self.get_serializer(instance).data)
            return Response({
                "configuration": default_customer_callcenter_settings(),
            })

        serializer = self.get_serializer(instance, data=request.data)
        serializer.is_valid(raise_exception=True)
        if instance:
            serializer.save()
        else:
            serializer.save(
                tenant_id=request.tenant_id,
                company_id=request.company_id,
            )
        return Response(serializer.data)
