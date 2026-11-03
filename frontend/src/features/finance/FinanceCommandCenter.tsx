import { getTranslation as getUiTranslation } from "../../i18n";
import { PageHeader as SharedPageHeader } from "../../components/PageHeader";
import { PrimaryButton as SharedPrimaryButton, Select as SharedSelect, SecondaryButton as SharedSecondaryButton } from "../../components/Interface";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  LayoutDashboard,
  BookOpen,
  Layers,
  FileSpreadsheet,
  Wallet,
  ReceiptText,
  Building2,
  RadioTower,
  Scale,
  ShieldCheck,
  CalendarRange,
  FileText,
  Workflow,
  Sparkles,
  Filter,
  RefreshCw,
  Search,
  Globe,
  SlidersHorizontal,
} from "lucide-react";
import { useTranslation } from "../../lib/i18n";
import { fetchers, type Session } from "../../lib/api";
import type { FinanceFilterState, FinanceTabId } from "./FinanceTypes";

import { FinanceDashboardView } from "./FinanceDashboardView";
import { GeneralLedgerView } from "./GeneralLedgerView";
import { ChartOfAccountsView } from "./ChartOfAccountsView";
import { JournalEntriesView } from "./JournalEntriesView";
import { CashBankView } from "./CashBankView";
import { AccountsReceivableView } from "./AccountsReceivableView";
import { AccountsPayableView } from "./AccountsPayableView";
import { AgencySettlementsView } from "./AgencySettlementsView";
import { ExpensesView } from "./ExpensesView";
import { TaxesView } from "./TaxesView";
import { FinancialPeriodsView } from "./FinancialPeriodsView";
import { FinancialReportsView } from "./FinancialReportsView";
import { FinanceRelationshipsModal } from "./FinanceRelationshipsModal";

type Props = {
  session: Session;
  initialTab?: FinanceTabId;
  onSectionChange: (
    section: "billing" | "revenue" | "finance",
    financeTab?: FinanceTabId,
  ) => void;
};

