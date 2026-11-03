from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

# HQNATEX_BACKGROUND_BRANDING_API_V1
from apps.governance.branding_views import (
    BrandingBackgroundFileView,
    BrandingBackgroundResetView,
    BrandingBackgroundView,
)
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.agencies.views import AgencyViewSet
from apps.audit.views import AuditLogViewSet
from apps.branches.views import BranchViewSet
from apps.catalog.views import PackagePriceViewSet, PackageViewSet, ServiceCategoryViewSet, ServiceTechnicalFieldViewSet, ServiceTechnicalProfileViewSet, ServiceViewSet, TechnologyViewSet, ServiceTechnologyViewSet
from apps.common.views import HealthView, MeView, TenantContextView, TenantResolveView, DashboardView
from apps.companies.views import CompanyViewSet
from apps.customers.views import (
    CustomerEquipmentAssignmentViewSet,
    CustomerServiceTechnicalValueViewSet,
    CustomerServiceViewSet,
    CustomerTicketViewSet,
    CustomerViewSet,
    ServiceAgencyHistoryViewSet,
    ServiceChangeRequestViewSet,
    ServicePackageHistoryViewSet,
    ServiceStatusHistoryViewSet,
    ServiceActivationViewSet,
    InstallationWorkOrderViewSet,
    ProvisioningJobViewSet,
    IPAssignmentViewSet,
    RadiusAccountViewSet,
    TechnicalTestResultViewSet,
    ActivationChecklistViewSet,
    FieldVisitViewSet,
    ServiceSuspensionViewSet,
    ServiceTerminationViewSet,
    DecommissionRecordViewSet,
    TechnicalChangeHistoryViewSet,
    TechnicalAttachmentViewSet,
)
from apps.finance.views import AccountViewSet
from apps.accounting.views import AccountingPeriodViewSet, JournalEntryViewSet, JournalEntryLineViewSet
from apps.iam.views import (
    CompanyMembershipViewSet,
    MyCompanyViewSet,
    PermissionViewSet,
    RoleViewSet,
    TenantMembershipViewSet,
)
from apps.noc.views import CustomerServiceNetworkResourceViewSet, NetworkResourceViewSet
from apps.network_access.views import APIClientRegistryViewSet, CompanyNetworkPolicyViewSet, ConnectivityObservationViewSet, IntegrationEndpointViewSet, ManagedNetworkDeviceViewSet, NetworkAddressRuleViewSet, VPNProfileViewSet, SubscriberRouterBindingViewSet, SubscriberDeviceViewSet, RadiusSessionViewSet, ActivationAuditLogViewSet
from apps.sales.views import SaleItemViewSet, SaleViewSet
from apps.billing.views import InvoiceViewSet, PaymentAllocationViewSet, PaymentViewSet, ReceiptViewSet, ReceivableViewSet
from apps.partners.views import PartnerViewSet
from apps.revenue.views import RevenueAllocationViewSet, RevenueTransactionViewSet, ShareRuleViewSet
from apps.tenancy.views import TenantViewSet

# HQNATEX_WAREHOUSE_CORE_ROUTER_V1F3J_R6_BEGIN
from apps.warehouse.views import (
    GoodsReceiptViewSet as _WarehouseCoreGoodsReceiptViewSet,
    InventoryItemViewSet as _WarehouseCoreInventoryItemViewSet,
    InventorySerialViewSet as _WarehouseCoreInventorySerialViewSet,
    PurchaseOrderViewSet as _WarehouseCorePurchaseOrderViewSet,
    PurchaseRequestViewSet as _WarehouseCorePurchaseRequestViewSet,
    StockMovementViewSet as _WarehouseCoreStockMovementViewSet,
    SupplierViewSet as _WarehouseCoreSupplierViewSet,
    WarehouseStockViewSet as _WarehouseCoreWarehouseStockViewSet,
    WarehouseViewSet as _WarehouseCoreWarehouseViewSet,
)
# HQNATEX_WAREHOUSE_CORE_ROUTER_V1F3J_R6_IMPORT_END

from apps.workspace.api import ProjectViewSet, TaskViewSet, DocumentViewSet
from apps.workspace.advanced_api import (
    ContractViewSet, CorrespondenceViewSet, WorkspaceActivityView,
    WorkspaceArchiveViewSet, WorkspaceDashboardViewSet, WorkspaceReportsViewSet,
)

