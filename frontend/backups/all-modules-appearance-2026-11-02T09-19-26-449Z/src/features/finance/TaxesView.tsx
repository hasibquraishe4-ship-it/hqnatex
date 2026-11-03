import { getTranslation as getUiTranslation } from "../../i18n";
import {
  AlertTriangle,
  Database,
  FileWarning,
  ShieldCheck,
} from "lucide-react";
import { useTranslation } from "../../lib/i18n";
import type { Session } from "../../lib/api";
import type {
  FinanceFilterState,
  FinanceTabId,
} from "./FinanceTypes";

type Props = {
  session: Session;
  filters: FinanceFilterState;
  onNavigateTab: (tab: FinanceTabId) => void;
};

export function TaxesView({
  session,
  filters,
  onNavigateTab,
}: Props) {
  const { language, rtl } = useTranslation();

  /*
   * No certified Tax API route currently exists.
   *
   * These props are intentionally preserved for the canonical Finance module
   * contract, but no local financial business data is derived from them.
   */
  void session;
  void filters;
  void onNavigateTab;

  const copy = {en:getUiTranslation("en").featureCopy.finance_TaxesView.local0,fa:getUiTranslation("fa").featureCopy.finance_TaxesView.local0,ps:getUiTranslation("ps").featureCopy.finance_TaxesView.local0}[language];

  return (
    <div
      dir={rtl ? "rtl" : "ltr"}
      className="space-y-4 animate-in fade-in duration-300"
    >
      <section className="glass-panel rounded-2xl border border-white/10 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-xl border border-indigo-400/20 bg-indigo-500/10 p-2.5 text-indigo-300">
            <ShieldCheck className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <h2 className="text-sm font-black text-white">
              {copy.title}
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-400">
              {copy.subtitle}
            </p>
          </div>
        </div>
      </section>

      <section className="glass-panel rounded-2xl border border-amber-400/20 bg-amber-500/[0.04] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-2.5 text-amber-300">
            <AlertTriangle className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <h3 className="text-sm font-black text-amber-100">
              {copy.unavailableTitle}
            </h3>

            <p className="mt-2 max-w-4xl text-xs leading-6 text-slate-300">
              {copy.unavailableDetail}
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="glass-card rounded-2xl border border-white/10 p-4">
          <div className="flex items-start gap-3">
            <Database className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />

            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                {copy.sourceTitle}
              </p>

              <p className="mt-1.5 text-xs font-bold leading-5 text-white">
                {copy.sourceValue}
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl border border-white/10 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />

            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                {copy.dataPolicyTitle}
              </p>

              <p className="mt-1.5 text-xs font-bold leading-5 text-white">
                {copy.dataPolicyValue}
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl border border-white/10 p-4">
          <div className="flex items-start gap-3">
            <FileWarning className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />

            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                {copy.recordsTitle}
              </p>

              <p className="mt-1.5 text-xs leading-5 text-slate-300">
                {copy.recordsValue}
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl border border-white/10 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />

            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                {copy.paymentsTitle}
              </p>

              <p className="mt-1.5 text-xs leading-5 text-slate-300">
                {copy.paymentsValue}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />

          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              {copy.protectedTitle}
            </p>

            <p className="mt-1 text-[11px] leading-5 text-slate-400">
              {copy.protectedValue}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
