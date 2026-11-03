import { WorkspaceModal } from "../../components/Modal";
import { getTranslation as getUiTranslation } from "../../i18n";
import { FormField as Field, PrimaryButton as SharedPrimaryButton, SecondaryButton as SharedSecondaryButton, Select as SharedSelect, DatePicker as SharedDatePicker } from "../../components/Interface";
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
  equipmentAssignmentApi,
  fetchers,
  type Session,
} from "../../lib/api";

import {
  useTranslation,
} from "../../lib/i18n";

type Props = {
  session: Session;
};

type EquipmentAssignment = {
  id: string;
  customer_service: string;
  customer_name?: string;
  service_identifier?: string;
  service_name?: string;
  equipment_type?: string;
  model_name?: string;
  serial_number: string;
  mac_address?: string;
  inventory_ref?: string;
  ownership_type?: string;
  assigned_date?: string | null;
  returned_date?: string | null;
  condition?: string;
  deposit_amount?: string | number;
  status?: string;
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

type FormState = {
  customer_service: string;
  equipment_type: string;
  model_name: string;
  serial_number: string;
  mac_address: string;
  inventory_ref: string;
  ownership_type: string;
  assigned_date: string;
  returned_date: string;
  condition: string;
  deposit_amount: string;
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

const EQUIPMENT_TYPES = [
  "modem",
  "router",
  "ont",
  "cpe",
  "radio",
  "other",
] as const;

const OWNERSHIP_TYPES = [
  "company_owned",
  "sold",
  "rental",
  "loan",
] as const;

const CONDITIONS = [
  "new",
  "good",
  "fair",
  "faulty",
] as const;

const STATUSES = [
  "assigned",
  "returned",
  "damaged",
  "lost",
] as const;

const EMPTY_FORM:
  FormState = {
  customer_service: "",
  equipment_type: "",
  model_name: "",
  serial_number: "",
  mac_address: "",
  inventory_ref: "",
  ownership_type: "",
  assigned_date: "",
  returned_date: "",
  condition: "",
  deposit_amount: "",
  status: "",
  notes: "",
};

const copy = { en: getUiTranslation("en").featureCopy.customers_CustomerEquipmentAssignmentList.copy, fa: getUiTranslation("fa").featureCopy.customers_CustomerEquipmentAssignmentList.copy, ps: getUiTranslation("ps").featureCopy.customers_CustomerEquipmentAssignmentList.copy };



export function CustomerEquipmentAssignmentList({
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
    EquipmentAssignment[]
  >([]);

  const [
    customerServices,
    setCustomerServices,
  ] = useState<
    CustomerServiceOption[]
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
    EquipmentAssignment | null
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

  const labelChoice = (
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

  const load = async () => {
    setLoading(true);

    try {
      const data =
        await fetchers
          .customerEquipmentAssignments(
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
        const data =
          await fetchers
            .customerServices(
              session,
              "?page_size=500",
            );

        setCustomerServices(
          data.results ?? [],
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
            row.service_name,
            row.equipment_type,
            row.model_name,
            row.serial_number,
            row.mac_address,
            row.inventory_ref,
            row.ownership_type,
            row.condition,
            row.status,
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
      EquipmentAssignment,
  ) => {
    setSelected(row);
    setModalMode("view");
  };

  const openEdit = (
    row:
      EquipmentAssignment,
  ) => {
    setSelected(row);

    setForm({
      customer_service:
        row.customer_service
        ?? "",

      equipment_type:
        row.equipment_type
        ?? "",

      model_name:
        row.model_name
        ?? "",

      serial_number:
        row.serial_number
        ?? "",

      mac_address:
        row.mac_address
        ?? "",

      inventory_ref:
        row.inventory_ref
        ?? "",

      ownership_type:
        row.ownership_type
        ?? "",

      assigned_date:
        row.assigned_date
        ?? "",

      returned_date:
        row.returned_date
        ?? "",

      condition:
        row.condition
        ?? "",

      deposit_amount:
        row.deposit_amount == null
          ? ""
          : String(
              row.deposit_amount,
            ),

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
      || !form.serial_number
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

        serial_number:
          form.serial_number
            .trim(),

        model_name:
          form.model_name
            .trim(),

        mac_address:
          form.mac_address
            .trim(),

        inventory_ref:
          form.inventory_ref
            .trim(),

        notes:
          form.notes
            .trim(),
      };

    if (
      form.equipment_type
    ) {
      payload.equipment_type =
        form.equipment_type;
    }

    if (
      form.ownership_type
    ) {
      payload.ownership_type =
        form.ownership_type;
    }

    if (
      form.condition
    ) {
      payload.condition =
        form.condition;
    }

    if (
      form.status
    ) {
      payload.status =
        form.status;
    }

    payload.assigned_date =
      form.assigned_date
        ? form.assigned_date
        : null;

    payload.returned_date =
      form.returned_date
        ? form.returned_date
        : null;

    if (
      form.deposit_amount
        .trim()
    ) {
      payload.deposit_amount =
        form.deposit_amount;
    }

    setSaving(true);
    setNotice(null);

    try {
      if (
        modalMode === "edit"
        && selected
      ) {
        await equipmentAssignmentApi
          .update(
            session,
            selected.id,
            payload,
          );
      } else {
        await equipmentAssignmentApi
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

  return (
    <div className="space-y-5 subscriber-workspace-page">
      <div className="hq-visual-panel rounded-[28px] border border-slate-200/80 bg-white/70 p-5 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.045]">
        <SharedPageHeader native as="div" className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-400">
              {
                t.customersServicesUi
                  .tabEquipment
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
            onClick={openCreate}
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
          placeholder={c.search}
          className="hq-input equipment-input"
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
                  {c.equipmentType}
                </th>

                <th className="px-4 py-3 text-start">
                  {c.modelName}
                </th>

                <th className="px-4 py-3 text-start">
                  {c.serialNumber}
                </th>

                <th className="px-4 py-3 text-start">
                  {c.ownershipType}
                </th>

                <th className="px-4 py-3 text-start">
                  {c.status}
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
                      key={row.id}
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
                          labelChoice(
                            row.equipment_type,
                          )
                        }
                      </td>

                      <td className="px-4 py-3">
                        {
                          row.model_name
                          || "—"
                        }
                      </td>

                      <td className="px-4 py-3 font-mono text-xs text-cyan-700 dark:text-cyan-300">
                        {
                          row.serial_number
                        }
                      </td>

                      <td className="px-4 py-3">
                        {
                          labelChoice(
                            row.ownership_type,
                          )
                        }
                      </td>

                      <td className="px-4 py-3">
                        <span className="rounded-full border border-slate-700/60 bg-slate-900/55 px-2.5 py-1 text-xs font-bold dark:border-white/10 dark:bg-white/[0.05]">
                          {
                            labelChoice(
                              row.status,
                            )
                          }
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <SharedSecondaryButton
                            type="button"
                            onClick={() =>
                              openView(row)
                            }
                            className="rounded-xl border border-slate-700/60 px-3 py-1.5 text-xs font-bold dark:border-white/10"
                          >
                            {c.view}
                          </SharedSecondaryButton>

                          <SharedSecondaryButton
                            type="button"
                            onClick={() =>
                              openEdit(row)
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
              disabled={page <= 1}
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
                page >=
                totalPages
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
        <WorkspaceModal header={<>

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
                onClick={closeModal}
                disabled={saving}
                className="rounded-xl border border-slate-700/60 px-3 py-2 text-slate-500 dark:border-white/10 dark:text-slate-400"
              >
                ×
              </SharedSecondaryButton>

</>} onClose={closeModal} busy={saving}>
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
                    c.service,
                    selected.service_name,
                  ],
                  [
                    c.equipmentType,
                    labelChoice(
                      selected.equipment_type,
                    ),
                  ],
                  [
                    c.modelName,
                    selected.model_name,
                  ],
                  [
                    c.serialNumber,
                    selected.serial_number,
                  ],
                  [
                    c.macAddress,
                    selected.mac_address,
                  ],
                  [
                    c.inventoryRef,
                    selected.inventory_ref,
                  ],
                  [
                    c.ownershipType,
                    labelChoice(
                      selected.ownership_type,
                    ),
                  ],
                  [
                    c.assignedDate,
                    selected.assigned_date,
                  ],
                  [
                    c.returnedDate,
                    selected.returned_date,
                  ],
                  [
                    c.condition,
                    labelChoice(
                      selected.condition,
                    ),
                  ],
                  [
                    c.depositAmount,
                    selected.deposit_amount == null
                      ? ""
                      : String(
                          selected.deposit_amount,
                        ),
                  ],
                  [
                    c.status,
                    labelChoice(
                      selected.status,
                    ),
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
                      className="hq-visual-panel rounded-2xl border border-slate-700/60 bg-slate-50/60 p-4 dark:border-white/10 dark:bg-white/[0.035]"
                    >
                      <div className="text-xs text-slate-500">
                        {label}
                      </div>

                      <div className="mt-1 break-words text-sm font-semibold text-slate-100 dark:text-slate-100">
                        {value || "—"}
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
                onSubmit={submit}
                className="subscriber-dialog-form"
              >
<div className="subscriber-form-fields ">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    label={
                      c.customerService
                    }
                    required
                    span
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
                              event.target
                                .value,
                          }),
                        )
                      }
                      className="equipment-input"
                    >
                      <option value="">
                        {c.select}
                      </option>

                      {customerServices.map(
                        (
                          item,
                        ) => (
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
                    </SharedSelect>
                  </Field>

                  <Field
                    label={
                      c.equipmentType
                    }
                  >
                    <SharedSelect
                      value={
                        form.equipment_type
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,
                            equipment_type:
                              event.target
                                .value,
                          }),
                        )
                      }
                      className="equipment-input"
                    >
                      <option value="">
                        {c.select}
                      </option>

                      {EQUIPMENT_TYPES.map(
                        (
                          value,
                        ) => (
                          <option
                            key={value}
                            value={value}
                          >
                            {
                              labelChoice(
                                value,
                              )
                            }
                          </option>
                        ),
                      )}
                    </SharedSelect>
                  </Field>

                  <Field
                    label={c.modelName}
                  >
                    <input
                      value={
                        form.model_name
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,
                            model_name:
                              event.target
                                .value,
                          }),
                        )
                      }
                      className="hq-input equipment-input"
                    />
                  </Field>

                  <Field
                    label={
                      c.serialNumber
                    }
                    required
                  >
                    <input
                      value={
                        form.serial_number
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,
                            serial_number:
                              event.target
                                .value,
                          }),
                        )
                      }
                      className="hq-input equipment-input"
                    />
                  </Field>

                  <Field
                    label={
                      c.macAddress
                    }
                  >
                    <input
                      value={
                        form.mac_address
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,
                            mac_address:
                              event.target
                                .value,
                          }),
                        )
                      }
                      className="hq-input equipment-input"
                    />
                  </Field>

                  <Field
                    label={
                      c.inventoryRef
                    }
                  >
                    <input
                      value={
                        form.inventory_ref
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,
                            inventory_ref:
                              event.target
                                .value,
                          }),
                        )
                      }
                      className="hq-input equipment-input"
                    />
                  </Field>

                  <Field
                    label={
                      c.ownershipType
                    }
                  >
                    <SharedSelect
                      value={
                        form.ownership_type
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,
                            ownership_type:
                              event.target
                                .value,
                          }),
                        )
                      }
                      className="equipment-input"
                    >
                      <option value="">
                        {c.select}
                      </option>

                      {OWNERSHIP_TYPES.map(
                        (
                          value,
                        ) => (
                          <option
                            key={value}
                            value={value}
                          >
                            {
                              labelChoice(
                                value,
                              )
                            }
                          </option>
                        ),
                      )}
                    </SharedSelect>
                  </Field>

                  <Field
                    label={
                      c.condition
                    }
                  >
                    <SharedSelect
                      value={
                        form.condition
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,
                            condition:
                              event.target
                                .value,
                          }),
                        )
                      }
                      className="equipment-input"
                    >
                      <option value="">
                        {c.select}
                      </option>

                      {CONDITIONS.map(
                        (
                          value,
                        ) => (
                          <option
                            key={value}
                            value={value}
                          >
                            {
                              labelChoice(
                                value,
                              )
                            }
                          </option>
                        ),
                      )}
                    </SharedSelect>
                  </Field>

                  <Field
                    label={
                      c.assignedDate
                    }
                  >
                    <SharedDatePicker
                      type="date"
                      value={
                        form.assigned_date
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,
                            assigned_date:
                              event.target
                                .value,
                          }),
                        )
                      }
                      className="equipment-input"
                    />
                  </Field>

                  <Field
                    label={
                      c.returnedDate
                    }
                  >
                    <SharedDatePicker
                      type="date"
                      value={
                        form.returned_date
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,
                            returned_date:
                              event.target
                                .value,
                          }),
                        )
                      }
                      className="equipment-input"
                    />
                  </Field>

                  <Field
                    label={
                      c.depositAmount
                    }
                  >
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={
                        form.deposit_amount
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,
                            deposit_amount:
                              event.target
                                .value,
                          }),
                        )
                      }
                      className="hq-input equipment-input"
                    />
                  </Field>

                  <Field
                    label={c.status}
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
                              event.target
                                .value,
                          }),
                        )
                      }
                      className="equipment-input"
                    >
                      <option value="">
                        {c.select}
                      </option>

                      {STATUSES.map(
                        (
                          value,
                        ) => (
                          <option
                            key={value}
                            value={value}
                          >
                            {
                              labelChoice(
                                value,
                              )
                            }
                          </option>
                        ),
                      )}
                    </SharedSelect>
                  </Field>

                  <Field
                    label={c.notes}
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
                              event.target
                                .value,
                          }),
                        )
                      }
                      className="hq-input equipment-input"
                    />
                  </Field>
                </div>

                </div>
<div className="subscriber-form-footer">
                  <SharedSecondaryButton
                    type="button"
                    onClick={closeModal}
                    disabled={saving}
                    className="rounded-xl border border-slate-700/60 px-4 py-2 text-sm text-slate-600 dark:border-white/10 dark:text-slate-300"
                  >
                    {c.cancel}
                  </SharedSecondaryButton>

                  <SharedPrimaryButton
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-cyan-500 px-5 py-2 text-sm font-black text-white disabled:opacity-50 dark:text-slate-950"
                  >
                    {saving
                      ? c.saving
                      : c.save}
                  </SharedPrimaryButton>
                </div>
              </form>
            )}

</WorkspaceModal>
      )}
    </div>
  );
}
