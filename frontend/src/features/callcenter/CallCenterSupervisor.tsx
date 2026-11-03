import { useEffect, useState } from "react";
import { api, type Session } from "../../lib/api";

type Lang = "en" | "fa" | "ps";
type Calls = {
  total: number; today: number; inbound: number; outbound: number;
  outcomes: Record<string, number>;
};
type Tickets = {
  total: number; open: number; in_progress: number;
  resolved: number; closed: number; cancelled: number;
};
type FollowUps = {
  total: number; pending: number; completed: number;
  cancelled: number; overdue: number;
};
type Summary = { calls: Calls; tickets: Tickets; followups: FollowUps };

export function CallCenterSupervisor({session, language, refreshTrigger}: {
  session: Session; language: Lang; refreshTrigger: number;
}) {
  const tr = (en: string, fa: string, ps: string) =>
    language === "en" ? en : language === "fa" ? fa : ps;
  const [summary, setSummary] = useState<Summary | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setSummary(null);
    setError("");
    setBusy(true);

    if (!session.companyId) {
      setError(tr("Select a company first.", "ابتدا شرکت را انتخاب کنید.", "لومړی شرکت وټاکئ."));
      setBusy(false);
      return () => controller.abort();
    }

    const options = {signal: controller.signal};
    Promise.all([
      api<Calls>("/api/v1/customer-call-logs/summary/", options, session),
      api<Tickets>("/api/v1/customer-tickets/summary/", options, session),
      api<FollowUps>("/api/v1/customer-followups/summary/", options, session),
    ])
      .then(([calls, tickets, followups]) => {
        if (active) setSummary({calls, tickets, followups});
      })
      .catch(cause => {
        if (active && !controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : tr(
            "Could not load supervisor summary.",
            "خلاصهٔ سرپرست بارگذاری نشد.",
            "د څارونکي لنډیز پورته نه شو.",
          ));
      })
      .finally(() => { if (active) setBusy(false); });

    return () => { active = false; controller.abort(); };
  }, [session.tenantId, session.companyId, session.access, refreshTrigger, language]);

  const card = (title: string, value: number) => (
    <div key={title} className="hq-visual-panel cc-card rounded-xl border border-sky-200/60 bg-white/70 p-4 dark:border-white/10 dark:bg-slate-900/40">
      <p className="text-xs text-slate-500 dark:text-slate-400">{title}</p>
      <strong className="mt-2 block text-2xl text-slate-800 dark:text-white">{value}</strong>
    </div>
  );

  return <section className="space-y-4">
    <div className="hq-visual-panel rounded-2xl border border-sky-200/60 bg-white/70 p-5 dark:border-white/10 dark:bg-slate-900/40">
      <h3 className="font-bold text-slate-800 dark:text-white">
        {tr("Supervisor overview", "نمای کلی سرپرست", "د څارونکي لنډیز")}
      </h3>
      <p className="mt-1 text-xs text-slate-500">
        {tr("Counts from company-scoped calls, tickets and follow-ups.",
          "آمار تماس‌ها، تیکت‌ها و پیگیری‌های شرکت فعال.",
          "د فعال شرکت د اړیکو، ټکټونو او تعقیبونو شمېرې.")}
      </p>
    </div>

    {busy ? <p className="p-5 text-sm text-slate-500" role="status">
      {tr("Loading…", "در حال بارگذاری…", "پورته کېږي…")}
    </p> : error ? <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700" role="alert">{error}</p>
      : summary && <>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {card(tr("Calls today", "تماس‌های امروز", "د نن ورځې اړیکې"), summary.calls.today)}
          {card(tr("All calls", "همهٔ تماس‌ها", "ټولې اړیکې"), summary.calls.total)}
          {card(tr("Inbound calls", "تماس‌های ورودی", "راتلونکې اړیکې"), summary.calls.inbound)}
          {card(tr("Outbound calls", "تماس‌های خروجی", "وتونکې اړیکې"), summary.calls.outbound)}
          {card(tr("Tickets", "تیکت‌ها", "ټکټونه"), summary.tickets.total)}
          {card(tr("Open tickets", "تیکت‌های باز", "پرانیستي ټکټونه"),
            summary.tickets.open + summary.tickets.in_progress)}
          {card(tr("Pending follow-ups", "پیگیری‌های باز", "پاتې تعقیبونه"), summary.followups.pending)}
          {card(tr("Overdue follow-ups", "پیگیری‌های عقب‌مانده", "ځنډېدلي تعقیبونه"), summary.followups.overdue)}
          {card(tr("Completed follow-ups", "پیگیری‌های تکمیل‌شده", "بشپړ شوي تعقیبونه"), summary.followups.completed)}
        </div>

        <div className="rounded-2xl border border-amber-200/70 bg-amber-50/80 p-4 text-sm text-amber-900 dark:border-amber-400/20 dark:bg-amber-950/20 dark:text-amber-100">
          {tr("Live presence and call listening are not configured.",
            "وضعیت زنده و شنود تماس تنظیم نشده است.",
            "ژوندی حالت او د اړیکو اورېدل نه دي تنظیم شوي.")}
        </div>
      </>}
  </section>;
}
