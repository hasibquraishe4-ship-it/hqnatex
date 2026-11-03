from django.conf import settings
from django.db import models
from django.db.models import F, Q

from apps.common.models import UUIDTimestampModel


class ScopedRecord(UUIDTimestampModel):
    tenant = models.ForeignKey("tenancy.Tenant", on_delete=models.PROTECT)
    company = models.ForeignKey("companies.Company", on_delete=models.PROTECT)

    class Meta:
        abstract = True


class Project(ScopedRecord):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        ACTIVE = "active", "Active"
        ON_HOLD = "on_hold", "On hold"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    code = models.CharField(max_length=64)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    manager = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="managed_workspace_projects",
    )
    starts_on = models.DateField(null=True, blank=True)
    due_on = models.DateField(null=True, blank=True)
    budget = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    currency = models.CharField(
        max_length=3, choices=[("AFN", "AFN"), ("USD", "USD")], default="AFN",
    )

    class Meta:
        db_table = "workspace_projects"
        ordering = ["-created_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "company", "code"], name="uq_workspace_project_code",
            ),
            models.CheckConstraint(
                condition=Q(budget__gte=0), name="ck_workspace_project_budget",
            ),
            models.CheckConstraint(
                condition=Q(starts_on__isnull=True) | Q(due_on__isnull=True)
                | Q(due_on__gte=F("starts_on")),
                name="ck_workspace_project_dates",
            ),
        ]


class ProjectTask(ScopedRecord):
    class Status(models.TextChoices):
        TODO = "todo", "To do"
        IN_PROGRESS = "in_progress", "In progress"
        BLOCKED = "blocked", "Blocked"
        DONE = "done", "Done"
        CANCELLED = "cancelled", "Cancelled"

    project = models.ForeignKey(Project, on_delete=models.PROTECT, related_name="tasks")
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="workspace_tasks",
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.TODO)
    priority = models.CharField(
        max_length=10,
        choices=[("low", "Low"), ("normal", "Normal"), ("high", "High"), ("urgent", "Urgent")],
        default="normal",
    )
    due_on = models.DateField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "workspace_project_tasks"
        ordering = ["due_on", "-created_at", "id"]
        indexes = [
            models.Index(
                fields=["tenant", "company", "project", "status"],
                name="ix_workspace_task_scope",
            ),
        ]


class Document(ScopedRecord):
    project = models.ForeignKey(
        Project, on_delete=models.PROTECT, null=True, blank=True, related_name="documents",
    )
    title = models.CharField(max_length=200)
    reference_number = models.CharField(max_length=120, blank=True, default="")
    category = models.CharField(
        max_length=20,
        choices=[
            ("contract", "Contract"), ("license", "License"),
            ("letter", "Letter"), ("technical", "Technical"),
            ("financial", "Financial"), ("other", "Other"),
        ],
        default="other",
    )
    description = models.TextField(blank=True, default="")
    issued_on = models.DateField(null=True, blank=True)
    expires_on = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=16, choices=[("active", "Active"), ("archived", "Archived")],
        default="active",
    )
    # آدرس فایل خصوصی؛ از API قابل تعیین نیست.
    storage_key = models.CharField(max_length=500, blank=True, default="", editable=False)
    original_name = models.CharField(max_length=255, blank=True, default="", editable=False)
    content_type = models.CharField(max_length=120, blank=True, default="", editable=False)
    size_bytes = models.PositiveBigIntegerField(default=0, editable=False)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="workspace_documents", editable=False,
    )

    class Meta:
        db_table = "workspace_documents"
        ordering = ["-created_at", "-id"]
        constraints = [
            models.CheckConstraint(
                condition=Q(issued_on__isnull=True) | Q(expires_on__isnull=True)
                | Q(expires_on__gte=F("issued_on")),
                name="ck_workspace_document_dates",
            ),
        ]