export function FinanceCommandCenter({
  session,
  initialTab = "dashboard",
  onSectionChange,
}: Props) {
  const { language, rtl } = useTranslation();
  const [activeTab, setActiveTab] = useState<FinanceTabId>(initialTab);
  const [showRelationsModal, setShowRelationsModal] = useState(false);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Global Filter State
  const [filters, setFilters] = useState<FinanceFilterState>({
    companyId: "all",
    branchId: "all",
    agencyId: "all",
    dateRange: "this_month",
    startDate: new Date().toISOString().slice(0, 8) + "01",
    endDate: new Date().toISOString().slice(0, 10),
    currency: "AFN",
  });

  // Filter options from API
  const [companies, setCompanies] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [agencies, setAgencies] = useState<any[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadMetadata = async () => {
      try {
        setLoadingFilters(true);
        const [compRes, branchRes, agencyRes] = await Promise.allSettled([
          fetchers.companies(session),
          fetchers.branches(session),
          fetchers.agencies(session),
        ]);

        if (mounted) {
          if (compRes.status === "fulfilled" && compRes.value?.results) {
            setCompanies(compRes.value.results);
          }
          if (branchRes.status === "fulfilled" && branchRes.value?.results) {
            setBranches(branchRes.value.results);
          }
          if (agencyRes.status === "fulfilled" && agencyRes.value?.results) {
            setAgencies(agencyRes.value.results);
          }
        }
      } catch (err) {
        console.warn("Filter metadata load fallback:", err);
      } finally {
        if (mounted) setLoadingFilters(false);
      }
    };

    loadMetadata();
    return () => {
      mounted = false;
    };
  }, [session]);

  const copy = {en:getUiTranslation("en").featureCopy.finance_FinanceCommandCenter.local0,fa:getUiTranslation("fa").featureCopy.finance_FinanceCommandCenter.local0,ps:getUiTranslation("ps").featureCopy.finance_FinanceCommandCenter.local0}[language];

  const tabs: { id: FinanceTabId; label: string; icon: any; count?: number; badge?: string }[] = [
    { id: "dashboard", label: copy.tabDashboard, icon: LayoutDashboard },
    { id: "generalLedger", label: copy.tabGeneralLedger, icon: BookOpen, badge: "GL" },
    { id: "chartOfAccounts", label: copy.tabChartOfAccounts, icon: Layers, badge: "COA" },
    { id: "journalEntries", label: copy.tabJournalEntries, icon: FileSpreadsheet, badge: "JV" },
    { id: "cashBank", label: copy.tabCashBank, icon: Wallet },
    { id: "receivables", label: copy.tabReceivables, icon: ReceiptText, badge: "AR" },
    { id: "payables", label: copy.tabPayables, icon: Building2, badge: "AP" },
    { id: "settlements", label: copy.tabSettlements, icon: RadioTower, badge: "AGS" },
    { id: "expenses", label: copy.tabExpenses, icon: Scale },
    { id: "taxes", label: copy.tabTaxes, icon: ShieldCheck, badge: "MoF" },
    { id: "periods", label: copy.tabPeriods, icon: CalendarRange },
    { id: "reports", label: copy.tabReports, icon: FileText, badge: "IFRS" },
  ];

  return (
    <div className="finance-command-center space-y-4 pb-12 animate-in fade-in duration-300">
      <style>{`
        /* FINANCE_READABILITY_LIGHT_V1 */
        .hq-shell[data-theme=light] .finance-command-center{color:#183a54}
        .hq-shell[data-theme=light] .finance-command-center :is(.finance-command-hero,.finance-command-tabs,.glass-panel){
          background:rgba(239,248,255,.94)!important;border-color:#a9c9dc!important;
          color:#183a54!important;box-shadow:0 8px 24px rgba(20,65,92,.12);
          backdrop-filter:blur(16px)
        }
        .hq-shell[data-theme=light] .finance-command-center :is(.text-white,.text-slate-300,.text-slate-400,.text-slate-500){
          color:#294b64!important
        }
        .hq-shell[data-theme=light] .finance-command-center [class*="border-white/"]{
          border-color:#b7d0df!important
        }
        .hq-shell[data-theme=light] .finance-command-center .glass-input{
          background:rgba(255,255,255,.92)!important;color:#183a54!important;
          border-color:#a9c9dc!important
        }
        .hq-shell[data-theme=light] .finance-command-center .finance-command-tabs button:not([class*="bg-cyan-500"]){
          color:#294b64!important;background:rgba(255,255,255,.58)
        }
        .hq-shell[data-theme=light] .finance-command-center .finance-command-tabs button[class*="bg-cyan-500"]{
          color:#fff!important;background:linear-gradient(120deg,#168fdb,#20b8d7)!important
        }
        .hq-shell[data-theme=light] .finance-command-center :is(.text-cyan-200,.text-violet-200,.text-emerald-200){
          color:#17627d!important
        }
      `}</style>

      {/* Command Center Master Header */}
      <div className="finance-command-hero glass-panel rounded-[2rem] p-5 lg:p-6 border border-white/10 relative overflow-hidden">
        <SharedPageHeader native as="div" className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                HQNATEX ERP
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-mono font-bold text-slate-400">Ledger Live</span>
            </div>

            <h1 className="text-xl lg:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              {copy.commandCenterTitle}
            </h1>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">{copy.commandCenterSubtitle}</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <SharedPrimaryButton
              type="button"
              onClick={() => setShowRelationsModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 transition-all shadow-lg shadow-cyan-500/10 group"
            >
              <Workflow className="w-4 h-4 group-hover:rotate-45 transition-transform" />
              <span>{copy.relationsMap}</span>
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            </SharedPrimaryButton>
          </div>
        </SharedPageHeader>

        {/* Global Multi-Hierarchy Filter Bar */}
        <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 items-center">
          {/* Company Filter */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-black tracking-wider text-slate-400 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-cyan-400" />
              <span>{copy.filterCompany}</span>
            </label>
            <SharedSelect
              value={filters.companyId}
              onChange={(e) => setFilters({ ...filters, companyId: e.target.value })}
              className="w-full glass-input text-xs py-1.5"
            >
              <option value="all">{copy.allCompanies}</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.legal_name || c.name}
                </option>
              ))}
            </SharedSelect>
          </div>

          {/* Branch Filter */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-black tracking-wider text-slate-400 flex items-center gap-1">
              <Globe className="w-3 h-3 text-blue-400" />
              <span>{copy.filterBranch}</span>
            </label>
            <SharedSelect
              value={filters.branchId}
              onChange={(e) => setFilters({ ...filters, branchId: e.target.value })}
              className="w-full glass-input text-xs py-1.5"
            >
              <option value="all">{copy.allBranches}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </SharedSelect>
          </div>

          {/* Agency Filter */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-black tracking-wider text-slate-400 flex items-center gap-1">
              <RadioTower className="w-3 h-3 text-purple-400" />
              <span>{copy.filterAgency}</span>
            </label>
            <SharedSelect
              value={filters.agencyId}
              onChange={(e) => setFilters({ ...filters, agencyId: e.target.value })}
              className="w-full glass-input text-xs py-1.5"
            >
              <option value="all">{copy.allAgencies}</option>
              {agencies.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </SharedSelect>
          </div>

          {/* Date Range Filter */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-black tracking-wider text-slate-400 flex items-center gap-1">
              <SlidersHorizontal className="w-3 h-3 text-amber-400" />
              <span>{copy.filterDate}</span>
            </label>
            <SharedSelect
              value={filters.dateRange}
              onChange={(e) => setFilters({ ...filters, dateRange: e.target.value as any })}
              className="w-full glass-input text-xs py-1.5"
            >
              <option value="today">{copy.today}</option>
              <option value="this_week">{copy.thisWeek}</option>
              <option value="this_month">{copy.thisMonth}</option>
              <option value="this_quarter">{copy.thisQuarter}</option>
              <option value="this_year">{copy.thisYear}</option>
              <option value="all">{copy.allDates}</option>
            </SharedSelect>
          </div>

          {/* Reset Filters / Currency Indicator */}
          <div className="pt-4 sm:pt-4 flex items-center justify-between sm:justify-end gap-2">
            <span className="px-2 py-1 rounded-lg text-[10px] font-mono font-bold bg-white/5 border border-white/10 text-slate-300">
              {filters.currency}
            </span>
            <SharedSecondaryButton
              type="button"
              onClick={() =>
                setFilters({
                  companyId: "all",
                  branchId: "all",
                  agencyId: "all",
                  dateRange: "this_month",
                  startDate: new Date().toISOString().slice(0, 8) + "01",
                  endDate: new Date().toISOString().slice(0, 10),
                  currency: "AFN",
                })
              }
              className="p-1.5 rounded-lg border border-white/10 hover:border-white/20 text-slate-400 hover:text-white transition-all"
              title={copy.resetFilters}
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </SharedSecondaryButton>
          </div>
        </div>
      </div>

      {/* 12-Tab Responsive Navigation Hub */}
      <div className="finance-command-tabs glass-panel p-1.5 rounded-2xl border border-white/10 overflow-x-auto scrollbar-none flex items-center gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <SharedSecondaryButton
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                isActive
                  ? "bg-cyan-500 text-slate-950 font-black shadow-lg shadow-cyan-500/20"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-slate-950" : "text-slate-400"}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-black ${
                    isActive ? "bg-slate-950/20 text-slate-950" : "bg-white/5 text-slate-400 border border-white/10"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </SharedSecondaryButton>
          );
        })}
      </div>

      {/* Active Tab View Rendering */}
      <div className="pt-1">
        <section
          data-testid="finance-child-module-nav"
          className="hq-visual-panel mb-4 rounded-2xl border border-white/10 bg-slate-950/35 p-3 backdrop-blur-xl"
          aria-label={copy.childNavTitle}
          dir={rtl ? "rtl" : "ltr"}
        >
          <div className="mb-3">
            <h3 className="text-sm font-black text-white">
              {copy.childNavTitle}
            </h3>
          </div>

          <div className="grid gap-2 md:grid-cols-3">
            <SharedSecondaryButton
              type="button"
              onClick={() => onSectionChange("billing")}
              className="rounded-xl border border-cyan-400/15 bg-cyan-400/[0.06] p-3 text-start transition hover:border-cyan-400/30 hover:bg-cyan-400/10"
            >
              <div className="text-sm font-black text-cyan-200">
                {copy.childBilling}
              </div>

              <div className="mt-1 text-[11px] leading-5 text-slate-400">
                {copy.childBillingDesc}
              </div>
            </SharedSecondaryButton>

            <SharedSecondaryButton
              type="button"
              onClick={() => onSectionChange("revenue")}
              className="rounded-xl border border-violet-400/15 bg-violet-400/[0.06] p-3 text-start transition hover:border-violet-400/30 hover:bg-violet-400/10"
            >
              <div className="text-sm font-black text-violet-200">
                {copy.childRevenue}
              </div>

              <div className="mt-1 text-[11px] leading-5 text-slate-400">
                {copy.childRevenueDesc}
              </div>
            </SharedSecondaryButton>

            <SharedSecondaryButton
              type="button"
              onClick={() => {
                setActiveTab("cashBank");

                onSectionChange(
                  "finance",
                  "cashBank",
                );
              }}
              className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.06] p-3 text-start transition hover:border-emerald-400/30 hover:bg-emerald-400/10"
            >
              <div className="text-sm font-black text-emerald-200">
                {copy.childCashBank}
              </div>

              <div className="mt-1 text-[11px] leading-5 text-slate-400">
                {copy.childCashBankDesc}
              </div>
            </SharedSecondaryButton>
          </div>
        </section>

        {activeTab === "dashboard" && (
          <FinanceDashboardView
            session={session}
            filters={filters}
            onNavigateTab={setActiveTab}
            onOpenRelations={() => setShowRelationsModal(true)}
          />
        )}

        {activeTab === "generalLedger" && (
          <GeneralLedgerView session={session} filters={filters} onNavigateTab={setActiveTab} />
        )}

        {activeTab === "chartOfAccounts" && (
          <ChartOfAccountsView session={session} filters={filters} onNavigateTab={setActiveTab} />
        )}

        {activeTab === "journalEntries" && (
          <JournalEntriesView session={session} filters={filters} onNavigateTab={setActiveTab} />
        )}

        {activeTab === "cashBank" && (
          <CashBankView session={session} filters={filters} onNavigateTab={setActiveTab} />
        )}

        {activeTab === "receivables" && (
          <AccountsReceivableView session={session} filters={filters} onNavigateTab={setActiveTab} />
        )}

        {activeTab === "payables" && (
          <AccountsPayableView session={session} filters={filters} onNavigateTab={setActiveTab} />
        )}

        {activeTab === "settlements" && (
          <AgencySettlementsView session={session} filters={filters} onNavigateTab={setActiveTab} />
        )}

        {activeTab === "expenses" && (
          <ExpensesView session={session} filters={filters} onNavigateTab={setActiveTab} />
        )}

        {activeTab === "taxes" && (
          <TaxesView session={session} filters={filters} onNavigateTab={setActiveTab} />
        )}

        {activeTab === "periods" && (
          <FinancialPeriodsView session={session} filters={filters} onNavigateTab={setActiveTab} />
        )}

        {activeTab === "reports" && (
          <FinancialReportsView session={session} filters={filters} onNavigateTab={setActiveTab} />
        )}
      </div>

      {/* Financial Relationships Modal */}
      <FinanceRelationshipsModal
        isOpen={showRelationsModal}
        onClose={() => setShowRelationsModal(false)}
        onNavigateTab={setActiveTab}
      />
    </div>
  );
}
