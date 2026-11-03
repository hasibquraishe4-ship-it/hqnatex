from django.apps import apps

from rest_framework import serializers


_SERIALIZER_CACHE = {}


SYSTEM_READ_ONLY = {
    "id",
    "tenant",
    "company",
    "created_at",
    "updated_at",
    "approved_by",
    "approved_at",
    "processed_by",
    "processed_at",
    "requested_by",
    "requested_at",
    "decided_at",
    "cleared_by",
    "cleared_at",
    "actor",
}


PAYROLL_COMPUTED = {
    "base_salary",
    "allowance_total",
    "overtime_total",
    "gross_pay",
    "deduction_total",
    "tax_total",
    "net_pay",
}


def _field_names(model):

    return {
        field.name
        for field in model._meta.fields
    }


def _canonical_branch_model():

    for model in apps.get_models():

        if model.__name__ != "Branch":
            continue

        names = _field_names(
            model
        )

        if (
            "tenant" in names
            and
            "company" in names
        ):
            return model

    return None


class ScopedModelSerializer(
    serializers.ModelSerializer
):

    def validate(self, attrs):

        attrs = super().validate(
            attrs
        )

        request = (
            self.context.get(
                "request"
            )
        )

        if request is None:
            return attrs

        tenant_id = getattr(
            request,
            "tenant_id",
            None,
        )

        company_id = getattr(
            request,
            "company_id",
            None,
        )

        if not tenant_id or not company_id:
            raise serializers.ValidationError(
                "Tenant/company context is required."
            )

        for key, value in attrs.items():

            if value is None:
                continue

            related_tenant = getattr(
                value,
                "tenant_id",
                None,
            )

            related_company = getattr(
                value,
                "company_id",
                None,
            )

            if (
                related_tenant is not None
                and
                str(related_tenant)
                != str(tenant_id)
            ):
                raise serializers.ValidationError(
                    {
                        key:
                            "Cross-tenant relation is not allowed."
                    }
                )

            if (
                related_company is not None
                and
                str(related_company)
                != str(company_id)
            ):
                raise serializers.ValidationError(
                    {
                        key:
                            "Cross-company relation is not allowed."
                    }
                )

        branch_model = (
            _canonical_branch_model()
        )

        for branch_key in (
            "branch_id",
            "from_branch_id",
            "to_branch_id",
        ):

            branch_id = attrs.get(
                branch_key
            )

            if (
                branch_id
                and
                branch_model is not None
            ):

                valid = (
                    branch_model.objects
                    .filter(
                        pk=branch_id,
                        tenant_id=tenant_id,
                        company_id=company_id,
                    )
                    .exists()
                )

                if not valid:
                    raise serializers.ValidationError(
                        {
                            branch_key:
                                "Branch is outside the active company."
                        }
                    )

        start_date = attrs.get(
            "start_date"
        )

        end_date = attrs.get(
            "end_date"
        )

        if (
            start_date
            and
            end_date
            and
            end_date < start_date
        ):
            raise serializers.ValidationError(
                {
                    "end_date":
                        "End date cannot be before start date."
                }
            )

        period_start = attrs.get(
            "period_start"
        )

        period_end = attrs.get(
            "period_end"
        )

        if (
            period_start
            and
            period_end
            and
            period_end < period_start
        ):
            raise serializers.ValidationError(
                {
                    "period_end":
                        "Period end cannot be before period start."
                }
            )

        if (
            self.Meta.model.__name__
            == "PayrollTaxBracket"
        ):

            minimum = attrs.get(
                "minimum_amount"
            )

            maximum = attrs.get(
                "maximum_amount"
            )

            rate = attrs.get(
                "rate_percent"
            )

            if (
                minimum is not None
                and
                minimum < 0
            ):
                raise serializers.ValidationError(
                    {
                        "minimum_amount":
                            "Minimum amount cannot be negative."
                    }
                )

            if (
                maximum is not None
                and
                minimum is not None
                and
                maximum < minimum
            ):
                raise serializers.ValidationError(
                    {
                        "maximum_amount":
                            "Maximum amount cannot be less than minimum."
                    }
                )

            if (
                rate is not None
                and
                rate < 0
            ):
                raise serializers.ValidationError(
                    {
                        "rate_percent":
                            "Tax rate cannot be negative."
                    }
                )

        if (
            self.Meta.model.__name__
            == "LeaveRequest"
        ):

            days = attrs.get(
                "days"
            )

            if (
                days is not None
                and
                days <= 0
            ):
                raise serializers.ValidationError(
                    {
                        "days":
                            "Leave days must be greater than zero."
                    }
                )

        return attrs


def serializer_for(model):

    existing = (
        _SERIALIZER_CACHE.get(
            model
        )
    )

    if existing is not None:
        return existing

    names = _field_names(
        model
    )

    read_only = set(
        SYSTEM_READ_ONLY
    ).intersection(
        names
    )

    if (
        model.__name__
        == "PayrollEntry"
    ):
        read_only.update(
            PAYROLL_COMPUTED
        )

    if (
        model.__name__
        == "Payslip"
    ):
        read_only.update(
            {
                "slip_number",
                "issued_at",
            }
        )

    Meta = type(
        "Meta",
        (),
        {
            "model":
                model,
            "fields":
                "__all__",
            "read_only_fields":
                tuple(
                    sorted(
                        read_only
                    )
                ),
        },
    )

    serializer = type(
        f"{model.__name__}Serializer",
        (
            ScopedModelSerializer,
        ),
        {
            "Meta": Meta,
            "__module__":
                __name__,
        },
    )

    _SERIALIZER_CACHE[
        model
    ] = serializer

    return serializer
