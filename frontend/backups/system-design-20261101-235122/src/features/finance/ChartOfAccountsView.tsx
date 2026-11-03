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

  const copy = {
    fa: {
      title: "جدول حساب‌ها (Chart of Accounts)",
      subtitle: "کدینگ استاندارد ۵ سطحی: دارایی‌ها (۱۰۰۰)، بدهی‌ها (۲۰۰۰)، حقوق مالکان (۳۰۰۰)، عواید (۴۰۰۰)، مصارف (۵۰۰۰)",
      assets: "دارایی‌ها (1000s)",
      liabilities: "بدهی‌ها (2000s)",
      equity: "حقوق مالکان (3000s)",
      revenue: "عواید (4000s)",
      expenses: "مصارف (5000s)",
      relationTip: "هر سند روزنامچه به حساب‌های مشخص متصل است و دفاتر معین و کل را به‌روزرسانی می‌کند.",
      viewJournals: "مشاهده اسناد روزنامچه",
    },
    ps: {
      title: "د حسابونو جدول (Chart of Accounts)",
      subtitle: "د ۵ کچو معیاري کوډینګ: شتمنۍ (۱۰۰۰)، پورونه (۲۰۰۰)، حقوق (۳۰۰۰)، عواید (۴۰۰۰)، لګښتونه (۵۰۰۰)",
      assets: "شتمنۍ (1000s)",
      liabilities: "پورونه (2000s)",
      equity: "د مالکینو حقوق (3000s)",
      revenue: "عواید (4000s)",
      expenses: "لګښتونه (5000s)",
      relationTip: "هر ژورنال سند له اړوندو حسابونو سره تړل کېږي او د دفتر کل محاسبات برابروي.",
      viewJournals: "د ژورنال اسناد کتل",
    },
    en: {
      title: "Chart of Accounts",
      subtitle: "5-Tier Standard ERP Structure: Assets (1000), Liabilities (2000), Equity (3000), Revenue (4000), Expenses (5000)",
      assets: "Assets (1000s)",
      liabilities: "Liabilities (2000s)",
      equity: "Equity (3000s)",
      revenue: "Revenue (4000s)",
      expenses: "Expenses (5000s)",
      relationTip: "Every journal entry maps directly to posting accounts, driving real-time ledger & financial report balances.",
      viewJournals: "View Journal Entries",
    },
  }[language];

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
