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

const copy = {
  en: {
    title:
      "Customer Equipment",
    subtitle:
      "Manage equipment assigned, sold, rented or loaned to customer services.",
    newRecord:
      "Assign equipment",
    create:
      "Assign customer equipment",
    edit:
      "Edit equipment assignment",
    details:
      "Equipment assignment details",
    search:
      "Search equipment...",
    customer:
      "Customer",
    customerService:
      "Customer service",
    service:
      "Service",
    equipmentType:
      "Equipment type",
    modelName:
      "Model",
    serialNumber:
      "Serial number",
    macAddress:
      "MAC address",
    inventoryRef:
      "Inventory reference",
    ownershipType:
      "Ownership type",
    assignedDate:
      "Assigned date",
    returnedDate:
      "Returned date",
    condition:
      "Condition",
    depositAmount:
      "Deposit amount",
    status:
      "Status",
    notes:
      "Notes",
    actions:
      "Actions",
    view:
      "View",
    editAction:
      "Edit",
    save:
      "Save",
    saving:
      "Saving...",
    cancel:
      "Cancel",
    select:
      "Select",
    loading:
      "Loading...",
    noRecords:
      "No customer equipment assignments found.",
    created:
      "Equipment assignment created successfully.",
    updated:
      "Equipment assignment updated successfully.",
    loadFailed:
      "Unable to load equipment assignments.",
    saveFailed:
      "Unable to save equipment assignment.",
    required:
      "Customer service and serial number are required.",
    previous:
      "Previous",
    next:
      "Next",
    page:
      "Page",
    records:
      "records",
    modem:
      "Modem",
    router:
      "Router",
    ont:
      "ONT",
    cpe:
      "CPE",
    radio:
      "Radio",
    other:
      "Other",
    company_owned:
      "Company Owned",
    sold:
      "Sold to Customer",
    rental:
      "Rental",
    loan:
      "Loan",
    new:
      "New",
    good:
      "Good",
    fair:
      "Fair",
    faulty:
      "Faulty",
    assigned:
      "Assigned",
    returned:
      "Returned",
    damaged:
      "Damaged",
    lost:
      "Lost",
  },

  fa: {
    title:
      "تجهیزات مشترک",
    subtitle:
      "مدیریت تجهیزات واگذارشده، فروخته‌شده، کرایه‌ای یا امانت داده‌شده به خدمات مشترکین.",
    newRecord:
      "تخصیص تجهیزات",
    create:
      "تخصیص تجهیزات به مشترک",
    edit:
      "ویرایش تخصیص تجهیزات",
    details:
      "جزئیات تجهیزات مشترک",
    search:
      "جستجوی تجهیزات...",
    customer:
      "مشترک",
    customerService:
      "خدمت مشترک",
    service:
      "خدمت",
    equipmentType:
      "نوع تجهیزات",
    modelName:
      "مدل",
    serialNumber:
      "شماره سریال",
    macAddress:
      "آدرس MAC",
    inventoryRef:
      "مرجع موجودی / انبار",
    ownershipType:
      "نوع مالکیت",
    assignedDate:
      "تاریخ تخصیص",
    returnedDate:
      "تاریخ برگشت",
    condition:
      "وضعیت فزیکی",
    depositAmount:
      "مبلغ تضمین",
    status:
      "وضعیت",
    notes:
      "یادداشت",
    actions:
      "عملیات",
    view:
      "مشاهده",
    editAction:
      "ویرایش",
    save:
      "ذخیره",
    saving:
      "در حال ذخیره...",
    cancel:
      "انصراف",
    select:
      "انتخاب کنید",
    loading:
      "در حال بارگذاری...",
    noRecords:
      "هیچ تجهیزات تخصیص‌یافته موجود نیست.",
    created:
      "تجهیزات با موفقیت تخصیص داده شد.",
    updated:
      "تخصیص تجهیزات با موفقیت ویرایش شد.",
    loadFailed:
      "تجهیزات مشترک بارگذاری نشد.",
    saveFailed:
      "ذخیره تجهیزات انجام نشد.",
    required:
      "خدمت مشترک و شماره سریال الزامی است.",
    previous:
      "قبلی",
    next:
      "بعدی",
    page:
      "صفحه",
    records:
      "رکورد",
    modem:
      "مودم",
    router:
      "روتر",
    ont:
      "ONT",
    cpe:
      "CPE",
    radio:
      "رادیو",
    other:
      "سایر",
    company_owned:
      "ملکیت شرکت",
    sold:
      "فروخته‌شده به مشترک",
    rental:
      "کرایه‌ای",
    loan:
      "امانت",
    new:
      "نو",
    good:
      "خوب",
    fair:
      "متوسط",
    faulty:
      "معیوب",
    assigned:
      "تخصیص‌شده",
    returned:
      "برگشت‌شده",
    damaged:
      "آسیب‌دیده",
    lost:
      "مفقود",
  },

  ps: {
    title:
      "د پېرودونکي وسایل",
    subtitle:
      "د پېرودونکو خدمتونو ته ورکړل شوي، پلورل شوي، کرایه یا پور ورکړل شوي وسایل مدیریت کړئ.",
    newRecord:
      "وسایل تخصیصول",
    create:
      "پېرودونکي ته وسایل تخصیصول",
    edit:
      "د وسایلو تخصیص سمول",
    details:
      "د وسایلو د تخصیص جزئیات",
    search:
      "وسایل ولټوئ...",
    customer:
      "پېرودونکی",
    customerService:
      "د پېرودونکي خدمت",
    service:
      "خدمت",
    equipmentType:
      "د وسیلې ډول",
    modelName:
      "ماډل",
    serialNumber:
      "سریال نمبر",
    macAddress:
      "MAC پته",
    inventoryRef:
      "د ګودام مرجع",
    ownershipType:
      "د مالکیت ډول",
    assignedDate:
      "د تخصیص نېټه",
    returnedDate:
      "د بېرته ستنېدو نېټه",
    condition:
      "فزیکي حالت",
    depositAmount:
      "د تضمین اندازه",
    status:
      "حالت",
    notes:
      "یادښت",
    actions:
      "عملیات",
    view:
      "کتل",
    editAction:
      "سمول",
    save:
      "خوندي کول",
    saving:
      "خوندي کېږي...",
    cancel:
      "لغوه",
    select:
      "انتخاب کړئ",
    loading:
      "بارېږي...",
    noRecords:
      "تخصیص شوي وسایل نشته.",
    created:
      "وسایل په بریالیتوب تخصیص شول.",
    updated:
      "د وسایلو تخصیص په بریالیتوب تازه شو.",
    loadFailed:
      "د پېرودونکي وسایل بار نه شول.",
    saveFailed:
      "وسایل خوندي نه شول.",
    required:
      "د پېرودونکي خدمت او سریال نمبر اجباري دي.",
    previous:
      "مخکینی",
    next:
      "بل",
    page:
      "پاڼه",
    records:
      "ریکارډونه",
    modem:
      "مودم",
    router:
      "روټر",
    ont:
      "ONT",
    cpe:
      "CPE",
    radio:
      "راډیو",
    other:
      "نور",
    company_owned:
      "د شرکت ملکیت",
    sold:
      "پېرودونکي ته پلورل شوی",
    rental:
      "کرایه",
    loan:
      "پور",
    new:
      "نوی",
    good:
      "ښه",
    fair:
      "منځنی",
    faulty:
      "خراب",
    assigned:
      "تخصیص شوی",
    returned:
      "بېرته سپارل شوی",
    damaged:
      "زیانمن",
    lost:
      "ورک",
  },
} as const;

