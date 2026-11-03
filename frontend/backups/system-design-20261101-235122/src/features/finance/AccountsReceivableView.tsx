import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertCircle,
  CheckCircle2,
  CircleDollarSign,
  Database,
  Loader2,
  LockKeyhole,
  RefreshCw,
  Search,
  ShieldCheck,
  WalletCards,
  X,
} from "lucide-react";
import { useTranslation } from "../../lib/i18n";
import {
  fetchers as financeApi,
  paymentAllocationApi,
  paymentApi,
} from "../../lib/api";
import type { Session } from "../../lib/api";
import type {
  FinanceFilterState,
  FinanceTabId,
} from "./FinanceTypes";

type AccountsReceivableViewProps = {
  session: Session;
  filters: FinanceFilterState;
  onNavigateTab: (tab: FinanceTabId) => void;
};

type ReceivableApiRow = {
  id: string;
  company?: string | null;
  company_name?: string | null;
  invoice: string;
  invoice_number: string;
  issue_date?: string | null;
  due_date?: string | null;
  customer: string;
  customer_code?: string | null;
  customer_name?: string | null;
  original_amount: string | number;
  allocated_amount: string | number;
  outstanding_amount: string | number;
  currency?: string | null;
  status?: string | null;
};

type InvoiceApiRow = {
  id: string;
  agency_name?: string | null;
};

type Paginated<T> = {
  count?: number;
  results?: T[];
};

type ReceivableRow = ReceivableApiRow & {
  agency_name: string | null;
  originalAmount: number;
  allocatedAmount: number;
  outstandingAmount: number;
  paidAmount: number;
  agingDays: number | null;
  agingBucket: string;
};

type PaymentMethod =
  | "cash"
  | "bank"
  | "electronic"
  | "other";

type RecoveryState = {
  paymentId: string | null;
  allocationId: string | null;
};

type Copy = {
  title: string;
  description: string;
  realData: string;
  companyScope: string;

  loading: string;
  loadError: string;
  retry: string;
  empty: string;
  emptyInfo: string;
  search: string;

  records: string;
  outstanding: string;
  allocated: string;
  overdue: string;

  customer: string;
  customerCode: string;
  invoice: string;
  invoiceDate: string;
  dueDate: string;
  agency: string;
  original: string;
  paid: string;
  balance: string;
  aging: string;
  status: string;
  action: string;

  days: string;
  noDueDate: string;

  workflowTitle: string;
  workflowInfo: string;
  permissionRequired: string;

  collect: string;
  collectionTitle: string;
  collectionInfo: string;
  amount: string;
  method: string;
  paymentDate: string;
  reference: string;
  optionalReference: string;

  cash: string;
  bank: string;
  electronic: string;
  other: string;

  cancel: string;
  postCollection: string;
  processing: string;
  retryWorkflow: string;
  close: string;

  invalidAmount: string;
  exceedsOutstanding: string;
  missingCurrency: string;
  workflowError: string;

  success: string;
  successInfo: string;

  draftExists: string;
  retryInfo: string;

  statusOpen: string;
  statusPartial: string;
  statusPaid: string;
};

