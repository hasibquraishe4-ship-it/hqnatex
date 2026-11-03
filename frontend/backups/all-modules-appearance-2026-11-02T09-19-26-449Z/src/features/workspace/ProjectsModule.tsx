import { getTranslation as getUiTranslation } from "../../i18n";
import { Select as SharedSelect, Pagination as SharedPagination, SecondaryButton as SharedSecondaryButton, PrimaryButton as SharedPrimaryButton, FilterBar as SharedFilterBar } from "../../components/Interface";
import { DataTable as SharedDataTable } from "../../components/DataTable";
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
  const { language } = useTranslation();
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
    <SharedSelect aria-label={getUiTranslation(language).systemPhrases.project_manager_13ac818}
      value={value} disabled={disabled || busy}
      onChange={event => onChange(event.target.value)}>
      <option value="">{getUiTranslation(language).systemPhrases.unassigned_aa84b9a}</option>
      {value && !people.some(person => person.id === value) &&
        <option value={value}>{label || getUiTranslation(language).systemPhrases.current_manager_e735f20}</option>}
      {people.map(person => <option key={person.id} value={person.id}>
        {person.name || person.email}
      </option>)}
    </SharedSelect>
    {(page > 1 || next) && <SharedPagination className="wp-picker-pages">
      <SharedSecondaryButton type="button" disabled={disabled || busy || page === 1}
        onClick={() => setPage(p => p - 1)}>{getUiTranslation(language).systemPhrases.previous_0c3d920}</SharedSecondaryButton>
      <span>{page}</span>
      <SharedSecondaryButton type="button" disabled={disabled || busy || !next}
        onClick={() => setPage(p => p + 1)}>{getUiTranslation(language).systemPhrases.next_0fec5f9}</SharedSecondaryButton>
    </SharedPagination>}
    {error && <p role="alert">{error}</p>}
  </div>;
}

