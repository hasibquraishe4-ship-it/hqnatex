import { PageHeader as SharedPageHeader } from "../../components/PageHeader";
import { PrimaryButton as SharedPrimaryButton, SecondaryButton as SharedSecondaryButton, Select as SharedSelect, DatePicker as SharedDatePicker, FormField as Field, DetailField as Detail } from "../../components/Interface";
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
  PieChart,
  Plus,
  X,
} from "lucide-react";

import {
  DataTable,
  StatusBadge,
  type Column,
} from "../../components/DataTable";

import {
  fetchers,
  shareRuleApi,
  type Session,
  type ShareRulePayload,
} from "../../lib/api";

type Props = {
  session: Session;
};

type ShareRule = {
  id: string;
  tenant: string;
  company: string;

  agency: string | null;
  agency_name: string | null;

  service: string;
  service_name: string;

  code: string;

  status:
    | "active"
    | "inactive";

  effective_from: string;
  effective_to: string | null;

  partner_share_percent: string;
  company_base_share_percent: string;
  agency_gross_share_percent: string;

  agency_tax_enabled: boolean;
  agency_tax_percent: string;

  source_note: string;

  created_at: string;
  updated_at: string;
};

type AgencyOption = {
  id: string;
  code: string;
  name: string;
  status?: string;
};

