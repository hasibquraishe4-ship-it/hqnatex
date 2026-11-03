from rest_framework import serializers
from .models import TenantDatabase, PrivilegedAccessSession, TenantFeatureFlag, TenantStorageQuota

class TenantDatabaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = TenantDatabase
        exclude = ("password_secret_ref",)

class PrivilegedAccessSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrivilegedAccessSession
        fields = "__all__"
        read_only_fields = ("requested_by", "approved_by", "status", "starts_at", "ended_at")

class TenantFeatureFlagSerializer(serializers.ModelSerializer):
    class Meta:
        model = TenantFeatureFlag
        fields = "__all__"

class TenantStorageQuotaSerializer(serializers.ModelSerializer):
    class Meta:
        model = TenantStorageQuota
        fields = "__all__"
