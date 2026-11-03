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
