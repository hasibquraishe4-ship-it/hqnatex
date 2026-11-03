import { WorkspaceModal } from "../../components/Modal";
import { PageHeader as SharedPageHeader } from "../../components/PageHeader";
import { PrimaryButton as SharedPrimaryButton, SecondaryButton as SharedSecondaryButton, Select as SharedSelect, FilterBar as SharedFilterBar, FormField as Field, DetailField as Detail } from "../../components/Interface";
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
  collectAllPages,
  customerServiceApi,
  fetchers,
  type CustomerServicePayload,
  type Session,
} from "../../lib/api";

import { useTranslation } from "../../lib/i18n";

type Props = {
  session: Session;
};

type CustomerService = {
  id: string;
  tenant: string;
  company: string;

  customer: string;
  customer_name: string;

  service: string;
  service_name: string;

  package: string | null;
  package_name: string | null;

  branch: string | null;
  branch_name: string | null;

  agency: string | null;
  agency_name: string | null;

  identifier: string;
  username: string;

  status:
    | "draft"
    | "pending"
    | "active"
    | "suspended"
    | "terminated";

  technical_values: Record<string, unknown>;

  started_at: string | null;
  ended_at: string | null;

  created_at: string;
  updated_at: string;
};

type CustomerOption = {
  id: string;
  company: string;
  branch: string | null;
  agency: string | null;
  code: string;
  display_name: string;
  status?: string;
};

type ServiceOption = {
  id: string;
  code: string;
  name_english: string;
  status?: string;
};

