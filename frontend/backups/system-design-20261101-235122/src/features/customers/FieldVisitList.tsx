// HQNATEX_FIELD_VISIT_DARK_ENTERPRISE_V1
import {
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  FileText,
  Filter,
  Plus,
  RefreshCw,
  Search,
  Truck,
  User,
  Wrench,
  X,
} from "lucide-react";

import {
  fetchers,
  fieldVisitApi,
  type Session,
} from "../../lib/api";

import {
  useTranslation,
} from "../../lib/i18n";

type Props = {
  session: Session;
};

type FieldVisitRecord = {
  id: string;
  tenant?: string;
  company?: string;
  customer_service: string;
  customer_name?: string;
  service_identifier?: string;
  fault_ticket?: string | null;
  installation_work_order?: string | null;
  visit_type: string;
  technician_name: string;
  visited_at?: string | null;
  result: "resolved" | "pending_parts" | "customer_unavailable" | "rescheduled";
  notes: string;
  created_at?: string;
  updated_at?: string;
};

type CustomerServiceOption = {
  id: string;
  customer_name?: string;
  service_name?: string;
  identifier?: string;
  status?: string;
};

type TicketOption = {
  id: string;
  ticket_number?: string;
  subject?: string;
  customer_service?: string;
  status?: string;
};

type WorkOrderOption = {
  id: string;
  order_number?: string;
  work_type?: string;
  customer_service?: string;
  status?: string;
};

type FormState = {
  customer_service: string;
  fault_ticket: string;
  installation_work_order: string;
  visit_type: string;
  technician_name: string;
  visited_at: string;
  result: "resolved" | "pending_parts" | "customer_unavailable" | "rescheduled";
  notes: string;
};

type ModalMode = "create" | "view" | "edit" | null;

type Notice = {
  type: "success" | "error";
  message: string;
};

const PAGE_SIZE = 25;

const RESULT_OPTIONS: Array<{
  value: "resolved" | "pending_parts" | "customer_unavailable" | "rescheduled";
  labelEn: string;
  labelFa: string;
  labelPs: string;
  badgeClass: string;
}> = [
  {
    value: "resolved",
    labelEn: "Resolved",
    labelFa: "حل شده",
    labelPs: "حل شوی",
    badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  },
  {
    value: "pending_parts",
    labelEn: "Pending Parts",
    labelFa: "در انتظار قطعات",
    labelPs: "د پرزو په تمه",
    badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  },
  {
    value: "customer_unavailable",
    labelEn: "Customer Unavailable",
    labelFa: "عدم حضور مشتری",
    labelPs: "د پېرودونکي نه شتون",
    badgeClass: "bg-rose-500/10 text-rose-400 border-rose-500/30",
  },
  {
    value: "rescheduled",
    labelEn: "Rescheduled",
    labelFa: "تغییر زمان",
    labelPs: "بیا مهالویش شوی",
    badgeClass: "bg-sky-500/10 text-sky-400 border-sky-500/30",
  },
];

const VISIT_TYPE_PRESETS = [
  { value: "troubleshooting", labelEn: "Troubleshooting", labelFa: "عیب‌یابی", labelPs: "ستونزې حل کول" },
  { value: "installation", labelEn: "Installation", labelFa: "نصب و راه‌اندازی", labelPs: "نصبول" },
  { value: "maintenance", labelEn: "Maintenance", labelFa: "حفظ و مراقبت", labelPs: "ساتنه او څارنه" },
  { value: "site_survey", labelEn: "Site Survey", labelFa: "بررسی محل", labelPs: "د ساحې سروې" },
  { value: "equipment_recovery", labelEn: "Equipment Recovery", labelFa: "جمع‌آوری تجهیزات", labelPs: "د وسایلو راټولول" },
];

