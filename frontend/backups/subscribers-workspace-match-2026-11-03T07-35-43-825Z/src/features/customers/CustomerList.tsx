import { PageHeader as SharedPageHeader } from "../../components/PageHeader";
import { PrimaryButton as SharedPrimaryButton, SecondaryButton as SharedSecondaryButton, Select as SharedSelect, FormField as Field, DetailField as Detail } from "../../components/Interface";
import { Modal as SharedModal } from "../../components/Modal";
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
  Loader2,
  Pencil,
  UserPlus,
  X,
} from "lucide-react";

import {
  DataTable,
  StatusBadge,
  type Column,
} from "../../components/DataTable";

import {
  customerApi,
  fetchers,
  type CustomerPayload,
  type Session,
} from "../../lib/api";

import { useTranslation } from "../../lib/i18n";

type Props = {
  session: Session;
};

type Customer = {
  id: string;
  tenant: string;
  company: string;
  company_name: string;

  branch: string | null;
  branch_name: string | null;

  agency: string | null;
  agency_name: string | null;

  code: string;

  customer_type:
    | "individual"
    | "business"
    | "government";

  display_name: string;
  phone: string;
  email: string;
  address: string;
  external_reference: string;

  status:
    | "active"
    | "inactive"
    | "blocked";

  created_at: string;
  updated_at: string;
};

type BranchOption = {
  id: string;
  company: string;
  code: string;
  name: string;
  status?: string;
};