type PackageOption = {
  id: string;
  service: string;
  code: string;
  name_english: string;
  status?: string;
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

type TechnicalField = {
  id: string;
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

type ModalMode =
  | "create"
  | "view"
  | "edit";

type ActionMode =
  | "renew"
  | "reactivate"
  | "change-package"
  | "transfer-agency";

type ActionFormState = {
  months: string;
  new_package_id: string;
  package_id: string;
  to_agency_id: string;
  to_branch_id: string;
  reason: string;
  notes: string;
};

type Notice = {
  type: "success" | "error";
  message: string;
};

type FormState = {
  customer: string;
  service: string;
  package: string;
  branch: string;
  agency: string;
  identifier: string;
  username: string;
  status: CustomerService["status"];
  started_at: string;
  ended_at: string;
  technical_values: Record<string, unknown>;
};

function technicalFieldLabel(
  field: TechnicalField,
  language: string,
): string {
  if (language === "fa") {
    return (
      field.label_dari ||
      field.label_english ||
      field.key
    );
  }

  if (language === "ps") {
    return (
      field.label_pashto ||
      field.label_english ||
      field.key
    );
  }

  return (
    field.label_english ||
    field.key
  );
}


const EMPTY_FORM: FormState = {
  customer: "",
  service: "",
  package: "",
  branch: "",
  agency: "",
  identifier: "",
  username: "",
  status: "draft",
  started_at: "",
  ended_at: "",
  technical_values: {},
};

function toDateTimeLocal(
  value: string | null,
): string {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (v: number) =>
    String(v).padStart(2, "0");

  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
    "T",
    pad(date.getHours()),
    ":",
    pad(date.getMinutes()),
  ].join("");
}

function toApiDateTime(
  value: string,
): string | null {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

export function CustomerServiceList({
  session,
}: Props) {
  const { t, language } = useTranslation();

  const [data, setData] =
    useState<CustomerService[]>([]);

  const [customers, setCustomers] =
    useState<CustomerOption[]>([]);

  const [services, setServices] =
    useState<ServiceOption[]>([]);

  const [packages, setPackages] =
    useState<PackageOption[]>([]);

  const [branches, setBranches] =
    useState<BranchOption[]>([]);

  const [agencies, setAgencies] =
    useState<AgencyOption[]>([]);

  const [technicalFields, setTechnicalFields] =
    useState<TechnicalField[]>([]);

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
    useState<CustomerService | null>(null);

  const [form, setForm] =
    useState<FormState>({
      ...EMPTY_FORM,
    });

  const [saving, setSaving] =
    useState(false);

  const [actionMode, setActionMode] =
    useState<ActionMode | null>(null);

  const [actionTarget, setActionTarget] =
    useState<CustomerService | null>(null);

  const [actionSaving, setActionSaving] =
    useState(false);

  const [actionForm, setActionForm] =
    useState<ActionFormState>({
      months: "1",
      new_package_id: "",
      package_id: "",
      to_agency_id: "",
      to_branch_id: "",
      reason: "",
      notes: "",
    });

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
        serviceRecordRes,
        customerRes,
        serviceRes,
        packageRes,
        branchRes,
        agencyRes,
        technicalFieldRes,
      ] = await Promise.all([
        fetchers.customerServices(
          session,
          params,
        ),

        collectAllPages<CustomerOption>(
          (pageParams: string) =>
            fetchers.customers(
              session,
              pageParams,
            ),
          "?ordering=display_name",
        ),

        fetchers.allServices(
          session,
          "?status=active&ordering=name_english",
        ),

        fetchers.allPackages(
          session,
          "?available=1&ordering=name_english",
        ),

        collectAllPages<BranchOption>(
          (pageParams: string) =>
            fetchers.branches(
              session,
              pageParams,
            ),
          "?ordering=name",
        ),

        collectAllPages<AgencyOption>(
          (pageParams: string) =>
            fetchers.agencies(
              session,
              pageParams,
            ),
          "?ordering=name",
        ),

        collectAllPages<TechnicalField>(
          (pageParams: string) =>
            fetchers.technicalFields(
              session,
              pageParams,
            ),
          "?ordering=sort_order",
        ),
      ]);

      setData(
        serviceRecordRes.results,
      );

      setTotalCount(
        serviceRecordRes.count,
      );

      setCustomers(
        customerRes.results,
      );

      setServices(
        serviceRes.results,
      );

      setPackages(
        packageRes.results,
      );

      setBranches(
        branchRes.results,
      );

      setAgencies(
        agencyRes.results,
      );

      setTechnicalFields(
        technicalFieldRes.results,
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

  const availablePackages =
    useMemo(
      () =>
        packages.filter(
          (pkg) =>
            pkg.service ===
              form.service &&
            pkg.status !==
              "inactive",
        ),
      [
        packages,
        form.service,
      ],
    );

  const companyBranches =
    useMemo(
      () =>
        branches.filter(
          (branch) =>
            (!session.companyId ||
              branch.company ===
                session.companyId) &&
            branch.status !==
              "inactive",
        ),
      [
        branches,
        session.companyId,
      ],
    );

  const availableAgencies =
    useMemo(
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

  const serviceTechnicalFields =
    useMemo(
      () =>
        technicalFields
          .filter(
            (field) =>
              field.service ===
                form.service &&
              field.status ===
                "active",
          )
          .sort(
            (a, b) =>
              a.sort_order -
              b.sort_order,
          ),
      [
        technicalFields,
        form.service,
      ],
    );

  const updateField = <
    K extends keyof FormState
  >(
    key: K,
    value: FormState[K],
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const updateTechnicalValue = (
    key: string,
    value: unknown,
  ) => {
    setForm((current) => ({
      ...current,
      technical_values: {
        ...current.technical_values,
        [key]: value,
      },
    }));
  };

  const changeCustomer = (
    customerId: string,
  ) => {
    const customer =
      customers.find(
        (item) =>
          item.id === customerId,
      );

    setForm((current) => ({
      ...current,
      customer: customerId,
      branch:
        customer?.branch ||
        current.branch,
      agency:
        customer?.agency ||
        current.agency,
    }));
  };

  const changeService = (
    serviceId: string,
  ) => {
    setForm((current) => ({
      ...current,
      service: serviceId,
      package: "",
      technical_values: {},
    }));
  };

  const changeBranch = (
    branchId: string,
  ) => {
    setForm((current) => {
      const currentAgency =
        agencies.find(
          (agency) =>
            agency.id ===
            current.agency,
        );

      const agencyStillValid =
        !currentAgency ||
        !branchId ||
        !currentAgency.branch ||
        currentAgency.branch ===
          branchId;

      return {
        ...current,
        branch: branchId,
        agency:
          agencyStillValid
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
      technical_values: {},
    });

    setModalMode("create");
  };

  const openView = (
    row: CustomerService,
  ) => {
    setNotice(null);
    setSelected(row);
    setModalMode("view");
  };

  const openEdit = (
    row: CustomerService,
  ) => {
    setNotice(null);
    setSelected(row);

    setForm({
      customer:
        row.customer,
      service:
        row.service,
      package:
        row.package || "",
      branch:
        row.branch || "",
      agency:
        row.agency || "",
      identifier:
        row.identifier || "",
      username:
        row.username || "",
      status:
        row.status,
      started_at:
        toDateTimeLocal(
          row.started_at,
        ),
      ended_at:
        toDateTimeLocal(
          row.ended_at,
        ),
      technical_values: {
        ...(row.technical_values ||
          {}),
      },
    });

    setModalMode("edit");
  };

  const closeModal = () => {
    if (saving) return;

    setModalMode(null);
    setSelected(null);

    setForm({
      ...EMPTY_FORM,
      technical_values: {},
    });
  };

  const openServiceAction = (
    mode: ActionMode,
    row: CustomerService,
  ) => {
    setNotice(null);
    setActionMode(mode);
    setActionTarget(row);

    setActionForm({
      months: "1",
      new_package_id: "",
      package_id: "",
      to_agency_id: "",
      to_branch_id: "",
      reason: "",
      notes: "",
    });

    setModalMode(null);
    setSelected(null);
  };

  const closeServiceAction = () => {
    if (actionSaving) return;

    setActionMode(null);
    setActionTarget(null);

    setActionForm({
      months: "1",
      new_package_id: "",
      package_id: "",
      to_agency_id: "",
      to_branch_id: "",
      reason: "",
      notes: "",
    });
  };

  const submitServiceAction = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (
      !actionMode ||
      !actionTarget
    ) {
      return;
    }

    setActionSaving(true);
    setNotice(null);

    try {
      if (actionMode === "renew") {
        await customerServiceApi.renew(
          session,
          actionTarget.id,
          {
            months: Math.max(
              1,
              Number(
                actionForm.months,
              ) || 1,
            ),
            ...(actionForm
              .new_package_id
              ? {
                  new_package_id:
                    actionForm
                      .new_package_id,
                }
              : {}),
            ...(actionForm.notes.trim()
              ? {
                  notes:
                    actionForm
                      .notes
                      .trim(),
                }
              : {}),
          },
        );
      }

      if (
        actionMode ===
        "reactivate"
      ) {
        await customerServiceApi
          .reactivate(
            session,
            actionTarget.id,
            actionForm.reason.trim()
              ? {
                  reason:
                    actionForm
                      .reason
                      .trim(),
                }
              : {},
          );
      }

      if (
        actionMode ===
        "change-package"
      ) {
        if (
          !actionForm.package_id
        ) {
          return;
        }

        await customerServiceApi
          .changePackage(
            session,
            actionTarget.id,
            {
              package_id:
                actionForm
                  .package_id,
              ...(actionForm
                .reason
                .trim()
                ? {
                    reason:
                      actionForm
                        .reason
                        .trim(),
                  }
                : {}),
            },
          );
      }

      if (
        actionMode ===
        "transfer-agency"
      ) {
        if (
          !actionForm
            .to_agency_id
        ) {
          return;
        }

        await customerServiceApi
          .transferAgency(
            session,
            actionTarget.id,
            {
              to_agency_id:
                actionForm
                  .to_agency_id,
              ...(actionForm
                .to_branch_id
                ? {
                    to_branch_id:
                      actionForm
                        .to_branch_id,
                  }
                : {}),
              ...(actionForm
                .reason
                .trim()
                ? {
                    reason:
                      actionForm
                        .reason
                        .trim(),
                  }
                : {}),
            },
          );
      }

      await load();

      setActionMode(null);
      setActionTarget(null);

      setNotice({
        type: "success",
        message:
          t.customersServicesUi
            .customerServiceUpdatedSuccessfully,
      });
    } catch (err) {
      setNotice({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : t.customersServicesUi
                .customerServiceOperationFailed,
      });
    } finally {
      setActionSaving(false);
    }
  };

  const submitService = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (
      !form.customer ||
      !form.service
    ) {
      setNotice({
        type: "error",
        message:
          t.customersServicesUi.customerAndServiceRequired,
      });

      return;
    }

    const requiredMissing =
      serviceTechnicalFields.filter(
        (field) => {
          if (!field.required) {
            return false;
          }

          const value =
            form.technical_values[
              field.key
            ];

          return (
            value === undefined ||
            value === null ||
            value === ""
          );
        },
      );

    if (
      requiredMissing.length >
      0
    ) {
      setNotice({
        type: "error",
        message:
          `${t.customersServicesUi.requiredTechnicalField}: ${technicalFieldLabel(requiredMissing[0], language)}`,
      });

      return;
    }

    const startedAt =
      toApiDateTime(
        form.started_at,
      );

    const endedAt =
      toApiDateTime(
        form.ended_at,
      );

    if (
      startedAt &&
      endedAt &&
      endedAt < startedAt
    ) {
      setNotice({
        type: "error",
        message:
          t.customersServicesUi.endDateCannotBeBeforeStart,
      });

      return;
    }

    const payload:
      CustomerServicePayload = {
      customer:
        form.customer,
      service:
        form.service,
      package:
        form.package || null,
      branch:
        form.branch || null,
      agency:
        form.agency || null,
      identifier:
        form.identifier.trim(),
      username:
        form.username.trim(),
      status:
        form.status,
      technical_values:
        form.technical_values,
      started_at:
        startedAt,
      ended_at:
        endedAt,
    };

    try {
      setSaving(true);
      setNotice(null);

      if (
        modalMode === "create"
      ) {
        await customerServiceApi.create(
          session,
          payload,
        );
      } else if (
        modalMode === "edit" &&
        selected
      ) {
        await customerServiceApi.update(
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
        technical_values: {},
      });

      setNotice({
        type: "success",
        message:
          modalMode === "create"
            ? t.customersServicesUi.customerServiceCreatedSuccessfully
            : t.customersServicesUi.customerServiceUpdatedSuccessfully,
      });
    } catch (err) {
      setNotice({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : t.customersServicesUi.customerServiceOperationFailed,
      });
    } finally {
      setSaving(false);
    }
  };

  const columns:
    Column<CustomerService>[] = [
    {
      header:
        t.customers.title,
      accessor:
        "customer_name",
      sortable: true,
      sortKey:
        "customer__display_name",
    },

    {
      header: t.customersServicesUi.identifier,
      accessor: (row) =>
        row.identifier || "—",
      sortKey: "identifier",
      className:
        "font-mono text-cyan-400",
      sortable: true,
    },

    {
      header: t.customersServicesUi.username,
      accessor: (row) =>
        row.username || "—",
      className:
        "font-mono text-xs",
    },

    {
      header:
        t.services.name,
      accessor:
        "service_name",
      sortable: true,
      sortKey:
        "service__name_english",
    },

    {
      header:
        t.packages.package,
      accessor: (row) =>
        row.package_name || "—",
      sortable: true,
      sortKey:
        "package__name_english",
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
        t.services.status,
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
                    "suspended" ||
                  row.status ===
                    "pending"
                ? "warning"
                : row.status ===
                    "terminated"
                  ? "danger"
                  : "default"
          }
        />
      ),
      sortable: true,
    },

    {
      header: t.customersServicesUi.started,
      accessor: (row) =>
        row.started_at
          ? new Date(
              row.started_at,
            ).toLocaleDateString()
          : "—",
      sortable: true,
      sortKey:
        "started_at",
    },

    {
      header: t.customersServicesUi.ended,
      accessor: (row) =>
        row.ended_at
          ? new Date(
              row.ended_at,
            ).toLocaleDateString()
          : "—",
      sortable: true,
      sortKey:
        "ended_at",
    },
  ];

  return (
    <>
      <div className="hq-subscriber-page space-y-6 animate-in fade-in duration-500">

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
              <RadioTower className="h-5 w-5 text-cyan-300" />
            </div>

            <div>
              <h2 className="text-xl font-black text-white">
                {t.uiTabs.customerServices}
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {t.customersServicesUi.customerServicesManagementDesc}
              </p>
            </div>
          </div>

          <SharedPrimaryButton
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950"
          >
            <Plus className="h-4 w-4" />
            {t.customersServicesUi.newCustomerService}
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

      {actionMode &&
        actionTarget && (
          <WorkspaceModal header={<>

<div>
                  <h3 className="text-lg font-black text-white">
                    {actionMode === "renew"
                      ? t.customersServicesUi.renewService
                      : actionMode === "reactivate"
                        ? t.customersServicesUi.reactivateService
                        : actionMode === "change-package"
                          ? t.customersServicesUi.changePackage
                          : t.customersServicesUi.transferAgency}
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    {actionTarget.customer_name}
                    {" — "}
                    {actionTarget.service_name}
                  </p>
                </div>

<SharedSecondaryButton
                  type="button"
                  onClick={
                    closeServiceAction
                  }
                  disabled={
                    actionSaving
                  }
                  className="rounded-xl border border-white/10 p-2 text-slate-400 disabled:opacity-50"
                >
                  <X className="h-5 w-5" />
                </SharedSecondaryButton>

</>} onClose={
                    closeServiceAction
                  } busy={
                    actionSaving
                  }>
<form
                onSubmit={
                  submitServiceAction
                }
                className="subscriber-dialog-form"
              >
<div className="subscriber-form-fields ">
                {actionMode ===
                  "renew" && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field
                      label={
                        t.customersServicesUi
                          .renewalMonths
                      }
                      required
                    >
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={
                          actionForm.months
                        }
                        onChange={(
                          event,
                        ) =>
                          setActionForm(
                            (current) => ({
                              ...current,
                              months:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                        className="hq-input customer-service-input"
                      />
                    </Field>

                    <Field
                      label={
                        t.customersServicesUi
                          .optionalNewPackage
                      }
                    >
                      <SharedSelect
                        value={
                          actionForm
                            .new_package_id
                        }
                        onChange={(
                          event,
                        ) =>
                          setActionForm(
                            (current) => ({
                              ...current,
                              new_package_id:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                        className="customer-service-input"
                      >
                        <option value="">
                          {
                            t.customersServicesUi
                              .noPackage
                          }
                        </option>

                        {packages
                          .filter(
                            (
                              pkg: any,
                            ) => {
                              const serviceId =
                                typeof pkg.service ===
                                "string"
                                  ? pkg.service
                                  : pkg
                                      .service
                                      ?.id;

                              return (
                                serviceId ===
                                  actionTarget
                                    .service &&
                                pkg.status ===
                                  "active"
                              );
                            },
                          )
                          .map(
                            (
                              pkg: any,
                            ) => (
                              <option
                                key={
                                  pkg.id
                                }
                                value={
                                  pkg.id
                                }
                              >
                                {
                                  pkg.code
                                }{" "}
                                —{" "}
                                {pkg.name_english ||
                                  pkg.name ||
                                  pkg.id}
                              </option>
                            ),
                          )}
                      </SharedSelect>
                    </Field>

                    <div className="md:col-span-2">
                      <Field
                        label={
                          t.customersServicesUi
                            .renewalNotes
                        }
                      >
                        <textarea
                          value={
                            actionForm.notes
                          }
                          onChange={(
                            event,
                          ) =>
                            setActionForm(
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
                          rows={3}
                          className="hq-input customer-service-input"
                        />
                      </Field>
                    </div>
                  </div>
                )}

                {actionMode ===
                  "reactivate" && (
                  <Field
                    label={
                      t.customersServicesUi
                        .actionReason
                    }
                  >
                    <textarea
                      value={
                        actionForm.reason
                      }
                      onChange={(
                        event,
                      ) =>
                        setActionForm(
                          (current) => ({
                            ...current,
                            reason:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      rows={3}
                      className="hq-input customer-service-input"
                    />
                  </Field>
                )}

                {actionMode ===
                  "change-package" && (
                  <div className="space-y-4">
                    <Field
                      label={
                        t.customersServicesUi
                          .changePackage
                      }
                      required
                    >
                      <SharedSelect
                        value={
                          actionForm
                            .package_id
                        }
                        onChange={(
                          event,
                        ) =>
                          setActionForm(
                            (current) => ({
                              ...current,
                              package_id:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                        className="customer-service-input"
                      >
                        <option value="">
                          {
                            t.customersServicesUi
                              .selectOption
                          }
                        </option>

                        {packages
                          .filter(
                            (
                              pkg: any,
                            ) => {
                              const serviceId =
                                typeof pkg.service ===
                                "string"
                                  ? pkg.service
                                  : pkg
                                      .service
                                      ?.id;

                              return (
                                serviceId ===
                                  actionTarget
                                    .service &&
                                pkg.status ===
                                  "active"
                              );
                            },
                          )
                          .map(
                            (
                              pkg: any,
                            ) => (
                              <option
                                key={
                                  pkg.id
                                }
                                value={
                                  pkg.id
                                }
                              >
                                {
                                  pkg.code
                                }{" "}
                                —{" "}
                                {pkg.name_english ||
                                  pkg.name ||
                                  pkg.id}
                              </option>
                            ),
                          )}
                      </SharedSelect>
                    </Field>

                    <Field
                      label={
                        t.customersServicesUi
                          .actionReason
                      }
                    >
                      <textarea
                        value={
                          actionForm.reason
                        }
                        onChange={(
                          event,
                        ) =>
                          setActionForm(
                            (
                              current,
                            ) => ({
                              ...current,
                              reason:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                        rows={3}
                        className="hq-input customer-service-input"
                      />
                    </Field>
                  </div>
                )}

                {actionMode ===
                  "transfer-agency" && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field
                      label={
                        t.customersServicesUi
                          .targetAgency
                      }
                      required
                    >
                      <SharedSelect
                        value={
                          actionForm
                            .to_agency_id
                        }
                        onChange={(
                          event,
                        ) =>
                          setActionForm(
                            (current) => ({
                              ...current,
                              to_agency_id:
                                event
                                  .target
                                  .value,
                              to_branch_id:
                                "",
                            }),
                          )
                        }
                        className="customer-service-input"
                      >
                        <option value="">
                          {
                            t.customersServicesUi
                              .selectOption
                          }
                        </option>

                        {agencies
                          .filter(
                            (
                              agency: any,
                            ) =>
                              agency.status !==
                                "inactive" &&
                              agency.status !==
                                "suspended",
                          )
                          .map(
                            (
                              agency: any,
                            ) => (
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

                    <Field
                      label={
                        t.customersServicesUi
                          .targetBranch
                      }
                    >
                      <SharedSelect
                        value={
                          actionForm
                            .to_branch_id
                        }
                        onChange={(
                          event,
                        ) =>
                          setActionForm(
                            (current) => ({
                              ...current,
                              to_branch_id:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                        className="customer-service-input"
                      >
                        <option value="">
                          {
                            t.customersServicesUi
                              .noBranch
                          }
                        </option>

                        {companyBranches.map(
                          (
                            branch: any,
                          ) => (
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

                    <div className="md:col-span-2">
                      <Field
                        label={
                          t.customersServicesUi
                            .actionReason
                        }
                      >
                        <textarea
                          value={
                            actionForm.reason
                          }
                          onChange={(
                            event,
                          ) =>
                            setActionForm(
                              (
                                current,
                              ) => ({
                                ...current,
                                reason:
                                  event
                                    .target
                                    .value,
                              }),
                            )
                          }
                          rows={3}
                          className="hq-input customer-service-input"
                        />
                      </Field>
                    </div>
                  </div>
                )}

                </div>
<div className="subscriber-form-footer">
                  <SharedSecondaryButton
                    type="button"
                    onClick={
                      closeServiceAction
                    }
                    disabled={
                      actionSaving
                    }
                    className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 disabled:opacity-50"
                  >
                    {t.common.cancel}
                  </SharedSecondaryButton>

                  <SharedPrimaryButton
                    type="submit"
                    disabled={
                      actionSaving ||
                      (actionMode ===
                        "change-package" &&
                        !actionForm
                          .package_id) ||
                      (actionMode ===
                        "transfer-agency" &&
                        !actionForm
                          .to_agency_id)
                    }
                    className="flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2 text-sm font-black text-slate-950 disabled:opacity-50"
                  >
                    {actionSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t.common.saving}
                      </>
                    ) : actionMode ===
                      "renew" ? (
                      t.customersServicesUi.renewService
                    ) : actionMode ===
                      "reactivate" ? (
                      t.customersServicesUi.reactivateService
                    ) : actionMode ===
                      "change-package" ? (
                      t.customersServicesUi.changePackage
                    ) : (
                      t.customersServicesUi.transferAgency
                    )}
                  </SharedPrimaryButton>
                </div>
              </form>

</WorkspaceModal>
        )}

      {modalMode && (
        <WorkspaceModal header={<>

<div>
                <h3 className="text-lg font-black text-white">
                  {modalMode ===
                  "create"
                    ? t.customersServicesUi.newCustomerService
                    : modalMode ===
                        "edit"
                      ? t.customersServicesUi.editCustomerService
                      : t.customersServicesUi.customerServiceDetails}
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  {t.customersServicesUi.customerServiceRecordDesc}
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

</>} onClose={
                  closeModal
                } busy={
                  saving
                }>
{modalMode ===
              "view" &&
            selected ? (
              <div className="space-y-5">

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Detail
                    label={t.customersServicesUi.customer}
                    value={
                      selected.customer_name
                    }
                  />

                  <Detail
                    label={t.customersServicesUi.service}
                    value={
                      selected.service_name
                    }
                  />

                  <Detail
                    label={t.customersServicesUi.package}
                    value={
                      selected.package_name ||
                      "—"
                    }
                  />

                  <Detail
                    label={t.customersServicesUi.identifier}
                    value={
                      selected.identifier ||
                      "—"
                    }
                  />

                  <Detail
                    label={t.customersServicesUi.username}
                    value={
                      selected.username ||
                      "—"
                    }
                  />

                  <Detail
                    label={t.customersServicesUi.status}
                    value={
                      t.common[
                        selected.status as keyof typeof t.common
                      ] || selected.status
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
                    label={t.customersServicesUi.startedAt}
                    value={
                      selected.started_at ||
                      "—"
                    }
                  />

                  <Detail
                    label={t.customersServicesUi.endedAt}
                    value={
                      selected.ended_at ||
                      "—"
                    }
                  />

                  <Detail
                    label={t.customersServicesUi.recordId}
                    value={
                      selected.id
                    }
                  />
                </div>

                {/* CUSTOMER_TECHNICAL_DETAIL_V2 */}
                <div className="space-y-3">
                  <div className="text-sm font-medium text-slate-300">
                    {t.customersServicesUi.technicalValues}
                  </div>

                  {Object.keys(
                    selected.technical_values || {},
                  ).length === 0 ? (
                    <div className="hq-visual-panel rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-slate-400">
                      —
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {Object.entries(
                        selected.technical_values || {},
                      ).map(([key, value]) => {
                        const matchingField =
                          technicalFields.find(
                            (field) =>
                              field.key === key &&
                              String(field.service) ===
                                String(selected.service),
                          ) ||
                          technicalFields.find(
                            (field) =>
                              field.key === key,
                          );

                        let displayValue = "—";

                        if (
                          value !== null &&
                          value !== undefined &&
                          value !== ""
                        ) {
                          if (
                            typeof value === "boolean"
                          ) {
                            displayValue = value
                              ? language === "fa"
                                ? "بلی"
                                : language === "ps"
                                  ? "هو"
                                  : "Yes"
                              : language === "fa"
                                ? "نخیر"
                                : language === "ps"
                                  ? "نه"
                                  : "No";
                          } else if (
                            typeof value === "object"
                          ) {
                            displayValue =
                              JSON.stringify(value);
                          } else {
                            displayValue =
                              String(value);
                          }
                        }

                        return (
                          <div
                            key={key}
                            className="hq-visual-panel min-w-0 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
                          >
                            <div className="mb-1 break-words text-xs text-slate-400">
                              {matchingField
                                ? technicalFieldLabel(
                                    matchingField,
                                    language,
                                  )
                                : key}
                            </div>

                            <div className="break-words text-sm font-semibold text-slate-100">
                              {displayValue}
                            </div>

                            {!matchingField && (
                              <div className="mt-1 break-all font-mono text-[10px] text-slate-500">
                                {key}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap justify-end gap-2 border-t border-white/10 pt-5">
                  <SharedSecondaryButton
                    type="button"
                    onClick={() =>
                      openServiceAction(
                        "renew",
                        selected,
                      )
                    }
                    className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-bold text-emerald-300"
                  >
                    {t.customersServicesUi.renewService}
                  </SharedSecondaryButton>

                  {selected.status !== "active" && (
                    <SharedSecondaryButton
                      type="button"
                      onClick={() =>
                        openServiceAction(
                          "reactivate",
                          selected,
                        )
                      }
                      className="rounded-xl border border-sky-400/20 bg-sky-400/10 px-4 py-2 text-sm font-bold text-sky-300"
                    >
                      {t.customersServicesUi.reactivateService}
                    </SharedSecondaryButton>
                  )}

                  <SharedSecondaryButton
                    type="button"
                    onClick={() =>
                      openServiceAction(
                        "change-package",
                        selected,
                      )
                    }
                    className="rounded-xl border border-violet-400/20 bg-violet-400/10 px-4 py-2 text-sm font-bold text-violet-300"
                  >
                    {t.customersServicesUi.changePackage}
                  </SharedSecondaryButton>

                  <button
                    type="button"
                    onClick={() =>
                      openServiceAction(
                        "transfer-agency",
                        selected,
                      )
                    }
                    className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-sm font-bold text-amber-300"
                  >
                    {t.customersServicesUi.transferAgency}
                  </button>

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
                    {t.customersServicesUi.editCustomerService}
                  </SharedPrimaryButton>
                </div>
              </div>
            ) : (
              <form
                onSubmit={
                  submitService
                }
                className="subscriber-dialog-form"
              >
<div className="subscriber-form-fields ">

                <div className="grid gap-4 md:grid-cols-2">

                  <Field
                    label={t.customersServicesUi.customer}
                    required
                  >
                    <SharedSelect
                      value={
                        form.customer
                      }
                      onChange={(
                        event,
                      ) =>
                        changeCustomer(
                          event.target
                            .value,
                        )
                      }
                      className="customer-service-input"
                    >
                      <option value="">
                        {t.customersServicesUi.selectCustomer}
                      </option>

                      {customers.map(
                        (customer) => (
                          <option
                            key={
                              customer.id
                            }
                            value={
                              customer.id
                            }
                          >
                            {
                              customer.code
                            }{" "}
                            —{" "}
                            {
                              customer.display_name
                            }
                          </option>
                        ),
                      )}
                    </SharedSelect>
                  </Field>

                  <Field
                    label={t.customersServicesUi.service}
                    required
                  >
                    <SharedSelect
                      value={
                        form.service
                      }
                      onChange={(
                        event,
                      ) =>
                        changeService(
                          event.target
                            .value,
                        )
                      }
                      className="customer-service-input"
                    >
                      <option value="">
                        {t.customersServicesUi.selectService}
                      </option>

                      {services.map(
                        (service) => (
                          <option
                            key={
                              service.id
                            }
                            value={
                              service.id
                            }
                          >
                            {
                              service.code
                            }{" "}
                            —{" "}
                            {
                              service.name_english
                            }
                          </option>
                        ),
                      )}
                    </SharedSelect>
                  </Field>

                  <Field label={t.customersServicesUi.package}>
                    <SharedSelect
                      value={
                        form.package
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "package",
                          event.target
                            .value,
                        )
                      }
                      disabled={
                        !form.service
                      }
                      className="customer-service-input disabled:opacity-40"
                    >
                      <option value="">
                        {t.customersServicesUi.noPackage}
                      </option>

                      {availablePackages.map(
                        (pkg) => (
                          <option
                            key={
                              pkg.id
                            }
                            value={
                              pkg.id
                            }
                          >
                            {
                              pkg.code
                            }{" "}
                            —{" "}
                            {
                              pkg.name_english
                            }
                          </option>
                        ),
                      )}
                    </SharedSelect>
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
                            .value as CustomerService["status"],
                        )
                      }
                      className="customer-service-input"
                    >
                      <option value="draft">
                        {t.common.draft}
                      </option>
                      <option value="pending">
                        {t.common.pending}
                      </option>
                      <option value="active">
                        {t.common.active}
                      </option>
                      <option value="suspended">
                        {t.common.suspended}
                      </option>
                      <option value="terminated">
                        {t.common.terminated}
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
                      className="customer-service-input"
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
                      className="customer-service-input"
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

                  <Field label={t.customersServicesUi.identifier}>
                    <input
                      maxLength={160}
                      value={
                        form.identifier
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "identifier",
                          event.target
                            .value,
                        )
                      }
                      placeholder={t.customersServicesUi.identifierPlaceholder}
                      className="hq-input customer-service-input"
                    />
                  </Field>

                  <Field label={t.customersServicesUi.username}>
                    <input
                      maxLength={160}
                      value={
                        form.username
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "username",
                          event.target
                            .value,
                        )
                      }
                      className="hq-input customer-service-input"
                    />
                  </Field>

                  <Field label={t.customersServicesUi.startedAt}>
                    <input
                      type="datetime-local"
                      value={
                        form.started_at
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "started_at",
                          event.target
                            .value,
                        )
                      }
                      className="hq-input customer-service-input"
                    />
                  </Field>

                  <Field label={t.customersServicesUi.endedAt}>
                    <input
                      type="datetime-local"
                      value={
                        form.ended_at
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "ended_at",
                          event.target
                            .value,
                        )
                      }
                      className="hq-input customer-service-input"
                    />
                  </Field>
                </div>

                {form.service && (
                  <div className="space-y-4 rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.025] p-5">

                    <div>
                      <h4 className="text-sm font-black text-white">
                        {t.customersServicesUi.technicalValues}
                      </h4>

                      <p className="mt-1 text-xs text-slate-500">
                        {t.customersServicesUi.technicalFieldsGeneratedFromService}
                      </p>
                    </div>

                    {serviceTechnicalFields.length ===
                    0 ? (
                      <p className="text-sm text-slate-500">
                        {t.customersServicesUi.noActiveTechnicalFields}
                      </p>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2">

                        {serviceTechnicalFields.map(
                          (field) => (
                            <TechnicalInput
                              key={
                                field.id
                              }
                              field={
                                field
                              }
                              value={
                                form
                                  .technical_values[
                                  field
                                    .key
                                ]
                              }
                              onChange={(
                                value,
                              ) =>
                                updateTechnicalValue(
                                  field.key,
                                  value,
                                )
                              }
                            />
                          ),
                        )}
                      </div>
                    )}
                  </div>
                )}

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

                </div>
<div className="subscriber-form-footer">

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
                          ? t.customersServicesUi.createCustomerService
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





function TechnicalInput({
  field,
  value,
  onChange,
}: {
  field: TechnicalField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const { t, language } = useTranslation();

  const label = technicalFieldLabel(
    field,
    language,
  );

  if (
    field.field_type ===
    "boolean"
  ) {
    return (
      <Field
        label={label}
        required={field.required}
      >
        <SharedSelect
          value={
            value === true
              ? "true"
              : value === false
                ? "false"
                : ""
          }
          onChange={(event) => {
            if (
              event.target.value ===
              ""
            ) {
              onChange("");
            } else {
              onChange(
                event.target.value ===
                  "true",
              );
            }
          }}
          className="customer-service-input"
        >
          <option value="">
            {t.customersServicesUi.notSpecified}
          </option>
          <option value="true">
            {t.customersServicesUi.yes}
          </option>
          <option value="false">
            {t.customersServicesUi.no}
          </option>
        </SharedSelect>
      </Field>
    );
  }

  if (
    field.field_type ===
    "choice"
  ) {
    return (
      <Field
        label={label}
        required={field.required}
      >
        <SharedSelect
          value={
            value == null
              ? ""
              : String(value)
          }
          onChange={(event) =>
            onChange(
              event.target.value,
            )
          }
          className="customer-service-input"
        >
          <option value="">
            {t.customersServicesUi.selectOption}
          </option>

          {(field.options || []).map(
            (option, index) => (
              <option
                key={index}
                value={String(option)}
              >
                {String(option)}
              </option>
            ),
          )}
        </SharedSelect>
      </Field>
    );
  }

  const inputType =
    field.field_type === "date"
      ? "date"
      : field.field_type ===
            "integer" ||
          field.field_type ===
            "decimal"
        ? "number"
        : "text";

  return (
    <Field
      label={label}
      required={field.required}
    >
      <input
        type={inputType}
        step={
          field.field_type ===
          "decimal"
            ? "any"
            : field.field_type ===
                "integer"
              ? "1"
              : undefined
        }
        value={
          value == null
            ? ""
            : String(value)
        }
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
        placeholder={
          field.key
        }
        className="hq-input customer-service-input"
      />
    </Field>
  );
}
