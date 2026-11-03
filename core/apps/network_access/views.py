
from apps.audit.models import AuditLog
from apps.common.api import CompanyScopedModelViewSet

from .models import (
    APIClientRegistry, CompanyNetworkPolicy, ConnectivityObservation,
    IntegrationEndpoint, ManagedNetworkDevice, NetworkAddressRule, VPNProfile,
    ActivationAuditLog, RadiusSession, SubscriberDevice, SubscriberRouterBinding,
)
from .serializers import (
    APIClientRegistrySerializer, CompanyNetworkPolicySerializer,
    ConnectivityObservationSerializer, IntegrationEndpointSerializer,
    ManagedNetworkDeviceSerializer, NetworkAddressRuleSerializer, VPNProfileSerializer,
    ActivationAuditLogSerializer, RadiusSessionSerializer, SubscriberDeviceSerializer, SubscriberRouterBindingSerializer,
)


class CompanyNetworkScopedViewSet(CompanyScopedModelViewSet):
    permission_read = "noc.view"
    permission_write = "noc.manage"


class CompanyNetworkPolicyViewSet(CompanyNetworkScopedViewSet):
    queryset = CompanyNetworkPolicy.objects.select_related("company").all()
    serializer_class = CompanyNetworkPolicySerializer
    search_fields = ["status","notes"]


class NetworkAddressRuleViewSet(CompanyNetworkScopedViewSet):
    queryset = NetworkAddressRule.objects.select_related("company","branch").all()
    serializer_class = NetworkAddressRuleSerializer
    search_fields = ["label","cidr","purpose","rule_type","status"]


class VPNProfileViewSet(CompanyNetworkScopedViewSet):
    queryset = VPNProfile.objects.select_related("company","branch").all()
    serializer_class = VPNProfileSerializer
    search_fields = ["name","cidr","gateway","provider","tunnel_type","status"]


class ManagedNetworkDeviceViewSet(CompanyNetworkScopedViewSet):
    queryset = ManagedNetworkDevice.objects.select_related("company","branch","network_resource").all()
    serializer_class = ManagedNetworkDeviceSerializer
    search_fields = ["code","name","device_type","management_ip","vendor","model","serial_number","status"]


class APIClientRegistryViewSet(CompanyNetworkScopedViewSet):
    queryset = APIClientRegistry.objects.select_related("company").all()
    serializer_class = APIClientRegistrySerializer
    search_fields = ["name","client_id","key_fingerprint","status"]


class IntegrationEndpointViewSet(CompanyNetworkScopedViewSet):
    queryset = IntegrationEndpoint.objects.select_related("company","branch").all()
    serializer_class = IntegrationEndpointSerializer
    search_fields = ["code","name","integration_type","host","base_url","execution_mode","status"]


class ConnectivityObservationViewSet(CompanyNetworkScopedViewSet):
    queryset = ConnectivityObservation.objects.select_related("company","device","integration").all()
    serializer_class = ConnectivityObservationSerializer
    search_fields = ["target","observation_type","status"]


class SubscriberRouterBindingViewSet(CompanyNetworkScopedViewSet):
    queryset = SubscriberRouterBinding.objects.select_related("company", "device", "customer_service").all()
    serializer_class = SubscriberRouterBindingSerializer
    search_fields = ["allowed_mac", "status"]


class SubscriberDeviceViewSet(CompanyNetworkScopedViewSet):
    queryset = SubscriberDevice.objects.select_related("company", "customer_service").all()
    serializer_class = SubscriberDeviceSerializer
    search_fields = ["mac_address", "hostname", "device_type", "ip_address", "status"]


class RadiusSessionViewSet(CompanyNetworkScopedViewSet):
    queryset = RadiusSession.objects.select_related("company", "customer_service").all()
    serializer_class = RadiusSessionSerializer
    search_fields = ["username", "session_id", "calling_station_id", "status"]


class ActivationAuditLogViewSet(CompanyNetworkScopedViewSet):
    queryset = ActivationAuditLog.objects.select_related("company", "customer_service", "requested_by").all()
    serializer_class = ActivationAuditLogSerializer
    permission_write = "noc.manage"
    search_fields = ["action", "result"]
