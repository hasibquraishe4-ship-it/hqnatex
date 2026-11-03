import { getTranslation as getUiTranslation } from "../../i18n";
import { PageHeader as SharedPageHeader } from "../../components/PageHeader";
import { PrimaryButton as SharedPrimaryButton, SecondaryButton as SharedSecondaryButton, Select as SharedSelect } from "../../components/Interface";
import { DataTable as SharedDataTable } from "../../components/DataTable";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  collectAllPages,
  fetchers,
  radiusAccountApi,
  type Paginated,
  type Session,
} from "../../lib/api";

import {
  useTranslation,
} from "../../lib/i18n";


type RadiusStatus =
  | "active"
  | "suspended"
  | "disabled";


type RadiusAccount = {
  id: string;

  tenant: string;
  company: string;

  customer_service: string;
  customer_name: string;
  service_identifier: string;

  username: string;

  profile_id: string;

  service_type: string;
  framed_protocol: string;

  framed_ip_address: string;

  simultaneous_use: number;

  rate_limit_up_kbps:
    number | null;

  rate_limit_down_kbps:
    number | null;

  nas_ip_address: string;

  status: RadiusStatus;

  last_auth_at:
    string | null;

  created_at: string;
  updated_at: string;
};


type CustomerServiceOption = {
  id: string;

  customer_name?: string;
  service_name?: string;

  package_name?:
    string | null;

  identifier?: string;
  username?: string;

  status?: string;
};


type RadiusForm = {
  customer_service: string;

  username: string;

  profile_id: string;

  service_type: string;
  framed_protocol: string;

  framed_ip_address: string;

  simultaneous_use: string;

  rate_limit_up_kbps: string;
  rate_limit_down_kbps: string;

  nas_ip_address: string;

  status: RadiusStatus;
};


type ModalMode =
  | "create"
  | "view"
  | "edit"
  | null;


const PAGE_SIZE = 25;


const copy = { en: getUiTranslation("en").featureCopy.customers_RadiusAccountList.copy, fa: getUiTranslation("fa").featureCopy.customers_RadiusAccountList.copy, ps: getUiTranslation("ps").featureCopy.customers_RadiusAccountList.copy };


function initialForm(): RadiusForm {
  return {
    customer_service: "",

    username: "",

    profile_id: "",

    service_type:
      "Framed-User",

    framed_protocol:
      "PPP",

    framed_ip_address: "",

    simultaneous_use:
      "1",

    rate_limit_up_kbps:
      "",

    rate_limit_down_kbps:
      "",

    nas_ip_address: "",

    status: "active",
  };
}


function statusClass(
  status: RadiusStatus,
): string {
  if (status === "active") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  }

  if (status === "suspended") {
    return "border-amber-400/20 bg-amber-400/10 text-amber-300";
  }

  return "border-slate-400/20 bg-slate-400/10 text-slate-300";
}


