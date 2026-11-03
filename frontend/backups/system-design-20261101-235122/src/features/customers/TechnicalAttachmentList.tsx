import {
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  fetchers,
  technicalAttachmentApi,
  type Session,
} from "../../lib/api";

import {
  useTranslation,
} from "../../lib/i18n";

type Props = {
  session: Session;
};

type Attachment = {
  id: string;
  customer_service: string;
  customer_name?: string;
  service_identifier?: string;
  activation?: string | null;
  installation?: string | null;
  fault_ticket?: string | null;
  title: string;
  document_type?: string;
  file_url: string;
  file_size_bytes?: number;
  uploaded_by?: string;
  created_at?: string;
  updated_at?: string;
};

type CustomerServiceOption = {
  id: string;
  customer_name?: string;
  service_name?: string;
  service_identifier?: string;
  identifier?: string;
};

type ActivationOption = {
  id: string;
  customer_service?: string;
  customer_name?: string;
  service_identifier?: string;
  activation_type?: string;
  status?: string;
};

type WorkOrderOption = {
  id: string;
  customer_service?: string;
  customer_name?: string;
  service_identifier?: string;
  order_number?: string;
  work_order_number?: string;
  status?: string;
};

type TicketOption = {
  id: string;
  customer_service?: string | null;
  customer_name?: string;
  service_identifier?: string;
  ticket_number?: string;
  subject?: string;
  status?: string;
};

type FormState = {
  customer_service: string;
  activation: string;
  installation: string;
  fault_ticket: string;
  title: string;
  document_type: string;
  file_url: string;
  file_size_bytes: string;
  uploaded_by: string;
};

type Mode =
  | "create"
  | "view"
  | "edit"
  | null;

type Notice = {
  type: "success" | "error";
  message: string;
};

const PAGE_SIZE = 25;

const DOCUMENT_TYPES = [
  "network_diagram",
  "site_photo",
  "test_report",
  "customer_contract_signed",
  "optical_trace",
  "other",
] as const;

const EMPTY_FORM: FormState = {
  customer_service: "",
  activation: "",
  installation: "",
  fault_ticket: "",
  title: "",
  document_type: "",
  file_url: "",
  file_size_bytes: "",
  uploaded_by: "",
};

const COPY: Record<
  "en" | "fa" | "ps",
  Record<string, string>
