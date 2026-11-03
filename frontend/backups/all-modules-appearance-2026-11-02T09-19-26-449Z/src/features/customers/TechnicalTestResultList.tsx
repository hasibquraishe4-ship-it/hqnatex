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
  technicalTestResultApi,
  type Paginated,
  type Session,
} from "../../lib/api";

import {
  useTranslation,
} from "../../lib/i18n";


type ResultValue =
  | "pass"
  | "fail"
  | "warning";


type TechnicalTestResult = {
  id: string;

  tenant: string;
  company: string;

  customer_service: string;

  customer_name: string;
  service_identifier: string;

  activation:
    string | null;

  test_type: string;

  result:
    ResultValue;

  measured_values:
    unknown;

  tested_at:
    string | null;

  tested_by: string;

  raw_output: string;

  created_at: string;
  updated_at: string;
};


type CustomerServiceOption = {
  id: string;

  customer_name?: string;

  service_name?: string;

  identifier?: string;

  status?: string;
};


type ActivationOption = {
  id: string;

  customer_service: string;

  customer_name?: string;

  service_identifier?: string;

  activation_type?: string;

  status?: string;

  requested_at?: string;

  scheduled_at?:
    string | null;

  activated_at?:
    string | null;
};


type FormState = {
  customer_service: string;

  activation: string;

  test_type: string;

  result:
    ResultValue;

  measured_values: string;

  tested_at: string;

  tested_by: string;

  raw_output: string;
};


type ModalMode =
  | "create"
  | "view"
  | null;


const PAGE_SIZE = 25;


const RESULT_OPTIONS:
  Array<{
    value: ResultValue;
    label: string;
  }> = [
    {
      value: "pass",
      label: "Pass",
    },
    {
      value: "fail",
      label: "Fail",
    },
    {
      value: "warning",
      label: "Warning",
    },
  ];


const copy = { en: getUiTranslation("en").featureCopy.customers_TechnicalTestResultList.copy, fa: getUiTranslation("fa").featureCopy.customers_TechnicalTestResultList.copy, ps: getUiTranslation("ps").featureCopy.customers_TechnicalTestResultList.copy };


function initialForm():
  FormState {
  return {
    customer_service: "",

    activation: "",

    test_type: "",

    result: "pass",

    measured_values: "{}",

    tested_at: "",

    tested_by: "",

    raw_output: "",
  };
}


function resultClass(
  result: ResultValue,
): string {
  if (result === "pass") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  }

  if (result === "fail") {
    return "border-rose-400/20 bg-rose-400/10 text-rose-300";
  }

  return "border-amber-400/20 bg-amber-400/10 text-amber-300";
}


function toApiDateTime(
  value: string,
):
  string | undefined {
  if (!value) {
    return undefined;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return undefined;
  }

  return date.toISOString();
}


