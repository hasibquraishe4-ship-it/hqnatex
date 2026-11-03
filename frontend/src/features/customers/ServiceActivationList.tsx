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
  serviceActivationApi,
  type Paginated,
  type Session,
} from "../../lib/api";

import {
  useTranslation,
} from "../../lib/i18n";


type ActivationType =
  | "initial"
  | "reactivation"
  | "migration"
  | "upgrade";


type ActivationStatus =
  | "pending"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";


type ServiceActivation = {
  id: string;

  tenant: string;
  company: string;

  customer_service: string;

  customer_name: string;
  service_identifier: string;
  service_name: string;

  activation_type: ActivationType;
  status: ActivationStatus;

  requested_at: string;
  scheduled_at: string | null;
  activated_at: string | null;

  activated_by: string;
  notes: string;

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


type ActivationForm = {
  customer_service: string;

  activation_type: ActivationType;
  status: ActivationStatus;

  requested_at: string;
  scheduled_at: string;
  activated_at: string;

  activated_by: string;
  notes: string;
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


const copy = { en: getUiTranslation("en").featureCopy.customers_ServiceActivationList.copy, fa: getUiTranslation("fa").featureCopy.customers_ServiceActivationList.copy, ps: getUiTranslation("ps").featureCopy.customers_ServiceActivationList.copy };


function localDateTimeNow(): string {
  const now = new Date();

  const local =
    new Date(
      now.getTime() -
        now.getTimezoneOffset() * 60_000,
    );

  return local
    .toISOString()
    .slice(0, 16);
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

  const local =
    new Date(
      date.getTime() -
        date.getTimezoneOffset() * 60_000,
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


function initialForm(): ActivationForm {
  return {
    customer_service: "",

    activation_type:
      "initial",

    status:
      "pending",

    requested_at:
      localDateTimeNow(),

    scheduled_at: "",
    activated_at: "",

    activated_by: "",
    notes: "",
  };
}


function activationTypeClass(
  value: ActivationType,
): string {
  if (value === "initial") {
    return "border-cyan-400/20 bg-cyan-400/10 text-cyan-300";
  }

  if (value === "reactivation") {
    return "border-violet-400/20 bg-violet-400/10 text-violet-300";
  }

  if (value === "migration") {
    return "border-amber-400/20 bg-amber-400/10 text-amber-300";
  }

  return "border-blue-400/20 bg-blue-400/10 text-blue-300";
}


function statusClass(
  value: ActivationStatus,
): string {
  if (value === "completed") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  }

  if (value === "cancelled") {
    return "border-rose-400/20 bg-rose-400/10 text-rose-300";
  }

  if (value === "in_progress") {
    return "border-cyan-400/20 bg-cyan-400/10 text-cyan-300";
  }

  if (value === "scheduled") {
    return "border-blue-400/20 bg-blue-400/10 text-blue-300";
  }

  return "border-amber-400/20 bg-amber-400/10 text-amber-300";
}


export function ServiceActivationList({
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

  const ui =
    copy[lang];


  const [
    data,
    setData,
  ] =
    useState<
      Paginated<ServiceActivation>
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


  const [
    modalMode,
    setModalMode,
  ] =
    useState<ModalMode>(
      null,
    );


  const [
    selected,
    setSelected,
  ] =
    useState<
      ServiceActivation | null
    >(null);


  const [
    form,
    setForm,
  ] =
    useState<ActivationForm>(
      initialForm(),
    );


  const [
    saving,
    setSaving,
  ] =
    useState(false);


  useEffect(() => {
    let cancelled = false;

    async function loadCustomerServices() {
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
            "?ordering=customer__display_name",
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

    void loadCustomerServices();

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

    async function load() {
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
            .customerServiceActivations(
              session,
              `?${params.toString()}`,
            );

        if (!cancelled) {
          setData(
            response as Paginated<
              ServiceActivation
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

    void load();

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
          (item) =>
            item.id ===
            form.customer_service,
        ) || null,
      [
        customerServices,
        form.customer_service,
      ],
    );


  function typeLabel(
    value: ActivationType,
  ): string {
    return ui[value];
  }


  function statusLabel(
    value: ActivationStatus,
  ): string {
    return ui[value];
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
      return new Intl.DateTimeFormat(
        lang === "fa"
          ? "fa-AF"
          : lang === "ps"
            ? "ps-AF"
            : "en-GB",
        {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        },
      ).format(date);
    } catch {
      return date.toLocaleString();
    }
  }


  function serviceOptionLabel(
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


  function openCreate() {
    setSelected(null);
    setForm(
      initialForm(),
    );
    setError("");
    setNotice(null);
    setModalMode("create");
  }


  function openView(
    row: ServiceActivation,
  ) {
    setSelected(row);
    setError("");
    setNotice(null);
    setModalMode("view");
  }


  function openEdit(
    row: ServiceActivation,
  ) {
    setSelected(row);

    setForm({
      customer_service:
        row.customer_service,

      activation_type:
        row.activation_type,

      status:
        row.status,

      requested_at:
        toDateTimeInput(
          row.requested_at,
        ),

      scheduled_at:
        toDateTimeInput(
          row.scheduled_at,
        ),

      activated_at:
        toDateTimeInput(
          row.activated_at,
        ),

      activated_by:
        row.activated_by || "",

      notes:
        row.notes || "",
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


  function updateForm<
    K extends keyof ActivationForm,
  >(
    key: K,
    value: ActivationForm[K],
  ) {
    setForm(
      (current) => ({
        ...current,
        [key]: value,
      }),
    );
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

    setSaving(true);
    setError("");
    setNotice(null);

    const requestedAt =
      toApiDateTime(
        form.requested_at,
      );

    const scheduledAt =
      toApiDateTime(
        form.scheduled_at,
      );

    const activatedAt =
      toApiDateTime(
        form.activated_at,
      );

    const payload = {
      customer_service:
        form.customer_service,

      activation_type:
        form.activation_type,

      status:
        form.status,

      requested_at:
        requestedAt,

      scheduled_at:
        scheduledAt,

      activated_at:
        activatedAt,

      activated_by:
        form.activated_by.trim(),

      notes:
        form.notes.trim(),
    };

    try {
      if (
        modalMode ===
        "create"
      ) {
        await serviceActivationApi
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
        await serviceActivationApi
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
    <div className="activation-page space-y-5 subscriber-workspace-page">
      <SharedPageHeader native as="div" className="activation-page-header flex flex-col gap-4 rounded-[1.5rem] border border-white/70 bg-white/55 p-5 shadow-[0_12px_35px_rgba(65,110,145,.12)] xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-800">
            {ui.title}
          </h2>
        </div>

        <SharedPrimaryButton
          type="button"
          onClick={openCreate}
          className="inline-flex w-fit self-start h-11 items-center justify-center rounded-xl bg-cyan-500 px-6 text-sm font-black text-white shadow-[0_8px_20px_rgba(14,145,220,.22)] transition hover:bg-cyan-400"
        >
          {ui.newActivation}
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


      <div className="activation-filter-panel hq-visual-panel grid gap-4 rounded-[1.5rem] border border-white/70 bg-white/65 p-5 shadow-[0_12px_35px_rgba(65,110,145,.10)] lg:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-xs font-bold text-slate-500">
            {ui.status}
          </span>

          <SharedSelect
            value={
              statusFilter
            }
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
                "pending",
                "scheduled",
                "in_progress",
                "completed",
                "cancelled",
              ] as ActivationStatus[]
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
                  {serviceOptionLabel(
                    row,
                  )}
                </option>
              ),
            )}
          </SharedSelect>
        </label>
      </div>


      


      <SharedDataTable
        className="activation-table-panel hq-subscriber-table"
        rowKey="id"
        columns={[
{ header: ui.customer, accessor: (row: ServiceActivation) => (<>
                        {row.customer_name ||
                          "—"}
                      </>), className: "px-4 py-4 font-bold text-slate-800" },
{ header: ui.identifier, accessor: (row: ServiceActivation) => (<>
                        {row.service_identifier ||
                          "—"}
                      </>), className: "px-4 py-4 font-mono text-xs text-cyan-300" },
{ header: ui.service, accessor: (row: ServiceActivation) => (<>
                        {row.service_name ||
                          "—"}
                      </>), className: "px-4 py-4 text-slate-700" },
{ header: ui.activationType, accessor: (row: ServiceActivation) => (<>
                        <span
                          className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-black ${activationTypeClass(
                            row.activation_type,
                          )}`}
                        >
                          {typeLabel(
                            row.activation_type,
                          )}
                        </span>
                      </>), className: "px-4 py-4" },
{ header: ui.status, accessor: (row: ServiceActivation) => (<>
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
{ header: ui.requestedAt, accessor: (row: ServiceActivation) => (<>
                        {formatDate(
                          row.requested_at,
                        )}
                      </>), className: "px-4 py-4 text-slate-600" },
{ header: ui.scheduledAt, accessor: (row: ServiceActivation) => (<>
                        {formatDate(
                          row.scheduled_at,
                        )}
                      </>), className: "px-4 py-4 text-slate-600" },
{ header: ui.activatedAt, accessor: (row: ServiceActivation) => (<>
                        {formatDate(
                          row.activated_at,
                        )}
                      </>), className: "px-4 py-4 text-slate-600" }
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
                            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-white/10"
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
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
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
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {ui.next}
            </SharedSecondaryButton>
          </div>
        </div>}
      />


      {modalMode && (
        <div className="wp-projects activation-project-form" dir={language === "en" ? "ltr" : "rtl"}>
          <dialog ref={(node) => { if (node && !node.open) node.showModal(); }} aria-labelledby="activation-dialog-title" onCancel={(event) => { event.preventDefault(); if (!saving) closeModal(); }}>
          <form onSubmit={(event) => event.preventDefault()}>
            <header>
              <div>
                <h3 id="activation-dialog-title" className="text-lg font-bold">
                  {modalMode ===
                  "create"
                    ? ui.createActivation
                    : modalMode ===
                        "edit"
                      ? ui.editActivation
                      : ui.activationDetails}
                </h3>

                {selected && (
                  <p className="mt-1 text-xs font-medium text-slate-500">
                    {selected.customer_name}
                    {" · "}
                    {selected.service_identifier}
                    {" · "}
                    {selected.service_name}
                  </p>
                )}
              </div>

              <SharedSecondaryButton
                type="button"
                onClick={closeModal}
                aria-label={ui.close}
                disabled={saving}
                className=""
              >
                ×
              </SharedSecondaryButton>
            </header>
            <div className="wp-body">
            {error && (
              <div className="mb-5 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm font-bold text-rose-300">
                {error}
              </div>
            )}


            {modalMode ===
            "view" ? (
              selected && (
                <div className="wp-grid">
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
                      ui.identifier
                    }
                    value={
                      selected.service_identifier
                    }
                  />

                  <Info
                    label={
                      ui.service
                    }
                    value={
                      selected.service_name
                    }
                  />

                  <Info
                    label={
                      ui.activationType
                    }
                    value={typeLabel(
                      selected.activation_type,
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
                      ui.requestedAt
                    }
                    value={formatDate(
                      selected.requested_at,
                    )}
                  />

                  <Info
                    label={
                      ui.scheduledAt
                    }
                    value={formatDate(
                      selected.scheduled_at,
                    )}
                  />

                  <Info
                    label={
                      ui.activatedAt
                    }
                    value={formatDate(
                      selected.activated_at,
                    )}
                  />

                  <Info
                    label={
                      ui.activatedBy
                    }
                    value={
                      selected.activated_by ||
                      "—"
                    }
                  />

                  <div className="wp-wide">
                    <Info
                      label={
                        ui.notes
                      }
                      value={
                        selected.notes ||
                        "—"
                      }
                    />
                  </div>
                </div>
              )
            ) : (
              <div className="wp-grid">
                <label className="space-y-1.5 wp-wide">
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
                    className="hq-input w-full disabled:opacity-60"
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
                          {serviceOptionLabel(
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
                        {ui.noCustomerServices}
                      </p>
                    )}

                  {selectedService && (
                    <p className="text-xs font-medium text-cyan-300">
                      {serviceOptionLabel(
                        selectedService,
                      )}
                    </p>
                  )}
                </label>


                <label className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-500">
                    {ui.activationType}
                  </span>

                  <SharedSelect
                    value={
                      form.activation_type
                    }
                    onChange={(event) =>
                      updateForm(
                        "activation_type",
                        event.target
                          .value as ActivationType,
                      )
                    }
                    className="hq-input w-full"
                  >
                    {(
                      [
                        "initial",
                        "reactivation",
                        "migration",
                        "upgrade",
                      ] as ActivationType[]
                    ).map(
                      (value) => (
                        <option
                          key={value}
                          value={value}
                        >
                          {typeLabel(
                            value,
                          )}
                        </option>
                      ),
                    )}
                  </SharedSelect>
                </label>


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
                          .value as ActivationStatus,
                      )
                    }
                    className="hq-input w-full"
                  >
                    {(
                      [
                        "pending",
                        "scheduled",
                        "in_progress",
                        "completed",
                        "cancelled",
                      ] as ActivationStatus[]
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


                <DateTimeField
                  label={
                    ui.requestedAt
                  }
                  value={
                    form.requested_at
                  }
                  onChange={(value) =>
                    updateForm(
                      "requested_at",
                      value,
                    )
                  }
                />


                <DateTimeField
                  label={`${ui.scheduledAt} (${ui.optional})`}
                  value={
                    form.scheduled_at
                  }
                  onChange={(value) =>
                    updateForm(
                      "scheduled_at",
                      value,
                    )
                  }
                />


                <DateTimeField
                  label={`${ui.activatedAt} (${ui.optional})`}
                  value={
                    form.activated_at
                  }
                  onChange={(value) =>
                    updateForm(
                      "activated_at",
                      value,
                    )
                  }
                />


                <label className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-500">
                    {ui.activatedBy}
                  </span>

                  <input
                    value={
                      form.activated_by
                    }
                    onChange={(event) =>
                      updateForm(
                        "activated_by",
                        event.target.value,
                      )
                    }
                    className="hq-input w-full"
                  />
                </label>


                <label className="space-y-1.5 wp-wide">
                  <span className="text-xs font-bold text-slate-500">
                    {ui.notes}
                  </span>

                  <textarea
                    value={
                      form.notes
                    }
                    onChange={(event) =>
                      updateForm(
                        "notes",
                        event.target.value,
                      )
                    }
                    rows={4}
                    className="hq-input w-full resize-y"
                  />
                </label>
              </div>
            )}


            </div>
            <footer>
              {modalMode ===
              "view" ? (
                <>
                  <SharedSecondaryButton
                    type="button"
                    onClick={closeModal}
                    className=""
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
                      className="wp-primary"
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
                    className=""
                  >
                    {ui.cancel}
                  </SharedSecondaryButton>

                  <SharedPrimaryButton
                    type="button"
                    onClick={() =>
                      void submit()
                    }
                    disabled={saving}
                    className="wp-primary"
                  >
                    {saving
                      ? ui.loading
                      : ui.save}
                  </SharedPrimaryButton>
                </>
              )}
            </footer>
          </form>
          </dialog>
        </div>
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
  const { language } = useTranslation();
  const [focused, setFocused] = useState(false);
  const date = value ? new Date(value) : null;
  const display = date && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat(language, { dateStyle: "medium", timeStyle: "short" }).format(date)
    : "";
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-bold text-slate-500">
        {label}
      </span>

      <div className="activation-local-date" data-editing={focused}>
      <input
        lang={language}
        aria-label={label}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        type="datetime-local"
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
        className="hq-input glass-input w-full"
      />
      {!focused && <span aria-hidden="true" className="activation-date-display">{display}</span>}
      </div>
    </label>
  );
}



