import { getTranslation as getUiTranslation } from "../../i18n";
import { FormField as Field, PrimaryButton as SharedPrimaryButton, SecondaryButton as SharedSecondaryButton, Select as SharedSelect } from "../../components/Interface";
import { PageHeader as SharedPageHeader } from "../../components/PageHeader";
import { DataTable as SharedDataTable } from "../../components/DataTable";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  decommissionRecordApi,
  fetchers,
  type Session,
} from "../../lib/api";

import {
  useTranslation,
} from "../../lib/i18n";

type Props = {
  session: Session;
};

type DecommissionRecord = {
  id: string;
  customer_service: string;
  customer_name?: string;
  service_identifier?: string;
  termination: string;
  resource_type: string;
  resource_id: string;
  released_at?: string | null;
  technician_name?: string;
  status?:
    | "released"
    | "pending_recovery"
    | "damaged"
    | "lost"
    | string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
};

type CustomerServiceOption = {
  id: string;
  customer_name?: string;
  service_name?: string;
  service_identifier?: string;
  identifier?: string;
  status?: string;
};

type TerminationOption = {
  id: string;
  customer_service?: string;
  customer_name?: string;
  service_identifier?: string;
  termination_reason?: string;
  reason?: string;
  status?: string;
  terminated_at?: string;
};

type FormState = {
  customer_service: string;
  termination: string;
  resource_type: string;
  resource_id: string;
  released_at: string;
  technician_name: string;
  status: string;
  notes: string;
};

type ModalMode =
  | "create"
  | "view"
  | "edit"
  | null;

type Notice = {
  type:
    | "success"
    | "error";
  message: string;
};

const PAGE_SIZE = 25;

const STATUS_VALUES = [
  "released",
  "pending_recovery",
  "damaged",
  "lost",
] as const;

const EMPTY_FORM:
  FormState = {
  customer_service: "",
  termination: "",
  resource_type: "",
  resource_id: "",
  released_at: "",
  technician_name: "",
  status: "",
  notes: "",
};

const copy = { en: getUiTranslation("en").featureCopy.customers_DecommissionRecordList.copy, fa: getUiTranslation("fa").featureCopy.customers_DecommissionRecordList.copy, ps: getUiTranslation("ps").featureCopy.customers_DecommissionRecordList.copy };



