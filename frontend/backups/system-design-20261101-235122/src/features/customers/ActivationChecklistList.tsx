import {
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  activationChecklistApi,
  fetchers,
  type Session,
} from "../../lib/api";

import {
  useTranslation,
} from "../../lib/i18n";

type Props = {
  session: Session;
};

type ChecklistRecord = {
  id: string;
  customer_service: string;
  customer_name?: string;
  service_identifier?: string;
  activation?: string | null;
  checklist_item_id: string;
  checklist_label: string;
  is_mandatory: boolean;
  result: unknown;
  checked_by: string;
  checked_at?: string | null;
  notes: string;
  created_at?: string;
  updated_at?: string;
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

type ActivationOption = {
  id: string;
  customer_service: string;
  customer_name?: string;
  service_identifier?: string;
  activation_type?: string;
  status?: string;
};

type FormState = {
  customer_service: string;
  activation: string;
  checklist_item_id: string;
  checklist_label: string;
  is_mandatory: boolean;
  result: string;
  checked_by: string;
  checked_at: string;
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

const RESULT_OPTIONS:
  Array<{
    value: string;
    label: string;
  }> = [{"value": "passed", "label": "Passed"}, {"value": "failed", "label": "Failed"}, {"value": "pending", "label": "Pending"}, {"value": "waived", "label": "Waived"}];

const RESULT_FIELD_CLASS =
  "ChoiceField";

const REQUIRED_FIELDS =
  new Set<string>(
    ["customer_service", "activation", "checklist_item_id", "checklist_label"],
  );

const DEFAULT_MANDATORY =
  true;

const copy = {
  en: {
    title: "Activation Checklist",
    subtitle:
      "Manage service activation verification items and completion results.",
    newItem: "New checklist item",
    create: "Create checklist item",
    edit: "Edit checklist item",
    details: "Checklist details",
    customer: "Customer",
    customerService: "Customer service",
    serviceIdentifier: "Service identifier",
    activation: "Activation",
    noActivation: "No activation selected",
    checklistItemId: "Checklist Item ID",
    checklistLabel: "Checklist Item",
    mandatory: "Mandatory",
    result: "Result",
    checkedBy: "Checked by",
    checkedAt: "Checked at",
    notes: "Notes",
    actions: "Actions",
    view: "View",
    editAction: "Edit",
    save: "Save",
    cancel: "Cancel",
    yes: "Yes",
    no: "No",
    selectService: "Select customer service",
    selectActivation: "Select activation",
    selectResult: "Select result",
    loading: "Loading...",
    noRecords: "No checklist records found.",
    created: "Checklist item created successfully.",
    updated: "Checklist item updated successfully.",
    loadFailed: "Unable to load checklist records.",
    saveFailed: "Unable to save checklist item.",
    required: "Please complete all required fields.",
    previous: "Previous",
    next: "Next",
    page: "Page",
    records: "records",
  },
  fa: {
    title: "چک‌لیست فعال‌سازی",
    subtitle:
      "مدیریت موارد بررسی فعال‌سازی خدمات و نتایج تکمیل آن‌ها.",
    newItem: "مورد جدید چک‌لیست",
    create: "ثبت مورد چک‌لیست",
    edit: "ویرایش مورد چک‌لیست",
    details: "جزئیات چک‌لیست",
    customer: "مشترک",
    customerService: "خدمت مشترک",
    serviceIdentifier: "شناسه خدمت",
    activation: "فعال‌سازی",
    noActivation: "بدون فعال‌سازی مرتبط",
    checklistItemId: "شناسه مورد چک‌لیست",
    checklistLabel: "مورد چک‌لیست",
    mandatory: "الزامی",
    result: "نتیجه",
    checkedBy: "بررسی‌شده توسط",
    checkedAt: "زمان بررسی",
    notes: "یادداشت",
    actions: "عملیات",
    view: "مشاهده",
    editAction: "ویرایش",
    save: "ذخیره",
    cancel: "انصراف",
    yes: "بلی",
    no: "خیر",
    selectService: "خدمت مشترک را انتخاب کنید",
    selectActivation: "فعال‌سازی را انتخاب کنید",
    selectResult: "نتیجه را انتخاب کنید",
    loading: "در حال بارگذاری...",
    noRecords: "هیچ مورد چک‌لیست ثبت نشده است.",
    created: "مورد چک‌لیست با موفقیت ثبت شد.",
    updated: "مورد چک‌لیست با موفقیت ویرایش شد.",
    loadFailed: "چک‌لیست بارگذاری نشد.",
    saveFailed: "ذخیره مورد چک‌لیست انجام نشد.",
    required: "تمام فیلدهای الزامی را تکمیل کنید.",
    previous: "قبلی",
    next: "بعدی",
    page: "صفحه",
    records: "رکورد",
  },
  ps: {
    title: "د فعالولو چک‌لېست",
    subtitle:
      "د خدمت د فعالولو د ارزونې توکي او د بشپړېدو پایلې مدیریت کړئ.",
    newItem: "نوی چک‌لېست توکی",
    create: "د چک‌لېست توکی ثبتول",
    edit: "د چک‌لېست توکی سمول",
    details: "د چک‌لېست جزئیات",
    customer: "پېرودونکی",
    customerService: "د پېرودونکي خدمت",
    serviceIdentifier: "د خدمت پېژند",
    activation: "فعالول",
    noActivation: "فعالول نه دي ټاکل شوي",
    checklistItemId: "د چک‌لېست توکي پېژند",
    checklistLabel: "د چک‌لېست توکی",
    mandatory: "اجباري",
    result: "پایله",
    checkedBy: "کتونکی",
    checkedAt: "د کتنې وخت",
    notes: "یادښت",
    actions: "عملیات",
    view: "کتل",
    editAction: "سمول",
    save: "خوندي کول",
    cancel: "لغوه",
    yes: "هو",
    no: "نه",
    selectService: "د پېرودونکي خدمت وټاکئ",
    selectActivation: "فعالول وټاکئ",
    selectResult: "پایله وټاکئ",
    loading: "بارېږي...",
    noRecords: "د چک‌لېست ریکارډ نشته.",
    created: "د چک‌لېست توکی په بریالیتوب ثبت شو.",
    updated: "د چک‌لېست توکی په بریالیتوب تازه شو.",
    loadFailed: "د چک‌لېست معلومات بار نه شول.",
    saveFailed: "د چک‌لېست توکی خوندي نه شو.",
    required: "ټول اجباري فیلډونه بشپړ کړئ.",
    previous: "مخکینی",
    next: "بل",
    page: "پاڼه",
    records: "ریکارډونه",
  },
} as const;

const EMPTY_FORM: FormState = {
  customer_service: "",
  activation: "",
  checklist_item_id: "",
  checklist_label: "",
  is_mandatory: DEFAULT_MANDATORY,
  result:
    RESULT_OPTIONS[0]?.value ?? "",
  checked_by: "",
  checked_at: "",
  notes: "",
};

function toLocalDateTime(
  value?: string | null,
) {
  if (!value) return "";

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value.slice(0, 16);
  }

  const offset =
    date.getTimezoneOffset();

  return new Date(
    date.getTime()
      - offset * 60000,
  )
    .toISOString()
    .slice(0, 16);
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
    <label className="block space-y-2">
      <span className="text-xs font-bold text-slate-400">
        {label}
        {required && (
          <span className="ms-1 text-rose-400">
            *
          </span>
        )}
      </span>
      {children}
    </label>
  );
}

