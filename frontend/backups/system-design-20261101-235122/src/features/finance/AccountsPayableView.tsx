import {
  AlertTriangle,
  Building2,
  CreditCard,
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

export function AccountsPayableView({
  session,
  filters,
  onNavigateTab,
}: Props) {
  const { language, rtl } = useTranslation();

  /*
   * No certified Accounts Payable API currently exists.
   * Preserve the Finance module component contract without creating,
   * calculating, mutating, or displaying fabricated AP business data.
   */
  void session;
  void filters;
  void onNavigateTab;

  const copy = {
    fa: {
      title: "حساب‌های پرداختنی",
      subtitle:
        "این بخش فقط بدهی‌ها و پرداخت‌های واقعی و تأییدشده سیستم را نمایش می‌دهد.",
      unavailableTitle: "اطلاعات واقعی حساب‌های پرداختنی در دسترس نیست",
      unavailableDetail:
        "در وضعیت فعلی سیستم، هیچ API واقعی و تأییدشده برای حساب‌های پرداختنی وجود ندارد. برای حفظ صحت مالی، هیچ بدهی، فروشنده، نمایندگی، مبلغ، تاریخ، وضعیت، حساب بانکی، صندوق یا پرداخت نمونه نمایش داده یا ایجاد نمی‌شود.",
      sourceTitle: "وضعیت منبع داده",
      sourceValue: "API تأییدشده حساب‌های پرداختنی موجود نیست",
      policyTitle: "سیاست اطلاعات",
      policyValue: "فقط اطلاعات واقعی",
      recordsTitle: "سوابق پرداختنی",
      recordsValue:
        "تا زمان فعال‌شدن منبع واقعی، جدول بدهی‌ها و Aging نمایش داده نمی‌شود.",
      paymentTitle: "ثبت پرداخت",
      paymentValue:
        "ثبت پرداخت و خروج نقدینگی بدون API واقعی سیستم غیرفعال است.",
      accountsTitle: "حساب بانکی و صندوق",
      accountsValue:
        "هیچ حساب بانکی یا صندوق ساختگی برای پرداخت نمایش داده نمی‌شود.",
      totalsTitle: "مجموع بدهی و پرداخت",
      totalsValue:
        "هیچ KPI یا مجموع حساب پرداختنی از داده‌های ساختگی محاسبه نمی‌شود.",
      integrityTitle: "حفاظت از صحت مالی",
      integrityValue:
        "هیچ مبلغ، شماره سند، مرجع پرداخت، تاریخ یا وضعیت ساختگی تولید نمی‌شود.",
    },

    ps: {
      title: "د اداینې وړ حسابونه",
      subtitle:
        "دا برخه یوازې د سیسټم واقعي او تایید شوي پورونه او تادیات ښيي.",
      unavailableTitle: "د اداینې وړ حسابونو واقعي معلومات د لاسرسي وړ نه دي",
      unavailableDetail:
        "د سیسټم په اوسني حالت کې د اداینې وړ حسابونو لپاره هېڅ تایید شوی واقعي API نشته. د مالي کره‌والي لپاره هېڅ نمونه پور، پلورونکی، استازولي، مبلغ، نېټه، حالت، بانکي حساب، صندوق یا تادیه نه ښودل کېږي او نه جوړېږي.",
      sourceTitle: "د معلوماتو د سرچینې حالت",
      sourceValue: "تایید شوی د اداینې وړ حسابونو API نشته",
      policyTitle: "د معلوماتو تګلاره",
      policyValue: "یوازې واقعي معلومات",
      recordsTitle: "د اداینې وړ حسابونو ریکارډونه",
      recordsValue:
        "تر هغه چې واقعي سرچینه فعاله نه وي، د پورونو جدول او Aging نه ښودل کېږي.",
      paymentTitle: "د تادیې ثبت",
      paymentValue:
        "د سیسټم له واقعي API پرته د تادیې او نغدو وتلو ثبت غیرفعال دی.",
      accountsTitle: "بانکي حساب او صندوق",
      accountsValue:
        "د تادیې لپاره هېڅ جعلي بانکي حساب یا صندوق نه ښودل کېږي.",
      totalsTitle: "ټول پور او تادیات",
      totalsValue:
        "له جعلي معلوماتو څخه هېڅ KPI یا د اداینې وړ حسابونو مجموع نه محاسبه کېږي.",
      integrityTitle: "د مالي کره‌والي ساتنه",
      integrityValue:
        "هېڅ جعلي مبلغ، سند شمېره، د تادیې حواله، نېټه یا حالت نه تولیدېږي.",
    },

    en: {
      title: "Accounts Payable",
      subtitle:
        "This area displays only real and verified payable obligations and payments from the system.",
      unavailableTitle: "Real accounts payable data is unavailable",
      unavailableDetail:
        "The current system has no certified real Accounts Payable API. To preserve financial integrity, no sample obligation, vendor, agency, amount, date, status, bank account, cash account, or payment is displayed or created.",
      sourceTitle: "Data source status",
      sourceValue: "No certified Accounts Payable API is available",
      policyTitle: "Data policy",
      policyValue: "Real data only",
      recordsTitle: "Payable records",
      recordsValue:
        "Payable tables and aging information remain unavailable until a real data source exists.",
      paymentTitle: "Payment posting",
      paymentValue:
        "Payment and treasury payout posting are disabled without a real system API.",
      accountsTitle: "Bank and cash accounts",
      accountsValue:
        "No fabricated bank or cash account is displayed as a payment source.",
      totalsTitle: "Payable and payment totals",
      totalsValue:
        "No Accounts Payable KPI or total is calculated from fabricated data.",
      integrityTitle: "Financial integrity protection",
      integrityValue:
        "No fabricated amount, voucher number, payment reference, date, or status is generated.",
    },
  }[language];

  return (
    <div
      dir={rtl ? "rtl" : "ltr"}
      className="space-y-4 animate-in fade-in duration-300"
    >
      <section className="glass-panel rounded-2xl border border-white/10 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-2.5 text-cyan-300">
            <Building2 className="h-5 w-5" />
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

            <div>
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

            <div>
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

            <div>
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
            <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />

            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                {copy.paymentTitle}
              </p>
              <p className="mt-1.5 text-xs leading-5 text-slate-300">
                {copy.paymentValue}
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl border border-white/10 p-4">
          <div className="flex items-start gap-3">
            <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />

            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                {copy.accountsTitle}
              </p>
              <p className="mt-1.5 text-xs leading-5 text-slate-300">
                {copy.accountsValue}
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl border border-white/10 p-4">
          <div className="flex items-start gap-3">
            <Database className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />

            <div>
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
