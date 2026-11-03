import { WorkspaceModal } from "../../components/Modal";
import { getTranslation as getUiTranslation } from "../../i18n";
import { PageHeader as SharedPageHeader } from "../../components/PageHeader";
import { PrimaryButton as SharedPrimaryButton, Select as SharedSelect, SecondaryButton as SharedSecondaryButton } from "../../components/Interface";
import { DataTable as SharedDataTable } from "../../components/DataTable";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  collectAllPages,
  fetchers,
  ipAssignmentApi,
  type Paginated,
  type Session,
} from "../../lib/api";

import {
  useTranslation,
} from "../../lib/i18n";


type AssignmentType =
  | "static_ipv4"
  | "static_ipv6"
  | "pppoe_framed"
  | "subnet_prefix"
  | "cgnat";


type AssignmentStatus =
  | "active"
  | "reserved"
  | "released";


type IPAssignment = {
  id: string;

  tenant: string;
  company: string;

  customer_service: string;
  customer_name: string;
  service_identifier: string;

  ip_resource_id: string;

  assignment_type: AssignmentType;

  ip_address: string;
  subnet_mask: string;

  cidr_prefix: number | null;

  gateway: string;
  primary_dns: string;
  secondary_dns: string;

  vlan_id: number | null;

  assigned_at: string;
  released_at: string | null;

  status: AssignmentStatus;

  created_at: string;
  updated_at: string;
};


type CustomerServiceOption = {
  id: string;

  customer_name?: string;
  service_name?: string;
  package_name?: string | null;

  identifier?: string;
  username?: string;

  status?: string;
};


type NetworkResourceOption = {
  id: string;

  code?: string;
  name?: string;

  resource_type?: string;
  status?: string;

  company?: string;
  company_name?: string;

  metadata?: Record<
    string,
    unknown
  >;
};


type IPAssignmentForm = {
  customer_service: string;

  ip_resource_id: string;

  assignment_type: AssignmentType;

  ip_address: string;
  subnet_mask: string;

  cidr_prefix: string;

  gateway: string;
  primary_dns: string;
  secondary_dns: string;

  vlan_id: string;

  assigned_at: string;
  released_at: string;

  status: AssignmentStatus;
};


type ModalMode =
  | "create"
  | "view"
  | "edit"
  | null;


type Notice = {
  type: "success" | "error";
  message: string;
};


const PAGE_SIZE = 25;


const copy = { en: getUiTranslation("en").featureCopy.customers_IPAssignmentList.copy, fa: getUiTranslation("fa").featureCopy.customers_IPAssignmentList.copy, ps: getUiTranslation("ps").featureCopy.customers_IPAssignmentList.copy };


function initialForm(): IPAssignmentForm {
  return {
    customer_service: "",

    ip_resource_id: "",

    assignment_type:
      "static_ipv4",

    ip_address: "",
    subnet_mask: "",

    cidr_prefix: "",

    gateway: "",
    primary_dns: "",
    secondary_dns: "",

    vlan_id: "",

    assigned_at: "",
    released_at: "",

    status: "active",
  };
}


function toDateTimeInput(
  value?: string | null,
): string {
  if (!value) return "";

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "";
  }

  const local = new Date(
    date.getTime() -
      date.getTimezoneOffset() *
        60_000,
  );

  return local
    .toISOString()
    .slice(0, 16);
}


function toApiDateTime(
  value: string,
): string | null {
  if (!value) return null;

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }

  return date.toISOString();
}


function statusClass(
  status: AssignmentStatus,
): string {
  if (status === "active") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  }

  if (status === "reserved") {
    return "border-amber-400/20 bg-amber-400/10 text-amber-300";
  }

  return "border-slate-400/20 bg-slate-400/10 text-slate-300";
}