export function ActivationChecklistList({
  session,
}: Props) {
  const {
    t,
    language,
  } = useTranslation();

  const c =
    copy[
      language as keyof typeof copy
    ] ?? copy.en;

  const [
    rows,
    setRows,
  ] = useState<
    ChecklistRecord[]
  >([]);

  const [
    services,
    setServices,
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
    search,
    setSearch,
  ] = useState("");

  const [
    modalMode,
    setModalMode,
  ] = useState<ModalMode>(
    null,
  );

  const [
    selected,
    setSelected,
  ] = useState<
    ChecklistRecord | null
  >(null);

  const [
    form,
    setForm,
  ] = useState<FormState>({
    ...EMPTY_FORM,
  });

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

  const load = async () => {
    setLoading(true);

    try {
      const data =
        await fetchers
          .customerServiceChecklists(
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
          serviceData,
          activationData,
        ] = await Promise.all([
          fetchers
            .customerServices(
              session,
              "?page_size=500",
            ),

          fetchers
            .customerServiceActivations(
              session,
              "?page_size=500",
            ),
        ]);

        setServices(
          serviceData.results ?? [],
        );

        setActivations(
          activationData.results ?? [],
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
    void load();
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

      if (!q) return rows;

      return rows.filter(
        (row) =>
          [
            row.customer_name,
            row.service_identifier,
            row.checklist_item_id,
            row.checklist_label,
            row.checked_by,
            String(
              row.result ?? "",
            ),
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

  const availableActivations =
    useMemo(
      () =>
        activations.filter(
          (item) =>
            !form.customer_service
            || String(
              item.customer_service,
            )
              ===
              String(
                form.customer_service,
              ),
        ),
      [
        activations,
        form.customer_service,
      ],
    );

  const openCreate = () => {
    setNotice(null);
    setSelected(null);

    setForm({
      ...EMPTY_FORM,
    });

    setModalMode("create");
  };

  const openView = (
    row: ChecklistRecord,
  ) => {
    setSelected(row);
    setModalMode("view");
  };

  const openEdit = (
    row: ChecklistRecord,
  ) => {
    setSelected(row);

    setForm({
      customer_service:
        row.customer_service ?? "",
      activation:
        row.activation ?? "",
      checklist_item_id:
        row.checklist_item_id ?? "",
      checklist_label:
        row.checklist_label ?? "",
      is_mandatory:
        Boolean(
          row.is_mandatory,
        ),
      result:
        String(
          row.result ?? "",
        ),
      checked_by:
        row.checked_by ?? "",
      checked_at:
        toLocalDateTime(
          row.checked_at,
        ),
      notes:
        row.notes ?? "",
    });

    setModalMode("edit");
  };

  const closeModal = () => {
    if (saving) return;

    setModalMode(null);
    setSelected(null);

    setForm({
      ...EMPTY_FORM,
    });
  };

  const fieldValue = (
    name: string,
  ) => {
    const value =
      form[
        name as keyof FormState
      ];

    if (
      typeof value ===
      "boolean"
    ) {
      return value;
    }

    return String(
      value ?? "",
    ).trim();
  };

  const submit = async (
    event:
      FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const missing =
      Array.from(
        REQUIRED_FIELDS,
      ).filter(
        (name) =>
          name !==
            "is_mandatory"
          && !fieldValue(name),
      );

    if (missing.length) {
      setNotice({
        type: "error",
        message: c.required,
      });

      return;
    }

    const payload: any = {
      customer_service:
        form.customer_service,
      checklist_item_id:
        form.checklist_item_id,
      checklist_label:
        form.checklist_label,
      is_mandatory:
        form.is_mandatory,
      checked_by:
        form.checked_by,
      notes:
        form.notes,
    };

    if (form.activation) {
      payload.activation =
        form.activation;
    } else {
      payload.activation =
        null;
    }

    if (form.checked_at) {
      payload.checked_at =
        form.checked_at;
    } else {
      payload.checked_at =
        null;
    }

    if (
      RESULT_FIELD_CLASS
        .toLowerCase()
        .includes("boolean")
    ) {
      payload.result =
        form.result === "true";
    } else if (
      form.result !== ""
    ) {
      payload.result =
        form.result;
    }

    setSaving(true);
    setNotice(null);

    try {
      if (
        modalMode === "edit"
        && selected
      ) {
        await activationChecklistApi
          .update(
            session,
            selected.id,
            payload,
          );
      } else {
        await activationChecklistApi
          .create(
            session,
            payload,
          );
      }

      await load();

      setModalMode(null);
      setSelected(null);

      setForm({
        ...EMPTY_FORM,
      });

      setNotice({
        type: "success",
        message:
          modalMode === "edit"
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

  const resultInput =
    RESULT_FIELD_CLASS
      .toLowerCase()
      .includes("boolean") ? (
      <select
        value={form.result}
        onChange={(event) =>
          setForm(
            (current) => ({
              ...current,
              result:
                event.target
                  .value,
            }),
          )
        }
        className="checklist-input"
      >
        <option value="">
          {c.selectResult}
        </option>
        <option value="true">
          {c.yes}
        </option>
        <option value="false">
          {c.no}
        </option>
      </select>
    ) : RESULT_OPTIONS.length ? (
      <select
        value={form.result}
        onChange={(event) =>
          setForm(
            (current) => ({
              ...current,
              result:
                event.target
                  .value,
            }),
          )
        }
        className="checklist-input"
      >
        <option value="">
          {c.selectResult}
        </option>

        {RESULT_OPTIONS.map(
          (option) => (
            <option
              key={
                option.value
              }
              value={
                option.value
              }
            >
              {option.label}
            </option>
          ),
        )}
      </select>
    ) : (
      <input
        value={form.result}
        onChange={(event) =>
          setForm(
            (current) => ({
              ...current,
              result:
                event.target
                  .value,
            }),
          )
        }
        className="checklist-input"
      />
    );

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-5 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-400">
              {
                t.customersServicesUi
                  .tabChecklist
              }
            </div>

            <h2 className="mt-1 text-2xl font-black text-slate-100">
              {c.title}
            </h2>

            <p className="mt-1 max-w-3xl text-sm text-slate-400">
              {c.subtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={openCreate}
            className="rounded-2xl border border-cyan-300/20 bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-cyan-500/10 transition hover:-translate-y-0.5"
          >
            {c.newItem}
          </button>
        </div>
      </div>

      {notice && (
        <div
          className={
            notice.type ===
            "success"
              ? "rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-300"
              : "rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-300"
          }
        >
          {notice.message}
        </div>
      )}

      <div className="rounded-[28px] border border-white/10 bg-white/[0.035] p-4 shadow-xl backdrop-blur-xl">
        <input
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value,
            )
          }
          placeholder={c.title}
          className="checklist-input"
        />
      </div>

      <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.035] shadow-xl backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="min-w-full text-start text-sm">
            <thead className="border-b border-white/10 bg-white/[0.04] text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 text-start">
                  {c.customer}
                </th>
                <th className="px-4 py-3 text-start">
                  {
                    c.serviceIdentifier
                  }
                </th>
                <th className="px-4 py-3 text-start">
                  {
                    c.checklistLabel
                  }
                </th>
                <th className="px-4 py-3 text-start">
                  {c.mandatory}
                </th>
                <th className="px-4 py-3 text-start">
                  {c.result}
                </th>
                <th className="px-4 py-3 text-start">
                  {c.checkedBy}
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
                      className="border-b border-white/[0.06] text-slate-200 last:border-0 hover:bg-white/[0.025]"
                    >
                      <td className="px-4 py-3">
                        {
                          row.customer_name
                          || "—"
                        }
                      </td>

                      <td className="px-4 py-3 font-mono text-xs text-cyan-300">
                        {
                          row.service_identifier
                          || "—"
                        }
                      </td>

                      <td className="px-4 py-3 font-semibold">
                        {
                          row.checklist_label
                        }
                      </td>

                      <td className="px-4 py-3">
                        {row.is_mandatory
                          ? c.yes
                          : c.no}
                      </td>

                      <td className="px-4 py-3">
                        <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs font-bold">
                          {String(
                            row.result
                            ?? "—",
                          )}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        {
                          row.checked_by
                          || "—"
                        }
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              openView(
                                row,
                              )
                            }
                            className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-slate-300"
                          >
                            {c.view}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              openEdit(
                                row,
                              )
                            }
                            className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-bold text-cyan-300"
                          >
                            {
                              c.editAction
                            }
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

        <div className="flex items-center justify-between gap-4 border-t border-white/10 px-4 py-3 text-xs text-slate-400">
          <div>
            {c.page} {page} /{" "}
            {totalPages} ·{" "}
            {count} {c.records}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={
                page <= 1
              }
              onClick={() =>
                setPage(
                  (current) =>
                    Math.max(
                      1,
                      current - 1,
                    ),
                )
              }
              className="rounded-xl border border-white/10 px-3 py-2 disabled:opacity-40"
            >
              {c.previous}
            </button>

            <button
              type="button"
              disabled={
                page >=
                totalPages
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
              className="rounded-xl border border-white/10 px-3 py-2 disabled:opacity-40"
            >
              {c.next}
            </button>
          </div>
        </div>
      </div>

      {modalMode && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md">
          <div className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-[28px] border border-white/10 bg-slate-950 p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-white">
                  {modalMode ===
                  "create"
                    ? c.create
                    : modalMode ===
                        "edit"
                      ? c.edit
                      : c.details}
                </h3>
              </div>

              <button
                type="button"
                onClick={
                  closeModal
                }
                disabled={
                  saving
                }
                className="rounded-xl border border-white/10 px-3 py-2 text-slate-400"
              >
                ×
              </button>
            </div>

            {modalMode ===
              "view"
              && selected ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  [
                    c.customer,
                    selected.customer_name,
                  ],
                  [
                    c.serviceIdentifier,
                    selected.service_identifier,
                  ],
                  [
                    c.checklistItemId,
                    selected.checklist_item_id,
                  ],
                  [
                    c.checklistLabel,
                    selected.checklist_label,
                  ],
                  [
                    c.mandatory,
                    selected.is_mandatory
                      ? c.yes
                      : c.no,
                  ],
                  [
                    c.result,
                    String(
                      selected.result
                      ?? "—",
                    ),
                  ],
                  [
                    c.checkedBy,
                    selected.checked_by,
                  ],
                  [
                    c.checkedAt,
                    selected.checked_at
                      ? new Date(
                          selected.checked_at,
                        )
                          .toLocaleString()
                      : "—",
                  ],
                  [
                    c.notes,
                    selected.notes,
                  ],
                ].map(
                  (
                    [
                      label,
                      value,
                    ],
                  ) => (
                    <div
                      key={label}
                      className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"
                    >
                      <div className="text-xs text-slate-500">
                        {label}
                      </div>

                      <div className="mt-1 break-words text-sm font-semibold text-slate-100">
                        {value || "—"}
                      </div>
                    </div>
                  ),
                )}

                <div className="md:col-span-2 flex justify-end border-t border-white/10 pt-4">
                  <button
                    type="button"
                    onClick={() =>
                      openEdit(
                        selected,
                      )
                    }
                    className="rounded-xl bg-cyan-500 px-5 py-2 text-sm font-black text-slate-950"
                  >
                    {c.editAction}
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={submit}
                className="space-y-5"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    label={
                      c.customerService
                    }
                    required={
                      REQUIRED_FIELDS.has(
                        "customer_service",
                      )
                    }
                  >
                    <select
                      value={
                        form.customer_service
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (current) => ({
                            ...current,
                            customer_service:
                              event
                                .target
                                .value,
                            activation:
                              "",
                          }),
                        )
                      }
                      className="checklist-input"
                    >
                      <option value="">
                        {
                          c.selectService
                        }
                      </option>

                      {services.map(
                        (service) => (
                          <option
                            key={
                              service.id
                            }
                            value={
                              service.id
                            }
                          >
                            {service.customer_name
                              || "—"}
                            {" — "}
                            {service.service_name
                              || service.identifier
                              || service.id}
                          </option>
                        ),
                      )}
                    </select>
                  </Field>

                  <Field
                    label={
                      c.activation
                    }
                    required={
                      REQUIRED_FIELDS.has(
                        "activation",
                      )
                    }
                  >
                    <select
                      value={
                        form.activation
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (current) => ({
                            ...current,
                            activation:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      className="checklist-input"
                    >
                      <option value="">
                        {
                          c.noActivation
                        }
                      </option>

                      {availableActivations.map(
                        (
                          activation,
                        ) => (
                          <option
                            key={
                              activation.id
                            }
                            value={
                              activation.id
                            }
                          >
                            {activation.activation_type
                              || activation.id}
                            {" — "}
                            {activation.status
                              || ""}
                          </option>
                        ),
                      )}
                    </select>
                  </Field>

                  <Field
                    label={
                      c.checklistItemId
                    }
                    required={
                      REQUIRED_FIELDS.has(
                        "checklist_item_id",
                      )
                    }
                  >
                    <input
                      value={
                        form.checklist_item_id
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (current) => ({
                            ...current,
                            checklist_item_id:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      className="checklist-input"
                    />
                  </Field>

                  <Field
                    label={
                      c.checklistLabel
                    }
                    required={
                      REQUIRED_FIELDS.has(
                        "checklist_label",
                      )
                    }
                  >
                    <input
                      value={
                        form.checklist_label
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (current) => ({
                            ...current,
                            checklist_label:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      className="checklist-input"
                    />
                  </Field>

                  <Field
                    label={
                      c.result
                    }
                    required={
                      REQUIRED_FIELDS.has(
                        "result",
                      )
                    }
                  >
                    {resultInput}
                  </Field>

                  <Field
                    label={
                      c.checkedBy
                    }
                    required={
                      REQUIRED_FIELDS.has(
                        "checked_by",
                      )
                    }
                  >
                    <input
                      value={
                        form.checked_by
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (current) => ({
                            ...current,
                            checked_by:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      className="checklist-input"
                    />
                  </Field>

                  <Field
                    label={
                      c.checkedAt
                    }
                    required={
                      REQUIRED_FIELDS.has(
                        "checked_at",
                      )
                    }
                  >
                    <input
                      type="datetime-local"
                      value={
                        form.checked_at
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (current) => ({
                            ...current,
                            checked_at:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      className="checklist-input"
                    />
                  </Field>

                  <Field
                    label={
                      c.mandatory
                    }
                  >
                    <label className="flex h-[46px] items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4">
                      <input
                        type="checkbox"
                        checked={
                          form.is_mandatory
                        }
                        onChange={(
                          event,
                        ) =>
                          setForm(
                            (current) => ({
                              ...current,
                              is_mandatory:
                                event
                                  .target
                                  .checked,
                            }),
                          )
                        }
                      />

                      <span className="text-sm text-slate-200">
                        {form.is_mandatory
                          ? c.yes
                          : c.no}
                      </span>
                    </label>
                  </Field>

                  <div className="md:col-span-2">
                    <Field
                      label={
                        c.notes
                      }
                      required={
                        REQUIRED_FIELDS.has(
                          "notes",
                        )
                      }
                    >
                      <textarea
                        value={
                          form.notes
                        }
                        onChange={(
                          event,
                        ) =>
                          setForm(
                            (current) => ({
                              ...current,
                              notes:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                        rows={4}
                        className="checklist-input"
                      />
                    </Field>
                  </div>
                </div>

                <div className="flex justify-end gap-3 border-t border-white/10 pt-5">
                  <button
                    type="button"
                    onClick={
                      closeModal
                    }
                    disabled={
                      saving
                    }
                    className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300"
                  >
                    {c.cancel}
                  </button>

                  <button
                    type="submit"
                    disabled={
                      saving
                    }
                    className="rounded-xl bg-cyan-500 px-5 py-2 text-sm font-black text-slate-950 disabled:opacity-50"
                  >
                    {saving
                      ? t.common.saving
                      : c.save}
                  </button>
                </div>
              </form>
            )}

            <style>{`
              .checklist-input {
                width: 100%;
                border-radius: .9rem;
                border: 1px solid rgba(255,255,255,.10);
                background: rgba(255,255,255,.045);
                padding: .72rem .85rem;
                color: rgb(241 245 249);
                outline: none;
              }

              .checklist-input:focus {
                border-color: rgba(34,211,238,.45);
                box-shadow: 0 0 0 3px rgba(34,211,238,.07);
              }

              .checklist-input option {
                background: rgb(15 23 42);
                color: rgb(241 245 249);
              }
            `}</style>
          </div>
        </div>
      )}
    </div>
  );
}