class Contract(ScopedRecord):
    class PartyType(models.TextChoices):
        CUSTOMER = "customer", "Customer"
        SUPPLIER = "supplier", "Supplier"
        EMPLOYEE = "employee", "Employee"
        PARTNER = "partner", "Partner"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        ACTIVE = "active", "Active"
        EXPIRED = "expired", "Expired"
        TERMINATED = "terminated", "Terminated"
        ARCHIVED = "archived", "Archived"

    contract_number = models.CharField(max_length=100)
    title = models.CharField(max_length=200)
    party_type = models.CharField(max_length=16, choices=PartyType.choices)
    customer = models.ForeignKey(
        "customers.Customer", on_delete=models.PROTECT,
        null=True, blank=True, related_name="workspace_contracts",
    )
    supplier = models.ForeignKey(
        "warehouse.Supplier", on_delete=models.PROTECT,
        null=True, blank=True, related_name="workspace_contracts",
    )
    employee = models.ForeignKey(
        "hr.Employee", on_delete=models.PROTECT,
        null=True, blank=True, related_name="workspace_contracts",
    )
    partner = models.ForeignKey(
        "partners.Partner", on_delete=models.PROTECT,
        null=True, blank=True, related_name="workspace_contracts",
    )
    project = models.ForeignKey(
        Project, on_delete=models.PROTECT,
        null=True, blank=True, related_name="contracts",
    )
    document = models.ForeignKey(
        Document, on_delete=models.PROTECT,
        null=True, blank=True, related_name="contracts",
    )
    starts_on = models.DateField(null=True, blank=True)
    ends_on = models.DateField(null=True, blank=True)
    amount = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    currency = models.CharField(
        max_length=3, choices=[("AFN", "AFN"), ("USD", "USD")], default="AFN",
    )
    status = models.CharField(
        max_length=16, choices=Status.choices, default=Status.DRAFT,
    )
    notes = models.TextField(blank=True, default="")

    class Meta:
        db_table = "workspace_contracts"
        ordering = ["-created_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "company", "contract_number"],
                name="uq_workspace_contract_number",
            ),
            models.CheckConstraint(
                condition=Q(amount__gte=0), name="ck_workspace_contract_amount",
            ),
            models.CheckConstraint(
                condition=Q(starts_on__isnull=True) | Q(ends_on__isnull=True)
                | Q(ends_on__gte=F("starts_on")),
                name="ck_workspace_contract_dates",
            ),
            models.CheckConstraint(
                condition=(
                    Q(party_type="customer", customer__isnull=False,
                      supplier__isnull=True, employee__isnull=True, partner__isnull=True)
                    | Q(party_type="supplier", customer__isnull=True,
                        supplier__isnull=False, employee__isnull=True, partner__isnull=True)
                    | Q(party_type="employee", customer__isnull=True,
                        supplier__isnull=True, employee__isnull=False, partner__isnull=True)
                    | Q(party_type="partner", customer__isnull=True,
                        supplier__isnull=True, employee__isnull=True, partner__isnull=False)
                ),
                name="ck_workspace_contract_party",
            ),
        ]
        indexes = [
            models.Index(
                fields=["tenant", "company", "status"],
                name="ix_workspace_contract_state",
            ),
        ]


class Correspondence(ScopedRecord):
    class Direction(models.TextChoices):
        INCOMING = "incoming", "Incoming"
        OUTGOING = "outgoing", "Outgoing"

    class Status(models.TextChoices):
        REGISTERED = "registered", "Registered"
        ARCHIVED = "archived", "Archived"

    direction = models.CharField(max_length=10, choices=Direction.choices)
    letter_number = models.CharField(max_length=100)
    reference_number = models.CharField(max_length=120, blank=True, default="")
    subject = models.CharField(max_length=240)
    sender = models.CharField(max_length=200, blank=True, default="")
    recipient = models.CharField(max_length=200, blank=True, default="")
    correspondence_date = models.DateField()
    document = models.ForeignKey(
        Document, on_delete=models.PROTECT,
        null=True, blank=True, related_name="correspondence",
    )
    status = models.CharField(
        max_length=16, choices=Status.choices, default=Status.REGISTERED,
    )
    notes = models.TextField(blank=True, default="")

    class Meta:
        db_table = "workspace_correspondence"
        ordering = ["-correspondence_date", "-created_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "company", "direction", "letter_number"],
                name="uq_workspace_letter_number",
            ),
        ]
        indexes = [
            models.Index(
                fields=["tenant", "company", "direction", "status"],
                name="ix_workspace_letter_state",
            ),
        ]