export function IPAssignmentList({
  session,
}: {
  session: Session;
}) {
  const {
    language,
  } = useTranslation();

  const lang =
    language === "fa" ||
    language === "ps"
      ? language
      : "en";

  const ui = copy[lang];


  const [
    data,
    setData,
  ] =
    useState<
      Paginated<IPAssignment>
    >({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });


  const [
    customerServices,
    setCustomerServices,
  ] =
    useState<
      CustomerServiceOption[]
    >([]);


  const [
    networkResources,
    setNetworkResources,
  ] =
    useState<
      NetworkResourceOption[]
    >([]);


  const [
    page,
    setPage,
  ] =
    useState(1);


  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState("");


  const [
    customerServiceFilter,
    setCustomerServiceFilter,
  ] =
    useState("");


  const [
    modalMode,
    setModalMode,
  ] =
    useState<ModalMode>(null);


  const [
    selected,
    setSelected,
  ] =
    useState<
      IPAssignment | null
    >(null);


  const [
    form,
    setForm,
  ] =
    useState<IPAssignmentForm>(
      initialForm(),
    );


  const [
    loading,
    setLoading,
  ] =
    useState(false);


  const [
    serviceLoading,
    setServiceLoading,
  ] =
    useState(false);


  const [
    resourceLoading,
    setResourceLoading,
  ] =
    useState(false);


  const [
    saving,
    setSaving,
  ] =
    useState(false);


  const [
    error,
    setError,
  ] =
    useState("");


  const [
    notice,
    setNotice,
  ] =
    useState<Notice | null>(
      null,
    );


  const [
    refreshKey,
    setRefreshKey,
  ] =
    useState(0);


  useEffect(() => {
    let cancelled = false;

    async function loadServices() {
      setServiceLoading(true);

      try {
        const response =
          await collectAllPages<
            CustomerServiceOption
          >(
            (params) =>
              fetchers.customerServices(
                session,
                params,
              ),
            "",
          );

        if (!cancelled) {
          setCustomerServices(
            response.results,
          );
        }
      } catch {
        if (!cancelled) {
          setCustomerServices([]);
        }
      } finally {
        if (!cancelled) {
          setServiceLoading(false);
        }
      }
    }

    void loadServices();

    return () => {
      cancelled = true;
    };
  }, [
    session.access,
    session.tenantId,
    session.companyId,
  ]);


  useEffect(() => {
    let cancelled = false;

    async function loadResources() {
      setResourceLoading(true);

      try {
        const response =
          await collectAllPages<
            NetworkResourceOption
          >(
            (params) =>
              fetchers.noc(
                session,
                params,
              ),
            "",
          );

        const filtered =
          response.results
            .filter(
              (row) =>
                row.resource_type ===
                  "ip_pool" ||
                row.resource_type ===
                  "ip_prefix",
            )
            .sort((a, b) => {
              const left = [
                a.resource_type,
                a.code,
                a.name,
              ]
                .filter(Boolean)
                .join("|");

              const right = [
                b.resource_type,
                b.code,
                b.name,
              ]
                .filter(Boolean)
                .join("|");

              return left.localeCompare(
                right,
              );
            });

        if (!cancelled) {
          setNetworkResources(
            filtered,
          );
        }
      } catch {
        if (!cancelled) {
          setNetworkResources([]);
        }
      } finally {
        if (!cancelled) {
          setResourceLoading(false);
        }
      }
    }

    void loadResources();

    return () => {
      cancelled = true;
    };
  }, [
    session.access,
    session.tenantId,
    session.companyId,
  ]);


  useEffect(() => {
    let cancelled = false;

    async function loadAssignments() {
      setLoading(true);
      setError("");

      try {
        const params =
          new URLSearchParams();

        params.set(
          "page",
          String(page),
        );

        params.set(
          "page_size",
          String(PAGE_SIZE),
        );

        if (statusFilter) {
          params.set(
            "status",
            statusFilter,
          );
        }

        if (
          customerServiceFilter
        ) {
          params.set(
            "customer_service",
            customerServiceFilter,
          );
        }

        const response =
          await fetchers
            .customerServiceIpAssignments(
              session,
              `?${params.toString()}`,
            );

        if (!cancelled) {
          setData(
            response as Paginated<
              IPAssignment
            >,
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : ui.loadFailed,
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadAssignments();

    return () => {
      cancelled = true;
    };
  }, [
    session.access,
    session.tenantId,
    session.companyId,
    page,
    statusFilter,
    customerServiceFilter,
    refreshKey,
    ui.loadFailed,
  ]);


  const pageCount =
    Math.max(
      1,
      Math.ceil(
        data.count /
          PAGE_SIZE,
      ),
    );


  const selectedService =
    useMemo(
      () =>
        customerServices.find(
          (row) =>
            row.id ===
            form.customer_service,
        ) || null,
      [
        customerServices,
        form.customer_service,
      ],
    );


  const resourceById =
    useMemo(() => {
      const map =
        new Map<
          string,
          NetworkResourceOption
        >();

      for (
        const row
        of networkResources
      ) {
        map.set(
          row.id,
          row,
        );
      }

      return map;
    }, [
      networkResources,
    ]);


  function assignmentTypeLabel(
    value: AssignmentType,
  ): string {
    return ui[value];
  }


  function statusLabel(
    value: AssignmentStatus,
  ): string {
    return ui[value];
  }


  function resourceTypeLabel(
    value?: string,
  ): string {
    if (value === "ip_pool") {
      return ui.ip_pool;
    }

    if (value === "ip_prefix") {
      return ui.ip_prefix;
    }

    return value || "—";
  }


  function formatDate(
    value?: string | null,
  ): string {
    if (!value) return "—";

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      return value;
    }

    try {
      return new Intl.DateTimeFormat("en-GB-u-ca-gregory",
        {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        },
      ).format(date);
    } catch {
      return date.toLocaleString("en-GB-u-ca-gregory");
    }
  }


  function serviceLabel(
    row: CustomerServiceOption,
  ): string {
    return [
      row.customer_name,
      row.identifier,
      row.service_name,
    ]
      .filter(Boolean)
      .join(" — ");
  }


  function resourceLabel(
    row: NetworkResourceOption,
  ): string {
    const identity = [
      row.code,
      row.name,
    ]
      .filter(Boolean)
      .join(" — ");

    const detail = [
      resourceTypeLabel(
        row.resource_type,
      ),
      row.status,
    ]
      .filter(Boolean)
      .join(" · ");

    return [
      identity || row.id,
      detail,
    ]
      .filter(Boolean)
      .join(" | ");
  }


  function updateForm<
    K extends keyof IPAssignmentForm,
  >(
    key: K,
    value: IPAssignmentForm[K],
  ) {
    setForm(
      (current) => ({
        ...current,
        [key]: value,
      }),
    );
  }


  function openCreate() {
    setSelected(null);
    setForm(initialForm());
    setError("");
    setNotice(null);
    setModalMode("create");
  }


  function openView(
    row: IPAssignment,
  ) {
    setSelected(row);
    setError("");
    setNotice(null);
    setModalMode("view");
  }


  function openEdit(
    row: IPAssignment,
  ) {
    setSelected(row);

    setForm({
      customer_service:
        row.customer_service,

      ip_resource_id:
        row.ip_resource_id || "",

      assignment_type:
        row.assignment_type,

      ip_address:
        row.ip_address || "",

      subnet_mask:
        row.subnet_mask || "",

      cidr_prefix:
        row.cidr_prefix ===
        null
          ? ""
          : String(
              row.cidr_prefix,
            ),

      gateway:
        row.gateway || "",

      primary_dns:
        row.primary_dns || "",

      secondary_dns:
        row.secondary_dns || "",

      vlan_id:
        row.vlan_id === null
          ? ""
          : String(
              row.vlan_id,
            ),

      assigned_at:
        toDateTimeInput(
          row.assigned_at,
        ),

      released_at:
        toDateTimeInput(
          row.released_at,
        ),

      status:
        row.status,
    });

    setError("");
    setNotice(null);
    setModalMode("edit");
  }


  function closeModal() {
    if (saving) return;

    setModalMode(null);
    setSelected(null);
    setError("");
  }


  async function submit() {
    if (
      !form.customer_service
    ) {
      setError(
        ui.customerServiceRequired,
      );

      return;
    }


    if (
      !form.ip_address.trim()
    ) {
      setError(
        ui.ipAddressRequired,
      );

      return;
    }


    let cidrPrefix:
      number | null = null;

    if (
      form.cidr_prefix.trim()
    ) {
      const parsed =
        Number(
          form.cidr_prefix,
        );

      if (
        !Number.isInteger(
          parsed,
        ) ||
        parsed < 0 ||
        parsed > 128
      ) {
        setError(
          ui.invalidCidr,
        );

        return;
      }

      cidrPrefix = parsed;
    }


    let vlanId:
      number | null = null;

    if (
      form.vlan_id.trim()
    ) {
      const parsed =
        Number(
          form.vlan_id,
        );

      if (
        !Number.isInteger(
          parsed,
        )
      ) {
        setError(
          ui.invalidVlan,
        );

        return;
      }

      vlanId = parsed;
    }


    const payload: Record<
      string,
      unknown
    > = {
      customer_service:
        form.customer_service,

      ip_resource_id:
        form.ip_resource_id,

      assignment_type:
        form.assignment_type,

      ip_address:
        form.ip_address.trim(),

      subnet_mask:
        form.subnet_mask.trim(),

      cidr_prefix:
        cidrPrefix,

      gateway:
        form.gateway.trim(),

      primary_dns:
        form.primary_dns.trim(),

      secondary_dns:
        form.secondary_dns.trim(),

      vlan_id:
        vlanId,

      released_at:
        toApiDateTime(
          form.released_at,
        ),

      status:
        form.status,
    };


    if (
      form.assigned_at
    ) {
      payload.assigned_at =
        toApiDateTime(
          form.assigned_at,
        );
    }


    setSaving(true);
    setError("");
    setNotice(null);

    try {
      if (
        modalMode ===
        "create"
      ) {
        await ipAssignmentApi
          .create(
            session,
            payload,
          );

        setPage(1);

        setNotice({
          type: "success",
          message: ui.created,
        });
      } else if (
        modalMode ===
          "edit" &&
        selected
      ) {
        await ipAssignmentApi
          .update(
            session,
            selected.id,
            payload,
          );

        setNotice({
          type: "success",
          message: ui.updated,
        });
      }

      setModalMode(null);
      setSelected(null);

      setRefreshKey(
        (value) =>
          value + 1,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : ui.saveFailed,
      );
    } finally {
      setSaving(false);
    }
  }


  return (
    <div className="space-y-6 subscriber-workspace-page">
      <SharedPageHeader native as="div" className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            {ui.title}
          </h2>

          <p className="mt-1 max-w-3xl text-sm font-medium text-slate-500">
            {ui.subtitle}
          </p>
        </div>

        <SharedPrimaryButton
          type="button"
          onClick={openCreate}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-cyan-500 px-5 text-sm font-black text-slate-950 transition hover:bg-cyan-400 active:scale-[.98]"
        >
          {ui.newAssignment}
        </SharedPrimaryButton>
      </SharedPageHeader>


      {notice && (
        <div
          className={
            notice.type ===
            "success"
              ? "rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-300"
              : "rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm font-bold text-rose-300"
          }
        >
          {notice.message}
        </div>
      )}


      <div className="hq-visual-panel grid gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-4 lg:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-xs font-bold text-slate-500">
            {ui.status}
          </span>

          <SharedSelect
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(
                event.target.value,
              );

              setPage(1);
            }}
            className="glass-input w-full"
          >
            <option value="">
              {ui.allStatuses}
            </option>

            {(
              [
                "active",
                "reserved",
                "released",
              ] as AssignmentStatus[]
            ).map(
              (status) => (
                <option
                  key={status}
                  value={status}
                >
                  {statusLabel(
                    status,
                  )}
                </option>
              ),
            )}
          </SharedSelect>
        </label>


        <label className="space-y-1.5">
          <span className="text-xs font-bold text-slate-500">
            {ui.customerService}
          </span>

          <SharedSelect
            value={
              customerServiceFilter
            }
            onChange={(event) => {
              setCustomerServiceFilter(
                event.target.value,
              );

              setPage(1);
            }}
            className="glass-input w-full"
          >
            <option value="">
              {ui.allServices}
            </option>

            {customerServices.map(
              (row) => (
                <option
                  key={row.id}
                  value={row.id}
                >
                  {serviceLabel(
                    row,
                  )}
                </option>
              ),
            )}
          </SharedSelect>
        </label>
      </div>


      


      <SharedDataTable
        className="hq-subscriber-table"
        rowKey="id"
        columns={[
{ header: ui.ipAddress, accessor: (row: IPAssignment) => (<>
                          {row.ip_address ||
                            "—"}
                        </>), className: "px-4 py-4 font-mono text-xs font-bold text-cyan-300" },
{ header: ui.customer, accessor: (row: IPAssignment) => (<>
                          {row.customer_name ||
                            "—"}
                        </>), className: "px-4 py-4 font-bold text-white" },
{ header: ui.serviceIdentifier, accessor: (row: IPAssignment) => (<>
                          {row.service_identifier ||
                            "—"}
                        </>), className: "px-4 py-4 font-mono text-xs text-cyan-300" },
{ header: ui.assignmentType, accessor: (row: IPAssignment) => (<>
                          {assignmentTypeLabel(
                            row.assignment_type,
                          )}
                        </>), className: "px-4 py-4 text-slate-300" },
{ header: ui.networkResource, accessor: (row: IPAssignment) => { const resource = row.ip_resource_id ? resourceById.get(row.ip_resource_id) : undefined; return (<>
                          {resource
                            ? resourceLabel(
                                resource,
                              )
                            : row.ip_resource_id ||
                              "—"}
                        </>); }, className: "px-4 py-4 text-xs text-slate-300" },
{ header: ui.cidrPrefix, accessor: (row: IPAssignment) => (<>
                          {row.cidr_prefix ??
                            "—"}
                        </>), className: "px-4 py-4 font-mono text-slate-300" },
{ header: ui.vlanId, accessor: (row: IPAssignment) => (<>
                          {row.vlan_id ??
                            "—"}
                        </>), className: "px-4 py-4 font-mono text-slate-300" },
{ header: ui.status, accessor: (row: IPAssignment) => (<>
                          <span
                            className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-black ${statusClass(
                              row.status,
                            )}`}
                          >
                            {statusLabel(
                              row.status,
                            )}
                          </span>
                        </>), className: "px-4 py-4" },
{ header: ui.assignedAt, accessor: (row: IPAssignment) => (<>
                          {formatDate(
                            row.assigned_at,
                          )}
                        </>), className: "px-4 py-4 text-slate-400" }
        ]}
        data={data.results}
        loading={loading}
        error={!modalMode ? error : undefined}
        emptyMessage={ui.noRecords}
        actions={(row) => (<>
                          <div className="flex gap-2">
                            <SharedSecondaryButton
                              type="button"
                              onClick={() =>
                                openView(
                                  row,
                                )
                              }
                              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:bg-white/10"
                            >
                              {ui.view}
                            </SharedSecondaryButton>

                            <SharedSecondaryButton
                              type="button"
                              onClick={() =>
                                openEdit(
                                  row,
                                )
                              }
                              className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-bold text-cyan-300 transition hover:bg-cyan-400/15"
                            >
                              {ui.edit}
                            </SharedSecondaryButton>
                          </div>
                        </>)}
        pagination={<div className="flex flex-col gap-3 border-t border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs font-bold text-slate-500">
            {ui.page}{" "}
            {page} /{" "}
            {pageCount}
            {" · "}
            {data.count}{" "}
            {ui.records}
          </div>

          <div className="flex gap-2">
            <SharedSecondaryButton
              type="button"
              disabled={
                !data.previous ||
                loading
              }
              onClick={() =>
                setPage(
                  (value) =>
                    Math.max(
                      1,
                      value - 1,
                    ),
                )
              }
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {ui.previous}
            </SharedSecondaryButton>

            <SharedSecondaryButton
              type="button"
              disabled={
                !data.next ||
                loading
              }
              onClick={() =>
                setPage(
                  (value) =>
                    value + 1,
                )
              }
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {ui.next}
            </SharedSecondaryButton>
          </div>
        </div>}
      />


      {modalMode && (
        <WorkspaceModal header={<>

<div>
                <h3 className="text-xl font-black text-white">
                  {modalMode ===
                  "create"
                    ? ui.createAssignment
                    : modalMode ===
                        "edit"
                      ? ui.editAssignment
                      : ui.assignmentDetails}
                </h3>

                {selected && (
                  <p className="mt-1 text-xs font-medium text-slate-500">
                    {selected.ip_address}
                    {" · "}
                    {selected.customer_name}
                    {" · "}
                    {selected.service_identifier}
                  </p>
                )}
              </div>

<SharedSecondaryButton
                type="button"
                onClick={closeModal}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300"
              >
                {ui.close}
              </SharedSecondaryButton>

</>} onClose={closeModal} footer={<>

{modalMode ===
              "view" ? (
                <>
                  <SharedSecondaryButton
                    type="button"
                    onClick={closeModal}
                    className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold text-slate-300"
                  >
                    {ui.close}
                  </SharedSecondaryButton>

                  {selected && (
                    <SharedPrimaryButton
                      type="button"
                      onClick={() =>
                        openEdit(
                          selected,
                        )
                      }
                      className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-black text-slate-950"
                    >
                      {ui.edit}
                    </SharedPrimaryButton>
                  )}
                </>
              ) : (
                <>
                  <SharedSecondaryButton
                    type="button"
                    onClick={closeModal}
                    disabled={saving}
                    className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold text-slate-300 disabled:opacity-50"
                  >
                    {ui.cancel}
                  </SharedSecondaryButton>

                  <SharedPrimaryButton
                    type="button"
                    onClick={() =>
                      void submit()
                    }
                    disabled={saving}
                    className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-black text-slate-950 disabled:opacity-50"
                  >
                    {saving
                      ? ui.loading
                      : ui.save}
                  </SharedPrimaryButton>
                </>
              )}

</>}>
{error && (
              <div className="mb-5 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm font-bold text-rose-300">
                {error}
              </div>
            )}
{modalMode ===
            "view" ? (
              selected && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Info
                    label={
                      ui.ipAddress
                    }
                    value={
                      selected.ip_address
                    }
                  />

                  <Info
                    label={
                      ui.assignmentType
                    }
                    value={assignmentTypeLabel(
                      selected.assignment_type,
                    )}
                  />

                  <Info
                    label={
                      ui.status
                    }
                    value={statusLabel(
                      selected.status,
                    )}
                  />

                  <Info
                    label={
                      ui.customer
                    }
                    value={
                      selected.customer_name
                    }
                  />

                  <Info
                    label={
                      ui.serviceIdentifier
                    }
                    value={
                      selected.service_identifier
                    }
                  />

                  <Info
                    label={
                      ui.networkResource
                    }
                    value={
                      selected.ip_resource_id
                        ? (
                            resourceById.get(
                              selected.ip_resource_id,
                            )
                              ? resourceLabel(
                                  resourceById.get(
                                    selected.ip_resource_id,
                                  )!,
                                )
                              : selected.ip_resource_id
                          )
                        : ui.noResource
                    }
                  />

                  <Info
                    label={
                      ui.subnetMask
                    }
                    value={
                      selected.subnet_mask ||
                      "—"
                    }
                  />

                  <Info
                    label={
                      ui.cidrPrefix
                    }
                    value={
                      selected.cidr_prefix ===
                      null
                        ? "—"
                        : String(
                            selected.cidr_prefix,
                          )
                    }
                  />

                  <Info
                    label={
                      ui.gateway
                    }
                    value={
                      selected.gateway ||
                      "—"
                    }
                  />

                  <Info
                    label={
                      ui.primaryDns
                    }
                    value={
                      selected.primary_dns ||
                      "—"
                    }
                  />

                  <Info
                    label={
                      ui.secondaryDns
                    }
                    value={
                      selected.secondary_dns ||
                      "—"
                    }
                  />

                  <Info
                    label={
                      ui.vlanId
                    }
                    value={
                      selected.vlan_id ===
                      null
                        ? "—"
                        : String(
                            selected.vlan_id,
                          )
                    }
                  />

                  <Info
                    label={
                      ui.assignedAt
                    }
                    value={formatDate(
                      selected.assigned_at,
                    )}
                  />

                  <Info
                    label={
                      ui.releasedAt
                    }
                    value={formatDate(
                      selected.released_at,
                    )}
                  />
                </div>
              )
            ) : (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                <label className="space-y-1.5 md:col-span-2 lg:col-span-3">
                  <span className="text-xs font-bold text-slate-500">
                    {ui.customerService}
                  </span>

                  <SharedSelect
                    value={
                      form.customer_service
                    }
                    disabled={
                      modalMode ===
                        "edit" ||
                      serviceLoading
                    }
                    onChange={(event) =>
                      updateForm(
                        "customer_service",
                        event.target.value,
                      )
                    }
                    className="glass-input w-full disabled:opacity-60"
                  >
                    <option value="">
                      {serviceLoading
                        ? ui.loadingServices
                        : ui.selectCustomerService}
                    </option>

                    {customerServices.map(
                      (row) => (
                        <option
                          key={row.id}
                          value={row.id}
                        >
                          {serviceLabel(
                            row,
                          )}
                        </option>
                      ),
                    )}
                  </SharedSelect>

                  {!serviceLoading &&
                    customerServices.length ===
                      0 && (
                      <p className="text-xs font-medium text-amber-300">
                        {ui.noServices}
                      </p>
                    )}

                  {selectedService && (
                    <p className="text-xs font-medium text-cyan-300">
                      {serviceLabel(
                        selectedService,
                      )}
                    </p>
                  )}
                </label>


                <label className="space-y-1.5 md:col-span-2 lg:col-span-3">
                  <span className="text-xs font-bold text-slate-500">
                    {ui.networkResource}{" "}
                    ({ui.optional})
                  </span>

                  <SharedSelect
                    value={
                      form.ip_resource_id
                    }
                    disabled={
                      resourceLoading
                    }
                    onChange={(event) =>
                      updateForm(
                        "ip_resource_id",
                        event.target.value,
                      )
                    }
                    className="glass-input w-full disabled:opacity-60"
                  >
                    <option value="">
                      {resourceLoading
                        ? ui.loadingResources
                        : ui.noResource}
                    </option>

                    {networkResources.map(
                      (row) => (
                        <option
                          key={row.id}
                          value={row.id}
                        >
                          {resourceLabel(
                            row,
                          )}
                        </option>
                      ),
                    )}
                  </SharedSelect>

                  {!resourceLoading &&
                    networkResources.length ===
                      0 && (
                      <p className="text-xs font-medium text-amber-300">
                        {ui.noResources}
                      </p>
                    )}
                </label>


                <label className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-500">
                    {ui.assignmentType}
                  </span>

                  <SharedSelect
                    value={
                      form.assignment_type
                    }
                    onChange={(event) =>
                      updateForm(
                        "assignment_type",
                        event.target
                          .value as AssignmentType,
                      )
                    }
                    className="glass-input w-full"
                  >
                    {(
                      [
                        "static_ipv4",
                        "static_ipv6",
                        "pppoe_framed",
                        "subnet_prefix",
                        "cgnat",
                      ] as AssignmentType[]
                    ).map(
                      (value) => (
                        <option
                          key={value}
                          value={value}
                        >
                          {assignmentTypeLabel(
                            value,
                          )}
                        </option>
                      ),
                    )}
                  </SharedSelect>
                </label>


                <TextField
                  label={
                    ui.ipAddress
                  }
                  value={
                    form.ip_address
                  }
                  onChange={(value) =>
                    updateForm(
                      "ip_address",
                      value,
                    )
                  }
                />


                <label className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-500">
                    {ui.status}
                  </span>

                  <SharedSelect
                    value={
                      form.status
                    }
                    onChange={(event) =>
                      updateForm(
                        "status",
                        event.target
                          .value as AssignmentStatus,
                      )
                    }
                    className="glass-input w-full"
                  >
                    {(
                      [
                        "active",
                        "reserved",
                        "released",
                      ] as AssignmentStatus[]
                    ).map(
                      (value) => (
                        <option
                          key={value}
                          value={value}
                        >
                          {statusLabel(
                            value,
                          )}
                        </option>
                      ),
                    )}
                  </SharedSelect>
                </label>


                <TextField
                  label={`${ui.subnetMask} (${ui.optional})`}
                  value={
                    form.subnet_mask
                  }
                  onChange={(value) =>
                    updateForm(
                      "subnet_mask",
                      value,
                    )
                  }
                />


                <NumberField
                  label={`${ui.cidrPrefix} (${ui.optional})`}
                  value={
                    form.cidr_prefix
                  }
                  min={0}
                  max={128}
                  onChange={(value) =>
                    updateForm(
                      "cidr_prefix",
                      value,
                    )
                  }
                />


                <TextField
                  label={`${ui.gateway} (${ui.optional})`}
                  value={
                    form.gateway
                  }
                  onChange={(value) =>
                    updateForm(
                      "gateway",
                      value,
                    )
                  }
                />


                <TextField
                  label={`${ui.primaryDns} (${ui.optional})`}
                  value={
                    form.primary_dns
                  }
                  onChange={(value) =>
                    updateForm(
                      "primary_dns",
                      value,
                    )
                  }
                />


                <TextField
                  label={`${ui.secondaryDns} (${ui.optional})`}
                  value={
                    form.secondary_dns
                  }
                  onChange={(value) =>
                    updateForm(
                      "secondary_dns",
                      value,
                    )
                  }
                />


                <NumberField
                  label={`${ui.vlanId} (${ui.optional})`}
                  value={
                    form.vlan_id
                  }
                  onChange={(value) =>
                    updateForm(
                      "vlan_id",
                      value,
                    )
                  }
                />


                <DateTimeField
                  label={`${ui.assignedAt} (${ui.optional})`}
                  value={
                    form.assigned_at
                  }
                  onChange={(value) =>
                    updateForm(
                      "assigned_at",
                      value,
                    )
                  }
                />


                <DateTimeField
                  label={`${ui.releasedAt} (${ui.optional})`}
                  value={
                    form.released_at
                  }
                  onChange={(value) =>
                    updateForm(
                      "released_at",
                      value,
                    )
                  }
                />
              </div>
            )}

</WorkspaceModal>
      )}
    </div>
  );
}


function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="hq-visual-panel rounded-xl border border-white/10 bg-white/[.03] p-4">
      <div className="text-xs font-bold text-slate-500">
        {label}
      </div>

      <div className="mt-2 break-words text-sm font-bold text-slate-100">
        {value || "—"}
      </div>
    </div>
  );
}


function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (
    value: string,
  ) => void;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-bold text-slate-500">
        {label}
      </span>

      <input
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
        className="hq-input glass-input w-full"
      />
    </label>
  );
}


function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: string;
  min?: number;
  max?: number;
  onChange: (
    value: string,
  ) => void;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-bold text-slate-500">
        {label}
      </span>

      <input
        type="number"
        step={1}
        min={min}
        max={max}
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
        className="hq-input glass-input w-full"
      />
    </label>
  );
}


function DateTimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (
    value: string,
  ) => void;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-bold text-slate-500">
        {label}
      </span>

      <input
        type="datetime-local"
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
        className="hq-input glass-input w-full"
      />
    </label>
  );
}
