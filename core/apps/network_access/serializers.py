import ipaddress

from rest_framework import serializers

from .models import (
    APIClientRegistry, CompanyNetworkPolicy, ConnectivityObservation,
    IntegrationEndpoint, ManagedNetworkDevice, NetworkAddressRule, VPNProfile,
    ActivationAuditLog, RadiusSession, SubscriberDevice, SubscriberRouterBinding,
)


def validate_network(value: str, *, field_name: str = "cidr") -> str:
    value = str(value or "").strip()
    try:
        ipaddress.ip_network(value, strict=False)
    except ValueError as exc:
        raise serializers.ValidationError(f"{field_name} must be a valid IPv4/IPv6 address or CIDR.") from exc
    return value


class CompanyOwnedValidationMixin:
    def validate(self, attrs):
        attrs = super().validate(attrs)
        request = self.context["request"]
        company_id = getattr(request, "company_id", None) or request.headers.get("X-Company-ID")
        branch = attrs.get("branch", getattr(self.instance, "branch", None))
        if branch:
            if str(branch.tenant_id) != str(request.tenant_id):
                raise serializers.ValidationError({"branch": "Branch belongs to another tenant."})
            if company_id and str(branch.company_id) != str(company_id):
                raise serializers.ValidationError({"branch": "Branch belongs to another company."})
        return attrs


