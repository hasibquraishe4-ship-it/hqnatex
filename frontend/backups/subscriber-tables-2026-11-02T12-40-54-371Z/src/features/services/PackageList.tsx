import { PageHeader as SharedPageHeader } from "../../components/PageHeader";
import { PrimaryButton as SharedPrimaryButton, SecondaryButton as SharedSecondaryButton, Select as SharedSelect, DatePicker as SharedDatePicker, FormField as Field, DetailField as Detail } from "../../components/Interface";
import { DataTable as SharedDataTable } from "../../components/DataTable";
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import {
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Eye,
  Loader2,
  Package,
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
  fetchers,
  packageApi,
  packagePriceApi,
  type PackagePayload,
  type PackagePricePayload,
  type Session,
} from "../../lib/api";

import { useTranslation } from "../../lib/i18n";

type Props = {
  session: Session;
};

type CurrentPrice = {
  amount: string;
  currency: string;
  effective_from: string;
  effective_to: string | null;
};

type PackageRow = {
  id: string;
  tenant: string;
  service: string;
  service_name: string;
  code: string;
  name_english: string;
  name_dari: string;
  name_pashto: string;
  package_type:
    | "unlimited"
    | "limited"
    | "contract"
    | "voucher"
    | "fee"
    | "rental";
  speed_mbps: string | null;
  quota_gb: string | null;
  period_months: number;
  status: "active" | "inactive";
  metadata: Record<string, unknown>;
  current_price: CurrentPrice | null;
  created_at: string;
  updated_at: string;
};

type PackagePrice = {
  id: string;
  tenant: string;
  package: string;
  amount: string;
  currency: string;
  effective_from: string;
  effective_to: string | null;
  status: string;
  source_note: string;
  created_at: string;
};

type ServiceOption = {
  id: string;
  code: string;
  name_english: string;
};

type ModalMode =
  | "create"
  | "view"
  | "edit";

type PriceModalMode =
  | "list"
  | "create"
  | "edit";

type Notice = {
  type: "success" | "error";
  message: string;
};

type PackageForm = {
  service: string;
  code: string;
  name_english: string;
  name_dari: string;
  name_pashto: string;
  package_type: PackageRow["package_type"];
  speed_mbps: string;
  quota_gb: string;
  period_months: string;
  status: "active" | "inactive";
  metadata: string;
};

const EMPTY_FORM: PackageForm = {
  service: "",
  code: "",
  name_english: "",
  name_dari: "",
  name_pashto: "",
  package_type: "unlimited",
  speed_mbps: "",
  quota_gb: "",
  period_months: "1",
  status: "active",
  metadata: "{}",
};

const EMPTY_PRICE: PackagePricePayload = {
  package: "",
  amount: "",
  currency: "AFN",
  effective_from: "",
  effective_to: null,
  status: "active",
  source_note: "",
};