router = DefaultRouter()
router.register("workspace/projects", ProjectViewSet, basename="workspace-project")
router.register("workspace/tasks", TaskViewSet, basename="workspace-task")
router.register("workspace/documents", DocumentViewSet, basename="workspace-document")
router.register("workspace/contracts", ContractViewSet, basename="workspace-contract")
router.register("workspace/correspondence", CorrespondenceViewSet, basename="workspace-correspondence")
router.register("workspace/dashboard", WorkspaceDashboardViewSet, basename="workspace-dashboard")
router.register("workspace/archive", WorkspaceArchiveViewSet, basename="workspace-archive")
router.register("workspace/reports", WorkspaceReportsViewSet, basename="workspace-reports")
# HQNATEX-V3-PLATFORM-ROUTER
from apps.platform_tenancy_v3.api import register as register_platform_tenancy_v3
register_platform_tenancy_v3(router)

router.register("platform/tenants", TenantViewSet, basename="tenant")
router.register("companies", CompanyViewSet, basename="company")
router.register("branches", BranchViewSet, basename="branch")
router.register("agencies", AgencyViewSet, basename="agency")
router.register("iam/roles", RoleViewSet, basename="role")
router.register("iam/permissions", PermissionViewSet, basename="permission")
router.register("iam/memberships", TenantMembershipViewSet, basename="membership")
router.register(
    "iam/company-memberships",
    CompanyMembershipViewSet,
    basename="company-membership",
)
router.register(
    "iam/my-companies",
    MyCompanyViewSet,
    basename="my-company",
)
router.register("audit/logs", AuditLogViewSet, basename="audit-log")
router.register("catalog/categories", ServiceCategoryViewSet, basename="service-category")
router.register("catalog/services", ServiceViewSet, basename="service")
router.register("catalog/technical-profiles", ServiceTechnicalProfileViewSet, basename="service-technical-profile")
router.register("catalog/technical-fields", ServiceTechnicalFieldViewSet, basename="service-technical-field")
router.register("catalog/packages", PackageViewSet, basename="package")
router.register("catalog/package-prices", PackagePriceViewSet, basename="package-price")

router.register(
    "catalog/technologies",
    TechnologyViewSet,
    basename="technology",
)
router.register(
    "catalog/service-technologies",
    ServiceTechnologyViewSet,
    basename="service-technology",
)

router.register("partners", PartnerViewSet, basename="partner")
router.register("finance/accounts", AccountViewSet, basename="account")

