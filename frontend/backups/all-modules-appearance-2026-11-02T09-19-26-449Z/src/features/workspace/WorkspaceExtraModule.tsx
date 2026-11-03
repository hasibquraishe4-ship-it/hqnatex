import { getTranslation as getUiTranslation } from "../../i18n";
import { SecondaryButton as SharedSecondaryButton, Select as SharedSelect } from "../../components/Interface";
import { DataTable as SharedDataTable } from "../../components/DataTable";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { api, workspaceReportBlob, type Session } from "../../lib/api";
import { useTranslation } from "../../lib/i18n";
import { Activity, BriefcaseBusiness, ClipboardList, FileText, FolderKanban, Mail, ShieldCheck, Timer } from "lucide-react";

export type ExtraTab =
  | "dashboard"
  | "contracts"
  | "correspondence"
  | "archive"
  | "reports"
  | "activity";

type Row = Record<string, unknown>;
type Field = {
  name: string;
  label: [string, string, string];
  type?: string;
  required?: boolean;
};

const endpoints: Record<ExtraTab, string> = {
  dashboard: "dashboard/",
  contracts: "contracts/",
  correspondence: "correspondence/",
  archive: "archive/",
  reports: "reports/",
  activity: "activity/",
};

const titles: Record<ExtraTab, [string, string, string]> = { "dashboard": [getUiTranslation("en").featureCopy.workspace_WorkspaceExtraModule.titles["dashboard"], getUiTranslation("fa").featureCopy.workspace_WorkspaceExtraModule.titles["dashboard"], getUiTranslation("ps").featureCopy.workspace_WorkspaceExtraModule.titles["dashboard"]], "contracts": [getUiTranslation("en").featureCopy.workspace_WorkspaceExtraModule.titles["contracts"], getUiTranslation("fa").featureCopy.workspace_WorkspaceExtraModule.titles["contracts"], getUiTranslation("ps").featureCopy.workspace_WorkspaceExtraModule.titles["contracts"]], "correspondence": [getUiTranslation("en").featureCopy.workspace_WorkspaceExtraModule.titles["correspondence"], getUiTranslation("fa").featureCopy.workspace_WorkspaceExtraModule.titles["correspondence"], getUiTranslation("ps").featureCopy.workspace_WorkspaceExtraModule.titles["correspondence"]], "archive": [getUiTranslation("en").featureCopy.workspace_WorkspaceExtraModule.titles["archive"], getUiTranslation("fa").featureCopy.workspace_WorkspaceExtraModule.titles["archive"], getUiTranslation("ps").featureCopy.workspace_WorkspaceExtraModule.titles["archive"]], "reports": [getUiTranslation("en").featureCopy.workspace_WorkspaceExtraModule.titles["reports"], getUiTranslation("fa").featureCopy.workspace_WorkspaceExtraModule.titles["reports"], getUiTranslation("ps").featureCopy.workspace_WorkspaceExtraModule.titles["reports"]], "activity": [getUiTranslation("en").featureCopy.workspace_WorkspaceExtraModule.titles["activity"], getUiTranslation("fa").featureCopy.workspace_WorkspaceExtraModule.titles["activity"], getUiTranslation("ps").featureCopy.workspace_WorkspaceExtraModule.titles["activity"]] };

const contractFields: Field[] = [
  { name: "contract_number", label: ["Contract number", "شماره قرارداد", "د قرارداد شمېره"], required: true },
  { name: "title", label: ["Title", "عنوان", "سرلیک"], required: true },
  { name: "party_type", label: ["Party type", "طرف قرارداد", "د قرارداد لوری"], type: "select", required: true },
  { name: "customer", label: ["Customer ID", "شناسه مشتری", "د پېرودونکي پېژند"] },
  { name: "supplier", label: ["Supplier ID", "شناسه تأمین‌کننده", "د عرضه‌کوونکي پېژند"] },
  { name: "employee", label: ["Employee ID", "شناسه کارمند", "د کارکوونکي پېژند"] },
  { name: "partner", label: ["Partner ID", "شناسه شریک", "د شریک پېژند"] },
  { name: "project", label: ["Project ID", "شناسه پروژه", "د پروژې پېژند"] },
  { name: "starts_on", label: ["Start date", "تاریخ شروع", "د پیل نېټه"], type: "date" },
  { name: "ends_on", label: ["End date", "تاریخ ختم", "د پای نېټه"], type: "date" },
  { name: "amount", label: ["Amount", "مبلغ", "مبلغ"], type: "number", required: true },
  { name: "currency", label: ["Currency", "واحد پول", "پولي واحد"], type: "select", required: true },
  { name: "status", label: ["Status", "وضعیت", "حالت"], type: "select", required: true },
  { name: "notes", label: ["Notes", "یادداشت", "یادښتونه"] },
];

