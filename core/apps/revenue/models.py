from django.db import models
from django.db.models import Q
from django.utils import timezone

from apps.agencies.models import Agency
from apps.branches.models import Branch
from apps.catalog.models import Service
from apps.common.models import UUIDTimestampModel
from apps.companies.models import Company
from apps.customers.models import Customer, CustomerService
from apps.sales.models import Sale, SaleItem
from apps.tenancy.models import Tenant


class ShareRule(UUIDTimestampModel):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"

    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="share_rules")
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="share_rules")
    agency = models.ForeignKey(Agency, on_delete=models.PROTECT, null=True, blank=True, related_name="share_rules")
    service = models.ForeignKey(Service, on_delete=models.PROTECT, related_name="share_rules")
    code = models.CharField(max_length=120)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ACTIVE)
    effective_from = models.DateField()
    effective_to = models.DateField(null=True, blank=True)
    partner_share_percent = models.DecimalField(max_digits=7, decimal_places=4, default=0)
    company_base_share_percent = models.DecimalField(max_digits=7, decimal_places=4, default=0)
    agency_gross_share_percent = models.DecimalField(max_digits=7, decimal_places=4, default=0)
    agency_tax_enabled = models.BooleanField(default=False)
    agency_tax_percent = models.DecimalField(max_digits=7, decimal_places=4, default=0)
    source_note = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = "revenue_share_rules"
        ordering = ["service", "agency", "-effective_from"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "code"], name="uq_share_rule_tenant_code"),
            models.UniqueConstraint(fields=["tenant", "id"], name="uq_share_rule_tenant_id"),
            models.CheckConstraint(
                condition=Q(effective_to__isnull=True) | Q(effective_to__gte=models.F("effective_from")),
                name="ck_share_rule_date_order",
            ),
            models.CheckConstraint(condition=Q(partner_share_percent__gte=0) & Q(partner_share_percent__lte=100), name="ck_partner_share_range"),
            models.CheckConstraint(condition=Q(company_base_share_percent__gte=0) & Q(company_base_share_percent__lte=100), name="ck_company_share_range"),
            models.CheckConstraint(condition=Q(agency_gross_share_percent__gte=0) & Q(agency_gross_share_percent__lte=100), name="ck_agency_share_range"),
            models.CheckConstraint(condition=Q(agency_tax_percent__gte=0) & Q(agency_tax_percent__lte=100), name="ck_agency_tax_range"),
        ]
        indexes = [
            models.Index(fields=["tenant", "service", "agency", "status", "effective_from"], name="ix_share_rule_effective")
        ]


class RevenueTransaction(UUIDTimestampModel):
    class RevenueType(models.TextChoices):
        SERVICE = "service", "Service"
        PACKAGE = "package", "Package"
        INSTALLATION = "installation", "Installation"
        RENTAL = "rental", "Rental"
        FEE = "fee", "Fee"

    class Status(models.TextChoices):
        POSTED = "posted", "Posted"
        REVERSED = "reversed", "Reversed"

    class ShareStatus(models.TextChoices):
        ALLOCATED = "allocated", "Allocated"
        NOT_APPLICABLE = "not_applicable", "Not Applicable"

    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="revenue_transactions")
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="revenue_transactions")
    branch = models.ForeignKey(Branch, on_delete=models.PROTECT, null=True, blank=True, related_name="revenue_transactions")
    agency = models.ForeignKey(Agency, on_delete=models.PROTECT, null=True, blank=True, related_name="revenue_transactions")
    sale = models.ForeignKey(Sale, on_delete=models.PROTECT, related_name="revenue_transactions")
    sale_item = models.ForeignKey(SaleItem, on_delete=models.PROTECT, related_name="revenue_transactions")
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name="revenue_transactions")
    customer_service = models.ForeignKey(CustomerService, on_delete=models.PROTECT, null=True, blank=True, related_name="revenue_transactions")
    service = models.ForeignKey(Service, on_delete=models.PROTECT, null=True, blank=True, related_name="revenue_transactions")
    share_rule = models.ForeignKey(ShareRule, on_delete=models.PROTECT, null=True, blank=True, related_name="revenue_transactions")
    revenue_number = models.CharField(max_length=140)
    revenue_type = models.CharField(max_length=20, choices=RevenueType.choices)
    recognition_date = models.DateField(default=timezone.localdate)
    gross_amount = models.DecimalField(max_digits=18, decimal_places=2)
    currency = models.CharField(max_length=8, default="AFN")
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.POSTED)
    share_status = models.CharField(max_length=20, choices=ShareStatus.choices)

    class Meta:
        db_table = "revenue_transactions"
        ordering = ["-recognition_date", "-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "revenue_number"], name="uq_revenue_tenant_number"),
            models.UniqueConstraint(fields=["tenant", "id"], name="uq_revenue_tenant_id"),
            models.UniqueConstraint(fields=["tenant", "sale_item"], name="uq_revenue_tenant_sale_item"),
            models.CheckConstraint(condition=Q(gross_amount__gte=0), name="ck_revenue_gross_nonnegative"),
        ]
        indexes = [
            models.Index(fields=["tenant", "recognition_date", "status"], name="ix_revenue_date_status"),
            models.Index(fields=["tenant", "agency"], name="ix_revenue_agency"),
            models.Index(fields=["tenant", "service"], name="ix_revenue_service"),
        ]


