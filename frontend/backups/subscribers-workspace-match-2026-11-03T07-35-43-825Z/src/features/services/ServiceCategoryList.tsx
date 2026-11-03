import { PageHeader as SharedPageHeader } from "../../components/PageHeader";
import { PrimaryButton as SharedPrimaryButton, SecondaryButton as SharedSecondaryButton, FormField as Field, DetailField as Detail } from "../../components/Interface";
import { Modal as SharedModal } from "../../components/Modal";
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
  FolderTree,
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
  serviceCategoryApi,
  type ServiceCategoryPayload,
  type Session,
} from "../../lib/api";

import { useTranslation } from "../../lib/i18n";

type Props = {
  session: Session;
};

type ServiceCategory = {
  id: string;
  tenant: string;
  code: string;
  name_english: string;
  name_dari: string;
  name_pashto: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type ModalMode = "create" | "view" | "edit";

type Notice = {
  type: "success" | "error";
  message: string;
};

const EMPTY_FORM: ServiceCategoryPayload = {
  code: "",
  name_english: "",
  name_dari: "",
  name_pashto: "",
  status: "active",
};

export function ServiceCategoryList({
  session,
}: Props) {
  const { t } = useTranslation();

  const [data, setData] =
    useState<ServiceCategory[]>([]);

  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] =
    useState(0);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] =
    useState(10);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [sort, setSort] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);

  const [error, setError] = useState("");

  const [modalMode, setModalMode] =
    useState<ModalMode | null>(null);

  const [selected, setSelected] =
    useState<ServiceCategory | null>(null);

  const [form, setForm] =
    useState<ServiceCategoryPayload>({
      ...EMPTY_FORM,
    });

  const [saving, setSaving] =
    useState(false);

  const [notice, setNotice] =
    useState<Notice | null>(null);

  const load = useCallback(async () => {
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

      const res =
        await fetchers.categories(
          session,
          params,
        );

      setData(res.results);
      setTotalCount(res.count);
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
    setForm({ ...EMPTY_FORM });
    setModalMode("create");
  };

  const openView = (
    row: ServiceCategory,
  ) => {
    setNotice(null);
    setSelected(row);
    setModalMode("view");
  };

  const openEdit = (
    row: ServiceCategory,
  ) => {
    setNotice(null);
    setSelected(row);

    setForm({
      code: row.code,
      name_english: row.name_english,
      name_dari: row.name_dari || "",
      name_pashto:
        row.name_pashto || "",
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

  const updateField = <
    K extends keyof ServiceCategoryPayload
  >(
    key: K,
    value: ServiceCategoryPayload[K],
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const submitCategory = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const payload: ServiceCategoryPayload =
      {
        code: form.code.trim(),
        name_english:
          form.name_english.trim(),
        name_dari:
          form.name_dari.trim(),
        name_pashto:
          form.name_pashto.trim(),
        status:
          form.status.trim() || "active",
      };

    if (
      !payload.code ||
      !payload.name_english
    ) {
      setNotice({
        type: "error",
        message:
          t.customersServicesUi.categoryCodeEnglishNameRequired,
      });

      return;
    }

    try {
      setSaving(true);
      setNotice(null);

      if (modalMode === "create") {
        await serviceCategoryApi.create(
          session,
          payload,
        );
      } else if (
        modalMode === "edit" &&
        selected
      ) {
        await serviceCategoryApi.update(
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
            ? t.customersServicesUi.serviceCategoryCreatedSuccessfully
            : t.customersServicesUi.serviceCategoryUpdatedSuccessfully,
      });
    } catch (err) {
      setNotice({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : t.customersServicesUi.serviceCategoryOperationFailed,
      });
    } finally {
      setSaving(false);
    }
  };

  const columns:
    Column<ServiceCategory>[] = [
    {
      header: t.services.code,
      accessor: "code",
      className:
        "font-mono font-bold text-cyan-400",
      sortable: true,
    },
    {
      header: t.customersServicesUi.englishName,
      accessor: "name_english",
      className:
        "font-bold text-white",
      sortable: true,
    },
    {
      header: "نام دری",
      accessor: (row) =>
        row.name_dari || "—",
    },
    {
      header: "نوم پښتو",
      accessor: (row) =>
        row.name_pashto || "—",
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
  ];

  return (
    <>
      <div className="space-y-6 animate-in fade-in duration-500">
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
              <FolderTree className="h-5 w-5 text-cyan-300" />
            </div>

            <div>
              <h2 className="text-xl font-black tracking-tight text-white">
                {
                  t.serviceCatalog
                    .categories
                }
              </h2>

              <p className="mt-1 text-xs font-medium text-slate-500">
                {
                  t.serviceCatalog
                    .categoriesDesc
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
            {
              t.serviceCatalog
                .addCategory
            }
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
          onPageSizeChange={
            setPageSize
          }
          onSearch={setSearchTerm}
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
                aria-label={t.customersServicesUi.viewCategory}
                onClick={() =>
                  openView(row)
                }
                className="rounded-lg border border-white/5 bg-white/5 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                <Eye className="h-4 w-4" />
              </SharedSecondaryButton>

              <SharedSecondaryButton
                type="button"
                aria-label={t.customersServicesUi.editCategory}
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
        <div className="hq-visual-overlay fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-md">
          <SharedModal native className="relative w-full max-w-2xl overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/90 shadow-[0_30px_120px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />

            <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
                  <FolderTree className="h-5 w-5 text-cyan-300" />
                </div>

                <div>
                  <h3 className="font-black text-white">
                    {modalMode ===
                    "create"
                      ? t.customersServicesUi.newServiceCategory
                      : modalMode ===
                          "edit"
                        ? t.customersServicesUi.editServiceCategory
                        : t.customersServicesUi.serviceCategoryDetails}
                  </h3>

                  <p className="mt-0.5 text-xs text-slate-500">
                    {t.customersServicesUi.serviceCategoryManagementDesc}
                  </p>
                </div>
              </div>

              <SharedSecondaryButton
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
              >
                <X className="h-5 w-5" />
              </SharedSecondaryButton>
            </div>

            {modalMode ===
              "view" &&
            selected ? (
              <div className="space-y-5 p-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <Detail
                    label={t.customersServicesUi.code}
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
                    label={t.customersServicesUi.categoryId}
                    value={selected.id}
                    mono
                  />
                </div>

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
                    {t.customersServicesUi.editServiceCategory}
                  </SharedPrimaryButton>
                </div>
              </div>
            ) : (
              <form
                onSubmit={
                  submitCategory
                }
                className="space-y-5 p-6"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    label={t.customersServicesUi.categoryCode}
                    required
                  >
                    <input
                      maxLength={64}
                      value={form.code}
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "code",
                          event.target
                            .value,
                        )
                      }
                      placeholder={t.customersServicesUi.exampleInternet}
                      className="hq-input category-input"
                    />
                  </Field>

                  <Field
                    label={t.customersServicesUi.status}
                    required
                  >
                    <input
                      value={
                        form.status
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "status",
                          event.target
                            .value,
                        )
                      }
                      list="service-category-status-options"
                      placeholder={t.customersServicesUi.statusCodePlaceholder}
                      className="hq-input category-input"
                    />

                    <datalist id="service-category-status-options">
                      <option value="active">{t.common.active}</option>
                      <option value="inactive">{t.common.inactive}</option>
                    </datalist>
                  </Field>

                  <Field
                    label={t.customersServicesUi.englishName}
                    required
                  >
                    <input
                      maxLength={160}
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
                      placeholder={t.customersServicesUi.englishCategoryNamePlaceholder}
                      className="hq-input category-input"
                    />
                  </Field>

                  <Field label={t.customersServicesUi.dariName}>
                    <input
                      dir="rtl"
                      maxLength={160}
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
                      placeholder="نام کتگوری به دری"
                      className="hq-input category-input"
                    />
                  </Field>

                  <Field label="نوم پښتو">
                    <input
                      dir="rtl"
                      maxLength={160}
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
                      placeholder="د کتګورۍ نوم"
                      className="hq-input category-input"
                    />
                  </Field>
                </div>

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
                    disabled={saving}
                    onClick={closeModal}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-slate-300 transition hover:bg-white/10 disabled:opacity-40"
                  >
                    Cancel
                  </SharedSecondaryButton>

                  <SharedPrimaryButton
                    type="submit"
                    disabled={saving}
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
                          ? t.customersServicesUi.createCategory
                          : t.common.saveChanges}
                      </>
                    )}
                  </SharedPrimaryButton>
                </div>
              </form>
            )}
          </SharedModal>

          <style>{`
            .category-input {
              width: 100%;
              border-radius: 0.9rem;
              border: 1px solid rgba(255,255,255,0.10);
              background: rgba(255,255,255,0.045);
              padding: 0.72rem 0.85rem;
              color: rgb(241 245 249);
              outline: none;
              transition: 160ms ease;
            }

            .category-input::placeholder {
              color: rgb(71 85 105);
            }

            .category-input:focus {
              border-color: rgba(34,211,238,0.45);
              background: rgba(34,211,238,0.055);
              box-shadow:
                0 0 0 3px rgba(34,211,238,0.07);
            }
          `}</style>
        </div>
      )}
    </>
  );
}




