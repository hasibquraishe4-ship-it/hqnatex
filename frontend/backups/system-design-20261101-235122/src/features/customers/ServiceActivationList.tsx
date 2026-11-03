import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  collectAllPages,
  fetchers,
  serviceActivationApi,
  type Paginated,
  type Session,
} from "../../lib/api";

import {
  useTranslation,
} from "../../lib/i18n";


type ActivationType =
  | "initial"
  | "reactivation"
  | "migration"
  | "upgrade";


type ActivationStatus =
  | "pending"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";


type ServiceActivation = {
  id: string;

  tenant: string;
  company: string;

  customer_service: string;

  customer_name: string;
  service_identifier: string;
  service_name: string;

  activation_type: ActivationType;
  status: ActivationStatus;

  requested_at: string;
  scheduled_at: string | null;
  activated_at: string | null;

  activated_by: string;
  notes: string;

  created_at: string;
  updated_at: string;
};


type CustomerServiceOption = {
  id: string;

  customer_name?: string;
  service_name?: string;
  package_name?: string | null;

  identifier?: string;
  username?: string;

  status?: string;
};


type ActivationForm = {
  customer_service: string;

  activation_type: ActivationType;
  status: ActivationStatus;

  requested_at: string;
  scheduled_at: string;
  activated_at: string;

  activated_by: string;
  notes: string;
};


type ModalMode =
  | "create"
  | "view"
  | "edit"
  | null;


type Notice = {
  type: "success" | "error";
  message: string;
};


const PAGE_SIZE = 25;


