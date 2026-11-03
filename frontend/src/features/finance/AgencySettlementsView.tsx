import { getTranslation as getUiTranslation } from "../../i18n";
import { SecondaryButton as SharedSecondaryButton } from "../../components/Interface";
import { useState } from "react";
import { RadioTower, CheckCircle2, AlertCircle, ShieldCheck, Scale, ArrowRight, FileText, Info } from "lucide-react";
import { AgencySettlementList } from "../revenue/AgencySettlementList";
import { useTranslation } from "../../lib/i18n";
import type { Session } from "../../lib/api";
import type { FinanceFilterState, FinanceTabId } from "./FinanceTypes";

type Props = {
  session: Session;
  filters: FinanceFilterState;
  onNavigateTab: (tab: FinanceTabId) => void;
};

export function AgencySettlementsView({ session, filters, onNavigateTab }: Props) {
  const { language, rtl } = useTranslation();

  const copy = {en:getUiTranslation("en").featureCopy.finance_AgencySettlementsView.local0,fa:getUiTranslation("fa").featureCopy.finance_AgencySettlementsView.local0,ps:getUiTranslation("ps").featureCopy.finance_AgencySettlementsView.local0}[language];

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Top Lifecycle Rules Banner */}
      <div className="glass-panel rounded-2xl p-4 lg:p-5 border border-purple-500/20 bg-gradient-to-r from-purple-950/20 via-slate-900/40 to-cyan-950/20 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300">
              <RadioTower className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">{copy.workflowTitle}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{copy.voidRule}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <SharedSecondaryButton type="submit"
              onClick={() => onNavigateTab("payables")}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-all flex items-center gap-1.5"
            >
              <span>{copy.viewPayables}</span>
              <ArrowRight className={`w-3.5 h-3.5 ${rtl ? "rotate-180" : ""}`} />
            </SharedSecondaryButton>
            <SharedSecondaryButton type="submit"
              onClick={() => onNavigateTab("taxes")}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-all flex items-center gap-1.5"
            >
              <span>{copy.viewTaxes}</span>
              <ArrowRight className={`w-3.5 h-3.5 ${rtl ? "rotate-180" : ""}`} />
            </SharedSecondaryButton>
          </div>
        </div>

        {/* 3 Step Flow */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-2 border-t border-white/10 text-xs">
          <div className="hq-visual-panel p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5">
            <span className="font-bold text-cyan-300">{copy.step1}</span>
            <p className="text-[11px] text-slate-400 leading-snug">{copy.step1Desc}</p>
          </div>

          <div className="hq-visual-panel p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5">
            <span className="font-bold text-amber-300">{copy.step2}</span>
            <p className="text-[11px] text-slate-400 leading-snug">{copy.step2Desc}</p>
          </div>

          <div className="hq-visual-panel p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5">
            <span className="font-bold text-emerald-300">{copy.step3}</span>
            <p className="text-[11px] text-slate-400 leading-snug">{copy.step3Desc}</p>
          </div>
        </div>
      </div>

      {/* Direct embed of verified, certified AgencySettlementList */}
      <AgencySettlementList session={session} />
    </div>
  );
}