type AgencyOption = {
  id: string;
  company: string;
  branch: string | null;
  code: string;
  name: string;
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

type CustomerForm = {
  code: string;
  branch: string;
  agency: string;
  customer_type:
    | "individual"
    | "business"
    | "government";
  display_name: string;
  phone: string;
  email: string;
  address: string;
  external_reference: string;
  status:
    | "active"
    | "inactive"
    | "blocked";
};

const EMPTY_FORM: CustomerForm = {
  code: "",
  branch: "",
  agency: "",
  customer_type: "individual",
  display_name: "",
  phone: "",
  email: "",
  address: "",
  external_reference: "",
  status: "active",
};

export function CustomerList({
  session,
}: Props) {
  const { t } = useTranslation();

  const [data, setData] =
    useState<Customer[]>([]);

  const [branches, setBranches] =
    useState<BranchOption[]>([]);

  const [agencies, setAgencies] =
    useState<AgencyOption[]>([]);

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
    useState<Customer | null>(null);

  const [form, setForm] =
    useState<CustomerForm>({
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

      const [
        customerRes,
        branchRes,
        agencyRes,
      ] = await Promise.all([
        fetchers.customers(
          session,
          params,
        ),
        fetchers.branches(
          session,
          "?page_size=100&ordering=name",
        ),
        fetchers.agencies(
          session,
          "?page_size=100&ordering=name",
        ),
      ]);

      setData(customerRes.results);
      setTotalCount(
        customerRes.count,
      );

      setBranches(
        branchRes.results,
      );

      setAgencies(
        agencyRes.results,
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

  const companyBranches = useMemo(
    () =>
      branches.filter(
        (branch) =>
          (!session.companyId ||
            branch.company ===
              session.companyId) &&
          branch.status !== "inactive",
      ),
    [
      branches,
      session.companyId,
    ],
  );

  const availableAgencies = useMemo(
    () =>
      agencies.filter(
        (agency) => {
          if (
            session.companyId &&
            agency.company !==
              session.companyId
          ) {
            return false;
          }

          if (
            agency.status ===
              "inactive" ||
            agency.status ===
              "suspended"
          ) {
            return false;
          }

          if (
            form.branch &&
            agency.branch &&
            agency.branch !==
              form.branch
          ) {
            return false;
          }

          return true;
        },
      ),
    [
      agencies,
      form.branch,
      session.companyId,
    ],
  );

  const updateField = <
    K extends keyof CustomerForm
  >(
    key: K,
    value: CustomerForm[K],
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const changeBranch = (
    branchId: string,
  ) => {
    setForm((current) => {
      const selectedAgency =
        agencies.find(
          (agency) =>
            agency.id ===
            current.agency,
        );

      const agencyStillValid =
        !selectedAgency ||
        !branchId ||
        !selectedAgency.branch ||
        selectedAgency.branch ===
          branchId;

      return {
        ...current,
        branch: branchId,
        agency: agencyStillValid
          ? current.agency
          : "",
      };
    });
  };

  const openCreate = () => {
    setNotice(null);
    setSelected(null);
    setForm({
      ...EMPTY_FORM,
    });
    setModalMode("create");
  };

  const openView = (
    row: Customer,
  ) => {
    setNotice(null);
    setSelected(row);
    setModalMode("view");
  };

  const openEdit = (
    row: Customer,
  ) => {
    setNotice(null);
    setSelected(row);

    setForm({
      code: row.code || "",
      branch:
        row.branch || "",
      agency:
        row.agency || "",
      customer_type:
        row.customer_type,
      display_name:
        row.display_name,
      phone:
        row.phone || "",
      email:
        row.email || "",
      address:
        row.address || "",
      external_reference:
        row.external_reference ||
        "",
      status:
        row.status,
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

  const submitCustomer = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!form.display_name.trim()) {
      setNotice({
        type: "error",
        message:
          t.customersServicesUi.customerDisplayNameRequired,
      });
      return;
    }

    const payload:
      CustomerPayload = {
      branch:
        form.branch || null,
      agency:
        form.agency || null,
      customer_type:
        form.customer_type,
      display_name:
        form.display_name.trim(),
      phone:
        form.phone.trim(),
      email:
        form.email.trim(),
      address:
        form.address.trim(),
      external_reference:
        form.external_reference.trim(),
      status:
        form.status,
    };

    if (form.code.trim()) {
      payload.code =
        form.code.trim();
    }

    try {
      setSaving(true);
      setNotice(null);

      if (
        modalMode === "create"
      ) {
        await customerApi.create(
          session,
          payload,
        );
      } else if (
        modalMode === "edit" &&
        selected
      ) {
        await customerApi.update(
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
            ? t.customersServicesUi.customerCreatedSuccessfully
            : t.customersServicesUi.customerUpdatedSuccessfully,
      });
    } catch (err) {
      setNotice({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : t.customersServicesUi.customerOperationFailed,
      });
    } finally {
      setSaving(false);
    }
  };

  const columns:
    Column<Customer>[] = [
    {
      header:
        t.customers.code,
      accessor: "code",
      className:
        "font-mono text-cyan-400",
      sortable: true,
    },
    {
      header:
        t.customers.displayName,
      accessor:
        "display_name",
      className:
        "font-bold text-white",
      sortable: true,
    },
    {
      header:
        t.customers.type,
      accessor: (row) => (
        <span className="rounded-md border border-white/5 bg-white/5 px-2 py-0.5 text-[10px] font-bold capitalize">
          {({
              individual: t.customersServicesUi.individual,
              business: t.customersServicesUi.business,
              government: t.customersServicesUi.government,
            } as Record<string, string>)[row.customer_type] ?? row.customer_type}
        </span>
      ),
      sortable: true,
      sortKey:
        "customer_type",
    },
    {
      header: t.customersServicesUi.branch,
      accessor: (row) =>
        row.branch_name || "—",
    },
    {
      header:
        t.common.agencies,
      accessor: (row) =>
        row.agency_name || "—",
    },
    {
      header:
        t.customers.phone,
      accessor: (row) =>
        row.phone || "—",
    },
    {
      header:
        t.customers.status,
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
              : row.status ===
                  "blocked"
                ? "danger"
                : "default"
          }
        />
      ),
      sortable: true,
    },
  ];

  return (
    <>
      <div className="hq-subscriber-page space-y-6 animate-in fade-in duration-500">
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
          <div>
            <h2 className="text-xl font-black text-white">
              {t.customers.title}
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              {t.customers.subtitle}
            </p>
          </div>

          <SharedPrimaryButton
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950"
          >
            <UserPlus className="h-4 w-4" />
            {t.customersServicesUi.newCustomer}
          </SharedPrimaryButton>
        </SharedPageHeader>

        <DataTable
          className="hq-subscriber-table"
          rowKey="id"
          columns={columns}
          data={data}
          loading={loading}
          totalCount={
            totalCount
          }
          currentPage={page}
          pageSize={pageSize}
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
              >
                <Eye className="h-4 w-4" />
              </SharedSecondaryButton>

              <SharedSecondaryButton
                type="button"
                onClick={() =>
                  openEdit(row)
                }
                className="rounded-lg border border-cyan-400/10 bg-cyan-400/5 p-2 text-cyan-400"
              >
                <Pencil className="h-4 w-4" />
              </SharedSecondaryButton>
            </div>
          )}
        />
      </div>

      {modalMode && (
        <div className="hq-visual-overlay hq-subscriber-modal-layer fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
          <SharedModal native className="hq-visual-dialog hq-subscriber-dialog hq-major-form-dialog max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-[28px] border border-white/10 bg-slate-950 p-6 shadow-2xl">

            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-white">
                  {modalMode ===
                  "create"
                    ? t.customersServicesUi.newCustomer
                    : modalMode ===
                        "edit"
                      ? t.customersServicesUi.editCustomer
                      : t.customersServicesUi.customerDetails}
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  {t.customersServicesUi.customerManagementDesc}
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

                <div className="grid gap-4 md:grid-cols-2">
                  <Detail
                    label={t.customersServicesUi.customerCode}
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
                    label={t.customersServicesUi.displayName}
                    value={
                      selected.display_name
                    }
                  />

                  <Detail
                    label={t.customersServicesUi.customerType}
                    value={
                      selected.customer_type
                    }
                  />

                  <Detail
                    label={t.customersServicesUi.company}
                    value={
                      selected.company_name ||
                      "—"
                    }
                  />

                  <Detail
                    label={t.customersServicesUi.branch}
                    value={
                      selected.branch_name ||
                      "—"
                    }
                  />

                  <Detail
                    label={t.customersServicesUi.agency}
                    value={
                      selected.agency_name ||
                      "—"
                    }
                  />

                  <Detail
                    label={t.customersServicesUi.phone}
                    value={
                      selected.phone ||
                      "—"
                    }
                  />

                  <Detail
                    label={t.customersServicesUi.email}
                    value={
                      selected.email ||
                      "—"
                    }
                  />

                  <Detail
                    label={t.customersServicesUi.externalReference}
                    value={
                      selected.external_reference ||
                      "—"
                    }
                  />

                  <Detail
                    label={t.customersServicesUi.customerId}
                    value={
                      selected.id
                    }
                  />
                </div>

                <Detail
                  label={t.customersServicesUi.address}
                  value={
                    selected.address ||
                    "—"
                  }
                />

                <div className="flex justify-end border-t border-white/10 pt-5">
                  <SharedPrimaryButton
                    type="button"
                    onClick={() =>
                      openEdit(
                        selected,
                      )
                    }
                    className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950"
                  >
                    <Pencil className="h-4 w-4" />
                    {t.customersServicesUi.editCustomer}
                  </SharedPrimaryButton>
                </div>
              </div>
            ) : (
              <form
                onSubmit={
                  submitCustomer
                }
                className="space-y-5"
              >
                <div className="grid gap-4 md:grid-cols-2">

                  <Field label={t.customersServicesUi.customerCode}>
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
                      placeholder={t.customersServicesUi.leaveBlankAutoCode}
                      className="hq-input customer-input"
                    />
                  </Field>

                  <Field
                    label={t.customersServicesUi.customerType}
                    required
                  >
                    <SharedSelect
                      value={
                        form.customer_type
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "customer_type",
                          event.target
                            .value as CustomerForm["customer_type"],
                        )
                      }
                      className="customer-input"
                    >
                      <option value="individual">
                        {t.customersServicesUi.individual}
                      </option>
                      <option value="business">
                        {t.customersServicesUi.business}
                      </option>
                      <option value="government">
                        {t.customersServicesUi.government}
                      </option>
                    </SharedSelect>
                  </Field>

                  <Field
                    label={t.customersServicesUi.displayName}
                    required
                  >
                    <input
                      maxLength={255}
                      value={
                        form.display_name
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "display_name",
                          event.target
                            .value,
                        )
                      }
                      className="hq-input customer-input"
                    />
                  </Field>

                  <Field label={t.customersServicesUi.status}>
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
                            .value as CustomerForm["status"],
                        )
                      }
                      className="customer-input"
                    >
                      <option value="active">
                        {t.common.active}
                      </option>
                      <option value="inactive">
                        {t.common.inactive}
                      </option>
                      <option value="blocked">
                        {t.common.blocked}
                      </option>
                    </SharedSelect>
                  </Field>

                  <Field label={t.customersServicesUi.branch}>
                    <SharedSelect
                      value={
                        form.branch
                      }
                      onChange={(
                        event,
                      ) =>
                        changeBranch(
                          event.target
                            .value,
                        )
                      }
                      className="customer-input"
                    >
                      <option value="">
                        {t.customersServicesUi.noBranch}
                      </option>

                      {companyBranches.map(
                        (branch) => (
                          <option
                            key={
                              branch.id
                            }
                            value={
                              branch.id
                            }
                          >
                            {
                              branch.code
                            }{" "}
                            —{" "}
                            {
                              branch.name
                            }
                          </option>
                        ),
                      )}
                    </SharedSelect>
                  </Field>

                  <Field label={t.customersServicesUi.agency}>
                    <SharedSelect
                      value={
                        form.agency
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "agency",
                          event.target
                            .value,
                        )
                      }
                      className="customer-input"
                    >
                      <option value="">
                        {t.customersServicesUi.noAgency}
                      </option>

                      {availableAgencies.map(
                        (agency) => (
                          <option
                            key={
                              agency.id
                            }
                            value={
                              agency.id
                            }
                          >
                            {
                              agency.code
                            }{" "}
                            —{" "}
                            {
                              agency.name
                            }
                          </option>
                        ),
                      )}
                    </SharedSelect>
                  </Field>

                  <Field label={t.customersServicesUi.phone}>
                    <input
                      maxLength={64}
                      value={
                        form.phone
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "phone",
                          event.target
                            .value,
                        )
                      }
                      className="hq-input customer-input"
                    />
                  </Field>

                  <Field label={t.customersServicesUi.email}>
                    <input
                      type="email"
                      value={
                        form.email
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "email",
                          event.target
                            .value,
                        )
                      }
                      className="hq-input customer-input"
                    />
                  </Field>

                  <Field label={t.customersServicesUi.externalReference}>
                    <input
                      maxLength={120}
                      value={
                        form.external_reference
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "external_reference",
                          event.target
                            .value,
                        )
                      }
                      className="hq-input customer-input"
                    />
                  </Field>
                </div>

                <Field label={t.customersServicesUi.address}>
                  <textarea
                    rows={4}
                    value={
                      form.address
                    }
                    onChange={(
                      event,
                    ) =>
                      updateField(
                        "address",
                        event.target
                          .value,
                      )
                    }
                    className="hq-input customer-input resize-y"
                  />
                </Field>

                {notice?.type ===
                  "error" && (
                  <div className="flex gap-2 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-300">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    <span>
                      {
                        notice.message
                      }
                    </span>
                  </div>
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
                    {t.common.cancel}
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
                        {t.common.saving}
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />

                        {modalMode ===
                        "create"
                          ? t.customersServicesUi.createCustomer
                          : t.common.saveChanges}
                      </>
                    )}
                  </SharedPrimaryButton>
                </div>
              </form>
            )}

            
          </SharedModal>
        </div>
      )}
    </>
  );
}