const copy = {
  en: {
    title: "Service Activations",
    subtitle:
      "Manage initial activations, reactivations, migrations and service upgrades.",

    newActivation: "New activation",
    createActivation: "Create activation",
    editActivation: "Edit activation",
    activationDetails: "Activation details",

    customer: "Customer",
    customerService: "Customer service",
    service: "Service",
    identifier: "Identifier",

    activationType: "Activation type",
    status: "Status",

    requestedAt: "Requested at",
    scheduledAt: "Scheduled at",
    activatedAt: "Activated at",
    activatedBy: "Activated by",

    notes: "Notes",
    actions: "Actions",

    view: "View",
    edit: "Edit",
    save: "Save",
    cancel: "Cancel",
    close: "Close",

    allStatuses: "All statuses",
    allServices: "All customer services",

    loading: "Loading...",
    noRecords: "No activation records found.",

    previous: "Previous",
    next: "Next",
    page: "Page",
    records: "records",

    initial: "Initial activation",
    reactivation: "Reactivation",
    migration: "Migration",
    upgrade: "Upgrade",

    pending: "Pending",
    scheduled: "Scheduled",
    in_progress: "In progress",
    completed: "Completed",
    cancelled: "Cancelled",

    selectCustomerService:
      "Select customer service",

    customerServiceRequired:
      "Customer service is required.",

    created:
      "Activation created successfully.",

    updated:
      "Activation updated successfully.",

    loadFailed:
      "Unable to load activation records.",

    saveFailed:
      "Unable to save activation.",

    loadingServices:
      "Loading customer services...",

    noCustomerServices:
      "No customer services are available.",

    optional: "Optional",
  },

  fa: {
    title: "فعال‌سازی خدمات مشترکین",
    subtitle:
      "مدیریت فعال‌سازی اولیه، فعال‌سازی مجدد، انتقال و ارتقای خدمات مشترکین.",

    newActivation: "فعال‌سازی جدید",
    createActivation: "ثبت فعال‌سازی",
    editActivation: "ویرایش فعال‌سازی",
    activationDetails: "جزئیات فعال‌سازی",

    customer: "مشترک",
    customerService: "خدمت مشترک",
    service: "خدمت",
    identifier: "شناسه",

    activationType: "نوع فعال‌سازی",
    status: "وضعیت",

    requestedAt: "تاریخ درخواست",
    scheduledAt: "تاریخ برنامه‌ریزی",
    activatedAt: "تاریخ فعال‌سازی",
    activatedBy: "فعال‌شده توسط",

    notes: "یادداشت",
    actions: "عملیات",

    view: "مشاهده",
    edit: "ویرایش",
    save: "ذخیره",
    cancel: "انصراف",
    close: "بستن",

    allStatuses: "همه وضعیت‌ها",
    allServices: "همه خدمات مشترکین",

    loading: "در حال بارگذاری...",
    noRecords: "هیچ فعال‌سازی ثبت نشده است.",

    previous: "قبلی",
    next: "بعدی",
    page: "صفحه",
    records: "رکورد",

    initial: "فعال‌سازی اولیه",
    reactivation: "فعال‌سازی مجدد",
    migration: "انتقال",
    upgrade: "ارتقا",

    pending: "در انتظار",
    scheduled: "برنامه‌ریزی‌شده",
    in_progress: "در حال اجرا",
    completed: "تکمیل‌شده",
    cancelled: "لغوشده",

    selectCustomerService:
      "خدمت مشترک را انتخاب کنید",

    customerServiceRequired:
      "انتخاب خدمت مشترک الزامی است.",

    created:
      "فعال‌سازی با موفقیت ثبت شد.",

    updated:
      "فعال‌سازی با موفقیت ویرایش شد.",

    loadFailed:
      "بارگذاری فعال‌سازی‌ها ممکن نشد.",

    saveFailed:
      "ذخیره فعال‌سازی ممکن نشد.",

    loadingServices:
      "در حال بارگذاری خدمات مشترکین...",

    noCustomerServices:
      "هیچ خدمت مشترکی موجود نیست.",

    optional: "اختیاری",
  },

  ps: {
    title: "د پېرودونکو د خدمتونو فعالول",
    subtitle:
      "لومړنی فعالول، بیا فعالول، انتقال او د خدمتونو ارتقا مدیریت کړئ.",

    newActivation: "نوی فعالول",
    createActivation: "فعالول ثبت کړئ",
    editActivation: "فعالول سمول",
    activationDetails: "د فعالولو معلومات",

    customer: "پېرودونکی",
    customerService: "د پېرودونکي خدمت",
    service: "خدمت",
    identifier: "پېژند",

    activationType: "د فعالولو ډول",
    status: "حالت",

    requestedAt: "د غوښتنې وخت",
    scheduledAt: "ټاکل شوی وخت",
    activatedAt: "د فعالېدو وخت",
    activatedBy: "فعال کوونکی",

    notes: "یادښتونه",
    actions: "کړنې",

    view: "کتل",
    edit: "سمول",
    save: "خوندي کول",
    cancel: "لغوه",
    close: "بندول",

    allStatuses: "ټول حالتونه",
    allServices: "د پېرودونکو ټول خدمتونه",

    loading: "بارېږي...",
    noRecords: "د فعالولو هېڅ ریکارډ نشته.",

    previous: "مخکینی",
    next: "بل",
    page: "پاڼه",
    records: "ریکارډونه",

    initial: "لومړنی فعالول",
    reactivation: "بیا فعالول",
    migration: "انتقال",
    upgrade: "ارتقا",

    pending: "په تمه",
    scheduled: "مهالویش شوی",
    in_progress: "د اجرا په حال کې",
    completed: "بشپړ شوی",
    cancelled: "لغوه شوی",

    selectCustomerService:
      "د پېرودونکي خدمت وټاکئ",

    customerServiceRequired:
      "د پېرودونکي خدمت ټاکل اړین دي.",

    created:
      "فعالول په بریالیتوب ثبت شو.",

    updated:
      "فعالول په بریالیتوب بدل شو.",

    loadFailed:
      "د فعالولو ریکارډونه ونه لوستل شول.",

    saveFailed:
      "فعالول خوندي نه شو.",

    loadingServices:
      "د پېرودونکو خدمتونه بارېږي...",

    noCustomerServices:
      "د پېرودونکي هېڅ خدمت نشته.",

    optional: "اختیاري",
  },
} as const;


function localDateTimeNow(): string {
  const now = new Date();

  const local =
    new Date(
      now.getTime() -
        now.getTimezoneOffset() * 60_000,
    );

  return local
    .toISOString()
    .slice(0, 16);
}


function toDateTimeInput(
  value?: string | null,
): string {
  if (!value) return "";

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "";
  }

  const local =
    new Date(
      date.getTime() -
        date.getTimezoneOffset() * 60_000,
    );

  return local
    .toISOString()
    .slice(0, 16);
}


