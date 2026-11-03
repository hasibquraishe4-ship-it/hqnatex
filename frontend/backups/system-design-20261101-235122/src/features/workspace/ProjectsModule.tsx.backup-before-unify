import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { api, type Paginated, type Session } from "../../lib/api";
import { useTranslation } from "../../lib/i18n";

type Project = {
  id: string; code: string; title: string; description: string;
  status: string; manager: string | null; manager_name?: string;
  starts_on: string | null; due_on: string | null;
  budget: string; currency: string; task_count?: number; done_count?: number;
};
type Person = { id: string; name: string; email: string };
type Form = {
  code: string; title: string; description: string; status: string;
  manager: string; starts_on: string; due_on: string; budget: string; currency: string;
};
const blank: Form = {
  code: "", title: "", description: "", status: "draft", manager: "",
  starts_on: "", due_on: "", budget: "0", currency: "AFN",
};
const endpoint = "/api/v1/workspace/projects/";
const listOf = <T,>(data: T[] | Paginated<T>): T[] =>
  Array.isArray(data) ? data : data.results;
function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function ManagerPicker({ session, value, label, onChange, disabled, tr }: {
  session: Session; value: string; label: string;
  onChange: (id: string) => void; disabled: boolean;
  tr: (en: string, fa: string, ps: string) => string;
}) {
  const [page, setPage] = useState(1);
  const [people, setPeople] = useState<Person[]>([]);
  const [next, setNext] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setBusy(true); setError("");
    api<Person[] | Paginated<Person>>(
      `${endpoint}assignees/?page=${page}`, { signal: controller.signal }, session,
    ).then(data => {
      if (!active) return;
      setPeople(listOf(data));
      setNext(!Array.isArray(data) && Boolean(data.next));
    }).catch(error => { if (active) setError(errorText(error)); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; controller.abort(); };
  }, [page, session.access, session.tenantId, session.companyId]);
  return <div>
    <select aria-label={tr("Project manager", "مدیر پروژه", "د پروژې مدیر")}
      value={value} disabled={disabled || busy}
      onChange={event => onChange(event.target.value)}>
      <option value="">{tr("Unassigned", "تعیین نشده", "نه دی ټاکل شوی")}</option>
      {value && !people.some(person => person.id === value) &&
        <option value={value}>{label || tr("Current manager", "مدیر فعلی", "اوسنی مدیر")}</option>}
      {people.map(person => <option key={person.id} value={person.id}>
        {person.name || person.email}
      </option>)}
    </select>
    {(page > 1 || next) && <div className="wp-picker-pages">
      <button type="button" disabled={disabled || busy || page === 1}
        onClick={() => setPage(p => p - 1)}>{tr("Previous", "قبلی", "مخکینی")}</button>
      <span>{page}</span>
      <button type="button" disabled={disabled || busy || !next}
        onClick={() => setPage(p => p + 1)}>{tr("Next", "بعدی", "بل")}</button>
    </div>}
    {error && <p role="alert">{error}</p>}
  </div>;
}

