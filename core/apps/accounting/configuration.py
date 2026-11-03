from __future__ import annotations

from datetime import date
from typing import Any

from django.apps import apps
from django.core.exceptions import ImproperlyConfigured
from django.db.models import Q
from django.utils import timezone


class FinanceConfigurationError(ImproperlyConfigured):
    """Raised when required finance configuration is missing or ambiguous."""


COMPANY_SETTING_KEYS = {
    "logo_url": "company.identity.logo_url",
    "email": "company.identity.email",
    "phone": "company.identity.phone",
    "address": "company.identity.address",
    "tax_id": "company.identity.tax_id",
    "currency": "company.finance.currency",
}

AGENCY_COMMERCIAL_MODE_KEY = "finance.agency.commercial_mode"
JOURNAL_SERIES_KEY = "journal"


def _status_filter_if_supported(queryset):
    model = queryset.model
    try:
        field = model._meta.get_field("status")
    except Exception:
        return queryset

    choices = {
        str(value).lower()
        for value, _label in (field.choices or [])
    }
    default = getattr(field, "default", None)

    if "active" in choices or str(default).lower() == "active":
        return queryset.filter(status="active")

    return queryset


def resolve_setting(
    *,
    tenant_id,
    key: str,
    company_id=None,
    branch_id=None,
    agency_id=None,
    as_of: date | None = None,
    required: bool = False,
) -> Any:
    """
    Resolve a governance Setting using scope precedence:
    agency -> branch -> company -> tenant.

    This function never supplies a business-value default. If a required value
    is missing, it fails rather than silently inventing a company, partner,
    percentage, tax, fee, currency, or commercial mode.
    """
    Setting = apps.get_model("governance", "Setting")
    as_of = as_of or timezone.localdate()

    qs = Setting.objects.filter(
        tenant_id=tenant_id,
        key=key,
    )

    qs = _status_filter_if_supported(qs)

    if company_id is None:
        qs = qs.filter(company_id__isnull=True)
    else:
        qs = qs.filter(
            Q(company_id=company_id)
            | Q(company_id__isnull=True)
        )

    if branch_id is None:
        qs = qs.filter(branch_id__isnull=True)
    else:
        qs = qs.filter(
            Q(branch_id=branch_id)
            | Q(branch_id__isnull=True)
        )

    if agency_id is None:
        qs = qs.filter(agency_id__isnull=True)
    else:
        qs = qs.filter(
            Q(agency_id=agency_id)
            | Q(agency_id__isnull=True)
        )

    qs = qs.filter(
        Q(effective_from__isnull=True)
        | Q(effective_from__lte=as_of)
    ).filter(
        Q(effective_to__isnull=True)
        | Q(effective_to__gte=as_of)
    )

    rows = list(
        qs.order_by(
            "-effective_from",
            "-updated_at",
        )
    )

    def rank(row):
        return (
            1 if agency_id is not None and row.agency_id == agency_id else 0,
            1 if branch_id is not None and row.branch_id == branch_id else 0,
            1 if company_id is not None and row.company_id == company_id else 0,
            row.effective_from or date.min,
            row.updated_at,
        )

    rows.sort(
        key=rank,
        reverse=True,
    )

    if not rows:
        if required:
            raise FinanceConfigurationError(
                f"Required setting is not configured: {key}"
            )
        return None

    return rows[0].value


def get_company_identity(
    *,
    company,
    as_of: date | None = None,
) -> dict[str, Any]:
    """
    Company names come from companies.Company.
    Optional branding/contact/finance identity comes from governance.Setting.
    """
    result = {
        "id": str(company.id),
        "code": company.code,
        "legal_name": company.legal_name,
        "trade_name": company.trade_name,
    }

    for output_key, setting_key in COMPANY_SETTING_KEYS.items():
        result[output_key] = resolve_setting(
            tenant_id=company.tenant_id,
            company_id=company.id,
            key=setting_key,
            as_of=as_of,
            required=False,
        )

    return result


def get_partner_identity(*, partner) -> dict[str, Any]:
    """Partner identity is read from partners.Partner, never from constants."""
    return {
        "id": str(partner.id),
        "code": partner.code,
        "legal_name": partner.legal_name,
        "trade_name": partner.trade_name,
        "tax_id": partner.tax_id,
        "registration_no": partner.registration_no,
        "phone": partner.phone,
        "email": partner.email,
        "address": partner.address,
        "status": partner.status,
    }


def get_agency_commercial_mode(
    *,
    agency,
    as_of: date | None = None,
    required: bool = True,
):
    """Resolve the agency commercial mode from governance.Setting."""
    return resolve_setting(
        tenant_id=agency.tenant_id,
        company_id=agency.company_id,
        branch_id=agency.branch_id,
        agency_id=agency.id,
        key=AGENCY_COMMERCIAL_MODE_KEY,
        as_of=as_of,
        required=required,
    )


def get_share_rule_terms(*, share_rule) -> dict[str, Any]:
    """
    Return configured revenue share terms from revenue.ShareRule.
    Accounting must consume allocations/results; it must not recalculate
    commercial percentages from hard-coded constants.
    """
    return {
        "id": str(share_rule.id),
        "code": share_rule.code,
        "partner_share_percent": share_rule.partner_share_percent,
        "company_base_share_percent": share_rule.company_base_share_percent,
        "agency_gross_share_percent": share_rule.agency_gross_share_percent,
        "agency_tax_enabled": share_rule.agency_tax_enabled,
        "agency_tax_percent": share_rule.agency_tax_percent,
        "effective_from": share_rule.effective_from,
        "effective_to": share_rule.effective_to,
        "status": share_rule.status,
    }


def get_numbering_configuration(
    *,
    tenant_id,
    company_id,
    series_key: str,
):
    """
    Read numbering configuration from governance.NumberingSeries.
    Prefix, padding, reset policy, and next number are database values.
    """
    Series = apps.get_model("governance", "NumberingSeries")

    try:
        row = Series.objects.get(
            tenant_id=tenant_id,
            company_id=company_id,
            series_key=series_key,
            is_active=True,
        )
    except Series.DoesNotExist as exc:
        raise FinanceConfigurationError(
            f"Active numbering series is not configured: {series_key}"
        ) from exc
    except Series.MultipleObjectsReturned as exc:
        raise FinanceConfigurationError(
            f"Multiple active numbering series found: {series_key}"
        ) from exc

    return {
        "id": str(row.id),
        "series_key": row.series_key,
        "prefix": row.prefix,
        "padding": row.padding,
        "reset_policy": row.reset_policy,
        "next_number": row.next_number,
    }


def get_journal_numbering_configuration(
    *,
    tenant_id,
    company_id,
):
    return get_numbering_configuration(
        tenant_id=tenant_id,
        company_id=company_id,
        series_key=JOURNAL_SERIES_KEY,
    )
