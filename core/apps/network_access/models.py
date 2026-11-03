from django.db import models
from django.db.models import Q

from apps.branches.models import Branch
from apps.common.models import UUIDTimestampModel
from apps.companies.models import Company
from apps.noc.models import NetworkResource
from apps.tenancy.models import Tenant


class CompanyNetworkPolicy(UUIDTimestampModel):
    class Mode(models.TextChoices):
        OFF = "off", "Off"
        ALLOWLIST = "allowlist", "Allowlist"
        VPN_ONLY = "vpn_only", "VPN Only"

    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="network_access_policies")
    company = models.OneToOneField(Company, on_delete=models.PROTECT, related_name="network_access_policy")
    ui_access_mode = models.CharField(max_length=16, choices=Mode.choices, default=Mode.OFF)
    api_access_mode = models.CharField(max_length=16, choices=Mode.choices, default=Mode.OFF)
    status = models.CharField(max_length=16, default="active")
    notes = models.TextField(blank=True)
    live_activation_enabled = models.BooleanField(default=False, editable=False)
    device_write_enabled = models.BooleanField(default=False, editable=False)

    class Meta:
        db_table = "network_access_company_policies"
        constraints = [
            models.UniqueConstraint(fields=["tenant", "company"], name="uq_netpolicy_tenant_company"),
            models.CheckConstraint(condition=Q(live_activation_enabled=False), name="ck_netpolicy_live_activation_off"),
            models.CheckConstraint(condition=Q(device_write_enabled=False), name="ck_netpolicy_device_write_off"),
        ]
        indexes = [models.Index(fields=["tenant", "company", "status"], name="ix_netpolicy_scope_status")]


class NetworkAddressRule(UUIDTimestampModel):
    class RuleType(models.TextChoices):
        ALLOW = "allow", "Allowed"
        BLOCK = "block", "Blocked"
        OFFICE = "office", "Office"
        BRANCH = "branch", "Branch"
        API = "api", "API"
        DEVICE = "device", "Device"
        PUBLIC = "public", "Public"
        PRIVATE = "private", "Private"

    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="network_address_rules")
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="network_address_rules")
    branch = models.ForeignKey(Branch, on_delete=models.PROTECT, null=True, blank=True, related_name="network_address_rules")
    label = models.CharField(max_length=160)
    cidr = models.CharField(max_length=64)
    rule_type = models.CharField(max_length=16, choices=RuleType.choices)
    purpose = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=16, default="active")
    valid_from = models.DateTimeField(null=True, blank=True)
    valid_to = models.DateTimeField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "network_access_address_rules"
        ordering = ["label", "cidr"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "company", "cidr", "rule_type"], name="uq_netaddr_company_cidr_type")
        ]
        indexes = [
            models.Index(fields=["tenant", "company", "status"], name="ix_netaddr_scope_status"),
            models.Index(fields=["tenant", "company", "rule_type"], name="ix_netaddr_scope_type"),
        ]


class VPNProfile(UUIDTimestampModel):
    class TunnelType(models.TextChoices):
        IPSEC = "ipsec", "IPsec"
        WIREGUARD = "wireguard", "WireGuard"
        OPENVPN = "openvpn", "OpenVPN"
        MPLS = "mpls", "MPLS / Private WAN"
        PRIVATE = "private", "Private Network"
        OTHER = "other", "Other"

    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="vpn_profiles")
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="vpn_profiles")
    branch = models.ForeignKey(Branch, on_delete=models.PROTECT, null=True, blank=True, related_name="vpn_profiles")
    name = models.CharField(max_length=160)
    cidr = models.CharField(max_length=64)
    gateway = models.CharField(max_length=255, blank=True)
    provider = models.CharField(max_length=160, blank=True)
    tunnel_type = models.CharField(max_length=24, choices=TunnelType.choices, default=TunnelType.PRIVATE)
    secret_ref = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=16, default="active")
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "network_access_vpn_profiles"
        ordering = ["name"]
        constraints = [models.UniqueConstraint(fields=["tenant", "company", "name"], name="uq_vpn_company_name")]
        indexes = [models.Index(fields=["tenant", "company", "status"], name="ix_vpn_scope_status")]


