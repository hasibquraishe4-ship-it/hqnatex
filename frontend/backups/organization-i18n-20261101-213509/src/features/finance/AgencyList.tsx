import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
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
  agencyApi,
  fetchers,
  type AgencyPayload,
  type Session,
} from "../../lib/api";

import { useTranslation } from "../../lib/i18n";

type Props = {
  session: Session;
};

type Agency = {
  id: string;
  tenant: string;
  company: string;
  branch: string | null;
  code: string;
  name: string;
  status: "active" | "inactive" | "suspended";
  created_at: string;
  updated_at: string;
};

type CompanyOption = {
  id: string;
  code: string;
  legal_name: string;
  trade_name?: string;
  status?: string;
};

type BranchOption = {
  id: string;
  company: string;
  code: string;
  name: string;
  status?: string;
};

type ModalMode = "create" | "view" | "edit";

type Notice = {
  type: "success" | "error";
  message: string;
};

const EMPTY_FORM: AgencyPayload = {
  company: "",
  branch: null,
  code: "",
  name: "",
  status: "active",
};

export function AgencyList({ session }: Props) {
  const { t } = useTranslation();

  const [data, setData] = useState<Agency[]>([]);
  const [companies, setCompanies] =
    useState<CompanyOption[]>([]);
  const [branches, setBranches] =
    useState<BranchOption[]>([]);

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
    useState<Agency | null>(null);

  const [form, setForm] =
    useState<AgencyPayload>({ ...EMPTY_FORM });

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

      const [
        agencyRes,
        companyRes,
        branchRes,
      ] = await Promise.all([
        fetchers.agencies(session, params),
        fetchers.companies(
          session,
          "?page_size=100&ordering=legal_name",
        ),
        fetchers.branches(
          session,
          "?page_size=100&ordering=name",
        ),
      ]);

      setData(agencyRes.results);
      setTotalCount(agencyRes.count);
      setCompanies(companyRes.results);
      setBranches(branchRes.results);
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

  const companyName = useCallback(
    (companyId: string) => {
      const company =
        companies.find(
          (item) => item.id === companyId,
        );

      if (!company) return companyId;

      return (
        company.trade_name ||
        company.legal_name ||
        company.code
      );
    },
    [companies],
  );

  const branchName = useCallback(
    (branchId: string | null) => {
      if (!branchId) return "—";

      const branch =
        branches.find(
          (item) => item.id === branchId,
        );

      if (!branch) return branchId;

      return `${branch.code} — ${branch.name}`;
    },
    [branches],
  );

  const availableBranches = useMemo(
    () =>
      branches.filter(
        (branch) =>
          branch.company === form.company &&
          branch.status !== "inactive",
      ),
    [branches, form.company],
  );

  const openCreate = () => {
    setNotice(null);
    setSelected(null);

    setForm({
      ...EMPTY_FORM,
      company:
        session.companyId ||
        companies[0]?.id ||
        "",
    });

    setModalMode("create");
  };

  const openView = (row: Agency) => {
    setNotice(null);
    setSelected(row);
    setModalMode("view");
  };

  const openEdit = (row: Agency) => {
    setNotice(null);
    setSelected(row);

    setForm({
      company: row.company,
      branch: row.branch,
      code: row.code,
      name: row.name,
      status: row.status,
    });

    setModalMode("edit");
  };

  const closeModal = () => {
    if (saving) return;

    setModalMode(null);
    setSelected(null);
    setForm({ ...EMPTY_FORM });
  };

  const changeCompany = (
    companyId: string,
  ) => {
    setForm((current) => {
      const branchStillValid =
        current.branch &&
        branches.some(
          (branch) =>
            branch.id === current.branch &&
            branch.company === companyId,
        );

      return {
        ...current,
        company: companyId,
        branch: branchStillValid
          ? current.branch
          : null,
      };
    });
  };

  const updateField = <
    K extends keyof AgencyPayload
  >(
    key: K,
    value: AgencyPayload[K],
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const submitAgency = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const payload: AgencyPayload = {
      company: form.company,
      branch: form.branch || null,
      code: form.code.trim(),
      name: form.name.trim(),
      status: form.status,
    };

    if (
      !payload.company ||
      !payload.code ||
      !payload.name
    ) {
      setNotice({
        type: "error",
        message:
          "Company, agency code and agency name are required.",
      });

      return;
    }

    try {
      setSaving(true);
      setNotice(null);

      if (modalMode === "create") {
        await agencyApi.create(
          session,
          payload,
        );

        setNotice({
          type: "success",
          message:
            "Agency created successfully.",
        });
      } else if (
        modalMode === "edit" &&
        selected
      ) {
        await agencyApi.update(
          session,
          selected.id,
          payload,
        );

        setNotice({
          type: "success",
          message:
            "Agency updated successfully.",
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
            : "Agency operation failed.",
      });
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Agency>[] = [
    {
      header: "Code",
      accessor: "code",
      className:
        "font-mono font-bold text-cyan-400",
      sortable: true,
    },
    {
      header: "Name",
      accessor: "name",
      className:
        "font-bold text-white",
      sortable: true,
    },
    {
      header: "Company",
      accessor: (row) =>
        companyName(row.company),
    },
    {
      header: "Branch",
      accessor: (row) =>
        branchName(row.branch),
    },
    {
      header: "Status",
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
      <div className="organization-record-page agency-page space-y-6 animate-in fade-in duration-500">
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

        <div className="organization-record-header flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
              <Building2 className="h-5 w-5 text-cyan-300" />
            </div>

            <div>
              <h2 className="text-xl font-black tracking-tight text-white">
                {t.common.agencies}
              </h2>

              <p className="mt-1 text-xs font-medium text-slate-500">
                Manage agencies inside the current
                company structure.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950 transition-all hover:scale-[1.02] hover:bg-cyan-400 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            New Agency
          </button>
        </div>

        <DataTable
          className="organization-record-table agency-table"
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
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="View agency"
                onClick={() => openView(row)}
                className="rounded-lg border border-white/5 bg-white/5 p-2 text-slate-400 transition-all hover:bg-white/10 hover:text-white"
              >
                <Eye className="h-4 w-4" />
              </button>

              <button
                type="button"
                aria-label="Edit agency"
                onClick={() => openEdit(row)}
                className="rounded-lg border border-cyan-400/10 bg-cyan-400/5 p-2 text-cyan-400 transition-all hover:bg-cyan-400/10 hover:text-cyan-200"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          )}
        />
      </div>

      {modalMode && (
        <div className="agency-modal-layer fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-md">
          <div className="hq-major-form-dialog relative w-full max-w-2xl overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/90 shadow-[0_30px_120px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />

            <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
                  <Building2 className="h-5 w-5 text-cyan-300" />
                </div>

                <div>
                  <h3 className="font-black text-white">
                    {modalMode === "create"
                      ? "New Agency"
                      : modalMode === "edit"
                        ? "Edit Agency"
                        : "Agency Details"}
                  </h3>

                  <p className="mt-0.5 text-xs text-slate-500">
                    Tenant-scoped agency management
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

            {modalMode === "view" &&
            selected ? (
              <div className="space-y-5 p-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <Detail
                    label="Agency Code"
                    value={selected.code}
                  />

                  <Detail
                    label="Status"
                    value={selected.status}
                  />

                  <Detail
                    label="Agency Name"
                    value={selected.name}
                  />

                  <Detail
                    label="Company"
                    value={companyName(
                      selected.company,
                    )}
                  />

                  <Detail
                    label="Branch"
                    value={branchName(
                      selected.branch,
                    )}
                  />

                  <Detail
                    label="Agency ID"
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
                    Edit Agency
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={submitAgency}
                className="space-y-5 p-6"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    label="Company"
                    required
                  >
                    <select
                      value={form.company}
                      onChange={(event) =>
                        changeCompany(
                          event.target.value,
                        )
                      }
                      className="agency-input"
                    >
                      <option value="">
                        Select Company
                      </option>

                      {companies.map(
                        (company) => (
                          <option
                            key={company.id}
                            value={company.id}
                          >
                            {company.code} —{" "}
                            {company.trade_name ||
                              company.legal_name}
                          </option>
                        ),
                      )}
                    </select>
                  </Field>

                  <Field label="Branch">
                    <select
                      value={form.branch ?? ""}
                      onChange={(event) =>
                        updateField(
                          "branch",
                          event.target.value ||
                            null,
                        )
                      }
                      className="agency-input"
                    >
                      <option value="">
                        No Branch
                      </option>

                      {availableBranches.map(
                        (branch) => (
                          <option
                            key={branch.id}
                            value={branch.id}
                          >
                            {branch.code} —{" "}
                            {branch.name}
                          </option>
                        ),
                      )}
                    </select>
                  </Field>

                  <Field
                    label="Agency Code"
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
                      placeholder="Example: AG001"
                      className="agency-input"
                    />
                  </Field>

                  <Field
                    label="Agency Name"
                    required
                  >
                    <input
                      maxLength={255}
                      value={form.name}
                      onChange={(event) =>
                        updateField(
                          "name",
                          event.target.value,
                        )
                      }
                      placeholder="Agency name"
                      className="agency-input"
                    />
                  </Field>

                  <Field
                    label="Status"
                    required
                  >
                    <select
                      value={form.status}
                      onChange={(event) =>
                        updateField(
                          "status",
                          event.target
                            .value as AgencyPayload["status"],
                        )
                      }
                      className="agency-input"
                    >
                      <option value="active">
                        Active
                      </option>

                      <option value="inactive">
                        Inactive
                      </option>

                      <option value="suspended">
                        Suspended
                      </option>
                    </select>
                  </Field>
                </div>

                {notice &&
                  notice.type === "error" && (
                    <div className="flex items-start gap-3 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-300">
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                      <span>{notice.message}</span>
                    </div>
                  )}

                <div className="flex flex-wrap justify-end gap-3 border-t border-white/10 pt-5">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={closeModal}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-slate-300 transition hover:bg-white/10 disabled:opacity-40"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="flex min-w-32 items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-2 text-sm font-black text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />

                        {modalMode === "create"
                          ? "Create Agency"
                          : "Save Changes"}
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          <style>{`
            .agency-input {
              width: 100%;
              border-radius: 0.9rem;
              border: 1px solid rgba(255,255,255,0.10);
              background: rgba(255,255,255,0.045);
              padding: 0.72rem 0.85rem;
              color: rgb(241 245 249);
              outline: none;
              transition: 160ms ease;
            }

            .agency-input::placeholder {
              color: rgb(71 85 105);
            }

            .agency-input:focus {
              border-color: rgba(34,211,238,0.45);
              background: rgba(34,211,238,0.055);
              box-shadow:
                0 0 0 3px rgba(34,211,238,0.07);
            }

            .agency-input option {
              background: rgb(15 23 42);
              color: white;
            }
          `}</style>
        </div>
      )}
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
  children: ReactNode;
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
          mono
            ? "font-mono text-cyan-300"
            : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
