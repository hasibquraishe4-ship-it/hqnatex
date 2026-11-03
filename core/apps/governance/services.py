from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.platform_tenancy_v3.rls import set_rls_context

from .models import NumberingSeries


def allocate_number(
    *,
    tenant_id,
    company_id,
    series_key,
    database_alias="default",
):
    """
    Atomically allocate the next number for one tenant/company/series.

    Concurrency guarantees:
    - transaction.atomic()
    - PostgreSQL row lock through select_for_update()
    - never uses MAX()+1
    """

    if not tenant_id:
        raise ValidationError({"tenant": "tenant_id is required."})

    if not company_id:
        raise ValidationError({"company": "company_id is required."})

    series_key = str(series_key or "").strip()

    if not series_key:
        raise ValidationError({"series_key": "series_key is required."})

    with transaction.atomic(using=database_alias):

        # set_config(..., true) is transaction-local, so the RLS context
        # must be established inside this same atomic transaction.
        set_rls_context(
            database_alias,
            tenant_id,
            company_id,
        )

        try:
            series = (
                NumberingSeries.objects
                .using(database_alias)
                .select_for_update(of=("self",))
                .get(
                    tenant_id=tenant_id,
                    company_id=company_id,
                    series_key=series_key,
                    is_active=True,
                )
            )
        except NumberingSeries.DoesNotExist as exc:
            raise ValidationError(
                {
                    "series_key":
                        "No active numbering series exists for this "
                        "tenant/company/series key."
                }
            ) from exc

        number = int(series.next_number)
        padding = int(series.padding)

        if number < 1:
            raise ValidationError(
                {"next_number": "next_number must be at least 1."}
            )

        if padding < 1 or padding > 20:
            raise ValidationError(
                {"padding": "padding must be between 1 and 20."}
            )

        prefix = series.prefix or ""
        allocated = f"{prefix}{number:0{padding}d}"

        series.next_number = number + 1
        series.updated_at = timezone.now()

        series.save(
            using=database_alias,
            update_fields=[
                "next_number",
                "updated_at",
            ],
        )

        return allocated