export function RadiusAccountList({
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
      Paginated<RadiusAccount>
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
    modalMode,
    setModalMode,
  ] =
    useState<ModalMode>(null);


  const [
    selected,
    setSelected,
  ] =
    useState<
      RadiusAccount | null
    >(null);


  const [
    form,
    setForm,
  ] =
    useState<RadiusForm>(
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
    useState("");


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

    async function loadRows() {
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
            .customerServiceRadiusAccounts(
              session,
              `?${params.toString()}`,
            );

        if (!cancelled) {
          setData(
            response as Paginated<
              RadiusAccount
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

    void loadRows();

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


  function updateForm<
    K extends keyof RadiusForm,
  >(
    key: K,
    value: RadiusForm[K],
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
    setNotice("");
    setModalMode("create");
  }


  function openView(
    row: RadiusAccount,
  ) {
    setSelected(row);
    setError("");
    setNotice("");
    setModalMode("view");
  }


  function openEdit(
    row: RadiusAccount,
  ) {
    setSelected(row);

    setForm({
      customer_service:
        row.customer_service,

      username:
        row.username || "",

      profile_id:
        row.profile_id || "",

      service_type:
        row.service_type ||
        "Framed-User",

      framed_protocol:
        row.framed_protocol ||
        "PPP",

      framed_ip_address:
        row.framed_ip_address ||
        "",

      simultaneous_use:
        String(
          row.simultaneous_use ??
          1,
        ),

      rate_limit_up_kbps:
        row.rate_limit_up_kbps ===
        null
          ? ""
          : String(
              row.rate_limit_up_kbps,
            ),

      rate_limit_down_kbps:
        row.rate_limit_down_kbps ===
        null
          ? ""
          : String(
              row.rate_limit_down_kbps,
            ),

      nas_ip_address:
        row.nas_ip_address || "",

      status:
        row.status,
    });

    setError("");
    setNotice("");
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
      !form.username.trim()
    ) {
      setError(
        ui.usernameRequired,
      );

      return;
    }


    const simultaneousUse =
      Number(
        form.simultaneous_use,
      );

    if (
      !Number.isInteger(
        simultaneousUse,
      ) ||
      simultaneousUse < 1
    ) {
      setError(
        ui.invalidSimultaneous,
      );

      return;
    }


    const parseRate = (
      value: string,
    ): number | null => {
      if (!value.trim()) {
        return null;
      }

      return Number(value);
    };


    const uploadRate =
      parseRate(
        form.rate_limit_up_kbps,
      );

    const downloadRate =
      parseRate(
        form.rate_limit_down_kbps,
      );


    if (
      (
        uploadRate !== null &&
        (
          !Number.isInteger(
            uploadRate,
          ) ||
          uploadRate < 0
        )
      ) ||
      (
        downloadRate !== null &&
        (
          !Number.isInteger(
            downloadRate,
          ) ||
          downloadRate < 0
        )
      )
    ) {
      setError(
        ui.invalidRate,
      );

      return;
    }


    const payload = {
      customer_service:
        form.customer_service,

      username:
        form.username.trim(),

      profile_id:
        form.profile_id.trim(),

      service_type:
        form.service_type.trim(),

      framed_protocol:
        form.framed_protocol.trim(),

      framed_ip_address:
        form.framed_ip_address.trim(),

      simultaneous_use:
        simultaneousUse,

      rate_limit_up_kbps:
        uploadRate,

      rate_limit_down_kbps:
        downloadRate,

      nas_ip_address:
        form.nas_ip_address.trim(),

      status:
        form.status,
    };


    setSaving(true);
    setError("");
    setNotice("");

    try {
      if (
        modalMode ===
        "create"
      ) {
        await radiusAccountApi
          .create(
            session,
            payload,
          );

        setPage(1);

        setNotice(
          ui.created,
        );
      } else if (
        modalMode ===
          "edit" &&
        selected
      ) {
        await radiusAccountApi
          .update(
            session,
            selected.id,
            payload,
          );

        setNotice(
          ui.updated,
        );
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
          className="inline-flex h-11 items-center justify-center rounded-xl bg-cyan-500 px-5 text-sm font-black text-slate-950 transition hover:bg-cyan-400"
        >
          {ui.newAccount}
        </SharedPrimaryButton>
      </SharedPageHeader>


      <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-xs font-bold text-cyan-200">
        {ui.securityNotice}
      </div>


      {notice && (
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-300">
          {notice}
        </div>
      )}


      <div className="hq-visual-panel grid gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-4 lg:grid-cols-2">
        <FilterSelect
          label={ui.status}
          value={statusFilter}
          onChange={(value) => {
            setStatusFilter(
              value,
            );
            setPage(1);
          }}
        >
          <option value="">
            {ui.allStatuses}
          </option>

          {(
            [
              "active",
              "suspended",
              "disabled",
            ] as RadiusStatus[]
          ).map(
            (status) => (
              <option
                key={status}
                value={status}
              >
                {ui[status]}
              </option>
            ),
          )}
        </FilterSelect>


        <FilterSelect
          label={
            ui.customerService
          }
          value={
            customerServiceFilter
          }
          onChange={(value) => {
            setCustomerServiceFilter(
              value,
            );
            setPage(1);
          }}
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
        </FilterSelect>
      </div>


      


      <SharedDataTable
        className="hq-subscriber-table"
        rowKey="id"
        columns={[
{ header: ui.username, accessor: (row: RadiusAccount) => (<>
                        {row.username}
                      </>), className: "px-4 py-4 font-mono text-xs font-black text-cyan-300" },
{ header: ui.customer, accessor: (row: RadiusAccount) => (<>
                        {row.customer_name ||
                          "—"}
                      </>), className: "px-4 py-4 font-bold text-white" },
{ header: ui.serviceIdentifier, accessor: (row: RadiusAccount) => (<>
                        {row.service_identifier ||
                          "—"}
                      </>), className: "px-4 py-4 font-mono text-xs text-cyan-300" },
{ header: ui.profileId, accessor: (row: RadiusAccount) => (<>
                        {row.profile_id ||
                          "—"}
                      </>), className: "px-4 py-4 text-slate-300" },
{ header: ui.serviceType, accessor: (row: RadiusAccount) => (<>
                        {row.service_type ||
                          "—"}
                      </>), className: "px-4 py-4 text-slate-300" },
{ header: ui.framedIp, accessor: (row: RadiusAccount) => (<>
                        {row.framed_ip_address ||
                          "—"}
                      </>), className: "px-4 py-4 font-mono text-xs text-slate-300" },
{ header: ui.uploadRate, accessor: (row: RadiusAccount) => (<>
                        {row.rate_limit_up_kbps ??
                          "—"}
                      </>), className: "px-4 py-4 text-slate-300" },
{ header: ui.downloadRate, accessor: (row: RadiusAccount) => (<>
                        {row.rate_limit_down_kbps ??
                          "—"}
                      </>), className: "px-4 py-4 text-slate-300" },
{ header: ui.status, accessor: (row: RadiusAccount) => (<>
                        <span
                          className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-black ${statusClass(
                            row.status,
                          )}`}
                        >
                          {ui[row.status]}
                        </span>
                      </>), className: "px-4 py-4" },
{ header: ui.lastAuth, accessor: (row: RadiusAccount) => (<>
                        {formatDate(
                          row.last_auth_at,
                        )}
                      </>), className: "px-4 py-4 text-xs text-slate-400" }
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
                            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300"
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
                            className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-bold text-cyan-300"
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
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300 disabled:opacity-40"
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
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300 disabled:opacity-40"
            >
              {ui.next}
            </SharedSecondaryButton>
          </div>
        </div>}
      />


      {modalMode && (
        <div className="hq-visual-overlay fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="hq-visual-panel max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[2rem] border border-white/10 bg-slate-950 p-6 shadow-2xl lg:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-white">
                  {modalMode ===
                  "create"
                    ? ui.createAccount
                    : modalMode ===
                        "edit"
                      ? ui.editAccount
                      : ui.details}
                </h3>

                {selected && (
                  <p className="mt-1 text-xs font-medium text-slate-500">
                    {selected.username}
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
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Info
                    label={ui.username}
                    value={selected.username}
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
                    label={ui.profileId}
                    value={
                      selected.profile_id ||
                      "—"
                    }
                  />

                  <Info
                    label={ui.serviceType}
                    value={
                      selected.service_type ||
                      "—"
                    }
                  />

                  <Info
                    label={
                      ui.framedProtocol
                    }
                    value={
                      selected.framed_protocol ||
                      "—"
                    }
                  />

                  <Info
                    label={ui.framedIp}
                    value={
                      selected.framed_ip_address ||
                      "—"
                    }
                  />

                  <Info
                    label={ui.nasIp}
                    value={
                      selected.nas_ip_address ||
                      "—"
                    }
                  />

                  <Info
                    label={
                      ui.simultaneousUse
                    }
                    value={String(
                      selected.simultaneous_use,
                    )}
                  />

                  <Info
                    label={ui.uploadRate}
                    value={
                      selected.rate_limit_up_kbps ===
                      null
                        ? "—"
                        : String(
                            selected.rate_limit_up_kbps,
                          )
                    }
                  />

                  <Info
                    label={ui.downloadRate}
                    value={
                      selected.rate_limit_down_kbps ===
                      null
                        ? "—"
                        : String(
                            selected.rate_limit_down_kbps,
                          )
                    }
                  />

                  <Info
                    label={ui.status}
                    value={
                      ui[selected.status]
                    }
                  />

                  <Info
                    label={ui.lastAuth}
                    value={formatDate(
                      selected.last_auth_at,
                    )}
                  />

                  <Info
                    label={ui.createdAt}
                    value={formatDate(
                      selected.created_at,
                    )}
                  />

                  <Info
                    label={ui.updatedAt}
                    value={formatDate(
                      selected.updated_at,
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


                <TextField
                  label={ui.username}
                  value={form.username}
                  onChange={(value) =>
                    updateForm(
                      "username",
                      value,
                    )
                  }
                />


                <TextField
                  label={`${ui.profileId} (${ui.optional})`}
                  value={form.profile_id}
                  onChange={(value) =>
                    updateForm(
                      "profile_id",
                      value,
                    )
                  }
                />


                <TextField
                  label={ui.serviceType}
                  value={
                    form.service_type
                  }
                  onChange={(value) =>
                    updateForm(
                      "service_type",
                      value,
                    )
                  }
                />


                <TextField
                  label={
                    ui.framedProtocol
                  }
                  value={
                    form.framed_protocol
                  }
                  onChange={(value) =>
                    updateForm(
                      "framed_protocol",
                      value,
                    )
                  }
                />


                <TextField
                  label={`${ui.framedIp} (${ui.optional})`}
                  value={
                    form.framed_ip_address
                  }
                  onChange={(value) =>
                    updateForm(
                      "framed_ip_address",
                      value,
                    )
                  }
                />


                <TextField
                  label={`${ui.nasIp} (${ui.optional})`}
                  value={
                    form.nas_ip_address
                  }
                  onChange={(value) =>
                    updateForm(
                      "nas_ip_address",
                      value,
                    )
                  }
                />


                <NumberField
                  label={
                    ui.simultaneousUse
                  }
                  value={
                    form.simultaneous_use
                  }
                  min={1}
                  onChange={(value) =>
                    updateForm(
                      "simultaneous_use",
                      value,
                    )
                  }
                />


                <NumberField
                  label={`${ui.uploadRate} (${ui.optional})`}
                  value={
                    form.rate_limit_up_kbps
                  }
                  min={0}
                  onChange={(value) =>
                    updateForm(
                      "rate_limit_up_kbps",
                      value,
                    )
                  }
                />


                <NumberField
                  label={`${ui.downloadRate} (${ui.optional})`}
                  value={
                    form.rate_limit_down_kbps
                  }
                  min={0}
                  onChange={(value) =>
                    updateForm(
                      "rate_limit_down_kbps",
                      value,
                    )
                  }
                />


                <label className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-500">
                    {ui.status}
                  </span>

                  <SharedSelect
                    value={form.status}
                    onChange={(event) =>
                      updateForm(
                        "status",
                        event.target
                          .value as RadiusStatus,
                      )
                    }
                    className="glass-input w-full"
                  >
                    {(
                      [
                        "active",
                        "suspended",
                        "disabled",
                      ] as RadiusStatus[]
                    ).map(
                      (value) => (
                        <option
                          key={value}
                          value={value}
                        >
                          {ui[value]}
                        </option>
                      ),
                    )}
                  </SharedSelect>
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


function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (
    value: string,
  ) => void;
  children:
    React.ReactNode;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-bold text-slate-500">
        {label}
      </span>

      <SharedSelect
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
        className="glass-input w-full"
      >
        {children}
      </SharedSelect>
    </label>
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
  onChange,
}: {
  label: string;
  value: string;
  min?: number;
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
