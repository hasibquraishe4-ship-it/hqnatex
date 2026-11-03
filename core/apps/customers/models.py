from django.db import models
from django.db.models import Q
from django.utils import timezone

from apps.agencies.models import Agency
from apps.branches.models import Branch
from apps.catalog.models import Package, Service
from apps.common.models import UUIDTimestampModel
from apps.companies.models import Company
from apps.tenancy.models import Tenant


class Customer(UUIDTimestampModel):
    class CustomerType(models.TextChoices):
        INDIVIDUAL = "individual", "Individual"
        BUSINESS = "business", "Business"
        GOVERNMENT = "government", "Government"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"
        BLOCKED = "blocked", "Blocked"

    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="customers")
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="customers")
    branch = models.ForeignKey(Branch, on_delete=models.PROTECT, null=True, blank=True, related_name="customers")
    agency = models.ForeignKey(Agency, on_delete=models.PROTECT, null=True, blank=True, related_name="customers")
    code = models.CharField(max_length=80)
    customer_type = models.CharField(max_length=20, choices=CustomerType.choices, default=CustomerType.INDIVIDUAL)
    display_name = models.CharField(max_length=255)
    father_name = models.CharField(max_length=160, blank=True, default="")
    national_id = models.CharField(max_length=80, blank=True, default="")
    phone = models.CharField(max_length=64, blank=True)
    alt_phone = models.CharField(max_length=64, blank=True, default="")
    email = models.EmailField(blank=True)
    province = models.CharField(max_length=100, blank=True, default="")
    district = models.CharField(max_length=100, blank=True, default="")
    address = models.TextField(blank=True)
    organization_name = models.CharField(max_length=255, blank=True, default="")
    registration_number = models.CharField(max_length=100, blank=True, default="")
    tin = models.CharField(max_length=100, blank=True, default="")
    contact_person = models.CharField(max_length=160, blank=True, default="")
    external_reference = models.CharField(max_length=120, blank=True)
    notes = models.TextField(blank=True, default="")
    contacts = models.JSONField(default=list, blank=True)
    addresses = models.JSONField(default=list, blank=True)
    documents = models.JSONField(default=list, blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ACTIVE)

    class Meta:
        db_table = "customers_customers"
        ordering = ["display_name"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "code"], name="uq_customer_tenant_code"),
            models.UniqueConstraint(fields=["tenant", "id"], name="uq_customer_tenant_id"),
        ]
        indexes = [
            models.Index(fields=["tenant", "status"], name="ix_customer_tenant_status"),
            models.Index(fields=["tenant", "display_name"], name="ix_customer_tenant_name"),
        ]

    def __str__(self):
        return f"{self.code} - {self.display_name}"


class CustomerService(UUIDTimestampModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PENDING = "pending", "Pending"
        ACTIVE = "active", "Active"
        SUSPENDED = "suspended", "Suspended"
        TERMINATED = "terminated", "Terminated"

    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="customer_services")

    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="customer_services_company_scope")
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name="services")
    service = models.ForeignKey(Service, on_delete=models.PROTECT, related_name="customer_services")
    package = models.ForeignKey(Package, on_delete=models.PROTECT, null=True, blank=True, related_name="customer_services")
    branch = models.ForeignKey(Branch, on_delete=models.PROTECT, null=True, blank=True, related_name="customer_services")
    agency = models.ForeignKey(Agency, on_delete=models.PROTECT, null=True, blank=True, related_name="customer_services")
    identifier = models.CharField(max_length=160, blank=True)
    username = models.CharField(max_length=160, blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.DRAFT)
    billing_cycle = models.CharField(max_length=24, default="monthly", blank=True)
    base_price = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    final_price = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    currency = models.CharField(max_length=8, default="AFN", blank=True)
    activation_date = models.DateField(null=True, blank=True)
    next_renewal_date = models.DateField(null=True, blank=True)
    auto_renewal = models.BooleanField(default=False)
    sales_channel = models.CharField(max_length=64, blank=True, default="direct")
    technical_values = models.JSONField(default=dict, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, default="")

    class Meta:
        db_table = "customers_customer_services"
        ordering = ["customer", "service"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "id"], name="uq_customer_service_tenant_id"),
            models.UniqueConstraint(
                fields=["tenant", "service", "identifier"],
                condition=~Q(identifier=""),
                name="uq_customer_service_identifier",
            ),
        ]
        indexes = [
            models.Index(fields=["tenant", "status"], name="ix_customer_service_status"),
            models.Index(fields=["tenant", "service"], name="ix_customer_service_service"),
        ]


