from decimal import Decimal

from django.db.models import Q
from rest_framework import serializers

from .models import RevenueAllocation, RevenueTransaction, ShareRule


class ShareRuleSerializer(serializers.ModelSerializer):
    agency_name = serializers.CharField(source="agency.name", read_only=True)
    service_name = serializers.CharField(source="service.name_english", read_only=True)

    class Meta:
        model = ShareRule
        fields = [
            "id", "tenant", "company", "agency", "agency_name", "service", "service_name",
            "code", "status", "effective_from", "effective_to", "partner_share_percent",
            "company_base_share_percent", "agency_gross_share_percent", "agency_tax_enabled",
            "agency_tax_percent", "source_note", "created_at", "updated_at"
        ]
        read_only_fields = [
            "id",
            "tenant",
            "company",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        request = self.context["request"]
        tenant_id = request.tenant_id
        company_id = request.company_id

        agency = attrs.get(
            "agency",
            getattr(self.instance, "agency", None),
        )
        service = attrs.get(
            "service",
            getattr(self.instance, "service", None),
        )

        for name, obj in (
            ("agency", agency),
            ("service", service),
        ):
            if (
                obj is not None
                and obj.tenant_id != tenant_id
            ):
                raise serializers.ValidationError(
                    {
                        name:
                        f"{name.title()} belongs to another tenant."
                    }
                )

        if (
            agency
            and str(agency.company_id)
            != str(company_id)
        ):
            raise serializers.ValidationError(
                {
                    "agency":
                    "Agency does not belong to the active company."
                }
            )

        service_changed = (
            self.instance is None
            or (
                "service" in attrs
                and service is not None
                and str(
                    getattr(
                        self.instance,
                        "service_id",
                        "",
                    )
                )
                != str(service.id)
            )
        )

        activating_rule = (
            self.instance is None
            or (
                "status" in attrs
                and attrs.get("status")
                == ShareRule.Status.ACTIVE
                and getattr(
                    self.instance,
                    "status",
                    None,
                )
                != ShareRule.Status.ACTIVE
            )
        )

        if (
            service
            and service.status != "active"
            and (
                service_changed
                or activating_rule
            )
        ):
            raise serializers.ValidationError(
                {
                    "service":
                    "Inactive service cannot be used for a new or reactivated share rule."
                }
            )

        partner = Decimal(attrs.get("partner_share_percent", getattr(self.instance, "partner_share_percent", 0)))
        company_pct = Decimal(attrs.get("company_base_share_percent", getattr(self.instance, "company_base_share_percent", 0)))
        agency_pct = Decimal(attrs.get("agency_gross_share_percent", getattr(self.instance, "agency_gross_share_percent", 0)))
        if partner + company_pct + agency_pct != Decimal("100"):
            raise serializers.ValidationError(
                {"percentages": "Partner + Company Base + Agency Gross must equal 100%. Agency tax is deducted after Agency Gross and is not part of the 100% split."}
            )

        start = attrs.get("effective_from", getattr(self.instance, "effective_from", None))
        end = attrs.get("effective_to", getattr(self.instance, "effective_to", None))
        if start and end and end < start:
            raise serializers.ValidationError({"effective_to": "Must be on or after effective_from."})

        if self.instance and self.instance.revenue_transactions.exists():
            locked_fields = {
                "company", "agency", "service", "effective_from", "effective_to",
                "partner_share_percent", "company_base_share_percent", "agency_gross_share_percent",
                "agency_tax_enabled", "agency_tax_percent",
            }
            if locked_fields.intersection(attrs.keys()):
                raise serializers.ValidationError(
                    {"rule": "A used financial rule is versioned/immutable. Create a new effective-dated rule instead."}
                )

        if service and start:
            qs = ShareRule.objects.filter(
                tenant_id=tenant_id,
                company_id=company_id,
                service=service,
                status=ShareRule.Status.ACTIVE,
            )
            if agency:
                qs = qs.filter(agency=agency)
            else:
                qs = qs.filter(agency__isnull=True)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            overlap = qs.filter(Q(effective_to__isnull=True) | Q(effective_to__gte=start))
            if end:
                overlap = overlap.filter(effective_from__lte=end)
            if overlap.exists():
                raise serializers.ValidationError({"effective_from": "Effective period overlaps an existing active share rule."})
        return attrs


class RevenueAllocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = RevenueAllocation
        fields = [
            "id", "tenant", "revenue_transaction", "share_rule", "allocation_type",
            "percent", "amount", "currency", "created_at", "updated_at"
        ]
        read_only_fields = fields


class RevenueTransactionSerializer(serializers.ModelSerializer):
    sale_number = serializers.CharField(source="sale.sale_number", read_only=True)
    customer_name = serializers.CharField(source="customer.display_name", read_only=True)
    service_name = serializers.CharField(source="service.name_english", read_only=True)
    agency_name = serializers.CharField(source="agency.name", read_only=True)
    allocations = RevenueAllocationSerializer(many=True, read_only=True)

    class Meta:
        model = RevenueTransaction
        fields = [
            "id", "tenant", "company", "branch", "agency", "agency_name", "sale",
            "sale_number", "sale_item", "customer", "customer_name", "customer_service",
            "service", "service_name", "share_rule", "revenue_number", "revenue_type",
            "recognition_date", "gross_amount", "currency", "status", "share_status",
            "allocations", "created_at", "updated_at"
        ]
        read_only_fields = fields


from .models import (
    AgencySettlement,
    AgencySettlementLine,
)


class AgencySettlementLineSerializer(serializers.ModelSerializer):
    revenue_number = serializers.CharField(
        source="revenue_transaction.revenue_number",
        read_only=True,
    )

    recognition_date = serializers.DateField(
        source="revenue_transaction.recognition_date",
        read_only=True,
    )

    class Meta:
        model = AgencySettlementLine
        fields = [
            "id",
            "tenant",
            "company",
            "settlement",
            "revenue_transaction",
            "revenue_number",
            "recognition_date",
            "share_rule",
            "gross_share_amount",
            "tax_amount",
            "net_amount",
            "currency",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class AgencySettlementSerializer(serializers.ModelSerializer):
    agency_name = serializers.CharField(
        source="agency.name",
        read_only=True,
    )

    lines = AgencySettlementLineSerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = AgencySettlement
        fields = [
            "id",
            "tenant",
            "company",
            "agency",
            "agency_name",
            "settlement_number",
            "period_start",
            "period_end",
            "currency",
            "status",
            "gross_share_amount",
            "tax_amount",
            "net_payable_amount",
            "paid_amount",
            "balance_amount",
            "approved_by_user_id",
            "approved_at",
            "paid_at",
            "reference",
            "notes",
            "lines",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class AgencySettlementCreateSerializer(serializers.Serializer):
    agency_id = serializers.UUIDField()
    period_start = serializers.DateField()
    period_end = serializers.DateField()

    currency = serializers.CharField(
        max_length=8,
        default="AFN",
    )

    reference = serializers.CharField(
        max_length=255,
        required=False,
        allow_blank=True,
        default="",
    )

    notes = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
    )

    def validate(self, attrs):
        if (
            attrs["period_end"]
            < attrs["period_start"]
        ):
            raise serializers.ValidationError(
                {
                    "period_end":
                        "Period end cannot be before period start."
                }
            )

        attrs["currency"] = (
            attrs.get(
                "currency",
                "AFN",
            )
            .strip()
            .upper()
        )

        if not attrs["currency"]:
            raise serializers.ValidationError(
                {
                    "currency":
                        "Currency is required."
                }
            )

        return attrs


class AgencySettlementApproveSerializer(
    serializers.Serializer
):
    notes = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
    )


class AgencySettlementMarkPaidSerializer(
    serializers.Serializer
):
    reference = serializers.CharField(
        max_length=255,
        required=False,
        allow_blank=True,
        default="",
    )

    notes = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
    )


class AgencySettlementVoidSerializer(
    serializers.Serializer
):
    reason = serializers.CharField(
        required=True,
        allow_blank=False,
    )
