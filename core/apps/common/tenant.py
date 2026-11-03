from __future__ import annotations

from uuid import UUID

from django.db import connection
from rest_framework.exceptions import ValidationError


def parse_tenant_id(raw: str | None) -> UUID:
    if not raw:
        raise ValidationError({"tenant": "X-Tenant-ID header is required."})
    try:
        return UUID(str(raw))
    except (TypeError, ValueError) as exc:
        raise ValidationError({"tenant": "X-Tenant-ID must be a valid UUID."}) from exc


def set_current_tenant(tenant_id: UUID | str, *, local: bool = True) -> None:
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT set_config('app.current_tenant_id', %s, %s)",
            [str(tenant_id), local],
        )


def parse_company_id(raw: str | None) -> UUID:
    if not raw:
        raise ValidationError({"company": "X-Company-ID header is required."})
    try:
        return UUID(str(raw))
    except (TypeError, ValueError) as exc:
        raise ValidationError(
            {"company": "X-Company-ID must be a valid UUID."}
        ) from exc


def set_current_company(company_id: UUID | str, *, local: bool = True) -> None:
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT set_config('app.current_company_id', %s, %s)",
            [str(company_id), local],
        )