class RevenueAllocation(UUIDTimestampModel):
    class AllocationType(models.TextChoices):
        PARTNER = "partner", "Partner Share"
        COMPANY_BASE = "company_base", "Company Base Share"
        AGENCY_GROSS = "agency_gross", "Agency Gross Share"
        AGENCY_TAX = "agency_tax", "Agency Tax"
        AGENCY_NET = "agency_net", "Agency Net"

    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="revenue_allocations")

    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="revenue_allocations_company_scope")
    revenue_transaction = models.ForeignKey(RevenueTransaction, on_delete=models.PROTECT, related_name="allocations")
    share_rule = models.ForeignKey(ShareRule, on_delete=models.PROTECT, null=True, blank=True, related_name="allocations")
    allocation_type = models.CharField(max_length=24, choices=AllocationType.choices)
    percent = models.DecimalField(max_digits=7, decimal_places=4, null=True, blank=True)
    amount = models.DecimalField(max_digits=18, decimal_places=2)
    currency = models.CharField(max_length=8, default="AFN")

    class Meta:
        db_table = "revenue_allocations"
        ordering = ["revenue_transaction", "allocation_type"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "id"], name="uq_revenue_allocation_tenant_id"),
            models.UniqueConstraint(fields=["tenant", "revenue_transaction", "allocation_type"], name="uq_revenue_allocation_type"),
            models.CheckConstraint(condition=Q(amount__gte=0), name="ck_revenue_allocation_nonnegative"),
        ]


class AgencySettlement(UUIDTimestampModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        APPROVED = "approved", "Approved"
        PAID = "paid", "Paid"
        VOID = "void", "Void"

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.PROTECT,
        related_name="agency_settlements",
    )
    company = models.ForeignKey(
        Company,
        on_delete=models.PROTECT,
        related_name="agency_settlements",
    )
    agency = models.ForeignKey(
        Agency,
        on_delete=models.PROTECT,
        related_name="settlements",
    )

    settlement_number = models.CharField(
        max_length=140,
    )

    period_start = models.DateField()
    period_end = models.DateField()

    currency = models.CharField(
        max_length=8,
        default="AFN",
    )

    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.DRAFT,
    )

    gross_share_amount = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=0,
    )
    tax_amount = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=0,
    )
    net_payable_amount = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=0,
    )
    paid_amount = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=0,
    )
    balance_amount = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=0,
    )

    approved_by_user_id = models.UUIDField(
        null=True,
        blank=True,
    )
    approved_at = models.DateTimeField(
        null=True,
        blank=True,
    )
    paid_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    reference = models.CharField(
        max_length=255,
        blank=True,
    )
    notes = models.TextField(
        blank=True,
    )

    class Meta:
        db_table = "revenue_agency_settlements"

        ordering = [
            "-period_end",
            "-created_at",
        ]

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "tenant",
                    "company",
                    "settlement_number",
                ],
                name="uq_ag_settle_tenant_comp_no",
            ),
            models.UniqueConstraint(
                fields=[
                    "tenant",
                    "id",
                ],
                name="uq_ag_settle_tenant_id",
            ),
            models.CheckConstraint(
                condition=Q(
                    period_end__gte=models.F(
                        "period_start"
                    )
                ),
                name="ck_ag_settle_period",
            ),
            models.CheckConstraint(
                condition=Q(
                    gross_share_amount__gte=0
                ),
                name="ck_ag_settle_gross_nn",
            ),
            models.CheckConstraint(
                condition=Q(
                    tax_amount__gte=0
                ),
                name="ck_ag_settle_tax_nn",
            ),
            models.CheckConstraint(
                condition=Q(
                    net_payable_amount__gte=0
                ),
                name="ck_ag_settle_net_nn",
            ),
            models.CheckConstraint(
                condition=Q(
                    paid_amount__gte=0
                ),
                name="ck_ag_settle_paid_nn",
            ),
            models.CheckConstraint(
                condition=Q(
                    balance_amount__gte=0
                ),
                name="ck_ag_settle_bal_nn",
            ),
            models.CheckConstraint(
                condition=Q(
                    tax_amount__lte=models.F(
                        "gross_share_amount"
                    )
                ),
                name="ck_ag_settle_tax_le_gross",
            ),
            models.CheckConstraint(
                condition=Q(
                    paid_amount__lte=models.F(
                        "net_payable_amount"
                    )
                ),
                name="ck_ag_settle_paid_le_net",
            ),
            models.CheckConstraint(
                condition=Q(
                    net_payable_amount=(
                        models.F(
                            "gross_share_amount"
                        )
                        - models.F(
                            "tax_amount"
                        )
                    )
                ),
                name="ck_ag_settle_net_math",
            ),
            models.CheckConstraint(
                condition=Q(
                    balance_amount=(
                        models.F(
                            "net_payable_amount"
                        )
                        - models.F(
                            "paid_amount"
                        )
                    )
                ),
                name="ck_ag_settle_bal_math",
            ),
        ]

        indexes = [
            models.Index(
                fields=[
                    "tenant",
                    "agency",
                    "period_end",
                ],
                name="ix_ag_settle_period",
            ),
            models.Index(
                fields=[
                    "tenant",
                    "status",
                ],
                name="ix_ag_settle_status",
            ),
        ]