export function ProjectsModule({ session, refreshToken }: { session: Session; refreshToken: number }) {
  const { language } = useTranslation();
  const tr = (en: string, fa: string, ps: string) =>
    language === "en" ? en : language === "fa" ? fa : ps;
  const statuses = [
    ["draft", getUiTranslation(language).systemPhrases.draft_aeda777],
    ["active", getUiTranslation(language).systemPhrases.active_c03b4ce],
    ["on_hold", getUiTranslation(language).systemPhrases.on_hold_f2727ac],
    ["completed", getUiTranslation(language).systemPhrases.completed_7ae807a],
    ["cancelled", getUiTranslation(language).systemPhrases.cancelled_130149c],
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
      setSaveError(getUiTranslation(language).systemPhrases.project_code_is_required_4d05223);
      return;
    }

    if (!title) {
      setSaveError(getUiTranslation(language).systemPhrases.project_title_is_required_722c2ca);
      return;
    }

    if (!Number.isFinite(budget) || budget < 0) {
      setSaveError(getUiTranslation(language).systemPhrases.budget_must_be_zero_or_greater_c6b1ddc);
      return;
    }

    if (form.starts_on && form.due_on && form.due_on < form.starts_on) {
      setSaveError(getUiTranslation(language).systemPhrases.due_date_cannot_be_before_start_date_1dd2325);
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
        <h2 className="text-xl font-bold flex-1">{getUiTranslation(language).systemPhrases.projects_54d35f1}</h2>
        <SharedPrimaryButton type="submit" className="wp-primary" onClick={() => open(null)}>
          {getUiTranslation(language).systemPhrases.new_project_4e2d0fe}
        </SharedPrimaryButton>
      </header>
      <SharedFilterBar as="form" className="wp-bar" onSubmit={event => {
        event.preventDefault(); setPage(1); setSearch(term);
      }}>
        <input aria-label={getUiTranslation(language).systemPhrases.search_0ae44a4} value={term}
          placeholder={getUiTranslation(language).systemPhrases.code_or_title_3e7426e}
          onChange={event => setTerm(event.target.value)}/>
        <SharedSelect aria-label={getUiTranslation(language).systemPhrases.status_eb2000e} value={status}
          onChange={event => { setStatus(event.target.value); setPage(1); }}>
          <option value="">{getUiTranslation(language).systemPhrases.all_statuses_ff99a53}</option>
          {statuses.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </SharedSelect>
        <SharedSecondaryButton type="submit">{getUiTranslation(language).systemPhrases.search_0ae44a4}</SharedSecondaryButton>
      </SharedFilterBar>
      {error && <p role="alert">{error}</p>}
      {busy ? <p role="status">{getUiTranslation(language).systemPhrases.loading_8ddbcf4}</p> :
        <div className="overflow-x-auto"><SharedDataTable native>
          <thead><tr>{[
            getUiTranslation(language).systemPhrases.code_a0b696d, getUiTranslation(language).systemPhrases.title_2dd5d34,
            getUiTranslation(language).systemPhrases.status_eb2000e, getUiTranslation(language).systemPhrases.manager_1b98ad6,
            getUiTranslation(language).systemPhrases.due_date_f2cabf4,
            getUiTranslation(language).systemPhrases.budget_4510f3e, getUiTranslation(language).systemPhrases.actions_b8abd9f,
          ].map(title => <th key={title}>{title}</th>)}</tr></thead>
          <tbody>{rows.map(row => <tr key={row.id}>
            <td>{row.code}</td><td>{row.title}</td>
            <td>{statuses.find(([key]) => key === row.status)?.[1] || row.status}</td>
            <td>{row.manager_name || "—"}</td><td dir="ltr">{row.due_on || "—"}</td>
            <td dir="ltr">{row.budget} {row.currency}</td>
            <td><SharedSecondaryButton type="submit" onClick={() => open(row)}>{getUiTranslation(language).systemPhrases.edit_d14efa1}</SharedSecondaryButton></td>
          </tr>)}
          {!rows.length && <tr><td colSpan={7}>{getUiTranslation(language).systemPhrases.no_projects_found_a9e1074}</td></tr>}
          </tbody>
        </SharedDataTable></div>}
      <footer className="wp-bar mt-4">
        <SharedSecondaryButton type="submit" disabled={busy || page === 1} onClick={() => setPage(p => p - 1)}>
          {getUiTranslation(language).systemPhrases.previous_0c3d920}</SharedSecondaryButton>
        <span>{getUiTranslation(language).systemPhrases.page_2b01dc5} {page} · {count}</span>
        <SharedSecondaryButton type="submit" disabled={busy || !next} onClick={() => setPage(p => p + 1)}>
          {getUiTranslation(language).systemPhrases.next_0fec5f9}</SharedSecondaryButton>
      </footer>
    </div>
    {editing && <dialog ref={dialog} onCancel={event => {
      event.preventDefault(); if (!savingRef.current) setEditing(false);
    }} aria-labelledby="wp-project-title">
      <form noValidate onSubmit={event => void save(event)}>
        <header><h3 id="wp-project-title" className="text-lg font-bold">
          {selected ? getUiTranslation(language).systemPhrases.edit_project_3a39565 :
            getUiTranslation(language).systemPhrases.new_project_4e2d0fe}
        </h3><SharedSecondaryButton type="button" disabled={saving}
          aria-label={getUiTranslation(language).systemPhrases.close_642a9e7} onClick={() => setEditing(false)}>×</SharedSecondaryButton></header>
        <div className="wp-body"><fieldset disabled={saving} className="wp-grid">
          {input("code", getUiTranslation(language).systemPhrases.project_code_b68f865, "text", true)}
          {input("title", getUiTranslation(language).systemPhrases.title_2dd5d34, "text", true)}
          <label><span>{getUiTranslation(language).systemPhrases.status_eb2000e}</span><SharedSelect value={form.status}
            onChange={event => setForm(f => ({ ...f, status: event.target.value }))}>
            {statuses.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </SharedSelect></label>
          <div><label><span>{getUiTranslation(language).systemPhrases.manager_90ae298}</span></label>
            <ManagerPicker session={session} value={form.manager}
              label={selected?.manager_name || ""} disabled={saving} tr={tr}
              onChange={manager => setForm(f => ({ ...f, manager }))}/></div>
          {input("starts_on", getUiTranslation(language).systemPhrases.start_date_9de817a, "date")}
          {input("due_on", getUiTranslation(language).systemPhrases.due_date_c5c9cb2, "date")}
          {input("budget", getUiTranslation(language).systemPhrases.budget_4510f3e, "number", true)}
          <label><span>{getUiTranslation(language).systemPhrases.currency_e5ec5ac}</span><SharedSelect value={form.currency}
            onChange={event => setForm(f => ({ ...f, currency: event.target.value }))}>
            <option value="AFN">{getUiTranslation(language).systemPhrases.afghani_afn_f0b19a0}</option>
            <option value="USD">{getUiTranslation(language).systemPhrases.dollar_usd_2568cde}</option>
          </SharedSelect></label>
          <label className="wp-wide"><span>{getUiTranslation(language).systemPhrases.description_2c75959}</span>
            <textarea rows={4} value={form.description}
              onChange={event => setForm(f => ({ ...f, description: event.target.value }))}/></label>
        </fieldset>{saveError && <p role="alert">{saveError}</p>}</div>
        <footer><SharedPrimaryButton type="submit" className="wp-primary" disabled={saving}>
          {saving ? getUiTranslation(language).systemPhrases.saving_c40420d : getUiTranslation(language).systemPhrases.save_7ae3684}
        </SharedPrimaryButton><SharedSecondaryButton type="button" disabled={saving} onClick={() => setEditing(false)}>
          {getUiTranslation(language).systemPhrases.cancel_354ef38}</SharedSecondaryButton></footer>
      </form>
    </dialog>}
  </section>;
}