function toApiDateTime(
  value: string,
): string | null {
  if (!value) return null;

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }

  return date.toISOString();
}


function initialForm(): ActivationForm {
  return {
    customer_service: "",

    activation_type:
      "initial",

    status:
      "pending",

    requested_at:
      localDateTimeNow(),

    scheduled_at: "",
    activated_at: "",

    activated_by: "",
    notes: "",
  };
}


function activationTypeClass(
  value: ActivationType,
): string {
  if (value === "initial") {
    return "border-cyan-400/20 bg-cyan-400/10 text-cyan-300";
  }

  if (value === "reactivation") {
    return "border-violet-400/20 bg-violet-400/10 text-violet-300";
  }

  if (value === "migration") {
    return "border-amber-400/20 bg-amber-400/10 text-amber-300";
  }

  return "border-blue-400/20 bg-blue-400/10 text-blue-300";
}


function statusClass(
  value: ActivationStatus,
): string {
  if (value === "completed") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  }

  if (value === "cancelled") {
    return "border-rose-400/20 bg-rose-400/10 text-rose-300";
  }

  if (value === "in_progress") {
    return "border-cyan-400/20 bg-cyan-400/10 text-cyan-300";
  }

  if (value === "scheduled") {
    return "border-blue-400/20 bg-blue-400/10 text-blue-300";
  }

  return "border-amber-400/20 bg-amber-400/10 text-amber-300";
}