class CustomerServiceTechnicalValue(UUIDTimestampModel):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.PROTECT,
        related_name="customer_service_technical_values",
    )
    company = models.ForeignKey(
        Company,
        on_delete=models.PROTECT,
        related_name="customer_service_technical_values_company_scope",
    )
    customer_service = models.ForeignKey(
        CustomerService,
        on_delete=models.CASCADE,
        related_name="technical_value_rows",
    )
    technical_field = models.ForeignKey(
        "catalog.ServiceTechnicalField",
        on_delete=models.PROTECT,
        related_name="customer_service_values",
    )

    key_snapshot = models.CharField(max_length=100)
    value = models.JSONField(null=True, blank=True)

    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.ACTIVE,
    )

    class Meta:
        db_table = "customers_customer_service_technical_values"
        ordering = ["customer_service", "technical_field"]
        constraints = [
            models.UniqueConstraint(
                fields=[
                    "tenant",
                    "customer_service",
                    "technical_field",
                ],
                name="uq_customer_service_technical_field",
            ),
            models.UniqueConstraint(
                fields=["tenant", "id"],
                name="uq_customer_technical_value_tenant_id",
            ),
        ]
        indexes = [
            models.Index(
                fields=["tenant", "company", "customer_service"],
                name="ix_cust_tech_service",
            ),
            models.Index(
                fields=["tenant", "technical_field"],
                name="ix_cust_tech_field",
            ),
            models.Index(
                fields=["tenant", "status"],
                name="ix_cust_tech_status",
            ),
        ]


class CustomerEquipmentAssignment(UUIDTimestampModel):
    class EquipmentType(models.TextChoices):
        MODEM = "modem", "Modem"
        ROUTER = "router", "Router"
        ONT = "ont", "ONT"
        CPE = "cpe", "CPE"
        RADIO = "radio", "Radio"
        OTHER = "other", "Other"

    class OwnershipType(models.TextChoices):
        COMPANY_OWNED = "company_owned", "Company Owned"
        SOLD = "sold", "Sold to Customer"
        RENTAL = "rental", "Rental"
        LOAN = "loan", "Loan"

    class Condition(models.TextChoices):
        NEW = "new", "New"
        GOOD = "good", "Good"
        FAIR = "fair", "Fair"
        FAULTY = "faulty", "Faulty"

    class Status(models.TextChoices):
        ASSIGNED = "assigned", "Assigned"
        RETURNED = "returned", "Returned"
        DAMAGED = "damaged", "Damaged"
        LOST = "lost", "Lost"

    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="customer_equipment_assignments")
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="customer_equipment_assignments_company_scope")
    customer_service = models.ForeignKey(CustomerService, on_delete=models.CASCADE, related_name="equipment_assignments")
    equipment_type = models.CharField(max_length=32, choices=EquipmentType.choices, default=EquipmentType.MODEM)
    model_name = models.CharField(max_length=160, blank=True, default="")
    serial_number = models.CharField(max_length=160)
    mac_address = models.CharField(max_length=64, blank=True, default="")
    inventory_ref = models.CharField(max_length=100, blank=True, default="")
    ownership_type = models.CharField(max_length=32, choices=OwnershipType.choices, default=OwnershipType.COMPANY_OWNED)
    assigned_date = models.DateField(null=True, blank=True)
    returned_date = models.DateField(null=True, blank=True)
    condition = models.CharField(max_length=32, choices=Condition.choices, default=Condition.NEW)
    deposit_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ASSIGNED)
    notes = models.TextField(blank=True, default="")

    class Meta:
        db_table = "customers_equipment_assignments"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "id"], name="uq_equipment_assign_tenant_id"),
        ]
        indexes = [
            models.Index(fields=["tenant", "status"], name="ix_equipment_assign_status"),
            models.Index(fields=["tenant", "serial_number"], name="ix_equipment_assign_serial"),
        ]


class ServiceAgencyHistory(UUIDTimestampModel):
    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="service_agency_history")
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="service_agency_history_company_scope")
    customer_service = models.ForeignKey(CustomerService, on_delete=models.CASCADE, related_name="agency_history")
    from_agency = models.ForeignKey(Agency, on_delete=models.PROTECT, null=True, blank=True, related_name="+")
    to_agency = models.ForeignKey(Agency, on_delete=models.PROTECT, null=True, blank=True, related_name="+")
    from_branch = models.ForeignKey(Branch, on_delete=models.PROTECT, null=True, blank=True, related_name="+")
    to_branch = models.ForeignKey(Branch, on_delete=models.PROTECT, null=True, blank=True, related_name="+")
    reason = models.CharField(max_length=255, blank=True, default="")
    effective_date = models.DateField(null=True, blank=True)
    approved_by = models.CharField(max_length=160, blank=True, default="")
    user_name = models.CharField(max_length=160, blank=True, default="")
    notes = models.TextField(blank=True, default="")

    class Meta:
        db_table = "customers_service_agency_history"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "id"], name="uq_agency_history_tenant_id"),
        ]