type ServiceOption = {
  id: string;
  code: string;
  name_english: string;
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

const EMPTY_FORM: ShareRulePayload = {
  agency: null,
  service: "",
  code: "",
  status: "active",
  effective_from: "",
  effective_to: null,
  partner_share_percent: "0.0000",
  company_base_share_percent: "100.0000",
  agency_gross_share_percent: "0.0000",
  agency_tax_enabled: false,
  agency_tax_percent: "0.0000",
  source_note: "",
};

export function ShareRuleList({
  session,
}: Props) {
  const [data, setData] =
    useState<ShareRule[]>([]);

  const [agencies, setAgencies] =
    useState<AgencyOption[]>([]);

  const [services, setServices] =
    useState<ServiceOption[]>([]);

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
    useState<ShareRule | null>(null);

  const [form, setForm] =
    useState<ShareRulePayload>({
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
        ruleRes,
        agencyRes,
        serviceRes,
      ] = await Promise.all([
        fetchers.shareRules(
          session,
          params,
        ),

        fetchers.agencies(
          session,
          "?page_size=100&ordering=name",
        ),

        fetchers.allServices(
          session,
          "?status=active&ordering=name_english",
        ),
      ]);

      setData(ruleRes.results);
      setTotalCount(ruleRes.count);

      setAgencies(
        agencyRes.results,
      );

      setServices(
        serviceRes.results,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load share rules.",
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

  const activeAgencies =
    useMemo(
      () =>
        agencies.filter(
          (agency) =>
            agency.status !==
              "inactive" &&
            agency.status !==
              "suspended",
        ),
      [agencies],
    );

  const activeServices =
    useMemo(
      () =>
        services.filter(
          (service) =>
            service.status !==
            "inactive",
        ),
      [services],
    );

  const splitTotal =
    useMemo(
      () =>
        Number(
          form.partner_share_percent ||
            0,
        ) +
        Number(
          form.company_base_share_percent ||
            0,
        ) +
        Number(
          form.agency_gross_share_percent ||
            0,
        ),
      [
        form.partner_share_percent,
        form.company_base_share_percent,
        form.agency_gross_share_percent,
      ],
    );

  const updateField = <
    K extends keyof ShareRulePayload
  >(
    key: K,
    value: ShareRulePayload[K],
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
    row: ShareRule,
  ) => {
    try {
      setSaving(true);
      setNotice(null);

      const fresh =
        await shareRuleApi.retrieve(
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
            : "Unable to load rule.",
      });
    } finally {
      setSaving(false);
    }
  };

  const openEdit = async (
    row: ShareRule,
  ) => {
    try {
      setSaving(true);
      setNotice(null);

      const fresh:
        ShareRule =
        await shareRuleApi.retrieve(
          session,
          row.id,
        );

      setSelected(fresh);

      setForm({
        agency:
          fresh.agency || null,

        service:
          fresh.service,

        code:
          fresh.code,

        status:
          fresh.status,

        effective_from:
          fresh.effective_from,

        effective_to:
          fresh.effective_to,

        partner_share_percent:
          fresh.partner_share_percent,

        company_base_share_percent:
          fresh.company_base_share_percent,

        agency_gross_share_percent:
          fresh.agency_gross_share_percent,

        agency_tax_enabled:
          fresh.agency_tax_enabled,

        agency_tax_percent:
          fresh.agency_tax_percent,

        source_note:
          fresh.source_note || "",
      });

      setModalMode("edit");
    } catch (err) {
      setNotice({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Unable to load rule.",
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

  const submitRule = async (
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

    if (!form.code.trim()) {
      setNotice({
        type: "error",
        message:
          "Rule code is required.",
      });
      return;
    }

    if (!form.service) {
      setNotice({
        type: "error",
        message:
          "Service is required.",
      });
      return;
    }

    if (!form.effective_from) {
      setNotice({
        type: "error",
        message:
          "Effective From is required.",
      });
      return;
    }

    if (
      form.effective_to &&
      form.effective_to <
        form.effective_from
    ) {
      setNotice({
        type: "error",
        message:
          "Effective To cannot be before Effective From.",
      });
      return;
    }

    const shares = [
      Number(
        form.partner_share_percent,
      ),
      Number(
        form.company_base_share_percent,
      ),
      Number(
        form.agency_gross_share_percent,
      ),
    ];

    if (
      shares.some(
        (value) =>
          Number.isNaN(value) ||
          value < 0 ||
          value > 100,
      )
    ) {
      setNotice({
        type: "error",
        message:
          "All share percentages must be between 0 and 100.",
      });
      return;
    }

    if (
      Math.abs(
        splitTotal - 100,
      ) > 0.00001
    ) {
      setNotice({
        type: "error",
        message:
          `Partner + Company Base + Agency Gross must equal 100%. Current total: ${splitTotal.toFixed(4)}%.`,
      });
      return;
    }

    const tax =
      Number(
        form.agency_tax_percent,
      );

    if (
      Number.isNaN(tax) ||
      tax < 0 ||
      tax > 100
    ) {
      setNotice({
        type: "error",
        message:
          "Agency tax must be between 0 and 100.",
      });
      return;
    }

    const payload:
      ShareRulePayload = {
      ...form,

      agency:
        form.agency || null,

      code:
        form.code.trim(),

      effective_to:
        form.effective_to ||
        null,

      agency_tax_percent:
        form.agency_tax_enabled
          ? form.agency_tax_percent
          : "0.0000",

      source_note:
        form.source_note.trim(),
    };

    try {
      setSaving(true);
      setNotice(null);

      let result:
        ShareRule;

      if (
        modalMode === "create"
      ) {
        result =
          await shareRuleApi.create(
            session,
            payload,
          );
      } else if (
        modalMode === "edit" &&
        selected
      ) {
        result =
          await shareRuleApi.update(
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
            ? "Share rule created successfully."
            : "Share rule updated successfully.",
      });
    } catch (err) {
      setNotice({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Share rule operation failed.",
      });
    } finally {
      setSaving(false);
    }
  };

  const columns:
    Column<ShareRule>[] = [
    {
      header: "Code",
      accessor: "code",
      sortable: true,
      className:
        "font-mono font-bold text-cyan-400",
    },

    {
      header: "Service",
      accessor:
        "service_name",
      sortable: true,
      sortKey:
        "service__name_english",
    },

    {
      header: "Agency",
      accessor: (row) =>
        row.agency_name ||
        "Central / No Agency",
    },

    {
      header: "Partner %",
      accessor: (row) =>
        `${row.partner_share_percent}%`,
      className:
        "font-mono text-end",
    },

    {
      header: "Company %",
      accessor: (row) =>
        `${row.company_base_share_percent}%`,
      className:
        "font-mono text-end",
    },

    {
      header: "Agency Gross %",
      accessor: (row) =>
        `${row.agency_gross_share_percent}%`,
      className:
        "font-mono text-end",
    },

    {
      header: "Agency Tax",
      accessor: (row) =>
        row.agency_tax_enabled
          ? `${row.agency_tax_percent}%`
          : "Disabled",
      className:
        "font-mono text-end",
    },

    {
      header: "Effective",
      accessor: (row) =>
        `${row.effective_from} → ${
          row.effective_to ||
          "Open"
        }`,
      sortKey:
        "effective_from",
      sortable: true,
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
              <PieChart className="h-5 w-5 text-cyan-300" />
            </div>

            <div>
              <h2 className="text-xl font-black text-white">
                Revenue Share Rules
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Effective-dated company, partner and agency revenue distribution
              </p>
            </div>
          </div>

          <SharedPrimaryButton
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950"
          >
            <Plus className="h-4 w-4" />
            Create Rule
          </SharedPrimaryButton>
        </SharedPageHeader>

        <div className="rounded-xl border border-amber-400/10 bg-amber-400/5 px-4 py-3 text-xs text-amber-200">
          Partner + Company Base + Agency Gross must equal 100%. Agency Tax is deducted after Agency Gross and is outside the 100% split.
        </div>

        <DataTable
          columns={columns}
          data={data}
          loading={loading}
          totalCount={totalCount}
          currentPage={page}
          pageSize={pageSize}
          onPageChange={setPage}
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

          <div className="hq-visual-panel hq-visual-dialog max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-[28px] border border-white/10 bg-slate-950 p-6 shadow-2xl">

            <div className="mb-6 flex items-center justify-between">

              <div>
                <h3 className="text-lg font-black text-white">
                  {modalMode ===
                  "create"
                    ? "Create Share Rule"
                    : modalMode ===
                        "edit"
                      ? "Edit Share Rule"
                      : "Share Rule Details"}
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Company is taken from the active company context.
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

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

                  <Detail
                    label="Code"
                    value={
                      selected.code
                    }
                  />

                  <Detail
                    label="Service"
                    value={
                      selected.service_name
                    }
                  />

                  <Detail
                    label="Agency"
                    value={
                      selected.agency_name ||
                      "Central / No Agency"
                    }
                  />

                  <Detail
                    label="Status"
                    value={
                      selected.status
                    }
                  />

                  <Detail
                    label="Partner Share"
                    value={`${selected.partner_share_percent}%`}
                  />

                  <Detail
                    label="Company Base"
                    value={`${selected.company_base_share_percent}%`}
                  />

                  <Detail
                    label="Agency Gross"
                    value={`${selected.agency_gross_share_percent}%`}
                  />

                  <Detail
                    label="Agency Tax"
                    value={
                      selected.agency_tax_enabled
                        ? `${selected.agency_tax_percent}%`
                        : "Disabled"
                    }
                  />

                  <Detail
                    label="Effective From"
                    value={
                      selected.effective_from
                    }
                  />

                  <Detail
                    label="Effective To"
                    value={
                      selected.effective_to ||
                      "Open"
                    }
                  />
                </div>

                <Detail
                  label="Source Note"
                  value={
                    selected.source_note ||
                    "—"
                  }
                />

                <div className="rounded-xl border border-amber-400/10 bg-amber-400/5 px-4 py-3 text-xs text-amber-200">
                  If this rule has already been used by a financial transaction, protected financial fields are immutable. Create a new effective-dated rule instead.
                </div>

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
                    Edit Rule
                  </SharedSecondaryButton>
                </div>
              </div>
            ) : (
              <form
                onSubmit={
                  submitRule
                }
                className="space-y-5"
              >

                <div className="grid gap-4 md:grid-cols-2">

                  <Field
                    label="Rule Code"
                    required
                  >
                    <input
                      maxLength={120}
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
                      className="hq-input rule-input"
                    />
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
                          e.target.value as
                            | "active"
                            | "inactive",
                        )
                      }
                      className="rule-input"
                    >
                      <option value="active">
                        Active
                      </option>

                      <option value="inactive">
                        Inactive
                      </option>
                    </SharedSelect>
                  </Field>

                  <Field
                    label="Service"
                    required
                  >
                    <SharedSelect
                      value={
                        form.service
                      }
                      onChange={(
                        e,
                      ) =>
                        updateField(
                          "service",
                          e.target.value,
                        )
                      }
                      className="rule-input"
                    >
                      <option value="">
                        Select Service
                      </option>

                      {activeServices.map(
                        (service) => (
                          <option
                            key={
                              service.id
                            }
                            value={
                              service.id
                            }
                          >
                            {service.code} — {service.name_english}
                          </option>
                        ),
                      )}
                    </SharedSelect>
                  </Field>

                  <Field label="Agency">
                    <SharedSelect
                      value={
                        form.agency ||
                        ""
                      }
                      onChange={(
                        e,
                      ) =>
                        updateField(
                          "agency",
                          e.target.value ||
                            null,
                        )
                      }
                      className="rule-input"
                    >
                      <option value="">
                        Central / No Agency
                      </option>

                      {activeAgencies.map(
                        (agency) => (
                          <option
                            key={
                              agency.id
                            }
                            value={
                              agency.id
                            }
                          >
                            {agency.code} — {agency.name}
                          </option>
                        ),
                      )}
                    </SharedSelect>
                  </Field>

                  <Field
                    label="Effective From"
                    required
                  >
                    <SharedDatePicker
                      type="date"
                      value={
                        form.effective_from
                      }
                      onChange={(
                        e,
                      ) =>
                        updateField(
                          "effective_from",
                          e.target.value,
                        )
                      }
                      className="rule-input"
                    />
                  </Field>

                  <Field label="Effective To">
                    <SharedDatePicker
                      type="date"
                      value={
                        form.effective_to ||
                        ""
                      }
                      onChange={(
                        e,
                      ) =>
                        updateField(
                          "effective_to",
                          e.target.value ||
                            null,
                        )
                      }
                      className="rule-input"
                    />
                  </Field>

                  <PercentField
                    label="Partner Share %"
                    value={
                      form.partner_share_percent
                    }
                    onChange={(
                      value,
                    ) =>
                      updateField(
                        "partner_share_percent",
                        value,
                      )
                    }
                  />

                  <PercentField
                    label="Company Base %"
                    value={
                      form.company_base_share_percent
                    }
                    onChange={(
                      value,
                    ) =>
                      updateField(
                        "company_base_share_percent",
                        value,
                      )
                    }
                  />

                  <PercentField
                    label="Agency Gross %"
                    value={
                      form.agency_gross_share_percent
                    }
                    onChange={(
                      value,
                    ) =>
                      updateField(
                        "agency_gross_share_percent",
                        value,
                      )
                    }
                  />

                  <div className="hq-visual-panel rounded-2xl border border-white/10 bg-white/[0.03] p-4">

                    <p className="text-xs font-bold text-slate-400">
                      Split Total
                    </p>

                    <p
                      className={`mt-2 font-mono text-2xl font-black ${
                        Math.abs(
                          splitTotal -
                            100,
                        ) <
                        0.00001
                          ? "text-emerald-300"
                          : "text-rose-300"
                      }`}
                    >
                      {splitTotal.toFixed(
                        4,
                      )}
                      %
                    </p>
                  </div>
                </div>

                <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">

                  <input
                    type="checkbox"
                    checked={
                      form.agency_tax_enabled
                    }
                    onChange={(
                      e,
                    ) =>
                      updateField(
                        "agency_tax_enabled",
                        e.target.checked,
                      )
                    }
                  />

                  <div>
                    <p className="text-sm font-bold text-white">
                      Agency Tax Enabled
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Tax is deducted after Agency Gross.
                    </p>
                  </div>
                </label>

                {form.agency_tax_enabled && (
                  <PercentField
                    label="Agency Tax %"
                    value={
                      form.agency_tax_percent
                    }
                    onChange={(
                      value,
                    ) =>
                      updateField(
                        "agency_tax_percent",
                        value,
                      )
                    }
                  />
                )}

                <Field label="Source Note">
                  <textarea
                    rows={4}
                    maxLength={255}
                    value={
                      form.source_note
                    }
                    onChange={(
                      e,
                    ) =>
                      updateField(
                        "source_note",
                        e.target.value,
                      )
                    }
                    className="hq-input rule-input resize-y"
                  />
                </Field>

                {modalMode ===
                  "edit" && (
                  <div className="rounded-xl border border-amber-400/10 bg-amber-400/5 px-4 py-3 text-xs text-amber-200">
                    Used financial rules cannot have their company, agency, service, dates, split percentages or agency tax settings changed. Backend enforcement remains authoritative.
                  </div>
                )}

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
                      saving ||
                      Math.abs(
                        splitTotal -
                          100,
                      ) > 0.00001
                    }
                    className="flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2 text-sm font-black text-slate-950 disabled:opacity-40"
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
                          ? "Create Rule"
                          : "Save Changes"}
                      </>
                    )}
                  </SharedPrimaryButton>
                </div>
              </form>
            )}

            <style>{`
              .rule-input {
                width: 100%;
                border-radius: .9rem;
                border: 1px solid rgba(255,255,255,.10);
                background: rgba(255,255,255,.045);
                padding: .72rem .85rem;
                color: rgb(241 245 249);
                outline: none;
              }

              .rule-input:focus {
                border-color: rgba(34,211,238,.45);
                box-shadow: 0 0 0 3px rgba(34,211,238,.07);
              }

              .rule-input option {
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



function PercentField({
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
    <Field
      label={label}
      required
    >
      <input
        type="number"
        min="0"
        max="100"
        step="0.0001"
        value={value}
        onChange={(e) =>
          onChange(
            e.target.value,
          )
        }
        className="hq-input rule-input"
      />
    </Field>
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