> = {
  en: {
    title: "Service Attachments",
    subtitle:
      "Technical documents, diagrams, photos, reports and file references linked to customer services.",
    add: "Add Attachment",
    create: "Add Service Attachment",
    edit: "Edit Attachment",
    details: "Attachment Details",
    search: "Search attachments...",
    customer: "Customer",
    customerService: "Customer Service",
    activation: "Activation",
    installation: "Installation Order",
    faultTicket: "Trouble Ticket",
    recordTitle: "Title",
    documentType: "Document Type",
    fileUrl: "File URL / Path",
    fileSize: "File Size (bytes)",
    uploadedBy: "Uploaded By",
    createdAt: "Created At",
    actions: "Actions",
    view: "View",
    editAction: "Edit",
    save: "Save",
    saving: "Saving...",
    cancel: "Cancel",
    select: "Select",
    none: "None",
    loading: "Loading...",
    noRecords: "No attachments found.",
    required:
      "Customer service, title and file URL/path are required.",
    created: "Attachment created successfully.",
    updated: "Attachment updated successfully.",
    loadFailed: "Unable to load attachments.",
    saveFailed: "Unable to save attachment.",
    previous: "Previous",
    next: "Next",
    page: "Page",
    records: "records",
    network_diagram: "Network Diagram",
    site_photo: "Site Photo",
    test_report: "Test Report",
    customer_contract_signed: "Signed Contract",
    optical_trace: "Optical Trace",
    other: "Other",
  },

  fa: {
    title: "ضمایم خدمات",
    subtitle:
      "اسناد تخنیکی، دیاگرام‌ها، تصاویر، گزارش‌ها و مراجع فایل مربوط به خدمات مشترکین.",
    add: "افزودن ضمیمه",
    create: "ثبت ضمیمه خدمت",
    edit: "ویرایش ضمیمه",
    details: "جزئیات ضمیمه",
    search: "جستجوی ضمایم...",
    customer: "مشترک",
    customerService: "خدمت مشترک",
    activation: "فعال‌سازی",
    installation: "امر نصب",
    faultTicket: "تیکت خرابی",
    recordTitle: "عنوان",
    documentType: "نوع سند",
    fileUrl: "آدرس / مسیر فایل",
    fileSize: "اندازه فایل به بایت",
    uploadedBy: "ثبت‌کننده",
    createdAt: "زمان ثبت",
    actions: "عملیات",
    view: "مشاهده",
    editAction: "ویرایش",
    save: "ذخیره",
    saving: "در حال ذخیره...",
    cancel: "انصراف",
    select: "انتخاب کنید",
    none: "بدون ارتباط",
    loading: "در حال بارگذاری...",
    noRecords: "هیچ ضمیمه‌ای موجود نیست.",
    required:
      "خدمت مشترک، عنوان و آدرس یا مسیر فایل الزامی است.",
    created: "ضمیمه با موفقیت ثبت شد.",
    updated: "ضمیمه با موفقیت ویرایش شد.",
    loadFailed: "ضمایم بارگذاری نشد.",
    saveFailed: "ذخیره ضمیمه انجام نشد.",
    previous: "قبلی",
    next: "بعدی",
    page: "صفحه",
    records: "رکورد",
    network_diagram: "دیاگرام شبکه",
    site_photo: "تصویر ساحه",
    test_report: "گزارش تست",
    customer_contract_signed: "قرارداد امضاشده",
    optical_trace: "ردیابی نوری",
    other: "سایر",
  },

  ps: {
    title: "د خدمت ضمیمې",
    subtitle:
      "تخنیکي اسناد، نقشې، انځورونه، راپورونه او د پېرودونکي له خدمت سره تړلي فایل مراجع.",
    add: "ضمیمه زیاتول",
    create: "د خدمت ضمیمه ثبتول",
    edit: "ضمیمه سمول",
    details: "د ضمیمې جزئیات",
    search: "ضمیمې ولټوئ...",
    customer: "پېرودونکی",
    customerService: "د پېرودونکي خدمت",
    activation: "فعالول",
    installation: "د نصب امر",
    faultTicket: "د ستونزې ټکټ",
    recordTitle: "سرلیک",
    documentType: "د سند ډول",
    fileUrl: "د فایل پته / مسیر",
    fileSize: "د فایل اندازه په بایټ",
    uploadedBy: "ثبتوونکی",
    createdAt: "د ثبت وخت",
    actions: "عملیات",
    view: "کتل",
    editAction: "سمول",
    save: "خوندي کول",
    saving: "خوندي کېږي...",
    cancel: "لغوه",
    select: "انتخاب کړئ",
    none: "اړیکه نشته",
    loading: "بارېږي...",
    noRecords: "ضمیمې نشته.",
    required:
      "د پېرودونکي خدمت، سرلیک او د فایل پته یا مسیر اجباري دي.",
    created: "ضمیمه په بریالیتوب ثبت شوه.",
    updated: "ضمیمه په بریالیتوب تازه شوه.",
    loadFailed: "ضمیمې بار نه شوې.",
    saveFailed: "ضمیمه خوندي نه شوه.",
    previous: "مخکینی",
    next: "بل",
    page: "پاڼه",
    records: "ریکارډونه",
    network_diagram: "د شبکې نقشه",
    site_photo: "د ساحې انځور",
    test_report: "د ازموینې راپور",
    customer_contract_signed: "لاسلیک شوی قرارداد",
    optical_trace: "نوري تعقیب",
    other: "نور",
  },
};

