import { getTranslation as getUiTranslation } from "../../i18n";
import { SecondaryButton as SharedSecondaryButton, Select as SharedSelect, DatePicker as SharedDatePicker } from "../../components/Interface";
import { PageHeader as SharedPageHeader } from "../../components/PageHeader";
import { DataTable as SharedDataTable } from "../../components/DataTable";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  CheckCircle2,
  CircleDollarSign,
  Eye,
  FileText,
  Plus,
  RefreshCw,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";

import { DataTable } from "../../components/DataTable";
import {
  agencySettlementApi,
  fetchers,
  type AgencySettlementApprovePayload,
  type AgencySettlementCreatePayload,
  type AgencySettlementMarkPaidPayload,
  type AgencySettlementRecord,
  type AgencySettlementStatus,
  type AgencySettlementVoidPayload,
} from "../../lib/api";
import { useTranslation } from "../../lib/i18n";

type SettlementSession =
  Parameters<typeof agencySettlementApi.list>[0];

type AgencyOption = {
  id: string;
  name?: string | null;
  code?: string | null;
  status?: string | null;
};

type ModalMode =
  | "create"
  | "view"
  | "approve"
  | "mark_paid"
  | "void";

type CopyShape = {
  title: string;
  subtitle: string;
  view: string;
  create: string;
  approve: string;
  markPaid: string;
  void: string;
  refresh: string;
  close: string;
  cancel: string;
  submit: string;
  saving: string;
  number: string;
  agency: string;
  chooseAgency: string;
  period: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  grossShare: string;
  tax: string;
  netPayable: string;
  paid: string;
  balance: string;
  currency: string;
  reference: string;
  notes: string;
  reason: string;
  approvedAt: string;
  paidAt: string;
  createdAt: string;
  updatedAt: string;
  lines: string;
  revenueNumber: string;
  recognitionDate: string;
  active: string;
  yes: string;
  no: string;
  companyRequired: string;
  loadError: string;
  detailError: string;
  agenciesError: string;
  createError: string;
  actionError: string;
  periodRequired: string;
  periodInvalid: string;
  agencyRequired: string;
  reasonRequired: string;
  empty: string;
  loadingDetails: string;
  confirmApprove: string;
  confirmPaid: string;
  confirmVoid: string;
  createTitle: string;
  approveTitle: string;
  paidTitle: string;
  voidTitle: string;
  financialServerNotice: string;
  noActions: string;
  statusLabel: Record<
    AgencySettlementStatus,
    string
  >;
};

const copy: Record<
  "en" | "fa" | "ps",
  CopyShape
> = { en: getUiTranslation("en").featureCopy.revenue_AgencySettlementList.copy, fa: getUiTranslation("fa").featureCopy.revenue_AgencySettlementList.copy, ps: getUiTranslation("ps").featureCopy.revenue_AgencySettlementList.copy };

function formatMoney(
  value: string | number | null | undefined,
  currency: string,
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return `— ${currency}`;
  }

  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return `${String(value)} ${currency}`;
  }

  return `${new Intl.NumberFormat(
    "en-US",
    {
      maximumFractionDigits: 2,
    },
  ).format(numeric)} ${currency}`;
}

function formatDateTime(
  value?: string | null,
) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function periodLabel(
  row: AgencySettlementRecord,
) {
  return `${row.period_start} — ${row.period_end}`;
}

function statusClass(
  status: AgencySettlementStatus,
) {
  if (status === "paid") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  }

  if (status === "approved") {
    return "border-cyan-400/20 bg-cyan-400/10 text-cyan-300";
  }

  if (status === "void") {
    return "border-rose-400/20 bg-rose-400/10 text-rose-300";
  }

  return "border-amber-400/20 bg-amber-400/10 text-amber-300";
}

function DetailValue({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
      <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </div>

      <div className="break-words text-sm font-semibold text-slate-200">
        {value}
      </div>
    </div>
  );
}