const copy = {
  en: {
    title: "Field Visits",
    subtitle: "Manage on-site technician visits, troubleshooting missions, and dispatch outcomes.",
    newVisit: "New Field Visit",
    createVisit: "Register Field Visit",
    editVisit: "Edit Field Visit",
    viewDetails: "Field Visit Details",
    customerService: "Customer Service",
    selectService: "Select customer service...",
    customerName: "Customer Name",
    serviceIdentifier: "Service Identifier",
    faultTicket: "Trouble Ticket (Optional)",
    selectTicket: "Link to Trouble Ticket (Optional)...",
    noTicket: "None (Direct dispatch)",
    workOrder: "Work Order (Optional)",
    selectWorkOrder: "Link to Work Order (Optional)...",
    noWorkOrder: "None (Standalone visit)",
    visitType: "Visit Type",
    technicianName: "Technician Name",
    technicianPlaceholder: "Enter technician name...",
    visitedAt: "Visited At",
    result: "Outcome / Result",
    selectResult: "Select outcome...",
    notes: "Notes & Observations",
    notesPlaceholder: "Enter on-site notes, findings, or required actions...",
    searchPlaceholder: "Search visits by subscriber, identifier, technician, or notes...",
    allResults: "All Outcomes",
    totalVisits: "Total Visits",
    resolvedVisits: "Resolved",
    pendingPartsVisits: "Pending Parts",
    rescheduledVisits: "Rescheduled / Unavailable",
    actions: "Actions",
    view: "View",
    edit: "Edit",
    save: "Save",
    cancel: "Cancel",
    loading: "Loading field visits...",
    noRecords: "No field visit records found.",
    loadFailed: "Unable to load field visit records.",
    saveFailed: "Unable to save field visit.",
    createdSuccess: "Field visit registered successfully.",
    updatedSuccess: "Field visit updated successfully.",
    requiredFields: "Please select a customer service.",
    previous: "Previous",
    next: "Next",
    page: "Page",
    records: "records",
    created: "Created At",
    updated: "Updated At",
    id: "Record ID",
    tenant: "Tenant",
    company: "Company",
  },
  fa: {
    title: "بازدیدهای ساحوی",
    subtitle: "مدیریت اعزام تخنیکران، مأموریت‌های عیب‌یابی در محل و نتایج کار ساحوی.",
    newVisit: "ثبت بازدید جدید",
    createVisit: "ثبت بازدید ساحوی",
    editVisit: "ویرایش بازدید ساحوی",
    viewDetails: "جزئیات بازدید ساحوی",
    customerService: "خدمت مشترک",
    selectService: "انتخاب خدمت مشترک...",
    customerName: "نام مشترک",
    serviceIdentifier: "شناسه خدمت",
    faultTicket: "تیکت خرابی (اختیاری)",
    selectTicket: "اتصال به تیکت خرابی (اختیاری)...",
    noTicket: "هیچکدام (اعزام مستقیم)",
    workOrder: "امر کار نصب (اختیاری)",
    selectWorkOrder: "اتصال به امر کار نصب (اختیاری)...",
    noWorkOrder: "هیچکدام (بازدید مستقل)",
    visitType: "نوع بازدید",
    technicianName: "نام تخنیکر",
    technicianPlaceholder: "نام تخنیکر اعزامی را وارد کنید...",
    visitedAt: "تاریخ و زمان بازدید",
    result: "نتیجه بازدید",
    selectResult: "انتخاب نتیجه...",
    notes: "یادداشت‌ها و مشاهدات ساحوی",
    notesPlaceholder: "توضیحات عیب‌یابی، کارهای انجام شده یا اقلام مصرفی...",
    searchPlaceholder: "جستجو در بازدیدها بر اساس مشترک، شناسه، تخنیکر یا یادداشت...",
    allResults: "همه نتایج",
    totalVisits: "مجموع بازدیدها",
    resolvedVisits: "حل شده",
    pendingPartsVisits: "در انتظار قطعات",
    rescheduledVisits: "تغییر زمان / عدم حضور",
    actions: "عملیات",
    view: "مشاهده",
    edit: "ویرایش",
    save: "ذخیره",
    cancel: "انصراف",
    loading: "در حال بارگذاری بازدیدهای ساحوی...",
    noRecords: "هیچ بازدید ساحوی ثبت نشده است.",
    loadFailed: "خطا در بارگذاری سوابق بازدیدهای ساحوی.",
    saveFailed: "خطا در ذخیره اطلاعات بازدید ساحوی.",
    createdSuccess: "بازدید ساحوی با موفقیت ثبت شد.",
    updatedSuccess: "بازدید ساحوی با موفقیت ویرایش شد.",
    requiredFields: "لطفاً خدمت مشترک را انتخاب نمایید.",
    previous: "قبلی",
    next: "بعدی",
    page: "صفحه",
    records: "مورد",
    created: "تاریخ ثبت",
    updated: "آخرین ویرایش",
    id: "شناسه ریکارد",
    tenant: "مستأجر",
    company: "شرکت",
  },
  ps: {
    title: "ساحوي لیدنې",
    subtitle: "د ساحوي انجنیرانو او تخنیکرانو استول، د ستونزو حل او د ساحوي چارو مدیریت.",
    newVisit: "نوې ساحوي لیدنه",
    createVisit: "د ساحوي لیدنې ثبتول",
    editVisit: "د ساحوي لیدنې سمول",
    viewDetails: "د ساحوي لیدنې جزئیات",
    customerService: "د پېرودونکي خدمت",
    selectService: "د پېرودونکي خدمت وټاکئ...",
    customerName: "د پېرودونکي نوم",
    serviceIdentifier: "د خدمت پېژند",
    faultTicket: "د ستونزې ټکټ (اختیاري)",
    selectTicket: "له ټکټ سره نښلول (اختیاري)...",
    noTicket: "هیڅ نه (مستقیم استول)",
    workOrder: "د کار امر (اختیاري)",
    selectWorkOrder: "د کار له امر سره نښلول (اختیاري)...",
    noWorkOrder: "هیڅ نه (خپله لیدنه)",
    visitType: "د لیدنې ډول",
    technicianName: "د تخنیکر نوم",
    technicianPlaceholder: "د تخنیکر نوم دننه کړئ...",
    visitedAt: "د لیدنې نېټه او وخت",
    result: "د لیدنې پایله",
    selectResult: "پایله وټاکئ...",
    notes: "یادښتونه او ساحوي مشاهدات",
    notesPlaceholder: "د ستونزې جزئیات، ترسره شوي کارونه او لیدنې پایلې...",
    searchPlaceholder: "د پېرودونکي، پېژند، تخنیکر یا یادښت له مخې پلټنه...",
    allResults: "ټولې پایلې",
    totalVisits: "ټولې لیدنې",
    resolvedVisits: "حل شوي",
    pendingPartsVisits: "د پرزو په تمه",
    rescheduledVisits: "بیا مهالویش / نه شتون",
    actions: "عملیات",
    view: "کتل",
    edit: "سمول",
    save: "خوندي کول",
    cancel: "لغوه",
    loading: "د ساحوي لیدنو معلومات بارېږي...",
    noRecords: "د ساحوي لیدنې هیڅ ریکارډ ونه موندل شو.",
    loadFailed: "د ساحوي لیدنو معلومات بار نه شول.",
    saveFailed: "د ساحوي لیدنې ثبتول ناکام شول.",
    createdSuccess: "ساحوي لیدنه په بریالیتوب ثبت شوه.",
    updatedSuccess: "ساحوي لیدنه په بریالیتوب تازه شوه.",
    requiredFields: "مهرباني وکړئ د پېرودونکي خدمت وټاکئ.",
    previous: "مخکینی",
    next: "بل",
    page: "پاڼه",
    records: "ریکارډونه",
    created: "د ثبت نېټه",
    updated: "د بدلون نېټه",
    id: "د ریکارډ پېژند",
    tenant: "مستأجر",
    company: "شرکت",
  },
} as const;

function toLocalDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
        {label}
        {required && <span className="ms-1 text-rose-500">*</span>}
      </span>
      {children}
    </label>
  );
}

export function FieldVisitList({ session }: Props) {
  const { language } = useTranslation();
  const c = copy[language as keyof typeof copy] ?? copy.en;

  const [rows, setRows] = useState<FieldVisitRecord[]>([]);
  const [services, setServices] = useState<CustomerServiceOption[]>([]);
  const [tickets, setTickets] = useState<TicketOption[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrderOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [search, setSearch] = useState("");
  const [resultFilter, setResultFilter] = useState<string>("all");

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selected, setSelected] = useState<FieldVisitRecord | null>(null);

  const [form, setForm] = useState<FormState>({
    customer_service: "",
    fault_ticket: "",
    installation_work_order: "",
    visit_type: "troubleshooting",
    technician_name: "",
    visited_at: toLocalDateTime(new Date().toISOString()),
    result: "resolved",
    notes: "",
  });

  const [notice, setNotice] = useState<Notice | null>(null);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchers.customerServiceFieldVisits(
        session,
        `?page=${page}&page_size=${PAGE_SIZE}`
      );
      setRows(data.results ?? []);
      setCount(data.count ?? 0);
    } catch (error) {
      setNotice({
        type: "error",
        message: error instanceof Error ? error.message : c.loadFailed,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadLookups = async () => {
    try {
      const [servicesRes, ticketsRes, ordersRes] = await Promise.allSettled([
        fetchers.customerServices(session, "?page_size=500"),
        fetchers.customerTickets(session, "?page_size=500"),
        fetchers.customerServiceWorkOrders(session, "?page_size=500"),
      ]);

      if (servicesRes.status === "fulfilled") {
        setServices(servicesRes.value.results ?? []);
      }
      if (ticketsRes.status === "fulfilled") {
        setTickets(ticketsRes.value.results ?? []);
      }
      if (ordersRes.status === "fulfilled") {
        setWorkOrders(ordersRes.value.results ?? []);
      }
    } catch {
      // Non-blocking lookup loading
    }
  };

  useEffect(() => {
    load();
  }, [page]);

  useEffect(() => {
    loadLookups();
  }, []);

  const openCreate = () => {
    setSelected(null);
    setForm({
      customer_service: services[0]?.id ?? "",
      fault_ticket: "",
      installation_work_order: "",
      visit_type: "troubleshooting",
      technician_name: "",
      visited_at: toLocalDateTime(new Date().toISOString()),
      result: "resolved",
      notes: "",
    });
    setNotice(null);
    setModalMode("create");
  };

  const openView = (record: FieldVisitRecord) => {
    setSelected(record);
    setNotice(null);
    setModalMode("view");
  };

  const openEdit = (record: FieldVisitRecord) => {
    setSelected(record);
    setForm({
      customer_service: record.customer_service,
      fault_ticket: record.fault_ticket ? String(record.fault_ticket) : "",
      installation_work_order: record.installation_work_order ? String(record.installation_work_order) : "",
      visit_type: record.visit_type || "troubleshooting",
      technician_name: record.technician_name || "",
      visited_at: toLocalDateTime(record.visited_at),
      result: record.result || "resolved",
      notes: record.notes || "",
    });
    setNotice(null);
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    setSelected(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.customer_service) {
      setNotice({ type: "error", message: c.requiredFields });
      return;
    }

    setSaving(true);
    setNotice(null);

    const payload = {
      customer_service: form.customer_service,
      fault_ticket: form.fault_ticket || null,
      installation_work_order: form.installation_work_order || null,
      visit_type: form.visit_type || "troubleshooting",
      technician_name: form.technician_name || "",
      visited_at: form.visited_at ? new Date(form.visited_at).toISOString() : new Date().toISOString(),
      result: form.result || "resolved",
      notes: form.notes || "",
    };

    try {
      if (modalMode === "create") {
        await fieldVisitApi.create(session, payload);
        setNotice({ type: "success", message: c.createdSuccess });
      } else if (modalMode === "edit" && selected) {
        await fieldVisitApi.update(session, selected.id, payload);
        setNotice({ type: "success", message: c.updatedSuccess });
      }
      closeModal();
      await load();
    } catch (error) {
      setNotice({
        type: "error",
        message: error instanceof Error ? error.message : c.saveFailed,
      });
    } finally {
      setSaving(false);
    }
  };

  // Filter tickets and work orders relevant to currently selected customer_service
  const relevantTickets = useMemo(() => {
    if (!form.customer_service) return tickets;
    return tickets.filter(
      (t) => !t.customer_service || String(t.customer_service) === String(form.customer_service)
    );
  }, [tickets, form.customer_service]);

  const relevantWorkOrders = useMemo(() => {
    if (!form.customer_service) return workOrders;
    return workOrders.filter(
      (wo) => !wo.customer_service || String(wo.customer_service) === String(form.customer_service)
    );
  }, [workOrders, form.customer_service]);

  // Client-side filtering for fast searching
  const filteredRows = useMemo(() => {
    let result = rows;
    if (resultFilter !== "all") {
      result = result.filter((r) => r.result === resultFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.customer_name?.toLowerCase().includes(q) ||
          r.service_identifier?.toLowerCase().includes(q) ||
          r.technician_name?.toLowerCase().includes(q) ||
          r.visit_type?.toLowerCase().includes(q) ||
          r.notes?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [rows, resultFilter, search]);

  // Counts for summary metrics
  const metrics = useMemo(() => {
    let resolved = 0;
    let pendingParts = 0;
    let rescheduledOrUnavailable = 0;
    rows.forEach((r) => {
      if (r.result === "resolved") resolved += 1;
      else if (r.result === "pending_parts") pendingParts += 1;
      else rescheduledOrUnavailable += 1;
    });
    return {
      total: count || rows.length,
      resolved,
      pendingParts,
      rescheduledOrUnavailable,
    };
  }, [rows, count]);

  const getResultBadge = (res: string) => {
    const opt = RESULT_OPTIONS.find((o) => o.value === res);
    const label =
      language === "fa"
        ? opt?.labelFa
        : language === "ps"
        ? opt?.labelPs
        : opt?.labelEn ?? res;
    const badgeClass =
      opt?.badgeClass ?? "bg-slate-500/10 text-slate-400 border-slate-500/30";

    return (
      <span
        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${badgeClass}`}
      >
        {label}
      </span>
    );
  };

  const getVisitTypeLabel = (vt: string) => {
    const preset = VISIT_TYPE_PRESETS.find((p) => p.value === vt);
    if (!preset) return vt;
    return language === "fa"
      ? preset.labelFa
      : language === "ps"
      ? preset.labelPs
      : preset.labelEn;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-100 dark:text-white flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              <Truck className="h-6 w-6" />
            </div>
            {c.title}
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {c.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-700/60 dark:border-white/10 bg-white/60 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:border-cyan-400/40 hover:text-cyan-600 dark:hover:text-cyan-300 transition-all shadow-sm"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 active:bg-cyan-700 text-white font-bold text-xs md:text-sm shadow-lg shadow-cyan-500/25 transition-all hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4" />
            {c.newVisit}
          </button>
        </div>
      </div>

      {/* Notice Banner */}
      {notice && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between text-xs md:text-sm transition-all ${
            notice.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {notice.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{notice.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="p-1 hover:opacity-75 transition-opacity"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/55 dark:bg-white/5 shadow-sm backdrop-blur-xl">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
            {c.totalVisits}
          </div>
          <div className="text-xl md:text-2xl font-black text-slate-200 dark:text-white mt-1">
            {metrics.total}
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] shadow-sm backdrop-blur-xl">
          <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
            {c.resolvedVisits}
          </div>
          <div className="text-xl md:text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
            {metrics.resolved}
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] shadow-sm backdrop-blur-xl">
          <div className="text-xs font-bold text-amber-600 dark:text-amber-400">
            {c.pendingPartsVisits}
          </div>
          <div className="text-xl md:text-2xl font-black text-amber-700 dark:text-amber-300 mt-1">
            {metrics.pendingParts}
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-sky-500/20 bg-sky-500/[0.04] shadow-sm backdrop-blur-xl">
          <div className="text-xs font-bold text-sky-600 dark:text-sky-400">
            {c.rescheduledVisits}
          </div>
          <div className="text-xl md:text-2xl font-black text-sky-700 dark:text-sky-300 mt-1">
            {metrics.rescheduledOrUnavailable}
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-xl">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={c.searchPlaceholder}
            className="w-full ps-9 pe-4 py-2 rounded-xl text-xs md:text-sm bg-slate-950/40 dark:bg-white/5 border border-slate-700/60 dark:border-white/10 focus:outline-none focus:border-cyan-400 text-slate-200 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400 shrink-0" />
          <select
            value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value)}
            className="py-2 px-3 rounded-xl text-xs md:text-sm bg-slate-950/40 dark:bg-slate-900 border border-slate-700/60 dark:border-white/10 focus:outline-none focus:border-cyan-400 text-slate-200 dark:text-slate-100"
          >
            <option value="all">{c.allResults}</option>
            {RESULT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {language === "fa"
                  ? opt.labelFa
                  : language === "ps"
                  ? opt.labelPs
                  : opt.labelEn}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs md:text-sm">
            <thead>
              <tr className="border-b border-slate-700/60 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] text-slate-500 dark:text-slate-400 font-bold">
                <th className="py-3 px-4 text-start">{c.customerName}</th>
                <th className="py-3 px-4 text-start">{c.serviceIdentifier}</th>
                <th className="py-3 px-4 text-start">{c.visitType}</th>
                <th className="py-3 px-4 text-start">{c.technicianName}</th>
                <th className="py-3 px-4 text-start">{c.visitedAt}</th>
                <th className="py-3 px-4 text-start">{c.result}</th>
                <th className="py-3 px-4 text-end">{c.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-slate-200">
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin text-cyan-400" />
                      <span>{c.loading}</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    {c.noRecords}
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-cyan-500/[0.04] transition-colors"
                  >
                    <td className="py-3 px-4 font-semibold text-slate-100 dark:text-white">
                      {row.customer_name || "—"}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-cyan-600 dark:text-cyan-400">
                      {row.service_identifier || "—"}
                    </td>
                    <td className="py-3 px-4">
                      {getVisitTypeLabel(row.visit_type)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        {row.technician_name || "—"}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-500 dark:text-slate-400">
                      {row.visited_at
                        ? new Date(row.visited_at).toLocaleString()
                        : "—"}
                    </td>
                    <td className="py-3 px-4">{getResultBadge(row.result)}</td>
                    <td className="py-3 px-4 text-end">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openView(row)}
                          className="px-2.5 py-1 rounded-lg border border-slate-700/60 dark:border-white/10 hover:border-cyan-400/40 text-slate-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-300 text-xs font-semibold transition-all"
                        >
                          {c.view}
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20 text-xs font-semibold transition-all"
                        >
                          {c.edit}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700/60 dark:border-white/10 text-xs text-slate-500 dark:text-slate-400 bg-slate-50/30 dark:bg-white/[0.01]">
          <div>
            {c.page} {page} / {totalPages} ({count} {c.records})
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-700/60 dark:border-white/10 disabled:opacity-40 hover:border-cyan-400/40 transition-all font-semibold"
            >
              {c.previous}
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-700/60 dark:border-white/10 disabled:opacity-40 hover:border-cyan-400/40 transition-all font-semibold"
            >
              {c.next}
            </button>
          </div>
        </div>
      </div>

      {/* Modal Dialog: Create / Edit / View */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200/80 dark:border-white/15 bg-slate-950/40 dark:bg-slate-900 p-6 shadow-2xl space-y-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/70 dark:border-white/10">
              <h2 className="text-lg font-black text-slate-100 dark:text-white flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                  <Truck className="h-5 w-5" />
                </div>
                {modalMode === "create"
                  ? c.createVisit
                  : modalMode === "edit"
                  ? c.editVisit
                  : c.viewDetails}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="p-1.5 rounded-xl hover:bg-slate-900/70 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            {modalMode === "view" && selected ? (
              <div className="space-y-4 text-xs md:text-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-2xl border border-slate-200/70 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
                    <div className="text-xs font-bold text-slate-400">
                      {c.customerName}
                    </div>
                    <div className="text-sm font-black text-slate-100 dark:text-white mt-1">
                      {selected.customer_name || "—"}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-slate-200/70 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
                    <div className="text-xs font-bold text-slate-400">
                      {c.serviceIdentifier}
                    </div>
                    <div className="text-sm font-mono font-bold text-cyan-600 dark:text-cyan-400 mt-1">
                      {selected.service_identifier || "—"}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-slate-200/70 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
                    <div className="text-xs font-bold text-slate-400">
                      {c.visitType}
                    </div>
                    <div className="text-sm font-bold text-slate-200 dark:text-slate-100 mt-1">
                      {getVisitTypeLabel(selected.visit_type)}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-slate-200/70 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
                    <div className="text-xs font-bold text-slate-400">
                      {c.technicianName}
                    </div>
                    <div className="text-sm font-bold text-slate-200 dark:text-slate-100 mt-1 flex items-center gap-1.5">
                      <User className="h-4 w-4 text-slate-400" />
                      {selected.technician_name || "—"}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-slate-200/70 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
                    <div className="text-xs font-bold text-slate-400">
                      {c.visitedAt}
                    </div>
                    <div className="text-xs font-mono text-slate-700 dark:text-slate-300 mt-1">
                      {selected.visited_at
                        ? new Date(selected.visited_at).toLocaleString()
                        : "—"}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-slate-200/70 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
                    <div className="text-xs font-bold text-slate-400">
                      {c.result}
                    </div>
                    <div className="mt-1">
                      {getResultBadge(selected.result)}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-slate-200/70 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
                    <div className="text-xs font-bold text-slate-400">
                      {c.faultTicket}
                    </div>
                    <div className="text-xs font-mono text-slate-700 dark:text-slate-300 mt-1">
                      {selected.fault_ticket ? String(selected.fault_ticket) : c.noTicket}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-slate-200/70 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
                    <div className="text-xs font-bold text-slate-400">
                      {c.workOrder}
                    </div>
                    <div className="text-xs font-mono text-slate-700 dark:text-slate-300 mt-1">
                      {selected.installation_work_order
                        ? String(selected.installation_work_order)
                        : c.noWorkOrder}
                    </div>
                  </div>
                </div>

                {selected.notes && (
                  <div className="p-4 rounded-2xl border border-slate-200/70 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] space-y-1">
                    <div className="text-xs font-bold text-slate-400">
                      {c.notes}
                    </div>
                    <div className="text-xs md:text-sm text-slate-200 dark:text-slate-200 whitespace-pre-wrap">
                      {selected.notes}
                    </div>
                  </div>
                )}

                <div className="p-3 rounded-2xl bg-slate-100/50 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/5 grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400">
                  <div>
                    {c.created}:{" "}
                    {selected.created_at
                      ? new Date(selected.created_at).toLocaleString()
                      : "—"}
                  </div>
                  <div>
                    {c.updated}:{" "}
                    {selected.updated_at
                      ? new Date(selected.updated_at).toLocaleString()
                      : "—"}
                  </div>
                  <div className="col-span-2 truncate">
                    {c.id}: {selected.id}
                  </div>
                </div>

                <div className="flex justify-end pt-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-5 py-2.5 rounded-xl border border-slate-700/60 dark:border-white/10 bg-slate-900/55 dark:bg-white/5 font-bold text-xs md:text-sm hover:border-cyan-400/40 transition-all"
                  >
                    {c.cancel}
                  </button>
                </div>
              </div>
            ) : (
              /* Create or Edit Form */
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Customer Service Selection */}
                  <Field label={c.customerService} required>
                    <select
                      value={form.customer_service}
                      onChange={(e) =>
                        setForm({ ...form, customer_service: e.target.value })
                      }
                      disabled={modalMode === "edit"}
                      className="w-full px-3 py-2 rounded-xl text-xs md:text-sm bg-slate-950/40 dark:bg-slate-800 border border-slate-700/60 dark:border-white/10 focus:outline-none focus:border-cyan-400 text-slate-100 dark:text-slate-100 disabled:opacity-60"
                      required
                    >
                      <option value="">{c.selectService}</option>
                      {services.map((svc) => (
                        <option key={svc.id} value={svc.id}>
                          {svc.customer_name ? `${svc.customer_name} — ` : ""}
                          {svc.identifier} ({svc.service_name || "Service"})
                        </option>
                      ))}
                    </select>
                  </Field>

                  {/* Visit Type */}
                  <Field label={c.visitType}>
                    <select
                      value={form.visit_type}
                      onChange={(e) =>
                        setForm({ ...form, visit_type: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl text-xs md:text-sm bg-slate-950/40 dark:bg-slate-800 border border-slate-700/60 dark:border-white/10 focus:outline-none focus:border-cyan-400 text-slate-100 dark:text-slate-100"
                    >
                      {VISIT_TYPE_PRESETS.map((vt) => (
                        <option key={vt.value} value={vt.value}>
                          {language === "fa"
                            ? vt.labelFa
                            : language === "ps"
                            ? vt.labelPs
                            : vt.labelEn}
                        </option>
                      ))}
                    </select>
                  </Field>

                  {/* Technician Name */}
                  <Field label={c.technicianName}>
                    <input
                      type="text"
                      value={form.technician_name}
                      onChange={(e) =>
                        setForm({ ...form, technician_name: e.target.value })
                      }
                      placeholder={c.technicianPlaceholder}
                      maxLength={160}
                      className="w-full px-3 py-2 rounded-xl text-xs md:text-sm bg-slate-950/40 dark:bg-slate-800 border border-slate-700/60 dark:border-white/10 focus:outline-none focus:border-cyan-400 text-slate-100 dark:text-slate-100"
                    />
                  </Field>

                  {/* Visited At Date-Time */}
                  <Field label={c.visitedAt}>
                    <input
                      type="datetime-local"
                      value={form.visited_at}
                      onChange={(e) =>
                        setForm({ ...form, visited_at: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl text-xs md:text-sm bg-slate-950/40 dark:bg-slate-800 border border-slate-700/60 dark:border-white/10 focus:outline-none focus:border-cyan-400 text-slate-100 dark:text-slate-100 font-mono"
                    />
                  </Field>

                  {/* Result Choice */}
                  <Field label={c.result} required>
                    <select
                      value={form.result}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          result: e.target.value as FormState["result"],
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl text-xs md:text-sm bg-slate-950/40 dark:bg-slate-800 border border-slate-700/60 dark:border-white/10 focus:outline-none focus:border-cyan-400 text-slate-100 dark:text-slate-100 font-semibold"
                      required
                    >
                      {RESULT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {language === "fa"
                            ? opt.labelFa
                            : language === "ps"
                            ? opt.labelPs
                            : opt.labelEn}
                        </option>
                      ))}
                    </select>
                  </Field>

                  {/* Optional Trouble Ticket */}
                  <Field label={c.faultTicket}>
                    <select
                      value={form.fault_ticket}
                      onChange={(e) =>
                        setForm({ ...form, fault_ticket: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl text-xs md:text-sm bg-slate-950/40 dark:bg-slate-800 border border-slate-700/60 dark:border-white/10 focus:outline-none focus:border-cyan-400 text-slate-100 dark:text-slate-100"
                    >
                      <option value="">{c.noTicket}</option>
                      {relevantTickets.map((tkt) => (
                        <option key={tkt.id} value={tkt.id}>
                          {tkt.ticket_number
                            ? `[${tkt.ticket_number}] `
                            : ""}
                          {tkt.subject || "Ticket"} ({tkt.status || "open"})
                        </option>
                      ))}
                    </select>
                  </Field>

                  {/* Optional Work Order */}
                  <div className="md:col-span-2">
                    <Field label={c.workOrder}>
                      <select
                        value={form.installation_work_order}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            installation_work_order: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl text-xs md:text-sm bg-slate-950/40 dark:bg-slate-800 border border-slate-700/60 dark:border-white/10 focus:outline-none focus:border-cyan-400 text-slate-100 dark:text-slate-100"
                      >
                        <option value="">{c.noWorkOrder}</option>
                        {relevantWorkOrders.map((wo) => (
                          <option key={wo.id} value={wo.id}>
                            {wo.order_number
                              ? `[${wo.order_number}] `
                              : ""}
                            {wo.work_type || "Installation"} ({wo.status || "pending"})
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </div>

                {/* Notes Textarea */}
                <Field label={c.notes}>
                  <textarea
                    rows={3}
                    value={form.notes}
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
                    placeholder={c.notesPlaceholder}
                    className="w-full px-3 py-2 rounded-xl text-xs md:text-sm bg-slate-950/40 dark:bg-slate-800 border border-slate-700/60 dark:border-white/10 focus:outline-none focus:border-cyan-400 text-slate-100 dark:text-slate-100 resize-none"
                  />
                </Field>

                {/* Form Buttons */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/70 dark:border-white/10">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={saving}
                    className="px-4 py-2 rounded-xl border border-slate-700/60 dark:border-white/10 bg-slate-900/55 dark:bg-white/5 font-bold text-xs md:text-sm hover:border-cyan-400/40 transition-all"
                  >
                    {c.cancel}
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 active:bg-cyan-700 text-white font-bold text-xs md:text-sm shadow-lg shadow-cyan-500/25 transition-all disabled:opacity-50"
                  >
                    {saving && <RefreshCw className="h-4 w-4 animate-spin" />}
                    {c.save}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
