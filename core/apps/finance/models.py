from django.db import models
from django.db.models import F, Q

from apps.common.models import UUIDTimestampModel
from apps.companies.models import Company
from apps.tenancy.models import Tenant


class Account(UUIDTimestampModel):
    """Chart of Accounts."""

    class AccountType(models.TextChoices):
        ASSET = "asset", "Asset"
        LIABILITY = "liability", "Liability"
        EQUITY = "equity", "Equity"
        REVENUE = "revenue", "Revenue"
        EXPENSE = "expense", "Expense"

    class NormalBalance(models.TextChoices):
        DEBIT = "debit", "Debit"
        CREDIT = "credit", "Credit"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"

    code = models.CharField(max_length=64)
    name = models.CharField(max_length=255)

    account_type = models.CharField(
        max_length=32,
        choices=AccountType.choices,
    )

    normal_balance = models.CharField(
        max_length=32,
        choices=NormalBalance.choices,
    )

    is_posting = models.BooleanField(
        default=True,
        help_text=(
            "True if journals can be posted to this account. "
            "False if it is a summary/category account."
        ),
    )

    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.ACTIVE,
    )

    description = models.TextField(blank=True)

    company = models.ForeignKey(
        Company,
        on_delete=models.PROTECT,
        related_name="accounts",
    )

    parent = models.ForeignKey(
        "self",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="children",
    )

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.PROTECT,
        related_name="accounts",
    )

    class Meta:
        db_table = "finance_accounts"
        ordering = ["code"]

        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "company", "code"],
                name="uq_account_tenant_company_code",
            ),
            models.UniqueConstraint(
                fields=["tenant", "id"],
                name="uq_account_tenant_id",
            ),
            models.CheckConstraint(
                condition=~Q(parent=F("id")),
                name="ck_account_no_self_parent",
            ),
        ]

        indexes = [
            models.Index(
                fields=["tenant", "company", "status"],
                name="ix_account_tenant_status",
            ),
        ]


# Backward-compatible alias.
FinanceAccount = Account