function humanBytes(
  value?: number,
) {
  if (
    value == null
    || Number.isNaN(value)
  ) {
    return "—";
  }

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(
      value / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    value
    / 1024
    / 1024
  ).toFixed(1)} MB`;
}

export function TechnicalAttachmentList({
  session,
}: Props) {
  const {
    t,
    language,
  } = useTranslation();

  const lang:
    "en" | "fa" | "ps" =
    language === "fa"
      ? "fa"
      : language === "ps"
        ? "ps"
        : "en";

  const c = COPY[lang];

  const [
    rows,
    setRows,
  ] = useState<Attachment[]>([]);

  const [
    customerServices,
    setCustomerServices,
  ] = useState<
    CustomerServiceOption[]
  >([]);

  const [
    activations,
    setActivations,
  ] = useState<
    ActivationOption[]
  >([]);

  const [
    workOrders,
    setWorkOrders,
  ] = useState<
    WorkOrderOption[]
  >([]);

  const [
    tickets,
    setTickets,
  ] = useState<
    TicketOption[]
  >([]);

  const [
    form,
    setForm,
  ] = useState<FormState>({
    ...EMPTY_FORM,
  });

  const [
    selected,
    setSelected,
  ] = useState<
    Attachment | null
  >(null);

  const [
    mode,
    setMode,
  ] = useState<Mode>(
    null,
  );

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    page,
    setPage,
  ] = useState(1);

  const [
    count,
    setCount,
  ] = useState(0);

  const [
    notice,
    setNotice,
  ] = useState<
    Notice | null
  >(null);

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        count / PAGE_SIZE,
      ),
    );

  const choiceLabel = (
    value?: string,
  ) =>
    value
      ? c[value] ?? value
      : "—";

  const loadRows =
    async () => {
      setLoading(true);

      try {
        const data =
          await fetchers
            .customerServiceAttachments(
              session,
              `?page=${page}&page_size=${PAGE_SIZE}`,
            );

        setRows(
          data.results ?? [],
        );

        setCount(
          data.count ?? 0,
        );
      } catch (error) {
        setNotice({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : c.loadFailed,
        });
      } finally {
        setLoading(false);
      }
    };

  const loadLookups =
    async () => {
      try {
        const [
          servicesData,
          activationsData,
          workOrdersData,
          ticketsData,
        ] = await Promise.all([
          fetchers.customerServices(
            session,
            "?page_size=500",
          ),

          fetchers.customerServiceActivations(
            session,
            "?page_size=500",
          ),

          fetchers.customerServiceWorkOrders(
            session,
            "?page_size=500",
          ),

          fetchers.customerTickets(
            session,
            "?page_size=500",
          ),
        ]);

        setCustomerServices(
          servicesData.results
          ?? [],
        );

        setActivations(
          activationsData.results
          ?? [],
        );

        setWorkOrders(
          workOrdersData.results
          ?? [],
        );

        setTickets(
          ticketsData.results
          ?? [],
        );
      } catch (error) {
        setNotice({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : c.loadFailed,
        });
      }
    };

  useEffect(() => {
    void loadRows();
  }, [page]);

  useEffect(() => {
    void loadLookups();
  }, []);

  const filteredRows =
    useMemo(() => {
      const q =
        search
          .trim()
          .toLowerCase();

      if (!q) {
        return rows;
      }

      return rows.filter(
        (row) =>
          [
            row.customer_name,
            row.service_identifier,
            row.title,
            row.document_type,
            row.file_url,
            row.uploaded_by,
          ]
            .filter(Boolean)
            .some(
              (value) =>
                String(value)
                  .toLowerCase()
                  .includes(q),
            ),
      );
    }, [
      rows,
      search,
    ]);

  const relevantActivations =
    useMemo(
      () =>
        activations.filter(
          (item) =>
            !form.customer_service
            || !item.customer_service
            || String(
              item.customer_service,
            ) ===
              String(
                form.customer_service,
              ),
        ),
      [
        activations,
        form.customer_service,
      ],
    );

  const relevantWorkOrders =
    useMemo(
      () =>
        workOrders.filter(
          (item) =>
            !form.customer_service
            || !item.customer_service
            || String(
              item.customer_service,
            ) ===
              String(
                form.customer_service,
              ),
        ),
      [
        workOrders,
        form.customer_service,
      ],
    );

  const relevantTickets =
    useMemo(
      () =>
        tickets.filter(
          (item) =>
            !form.customer_service
            || !item.customer_service
            || String(
              item.customer_service,
            ) ===
              String(
                form.customer_service,
              ),
        ),
      [
        tickets,
        form.customer_service,
      ],
    );

  const serviceLabel = (
    item:
      CustomerServiceOption,
  ) =>
    [
      item.customer_name,
      item.service_name,
      item.service_identifier
      || item.identifier,
    ]
      .filter(Boolean)
      .join(" — ")
    || item.id;

  const activationLabel = (
    item:
      ActivationOption,
  ) =>
    [
      item.customer_name,
      item.service_identifier,
      item.activation_type,
      item.status,
    ]
      .filter(Boolean)
      .join(" — ")
    || item.id;

  const workOrderLabel = (
    item:
      WorkOrderOption,
  ) =>
    [
      item.order_number
      || item.work_order_number,
      item.customer_name,
      item.service_identifier,
      item.status,
    ]
      .filter(Boolean)
      .join(" — ")
    || item.id;

  const ticketLabel = (
    item:
      TicketOption,
  ) =>
    [
      item.ticket_number,
      item.subject,
      item.customer_name,
      item.status,
    ]
      .filter(Boolean)
      .join(" — ")
    || item.id;

  const openCreate = () => {
    setSelected(null);

    setForm({
      ...EMPTY_FORM,
    });

    setNotice(null);
    setMode("create");
  };

  const openView = (
    row: Attachment,
  ) => {
    setSelected(row);
    setMode("view");
  };

  const openEdit = (
    row: Attachment,
  ) => {
    setSelected(row);

    setForm({
      customer_service:
        row.customer_service
        ?? "",

      activation:
        row.activation
        ?? "",

      installation:
        row.installation
        ?? "",

      fault_ticket:
        row.fault_ticket
        ?? "",

      title:
        row.title
        ?? "",

      document_type:
        row.document_type
        ?? "",

      file_url:
        row.file_url
        ?? "",

      file_size_bytes:
        row.file_size_bytes == null
          ? ""
          : String(
              row.file_size_bytes,
            ),

      uploaded_by:
        row.uploaded_by
        ?? "",
    });

    setMode("edit");
  };

  const closeModal = () => {
    if (saving) {
      return;
    }

    setMode(null);
    setSelected(null);
  };

  const submit = async (
    event:
      FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (
      !form.customer_service
      || !form.title.trim()
      || !form.file_url.trim()
    ) {
      setNotice({
        type: "error",
        message: c.required,
      });

      return;
    }

    const payload:
      Record<
        string,
        unknown
      > = {
        customer_service:
          form.customer_service,

        activation:
          form.activation
            || null,

        installation:
          form.installation
            || null,

        fault_ticket:
          form.fault_ticket
            || null,

        title:
          form.title.trim(),

        file_url:
          form.file_url.trim(),

        file_size_bytes:
          form.file_size_bytes.trim()
            ? Number(
                form.file_size_bytes,
              )
            : 0,

        uploaded_by:
          form.uploaded_by.trim(),
      };

    if (
      form.document_type
    ) {
      payload.document_type =
        form.document_type;
    }

    setSaving(true);
    setNotice(null);

    try {
      if (
        mode === "edit"
        && selected
      ) {
        await technicalAttachmentApi
          .update(
            session,
            selected.id,
            payload,
          );
      } else {
        await technicalAttachmentApi
          .create(
            session,
            payload,
          );
      }

      await loadRows();

      setMode(null);
      setSelected(null);

      setForm({
        ...EMPTY_FORM,
      });

      setNotice({
        type: "success",
        message:
          mode === "edit"
            ? c.updated
            : c.created,
      });
    } catch (error) {
      setNotice({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : c.saveFailed,
      });
    } finally {
      setSaving(false);
    }
  };

  const fieldClass =
    "w-full rounded-2xl border border-slate-700/60 bg-white/80 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400 dark:border-white/10 dark:bg-white/[0.045] dark:text-slate-100";

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-slate-200/80 bg-white/70 p-5 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.045]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-400">
              {
                t.customersServicesUi
                  .tabAttachments
              }
            </div>

            <h2 className="mt-1 text-2xl font-black text-slate-100 dark:text-white">
              {c.title}
            </h2>

            <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
              {c.subtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={openCreate}
            className="rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-cyan-500/10 dark:text-slate-950"
          >
            {c.add}
          </button>
        </div>
      </div>

      {notice && (
        <div
          className={
            notice.type ===
            "success"
              ? "rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-700 dark:text-emerald-300"
              : "rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-700 dark:text-rose-300"
          }
        >
          {notice.message}
        </div>
      )}

      <div className="rounded-[28px] border border-slate-200/80 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.035]">
        <input
          value={search}
          onChange={(
            event,
          ) =>
            setSearch(
              event.target.value,
            )
          }
          placeholder={c.search}
          className={fieldClass}
        />
      </div>

      <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/70 shadow-xl dark:border-white/10 dark:bg-white/[0.035]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-700/60 bg-slate-50/70 text-xs uppercase text-slate-500 dark:border-white/10 dark:bg-white/[0.04]">
              <tr>
                <th className="px-4 py-3 text-start">
                  {c.customer}
                </th>

                <th className="px-4 py-3 text-start">
                  {c.recordTitle}
                </th>

                <th className="px-4 py-3 text-start">
                  {c.documentType}
                </th>

                <th className="px-4 py-3 text-start">
                  {c.fileUrl}
                </th>

                <th className="px-4 py-3 text-start">
                  {c.fileSize}
                </th>

                <th className="px-4 py-3 text-start">
                  {c.uploadedBy}
                </th>

                <th className="px-4 py-3 text-start">
                  {c.actions}
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-slate-400"
                  >
                    {c.loading}
                  </td>
                </tr>
              ) : filteredRows.length ===
                0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    {c.noRecords}
                  </td>
                </tr>
              ) : (
                filteredRows.map(
                  (row) => (
                    <tr
                      key={row.id}
                      className="border-b border-slate-800/70 last:border-0 dark:border-white/[0.06]"
                    >
                      <td className="px-4 py-3">
                        {
                          row.customer_name
                          || row.service_identifier
                          || "—"
                        }
                      </td>

                      <td className="px-4 py-3 font-semibold">
                        {row.title}
                      </td>

                      <td className="px-4 py-3">
                        {
                          choiceLabel(
                            row.document_type,
                          )
                        }
                      </td>

                      <td className="max-w-[280px] px-4 py-3">
                        <div className="truncate font-mono text-xs text-cyan-700 dark:text-cyan-300">
                          {row.file_url}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {
                          humanBytes(
                            row.file_size_bytes,
                          )
                        }
                      </td>

                      <td className="px-4 py-3">
                        {
                          row.uploaded_by
                          || "—"
                        }
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              openView(row)
                            }
                            className="rounded-xl border border-slate-700/60 px-3 py-1.5 text-xs font-bold dark:border-white/10"
                          >
                            {c.view}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              openEdit(row)
                            }
                            className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-bold text-cyan-700 dark:text-cyan-300"
                          >
                            {c.editAction}
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

        <div className="flex items-center justify-between border-t border-slate-700/60 px-4 py-3 text-xs text-slate-500 dark:border-white/10">
          <div>
            {c.page} {page}
            {" / "}
            {totalPages}
            {" · "}
            {count} {c.records}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() =>
                setPage(
                  (current) =>
                    Math.max(
                      1,
                      current - 1,
                    ),
                )
              }
              className="rounded-xl border border-slate-700/60 px-3 py-2 disabled:opacity-40 dark:border-white/10"
            >
              {c.previous}
            </button>

            <button
              type="button"
              disabled={
                page >= totalPages
              }
              onClick={() =>
                setPage(
                  (current) =>
                    Math.min(
                      totalPages,
                      current + 1,
                    ),
                )
              }
              className="rounded-xl border border-slate-700/60 px-3 py-2 disabled:opacity-40 dark:border-white/10"
            >
              {c.next}
            </button>
          </div>
        </div>
      </div>

      {mode && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
          <div className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-[28px] border border-white/10 bg-slate-950/40 p-6 shadow-2xl dark:bg-slate-950">
            <div className="mb-6 flex items-start justify-between gap-4">
              <h3 className="text-xl font-black text-slate-100 dark:text-white">
                {mode === "create"
                  ? c.create
                  : mode === "edit"
                    ? c.edit
                    : c.details}
              </h3>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-xl border border-slate-700/60 px-3 py-2 dark:border-white/10"
              >
                ×
              </button>
            </div>

            {mode === "view"
              && selected ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  [
                    c.customer,
                    selected.customer_name
                    || selected.service_identifier,
                  ],
                  [
                    c.recordTitle,
                    selected.title,
                  ],
                  [
                    c.documentType,
                    choiceLabel(
                      selected.document_type,
                    ),
                  ],
                  [
                    c.fileUrl,
                    selected.file_url,
                  ],
                  [
                    c.fileSize,
                    humanBytes(
                      selected.file_size_bytes,
                    ),
                  ],
                  [
                    c.uploadedBy,
                    selected.uploaded_by,
                  ],
                  [
                    c.activation,
                    selected.activation,
                  ],
                  [
                    c.installation,
                    selected.installation,
                  ],
                  [
                    c.faultTicket,
                    selected.fault_ticket,
                  ],
                  [
                    c.createdAt,
                    selected.created_at
                      ? new Date(
                          selected.created_at,
                        ).toLocaleString()
                      : "",
                  ],
                ].map(
                  (
                    item,
                  ) => (
                    <div
                      key={String(
                        item[0],
                      )}
                      className="rounded-2xl border border-slate-700/60 bg-slate-50/60 p-4 dark:border-white/10 dark:bg-white/[0.035]"
                    >
                      <div className="text-xs text-slate-500">
                        {item[0]}
                      </div>

                      <div className="mt-1 break-words text-sm font-semibold">
                        {item[1] || "—"}
                      </div>
                    </div>
                  ),
                )}

                <div className="md:col-span-2 flex justify-end border-t border-slate-700/60 pt-4 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() =>
                      openEdit(
                        selected,
                      )
                    }
                    className="rounded-xl bg-cyan-500 px-5 py-2 text-sm font-black text-white dark:text-slate-950"
                  >
                    {c.editAction}
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={submit}
                className="grid gap-4 md:grid-cols-2"
              >
                <label className="space-y-2 md:col-span-2">
                  <span className="text-xs font-bold text-slate-500">
                    {c.customerService} *
                  </span>

                  <select
                    value={
                      form.customer_service
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,
                          customer_service:
                            event.target.value,
                          activation: "",
                          installation: "",
                          fault_ticket: "",
                        }),
                      )
                    }
                    className={fieldClass}
                  >
                    <option value="">
                      {c.select}
                    </option>

                    {customerServices.map(
                      (item) => (
                        <option
                          key={item.id}
                          value={item.id}
                        >
                          {
                            serviceLabel(
                              item,
                            )
                          }
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-xs font-bold text-slate-500">
                    {c.recordTitle} *
                  </span>

                  <input
                    value={form.title}
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,
                          title:
                            event.target.value,
                        }),
                      )
                    }
                    className={fieldClass}
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-bold text-slate-500">
                    {c.documentType}
                  </span>

                  <select
                    value={
                      form.document_type
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,
                          document_type:
                            event.target.value,
                        }),
                      )
                    }
                    className={fieldClass}
                  >
                    <option value="">
                      {c.select}
                    </option>

                    {DOCUMENT_TYPES.map(
                      (value) => (
                        <option
                          key={value}
                          value={value}
                        >
                          {
                            choiceLabel(
                              value,
                            )
                          }
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-bold text-slate-500">
                    {c.uploadedBy}
                  </span>

                  <input
                    value={
                      form.uploaded_by
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,
                          uploaded_by:
                            event.target.value,
                        }),
                      )
                    }
                    className={fieldClass}
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-xs font-bold text-slate-500">
                    {c.fileUrl} *
                  </span>

                  <input
                    value={
                      form.file_url
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,
                          file_url:
                            event.target.value,
                        }),
                      )
                    }
                    className={fieldClass}
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-bold text-slate-500">
                    {c.fileSize}
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={
                      form.file_size_bytes
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,
                          file_size_bytes:
                            event.target.value,
                        }),
                      )
                    }
                    className={fieldClass}
                  />
                </label>

                <div />

                <label className="space-y-2">
                  <span className="text-xs font-bold text-slate-500">
                    {c.activation}
                  </span>

                  <select
                    value={
                      form.activation
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,
                          activation:
                            event.target.value,
                        }),
                      )
                    }
                    className={fieldClass}
                  >
                    <option value="">
                      {c.none}
                    </option>

                    {relevantActivations.map(
                      (item) => (
                        <option
                          key={item.id}
                          value={item.id}
                        >
                          {
                            activationLabel(
                              item,
                            )
                          }
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-bold text-slate-500">
                    {c.installation}
                  </span>

                  <select
                    value={
                      form.installation
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,
                          installation:
                            event.target.value,
                        }),
                      )
                    }
                    className={fieldClass}
                  >
                    <option value="">
                      {c.none}
                    </option>

                    {relevantWorkOrders.map(
                      (item) => (
                        <option
                          key={item.id}
                          value={item.id}
                        >
                          {
                            workOrderLabel(
                              item,
                            )
                          }
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-xs font-bold text-slate-500">
                    {c.faultTicket}
                  </span>

                  <select
                    value={
                      form.fault_ticket
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,
                          fault_ticket:
                            event.target.value,
                        }),
                      )
                    }
                    className={fieldClass}
                  >
                    <option value="">
                      {c.none}
                    </option>

                    {relevantTickets.map(
                      (item) => (
                        <option
                          key={item.id}
                          value={item.id}
                        >
                          {
                            ticketLabel(
                              item,
                            )
                          }
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <div className="md:col-span-2 flex justify-end gap-3 border-t border-slate-700/60 pt-5 dark:border-white/10">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={saving}
                    className="rounded-xl border border-slate-700/60 px-4 py-2 text-sm dark:border-white/10"
                  >
                    {c.cancel}
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-cyan-500 px-5 py-2 text-sm font-black text-white disabled:opacity-50 dark:text-slate-950"
                  >
                    {saving
                      ? c.saving
                      : c.save}
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