export function PackageList({
  session,
}: Props) {
  const { t } = useTranslation();

  const [data, setData] =
    useState<PackageRow[]>([]);

  const [services, setServices] =
    useState<ServiceOption[]>([]);

  const [prices, setPrices] =
    useState<PackagePrice[]>([]);

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
    useState<PackageRow | null>(null);

  const [form, setForm] =
    useState<PackageForm>({
      ...EMPTY_FORM,
    });

  const [priceModalMode, setPriceModalMode] =
    useState<PriceModalMode | null>(null);

  const [selectedPrice, setSelectedPrice] =
    useState<PackagePrice | null>(null);

  const [priceForm, setPriceForm] =
    useState<PackagePricePayload>({
      ...EMPTY_PRICE,
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
          `&search=${encodeURIComponent(searchTerm)}`;
      }

      if (sort) {
        params +=
          `&ordering=${
            sort.direction === "desc"
              ? "-"
              : ""
          }${sort.key}`;
      }

      const [packageRes, serviceRes] =
        await Promise.all([
          fetchers.packages(
            session,
            params,
          ),
          fetchers.allServices(
            session,
            "?status=active&ordering=name_english",
          ),
        ]);

      setData(packageRes.results);
      setTotalCount(packageRes.count);
      setServices(serviceRes.results);
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

  const updateField = <
    K extends keyof PackageForm
  >(
    key: K,
    value: PackageForm[K],
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const openCreate = () => {
    setSelected(null);
    setNotice(null);
    setForm({ ...EMPTY_FORM });
    setModalMode("create");
  };

  const openView = (
    row: PackageRow,
  ) => {
    setSelected(row);
    setNotice(null);
    setModalMode("view");
  };

  const openEdit = (
    row: PackageRow,
  ) => {
    setSelected(row);
    setNotice(null);

    setForm({
      service: row.service,
      code: row.code,
      name_english:
        row.name_english || "",
      name_dari:
        row.name_dari || "",
      name_pashto:
        row.name_pashto || "",
      package_type:
        row.package_type,
      speed_mbps:
        row.speed_mbps ?? "",
      quota_gb:
        row.quota_gb ?? "",
      period_months:
        String(
          row.period_months ?? 1,
        ),
      status: row.status,
      metadata:
        JSON.stringify(
          row.metadata || {},
          null,
          2,
        ),
    });

    setModalMode("edit");
  };

  const closeModal = () => {
    if (saving) return;

    setModalMode(null);
    setSelected(null);
    setForm({ ...EMPTY_FORM });
  };

  const submitPackage = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (
      !form.service ||
      !form.code.trim() ||
      !form.name_english.trim()
    ) {
      setNotice({
        type: "error",
        message:
          t.customersServicesUi.packageServiceCodeEnglishNameRequired,
      });
      return;
    }

    const period =
      Number(form.period_months);

    if (
      !Number.isInteger(period) ||
      period < 1
    ) {
      setNotice({
        type: "error",
        message:
          t.customersServicesUi.periodMonthsAtLeastOne,
      });
      return;
    }

    let metadata:
      Record<string, unknown>;

    try {
      const parsed =
        JSON.parse(
          form.metadata.trim() ||
            "{}",
        );

      if (
        typeof parsed !==
          "object" ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        throw new Error();
      }

      metadata = parsed;
    } catch {
      setNotice({
        type: "error",
        message:
          t.customersServicesUi.metadataInvalid,
      });
      return;
    }

    const payload:
      PackagePayload = {
      service: form.service,
      code: form.code.trim(),
      name_english:
        form.name_english.trim(),
      name_dari:
        form.name_dari.trim(),
      name_pashto:
        form.name_pashto.trim(),
      package_type:
        form.package_type,
      speed_mbps:
        form.speed_mbps.trim() ||
        null,
      quota_gb:
        form.quota_gb.trim() ||
        null,
      period_months: period,
      status: form.status,
      metadata,
    };

    try {
      setSaving(true);
      setNotice(null);

      if (
        modalMode === "create"
      ) {
        await packageApi.create(
          session,
          payload,
        );
      } else if (
        modalMode === "edit" &&
        selected
      ) {
        await packageApi.update(
          session,
          selected.id,
          payload,
        );
      }

      await load();

      setModalMode(null);
      setSelected(null);
      setForm({ ...EMPTY_FORM });

      setNotice({
        type: "success",
        message:
          modalMode === "create"
            ? t.customersServicesUi.packageCreatedSuccessfully
            : t.customersServicesUi.packageUpdatedSuccessfully,
      });
    } catch (err) {
      setNotice({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : t.customersServicesUi.packageOperationFailed,
      });
    } finally {
      setSaving(false);
    }
  };

  const openPrices =
    async (pkg: PackageRow) => {
      try {
        setSaving(true);
        setSelected(pkg);
        setNotice(null);

        const res =
          await fetchers.packagePrices(
            session,
            "?page_size=100",
          );

        setPrices(
          res.results.filter(
            (item: PackagePrice) =>
              item.package === pkg.id,
          ),
        );

        setPriceModalMode("list");
      } catch (err) {
        setNotice({
          type: "error",
          message:
            err instanceof Error
              ? err.message
              : "Unable to load prices.",
        });
      } finally {
        setSaving(false);
      }
    };

  const openCreatePrice = () => {
    if (!selected) return;

    setSelectedPrice(null);

    setPriceForm({
      ...EMPTY_PRICE,
      package: selected.id,
    });

    setPriceModalMode("create");
  };

  const openEditPrice = (
    price: PackagePrice,
  ) => {
    setSelectedPrice(price);

    setPriceForm({
      package: price.package,
      amount: price.amount,
      currency:
        price.currency || "AFN",
      effective_from:
        price.effective_from,
      effective_to:
        price.effective_to,
      status:
        price.status || "active",
      source_note:
        price.source_note || "",
    });

    setPriceModalMode("edit");
  };

  const submitPrice = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const amount =
      Number(priceForm.amount);

    if (
      !priceForm.package ||
      !priceForm.amount ||
      !priceForm.effective_from
    ) {
      setNotice({
        type: "error",
        message:
          t.customersServicesUi.packagePriceRequired,
      });
      return;
    }

    if (
      Number.isNaN(amount) ||
      amount < 0
    ) {
      setNotice({
        type: "error",
        message:
          t.customersServicesUi.priceAmountNonNegative,
      });
      return;
    }

    if (
      priceForm.effective_to &&
      priceForm.effective_to <
        priceForm.effective_from
    ) {
      setNotice({
        type: "error",
        message:
          t.customersServicesUi.effectiveToCannotBeBeforeFrom,
      });
      return;
    }

    try {
      setSaving(true);
      setNotice(null);

      if (
        priceModalMode === "create"
      ) {
        await packagePriceApi.create(
          session,
          priceForm,
        );
      } else if (
        priceModalMode === "edit" &&
        selectedPrice
      ) {
        await packagePriceApi.update(
          session,
          selectedPrice.id,
          priceForm,
        );
      }

      if (selected) {
        const res =
          await fetchers.packagePrices(
            session,
            "?page_size=100",
          );

        setPrices(
          res.results.filter(
            (item: PackagePrice) =>
              item.package ===
              selected.id,
          ),
        );
      }

      await load();

      setPriceModalMode("list");
      setSelectedPrice(null);

      setNotice({
        type: "success",
        message:
          t.customersServicesUi.packagePriceSavedSuccessfully,
      });
    } catch (err) {
      setNotice({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : t.customersServicesUi.packagePriceOperationFailed,
      });
    } finally {
      setSaving(false);
    }
  };

  const columns:
    Column<PackageRow>[] = [
    {
      header: t.packages.code,
      accessor: "code",
      className:
        "font-mono font-bold text-cyan-400",
      sortable: true,
    },
    {
      header: t.packages.package,
      accessor: "name_english",
      className:
        "font-bold text-white",
      sortable: true,
    },
    {
      header: t.packages.service,
      accessor: (row) =>
        row.service_name || "—",
    },
    {
      header: t.customersServicesUi.type,
      accessor: "package_type",
    },
    {
      header: t.packages.speed,
      accessor: (row) =>
        row.speed_mbps
          ? `${row.speed_mbps} Mbps`
          : "—",
    },
    {
      header: t.packages.quota,
      accessor: (row) =>
        row.quota_gb
          ? `${row.quota_gb} GB`
          : row.package_type ===
              "unlimited"
            ? t.packages.unlimited
            : "—",
    },
    {
      header:
        t.packages.currentPrice,
      accessor: (row) =>
        row.current_price
          ? `${row.current_price.amount} ${row.current_price.currency}`
          : "—",
      className:
        "font-mono text-end",
    },
    {
      header: t.services.status,
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
              : "default"
          }
        />
      ),
      sortable: true,
    },
  ];

  return (
    <>
      <div className="hq-subscriber-page space-y-6">
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
              {t.packages.title}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {t.packages.subtitle}
            </p>
          </div>

          <SharedPrimaryButton
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950"
          >
            <Plus className="h-4 w-4" />
            {t.customersServicesUi.newPackage}
          </SharedPrimaryButton>
        </SharedPageHeader>

        <DataTable
          columns={columns}
          data={data}
          loading={loading}
          totalCount={totalCount}
          currentPage={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onSearch={setSearchTerm}
          onSort={(key, direction) =>
            setSort({ key, direction })
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
                className="rounded-lg border border-white/5 bg-white/5 p-2 text-cyan-400"
              >
                <Pencil className="h-4 w-4" />
              </SharedSecondaryButton>

              <SharedSecondaryButton
                type="button"
                onClick={() =>
                  openPrices(row)
                }
                className="rounded-lg border border-emerald-400/10 bg-emerald-400/5 p-2 text-emerald-400"
                title={t.customersServicesUi.managePrices}
              >
                <DollarSign className="h-4 w-4" />
              </SharedSecondaryButton>
            </div>
          )}
        />
      </div>

      {modalMode && (
        <div className="hq-visual-overlay hq-subscriber-modal-layer fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
          <div className="hq-visual-panel hq-visual-dialog hq-subscriber-dialog max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-[28px] border border-white/10 bg-slate-950 p-6">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-black text-white">
                {modalMode === "create"
                  ? t.customersServicesUi.newPackage
                  : modalMode === "edit"
                    ? t.customersServicesUi.editPackage
                    : t.customersServicesUi.packageDetails}
              </h3>

              <SharedSecondaryButton
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-xl border border-white/10 p-2 text-slate-400"
              >
                <X className="h-5 w-5" />
              </SharedSecondaryButton>
            </div>

            {modalMode === "view" &&
            selected ? (
              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Detail label={t.customersServicesUi.code} value={selected.code} />
                  <Detail label={t.customersServicesUi.service} value={selected.service_name || selected.service} />
                  <Detail label={t.customersServicesUi.type} value={selected.package_type} />
                  <Detail label={t.customersServicesUi.englishName} value={selected.name_english} />
                  <Detail label="نام دری" value={selected.name_dari || "—"} />
                  <Detail label="نوم پښتو" value={selected.name_pashto || "—"} />
                  <Detail label={t.customersServicesUi.speed} value={selected.speed_mbps ? `${selected.speed_mbps} Mbps` : "—"} />
                  <Detail label={t.customersServicesUi.quota} value={selected.quota_gb ? `${selected.quota_gb} GB` : "—"} />
                  <Detail label={t.customersServicesUi.period} value={`${selected.period_months} month(s)`} />
                  <Detail label={t.customersServicesUi.status} value={selected.status === "active" ? t.common.active : t.common.inactive} />
                  <Detail
                    label={t.customersServicesUi.currentPrice}
                    value={
                      selected.current_price
                        ? `${selected.current_price.amount} ${selected.current_price.currency}`
                        : "—"
                    }
                  />
                </div>

                <Detail
                  label={t.customersServicesUi.metadata}
                  value={JSON.stringify(
                    selected.metadata || {},
                    null,
                    2,
                  )}
                />

                <div className="flex justify-end gap-3">
                  <SharedSecondaryButton
                    type="button"
                    onClick={() =>
                      openPrices(selected)
                    }
                    className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-bold text-emerald-300"
                  >
                    <DollarSign className="h-4 w-4" />
                    {t.customersServicesUi.managePrices}
                  </SharedSecondaryButton>

                  <SharedPrimaryButton
                    type="button"
                    onClick={() =>
                      openEdit(selected)
                    }
                    className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950"
                  >
                    <Pencil className="h-4 w-4" />
                    {t.customersServicesUi.editPackage}
                  </SharedPrimaryButton>
                </div>
              </div>
            ) : (
              <form
                onSubmit={submitPackage}
                className="space-y-5"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label={t.customersServicesUi.service} required>
                    <SharedSelect
                      value={form.service}
                      onChange={(e) =>
                        updateField(
                          "service",
                          e.target.value,
                        )
                      }
                      className="pkg-input"
                    >
                      <option value="">
                        {t.customersServicesUi.selectService}
                      </option>

                      {services.map(
                        (service) => (
                          <option
                            key={service.id}
                            value={service.id}
                          >
                            {service.code} —{" "}
                            {service.name_english}
                          </option>
                        ),
                      )}
                    </SharedSelect>
                  </Field>

                  <Field label={t.customersServicesUi.packageCode} required>
                    <input
                      maxLength={100}
                      value={form.code}
                      onChange={(e) =>
                        updateField(
                          "code",
                          e.target.value,
                        )
                      }
                      className="hq-input pkg-input"
                    />
                  </Field>

                  <Field label={t.customersServicesUi.englishName} required>
                    <input
                      maxLength={200}
                      value={form.name_english}
                      onChange={(e) =>
                        updateField(
                          "name_english",
                          e.target.value,
                        )
                      }
                      className="hq-input pkg-input"
                    />
                  </Field>

                  <Field label="نام دری">
                    <input
                      dir="rtl"
                      maxLength={200}
                      value={form.name_dari}
                      onChange={(e) =>
                        updateField(
                          "name_dari",
                          e.target.value,
                        )
                      }
                      className="hq-input pkg-input"
                    />
                  </Field>

                  <Field label="نوم پښتو">
                    <input
                      dir="rtl"
                      maxLength={200}
                      value={form.name_pashto}
                      onChange={(e) =>
                        updateField(
                          "name_pashto",
                          e.target.value,
                        )
                      }
                      className="hq-input pkg-input"
                    />
                  </Field>

                  <Field label={t.customersServicesUi.packageType} required>
                    <SharedSelect
                      value={form.package_type}
                      onChange={(e) =>
                        updateField(
                          "package_type",
                          e.target.value as PackageRow["package_type"],
                        )
                      }
                      className="pkg-input"
                    >
                      <option value="unlimited">{t.customersServicesUi.packageUnlimited}</option>
                      <option value="limited">{t.customersServicesUi.packageLimited}</option>
                      <option value="contract">{t.customersServicesUi.packageContract}</option>
                      <option value="voucher">{t.customersServicesUi.packageVoucher}</option>
                      <option value="fee">{t.customersServicesUi.packageFee}</option>
                      <option value="rental">{t.customersServicesUi.packageRental}</option>
                    </SharedSelect>
                  </Field>

                  <Field label={t.customersServicesUi.speedMbps}>
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      value={form.speed_mbps}
                      onChange={(e) =>
                        updateField(
                          "speed_mbps",
                          e.target.value,
                        )
                      }
                      className="hq-input pkg-input"
                    />
                  </Field>

                  <Field label={t.customersServicesUi.quotaGb}>
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      value={form.quota_gb}
                      onChange={(e) =>
                        updateField(
                          "quota_gb",
                          e.target.value,
                        )
                      }
                      className="hq-input pkg-input"
                    />
                  </Field>

                  <Field label={t.customersServicesUi.periodMonths} required>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={form.period_months}
                      onChange={(e) =>
                        updateField(
                          "period_months",
                          e.target.value,
                        )
                      }
                      className="hq-input pkg-input"
                    />
                  </Field>

                  <Field label={t.customersServicesUi.status}>
                    <SharedSelect
                      value={form.status}
                      onChange={(e) =>
                        updateField(
                          "status",
                          e.target.value as "active" | "inactive",
                        )
                      }
                      className="pkg-input"
                    >
                      <option value="active">{t.common.active}</option>
                      <option value="inactive">{t.common.inactive}</option>
                    </SharedSelect>
                  </Field>
                </div>

                <Field label={t.customersServicesUi.metadataJson}>
                  <textarea
                    rows={6}
                    value={form.metadata}
                    onChange={(e) =>
                      updateField(
                        "metadata",
                        e.target.value,
                      )
                    }
                    className="hq-input pkg-input font-mono text-xs"
                  />
                </Field>

                {notice?.type === "error" && (
                  <ErrorBox>
                    {notice.message}
                  </ErrorBox>
                )}

                <div className="flex justify-end gap-3 border-t border-white/10 pt-5">
                  <SharedSecondaryButton
                    type="button"
                    onClick={closeModal}
                    disabled={saving}
                    className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300"
                  >
                    Cancel
                  </SharedSecondaryButton>

                  <SharedPrimaryButton
                    type="submit"
                    disabled={saving}
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
                        {modalMode === "create"
                          ? t.customersServicesUi.createPackage
                          : t.common.saveChanges}
                      </>
                    )}
                  </SharedPrimaryButton>
                </div>
              </form>
            )}

            
          </div>
        </div>
      )}

      {priceModalMode && selected && (
        <div className="hq-visual-overlay hq-subscriber-modal-layer fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md">
          <div className="hq-visual-panel hq-visual-dialog hq-subscriber-dialog max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-[28px] border border-white/10 bg-slate-950 p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-white">
                  {t.customersServicesUi.packagePrices}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {selected.code} — {selected.name_english}
                </p>
              </div>

              <SharedSecondaryButton
                type="button"
                onClick={() =>
                  setPriceModalMode(null)
                }
                disabled={saving}
                className="rounded-xl border border-white/10 p-2 text-slate-400"
              >
                <X className="h-5 w-5" />
              </SharedSecondaryButton>
            </div>

            {priceModalMode === "list" ? (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <SharedSecondaryButton
                    type="button"
                    onClick={openCreatePrice}
                    className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950"
                  >
                    <Plus className="h-4 w-4" />
                    {t.customersServicesUi.newPrice}
                  </SharedSecondaryButton>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-white/10">
                  <SharedDataTable native className="w-full text-sm">
                    <thead className="bg-white/[0.04] text-slate-400">
                      <tr>
                        <th className="p-3 text-start">{t.customersServicesUi.amount}</th>
                        <th className="p-3 text-start">{t.common.fromLabel}</th>
                        <th className="p-3 text-start">{t.common.toLabel}</th>
                        <th className="p-3 text-start">{t.customersServicesUi.status}</th>
                        <th className="p-3 text-start">{t.common.action}</th>
                      </tr>
                    </thead>

                    <tbody>
                      {prices.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="p-6 text-center text-slate-500"
                          >
                            {t.customersServicesUi.noPriceRecords}
                          </td>
                        </tr>
                      ) : (
                        prices.map((price) => (
                          <tr
                            key={price.id}
                            className="border-t border-white/5"
                          >
                            <td className="p-3 font-mono text-white">
                              {price.amount} {price.currency}
                            </td>
                            <td className="p-3">
                              {price.effective_from}
                            </td>
                            <td className="p-3">
                              {price.effective_to || t.common.open}
                            </td>
                            <td className="p-3">
                              {price.status === "active" ? t.common.active : t.common.inactive}
                            </td>
                            <td className="p-3">
                              <SharedSecondaryButton
                                type="button"
                                onClick={() =>
                                  openEditPrice(price)
                                }
                                className="rounded-lg border border-white/10 p-2 text-cyan-400"
                              >
                                <Pencil className="h-4 w-4" />
                              </SharedSecondaryButton>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </SharedDataTable>
                </div>
              </div>
            ) : (
              <form
                onSubmit={submitPrice}
                className="space-y-5"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label={t.customersServicesUi.amount} required>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={priceForm.amount}
                      onChange={(e) =>
                        setPriceForm((current) => ({
                          ...current,
                          amount: e.target.value,
                        }))
                      }
                      className="hq-input pkg-input"
                    />
                  </Field>

                  <Field label={t.customersServicesUi.currency} required>
                    <input
                      maxLength={8}
                      value={priceForm.currency}
                      onChange={(e) =>
                        setPriceForm((current) => ({
                          ...current,
                          currency: e.target.value,
                        }))
                      }
                      className="hq-input pkg-input"
                    />
                  </Field>

                  <Field label={t.customersServicesUi.effectiveFrom} required>
                    <SharedDatePicker
                      type="date"
                      value={priceForm.effective_from}
                      onChange={(e) =>
                        setPriceForm((current) => ({
                          ...current,
                          effective_from: e.target.value,
                        }))
                      }
                      className="pkg-input"
                    />
                  </Field>

                  <Field label={t.customersServicesUi.effectiveTo}>
                    <SharedDatePicker
                      type="date"
                      value={priceForm.effective_to || ""}
                      onChange={(e) =>
                        setPriceForm((current) => ({
                          ...current,
                          effective_to:
                            e.target.value || null,
                        }))
                      }
                      className="pkg-input"
                    />
                  </Field>

                  <Field label={t.customersServicesUi.status}>
                    <SharedSelect
                      value={priceForm.status}
                      onChange={(e) =>
                        setPriceForm((current) => ({
                          ...current,
                          status: e.target.value,
                        }))
                      }
                      className="pkg-input"
                    >
                      <option value="active">{t.common.active}</option>
                      <option value="inactive">{t.common.inactive}</option>
                    </SharedSelect>
                  </Field>

                  <Field label={t.customersServicesUi.sourceNote}>
                    <input
                      maxLength={255}
                      value={priceForm.source_note}
                      onChange={(e) =>
                        setPriceForm((current) => ({
                          ...current,
                          source_note: e.target.value,
                        }))
                      }
                      className="hq-input pkg-input"
                    />
                  </Field>
                </div>

                {notice?.type === "error" && (
                  <ErrorBox>
                    {notice.message}
                  </ErrorBox>
                )}

                <div className="flex justify-end gap-3 border-t border-white/10 pt-5">
                  <SharedSecondaryButton
                    type="button"
                    onClick={() =>
                      setPriceModalMode("list")
                    }
                    disabled={saving}
                    className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300"
                  >
                    Back
                  </SharedSecondaryButton>

                  <SharedSecondaryButton
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2 text-sm font-black text-slate-950 disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t.common.saving}
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        {t.customersServicesUi.savePrice}
                      </>
                    )}
                  </SharedSecondaryButton>
                </div>
              </form>
            )}
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
      <span>{children}</span>
    </div>
  );
}