export function AgencySettlementList({
  session,
}: {
  session: SettlementSession;
}) {
  const {
    language,
    rtl,
  } = useTranslation();

  const c =
    copy[
      language as keyof typeof copy
    ] ?? copy.en;

  const [
    rows,
    setRows,
  ] = useState<
    AgencySettlementRecord[]
  >([]);

  const [
    totalCount,
    setTotalCount,
  ] = useState(0);

  const [
    page,
    setPage,
  ] = useState(1);

  const [
    pageSize,
    setPageSize,
  ] = useState(10);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const [
    selected,
    setSelected,
  ] = useState<
    AgencySettlementRecord | null
  >(null);

  const [
    modalMode,
    setModalMode,
  ] = useState<ModalMode | null>(
    null,
  );

  const [
    detailLoading,
    setDetailLoading,
  ] = useState(false);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    formError,
    setFormError,
  ] = useState<string | null>(
    null,
  );

  const [
    agencies,
    setAgencies,
  ] = useState<AgencyOption[]>(
    [],
  );

  const [
    agencyLoading,
    setAgencyLoading,
  ] = useState(false);

  const [
    createForm,
    setCreateForm,
  ] = useState<
    AgencySettlementCreatePayload
  >({
    agency_id: "",
    period_start: "",
    period_end: "",
    currency: "AFN",
    reference: "",
    notes: "",
  });

  const [
    approveNotes,
    setApproveNotes,
  ] = useState("");

  const [
    paidReference,
    setPaidReference,
  ] = useState("");

  const [
    paidNotes,
    setPaidNotes,
  ] = useState("");

  const [
    voidReason,
    setVoidReason,
  ] = useState("");

  const resetActionState =
    useCallback(
      () => {
        setFormError(null);
        setApproveNotes("");
        setPaidReference("");
        setPaidNotes("");
        setVoidReason("");
      },
      [],
    );

  const load =
    useCallback(
      async () => {
        if (!session.companyId) {
          setRows([]);
          setTotalCount(0);
          setError(
            c.companyRequired,
          );
          return;
        }

        setLoading(true);
        setError(null);

        try {
          const params =
            `?page=${page}` +
            `&page_size=${pageSize}`;

          const response =
            await agencySettlementApi.list(
              session,
              params,
            );

          setRows(
            response.results ?? [],
          );

          setTotalCount(
            Number(
              response.count ?? 0,
            ),
          );
        } catch (caught) {
          setRows([]);
          setTotalCount(0);

          setError(
            caught instanceof Error
              ? caught.message
              : c.loadError,
          );
        } finally {
          setLoading(false);
        }
      },
      [
        c.companyRequired,
        c.loadError,
        page,
        pageSize,
        session,
      ],
    );

  const loadAgencies =
    useCallback(
      async () => {
        if (!session.companyId) {
          setAgencies([]);
          return;
        }

        setAgencyLoading(true);

        try {
          const response =
            await fetchers.agencies(
              session,
              "?page_size=100&ordering=name",
            );

          const source = Array.isArray(
            response,
          )
            ? response
            : response.results ?? [];

          const active =
            source.filter(
              (
                agency:
                  AgencyOption,
              ) =>
                !agency.status ||
                agency.status ===
                  "active",
            );

          setAgencies(
            active,
          );
        } catch (caught) {
          setAgencies([]);

          setFormError(
            caught instanceof Error
              ? caught.message
              : c.agenciesError,
          );
        } finally {
          setAgencyLoading(false);
        }
      },
      [
        c.agenciesError,
        session,
      ],
    );

  useEffect(
    () => {
      void load();
    },
    [
      load,
    ],
  );

  useEffect(
    () => {
      setPage(1);
      setSelected(null);
      setModalMode(null);
      setError(null);
      resetActionState();
      setCreateForm({
        agency_id: "",
        period_start: "",
        period_end: "",
        currency: "AFN",
        reference: "",
        notes: "",
      });
    },
    [
      resetActionState,
      session.companyId,
      session.tenantId,
    ],
  );

  const retrieveFresh =
    useCallback(
      async (
        id: string,
      ) => {
        const fresh =
          await agencySettlementApi.retrieve(
            session,
            id,
          );

        setSelected(fresh);

        return fresh;
      },
      [
        session,
      ],
    );

  const openDetail =
    useCallback(
      async (
        row:
          AgencySettlementRecord,
      ) => {
        setSelected(row);
        setModalMode("view");
        setDetailLoading(true);
        setFormError(null);

        try {
          await retrieveFresh(
            row.id,
          );
        } catch (caught) {
          setFormError(
            caught instanceof Error
              ? caught.message
              : c.detailError,
          );
        } finally {
          setDetailLoading(false);
        }
      },
      [
        c.detailError,
        retrieveFresh,
      ],
    );

  const openCreate =
    useCallback(
      async () => {
        if (!session.companyId) {
          setError(
            c.companyRequired,
          );
          return;
        }

        resetActionState();

        setCreateForm({
          agency_id: "",
          period_start: "",
          period_end: "",
          currency: "AFN",
          reference: "",
          notes: "",
        });

        setSelected(null);
        setModalMode(
          "create",
        );

        await loadAgencies();
      },
      [
        c.companyRequired,
        loadAgencies,
        resetActionState,
        session.companyId,
      ],
    );

  const closeModal =
    useCallback(
      () => {
        if (saving) {
          return;
        }

        setModalMode(null);
        setSelected(null);
        setFormError(null);
        resetActionState();
      },
      [
        resetActionState,
        saving,
      ],
    );

  const startAction =
    useCallback(
      (
        row:
          AgencySettlementRecord,
        mode:
          | "approve"
          | "mark_paid"
          | "void",
      ) => {
        resetActionState();
        setSelected(row);
        setModalMode(mode);
      },
      [
        resetActionState,
      ],
    );

  const createSettlement =
    useCallback(
      async (
        event:
          FormEvent<HTMLFormElement>,
      ) => {
        event.preventDefault();

        if (saving) {
          return;
        }

        if (!session.companyId) {
          setFormError(
            c.companyRequired,
          );
          return;
        }

        if (
          !createForm.agency_id
        ) {
          setFormError(
            c.agencyRequired,
          );
          return;
        }

        if (
          !createForm.period_start ||
          !createForm.period_end
        ) {
          setFormError(
            c.periodRequired,
          );
          return;
        }

        if (
          createForm.period_end <
          createForm.period_start
        ) {
          setFormError(
            c.periodInvalid,
          );
          return;
        }

        setSaving(true);
        setFormError(null);

        try {
          const created =
            await agencySettlementApi.create(
              session,
              {
                agency_id:
                  createForm.agency_id,
                period_start:
                  createForm.period_start,
                period_end:
                  createForm.period_end,
                currency:
                  createForm.currency ||
                  "AFN",
                reference:
                  createForm.reference ||
                  "",
                notes:
                  createForm.notes ||
                  "",
              },
            );

          setSelected(
            created,
          );

          setModalMode(
            "view",
          );

          setPage(1);

          await load();
        } catch (caught) {
          setFormError(
            caught instanceof Error
              ? caught.message
              : c.createError,
          );
        } finally {
          setSaving(false);
        }
      },
      [
        c.agencyRequired,
        c.companyRequired,
        c.createError,
        c.periodInvalid,
        c.periodRequired,
        createForm,
        load,
        saving,
        session,
      ],
    );

  const submitAction =
    useCallback(
      async (
        event:
          FormEvent<HTMLFormElement>,
      ) => {
        event.preventDefault();

        if (
          saving ||
          !selected ||
          !modalMode
        ) {
          return;
        }

        setFormError(null);

        if (
          modalMode === "void" &&
          !voidReason.trim()
        ) {
          setFormError(
            c.reasonRequired,
          );
          return;
        }

        let confirmed = true;

        if (
          modalMode === "approve"
        ) {
          confirmed =
            window.confirm(
              c.confirmApprove,
            );
        }

        if (
          modalMode ===
          "mark_paid"
        ) {
          confirmed =
            window.confirm(
              c.confirmPaid,
            );
        }

        if (
          modalMode === "void"
        ) {
          confirmed =
            window.confirm(
              c.confirmVoid,
            );
        }

        if (!confirmed) {
          return;
        }

        setSaving(true);

        try {
          let result:
            AgencySettlementRecord;

          if (
            modalMode ===
            "approve"
          ) {
            const payload:
              AgencySettlementApprovePayload =
              {
                notes:
                  approveNotes,
              };

            result =
              await agencySettlementApi.approve(
                session,
                selected.id,
                payload,
              );
          } else if (
            modalMode ===
            "mark_paid"
          ) {
            const payload:
              AgencySettlementMarkPaidPayload =
              {
                reference:
                  paidReference,
                notes:
                  paidNotes,
              };

            result =
              await agencySettlementApi.markPaid(
                session,
                selected.id,
                payload,
              );
          } else if (
            modalMode === "void"
          ) {
            const payload:
              AgencySettlementVoidPayload =
              {
                reason:
                  voidReason.trim(),
              };

            result =
              await agencySettlementApi.void(
                session,
                selected.id,
                payload,
              );
          } else {
            return;
          }

          setSelected(
            result,
          );

          setModalMode(
            "view",
          );

          resetActionState();

          await load();

          try {
            await retrieveFresh(
              result.id,
            );
          } catch {
            setSelected(
              result,
            );
          }
        } catch (caught) {
          setFormError(
            caught instanceof Error
              ? caught.message
              : c.actionError,
          );
        } finally {
          setSaving(false);
        }
      },
      [
        approveNotes,
        c.actionError,
        c.confirmApprove,
        c.confirmPaid,
        c.confirmVoid,
        c.reasonRequired,
        load,
        modalMode,
        paidNotes,
        paidReference,
        resetActionState,
        retrieveFresh,
        saving,
        selected,
        session,
        voidReason,
      ],
    );

  const columns = useMemo(
    () => [
      {
        header: c.number,
        accessor: (
          row:
            AgencySettlementRecord,
        ) => (
          <span className="font-mono text-xs font-bold text-cyan-300">
            {row.settlement_number}
          </span>
        ),
      },
      {
        header: c.agency,
        accessor: (
          row:
            AgencySettlementRecord,
        ) =>
          row.agency_name ||
          row.agency ||
          "—",
      },
      {
        header: c.period,
        accessor: (
          row:
            AgencySettlementRecord,
        ) =>
          periodLabel(row),
      },
      {
        header: c.netPayable,
        accessor: (
          row:
            AgencySettlementRecord,
        ) =>
          formatMoney(
            row.net_payable_amount,
            row.currency,
          ),
      },
      {
        header: c.balance,
        accessor: (
          row:
            AgencySettlementRecord,
        ) =>
          formatMoney(
            row.balance_amount,
            row.currency,
          ),
      },
      {
        header: c.status,
        accessor: (
          row:
            AgencySettlementRecord,
        ) => (
          <span
            className={
              "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold " +
              statusClass(
                row.status,
              )
            }
          >
            {
              c.statusLabel[
                row.status
              ]
            }
          </span>
        ),
      },
    ],
    [
      c,
    ],
  );

  const actionButtons =
    useCallback(
      (
        row:
          AgencySettlementRecord,
      ) => (
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <SharedSecondaryButton
            type="button"
            onClick={() => {
              void openDetail(
                row,
              );
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-cyan-400/15 bg-cyan-400/5 px-2 py-1.5 text-[10px] font-bold text-cyan-300 transition hover:bg-cyan-400/10"
          >
            <Eye className="h-3.5 w-3.5" />
            {c.view}
          </SharedSecondaryButton>

          {row.status ===
            "draft" && (
            <SharedSecondaryButton
              type="button"
              onClick={() => {
                startAction(
                  row,
                  "approve",
                );
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/15 bg-emerald-400/5 px-2 py-1.5 text-[10px] font-bold text-emerald-300 transition hover:bg-emerald-400/10"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              {c.approve}
            </SharedSecondaryButton>
          )}

          {row.status ===
            "approved" && (
            <SharedSecondaryButton
              type="button"
              onClick={() => {
                startAction(
                  row,
                  "mark_paid",
                );
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/15 bg-emerald-400/5 px-2 py-1.5 text-[10px] font-bold text-emerald-300 transition hover:bg-emerald-400/10"
            >
              <CircleDollarSign className="h-3.5 w-3.5" />
              {c.markPaid}
            </SharedSecondaryButton>
          )}

          {(
            row.status ===
              "draft" ||
            row.status ===
              "approved"
          ) && (
            <button
              type="button"
              onClick={() => {
                startAction(
                  row,
                  "void",
                );
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-rose-400/15 bg-rose-400/5 px-2 py-1.5 text-[10px] font-bold text-rose-300 transition hover:bg-rose-400/10"
            >
              <XCircle className="h-3.5 w-3.5" />
              {c.void}
            </button>
          )}
        </div>
      ),
      [
        c.approve,
        c.markPaid,
        c.view,
        c.void,
        openDetail,
        startAction,
      ],
    );

  const modalTitle =
    modalMode === "create"
      ? c.createTitle
      : modalMode ===
          "approve"
        ? c.approveTitle
        : modalMode ===
            "mark_paid"
          ? c.paidTitle
          : modalMode ===
              "void"
            ? c.voidTitle
            : selected
              ? selected
                  .settlement_number
              : c.title;

  return (
    <div
      className="space-y-5"
      dir={
        rtl
          ? "rtl"
          : "ltr"
      }
    >
      <div className="glass-panel rounded-2xl border border-white/10 p-5">
        <SharedPageHeader native as="div" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-cyan-400" />

              <h2 className="text-xl font-black tracking-tight text-white">
                {c.title}
              </h2>
            </div>

            <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
              {c.subtitle}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <SharedSecondaryButton
              type="button"
              disabled={
                loading ||
                !session.companyId
              }
              onClick={() => {
                void load();
              }}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-bold text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                className={
                  "h-4 w-4 " +
                  (
                    loading
                      ? "animate-spin"
                      : ""
                  )
                }
              />

              {c.refresh}
            </SharedSecondaryButton>

            <SharedSecondaryButton
              type="button"
              disabled={
                saving ||
                !session.companyId
              }
              onClick={() => {
                void openCreate();
              }}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 text-xs font-black text-cyan-300 transition hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {c.create}
            </SharedSecondaryButton>
          </div>
        </SharedPageHeader>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        totalCount={totalCount}
        currentPage={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={
          size => {
            setPageSize(
              size,
            );
            setPage(1);
          }
        }
        title={c.title}
        error={
          error ?? undefined
        }
        emptyMessage={c.empty}
        actions={
          actionButtons
        }
      />

      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div className="glass-panel max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-white/10 shadow-2xl">
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-slate-950/85 px-5 py-4 backdrop-blur-xl">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  {c.title}
                </div>

                <div className="mt-1 text-base font-black text-white">
                  {modalTitle}
                </div>
              </div>

              <SharedSecondaryButton
                type="button"
                disabled={saving}
                onClick={
                  closeModal
                }
                className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                aria-label={
                  c.close
                }
              >
                <X className="h-4 w-4" />
              </SharedSecondaryButton>
            </div>

            <div className="space-y-5 p-5">
              {formError && (
                <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm font-medium text-rose-300">
                  {formError}
                </div>
              )}

              {modalMode ===
                "create" && (
                <form
                  onSubmit={
                    createSettlement
                  }
                  className="space-y-5"
                >
                  <div className="rounded-xl border border-cyan-400/15 bg-cyan-400/5 px-4 py-3 text-xs leading-5 text-cyan-200">
                    {
                      c.financialServerNotice
                    }
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-1.5">
                      <span className="text-xs font-bold text-slate-400">
                        {c.agency}
                      </span>

                      <SharedSelect
                        required
                        disabled={
                          saving ||
                          agencyLoading
                        }
                        value={
                          createForm
                            .agency_id
                        }
                        onChange={
                          event => {
                            setCreateForm(
                              current => ({
                                ...current,
                                agency_id:
                                  event
                                    .target
                                    .value,
                              }),
                            );
                          }
                        }
                        className="h-10 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-slate-200 outline-none focus:border-cyan-400/40"
                      >
                        <option value="">
                          {
                            c.chooseAgency
                          }
                        </option>

                        {agencies.map(
                          agency => (
                            <option
                              key={
                                agency.id
                              }
                              value={
                                agency.id
                              }
                            >
                              {
                                agency.name ||
                                agency.code ||
                                agency.id
                              }
                            </option>
                          ),
                        )}
                      </SharedSelect>
                    </label>

                    <label className="space-y-1.5">
                      <span className="text-xs font-bold text-slate-400">
                        {c.currency}
                      </span>

                      <input
                        type="text"
                        value={
                          createForm
                            .currency ??
                          "AFN"
                        }
                        onChange={
                          event => {
                            setCreateForm(
                              current => ({
                                ...current,
                                currency:
                                  event
                                    .target
                                    .value,
                              }),
                            );
                          }
                        }
                        className="h-10 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-slate-200 outline-none focus:border-cyan-400/40"
                      />
                    </label>

                    <label className="space-y-1.5">
                      <span className="text-xs font-bold text-slate-400">
                        {
                          c.periodStart
                        }
                      </span>

                      <SharedDatePicker
                        required
                        type="date"
                        value={
                          createForm
                            .period_start
                        }
                        onChange={
                          event => {
                            setCreateForm(
                              current => ({
                                ...current,
                                period_start:
                                  event
                                    .target
                                    .value,
                              }),
                            );
                          }
                        }
                        className="h-10 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-slate-200 outline-none focus:border-cyan-400/40"
                      />
                    </label>

                    <label className="space-y-1.5">
                      <span className="text-xs font-bold text-slate-400">
                        {
                          c.periodEnd
                        }
                      </span>

                      <SharedDatePicker
                        required
                        type="date"
                        value={
                          createForm
                            .period_end
                        }
                        onChange={
                          event => {
                            setCreateForm(
                              current => ({
                                ...current,
                                period_end:
                                  event
                                    .target
                                    .value,
                              }),
                            );
                          }
                        }
                        className="h-10 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-slate-200 outline-none focus:border-cyan-400/40"
                      />
                    </label>

                    <label className="space-y-1.5 md:col-span-2">
                      <span className="text-xs font-bold text-slate-400">
                        {
                          c.reference
                        }
                      </span>

                      <input
                        type="text"
                        value={
                          createForm
                            .reference ??
                          ""
                        }
                        onChange={
                          event => {
                            setCreateForm(
                              current => ({
                                ...current,
                                reference:
                                  event
                                    .target
                                    .value,
                              }),
                            );
                          }
                        }
                        className="h-10 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-slate-200 outline-none focus:border-cyan-400/40"
                      />
                    </label>

                    <label className="space-y-1.5 md:col-span-2">
                      <span className="text-xs font-bold text-slate-400">
                        {c.notes}
                      </span>

                      <textarea
                        rows={4}
                        value={
                          createForm
                            .notes ??
                          ""
                        }
                        onChange={
                          event => {
                            setCreateForm(
                              current => ({
                                ...current,
                                notes:
                                  event
                                    .target
                                    .value,
                              }),
                            );
                          }
                        }
                        className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-400/40"
                      />
                    </label>
                  </div>

                  <div className="flex justify-end gap-2">
                    <SharedSecondaryButton
                      type="button"
                      disabled={saving}
                      onClick={
                        closeModal
                      }
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
                    >
                      {c.cancel}
                    </SharedSecondaryButton>

                    <SharedSecondaryButton
                      type="submit"
                      disabled={
                        saving ||
                        agencyLoading
                      }
                      className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-black text-cyan-300 transition hover:bg-cyan-400/15 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" />

                      {
                        saving
                          ? c.saving
                          : c.submit
                      }
                    </SharedSecondaryButton>
                  </div>
                </form>
              )}

              {(
                modalMode ===
                  "approve" ||
                modalMode ===
                  "mark_paid" ||
                modalMode ===
                  "void"
              ) &&
                selected && (
                <form
                  onSubmit={
                    submitAction
                  }
                  className="space-y-5"
                >
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <DetailValue
                      label={c.number}
                      value={
                        selected
                          .settlement_number
                      }
                    />

                    <DetailValue
                      label={c.agency}
                      value={
                        selected
                          .agency_name ||
                        selected
                          .agency
                      }
                    />

                    <DetailValue
                      label={c.status}
                      value={
                        c.statusLabel[
                          selected.status
                        ]
                      }
                    />

                    <DetailValue
                      label={
                        c.balance
                      }
                      value={
                        formatMoney(
                          selected
                            .balance_amount,
                          selected
                            .currency,
                        )
                      }
                    />
                  </div>

                  {modalMode ===
                    "approve" && (
                    <label className="block space-y-1.5">
                      <span className="text-xs font-bold text-slate-400">
                        {c.notes}
                      </span>

                      <textarea
                        rows={4}
                        value={
                          approveNotes
                        }
                        onChange={
                          event => {
                            setApproveNotes(
                              event
                                .target
                                .value,
                            );
                          }
                        }
                        className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-400/40"
                      />
                    </label>
                  )}

                  {modalMode ===
                    "mark_paid" && (
                    <div className="space-y-4">
                      <label className="block space-y-1.5">
                        <span className="text-xs font-bold text-slate-400">
                          {
                            c.reference
                          }
                        </span>

                        <input
                          type="text"
                          value={
                            paidReference
                          }
                          onChange={
                            event => {
                              setPaidReference(
                                event
                                  .target
                                  .value,
                              );
                            }
                          }
                          className="h-10 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-slate-200 outline-none focus:border-cyan-400/40"
                        />
                      </label>

                      <label className="block space-y-1.5">
                        <span className="text-xs font-bold text-slate-400">
                          {c.notes}
                        </span>

                        <textarea
                          rows={4}
                          value={
                            paidNotes
                          }
                          onChange={
                            event => {
                              setPaidNotes(
                                event
                                  .target
                                  .value,
                              );
                            }
                          }
                          className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-400/40"
                        />
                      </label>
                    </div>
                  )}

                  {modalMode ===
                    "void" && (
                    <label className="block space-y-1.5">
                      <span className="text-xs font-bold text-slate-400">
                        {c.reason}
                      </span>

                      <textarea
                        required
                        rows={4}
                        value={
                          voidReason
                        }
                        onChange={
                          event => {
                            setVoidReason(
                              event
                                .target
                                .value,
                            );
                          }
                        }
                        className="w-full rounded-xl border border-rose-400/20 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 outline-none focus:border-rose-400/40"
                      />
                    </label>
                  )}

                  <div className="flex justify-end gap-2">
                    <SharedSecondaryButton
                      type="button"
                      disabled={saving}
                      onClick={
                        closeModal
                      }
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
                    >
                      {c.cancel}
                    </SharedSecondaryButton>

                    <SharedSecondaryButton
                      type="submit"
                      disabled={saving}
                      className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-black text-cyan-300 transition hover:bg-cyan-400/15 disabled:opacity-50"
                    >
                      {
                        saving
                          ? c.saving
                          : modalMode ===
                              "approve"
                            ? c.approve
                            : modalMode ===
                                "mark_paid"
                              ? c.markPaid
                              : c.void
                      }
                    </SharedSecondaryButton>
                  </div>
                </form>
              )}

              {modalMode ===
                "view" &&
                selected && (
                <div className="space-y-5">
                  {detailLoading && (
                    <div className="rounded-xl border border-cyan-400/15 bg-cyan-400/5 px-4 py-3 text-sm text-cyan-300">
                      {
                        c.loadingDetails
                      }
                    </div>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <DetailValue
                      label={c.agency}
                      value={
                        selected
                          .agency_name ||
                        selected
                          .agency ||
                        "—"
                      }
                    />

                    <DetailValue
                      label={c.period}
                      value={
                        periodLabel(
                          selected,
                        )
                      }
                    />

                    <DetailValue
                      label={c.status}
                      value={
                        <span
                          className={
                            "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold " +
                            statusClass(
                              selected.status,
                            )
                          }
                        >
                          {
                            c.statusLabel[
                              selected
                                .status
                            ]
                          }
                        </span>
                      }
                    />

                    <DetailValue
                      label={c.currency}
                      value={
                        selected
                          .currency
                      }
                    />

                    <DetailValue
                      label={
                        c.grossShare
                      }
                      value={
                        formatMoney(
                          selected
                            .gross_share_amount,
                          selected
                            .currency,
                        )
                      }
                    />

                    <DetailValue
                      label={c.tax}
                      value={
                        formatMoney(
                          selected
                            .tax_amount,
                          selected
                            .currency,
                        )
                      }
                    />

                    <DetailValue
                      label={
                        c.netPayable
                      }
                      value={
                        formatMoney(
                          selected
                            .net_payable_amount,
                          selected
                            .currency,
                        )
                      }
                    />

                    <DetailValue
                      label={c.paid}
                      value={
                        formatMoney(
                          selected
                            .paid_amount,
                          selected
                            .currency,
                        )
                      }
                    />

                    <DetailValue
                      label={
                        c.balance
                      }
                      value={
                        formatMoney(
                          selected
                            .balance_amount,
                          selected
                            .currency,
                        )
                      }
                    />

                    <DetailValue
                      label={
                        c.reference
                      }
                      value={
                        selected
                          .reference ||
                        "—"
                      }
                    />

                    <DetailValue
                      label={
                        c.approvedAt
                      }
                      value={
                        formatDateTime(
                          selected
                            .approved_at,
                        )
                      }
                    />

                    <DetailValue
                      label={c.paidAt}
                      value={
                        formatDateTime(
                          selected
                            .paid_at,
                        )
                      }
                    />

                    <DetailValue
                      label={
                        c.createdAt
                      }
                      value={
                        formatDateTime(
                          selected
                            .created_at,
                        )
                      }
                    />

                    <DetailValue
                      label={
                        c.updatedAt
                      }
                      value={
                        formatDateTime(
                          selected
                            .updated_at,
                        )
                      }
                    />
                  </div>

                  <DetailValue
                    label={c.notes}
                    value={
                      selected
                        .notes ||
                      "—"
                    }
                  />

                  <div className="rounded-2xl border border-white/10 bg-white/[0.02]">
                    <div className="border-b border-white/10 px-4 py-3">
                      <h3 className="text-sm font-black text-white">
                        {c.lines}
                      </h3>
                    </div>

                    {!selected.lines ||
                    selected.lines
                      .length ===
                      0 ? (
                      <div className="px-4 py-8 text-center text-sm text-slate-500">
                        —
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <SharedDataTable native className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-slate-500">
                              <th className="px-4 py-3 text-start">
                                {
                                  c.revenueNumber
                                }
                              </th>

                              <th className="px-4 py-3 text-start">
                                {
                                  c.recognitionDate
                                }
                              </th>

                              <th className="px-4 py-3 text-start">
                                {
                                  c.grossShare
                                }
                              </th>

                              <th className="px-4 py-3 text-start">
                                {c.tax}
                              </th>

                              <th className="px-4 py-3 text-start">
                                {
                                  c.netPayable
                                }
                              </th>

                              <th className="px-4 py-3 text-start">
                                {c.active}
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            {
                              selected
                                .lines
                                .map(
                                  line => (
                                    <tr
                                      key={
                                        line.id
                                      }
                                      className="border-b border-white/5 text-slate-300 last:border-0"
                                    >
                                      <td className="px-4 py-3 font-mono text-xs">
                                        {
                                          line
                                            .revenue_number ||
                                          line
                                            .revenue_transaction
                                        }
                                      </td>

                                      <td className="px-4 py-3">
                                        {
                                          line
                                            .recognition_date ||
                                          "—"
                                        }
                                      </td>

                                      <td className="px-4 py-3">
                                        {
                                          formatMoney(
                                            line
                                              .gross_share_amount,
                                            line
                                              .currency,
                                          )
                                        }
                                      </td>

                                      <td className="px-4 py-3">
                                        {
                                          formatMoney(
                                            line
                                              .tax_amount,
                                            line
                                              .currency,
                                          )
                                        }
                                      </td>

                                      <td className="px-4 py-3">
                                        {
                                          formatMoney(
                                            line
                                              .net_amount,
                                            line
                                              .currency,
                                          )
                                        }
                                      </td>

                                      <td className="px-4 py-3">
                                        {
                                          line
                                            .is_active
                                            ? c.yes
                                            : c.no
                                        }
                                      </td>
                                    </tr>
                                  ),
                                )
                            }
                          </tbody>
                        </SharedDataTable>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap justify-end gap-2">
                    {selected.status ===
                      "draft" && (
                      <SharedSecondaryButton
                        type="button"
                        disabled={saving}
                        onClick={() => {
                          startAction(
                            selected,
                            "approve",
                          );
                        }}
                        className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-black text-emerald-300"
                      >
                        {c.approve}
                      </SharedSecondaryButton>
                    )}

                    {selected.status ===
                      "approved" && (
                      <SharedSecondaryButton
                        type="button"
                        disabled={saving}
                        onClick={() => {
                          startAction(
                            selected,
                            "mark_paid",
                          );
                        }}
                        className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-black text-emerald-300"
                      >
                        {c.markPaid}
                      </SharedSecondaryButton>
                    )}

                    {(
                      selected.status ===
                        "draft" ||
                      selected.status ===
                        "approved"
                    ) && (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => {
                          startAction(
                            selected,
                            "void",
                          );
                        }}
                        className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-2 text-xs font-black text-rose-300"
                      >
                        {c.void}
                      </button>
                    )}

                    {(
                      selected.status ===
                        "paid" ||
                      selected.status ===
                        "void"
                    ) && (
                      <div className="me-auto self-center text-xs text-slate-500">
                        {c.noActions}
                      </div>
                    )}

                    <SharedSecondaryButton
                      type="button"
                      disabled={saving}
                      onClick={
                        closeModal
                      }
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300"
                    >
                      {c.close}
                    </SharedSecondaryButton>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// HQNATEX-AGENCY-SETTLEMENT-READONLY-V1
// HQNATEX-AGENCY-SETTLEMENT-MUTATION-V1