export function ProjectsModule({ session, refreshToken }: { session: Session; refreshToken: number }) {
  const { language } = useTranslation();
  const tr = (en: string, fa: string, ps: string) =>
    language === "en" ? en : language === "fa" ? fa : ps;
  const statuses = [
    ["draft", tr("Draft", "پیش‌نویس", "مسوده")],
    ["active", tr("Active", "فعال", "فعال")],
    ["on_hold", tr("On hold", "متوقف", "ځنډول شوې")],
    ["completed", tr("Completed", "تکمیل", "بشپړه")],
    ["cancelled", tr("Cancelled", "لغو", "لغوه")],
  ];
  const [rows, setRows] = useState<Project[]>([]);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [next, setNext] = useState(false);
  const [term, setTerm] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<Project | null>(null);
  const [form, setForm] = useState<Form>({ ...blank });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const savingRef = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setBusy(true); setError(""); setRows([]);
    api<Project[] | Paginated<Project>>(
      `${endpoint}?page=${page}&search=${encodeURIComponent(search)}&status=${status}`,
      { signal: controller.signal }, session,
    ).then(data => {
      if (!active) return;
      setRows(listOf(data));
      setCount(Array.isArray(data) ? data.length : data.count);
      setNext(!Array.isArray(data) && Boolean(data.next));
    }).catch(error => { if (active) setError(errorText(error)); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; controller.abort(); };
  }, [page, search, status, version, refreshToken, session.access, session.tenantId, session.companyId]);

  useEffect(() => {
    if (!editing || !dialog.current) return;
    const panel = dialog.current;
    const focus = document.activeElement as HTMLElement | null;
    panel.showModal();
    return () => {
      if (panel.open) panel.close();
      if (focus?.isConnected) focus.focus();
    };
  }, [editing]);

  function open(row: Project | null) {
    setSelected(row); setSaveError("");
    setForm(row ? {
      code: row.code, title: row.title, description: row.description,
      status: row.status, manager: row.manager || "",
      starts_on: row.starts_on || "", due_on: row.due_on || "",
      budget: row.budget, currency: row.currency,
    } : { ...blank });
    setEditing(true);
  }
  async function save(event: FormEvent) {
    event.preventDefault();

    const code = form.code.trim();
    const title = form.title.trim();
    const budget = Number(form.budget);

    if (!code) {
      setSaveError(tr(
        "Project code is required.",
        "کد پروژه الزامی است.",
        "د پروژې کوډ اړین دی.",
      ));
      return;
    }

    if (!title) {
      setSaveError(tr(
        "Project title is required.",
        "عنوان پروژه الزامی است.",
        "د پروژې سرلیک اړین دی.",
      ));
      return;
    }

    if (!Number.isFinite(budget) || budget < 0) {
      setSaveError(tr(
        "Budget must be zero or greater.",
        "بودجه باید صفر یا بیشتر باشد.",
        "بودیجه باید صفر یا تر هغه زیاته وي.",
      ));
      return;
    }

    if (form.starts_on && form.due_on && form.due_on < form.starts_on) {
      setSaveError(tr(
        "Due date cannot be before start date.",
        "تاریخ ختم نمی‌تواند قبل از تاریخ شروع باشد.",
        "د پای نېټه د پیل له نېټې مخکې نشي کېدای.",
      ));
      return;
    }

    if (savingRef.current) return;
    savingRef.current = true; setSaving(true); setSaveError("");
    try {
      await api<Project>(selected ? `${endpoint}${selected.id}/` : endpoint, {
        method: selected ? "PATCH" : "POST",
        body: JSON.stringify({
          ...form, manager: form.manager || null,
          starts_on: form.starts_on || null, due_on: form.due_on || null,
        }),
      }, session);
      if (!alive.current) return;
      setEditing(false); setPage(1); setVersion(v => v + 1);
    } catch (error) {
      if (alive.current) setSaveError(errorText(error));
    } finally {
      savingRef.current = false;
      if (alive.current) setSaving(false);
    }
  }
  function input(key: keyof Form, title: string, type = "text", required = false) {
    return <label><span>{title}</span><input type={type} required={required}
      value={form[key]} maxLength={key === "code" ? 64 : key === "title" ? 200 : undefined}
      min={type === "number" ? "0" : key === "due_on" ? form.starts_on || undefined : undefined}
      step={type === "number" ? "0.01" : undefined}
      dir={type === "date" || type === "number" ? "ltr" : undefined}
      onChange={event => setForm(f => ({ ...f, [key]: event.target.value }))}/></label>;
  }

  return <section className="wp-projects" dir={language === "en" ? "ltr" : "rtl"}>
    <style>{`
      .wp-projects{color:#183a54}
      .wp-projects .wp-card,.wp-projects dialog{
        border:1px solid #ffffff88;border-radius:20px;
        background:rgba(235,247,255,.72);backdrop-filter:blur(22px);
        box-shadow:0 12px 40px #072c4b18;padding:20px
      }
      .wp-projects button{border:1px solid #91bddb66;border-radius:10px;padding:10px 14px;
        background:rgba(255,255,255,.5);font:inherit}
      .wp-projects button:disabled{opacity:.5}
      .wp-projects .wp-primary{background:#167deb;color:white}
      .wp-projects :is(input,select,textarea){box-sizing:border-box;width:100%;min-width:0;
        border:1px solid #91bddb88;border-radius:10px;padding:10px 12px;
        background:rgba(255,255,255,.48);color:inherit;font:inherit;font-size:16px}
      .wp-projects label>span{display:block;margin-bottom:7px;font-weight:700}
      .wp-projects .wp-bar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:16px}
      .wp-projects .wp-bar input{flex:1 1 200px;width:auto}
      .wp-projects .wp-bar select{width:auto;max-width:100%}
      .wp-projects table{width:100%;min-width:720px;border-collapse:collapse;text-align:start}
      .wp-projects :is(th,td){padding:12px;border-bottom:1px solid #91bddb44;text-align:start}
      .wp-projects dialog{position:fixed;inset:0;margin:auto;padding:0;
        width:min(960px,calc(100vw - 24px));max-width:calc(100vw - 24px);
        max-height:calc(100dvh - 24px);color:inherit;overflow:hidden}
      .wp-projects dialog::backdrop{background:#05142666;backdrop-filter:blur(4px)}
      .wp-projects dialog form{display:flex;flex-direction:column;max-height:calc(100dvh - 26px)}
      .wp-projects dialog header,.wp-projects dialog footer{display:flex;align-items:center;
        justify-content:space-between;gap:12px;padding:16px 20px;flex-shrink:0}
      .wp-projects .wp-body{overflow-y:auto;min-height:0;padding:20px}
      .wp-projects .wp-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));
        gap:18px;min-width:0;border:0;padding:0;margin:0}
      .wp-projects .wp-wide{grid-column:1/-1}
      .wp-projects .wp-picker-pages{display:flex;align-items:center;gap:8px;margin-top:8px}
      .wp-projects [role=alert]{color:#b4233a;white-space:pre-wrap;overflow-wrap:anywhere}
      .hq-shell[data-theme=dark] .wp-projects{color:#e7f4ff}
      .hq-shell[data-theme=dark] .wp-projects :is(.wp-card,dialog){background:rgba(13,39,61,.82)}
      .hq-shell[data-theme=dark] .wp-projects :is(input,select,textarea,button){background-color:#163c5988}
      .hq-shell[data-theme=dark] .wp-projects option{background:#12334d;color:#e7f4ff}
      .hq-shell[data-theme=light] .wp-projects option{background:#eff8ff;color:#183a54}
      @media(max-width:639px){.wp-projects .wp-grid{grid-template-columns:minmax(0,1fr)}
        .wp-projects .wp-card{padding:14px}.wp-projects .wp-body{padding:14px}}

      /* PROJECT_FORM_READABILITY_V1 */
      .wp-projects dialog {
        --wp-text:#183a54;
        --wp-label:#294e69;
        --wp-muted:#526c80;
        color:var(--wp-text)!important;
      }
      .hq-shell[data-theme=dark] .wp-projects dialog {
        --wp-text:#edf7ff;
        --wp-label:#d4e8f7;
        --wp-muted:#abc7dc;
      }
      .wp-projects dialog label,
      .wp-projects dialog label>span {
        color:var(--wp-label)!important;
        opacity:1!important;
        -webkit-text-fill-color:currentColor;
      }
      .wp-projects dialog label>span {
        font-size:14px;
        line-height:1.6;
        font-weight:700;
      }
      .wp-projects dialog :is(input,select,textarea) {
        color:var(--wp-text)!important;
        -webkit-text-fill-color:currentColor;
        opacity:1;
      }
      .wp-projects dialog input::placeholder,
      .wp-projects dialog textarea::placeholder {
        color:var(--wp-muted)!important;
        opacity:1;
      }
      .wp-projects dialog :is(header,footer,h3),
      .wp-projects dialog button:not(.wp-primary),
      .wp-projects dialog .wp-picker-pages {
        color:var(--wp-text)!important;
      }
      .wp-projects dialog .wp-primary {
        color:#fff!important;
      }
      .wp-projects dialog input:is([type=date],[type=number]) {
        direction:ltr;
      }
      .wp-projects dialog input[type=date] {
        color-scheme:light;
      }
      .hq-shell[data-theme=dark] .wp-projects dialog input[type=date] {
        color-scheme:dark;
      }

      /* PROJECT_MODAL_CONTENT_SIZE_V1 */
      .hq-shell {
        --wp-modal-sidebar:0px;
      }
      @media(min-width:1024px) {
        .hq-shell[data-sidebar-hidden="false"] {
          --wp-modal-sidebar:var(--hq-sidebar-width-compact-lg,236px);
        }
      }
      @media(min-width:1280px) {
        .hq-shell[data-sidebar-hidden="false"] {
          --wp-modal-sidebar:var(--hq-sidebar-width-compact-xl,248px);
        }
      }
      @media(min-width:1440px) {
        .hq-shell[data-sidebar-hidden="false"] {
          --wp-modal-sidebar:var(--hq-sidebar-width-compact-2xl,252px);
        }
      }
      .hq-shell .wp-projects dialog[open] {
        position:fixed!important;
        inset-block-start:4vh!important;
        inset-block-end:auto!important;
        inset-inline-start:calc(var(--wp-modal-sidebar) + 14px)!important;
        inset-inline-end:14px!important;
        margin:0!important;
        width:auto!important;
        max-width:none!important;
        height:min(78dvh,720px)!important;
        max-height:calc(100dvh - 40px)!important;
        box-sizing:border-box;
        overflow:hidden!important;
      }
      .hq-shell .wp-projects dialog[open] > form {
        display:flex;
        flex-direction:column;
        height:100%!important;
        max-height:100%!important;
        min-height:0;
        margin:0;
        overflow:hidden;
      }
      .hq-shell .wp-projects dialog > form > :is(header,footer) {
        flex:0 0 auto;
      }
      .hq-shell .wp-projects dialog > form > .wp-body {
        flex:1 1 0%;
        min-height:0;
        overflow-y:auto;
        overflow-x:hidden;
        overscroll-behavior:contain;
      }
      .hq-shell .wp-projects dialog .wp-grid > * {
        min-width:0;
      }
      @media(max-width:639px) {
        .hq-shell .wp-projects dialog[open] {
          inset:8px!important;
          height:calc(100dvh - 16px)!important;
          max-height:calc(100dvh - 16px)!important;
          border-radius:16px;
        }
      }

      /* PROJECT_SELECT_TEXT_V1 */
      .hq-shell .wp-projects dialog select {
        height:48px!important;
        min-height:48px!important;
        padding-block:6px!important;
        padding-inline-start:14px!important;
        padding-inline-end:36px!important;
        font-family:inherit!important;
        font-size:16px!important;
        font-weight:500!important;
        line-height:normal!important;
        text-align:start!important;
        text-indent:0!important;
        white-space:nowrap!important;
        opacity:1!important;
        appearance:auto!important;
        background-image:none!important;
        -webkit-text-fill-color:currentColor!important;
      }
      .hq-shell .wp-projects dialog select option {
        font-size:16px!important;
        font-family:inherit!important;
      }

      /* PROJECT_FILTER_TEXT_V1 */
      .hq-shell .wp-projects .wp-card > .wp-bar > select {
        height:44px!important;
        min-height:44px!important;
        min-width:170px;
        max-width:100%;
        padding-block:6px!important;
        padding-inline-start:14px!important;
        padding-inline-end:36px!important;
        font-family:inherit!important;
        font-size:16px!important;
        font-weight:500!important;
        line-height:normal!important;
        text-align:start!important;
        text-indent:0!important;
        white-space:nowrap!important;
        appearance:auto!important;
        background-image:none!important;
        color:inherit!important;
        -webkit-text-fill-color:currentColor!important;
        opacity:1!important;
      }
      .hq-shell .wp-projects .wp-card > .wp-bar > select option {
        font-family:inherit!important;
        font-size:16px!important;
      }
      @media(max-width:639px) {
        .hq-shell .wp-projects .wp-card > .wp-bar > select {
          min-width:0;
          flex:1 1 170px;
        }
      }
    `}</style>
    <div className="wp-card">
      <header className="wp-bar">
        <h2 className="text-xl font-bold flex-1">{tr("Projects", "پروژه‌ها", "پروژې")}</h2>
        <button className="wp-primary" onClick={() => open(null)}>
          {tr("New project", "پروژه جدید", "نوې پروژه")}
        </button>
      </header>
      <form className="wp-bar" onSubmit={event => {
        event.preventDefault(); setPage(1); setSearch(term);
      }}>
        <input aria-label={tr("Search", "جستجو", "لټون")} value={term}
          placeholder={tr("Code or title…", "کد یا عنوان…", "کوډ یا سرلیک…")}
          onChange={event => setTerm(event.target.value)}/>
        <select aria-label={tr("Status", "وضعیت", "حالت")} value={status}
          onChange={event => { setStatus(event.target.value); setPage(1); }}>
          <option value="">{tr("All statuses", "همه وضعیت‌ها", "ټول حالتونه")}</option>
          {statuses.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
        <button type="submit">{tr("Search", "جستجو", "لټون")}</button>
      </form>
      {error && <p role="alert">{error}</p>}
      {busy ? <p role="status">{tr("Loading…", "در حال دریافت…", "بارېږي…")}</p> :
        <div className="overflow-x-auto"><table>
          <thead><tr>{[
            tr("Code", "کد", "کوډ"), tr("Title", "عنوان", "سرلیک"),
            tr("Status", "وضعیت", "حالت"), tr("Manager", "مدیر", "مدیر"),
            tr("Due date", "مهلت", "وروستۍ نېټه"),
            tr("Budget", "بودجه", "بودیجه"), tr("Actions", "عملیات", "کړنې"),
          ].map(title => <th key={title}>{title}</th>)}</tr></thead>
          <tbody>{rows.map(row => <tr key={row.id}>
            <td>{row.code}</td><td>{row.title}</td>
            <td>{statuses.find(([key]) => key === row.status)?.[1] || row.status}</td>
            <td>{row.manager_name || "—"}</td><td dir="ltr">{row.due_on || "—"}</td>
            <td dir="ltr">{row.budget} {row.currency}</td>
            <td><button onClick={() => open(row)}>{tr("Edit", "ویرایش", "سمول")}</button></td>
          </tr>)}
          {!rows.length && <tr><td colSpan={7}>{tr("No projects found.", "پروژه‌ای یافت نشد.", "پروژه ونه موندل شوه.")}</td></tr>}
          </tbody>
        </table></div>}
      <footer className="wp-bar mt-4">
        <button disabled={busy || page === 1} onClick={() => setPage(p => p - 1)}>
          {tr("Previous", "قبلی", "مخکینی")}</button>
        <span>{tr("Page", "صفحه", "پاڼه")} {page} · {count}</span>
        <button disabled={busy || !next} onClick={() => setPage(p => p + 1)}>
          {tr("Next", "بعدی", "بل")}</button>
      </footer>
    </div>
    {editing && <dialog ref={dialog} onCancel={event => {
      event.preventDefault(); if (!savingRef.current) setEditing(false);
    }} aria-labelledby="wp-project-title">
      <form noValidate onSubmit={event => void save(event)}>
        <header><h3 id="wp-project-title" className="text-lg font-bold">
          {selected ? tr("Edit project", "ویرایش پروژه", "پروژه سمول") :
            tr("New project", "پروژه جدید", "نوې پروژه")}
        </h3><button type="button" disabled={saving}
          aria-label={tr("Close", "بستن", "تړل")} onClick={() => setEditing(false)}>×</button></header>
        <div className="wp-body"><fieldset disabled={saving} className="wp-grid">
          {input("code", tr("Project code", "کد پروژه", "د پروژې کوډ"), "text", true)}
          {input("title", tr("Title", "عنوان", "سرلیک"), "text", true)}
          <label><span>{tr("Status", "وضعیت", "حالت")}</span><select value={form.status}
            onChange={event => setForm(f => ({ ...f, status: event.target.value }))}>
            {statuses.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select></label>
          <div><label><span>{tr("Manager", "مدیر پروژه", "د پروژې مدیر")}</span></label>
            <ManagerPicker session={session} value={form.manager}
              label={selected?.manager_name || ""} disabled={saving} tr={tr}
              onChange={manager => setForm(f => ({ ...f, manager }))}/></div>
          {input("starts_on", tr("Start date", "تاریخ شروع", "د پیل نېټه"), "date")}
          {input("due_on", tr("Due date", "مهلت تکمیل", "د بشپړېدو نېټه"), "date")}
          {input("budget", tr("Budget", "بودجه", "بودیجه"), "number", true)}
          <label><span>{tr("Currency", "واحد پول", "اسعار")}</span><select value={form.currency}
            onChange={event => setForm(f => ({ ...f, currency: event.target.value }))}>
            <option value="AFN">{tr("Afghani (AFN)", "افغانی (AFN)", "افغانۍ (AFN)")}</option>
            <option value="USD">{tr("Dollar (USD)", "دالر (USD)", "ډالر (USD)")}</option>
          </select></label>
          <label className="wp-wide"><span>{tr("Description", "توضیحات", "تفصیل")}</span>
            <textarea rows={4} value={form.description}
              onChange={event => setForm(f => ({ ...f, description: event.target.value }))}/></label>
        </fieldset>{saveError && <p role="alert">{saveError}</p>}</div>
        <footer><button type="submit" className="wp-primary" disabled={saving}>
          {saving ? tr("Saving…", "در حال ذخیره…", "خوندي کېږي…") : tr("Save", "ذخیره", "خوندي کول")}
        </button><button type="button" disabled={saving} onClick={() => setEditing(false)}>
          {tr("Cancel", "لغو", "لغوه")}</button></footer>
      </form>
    </dialog>}
  </section>;
}
