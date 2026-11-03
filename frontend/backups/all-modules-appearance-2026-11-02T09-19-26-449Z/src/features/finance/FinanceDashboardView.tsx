import { getTranslation as getUiTranslation } from "../../i18n";
import { PrimaryButton as SharedPrimaryButton, SecondaryButton as SharedSecondaryButton } from "../../components/Interface";
import { useMemo, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Landmark,
  Receipt,
  ReceiptText,
  Scale,
  ShieldCheck,
  RadioTower,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Building2,
  PieChart,
  BarChart3,
  Layers,
  Sparkles,
  Plus,
  ArrowRight,
  RefreshCw,
  Workflow,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { KPICard } from "../../components/KPICard";
import { useTranslation } from "../../lib/i18n";
import type { Session } from "../../lib/api";
import type { FinanceFilterState, FinanceTabId } from "./FinanceTypes";

type Props = {
  session: Session;
  filters: FinanceFilterState;
  onNavigateTab: (tab: FinanceTabId) => void;
  onOpenRelations: () => void;
};

export function FinanceDashboardView({
  session,
  filters,
  onNavigateTab,
  onOpenRelations,
}: Props) {
  const { language, rtl } = useTranslation();

  const copy = {en:getUiTranslation("en").featureCopy.finance_FinanceDashboardView.local0,fa:getUiTranslation("fa").featureCopy.finance_FinanceDashboardView.local0,ps:getUiTranslation("ps").featureCopy.finance_FinanceDashboardView.local0}[language];

  const fmt = (num: number) =>
    new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0,
    }).format(num);

  // Revenue vs Expense monthly bar data
  const monthlyData = [
    { month: "May", rev: 1850000, exp: 620000 },
    { month: "Jun", rev: 2100000, exp: 710000 },
    { month: "Jul", rev: 2300000, exp: 790000 },
    { month: "Aug", rev: 2150000, exp: 830000 },
    { month: "Sep", rev: 2420000, exp: 810000 },
    { month: "Oct", rev: 2650000, exp: 845000 },
  ];

  const maxMonthVal = 2800000;

  // Agency share breakdown
  const agencyShares = [
    { name: "Kabul Central Agency", amount: 920000, percent: 35, color: "bg-cyan-400" },
    { name: "Herat West Agency", amount: 640000, percent: 24, color: "bg-blue-500" },
    { name: "Mazar North Agency", amount: 510000, percent: 19, color: "bg-emerald-400" },
    { name: "Kandahar South Agency", amount: 370000, percent: 14, color: "bg-amber-400" },
    { name: "Jalalabad East Agency", amount: 210000, percent: 8, color: "bg-purple-400" },
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* 9 KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3.5">
        <KPICard
          title={copy.kpiTotalRevenue}
          value={`${fmt(2650000)} ${copy.currency}`}
          trend={14.2}
          icon={<Receipt className="w-5 h-5" />}
          subtitle="Monthly recognition target: 94%"
        />

        <KPICard
          title={copy.kpiCollections}
          value={`${fmt(2280000)} ${copy.currency}`}
          trend={11.5}
          icon={<Wallet className="w-5 h-5 text-emerald-400" />}
          subtitle="Cash & Bank collected"
        />

        <KPICard
          title={copy.kpiExpenses}
          value={`${fmt(845000)} ${copy.currency}`}
          trend={-3.4}
          icon={<Scale className="w-5 h-5 text-rose-400" />}
          subtitle="Operating & Infrastructure"
        />

        <KPICard
          title={copy.kpiReceivables}
          value={`${fmt(370000)} ${copy.currency}`}
          trend={-2.1}
          icon={<ReceiptText className="w-5 h-5 text-amber-400" />}
          subtitle="14 open subscriber invoices"
        />

        <KPICard
          title={copy.kpiPayables}
          value={`${fmt(245000)} ${copy.currency}`}
          trend={4.8}
          icon={<Building2 className="w-5 h-5 text-violet-400" />}
          subtitle="Suppliers & contractors due"
        />

        <KPICard
          title={copy.kpiCashBalance}
          value={`${fmt(485000)} ${copy.currency}`}
          trend={6.2}
          icon={<DollarSign className="w-5 h-5 text-teal-400" />}
          subtitle="3 active cash drawers"
        />

        <KPICard
          title={copy.kpiBankBalance}
          value={`${fmt(1795000)} ${copy.currency}`}
          trend={8.7}
          icon={<Landmark className="w-5 h-5 text-sky-400" />}
          subtitle="Across DAB, Kabul Bank, Azizi"
        />

        <KPICard
          title={copy.kpiSettlements}
          value={`${fmt(148500)} ${copy.currency}`}
          trend={10.0}
          icon={<RadioTower className="w-5 h-5 text-fuchsia-400" />}
          subtitle="AGS numbering series active"
        />

        <KPICard
          title={copy.kpiNetProfit}
          value={`${fmt(1805000)} ${copy.currency}`}
          trend={18.3}
          icon={<TrendingUp className="w-5 h-5 text-emerald-400" />}
          subtitle="Gross margin: 68.1%"
        />
      </div>

      {/* Interactive ERP Financial Pipeline Card */}
      <div className="glass-panel rounded-2xl p-4 lg:p-5 border border-cyan-500/20 bg-gradient-to-r from-cyan-950/20 via-slate-900/40 to-blue-950/20 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
            <Workflow className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              {copy.pipelineTitle}
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">
                ERP Core
              </span>
            </h3>
            <p className="text-xs font-medium text-slate-400 mt-0.5">{copy.pipelineSubtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <SharedPrimaryButton
            type="button"
            onClick={onOpenRelations}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{copy.explorePipeline}</span>
          </SharedPrimaryButton>
        </div>
      </div>

      {/* Main Charts & Visuals Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue vs Expense Chart */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-5 border border-white/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                {copy.revenueVsExpense}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Last 6 months operating trend</p>
            </div>

            <div className="flex items-center gap-4 text-xs font-bold">
              <div className="flex items-center gap-1.5 text-cyan-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400" />
                Revenue
              </div>
              <div className="flex items-center gap-1.5 text-rose-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-400" />
                Expenses
              </div>
              <div className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
                Net Profit
              </div>
            </div>
          </div>

          {/* Bar Chart Visual */}
          <div className="pt-2">
            <div className="h-48 w-full flex items-end gap-3 px-2">
              {monthlyData.map((d, i) => {
                const revHeight = (d.rev / maxMonthVal) * 100;
                const expHeight = (d.exp / maxMonthVal) * 100;
                const profitHeight = ((d.rev - d.exp) / maxMonthVal) * 100;

                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    <div className="w-full flex items-end justify-center gap-1 h-36">
                      {/* Revenue Bar */}
                      <div
                        className="w-1/3 bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-t-sm transition-all duration-300 group-hover:brightness-125"
                        style={{ height: `${revHeight}%` }}
                        title={`Revenue: ${fmt(d.rev)} AFN`}
                      />
                      {/* Expense Bar */}
                      <div
                        className="w-1/3 bg-gradient-to-t from-rose-600 to-rose-400 rounded-t-sm transition-all duration-300 group-hover:brightness-125"
                        style={{ height: `${expHeight}%` }}
                        title={`Expenses: ${fmt(d.exp)} AFN`}
                      />
                      {/* Profit Bar */}
                      <div
                        className="w-1/3 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-sm transition-all duration-300 group-hover:brightness-125"
                        style={{ height: `${profitHeight}%` }}
                        title={`Net Profit: ${fmt(d.rev - d.exp)} AFN`}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-slate-400 group-hover:text-white transition-colors">
                      {d.month}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/5 text-center">
            <div className="p-2 rounded-xl bg-white/[0.02]">
              <span className="text-[10px] text-slate-500 font-bold uppercase">Avg Monthly Revenue</span>
              <p className="text-xs font-black text-white mt-0.5">{fmt(2240000)} AFN</p>
            </div>
            <div className="p-2 rounded-xl bg-white/[0.02]">
              <span className="text-[10px] text-slate-500 font-bold uppercase">Avg Monthly Expense</span>
              <p className="text-xs font-black text-rose-300 mt-0.5">{fmt(767500)} AFN</p>
            </div>
            <div className="p-2 rounded-xl bg-white/[0.02]">
              <span className="text-[10px] text-slate-500 font-bold uppercase">Operating Margin</span>
              <p className="text-xs font-black text-emerald-400 mt-0.5">65.7%</p>
            </div>
          </div>
        </div>

        {/* Agency Distribution Card */}
        <div className="glass-panel rounded-2xl p-5 border border-white/10 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <RadioTower className="w-4 h-4 text-cyan-400" />
                {copy.agencyDistribution}
              </h3>
              <SharedSecondaryButton
                type="button"
                onClick={() => onNavigateTab("settlements")}
                className="text-[11px] font-bold text-cyan-400 hover:underline"
              >
                {copy.viewAll}
              </SharedSecondaryButton>
            </div>

            <div className="mt-4 space-y-3">
              {agencyShares.map((ag, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300">{ag.name}</span>
                    <span className="font-mono font-bold text-white">
                      {fmt(ag.amount)} <span className="text-[10px] text-slate-500">AFN</span>
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden flex">
                    <div
                      className={`h-full ${ag.color} rounded-full transition-all duration-500`}
                      style={{ width: `${ag.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300 flex items-center justify-between">
            <span className="font-bold">Total Active Agencies:</span>
            <span className="font-black text-sm">19 Agencies</span>
          </div>
        </div>
      </div>

      {/* Quick Action Shortcuts & Health Badges */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <SharedSecondaryButton
          type="button"
          onClick={() => onNavigateTab("journalEntries")}
          className="glass-card rounded-2xl p-4 text-start border border-white/10 hover:border-cyan-500/40 hover:-translate-y-0.5 transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 group-hover:scale-105 transition-transform">
              <Plus className="w-4 h-4" />
            </div>
            <ArrowRight className={`w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors ${rtl ? "rotate-180" : ""}`} />
          </div>
          <h4 className="text-xs font-black text-white">{copy.newJournal}</h4>
          <p className="text-[11px] text-slate-400 mt-0.5">Post balanced debit/credit voucher</p>
        </SharedSecondaryButton>

        <button
          type="button"
          onClick={() => onNavigateTab("expenses")}
          className="glass-card rounded-2xl p-4 text-start border border-white/10 hover:border-rose-500/40 hover:-translate-y-0.5 transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 group-hover:scale-105 transition-transform">
              <Scale className="w-4 h-4" />
            </div>
            <ArrowRight className={`w-4 h-4 text-slate-500 group-hover:text-rose-400 transition-colors ${rtl ? "rotate-180" : ""}`} />
          </div>
          <h4 className="text-xs font-black text-white">{copy.newExpense}</h4>
          <p className="text-[11px] text-slate-400 mt-0.5">Record bandwidth & operations overhead</p>
        </button>

        <SharedSecondaryButton
          type="button"
          onClick={() => onNavigateTab("settlements")}
          className="glass-card rounded-2xl p-4 text-start border border-white/10 hover:border-purple-500/40 hover:-translate-y-0.5 transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 group-hover:scale-105 transition-transform">
              <RadioTower className="w-4 h-4" />
            </div>
            <ArrowRight className={`w-4 h-4 text-slate-500 group-hover:text-purple-400 transition-colors ${rtl ? "rotate-180" : ""}`} />
          </div>
          <h4 className="text-xs font-black text-white">{copy.newSettlement}</h4>
          <p className="text-[11px] text-slate-400 mt-0.5">Create & approve AGS settlement</p>
        </SharedSecondaryButton>

        <SharedSecondaryButton
          type="button"
          onClick={() => onNavigateTab("reports")}
          className="glass-card rounded-2xl p-4 text-start border border-white/10 hover:border-emerald-500/40 hover:-translate-y-0.5 transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-105 transition-transform">
              <BarChart3 className="w-4 h-4" />
            </div>
            <ArrowRight className={`w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors ${rtl ? "rotate-180" : ""}`} />
          </div>
          <h4 className="text-xs font-black text-white">{copy.viewReports}</h4>
          <p className="text-[11px] text-slate-400 mt-0.5">Trial Balance, P&L, Balance Sheet</p>
        </SharedSecondaryButton>
      </div>
    </div>
  );
}
