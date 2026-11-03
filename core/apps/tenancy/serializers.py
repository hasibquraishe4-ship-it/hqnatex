from rest_framework import serializers
from .models import Tenant


class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = ["id", "code", "name", "status", "timezone", "default_language", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]
