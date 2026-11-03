from rest_framework import serializers

from apps.common.api import CompanyScopedModelViewSet
from .models import (
    CustomerCallLog,
    CustomerCallQualityEvaluation,
    CustomerFollowUp,
    CustomerTicket,
)


class CustomerCallQualityEvaluationSerializer(serializers.ModelSerializer):
    evaluator_name = serializers.CharField(
        source="evaluator.full_name",
        read_only=True,
    )

    class Meta:
        model = CustomerCallQualityEvaluation
        fields = [
            "id",
            "tenant",
            "company",
            "call_log",
            "ticket",
            "follow_up",
            "evaluator",
            "evaluator_name",
            "score",
            "note",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "tenant",
            "company",
            "evaluator",
            "evaluator_name",
            "created_at",
            "updated_at",
        ]

    def to_internal_value(self, data):
        allowed = {"call_log", "ticket", "follow_up", "score", "note"}
        unexpected = set(data.keys()) - allowed if hasattr(data, "keys") else set()
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

        scoped_models = {
            "call_log": CustomerCallLog,
            "ticket": CustomerTicket,
            "follow_up": CustomerFollowUp,
        }
        for name, model in scoped_models.items():
            fields[name].queryset = (
                model.objects.filter(
                    tenant_id=tenant_id,
                    company_id=company_id,
                )
                if tenant_id and company_id
                else model.objects.none()
            )
        return fields

    def validate(self, attrs):
        targets = ("call_log", "ticket", "follow_up")
        selected = [
            key for key in targets
            if attrs.get(key, getattr(self.instance, key, None)) is not None
        ]
        if len(selected) != 1:
            raise serializers.ValidationError(
                "Select exactly one call, ticket, or follow-up."
            )

        request = self.context.get("request")
        tenant_id = getattr(request, "tenant_id", None)
        company_id = getattr(request, "company_id", None)
        for key in targets:
            obj = attrs.get(key, getattr(self.instance, key, None))
            if obj is not None and (
                str(obj.tenant_id) != str(tenant_id)
                or str(obj.company_id) != str(company_id)
            ):
                raise serializers.ValidationError({
                    key: "Record is outside the active company."
                })
        return attrs


class CustomerCallQualityEvaluationViewSet(CompanyScopedModelViewSet):
    queryset = CustomerCallQualityEvaluation.objects.select_related(
        "call_log",
        "ticket",
        "follow_up",
        "evaluator",
    ).all()
    serializer_class = CustomerCallQualityEvaluationSerializer
    permission_read = "customers.view"
    permission_write = "customers.manage"

    def get_queryset(self):
        return super().get_queryset().filter(
            tenant_id=self.request.tenant_id,
            company_id=self.request.company_id,
        )

    def perform_create(self, serializer):
        serializer.save(
            tenant_id=self.request.tenant_id,
            company_id=self.request.company_id,
            evaluator=self.request.user,
        )