class CustomerTicket(UUIDTimestampModel):
    class Category(models.TextChoices):
        TECHNICAL = "technical", "Technical Issue"
        BILLING = "billing", "Billing & Payment"
        SERVICE_REQUEST = "service_request", "Service Request"
        COMPLAINT = "complaint", "Complaint"
        INQUIRY = "inquiry", "General Inquiry"

    class Priority(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"
        URGENT = "urgent", "Urgent"

    class Status(models.TextChoices):
        OPEN = "open", "Open"
        IN_PROGRESS = "in_progress", "In Progress"
        RESOLVED = "resolved", "Resolved"
        CLOSED = "closed", "Closed"
        CANCELLED = "cancelled", "Cancelled"

    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="customer_tickets")
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="customer_tickets_company_scope")
    ticket_number = models.CharField(max_length=80)
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name="tickets")
    customer_service = models.ForeignKey(CustomerService, on_delete=models.PROTECT, null=True, blank=True, related_name="tickets")
    service = models.ForeignKey(Service, on_delete=models.PROTECT, null=True, blank=True, related_name="tickets")
    category = models.CharField(max_length=64, choices=Category.choices, default=Category.TECHNICAL)
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.MEDIUM)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    subject = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    assigned_team = models.CharField(max_length=80, blank=True, default="")
    assigned_user = models.CharField(max_length=160, blank=True, default="")
    opened_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    resolution = models.TextField(blank=True, default="")
    notes = models.TextField(blank=True, default="")

    class Meta:
        db_table = "customers_customer_tickets"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "ticket_number"], name="uq_ticket_tenant_number"),
            models.UniqueConstraint(fields=["tenant", "id"], name="uq_ticket_tenant_id"),
        ]
        indexes = [
            models.Index(fields=["tenant", "status"], name="ix_ticket_tenant_status"),
            models.Index(fields=["tenant", "customer"], name="ix_ticket_tenant_customer"),
        ]


class ServicePackageHistory(UUIDTimestampModel):
    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT)
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="service_package_history_company_scope")
    customer_service = models.ForeignKey(CustomerService, on_delete=models.CASCADE, related_name="package_history")
    old_package = models.ForeignKey(Package, on_delete=models.PROTECT, null=True, blank=True, related_name="+")
    new_package = models.ForeignKey(Package, on_delete=models.PROTECT, null=True, blank=True, related_name="+")
    reason = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = "customers_service_package_history"
        ordering = ["-created_at"]


class ServiceStatusHistory(UUIDTimestampModel):
    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT)
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="service_status_history_company_scope")
    customer_service = models.ForeignKey(CustomerService, on_delete=models.CASCADE, related_name="status_history")
    from_status = models.CharField(max_length=16, blank=True)
    to_status = models.CharField(max_length=16)
    reason = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = "customers_service_status_history"
        ordering = ["-created_at"]


class ServiceChangeRequest(UUIDTimestampModel):
    class Status(models.TextChoices):
        REQUESTED = "requested", "Requested"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        APPLIED = "applied", "Applied"
        CANCELLED = "cancelled", "Cancelled"

    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT)

    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="service_change_requests_company_scope")
    customer_service = models.ForeignKey(CustomerService, on_delete=models.PROTECT, related_name="change_requests")
    change_type = models.CharField(max_length=64)
    requested_values = models.JSONField(default=dict)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.REQUESTED)
    reason = models.TextField(blank=True)

    class Meta:
        db_table = "customers_service_change_requests"
        ordering = ["-created_at"]


class ServiceActivation(UUIDTimestampModel):
    class ActivationType(models.TextChoices):
        INITIAL = "initial", "Initial Activation"
        REACTIVATION = "reactivation", "Reactivation"
        MIGRATION = "migration", "Migration"
        UPGRADE = "upgrade", "Upgrade"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        SCHEDULED = "scheduled", "Scheduled"
        IN_PROGRESS = "in_progress", "In Progress"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="service_activations")
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="service_activations_company_scope")
    customer_service = models.ForeignKey(CustomerService, on_delete=models.CASCADE, related_name="activations")
    activation_type = models.CharField(max_length=32, choices=ActivationType.choices, default=ActivationType.INITIAL)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.PENDING)
    requested_at = models.DateTimeField(default=timezone.now)
    scheduled_at = models.DateTimeField(null=True, blank=True)
    activated_at = models.DateTimeField(null=True, blank=True)
    activated_by = models.CharField(max_length=160, blank=True, default="")
    notes = models.TextField(blank=True, default="")

    class Meta:
        db_table = "customers_service_activations"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "id"], name="uq_service_activation_tenant_id"),
        ]
        indexes = [
            models.Index(fields=["tenant", "status"], name="ix_service_activation_status"),
            models.Index(fields=["tenant", "customer_service"], name="ix_service_activation_cs"),
        ]


class InstallationWorkOrder(UUIDTimestampModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        DISPATCHED = "dispatched", "Dispatched"
        ON_SITE = "on_site", "On Site"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"
        CANCELLED = "cancelled", "Cancelled"

    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="installation_work_orders")
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="installation_work_orders_company_scope")
    customer_service = models.ForeignKey(CustomerService, on_delete=models.CASCADE, related_name="work_orders")
    activation = models.ForeignKey(ServiceActivation, on_delete=models.SET_NULL, null=True, blank=True, related_name="work_orders")
    order_number = models.CharField(max_length=80)
    work_type = models.CharField(max_length=64, default="standard_install")
    assigned_team_id = models.CharField(max_length=100, blank=True, default="")
    technician_name = models.CharField(max_length=160, blank=True, default="")
    technician_phone = models.CharField(max_length=64, blank=True, default="")
    scheduled_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.DRAFT)
    notes = models.TextField(blank=True, default="")

    class Meta:
        db_table = "customers_installation_work_orders"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "id"], name="uq_install_work_order_tenant_id"),
        ]
        indexes = [
            models.Index(fields=["tenant", "status"], name="ix_install_work_order_status"),
            models.Index(fields=["tenant", "customer_service"], name="ix_install_work_order_cs"),
        ]


