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
  Loader2,
  Pencil,
  Plus,
  RadioTower,
  X,
} from "lucide-react";

import {
  DataTable,
  StatusBadge,
  type Column,
} from "../../components/DataTable";

import {
  fetchers,
  serviceApi,
  type ServicePayload,
  type Session,
} from "../../lib/api";

import { useTranslation } from "../../lib/i18n";

type Props = {
  session: Session;
};

type Service = {
  id: string;
  tenant: string;
  category: string;
  category_name: string;
  code: string;
  name_english: string;
  name_dari: string;
  name_pashto: string;
  status: "active" | "inactive";
  translation_status: "complete" | "pending";
  pricing_model: string;
  technical_summary: string;
  supports_equipment: boolean | null;
  supports_noc: boolean | null;
  capabilities: Record<string, unknown>;
  source_status: string;
  technical_fields?: unknown[];
  created_at: string;
  updated_at: string;
};

type CategoryOption = {
  id: string;
  code: string;
  name_english: string;
  name_dari?: string;
  name_pashto?: string;
  status?: string;
};

type ModalMode =
  | "create"
  | "view"
  | "edit";

type Notice = {
  type: "success" | "error";
  message: string;
};

type ServiceForm = {
  category: string;
  code: string;
  name_english: string;
  name_dari: string;
  name_pashto: string;
  status: "active" | "inactive";
  translation_status:
    | "complete"
    | "pending";
  pricing_model: string;
  technical_summary: string;
  supports_equipment:
    | ""
    | "true"
    | "false";
  supports_noc:
    | ""
    | "true"
    | "false";
  capabilities: string;
};

const EMPTY_FORM: ServiceForm = {
  category: "",
  code: "",
  name_english: "",
  name_dari: "",
  name_pashto: "",
  status: "active",
  translation_status: "pending",
  pricing_model: "",
  technical_summary: "",
  supports_equipment: "",
  supports_noc: "",
  capabilities: "{}",
};

function parseNullableBoolean(
  value: "" | "true" | "false",
): boolean | null {
  if (value === "") return null;
  return value === "true";
}

function booleanToForm(
  value: boolean | null,
): "" | "true" | "false" {
  if (value === null) return "";
  return value ? "true" : "false";
}

