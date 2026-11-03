import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CalendarRange,
  CheckCircle2,
  FileText,
  Scale,
} from "lucide-react";

import {
  accountingApi,
  type AccountingPeriod,
  type JournalEntry,
  type Session,
} from "../../lib/api";

import {
  DataTable,
  StatusBadge,
  type Column,
} from "../../components/DataTable";

type Props = {
  session: Session;
};

export function AccountingModule({ session }: Props) {
  const [periods, setPeriods] = useState<AccountingPeriod[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);

  const [periodCount, setPeriodCount] = useState(0);
  const [journalCount, setJournalCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const [p, j] = await Promise.all([
          accountingApi.periods(session),
          accountingApi.journals(session),
        ]);

        if (!active) return;

        setPeriods(p.results);
        setPeriodCount(p.count);

        setJournals(j.results);
        setJournalCount(j.count);
      } catch (err) {
        if (!active) return;

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load accounting data.",
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [session]);

  const openPeriods = useMemo(
    () => periods.filter((p) => p.status === "open").length,
    [periods],
  );

  const draftJournals = useMemo(
    () => journals.filter((j) => j.status === "draft").length,
    [journals],
  );

  const postedJournals = useMemo(
    () => journals.filter((j) => j.status === "posted").length,
    [journals],
  );

  const periodColumns: Column<AccountingPeriod>[] = [
    {
      header: "Period",
      accessor: (row) => (
        <div>
          <div className="font-bold text-white">{row.name}</div>
          <div className="mt-1 text-xs text-slate-500">
            {row.start_date} → {row.end_date}
          </div>
        </div>
      ),
    },
    {
      header: "Status",
      accessor: (row) => (
        <StatusBadge
          status={row.status}
          type={
            row.status === "open"
              ? "success"
              : row.status === "locked"
                ? "warning"
                : "default"
          }
        />
      ),
    },
  ];

  const journalColumns: Column<JournalEntry>[] = [
    {
      header: "Journal",
      accessor: (row) => (
        <div>
          <div className="font-black text-white">
            {row.entry_number}
          </div>
          <div className="mt-1 max-w-[300px] truncate text-xs text-slate-500">
            {row.description || "—"}
          </div>
        </div>
      ),
    },
    {
      header: "Date",
      accessor: "entry_date",
    },
    {
      header: "Debit",
      accessor: (row) => (
        <span className="font-bold">
          {row.debit_total}
        </span>
      ),
    },
    {
      header: "Credit",
      accessor: (row) => (
        <span className="font-bold">
          {row.credit_total}
        </span>
      ),
    },
    {
      header: "Balance",
      accessor: (row) =>
        row.is_balanced ? (
          <span className="inline-flex items-center gap-1.5 font-bold text-emerald-500">
            <CheckCircle2 className="h-4 w-4" />
            Balanced
          </span>
        ) : (
          <span className="font-bold text-amber-500">
            Unbalanced
          </span>
        ),
    },
    {
      header: "Status",
      accessor: (row) => (
        <StatusBadge
          status={row.status}
          type={row.status === "posted" ? "success" : "warning"}
        />
      ),
    },
  ];

  const cards = [
    {
      title: "Accounting Periods",
      value: periodCount,
      subtitle: `${openPeriods} open`,
      icon: CalendarRange,
    },
    {
      title: "Journal Entries",
      value: journalCount,
      subtitle: "All journal entries",
      icon: BookOpen,
    },
    {
      title: "Draft Journals",
      value: draftJournals,
      subtitle: "Awaiting posting",
      icon: FileText,
    },
    {
      title: "Posted Journals",
      value: postedJournals,
      subtitle: "Finalized",
      icon: Scale,
    },
  ];

  return (
    <section className="space-y-6">
      <div className="glass-panel dashboard-hero relative overflow-hidden rounded-[2rem] p-7 lg:p-9">
        <div className="relative z-10">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-400/15 to-violet-500/15">
            <BookOpen className="h-6 w-6 text-cyan-500" />
          </div>

          <h1 className="dashboard-title text-3xl font-black tracking-tight">
            حسابداری
          </h1>

          <p className="mt-2 text-sm font-medium text-slate-500">
            دوره‌های مالی، اسناد روزنامه و توازن بدهکار و بستانکار
          </p>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.title}
              className="glass-card kpi-card-3d relative overflow-hidden rounded-[1.75rem] p-6"
            >
              <div className="flex items-start justify-between">
                <div className="kpi-icon-3d flex h-12 w-12 items-center justify-center rounded-2xl">
                  <Icon className="h-6 w-6 text-cyan-500" />
                </div>
              </div>

              <div className="mt-7">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {card.title}
                </p>

                <p className="mt-2 text-3xl font-black text-white">
                  {loading ? "…" : card.value}
                </p>

                <p className="mt-2 text-xs font-medium text-slate-500">
                  {card.subtitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm font-bold text-rose-500">
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-5">
        <div className="xl:col-span-2">
          <DataTable
            title="Accounting Periods"
            columns={periodColumns}
            data={periods}
            loading={loading}
            totalCount={periodCount}
            pageSize={10}
          />
        </div>

        <div className="xl:col-span-3">
          <DataTable
            title="Journal Entries"
            columns={journalColumns}
            data={journals}
            loading={loading}
            totalCount={journalCount}
            pageSize={10}
          />
        </div>
      </div>
    </section>
  );
}