function Field({
  label,
  required,
  span,
  children,
}: {
  label: string;
  required?: boolean;
  span?: boolean;
  children: ReactNode;
}) {
  return (
    <label
      className={
        span
          ? "block space-y-2 md:col-span-2"
          : "block space-y-2"
      }
    >
      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
        {label}

        {required && (
          <span className="ms-1 text-rose-500">
            *
          </span>
        )}
      </span>

      {children}
    </label>
  );
}

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
    <div className="space-y-5">
      <div className="rounded-[28px] border border-slate-200/80 bg-white/70 p-5 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.045]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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

          <button
            type="button"
            onClick={openCreate}
            className="rounded-2xl border border-cyan-300/20 bg-cyan-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-cyan-500/10 transition hover:-translate-y-0.5 dark:text-slate-950"
          >
            {c.newRecord}
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

      <div className="rounded-[28px] border border-slate-200/80 bg-white/70 p-4 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.035]">
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
          className="equipment-input"
        />
      </div>

      <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/70 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.035]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
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

        <div className="flex items-center justify-between gap-4 border-t border-slate-700/60 px-4 py-3 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
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
            </button>

            <button
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
            </button>
          </div>
        </div>
      </div>

      {modalMode && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
          <div className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-[28px] border border-white/10 bg-slate-950/40 p-6 shadow-2xl dark:bg-slate-950">
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

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-xl border border-slate-700/60 px-3 py-2 text-slate-500 dark:border-white/10 dark:text-slate-400"
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
                      className="rounded-2xl border border-slate-700/60 bg-slate-50/60 p-4 dark:border-white/10 dark:bg-white/[0.035]"
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
                className="space-y-5"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    label={
                      c.customerService
                    }
                    required
                    span
                  >
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
                    </select>
                  </Field>

                  <Field
                    label={
                      c.equipmentType
                    }
                  >
                    <select
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
                    </select>
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
                      className="equipment-input"
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
                      className="equipment-input"
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
                      className="equipment-input"
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
                      className="equipment-input"
                    />
                  </Field>

                  <Field
                    label={
                      c.ownershipType
                    }
                  >
                    <select
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
                    </select>
                  </Field>

                  <Field
                    label={
                      c.condition
                    }
                  >
                    <select
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
                    </select>
                  </Field>

                  <Field
                    label={
                      c.assignedDate
                    }
                  >
                    <input
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
                    <input
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
                      className="equipment-input"
                    />
                  </Field>

                  <Field
                    label={c.status}
                  >
                    <select
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
                    </select>
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
                      className="equipment-input"
                    />
                  </Field>
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-700/60 pt-5 dark:border-white/10">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={saving}
                    className="rounded-xl border border-slate-700/60 px-4 py-2 text-sm text-slate-600 dark:border-white/10 dark:text-slate-300"
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

            <style>{`
              .equipment-input {
                width: 100%;
                border-radius: .9rem;
                border: 1px solid rgba(148,163,184,.25);
                background: rgba(255,255,255,.72);
                padding: .72rem .85rem;
                color: rgb(15 23 42);
                outline: none;
              }

              .dark .equipment-input {
                border-color: rgba(255,255,255,.10);
                background: rgba(255,255,255,.045);
                color: rgb(241 245 249);
              }

              .equipment-input:focus {
                border-color: rgba(34,211,238,.55);
                box-shadow: 0 0 0 3px rgba(34,211,238,.08);
              }

              .dark .equipment-input option {
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
