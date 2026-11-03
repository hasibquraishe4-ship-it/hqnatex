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

  const copy = {
    fa: {
      title: "تصفیه حساب نمایندگی‌ها (Agency Settlements)",
      subtitle: "محاسبه خودکار سهم ناخالص، کسر مالیات موضوعی، صدور سند تسویه AGS و پرداخت خزانه‌داری",
      workflowTitle: "چرخه عمر و محافظت مالی تسویه سهم نمایندگی",
      step1: "۱. ایجاد پیش‌نویس (Draft)",
      step1Desc: "تجمع خطوط درآمدی شناسایی‌شده و انتساب شماره یکتای AGS",
      step2: "۲. تأیید مدیر مالی (Approved)",
      step2Desc: "تثبیت قطعی ارقام ناخالص، مالیات و خالص قابل پرداخت",
      step3: "۳. تسویه و پرداخت (Mark Paid)",
      step3Desc: "تسویه کامل مانده؛ اسناد پرداخت‌شده قفل و غیرقابل ابطال می‌شوند",
      voidRule: "ابطال سند (Void): فقط در حالت پیش‌نویس مجاز است و اقلام درآمدی را برای تسویه مجدد آزاد می‌کند.",
      viewPayables: "مشاهده حساب‌های پرداختنی",
      viewTaxes: "مشاهده مالیات‌های تکلیفی",
    },
    ps: {
      title: "د استازولیو د حسابونو تصفیه (Agency Settlements)",
      subtitle: "د ناخالصې ونډې اتومات محاسبه، د قانوني مالیې وضع کول، د AGS تصفیې سند او بانکي تادیه",
      workflowTitle: "د استازولۍ د تصفیې مالي او قانوني بهیر",
      step1: "۱. مسوده جوړول (Draft)",
      step1Desc: "د اړوندو عایداتي ليکو راټولول او د AGS رسمي ګڼه",
      step2: "۲. د مالي مدیر تأیید (Approved)",
      step2Desc: "د ناخالصې، مالیې او خالصې ورکړې رسمي تثبیت",
      step3: "۳. تادیه او بندول (Mark Paid)",
      step3Desc: "پوره تادیه؛ تادیه شوي اسناد قفل کېږي او نه باطلېږي",
      voidRule: "د سند لغوه (Void): یوازې په مسوده کې شونې ده او عایداتي ليکې بېرته ازادوي.",
      viewPayables: "د اداینې وړ پورونه",
      viewTaxes: "د مالیاتو جدول",
    },
    en: {
      title: "Agency Settlements",
      subtitle: "Automated share calculation, withholding tax deduction, sequential AGS numbering & treasury payout",
      workflowTitle: "Agency Settlement Governance & Lifecycle Rules",
      step1: "1. Create (Draft)",
      step1Desc: "Aggregates eligible allocated revenue lines under sequential AGS-XXXXXX numbering",
      step2: "2. Management Approval",
      step2Desc: "Locks gross share, tax deduction and net payable amount",
      step3: "3. Mark Paid",
      step3Desc: "Zeros out balance. Once paid, the settlement is strictly protected against voiding",
      voidRule: "Void Protection: Only draft settlements can be voided, releasing line items back to the pool.",
      viewPayables: "Accounts Payable",
      viewTaxes: "Tax Ledger",
    },
  }[language];

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
            <button
              onClick={() => onNavigateTab("payables")}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-all flex items-center gap-1.5"
            >
              <span>{copy.viewPayables}</span>
              <ArrowRight className={`w-3.5 h-3.5 ${rtl ? "rotate-180" : ""}`} />
            </button>
            <button
              onClick={() => onNavigateTab("taxes")}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-all flex items-center gap-1.5"
            >
              <span>{copy.viewTaxes}</span>
              <ArrowRight className={`w-3.5 h-3.5 ${rtl ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>

        {/* 3 Step Flow */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-2 border-t border-white/10 text-xs">
          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5">
            <span className="font-bold text-cyan-300">{copy.step1}</span>
            <p className="text-[11px] text-slate-400 leading-snug">{copy.step1Desc}</p>
          </div>

          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5">
            <span className="font-bold text-amber-300">{copy.step2}</span>
            <p className="text-[11px] text-slate-400 leading-snug">{copy.step2Desc}</p>
          </div>

          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5">
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