router.register(
    "accounting/periods",
    AccountingPeriodViewSet,
    basename="accounting-period",
)
router.register(
    "accounting/journal-entries",
    JournalEntryViewSet,
    basename="journal-entry",
)
router.register(
    "accounting/journal-lines",
    JournalEntryLineViewSet,
    basename="journal-entry-line",
)
router.register("customers", CustomerViewSet, basename="customer")
router.register("customer-services", CustomerServiceViewSet, basename="customer-service")
router.register(
    "customer-service-technical-values",
    CustomerServiceTechnicalValueViewSet,
    basename="customer-service-technical-value",
)
router.register("customer-service-change-requests", ServiceChangeRequestViewSet, basename="customer-service-change-request")
router.register("customer-service-package-history", ServicePackageHistoryViewSet, basename="customer-service-package-history")
router.register("customer-service-status-history", ServiceStatusHistoryViewSet, basename="customer-service-status-history")
router.register("customer-service-agency-history", ServiceAgencyHistoryViewSet, basename="customer-service-agency-history")
router.register("customer-equipment-assignments", CustomerEquipmentAssignmentViewSet, basename="customer-equipment-assignment")
router.register("customer-tickets", CustomerTicketViewSet, basename="customer-ticket")
router.register("customer-service-activations", ServiceActivationViewSet, basename="customer-service-activation")
router.register("customer-service-work-orders", InstallationWorkOrderViewSet, basename="customer-service-work-order")
router.register("customer-service-provisioning-jobs", ProvisioningJobViewSet, basename="customer-service-provisioning-job")
router.register("customer-service-ip-assignments", IPAssignmentViewSet, basename="customer-service-ip-assignment")
router.register("customer-service-radius-accounts", RadiusAccountViewSet, basename="customer-service-radius-account")
router.register("customer-service-test-results", TechnicalTestResultViewSet, basename="customer-service-test-result")
router.register("customer-service-checklists", ActivationChecklistViewSet, basename="customer-service-checklist")
router.register("customer-service-field-visits", FieldVisitViewSet, basename="customer-service-field-visit")
router.register("customer-service-suspensions", ServiceSuspensionViewSet, basename="customer-service-suspension")
router.register("customer-service-terminations", ServiceTerminationViewSet, basename="customer-service-termination")
router.register("customer-service-decommissions", DecommissionRecordViewSet, basename="customer-service-decommission")
router.register("customer-service-change-history", TechnicalChangeHistoryViewSet, basename="customer-service-change-history")
router.register("customer-service-attachments", TechnicalAttachmentViewSet, basename="customer-service-attachment")
router.register("noc/resources", NetworkResourceViewSet, basename="noc-resource")
router.register("noc/customer-service-resources", CustomerServiceNetworkResourceViewSet, basename="noc-customer-service-resource")
router.register("network/policies", CompanyNetworkPolicyViewSet, basename="network-policy")
router.register("network/address-rules", NetworkAddressRuleViewSet, basename="network-address-rule")
router.register("network/vpns", VPNProfileViewSet, basename="network-vpn")
router.register("network/devices", ManagedNetworkDeviceViewSet, basename="network-device")
router.register("network/subscriber-router-bindings", SubscriberRouterBindingViewSet, basename="subscriber-router-binding")
router.register("network/subscriber-devices", SubscriberDeviceViewSet, basename="subscriber-device")
router.register("network/radius-sessions", RadiusSessionViewSet, basename="radius-session")
router.register("network/activation-audit", ActivationAuditLogViewSet, basename="activation-audit")
router.register("network/api-clients", APIClientRegistryViewSet, basename="network-api-client")
router.register("network/integrations", IntegrationEndpointViewSet, basename="network-integration")
router.register("network/observations", ConnectivityObservationViewSet, basename="network-observation")
router.register("sales", SaleViewSet, basename="sale")
router.register("sale-items", SaleItemViewSet, basename="sale-item")
router.register("billing/invoices", InvoiceViewSet, basename="invoice")
router.register("billing/receivables", ReceivableViewSet, basename="receivable")
router.register("billing/payments", PaymentViewSet, basename="payment")
router.register("billing/payment-allocations", PaymentAllocationViewSet, basename="payment-allocation")
router.register("billing/receipts", ReceiptViewSet, basename="receipt")
from apps.revenue.views import AgencySettlementViewSet
router.register("revenue/agency-settlements", AgencySettlementViewSet, basename="agency-settlement")
router.register("revenue/share-rules", ShareRuleViewSet, basename="share-rule")
router.register("revenue/transactions", RevenueTransactionViewSet, basename="revenue-transaction")
router.register("revenue/allocations", RevenueAllocationViewSet, basename="revenue-allocation")


# HQNATEX_ACCOUNTING_GENERAL_LEDGER_ROUTE_V1
from apps.accounting.views import GeneralLedgerViewSet
router.register(r"accounting/general-ledger", GeneralLedgerViewSet, basename="general-ledger")


# HQNATEX_AP_V1C37_ROUTER_BEGIN
from apps.warehouse.views import SupplierInvoiceViewSet as _APSupplierInvoiceViewSet
from apps.warehouse.views import SupplierPaymentAllocationViewSet as _APSupplierPaymentAllocationViewSet

router.register(
    r"warehouse/supplier-invoices",
    _APSupplierInvoiceViewSet,
    basename="warehouse-supplier-invoice",
)

router.register(
    r"warehouse/supplier-payment-allocations",
    _APSupplierPaymentAllocationViewSet,
    basename="warehouse-supplier-payment-allocation",
)
# HQNATEX_AP_V1C37_ROUTER_END

