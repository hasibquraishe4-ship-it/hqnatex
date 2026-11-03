import { useEffect, useState } from "react";
import { Loader2, Users } from "lucide-react";
import { api, type Session } from "../../lib/api";

type Lang = "en" | "fa" | "ps";
type Agent = {
  membership_id: string;
  name: string;
  email: string;
  roles: string[];
};

export function CallCenterAgents({session, language, refreshTrigger}: {
  session: Session; language: Lang; refreshTrigger: number;
}) {
  const tr = (en: string, fa: string, ps: string) =>
    language === "en" ? en : language === "fa" ? fa : ps;
  const [rows, setRows] = useState<Agent[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setRows([]);
    setError("");
    setBusy(true);

    if (!session.companyId) {
      setError(tr("Select a company first.", "ابتدا شرکت را انتخاب کنید.", "لومړی شرکت وټاکئ."));
      setBusy(false);
      return () => controller.abort();
    }

    api<Agent[]>("/api/v1/customer-call-logs/agents/",
      {signal: controller.signal}, session)
      .then(data => { if (active) setRows(data); })
      .catch(err => {
        if (active && !controller.signal.aborted)
          setError(err instanceof Error ? err.message : tr(
            "Could not load operators.", "بارگذاری اپراتورها انجام نشد.", "کارکوونکي نه شول پورته کېدای."));
      })
      .finally(() => { if (active) setBusy(false); });

    return () => { active = false; controller.abort(); };
  }, [session.tenantId, session.companyId, session.access, refreshTrigger, language]);

  return <section className="cc-card rounded-2xl border border-sky-200/60 bg-white/70 p-5 dark:border-white/10 dark:bg-slate-900/40">
    <div className="mb-4 flex items-center gap-3">
      <Users className="h-5 w-5 text-sky-600" />
      <div>
        <h3 className="font-bold text-slate-800 dark:text-white">{tr("Operators", "اپراتورها", "کارکوونکي")}</h3>
        <p className="text-xs text-slate-500">{tr("Active company members with call access", "اعضای فعال شرکت با دسترسی تماس", "د اړیکو د لاسرسي لرونکي فعال غړي")}</p>
      </div>
    </div>
    {busy ? <p className="flex items-center gap-2 py-5 text-sm"><Loader2 className="h-4 w-4 animate-spin" />{tr("Loading…", "در حال بارگذاری…", "پورته کېږي…")}</p>
      : error ? <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>
      : rows.length === 0 ? <p className="rounded-xl bg-sky-50 p-4 text-sm text-slate-600">{tr("No active members with call access were returned.", "عضو فعال با دسترسی تماس پیدا نشد.", "د اړیکو د لاسرسي لرونکی فعال غړی ونه موندل شو.")}</p>
      : <div className="overflow-x-auto rounded-xl border border-sky-200/60 dark:border-white/10">
        <table className="w-full min-w-[560px] text-start text-sm">
          <thead className="bg-sky-50 text-slate-600 dark:bg-slate-800"><tr>
            <th className="px-4 py-3">{tr("Operator", "اپراتور", "کارکوونکی")}</th>
            <th className="px-4 py-3">{tr("Email", "ایمیل", "برېښنالیک")}</th>
            <th className="px-4 py-3">{tr("Roles", "نقش‌ها", "رولونه")}</th>
            <th className="px-4 py-3">{tr("Membership", "عضویت", "غړیتوب")}</th>
          </tr></thead>
          <tbody>{rows.map(row => <tr key={row.membership_id} className="border-t border-sky-100 dark:border-white/10">
            <td className="px-4 py-3 font-semibold">{row.name}</td>
            <td className="px-4 py-3" dir="ltr">{row.email}</td>
            <td className="px-4 py-3">{row.roles.join(", ") || "—"}</td>
            <td className="px-4 py-3 text-emerald-700">{tr("Active", "فعال", "فعال")}</td>
          </tr>)}</tbody>
        </table>
      </div>}
    <p className="mt-3 text-xs text-slate-500">{tr("Membership only; live presence is not configured.", "فقط معلومات عضویت؛ وضعیت زنده تنظیم نشده است.", "یوازې د غړیتوب معلومات؛ ژوندی حالت نه دی تنظیم شوی.")}</p>
  </section>;
}
