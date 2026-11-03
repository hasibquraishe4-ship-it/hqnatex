import { getTranslation as getUiTranslation } from "../../i18n";
import { SecondaryButton as SharedSecondaryButton, DatePicker as SharedDatePicker } from "../../components/Interface";
import { PageHeader as SharedPageHeader } from "../../components/PageHeader";
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  CalendarRange,
  Plus,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  X,
  Search,
  Clock,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { DataTable, StatusBadge, type Column } from "../../components/DataTable";
import { useTranslation } from "../../lib/i18n";
import {
  accountingApi,
  type AccountingPeriod,
  type Session,
} from "../../lib/api";
import type { FinanceFilterState, FinanceTabId } from "./FinanceTypes";

type Props = {
  session: Session;
  filters: FinanceFilterState;
  onNavigateTab: (tab: FinanceTabId) => void;
};

export function FinancialPeriodsView({ session, filters, onNavigateTab }: Props) {
  const { language, rtl } = useTranslation();
  const [periods, setPeriods] = useState<AccountingPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState(`FY-${new Date().getFullYear()}-M${String(new Date().getMonth() + 1).padStart(2, "0")}`);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 8) + "01");
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

  const copy = {en:getUiTranslation("en").featureCopy.finance_FinancialPeriodsView.local0,fa:getUiTranslation("fa").featureCopy.finance_FinancialPeriodsView.local0,ps:getUiTranslation("ps").featureCopy.finance_FinancialPeriodsView.local0}[language];

  const statusLabel = (
    status: AccountingPeriod["status"],
  ) => {
    if (status === "open") {
      return copy.open;
    }

    if (status === "closed") {
      return copy.closed;
    }

    return copy.locked;
  };

  const loadPeriods = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await accountingApi.periods(
        session,
      );

      setPeriods(
        Array.isArray(res?.results)
          ? res.results
          : [],
      );
    } catch (err) {
      console.error(
        "Accounting periods load failed:",
        err,
      );

      setPeriods([]);
      setError(copy.loadError);
    } finally {
      setLoading(false);
    }
  }, [session, language]);

  useEffect(() => {
    loadPeriods();
  }, [loadPeriods]);

  const handleUpdateStatus = async (
    period: AccountingPeriod,
    newStatus: "open" | "closed" | "locked",
  ) => {
    try {
      setSaving(true);
      setNotice(null);

      const updated =
        await accountingApi.updatePeriod(
          session,
          period.id,
          {
            status: newStatus,
          },
        );

      setPeriods((prev) =>
        prev.map((item) =>
          item.id === period.id
            ? updated
            : item,
        ),
      );

      setNotice({
        type: "success",
        message:
          `${copy.updateSuccess} ` +
          `${period.name} — ` +
          `${statusLabel(updated.status)}`,
      });
    } catch (err) {
      console.error(
        "Accounting period update failed:",
        err,
      );

      setNotice({
        type: "error",
        message: copy.updateError,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCreatePeriod = async (
    e: React.FormEvent,
  ) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");
      setNotice(null);

      const payload = {
        name,
        start_date: startDate,
        end_date: endDate,
        status: "open" as const,
      };

      const created =
        await accountingApi.createPeriod(
          session,
          payload,
        );

      setPeriods((prev) => [
        created,
        ...prev,
      ]);

      setShowCreateModal(false);

      setNotice({
        type: "success",
        message:
          `${copy.createSuccess} ${created.name}`,
      });
    } catch (err) {
      console.error(
        "Accounting period creation failed:",
        err,
      );

      setError(
        copy.createError,
      );

      setNotice({
        type: "error",
        message: copy.createError,
      });
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<AccountingPeriod>[] = [
    {
      header: copy.name,
      accessor: (row) => (
        <span className="font-bold text-xs text-white">{row.name}</span>
      ),
    },
    {
      header: copy.startDate,
      accessor: (row) => (
        <span className="font-mono text-xs text-slate-300">{row.start_date}</span>
      ),
    },
    {
      header: copy.endDate,
      accessor: (row) => (
        <span className="font-mono text-xs text-slate-300">{row.end_date}</span>
      ),
    },
    {
      header: copy.status,
      accessor: (row) => (
        <StatusBadge
          status={statusLabel(row.status)}
          type={row.status === "open" ? "success" : row.status === "closed" ? "warning" : "default"}
        />
      ),
    },
    {
      header: copy.actions,
      accessor: (row) => (
        <div className="flex items-center gap-1.5">
          {row.status === "open" && (
            <button
              onClick={() => handleUpdateStatus(row, "closed")}
              disabled={saving}
              className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-bold transition-all"
            >
              {copy.closeAction}
            </button>
          )}

          {row.status === "closed" && (
            <button
              onClick={() => handleUpdateStatus(row, "locked")}
              disabled={saving}
              className="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[11px] font-bold transition-all flex items-center gap-1"
            >
              <Lock className="w-3 h-3" />
              <span>{copy.lockAction}</span>
            </button>
          )}

          {row.status === "locked" && (
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-rose-400" />
              <span>{copy.immutable}</span>
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {notice && (
        <div
          className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
            notice.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/20 text-rose-300"
          }`}
        >
          <span>{notice.message}</span>
          <SharedSecondaryButton type="submit" onClick={() => setNotice(null)} className="text-slate-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </SharedSecondaryButton>
        </div>
      )}

      {/* Header Bar */}
      <SharedPageHeader native as="div" className="glass-panel rounded-2xl p-4 lg:p-5 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base lg:text-lg font-black text-white flex items-center gap-2">
            <CalendarRange className="w-5 h-5 text-teal-400" />
            {copy.title}
          </h2>
          <p className="text-xs font-medium text-slate-400 mt-0.5">{copy.subtitle}</p>
        </div>

        <SharedSecondaryButton
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-400 text-slate-950 transition-all shadow-lg shadow-teal-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>{copy.newPeriod}</span>
        </SharedSecondaryButton>
      </SharedPageHeader>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={periods}
        loading={loading}
        totalCount={periods.length}
        pageSize={10}
      />

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-md rounded-2xl border border-white/15 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
                  <CalendarRange className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black text-white">{copy.createModalTitle}</h3>
              </div>
              <SharedSecondaryButton type="submit"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </SharedSecondaryButton>
            </div>

            <form onSubmit={handleCreatePeriod} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase">{copy.name}</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full glass-input text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">{copy.startDate}</label>
                  <SharedDatePicker
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full glass-input text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">{copy.endDate}</label>
                  <SharedDatePicker
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full glass-input text-xs font-mono"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs leading-relaxed">
                {copy.lockWarning}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <SharedSecondaryButton
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-white/10 text-slate-300 hover:bg-white/10 transition-all"
                >
                  {copy.cancel}
                </SharedSecondaryButton>
                <SharedSecondaryButton
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-400 text-slate-950 transition-all shadow-lg shadow-teal-500/20"
                >
                  {copy.savePeriod}
                </SharedSecondaryButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