function toLocalDateTime(
  value?: string | null,
) {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value.slice(
      0,
      16,
    );
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

export function DecommissionRecordList({
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
    DecommissionRecord[]
  >([]);

  const [
    customerServices,
    setCustomerServices,
  ] = useState<
    CustomerServiceOption[]
  >([]);

  const [
    terminations,
    setTerminations,
  ] = useState<
    TerminationOption[]
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
    DecommissionRecord | null
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

  const statusLabel = (
    value?: string,
  ) => {
    if (!value) {
      return "—";
    }

    const translated =
      c[
        value as keyof typeof c
      ];

    return (
      typeof translated ===
      "string"
        ? translated
        : value
    );
  };

  const load =
    async () => {
      setLoading(true);

      try {
        const data =
          await fetchers
            .customerServiceDecommissions(
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
          terminationData,
        ] = await Promise.all([
          fetchers
            .customerServices(
              session,
              "?page_size=500",
            ),

          fetchers
            .customerServiceTerminations(
              session,
              "?page_size=500",
            ),
        ]);

        setCustomerServices(
          serviceData.results
          ?? [],
        );

        setTerminations(
          terminationData.results
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

      if (!q) {
        return rows;
      }

      return rows.filter(
        (row) =>
          [
            row.customer_name,
            row.service_identifier,
            row.resource_type,
            row.resource_id,
            row.technician_name,
            row.status,
            row.notes,
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

  const relevantTerminations =
    useMemo(
      () =>
        terminations.filter(
          (item) => {
            if (
              !form.customer_service
            ) {
              return true;
            }

            if (
              !item.customer_service
            ) {
              return true;
            }

            return (
              String(
                item.customer_service,
              )
              ===
              String(
                form.customer_service,
              )
            );
          },
        ),
      [
        terminations,
        form.customer_service,
      ],
    );

  const openCreate = () => {
    setSelected(null);

    setForm({
      ...EMPTY_FORM,
    });

    setNotice(null);

    setModalMode(
      "create",
    );
  };

  const openView = (
    row:
      DecommissionRecord,
  ) => {
    setSelected(row);
    setModalMode("view");
  };

  const openEdit = (
    row:
      DecommissionRecord,
  ) => {
    setSelected(row);

    setForm({
      customer_service:
        row.customer_service
        ?? "",
      termination:
        row.termination
        ?? "",
      resource_type:
        row.resource_type
        ?? "",
      resource_id:
        row.resource_id
        ?? "",
      released_at:
        toLocalDateTime(
          row.released_at,
        ),
      technician_name:
        row.technician_name
        ?? "",
      status:
        row.status
        ?? "",
      notes:
        row.notes
        ?? "",
    });

    setModalMode("edit");
  };

  const closeModal = () => {
    if (saving) {
      return;
    }

    setModalMode(null);
    setSelected(null);
  };

  const submit = async (
    event:
      FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (
      !form.customer_service
      || !form.termination
      || !form.resource_type
        .trim()
      || !form.resource_id
        .trim()
    ) {
      setNotice({
        type: "error",
        message:
          c.required,
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

        termination:
          form.termination,

        resource_type:
          form.resource_type
            .trim(),

        resource_id:
          form.resource_id
            .trim(),
      };

    if (
      form.released_at
    ) {
      payload.released_at =
        form.released_at;
    }

    if (
      form.technician_name
        .trim()
    ) {
      payload.technician_name =
        form.technician_name
          .trim();
    } else {
      payload.technician_name =
        "";
    }

    if (
      form.status
    ) {
      payload.status =
        form.status;
    }

    payload.notes =
      form.notes.trim();

    setSaving(true);
    setNotice(null);

    try {
      if (
        modalMode === "edit"
        && selected
      ) {
        await decommissionRecordApi
          .update(
            session,
            selected.id,
            payload,
          );
      } else {
        await decommissionRecordApi
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

  const serviceLabel = (
    item:
      CustomerServiceOption,
  ) => {
    return [
      item.customer_name,
      item.service_name,
      item.service_identifier
      || item.identifier,
    ]
      .filter(Boolean)
      .join(" — ")
      || item.id;
  };

  const terminationLabel = (
    item:
      TerminationOption,
  ) => {
    return [
      item.customer_name,
      item.service_identifier,
      item.termination_reason
      || item.reason,
      item.status,
    ]
      .filter(Boolean)
      .join(" — ")
      || item.id;
  };

  return (
    <div className="space-y-5">
      <div className="hq-visual-panel rounded-[28px] border border-slate-200/80 bg-white/70 p-5 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.045]">
        <SharedPageHeader native as="div" className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-400">
              {
                t.customersServicesUi
                  .tabDecommission
              }
            </div>

            <h2 className="mt-1 text-2xl font-black text-slate-100 dark:text-slate-100">
              {c.title}
            </h2>

            <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
              {c.subtitle}
            </p>
          </div>

          <SharedPrimaryButton
            type="button"
            onClick={
              openCreate
            }
            className="rounded-2xl border border-cyan-300/20 bg-cyan-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-cyan-500/10 transition hover:-translate-y-0.5 dark:text-slate-950"
          >
            {c.newRecord}
          </SharedPrimaryButton>
        </SharedPageHeader>
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

      <div className="hq-visual-panel rounded-[28px] border border-slate-200/80 bg-white/70 p-4 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.035]">
        <input
          value={search}
          onChange={(
            event,
          ) =>
            setSearch(
              event.target
                .value,
            )
          }
          placeholder={
            c.search
          }
          className="hq-input decommission-input"
        />
      </div>

      <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/70 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.035]">
        <div className="overflow-x-auto">
          <SharedDataTable native className="min-w-full text-sm">
            <thead className="border-b border-slate-700/60 bg-slate-50/70 text-xs uppercase tracking-wide text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 text-start">
                  {c.customer}
                </th>

                <th className="px-4 py-3 text-start">
                  {c.resourceType}
                </th>

                <th className="px-4 py-3 text-start">
                  {c.resourceId}
                </th>

                <th className="px-4 py-3 text-start">
                  {c.status}
                </th>

                <th className="px-4 py-3 text-start">
                  {c.releasedAt}
                </th>

                <th className="px-4 py-3 text-start">
                  {
                    c.technicianName
                  }
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
              ) : filteredRows
                  .length ===
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
                      key={
                        row.id
                      }
                      className="border-b border-slate-800/70 text-slate-700 last:border-0 hover:bg-cyan-50/30 dark:border-white/[0.06] dark:text-slate-200 dark:hover:bg-white/[0.025]"
                    >
                      <td className="px-4 py-3">
                        {
                          row.customer_name
                          || row.service_identifier
                          || "—"
                        }
                      </td>

                      <td className="px-4 py-3 font-semibold">
                        {
                          row.resource_type
                        }
                      </td>

                      <td className="px-4 py-3 font-mono text-xs text-cyan-700 dark:text-cyan-300">
                        {
                          row.resource_id
                        }
                      </td>

                      <td className="px-4 py-3">
                        <span className="rounded-full border border-slate-700/60 bg-slate-900/55 px-2.5 py-1 text-xs font-bold dark:border-white/10 dark:bg-white/[0.05]">
                          {
                            statusLabel(
                              row.status,
                            )
                          }
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        {row.released_at
                          ? new Date(
                              row.released_at,
                            )
                              .toLocaleString()
                          : "—"}
                      </td>

                      <td className="px-4 py-3">
                        {
                          row.technician_name
                          || "—"
                        }
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <SharedSecondaryButton
                            type="button"
                            onClick={() =>
                              openView(
                                row,
                              )
                            }
                            className="rounded-xl border border-slate-700/60 px-3 py-1.5 text-xs font-bold dark:border-white/10"
                          >
                            {c.view}
                          </SharedSecondaryButton>

                          <SharedSecondaryButton
                            type="button"
                            onClick={() =>
                              openEdit(
                                row,
                              )
                            }
                            className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-bold text-cyan-700 dark:text-cyan-300"
                          >
                            {
                              c.editAction
                            }
                          </SharedSecondaryButton>
                        </div>
                      </td>
                    </tr>
                  ),
                )
              )}
            </tbody>
          </SharedDataTable>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-slate-700/60 px-4 py-3 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
          <div>
            {c.page} {page}
            {" / "}
            {totalPages}
            {" · "}
            {count} {c.records}
          </div>

          <div className="flex gap-2">
            <SharedSecondaryButton
              type="button"
              disabled={
                page <= 1
              }
              onClick={() =>
                setPage(
                  (
                    current,
                  ) =>
                    Math.max(
                      1,
                      current - 1,
                    ),
                )
              }
              className="rounded-xl border border-slate-700/60 px-3 py-2 disabled:opacity-40 dark:border-white/10"
            >
              {c.previous}
            </SharedSecondaryButton>

            <SharedSecondaryButton
              type="button"
              disabled={
                page
                >= totalPages
              }
              onClick={() =>
                setPage(
                  (
                    current,
                  ) =>
                    Math.min(
                      totalPages,
                      current + 1,
                    ),
                )
              }
              className="rounded-xl border border-slate-700/60 px-3 py-2 disabled:opacity-40 dark:border-white/10"
            >
              {c.next}
            </SharedSecondaryButton>
          </div>
        </div>
      </div>

      {modalMode && (
        <div className="hq-visual-overlay fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
          <div className="hq-visual-panel hq-visual-dialog max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-[28px] border border-white/10 bg-slate-950/40 p-6 shadow-2xl dark:bg-slate-950">
            <div className="mb-6 flex items-start justify-between gap-4">
              <h3 className="text-xl font-black text-slate-100 dark:text-white">
                {modalMode ===
                "create"
                  ? c.create
                  : modalMode ===
                      "edit"
                    ? c.edit
                    : c.details}
              </h3>

              <SharedSecondaryButton
                type="button"
                onClick={
                  closeModal
                }
                disabled={
                  saving
                }
                className="rounded-xl border border-slate-700/60 px-3 py-2 text-slate-500 dark:border-white/10 dark:text-slate-400"
              >
                ×
              </SharedSecondaryButton>
            </div>

            {modalMode ===
              "view"
              && selected ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  [
                    c.customer,
                    selected.customer_name
                    || selected.service_identifier,
                  ],
                  [
                    c.resourceType,
                    selected.resource_type,
                  ],
                  [
                    c.resourceId,
                    selected.resource_id,
                  ],
                  [
                    c.status,
                    statusLabel(
                      selected.status,
                    ),
                  ],
                  [
                    c.releasedAt,
                    selected.released_at
                      ? new Date(
                          selected.released_at,
                        )
                          .toLocaleString()
                      : "",
                  ],
                  [
                    c.technicianName,
                    selected.technician_name,
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
                      key={
                        label
                      }
                      className="hq-visual-panel rounded-2xl border border-slate-700/60 bg-slate-50/60 p-4 dark:border-white/10 dark:bg-white/[0.035]"
                    >
                      <div className="text-xs text-slate-500">
                        {label}
                      </div>

                      <div className="mt-1 break-words text-sm font-semibold text-slate-100 dark:text-slate-100">
                        {
                          value
                          || "—"
                        }
                      </div>
                    </div>
                  ),
                )}

                <div className="md:col-span-2 flex justify-end border-t border-slate-700/60 pt-4 dark:border-white/10">
                  <SharedPrimaryButton
                    type="button"
                    onClick={() =>
                      openEdit(
                        selected,
                      )
                    }
                    className="rounded-xl bg-cyan-500 px-5 py-2 text-sm font-black text-white dark:text-slate-950"
                  >
                    {c.editAction}
                  </SharedPrimaryButton>
                </div>
              </div>
            ) : (
              <form
                onSubmit={
                  submit
                }
                className="space-y-5"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    label={
                      c.customerService
                    }
                    required
                  >
                    <SharedSelect
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
                              event
                                .target
                                .value,
                            termination:
                              "",
                          }),
                        )
                      }
                      className="decommission-input"
                    >
                      <option value="">
                        {c.select}
                      </option>

                      {customerServices.map(
                        (
                          item,
                        ) => (
                          <option
                            key={
                              item.id
                            }
                            value={
                              item.id
                            }
                          >
                            {
                              serviceLabel(
                                item,
                              )
                            }
                          </option>
                        ),
                      )}
                    </SharedSelect>
                  </Field>

                  <Field
                    label={
                      c.termination
                    }
                    required
                  >
                    <SharedSelect
                      value={
                        form.termination
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,
                            termination:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      className="decommission-input"
                    >
                      <option value="">
                        {
                          c.noTermination
                        }
                      </option>

                      {relevantTerminations.map(
                        (
                          item,
                        ) => (
                          <option
                            key={
                              item.id
                            }
                            value={
                              item.id
                            }
                          >
                            {
                              terminationLabel(
                                item,
                              )
                            }
                          </option>
                        ),
                      )}
                    </SharedSelect>
                  </Field>

                  <Field
                    label={
                      c.resourceType
                    }
                    required
                  >
                    <input
                      value={
                        form.resource_type
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,
                            resource_type:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      className="hq-input decommission-input"
                    />
                  </Field>

                  <Field
                    label={
                      c.resourceId
                    }
                    required
                  >
                    <input
                      value={
                        form.resource_id
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,
                            resource_id:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      className="hq-input decommission-input"
                    />
                  </Field>

                  <Field
                    label={
                      c.releasedAt
                    }
                  >
                    <input
                      type="datetime-local"
                      value={
                        form.released_at
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,
                            released_at:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      className="hq-input decommission-input"
                    />
                  </Field>

                  <Field
                    label={
                      c.technicianName
                    }
                  >
                    <input
                      value={
                        form.technician_name
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,
                            technician_name:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      className="hq-input decommission-input"
                    />
                  </Field>

                  <Field
                    label={
                      c.status
                    }
                  >
                    <SharedSelect
                      value={
                        form.status
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,
                            status:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      className="decommission-input"
                    >
                      <option value="">
                        {c.select}
                      </option>

                      {STATUS_VALUES.map(
                        (
                          value,
                        ) => (
                          <option
                            key={
                              value
                            }
                            value={
                              value
                            }
                          >
                            {
                              statusLabel(
                                value,
                              )
                            }
                          </option>
                        ),
                      )}
                    </SharedSelect>
                  </Field>

                  <div className="hidden md:block" />

                  <Field
                    label={
                      c.notes
                    }
                    span
                  >
                    <textarea
                      rows={4}
                      value={
                        form.notes
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,
                            notes:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      className="hq-input decommission-input"
                    />
                  </Field>
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-700/60 pt-5 dark:border-white/10">
                  <SharedSecondaryButton
                    type="button"
                    onClick={
                      closeModal
                    }
                    disabled={
                      saving
                    }
                    className="rounded-xl border border-slate-700/60 px-4 py-2 text-sm text-slate-600 dark:border-white/10 dark:text-slate-300"
                  >
                    {c.cancel}
                  </SharedSecondaryButton>

                  <SharedPrimaryButton
                    type="submit"
                    disabled={
                      saving
                    }
                    className="rounded-xl bg-cyan-500 px-5 py-2 text-sm font-black text-white disabled:opacity-50 dark:text-slate-950"
                  >
                    {saving
                      ? c.saving
                      : c.save}
                  </SharedPrimaryButton>
                </div>
              </form>
            )}

            <style>{`
              .decommission-input {
                width: 100%;
                border-radius: .9rem;
                border: 1px solid rgba(148,163,184,.25);
                background: rgba(255,255,255,.72);
                padding: .72rem .85rem;
                color: rgb(15 23 42);
                outline: none;
              }

              .dark .decommission-input {
                border-color: rgba(255,255,255,.10);
                background: rgba(255,255,255,.045);
                color: rgb(241 245 249);
              }

              .decommission-input:focus {
                border-color: rgba(34,211,238,.55);
                box-shadow: 0 0 0 3px rgba(34,211,238,.08);
              }

              .dark .decommission-input option {
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