const text: Record<"en" | "fa" | "ps", Copy> = {
  en: {
    title: "Accounts Receivable",
    description:
      "Company-scoped receivables from the certified billing API.",
    realData: "Real billing data",
    companyScope: "Active company",

    loading: "Loading receivables…",
    loadError: "Receivables could not be loaded.",
    retry: "Retry",
    empty: "No receivables found",
    emptyInfo: "No receivable records exist for the active company.",
    search: "Search customer, code or invoice…",

    records: "Records",
    outstanding: "Loaded outstanding",
    allocated: "Loaded allocated",
    overdue: "Loaded overdue",

    customer: "Customer",
    customerCode: "Customer code",
    invoice: "Invoice",
    invoiceDate: "Invoice date",
    dueDate: "Due date",
    agency: "Agency",
    original: "Original",
    paid: "Paid",
    balance: "Balance",
    aging: "Aging",
    status: "Status",
    action: "Action",

    days: "days",
    noDueDate: "No due date",

    workflowTitle: "Certified collection workflow",
    workflowInfo:
      "Collections use Payment → Allocation → Post. Direct receivable mutation is disabled.",
    permissionRequired:
      "You do not have permission to manage and post billing payments.",

    collect: "Collect",
    collectionTitle: "Post collection",
    collectionInfo:
      "A real draft payment is created, allocated to this receivable, then posted.",
    amount: "Collection amount",
    method: "Payment method",
    paymentDate: "Payment date",
    reference: "Reference",
    optionalReference: "Optional reference",

    cash: "Cash",
    bank: "Bank",
    electronic: "Electronic",
    other: "Other",

    cancel: "Cancel",
    postCollection: "Post collection",
    processing: "Processing…",
    retryWorkflow: "Retry workflow",
    close: "Close",

    invalidAmount: "Enter an amount greater than zero.",
    exceedsOutstanding:
      "Amount cannot exceed the real outstanding balance.",
    missingCurrency:
      "This receivable has no certified currency value.",
    workflowError:
      "The real collection workflow did not complete. No success was recorded.",

    success: "Collection posted",
    successInfo:
      "The real payment was posted successfully and receivables are being refreshed.",

    draftExists:
      "A real draft payment exists for this attempt.",
    retryInfo:
      "Retry reuses the same payment and allocation IDs to avoid a duplicate payment.",

    statusOpen: "Open",
    statusPartial: "Partial",
    statusPaid: "Paid",
  },

  fa: {
    title: "حساب‌های دریافتنی",
    description:
      "مطالبات شرکت فعال از API واقعی و تصدیق‌شده بلینگ.",
    realData: "داده واقعی بلینگ",
    companyScope: "شرکت فعال",

    loading: "در حال بارگذاری مطالبات…",
    loadError: "دریافت مطالبات از سرور موفق نشد.",
    retry: "تلاش دوباره",
    empty: "هیچ حساب دریافتنی یافت نشد",
    emptyInfo: "برای شرکت فعال فعلاً رکورد دریافتنی وجود ندارد.",
    search: "جستجوی مشتری، کد یا نمبر بل…",

    records: "رکوردها",
    outstanding: "باقی‌مانده بارگذاری‌شده",
    allocated: "تخصیص‌شده بارگذاری‌شده",
    overdue: "سررسید گذشته بارگذاری‌شده",

    customer: "مشتری",
    customerCode: "کد مشتری",
    invoice: "نمبر بل",
    invoiceDate: "تاریخ بل",
    dueDate: "تاریخ سررسید",
    agency: "نمایندگی",
    original: "مبلغ اصلی",
    paid: "پرداخت‌شده",
    balance: "باقی‌مانده",
    aging: "عمر بدهی",
    status: "وضعیت",
    action: "عملیات",

    days: "روز",
    noDueDate: "بدون تاریخ سررسید",

    workflowTitle: "Workflow تصدیق‌شده وصولی",
    workflowInfo:
      "وصول فقط از مسیر Payment → Allocation → Post انجام می‌شود. تغییر مستقیم حساب دریافتنی غیرفعال است.",
    permissionRequired:
      "صلاحیت مدیریت و Post پرداخت‌های بلینگ را ندارید.",

    collect: "ثبت وصولی",
    collectionTitle: "ثبت وصولی واقعی",
    collectionInfo:
      "Payment واقعی در حالت Draft ساخته، به این حساب تخصیص و سپس Post می‌شود.",
    amount: "مبلغ وصولی",
    method: "روش پرداخت",
    paymentDate: "تاریخ پرداخت",
    reference: "مرجع",
    optionalReference: "مرجع اختیاری",

    cash: "نقد",
    bank: "بانک",
    electronic: "الکترونیکی",
    other: "سایر",

    cancel: "انصراف",
    postCollection: "ثبت نهایی وصولی",
    processing: "در حال اجرا…",
    retryWorkflow: "تلاش دوباره",
    close: "بستن",

    invalidAmount: "مبلغ باید بیشتر از صفر باشد.",
    exceedsOutstanding:
      "مبلغ وصولی نمی‌تواند بیشتر از باقی‌مانده واقعی باشد.",
    missingCurrency:
      "برای این حساب دریافتنی واحد پول تصدیق‌شده موجود نیست.",
    workflowError:
      "Workflow واقعی وصولی تکمیل نشد و هیچ موفقیت ساختگی ثبت نشده است.",

    success: "وصولی ثبت شد",
    successInfo:
      "Payment واقعی با موفقیت Post شد و مطالبات دوباره بارگذاری می‌شود.",

    draftExists:
      "برای این تلاش یک Payment واقعی Draft ساخته شده است.",
    retryInfo:
      "تلاش دوباره همان Payment و Allocation را استفاده می‌کند تا پرداخت تکراری ساخته نشود.",

    statusOpen: "باز",
    statusPartial: "قسمی",
    statusPaid: "پرداخت‌شده",
  },

  ps: {
    title: "ترلاسه کېدونکي حسابونه",
    description:
      "د فعال شرکت ترلاسه کېدونکي حسابونه د تصدیق شوي بلینګ API څخه.",
    realData: "اصلي بلینګ معلومات",
    companyScope: "فعال شرکت",

    loading: "ترلاسه کېدونکي حسابونه پورته کېږي…",
    loadError: "له سرور څخه معلومات ترلاسه نشول.",
    retry: "بیا هڅه",
    empty: "هیڅ ترلاسه کېدونکی حساب ونه موندل شو",
    emptyInfo: "د فعال شرکت لپاره اوس مهال ریکارډ نشته.",
    search: "پېرودونکی، کوډ یا بل ولټوئ…",

    records: "ریکارډونه",
    outstanding: "پورته شوی پاتې",
    allocated: "پورته شوی تخصیص",
    overdue: "پورته شوی اوښتی",

    customer: "پېرودونکی",
    customerCode: "د پېرودونکي کوډ",
    invoice: "بل",
    invoiceDate: "د بل نېټه",
    dueDate: "د ورکړې نېټه",
    agency: "نمایندګي",
    original: "اصلي مبلغ",
    paid: "ورکړل شوی",
    balance: "پاتې",
    aging: "د پور عمر",
    status: "حالت",
    action: "عملیات",

    days: "ورځې",
    noDueDate: "د ورکړې نېټه نشته",

    workflowTitle: "تصدیق شوی وصول Workflow",
    workflowInfo:
      "وصول یوازې د Payment → Allocation → Post له لارې کېږي. مستقیم Receivable بدلون بند دی.",
    permissionRequired:
      "تاسو د بلینګ د پیسو د مدیریت او Post اجازه نه لرئ.",

    collect: "وصول ثبت",
    collectionTitle: "اصلي وصول ثبت",
    collectionInfo:
      "اصلي Draft Payment جوړېږي، دې حساب ته تخصیص او وروسته Post کېږي.",
    amount: "د وصول مبلغ",
    method: "د ورکړې طریقه",
    paymentDate: "د ورکړې نېټه",
    reference: "مرجع",
    optionalReference: "اختیاري مرجع",

    cash: "نغدي",
    bank: "بانک",
    electronic: "برېښنايي",
    other: "نور",

    cancel: "لغوه",
    postCollection: "وصول ثبت",
    processing: "په اجرا کې…",
    retryWorkflow: "بیا هڅه",
    close: "بندول",

    invalidAmount: "مبلغ باید له صفر څخه زیات وي.",
    exceedsOutstanding:
      "مبلغ له اصلي پاتې حساب څخه زیاتېدای نشي.",
    missingCurrency:
      "د دې حساب لپاره تصدیق شوی currency نشته.",
    workflowError:
      "اصلي Workflow بشپړ نشو؛ جعلي بریا نه ده ثبت شوې.",

    success: "وصول ثبت شو",
    successInfo:
      "اصلي Payment Post شو او معلومات بیا پورته کېږي.",

    draftExists:
      "د دې هڅې لپاره اصلي Draft Payment جوړ شوی دی.",
    retryInfo:
      "بیا هڅه هماغه Payment او Allocation کاروي تر څو تکراري Payment جوړ نشي.",

    statusOpen: "خلاص",
    statusPartial: "قسمی",
    statusPaid: "ورکړل شوی",
  },
};

