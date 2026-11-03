import { WorkspaceModal } from "../../components/Modal";
import { PageHeader as SharedPageHeader } from "../../components/PageHeader";
import { PrimaryButton as SharedPrimaryButton, SecondaryButton as SharedSecondaryButton, Select as SharedSelect, FormField as Field, DetailField as Detail } from "../../components/Interface";
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  List,
  Loader2,
  Pencil,
  Plus,
  X,
} from "lucide-react";

import {
  DataTable,
  StatusBadge,
  type Column,
} from "../../components/DataTable";

import {
  fetchers,
  technicalFieldApi,
  type Session,
  type TechnicalFieldPayload,
} from "../../lib/api";

import { useTranslation } from "../../lib/i18n";

type Props = {
  session: Session;
};

type TechnicalField = {
  id: string;
  tenant: string;
  service: string;
  key: string;
  label_english: string;
  label_dari: string;
  label_pashto: string;
  field_type:
    | "text"
    | "integer"
    | "decimal"
    | "boolean"
    | "date"
    | "ip"
    | "cidr"
    | "choice";
  required: boolean;
  options: unknown[];
  sort_order: number;
  status: string;
};

type ServiceOption = {
  id: string;
  code: string;
  name_english: string;
};

type ModalMode = "create" | "view" | "edit";

type Notice = {
  type: "success" | "error";
  message: string;
};

type FormState = {
  service: string;
  key: string;
  label_english: string;
  label_dari: string;
  label_pashto: string;
  field_type: TechnicalField["field_type"];
  required: boolean;
  options: string;
  sort_order: string;
  status: string;
};

const EMPTY_FORM: FormState = {
  service: "",
  key: "",
  label_english: "",
  label_dari: "",
  label_pashto: "",
  field_type: "text",
  required: false,
  options: "[]",
  sort_order: "0",
  status: "active",
};