class ManagedNetworkDevice(UUIDTimestampModel):
    class DeviceType(models.TextChoices):
        ROUTER = "router", "Router"
        RADIUS = "radius", "RADIUS"
        NAS = "nas", "NAS"
        OLT = "olt", "OLT"
        DSLAM = "dslam", "DSLAM"
        SWITCH = "switch", "Switch"
        FIREWALL = "firewall", "Firewall"
        SERVER = "server", "Server"
        ACCESS_POINT = "access_point", "Access Point"
        OTHER = "other", "Other"

    class AccessMode(models.TextChoices):
        CONFIG_ONLY = "config_only", "Configuration Only"
        READ_ONLY = "read_only", "Read Only"

    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="managed_network_devices")
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="managed_network_devices")
    branch = models.ForeignKey(Branch, on_delete=models.PROTECT, null=True, blank=True, related_name="managed_network_devices")
    network_resource = models.ForeignKey(NetworkResource, on_delete=models.PROTECT, null=True, blank=True, related_name="managed_device_records")
    code = models.CharField(max_length=100)
    name = models.CharField(max_length=255)
    device_type = models.CharField(max_length=24, choices=DeviceType.choices)
    management_ip = models.CharField(max_length=64, blank=True)
    vendor = models.CharField(max_length=120, blank=True)
    model = models.CharField(max_length=120, blank=True)
    serial_number = models.CharField(max_length=160, blank=True)
    access_mode = models.CharField(max_length=16, choices=AccessMode.choices, default=AccessMode.CONFIG_ONLY)
    secret_ref = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=16, default="active")
    last_known_state = models.CharField(max_length=32, blank=True)
    last_seen_at = models.DateTimeField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "network_access_devices"
        ordering = ["device_type", "code"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "company", "code"], name="uq_netdevice_company_code"),
            models.CheckConstraint(condition=Q(access_mode__in=["config_only", "read_only"]), name="ck_netdevice_no_write_mode"),
        ]
        indexes = [
            models.Index(fields=["tenant", "company", "status"], name="ix_netdevice_scope_status"),
            models.Index(fields=["tenant", "company", "device_type"], name="ix_netdevice_scope_type"),
        ]


class APIClientRegistry(UUIDTimestampModel):
    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="network_api_clients")
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="network_api_clients")
    name = models.CharField(max_length=160)
    client_id = models.CharField(max_length=160)
    key_fingerprint = models.CharField(max_length=255, blank=True)
    secret_ref = models.CharField(max_length=255, blank=True)
    allowed_cidrs = models.JSONField(default=list, blank=True)
    scopes = models.JSONField(default=list, blank=True)
    rate_limit_per_minute = models.PositiveIntegerField(default=60)
    status = models.CharField(max_length=16, default="active")
    expires_at = models.DateTimeField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "network_access_api_clients"
        ordering = ["name"]
        constraints = [models.UniqueConstraint(fields=["tenant", "company", "client_id"], name="uq_apiclient_company_id")]
        indexes = [models.Index(fields=["tenant", "company", "status"], name="ix_apiclient_scope_status")]


class IntegrationEndpoint(UUIDTimestampModel):
    class IntegrationType(models.TextChoices):
        RADIUS = "radius", "RADIUS"
        NAS = "nas", "NAS"
        ROUTER = "router", "Router"
        OLT = "olt", "OLT"
        DSLAM = "dslam", "DSLAM"
        API = "api", "API"
        WEBHOOK = "webhook", "Webhook"
        SNMP = "snmp", "SNMP"
        OTHER = "other", "Other"

    class ExecutionMode(models.TextChoices):
        CONFIG_ONLY = "config_only", "Configuration Only"
        READ_ONLY = "read_only", "Read Only"

    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="integration_endpoints")
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="integration_endpoints")
    branch = models.ForeignKey(Branch, on_delete=models.PROTECT, null=True, blank=True, related_name="integration_endpoints")
    code = models.CharField(max_length=100)
    name = models.CharField(max_length=255)
    integration_type = models.CharField(max_length=24, choices=IntegrationType.choices)
    host = models.CharField(max_length=255, blank=True)
    port = models.PositiveIntegerField(null=True, blank=True)
    base_url = models.URLField(blank=True)
    auth_mode = models.CharField(max_length=32, blank=True)
    secret_ref = models.CharField(max_length=255, blank=True)
    execution_mode = models.CharField(max_length=16, choices=ExecutionMode.choices, default=ExecutionMode.CONFIG_ONLY)
    enabled = models.BooleanField(default=False)
    status = models.CharField(max_length=16, default="configured")
    last_checked_at = models.DateTimeField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "network_access_integrations"
        ordering = ["integration_type", "code"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "company", "code"], name="uq_integration_company_code"),
            models.CheckConstraint(condition=Q(execution_mode__in=["config_only", "read_only"]), name="ck_integration_no_write_mode"),
        ]
        indexes = [
            models.Index(fields=["tenant", "company", "status"], name="ix_integration_scope_status"),
            models.Index(fields=["tenant", "company", "integration_type"], name="ix_integration_scope_type"),
        ]