function numeric(
  value: string | number | null | undefined,
): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(
  value: number,
  currency?: string | null,
): string {
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);

  return currency ? `${formatted} ${currency}` : formatted;
}

function displayDate(
  value?: string | null,
): string {
  if (!value) {
    return "—";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-CA").format(date);
}

function todayValue(): string {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function aging(
  dueDate?: string | null,
): {
  days: number | null;
  bucket: string;
} {
  if (!dueDate) {
    return {
      days: null,
      bucket: "none",
    };
  }

  const due = new Date(`${dueDate}T00:00:00`);

  if (Number.isNaN(due.getTime())) {
    return {
      days: null,
      bucket: "none",
    };
  }

  const now = new Date();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );

  const days = Math.max(
    0,
    Math.floor(
      (today.getTime() - due.getTime()) / 86_400_000,
    ),
  );

  if (days > 90) {
    return { days, bucket: "90+" };
  }

  if (days > 60) {
    return { days, bucket: "61-90" };
  }

  if (days > 30) {
    return { days, bucket: "31-60" };
  }

  if (days > 0) {
    return { days, bucket: "1-30" };
  }

  return { days, bucket: "current" };
}

function statusStyle(
  status?: string | null,
): string {
  const value = (status ?? "").toLowerCase();

  if (value === "paid") {
    return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
  }

  if (value === "partial") {
    return "border-amber-400/20 bg-amber-500/10 text-amber-100";
  }

  return "border-sky-400/20 bg-sky-500/10 text-sky-100";
}

export function AccountsReceivableView({
  session,
  filters,
  onNavigateTab,
}: AccountsReceivableViewProps) {
  const { language, rtl } = useTranslation();

  void filters;
  void onNavigateTab;

  const lang: "en" | "fa" | "ps" =
    language === "fa" || language === "ps"
      ? language
      : "en";

  const copy = text[lang];

  const [rows, setRows] = useState<ReceivableRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const [query, setQuery] = useState("");
  const [reloadNonce, setReloadNonce] = useState(0);

  const [selected, setSelected] =
    useState<ReceivableRow | null>(null);

  const [amount, setAmount] = useState("");
  const [method, setMethod] =
    useState<PaymentMethod>("cash");

  const [paymentDate, setPaymentDate] =
    useState(todayValue());

  const [reference, setReference] = useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const [collectionError, setCollectionError] =
    useState<string | null>(null);

  const [collectionSuccess, setCollectionSuccess] =
    useState(false);

  const [recovery, setRecovery] =
    useState<RecoveryState>({
      paymentId: null,
      allocationId: null,
    });

  const permissionSession = session as Session & {
    permissions?: string[];
  };

  const permissions = permissionSession.permissions;

  const permissionsKnown = Array.isArray(permissions);

  const canManage =
    !permissionsKnown ||
    permissions.includes("billing.manage");

  const canPost =
    !permissionsKnown ||
    permissions.includes("billing.payments.post");

  const canCollect = canManage && canPost;

  useEffect(() => {
    let active = true;

    async function loadReceivables(): Promise<void> {
      if (!session.companyId) {
        if (active) {
          setRows([]);
          setTotalCount(0);
          setLoadFailed(true);
          setLoading(false);
        }

        return;
      }

      setLoading(true);
      setLoadFailed(false);

      try {
        const response =
          (await financeApi.receivables(
            session,
          )) as Paginated<ReceivableApiRow>;

        const sourceRows = Array.isArray(response?.results)
          ? response.results
          : [];

        let invoiceMap =
          new Map<string, InvoiceApiRow>();

        try {
          const invoiceResponse =
            (await financeApi.invoices(
              session,
            )) as Paginated<InvoiceApiRow>;

          const invoiceRows =
            Array.isArray(invoiceResponse?.results)
              ? invoiceResponse.results
              : [];

          invoiceMap = new Map(
            invoiceRows.map((invoice) => [
              invoice.id,
              invoice,
            ]),
          );
        } catch {
          invoiceMap = new Map<string, InvoiceApiRow>();
        }

        const mapped = sourceRows.map(
          (row): ReceivableRow => {
            const originalAmount =
              numeric(row.original_amount);

            const allocatedAmount =
              numeric(row.allocated_amount);

            const outstandingAmount =
              numeric(row.outstanding_amount);

            const age = aging(row.due_date);

            return {
              ...row,
              agency_name:
                invoiceMap.get(row.invoice)?.agency_name ??
                null,
              originalAmount,
              allocatedAmount,
              outstandingAmount,
              paidAmount: Math.max(
                0,
                originalAmount - outstandingAmount,
              ),
              agingDays: age.days,
              agingBucket: age.bucket,
            };
          },
        );

        if (!active) {
          return;
        }

        setRows(mapped);

        setTotalCount(
          Number(response?.count ?? mapped.length),
        );
      } catch {
        if (active) {
          setRows([]);
          setTotalCount(0);
          setLoadFailed(true);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadReceivables();

    return () => {
      active = false;
    };
  }, [
    session.access,
    session.tenantId,
    session.companyId,
    reloadNonce,
  ]);

  const visibleRows = useMemo(() => {
    const needle = query.trim().toLowerCase();

    if (!needle) {
      return rows;
    }

    return rows.filter((row) => {
      const values = [
        row.customer_name,
        row.customer_code,
        row.invoice_number,
        row.agency_name,
        row.company_name,
      ];

      return values.some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(needle),
      );
    });
  }, [rows, query]);

  const metrics = useMemo(() => {
    return rows.reduce(
      (result, row) => {
        result.outstanding += row.outstandingAmount;
        result.allocated += row.allocatedAmount;

        if (
          row.agingDays !== null &&
          row.agingDays > 0 &&
          row.outstandingAmount > 0
        ) {
          result.overdue += 1;
        }

        return result;
      },
      {
        outstanding: 0,
        allocated: 0,
        overdue: 0,
      },
    );
  }, [rows]);

  const displayCurrency =
    rows.find((row) => Boolean(row.currency))
      ?.currency ?? null;

  function openCollection(row: ReceivableRow): void {
    if (!canCollect || row.outstandingAmount <= 0) {
      return;
    }

    setSelected(row);
    setAmount(row.outstandingAmount.toFixed(2));
    setMethod("cash");
    setPaymentDate(todayValue());
    setReference("");
    setCollectionError(null);
    setCollectionSuccess(false);

    setRecovery({
      paymentId: null,
      allocationId: null,
    });
  }

  function closeCollection(): void {
    if (submitting) {
      return;
    }

    if (recovery.paymentId && !collectionSuccess) {
      return;
    }

    setSelected(null);
    setCollectionError(null);
    setCollectionSuccess(false);

    setRecovery({
      paymentId: null,
      allocationId: null,
    });
  }

  async function submitCollection(): Promise<void> {
    if (!selected || !session.companyId) {
      return;
    }

    if (!canCollect) {
      setCollectionError(copy.permissionRequired);
      return;
    }

    if (!selected.currency) {
      setCollectionError(copy.missingCurrency);
      return;
    }

    const numericAmount = Number(amount);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      setCollectionError(copy.invalidAmount);
      return;
    }

    if (numericAmount > selected.outstandingAmount) {
      setCollectionError(copy.exceedsOutstanding);
      return;
    }

    const normalizedAmount =
      numericAmount.toFixed(2);

    let paymentId = recovery.paymentId;
    let allocationId = recovery.allocationId;

    setSubmitting(true);
    setCollectionError(null);
    setCollectionSuccess(false);

    try {
      if (!paymentId) {
        const paymentPayload = {
          company: session.companyId,
          customer: selected.customer,
          amount: normalizedAmount,
          currency: selected.currency,
          method,
          payment_date: paymentDate,
          reference: reference.trim(),
        } as Parameters<typeof paymentApi.create>[1];

        const paymentResponse =
          (await paymentApi.create(
            session,
            paymentPayload,
          )) as {
            id?: string;
          };

        if (!paymentResponse.id) {
          throw new Error("PAYMENT_ID_MISSING");
        }

        paymentId = paymentResponse.id;

        setRecovery({
          paymentId,
          allocationId: null,
        });
      }

      if (!paymentId) {
        throw new Error("PAYMENT_ID_NOT_AVAILABLE");
      }

      if (!allocationId) {
        const allocationResponse =
          (await paymentAllocationApi.create(
            session,
            {
              payment: paymentId,
              receivable: selected.id,
              amount: normalizedAmount,
            },
          )) as {
            id?: string;
          };

        if (!allocationResponse.id) {
          throw new Error("ALLOCATION_ID_MISSING");
        }

        allocationId = allocationResponse.id;

        setRecovery({
          paymentId,
          allocationId,
        });
      }

      await paymentApi.post(
        session,
        paymentId,
      );

      setCollectionSuccess(true);
      setCollectionError(null);

      setReloadNonce((value) => value + 1);
    } catch {
      setCollectionError(copy.workflowError);
    } finally {
      setSubmitting(false);
    }
  }

  function translatedStatus(
    status?: string | null,
  ): string {
    const value = (status ?? "").toLowerCase();

    if (value === "open") {
      return copy.statusOpen;
    }

    if (value === "partial") {
      return copy.statusPartial;
    }

    if (value === "paid") {
      return copy.statusPaid;
    }

    return status || "—";
  }

  return (
    <section
      dir={rtl ? "rtl" : "ltr"}
      className="space-y-4"
    >
      <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 shadow-xl backdrop-blur-xl">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap gap-2">
              <Badge>
                <Database className="h-3.5 w-3.5" />
                {copy.realData}
              </Badge>

              <Badge>
                <ShieldCheck className="h-3.5 w-3.5" />
                {copy.companyScope}
              </Badge>
            </div>

            <h2 className="text-xl font-semibold text-white">
              {copy.title}
            </h2>

            <p className="mt-1 text-sm text-white/55">
              {copy.description}
            </p>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={() =>
              setReloadNonce((value) => value + 1)
            }
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-40"
          >
            <RefreshCw
              className={
                loading
                  ? "h-4 w-4 animate-spin"
                  : "h-4 w-4"
              }
            />
            {copy.retry}
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={<Database className="h-4 w-4" />}
          label={copy.records}
          value={String(totalCount)}
        />

        <Metric
          icon={<WalletCards className="h-4 w-4" />}
          label={copy.outstanding}
          value={money(
            metrics.outstanding,
            displayCurrency,
          )}
        />

        <Metric
          icon={<CircleDollarSign className="h-4 w-4" />}
          label={copy.allocated}
          value={money(
            metrics.allocated,
            displayCurrency,
          )}
        />

        <Metric
          icon={<AlertCircle className="h-4 w-4" />}
          label={copy.overdue}
          value={String(metrics.overdue)}
        />
      </div>

      <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/[0.055] p-3.5">
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />

          <div>
            <p className="text-sm font-semibold text-cyan-100">
              {copy.workflowTitle}
            </p>

            <p className="mt-1 text-xs leading-5 text-cyan-50/60">
              {copy.workflowInfo}
            </p>
          </div>
        </div>
      </div>

      {!canCollect && (
        <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-100">
          <div className="flex items-center gap-2">
            <LockKeyhole className="h-4 w-4" />
            <span>{copy.permissionRequired}</span>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-3">
        <div className="relative">
          <Search
            className={
              rtl
                ? "absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30"
                : "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30"
            }
          />

          <input
            value={query}
            onChange={(event) =>
              setQuery(event.target.value)
            }
            placeholder={copy.search}
            className={
              rtl
                ? "h-10 w-full rounded-xl border border-white/10 bg-black/10 pr-10 pl-3 text-sm text-white outline-none"
                : "h-10 w-full rounded-xl border border-white/10 bg-black/10 pl-10 pr-3 text-sm text-white outline-none"
            }
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045]">
        {loading && (
          <StateBox>
            <Loader2 className="h-7 w-7 animate-spin" />
            <span>{copy.loading}</span>
          </StateBox>
        )}

        {!loading && loadFailed && (
          <StateBox>
            <AlertCircle className="h-7 w-7 text-rose-300" />
            <span>{copy.loadError}</span>
          </StateBox>
        )}

        {!loading &&
          !loadFailed &&
          visibleRows.length === 0 && (
            <StateBox>
              <Database className="h-7 w-7" />

              <div>
                <div className="font-medium text-white">
                  {copy.empty}
                </div>

                <div className="mt-1 text-sm text-white/45">
                  {copy.emptyInfo}
                </div>
              </div>
            </StateBox>
          )}

        {!loading &&
          !loadFailed &&
          visibleRows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1390px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.035] text-xs text-white/50">
                    <TH>{copy.customer}</TH>
                    <TH>{copy.customerCode}</TH>
                    <TH>{copy.invoice}</TH>
                    <TH>{copy.invoiceDate}</TH>
                    <TH>{copy.dueDate}</TH>
                    <TH>{copy.agency}</TH>
                    <TH>{copy.original}</TH>
                    <TH>{copy.paid}</TH>
                    <TH>{copy.balance}</TH>
                    <TH>{copy.aging}</TH>
                    <TH>{copy.status}</TH>
                    <TH>{copy.action}</TH>
                  </tr>
                </thead>

                <tbody>
                  {visibleRows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-white/[0.06] text-white/75 last:border-0 hover:bg-white/[0.03]"
                    >
                      <TD>
                        <div className="max-w-[220px] truncate font-medium text-white">
                          {row.customer_name || "—"}
                        </div>
                      </TD>

                      <TD>{row.customer_code || "—"}</TD>
                      <TD>{row.invoice_number || "—"}</TD>
                      <TD>{displayDate(row.issue_date)}</TD>
                      <TD>{displayDate(row.due_date)}</TD>
                      <TD>{row.agency_name || "—"}</TD>

                      <TD>
                        {money(
                          row.originalAmount,
                          row.currency,
                        )}
                      </TD>

                      <TD>
                        {money(
                          row.paidAmount,
                          row.currency,
                        )}
                      </TD>

                      <TD>
                        <strong className="text-white">
                          {money(
                            row.outstandingAmount,
                            row.currency,
                          )}
                        </strong>
                      </TD>

                      <TD>
                        {row.agingDays === null
                          ? copy.noDueDate
                          : `${row.agingDays} ${copy.days} · ${row.agingBucket}`}
                      </TD>

                      <TD>
                        <span
                          className={[
                            "inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold",
                            statusStyle(row.status),
                          ].join(" ")}
                        >
                          {translatedStatus(row.status)}
                        </span>
                      </TD>

                      <TD>
                        <button
                          type="button"
                          disabled={
                            !canCollect ||
                            row.outstandingAmount <= 0
                          }
                          onClick={() =>
                            openCollection(row)
                          }
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-2.5 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <CircleDollarSign className="h-3.5 w-3.5" />
                          {copy.collect}
                        </button>
                      </TD>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {copy.collectionTitle}
                </h3>

                <p className="mt-1 text-sm leading-6 text-white/50">
                  {copy.collectionInfo}
                </p>
              </div>

              <button
                type="button"
                disabled={
                  submitting ||
                  Boolean(
                    recovery.paymentId &&
                      !collectionSuccess,
                  )
                }
                onClick={closeCollection}
                className="rounded-xl border border-white/10 p-2 text-white/50 disabled:opacity-25"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <Info
                  label={copy.customer}
                  value={selected.customer_name || "—"}
                />

                <Info
                  label={copy.invoice}
                  value={selected.invoice_number || "—"}
                />

                <Info
                  label={copy.balance}
                  value={money(
                    selected.outstandingAmount,
                    selected.currency,
                  )}
                />

                <Info
                  label={copy.companyScope}
                  value={
                    selected.company_name ||
                    session.companyId ||
                    "—"
                  }
                />
              </div>

              {collectionSuccess ? (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
                  <div className="flex gap-3">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-300" />

                    <div>
                      <p className="font-semibold text-emerald-100">
                        {copy.success}
                      </p>

                      <p className="mt-1 text-sm text-emerald-50/60">
                        {copy.successInfo}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-white/50">
                      {copy.amount}
                    </label>

                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      max={selected.outstandingAmount}
                      value={amount}
                      disabled={
                        submitting ||
                        Boolean(recovery.paymentId)
                      }
                      onChange={(event) =>
                        setAmount(event.target.value)
                      }
                      className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 text-sm text-white outline-none disabled:opacity-40"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-white/50">
                        {copy.method}
                      </label>

                      <select
                        value={method}
                        disabled={
                          submitting ||
                          Boolean(recovery.paymentId)
                        }
                        onChange={(event) => {
                          const value =
                            event.target.value;

                          if (
                            value === "cash" ||
                            value === "bank" ||
                            value === "electronic" ||
                            value === "other"
                          ) {
                            setMethod(value);
                          }
                        }}
                        className="h-10 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white outline-none disabled:opacity-40"
                      >
                        <option value="cash">
                          {copy.cash}
                        </option>

                        <option value="bank">
                          {copy.bank}
                        </option>

                        <option value="electronic">
                          {copy.electronic}
                        </option>

                        <option value="other">
                          {copy.other}
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-white/50">
                        {copy.paymentDate}
                      </label>

                      <input
                        type="date"
                        value={paymentDate}
                        disabled={
                          submitting ||
                          Boolean(recovery.paymentId)
                        }
                        onChange={(event) =>
                          setPaymentDate(
                            event.target.value,
                          )
                        }
                        className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 text-sm text-white outline-none disabled:opacity-40"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-white/50">
                      {copy.reference}
                    </label>

                    <input
                      type="text"
                      value={reference}
                      disabled={
                        submitting ||
                        Boolean(recovery.paymentId)
                      }
                      placeholder={copy.optionalReference}
                      onChange={(event) =>
                        setReference(
                          event.target.value,
                        )
                      }
                      className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 text-sm text-white outline-none disabled:opacity-40"
                    />
                  </div>

                  {recovery.paymentId && (
                    <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-3">
                      <p className="text-sm font-semibold text-amber-100">
                        {copy.draftExists}
                      </p>

                      <p className="mt-1 text-xs leading-5 text-amber-50/60">
                        {copy.retryInfo}
                      </p>
                    </div>
                  )}

                  {collectionError && (
                    <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-100">
                      {collectionError}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-white/10 p-4 sm:flex-row sm:justify-end">
              {collectionSuccess ? (
                <button
                  type="button"
                  onClick={closeCollection}
                  className="h-10 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-white"
                >
                  {copy.close}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={
                      submitting ||
                      Boolean(recovery.paymentId)
                    }
                    onClick={closeCollection}
                    className="h-10 rounded-xl border border-white/10 px-4 text-sm text-white/70 disabled:opacity-30"
                  >
                    {copy.cancel}
                  </button>

                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => {
                      void submitCollection();
                    }}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {copy.processing}
                      </>
                    ) : recovery.paymentId ? (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        {copy.retryWorkflow}
                      </>
                    ) : (
                      <>
                        <CircleDollarSign className="h-4 w-4" />
                        {copy.postCollection}
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Badge({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/20 bg-sky-500/10 px-2.5 py-1 text-[11px] font-semibold text-sky-100">
      {children}
    </span>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3.5">
      <div className="flex items-center gap-2 text-xs text-white/45">
        {icon}
        <span>{label}</span>
      </div>

      <div className="mt-2 truncate text-lg font-semibold text-white">
        {value}
      </div>
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
      <div className="text-[11px] text-white/35">
        {label}
      </div>

      <div className="mt-1 truncate text-sm font-semibold text-white/80">
        {value}
      </div>
    </div>
  );
}

function StateBox({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 p-8 text-center text-sm text-white/55">
      {children}
    </div>
  );
}

function TH({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <th className="whitespace-nowrap px-3 py-3 text-start font-semibold">
      {children}
    </th>
  );
}

function TD({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <td className="whitespace-nowrap px-3 py-3 align-middle">
      {children}
    </td>
  );
}