export function TechnicalTestResultList({
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
      Paginated<TechnicalTestResult>
    >({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });


  const [
    services,
    setServices,
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
    serviceFilter,
    setServiceFilter,
  ] =
    useState("");


  const [
    testTypeFilter,
    setTestTypeFilter,
  ] =
    useState("");


  const [
    form,
    setForm,
  ] =
    useState<FormState>(
      initialForm(),
    );


  const [
    selected,
    setSelected,
  ] =
    useState<
      TechnicalTestResult | null
    >(null);


  const [
    modalMode,
    setModalMode,
  ] =
    useState<ModalMode>(
      null,
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
          setServices(
            response.results,
          );
        }
      } catch {
        if (!cancelled) {
          setServices([]);
        }
      } finally {
        if (!cancelled) {
          setServiceLoading(
            false,
          );
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

    if (
      !form.customer_service
    ) {
      setActivations([]);
      return;
    }

    async function loadActivations() {
      setActivationLoading(
        true,
      );

      try {
        const query =
          `?customer_service=${encodeURIComponent(
            form.customer_service,
          )}`;

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
            query,
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

        if (serviceFilter) {
          params.set(
            "customer_service",
            serviceFilter,
          );
        }

        if (testTypeFilter) {
          params.set(
            "test_type",
            testTypeFilter.trim(),
          );
        }

        const response =
          await fetchers
            .customerServiceTestResults(
              session,
              `?${params.toString()}`,
            );

        if (!cancelled) {
          setData(
            response as Paginated<
              TechnicalTestResult
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
    serviceFilter,
    testTypeFilter,
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
        services.find(
          (row) =>
            row.id ===
            form.customer_service,
        ) ?? null,
      [
        services,
        form.customer_service,
      ],
    );


  function serviceLabel(
    row:
      CustomerServiceOption,
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
    row:
      ActivationOption,
  ): string {
    return [
      row.activation_type,
      row.status,
      row.service_identifier,
      row.id,
    ]
      .filter(Boolean)
      .join(" — ");
  }


  function formatDate(
    value?:
      string | null,
  ): string {
    if (!value) {
      return "—";
    }

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


  function resultLabel(
    value: ResultValue,
  ): string {
    return ui[value];
  }


  function updateForm<
    K extends keyof FormState,
  >(
    key: K,
    value: FormState[K],
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

    setForm(
      initialForm(),
    );

    setError("");
    setNotice("");
    setModalMode("create");
  }


  function openView(
    row:
      TechnicalTestResult,
  ) {
    setSelected(row);

    setError("");
    setModalMode("view");
  }


  function closeModal() {
    if (saving) {
      return;
    }

    setModalMode(null);
    setSelected(null);
    setError("");
  }


  async function submit() {
    if (
      !form.customer_service
    ) {
      setError(
        ui.serviceRequired,
      );

      return;
    }


    if (
      !form.test_type.trim()
    ) {
      setError(
        ui.testTypeRequired,
      );

      return;
    }


    let measuredValues:
      unknown;

    try {
      measuredValues =
        JSON.parse(
          form.measured_values ||
          "{}",
        );
    } catch {
      setError(
        ui.invalidJson,
      );

      return;
    }


    const payload:
      Record<
        string,
        unknown
      > = {
      customer_service:
        form.customer_service,

      activation:
        form.activation
          ? form.activation
          : null,

      test_type:
        form.test_type.trim(),

      result:
        form.result,

      measured_values:
        measuredValues,

      tested_by:
        form.tested_by.trim(),

      raw_output:
        form.raw_output,
    };


    const testedAt =
      toApiDateTime(
        form.tested_at,
      );

    if (testedAt) {
      payload.tested_at =
        testedAt;
    }


    setSaving(true);
    setError("");
    setNotice("");

    try {
      await technicalTestResultApi
        .create(
          session,
          payload,
        );

      setNotice(
        ui.created,
      );

      setModalMode(null);
      setSelected(null);
      setPage(1);

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
          {ui.newTest}
        </SharedPrimaryButton>
      </SharedPageHeader>


      {notice && (
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-300">
          {notice}
        </div>
      )}


      <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-4 lg:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-xs font-bold text-slate-500">
            {ui.customerService}
          </span>

          <SharedSelect
            value={
              serviceFilter
            }
            onChange={(event) => {
              setServiceFilter(
                event.target.value,
              );

              setPage(1);
            }}
            className="glass-input w-full"
          >
            <option value="">
              {ui.allServices}
            </option>

            {services.map(
              (row) => (
                <option
                  key={row.id}
                  value={row.id}
                >
                  {serviceLabel(row)}
                </option>
              ),
            )}
          </SharedSelect>
        </label>


        <label className="space-y-1.5">
          <span className="text-xs font-bold text-slate-500">
            {ui.testType}
          </span>

          <input
            value={
              testTypeFilter
            }
            onChange={(event) => {
              setTestTypeFilter(
                event.target.value,
              );

              setPage(1);
            }}
            placeholder={
              ui.allTestTypes
            }
            className="glass-input w-full"
          />
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
          <SharedDataTable native className="min-w-[1150px] w-full text-sm">
            <thead className="border-b border-white/10 bg-white/[.03]">
              <tr className="text-xs font-black text-slate-500">
                <th className="px-4 py-4 text-start">
                  {ui.customer}
                </th>

                <th className="px-4 py-4 text-start">
                  {ui.serviceIdentifier}
                </th>

                <th className="px-4 py-4 text-start">
                  {ui.testType}
                </th>

                <th className="px-4 py-4 text-start">
                  {ui.result}
                </th>

                <th className="px-4 py-4 text-start">
                  {ui.testedAt}
                </th>

                <th className="px-4 py-4 text-start">
                  {ui.testedBy}
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
                    colSpan={7}
                    className="px-4 py-12 text-center font-bold text-slate-500"
                  >
                    {ui.loading}
                  </td>
                </tr>
              ) : data.results.length ===
                0 ? (
                <tr>
                  <td
                    colSpan={7}
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
                      <td className="px-4 py-4 font-bold text-white">
                        {row.customer_name ||
                          "—"}
                      </td>

                      <td className="px-4 py-4 font-mono text-xs text-cyan-300">
                        {row.service_identifier ||
                          "—"}
                      </td>

                      <td className="px-4 py-4 text-slate-300">
                        {row.test_type}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-black ${resultClass(
                            row.result,
                          )}`}
                        >
                          {resultLabel(
                            row.result,
                          )}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-xs text-slate-400">
                        {formatDate(
                          row.tested_at,
                        )}
                      </td>

                      <td className="px-4 py-4 text-slate-300">
                        {row.tested_by ||
                          "—"}
                      </td>

                      <td className="px-4 py-4">
                        <SharedSecondaryButton
                          type="button"
                          onClick={() =>
                            openView(row)
                          }
                          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300"
                        >
                          {ui.view}
                        </SharedSecondaryButton>
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
        </div>
      </div>


      {modalMode && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[2rem] border border-white/10 bg-slate-950 p-6 shadow-2xl lg:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <h3 className="text-xl font-black text-white">
                {modalMode ===
                "create"
                  ? ui.createTest
                  : ui.details}
              </h3>

              <SharedSecondaryButton
                type="button"
                onClick={
                  closeModal
                }
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
              "view" &&
            selected ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                    ui.activation
                  }
                  value={
                    selected.activation ||
                    ui.noActivation
                  }
                  mono
                />

                <Info
                  label={
                    ui.testType
                  }
                  value={
                    selected.test_type
                  }
                />

                <Info
                  label={
                    ui.result
                  }
                  value={
                    resultLabel(
                      selected.result,
                    )
                  }
                />

                <Info
                  label={
                    ui.testedAt
                  }
                  value={
                    formatDate(
                      selected.tested_at,
                    )
                  }
                />

                <Info
                  label={
                    ui.testedBy
                  }
                  value={
                    selected.tested_by ||
                    "—"
                  }
                />

                <Info
                  label={
                    ui.createdAt
                  }
                  value={
                    formatDate(
                      selected.created_at,
                    )
                  }
                />

                <Info
                  label={
                    ui.updatedAt
                  }
                  value={
                    formatDate(
                      selected.updated_at,
                    )
                  }
                />

                <div className="md:col-span-2 lg:col-span-3">
                  <Info
                    label={
                      ui.measuredValues
                    }
                    value={
                      JSON.stringify(
                        selected.measured_values ??
                        {},
                        null,
                        2,
                      )
                    }
                    mono
                  />
                </div>

                <div className="md:col-span-2 lg:col-span-3">
                  <Info
                    label={
                      ui.rawOutput
                    }
                    value={
                      selected.raw_output ||
                      "—"
                    }
                    mono
                  />
                </div>
              </div>
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
                      serviceLoading
                    }
                    onChange={(event) => {
                      updateForm(
                        "customer_service",
                        event.target.value,
                      );

                      updateForm(
                        "activation",
                        "",
                      );
                    }}
                    className="glass-input w-full disabled:opacity-60"
                  >
                    <option value="">
                      {serviceLoading
                        ? ui.loadingServices
                        : ui.selectService}
                    </option>

                    {services.map(
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
                    services.length ===
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
                    {ui.activation}
                    {" "}
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
                      <p className="text-xs font-medium text-amber-300">
                        {ui.noActivations}
                      </p>
                    )}
                </label>


                <TextField
                  label={
                    ui.testType
                  }
                  value={
                    form.test_type
                  }
                  onChange={(value) =>
                    updateForm(
                      "test_type",
                      value,
                    )
                  }
                />


                <label className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-500">
                    {ui.result}
                  </span>

                  <SharedSelect
                    value={
                      form.result
                    }
                    onChange={(event) =>
                      updateForm(
                        "result",
                        event.target
                          .value as ResultValue,
                      )
                    }
                    className="glass-input w-full"
                  >
                    {RESULT_OPTIONS.map(
                      (option) => (
                        <option
                          key={
                            option.value
                          }
                          value={
                            option.value
                          }
                        >
                          {
                            ui[
                              option.value
                            ]
                          }
                        </option>
                      ),
                    )}
                  </SharedSelect>
                </label>


                <label className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-500">
                    {ui.testedAt}
                    {" "}
                    ({ui.optional})
                  </span>

                  <input
                    type="datetime-local"
                    value={
                      form.tested_at
                    }
                    onChange={(event) =>
                      updateForm(
                        "tested_at",
                        event.target.value,
                      )
                    }
                    className="glass-input w-full"
                  />
                </label>


                <TextField
                  label={`${ui.testedBy} (${ui.optional})`}
                  value={
                    form.tested_by
                  }
                  onChange={(value) =>
                    updateForm(
                      "tested_by",
                      value,
                    )
                  }
                />


                <label className="space-y-1.5 md:col-span-2">
                  <span className="text-xs font-bold text-slate-500">
                    {ui.measuredValues}
                    {" "}
                    ({ui.optional})
                  </span>

                  <textarea
                    rows={8}
                    value={
                      form.measured_values
                    }
                    onChange={(event) =>
                      updateForm(
                        "measured_values",
                        event.target.value,
                      )
                    }
                    className="glass-input w-full font-mono text-xs"
                  />
                </label>


                <label className="space-y-1.5 md:col-span-2">
                  <span className="text-xs font-bold text-slate-500">
                    {ui.rawOutput}
                    {" "}
                    ({ui.optional})
                  </span>

                  <textarea
                    rows={7}
                    value={
                      form.raw_output
                    }
                    onChange={(event) =>
                      updateForm(
                        "raw_output",
                        event.target.value,
                      )
                    }
                    className="glass-input w-full font-mono text-xs"
                  />
                </label>
              </div>
            )}


            <div className="mt-7 flex justify-end gap-3">
              {modalMode ===
              "create" ? (
                <>
                  <SharedSecondaryButton
                    type="button"
                    onClick={
                      closeModal
                    }
                    disabled={
                      saving
                    }
                    className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold text-slate-300 disabled:opacity-50"
                  >
                    {ui.cancel}
                  </SharedSecondaryButton>

                  <SharedPrimaryButton
                    type="button"
                    onClick={() =>
                      void submit()
                    }
                    disabled={
                      saving
                    }
                    className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-black text-slate-950 disabled:opacity-50"
                  >
                    {saving
                      ? ui.loading
                      : ui.save}
                  </SharedPrimaryButton>
                </>
              ) : (
                <SharedSecondaryButton
                  type="button"
                  onClick={
                    closeModal
                  }
                  className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold text-slate-300"
                >
                  {ui.close}
                </SharedSecondaryButton>
              )}
            </div>
          </div>
        </div>
      )}
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

  onChange:
    (value: string) => void;
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
        className="glass-input w-full"
      />
    </label>
  );
}


function Info({
  label,
  value,
  mono = false,
}: {
  label: string;

  value: string;

  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[.03] p-4">
      <div className="text-xs font-bold text-slate-500">
        {label}
      </div>

      <pre
        className={
          mono
            ? "mt-2 whitespace-pre-wrap break-words font-mono text-xs text-slate-200"
            : "mt-2 whitespace-pre-wrap break-words font-sans text-sm font-bold text-slate-100"
        }
      >
        {value || "—"}
      </pre>
    </div>
  );
}
