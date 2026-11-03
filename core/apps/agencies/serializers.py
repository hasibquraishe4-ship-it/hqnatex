from rest_framework import serializers
from .models import Agency


class AgencySerializer(serializers.ModelSerializer):
    class Meta:
        model = Agency
        fields = ["id", "tenant", "company", "branch", "code", "name", "status", "created_at", "updated_at"]
        read_only_fields = ["id", "tenant", "created_at", "updated_at"]

    def validate(self, attrs):
        tenant_id = self.context["request"].tenant_id
        company = attrs.get("company", getattr(self.instance, "company", None))
        branch = attrs.get("branch", getattr(self.instance, "branch", None))
        if company and company.tenant_id != tenant_id:
            raise serializers.ValidationError({"company": "Company belongs to another tenant."})
        if branch and branch.tenant_id != tenant_id:
            raise serializers.ValidationError({"branch": "Branch belongs to another tenant."})
        if branch and company and branch.company_id != company.id:
            raise serializers.ValidationError({"branch": "Branch does not belong to the selected company."})
        return attrs
