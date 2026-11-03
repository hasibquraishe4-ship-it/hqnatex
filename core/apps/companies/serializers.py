from rest_framework import serializers
from .models import Company


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ["id", "tenant", "code", "legal_name", "trade_name", "status", "is_primary", "created_at", "updated_at"]
        read_only_fields = ["id", "tenant", "created_at", "updated_at"]
