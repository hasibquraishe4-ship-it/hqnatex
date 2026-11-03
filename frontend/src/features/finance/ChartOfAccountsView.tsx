import { getTranslation as getUiTranslation } from "../../i18n";
import { useState } from "react";
import { Landmark, Layers, TreePine, ListFilter, Plus, Info } from "lucide-react";
import { AccountList } from "./AccountList";
import { useTranslation } from "../../lib/i18n";
import type { Session } from "../../lib/api";
import type { FinanceFilterState, FinanceTabId } from "./FinanceTypes";

type Props = {
  session: Session;
  filters: FinanceFilterState;
  onNavigateTab: (tab: FinanceTabId) => void;
};

export function ChartOfAccountsView({ session, filters, onNavigateTab }: Props) {
  const { language } = useTranslation();

  const copy = {en:getUiTranslation("en").featureCopy.finance_ChartOfAccountsView.local0,fa:getUiTranslation("fa").featureCopy.finance_ChartOfAccountsView.local0,ps:getUiTranslation("ps").featureCopy.finance_ChartOfAccountsView.local0}[language];

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* COA Category Summary Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        <div className="glass-card p-3 rounded-xl border border-cyan-500/20 bg-cyan-950/20">
          <span className="text-[10px] font-black uppercase text-cyan-400">1000 — {copy.assets}</span>
          <p className="text-xs font-bold text-white mt-1">Normal: Debit</p>
        </div>

        <div className="glass-card p-3 rounded-xl border border-purple-500/20 bg-purple-950/20">
          <span className="text-[10px] font-black uppercase text-purple-400">2000 — {copy.liabilities}</span>
          <p className="text-xs font-bold text-white mt-1">Normal: Credit</p>
        </div>

        <div className="glass-card p-3 rounded-xl border border-blue-500/20 bg-blue-950/20">
          <span className="text-[10px] font-black uppercase text-blue-400">3000 — {copy.equity}</span>
          <p className="text-xs font-bold text-white mt-1">Normal: Credit</p>
        </div>

        <div className="glass-card p-3 rounded-xl border border-emerald-500/20 bg-emerald-950/20">
          <span className="text-[10px] font-black uppercase text-emerald-400">4000 — {copy.revenue}</span>
          <p className="text-xs font-bold text-white mt-1">Normal: Credit</p>
        </div>

        <div className="glass-card p-3 rounded-xl border border-rose-500/20 bg-rose-950/20 col-span-2 sm:col-span-1">
          <span className="text-[10px] font-black uppercase text-rose-400">5000 — {copy.expenses}</span>
          <p className="text-xs font-bold text-white mt-1">Normal: Debit</p>
        </div>
      </div>

      {/* Embedded Complete AccountList */}
      <AccountList session={session} />
    </div>
  );
}
