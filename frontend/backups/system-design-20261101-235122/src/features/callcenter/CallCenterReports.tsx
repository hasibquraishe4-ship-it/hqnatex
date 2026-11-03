import { useEffect, useState } from "react";
import { api, type Session } from "../../lib/api";

type Counts = {
  total?: number; today?: number; inbound?: number; outbound?: number;
  open?: number; in_progress?: number; resolved?: number; closed?: number;
  pending?: number; completed?: number; overdue?: number; cancelled?: number;
  outcomes?: Record<string, number>;
};
type Props = { session: Session; language: string; refreshTrigger: number };
type Row = [string, number | undefined];

export function CallCenterReports({ session, language, refreshTrigger }: Props) {
  const [calls, setCalls] = useState<Counts | null>(null);
  const [tickets, setTickets] = useState<Counts | null>(null);
  const [followUps, setFollowUps] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const tr = (en: string, fa: string, ps: string) =>
    language === "fa" ? fa : language === "ps" ? ps : en;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    Promise.all([
      api<Counts>("/api/v1/customer-call-logs/summary/", { signal: controller.signal }, session),
      api<Counts>("/api/v1/customer-tickets/summary/", { signal: controller.signal }, session),
      api<Counts>("/api/v1/customer-followups/summary/", { signal: controller.signal }, session),
    ]).then(([c, t, f]) => {
      setCalls(c);
      setTickets(t);
      setFollowUps(f);
    }).catch((e: unknown) => {
      if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Could not load reports");
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [session, refreshTrigger]);

  const groups: { title: string; rows: Row[] }[] = [
    { title: tr("Calls", "تماس‌ها", "اړیکې"), rows: [
      [tr("Total", "مجموع", "ټول"), calls?.total],
      [tr("Today", "امروز", "نن"), calls?.today],
      [tr("Inbound", "ورودی", "راتلونکې"), calls?.inbound],
      [tr("Outbound", "خروجی", "وتونکې"), calls?.outbound],
      [tr("Answered", "پاسخ‌داده‌شده", "ځواب شوې"), calls?.outcomes?.answered],
      [tr("Missed", "از‌دست‌رفته", "له لاسه وتلې"), calls?.outcomes?.missed],
    ]},
    { title: tr("Tickets", "تیکت‌ها", "ټکټونه"), rows: [
      [tr("Total", "مجموع", "ټول"), tickets?.total],
      [tr("Open", "باز", "پرانیستي"), tickets?.open],
      [tr("In progress", "در جریان", "تر کار لاندې"), tickets?.in_progress],
      [tr("Resolved", "حل‌شده", "حل شوي"), tickets?.resolved],
      [tr("Closed", "بسته", "تړل شوي"), tickets?.closed],
    ]},
    { title: tr("Follow-ups", "پیگیری‌ها", "تعقیبونه"), rows: [
      [tr("Total", "مجموع", "ټول"), followUps?.total],
      [tr("Pending", "در انتظار", "پاتې"), followUps?.pending],
      [tr("Completed", "تکمیل‌شده", "بشپړ شوي"), followUps?.completed],
      [tr("Overdue", "با تأخیر", "ځنډېدلي"), followUps?.overdue],
      [tr("Cancelled", "لغوشده", "لغوه شوي"), followUps?.cancelled],
    ]},
  ];

  return (
    <section className="cc-reports cc-reports space-y-5">
<style>{`
/* CALLCENTER_REPORTS_GLASS_V1 */
html body .hq-shell[data-theme] .cc-reports [class*="rounded-2xl"] {
  color: #18334d !important;
  background: rgba(255,255,255,.80) !important;
  border-color: rgba(255,255,255,.95) !important;
  box-shadow: 0 14px 36px rgba(26,57,86,.15), inset 0 1px 0 rgba(255,255,255,.9) !important;
  backdrop-filter: blur(18px) saturate(140%);
  -webkit-backdrop-filter: blur(18px) saturate(140%);
}
html body .hq-shell[data-theme] .cc-reports [class*="rounded-2xl"] :is(h2,h3,p,span,dt,dd,td,th) {
  color: #18334d !important;
  opacity: 1 !important;
}
`}</style>
      <style>{`
        .cc-reports article {
          background: #f1f7fd !important;
          border-color: #bfd4e8 !important;
          color: #18334d !important;
        }
        .cc-reports article h3,
        .cc-reports article dt,
        .cc-reports article dd {
          color: #18334d !important;
        }
        .cc-reports article div {
          border-color: #d7e4f0 !important;
        }
      `}</style>
      <header>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          {tr("Call Center Reports", "گزارش‌های مرکز تماس", "د اړیکو مرکز راپورونه")}
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {tr("Actual records for the active company.", "رکوردهای واقعی شرکت فعال.", "د فعال شرکت حقیقي ریکارډونه.")}
        </p>
      </header>
      {error && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-red-800">{error}</p>}
      <div className="grid gap-4 xl:grid-cols-3">
        {groups.map(group => (
          <article key={group.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/70">
            <h3 className="mb-4 font-bold text-slate-900 dark:text-white">{group.title}</h3>
            <dl className="space-y-3">
              {group.rows.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3 border-b border-slate-100 pb-2 last:border-0 dark:border-white/5">
                  <dt className="text-sm text-slate-600 dark:text-slate-300">{label}</dt>
                  <dd className="font-mono font-semibold text-slate-900 dark:text-white">
                    {loading ? "…" : typeof value === "number" ? value.toLocaleString() : "—"}
                  </dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
        {tr("Live telephony is not configured; totals use saved records.",
          "تلفن زنده تنظیم نیست؛ آمار از رکوردهای ثبت‌شده است.",
          "ژوندی ټیلیفون نه دی تنظیم؛ شمېرې له ثبت شوو ریکارډونو دي.")}
      </p>
    </section>
  );
}