const correspondenceFields: Field[] = [
  { name: "direction", label: ["Direction", "نوع مکتوب", "د لیک ډول"], type: "select", required: true },
  { name: "letter_number", label: ["Letter number", "شماره مکتوب", "د لیک شمېره"], required: true },
  { name: "reference_number", label: ["Reference number", "شماره مرجع", "د مرجع شمېره"] },
  { name: "subject", label: ["Subject", "موضوع", "موضوع"], required: true },
  { name: "sender", label: ["Sender", "فرستنده", "لېږونکی"] },
  { name: "recipient", label: ["Recipient", "گیرنده", "اخیستونکی"] },
  { name: "correspondence_date", label: ["Date", "تاریخ", "نېټه"], type: "date", required: true },
  { name: "document", label: ["Document ID", "شناسه سند ضمیمه", "د ضمیمه سند پېژند"] },
  { name: "notes", label: ["Notes", "یادداشت", "یادښتونه"] },
];

function recordsOf(value: unknown): Row[] {
  if (Array.isArray(value)) return value as Row[];
  if (!value || typeof value !== "object") return [];
  const obj = value as Record<string, unknown>;
  if (Array.isArray(obj.results)) return obj.results as Row[];
  const metrics =
    obj.summary && typeof obj.summary === "object"
      ? obj.summary as Record<string, unknown>
      : obj;
  return Object.entries(metrics).map(([key, item]) => ({
    id: key,
    metric: key,
    value: item,
  }));
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function WorkspaceExtraModule({
  session,
  tab,
  refreshToken,
}: {
  session: Session;
  tab: ExtraTab;
  refreshToken: number;
}) {
  const { language } = useTranslation();
  const lang = language === "fa" ? 1 : language === "ps" ? 2 : 0;
  const tr = (values: [string, string, string]) => values[lang];
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [version, setVersion] = useState(0);
  const [exportType, setExportType] = useState("projects");
  const [exportBusy, setExportBusy] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const formDialog = useRef<HTMLDialogElement>(null);
  const [searchTerm,setSearchTerm]=useState("");

  const fields = tab === "contracts"
    ? contractFields
    : tab === "correspondence"
      ? correspondenceFields
      : [];

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setBusy(true);
    setError("");
    api<unknown>(
      `/api/v1/workspace/${endpoints[tab]}?page=1`,
      { signal: controller.signal },
      session,
    )
      .then((data) => {
        if (active) setRows(recordsOf(data));
      })
      .catch((err) => {
        if (active) setError(errorText(err));
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [tab, version, refreshToken, session.access, session.tenantId, session.companyId]);

  const columns = useMemo(() => {
    const first = rows[0];
    if (!first) return [];
    return Object.keys(first).filter((key) =>
      !["tenant", "company", "metadata"].includes(key)
    );
  }, [rows]);

  function editRecord(row: Row) {
    const next: Record<string, string> = {};
    for (const field of fields) {
      const value = row[field.name];
      if (value && typeof value === "object" && "id" in value) {
        next[field.name] = String((value as { id: unknown }).id);
      } else {
        next[field.name] = value == null ? "" : String(value);
      }
    }
    setForm(next);
    setEditingId(String(row.id));
    setError("");
    setNotice("");
    formDialog.current?.showModal();
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const payload: Record<string, unknown> = { ...form };
      for (const key of ["amount", "customer", "supplier", "employee", "partner", "project", "document"]) {
        if (key in payload) {
          const value = String(payload[key] ?? "").trim();
          payload[key] = value === "" ? null : key === "amount" ? Number(value) : value;
        }
      }
      const url =
        `/api/v1/workspace/${endpoints[tab]}` +
        (editingId ? `${encodeURIComponent(editingId)}/` : "");
      await api(
        url,
        { method: editingId ? "PATCH" : "POST", body: JSON.stringify(payload) },
        session,
      );
      setForm({});
      setEditingId(null);
      formDialog.current?.close();
      setNotice(getUiTranslation(language).systemPhrases.saved_successfully_a6625de);
      setVersion((value) => value + 1);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  }

  function exportCsv() {
    const lines = [
      columns.map((key) => `"${key.replaceAll('"', '""')}"`).join(","),
      ...rows.map((row) =>
        columns.map((key) => {
          const value = row[key] == null ? "" : String(row[key]);
          return `"${value.replaceAll('"', '""')}"`;
        }).join(",")
      ),
    ];
    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `workspace-${tab}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function downloadReport() {
    setExportBusy(true);
    setError("");
    try {
      const blob = await workspaceReportBlob(exportType, session);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `workspace-${exportType}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setExportBusy(false);
    }
  }

  const dashboardMetricDefinitions = [
    { key: "active_projects", label: ["Active projects", "پروژه‌های فعال", "فعال پروژې"], Icon: FolderKanban },
    { key: "open_tasks", label: ["Open tasks", "وظایف باز", "پرانیستې دندې"], Icon: ClipboardList },
    { key: "overdue_tasks", label: ["Overdue tasks", "وظایف تأخیری", "ځنډېدلې دندې"], Icon: Timer },
    { key: "new_documents", label: ["New documents", "اسناد جدید", "نوي اسناد"], Icon: FileText },
    { key: "documents_expiring_soon", label: ["Documents expiring soon", "اسناد نزدیک به انقضا", "ژر پایېدونکي اسناد"], Icon: ShieldCheck },
    { key: "active_contracts", label: ["Active contracts", "قراردادهای فعال", "فعال قراردادونه"], Icon: BriefcaseBusiness },
    { key: "open_correspondence", label: ["Open correspondence", "مکاتبات باز", "پرانیستې مکاتبات"], Icon: Mail },
  ];
  const dashboardCards = dashboardMetricDefinitions.map((metric) => ({
    ...metric,
    value: rows.find((row) => row.metric === metric.key)?.value ?? 0,
  }));
  const activityValue = rows.find((row) => row.metric === "recent_activity")?.value;
  const recentActivities: Row[] = Array.isArray(activityValue) ? activityValue as Row[] : [];

  return (
    <section className="ws-extra">
      <style>{`
        .ws-extra{display:grid;gap:16px;min-width:0}

        /* WORKSPACE_TEXT_READABILITY_V1 */
        .ws-extra{color:#183a54}
        .ws-extra :is(h2,label,label>span,th,td,summary,p,small){
          color:#24445d!important;
          opacity:1!important;
          -webkit-text-fill-color:currentColor!important;
        }
        .ws-extra-form label>span{
          color:#183a54!important;
          font-weight:700;
        }
        .hq-shell[data-theme=dark] .ws-extra{
          color:#e7f4ff;
        }
        .hq-shell[data-theme=dark] .ws-extra
        :is(h2,label,label>span,th,td,summary,p,small){
          color:#d9eafa!important;
          opacity:1!important;
          -webkit-text-fill-color:currentColor!important;
        }

        .ws-extra-card{min-width:0;padding:20px;border:1px solid #ffffff88;
          border-radius:20px;background:rgba(235,247,255,.72);
          backdrop-filter:blur(22px);box-shadow:0 12px 40px #072c4b18}
        .ws-extra h2{margin:0 0 14px;font-size:20px;font-weight:800}
        .ws-extra-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
        .ws-extra-form label{display:grid;gap:6px;min-width:0;font-weight:700}
        .ws-extra-form label:has(textarea){grid-column:1/-1}
        .ws-extra :is(input,select,textarea){box-sizing:border-box;width:100%;min-width:0;
          min-height:44px;padding:10px 12px;border:1px solid #91bddb88;
          border-radius:10px;background:rgba(255,255,255,.55);color:inherit;font:inherit}
        .ws-extra textarea{min-height:90px}
        .ws-extra-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
        .ws-extra-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
        .ws-extra-dialog{position:fixed;margin:auto;padding:0;width:min(900px,calc(100vw - 24px));
          max-width:calc(100vw - 24px);max-height:calc(100dvh - 24px);overflow:hidden;
          border:1px solid #ffffff88;border-radius:18px;background:rgba(235,247,255,.96);color:#183a54}
        .ws-extra-dialog::backdrop{background:#071b2dcc;backdrop-filter:blur(4px)}
        .ws-extra-dialog-form{display:flex;flex-direction:column;max-height:calc(100dvh - 24px)}
        .ws-extra-dialog-header,.ws-extra-dialog-footer{display:flex;align-items:center;justify-content:space-between;
          gap:12px;padding:14px 18px;flex:0 0 auto;border-bottom:1px solid #91bddb55}
        .ws-extra-dialog-footer{border-top:1px solid #91bddb55;border-bottom:0;justify-content:flex-start}
        .ws-extra-dialog-body{overflow:auto;min-height:0;padding:18px}
        .hq-shell[data-theme=dark] .ws-extra-dialog{background:#102d45;color:#e7f4ff}
        @media(max-width:639px){.ws-extra-dialog{width:calc(100vw - 16px);max-width:calc(100vw - 16px)}
          .ws-extra-dialog-body{padding:14px}}
        .ws-extra button{padding:9px 14px;border:1px solid #91bddb66;border-radius:10px;
          background:rgba(255,255,255,.56);color:inherit;font:inherit;cursor:pointer}
        .ws-extra button:disabled{opacity:.55;cursor:default}
        .ws-extra .ws-primary{background:#167deb;color:white}
        .ws-extra-scroll{max-width:100%;overflow:auto}
        .ws-extra table{width:100%;min-width:680px;border-collapse:collapse;text-align:start}
        .ws-extra th,.ws-extra td{padding:11px;border-bottom:1px solid #91bddb44;text-align:start;
          vertical-align:top;overflow-wrap:anywhere}
        .ws-extra th{font-weight:800}
        .ws-extra [role=alert]{color:#b4233a;overflow-wrap:anywhere}
        .ws-extra [role=status]{color:#087c58}
        .hq-shell[data-theme=dark] .ws-extra-card{background:rgba(13,39,61,.82);color:#e7f4ff}
        .hq-shell[data-theme=dark] .ws-extra :is(input,select,textarea,button){
          background-color:#163c5988;color:#e7f4ff}
        .ws-dashboard-grid{
          display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:14px
        }
        .ws-dashboard-tile{
          display:flex;direction:ltr;align-items:center;gap:14px;min-width:0;min-height:88px;
          box-sizing:border-box;padding:14px 16px;border:1px solid rgba(106,190,222,.42);
          border-radius:18px;background:linear-gradient(115deg,rgba(255,255,255,.92),rgba(220,241,250,.82));
          box-shadow:0 8px 24px rgba(15,74,104,.11);backdrop-filter:blur(16px)
        }
        .ws-dashboard-icon{
          display:grid;place-items:center;width:42px;height:42px;flex:0 0 42px;
          border:1px solid rgba(51,198,220,.42);border-radius:14px;
          background:rgba(61,211,229,.14);color:#05a9c5
        }
        .ws-dashboard-copy{display:grid;flex:1;min-width:0;gap:2px;text-align:end}
        .ws-dashboard-title{color:#526b80;font-size:13px;font-weight:750;line-height:1.4}
        .ws-dashboard-value{color:#183a54;font-size:19px;font-weight:850;line-height:1.25}
        .ws-dashboard-caption{color:#70889a;font-size:11px;line-height:1.4}
        .ws-dashboard-activity{margin-top:22px}
        .ws-dashboard-activity h3{margin:0 0 10px;font-size:16px;font-weight:800}
        .ws-dashboard-activity-list{display:grid;gap:8px}
        .ws-dashboard-activity-item{
          display:flex;align-items:center;gap:10px;min-width:0;padding:10px 12px;
          border:1px solid rgba(106,190,222,.30);border-radius:14px;
          background:rgba(255,255,255,.48)
        }
        .ws-dashboard-activity-item > div{display:grid;flex:1;min-width:0;gap:2px}
        .ws-dashboard-activity-item small{overflow-wrap:anywhere;color:#70889a}
        .hq-shell[data-theme=dark] .ws-dashboard-tile{
          border-color:rgba(112,196,226,.32);
          background:linear-gradient(115deg,rgba(20,54,77,.94),rgba(16,43,64,.86))
        }
        .hq-shell[data-theme=dark] .ws-dashboard-title,
        .hq-shell[data-theme=dark] .ws-dashboard-value{color:#e7f4ff}
        .hq-shell[data-theme=dark] .ws-dashboard-caption,
        .hq-shell[data-theme=dark] .ws-dashboard-activity-item small{color:#b5cad9}
        .hq-shell[data-theme=dark] .ws-dashboard-activity-item{
          border-color:rgba(112,196,226,.25);background:rgba(18,49,72,.68)
        }
        @media(max-width:767px){
          .ws-dashboard-grid{grid-template-columns:minmax(0,1fr)}
        }
        @media(max-width:639px){
          .ws-extra-card{padding:14px}
          .ws-extra-form{grid-template-columns:minmax(0,1fr)}
          .ws-extra-form label:has(textarea){grid-column:auto}
        }
        @media print{
          .ws-extra-actions,.ws-extra-form{display:none!important}
          .ws-extra-card{box-shadow:none;background:white;border:0}
        }
      `}</style>

      <div className="ws-extra-card">
        <div className="ws-extra-heading">
          <h2>{tr(titles[tab])}</h2>
          {(tab === "contracts" || tab === "correspondence") && (
            <SharedSecondaryButton type="button" className="ws-primary" onClick={()=>{
              setEditingId(null);
              setForm(Object.fromEntries(fields.map(field=>[field.name,""])));
              setError(""); setNotice(""); formDialog.current?.showModal();
            }}>{getUiTranslation(language).systemPhrases.add_record_416127e}</SharedSecondaryButton>
          )}
        </div>

        {(tab === "contracts" || tab === "correspondence") && (
          <dialog ref={formDialog} className="ws-extra-dialog" onCancel={event=>{
            event.preventDefault(); if(!saving)formDialog.current?.close();
          }}>
            <form className="ws-extra-dialog-form" onSubmit={save}>
              <header className="ws-extra-dialog-header">
                <h3>{tr(editingId
                  ? ["Edit record","ویرایش مورد","ریکارډ سمول"]
                  : ["Add record","ثبت مورد جدید","نوی ریکارډ ثبتول"])}</h3>
                <SharedSecondaryButton type="button" disabled={saving} aria-label="Close"
                  onClick={()=>formDialog.current?.close()}>×</SharedSecondaryButton>
              </header>
              <div className="ws-extra-form ws-extra-dialog-body">
              {fields.map((field) => (
                <label key={field.name}>
                  <span>{tr(field.label)}</span>
                  {field.type === "select" ? (
                    <SharedSelect
                      required={field.required}
                      value={form[field.name] ?? ""}
                      onChange={(event) => setForm({ ...form, [field.name]: event.target.value })}
                    >
                      <option value="">{getUiTranslation(language).systemPhrases.select_afbb5fa}</option>
                      {(field.name === "party_type"
                        ? ["customer", "supplier", "employee", "partner"]
                        : field.name === "currency"
                          ? ["AFN", "USD"]
                          : field.name === "status"
                            ? ["draft", "active", "expired", "terminated", "archived"]
                            : ["incoming", "outgoing"]
                      ).map((value) => <option key={value} value={value}>{value}</option>)}
                    </SharedSelect>
                  ) : field.name === "notes" ? (
                    <textarea
                      value={form[field.name] ?? ""}
                      onChange={(event) => setForm({ ...form, [field.name]: event.target.value })}
                    />
                  ) : (
                    <input
                      type={field.type ?? "text"}
                      required={field.required}
                      value={form[field.name] ?? ""}
                      onChange={(event) => setForm({ ...form, [field.name]: event.target.value })}
                    />
                  )}
                </label>
              ))}
              </div><footer className="ws-extra-dialog-footer">
                <SharedSecondaryButton className="ws-primary" disabled={saving} type="submit">
                  {saving
                    ? getUiTranslation(language).systemPhrases.saving_c40420d
                    : getUiTranslation(language).systemPhrases.save_7ae3684}
                </SharedSecondaryButton>
                {editingId && (
                  <SharedSecondaryButton
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setEditingId(null);
                      setForm({});
                      formDialog.current?.close();
                    }}
                  >
                    {getUiTranslation(language).systemPhrases.cancel_edit_a8d7e5e}
                  </SharedSecondaryButton>
                )}
              </footer>
            </form>
          </dialog>
        )}

        <div className="ws-extra-actions">
          {(tab === "contracts" || tab === "correspondence" || tab === "archive" || tab === "activity") && (
            <input type="search" value={searchTerm}
              aria-label={getUiTranslation(language).systemPhrases.search_records_f702dc4}
              placeholder={getUiTranslation(language).systemPhrases.search_08408e6}
              onChange={event=>setSearchTerm(event.target.value)} />
          )}
          {tab === "reports" && (
            <>
              <SharedSelect
                aria-label={getUiTranslation(language).systemPhrases.report_type_491ccb0}
                value={exportType}
                onChange={(event) => setExportType(event.target.value)}
              >
                <option value="projects">Projects / پروژه‌ها</option>
                <option value="tasks">Tasks / وظایف</option>
                <option value="documents">Documents / اسناد</option>
                <option value="contracts">Contracts / قراردادها</option>
                <option value="correspondence">Correspondence / مکاتبات</option>
              </SharedSelect>
              <SharedSecondaryButton type="button" disabled={exportBusy} onClick={() => void downloadReport()}>
                {exportBusy
                  ? getUiTranslation(language).systemPhrases.preparing_d610699
                  : "Excel / CSV"}
              </SharedSecondaryButton>
              <SharedSecondaryButton type="button" onClick={() => window.print()}>PDF / Print</SharedSecondaryButton>
            </>
          )}
          {tab === "archive" && (
            <>
              <SharedSecondaryButton type="button" disabled={!rows.length} onClick={exportCsv}>Excel / CSV</SharedSecondaryButton>
              <SharedSecondaryButton type="button" onClick={() => window.print()}>PDF / Print</SharedSecondaryButton>
            </>
          )}
        </div>

        {notice && <p role="status">{notice}</p>}
        {error && <p role="alert">{error}</p>}
        {tab === "dashboard" ? (
          busy ? (
            <p>{getUiTranslation(language).systemPhrases.loading_7632961}</p>
          ) : rows.length === 0 ? (
            <p>{getUiTranslation(language).systemPhrases.no_dashboard_data_found_1b134d1}</p>
          ) : (
            <div className="ws-dashboard">
              <div className="ws-dashboard-grid">
                {dashboardCards.map(({ key, label, value, Icon }) => (
                  <article className="ws-dashboard-tile" key={key}>
                    <span className="ws-dashboard-icon" aria-hidden="true">
                      <Icon size={21} strokeWidth={1.8} />
                    </span>
                    <div className="ws-dashboard-copy" dir={language === "en" ? "ltr" : "rtl"}>
                      <span className="ws-dashboard-title">
                        {tr(label as [string, string, string])}
                      </span>
                      <strong className="ws-dashboard-value">
                        {typeof value === "number" ? value : String(value ?? 0)}
                      </strong>
                      <small className="ws-dashboard-caption">
                        {getUiTranslation(language).systemPhrases.live_backend_data_9e3f449}
                      </small>
                    </div>
                  </article>
                ))}
              </div>
              {recentActivities.length > 0 && (
                <section className="ws-dashboard-activity">
                  <h3>{getUiTranslation(language).systemPhrases.recent_activity_64dc244}</h3>
                  <div className="ws-dashboard-activity-list">
                    {recentActivities.map((item, index) => (
                      <article className="ws-dashboard-activity-item" key={String(item.id ?? index)}>
                        <Activity size={18} aria-hidden="true" />
                        <div dir={language === "en" ? "ltr" : "rtl"}>
                          <strong>{String(item.actor || "—")}</strong>
                          <small>{String(item.action || item.object_type || "—")}</small>
                        </div>
                        <small>{String(item.created_at || "")}</small>
                      </article>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )
        ) : busy ? (
          <p>{getUiTranslation(language).systemPhrases.loading_7632961}</p>
        ) : rows.filter(row=>JSON.stringify(row).toLowerCase().includes(searchTerm.trim().toLowerCase())).length === 0 ? (
          <p>{getUiTranslation(language).systemPhrases.no_records_found_cce7c69}</p>
        ) : (
          <div className="ws-extra-scroll">
            <SharedDataTable native>
              <thead>
                <tr>
                  {columns.map((key) => <th key={key}>{key}</th>)}
                  {(tab === "contracts" || tab === "correspondence") && (
                    <th>{getUiTranslation(language).systemPhrases.actions_b8abd9f}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.filter(row=>JSON.stringify(row).toLowerCase().includes(searchTerm.trim().toLowerCase())).map((row, index) => (
                  <tr key={String(row.id ?? index)}>
                    {columns.map((key) => (
                      <td key={key}>
                        {row[key] && typeof row[key] === "object"
                          ? JSON.stringify(row[key])
                          : String(row[key] ?? "—")}
                      </td>
                    ))}
                    {(tab === "contracts" || tab === "correspondence") && (
                      <td>
                        <SharedSecondaryButton type="button" onClick={() => editRecord(row)}>
                          {getUiTranslation(language).systemPhrases.edit_d14efa1}
                        </SharedSecondaryButton>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </SharedDataTable>
          </div>
        )}
      </div>
    </section>
  );
}