export function TechnicalFieldList({ session }: Props) {
  const { t } = useTranslation();

  const [data, setData] = useState<TechnicalField[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");

  const [sort, setSort] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);

  const [error, setError] = useState("");

  const [modalMode, setModalMode] =
    useState<ModalMode | null>(null);

  const [selected, setSelected] =
    useState<TechnicalField | null>(null);

  const [form, setForm] =
    useState<FormState>({ ...EMPTY_FORM });

  const [saving, setSaving] = useState(false);

  const [notice, setNotice] =
    useState<Notice | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      let params = `?page=${page}&page_size=${pageSize}`;

      if (searchTerm) {
        params += `&search=${encodeURIComponent(searchTerm)}`;
      }

      if (sort) {
        params += `&ordering=${
          sort.direction === "desc" ? "-" : ""
        }${sort.key}`;
      }

      const [fieldRes, serviceRes] =
        await Promise.all([
          fetchers.technicalFields(session, params),
          fetchers.allServices(
            session,
            "?status=active&ordering=name_english",
          ),
        ]);

      setData(fieldRes.results);
      setTotalCount(fieldRes.count);
      setServices(serviceRes.results);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t.common.noRecords,
      );
    } finally {
      setLoading(false);
    }
  }, [
    session,
    page,
    pageSize,
    searchTerm,
    sort,
    t,
  ]);

  useEffect(() => {
    load();
  }, [load]);

  const serviceName = useCallback(
    (serviceId: string) => {
      const service = services.find(
        (item) => item.id === serviceId,
      );

      return service
        ? `${service.code} — ${service.name_english}`
        : serviceId;
    },
    [services],
  );

  const updateField = <K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const openCreate = () => {
    setNotice(null);
    setSelected(null);
    setForm({ ...EMPTY_FORM });
    setModalMode("create");
  };

  const openView = (row: TechnicalField) => {
    setNotice(null);
    setSelected(row);
    setModalMode("view");
  };

  const openEdit = (row: TechnicalField) => {
    setNotice(null);
    setSelected(row);

    setForm({
      service: row.service,
      key: row.key,
      label_english: row.label_english || "",
      label_dari: row.label_dari || "",
      label_pashto: row.label_pashto || "",
      field_type: row.field_type,
      required: row.required,
      options: JSON.stringify(row.options || [], null, 2),
      sort_order: String(row.sort_order ?? 0),
      status: row.status || "active",
    });

    setModalMode("edit");
  };

  const closeModal = () => {
    if (saving) return;

    setModalMode(null);
    setSelected(null);
    setForm({ ...EMPTY_FORM });
  };

  const submitField = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (
      !form.service ||
      !form.key.trim() ||
      !form.label_english.trim()
    ) {
      setNotice({
        type: "error",
        message:
          t.customersServicesUi.technicalServiceKeyEnglishLabelRequired,
      });
      return;
    }

    const sortOrder = Number(form.sort_order);

    if (!Number.isInteger(sortOrder) || sortOrder < 0) {
      setNotice({
        type: "error",
        message:
          t.customersServicesUi.sortOrderNonNegative,
      });
      return;
    }

    let options: unknown[];

    try {
      const parsed = JSON.parse(
        form.options.trim() || "[]",
      );

      if (!Array.isArray(parsed)) {
        throw new Error();
      }

      options = parsed;
    } catch {
      setNotice({
        type: "error",
        message:
          t.customersServicesUi.optionsValidJsonArray,
      });
      return;
    }

    if (
      form.field_type === "choice" &&
      options.length === 0
    ) {
      setNotice({
        type: "error",
        message:
          "Choice fields require at least one option.",
      });
      return;
    }

    const payload: TechnicalFieldPayload = {
      service: form.service,
      key: form.key.trim(),
      label_english: form.label_english.trim(),
      label_dari: form.label_dari.trim(),
      label_pashto: form.label_pashto.trim(),
      field_type: form.field_type,
      required: form.required,
      options,
      sort_order: sortOrder,
      status: form.status.trim() || "active",
    };

    try {
      setSaving(true);
      setNotice(null);

      if (modalMode === "create") {
        await technicalFieldApi.create(
          session,
          payload,
        );
      } else if (
        modalMode === "edit" &&
        selected
      ) {
        await technicalFieldApi.update(
          session,
          selected.id,
          payload,
        );
      }

      await load();

      setModalMode(null);
      setSelected(null);
      setForm({ ...EMPTY_FORM });

      setNotice({
        type: "success",
        message:
          modalMode === "create"
            ? t.customersServicesUi.technicalFieldCreatedSuccessfully
            : t.customersServicesUi.technicalFieldUpdatedSuccessfully,
      });
    } catch (err) {
      setNotice({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : t.customersServicesUi.technicalFieldOperationFailed,
      });
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<TechnicalField>[] = [
    {
      header: t.serviceCatalog.label,
      accessor: "label_english",
      className: "text-white font-bold",
      sortable: true,
    },
    {
      header: t.serviceCatalog.service,
      accessor: (row) =>
        serviceName(row.service),
    },
    {
      header: t.customersServicesUi.key,
      accessor: "key",
      className: "font-mono text-cyan-400",
      sortable: true,
    },
    {
      header: t.serviceCatalog.fieldType,
      accessor: "field_type",
      sortable: true,
    },
    {
      header: t.serviceCatalog.required,
      accessor: (row) =>
        row.required
          ? t.serviceCatalog.yes
          : t.serviceCatalog.no,
    },
    {
      header: t.customersServicesUi.order,
      accessor: "sort_order",
      sortable: true,
    },
    {
      header: t.customersServicesUi.status,
      accessor: (row) => (
        <StatusBadge
          status={
            t.common[
              row.status as keyof typeof t.common
            ] || row.status
          }
          type={
            row.status === "active"
              ? "success"
              : "default"
          }
        />
      ),
      sortable: true,
    },
  ];

  return (
    <>
      <div className="space-y-6 animate-in fade-in duration-500">
        {notice && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              notice.type === "success"
                ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                : "border-rose-400/20 bg-rose-400/10 text-rose-300"
            }`}
          >
            {notice.message}
          </div>
        )}

        <SharedPageHeader native as="div" className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
              <List className="h-5 w-5 text-cyan-300" />
            </div>

            <div>
              <h2 className="text-xl font-black text-white">
                {t.serviceCatalog.technicalFields}
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {t.serviceCatalog.technicalFieldsDesc}
              </p>
            </div>
          </div>

          <SharedPrimaryButton
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950"
          >
            <Plus className="h-4 w-4" />
            {t.serviceCatalog.addField}
          </SharedPrimaryButton>
        </SharedPageHeader>

        <DataTable
          columns={columns}
          data={data}
          loading={loading}
          totalCount={totalCount}
          currentPage={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onSearch={setSearchTerm}
          onSort={(key, direction) =>
            setSort({ key, direction })
          }
          error={error}
          actions={(row) => (
            <div className="flex gap-2">
              <SharedSecondaryButton
                type="button"
                onClick={() => openView(row)}
                className="rounded-lg border border-white/5 bg-white/5 p-2 text-slate-400"
              >
                <Eye className="h-4 w-4" />
              </SharedSecondaryButton>

              <SharedSecondaryButton
                type="button"
                onClick={() => openEdit(row)}
                className="rounded-lg border border-cyan-400/10 bg-cyan-400/5 p-2 text-cyan-400"
              >
                <Pencil className="h-4 w-4" />
              </SharedSecondaryButton>
            </div>
          )}
        />
      </div>

      {modalMode && (
        <WorkspaceModal header={<>

<h3 className="text-lg font-black text-white">
                {modalMode === "create"
                  ? t.customersServicesUi.newTechnicalField
                  : modalMode === "edit"
                    ? t.customersServicesUi.editTechnicalField
                    : t.customersServicesUi.technicalFieldDetails}
              </h3>

<SharedSecondaryButton
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-xl border border-white/10 p-2 text-slate-400"
              >
                <X className="h-5 w-5" />
              </SharedSecondaryButton>

</>} onClose={closeModal} busy={saving}>
{modalMode === "view" && selected ? (
              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <Detail
                    label={t.customersServicesUi.service}
                    value={serviceName(selected.service)}
                  />
                  <Detail label={t.customersServicesUi.key} value={selected.key} />
                  <Detail
                    label={t.customersServicesUi.englishLabel}
                    value={selected.label_english}
                  />
                  <Detail
                    label="نام دری"
                    value={selected.label_dari || "—"}
                  />
                  <Detail
                    label="نوم پښتو"
                    value={selected.label_pashto || "—"}
                  />
                  <Detail
                    label={t.customersServicesUi.fieldType}
                    value={selected.field_type}
                  />
                  <Detail
                    label={t.customersServicesUi.required}
                    value={selected.required ? "Yes" : "No"}
                  />
                  <Detail
                    label={t.customersServicesUi.sortOrder}
                    value={String(selected.sort_order)}
                  />
                  <Detail
                    label={t.customersServicesUi.status}
                    value={selected.status === "active" ? t.common.active : t.common.inactive}
                  />
                </div>

                <Detail
                  label={t.customersServicesUi.options}
                  value={JSON.stringify(
                    selected.options || [],
                    null,
                    2,
                  )}
                />

                <div className="flex justify-end">
                  <SharedPrimaryButton
                    type="button"
                    onClick={() => openEdit(selected)}
                    className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950"
                  >
                    <Pencil className="h-4 w-4" />
                    {t.customersServicesUi.editTechnicalField}
                  </SharedPrimaryButton>
                </div>
              </div>
            ) : (
              <form
                onSubmit={submitField}
                className="subscriber-dialog-form"
              >
<div className="subscriber-form-fields ">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label={t.customersServicesUi.service} required>
                    <SharedSelect
                      value={form.service}
                      onChange={(e) =>
                        updateField(
                          "service",
                          e.target.value,
                        )
                      }
                      className="tf-input"
                    >
                      <option value="">
                        {t.customersServicesUi.selectService}
                      </option>

                      {services.map((service) => (
                        <option
                          key={service.id}
                          value={service.id}
                        >
                          {service.code} —{" "}
                          {service.name_english}
                        </option>
                      ))}
                    </SharedSelect>
                  </Field>

                  <Field label={t.customersServicesUi.key} required>
                    <input
                      maxLength={100}
                      value={form.key}
                      onChange={(e) =>
                        updateField(
                          "key",
                          e.target.value,
                        )
                      }
                      className="hq-input tf-input"
                    />
                  </Field>

                  <Field label={t.customersServicesUi.englishLabel} required>
                    <input
                      maxLength={160}
                      value={form.label_english}
                      onChange={(e) =>
                        updateField(
                          "label_english",
                          e.target.value,
                        )
                      }
                      className="hq-input tf-input"
                    />
                  </Field>

                  <Field label={t.customersServicesUi.dariName}>
                    <input
                      dir="rtl"
                      maxLength={160}
                      value={form.label_dari}
                      onChange={(e) =>
                        updateField(
                          "label_dari",
                          e.target.value,
                        )
                      }
                      className="hq-input tf-input"
                    />
                  </Field>

                  <Field label="نوم پښتو">
                    <input
                      dir="rtl"
                      maxLength={160}
                      value={form.label_pashto}
                      onChange={(e) =>
                        updateField(
                          "label_pashto",
                          e.target.value,
                        )
                      }
                      className="hq-input tf-input"
                    />
                  </Field>

                  <Field label={t.customersServicesUi.fieldType} required>
                    <SharedSelect
                      value={form.field_type}
                      onChange={(e) =>
                        updateField(
                          "field_type",
                          e.target.value as TechnicalField["field_type"],
                        )
                      }
                      className="tf-input"
                    >
                      <option value="text">{t.customersServicesUi.fieldText}</option>
                      <option value="integer">{t.customersServicesUi.fieldInteger}</option>
                      <option value="decimal">{t.customersServicesUi.fieldDecimal}</option>
                      <option value="boolean">{t.customersServicesUi.fieldBoolean}</option>
                      <option value="date">{t.customersServicesUi.fieldDate}</option>
                      <option value="ip">{t.customersServicesUi.fieldIpAddress}</option>
                      <option value="cidr">{t.customersServicesUi.fieldCidr}</option>
                      <option value="choice">{t.customersServicesUi.fieldChoice}</option>
                    </SharedSelect>
                  </Field>

                  <Field label={t.customersServicesUi.sortOrder}>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={form.sort_order}
                      onChange={(e) =>
                        updateField(
                          "sort_order",
                          e.target.value,
                        )
                      }
                      className="hq-input tf-input"
                    />
                  </Field>

                  <Field label={t.customersServicesUi.status}>
                    <SharedSelect
                      value={form.status}
                      onChange={(e) =>
                        updateField(
                          "status",
                          e.target.value,
                        )
                      }
                      className="tf-input"
                    >
                      <option value="active">{t.common.active}</option>
                      <option value="inactive">{t.common.inactive}</option>
                    </SharedSelect>
                  </Field>
                </div>

                <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <input
                    type="checkbox"
                    checked={form.required}
                    onChange={(e) =>
                      updateField(
                        "required",
                        e.target.checked,
                      )
                    }
                  />

                  <span className="text-sm font-bold text-white">
                    {t.customersServicesUi.requiredField}
                  </span>
                </label>

                <Field label={t.customersServicesUi.optionsJson}>
                  <textarea
                    rows={5}
                    value={form.options}
                    onChange={(e) =>
                      updateField(
                        "options",
                        e.target.value,
                      )
                    }
                    className="hq-input tf-input font-mono text-xs"
                  />
                </Field>

                {notice?.type === "error" && (
                  <div className="flex gap-2 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-300">
                    <AlertTriangle className="h-5 w-5" />
                    {notice.message}
                  </div>
                )}

                </div>
<div className="subscriber-form-footer">
                  <SharedSecondaryButton
                    type="button"
                    onClick={closeModal}
                    disabled={saving}
                    className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300"
                  >
                    Cancel
                  </SharedSecondaryButton>

                  <SharedPrimaryButton
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2 text-sm font-black text-slate-950 disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t.common.saving}
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        {modalMode === "create"
                          ? t.customersServicesUi.createField
                          : t.common.saveChanges}
                      </>
                    )}
                  </SharedPrimaryButton>
                </div>
              </form>
            )}

</WorkspaceModal>
      )}
    </>
  );
}