class ProvisioningJob(UUIDTimestampModel):
    class Status(models.TextChoices):
        QUEUED = "queued", "Queued"
        RUNNING = "running", "Running"
        SUCCESSFUL = "successful", "Successful"
        FAILED = "failed", "Failed"
        CANCELLED = "cancelled", "Cancelled"

    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="provisioning_jobs")
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="provisioning_jobs_company_scope")
    customer_service = models.ForeignKey(CustomerService, on_delete=models.CASCADE, related_name="provisioning_jobs")
    activation = models.ForeignKey(ServiceActivation, on_delete=models.SET_NULL, null=True, blank=True, related_name="provisioning_jobs")
    job_number = models.CharField(max_length=80)
    provisioning_type = models.CharField(max_length=64)
    target_system = models.CharField(max_length=64)
    payload = models.JSONField(default=dict, blank=True)
    response_log = models.TextField(blank=True, default="")
    retry_count = models.IntegerField(default=0)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.QUEUED)
    requested_at = models.DateTimeField(default=timezone.now)
    executed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "customers_provisioning_jobs"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "id"], name="uq_provisioning_job_tenant_id"),
        ]
        indexes = [
            models.Index(fields=["tenant", "status"], name="ix_provisioning_job_status"),
            models.Index(fields=["tenant", "customer_service"], name="ix_provisioning_job_cs"),
        ]


class IPAssignment(UUIDTimestampModel):
    class AssignmentType(models.TextChoices):
        STATIC_IPV4 = "static_ipv4", "Static IPv4"
        STATIC_IPV6 = "static_ipv6", "Static IPv6"
        PPPOE_FRAMED = "pppoe_framed", "PPPoE Framed IP"
        SUBNET_PREFIX = "subnet_prefix", "Subnet / Prefix"
        CGNAT = "cgnat", "CGNAT"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        RESERVED = "reserved", "Reserved"
        RELEASED = "released", "Released"

    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="ip_assignments")
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="ip_assignments_company_scope")
    customer_service = models.ForeignKey(CustomerService, on_delete=models.CASCADE, related_name="ip_assignments")
    ip_resource_id = models.CharField(max_length=120, blank=True, default="")
    assignment_type = models.CharField(max_length=32, choices=AssignmentType.choices, default=AssignmentType.STATIC_IPV4)
    ip_address = models.CharField(max_length=64)
    subnet_mask = models.CharField(max_length=32, blank=True, default="")
    cidr_prefix = models.IntegerField(null=True, blank=True)
    gateway = models.CharField(max_length=64, blank=True, default="")
    primary_dns = models.CharField(max_length=64, blank=True, default="")
    secondary_dns = models.CharField(max_length=64, blank=True, default="")
    vlan_id = models.IntegerField(null=True, blank=True)
    assigned_at = models.DateTimeField(default=timezone.now)
    released_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)

    class Meta:
        db_table = "customers_ip_assignments"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "id"], name="uq_ip_assignment_tenant_id"),
        ]
        indexes = [
            models.Index(fields=["tenant", "status"], name="ix_ip_assignment_status"),
            models.Index(fields=["tenant", "customer_service"], name="ix_ip_assignment_cs"),
        ]


class RadiusAccount(UUIDTimestampModel):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        SUSPENDED = "suspended", "Suspended"
        DISABLED = "disabled", "Disabled"

    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="radius_accounts")
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="radius_accounts_company_scope")
    customer_service = models.ForeignKey(CustomerService, on_delete=models.CASCADE, related_name="radius_accounts")
    username = models.CharField(max_length=160)
    password_hash = models.CharField(max_length=255, blank=True, default="")
    profile_id = models.CharField(max_length=80, blank=True, default="")
    service_type = models.CharField(max_length=64, default="Framed-User")
    framed_protocol = models.CharField(max_length=32, default="PPP")
    framed_ip_address = models.CharField(max_length=64, blank=True, default="")
    simultaneous_use = models.IntegerField(default=1)
    rate_limit_up_kbps = models.IntegerField(null=True, blank=True)
    rate_limit_down_kbps = models.IntegerField(null=True, blank=True)
    nas_ip_address = models.CharField(max_length=64, blank=True, default="")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    last_auth_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "customers_radius_accounts"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "id"], name="uq_radius_account_tenant_id"),
            models.UniqueConstraint(fields=["tenant", "username"], name="uq_radius_account_username"),
        ]
        indexes = [
            models.Index(fields=["tenant", "status"], name="ix_radius_account_status"),
            models.Index(fields=["tenant", "customer_service"], name="ix_radius_account_cs"),
        ]


