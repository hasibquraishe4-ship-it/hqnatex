from apps.common.api import (
    CompanyScopedModelViewSet,
    CompanyScopedReadOnlyModelViewSet,
)

from .models import (
    RevenueAllocation,
    RevenueTransaction,
    ShareRule,
)

from .serializers import (
    RevenueAllocationSerializer,
    RevenueTransactionSerializer,
    ShareRuleSerializer,
)


class ShareRuleViewSet(CompanyScopedModelViewSet):
    queryset = ShareRule.objects.select_related(
        "company",
        "agency",
        "service",
    ).all()

    serializer_class = ShareRuleSerializer

    permission_read = "revenue.view"
    permission_write = "revenue.rules.manage"


class RevenueTransactionViewSet(
    CompanyScopedReadOnlyModelViewSet
):
    queryset = (
        RevenueTransaction.objects
        .select_related(
            "company",
            "branch",
            "agency",
            "sale",
            "sale_item",
            "customer",
            "customer_service",
            "service",
            "share_rule",
        )
        .prefetch_related(
            "allocations",
        )
        .all()
    )

    serializer_class = RevenueTransactionSerializer
    permission_read = "revenue.view"


class RevenueAllocationViewSet(
    CompanyScopedReadOnlyModelViewSet
):
    queryset = RevenueAllocation.objects.select_related(
        "company",
        "revenue_transaction",
        "share_rule",
    ).all()

    serializer_class = RevenueAllocationSerializer
    permission_read = "revenue.view"


from rest_framework import status as drf_status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.common.api import (
    CompanyScopedReadOnlyModelViewSet,
)

from .models import AgencySettlement
from .serializers import (
    AgencySettlementApproveSerializer,
    AgencySettlementCreateSerializer,
    AgencySettlementMarkPaidSerializer,
    AgencySettlementSerializer,
    AgencySettlementVoidSerializer,
)
from .settlement_services import (
    approve_agency_settlement,
    create_agency_settlement,
    mark_agency_settlement_paid,
    void_agency_settlement,
)


class AgencySettlementViewSet(
    CompanyScopedReadOnlyModelViewSet
):
    queryset = (
        AgencySettlement.objects
        .select_related(
            "agency",
            "company",
        )
        .prefetch_related(
            "lines__revenue_transaction",
            "lines__share_rule",
        )
        .all()
    )

    serializer_class = (
        AgencySettlementSerializer
    )

    permission_read = (
        "revenue.settlements.view"
    )
    permission_write = (
        "revenue.settlements.manage"
    )

    def permission_key_for_method(
        self,
        method,
    ):
        if method in {
            "GET",
            "HEAD",
            "OPTIONS",
        }:
            return self.permission_read

        return self.permission_write

    def get_queryset(self):
        qs = super().get_queryset()

        agency_id = (
            self.request.query_params
            .get("agency")
        )

        settlement_status = (
            self.request.query_params
            .get("status")
        )

        period_start = (
            self.request.query_params
            .get("period_start")
        )

        period_end = (
            self.request.query_params
            .get("period_end")
        )

        currency = (
            self.request.query_params
            .get("currency")
        )

        if agency_id:
            qs = qs.filter(
                agency_id=agency_id,
            )

        if settlement_status:
            qs = qs.filter(
                status=settlement_status,
            )

        if period_start:
            qs = qs.filter(
                period_end__gte=period_start,
            )

        if period_end:
            qs = qs.filter(
                period_start__lte=period_end,
            )

        if currency:
            qs = qs.filter(
                currency=currency.upper(),
            )

        return qs

    def create(
        self,
        request,
        *args,
        **kwargs,
    ):
        serializer = (
            AgencySettlementCreateSerializer(
                data=request.data,
            )
        )

        serializer.is_valid(
            raise_exception=True,
        )

        settlement = (
            create_agency_settlement(
                tenant_id=request.tenant_id,
                company_id=request.company_id,
                actor=request.user,
                **serializer.validated_data,
            )
        )

        output = (
            AgencySettlementSerializer(
                settlement,
                context={
                    "request":
                        request,
                },
            )
        )

        return Response(
            output.data,
            status=drf_status.HTTP_201_CREATED,
        )

    @action(
        detail=True,
        methods=["post"],
        url_path="approve",
    )
    def approve(
        self,
        request,
        pk=None,
    ):
        serializer = (
            AgencySettlementApproveSerializer(
                data=request.data,
            )
        )

        serializer.is_valid(
            raise_exception=True,
        )

        settlement = (
            approve_agency_settlement(
                settlement_id=pk,
                tenant_id=request.tenant_id,
                company_id=request.company_id,
                actor=request.user,
                **serializer.validated_data,
            )
        )

        return Response(
            AgencySettlementSerializer(
                settlement,
                context={
                    "request":
                        request,
                },
            ).data
        )

    @action(
        detail=True,
        methods=["post"],
        url_path="mark-paid",
    )
    def mark_paid(
        self,
        request,
        pk=None,
    ):
        serializer = (
            AgencySettlementMarkPaidSerializer(
                data=request.data,
            )
        )

        serializer.is_valid(
            raise_exception=True,
        )

        settlement = (
            mark_agency_settlement_paid(
                settlement_id=pk,
                tenant_id=request.tenant_id,
                company_id=request.company_id,
                actor=request.user,
                **serializer.validated_data,
            )
        )

        return Response(
            AgencySettlementSerializer(
                settlement,
                context={
                    "request":
                        request,
                },
            ).data
        )

    @action(
        detail=True,
        methods=["post"],
        url_path="void",
    )
    def void(
        self,
        request,
        pk=None,
    ):
        serializer = (
            AgencySettlementVoidSerializer(
                data=request.data,
            )
        )

        serializer.is_valid(
            raise_exception=True,
        )

        settlement = (
            void_agency_settlement(
                settlement_id=pk,
                tenant_id=request.tenant_id,
                company_id=request.company_id,
                actor=request.user,
                **serializer.validated_data,
            )
        )

        return Response(
            AgencySettlementSerializer(
                settlement,
                context={
                    "request":
                        request,
                },
            ).data
        )
