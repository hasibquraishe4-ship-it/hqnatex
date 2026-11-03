# HQNATEX visual audit - stage 1

Scope: local Windows frontend only. No source edits, backend operations or database operations.
Git unavailable: fatal: not a git repository (or any of the parent directories): .git
Replacement protection authorized by user: timestamped backup and SHA256.

## Protection
Six original files copied preserving relative paths. Original-before, original-after and backup SHA256 all matched.
SHA256.csv contains verified backup hashes.
source-baseline-SHA256.csv contains 92 audited source-file hashes. All 92 matched again after audit.

## Findings
index.css has dark base tokens and later light/compact overrides; final appearance depends on CSS cascade.
Company layout has repeated compact/block/flex declarations and !important overrides. Consolidation requires checking final computed styles.
AppShell, DataTable, ModuleHub and PageHeader use utility color/shadow classes; ModuleHub and PageHeader contain white titles and cyan/glow styling.
ProjectsModule has embedded CSS, modal/sidebar offsets, directional controls and responsive rules to preserve.
19 requested feature directories inspected by source scan; this is not a functional or browser test.
style-inventory.csv records matching file, line, category and source line, including inline styles, embedded style markers, literal colors, shadows and className declarations.
Counts are lexical matching lines, not unique rules or confirmed defects. StyleTag may include strings/comments.

## Counts

"Module","Files","Inline","StyleTags","Colors","Shadows","ColorClasses"
"shared","5","0","2","1346","198","276"
"accounting","1","0","0","0","0","14"
"audit","1","0","0","0","0","10"
"billing","3","0","1","6","1","87"
"callcenter","7","2","10","226","29","98"
"customers","23","0","7","58","66","955"
"dashboard","1","1","0","0","0","69"
"equipment","1","0","0","0","1","41"
"finance","19","4","6","88","33","724"
"hr","1","2","3","130","26","104"
"network","1","0","1","78","10","34"
"noc","1","0","0","0","0","7"
"partners","1","0","1","9","2","32"
"revenue","4","0","1","6","4","131"
"sales","1","0","1","6","3","61"
"services","7","0","4","29","8","219"
"settings","6","2","1","14","7","125"
"system","1","0","0","0","1","10"
"warehouse","1","0","0","0","0","38"
"workspace","3","0","3","80","9","0"

## Source files

src\styles\index.css
src\components\AppShell.tsx
src\components\DataTable.tsx
src\components\ModuleHub.tsx
src\components\PageHeader.tsx
src\features\accounting\AccountingModule.tsx
src\features\audit\AuditLogList.tsx
src\features\billing\InvoiceList.tsx
src\features\billing\PaymentList.tsx
src\features\billing\ReceivableList.tsx
src\features\callcenter\CallCenterAgents.tsx
src\features\callcenter\CallCenterFollowUps.tsx
src\features\callcenter\CallCenterModule.tsx
src\features\callcenter\CallCenterQuality.tsx
src\features\callcenter\CallCenterReports.tsx
src\features\callcenter\CallCenterSettings.tsx
src\features\callcenter\CallCenterSupervisor.tsx
src\features\customers\ActivationChecklistList.tsx
src\features\customers\ActiveServiceCatalogExplorer.tsx
src\features\customers\CustomerEquipmentAssignmentList.tsx
src\features\customers\CustomerList.tsx
src\features\customers\CustomerModule.tsx
src\features\customers\CustomerServiceList.tsx
src\features\customers\CustomerTechnicalValueList.tsx
src\features\customers\DecommissionRecordList.tsx
src\features\customers\FieldVisitList.tsx
src\features\customers\InstallationWorkOrderList.tsx
src\features\customers\IPAssignmentList.tsx
src\features\customers\ProvisioningJobList.tsx
src\features\customers\RadiusAccountList.tsx
src\features\customers\ServiceActivationList.tsx
src\features\customers\ServiceAgencyHistoryList.tsx
src\features\customers\ServiceChangeRequestList.tsx
src\features\customers\ServicePackageHistoryList.tsx
src\features\customers\ServiceStatusHistoryList.tsx
src\features\customers\SubscribersServicesDashboard.tsx
src\features\customers\SubscribersServicesModule.tsx
src\features\customers\TechnicalAttachmentList.tsx
src\features\customers\TechnicalTestResultList.tsx
src\features\customers\TroubleTicketList.tsx
src\features\dashboard\Dashboard.tsx
src\features\equipment\EquipmentAssetsModule.tsx
src\features\finance\AccountList.tsx
src\features\finance\AccountsPayableView.tsx
src\features\finance\AccountsReceivableView.tsx
src\features\finance\AgencyList.tsx
src\features\finance\AgencySettlementsView.tsx
src\features\finance\BranchList.tsx
src\features\finance\CashBankView.tsx
src\features\finance\ChartOfAccountsView.tsx
src\features\finance\CompanyList.tsx
src\features\finance\ExpensesView.tsx
src\features\finance\FinanceAccountingModule.tsx
src\features\finance\FinanceCommandCenter.tsx
src\features\finance\FinanceDashboardView.tsx
src\features\finance\FinanceRelationshipsModal.tsx
src\features\finance\FinanceTypes.ts
src\features\finance\FinancialPeriodsView.tsx
src\features\finance\FinancialReportsView.tsx
src\features\finance\GeneralLedgerView.tsx
src\features\finance\JournalEntriesView.tsx
src\features\finance\OrganizationModule.tsx
src\features\finance\TaxesView.tsx
src\features\hr\HRPayrollModule.tsx
src\features\network\NetworkReadiness.tsx
src\features\noc\ResourceList.tsx
src\features\partners\PartnerList.tsx
src\features\revenue\AgencySettlementList.tsx
src\features\revenue\RevenueAllocationList.tsx
src\features\revenue\RevenueList.tsx
src\features\revenue\ShareRuleList.tsx
src\features\sales\SaleList.tsx
src\features\services\PackageList.tsx
src\features\services\ServiceCategoryList.tsx
src\features\services\ServiceList.tsx
src\features\services\ServiceModule.tsx
src\features\services\ServiceTechnologyList.tsx
src\features\services\TechnicalFieldList.tsx
src\features\services\TechnologyList.tsx
src\features\settings\BackgroundBrandingPanel.tsx
src\features\settings\backgroundContract.ts
src\features\settings\GlobalBackgroundController.tsx
src\features\settings\PermissionList.tsx
src\features\settings\RoleList.tsx
src\features\settings\SecurityModule.tsx
src\features\settings\Settings.tsx
src\features\settings\UserList.tsx
src\features\system\SystemStatus.tsx
src\features\warehouse\WarehouseProcurementModule.tsx
src\features\workspace\ProjectsModule.tsx
src\features\workspace\WorkspaceExtraModule.tsx
src\features\workspace\WorkspaceModule.tsx

## Pending
No design changes performed. No build run in inspection stage.
Browser verification of Persian/Pashto RTL, English LTR, mobile, sidebar, wide tables, modals, loading, empty/error/access states remains pending.
Stage 2: shared design tokens and build; subsequent stages remain pending.