class TechnicalTestResult(UUIDTimestampModel):
    class Result(models.TextChoices):
        PASS = "pass", "Pass"
        FAIL = "fail", "Fail"
        WARNING = "warning", "Warning"

    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="technical_test_results")
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="technical_test_results_company_scope")
    customer_service = models.ForeignKey(CustomerService, on_delete=models.CASCADE, related_name="test_results")
    activation = models.ForeignKey(ServiceActivation, on_delete=models.SET_NULL, null=True, blank=True, related_name="test_results")
    test_type = models.CharField(max_length=64)
    result = models.CharField(max_length=20, choices=Result.choices, default=Result.PASS)
    measured_values = models.JSONField(default=dict, blank=True)
    tested_at = models.DateTimeField(default=timezone.now)
    tested_by = models.CharField(max_length=160, blank=True, default="")
    raw_output = models.TextField(blank=True, default="")

    class Meta:
        db_table = "customers_technical_test_results"
        ordering = ["-tested_at"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "id"], name="uq_tech_test_result_tenant_id"),
        ]
        indexes = [
            models.Index(fields=["tenant", "test_type"], name="ix_tech_test_type"),
            models.Index(fields=["tenant", "customer_service"], name="ix_tech_test_cs"),
        ]


class ActivationChecklist(UUIDTimestampModel):
    class Result(models.TextChoices):
        PASSED = "passed", "Passed"
        FAILED = "failed", "Failed"
        PENDING = "pending", "Pending"
        WAIVED = "waived", "Waived"

    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="activation_checklists")
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="activation_checklists_company_scope")
    customer_service = models.ForeignKey(CustomerService, on_delete=models.CASCADE, related_name="activation_checklists")
    activation = models.ForeignKey(ServiceActivation, on_delete=models.CASCADE, related_name="checklists")
    checklist_item_id = models.CharField(max_length=100)
    checklist_label = models.CharField(max_length=255)
    is_mandatory = models.BooleanField(default=True)
    result = models.CharField(max_length=20, choices=Result.choices, default=Result.PENDING)
    checked_by = models.CharField(max_length=160, blank=True, default="")
    checked_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, default="")

    class Meta:
        db_table = "customers_activation_checklists"
        ordering = ["activation", "checklist_item_id"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "id"], name="uq_activation_checklist_tenant_id"),
        ]
        indexes = [
            models.Index(fields=["tenant", "activation"], name="ix_act_checklist_act"),
            models.Index(fields=["tenant", "customer_service"], name="ix_act_checklist_cs"),
        ]


class FieldVisit(UUIDTimestampModel):
    class Status(models.TextChoices):
        RESOLVED = "resolved", "Resolved"
        PENDING_PARTS = "pending_parts", "Pending Parts"
        UNAVAILABLE = "customer_unavailable", "Customer Unavailable"
        RESCHEDULED = "rescheduled", "Rescheduled"

    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="field_visits")
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="field_visits_company_scope")
    customer_service = models.ForeignKey(CustomerService, on_delete=models.CASCADE, related_name="field_visits")
    fault_ticket = models.ForeignKey("CustomerTicket", on_delete=models.SET_NULL, null=True, blank=True, related_name="field_visits")
    installation_work_order = models.ForeignKey(InstallationWorkOrder, on_delete=models.SET_NULL, null=True, blank=True, related_name="field_visits")
    visit_type = models.CharField(max_length=64, default="troubleshooting")
    technician_name = models.CharField(max_length=160, blank=True, default="")
    visited_at = models.DateTimeField(default=timezone.now)
    result = models.CharField(max_length=32, choices=Status.choices, default=Status.RESOLVED)
    notes = models.TextField(blank=True, default="")

    class Meta:
        db_table = "customers_field_visits"
        ordering = ["-visited_at"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "id"], name="uq_field_visit_tenant_id"),
        ]
        indexes = [
            models.Index(fields=["tenant", "customer_service"], name="ix_field_visit_cs"),
        ]


class ServiceSuspension(UUIDTimestampModel):
    class Reason(models.TextChoices):
        NON_PAYMENT = "non_payment", "Non-Payment"
        CUSTOMER_REQUEST = "customer_request", "Customer Request"
        MAINTENANCE = "maintenance", "Maintenance"
        ABUSE = "abuse", "Acceptable Use Policy Violation"
        FRAUD = "fraud", "Suspected Fraud"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active Suspension"
        RESUMED = "resumed", "Resumed"
        CANCELLED = "cancelled", "Cancelled"

    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="service_suspensions")
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="service_suspensions_company_scope")
    customer_service = models.ForeignKey(CustomerService, on_delete=models.CASCADE, related_name="suspensions")
    suspended_at = models.DateTimeField(default=timezone.now)
    resumed_at = models.DateTimeField(null=True, blank=True)
    reason = models.CharField(max_length=64, choices=Reason.choices, default=Reason.NON_PAYMENT)
    notes = models.TextField(blank=True, default="")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)

    class Meta:
        db_table = "customers_service_suspensions"
        ordering = ["-suspended_at"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "id"], name="uq_service_suspension_tenant_id"),
        ]
        indexes = [
            models.Index(fields=["tenant", "status"], name="ix_service_suspension_status"),
            models.Index(fields=["tenant", "customer_service"], name="ix_service_suspension_cs"),
        ]


