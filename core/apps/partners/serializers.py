from rest_framework import serializers

from .models import Partner


class PartnerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Partner
        fields = [
            "id",
            "tenant",
            "company",
            "code",
            "legal_name",
            "trade_name",
            "tax_id",
            "registration_no",
            "phone",
            "email",
            "address",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "tenant",
            "created_at",
            "updated_at",
        ]

    def validate_company(self, company):
        request = self.context.get("request")
        tenant_id = getattr(request, "tenant_id", None) if request else None

        if tenant_id and company.tenant_id != tenant_id:
            raise serializers.ValidationError(
                "Selected company belongs to another tenant."
            )

        return company
