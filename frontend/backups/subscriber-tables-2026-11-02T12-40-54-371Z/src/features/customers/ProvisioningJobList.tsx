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
  provisioningJobApi,
  type Paginated,
  type Session,
} from "../../lib/api";

import {
  useTranslation,
} from "../../lib/i18n";


type ProvisioningStatus =
  | "queued"
  | "running"
  | "successful"
  | "failed"
  | "cancelled";


type ProvisioningJob = {
  id: string;

  tenant: string;
  company: string;

  customer_service: string;
  customer_name: string;
  service_identifier: string;

  activation: string | null;

  job_number: string;
  provisioning_type: string;
  target_system: string;

  payload: unknown;
  response_log: string;

  retry_count: number;

  status: ProvisioningStatus;

  requested_at: string;
  executed_at: string | null;

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


type ActivationOption = {
  id: string;
  customer_service: string;

  customer_name?: string;
  service_identifier?: string;
  service_name?: string;

  activation_type?: string;
  status?: string;

  requested_at?: string;
  scheduled_at?: string | null;
  activated_at?: string | null;
};


type ProvisioningForm = {
  customer_service: string;
  activation: string;

  job_number: string;

  provisioning_type: string;
  target_system: string;

  payloadText: string;
  response_log: string;

  retry_count: string;

  status: ProvisioningStatus;

  requested_at: string;
  executed_at: string;
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


const copy = { en: getUiTranslation("en").featureCopy.customers_ProvisioningJobList.copy, fa: getUiTranslation("fa").featureCopy.customers_ProvisioningJobList.copy, ps: getUiTranslation("ps").featureCopy.customers_ProvisioningJobList.copy };


function initialForm(): ProvisioningForm {
  return {
    customer_service: "",
    activation: "",

    job_number: "",

    provisioning_type: "",
    target_system: "",

    payloadText: "{}",
    response_log: "",

    retry_count: "0",

    status: "queued",

    requested_at: "",
    executed_at: "",
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


function prettyJson(
  value: unknown,
): string {
  try {
    return JSON.stringify(
      value ?? {},
      null,
      2,
    );
  } catch {
    return "{}";
  }
}


function statusClass(
  status: ProvisioningStatus,
): string {
  if (status === "successful") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  }

  if (
    status === "failed" ||
    status === "cancelled"
  ) {
    return "border-rose-400/20 bg-rose-400/10 text-rose-300";
  }

  if (status === "running") {
    return "border-cyan-400/20 bg-cyan-400/10 text-cyan-300";
  }

  return "border-amber-400/20 bg-amber-400/10 text-amber-300";
}


export function ProvisioningJobList({
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
      Paginated<ProvisioningJob>
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
    activations,
    setActivations,
  ] =
    useState<
      ActivationOption[]
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
      ProvisioningJob | null
    >(null);


  const [
    form,
    setForm,
  ] =
    useState<ProvisioningForm>(
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
    activationLoading,
    setActivationLoading,
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
    useState<Notice | null>(null);


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

    async function loadJobs() {
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
            .customerServiceProvisioningJobs(
              session,
              `?${params.toString()}`,
            );

        if (!cancelled) {
          setData(
            response as Paginated<
              ProvisioningJob
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

    void loadJobs();

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


  useEffect(() => {
    let cancelled = false;

    async function loadActivations() {
      if (
        !form.customer_service
      ) {
        setActivations([]);
        return;
      }

      setActivationLoading(true);

      try {
        const response =
          await collectAllPages<
            ActivationOption
          >(
            (params) =>
              fetchers
                .customerServiceActivations(
                  session,
                  params,
                ),
            `?customer_service=${encodeURIComponent(
              form.customer_service,
            )}`,
          );

        if (!cancelled) {
          setActivations(
            response.results,
          );
        }
      } catch {
        if (!cancelled) {
          setActivations([]);
        }
      } finally {
        if (!cancelled) {
          setActivationLoading(
            false,
          );
        }
      }
    }

    void loadActivations();

    return () => {
      cancelled = true;
    };
  }, [
    session.access,
    session.tenantId,
    session.companyId,
    form.customer_service,
  ]);


  const pageCount =
    Math.max(
      1,
      Math.ceil(
        data.count / PAGE_SIZE,
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


  function statusLabel(
    status: ProvisioningStatus,
  ): string {
    return ui[status];
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


  function activationLabel(
    row: ActivationOption,
  ): string {
    return [
      row.activation_type,
      row.status,
      row.requested_at
        ? formatDate(
            row.requested_at,
          )
        : null,
    ]
      .filter(Boolean)
      .join(" — ");
  }


  function updateForm<
    K extends keyof ProvisioningForm,
  >(
    key: K,
    value: ProvisioningForm[K],
  ) {
    setForm(
      (current) => ({
        ...current,
        [key]: value,
      }),
    );
  }


  function changeCustomerService(
    customerServiceId: string,
  ) {
    setForm(
      (current) => ({
        ...current,
        customer_service:
          customerServiceId,
        activation: "",
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
    row: ProvisioningJob,
  ) {
    setSelected(row);
    setError("");
    setNotice(null);
    setModalMode("view");
  }


  function openEdit(
    row: ProvisioningJob,
  ) {
    setSelected(row);

    setForm({
      customer_service:
        row.customer_service,

      activation:
        row.activation || "",

      job_number:
        row.job_number || "",

      provisioning_type:
        row.provisioning_type || "",

      target_system:
        row.target_system || "",

      payloadText:
        prettyJson(row.payload),

      response_log:
        row.response_log || "",

      retry_count:
        String(
          row.retry_count ?? 0,
        ),

      status:
        row.status,

      requested_at:
        toDateTimeInput(
          row.requested_at,
        ),

      executed_at:
        toDateTimeInput(
          row.executed_at,
        ),
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
      !form.provisioning_type.trim()
    ) {
      setError(
        ui.provisioningTypeRequired,
      );

      return;
    }

    if (
      !form.target_system.trim()
    ) {
      setError(
        ui.targetSystemRequired,
      );

      return;
    }


    let parsedPayload:
      unknown = {};

    try {
      parsedPayload =
        form.payloadText.trim()
          ? JSON.parse(
              form.payloadText,
            )
          : {};
    } catch {
      setError(
        ui.invalidJson,
      );

      return;
    }


    const retryCount =
      Number(
        form.retry_count,
      );

    if (
      !Number.isInteger(
        retryCount,
      ) ||
      retryCount < 0
    ) {
      setError(
        ui.invalidRetryCount,
      );

      return;
    }


    const payload: Record<
      string,
      unknown
    > = {
      customer_service:
        form.customer_service,

      activation:
        form.activation ||
        null,

      provisioning_type:
        form.provisioning_type
          .trim(),

      target_system:
        form.target_system
          .trim(),

      payload:
        parsedPayload,

      response_log:
        form.response_log,

      retry_count:
        retryCount,

      status:
        form.status,

      executed_at:
        toApiDateTime(
          form.executed_at,
        ),
    };


    if (
      form.job_number.trim()
    ) {
      payload.job_number =
        form.job_number.trim();
    }


    if (
      form.requested_at
    ) {
      payload.requested_at =
        toApiDateTime(
          form.requested_at,
        );
    }


    setSaving(true);
    setError("");
    setNotice(null);

    try {
      if (
        modalMode === "create"
      ) {
        await provisioningJobApi
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
        modalMode === "edit" &&
        selected
      ) {
        await provisioningJobApi
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
    <div className="space-y-6">
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
          {ui.newJob}
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
                "queued",
                "running",
                "successful",
                "failed",
                "cancelled",
              ] as ProvisioningStatus[]
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


      {error &&
        !modalMode && (
          <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm font-bold text-rose-300">
            {error}
          </div>
        )}


      <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40">
        <div className="overflow-x-auto">
          <SharedDataTable native className="min-w-[1280px] w-full text-sm">
            <thead className="border-b border-white/10 bg-white/[.03]">
              <tr className="text-xs font-black text-slate-500">
                <th className="px-4 py-4 text-start">
                  {ui.jobNumber}
                </th>

                <th className="px-4 py-4 text-start">
                  {ui.customer}
                </th>

                <th className="px-4 py-4 text-start">
                  {ui.serviceIdentifier}
                </th>

                <th className="px-4 py-4 text-start">
                  {ui.provisioningType}
                </th>

                <th className="px-4 py-4 text-start">
                  {ui.targetSystem}
                </th>

                <th className="px-4 py-4 text-start">
                  {ui.retryCount}
                </th>

                <th className="px-4 py-4 text-start">
                  {ui.status}
                </th>

                <th className="px-4 py-4 text-start">
                  {ui.requestedAt}
                </th>

                <th className="px-4 py-4 text-start">
                  {ui.executedAt}
                </th>

                <th className="px-4 py-4 text-start">
                  {ui.actions}
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-12 text-center font-bold text-slate-500"
                  >
                    {ui.loading}
                  </td>
                </tr>
              ) : data.results.length ===
                0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-12 text-center font-bold text-slate-500"
                  >
                    {ui.noRecords}
                  </td>
                </tr>
              ) : (
                data.results.map(
                  (row) => (
                    <tr
                      key={row.id}
                      className="transition hover:bg-white/[.025]"
                    >
                      <td className="px-4 py-4 font-mono text-xs font-bold text-cyan-300">
                        {row.job_number ||
                          "—"}
                      </td>

                      <td className="px-4 py-4 font-bold text-white">
                        {row.customer_name ||
                          "—"}
                      </td>

                      <td className="px-4 py-4 font-mono text-xs text-cyan-300">
                        {row.service_identifier ||
                          "—"}
                      </td>

                      <td className="px-4 py-4 text-slate-300">
                        {row.provisioning_type ||
                          "—"}
                      </td>

                      <td className="px-4 py-4 text-slate-300">
                        {row.target_system ||
                          "—"}
                      </td>

                      <td className="px-4 py-4 font-mono text-slate-300">
                        {row.retry_count}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-black ${statusClass(
                            row.status,
                          )}`}
                        >
                          {statusLabel(
                            row.status,
                          )}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-slate-400">
                        {formatDate(
                          row.requested_at,
                        )}
                      </td>

                      <td className="px-4 py-4 text-slate-400">
                        {formatDate(
                          row.executed_at,
                        )}
                      </td>

                      <td className="px-4 py-4">
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
                      </td>
                    </tr>
                  ),
                )
              )}
            </tbody>
          </SharedDataTable>
        </div>


        <div className="flex flex-col gap-3 border-t border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
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
        </div>
      </div>


      {modalMode && (
        <div className="hq-visual-overlay fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="hq-visual-panel max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[2rem] border border-white/10 bg-slate-950 p-6 shadow-2xl lg:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-white">
                  {modalMode ===
                  "create"
                    ? ui.createJob
                    : modalMode ===
                        "edit"
                      ? ui.editJob
                      : ui.jobDetails}
                </h3>

                {selected && (
                  <p className="mt-1 text-xs font-medium text-slate-500">
                    {selected.job_number}
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
            </div>


            {error && (
              <div className="mb-5 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm font-bold text-rose-300">
                {error}
              </div>
            )}


            {modalMode ===
            "view" ? (
              selected && (
                <div className="grid gap-4 md:grid-cols-2">
                  <Info
                    label={
                      ui.jobNumber
                    }
                    value={
                      selected.job_number
                    }
                  />

                  <Info
                    label={ui.status}
                    value={statusLabel(
                      selected.status,
                    )}
                  />

                  <Info
                    label={ui.customer}
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
                      ui.provisioningType
                    }
                    value={
                      selected.provisioning_type
                    }
                  />

                  <Info
                    label={
                      ui.targetSystem
                    }
                    value={
                      selected.target_system
                    }
                  />

                  <Info
                    label={
                      ui.retryCount
                    }
                    value={String(
                      selected.retry_count,
                    )}
                  />

                  <Info
                    label={
                      ui.activation
                    }
                    value={
                      selected.activation ||
                      ui.noActivation
                    }
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
                      ui.executedAt
                    }
                    value={formatDate(
                      selected.executed_at,
                    )}
                  />

                  <div className="md:col-span-2">
                    <CodeInfo
                      label={
                        ui.payload
                      }
                      value={prettyJson(
                        selected.payload,
                      )}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <CodeInfo
                      label={
                        ui.responseLog
                      }
                      value={
                        selected.response_log ||
                        "—"
                      }
                    />
                  </div>
                </div>
              )
            ) : (
              <div className="grid gap-5 md:grid-cols-2">
                <label className="space-y-1.5 md:col-span-2">
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
                      changeCustomerService(
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


                <label className="space-y-1.5 md:col-span-2">
                  <span className="text-xs font-bold text-slate-500">
                    {ui.activation}{" "}
                    ({ui.optional})
                  </span>

                  <SharedSelect
                    value={
                      form.activation
                    }
                    disabled={
                      !form.customer_service ||
                      activationLoading
                    }
                    onChange={(event) =>
                      updateForm(
                        "activation",
                        event.target.value,
                      )
                    }
                    className="glass-input w-full disabled:opacity-60"
                  >
                    <option value="">
                      {activationLoading
                        ? ui.loadingActivations
                        : ui.noActivation}
                    </option>

                    {activations.map(
                      (row) => (
                        <option
                          key={row.id}
                          value={row.id}
                        >
                          {activationLabel(
                            row,
                          )}
                        </option>
                      ),
                    )}
                  </SharedSelect>

                  {form.customer_service &&
                    !activationLoading &&
                    activations.length ===
                      0 && (
                      <p className="text-xs font-medium text-slate-500">
                        {ui.noActivations}
                      </p>
                    )}
                </label>


                <TextField
                  label={
                    ui.jobNumber
                  }
                  value={
                    form.job_number
                  }
                  placeholder={
                    ui.autoGenerated
                  }
                  onChange={(value) =>
                    updateForm(
                      "job_number",
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
                          .value as ProvisioningStatus,
                      )
                    }
                    className="glass-input w-full"
                  >
                    {(
                      [
                        "queued",
                        "running",
                        "successful",
                        "failed",
                        "cancelled",
                      ] as ProvisioningStatus[]
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


                <TextField
                  label={
                    ui.provisioningType
                  }
                  value={
                    form.provisioning_type
                  }
                  onChange={(value) =>
                    updateForm(
                      "provisioning_type",
                      value,
                    )
                  }
                />


                <TextField
                  label={
                    ui.targetSystem
                  }
                  value={
                    form.target_system
                  }
                  onChange={(value) =>
                    updateForm(
                      "target_system",
                      value,
                    )
                  }
                />


                <label className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-500">
                    {ui.retryCount}
                  </span>

                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={
                      form.retry_count
                    }
                    onChange={(event) =>
                      updateForm(
                        "retry_count",
                        event.target.value,
                      )
                    }
                    className="hq-input glass-input w-full"
                  />
                </label>


                <DateTimeField
                  label={`${ui.requestedAt} (${ui.optional})`}
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
                  label={`${ui.executedAt} (${ui.optional})`}
                  value={
                    form.executed_at
                  }
                  onChange={(value) =>
                    updateForm(
                      "executed_at",
                      value,
                    )
                  }
                />


                <label className="space-y-1.5 md:col-span-2">
                  <span className="text-xs font-bold text-slate-500">
                    {ui.payload}
                  </span>

                  <textarea
                    value={
                      form.payloadText
                    }
                    onChange={(event) =>
                      updateForm(
                        "payloadText",
                        event.target.value,
                      )
                    }
                    rows={10}
                    spellCheck={false}
                    className="hq-input glass-input w-full resize-y font-mono text-xs"
                  />
                </label>


                <label className="space-y-1.5 md:col-span-2">
                  <span className="text-xs font-bold text-slate-500">
                    {ui.responseLog}
                  </span>

                  <textarea
                    value={
                      form.response_log
                    }
                    onChange={(event) =>
                      updateForm(
                        "response_log",
                        event.target.value,
                      )
                    }
                    rows={8}
                    spellCheck={false}
                    className="hq-input glass-input w-full resize-y font-mono text-xs"
                  />
                </label>
              </div>
            )}


            <div className="mt-7 flex flex-wrap justify-end gap-3">
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
            </div>
          </div>
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


function CodeInfo({
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

      <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-black/20 p-4 text-xs text-slate-300">
        {value || "—"}
      </pre>
    </div>
  );
}


function TextField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
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
        placeholder={placeholder}
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