export function ServiceActivationList({
  session,
}: {
  session: Session;
}) {
  const {
    language,
  } = useTranslation();

  const lang =
    language === "fa" ||
    language === "ps"
      ? language
      : "en";

  const ui =
    copy[lang];


  const [
    data,
    setData,
  ] =
    useState<
      Paginated<ServiceActivation>
    >({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });


  const [
    customerServices,
    setCustomerServices,
  ] =
    useState<
      CustomerServiceOption[]
    >([]);


  const [
    page,
    setPage,
  ] =
    useState(1);


  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState("");


  const [
    customerServiceFilter,
    setCustomerServiceFilter,
  ] =
    useState("");


  const [
    loading,
    setLoading,
  ] =
    useState(false);


  const [
    serviceLoading,
    setServiceLoading,
  ] =
    useState(false);


  const [
    error,
    setError,
  ] =
    useState("");


  const [
    notice,
    setNotice,
  ] =
    useState<Notice | null>(
      null,
    );


  const [
    refreshKey,
    setRefreshKey,
  ] =
    useState(0);


  const [
    modalMode,
    setModalMode,
  ] =
    useState<ModalMode>(
      null,
    );


  const [
    selected,
    setSelected,
  ] =
    useState<
      ServiceActivation | null
    >(null);


  const [
    form,
    setForm,
  ] =
    useState<ActivationForm>(
      initialForm(),
    );


  const [
    saving,
    setSaving,
  ] =
    useState(false);


  useEffect(() => {
    let cancelled = false;

    async function loadCustomerServices() {
      setServiceLoading(true);

      try {
        const response =
          await collectAllPages<
            CustomerServiceOption
          >(
            (params) =>
              fetchers.customerServices(
                session,
                params,
              ),
            "?ordering=customer__display_name",
          );

        if (!cancelled) {
          setCustomerServices(
            response.results,
          );
        }
      } catch {
        if (!cancelled) {
          setCustomerServices([]);
        }
      } finally {
        if (!cancelled) {
          setServiceLoading(false);
        }
      }
    }

    void loadCustomerServices();

    return () => {
      cancelled = true;
    };
  }, [
    session.access,
    session.tenantId,
    session.companyId,
  ]);


  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const params =
          new URLSearchParams();

        params.set(
          "page",
          String(page),
        );

        params.set(
          "page_size",
          String(PAGE_SIZE),
        );

        if (statusFilter) {
          params.set(
            "status",
            statusFilter,
          );
        }

        if (
          customerServiceFilter
        ) {
          params.set(
            "customer_service",
            customerServiceFilter,
          );
        }

        const response =
          await fetchers
            .customerServiceActivations(
              session,
              `?${params.toString()}`,
            );

        if (!cancelled) {
          setData(
            response as Paginated<
              ServiceActivation
            >,
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : ui.loadFailed,
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [
    session.access,
    session.tenantId,
    session.companyId,
    page,
    statusFilter,
    customerServiceFilter,
    refreshKey,
    ui.loadFailed,
  ]);


  const pageCount =
    Math.max(
      1,
      Math.ceil(
        data.count /
          PAGE_SIZE,
      ),
    );


  const selectedService =
    useMemo(
      () =>
        customerServices.find(
          (item) =>
            item.id ===
            form.customer_service,
        ) || null,
      [
        customerServices,
        form.customer_service,
      ],
    );


  function typeLabel(
    value: ActivationType,
  ): string {
    return ui[value];
  }


  function statusLabel(
    value: ActivationStatus,
  ): string {
    return ui[value];
  }


  function formatDate(
    value?: string | null,
  ): string {
    if (!value) return "—";

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      return value;
    }

    try {
      return new Intl.DateTimeFormat(
        lang === "fa"
          ? "fa-AF"
          : lang === "ps"
            ? "ps-AF"
            : "en-GB",
        {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        },
      ).format(date);
    } catch {
      return date.toLocaleString();
    }
  }


  function serviceOptionLabel(
    row: CustomerServiceOption,
  ): string {
    return [
      row.customer_name,
      row.identifier,
      row.service_name,
    ]
      .filter(Boolean)
      .join(" — ");
  }


  function openCreate() {
    setSelected(null);
    setForm(
      initialForm(),
    );
    setError("");
    setNotice(null);
    setModalMode("create");
  }


  function openView(
    row: ServiceActivation,
  ) {
    setSelected(row);
    setError("");
    setNotice(null);
    setModalMode("view");
  }


  function openEdit(
    row: ServiceActivation,
  ) {
    setSelected(row);

    setForm({
      customer_service:
        row.customer_service,

      activation_type:
        row.activation_type,

      status:
        row.status,

      requested_at:
        toDateTimeInput(
          row.requested_at,
        ),

      scheduled_at:
        toDateTimeInput(
          row.scheduled_at,
        ),

      activated_at:
        toDateTimeInput(
          row.activated_at,
        ),

      activated_by:
        row.activated_by || "",

      notes:
        row.notes || "",
    });

    setError("");
    setNotice(null);
    setModalMode("edit");
  }


  function closeModal() {
    if (saving) return;

    setModalMode(null);
    setSelected(null);
    setError("");
  }


  function updateForm<
    K extends keyof ActivationForm,
  >(
    key: K,
    value: ActivationForm[K],
  ) {
    setForm(
      (current) => ({
        ...current,
        [key]: value,
      }),
    );
  }


  async function submit() {
    if (
      !form.customer_service
    ) {
      setError(
        ui.customerServiceRequired,
      );
      return;
    }

    setSaving(true);
    setError("");
    setNotice(null);

    const requestedAt =
      toApiDateTime(
        form.requested_at,
      );

    const scheduledAt =
      toApiDateTime(
        form.scheduled_at,
      );

    const activatedAt =
      toApiDateTime(
        form.activated_at,
      );

    const payload = {
      customer_service:
        form.customer_service,

      activation_type:
        form.activation_type,

      status:
        form.status,

      requested_at:
        requestedAt,

      scheduled_at:
        scheduledAt,

      activated_at:
        activatedAt,

      activated_by:
        form.activated_by.trim(),

      notes:
        form.notes.trim(),
    };

    try {
      if (
        modalMode ===
        "create"
      ) {
        await serviceActivationApi
          .create(
            session,
            payload,
          );

        setPage(1);

        setNotice({
          type: "success",
          message: ui.created,
        });
      } else if (
        modalMode ===
          "edit" &&
        selected
      ) {
        await serviceActivationApi
          .update(
            session,
            selected.id,
            payload,
          );

        setNotice({
          type: "success",
          message: ui.updated,
        });
      }

      setModalMode(null);
      setSelected(null);

      setRefreshKey(
        (value) =>
          value + 1,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : ui.saveFailed,
      );
    } finally {
      setSaving(false);
    }
  }


  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            {ui.title}
          </h2>

          <p className="mt-1 max-w-3xl text-sm font-medium text-slate-500">
            {ui.subtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-cyan-500 px-5 text-sm font-black text-slate-950 transition hover:bg-cyan-400 active:scale-[.98]"
        >
          {ui.newActivation}
        </button>
      </div>


      {notice && (
        <div
          className={
            notice.type ===
            "success"
              ? "rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-300"
              : "rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm font-bold text-rose-300"
          }
        >
          {notice.message}
        </div>
      )}


      <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-4 lg:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-xs font-bold text-slate-500">
            {ui.status}
          </span>

          <select
            value={
              statusFilter
            }
            onChange={(event) => {
              setStatusFilter(
                event.target.value,
              );
              setPage(1);
            }}
            className="glass-input w-full"
          >
            <option value="">
              {ui.allStatuses}
            </option>

            {(
              [
                "pending",
                "scheduled",
                "in_progress",
                "completed",
                "cancelled",
              ] as ActivationStatus[]
            ).map(
              (status) => (
                <option
                  key={status}
                  value={status}
                >
                  {statusLabel(
                    status,
                  )}
                </option>
              ),
            )}
          </select>
        </label>


        <label className="space-y-1.5">
          <span className="text-xs font-bold text-slate-500">
            {ui.customerService}
          </span>

          <select
            value={
              customerServiceFilter
            }
            onChange={(event) => {
              setCustomerServiceFilter(
                event.target.value,
              );
              setPage(1);
            }}
            className="glass-input w-full"
          >
            <option value="">
              {ui.allServices}
            </option>

            {customerServices.map(
              (row) => (
                <option
                  key={row.id}
                  value={row.id}
                >
                  {serviceOptionLabel(
                    row,
                  )}
                </option>
              ),
            )}
          </select>
        </label>
      </div>


      {error &&
        !modalMode && (
          <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm font-bold text-rose-300">
            {error}
          </div>
        )}


      <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40">
        <div className="overflow-x-auto">
          <table className="min-w-[1180px] w-full text-sm">
            <thead className="border-b border-white/10 bg-white/[.03]">
              <tr className="text-start text-xs font-black text-slate-500">
                <th className="px-4 py-4 text-start">
                  {ui.customer}
                </th>

                <th className="px-4 py-4 text-start">
                  {ui.identifier}
                </th>

                <th className="px-4 py-4 text-start">
                  {ui.service}
                </th>

                <th className="px-4 py-4 text-start">
                  {ui.activationType}
                </th>

                <th className="px-4 py-4 text-start">
                  {ui.status}
                </th>

                <th className="px-4 py-4 text-start">
                  {ui.requestedAt}
                </th>

                <th className="px-4 py-4 text-start">
                  {ui.scheduledAt}
                </th>

                <th className="px-4 py-4 text-start">
                  {ui.activatedAt}
                </th>

                <th className="px-4 py-4 text-start">
                  {ui.actions}
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-12 text-center font-bold text-slate-500"
                  >
                    {ui.loading}
                  </td>
                </tr>
              ) : data.results.length ===
                0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-12 text-center font-bold text-slate-500"
                  >
                    {ui.noRecords}
                  </td>
                </tr>
              ) : (
                data.results.map(
                  (row) => (
                    <tr
                      key={row.id}
                      className="transition hover:bg-white/[.025]"
                    >
                      <td className="px-4 py-4 font-bold text-white">
                        {row.customer_name ||
                          "—"}
                      </td>

                      <td className="px-4 py-4 font-mono text-xs text-cyan-300">
                        {row.service_identifier ||
                          "—"}
                      </td>

                      <td className="px-4 py-4 text-slate-300">
                        {row.service_name ||
                          "—"}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-black ${activationTypeClass(
                            row.activation_type,
                          )}`}
                        >
                          {typeLabel(
                            row.activation_type,
                          )}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-black ${statusClass(
                            row.status,
                          )}`}
                        >
                          {statusLabel(
                            row.status,
                          )}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-slate-400">
                        {formatDate(
                          row.requested_at,
                        )}
                      </td>

                      <td className="px-4 py-4 text-slate-400">
                        {formatDate(
                          row.scheduled_at,
                        )}
                      </td>

                      <td className="px-4 py-4 text-slate-400">
                        {formatDate(
                          row.activated_at,
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              openView(
                                row,
                              )
                            }
                            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:bg-white/10"
                          >
                            {ui.view}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              openEdit(
                                row,
                              )
                            }
                            className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-bold text-cyan-300 transition hover:bg-cyan-400/15"
                          >
                            {ui.edit}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ),
                )
              )}
            </tbody>
          </table>
        </div>


        <div className="flex flex-col gap-3 border-t border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs font-bold text-slate-500">
            {ui.page}{" "}
            {page} /{" "}
            {pageCount}
            {" · "}
            {data.count}{" "}
            {ui.records}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={
                !data.previous ||
                loading
              }
              onClick={() =>
                setPage(
                  (value) =>
                    Math.max(
                      1,
                      value - 1,
                    ),
                )
              }
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {ui.previous}
            </button>

            <button
              type="button"
              disabled={
                !data.next ||
                loading
              }
              onClick={() =>
                setPage(
                  (value) =>
                    value + 1,
                )
              }
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {ui.next}
            </button>
          </div>
        </div>
      </div>


      {modalMode && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] border border-white/10 bg-slate-950 p-6 shadow-2xl lg:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-white">
                  {modalMode ===
                  "create"
                    ? ui.createActivation
                    : modalMode ===
                        "edit"
                      ? ui.editActivation
                      : ui.activationDetails}
                </h3>

                {selected && (
                  <p className="mt-1 text-xs font-medium text-slate-500">
                    {selected.customer_name}
                    {" · "}
                    {selected.service_identifier}
                    {" · "}
                    {selected.service_name}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300"
              >
                {ui.close}
              </button>
            </div>


            {error && (
              <div className="mb-5 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm font-bold text-rose-300">
                {error}
              </div>
            )}


            {modalMode ===
            "view" ? (
              selected && (
                <div className="grid gap-4 md:grid-cols-2">
                  <Info
                    label={
                      ui.customer
                    }
                    value={
                      selected.customer_name
                    }
                  />

                  <Info
                    label={
                      ui.identifier
                    }
                    value={
                      selected.service_identifier
                    }
                  />

                  <Info
                    label={
                      ui.service
                    }
                    value={
                      selected.service_name
                    }
                  />

                  <Info
                    label={
                      ui.activationType
                    }
                    value={typeLabel(
                      selected.activation_type,
                    )}
                  />

                  <Info
                    label={
                      ui.status
                    }
                    value={statusLabel(
                      selected.status,
                    )}
                  />

                  <Info
                    label={
                      ui.requestedAt
                    }
                    value={formatDate(
                      selected.requested_at,
                    )}
                  />

                  <Info
                    label={
                      ui.scheduledAt
                    }
                    value={formatDate(
                      selected.scheduled_at,
                    )}
                  />

                  <Info
                    label={
                      ui.activatedAt
                    }
                    value={formatDate(
                      selected.activated_at,
                    )}
                  />

                  <Info
                    label={
                      ui.activatedBy
                    }
                    value={
                      selected.activated_by ||
                      "—"
                    }
                  />

                  <div className="md:col-span-2">
                    <Info
                      label={
                        ui.notes
                      }
                      value={
                        selected.notes ||
                        "—"
                      }
                    />
                  </div>
                </div>
              )
            ) : (
              <div className="grid gap-5 md:grid-cols-2">
                <label className="space-y-1.5 md:col-span-2">
                  <span className="text-xs font-bold text-slate-500">
                    {ui.customerService}
                  </span>

                  <select
                    value={
                      form.customer_service
                    }
                    disabled={
                      modalMode ===
                        "edit" ||
                      serviceLoading
                    }
                    onChange={(event) =>
                      updateForm(
                        "customer_service",
                        event.target.value,
                      )
                    }
                    className="glass-input w-full disabled:opacity-60"
                  >
                    <option value="">
                      {serviceLoading
                        ? ui.loadingServices
                        : ui.selectCustomerService}
                    </option>

                    {customerServices.map(
                      (row) => (
                        <option
                          key={row.id}
                          value={row.id}
                        >
                          {serviceOptionLabel(
                            row,
                          )}
                        </option>
                      ),
                    )}
                  </select>

                  {!serviceLoading &&
                    customerServices.length ===
                      0 && (
                      <p className="text-xs font-medium text-amber-300">
                        {ui.noCustomerServices}
                      </p>
                    )}

                  {selectedService && (
                    <p className="text-xs font-medium text-cyan-300">
                      {serviceOptionLabel(
                        selectedService,
                      )}
                    </p>
                  )}
                </label>


                <label className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-500">
                    {ui.activationType}
                  </span>

                  <select
                    value={
                      form.activation_type
                    }
                    onChange={(event) =>
                      updateForm(
                        "activation_type",
                        event.target
                          .value as ActivationType,
                      )
                    }
                    className="glass-input w-full"
                  >
                    {(
                      [
                        "initial",
                        "reactivation",
                        "migration",
                        "upgrade",
                      ] as ActivationType[]
                    ).map(
                      (value) => (
                        <option
                          key={value}
                          value={value}
                        >
                          {typeLabel(
                            value,
                          )}
                        </option>
                      ),
                    )}
                  </select>
                </label>


                <label className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-500">
                    {ui.status}
                  </span>

                  <select
                    value={
                      form.status
                    }
                    onChange={(event) =>
                      updateForm(
                        "status",
                        event.target
                          .value as ActivationStatus,
                      )
                    }
                    className="glass-input w-full"
                  >
                    {(
                      [
                        "pending",
                        "scheduled",
                        "in_progress",
                        "completed",
                        "cancelled",
                      ] as ActivationStatus[]
                    ).map(
                      (value) => (
                        <option
                          key={value}
                          value={value}
                        >
                          {statusLabel(
                            value,
                          )}
                        </option>
                      ),
                    )}
                  </select>
                </label>


                <DateTimeField
                  label={
                    ui.requestedAt
                  }
                  value={
                    form.requested_at
                  }
                  onChange={(value) =>
                    updateForm(
                      "requested_at",
                      value,
                    )
                  }
                />


                <DateTimeField
                  label={`${ui.scheduledAt} (${ui.optional})`}
                  value={
                    form.scheduled_at
                  }
                  onChange={(value) =>
                    updateForm(
                      "scheduled_at",
                      value,
                    )
                  }
                />


                <DateTimeField
                  label={`${ui.activatedAt} (${ui.optional})`}
                  value={
                    form.activated_at
                  }
                  onChange={(value) =>
                    updateForm(
                      "activated_at",
                      value,
                    )
                  }
                />


                <label className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-500">
                    {ui.activatedBy}
                  </span>

                  <input
                    value={
                      form.activated_by
                    }
                    onChange={(event) =>
                      updateForm(
                        "activated_by",
                        event.target.value,
                      )
                    }
                    className="glass-input w-full"
                  />
                </label>


                <label className="space-y-1.5 md:col-span-2">
                  <span className="text-xs font-bold text-slate-500">
                    {ui.notes}
                  </span>

                  <textarea
                    value={
                      form.notes
                    }
                    onChange={(event) =>
                      updateForm(
                        "notes",
                        event.target.value,
                      )
                    }
                    rows={4}
                    className="glass-input w-full resize-y"
                  />
                </label>
              </div>
            )}


            <div className="mt-7 flex flex-wrap justify-end gap-3">
              {modalMode ===
              "view" ? (
                <>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold text-slate-300"
                  >
                    {ui.close}
                  </button>

                  {selected && (
                    <button
                      type="button"
                      onClick={() =>
                        openEdit(
                          selected,
                        )
                      }
                      className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-black text-slate-950"
                    >
                      {ui.edit}
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={saving}
                    className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold text-slate-300 disabled:opacity-50"
                  >
                    {ui.cancel}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      void submit()
                    }
                    disabled={saving}
                    className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-black text-slate-950 disabled:opacity-50"
                  >
                    {saving
                      ? ui.loading
                      : ui.save}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
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
    <div className="rounded-xl border border-white/10 bg-white/[.03] p-4">
      <div className="text-xs font-bold text-slate-500">
        {label}
      </div>

      <div className="mt-2 break-words text-sm font-bold text-slate-100">
        {value || "—"}
      </div>
    </div>
  );
}


function DateTimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (
    value: string,
  ) => void;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-bold text-slate-500">
        {label}
      </span>

      <input
        type="datetime-local"
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
        className="glass-input w-full"
      />
    </label>
  );
}
