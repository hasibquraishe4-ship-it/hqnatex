import { createPortal } from "react-dom";
﻿import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Eye,
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
  companyApi,
  fetchers,
  type CompanyPayload,
  type Session,
} from "../../lib/api";

import { useTranslation } from "../../lib/i18n";

type Props = {
  session: Session;
};

type Company = {
  id: string;
  tenant: string;
  code: string;
  legal_name: string;
  trade_name: string;
  status: "active" | "inactive" | "suspended";
  is_primary: boolean;
  created_at: string;
  updated_at: string;
};

type ModalMode = "create" | "view" | "edit";

type Notice = {
  type: "success" | "error";
  message: string;
};

const EMPTY_FORM: CompanyPayload = {
  code: "",
  legal_name: "",
  trade_name: "",
  status: "active",
  is_primary: false,
};

export function CompanyList({ session }: Props) {
  const { t } = useTranslation();

  const [data, setData] = useState<Company[]>([]);
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
    useState<Company | null>(null);

  const [form, setForm] =
    useState<CompanyPayload>({ ...EMPTY_FORM });

  const [saving, setSaving] = useState(false);

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
          `&search=${encodeURIComponent(searchTerm)}`;
      }

      if (sort) {
        params +=
          `&ordering=${sort.direction === "desc" ? "-" : ""}${sort.key}`;
      }

      const res =
        await fetchers.companies(session, params);

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

  const openView = (row: Company) => {
    setNotice(null);
    setSelected(row);
    setModalMode("view");
  };

  const openEdit = (row: Company) => {
    setNotice(null);
    setSelected(row);

    setForm({
      code: row.code,
      legal_name: row.legal_name,
      trade_name: row.trade_name ?? "",
      status: row.status,
      is_primary: row.is_primary,
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
    K extends keyof CompanyPayload
  >(
    key: K,
    value: CompanyPayload[K],
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const submitCompany = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const payload: CompanyPayload = {
      code: form.code.trim(),
      legal_name: form.legal_name.trim(),
      trade_name: form.trade_name?.trim() ?? "",
      status: form.status,
      is_primary: form.is_primary,
    };

    if (!payload.code || !payload.legal_name) {
      setNotice({
        type: "error",
        message:
          t.organizationRecords.company.required,
      });
      return;
    }

    try {
      setSaving(true);
      setNotice(null);

      if (modalMode === "create") {
        await companyApi.create(
          session,
          payload,
        );

        setNotice({
          type: "success",
          message:
            t.organizationRecords.company.created,
        });
      } else if (
        modalMode === "edit" &&
        selected
      ) {
        await companyApi.update(
          session,
          selected.id,
          payload,
        );

        setNotice({
          type: "success",
          message:
            t.organizationRecords.company.updated,
        });
      }

      await load();

      setModalMode(null);
      setSelected(null);
      setForm({ ...EMPTY_FORM });
    } catch (err) {
      setNotice({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : t.organizationRecords.company.failed,
      });
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Company>[] = [
    {
      header: t.organizationRecords.common.code,
      accessor: "code",
      className:
        "font-mono text-cyan-400 font-bold",
      sortable: true,
    },
    {
      header: t.organizationRecords.company.legalName,
      accessor: "legal_name",
      className:
        "text-white font-bold",
      sortable: true,
    },
    {
      header: t.organizationRecords.company.tradeName,
      accessor: "trade_name",
    },
    {
      header: t.organizationRecords.common.status,
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
      header: t.organizationRecords.company.primary,
      accessor: (row) =>
        row.is_primary ? (
          <span className="inline-flex items-center rounded-md border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-black uppercase text-cyan-400">
                    {t.organizationRecords.company.primary}
                  </span>
        ) : (
          "-"
        ),
      sortable: true,
    },
  ];

  return (
    <>
      <div className="organization-record-page company-page space-y-3 animate-in fade-in duration-500">
        {notice && (
          <div
            className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm backdrop-blur-xl ${
              notice.type === "success"
                ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                : "border-rose-400/20 bg-rose-400/10 text-rose-300"
            }`}
          >
            {notice.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 shrink-0" />
            )}

            <span>{notice.message}</span>
          </div>
        )}

        <div className="company-page-header flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 shadow-[0_8px_30px_rgba(34,211,238,0.08)]">
              <Building2 className="h-5 w-5 text-cyan-300" />
            </div>

            <div>
              <h2 className="text-xl font-black tracking-tight text-white">
                    {t.organizationRecords.company.title}
                  </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950 shadow-[0_10px_35px_rgba(6,182,212,0.18)] transition-all hover:scale-[1.02] hover:bg-cyan-400 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
                    {t.organizationRecords.company.new}
                  </button>
        </div>

        <DataTable
          exportPlacement="row"
          columns={columns}
          data={data}
          loading={loading}
          totalCount={totalCount}
          currentPage={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onSearch={setSearchTerm}
          className="company-project-table company-inline-actions"
          onSort={(key, direction) =>
            setSort({ key, direction })
          }
          error={error}
          actions={(row) => (
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={t.organizationRecords.company.view}
                onClick={() => openView(row)}
                className="rounded-lg border border-white/5 bg-white/5 p-2 text-slate-400 transition-all hover:bg-white/10 hover:text-white"
              >
                <Eye className="h-4 w-4" />
              </button>

              <button
                type="button"
                aria-label={t.organizationRecords.company.edit}
                onClick={() => openEdit(row)}
                className="rounded-lg border border-cyan-400/10 bg-cyan-400/5 p-2 text-cyan-400 transition-all hover:bg-cyan-400/10 hover:text-cyan-200"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          )}
        />
      </div>

      {modalMode && createPortal(
        <div className="org-dialog-layer company-modal-layer fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-md">
          <div className="org-record-dialog company-dialog hq-major-form-dialog relative w-full max-w-2xl overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/90 shadow-[0_30px_120px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />

            <div className="org-dialog-header flex items-center justify-between border-b border-white/10 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
                  <Building2 className="h-5 w-5 text-cyan-300" />
                </div>

                <div>
                  <h3 className="font-black text-white">
                    {modalMode === "create"
                      ? t.organizationRecords.company.new
                      : modalMode === "edit"
                        ? t.organizationRecords.company.edit
                        : t.organizationRecords.company.details}
                  </h3>

                  <p className="mt-0.5 text-xs text-slate-500">
                    {t.organizationRecords.company.subtitle}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {modalMode === "view" && selected ? (
              <div className="org-dialog-view company-form-body space-y-5 p-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <Detail
                    label={t.organizationRecords.company.code}
                    value={selected.code}
                  />

                  <Detail
                    label={t.organizationRecords.common.status}
                    value={t.common[selected.status as keyof typeof t.common] || selected.status}
                  />

                  <Detail
                    label={t.organizationRecords.company.legalName}
                    value={selected.legal_name}
                  />

                  <Detail
                    label={t.organizationRecords.company.tradeName}
                    value={
                      selected.trade_name || "â€”"
                    }
                  />

                  <Detail
                    label={t.organizationRecords.company.primary}
                    value={
                      selected.is_primary
                        ? t.organizationRecords.common.yes
                        : t.organizationRecords.common.no
                    }
                  />

                  <Detail
                    label={t.organizationRecords.company.id}
                    value={selected.id}
                    mono
                  />
                </div>

                <div className="flex justify-end border-t border-white/10 pt-5">
                  <button
                    type="button"
                    onClick={() =>
                      openEdit(selected)
                    }
                    className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-400"
                  >
                    <Pencil className="h-4 w-4" />
                    {t.organizationRecords.company.edit}
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={submitCompany}
                className="org-record-form company-form-body space-y-5 p-6"
              >
                <div className="org-dialog-scroll">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    label={t.organizationRecords.company.code}
                    required
                  >
                    <input
                      autoFocus
                      maxLength={64}
                      value={form.code}
                      onChange={(event) =>
                        updateField(
                          "code",
                          event.target.value,
                        )
                      }
                      placeholder={t.organizationRecords.company.example}
                      className="company-input"
                    />
                  </Field>

                  <Field
                    label={t.organizationRecords.common.status}
                    required
                  >
                    <select
                      value={form.status}
                      onChange={(event) =>
                        updateField(
                          "status",
                          event.target.value as CompanyPayload["status"],
                        )
                      }
                      className="company-input"
                    >
                      <option value="active">
                    {t.organizationRecords.common.active}
                  </option>
                      <option value="inactive">
                    {t.organizationRecords.common.inactive}
                  </option>
                      <option value="suspended">
                    {t.organizationRecords.common.suspended}
                  </option>
                    </select>
                  </Field>

                  <Field
                    label={t.organizationRecords.company.legalName}
                    required
                  >
                    <input
                      maxLength={255}
                      value={form.legal_name}
                      onChange={(event) =>
                        updateField(
                          "legal_name",
                          event.target.value,
                        )
                      }
                      placeholder={t.organizationRecords.company.legalPlaceholder}
                      className="company-input"
                    />
                  </Field>

                  <Field label={t.organizationRecords.company.tradeName}>
                    <input
                      maxLength={255}
                      value={form.trade_name ?? ""}
                      onChange={(event) =>
                        updateField(
                          "trade_name",
                          event.target.value,
                        )
                      }
                      placeholder={t.organizationRecords.company.tradePlaceholder}
                      className="company-input"
                    />
                  </Field>
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition hover:bg-white/[0.055]">
                  <input
                    type="checkbox"
                    checked={form.is_primary}
                    onChange={(event) =>
                      updateField(
                        "is_primary",
                        event.target.checked,
                      )
                    }
                    className="mt-1 h-4 w-4 accent-cyan-400"
                  />

                  <span>
                    <span className="block text-sm font-bold text-white">
                    {t.organizationRecords.company.primary}
                  </span>

                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                    {t.organizationRecords.company.primaryHint}
                  </span>
                  </span>
                </label>

                {notice &&
                  notice.type === "error" && (
                    <div className="flex items-start gap-3 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-300">
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                      <span>{notice.message}</span>
                    </div>
                  )}

                </div>
                <div className="org-dialog-footer flex flex-wrap justify-end gap-3 border-t border-white/10 pt-5">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={closeModal}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-slate-300 transition hover:bg-white/10 disabled:opacity-40"
                  >
                    {t.organizationRecords.common.cancel}
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="flex min-w-32 items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-2 text-sm font-black text-slate-950 shadow-[0_10px_35px_rgba(6,182,212,0.18)] transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                    {t.organizationRecords.common.saving}
                  </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />

                        {modalMode === "create"
                          ? t.organizationRecords.company.create
                          : t.organizationRecords.common.saveChanges}
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

        </div>,
        document.querySelector(".hq-shell") ?? document.body,
      )}
      <style>{`
        /* Company list only: the existing download remains a single row action. */
        .hq-shell.hq-shared-shell .company-page .company-inline-actions td > div:has(> .hq-row-export) {
          display:inline-flex!important;flex-direction:row!important;flex-wrap:nowrap!important;
          align-items:center!important;justify-content:flex-start!important;gap:8px!important;
          width:max-content!important;max-width:none!important;min-height:36px!important;
          margin:0!important;padding:0!important;position:static!important;
        }
        .hq-shell.hq-shared-shell .company-page .company-inline-actions td > div:has(> .hq-row-export) > div:not(.hq-row-export) {
          order:1!important;display:inline-flex!important;flex-direction:row!important;flex-wrap:nowrap!important;
          align-items:center!important;gap:8px!important;margin:0!important;padding:0!important;flex:0 0 auto!important;
        }
        .hq-shell.hq-shared-shell .company-page .company-inline-actions .hq-row-export {
          order:2!important;display:inline-flex!important;align-items:center!important;align-self:center!important;
          flex:0 0 auto!important;position:relative!important;inset:auto!important;
          transform:none!important;width:auto!important;height:36px!important;min-height:0!important;margin:0!important;padding:0!important;
        }
        .hq-shell.hq-shared-shell .company-page .company-inline-actions .hq-row-export > div {
          display:inline-flex!important;align-items:center!important;position:relative!important;
          inset:auto!important;transform:none!important;margin:0!important;padding:0!important;
        }
        .hq-shell.hq-shared-shell .company-page .company-inline-actions td button:not(.hq-table-export-menu button) {
          display:inline-flex!important;align-items:center!important;justify-content:center!important;
          box-sizing:border-box;width:36px!important;height:36px!important;min-height:36px!important;
          padding:8px!important;border-radius:8px!important;margin:0!important;
          border:1px solid var(--hq-ui-border)!important;background:var(--hq-ui-soft)!important;
          box-shadow:inset 0 1px 0 rgba(255,255,255,.55),0 3px 0 rgba(15,50,75,.22),0 6px 12px rgba(15,50,75,.14)!important;
        }
        .hq-shell.hq-shared-shell .company-page .company-inline-actions td button:not(.hq-table-export-menu button):hover {
          background:var(--hq-ui-hover)!important;
        }
      `}</style>
    </>
  );
}

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-2">
      <span className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
        {label}

        {required && (
          <span className="ms-1 text-cyan-400">
            *
          </span>
        )}
      </span>

      {children}
    </label>
  );
}

function Detail({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>

      <p
        className={`mt-2 break-all text-sm font-bold text-slate-100 ${
          mono ? "font-mono text-cyan-300" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}




