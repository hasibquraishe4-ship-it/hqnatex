from decimal import Decimal
from django.db import connection
from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import TenantContextPermission
from apps.common.tenant import set_current_tenant
from apps.companies.models import Company
from apps.iam.serializers import UserSerializer


from django.db.models import Sum, Count, Q
from django.utils import timezone
from apps.sales.models import Sale
from apps.customers.models import Customer, CustomerService
from apps.billing.models import Receivable
from apps.revenue.models import RevenueTransaction, RevenueAllocation

class DashboardView(APIView):
    permission_classes = [IsAuthenticated, TenantContextPermission]

    def get(self, request):
        tenant_id = request.tenant_id
        company_id = request.headers.get("X-Company-ID")
        
        # Base filters
        filters = Q(tenant_id=tenant_id)
        if company_id:
            filters &= Q(company_id=company_id)

        today = timezone.localdate()
        month_start = today.replace(day=1)

        # Sales stats
        sales_today = Sale.objects.filter(filters, sale_date=today, status="posted").aggregate(total=Sum("total"))["total"] or 0
        sales_month = Sale.objects.filter(filters, sale_date__gte=month_start, status="posted").aggregate(total=Sum("total"))["total"] or 0

        # Customer stats
        active_customers = Customer.objects.filter(filters, status="active").count()
        active_services = CustomerService.objects.filter(filters, status="active").count()
        suspended_services = CustomerService.objects.filter(filters, status="suspended").count()

        # Billing outstanding
        # Receivable owns the outstanding calculation; Invoice has no balance field.
        receivables = Receivable.objects.filter(
            filters,
            status__in=[
                Receivable.Status.OPEN,
                Receivable.Status.PARTIAL,
            ],
        )

        total_outstanding = sum(
            (receivable.outstanding_amount for receivable in receivables),
            Decimal("0.00"),
        )

        # Revenue stats
        # Gross amount belongs to RevenueTransaction.
        # Company/Partner/Agency shares belong to RevenueAllocation.
        revenue_stats = RevenueTransaction.objects.filter(
            filters,
            status=RevenueTransaction.Status.POSTED,
        ).aggregate(
            gross=Sum("gross_amount"),
        )

        allocation_stats = RevenueAllocation.objects.filter(
            filters,
            revenue_transaction__status=RevenueTransaction.Status.POSTED,
        ).aggregate(
            company_share=Sum(
                "amount",
                filter=Q(
                    allocation_type=RevenueAllocation.AllocationType.COMPANY_BASE
                ),
            ),
            partner_share=Sum(
                "amount",
                filter=Q(
                    allocation_type=RevenueAllocation.AllocationType.PARTNER
                ),
            ),
            agency_share=Sum(
                "amount",
                filter=Q(
                    allocation_type=RevenueAllocation.AllocationType.AGENCY_GROSS
                ),
            ),
        )

        revenue_stats.update(allocation_stats)

        # Finance balance is intentionally unavailable here.
        # The current Account model is Chart-of-Accounts only and does not
        # contain posting balances. A real balance must come from a
        # journal/ledger implementation, not from Account itself.
        cash_bank_balance = None

        return Response({
            "sales": {
                "today": float(sales_today),
                "month": float(sales_month),
            },
            "customers": {
                "active": active_customers,
                "active_services": active_services,
                "suspended_services": suspended_services,
                "outstanding": float(total_outstanding),
            },
            "revenue": {
                "gross": float(revenue_stats["gross"] or 0),
                "company_share": float(revenue_stats["company_share"] or 0),
                "partner_share": float(revenue_stats["partner_share"] or 0),
                "agency_share": float(revenue_stats["agency_share"] or 0),
            },
            "finance": {
                "cash_bank": (
                    float(cash_bank_balance)
                    if cash_bank_balance is not None
                    else None
                ),
                "cash_bank_available": cash_bank_balance is not None,
            },
            "system": {
                "timestamp": timezone.now(),
                "company_id": company_id,
            }
        })

class HealthResponseSerializer(serializers.Serializer):
    status = serializers.CharField()
    service = serializers.CharField()
    version = serializers.CharField()


class TenantContextCompanySerializer(serializers.Serializer):
    id = serializers.UUIDField()
    code = serializers.CharField()
    legal_name = serializers.CharField()
    trade_name = serializers.CharField(allow_blank=True)
    status = serializers.CharField()
    is_primary = serializers.BooleanField()


class TenantContextResponseSerializer(serializers.Serializer):
    tenant_id = serializers.UUIDField()
    membership_id = serializers.UUIDField(allow_null=True)
    companies = TenantContextCompanySerializer(many=True)


class HealthView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(responses={200: HealthResponseSerializer})
    def get(self, request):
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        return Response({"status": "ok", "service": "HQNATEX Core", "version": "0.5.0"})


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: UserSerializer})
    def get(self, request):
        return Response(UserSerializer(request.user).data)


class TenantContextView(APIView):
    permission_classes = [IsAuthenticated, TenantContextPermission]

    @extend_schema(responses={200: TenantContextResponseSerializer})
    def get(self, request):
        companies = Company.objects.filter(tenant_id=request.tenant_id).values(
            "id", "code", "legal_name", "trade_name", "status", "is_primary"
        )
        return Response(
            {
                "tenant_id": request.tenant_id,
                "membership_id": getattr(getattr(request, "tenant_membership", None), "id", None),
                "companies": list(companies),
            }
        )


class TenantResolveRequestSerializer(serializers.Serializer):
    tenant_code = serializers.CharField(max_length=64)


class TenantResolveResponseSerializer(serializers.Serializer):
    tenant_id = serializers.UUIDField()
    tenant_code = serializers.CharField()
    tenant_name = serializers.CharField()


class TenantResolveView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=TenantResolveRequestSerializer,
        responses={200: TenantResolveResponseSerializer},
    )
    def post(self, request):
        from apps.iam.models import TenantMembership
        from apps.tenancy.models import Tenant

        code = str(request.data.get("tenant_code", "")).strip().upper()
        if not code:
            return Response({"detail": "tenant_code is required"}, status=400)
        tenant = Tenant.objects.filter(code=code, status="active").first()
        if tenant is None:
            return Response({"detail": "Tenant not found"}, status=404)
        set_current_tenant(tenant.id, local=True)
        if not request.user.is_superuser and not TenantMembership.objects.filter(
            tenant=tenant, user=request.user, status="active"
        ).exists():
            return Response({"detail": "No active membership for this tenant"}, status=403)
        return Response({"tenant_id": tenant.id, "tenant_code": tenant.code, "tenant_name": tenant.name})
