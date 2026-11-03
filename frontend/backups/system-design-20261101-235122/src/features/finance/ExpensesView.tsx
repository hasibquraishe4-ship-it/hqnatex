import {
  AlertTriangle,
  Database,
  FileWarning,
  ReceiptText,
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

export function ExpensesView({
  session,
  filters,
  onNavigateTab,
}: Props) {
  const { language, rtl } = useTranslation();

  /*
   * No certified Expenses API currently exists.
   * Keep the canonical Finance component contract without deriving or
   * fabricating any financial business values locally.
   */
  void session;
  void filters;
  void onNavigateTab;

  const copy = {
    fa: {
      title: "مدیریت مصارف",
      subtitle:
        "این بخش فقط اطلاعات مصارف واقعی و تأییدشده سیستم را نمایش می‌دهد.",
      unavailableTitle: "اطلاعات واقعی مصارف در دسترس نیست",
      unavailableDetail:
        "در وضعیت فعلی سیستم، هیچ رابط واقعی و تأییدشده برای دریافت یا ثبت مصارف موجود نیست. برای حفظ صحت معلومات مالی، هیچ مبلغ، فروشنده، حساب، تاریخ، وضعیت، دسته‌بندی یا سند نمونه نمایش داده یا ایجاد نمی‌شود.",
      sourceTitle: "وضعیت منبع داده",
      sourceValue: "رابط تأییدشده مصارف موجود نیست",
      policyTitle: "سیاست اطلاعات",
      policyValue: "فقط اطلاعات واقعی",
      recordsTitle: "سوابق مصارف",
      recordsValue:
        "تا زمان فعال‌شدن منبع واقعی، جدول و محاسبات مصارف نمایش داده نمی‌شوند.",
      createTitle: "ثبت مصرف",
      createValue:
        "ثبت مصرف بدون API واقعی سیستم غیرفعال است.",
      totalsTitle: "مجموع و تحلیل مصارف",
      totalsValue:
        "هیچ مجموع، KPI یا تفکیک دسته‌بندی از داده‌های ساختگی محاسبه نمی‌شود.",
      integrityTitle: "حفاظت از صحت مالی",
      integrityValue:
        "سیستم هیچ مبلغ، حساب، شماره سند، تاریخ یا وضعیت ساختگی تولید نمی‌کند.",
    },

    ps: {
      title: "د لګښتونو مدیریت",
      subtitle:
        "دا برخه یوازې د سیسټم واقعي او تایید شوي لګښت معلومات ښيي.",
      unavailableTitle: "واقعي لګښت معلومات د لاسرسي وړ نه دي",
      unavailableDetail:
        "د سیسټم په اوسني حالت کې د لګښتونو د ترلاسه کولو یا ثبتولو لپاره هېڅ تایید شوی واقعي رابط نشته. د مالي معلوماتو د کره‌والي لپاره هېڅ نمونه مبلغ، پلورونکی، حساب، نېټه، حالت، کټګوري یا سند نه ښودل کېږي او نه جوړېږي.",
      sourceTitle: "د معلوماتو د سرچینې حالت",
      sourceValue: "تایید شوی د لګښتونو رابط نشته",
      policyTitle: "د معلوماتو تګلاره",
      policyValue: "یوازې واقعي معلومات",
      recordsTitle: "د لګښتونو ریکارډونه",
      recordsValue:
        "تر هغه چې واقعي سرچینه فعاله نه وي، د لګښتونو جدول او محاسبې نه ښودل کېږي.",
      createTitle: "د لګښت ثبت",
      createValue:
        "د سیسټم له واقعي API پرته د لګښت ثبتول غیرفعال دي.",
      totalsTitle: "د لګښتونو ټولیز او تحلیل",
      totalsValue:
        "له جعلي معلوماتو څخه هېڅ مجموع، KPI یا کټګوري تحلیل نه محاسبه کېږي.",
      integrityTitle: "د مالي کره‌والي ساتنه",
      integrityValue:
        "سیسټم هېڅ جعلي مبلغ، حساب، سند شمېره، نېټه یا حالت نه تولیدوي.",
    },

    en: {
      title: "Expense Management",
      subtitle:
        "This area displays only real and verified expense information from the system.",
      unavailableTitle: "Real expense data is unavailable",
      unavailableDetail:
        "The current system has no certified real API for retrieving or posting expenses. To preserve financial integrity, no sample amount, vendor, account, date, status, category, or voucher is displayed or created.",
      sourceTitle: "Data source status",
      sourceValue: "No certified Expenses API is available",
      policyTitle: "Data policy",
      policyValue: "Real data only",
      recordsTitle: "Expense records",
      recordsValue:
        "Expense tables and calculations remain unavailable until a real data source exists.",
      createTitle: "Expense posting",
      createValue:
        "Expense posting is disabled without a real system API.",
      totalsTitle: "Expense totals and analysis",
      totalsValue:
        "No totals, KPIs, or category breakdowns are calculated from fabricated data.",
      integrityTitle: "Financial integrity protection",
      integrityValue:
        "The system generates no fabricated amount, account, voucher number, date, or status.",
    },
  }[language];

  return (
    <div
      dir={rtl ? "rtl" : "ltr"}
      className="space-y-4 animate-in fade-in duration-300"
    >
      <section className="glass-panel rounded-2xl border border-white/10 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 p-2.5 text-rose-300">
            <ReceiptText className="h-5 w-5" />
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
                {copy.policyTitle}
              </p>

              <p className="mt-1.5 text-xs font-bold leading-5 text-white">
                {copy.policyValue}
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
            <ReceiptText className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />

            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                {copy.createTitle}
              </p>

              <p className="mt-1.5 text-xs leading-5 text-slate-300">
                {copy.createValue}
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl border border-white/10 p-4 md:col-span-2">
          <div className="flex items-start gap-3">
            <Database className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />

            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                {copy.totalsTitle}
              </p>

              <p className="mt-1.5 text-xs leading-5 text-slate-300">
                {copy.totalsValue}
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
              {copy.integrityTitle}
            </p>

            <p className="mt-1 text-[11px] leading-5 text-slate-400">
              {copy.integrityValue}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