class ServiceTermination(UUIDTimestampModel):
    class Reason(models.TextChoices):
        CONTRACT_EXPIRED = "contract_expired", "Contract Expired"
        CUSTOMER_CANCELLED = "customer_cancelled", "Customer Cancelled"
        RELOCATION = "relocation", "Customer Relocation"
        NON_PAYMENT = "non_payment_permanent", "Permanent Non-Payment"
        VIOLATION = "violation", "Terms Violation"

    class Status(models.TextChoices):
        COMPLETED = "completed", "Completed"
        PENDING_DECOMMISSION = "pending_decommission", "Pending Decommission"
        CANCELLED = "cancelled", "Cancelled"

    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="service_terminations")
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="service_terminations_company_scope")
    customer_service = models.ForeignKey(CustomerService, on_delete=models.CASCADE, related_name="terminations")
    requested_at = models.DateTimeField(default=timezone.now)
    terminated_at = models.DateTimeField(default=timezone.now)
    reason = models.CharField(max_length=64, choices=Reason.choices, default=Reason.CUSTOMER_CANCELLED)
    refund_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    penalty_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.COMPLETED)
    notes = models.TextField(blank=True, default="")

    class Meta:
        db_table = "customers_service_terminations"
        ordering = ["-terminated_at"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "id"], name="uq_service_termination_tenant_id"),
        ]
        indexes = [
            models.Index(fields=["tenant", "status"], name="ix_service_termination_status"),
            models.Index(fields=["tenant", "customer_service"], name="ix_service_termination_cs"),
        ]


class DecommissionRecord(UUIDTimestampModel):
    class Status(models.TextChoices):
        RELEASED = "released", "Released"
        PENDING_RECOVERY = "pending_recovery", "Pending Recovery"
        DAMAGED = "damaged", "Damaged"
        LOST = "lost", "Lost"

    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="decommission_records")
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="decommission_records_company_scope")
    customer_service = models.ForeignKey(CustomerService, on_delete=models.CASCADE, related_name="decommissions")
    termination = models.ForeignKey(ServiceTermination, on_delete=models.CASCADE, related_name="decommissions")
    resource_type = models.CharField(max_length=64)
    resource_id = models.CharField(max_length=120)
    released_at = models.DateTimeField(default=timezone.now)
    technician_name = models.CharField(max_length=160, blank=True, default="")
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.RELEASED)
    notes = models.TextField(blank=True, default="")

    class Meta:
        db_table = "customers_decommission_records"
        ordering = ["-released_at"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "id"], name="uq_decommission_record_tenant_id"),
        ]
        indexes = [
            models.Index(fields=["tenant", "status"], name="ix_decommission_status"),
            models.Index(fields=["tenant", "customer_service"], name="ix_decommission_cs"),
        ]


class TechnicalChangeHistory(UUIDTimestampModel):
    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="technical_change_histories")
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="technical_change_histories_company_scope")
    customer_service = models.ForeignKey(CustomerService, on_delete=models.CASCADE, related_name="technical_change_history")
    entity_type = models.CharField(max_length=80)
    entity_id = models.CharField(max_length=80)
    field_name = models.CharField(max_length=100)
    old_value = models.TextField(blank=True, default="")
    new_value = models.TextField(blank=True, default="")
    changed_by = models.CharField(max_length=160, blank=True, default="")
    changed_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "customers_technical_change_history"
        ordering = ["-changed_at"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "id"], name="uq_tech_change_hist_tenant_id"),
        ]
        indexes = [
            models.Index(fields=["tenant", "customer_service"], name="ix_tech_change_hist_cs"),
        ]


class TechnicalAttachment(UUIDTimestampModel):
    class DocumentType(models.TextChoices):
        NETWORK_DIAGRAM = "network_diagram", "Network Diagram"
        SITE_PHOTO = "site_photo", "Site Photo"
        TEST_REPORT = "test_report", "Test Report"
        CONTRACT_SIGNED = "customer_contract_signed", "Signed Contract"
        OPTICAL_TRACE = "optical_trace", "Optical Trace"
        OTHER = "other", "Other"

    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="technical_attachments")
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="technical_attachments_company_scope")
    customer_service = models.ForeignKey(CustomerService, on_delete=models.CASCADE, related_name="attachments")
    activation = models.ForeignKey(ServiceActivation, on_delete=models.SET_NULL, null=True, blank=True, related_name="attachments")
    installation = models.ForeignKey(InstallationWorkOrder, on_delete=models.SET_NULL, null=True, blank=True, related_name="attachments")
    fault_ticket = models.ForeignKey("CustomerTicket", on_delete=models.SET_NULL, null=True, blank=True, related_name="attachments")
    title = models.CharField(max_length=200)
    document_type = models.CharField(max_length=64, choices=DocumentType.choices, default=DocumentType.NETWORK_DIAGRAM)
    file_url = models.CharField(max_length=500)
    file_size_bytes = models.IntegerField(default=0)
    uploaded_by = models.CharField(max_length=160, blank=True, default="")
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "customers_technical_attachments"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "id"], name="uq_tech_attach_tenant_id"),
        ]
        indexes = [
            models.Index(fields=["tenant", "customer_service"], name="ix_tech_attach_cs"),
        ]

