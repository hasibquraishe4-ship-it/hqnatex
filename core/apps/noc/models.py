from django.db import models

from apps.branches.models import Branch
from apps.common.models import UUIDTimestampModel
from apps.companies.models import Company
from apps.customers.models import CustomerService
from apps.tenancy.models import Tenant


class NetworkResource(UUIDTimestampModel):
    class ResourceType(models.TextChoices):
        MDF = "mdf", "MDF"
        CABINET = "cabinet", "Cabinet"
        COPPER_PAIR = "copper_pair", "Copper Pair"
        DSLAM = "dslam", "DSLAM"
        DSLAM_PORT = "dslam_port", "DSLAM Port"
        OLT = "olt", "OLT"
        ODF = "odf", "ODF"
        PON = "pon", "PON"
        SPLITTER = "splitter", "Splitter"
        FIBER_CORE = "fiber_core", "Fiber Core"
        SITE = "site", "Site"
        TOWER = "tower", "Tower"
        SECTOR = "sector", "Sector"
        FREQUENCY = "frequency", "Frequency"
        CHANNEL = "channel", "Channel"
        WIRELESS_LINK = "wireless_link", "Wireless Link"
        VSAT_BEAM = "vsat_beam", "VSAT Beam"
        VLAN = "vlan", "VLAN"
        IP_POOL = "ip_pool", "IP Pool"
        IP_PREFIX = "ip_prefix", "IP Prefix"
        BGP_SESSION = "bgp_session", "BGP Session"

    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="network_resources")

    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="network_resources_company_scope")
    branch = models.ForeignKey(Branch, on_delete=models.PROTECT, null=True, blank=True, related_name="network_resources")
    parent = models.ForeignKey("self", on_delete=models.PROTECT, null=True, blank=True, related_name="children")
    code = models.CharField(max_length=100)
    name = models.CharField(max_length=255)
    resource_type = models.CharField(max_length=32, choices=ResourceType.choices)
    status = models.CharField(max_length=16, default="active")
    capacity = models.DecimalField(max_digits=18, decimal_places=3, null=True, blank=True)
    unit = models.CharField(max_length=32, blank=True)
    attributes = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "noc_network_resources"
        ordering = ["resource_type", "code"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "code"], name="uq_noc_resource_tenant_code"),
            models.UniqueConstraint(fields=["tenant", "id"], name="uq_noc_resource_tenant_id"),
        ]
        indexes = [models.Index(fields=["tenant", "resource_type", "status"], name="ix_noc_resource_type")]


class CustomerServiceNetworkResource(UUIDTimestampModel):
    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT)
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="customer_service_network_resources_company_scope")
    customer_service = models.ForeignKey(CustomerService, on_delete=models.CASCADE, related_name="network_resource_assignments")
    resource = models.ForeignKey(NetworkResource, on_delete=models.PROTECT, related_name="customer_service_assignments")
    purpose = models.CharField(max_length=80, blank=True)
    status = models.CharField(max_length=16, default="active")
    active_from = models.DateTimeField(null=True, blank=True)
    active_to = models.DateTimeField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "noc_customer_service_resources"
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "customer_service", "resource"], name="uq_customer_service_resource"
            )
        ]
        indexes = [models.Index(fields=["tenant", "status"], name="ix_noc_assignment_status")]