class CompanyNetworkPolicySerializer(CompanyOwnedValidationMixin, serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.legal_name", read_only=True)
    class Meta:
        model = CompanyNetworkPolicy
        fields = ["id","tenant","company","company_name","ui_access_mode","api_access_mode","status","notes","live_activation_enabled","device_write_enabled","created_at","updated_at"]
        read_only_fields = ["id","tenant","company","company_name","live_activation_enabled","device_write_enabled","created_at","updated_at"]


class NetworkAddressRuleSerializer(CompanyOwnedValidationMixin, serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.legal_name", read_only=True)
    branch_name = serializers.CharField(source="branch.name", read_only=True)
    class Meta:
        model = NetworkAddressRule
        fields = ["id","tenant","company","company_name","branch","branch_name","label","cidr","rule_type","purpose","status","valid_from","valid_to","metadata","created_at","updated_at"]
        read_only_fields = ["id","tenant","company","company_name","created_at","updated_at"]
    def validate_cidr(self, value): return validate_network(value)


class VPNProfileSerializer(CompanyOwnedValidationMixin, serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.legal_name", read_only=True)
    branch_name = serializers.CharField(source="branch.name", read_only=True)
    class Meta:
        model = VPNProfile
        fields = ["id","tenant","company","company_name","branch","branch_name","name","cidr","gateway","provider","tunnel_type","secret_ref","status","metadata","created_at","updated_at"]
        read_only_fields = ["id","tenant","company","company_name","created_at","updated_at"]
    def validate_cidr(self, value): return validate_network(value)


class ManagedNetworkDeviceSerializer(CompanyOwnedValidationMixin, serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.legal_name", read_only=True)
    branch_name = serializers.CharField(source="branch.name", read_only=True)
    network_resource_code = serializers.CharField(source="network_resource.code", read_only=True)
    class Meta:
        model = ManagedNetworkDevice
        fields = ["id","tenant","company","company_name","branch","branch_name","network_resource","network_resource_code","code","name","device_type","management_ip","vendor","model","serial_number","access_mode","secret_ref","status","last_known_state","last_seen_at","metadata","created_at","updated_at"]
        read_only_fields = ["id","tenant","company","company_name","created_at","updated_at"]
    def validate_management_ip(self, value):
        return validate_network(value, field_name="management_ip") if value else value
    def validate_access_mode(self, value):
        if value not in {"config_only","read_only"}:
            raise serializers.ValidationError("Write/provisioning access is disabled.")
        return value
    def validate(self, attrs):
        attrs = super().validate(attrs)
        request = self.context["request"]
        company_id = getattr(request, "company_id", None) or request.headers.get("X-Company-ID")
        resource = attrs.get("network_resource", getattr(self.instance, "network_resource", None))
        if resource:
            if str(resource.tenant_id) != str(request.tenant_id):
                raise serializers.ValidationError({"network_resource":"Resource belongs to another tenant."})
            if company_id and str(resource.company_id) != str(company_id):
                raise serializers.ValidationError({"network_resource":"Resource belongs to another company."})
        return attrs


class APIClientRegistrySerializer(CompanyOwnedValidationMixin, serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.legal_name", read_only=True)
    class Meta:
        model = APIClientRegistry
        fields = ["id","tenant","company","company_name","name","client_id","key_fingerprint","secret_ref","allowed_cidrs","scopes","rate_limit_per_minute","status","expires_at","metadata","created_at","updated_at"]
        read_only_fields = ["id","tenant","company","company_name","created_at","updated_at"]
    def validate_allowed_cidrs(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("allowed_cidrs must be a list.")
        return [validate_network(v) for v in value]


class IntegrationEndpointSerializer(CompanyOwnedValidationMixin, serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.legal_name", read_only=True)
    branch_name = serializers.CharField(source="branch.name", read_only=True)
    class Meta:
        model = IntegrationEndpoint
        fields = ["id","tenant","company","company_name","branch","branch_name","code","name","integration_type","host","port","base_url","auth_mode","secret_ref","execution_mode","enabled","status","last_checked_at","metadata","created_at","updated_at"]
        read_only_fields = ["id","tenant","company","company_name","created_at","updated_at"]
    def validate_execution_mode(self, value):
        if value not in {"config_only","read_only"}:
            raise serializers.ValidationError("Live write/provisioning execution is disabled.")
        return value


class ConnectivityObservationSerializer(CompanyOwnedValidationMixin, serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.legal_name", read_only=True)
    device_code = serializers.CharField(source="device.code", read_only=True)
    integration_code = serializers.CharField(source="integration.code", read_only=True)
    class Meta:
        model = ConnectivityObservation
        fields = ["id","tenant","company","company_name","device","device_code","integration","integration_code","target","observation_type","status","latency_ms","checked_at","details","created_at","updated_at"]
        read_only_fields = ["id","tenant","company","company_name","created_at","updated_at"]


class SubscriberRouterBindingSerializer(CompanyOwnedValidationMixin, serializers.ModelSerializer):
    class Meta:
        model = SubscriberRouterBinding
        fields = ["id", "tenant", "company", "customer_service", "device", "allowed_mac", "status", "approved_at", "removed_at", "notes", "created_at", "updated_at"]
        read_only_fields = ["id", "tenant", "company", "created_at", "updated_at"]


class SubscriberDeviceSerializer(CompanyOwnedValidationMixin, serializers.ModelSerializer):
    class Meta:
        model = SubscriberDevice
        fields = ["id", "tenant", "company", "customer_service", "mac_address", "hostname", "device_type", "ip_address", "first_seen_at", "last_seen_at", "status", "metadata", "created_at", "updated_at"]
        read_only_fields = ["id", "tenant", "company", "created_at", "updated_at"]


class RadiusSessionSerializer(CompanyOwnedValidationMixin, serializers.ModelSerializer):
    class Meta:
        model = RadiusSession
        fields = ["id", "tenant", "company", "customer_service", "username", "session_id", "nas_ip_address", "framed_ip_address", "calling_station_id", "started_at", "ended_at", "input_octets", "output_octets", "status", "created_at", "updated_at"]
        read_only_fields = ["id", "tenant", "company", "created_at", "updated_at"]


class ActivationAuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivationAuditLog
        fields = ["id", "tenant", "company", "customer_service", "action", "requested_by", "result", "details", "created_at", "updated_at"]
        read_only_fields = fields
