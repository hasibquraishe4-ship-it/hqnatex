from rest_framework import serializers
from .models import Branch


class BranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = ["id", "tenant", "company", "code", "name", "status", "created_at", "updated_at"]
        read_only_fields = ["id", "tenant", "created_at", "updated_at"]

    def validate_company(self, company):
        tenant_id = self.context["request"].tenant_id
        if company.tenant_id != tenant_id:
            raise serializers.ValidationError("Company belongs to another tenant.")
        return company
