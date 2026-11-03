import { PageHeader as SharedPageHeader } from "../../components/PageHeader";
import { PrimaryButton as SharedPrimaryButton, SecondaryButton as SharedSecondaryButton, Select as SharedSelect, FormField as Field, DetailField as Detail } from "../../components/Interface";
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
  CheckCircle2,
  Eye,
  Landmark,
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
  accountApi,
  fetchers,
  type AccountPayload,
  type Session,
} from "../../lib/api";

type Props = {
  session: Session;
};

type Account = {
  id: string;
  tenant: string;
  company: string;

  parent: string | null;

  code: string;
  name: string;

  account_type:
    | "asset"
    | "liability"
    | "equity"
    | "revenue"
    | "expense";

  normal_balance:
    | "debit"
    | "credit";

  is_posting: boolean;

  status:
    | "active"
    | "inactive";

  description: string;

  created_at: string;
  updated_at: string;
};

type ModalMode =
  | "create"
  | "view"
  | "edit";

type Notice = {
  type: "success" | "error";
  message: string;
};

const EMPTY_FORM: AccountPayload = {
  parent: null,
  code: "",
  name: "",
  account_type: "asset",
  normal_balance: "debit",
  is_posting: true,
  status: "active",
  description: "",
};

export function AccountList({
  session,
}: Props) {
  const [data, setData] =
    useState<Account[]>([]);

  const [allAccounts, setAllAccounts] =
    useState<Account[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

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

  const [notice, setNotice] =
    useState<Notice | null>(null);

  const [modalMode, setModalMode] =
    useState<ModalMode | null>(null);

  const [selected, setSelected] =
    useState<Account | null>(null);

  const [form, setForm] =
    useState<AccountPayload>({
      ...EMPTY_FORM,
    });

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

      const [
        listRes,
        parentRes,
      ] = await Promise.all([
        fetchers.accounts(
          session,
          params,
        ),

        fetchers.accounts(
          session,
          "?page_size=500&ordering=code",
        ),
      ]);

      setData(listRes.results);
      setTotalCount(listRes.count);

      setAllAccounts(
        parentRes.results,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load finance accounts.",
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
  ]);

  useEffect(() => {
    load();
  }, [load]);

  const parentOptions =
    useMemo(
      () =>
        allAccounts.filter(
          (account) =>
            account.id !==
            selected?.id,
        ),
      [
        allAccounts,
        selected,
      ],
    );

  const parentLabel = (
    parentId: string | null,
  ) => {
    if (!parentId) {
      return "Root Account";
    }

    const parent =
      allAccounts.find(
        (account) =>
          account.id === parentId,
      );

    if (!parent) {
      return parentId;
    }

    return `${parent.code} — ${parent.name}`;
  };

  const updateField = <
    K extends keyof AccountPayload
  >(
    key: K,
    value: AccountPayload[K],
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const openCreate = () => {
    setSelected(null);
    setNotice(null);

    setForm({
      ...EMPTY_FORM,
    });

    setModalMode("create");
  };

  const openView = async (
    row: Account,
  ) => {
    try {
      setSaving(true);
      setNotice(null);

      const fresh:
        Account =
        await accountApi.retrieve(
          session,
          row.id,
        );

      setSelected(fresh);
      setModalMode("view");
    } catch (err) {
      setNotice({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Unable to load account.",
      });
    } finally {
      setSaving(false);
    }
  };

  const openEdit = async (
    row: Account,
  ) => {
    try {
      setSaving(true);
      setNotice(null);

      const fresh:
        Account =
        await accountApi.retrieve(
          session,
          row.id,
        );

      setSelected(fresh);

      setForm({
        parent:
          fresh.parent,

        code:
          fresh.code,

        name:
          fresh.name,

        account_type:
          fresh.account_type,

        normal_balance:
          fresh.normal_balance,

        is_posting:
          fresh.is_posting,

        status:
          fresh.status,

        description:
          fresh.description || "",
      });

      setModalMode("edit");
    } catch (err) {
      setNotice({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Unable to load account.",
      });
    } finally {
      setSaving(false);
    }
  };

  const closeModal = () => {
    if (saving) return;

    setModalMode(null);
    setSelected(null);

    setForm({
      ...EMPTY_FORM,
    });
  };

  const submitAccount = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!session.companyId) {
      setNotice({
        type: "error",
        message:
          "An active company must be selected.",
      });

      return;
    }

    const payload:
      AccountPayload = {
      parent:
        form.parent || null,

      code:
        form.code.trim(),

      name:
        form.name.trim(),

      account_type:
        form.account_type,

      normal_balance:
        form.normal_balance,

      is_posting:
        form.is_posting,

      status:
        form.status,

      description:
        form.description.trim(),
    };

    if (!payload.code) {
      setNotice({
        type: "error",
        message:
          "Account code is required.",
      });

      return;
    }

    if (!payload.name) {
      setNotice({
        type: "error",
        message:
          "Account name is required.",
      });

      return;
    }

    if (
      selected &&
      payload.parent === selected.id
    ) {
      setNotice({
        type: "error",
        message:
          "An account cannot be its own parent.",
      });

      return;
    }

    try {
      setSaving(true);
      setNotice(null);

      let result:
        Account;

      if (
        modalMode === "create"
      ) {
        result =
          await accountApi.create(
            session,
            payload,
          );
      } else if (
        modalMode === "edit" &&
        selected
      ) {
        result =
          await accountApi.update(
            session,
            selected.id,
            payload,
          );
      } else {
        return;
      }

      await load();

      setSelected(result);
      setModalMode("view");

      setNotice({
        type: "success",
        message:
          modalMode === "create"
            ? "Finance account created successfully."
            : "Finance account updated successfully.",
      });
    } catch (err) {
      setNotice({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Account operation failed.",
      });
    } finally {
      setSaving(false);
    }
  };

  const columns:
    Column<Account>[] = [
    {
      header: "Account Code",
      accessor: "code",
      className:
        "font-mono font-bold text-cyan-400",
      sortable: true,
    },

    {
      header: "Account Name",
      accessor: "name",
      className:
        "font-bold text-white",
      sortable: true,
    },

    {
      header: "Type",
      accessor: (row) => (
        <span className="capitalize">
          {row.account_type}
        </span>
      ),
      sortable: true,
    },

    {
      header: "Normal Balance",
      accessor: (row) => (
        <span className="capitalize">
          {row.normal_balance}
        </span>
      ),
      sortable: true,
    },

    {
      header: "Parent",
      accessor: (row) =>
        parentLabel(
          row.parent,
        ),
    },

    {
      header: "Posting",
      accessor: (row) =>
        row.is_posting
          ? "Posting"
          : "Summary",
      sortable: true,
      sortKey:
        "is_posting",
    },

    {
      header: "Status",
      accessor: (row) => (
        <StatusBadge
          status={row.status}
          type={
            row.status ===
            "active"
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
              notice.type ===
              "success"
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
              <Landmark className="h-5 w-5 text-cyan-300" />
            </div>

            <div>
              <h2 className="text-xl font-black text-white">
                Chart of Accounts
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Company-scoped financial account hierarchy
              </p>
            </div>
          </div>

          <SharedPrimaryButton
            type="button"
            onClick={
              openCreate
            }
            className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950"
          >
            <Plus className="h-4 w-4" />
            New Account
          </SharedPrimaryButton>
        </SharedPageHeader>

        <div className="rounded-xl border border-cyan-400/10 bg-cyan-400/5 px-4 py-3 text-xs text-cyan-100">
          Balances are not displayed because the current Finance backend contains Chart of Accounts only; no Journal/Ledger balance engine is implemented yet.
        </div>

        <DataTable
          columns={columns}
          data={data}
          loading={loading}
          totalCount={
            totalCount
          }
          currentPage={
            page
          }
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
            <div className="flex gap-2">

              <SharedSecondaryButton
                type="button"
                onClick={() =>
                  openView(row)
                }
                className="rounded-lg border border-white/5 bg-white/5 p-2 text-slate-400"
                title="View"
              >
                <Eye className="h-4 w-4" />
              </SharedSecondaryButton>

              <SharedSecondaryButton
                type="button"
                onClick={() =>
                  openEdit(row)
                }
                className="rounded-lg border border-cyan-400/10 bg-cyan-400/5 p-2 text-cyan-400"
                title="Edit"
              >
                <Pencil className="h-4 w-4" />
              </SharedSecondaryButton>
            </div>
          )}
        />
      </div>

      {modalMode && (
        <div className="hq-visual-overlay fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">

          <div className="hq-visual-panel hq-visual-dialog max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-[28px] border border-white/10 bg-slate-950 p-6 shadow-2xl">

            <div className="mb-6 flex items-center justify-between">

              <div>
                <h3 className="text-lg font-black text-white">
                  {modalMode ===
                  "create"
                    ? "Create Finance Account"
                    : modalMode ===
                        "edit"
                      ? "Edit Finance Account"
                      : "Finance Account Details"}
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Company is taken automatically from the active company context.
                </p>
              </div>

              <SharedSecondaryButton
                type="button"
                onClick={
                  closeModal
                }
                disabled={
                  saving
                }
                className="rounded-xl border border-white/10 p-2 text-slate-400"
              >
                <X className="h-5 w-5" />
              </SharedSecondaryButton>
            </div>

            {modalMode ===
              "view" &&
            selected ? (
              <div className="space-y-5">

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

                  <Detail
                    label="Account Code"
                    value={
                      selected.code
                    }
                  />

                  <Detail
                    label="Account Name"
                    value={
                      selected.name
                    }
                  />

                  <Detail
                    label="Account Type"
                    value={
                      selected.account_type
                    }
                  />

                  <Detail
                    label="Normal Balance"
                    value={
                      selected.normal_balance
                    }
                  />

                  <Detail
                    label="Parent Account"
                    value={
                      parentLabel(
                        selected.parent,
                      )
                    }
                  />

                  <Detail
                    label="Account Mode"
                    value={
                      selected.is_posting
                        ? "Posting Account"
                        : "Summary / Category Account"
                    }
                  />

                  <Detail
                    label="Status"
                    value={
                      selected.status
                    }
                  />

                  <Detail
                    label="Account ID"
                    value={
                      selected.id
                    }
                    mono
                  />
                </div>

                <Detail
                  label="Description"
                  value={
                    selected.description ||
                    "—"
                  }
                />

                <div className="flex justify-end border-t border-white/10 pt-5">

                  <SharedSecondaryButton
                    type="button"
                    onClick={() =>
                      openEdit(
                        selected,
                      )
                    }
                    className="flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-300"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit Account
                  </SharedSecondaryButton>
                </div>
              </div>
            ) : (
              <form
                onSubmit={
                  submitAccount
                }
                className="space-y-5"
              >

                <div className="grid gap-4 md:grid-cols-2">

                  <Field
                    label="Account Code"
                    required
                  >
                    <input
                      maxLength={64}
                      value={
                        form.code
                      }
                      onChange={(
                        e,
                      ) =>
                        updateField(
                          "code",
                          e.target.value,
                        )
                      }
                      placeholder="Example: 1100"
                      className="hq-input account-input"
                    />
                  </Field>

                  <Field
                    label="Account Name"
                    required
                  >
                    <input
                      maxLength={255}
                      value={
                        form.name
                      }
                      onChange={(
                        e,
                      ) =>
                        updateField(
                          "name",
                          e.target.value,
                        )
                      }
                      placeholder="Example: Cash"
                      className="hq-input account-input"
                    />
                  </Field>

                  <Field
                    label="Account Type"
                    required
                  >
                    <SharedSelect
                      value={
                        form.account_type
                      }
                      onChange={(
                        e,
                      ) =>
                        updateField(
                          "account_type",
                          e.target
                            .value as AccountPayload["account_type"],
                        )
                      }
                      className="account-input"
                    >
                      <option value="asset">
                        Asset
                      </option>

                      <option value="liability">
                        Liability
                      </option>

                      <option value="equity">
                        Equity
                      </option>

                      <option value="revenue">
                        Revenue
                      </option>

                      <option value="expense">
                        Expense
                      </option>
                    </SharedSelect>
                  </Field>

                  <Field
                    label="Normal Balance"
                    required
                  >
                    <SharedSelect
                      value={
                        form.normal_balance
                      }
                      onChange={(
                        e,
                      ) =>
                        updateField(
                          "normal_balance",
                          e.target
                            .value as AccountPayload["normal_balance"],
                        )
                      }
                      className="account-input"
                    >
                      <option value="debit">
                        Debit
                      </option>

                      <option value="credit">
                        Credit
                      </option>
                    </SharedSelect>
                  </Field>

                  <Field label="Parent Account">
                    <SharedSelect
                      value={
                        form.parent ||
                        ""
                      }
                      onChange={(
                        e,
                      ) =>
                        updateField(
                          "parent",
                          e.target.value ||
                            null,
                        )
                      }
                      className="account-input"
                    >
                      <option value="">
                        Root Account
                      </option>

                      {parentOptions.map(
                        (account) => (
                          <option
                            key={
                              account.id
                            }
                            value={
                              account.id
                            }
                          >
                            {account.code} — {account.name}
                          </option>
                        ),
                      )}
                    </SharedSelect>
                  </Field>

                  <Field
                    label="Status"
                    required
                  >
                    <SharedSelect
                      value={
                        form.status
                      }
                      onChange={(
                        e,
                      ) =>
                        updateField(
                          "status",
                          e.target
                            .value as AccountPayload["status"],
                        )
                      }
                      className="account-input"
                    >
                      <option value="active">
                        Active
                      </option>

                      <option value="inactive">
                        Inactive
                      </option>
                    </SharedSelect>
                  </Field>
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">

                  <input
                    type="checkbox"
                    checked={
                      form.is_posting
                    }
                    onChange={(
                      e,
                    ) =>
                      updateField(
                        "is_posting",
                        e.target.checked,
                      )
                    }
                    className="mt-1 h-4 w-4 accent-cyan-400"
                  />

                  <div>
                    <p className="text-sm font-bold text-white">
                      Posting Account
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Enabled: future journal entries may post directly to this account. Disabled: this account acts as a summary/category node.
                    </p>
                  </div>
                </label>

                <Field label="Description">
                  <textarea
                    rows={4}
                    value={
                      form.description
                    }
                    onChange={(
                      e,
                    ) =>
                      updateField(
                        "description",
                        e.target.value,
                      )
                    }
                    className="hq-input account-input resize-y"
                  />
                </Field>

                {notice?.type ===
                  "error" && (
                  <ErrorBox>
                    {notice.message}
                  </ErrorBox>
                )}

                <div className="flex justify-end gap-3 border-t border-white/10 pt-5">

                  <SharedSecondaryButton
                    type="button"
                    onClick={
                      closeModal
                    }
                    disabled={
                      saving
                    }
                    className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300"
                  >
                    Cancel
                  </SharedSecondaryButton>

                  <SharedPrimaryButton
                    type="submit"
                    disabled={
                      saving
                    }
                    className="flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2 text-sm font-black text-slate-950 disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />

                        {modalMode ===
                        "create"
                          ? "Create Account"
                          : "Save Changes"}
                      </>
                    )}
                  </SharedPrimaryButton>
                </div>
              </form>
            )}

            <style>{`
              .account-input {
                width: 100%;
                border-radius: .9rem;
                border: 1px solid rgba(255,255,255,.10);
                background: rgba(255,255,255,.045);
                padding: .72rem .85rem;
                color: rgb(241 245 249);
                outline: none;
              }

              .account-input:focus {
                border-color: rgba(34,211,238,.45);
                box-shadow:
                  0 0 0 3px rgba(34,211,238,.07);
              }

              .account-input option {
                background: rgb(15 23 42);
                color: white;
              }
            `}</style>
          </div>
        </div>
      )}
    </>
  );
}





function ErrorBox({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex gap-2 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-300">

      <AlertTriangle className="h-5 w-5 shrink-0" />

      <span>
        {children}
      </span>
    </div>
  );
}