export function ServiceList({
  session,
}: Props) {
  const { t } = useTranslation();

  const [data, setData] =
    useState<Service[]>([]);

  const [categories, setCategories] =
    useState<CategoryOption[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [totalCount, setTotalCount] =
    useState(0);

  const [page, setPage] =
    useState(1);

  const [pageSize, setPageSize] =
    useState(10);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [sort, setSort] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);

  const [error, setError] =
    useState("");

  const [modalMode, setModalMode] =
    useState<ModalMode | null>(null);

  const [selected, setSelected] =
    useState<Service | null>(null);

  const [form, setForm] =
    useState<ServiceForm>({
      ...EMPTY_FORM,
    });

  const [saving, setSaving] =
    useState(false);

  const [notice, setNotice] =
    useState<Notice | null>(null);

  const load =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        let params =
          `?page=${page}&page_size=${pageSize}`;

        if (searchTerm) {
          params +=
            `&search=${encodeURIComponent(
              searchTerm,
            )}`;
        }

        if (sort) {
          params +=
            `&ordering=${
              sort.direction === "desc"
                ? "-"
                : ""
            }${sort.key}`;
        }

        const [
          serviceRes,
          categoryRes,
        ] = await Promise.all([
          fetchers.services(
            session,
            params,
          ),
          fetchers.categories(
            session,
            "?page_size=100&ordering=name_english",
          ),
        ]);

        setData(serviceRes.results);
        setTotalCount(
          serviceRes.count,
        );

        setCategories(
          categoryRes.results,
        );
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

  const openCreate = () => {
    setNotice(null);
    setSelected(null);
    setForm({
      ...EMPTY_FORM,
    });
    setModalMode("create");
  };

  const openView = (
    row: Service,
  ) => {
    setNotice(null);
    setSelected(row);
    setModalMode("view");
  };

  const openEdit = (
    row: Service,
  ) => {
    setNotice(null);
    setSelected(row);

    setForm({
      category: row.category,
      code: row.code,
      name_english:
        row.name_english || "",
      name_dari:
        row.name_dari || "",
      name_pashto:
        row.name_pashto || "",
      status: row.status,
      translation_status:
        row.translation_status,
      pricing_model:
        row.pricing_model || "",
      technical_summary:
        row.technical_summary || "",
      supports_equipment:
        booleanToForm(
          row.supports_equipment,
        ),
      supports_noc:
        booleanToForm(
          row.supports_noc,
        ),
      capabilities:
        JSON.stringify(
          row.capabilities || {},
          null,
          2,
        ),
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

  const updateField = <
    K extends keyof ServiceForm
  >(
    key: K,
    value: ServiceForm[K],
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const submitService = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (
      !form.category ||
      !form.code.trim() ||
      !form.name_english.trim()
    ) {
      setNotice({
        type: "error",
        message:
          t.customersServicesUi.serviceCategoryCodeEnglishNameRequired,
      });

      return;
    }
let capabilities:
      Record<string, unknown>;

    try {
      const parsed =
        JSON.parse(
          form.capabilities.trim() ||
            "{}",
        );

      if (
        typeof parsed !==
          "object" ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        throw new Error();
      }

      capabilities = parsed;
    } catch {
      setNotice({
        type: "error",
        message:
          t.customersServicesUi.capabilitiesInvalid,
      });

      return;
    }

    const payload:
      ServicePayload = {
      category: form.category,
      code: form.code.trim(),
      name_english:
        form.name_english.trim(),
      name_dari:
        form.name_dari.trim(),
      name_pashto:
        form.name_pashto.trim(),
      status: form.status,
      translation_status:
        form.translation_status,
      pricing_model:
        form.pricing_model.trim(),
      technical_summary:
        form.technical_summary.trim(),
      supports_equipment:
        parseNullableBoolean(
          form.supports_equipment,
        ),
      supports_noc:
        parseNullableBoolean(
          form.supports_noc,
        ),
      capabilities,
    };

    try {
      setSaving(true);
      setNotice(null);

      if (
        modalMode === "create"
      ) {
        await serviceApi.create(
          session,
          payload,
        );
      } else if (
        modalMode === "edit" &&
        selected
      ) {
        await serviceApi.update(
          session,
          selected.id,
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
          modalMode === "create"
            ? t.customersServicesUi.serviceCreatedSuccessfully
            : t.customersServicesUi.serviceUpdatedSuccessfully,
      });
    } catch (err) {
      setNotice({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : t.customersServicesUi.serviceOperationFailed,
      });
    } finally {
      setSaving(false);
    }
  };

  const columns:
    Column<Service>[] = [
    {
      header: t.services.code,
      accessor: "code",
      className:
        "font-mono font-bold text-cyan-400",
      sortable: true,
    },
    {
      header: t.services.name,
      accessor: "name_english",
      className:
        "font-bold text-white",
      sortable: true,
      sortKey: "name_english",
    },
    {
      header: t.services.category,
      accessor: (row) =>
        row.category_name || "—",
    },
    {
      header: t.customersServicesUi.source,
      accessor: (row) =>
        row.source_status || "—",
    },
    {
      header: t.customersServicesUi.translation,
      accessor: (row) =>
        row.translation_status ||
        "—",
    },
    {
      header: t.services.status,
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
    {
      header: t.revenue.from,
      accessor: (row) =>
        row.created_at
          ? new Date(
              row.created_at,
            ).toLocaleDateString()
          : "—",
      sortable: true,
      sortKey: "created_at",
    },
  ];

  return (
    <>
      <div className="hq-subscriber-page space-y-6 animate-in fade-in duration-500">
        {notice && (
          <div
            className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm backdrop-blur-xl ${
              notice.type === "success"
                ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                : "border-rose-400/20 bg-rose-400/10 text-rose-300"
            }`}
          >
            {notice.type ===
            "success" ? (
              <CheckCircle2 className="h-5 w-5 shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 shrink-0" />
            )}

            <span>
              {notice.message}
            </span>
          </div>
        )}

        <SharedPageHeader native as="div" className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
              <RadioTower className="h-5 w-5 text-cyan-300" />
            </div>

            <div>
              <h2 className="text-xl font-black tracking-tight text-white">
                {t.services.title}
              </h2>

              <p className="mt-1 text-xs font-medium text-slate-500">
                {
                  t.services
                    .subtitle
                }
              </p>
            </div>
          </div>

          <SharedPrimaryButton
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950 transition-all hover:scale-[1.02] hover:bg-cyan-400 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            {t.customersServicesUi.newService}
          </SharedPrimaryButton>
        </SharedPageHeader>

        <DataTable
          columns={columns}
          data={data}
          loading={loading}
          totalCount={
            totalCount
          }
          currentPage={page}
          pageSize={
            pageSize
          }
          onPageChange={
            setPage
          }
          onPageSizeChange={
            setPageSize
          }
          onSearch={
            setSearchTerm
          }
          onSort={(
            key,
            direction,
          ) =>
            setSort({
              key,
              direction,
            })
          }
          error={error}
          actions={(row) => (
            <div className="flex items-center gap-2">
              <SharedSecondaryButton
                type="button"
                aria-label={t.customersServicesUi.viewService}
                onClick={() =>
                  openView(row)
                }
                className="rounded-lg border border-white/5 bg-white/5 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                <Eye className="h-4 w-4" />
              </SharedSecondaryButton>

              <SharedSecondaryButton
                type="button"
                aria-label={t.customersServicesUi.editService}
                onClick={() =>
                  openEdit(row)
                }
                className="rounded-lg border border-cyan-400/10 bg-cyan-400/5 p-2 text-cyan-400 transition hover:bg-cyan-400/10 hover:text-cyan-200"
              >
                <Pencil className="h-4 w-4" />
              </SharedSecondaryButton>
            </div>
          )}
        />
      </div>

      {modalMode && (
        <div className="hq-subscriber-modal-layer fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-md">
          <div className="hq-subscriber-dialog relative max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-[28px] border border-white/10 bg-slate-950/95 shadow-[0_30px_120px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />

            <div className="hq-subscriber-dialog-header sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-slate-950/90 px-6 py-5 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
                  <RadioTower className="h-5 w-5 text-cyan-300" />
                </div>

                <div>
                  <h3 className="font-black text-white">
                    {modalMode ===
                    "create"
                      ? t.customersServicesUi.newService
                      : modalMode ===
                          "edit"
                        ? t.customersServicesUi.editService
                        : t.customersServicesUi.serviceDetails}
                  </h3>

                  <p className="mt-0.5 text-xs text-slate-500">
                    {t.customersServicesUi.serviceCatalogManagementDesc}
                  </p>
                </div>
              </div>

              <SharedSecondaryButton
                type="button"
                onClick={
                  closeModal
                }
                disabled={
                  saving
                }
                className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
              >
                <X className="h-5 w-5" />
              </SharedSecondaryButton>
            </div>

            {modalMode ===
              "view" &&
            selected ? (
              <div className="space-y-5 p-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Detail
                    label={t.customersServicesUi.serviceCode}
                    value={
                      selected.code
                    }
                  />

                  <Detail
                    label={t.customersServicesUi.status}
                    value={
                      selected.status
                    }
                  />

                  <Detail
                    label={t.customersServicesUi.category}
                    value={
                      selected.category_name ||
                      selected.category
                    }
                  />

                  <Detail
                    label={t.customersServicesUi.englishName}
                    value={
                      selected.name_english
                    }
                  />

                  <Detail
                    label="نام دری"
                    value={
                      selected.name_dari ||
                      "—"
                    }
                  />

                  <Detail
                    label="نوم پښتو"
                    value={
                      selected.name_pashto ||
                      "—"
                    }
                  />

                  <Detail
                    label={t.customersServicesUi.translationStatus}
                    value={
                      selected.translation_status
                    }
                  />

                  <Detail
                    label={t.customersServicesUi.pricingModel}
                    value={
                      selected.pricing_model ||
                      "—"
                    }
                  />

                  <Detail
                    label={t.customersServicesUi.sourceStatus}
                    value={
                      selected.source_status ||
                      "—"
                    }
                  />

                  <Detail
                    label={t.customersServicesUi.supportsEquipment}
                    value={
                      selected.supports_equipment ===
                      null
                        ? t.customersServicesUi.notSpecified
                        : selected.supports_equipment
                          ? "Yes"
                          : "No"
                    }
                  />

                  <Detail
                    label={t.customersServicesUi.supportsNoc}
                    value={
                      selected.supports_noc ===
                      null
                        ? t.customersServicesUi.notSpecified
                        : selected.supports_noc
                          ? "Yes"
                          : "No"
                    }
                  />

                  <Detail
                    label={t.customersServicesUi.serviceId}
                    value={
                      selected.id
                    }
                    mono
                  />
                </div>

                <Detail
                  label={t.customersServicesUi.technicalSummary}
                  value={
                    selected.technical_summary ||
                    "—"
                  }
                />

                <Detail
                  label={t.customersServicesUi.capabilities}
                  value={JSON.stringify(
                    selected.capabilities ||
                      {},
                    null,
                    2,
                  )}
                  mono
                />

                <div className="flex justify-end border-t border-white/10 pt-5">
                  <SharedPrimaryButton
                    type="button"
                    onClick={() =>
                      openEdit(
                        selected,
                      )
                    }
                    className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-400"
                  >
                    <Pencil className="h-4 w-4" />
                    {t.customersServicesUi.editService}
                  </SharedPrimaryButton>
                </div>
              </div>
            ) : (
              <form
                onSubmit={
                  submitService
                }
                className="space-y-6 p-6"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    label={t.customersServicesUi.category}
                    required
                  >
                    <SharedSelect
                      value={
                        form.category
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "category",
                          event.target
                            .value,
                        )
                      }
                      className="service-input"
                    >
                      <option value="">
                        {t.customersServicesUi.selectCategory}
                      </option>

                      {categories.map(
                        (
                          category,
                        ) => (
                          <option
                            key={
                              category.id
                            }
                            value={
                              category.id
                            }
                          >
                            {
                              category.code
                            }{" "}
                            —{" "}
                            {
                              category.name_english
                            }
                          </option>
                        ),
                      )}
                    </SharedSelect>
                  </Field>

                  <Field
                    label={t.customersServicesUi.serviceCode}
                    required
                  >
                    <input
                      maxLength={80}
                      value={
                        form.code
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "code",
                          event.target
                            .value,
                        )
                      }
                      placeholder={t.customersServicesUi.exampleDsl}
                      className="service-input"
                    />
                  </Field>

                  <Field
                    label={t.customersServicesUi.englishName}
                    required
                  >
                    <input
                      maxLength={200}
                      value={
                        form.name_english
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "name_english",
                          event.target
                            .value,
                        )
                      }
                      placeholder={t.customersServicesUi.englishServiceNamePlaceholder}
                      className="service-input"
                    />
                  </Field>

                  <Field label={t.customersServicesUi.dariName}>
                    <input
                      dir="rtl"
                      maxLength={200}
                      value={
                        form.name_dari
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "name_dari",
                          event.target
                            .value,
                        )
                      }
                      placeholder="نام خدمات به دری"
                      className="service-input"
                    />
                  </Field>

                  <Field label="نوم پښتو">
                    <input
                      dir="rtl"
                      maxLength={200}
                      value={
                        form.name_pashto
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "name_pashto",
                          event.target
                            .value,
                        )
                      }
                      placeholder="د خدمت نوم"
                      className="service-input"
                    />
                  </Field>

                  <Field
                    label={t.customersServicesUi.status}
                    required
                  >
                    <SharedSelect
                      value={
                        form.status
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "status",
                          event.target
                            .value as ServiceForm["status"],
                        )
                      }
                      className="service-input"
                    >
                      <option value="inactive">
                        {t.common.inactive}
                      </option>

                      <option value="active">
                        {t.common.active}
                      </option>
                    </SharedSelect>
                  </Field>

                  <Field
                    label={t.customersServicesUi.translationStatus}
                    required
                  >
                    <SharedSelect
                      value={
                        form.translation_status
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "translation_status",
                          event.target
                            .value as ServiceForm["translation_status"],
                        )
                      }
                      className="service-input"
                    >
                      <option value="pending">
                        {t.common.pending}
                      </option>

                      <option value="complete">
                        {t.common.complete}
                      </option>
                    </SharedSelect>
                  </Field>

                  <Field label={t.customersServicesUi.pricingModel}>
                    <input
                      maxLength={80}
                      value={
                        form.pricing_model
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "pricing_model",
                          event.target
                            .value,
                        )
                      }
                      placeholder={t.customersServicesUi.exampleMonthly}
                      className="service-input"
                    />
                  </Field>

                  <Field label={t.customersServicesUi.supportsEquipment}>
                    <SharedSelect
                      value={
                        form.supports_equipment
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "supports_equipment",
                          event.target
                            .value as ServiceForm["supports_equipment"],
                        )
                      }
                      className="service-input"
                    >
                      <option value="">
                        Not specified
                      </option>

                      <option value="true">
                        Yes
                      </option>

                      <option value="false">
                        No
                      </option>
                    </SharedSelect>
                  </Field>

                  <Field label={t.customersServicesUi.supportsNoc}>
                    <SharedSelect
                      value={
                        form.supports_noc
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "supports_noc",
                          event.target
                            .value as ServiceForm["supports_noc"],
                        )
                      }
                      className="service-input"
                    >
                      <option value="">
                        Not specified
                      </option>

                      <option value="true">
                        Yes
                      </option>

                      <option value="false">
                        No
                      </option>
                    </SharedSelect>
                  </Field>
                </div>

                <Field label={t.customersServicesUi.technicalSummary}>
                  <textarea
                    rows={4}
                    value={
                      form.technical_summary
                    }
                    onChange={(
                      event,
                    ) =>
                      updateField(
                        "technical_summary",
                        event.target
                          .value,
                      )
                    }
                    placeholder={t.customersServicesUi.technicalDescriptionPlaceholder}
                    className="service-input resize-y"
                  />
                </Field>

                <Field label={t.customersServicesUi.capabilitiesJson}>
                  <textarea
                    rows={7}
                    spellCheck={false}
                    value={
                      form.capabilities
                    }
                    onChange={(
                      event,
                    ) =>
                      updateField(
                        "capabilities",
                        event.target
                          .value,
                      )
                    }
                    placeholder='{"example": true}'
                    className="service-input resize-y font-mono text-xs"
                  />
                </Field>
{notice &&
                  notice.type ===
                    "error" && (
                    <div className="flex items-start gap-3 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-300">
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />

                      <span>
                        {
                          notice.message
                        }
                      </span>
                    </div>
                  )}

                <div className="flex flex-wrap justify-end gap-3 border-t border-white/10 pt-5">
                  <SharedSecondaryButton
                    type="button"
                    disabled={
                      saving
                    }
                    onClick={
                      closeModal
                    }
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-slate-300 transition hover:bg-white/10 disabled:opacity-40"
                  >
                    Cancel
                  </SharedSecondaryButton>

                  <SharedPrimaryButton
                    type="submit"
                    disabled={
                      saving
                    }
                    className="flex min-w-32 items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-2 text-sm font-black text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t.common.saving}
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />

                        {modalMode ===
                        "create"
                          ? t.customersServicesUi.createService
                          : t.common.saveChanges}
                      </>
                    )}
                  </SharedPrimaryButton>
                </div>
              </form>
            )}
          </div>

          
        </div>
      )}
    </>
  );
}




