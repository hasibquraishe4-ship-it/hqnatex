import { PageHeader as SharedPageHeader } from "../../components/PageHeader";
import { SecondaryButton as SharedSecondaryButton } from "../../components/Interface";
import {
  Building2,
  GitBranch,
  RadioTower,
  BookOpen,
  FileSpreadsheet,
  Receipt,
  Wallet,
  Landmark,
  Scale,
  ShieldCheck,
  CalendarRange,
  ArrowRight,
  X,
  Workflow,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "../../lib/i18n";
import type { FinanceTabId } from "./FinanceTypes";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: FinanceTabId) => void;
};

export function FinanceRelationshipsModal({ isOpen, onClose, onNavigateTab }: Props) {
  const { language, rtl } = useTranslation();

  if (!isOpen) return null;

  const copy = {
    fa: {
      title: "نقشه ارتباطات ساختاری و روابط مالی ERP",
      subtitle: "روابط یکپارچه بین ساختار سازمانی، اسناد حسابداری، عواید، مصارف و خزانه‌داری",
      close: "بستن",
      flowTitle: "جریان داده‌های مالی در سیستم",
      relations: [
        {
          id: "org",
          title: "ساختار سازمانی: شرکت → شعبه → نمایندگی",
          from: "شرکت (Company)",
          arrow: "→",
          middle: "شعبه (Branch)",
          arrow2: "→",
          to: "نمایندگی (Agency)",
          desc: "هر نمایندگی به یک شرکت و شعبه وابسته است. تمامی تراکنش‌ها و تصفیه‌ها بر اساس این سلسله‌مراتب ثبت می‌شوند.",
          tab: "settlements" as FinanceTabId,
          tabLabel: "مشاهده تصفیه حساب‌ها",
          icon: Building2,
          color: "cyan",
        },
        {
          id: "gl",
          title: "حساب‌ها و اسناد: حساب کل → سند روزنامچه → سطرهای سند",
          from: "کد حساب (Account)",
          arrow: "→",
          middle: "سند روزنامچه (Journal Entry)",
          arrow2: "→",
          to: "سطرهای بدهکار/بستانکار (Lines)",
          desc: "هر سند حسابداری شامل حداقل دو سطر بدهکار و بستانکار متوازن بوده و به کدهای جدول حساب‌ها متصل است.",
          tab: "journalEntries" as FinanceTabId,
          tabLabel: "مشاهده اسناد روزنامچه",
          icon: BookOpen,
          color: "blue",
        },
        {
          id: "rev",
          title: "فروش و درآمد: فروش بسته/سرویس → شناسایی عاید",
          from: "فروش (Sale)",
          arrow: "→",
          middle: "تراکنش عاید (Revenue Transaction)",
          arrow2: "→",
          to: "تخصیص عواید (Allocations)",
          desc: "ثبت فروش مشتری مستقیماً عواید ناخالص را شناسایی و طبق قوانین تسهیم بین شرکت و نمایندگی تقسیم می‌کند.",
          tab: "dashboard" as FinanceTabId,
          tabLabel: "داشبورد درآمد",
          icon: Receipt,
          color: "emerald",
        },
        {
          id: "col",
          title: "دریافت‌ها: صورت‌حساب مشتری → پرداخت → وصولی خزانه‌داری",
          from: "صورت‌حساب (Invoice)",
          arrow: "→",
          middle: "پرداخت مشتری (Payment)",
          arrow2: "→",
          to: "وصولی نقد/بانک (Collection)",
          desc: "مبالغ وصول‌شده از مشترکین، مانده دریافتنی را کاهش داده و موجودی صندوق یا بانک را افزایش می‌دهد.",
          tab: "receivables" as FinanceTabId,
          tabLabel: "حساب‌های دریافتنی",
          icon: Wallet,
          color: "amber",
        },
        {
          id: "settle",
          title: "تصفیه سهم نمایندگی: سهم ناخالص → کسر مالیات → پرداخت وجه",
          from: "سهم نمایندگی (Gross)",
          arrow: "→",
          middle: "کسر مالیات (Tax)",
          arrow2: "→",
          to: "پرداخت خالص (Net Paid)",
          desc: "محاسبه خودکار سهم نمایندگی، کسر مالیات موضوعی قانون مالیات و صدور شماره تسویه رسمی AGS.",
          tab: "settlements" as FinanceTabId,
          tabLabel: "تصفیه حساب نمایندگی‌ها",
          icon: RadioTower,
          color: "purple",
        },
        {
          id: "exp",
          title: "هزینه‌ها: فاکتور هزینه → حساب معین مصرفی → پرداخت خزانه‌داری",
          from: "مصرف (Expense)",
          arrow: "→",
          middle: "حساب هزینه (Expense Account)",
          arrow2: "→",
          to: "خروج وجه از نقد/بانک",
          desc: "هزینه‌های پهنای باند، برق، کرایه، معاشات و عملیاتی به حساب معین مربوطه متصل و اثر مالی می‌گذارند.",
          tab: "expenses" as FinanceTabId,
          tabLabel: "مدیریت مصارف",
          icon: Scale,
          color: "rose",
        },
        {
          id: "tax",
          title: "مالیات‌ها: مالیات نمایندگی و معاشات → بدهی مالیاتی → تادیات به وزارت مالیه",
          from: "کسورات مالیاتی (Tax Deducted)",
          arrow: "→",
          middle: "حساب مالیات پرداختنی (Payable)",
          arrow2: "→",
          to: "تصفیه با وزارت مالیه",
          desc: "مالیات‌های کسر شده از سهم نمایندگی و معاشات کارمندان به عنوان مالیات پرداختنی در دفاتر ثبت می‌شود.",
          tab: "taxes" as FinanceTabId,
          tabLabel: "دفتر مالیات",
          icon: ShieldCheck,
          color: "indigo",
        },
        {
          id: "period",
          title: "دوره‌های مالی: دوره باز/بسته → محدودیت ثبت اسناد قطعی",
          from: "دوره مالی (Period)",
          arrow: "→",
          middle: "وضعیت (Open/Closed/Locked)",
          arrow2: "→",
          to: "ثبت قطعی در دفتر کل",
          desc: "اسناد فقط در دوره‌های مالی باز امکان ایجاد و ویرایش دارند؛ با قفل دوره، اسناد غیرقابل دستکاری می‌شوند.",
          tab: "periods" as FinanceTabId,
          tabLabel: "دوره‌های مالی",
          icon: CalendarRange,
          color: "teal",
        },
      ],
    },
    ps: {
      title: "د ERP مالي اړیکو او بنسټیز جوړښت نقشه",
      subtitle: "د اداري جوړښت، محاسباتي اسنادو، عوایدو، لګښتونو او خزانې ترمنځ بشپړه همغږي",
      close: "بندول",
      flowTitle: "په سیسټم کې د مالي معلوماتو بهیر",
      relations: [
        {
          id: "org",
          title: "اداري جوړښت: شرکت → څانګه → استازولي (Agency)",
          from: "شرکت (Company)",
          arrow: "→",
          middle: "څانګه (Branch)",
          arrow2: "→",
          to: "استازولي (Agency)",
          desc: "هره استازولي له یوه شرکت او څانګې سره تړلې ده. ټولې معاملې او تصفیې پر همدې کچه ثبتېږي.",
          tab: "settlements" as FinanceTabId,
          tabLabel: "تصفیه حسابونه",
          icon: Building2,
          color: "cyan",
        },
        {
          id: "gl",
          title: "حسابونه او اسناد: ټول حساب → د ژورنال سند → ليکې",
          from: "د حساب کوډ (Account)",
          arrow: "→",
          middle: "ژورنال سند (Journal Entry)",
          arrow2: "→",
          to: "بدهکار/بستانکار ليکې (Lines)",
          desc: "هر حسابداري سند لږ تر لږه دوه مساوي ليکې لري او د حسابونو جدول سره مستقیم تړاو لري.",
          tab: "journalEntries" as FinanceTabId,
          tabLabel: "ژورنال اسناد",
          icon: BookOpen,
          color: "blue",
        },
        {
          id: "rev",
          title: "پلور او عاید: د کڅوړې پلور → د عاید پېژندنه",
          from: "پلور (Sale)",
          arrow: "→",
          middle: "د عاید معامله (Revenue)",
          arrow2: "→",
          to: "د عاید وېش (Allocations)",
          desc: "د پیرودونکي پلور عواید تثبیتوي او د مقرراتو له مخې د شرکت او استازولۍ ترمنځ وېشل کېږي.",
          tab: "dashboard" as FinanceTabId,
          tabLabel: "د عاید ډشبورډ",
          icon: Receipt,
          color: "emerald",
        },
        {
          id: "col",
          title: "ترلاسه کول: د پیرودونکي بل → تادیه → د خزانې راټولونه",
          from: "بل (Invoice)",
          arrow: "→",
          middle: "د پیرودونکي تادیه (Payment)",
          arrow2: "→",
          to: "نغدي/بانکي رسید (Collection)",
          desc: "ترلاسه شوې پيسې د پېرودونکي پور راکموي او د صندوق یا بانک موجودي لوړوي.",
          tab: "receivables" as FinanceTabId,
          tabLabel: "ترلاسه کېدونکي حسابونه",
          icon: Wallet,
          color: "amber",
        },
        {
          id: "settle",
          title: "د استازولۍ تصفیه: ټوله ونډه → د مالیې کسر → خالص ورکړه",
          from: "د استازولۍ ناخالصه ونډه",
          arrow: "→",
          middle: "د مالیې کسر (Tax)",
          arrow2: "→",
          to: "خالص اداینه (Net Paid)",
          desc: "د استازولۍ ونډې او قانوني مالیې محاسبې وروسته د رسمي AGS ګڼې تصفیه صادریږي.",
          tab: "settlements" as FinanceTabId,
          tabLabel: "د استازولۍ تصفیه",
          icon: RadioTower,
          color: "purple",
        },
        {
          id: "exp",
          title: "لګښتونه: د لګښت بل → د لګښت حساب → د خزانې ورکړه",
          from: "لګښت (Expense)",
          arrow: "→",
          middle: "د لګښت حساب (Account)",
          arrow2: "→",
          to: "له نغدو/بانک څخه ورکړه",
          desc: "د انټرنیټ، برېښنا، معاشونو او دفتري لګښتونه مشخص حساب کې ثبتیږي.",
          tab: "expenses" as FinanceTabId,
          tabLabel: "د لګښتونو مدیریت",
          icon: Scale,
          color: "rose",
        },
        {
          id: "tax",
          title: "مالیات: د استازولۍ او معاشاتو مالیه → مالیاتي پور → مالیې وزارت ته اداینه",
          from: "وضع شوې مالیه (Tax)",
          arrow: "→",
          middle: "د اداینې وړ مالیه (Payable)",
          arrow2: "→",
          to: "مالیې وزارت ته تادیه",
          desc: "له عوایدو او معاشاتو څخه کسر شوې مالیه ثبت او د تحویلۍ لپاره چمتو کېږي.",
          tab: "taxes" as FinanceTabId,
          tabLabel: "د مالیاتو دفتر",
          icon: ShieldCheck,
          color: "indigo",
        },
        {
          id: "period",
          title: "مالي دورې: خلاصه/بنده دوره → د اسنادو ثبت او قفل کول",
          from: "مالي دوره (Period)",
          arrow: "→",
          middle: "حالت (Open/Closed)",
          arrow2: "→",
          to: "دفتر کل کې ثبت",
          desc: "اسناد یوازې په پرانیستې دورې کې د تعدیل وړ وي او په قفل دورې کې نه بدلیږي.",
          tab: "periods" as FinanceTabId,
          tabLabel: "مالي دورې",
          icon: CalendarRange,
          color: "teal",
        },
      ],
    },
    en: {
      title: "ERP Financial Architecture & Entity Relationships",
      subtitle: "Unified cross-module linkages between Organization, Accounting, Revenue, Expenses & Treasury",
      close: "Close",
      flowTitle: "System Financial Pipeline & Data Flow",
      relations: [
        {
          id: "org",
          title: "Organization Hierarchy: Company → Branch → Agency",
          from: "Company",
          arrow: "→",
          middle: "Branch",
          arrow2: "→",
          to: "Agency",
          desc: "Each agency is linked to a company & branch. All transactions and settlements follow this hierarchy.",
          tab: "settlements" as FinanceTabId,
          tabLabel: "View Settlements",
          icon: Building2,
          color: "cyan",
        },
        {
          id: "gl",
          title: "Ledger Pipeline: Chart of Accounts → Journal Entry → Journal Lines",
          from: "Account Code",
          arrow: "→",
          middle: "Journal Entry",
          arrow2: "→",
          to: "Debit / Credit Lines",
          desc: "Every transaction generates balanced double-entry lines posted to the general ledger with full audit trail.",
          tab: "journalEntries" as FinanceTabId,
          tabLabel: "View Journal Entries",
          icon: BookOpen,
          color: "blue",
        },
        {
          id: "rev",
          title: "Revenue Recognition: Service Sale → Revenue Transaction → Allocations",
          from: "Sale",
          arrow: "→",
          middle: "Revenue Transaction",
          arrow2: "→",
          to: "Share Allocations",
          desc: "Subscriber sales trigger automatic accrual revenue recognition and split shares between Company and Agency.",
          tab: "dashboard" as FinanceTabId,
          tabLabel: "Revenue Dashboard",
          icon: Receipt,
          color: "emerald",
        },
        {
          id: "col",
          title: "Receivables & Treasury: Invoice → Customer Payment → Cash/Bank Collection",
          from: "Invoice",
          arrow: "→",
          middle: "Payment",
          arrow2: "→",
          to: "Cash/Bank Collection",
          desc: "Customer collections reduce outstanding AR balance and increment liquid cash drawers or bank vaults.",
          tab: "receivables" as FinanceTabId,
          tabLabel: "Accounts Receivable",
          icon: Wallet,
          color: "amber",
        },
        {
          id: "settle",
          title: "Agency Settlements: Gross Share → Withholding Tax → Net Payable Payout",
          from: "Agency Gross Share",
          arrow: "→",
          middle: "Tax Withheld",
          arrow2: "→",
          to: "Net Settlement Paid",
          desc: "Automated aggregation of agency earnings, tax withholding deductions, and sequential AGS numbering.",
          tab: "settlements" as FinanceTabId,
          tabLabel: "Agency Settlements",
          icon: RadioTower,
          color: "purple",
        },
        {
          id: "exp",
          title: "Expenses & Payables: Expense Voucher → Expense Account → Cash/Bank Outflow",
          from: "Expense Voucher",
          arrow: "→",
          middle: "Expense Account",
          arrow2: "→",
          to: "Treasury Outflow",
          desc: "Operational, bandwidth, fleet and salary overheads are booked to specific COA accounts and paid via bank/cash.",
          tab: "expenses" as FinanceTabId,
          tabLabel: "Manage Expenses",
          icon: Scale,
          color: "rose",
        },
        {
          id: "tax",
          title: "Tax Ledger: Withheld Agency & Payroll Tax → Tax Payable → Remittance",
          from: "Tax Deductions",
          arrow: "→",
          middle: "Tax Payable Account",
          arrow2: "→",
          to: "Ministry of Finance",
          desc: "Accumulates statutory taxes from agency settlements and employee payroll for quarterly and annual remittance.",
          tab: "taxes" as FinanceTabId,
          tabLabel: "Tax Ledger",
          icon: ShieldCheck,
          color: "indigo",
        },
        {
          id: "period",
          title: "Period Governance: Fiscal Period → Lock State → General Ledger Finality",
          from: "Fiscal Period",
          arrow: "→",
          middle: "Open / Locked",
          arrow2: "→",
          to: "Financial Audit Trail",
          desc: "Guarantees transaction integrity by preventing retroactive edits once a financial period is closed or locked.",
          tab: "periods" as FinanceTabId,
          tabLabel: "Financial Periods",
          icon: CalendarRange,
          color: "teal",
        },
      ],
    },
  }[language];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-5xl max-h-[90vh] rounded-[2rem] border border-cyan-500/20 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <SharedPageHeader native as="div" className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Workflow className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                {copy.title}
                <Sparkles className="w-4 h-4 text-cyan-400" />
              </h2>
              <p className="text-xs font-medium text-slate-400 mt-0.5">{copy.subtitle}</p>
            </div>
          </div>

          <SharedSecondaryButton type="submit"
            onClick={onClose}
            className="p-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="w-5 h-5" />
          </SharedSecondaryButton>
        </SharedPageHeader>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {copy.relations.map((rel) => {
              const Icon = rel.icon;
              return (
                <div
                  key={rel.id}
                  className="glass-card rounded-2xl p-4 border border-white/10 hover:border-cyan-500/30 transition-all flex flex-col justify-between gap-3 group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-cyan-400 group-hover:scale-105 transition-transform">
                          <Icon className="w-4 h-4" />
                        </div>
                        <h3 className="text-xs font-black text-white">{rel.title}</h3>
                      </div>
                    </div>

                    {/* Flow Pills */}
                    <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-bold">
                      <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">
                        {rel.from}
                      </span>
                      <span className="text-slate-500">{rel.arrow}</span>
                      <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300">
                        {rel.middle}
                      </span>
                      <span className="text-slate-500">{rel.arrow2}</span>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                        {rel.to}
                      </span>
                    </div>

                    <p className="text-xs font-normal text-slate-400 leading-relaxed">{rel.desc}</p>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex justify-end">
                    <SharedSecondaryButton type="submit"
                      onClick={() => {
                        onNavigateTab(rel.tab);
                        onClose();
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      <span>{rel.tabLabel}</span>
                      <ArrowRight className={`w-3.5 h-3.5 ${rtl ? "rotate-180" : ""}`} />
                    </SharedSecondaryButton>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
