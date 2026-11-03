import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api, type Paginated, type Session } from "../../lib/api";

type Lang = "en" | "fa" | "ps";
type Row = Record<string, any>;
type Kind = "call_log" | "ticket" | "follow_up";

const endpoint = "/api/v1/customer-call-quality-evaluations/";
const sourceEndpoints: Record<Kind, string> = {
  call_log: "/api/v1/customer-call-logs/",
  ticket: "/api/v1/customer-tickets/",
  follow_up: "/api/v1/customer-followups/",
};

function items(data: Row[] | Paginated<Row>): Row[] {
  return Array.isArray(data) ? data : data.results;
}
function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
function recordLabel(row: Row): string {
  return [
    row.ticket_number,
    row.customer_name,
    row.phone_number,
    row.subject,
    row.title,
    row.scheduled_at,
    row.id,
  ].filter(Boolean).slice(0, 3).join(" · ");
}

export function CallCenterQuality({session, language, refreshTrigger}: {
  session: Session; language: Lang; refreshTrigger: number;
}) {
  const tr = (en: string, fa: string, ps: string) =>
    language === "fa" ? fa : language === "ps" ? ps : en;

  const [rows, setRows] = useState<Row[]>([]);
  const [sources, setSources] = useState<Record<Kind, Row[]>>({
    call_log: [], ticket: [], follow_up: [],
  });
  const [kind, setKind] = useState<Kind>("call_log");
  const [target, setTarget] = useState("");
  const [score, setScore] = useState("80");
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [evaluations, calls, tickets, followUps] = await Promise.all([
        api<Row[] | Paginated<Row>>(`${endpoint}?page=1&page_size=100`, {}, session),
        api<Row[] | Paginated<Row>>(`${sourceEndpoints.call_log}?page=1&page_size=100`, {}, session),
        api<Row[] | Paginated<Row>>(`${sourceEndpoints.ticket}?page=1&page_size=100`, {}, session),
        api<Row[] | Paginated<Row>>(`${sourceEndpoints.follow_up}?page=1&page_size=100`, {}, session),
      ]);
      setRows(items(evaluations));
      setSources({
        call_log: items(calls),
        ticket: items(tickets),
        follow_up: items(followUps),
      });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => { void load(); }, [load, refreshTrigger]);

  const beginEdit = (row: Row) => {
    const selectedKind: Kind = row.call_log ? "call_log" : row.ticket ? "ticket" : "follow_up";
    setEditing(row);
    setKind(selectedKind);
    setTarget(String(row[selectedKind] || ""));
    setScore(String(row.score ?? 0));
    setNote(String(row.note || ""));
    setNotice("");
  };

  const reset = () => {
    setEditing(null);
    setTarget("");
    setScore("80");
    setNote("");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!target) {
      setError(tr("Select a real call, ticket, or follow-up.", "یک تماس، تیکت یا پیگیری واقعی انتخاب کنید.", "یو ریښتینی تماس، ټکټ یا تعقیب وټاکئ."));
      return;
    }
    const value = Number(score);
    if (!Number.isInteger(value) || value < 0 || value > 100) {
      setError(tr("Score must be from 0 to 100.", "امتیاز باید بین ۰ تا ۱۰۰ باشد.", "نمره باید له ۰ تر ۱۰۰ وي."));
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");
    try {
      const payload = {
        call_log: kind === "call_log" ? target : null,
        ticket: kind === "ticket" ? target : null,
        follow_up: kind === "follow_up" ? target : null,
        score: value,
        note,
      };
      await api(
        editing ? `${endpoint}${editing.id}/` : endpoint,
        { method: editing ? "PATCH" : "POST", body: JSON.stringify(payload) },
        session,
      );
      reset();
      setNotice(tr("Evaluation saved.", "ارزیابی ذخیره شد.", "ارزونه خوندي شوه."));
      await load();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  const kindLabel = (row: Row) => row.call_log
    ? tr("Call", "تماس", "تماس")
    : row.ticket ? tr("Ticket", "تیکت", "ټکټ")
    : tr("Follow-up", "پیگیری", "تعقیب");

  const targetLabel = (row: Row) => {
    const sourceKind: Kind = row.call_log ? "call_log" : row.ticket ? "ticket" : "follow_up";
    const id = String(row[sourceKind] || "");
    const source = sources[sourceKind].find(item => String(item.id) === id);
    return source ? recordLabel(source) : id;
  };

  return <section className="cc-quality space-y-5">
<style>{`
/* CALLCENTER_QUALITY_GLASS_V1 */
html body .hq-shell[data-theme] .cc-quality .cc-quality-panel {
  color: #18334d !important;
  background: rgba(255,255,255,.80) !important;
  border: 1px solid rgba(255,255,255,.95) !important;
  box-shadow: 0 14px 36px rgba(26,57,86,.16), inset 0 1px 0 rgba(255,255,255,.9) !important;
  backdrop-filter: blur(18px) saturate(140%);
  -webkit-backdrop-filter: blur(18px) saturate(140%);
}
html body .hq-shell[data-theme] .cc-quality .cc-quality-panel input,
html body .hq-shell[data-theme] .cc-quality .cc-quality-panel select,
html body .hq-shell[data-theme] .cc-quality .cc-quality-panel textarea {
  color: #18334d !important;
  background: rgba(255,255,255,.86) !important;
  border-color: #bfd4e8 !important;
}
html body .hq-shell[data-theme] .cc-quality .cc-quality-panel input::placeholder,
html body .hq-shell[data-theme] .cc-quality .cc-quality-panel textarea::placeholder {
  color: #60758a !important;
}
html body .hq-shell[data-theme] .cc-quality .cc-quality-panel th {
  color: #294967 !important;
  background: rgba(226,239,250,.9) !important;
}
html body .hq-shell[data-theme] .cc-quality .cc-quality-panel td {
  color: #18334d !important;
}
html body .hq-shell[data-theme] .cc-quality .cc-quality-panel tr {
  border-color: rgba(143,170,195,.4) !important;
}
/* CALLCENTER_QUALITY_LABEL_CONTRAST_V1 */
html body .hq-shell[data-theme] .cc-quality .cc-quality-panel label,
html body .hq-shell[data-theme] .cc-quality .cc-quality-panel label span,
html body .hq-shell[data-theme] .cc-quality .cc-quality-panel h3 {
  color: #18334d !important;
  opacity: 1 !important;
  font-weight: 600;
}
@media(max-width:640px) {
  html body .hq-shell[data-theme] .cc-quality .cc-quality-panel { padding:14px !important; }
}
`}</style>
    <header>
      <h2 className="text-xl font-bold">
        {tr("Call Quality", "کنترل کیفیت تماس", "د تماس کیفیت")}
      </h2>
      <p className="mt-1 text-sm opacity-70">
        {tr("Evaluations are linked to actual scoped records.", "ارزیابی به رکورد واقعی در محدودهٔ فعال وصل می‌شود.", "ارزونه له واقعي ریکارډ سره تړل کېږي.")}
      </p>
    </header>

    {error && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {notice && <p role="status" className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

    <form onSubmit={submit} className="cc-quality-panel rounded-2xl border border-slate-200 bg-white p-4 text-slate-800 shadow-sm dark:border-white/10 dark:bg-slate-900 dark:text-slate-100">
      <h3 className="mb-4 font-semibold">
        {editing ? tr("Edit evaluation", "ویرایش ارزیابی", "ارزونه سمول") : tr("New evaluation", "ارزیابی جدید", "نوې ارزونه")}
      </h3>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span>{tr("Record type", "نوع رکورد", "د ریکارډ ډول")}</span>
          <select value={kind} disabled={saving || Boolean(editing)}
            onChange={e => { setKind(e.target.value as Kind); setTarget(""); }}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-white/15 dark:bg-slate-800 dark:text-white">
            <option value="call_log">{tr("Call", "تماس", "تماس")}</option>
            <option value="ticket">{tr("Ticket", "تیکت", "ټکټ")}</option>
            <option value="follow_up">{tr("Follow-up", "پیگیری", "تعقیب")}</option>
          </select>
        </label>

        <label className="space-y-1 text-sm">
          <span>{tr("Real record", "رکورد واقعی", "ریښتینی ریکارډ")}</span>
          <select required value={target} disabled={saving || Boolean(editing)}
            onChange={e => setTarget(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-white/15 dark:bg-slate-800 dark:text-white">
            <option value="">{tr("Select a record", "رکورد را انتخاب کنید", "ریکارډ وټاکئ")}</option>
            {sources[kind].map(row =>
              <option key={String(row.id)} value={String(row.id)}>{recordLabel(row)}</option>
            )}
          </select>
        </label>

        <label className="space-y-1 text-sm">
          <span>{tr("Score (0–100)", "امتیاز (۰ تا ۱۰۰)", "نمره (۰ تر ۱۰۰)")}</span>
          <input required type="number" min="0" max="100" step="1" value={score}
            disabled={saving} onChange={e => setScore(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-white/15 dark:bg-slate-800 dark:text-white"/>
        </label>

        <label className="space-y-1 text-sm md:col-span-2">
          <span>{tr("Evaluator note", "یادداشت ارزیاب", "د ارزونکي یادښت")}</span>
          <textarea rows={3} value={note} disabled={saving}
            onChange={e => setNote(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-white/15 dark:bg-slate-800 dark:text-white"/>
        </label>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        {editing && <button type="button" disabled={saving} onClick={reset}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm dark:border-white/15">
          {tr("Cancel", "لغو", "لغوه")}
        </button>}
        <button disabled={saving || loading}
          className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {saving ? tr("Saving…", "در حال ذخیره…", "خوندي کېږي…") : tr("Save evaluation", "ذخیرهٔ ارزیابی", "ارزونه خوندي کول")}
        </button>
      </div>
    </form>

    <div className="cc-quality-panel overflow-x-auto rounded-2xl border border-slate-200 bg-white text-slate-800 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-white/10">
        <h3 className="font-semibold">{tr("Saved evaluations", "ارزیابی‌های ثبت‌شده", "ثبت شوې ارزونې")}</h3>
        <button type="button" onClick={() => void load()} disabled={loading}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-white/15">
          {tr("Refresh", "تازه‌سازی", "تازه کول")}
        </button>
      </div>
      {loading ? <p className="p-4 text-sm">{tr("Loading…", "در حال بارگذاری…", "بار کېږي…")}</p>
      : <table className="w-full min-w-[720px] text-start text-sm">
        <thead><tr className="border-b border-slate-200 text-xs opacity-70 dark:border-white/10">
          <th className="p-3">{tr("Record", "رکورد", "ریکارډ")}</th>
          <th className="p-3">{tr("Type", "نوع", "ډول")}</th>
          <th className="p-3">{tr("Score", "امتیاز", "نمره")}</th>
          <th className="p-3">{tr("Evaluator", "ارزیاب", "ارزوونکی")}</th>
          <th className="p-3">{tr("Created", "زمان ثبت", "د ثبت وخت")}</th>
          <th className="p-3">{tr("Action", "عمل", "کړنه")}</th>
        </tr></thead>
        <tbody>{rows.map(row => <tr key={String(row.id)} className="border-b border-slate-100 dark:border-white/5">
          <td className="p-3">{targetLabel(row)}</td>
          <td className="p-3">{kindLabel(row)}</td>
          <td className="p-3 font-semibold">{row.score}/100</td>
          <td className="p-3">{row.evaluator_name || "—"}</td>
          <td className="p-3" dir="ltr">{row.created_at ? new Date(row.created_at).toLocaleString() : "—"}</td>
          <td className="p-3"><button type="button" onClick={() => beginEdit(row)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs dark:border-white/15">
            {tr("Edit", "ویرایش", "سمول")}
          </button></td>
        </tr>)}
        {!rows.length && <tr><td colSpan={6} className="p-5 text-center opacity-70">
          {tr("No evaluations found in this company.", "در این شرکت ارزیابی ثبت‌شده‌ای نیست.", "په دې شرکت کې ارزونه نشته.")}
        </td></tr>}</tbody>
      </table>}
    </div>
  </section>;
}