class ConnectivityObservation(UUIDTimestampModel):
    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="connectivity_observations")
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="connectivity_observations")
    device = models.ForeignKey(ManagedNetworkDevice, on_delete=models.PROTECT, null=True, blank=True, related_name="connectivity_observations")
    integration = models.ForeignKey(IntegrationEndpoint, on_delete=models.PROTECT, null=True, blank=True, related_name="connectivity_observations")
    target = models.CharField(max_length=255)
    observation_type = models.CharField(max_length=32, default="manual")
    status = models.CharField(max_length=32)
    latency_ms = models.DecimalField(max_digits=12, decimal_places=3, null=True, blank=True)
    checked_at = models.DateTimeField()
    details = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "network_access_observations"
        ordering = ["-checked_at"]
        indexes = [
            models.Index(fields=["tenant", "company", "checked_at"], name="ix_netobs_scope_time"),
            models.Index(fields=["tenant", "company", "status"], name="ix_netobs_scope_status"),
        ]


class SubscriberRouterBinding(UUIDTimestampModel):
    """The approved NAS/router binding for one customer service."""
    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="subscriber_router_bindings")
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="subscriber_router_bindings")
    customer_service = models.OneToOneField(
        "customers.CustomerService", on_delete=models.PROTECT, related_name="router_binding"
    )
    device = models.ForeignKey(ManagedNetworkDevice, on_delete=models.PROTECT, related_name="subscriber_bindings")
    allowed_mac = models.CharField(max_length=32)
    status = models.CharField(max_length=16, default="active")
    approved_at = models.DateTimeField(null=True, blank=True)
    removed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = "network_access_subscriber_router_bindings"
        constraints = [models.UniqueConstraint(fields=["device", "allowed_mac"], name="uq_binding_device_mac")]
        indexes = [models.Index(fields=["allowed_mac", "status"], name="ix_binding_mac_status")]


class SubscriberDevice(UUIDTimestampModel):
    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="subscriber_devices")
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="subscriber_devices")
    customer_service = models.ForeignKey(
        "customers.CustomerService", on_delete=models.PROTECT, related_name="network_devices"
    )
    mac_address = models.CharField(max_length=32)
    hostname = models.CharField(max_length=255, blank=True)
    device_type = models.CharField(max_length=64, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    first_seen_at = models.DateTimeField(null=True, blank=True)
    last_seen_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=16, default="observed")
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "network_access_subscriber_devices"
        constraints = [models.UniqueConstraint(fields=["customer_service", "mac_address"], name="uq_subscriber_device_mac")]


class RadiusSession(UUIDTimestampModel):
    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="radius_sessions")
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="radius_sessions")
    customer_service = models.ForeignKey(
        "customers.CustomerService", on_delete=models.PROTECT, related_name="radius_sessions"
    )
    username = models.CharField(max_length=255)
    session_id = models.CharField(max_length=255)
    nas_ip_address = models.GenericIPAddressField(null=True, blank=True)
    framed_ip_address = models.GenericIPAddressField(null=True, blank=True)
    calling_station_id = models.CharField(max_length=64, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    input_octets = models.BigIntegerField(default=0)
    output_octets = models.BigIntegerField(default=0)
    status = models.CharField(max_length=16, default="online")

    class Meta:
        db_table = "network_access_radius_sessions"
        constraints = [models.UniqueConstraint(fields=["username", "session_id"], name="uq_radius_session")]
        indexes = [models.Index(fields=["username", "status"], name="ix_radius_session_status")]


class ActivationAuditLog(UUIDTimestampModel):
    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="activation_audit_logs")
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="activation_audit_logs")
    customer_service = models.ForeignKey(
        "customers.CustomerService", on_delete=models.PROTECT, related_name="activation_audit_logs"
    )
    action = models.CharField(max_length=32)
    requested_by = models.ForeignKey("iam.User", on_delete=models.PROTECT, null=True, blank=True)
    result = models.CharField(max_length=16)
    details = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "network_access_activation_audit_logs"
        indexes = [models.Index(fields=["customer_service", "created_at"], name="ix_activation_audit_time")]