from django.conf import settings as _ticket_comment_settings


# HQNATEX_TICKET_COMMENTS_SCHEMA_V1
class TicketComment(UUIDTimestampModel):
    tenant = models.ForeignKey(
        Tenant, on_delete=models.PROTECT,
        related_name="ticket_comments",
    )
    company = models.ForeignKey(
        Company, on_delete=models.PROTECT,
        related_name="ticket_comments",
    )
    ticket = models.ForeignKey(
        CustomerTicket, on_delete=models.PROTECT,
        related_name="comments",
    )
    author = models.ForeignKey(
        _ticket_comment_settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="customer_ticket_comments",
    )
    body = models.TextField(max_length=10000)
    parent = models.ForeignKey(
        "self", on_delete=models.PROTECT,
        null=True, blank=True, related_name="replies",
    )

    class Meta:
        db_table = "customers_ticket_comments"
        ordering = ["created_at", "id"]
        indexes = [
            models.Index(
                fields=["tenant", "company", "ticket", "created_at"],
                name="ix_tcomment_scope_time",
            ),
        ]


# HQNATEX_CUSTOMER_CALL_LOG_MODEL_V1
from django.conf import settings as _call_log_settings


class CustomerCallLog(UUIDTimestampModel):
    class Direction(models.TextChoices):
        INBOUND = "inbound", "Inbound"
        OUTBOUND = "outbound", "Outbound"

    class Outcome(models.TextChoices):
        ANSWERED = "answered", "Answered"
        MISSED = "missed", "Missed"
        NO_ANSWER = "no_answer", "No answer"
        BUSY = "busy", "Busy"
        FAILED = "failed", "Failed"
        CANCELLED = "cancelled", "Cancelled"

    tenant = models.ForeignKey(
        Tenant, on_delete=models.PROTECT,
        related_name="customer_call_logs",
    )
    company = models.ForeignKey(
        Company, on_delete=models.PROTECT,
        related_name="customer_call_logs",
    )
    customer = models.ForeignKey(
        Customer, on_delete=models.PROTECT,
        null=True, blank=True, related_name="call_logs",
    )
    ticket = models.ForeignKey(
        CustomerTicket, on_delete=models.PROTECT,
        null=True, blank=True, related_name="call_logs",
    )
    operator = models.ForeignKey(
        _call_log_settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="customer_call_logs",
    )
    phone_number = models.CharField(max_length=64)
    direction = models.CharField(
        max_length=16, choices=Direction.choices,
    )
    started_at = models.DateTimeField()
    ended_at = models.DateTimeField(null=True, blank=True)
    outcome = models.CharField(
        max_length=16, choices=Outcome.choices,
    )
    subject = models.CharField(max_length=255)
    notes = models.TextField(blank=True, default="")

    @property
    def duration_seconds(self):
        if self.started_at is None or self.ended_at is None:
            return None
        return int((self.ended_at - self.started_at).total_seconds())

    class Meta:
        db_table = "customers_call_logs"
        ordering = ["-started_at", "-id"]
        constraints = [
            models.CheckConstraint(
                condition=(
                    models.Q(ended_at__isnull=True)
                    | models.Q(ended_at__gte=models.F("started_at"))
                ),
                name="ck_call_end_after_start",
            ),
            models.CheckConstraint(
                condition=models.Q(direction__in=["inbound", "outbound"]),
                name="ck_call_direction",
            ),
            models.CheckConstraint(
                condition=models.Q(outcome__in=[
                    "answered", "missed", "no_answer",
                    "busy", "failed", "cancelled",
                ]),
                name="ck_call_outcome",
            ),
        ]
        indexes = [
            models.Index(
                fields=["tenant", "company", "started_at", "id"],
                name="ix_call_scope_time",
            ),
            models.Index(
                fields=["tenant", "company", "customer"],
                name="ix_call_scope_customer",
            ),
            models.Index(
                fields=["tenant", "company", "ticket"],
                name="ix_call_scope_ticket",
            ),
        ]

# HQNATEX_CALLCENTER_FOLLOWUP_MODEL_V1
from django.conf import settings as _followup_settings