# HQNATEX_WAREHOUSE_CORE_ROUTER_V1F3J_R6_ROUTES_BEGIN
router.register(
    "warehouse/warehouses",
    _WarehouseCoreWarehouseViewSet,
    basename="warehouse",
)
router.register(
    "warehouse/suppliers",
    _WarehouseCoreSupplierViewSet,
    basename="warehouse-supplier",
)
router.register(
    "warehouse/inventory-items",
    _WarehouseCoreInventoryItemViewSet,
    basename="warehouse-inventory-item",
)
router.register(
    "warehouse/warehouse-stocks",
    _WarehouseCoreWarehouseStockViewSet,
    basename="warehouse-stock",
)
router.register(
    "warehouse/inventory-serials",
    _WarehouseCoreInventorySerialViewSet,
    basename="warehouse-inventory-serial",
)
router.register(
    "warehouse/stock-movements",
    _WarehouseCoreStockMovementViewSet,
    basename="warehouse-stock-movement",
)
router.register(
    "warehouse/purchase-requests",
    _WarehouseCorePurchaseRequestViewSet,
    basename="warehouse-purchase-request",
)
router.register(
    "warehouse/purchase-orders",
    _WarehouseCorePurchaseOrderViewSet,
    basename="warehouse-purchase-order",
)
router.register(
    "warehouse/goods-receipts",
    _WarehouseCoreGoodsReceiptViewSet,
    basename="warehouse-goods-receipt",
)
# HQNATEX_WAREHOUSE_CORE_ROUTER_V1F3J_R6_ROUTES_END


# HQNATEX_FULL_HR_PAYROLL_V1_ROUTES_BEGIN
from apps.hr.views_full import (
    HR_ROUTE_REGISTRY,
    EmployeeSelfServiceViewSet,
)

for (
    _hr_prefix,
    _hr_viewset,
    _hr_basename,
) in HR_ROUTE_REGISTRY:
    router.register(
        _hr_prefix,
        _hr_viewset,
        basename=_hr_basename,
    )

router.register(
    "hr/self-service",
    EmployeeSelfServiceViewSet,
    basename="hr-self-service",
)
# HQNATEX_FULL_HR_PAYROLL_V1_ROUTES_END

# HQNATEX_CUSTOMER_CALL_LOG_ROUTE_V1
from apps.customers.call_log_api import CustomerCallLogViewSet
from apps.customers.quality_api import CustomerCallQualityEvaluationViewSet
router.register(
    "customer-call-quality-evaluations",
    CustomerCallQualityEvaluationViewSet,
    basename="customer-call-quality-evaluation",
)

router.register("customer-call-logs", CustomerCallLogViewSet, basename="customer-call-log")

# HQNATEX_CUSTOMER_FOLLOWUP_ROUTE_V2
from apps.customers.followup_api import CustomerFollowUpViewSet
router.register(
    "customer-followups",
    CustomerFollowUpViewSet,
    basename="customer-followup",
)


# HQNATEX_CALLCENTER_SETTINGS_ROUTE_V1
from apps.customers.callcenter_settings_api import CustomerCallCenterSettingsViewSet
router.register("customer-call-center-settings", CustomerCallCenterSettingsViewSet, basename="customer-call-center-settings")

urlpatterns = [
    path("api/v1/workspace/activity/", WorkspaceActivityView.as_view(), name="workspace-activity"),
    path("admin/", admin.site.urls),
    path(
        "api/v1/settings/branding/background",
        BrandingBackgroundView.as_view(),
        name="settings-branding-background",
    ),
    path(
        "api/v1/settings/branding/background/file",
        BrandingBackgroundFileView.as_view(),
        name="settings-branding-background-file",
    ),
    path(
        "api/v1/settings/branding/background/reset",
        BrandingBackgroundResetView.as_view(),
        name="settings-branding-background-reset",
    ),
    path("api/v1/health/live", HealthView.as_view(), name="health-live"),
    path("api/v1/auth/login", TokenObtainPairView.as_view(), name="token-obtain"),
    path("api/v1/auth/refresh", TokenRefreshView.as_view(), name="token-refresh"),
    path("api/v1/auth/tenant/resolve", TenantResolveView.as_view(), name="tenant-resolve"),
    path("api/v1/dashboard/stats", DashboardView.as_view(), name="dashboard-stats"),
    path("api/v1/users/me", MeView.as_view(), name="users-me"),
    path("api/v1/tenant/context", TenantContextView.as_view(), name="tenant-context"),
    path("api/v1/schema", SpectacularAPIView.as_view(), name="schema"),
    path("api/v1/docs", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/v1/", include(router.urls)),
]