class AgencySettlementLine(UUIDTimestampModel):
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.PROTECT,
        related_name="agency_settlement_lines",
    )
    company = models.ForeignKey(
        Company,
        on_delete=models.PROTECT,
        related_name="agency_settlement_lines",
    )

    settlement = models.ForeignKey(
        AgencySettlement,
        on_delete=models.PROTECT,
        related_name="lines",
    )

    revenue_transaction = models.ForeignKey(
        RevenueTransaction,
        on_delete=models.PROTECT,
        related_name="agency_settlement_lines",
    )

    share_rule = models.ForeignKey(
        ShareRule,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="agency_settlement_lines",
    )

    gross_share_amount = models.DecimalField(
        max_digits=18,
        decimal_places=2,
    )
    tax_amount = models.DecimalField(
        max_digits=18,
        decimal_places=2,
    )
    net_amount = models.DecimalField(
        max_digits=18,
        decimal_places=2,
    )

    currency = models.CharField(
        max_length=8,
        default="AFN",
    )

    is_active = models.BooleanField(
        default=True,
    )

    class Meta:
        db_table = "revenue_agency_settlement_lines"

        ordering = [
            "settlement",
            "revenue_transaction",
        ]

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "tenant",
                    "id",
                ],
                name="uq_ag_line_tenant_id",
            ),
            models.UniqueConstraint(
                fields=[
                    "tenant",
                    "revenue_transaction",
                ],
                condition=Q(
                    is_active=True,
                ),
                name="uq_ag_line_active_revenue",
            ),
            models.CheckConstraint(
                condition=Q(
                    gross_share_amount__gte=0
                ),
                name="ck_ag_line_gross_nn",
            ),
            models.CheckConstraint(
                condition=Q(
                    tax_amount__gte=0
                ),
                name="ck_ag_line_tax_nn",
            ),
            models.CheckConstraint(
                condition=Q(
                    net_amount__gte=0
                ),
                name="ck_ag_line_net_nn",
            ),
            models.CheckConstraint(
                condition=Q(
                    tax_amount__lte=models.F(
                        "gross_share_amount"
                    )
                ),
                name="ck_ag_line_tax_le_gross",
            ),
            models.CheckConstraint(
                condition=Q(
                    net_amount=(
                        models.F(
                            "gross_share_amount"
                        )
                        - models.F(
                            "tax_amount"
                        )
                    )
                ),
                name="ck_ag_line_net_math",
            ),
        ]

        indexes = [
            models.Index(
                fields=[
                    "tenant",
                    "settlement",
                ],
                name="ix_ag_line_settlement",
            ),
            models.Index(
                fields=[
                    "tenant",
                    "revenue_transaction",
                    "is_active",
                ],
                name="ix_ag_line_revenue",
            ),
        ]