class CustomerFollowUp(UUIDTimestampModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    class Priority(models.TextChoices):
        LOW = "low", "Low"
        NORMAL = "normal", "Normal"
        HIGH = "high", "High"
        URGENT = "urgent", "Urgent"

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.PROTECT,
        related_name="customer_followups",
    )
    company = models.ForeignKey(
        Company,
        on_delete=models.PROTECT,
        related_name="customer_followups_company_scope",
    )
    customer = models.ForeignKey(
        Customer,
        on_delete=models.PROTECT,
        related_name="followups",
    )
    ticket = models.ForeignKey(
        CustomerTicket,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="followups",
    )
    call_log = models.ForeignKey(
        CustomerCallLog,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="followups",
    )
    assigned_to = models.ForeignKey(
        _followup_settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="customer_followups_assigned",
    )

    scheduled_at = models.DateTimeField()
    subject = models.CharField(max_length=240)
    notes = models.TextField(blank=True)
    outcome = models.TextField(blank=True)

    status = models.CharField(
        max_length=24,
        choices=Status.choices,
        default=Status.PENDING,
    )
    priority = models.CharField(
        max_length=24,
        choices=Priority.choices,
        default=Priority.NORMAL,
    )

    completed_at = models.DateTimeField(
        null=True,
        blank=True,
    )
    cancelled_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    class Meta:
        db_table = "customers_followups"
        ordering = [
            "scheduled_at",
            "-created_at",
        ]
        indexes = [
            models.Index(
                fields=["tenant", "company", "status"],
                name="ix_followup_scope_status",
            ),
            models.Index(
                fields=["tenant", "company", "scheduled_at"],
                name="ix_followup_scope_schedule",
            ),
            models.Index(
                fields=["tenant", "company", "customer"],
                name="ix_followup_scope_customer",
            ),
            models.Index(
                fields=["tenant", "company", "assigned_to"],
                name="ix_followup_scope_assignee",
            ),
        ]

    def __str__(self):
        return f"{self.subject} @ {self.scheduled_at}"


class CustomerCallQualityEvaluation(UUIDTimestampModel):
    tenant = models.ForeignKey(
        Tenant, on_delete=models.PROTECT,
        related_name="call_quality_evaluations",
    )
    company = models.ForeignKey(
        Company, on_delete=models.PROTECT,
        related_name="call_quality_evaluations",
    )
    call_log = models.ForeignKey(
        CustomerCallLog, on_delete=models.PROTECT,
        null=True, blank=True, related_name="quality_evaluations",
    )
    ticket = models.ForeignKey(
        CustomerTicket, on_delete=models.PROTECT,
        null=True, blank=True, related_name="quality_evaluations",
    )
    follow_up = models.ForeignKey(
        CustomerFollowUp, on_delete=models.PROTECT,
        null=True, blank=True, related_name="quality_evaluations",
    )
    evaluator = models.ForeignKey(
        _followup_settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
        related_name="call_quality_evaluations",
    )
    score = models.PositiveSmallIntegerField()
    note = models.TextField(blank=True, default="")

    class Meta:
        db_table = "customers_call_quality_evaluations"
        ordering = ["-created_at", "-id"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(score__lte=100),
                name="ck_call_quality_score_100",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(call_log__isnull=False, ticket__isnull=True, follow_up__isnull=True)
                    | models.Q(call_log__isnull=True, ticket__isnull=False, follow_up__isnull=True)
                    | models.Q(call_log__isnull=True, ticket__isnull=True, follow_up__isnull=False)
                ),
                name="ck_call_quality_one_target",
            ),
        ]
        indexes = [
            models.Index(
                fields=["tenant", "company", "created_at"],
                name="ix_quality_scope_created",
            ),
            models.Index(
                fields=["tenant", "company", "evaluator"],
                name="ix_quality_scope_evaluator",
            ),
        ]

# HQNATEX_CALLCENTER_SETTINGS_MODEL_V1
def default_customer_callcenter_settings():
    return {
        "queues": [],
        "business_hours": {
            "timezone": "Asia/Kabul",
            "days": {
                day: {
                    "enabled": day != "friday",
                    "open": "08:00",
                    "close": "17:00",
                }
                for day in (
                    "sunday", "monday", "tuesday", "wednesday",
                    "thursday", "friday", "saturday",
                )
            },
        },
        "sla": {
            "first_response_minutes": {
                "low": 60, "normal": 30, "high": 15, "urgent": 5,
            },
            "resolution_minutes": {
                "low": 1440, "normal": 480, "high": 120, "urgent": 60,
            },
        },
        "outcomes": [
            "answered", "missed", "no_answer", "busy", "failed", "cancelled",
        ],
        "quality_rubric": [
            {"key": "greeting", "weight": 20},
            {"key": "verification", "weight": 20},
            {"key": "understanding", "weight": 20},
            {"key": "accuracy", "weight": 20},
            {"key": "communication", "weight": 20},
        ],
    }


class CustomerCallCenterSettings(UUIDTimestampModel):
    tenant = models.ForeignKey(
        Tenant, on_delete=models.PROTECT,
        related_name="callcenter_settings",
    )
    company = models.ForeignKey(
        Company, on_delete=models.PROTECT,
        related_name="callcenter_settings",
    )
    configuration = models.JSONField(
        default=default_customer_callcenter_settings,
    )

    class Meta:
        db_table = "customers_callcenter_settings"
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "company"],
                name="uq_cc_settings_tenant_company",
            ),
        ]
