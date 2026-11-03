import { CallCenterSupervisor } from "./CallCenterSupervisor";
import { CallCenterReports } from "./CallCenterReports";
import { CallCenterQuality } from "./CallCenterQuality";
import { CallCenterAgents } from "./CallCenterAgents";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { FormEvent } from "react";
import { Headphones, Plus, RefreshCcw, Search, X, Save, Pencil, Eye, Loader2, LayoutDashboard, PhoneCall, Ticket, Clock, Users, ShieldAlert, BarChart3, CheckSquare, Settings, ArrowLeft, ArrowRight } from "lucide-react";
import { api, type Paginated, type Session } from "../../lib/api";
import { useTranslation } from "../../lib/i18n";
import { CallCenterSettings } from "./CallCenterSettings";
import { CustomerFollowUps } from "./CallCenterFollowUps";

type Row = Record<string, unknown>;
type Lang = "en" | "fa" | "ps";
type Form = Record<string, string>;

function rowsOf(data: Row[] | Paginated<Row>) {
  return Array.isArray(data) ? data : data.results;
}
function message(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
function label(row: Row) {
  if (row.ticket_number) {
    return [row.ticket_number, row.subject]
      .filter(Boolean).join(" — ");
  }
  return [row.code, row.display_name || row.identifier || row.name_english]
    .filter(Boolean).join(" — ") || String(row.id);
}

function Lookup({session, endpoint, value, selectedLabel, onSelect, disabled, customer, language}: {
  session: Session; endpoint: string; value: string; selectedLabel: string;
  onSelect: (row: Row | null) => void;
  disabled: boolean; customer?: string; language: Lang;
}) {
  const tr = (en: string, fa: string, ps: string) =>
    language === "en" ? en : language === "fa" ? fa : ps;
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Row[]>([]);
  const [next, setNext] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [term, setTerm] = useState("");
  const sessionKey = JSON.stringify([session?.tenantId, session?.companyId, session?.access]);

  useEffect(() => {
    if (!session) return;
    let active = true;
    const controller = new AbortController();
    setBusy(true); setError(""); setData([]);
    api<Row[] | Paginated<Row>>(`${endpoint}?page=${page}`, {signal:controller.signal}, session)
      .then(result => {
        if (!active) return;
        setData(rowsOf(result));
        setNext(!Array.isArray(result) && Boolean(result.next));
      })
      .catch(err => { if (active) setError(message(err)); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; controller.abort(); };
  }, [endpoint, page, sessionKey]);

  const available = data.filter(row =>
    (!customer || String(row.customer) === customer)
    && label(row).toLocaleLowerCase().includes(term.toLocaleLowerCase())
  );

  return <div className="cc-lookup">
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs">{selectedLabel || value || "—"}</span>
      <button type="button" disabled={disabled} onClick={()=>onSelect(null)}>
        {tr("Clear","پاک کردن","پاکول")}
      </button>
    </div>
    <input aria-label={tr("Search this page","جستجو در همین صفحه","په دې پاڼه کې لټون")}
      placeholder={tr("Search this page","جستجو در همین صفحه","په دې پاڼه کې لټون")}
      value={term} disabled={disabled} onChange={e=>setTerm(e.target.value)}/>
    {error && <p role="alert" className="cc-error">{error}</p>}
    {busy ? <Loader2 className="h-4 w-4 animate-spin"/> :
      <div className="cc-options">
        {available.map(row=><button type="button" key={String(row.id)}
          disabled={disabled} aria-pressed={value===String(row.id)}
          onClick={()=>onSelect(row)}>{label(row)}</button>)}
        {!available.length && <p className="text-xs p-2">{tr("No matching records on this page","در این صفحه موردی یافت نشد","په دې پاڼه کې پایله نشته")}</p>}
      </div>}
    <div className="flex items-center justify-between gap-2 text-xs">
      <button type="button" disabled={disabled || busy || page===1} onClick={()=>setPage(p=>p-1)}>‹</button>
      <span>{tr("Page","صفحه","پاڼه")} {page}</span>
      <button type="button" disabled={disabled || busy || !next} onClick={()=>setPage(p=>p+1)}>›</button>
    </div>
  </div>;
}



// HQNATEX_TICKET_TIMELINE_FRONTEND_V1
type TicketEvent = {
  id: string;
  action: string;
  created_at: string;
  actor_id: string | null;
  actor_email: string | null;
  changes: Record<string, {old: unknown; new: unknown}>;
  initial: Record<string, unknown>;
  change_details_recorded: boolean;
};

function TicketTimeline({session,ticketId,language}: {
  session: Session; ticketId: string; language: Lang;
}) {
  const tr = (en:string,fa:string,ps:string) =>
    language==="en"?en:language==="fa"?fa:ps;
  const [page,setPage]=useState(1);
  const [version,setVersion]=useState(0);
  const [state,setState]=useState<{
    events:TicketEvent[]; next:boolean; count:number;
    busy:boolean; error:string;
  }>({events:[],next:false,count:0,busy:true,error:""});

  useEffect(()=>{
    let active=true;
    const controller=new AbortController();
    setState({events:[],next:false,count:0,busy:true,error:""});
    api<Paginated<TicketEvent>>(
      `/api/v1/customer-tickets/${encodeURIComponent(ticketId)}/timeline/?page=${page}`,
      {signal:controller.signal},session,
    ).then(data=>{
      if(!active)return;
      setState({
        events:data.results,next:Boolean(data.next),
        count:data.count,busy:false,error:"",
      });
    }).catch(error=>{
      if(active)setState({
        events:[],next:false,count:0,busy:false,error:message(error),
      });
    });
    return()=>{active=false;controller.abort();};
  },[ticketId,session.tenantId,session.companyId,session.access,page,version]);

  const fieldNames:Record<string,string>={
    subject:tr("Subject","موضوع","موضوع"),
    category:tr("Category","دسته‌بندی","ډول"),
    priority:tr("Priority","اولویت","لومړیتوب"),
    status:tr("Status","وضعیت","حالت"),
    assigned_team:tr("Assigned team","تیم مسئول","مسئول ټیم"),
    assigned_user:tr("Assignee","نام مسئول","د مسئول نوم"),
    description:tr("Description","شرح مشکل","تشریح"),
    resolution:tr("Resolution","نتیجه رسیدگی","د حل پایله"),
    notes:tr("Notes","یادداشت","یادښت"),
    opened_at:tr("Opened at","زمان بازشدن","د پرانیستلو وخت"),
    closed_at:tr("Closed at","زمان بسته‌شدن","د تړلو وخت"),
  };
  const values:Record<string,Record<string,string>>={
    status:{
      open:tr("Open","باز","پرانیستی"),
      in_progress:tr("In progress","در حال رسیدگی","تر کار لاندې"),
      resolved:tr("Resolved","حل‌شده","حل شوی"),
      closed:tr("Closed","بسته","تړل شوی"),
      cancelled:tr("Cancelled","لغوشده","لغوه شوی"),
    },
    priority:{
      low:tr("Low","کم","ټیټ"),
      medium:tr("Medium","متوسط","منځنی"),
      high:tr("High","زیاد","لوړ"),
      urgent:tr("Urgent","فوری","بیړنی"),
    },
    category:{
      technical:tr("Technical issue","مشکل تخنیکی","تخنیکي ستونزه"),
      billing:tr("Billing & payment","بل و پرداخت","بل او تادیه"),
      service_request:tr("Service request","درخواست خدمت","د خدمت غوښتنه"),
      complaint:tr("Complaint","شکایت","شکایت"),
      inquiry:tr("General inquiry","پرسش عمومی","عمومي پوښتنه"),
    },
  };
  function date(value:string) {
    const parsed=new Date(value);
    return Number.isNaN(parsed.getTime())?value:
      parsed.toLocaleString(
        language==="en"?"en-GB":language==="fa"?"fa-AF":"ps-AF",
        {calendar:"gregory"},
      );
  }
  function display(key:string,value:unknown):string {
    if(value===null||value===undefined||value==="")return "—";
    const text=String(value);
    if(key==="opened_at"||key==="closed_at")return date(text);
    return values[key]?.[text]||text;
  }

  return <section className="cc-timeline" aria-busy={state.busy}
    aria-label={tr("Ticket history","تاریخچه تیکت","د ټکټ تاریخچه")}>
    <style>{`
      .hq-callcenter .cc-timeline{
        margin-top:28px;padding-top:22px;
        border-top:1px solid rgba(100,173,225,.3);min-width:0
      }
      .hq-callcenter .cc-timeline-bar{
        display:flex;align-items:center;justify-content:space-between;
        flex-wrap:wrap;gap:12px;margin-bottom:18px
      }
      .hq-callcenter .cc-timeline-list{
        display:grid;gap:14px;list-style:none;padding:0;margin:0
      }
      .hq-callcenter .cc-timeline-event{
        border:1px solid rgba(100,173,225,.3);border-radius:14px;
        padding:16px;background:rgba(255,255,255,.16);
        overflow-wrap:anywhere;min-width:0
      }
      .hq-callcenter .cc-timeline-meta{
        display:flex;flex-wrap:wrap;gap:8px 16px;
        font-size:12px;margin-top:8px;opacity:.85
      }
      .hq-callcenter .cc-timeline-changes{
        display:grid;gap:12px;margin-top:16px;font-size:13px
      }
      .hq-callcenter .cc-timeline-values{
        display:grid;grid-template-columns:repeat(2,minmax(0,1fr));
        gap:10px;margin-top:6px
      }
      .hq-callcenter .cc-timeline-value{
        padding:10px;border-radius:9px;
        background:rgba(100,173,225,.1);min-width:0;
        white-space:pre-wrap;overflow-wrap:anywhere
      }
      @media(max-width:639px){
        .hq-callcenter .cc-timeline-values{grid-template-columns:minmax(0,1fr)}
      }
    `}</style>
    <div className="cc-timeline-bar">
      <h3 className="font-black">
        {tr("Ticket history","تاریخچه تیکت","د ټکټ تاریخچه")}
      </h3>
      <button type="button" disabled={state.busy}
        onClick={()=>setVersion(v=>v+1)}>
        <RefreshCcw className="h-4 w-4"/>
        {tr("Refresh history","تازه‌سازی تاریخچه","تاریخچه تازه کول")}
      </button>
    </div>
    {state.busy?<p role="status" className="text-sm">
      {tr("Loading history…","در حال دریافت تاریخچه…","تاریخچه ترلاسه کېږي…")}
    </p>:state.error?<p role="alert" className="cc-error">{state.error}</p>:<>
      {!state.events.length&&<p className="text-sm">
        {tr("No events on this page.","در این صفحه رویدادی ثبت نشده است.","په دې پاڼه کې پېښه نشته.")}
      </p>}
      <ol className="cc-timeline-list">
        {state.events.map(event=><li className="cc-timeline-event" key={event.id}>
          <strong className="text-sm">
            {event.action==="create_ticket"
              ?tr("Ticket created","تیکت ایجاد شد","ټکټ جوړ شو")
              :event.action==="update"
                ?tr("Ticket updated","تیکت ویرایش شد","ټکټ بدل شو")
                :event.action}
          </strong>
          <div className="cc-timeline-meta">
            <time dateTime={event.created_at}>{date(event.created_at)}</time>
            <bdi>{event.actor_email||tr("Actor unavailable","ثبت‌کننده موجود نیست","ثبتوونکی نشته")}</bdi>
          </div>
          {!event.change_details_recorded&&<p className="text-xs mt-3">
            {tr(
              "Detailed changes were not recorded for this older event.",
              "جزئیات تغییرات برای این رویداد قدیمی ثبت نشده است.",
              "د دې پخوانۍ پېښې د بدلون جزییات نه دي ثبت شوي.",
            )}
          </p>}
          <div className="cc-timeline-changes">
            {Object.entries(event.initial||{}).map(([key,value])=>
              <div key={key}>
                <strong>{fieldNames[key]||key}</strong>
                <div className="cc-timeline-value">{display(key,value)}</div>
              </div>)}
            {Object.entries(event.changes||{}).map(([key,value])=>
              <div key={key}>
                <strong>{fieldNames[key]||key}</strong>
                <div className="cc-timeline-values">
                  <div className="cc-timeline-value">
                    <small>{tr("Previous value","مقدار قبلی","پخوانی ارزښت")}</small>
                    <div>{display(key,value.old)}</div>
                  </div>
                  <div className="cc-timeline-value">
                    <small>{tr("New value","مقدار جدید","نوی ارزښت")}</small>
                    <div>{display(key,value.new)}</div>
                  </div>
                </div>
              </div>)}
          </div>
        </li>)}
      </ol>
      <div className="cc-timeline-bar mt-4">
        <button type="button" disabled={page===1}
          onClick={()=>setPage(p=>p-1)}>
          {tr("Previous","قبلی","مخکینی")}
        </button>
        <span className="text-xs">
          {tr("Page","صفحه","پاڼه")} {page} · {state.count}
        </span>
        <button type="button" disabled={!state.next}
          onClick={()=>setPage(p=>p+1)}>
          {tr("Next","بعدی","بل")}
        </button>
      </div>
    </>}
  </section>;
}


// HQNATEX_TICKET_COMMENTS_FRONTEND_V1
type TicketCommentItem = {
  id: string; ticket: string; parent: string | null;
  body: string; author_id: string | null;
  author_email: string | null; created_at: string; updated_at: string;
};

function TicketComments({session,ticketId,language}: {
  session: Session; ticketId: string; language: Lang;
}) {
  const tr = (en:string,fa:string,ps:string) =>
    language==="en"?en:language==="fa"?fa:ps;
  const [page,setPage]=useState(1);
  const [version,setVersion]=useState(0);
  const [items,setItems]=useState<TicketCommentItem[]>([]);
  const [count,setCount]=useState(0);
  const [next,setNext]=useState(false);
  const [busy,setBusy]=useState(true);
  const [error,setError]=useState("");
  const [body,setBody]=useState("");
  const [parent,setParent]=useState<TicketCommentItem|null>(null);
  const [saving,setSaving]=useState(false);
  const [saveError,setSaveError]=useState("");
  const [sent,setSent]=useState(false);
  const alive=useRef(false);
  const savingRef=useRef(false);
  useEffect(()=>{
    alive.current=true;
    return()=>{alive.current=false;};
  },[]);

  const endpoint=`/api/v1/customer-tickets/${encodeURIComponent(ticketId)}/comments/`;

  useEffect(()=>{
    let active=true;
    const controller=new AbortController();
    setBusy(true);setError("");setItems([]);
    api<Paginated<TicketCommentItem>>(
      `${endpoint}?page=${page}`,{signal:controller.signal},session,
    ).then(data=>{
      if(!active)return;
      setItems(data.results);setCount(data.count);setNext(Boolean(data.next));
    }).catch(err=>{
      if(active)setError(message(err));
    }).finally(()=>{
      if(active)setBusy(false);
    });
    return()=>{active=false;controller.abort();};
  },[endpoint,session.tenantId,session.companyId,session.access,page,version]);

  async function sendComment() {
    if(savingRef.current||!body.trim()||body.length>10000)return;
    savingRef.current=true;
    setSaving(true);setSaveError("");setSent(false);
    try {
      await api<TicketCommentItem>(endpoint,{
        method:"POST",
        body:JSON.stringify({body:body.trim(),parent:parent?.id??null}),
      },session);
      if(!alive.current)return;
      setBody("");setParent(null);setSent(true);
      setPage(Math.max(1,Math.ceil((count+1)/25)));
      setVersion(v=>v+1);
    } catch(err) {
      if(alive.current)setSaveError(message(err));
    } finally {
      savingRef.current=false;
      if(alive.current)setSaving(false);
    }
  }

  function dateText(value:string) {
    const date=new Date(value);
    if(Number.isNaN(date.getTime()))return value;
    return date.toLocaleString(
      language==="fa"?"fa-AF":language==="ps"?"ps-AF":"en-GB",
      {calendar:"gregory"},
    );
  }

  return <section className="cc-card mt-4 min-w-0"
    aria-label={tr("Comments and replies","نظرها و پاسخ‌ها","نظرونه او ځوابونه")}>
    <header className="flex flex-wrap items-center justify-between gap-2 mb-3">
      <h3 className="text-sm font-bold">
        {tr("Comments and replies","نظرها و پاسخ‌ها","نظرونه او ځوابونه")}
      </h3>
      <button type="button" disabled={busy||saving}
        onClick={()=>setVersion(v=>v+1)}>
        {tr("Refresh","تازه‌سازی","تازه کول")}
      </button>
    </header>

    {busy?<p role="status" className="text-xs">
      {tr("Loading…","در حال دریافت…","د ترلاسه کولو په حال کې…")}
    </p>:error?<p role="alert" className="text-xs text-red-600 break-words">
      {error}
    </p>:<>
      {items.length===0?<p className="text-xs">
        {tr("No comments yet.","هنوز نظری ثبت نشده است.","تر اوسه نظر نشته.")}
      </p>:<div className="grid gap-3">
        {items.map(item=><article key={item.id}
          id={`ticket-comment-${item.id}`}
          className="min-w-0 rounded-xl border border-cyan-400/20 bg-white/5 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-bold break-all">
              {item.author_email??tr("Deleted user","کاربر حذف‌شده","ړنګ شوی کارن")}
            </span>
            <time dateTime={item.created_at}>{dateText(item.created_at)}</time>
          </div>
          {item.parent&&<p className="mt-2 text-xs opacity-70 break-all">
            {tr("Reply to","پاسخ به","ځواب")}{" "}
            <span dir="ltr">{item.parent}</span>
          </p>}
          <p dir="auto" className="my-3 whitespace-pre-wrap break-words text-sm">
            {item.body}
          </p>
          <button type="button" disabled={saving}
            onClick={()=>{setParent(item);setSent(false);setSaveError("");}}>
            {tr("Reply","پاسخ","ځواب")}
          </button>
        </article>)}
      </div>}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <button type="button" disabled={page<=1||saving}
          onClick={()=>setPage(p=>p-1)}>
          {tr("Previous","قبلی","مخکینی")}
        </button>
        <span>{tr("Page","صفحه","پاڼه")} {page} · {count}</span>
        <button type="button" disabled={!next||saving}
          onClick={()=>setPage(p=>p+1)}>
          {tr("Next","بعدی","بل")}
        </button>
      </div>
    </>}

    <div className="mt-4 border-t border-cyan-400/20 pt-4">
      {parent&&<div className="mb-3 rounded-xl border border-cyan-400/20 p-3">
        <div className="flex flex-wrap justify-between gap-2 text-xs">
          <span>{tr("Replying to","در پاسخ به","ځواب ورکول")}{" "}
            {parent.author_email??tr("Deleted user","کاربر حذف‌شده","ړنګ شوی کارن")}
          </span>
          <button type="button" disabled={saving} onClick={()=>setParent(null)}>
            {tr("Cancel reply","لغو پاسخ","ځواب لغوه کول")}
          </button>
        </div>
        <p dir="auto" className="mt-2 text-xs whitespace-pre-wrap break-words">
          {parent.body.slice(0,240)}{parent.body.length>240?"…":""}
        </p>
      </div>}
      <label className="block">
        <span>{tr("Write a comment","نوشتن نظر","نظر ولیکئ")}</span>
        <textarea rows={3} maxLength={10000} disabled={saving}
          value={body} onChange={event=>{
            setBody(event.target.value);setSent(false);
          }}
          dir="auto"
          placeholder={tr("Your message…","متن پیام شما…","ستاسو پیغام…")}/>
      </label>
      <div className="mt-2 flex flex-wrap justify-between items-center gap-2">
        <span className="text-xs">{body.length} / 10000</span>
        <button type="button" className="cc-primary"
          disabled={saving||busy||Boolean(error)||!body.trim()}
          onClick={()=>void sendComment()}>
          {saving?tr("Sending…","در حال ارسال…","د لېږلو په حال کې…"):
            tr("Send comment","ارسال نظر","نظر ولېږئ")}
        </button>
      </div>
      {saveError&&<p role="alert" className="mt-2 text-xs text-red-600 break-words">
        {saveError}
      </p>}
      {sent&&<p role="status" className="mt-2 text-xs text-emerald-600">
        {tr("Comment saved.","نظر ثبت شد.","نظر ثبت شو.")}
      </p>}
    </div>
  </section>;
}


// HQNATEX_TICKET_ASSIGNEE_FRONTEND_V1
type TicketAssigneeOption = {
  id: string; email: string; full_name: string; display_name: string;
};

function TicketAssigneePicker({session,language,value,onChange,disabled}: {
  session: Session; language: Lang; value: string;
  onChange: (email:string)=>void; disabled: boolean;
}) {
  const tr=(en:string,fa:string,ps:string)=>
    language==="en"?en:language==="fa"?fa:ps;
  const [term,setTerm]=useState("");
  const [search,setSearch]=useState("");
  const [page,setPage]=useState(1);
  const [version,setVersion]=useState(0);
  const [options,setOptions]=useState<TicketAssigneeOption[]>([]);
  const [next,setNext]=useState(false);
  const [busy,setBusy]=useState(true);
  const [error,setError]=useState("");

  useEffect(()=>{
    const timer=setTimeout(()=>{setSearch(term);setPage(1);},300);
    return()=>clearTimeout(timer);
  },[term]);

  useEffect(()=>{
    if(disabled)return;
    let active=true;
    const controller=new AbortController();
    setBusy(true);setError("");setOptions([]);setNext(false);
    api<Paginated<TicketAssigneeOption>>(
      `/api/v1/customer-tickets/assignees/?page=${page}&search=${encodeURIComponent(search)}`,
      {signal:controller.signal},session,
    ).then(data=>{
      if(!active)return;
      setOptions(data.results);setNext(Boolean(data.next));
    }).catch(err=>{
      if(active)setError(message(err));
    }).finally(()=>{
      if(active)setBusy(false);
    });
    return()=>{active=false;controller.abort();};
  },[disabled,session.tenantId,session.companyId,session.access,page,search,version]);

  if(disabled)return <div>
    <span className="block mb-2 text-xs font-bold">
      {tr("Assignee","مسئول","مسئول")}
    </span>
    <div dir="auto" className="text-sm break-all">
      {value||tr("Unassigned","بدون مسئول","مسئول نه لري")}
    </div>
  </div>;

  return <div className="min-w-0">
    <label className="block">
      <span>{tr("Assignee","مسئول","مسئول")}</span>
      <input value={term} onChange={event=>setTerm(event.target.value)}
        placeholder={tr("Search name or email…","جستجوی نام یا ایمیل…","نوم یا برېښنالیک ولټوئ…")}
        aria-label={tr("Search company users","جستجوی کاربران شرکت","د شرکت کارنان ولټوئ")}/>
    </label>
    <p className="my-2 text-xs break-all" dir="auto">
      {tr("Selected: ","انتخاب‌شده: ","ټاکل شوی: ")}
      {value||tr("Unassigned","بدون مسئول","مسئول نه لري")}
    </p>
    <button type="button" disabled={!value} onClick={()=>onChange("")}>
      {tr("Clear assignment","حذف مسئول","مسئول لرې کړئ")}
    </button>
    {busy?<p role="status" className="mt-2 text-xs">
      {tr("Loading users…","دریافت کاربران…","د کارنانو ترلاسه کول…")}
    </p>:error?<div className="mt-2">
      <p role="alert" className="text-xs text-red-600 break-words">{error}</p>
      <button type="button" onClick={()=>setVersion(v=>v+1)}>
        {tr("Retry","تلاش مجدد","بیا هڅه")}
      </button>
    </div>:<>
      <div className="mt-2 grid gap-2 max-h-48 overflow-y-auto">
        {options.length===0?<p className="text-xs">
          {tr("No eligible users found.","کاربر واجد شرایط یافت نشد.","وړ کارن ونه موندل شو.")}
        </p>:options.map(option=><button type="button" key={option.id}
          aria-pressed={value===option.email}
          className={value===option.email?"cc-primary":""}
          onClick={()=>onChange(option.email)}>
          <span className="min-w-0 text-start">
            <span className="block break-words">{option.display_name}</span>
            <span dir="ltr" className="block break-all text-xs opacity-80">
              {option.email}
            </span>
          </span>
        </button>)}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <button type="button" disabled={page<=1}
          onClick={()=>setPage(p=>p-1)}>
          {tr("Previous","قبلی","مخکینی")}
        </button>
        <span className="text-xs">{page}</span>
        <button type="button" disabled={!next}
          onClick={()=>setPage(p=>p+1)}>
          {tr("Next","بعدی","بل")}
        </button>
      </div>
    </>}
  </div>;
}


// HQNATEX_CUSTOMER_CALL_LOG_FRONTEND_V1

// HQNATEX_CALL_LOG_MODAL_PICKERS_V2
// HQNATEX_TICKET_LOOKUPS_POPOVER_V1
function CallLogRelationPicker(props: {
  session:Session; endpoint:string; value:string; selectedLabel:string;
  onSelect:(row:Row|null)=>void; disabled:boolean; language:Lang;
  customer?:string;
}) {
  const {language}=props;
  const tr=(en:string,fa:string,ps:string)=>
    language==="en"?en:language==="fa"?fa:ps;
  const [open,setOpen]=useState(false);
  const trigger=useRef<HTMLButtonElement>(null);
  const menu=useRef<HTMLDivElement>(null);

  useEffect(()=>{
    if(!open||props.disabled)return;
    const panel=menu.current;
    const button=trigger.current;
    if(!panel||!button)return;
    let active=true;
    function position() {
      if(!active||!panel||!button)return;
      const rect=button.getBoundingClientRect();
      const viewport=window.visualViewport;
      const left=viewport?.offsetLeft??0;
      const top=viewport?.offsetTop??0;
      const width=viewport?.width??window.innerWidth;
      const height=viewport?.height??window.innerHeight;
      const gap=8;
      const below=top+height-rect.bottom-gap*2;
      const above=rect.top-top-gap*2;
      const down=below>=220||below>=above;
      const space=Math.max(0,down?below:above);
      const panelHeight=Math.min(370,space);
      const panelWidth=Math.min(Math.max(rect.width,300),width-gap*2);
      const rtl=language!=="en";
      const desiredLeft=rtl?rect.right-panelWidth:rect.left;
      const minLeft=left+gap;
      const maxLeft=Math.max(minLeft,left+width-panelWidth-gap);
      panel.style.width=`${panelWidth}px`;
      panel.style.maxHeight=`${panelHeight}px`;
      panel.style.left=`${Math.max(minLeft,Math.min(desiredLeft,maxLeft))}px`;
      panel.style.top=down?`${rect.bottom+gap}px`:
        `${Math.max(top+gap,rect.top-gap-Math.min(panel.scrollHeight,panelHeight))}px`;
    }
    panel.showPopover();
    position();
    panel.querySelector<HTMLInputElement>("input")?.focus({preventScroll:true});
    window.addEventListener("resize",position);
    window.addEventListener("scroll",position,true);
    window.visualViewport?.addEventListener("resize",position);
    return()=>{
      active=false;
      window.removeEventListener("resize",position);
      window.removeEventListener("scroll",position,true);
      window.visualViewport?.removeEventListener("resize",position);
      if(panel.matches(":popover-open"))panel.hidePopover();
    };
  },[open,props.disabled]);

  return <div className="cc-call-picker">
    <button ref={trigger} type="button"
      className="cc-call-picker-trigger"
      disabled={props.disabled} aria-expanded={open}
      onClick={()=>setOpen(v=>!v)}>
      <span>{props.selectedLabel||props.value||
        tr("Choose a record","انتخاب کنید","ریکارډ وټاکئ")}</span>
      <span aria-hidden="true">⌄</span>
    </button>
    <div ref={menu} popover="auto" className="cc-call-picker-menu"
      dir={language==="en"?"ltr":"rtl"}
      onToggle={event=>{
        if(!(event.currentTarget.matches(":popover-open")))setOpen(false);
      }}>
      {open&&<Lookup {...props} onSelect={row=>{
        props.onSelect(row);setOpen(false);
      }}/>}
    </div>
  </div>;
}

function CustomerCallLogs({session,language,refreshTrigger}: {session:Session; language:Lang; refreshTrigger:number}) {
  const tr=(en:string,fa:string,ps:string)=>
    language==="en"?en:language==="fa"?fa:ps;
  const [rows,setRows]=useState<Row[]>([]);
  const [page,setPage]=useState(1);
  const [next,setNext]=useState(false);
  const [count,setCount]=useState(0);
  const [term,setTerm]=useState("");
  const [search,setSearch]=useState("");
  const [direction,setDirection]=useState("");
  const [outcome,setOutcome]=useState("");
  const [version,setVersion]=useState(0);
  const [busy,setBusy]=useState(true);
  const [error,setError]=useState("");
  const [editing,setEditing]=useState(false);
  const [selected,setSelected]=useState<Row|null>(null);
  const [form,setForm]=useState<Form>({});
  const [customerLabel,setCustomerLabel]=useState("");
  const [ticketLabel,setTicketLabel]=useState("");
  const [saving,setSaving]=useState(false);
  const [saveError,setSaveError]=useState("");
  const [notice,setNotice]=useState("");
  const alive=useRef(false);
  const savingRef=useRef(false);
  const callDialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);

  useEffect(()=>{
    setVersion(v=>v+1);
  },[refreshTrigger]);


  useEffect(()=>{
    if(!editing)return;
    const dialog=callDialog.current;
    if(!dialog)return;
    const previousFocus=document.activeElement as HTMLElement|null;
    const scroll=document.querySelector<HTMLElement>(".hq-main-scroll");
    const oldOverflow=scroll?.style.overflow;
    const oldBodyOverflow=document.body.style.overflow;

    function positionDialog(){
      if(!dialog)return;
      const viewport=window.visualViewport;
      const vx=viewport?.offsetLeft??0;
      const vy=viewport?.offsetTop??0;
      const vw=viewport?.width??window.innerWidth;
      const vh=viewport?.height??window.innerHeight;
      let left=vx+12,right=vx+vw-12,top=vy+12;
      const shell=document.querySelector(".hq-shell");
      if(window.innerWidth>=1024&&shell?.getAttribute("data-sidebar-hidden")==="false"){
        const sidebar=shell.querySelector<HTMLElement>(":scope > aside");
        if(sidebar){
          const box=sidebar.getBoundingClientRect();
          if(box.width>0&&box.right>vx&&box.left<vx+vw){
            if(box.left+box.width/2>vx+vw/2)right=Math.min(right,box.left-12);
            else left=Math.max(left,box.right+12);
          }
        }
      }
      const width=Math.max(1,right-left);
      dialog.style.setProperty("width",`${width}px`,"important");
      dialog.style.setProperty("left",`${left}px`,"important");
      dialog.style.setProperty("top",`${top}px`,"important");
    }

    dialog.showModal();
    if(scroll)scroll.style.overflow="hidden";
    document.body.style.overflow="hidden";
    positionDialog();
    const observer=new ResizeObserver(positionDialog);
    observer.observe(dialog);
    const shell=document.querySelector(".hq-shell");
    const mutation=new MutationObserver(positionDialog);
    if(shell)mutation.observe(shell,{attributes:true,attributeFilter:["data-sidebar-hidden"]});
    window.addEventListener("resize",positionDialog);
    window.visualViewport?.addEventListener("resize",positionDialog);
    return()=>{
      observer.disconnect();mutation.disconnect();
      window.removeEventListener("resize",positionDialog);
      window.visualViewport?.removeEventListener("resize",positionDialog);
      if(dialog.open)dialog.close();
      if(scroll)scroll.style.overflow=oldOverflow??"";
      document.body.style.overflow=oldBodyOverflow;
      if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
    };
  },[editing]);

  const directions=[
    ["inbound",tr("Inbound","ورودی","راتلونکی")],
    ["outbound",tr("Outbound","خروجی","وتونکی")],
  ];
  const outcomes=[
    ["answered",tr("Answered","پاسخ داده‌شده","ځواب شوی")],
    ["missed",tr("Missed","ازدست‌رفته","له لاسه وتلی")],
    ["no_answer",tr("No answer","بی‌پاسخ","بې ځوابه")],
    ["busy",tr("Busy","مصروف","بوخت")],
    ["failed",tr("Failed","ناموفق","ناکام")],
    ["cancelled",tr("Cancelled","لغوشده","لغوه شوی")],
  ];
  const text=(value:unknown)=>value==null?"":String(value);
  const choice=(options:string[][],value:unknown)=>
    options.find(item=>item[0]===value)?.[1]||text(value);
  const stamp=(value:unknown)=>{
    if(!value)return "—";
    const date=new Date(String(value));
    if(Number.isNaN(date.getTime()))return String(value);
    const pad=(n:number)=>String(n).padStart(2,"0");
    return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  };
  const callDuration=(value:unknown)=>{
    if(value===null||value===undefined||value==="")return "—";
    const seconds=Number(value);
    if(!Number.isFinite(seconds)||seconds<0)return "—";
    const total=Math.floor(seconds);
    const pad=(n:number)=>String(n).padStart(2,"0");
    return `${pad(Math.floor(total/3600))}:${pad(Math.floor(total/60)%60)}:${pad(total%60)}`;
  };
  function localDate(value:unknown) {
    if(!value)return "";
    const date=new Date(String(value));
    if(Number.isNaN(date.getTime()))return "";
    const pad=(n:number)=>String(n).padStart(2,"0");
    return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  useEffect(()=>{
    let active=true;
    const controller=new AbortController();
    setBusy(true);setError("");setRows([]);
    const query=new URLSearchParams({
      page:String(page),search,direction,outcome,
    });
    api<Row[]|Paginated<Row>>(`/api/v1/customer-call-logs/?${query}`,
      {signal:controller.signal},session).then(data=>{
      if(!active)return;
      setRows(rowsOf(data));
      setNext(!Array.isArray(data)&&Boolean(data.next));
      setCount(Array.isArray(data)?data.length:data.count);
    }).catch(err=>{if(active)setError(message(err));})
      .finally(()=>{if(active)setBusy(false);});
    return()=>{active=false;controller.abort();};
  },[session.tenantId,session.companyId,session.access,page,search,direction,outcome,version]);

  function open(row:Row|null) {
    setSelected(row);setSaveError("");setNotice("");
    setForm({
      phone_number:text(row?.phone_number),
      direction:text(row?.direction),
      outcome:text(row?.outcome),
      subject:text(row?.subject),
      notes:text(row?.notes),
      customer:text(row?.customer),
      ticket:text(row?.ticket),
      started_at:localDate(row?.started_at),
      ended_at:localDate(row?.ended_at),
    });
    setCustomerLabel(text(row?.customer_name));
    setTicketLabel(text(row?.ticket_number));
    setEditing(true);
  }

  async function save(event:FormEvent) {
    event.preventDefault();
    if(savingRef.current)return;
    const started=new Date(form.started_at);
    const ended=form.ended_at?new Date(form.ended_at):null;
    if(Number.isNaN(started.getTime())||
       (ended&&(Number.isNaN(ended.getTime())||ended<started))){
      setSaveError(tr("Check starting and ending times.",
        "زمان شروع و پایان را بررسی کنید.","د پیل او پای وختونه وګورئ."));
      return;
    }
    savingRef.current=true;setSaving(true);setSaveError("");setNotice("");
    try {
      const payload={
        ...form,
        customer:form.customer||null,ticket:form.ticket||null,
        started_at:started.toISOString(),
        ended_at:ended?ended.toISOString():null,
      };
      await api<Row>(selected
        ? `/api/v1/customer-call-logs/${encodeURIComponent(String(selected.id))}/`
        : "/api/v1/customer-call-logs/",
        {method:selected?"PATCH":"POST",body:JSON.stringify(payload)},session);
      if(!alive.current)return;
      setEditing(false);setPage(1);setVersion(v=>v+1);
      setNotice(tr("Call saved.","تماس ثبت شد.","تماس ثبت شو."));
    }catch(err){if(alive.current)setSaveError(message(err));}
    finally{
      savingRef.current=false;
      if(alive.current)setSaving(false);
    }
  }

  function input(key:string,title:string,type="text",required=false,max?:number){
    if(type==="datetime-local"){
      const id=`cc-call-${key}`;
      return <label htmlFor={id}><span>{title}</span>
        <input id={id} type="datetime-local" dir="ltr" lang="en"
          required={required} step={1} disabled={saving}
          value={form[key]||""}
          onChange={event=>setForm(f=>({...f,[key]:event.target.value}))}/>
        <button type="button" disabled={saving}
          className="cc-call-date-open"
          onClick={()=>{
            const element=document.getElementById(id) as HTMLInputElement|null;
            if(!element)return;
            element.focus();
            try{element.showPicker();}catch{/* Keyboard entry remains available. */}
          }}>
          {tr("Choose date & time","انتخاب تاریخ و ساعت","نېټه او وخت وټاکئ")}
        </button>
        <small className="cc-call-date-help">
          {tr("Gregorian date · device local time",
            "تاریخ میلادی · ساعت محلی دستگاه",
            "میلادي نېټه · د وسیلې ځايي وخت")}
        </small>
      </label>;
    }
    return <label><span>{title}</span>
      <input type={type} required={required} maxLength={max}
        step={type==="datetime-local"?1:undefined}
        disabled={saving} value={form[key]||""}
        onChange={event=>setForm(f=>({...f,[key]:event.target.value}))}/>
    </label>;
  }
  function select(key:string,title:string,options:string[][]){
    return <label><span>{title}</span>
      <select required disabled={saving} value={form[key]||""}
        onChange={event=>setForm(f=>({...f,[key]:event.target.value}))}>
        <option value="">{tr("Select","انتخاب کنید","وټاکئ")}</option>
        {options.map(([value,name])=><option key={value} value={value}>{name}</option>)}
      </select>
    </label>;
  }

  return <section className="hq-callcenter mb-5"
    dir={language==="en"?"ltr":"rtl"}>

    <style>{`
      /* HQNATEX_CALL_DATETIME_UI_V1 */
      .hq-callcenter .cc-call-time{
        display:inline-block;
        white-space:nowrap;
        direction:ltr;
        unicode-bidi:isolate;
        font-variant-numeric:tabular-nums;
      }
      .hq-callcenter dialog.cc-call-dialog input[type="datetime-local"]{
        direction:ltr!important;
        text-align:left!important;
        color-scheme:light;
        font-variant-numeric:tabular-nums;
      }
      .hq-callcenter dialog.cc-call-dialog .cc-call-date-open{
        display:inline-flex;
        margin-top:8px;
        padding:6px 10px;
        border:1px solid #8abddd;
        border-radius:9px;
        background:#e2f3ff;
        color:#174c73;
        font-size:12px;
        font-weight:700;
      }
      .hq-callcenter dialog.cc-call-dialog .cc-call-date-help{
        display:block;
        margin-top:5px;
        color:#476783;
        font-size:11px;
      }
      .hq-shell[data-theme="dark"] .hq-callcenter
      dialog.cc-call-dialog input[type="datetime-local"]{
        color-scheme:dark;
      }
      .hq-shell[data-theme="dark"] .hq-callcenter
      dialog.cc-call-dialog .cc-call-date-open{
        background:#163c59;color:#e7f4ff;border-color:#537f9e;
      }
      .hq-shell[data-theme="dark"] .hq-callcenter
      dialog.cc-call-dialog .cc-call-date-help{color:#bad2e5}
      /* HQNATEX_CALL_LOG_MODAL_PICKERS_V2 */
      .hq-callcenter dialog.cc-call-dialog{
        position:fixed!important;inset:auto;
        margin:0!important;padding:0!important;box-sizing:border-box!important;
        max-width:calc(100vw - 24px)!important;
        border:1px solid rgba(255,255,255,.8)!important;
        border-radius:20px!important;
        background:rgba(235,247,255,.97)!important;color:#183a54!important;
        box-shadow:0 24px 90px rgba(4,25,47,.35)!important;
        backdrop-filter:blur(22px);overflow:hidden!important;
      }
      .hq-callcenter dialog.cc-call-dialog::backdrop{
        background:rgba(5,20,38,.48);backdrop-filter:blur(5px);
      }
      .hq-callcenter .cc-call-dialog-form{
        display:flex!important;flex-direction:column!important;
        min-height:0!important;max-height:inherit!important;margin:0!important;
      }
      .hq-callcenter .cc-call-dialog-header,
      .hq-callcenter .cc-call-dialog-footer{
        display:flex;align-items:center;gap:12px;flex:0 0 auto;
        padding:16px 22px;background:rgba(220,239,252,.75);
      }
      .hq-callcenter .cc-call-dialog-header{
        justify-content:space-between;border-bottom:1px solid #8bbbd644;
      }
      .hq-callcenter .cc-call-dialog-header h3{
        margin:0;font-size:16px;font-weight:800;
      }
      .hq-callcenter .cc-call-dialog-footer{
        justify-content:flex-end;border-top:1px solid #8bbbd644;
      }
      .hq-callcenter .cc-call-dialog-body{
        flex:1 1 auto;min-height:0;padding:22px;
        overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;
        scrollbar-gutter:stable;
      }

      /* HQNATEX_CALL_LABEL_READABILITY_V2 */
      .hq-shell .hq-callcenter dialog.cc-call-dialog
      .cc-call-dialog-grid > label > span,
      .hq-shell .hq-callcenter dialog.cc-call-dialog
      .cc-call-dialog-grid > div > span {
        display:block;
        margin-bottom:8px;
        color:#294a65!important;
        -webkit-text-fill-color:#294a65!important;
        opacity:1!important;
        font-size:13px!important;
        font-weight:700!important;
        line-height:1.8!important;
      }
      .hq-shell .hq-callcenter dialog.cc-call-dialog
      :is(input,select,textarea) {
        color:#183a54!important;
        -webkit-text-fill-color:#183a54!important;
        font-size:14px!important;
      }
      .hq-shell[data-theme="dark"] .hq-callcenter dialog.cc-call-dialog
      .cc-call-dialog-grid > label > span,
      .hq-shell[data-theme="dark"] .hq-callcenter dialog.cc-call-dialog
      .cc-call-dialog-grid > div > span {
        color:#c4dced!important;
        -webkit-text-fill-color:#c4dced!important;
      }
      .hq-shell[data-theme="dark"] .hq-callcenter dialog.cc-call-dialog
      :is(input,select,textarea) {
        color:#e7f4ff!important;
        -webkit-text-fill-color:#e7f4ff!important;
      }
      .hq-callcenter .cc-call-dialog-grid{
        display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;
        align-items:start!important;gap:18px!important;min-width:0;
        margin:0;padding:0;border:0;
      }
      .hq-callcenter .cc-call-dialog-grid > *{
        min-width:0!important;max-width:100%!important;
      }
      .hq-callcenter .cc-call-dialog-grid > label:last-child{
        grid-column:1/-1;
      }
      .hq-callcenter .cc-call-dialog :is(input,select){
        box-sizing:border-box!important;width:100%!important;
        min-width:0!important;height:44px!important;min-height:44px!important;
        padding:8px 12px!important;line-height:1.5!important;
      }
      .hq-callcenter .cc-call-dialog textarea{
        box-sizing:border-box;width:100%;min-width:0;resize:vertical;
      }
      .hq-callcenter .cc-call-picker{position:relative;min-width:0}
      .hq-callcenter .cc-call-picker-trigger{
        display:flex!important;justify-content:space-between!important;
        width:100%;min-height:44px;box-sizing:border-box;
      }
      .hq-callcenter .cc-call-picker-trigger > span:first-child{
        overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
      }
      .cc-call-picker-menu{
        position:fixed!important;inset:auto;margin:0!important;
        box-sizing:border-box;padding:8px!important;
        max-width:calc(100vw - 16px);overflow:auto!important;
        border:1px solid #91bddb!important;border-radius:12px!important;
        background:#f1f8ff!important;color:#183a54!important;
        box-shadow:0 12px 36px #072c4b44;
        font-family:inherit;
      }
      .cc-call-picker-menu .cc-lookup{
        min-width:0;border:0!important;padding:2px!important;
      }
      .cc-call-picker-menu .cc-options{
        max-height:180px!important;overflow:auto!important;
      }
      .cc-call-picker-menu button{
        max-width:100%;white-space:normal;overflow-wrap:anywhere;
      }
      .cc-call-picker-menu .cc-lookup > div:first-child > span{
        min-width:0;overflow-wrap:anywhere;
      }
      .hq-shell[data-theme="dark"] dialog.cc-call-dialog{
        background:rgba(13,39,61,.98)!important;color:#e7f4ff!important;
      }
      .hq-shell[data-theme="dark"] .cc-call-dialog-header,
      .hq-shell[data-theme="dark"] .cc-call-dialog-footer{
        background:rgba(25,58,83,.95);
      }
      .hq-shell[data-theme="dark"] .cc-call-picker-menu{
        background:#15344c!important;color:#e7f4ff!important;
      }
      @media(min-width:900px){
        .hq-callcenter .cc-call-log-card{
          padding:14px!important;
        }
        .hq-callcenter .cc-call-log-card table{
          font-size:12px!important;
          line-height:1.2!important;
        }
        .hq-callcenter .cc-call-log-card table th{
          padding:6px 5px!important;
          font-size:11px!important;
          line-height:1.2!important;
          vertical-align:middle!important;
        }
        .hq-callcenter .cc-call-log-card table td{
          padding:6px 5px!important;
          font-size:12px!important;
          line-height:1.25!important;
          vertical-align:middle!important;
        }
        .hq-callcenter .cc-call-log-card table td:nth-child(7),
        .hq-callcenter .cc-call-log-card table td:nth-child(8),
        .hq-callcenter .cc-call-log-card table td:nth-child(9){
          font-size:11px!important;
        }
        .hq-callcenter .cc-call-log-card table td button{
          min-height:32px!important;
          padding:5px 9px!important;
          font-size:12px!important;
          line-height:1.1!important;
        }
      }

      @media(max-width:639px){
        .hq-callcenter .cc-call-dialog-grid{
          grid-template-columns:minmax(0,1fr)!important;gap:14px!important;
        }
        .hq-callcenter .cc-call-dialog-body{padding:14px}
        .hq-callcenter .cc-call-dialog-header,
        .hq-callcenter .cc-call-dialog-footer{padding:12px 14px}
      }
    
      /* HQNATEX_CALL_LOG_DESKTOP_TOOLBAR_UNIFY_V1 */
      .hq-callcenter .cc-call-log-toolbar-header {
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: center !important;
        gap: 10px !important;
        margin: 0 0 10px !important;
        min-width: 0;
      }
      .hq-callcenter .cc-call-log-toolbar-header > div {
        min-width: 0;
        flex: 1 1 180px;
      }
      .hq-callcenter .cc-call-log-toolbar-header >
      .cc-call-log-toolbar-filters {
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: center !important;
        gap: 8px !important;
        order: 3;
        flex: 1 1 100%;
        min-width: 0;
        margin: 0 !important;
        padding: 0 !important;
      }
      .hq-callcenter .cc-call-log-toolbar-filters > input {
        flex: 1 1 160px;
        width: auto !important;
        min-width: 120px !important;
        max-width: 100%;
      }
      .hq-callcenter .cc-call-log-toolbar-filters > select {
        flex: 0 1 auto;
        width: auto !important;
        min-width: 0;
        max-width: 100%;
      }
      .hq-callcenter .cc-call-log-toolbar-filters > button,
      .hq-callcenter .cc-call-log-toolbar-header > button {
        flex: 0 0 auto;
        white-space: nowrap;
      }
      @media (min-width: 1200px) {
        .hq-callcenter .cc-call-log-toolbar-header {
          flex-wrap: nowrap !important;
        }
        .hq-callcenter .cc-call-log-toolbar-header > div {
          flex: 0 1 190px;
        }
        .hq-callcenter .cc-call-log-toolbar-header >
        .cc-call-log-toolbar-filters {
          order: 0;
          flex: 1 1 0%;
        }
      }
      @media (max-width: 639px) {
        .hq-callcenter .cc-call-log-toolbar-filters > input {
          flex-basis: 100%;
          width: 100% !important;
        }
        .hq-callcenter .cc-call-log-toolbar-filters > select {
          flex: 1 1 120px;
        }
      }

      /* HQNATEX_CALL_TOOLBAR_ALIGN_V2 */
      .hq-callcenter .cc-call-log-toolbar-header {
        align-items: center !important;
      }
      .hq-callcenter .cc-call-log-toolbar-filters {
        align-items: center !important;
      }
      .hq-callcenter .cc-call-log-toolbar-filters > input,
      .hq-callcenter .cc-call-log-toolbar-filters > select,
      .hq-callcenter .cc-call-log-toolbar-filters > button,
      .hq-callcenter .cc-call-log-toolbar-header > button {
        box-sizing: border-box !important;
        height: 42px !important;
        min-height: 42px !important;
        margin: 0 !important;
        padding-block: 0 !important;
        line-height: normal !important;
        font-family: inherit;
      }
      .hq-callcenter .cc-call-log-toolbar-filters > select {
        padding-inline: 12px 30px !important;
        white-space: nowrap !important;
        text-overflow: ellipsis;
      }
      @media (min-width: 1200px) {
        .hq-callcenter .cc-call-log-toolbar-header >
        .cc-call-log-toolbar-filters {
          display: grid !important;
          grid-template-columns:
            minmax(120px,1fr)
            minmax(120px,max-content)
            minmax(120px,max-content)
            max-content;
          gap: 8px !important;
        }
        .hq-callcenter .cc-call-log-toolbar-filters > input,
        .hq-callcenter .cc-call-log-toolbar-filters > select {
          width: 100% !important;
          min-width: 0 !important;
        }
      }

      /* HQNATEX_CALL_FORM_RESPONSIVE_V1 */
      .hq-shell .hq-callcenter dialog.cc-call-dialog
      .cc-call-dialog-grid > label > span,
      .hq-shell .hq-callcenter dialog.cc-call-dialog
      .cc-call-dialog-grid > div > span {
        font-size: 15px !important;
        line-height: 1.7 !important;
        margin-bottom: 9px;
      }
      .hq-shell .hq-callcenter dialog.cc-call-dialog
      :is(input,select,textarea) {
        font-size: 16px !important;
        line-height: 1.6 !important;
      }
      .hq-shell .hq-callcenter dialog.cc-call-dialog
      :is(input,select) {
        height: 50px !important;
        min-height: 50px !important;
        padding: 10px 14px !important;
      }
      .hq-shell .hq-callcenter dialog.cc-call-dialog
      .cc-call-picker-trigger {
        min-height: 50px !important;
        padding: 10px 14px !important;
        font-size: 16px !important;
      }
      .hq-shell .hq-callcenter dialog.cc-call-dialog textarea {
        min-height: 125px !important;
        padding: 12px 14px !important;
      }
      .hq-shell .hq-callcenter dialog.cc-call-dialog
      .cc-call-dialog-header h3 {
        font-size: 20px !important;
      }
      .hq-shell .hq-callcenter dialog.cc-call-dialog
      :is(.cc-call-dialog-footer button,.cc-call-date-open) {
        min-height: 44px !important;
        font-size: 14px !important;
      }
      .hq-shell .hq-callcenter dialog.cc-call-dialog
      .cc-call-date-help {
        font-size: 13px !important;
        line-height: 1.7;
      }
      @media (max-width: 767px) {
        .hq-shell .hq-callcenter dialog.cc-call-dialog {
          max-width: calc(100vw - 16px) !important;
          max-height: calc(100dvh - 16px) !important;
          border-radius: 16px !important;
        }
        .hq-shell .hq-callcenter dialog.cc-call-dialog
        .cc-call-dialog-form {
          max-height: calc(100dvh - 18px) !important;
          min-width: 0;
        }
        .hq-shell .hq-callcenter dialog.cc-call-dialog
        .cc-call-dialog-grid {
          grid-template-columns: minmax(0,1fr) !important;
          gap: 16px !important;
        }
        .hq-shell .hq-callcenter dialog.cc-call-dialog
        .cc-call-dialog-body {
          padding: 14px !important;
          min-height: 0 !important;
          overflow-y: auto !important;
          overflow-x: hidden !important;
        }
        .hq-shell .hq-callcenter dialog.cc-call-dialog
        :is(.cc-call-dialog-header,.cc-call-dialog-footer) {
          padding: 12px 14px !important;
          flex-wrap: wrap;
        }
        .hq-shell .hq-callcenter dialog.cc-call-dialog
        .cc-call-dialog-footer > button {
          flex: 1 1 120px;
        }
      }

      /* HQNATEX_CALL_DIALOG_FRAME_V1 */
      .hq-shell .hq-callcenter dialog.cc-call-dialog
      .cc-call-dialog-form {
        height: 100% !important;
        max-height: 100% !important;
        min-height: 0 !important;
        overflow: hidden !important;
      }
      .hq-shell .hq-callcenter dialog.cc-call-dialog
      .cc-call-dialog-body {
        flex: 1 1 0% !important;
        min-height: 0 !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
      }

      /* HQNATEX_CALL_DIALOG_GLASS_HEIGHT_V2_R2 */
      .hq-shell .hq-callcenter dialog.cc-call-dialog {
        box-sizing: border-box !important;
        overflow: hidden !important;
        background:
          linear-gradient(
            135deg,
            rgba(239, 249, 255, .68),
            rgba(211, 238, 253, .50)
          ) !important;
        border:
          1px solid rgba(255,255,255,.78) !important;
        box-shadow:
          0 26px 85px rgba(5,31,55,.30),
          inset 0 1px 0 rgba(255,255,255,.78) !important;
        -webkit-backdrop-filter:
          blur(30px) saturate(160%) !important;
        backdrop-filter:
          blur(30px) saturate(160%) !important;
      }
      .hq-shell .hq-callcenter dialog.cc-call-dialog
      .cc-call-dialog-form {
        display: flex !important;
        flex-direction: column !important;
        width: 100% !important;
        height: 100% !important;
        min-width: 0 !important;
        min-height: 0 !important;
        max-height: 100% !important;
        margin: 0 !important;
        overflow: hidden !important;
        background: transparent !important;
      }
      .hq-shell .hq-callcenter dialog.cc-call-dialog
      .cc-call-dialog-header,
      .hq-shell .hq-callcenter dialog.cc-call-dialog
      .cc-call-dialog-footer {
        flex: 0 0 auto !important;
        background:
          linear-gradient(
            135deg,
            rgba(241,250,255,.48),
            rgba(207,235,251,.34)
          ) !important;
        -webkit-backdrop-filter:
          blur(18px) saturate(150%) !important;
        backdrop-filter:
          blur(18px) saturate(150%) !important;
      }
      .hq-shell .hq-callcenter dialog.cc-call-dialog
      .cc-call-dialog-body {
        flex: 1 1 0% !important;
        min-width: 0 !important;
        min-height: 0 !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        background:
          linear-gradient(
            135deg,
            rgba(255,255,255,.15),
            rgba(211,238,253,.08)
          ) !important;
        -webkit-backdrop-filter:
          blur(12px) saturate(130%) !important;
      }
      .hq-shell .hq-callcenter dialog.cc-call-dialog::backdrop {
        background: rgba(5,20,38,.40) !important;
        -webkit-backdrop-filter:
          blur(5px) !important;
        backdrop-filter:
          blur(5px) !important;
      }
      .hq-shell[data-theme="dark"]
      .hq-callcenter dialog.cc-call-dialog {
        color: #e7f4ff !important;
        background:
          linear-gradient(
            135deg,
            rgba(16,43,64,.68),
            rgba(7,27,44,.52)
          ) !important;
        border-color:
          rgba(181,222,246,.27) !important;
        box-shadow:
          0 28px 90px rgba(0,8,18,.50),
          inset 0 1px 0 rgba(220,242,255,.14) !important;
      }
      .hq-shell[data-theme="dark"]
      .hq-callcenter dialog.cc-call-dialog
      .cc-call-dialog-header,
      .hq-shell[data-theme="dark"]
      .hq-callcenter dialog.cc-call-dialog
      .cc-call-dialog-footer {
        background:
          linear-gradient(
            135deg,
            rgba(35,72,97,.44),
            rgba(11,40,61,.30)
          ) !important;
        border-color:
          rgba(174,216,241,.17) !important;
      }
      .hq-shell[data-theme="dark"]
      .hq-callcenter dialog.cc-call-dialog
      .cc-call-dialog-body {
        background:
          linear-gradient(
            135deg,
            rgba(28,60,82,.16),
            rgba(5,24,40,.10)
          ) !important;
      }
      @media (max-width: 767px) {
        .hq-shell .hq-callcenter dialog.cc-call-dialog {
          border-radius: 16px !important;
        }
        .hq-shell .hq-callcenter dialog.cc-call-dialog
        .cc-call-dialog-form {
          height: 100% !important;
          max-height: 100% !important;
        }
      }
    `}</style>
    <div className="cc-card cc-call-log-card">
      <div className="cc-call-log-toolbar-header flex flex-wrap justify-between items-center gap-3 mb-0">
        <div>
          <h2 className="text-lg font-bold">{tr("Call log","ثبت تماس‌ها","د تماسونو ثبت")}</h2>
          <p className="mt-1 text-xs">{tr("Operator-entered call records",
            "سوابق تماس ثبت‌شده توسط اپراتور","د اپراتور له خوا ثبت شوي تماسونه")}</p>
        </div>
        <form className="cc-call-log-toolbar-filters flex flex-wrap gap-3" onSubmit={event=>{
        event.preventDefault();setPage(1);setSearch(term);
      }}>
        <input className="flex-[2] min-w-[220px]" value={term}
          aria-label={tr("Search calls","جستجوی تماس","تماسونه ولټوئ")}
          onChange={event=>setTerm(event.target.value)}
          placeholder={tr("Phone, subject or customer…","شماره، موضوع یا مشتری…","شمېره، موضوع یا پېرودونکی…")}/>
        <select className="!w-auto" value={direction}
          aria-label={tr("Direction filter","فیلتر نوع تماس","د تماس لوري چاڼ")}
          onChange={event=>{setDirection(event.target.value);setPage(1);}}>
          <option value="">{tr("All directions","همه تماس‌ها","ټول تماسونه")}</option>
          {directions.map(([value,name])=><option key={value} value={value}>{name}</option>)}
        </select>
        <select className="!w-auto" value={outcome}
          aria-label={tr("Outcome filter","فیلتر نتیجه","د پایلې چاڼ")}
          onChange={event=>{setOutcome(event.target.value);setPage(1);}}>
          <option value="">{tr("All outcomes","همه نتایج","ټولې پایلې")}</option>
          {outcomes.map(([value,name])=><option key={value} value={value}>{name}</option>)}
        </select>
        <button type="submit" style={{ minHeight: 44, padding: "10px 20px", fontSize: 14 }}>{tr("Search","جستجو","لټون")}</button>
      </form>
        <button type="button" className="cc-primary" style={{ minHeight: 44, padding: "10px 20px", fontSize: 14 }} disabled={saving}
          onClick={()=>open(null)}>
          {tr("Record call","ثبت تماس","تماس ثبت کړئ")}
        </button>
      </div>

      {notice&&<p role="status" className="mb-3 text-sm text-emerald-600">{notice}</p>}

      {editing&&<dialog ref={callDialog} className="cc-call-dialog hq-major-form-dialog"
        aria-labelledby="cc-call-dialog-title"
        onCancel={event=>{
          event.preventDefault();
          if(!savingRef.current)setEditing(false);
        }}>
        <form onSubmit={event=>void save(event)} className="cc-call-dialog-form">
        <div className="cc-call-dialog-header">
          <h3 id="cc-call-dialog-title">{selected
            ?tr("Edit call","ویرایش تماس","تماس سمول")
            :tr("New call record","ثبت تماس جدید","نوی تماس ثبتول")}</h3>
          <button type="button" disabled={saving}
            aria-label={tr("Close","بستن","تړل")}
            onClick={()=>setEditing(false)}>×</button>
        </div>
        <div className="cc-call-dialog-body">
        <fieldset disabled={saving} className="cc-call-dialog-grid">
          {input("phone_number",tr("Phone number","شماره تماس","د اړیکې شمېره"),"tel",true,64)}
          {input("subject",tr("Subject","موضوع","موضوع"),"text",true,255)}
          {select("direction",tr("Direction","نوع تماس","د تماس لوری"),directions)}
          {select("outcome",tr("Outcome","نتیجه تماس","د تماس پایله"),outcomes)}
          {input("started_at",tr("Started at","زمان شروع","د پیل وخت"),"datetime-local",true)}
          {input("ended_at",tr("Ended at","زمان پایان","د پای وخت"),"datetime-local")}
          <div>
            <span className="block text-xs font-bold mb-2">{tr("Customer","مشتری","پېرودونکی")}</span>
            <CallLogRelationPicker session={session} language={language}
              endpoint="/api/v1/customers/" value={form.customer||""}
              selectedLabel={customerLabel} disabled={saving}
              onSelect={row=>{
                setForm(f=>({...f,customer:row?String(row.id):"",ticket:""}));
                setCustomerLabel(row?label(row):"");setTicketLabel("");
              }}/>
          </div>
          <div>
            <span className="block text-xs font-bold mb-2">{tr("Linked ticket","تیکت مرتبط","اړوند ټکټ")}</span>
            <CallLogRelationPicker session={session} language={language}
              endpoint="/api/v1/customer-tickets/" value={form.ticket||""}
              selectedLabel={ticketLabel} disabled={saving}
              onSelect={row=>{
                setForm(f=>({...f,ticket:row?String(row.id):"",
                  customer:row?text(row.customer):f.customer}));
                setTicketLabel(row?text(row.ticket_number):"");
                if(row)setCustomerLabel(text(row.customer_name));
              }}/>
          </div>
          <label className="sm:col-span-2">
            <span>{tr("Notes","یادداشت","یادښت")}</span>
            <textarea rows={3} value={form.notes||""}
              onChange={event=>setForm(f=>({...f,notes:event.target.value}))}/>
          </label>
        </fieldset>
        <p className="mt-3 text-xs">{tr(
          "Times use this device's timezone. Operator is recorded from your login.",
          "زمان‌ها بر اساس منطقه زمانی دستگاه است. اپراتور از حساب واردشده ثبت می‌شود.",
          "وختونه د وسیلې د وخت سیمې دي. اپراتور له ننوتلي حسابه ثبتېږي."
        )}</p>
        {saveError&&<p role="alert" className="mt-3 text-sm text-red-600 break-words">{saveError}</p>}
        </div>
        <div className="cc-call-dialog-footer">
          <button type="submit" className="cc-primary" disabled={saving}>
            {saving?tr("Saving…","در حال ثبت…","ثبتېږي…"):tr("Save call","ذخیره تماس","تماس خوندي کړئ")}
          </button>
          <button type="button" disabled={saving} onClick={()=>setEditing(false)}>
            {tr("Cancel","لغو","لغوه")}
          </button>
        </div>
        </form>
      </dialog>}

      

      {busy?<p role="status">{tr("Loading…","در حال دریافت…","ترلاسه کېږي…")}</p>:
      error?<p role="alert" className="text-red-600 break-words">{error}</p>:
      rows.length===0?<p>{tr("No calls found.","تماسی یافت نشد.","تماس ونه موندل شو.")}</p>:
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1200px] text-xs">
          <thead><tr>{[
            tr("Phone","شماره","شمېره"),tr("Subject","موضوع","موضوع"),
            tr("Direction","نوع","لوری"),tr("Outcome","نتیجه","پایله"),
            tr("Customer","مشتری","پېرودونکی"),tr("Ticket","تیکت","ټکټ"),
            tr("Started","شروع","پیل"),tr("Ended","پایان","پای"),
            tr("Duration (HH:mm:ss)","مدت (ساعت:دقیقه:ثانیه)","موده (ساعت:دقیقه:ثانیه)"),
            tr("Operator","اپراتور","اپراتور"),tr("Actions","عملیات","کړنې"),
          ].map((title,index)=><th key={index} className="p-3 text-start">{title}</th>)}</tr></thead>
          <tbody>{rows.map(row=><tr key={String(row.id)} className="border-t border-cyan-400/20">
            <td className="p-3" dir="ltr">{text(row.phone_number)}</td>
            <td className="p-3">{text(row.subject)}</td>
            <td className="p-3">{choice(directions,row.direction)}</td>
            <td className="p-3">{choice(outcomes,row.outcome)}</td>
            <td className="p-3">{text(row.customer_name)||"—"}</td>
            <td className="p-3">{text(row.ticket_number)||"—"}</td>
            <td className="p-3"><span className="cc-call-time" dir="ltr">{stamp(row.started_at)}</span></td>
            <td className="p-3"><span className="cc-call-time" dir="ltr">{stamp(row.ended_at)}</span></td>
            <td className="p-3"><span className="cc-call-time" dir="ltr" title="HH:mm:ss">{callDuration(row.duration_seconds)}</span></td>
            <td className="p-3">{text(row.operator_name)||text(row.operator_email)||"—"}</td>
            <td className="p-3"><button type="button" disabled={saving} onClick={()=>open(row)}>
              {tr("Edit","ویرایش","سمول")}
            </button></td>
          </tr>)}</tbody>
        </table>
      </div>}
      <div className="mt-4 flex flex-wrap justify-between items-center gap-2 text-xs">
        <button type="button" disabled={busy||page<=1} onClick={()=>setPage(p=>p-1)}>
          {tr("Previous","قبلی","مخکینی")}
        </button>
        <span>{tr("Page","صفحه","پاڼه")} {page} · {count}</span>
        <button type="button" disabled={busy||!next} onClick={()=>setPage(p=>p+1)}>
          {tr("Next","بعدی","بل")}
        </button>
      </div>
    </div>
  </section>;
}

function Workspace({session,language,refreshTrigger}: {session:Session; language:Lang; refreshTrigger:number}) {
  const tr = (en:string,fa:string,ps:string) =>
    language==="en"?en:language==="fa"?fa:ps;
  const mounted = useRef(true);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  const [rows,setRows]=useState<Row[]>([]);
  const [summary,setSummary]=useState<Record<string,number>>({});
  const [page,setPage]=useState(1);
  const [next,setNext]=useState(false);
  const [count,setCount]=useState(0);
  const [term,setTerm]=useState("");
  const [search,setSearch]=useState("");
  const [filter,setFilter]=useState("");
  const [version,setVersion]=useState(0);
  const [busy,setBusy]=useState(true);
  const [error,setError]=useState("");
  const [modal,setModal]=useState<"create"|"edit"|"view"|null>(null);
  const [selected,setSelected]=useState<Row|null>(null);
  const [form,setForm]=useState<Form>({});
  const [customerLabel,setCustomerLabel]=useState("");
  const [subscriptionLabel,setSubscriptionLabel]=useState("");
  const [saving,setSaving]=useState(false);
  const [saveError,setSaveError]=useState("");
  const access=session.access;

  useEffect(()=>{
    setVersion(v=>v+1);
  },[refreshTrigger]);

  const statuses = [
    ["open",tr("Open","باز","پرانیستی")],
    ["in_progress",tr("In progress","در حال رسیدگی","تر کار لاندې")],
    ["resolved",tr("Resolved","حل‌شده","حل شوی")],
    ["closed",tr("Closed","بسته","تړل شوی")],
    ["cancelled",tr("Cancelled","لغوشده","لغوه شوی")],
  ];
  const priorities = [
    ["low",tr("Low","کم","ټیټ")],["medium",tr("Medium","متوسط","منځنی")],
    ["high",tr("High","زیاد","لوړ")],["urgent",tr("Urgent","فوری","بیړنی")],
  ];
  const categories = [
    ["technical",tr("Technical issue","مشکل تخنیکی","تخنیکي ستونزه")],
    ["billing",tr("Billing & payment","بل و پرداخت","بل او تادیه")],
    ["service_request",tr("Service request","درخواست خدمت","د خدمت غوښتنه")],
    ["complaint",tr("Complaint","شکایت","شکایت")],
    ["inquiry",tr("General inquiry","پرسش عمومی","عمومي پوښتنه")],
  ];
  const choice = (options:string[][],value:unknown) =>
    options.find(option=>option[0]===value)?.[1] || String(value || "—");

  useEffect(()=>{
    if(!session.companyId){setBusy(false);setError(tr("Select a company first.","ابتدا شرکت را انتخاب کنید.","لومړی شرکت وټاکئ."));return;}
    let active=true;
    const controller=new AbortController();
    setBusy(true);setError("");setRows([]);setSummary({});
    const query=`search=${encodeURIComponent(search)}&status=${encodeURIComponent(filter)}`;
    Promise.all([
      api<Row[]|Paginated<Row>>(`/api/v1/customer-tickets/?page=${page}&${query}`,{signal:controller.signal},session),
      api<Record<string,number>>(`/api/v1/customer-tickets/summary/?${query}`,{signal:controller.signal},session),
    ]).then(([data,stats])=>{
      if(!active)return;
      setRows(rowsOf(data));setSummary(stats);
      setCount(Array.isArray(data)?data.length:data.count);
      setNext(!Array.isArray(data)&&Boolean(data.next));
    }).catch(err=>{if(active)setError(message(err));})
      .finally(()=>{if(active)setBusy(false);});
    return()=>{active=false;controller.abort();};
  },[session.tenantId,session.companyId,access,page,search,filter,version,language]);

  function open(mode:"create"|"edit"|"view",row:Row|null=null){
    const initial:Form={category:"technical",priority:"medium",status:"open",customer:"",customer_service:"",service:""};
    for(const key of ["subject","description","notes","resolution","assigned_team","assigned_user","category","priority","status","customer","customer_service","service"]){
      if(row)initial[key]=row[key]==null?"":String(row[key]);
    }
    setForm(initial);setSelected(row);setSaveError("");
    setCustomerLabel(String(row?.customer_name || ""));
    setSubscriptionLabel(String(row?.service_identifier || ""));
    setModal(mode);
  }

  async function save(event:FormEvent){
    event.preventDefault();
    if(saving)return;
    if(!form.customer){setSaveError(tr("Select a customer.","مشترک را انتخاب کنید.","پېرودونکی وټاکئ."));return;}
    setSaving(true);setSaveError("");
    const payload:Record<string,unknown>={...form};
    payload.customer_service=form.customer_service || null;
    payload.service=form.service || null;
    try{
      await api<Row>(selected
        ? `/api/v1/customer-tickets/${encodeURIComponent(String(selected.id))}/`
        : "/api/v1/customer-tickets/",
        {method:selected?"PATCH":"POST",body:JSON.stringify(payload)},session);
      if(!mounted.current)return;
      setModal(null);setPage(1);setVersion(v=>v+1);
    }catch(err){if(mounted.current)setSaveError(message(err));}
    finally{if(mounted.current)setSaving(false);}
  }

  const readOnly=modal==="view";
  function field(key:string,title:string,multiline=false){
    return <label className={multiline?"cc-wide":""}><span>{title}</span>
      {multiline?<textarea rows={3} disabled={readOnly||saving} value={form[key]||""}
        onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}/>:
        <input required={key==="subject"} maxLength={key==="subject"?255:key==="assigned_team"?80:160}
          disabled={readOnly||saving} value={form[key]||""}
          onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}/>}
    </label>;
  }
  function select(key:string,title:string,options:string[][]){
    return <label><span>{title}</span><select disabled={readOnly||saving}
      value={form[key]||""} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}>
      {options.map(([value,name])=><option key={value} value={value}>{name}</option>)}
    </select></label>;
  }

  return <div className="hq-callcenter" dir={language==="en"?"ltr":"rtl"}>
    <style>{`
      .hq-callcenter{color:#183a54;display:grid;gap:18px}
      .hq-callcenter .cc-card{border:1px solid rgba(181,220,248,.5);border-radius:20px;background:rgba(241,250,255,.65);backdrop-filter:blur(16px);padding:20px}
      .hq-callcenter button{display:inline-flex;align-items:center;justify-content:center;gap:7px;border:1px solid rgba(100,173,225,.35);border-radius:10px;padding:9px 13px;font-size:12px;font-weight:700;background:rgba(240,250,255,.6)}
      .hq-callcenter button:disabled{opacity:.45;cursor:not-allowed}
      .hq-callcenter .cc-primary{background:linear-gradient(135deg,#24a6ff,#1469dc);color:white}
      .hq-callcenter input,.hq-callcenter textarea,.hq-callcenter select{display:block;width:100%;min-width:0;padding:11px;border-radius:11px;border:1px solid rgba(100,173,225,.35);background:rgba(255,255,255,.65);color:inherit;font-size:12px}
      .hq-callcenter input:focus,.hq-callcenter textarea:focus,.hq-callcenter select:focus,.hq-callcenter button:focus-visible{outline:2px solid #38bdf8;outline-offset:2px}
      .hq-callcenter label>span{display:block;margin-bottom:7px;font-size:11px;font-weight:800}
      .hq-callcenter .cc-status-filter{
        box-sizing:border-box;
        width:240px;
        min-width:240px;
        max-width:100%;
        flex:0 0 240px;
        white-space:nowrap;
        overflow:visible;
        text-overflow:unset;
        appearance:none;
        -webkit-appearance:none;
        background-repeat:no-repeat;
        background-size:6px 6px,6px 6px;
      }
      .hq-callcenter[dir="rtl"] .cc-status-filter{
        direction:rtl;
        text-align:right;
        text-align-last:right;
        padding:11px 14px 11px 44px;
        background-image:
          linear-gradient(45deg,transparent 50%,currentColor 50%),
          linear-gradient(135deg,currentColor 50%,transparent 50%);
        background-position:
          18px calc(50% - 2px),
          13px calc(50% - 2px);
      }
      .hq-callcenter[dir="ltr"] .cc-status-filter{
        direction:ltr;
        text-align:left;
        text-align-last:left;
        padding:11px 44px 11px 14px;
        background-image:
          linear-gradient(45deg,transparent 50%,currentColor 50%),
          linear-gradient(135deg,currentColor 50%,transparent 50%);
        background-position:
          calc(100% - 13px) calc(50% - 2px),
          calc(100% - 18px) calc(50% - 2px);
      }
      @media(max-width:639px){
        .hq-callcenter .cc-status-filter{
          width:100%;
          min-width:0;
          flex:1 1 100%;
        }
      }
      .hq-callcenter .cc-ticket-mobile-cards{display:none}
      .hq-callcenter .cc-ticket-mobile-card{
        min-width:0;padding:13px;border:1px solid rgba(100,173,225,.30);
        border-radius:14px;background:rgba(255,255,255,.48);
        box-shadow:0 5px 14px rgba(24,58,84,.08)
      }
      .hq-callcenter .cc-ticket-mobile-card :is(span,p,strong){
        min-width:0;overflow-wrap:anywhere
      }
      .hq-callcenter .cc-ticket-mobile-card-label{
        display:block;font-size:10px;opacity:.68;margin-bottom:3px
      }
      .hq-callcenter .cc-ticket-mobile-heading{
        display:flex;align-items:flex-start;justify-content:space-between;gap:10px
      }
      .hq-callcenter .cc-ticket-mobile-subject{margin-top:10px;font-weight:700}
      .hq-callcenter .cc-ticket-mobile-meta{
        display:grid;grid-template-columns:repeat(2,minmax(0,1fr));
        gap:10px;margin-top:11px
      }
      .hq-callcenter .cc-ticket-mobile-actions{display:flex;gap:8px;margin-top:12px}
      .hq-callcenter .cc-ticket-mobile-actions button{
        min-height:36px;flex:1;justify-content:center
      }
      .hq-shell[data-theme=dark] .hq-callcenter .cc-ticket-mobile-card{
        background:rgba(16,46,68,.62);border-color:rgba(125,211,252,.22)
      }
      @media(max-width:639px){
        .hq-callcenter .cc-ticket-mobile-cards{display:grid;gap:10px}
        .hq-callcenter .cc-ticket-desktop-table{display:none!important}
      }
      .hq-callcenter table{width:100%;min-width:850px;border-collapse:collapse;font-size:12px;text-align:start}
      .hq-callcenter th,.hq-callcenter td{text-align:start;padding:14px 10px;border-bottom:1px solid rgba(126,177,213,.2)}
      .hq-callcenter th{font-size:11px;color:#58768f}
      .hq-callcenter .cc-error{color:#b4233a;background:rgba(255,228,230,.9);padding:12px;border-radius:10px;overflow-wrap:anywhere;white-space:pre-wrap;font-size:12px}
      .hq-callcenter .cc-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
      .hq-callcenter .cc-wide{grid-column:1/-1}
      .hq-callcenter .cc-lookup{display:grid;gap:8px;padding:10px;border:1px solid rgba(100,173,225,.25);border-radius:12px}
      .hq-callcenter .cc-options{max-height:130px;overflow:auto;display:grid;gap:4px}
      .hq-callcenter .cc-options button{justify-content:flex-start;text-align:start}
      .hq-callcenter .cc-options button[aria-pressed=true]{background:#d4efff}
      .hq-callcenter .cc-modal{display:flex;flex-direction:column;width:100%;max-width:900px;max-height:90dvh;border-radius:22px;background:rgba(235,247,255,.9);backdrop-filter:blur(22px);box-shadow:0 24px 80px #09254355;border:1px solid #ffffffaa}
      .hq-callcenter .cc-modal header,.hq-callcenter .cc-modal footer{padding:16px 20px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-shrink:0}
      .hq-callcenter .cc-modal main{padding:20px;overflow:auto;min-height:0}
      .hq-shell[data-theme=dark] .hq-callcenter{color:#e7f4ff}
      .hq-shell[data-theme=dark] .hq-callcenter .cc-card,.hq-shell[data-theme=dark] .hq-callcenter .cc-modal{background:rgba(13,39,61,.86)}
      .hq-shell[data-theme=dark] .hq-callcenter :is(input,select,textarea,button){background-color:rgba(16,46,68,.8);color:inherit}
      .hq-shell[data-theme=dark] .hq-callcenter option{background:#12334d}
      .hq-shell[data-theme=dark] .hq-callcenter .cc-options button[aria-pressed=true]{background:#20567b}
      .hq-callcenter .cc-status-filter-wrap{
        position:relative;
        box-sizing:border-box;
        width:240px;
        min-width:240px;
        max-width:100%;
        flex:0 0 240px;
      }
      .hq-callcenter .cc-status-filter-display{
        box-sizing:border-box;
        display:flex;
        align-items:center;
        width:100%;
        min-height:42px;
        border:1px solid rgba(100,173,225,.35);
        border-radius:11px;
        background:rgba(255,255,255,.65);
        color:inherit;
        font-size:12px;
        font-weight:400;
        line-height:1.4;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
      }
      .hq-callcenter[dir="rtl"] .cc-status-filter-display{
        direction:rtl;
        justify-content:flex-start;
        text-align:right;
        padding:11px 14px 11px 42px;
      }
      .hq-callcenter[dir="ltr"] .cc-status-filter-display{
        direction:ltr;
        justify-content:flex-start;
        text-align:left;
        padding:11px 42px 11px 14px;
      }
      .hq-callcenter .cc-status-filter-native{
        position:absolute;
        inset:0;
        z-index:2;
        width:100%;
        height:100%;
        min-width:0;
        padding:0;
        margin:0;
        border:0;
        opacity:0;
        cursor:pointer;
      }
      .hq-callcenter .cc-status-filter-wrap::after{
        content:"";
        position:absolute;
        z-index:1;
        top:50%;
        width:7px;
        height:7px;
        border-inline-end:2px solid currentColor;
        border-bottom:2px solid currentColor;
        transform:translateY(-65%) rotate(45deg);
        pointer-events:none;
        opacity:.8;
      }
      .hq-callcenter[dir="rtl"] .cc-status-filter-wrap::after{left:16px;}
      .hq-callcenter[dir="ltr"] .cc-status-filter-wrap::after{right:16px;}
      .hq-callcenter .cc-status-filter-wrap:focus-within .cc-status-filter-display{
        outline:2px solid #38bdf8;
        outline-offset:2px;
      }
      .hq-shell[data-theme=dark] .hq-callcenter .cc-status-filter-display{
        background:rgba(16,46,68,.8);
        color:inherit;
      }
      @media(max-width:639px){
        .hq-callcenter .cc-status-filter-wrap{width:100%;min-width:0;flex:1 1 100%;}
      }
      @media(min-width:1024px){.hq-shell[data-sidebar-hidden=false] .hq-callcenter-layer{inset-inline-start:14rem}}
      @media(max-width:639px){.hq-callcenter .cc-fields{grid-template-columns:1fr}.hq-callcenter .cc-card{padding:14px}.hq-callcenter .cc-modal main{padding:14px}}
      .hq-callcenter .cc-modal {
        box-sizing: border-box;
        width: 100% !important;
        max-width: 1080px !important;
        min-width: 0 !important;
        max-height: calc(100dvh - 32px) !important;
        overflow: hidden !important;
        color: #183a54 !important;
      }
      .hq-callcenter .cc-modal > main {
        display: block !important;
        position: relative !important;
        flex: 1 1 auto !important;
        box-sizing: border-box !important;
        width: 100% !important;
        max-width: none !important;
        min-width: 0 !important;
        min-height: 0 !important;
        margin: 0 !important;
        padding: 24px !important;
        overflow-x: hidden !important;
        overflow-y: auto !important;
        background: transparent !important;
        overscroll-behavior: contain;
        scrollbar-gutter: stable;
      }
      .hq-callcenter .cc-modal .cc-fields {
        display: grid !important;
        width: 100% !important;
        max-width: none !important;
        grid-template-columns: repeat(2,minmax(0,1fr)) !important;
        gap: 22px 24px !important;
        align-items: start !important;
      }
      .hq-callcenter .cc-modal .cc-fields > * {
        min-width: 0 !important;
        max-width: 100% !important;
      }
      .hq-callcenter .cc-modal label {
        display: block !important;
      }
      .hq-callcenter .cc-modal label > span,
      .hq-callcenter .cc-modal .cc-fields > div > span {
        color: #294a65 !important;
        font-size: 13px !important;
        line-height: 1.8 !important;
      }
      .hq-callcenter .cc-modal :is(input,select,textarea) {
        box-sizing: border-box !important;
        width: 100% !important;
        max-width: 100% !important;
        min-width: 0 !important;
        font-family: inherit !important;
        font-size: 14px !important;
        line-height: 1.6 !important;
        color: #183a54 !important;
        opacity: 1 !important;
        -webkit-text-fill-color: currentColor !important;
      }
      .hq-callcenter .cc-modal :is(input,select) {
        height: auto !important;
        min-height: 48px !important;
        padding-block: 10px !important;
        padding-inline: 14px !important;
      }
      .hq-callcenter .cc-modal select {
        appearance: auto !important;
        white-space: normal !important;
        text-overflow: clip !important;
        background-image: none !important;
      }
      .hq-callcenter .cc-modal option {
        color: #183a54;
        background: #eff8ff;
      }
      .hq-callcenter .cc-modal textarea {
        min-height: 112px !important;
        padding: 12px 14px !important;
        resize: vertical;
      }
      .hq-callcenter .cc-modal .cc-wide {
        grid-column: 1 / -1 !important;
      }
      .hq-callcenter .cc-modal .cc-fields > div > p {
        margin: 0;
        min-height: 48px;
        padding: 12px 14px;
        border: 1px solid rgba(100,173,225,.3);
        border-radius: 11px;
        background: rgba(255,255,255,.22);
        overflow-wrap: anywhere;
      }
      .hq-callcenter .cc-modal > header,
      .hq-callcenter .cc-modal > footer {
        flex: 0 0 auto !important;
        width: 100% !important;
        box-sizing: border-box;
        padding: 18px 24px !important;
      }
      /* TICKET_MODAL_BUTTON_WIDTH_V1 */
      .hq-callcenter .cc-modal > header > button {
        box-sizing: border-box !important;
        flex: 0 0 48px !important;
        width: 48px !important;
        min-width: 48px !important;
        height: 48px !important;
        min-height: 48px !important;
        white-space: nowrap !important;
      }
      .hq-callcenter .cc-modal > footer > button {
        box-sizing: border-box !important;
        flex: 0 0 auto !important;
        width: auto !important;
        min-width: max-content !important;
        min-height: 48px !important;
        padding: 10px 18px !important;
        white-space: nowrap !important;
      }

      .hq-callcenter .cc-modal > header {
        border-bottom: 1px solid rgba(100,173,225,.25);
      }
      .hq-callcenter .cc-modal > footer {
        border-top: 1px solid rgba(100,173,225,.25);
      }
      .hq-shell[data-theme=dark] .hq-callcenter .cc-modal {
        color: #e7f4ff !important;
      }
      .hq-shell[data-theme=dark] .hq-callcenter .cc-modal label > span,
      .hq-shell[data-theme=dark] .hq-callcenter .cc-modal .cc-fields > div > span {
        color: #c4dced !important;
      }
      .hq-shell[data-theme=dark] .hq-callcenter .cc-modal :is(input,select,textarea) {
        color: #e7f4ff !important;
      }
      .hq-shell[data-theme=dark] .hq-callcenter .cc-modal option {
        color: #e7f4ff;
        background: #12334d;
      }
      .hq-shell[data-theme=dark] .hq-callcenter .cc-modal .cc-fields > div > p {
        background: rgba(16,46,68,.5);
      }
      @media(max-width:639px) {
        .hq-callcenter .cc-modal {
          max-height: calc(100dvh - 24px) !important;
        }
        .hq-callcenter .cc-modal > main {
          padding: 16px !important;
        }
        .hq-callcenter .cc-modal .cc-fields {
          grid-template-columns: minmax(0,1fr) !important;
          gap: 18px !important;
        }
        .hq-callcenter .cc-modal > header,
        .hq-callcenter .cc-modal > footer {
          padding: 14px 16px !important;
        }
      }
    
        /* CALLCENTER_TICKET_MODAL_STANDARD_V1 */
        .hq-callcenter-layer {
          padding: 8px !important;
        }

        .hq-callcenter .cc-modal {
          box-sizing: border-box !important;
          width: min(1100px, calc(100vw - 24px)) !important;
          height: min(600px, calc(100dvh - 24px)) !important;
          min-height: min(560px, calc(100dvh - 24px)) !important;
          max-height: calc(100dvh - 24px) !important;
          display: grid !important;
          grid-template-rows: auto minmax(0, 1fr) auto !important;
          overflow: hidden !important;
        }

        .hq-callcenter .cc-modal > main {
          min-height: 0 !important;
          overflow-y: auto !important;
        }

        @media (max-width: 640px) {
          .hq-callcenter-layer {
            padding: 8px !important;
          }

          .hq-callcenter .cc-modal {
            width: calc(100vw - 16px) !important;
            height: calc(100dvh - 16px) !important;
            min-height: 0 !important;
            max-height: calc(100dvh - 16px) !important;
          }
        }

        
        /* CALLCENTER_TICKET_FOOTER_OPAQUE_V1 */
        .hq-callcenter .cc-modal > footer {
          position: relative !important;
          z-index: 20 !important;
          background: rgba(235, 247, 255, .98) !important;
          backdrop-filter: blur(16px) saturate(1.15) !important;
          box-shadow: 0 -8px 20px rgba(19, 55, 80, .08) !important;
        }

        .hq-callcenter .cc-modal > main {
          position: relative !important;
          z-index: 1 !important;
          scroll-padding-bottom: 24px;
        }

        
      /* CALLCENTER_TICKET_BODY_COLOR_V1 */
      .hq-callcenter .cc-modal > main {
        background: rgba(108, 158, 193, .34) !important;
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
      }
      .hq-shell[data-theme=dark] .hq-callcenter .cc-modal > main {
        background: rgba(15, 48, 72, .72) !important;
      }
      .hq-callcenter .cc-modal .cc-fields > div > p {
        background: rgba(226, 241, 252, .62) !important;
      }
      .hq-shell[data-theme=dark] .hq-callcenter .cc-modal .cc-fields > div > p {
        background: rgba(16, 46, 68, .78) !important;
      }

      /* CALLCENTER_TICKET_MODAL_LARGER_V1 */
      .hq-callcenter .cc-modal {
        width: min(1180px, calc(100vw - clamp(220px, 19vw, 270px) - 24px)) !important;
        height: min(700px, calc(100dvh - 24px)) !important;
        max-height: calc(100dvh - 24px) !important;
        min-height: min(640px, calc(100dvh - 24px)) !important;
      }
      @media (max-width: 639px) {
        .hq-callcenter .cc-modal {
          width: calc(100vw - 16px) !important;
          height: calc(100dvh - 24px) !important;
          min-height: 0 !important;
        }
      }

      /* CALLCENTER_TICKET_MODAL_RED_EDGE_V1 */
      .hq-callcenter .cc-modal {
        width: min(1180px, calc(100vw - clamp(220px, 19vw, 270px) - 4px)) !important;
        max-width: calc(100vw - clamp(220px, 19vw, 270px) - 4px) !important;
      }
      @media (max-width: 639px) {
        .hq-callcenter .cc-modal {
          width: calc(100vw - 16px) !important;
          max-width: calc(100vw - 16px) !important;
        }
      }

      /* CALLCENTER_TICKET_MATCH_OTHER_FORMS_V1 */
      .hq-callcenter .cc-modal {
        width: min(1090px, calc(100vw - 32px)) !important;
        height: min(610px, calc(100dvh - 24px)) !important;
        min-height: min(560px, calc(100dvh - 24px)) !important;
        max-height: calc(100dvh - 24px) !important;
      }
      @media (max-width: 639px) {
        .hq-callcenter .cc-modal {
          width: calc(100vw - 16px) !important;
          height: calc(100dvh - 24px) !important;
          min-height: 0 !important;
        }
      }

      /* CALLCENTER_TICKET_MODAL_WIDER_V1 */
      .hq-callcenter .cc-modal {
        width: min(1200px, calc(100vw - 24px)) !important;
        max-width: min(1200px, calc(100vw - 24px)) !important;
      }

      /* TICKET_MODAL_ACTION_BUTTONS_FINAL_V1 */
      .hq-callcenter .cc-modal > header > button {
        box-sizing: border-box !important;
        display: inline-flex !important;
        flex: 0 0 44px !important;
        width: 44px !important;
        min-width: 44px !important;
        height: 44px !important;
        min-height: 44px !important;
        padding: 0 !important;
        align-items: center !important;
        justify-content: center !important;
        writing-mode: horizontal-tb !important;
      }
      .hq-callcenter .cc-modal > footer > button {
        box-sizing: border-box !important;
        display: inline-flex !important;
        flex: 0 0 auto !important;
        width: auto !important;
        min-width: 72px !important;
        height: 44px !important;
        min-height: 44px !important;
        padding: 0 16px !important;
        align-items: center !important;
        justify-content: center !important;
        white-space: nowrap !important;
        writing-mode: horizontal-tb !important;
      }

      /* CALLCENTER_TICKET_MODAL_FINAL_OVERRIDE_V1 */
      .hq-callcenter-layer {
        z-index: 9999 !important;
        background: transparent !important;
      }
      .hq-callcenter-layer::before {
        content: "";
        position: fixed;
        inset: 0;
        z-index: 0;
        pointer-events: none;
        background: rgba(8, 24, 40, .38);
        backdrop-filter: blur(5px);
      }
      .hq-callcenter-layer > form.cc-modal {
        position: relative !important;
        z-index: 1 !important;
      }
      .hq-callcenter form.cc-modal[role="dialog"] > header > button {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        box-sizing: border-box !important;
        writing-mode: horizontal-tb !important;
        flex: 0 0 48px !important;
        width: 48px !important;
        min-width: 48px !important;
        max-width: 48px !important;
        height: 48px !important;
        min-height: 48px !important;
        padding: 0 !important;
      }
      .hq-callcenter form.cc-modal[role="dialog"] > footer > button {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        box-sizing: border-box !important;
        writing-mode: horizontal-tb !important;
        flex: 0 0 auto !important;
        width: max-content !important;
        min-width: 72px !important;
        max-width: none !important;
        min-height: 48px !important;
        padding: 10px 18px !important;
        white-space: nowrap !important;
      }


      /* CALLCENTER_TICKET_MODAL_VIEWPORT_FIT_V1 */
      .hq-callcenter-layer > form.cc-modal {
        box-sizing: border-box !important;
        width: min(1080px, calc(100% - 24px)) !important;
        max-width: 1080px !important;
        min-width: 0 !important;
        margin-inline: auto !important;
      }


      /* CALLCENTER_TICKET_MODAL_WIDTH_RESTORE_V1 */
      .hq-callcenter-layer > form.cc-modal {
        box-sizing: border-box !important;
        flex: 0 0 min(1080px, calc(100vw - 280px)) !important;
        width: min(1080px, calc(100vw - 280px)) !important;
        min-width: 0 !important;
        max-width: 1080px !important;
      }
      @media (max-width: 800px) {
        .hq-callcenter-layer > form.cc-modal {
          flex: 0 1 calc(100vw - 24px) !important;
          width: calc(100vw - 24px) !important;
          max-width: calc(100vw - 24px) !important;
        }
      }

`}</style>

    <header className="cc-card flex flex-wrap items-center justify-between gap-4">
      <div><div className="flex items-center gap-2"><Headphones className="h-6 w-6"/>
        <h1 className="text-xl font-black">{tr("Tickets Management","مدیریت تیکت‌ها","د ټکټونو اداره")}</h1></div>
        <p className="mt-2 text-xs">{tr("Customer support tickets and tracking",
          "تیکت‌های پشتیبانی و پیگیری مشتریان","د پېرودونکو د ملاتړ ټکټونه او تعقیب")}</p></div>
      <button type="button" className="cc-primary" disabled={!session.companyId}
        onClick={()=>open("create")}><Plus className="h-4 w-4"/>{tr("New ticket","تیکت جدید","نوی ټکټ")}</button>
    </header>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {[["total",tr("All tickets","تمام تیکت‌ها","ټول ټکټونه")],
        ["open",tr("Open","باز","پرانیستي")],
        ["in_progress",tr("In progress","در حال رسیدگی","تر کار لاندې")],
        ["resolved",tr("Resolved","حل‌شده","حل شوي")]].map(([key,name])=>
        <div className="cc-card" key={key}><p className="text-xs">{name}</p>
          <strong className="block mt-3 text-2xl">{busy?"…":summary[key]??"—"}</strong></div>)}
    </div>

    <section className="cc-card">
      <form className="flex flex-wrap items-center gap-3 mb-4" onSubmit={event=>{
        event.preventDefault();setPage(1);setSearch(term);
      }}>
        <div className="flex-1 min-w-[180px]"><input value={term} onChange={e=>setTerm(e.target.value)}
          aria-label={tr("Search tickets","جستجوی تیکت","د ټکټ لټون")}
          placeholder={tr("Ticket, subject, customer or assignee","شماره، موضوع، مشترک یا مسئول","شمېره، موضوع، پېرودونکی یا مسئول")}/></div>
        <button type="submit"><Search className="h-4 w-4"/>{tr("Search","جستجو","لټون")}</button>
        <div className="cc-status-filter-wrap">
          <span
            className="cc-status-filter-display"
            aria-hidden="true"
          >
            {filter
              ? (statuses.find(([key])=>key===filter)?.[1] || filter)
              : tr("All statuses","همه وضعیت‌ها","ټول حالتونه")}
          </span>
          <select className="cc-status-filter cc-status-filter-native" aria-label={tr("Status","وضعیت","حالت")} value={filter}
          onChange={e=>{setFilter(e.target.value);setPage(1);}}>
          <option value="">{tr("All statuses","همه وضعیت‌ها","ټول حالتونه")}</option>
          {statuses.map(([key,name])=><option key={key} value={key}>{name}</option>)}
        </select>
        </div>
      </form>

      {error && <p role="alert" className="cc-error">{error}</p>}
      {busy?<div className="flex justify-center p-10"><Loader2 className="animate-spin"/></div>:
        !error && <>
          <div className="cc-ticket-mobile-cards" aria-label={tr("Tickets","تیکت‌ها","ټکټونه")}>
            {rows.map(row=><article className="cc-ticket-mobile-card" key={`mobile-${String(row.id)}`}>
              <div className="cc-ticket-mobile-heading">
                <div>
                  <span className="cc-ticket-mobile-card-label">{tr("Number","شماره","شمېره")}</span>
                  <strong dir="auto">{String(row.ticket_number)}</strong>
                </div>
                <div className="text-end">
                  <span className="cc-ticket-mobile-card-label">{tr("Status","وضعیت","حالت")}</span>
                  <strong>{choice(statuses,row.status)}</strong>
                </div>
              </div>
              <div className="cc-ticket-mobile-subject">
                <span className="cc-ticket-mobile-card-label">{tr("Subject","موضوع","موضوع")}</span>
                <p>{String(row.subject)}</p>
              </div>
              <div className="cc-ticket-mobile-meta">
                <div>
                  <span className="cc-ticket-mobile-card-label">{tr("Customer","مشترک","پېرودونکی")}</span>
                  <strong>{String(row.customer_name||"—")}</strong>
                </div>
                <div>
                  <span className="cc-ticket-mobile-card-label">{tr("Priority","اولویت","لومړیتوب")}</span>
                  <strong>{choice(priorities,row.priority)}</strong>
                </div>
                <div className="col-span-2">
                  <span className="cc-ticket-mobile-card-label">{tr("Assignee","مسئول","مسئول")}</span>
                  <strong>{String(row.assigned_user||row.assigned_team||"—")}</strong>
                </div>
              </div>
              <div className="cc-ticket-mobile-actions">
                <button type="button" onClick={()=>open("view",row)}
                  aria-label={tr("View ticket","مشاهده تیکت","ټکټ کتل")}>
                  <Eye className="h-4 w-4"/>{tr("View","مشاهده","کتل")}
                </button>
                <button type="button" onClick={()=>open("edit",row)}
                  aria-label={tr("Edit ticket","ویرایش تیکت","ټکټ سمول")}>
                  <Pencil className="h-4 w-4"/>{tr("Edit","ویرایش","سمول")}
                </button>
              </div>
            </article>)}
            {!rows.length&&<p className="text-sm">{tr("No tickets found.","تیکتی یافت نشد.","ټکټ ونه موندل شو.")}</p>}
          </div>
          <div className="overflow-x-auto cc-ticket-desktop-table"><table><thead><tr>
          {[tr("Number","شماره","شمېره"),tr("Subject","موضوع","موضوع"),tr("Customer","مشترک","پېرودونکی"),
            tr("Priority","اولویت","لومړیتوب"),tr("Status","وضعیت","حالت"),tr("Assignee","مسئول","مسئول"),
            tr("Actions","عملیات","کړنې")].map(name=><th key={name} scope="col">{name}</th>)}
        </tr></thead><tbody>
          {rows.map(row=><tr key={String(row.id)}>
            <td dir="auto">{String(row.ticket_number)}</td><td>{String(row.subject)}</td>
            <td>{String(row.customer_name||"—")}</td><td>{choice(priorities,row.priority)}</td>
            <td>{choice(statuses,row.status)}</td><td>{String(row.assigned_user||row.assigned_team||"—")}</td>
            <td><div className="flex gap-2">
              <button type="button" onClick={()=>open("view",row)} aria-label={tr("View ticket","مشاهده تیکت","ټکټ کتل")}><Eye className="h-4 w-4"/></button>
              <button type="button" onClick={()=>open("edit",row)} aria-label={tr("Edit ticket","ویرایش تیکت","ټکټ سمول")}><Pencil className="h-4 w-4"/></button>
            </div></td>
          </tr>)}
          {!rows.length&&<tr><td colSpan={7}>{tr("No tickets found.","تیکتی یافت نشد.","ټکټ ونه موندل شو.")}</td></tr>}
        </tbody></table></div>
        </>}
      <div className="flex items-center justify-between gap-3 mt-4 text-xs">
        <button type="button" disabled={busy||page===1} onClick={()=>setPage(p=>p-1)}>{tr("Previous","قبلی","مخکینی")}</button>
        <span>{tr("Page","صفحه","پاڼه")} {page} · {count} {tr("tickets","تیکت","ټکټونه")}</span>
        <button type="button" disabled={busy||!next} onClick={()=>setPage(p=>p+1)}>{tr("Next","بعدی","بل")}</button>
      </div>
    </section>

    {modal&&createPortal(<div className="hq-callcenter hq-callcenter-layer fixed inset-0 z-[100] flex items-center justify-center p-3 bg-slate-950/30">
      <form className="cc-modal" role="dialog" aria-modal="true" aria-labelledby="cc-title" onSubmit={save}
        onKeyDown={event=>{if(event.key==="Escape"&&!saving)setModal(null);}}>
        <header><h2 id="cc-title" className="font-black">{modal==="create"?tr("New ticket","تیکت جدید","نوی ټکټ"):tr("Ticket details","مشخصات تیکت","د ټکټ معلومات")}</h2>
          <button type="button" disabled={saving} onClick={()=>setModal(null)} aria-label={tr("Close","بستن","تړل")}><X className="h-4 w-4"/></button></header>
        <main>
          {saveError&&<p role="alert" className="cc-error mb-4">{saveError}</p>}
          <div className="cc-fields">
            {field("subject",tr("Subject *","موضوع *","موضوع *"))}
            {select("category",tr("Category","دسته‌بندی","ډول"),categories)}
            {select("priority",tr("Priority","اولویت","لومړیتوب"),priorities)}
            {select("status",tr("Status","وضعیت","حالت"),statuses)}
            <div><span className="block mb-2 text-xs font-bold">{tr("Customer *","مشترک *","پېرودونکی *")}</span>
              {readOnly?<p>{customerLabel||form.customer}</p>:<CallLogRelationPicker session={session} endpoint="/api/v1/customers/" language={language}
                value={form.customer||""} selectedLabel={customerLabel} disabled={saving}
                onSelect={row=>{setCustomerLabel(row?label(row):"");setSubscriptionLabel("");
                  setForm(f=>({...f,customer:row?String(row.id):"",customer_service:"",service:""}));}}/>}
            </div>
            <div><span className="block mb-2 text-xs font-bold">{tr("Subscription (optional)","اشتراک (اختیاری)","ګډون (اختیاري)")}</span>
              {readOnly?<p>{subscriptionLabel||form.customer_service||"—"}</p>:form.customer?
                <CallLogRelationPicker session={session} key={form.customer} endpoint="/api/v1/customer-services/" language={language}
                  value={form.customer_service||""} selectedLabel={subscriptionLabel} disabled={saving}
                  customer={form.customer} onSelect={row=>{setSubscriptionLabel(row?label(row):"");
                    setForm(f=>({...f,customer_service:row?String(row.id):"",service:row?String(row.service||""):""}));}}/>:
                <p className="text-xs">{tr("Select a customer first.","ابتدا مشترک را انتخاب کنید.","لومړی پېرودونکی وټاکئ.")}</p>}
            </div>
            {field("assigned_team",tr("Assigned team","تیم مسئول","مسئول ټیم"))}
            <TicketAssigneePicker
              session={session}
              language={language}
              value={form.assigned_user||""}
              disabled={readOnly||saving}
              onChange={email=>setForm(current=>({
                ...current,assigned_user:email,
              }))}
            />
            {field("description",tr("Description","شرح مشکل","تشریح"),true)}
            {field("resolution",tr("Resolution","نتیجه رسیدگی","د حل پایله"),true)}
            {field("notes",tr("Notes","یادداشت","یادښت"),true)}
          </div>

          {selected?.id != null && modal !== "create" && (
            <>
              <TicketComments
                key={`comments:${session.tenantId}:${session.companyId}:${String(selected.id)}:${modal}`}
                session={session}
                ticketId={String(selected.id)}
                language={language}
              />
            <TicketTimeline
              key={`${session.tenantId}:${session.companyId}:${String(selected.id)}:${modal}`}
              session={session}
              ticketId={String(selected.id)}
              language={language}
            />
            </>
          )}
        </main>
        <footer><button type="button" disabled={saving} onClick={()=>setModal(null)}>{tr("Close","بستن","تړل")}</button>
          {!readOnly&&<button type="submit" className="cc-primary" disabled={saving}>
            {saving?<Loader2 className="h-4 w-4 animate-spin"/>:<Save className="h-4 w-4"/>}
            {tr("Save","ذخیره","خوندي کول")}</button>}</footer>
      </form>
    </div>, document.querySelector(".hq-shell") ?? document.body)}
  </div>;
}

function CallCenterDashboard({
  session,
  language,
  refreshTrigger,
}: {
  session: Session;
  language: Lang;
  refreshTrigger: number;
}) {
  const tr = (en: string, fa: string, ps: string) =>
    language === "en" ? en : language === "fa" ? fa : ps;

  type DashboardMetrics = {
    calls: number;
    answered: number;
    tickets: number;
  };

  const [metrics, setMetrics] = useState<DashboardMetrics>({
    calls: 0,
    answered: 0,
    tickets: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const payloadCount = (payload: unknown): number => {
    if (Array.isArray(payload)) return payload.length;
    if (payload && typeof payload === "object") {
      const value = payload as { count?: unknown; results?: unknown[] };
      if (typeof value.count === "number") return value.count;
      if (Array.isArray(value.results)) return value.results.length;
    }
    return 0;
  };

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [callsPayload, answeredPayload, ticketsPayload] = await Promise.all([
          api<unknown>("/api/v1/customer-call-logs/?page=1", { signal: controller.signal }, session),
          api<unknown>("/api/v1/customer-call-logs/?page=1&outcome=answered", { signal: controller.signal }, session),
          api<unknown>("/api/v1/customer-tickets/?page=1", { signal: controller.signal }, session),
        ]);
        if (controller.signal.aborted) return;
        setMetrics({
          calls: payloadCount(callsPayload),
          answered: payloadCount(answeredPayload),
          tickets: payloadCount(ticketsPayload),
        });
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : tr("Unable to load dashboard data.", "داده‌های داشبورد بارگذاری نشد.", "د ډشبورډ معلومات پورته نه شول."));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [session.tenantId, session.companyId, refreshTrigger]);

  const otherOutcomes = Math.max(metrics.calls - metrics.answered, 0);

  const dashboardCards = [
    {
      key: "calls",
      label: ["Total Calls", "مجموع تماس‌ها", "ټول تماسونه"],
      value: metrics.calls,
      Icon: PhoneCall,
    },
    {
      key: "answered",
      label: ["Answered Calls", "تماس‌های پاسخ‌داده‌شده", "ځواب شوي تماسونه"],
      value: metrics.answered,
      Icon: PhoneCall,
    },
    {
      key: "other",
      label: ["Other Outcomes", "سایر نتایج تماس", "نورې پایلې"],
      value: otherOutcomes,
      Icon: PhoneCall,
    },
    {
      key: "tickets",
      label: ["Total Tickets", "مجموع تیکت‌ها", "ټول ټکټونه"],
      value: metrics.tickets,
      Icon: Ticket,
    },
  ];

  return (
    <div className="ws-extra cc-dashboard-layout-v1 w-full min-w-0" dir={language === "en" ? "ltr" : "rtl"}>
      <div className="ws-extra-card w-full min-w-0 rounded-2xl border border-white/40 bg-white/55 p-4 shadow-lg backdrop-blur-xl md:p-5">
        <div className="ws-extra-heading mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2>{tr("Call Center Dashboard", "داشبورد مرکز تماس", "د اړیکو مرکز ډشبورډ")}</h2>
          <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-400/20">
            {tr("Live backend data", "دادهٔ واقعی Backend", "د Backend واقعي معلومات")}
          </span>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 mb-4">
          {tr(
            "Live operational metrics from enterprise call-log and ticket APIs.",
            "شاخص‌های عملیاتی زنده از APIهای سازمانی ثبت تماس و تیکت.",
            "د تماس او ټکټ API څخه ژوندی عملیاتي شاخصونه."
          )}
        </p>

        {error && <p role="alert" className="text-red-500 mb-3">{error}</p>}

        <div className="ws-dashboard-grid grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {dashboardCards.map(({ key, label, value, Icon }) => (
            <article className="ws-dashboard-tile flex min-w-0 items-center gap-3 rounded-xl border border-white/70 bg-white/60 p-4 shadow-md dark:border-sky-300/20 dark:bg-slate-900/70" key={key}>
              <span className="ws-dashboard-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-700 dark:text-cyan-300" aria-hidden="true">
                <Icon size={21} strokeWidth={1.8} />
              </span>
              <div className="ws-dashboard-copy grid min-w-0 gap-1" dir={language === "en" ? "ltr" : "rtl"}>
                <span className="ws-dashboard-title block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {tr(...(label as [string, string, string]))}
                </span>
                <strong className="ws-dashboard-value text-2xl font-black text-slate-900 dark:text-white">
                  {loading ? "—" : value}
                </strong>
                <small className="ws-dashboard-caption text-[11px] font-medium text-slate-700 dark:text-slate-300">{tr("Live backend data", "دادهٔ واقعی Backend", "د Backend واقعي معلومات")}</small>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}


function CallCenterPlaceholder({title, description, language}: {title: string; description: string; language: Lang}) {
  const tr = (en: string, fa: string, ps: string) =>
    language === "en" ? en : language === "fa" ? fa : ps;

  return (
    <div className="cc-card p-8 text-center" dir={language === "en" ? "ltr" : "rtl"}>
      <div className="max-w-md mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-400/30 flex items-center justify-center mx-auto mb-4 text-sky-500">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold mb-2">{title}</h2>
        <p className="text-xs opacity-80 mb-6 leading-relaxed">{description}</p>
        <div className="inline-block px-4 py-2 rounded-xl bg-sky-500/10 border border-sky-400/20 text-xs font-semibold text-sky-600 dark:text-sky-400">
          {tr("Frontend Structure / Awaiting Backend Integration", "ساختار فرانت‌اند / در انتظار یکپارچه‌سازی بک‌اند", "د مخ پرزی جوړښت / د بېکنډ ادغام په تمه")}
        </div>
      </div>
    </div>
  );
}

export function CallCenterModule({session}: {session: Session}) {
  const {t, rtl} = useTranslation();
  const language: Lang = t.common.callcenter === "Call Center" ? "en" :
    t.common.callcenter === "مرکز تماس" ? "fa" : "ps";

  const [section, setSection] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const tr = (en: string, fa: string, ps: string) =>
    language === "en" ? en : language === "fa" ? fa : ps;

  const sectionsList = [
    { id: "dashboard", title: tr("Dashboard", "داشبورد", "ډشبورډ"), description: tr("Call center operational summary.", "خلاصه عملیاتی مرکز تماس.", "د اړیکو مرکز عملیاتي خلاصه."), icon: LayoutDashboard },
    { id: "calls", title: tr("Calls", "تماس‌ها", "تماسونه"), description: tr("Call log records, search, filters.", "سوابق تماس، جستجو و فیلترها.", "د تماس ریکارډونه، لټون او چاڼونه."), icon: PhoneCall },
    { id: "tickets", title: tr("Tickets", "تیکت‌ها", "ټکټونه"), description: tr("Support tickets and comments.", "تیکت‌های پشتیبانی و نظرات.", "د ملاتړ ټکټونه او نظرونه."), icon: Ticket },
    { id: "followups", title: tr("Follow-ups", "پیگیری‌ها", "تعقیبونه"), description: tr("Scheduled callbacks.", "تماس‌های برگشتی.", "پلان شوې بېرته اړیکې."), icon: Clock },
    { id: "agents", title: tr("Agents", "اپراتورها", "کارکونکي"), description: tr("Live agent status.", "وضعیت زنده اپراتورها.", "د کارکونکو ژوندی حالت."), icon: Users },
    { id: "supervisor", title: tr("Supervisor", "سرپرست", "څارونکی"), description: tr("Supervisor monitoring.", "نظارت سرپرست.", "د څارونکي څارنه."), icon: ShieldAlert },
    { id: "reports", title: tr("Reports", "گزارش‌ها", "راپورونه"), description: tr("Performance reports.", "گزارش‌های عملکرد.", "د فعالیت راپورونه."), icon: BarChart3 },
    { id: "quality", title: tr("Quality Control", "کنترل کیفیت", "د کیفیت کنټرول"), description: tr("Call quality audits.", "ارزیابی کیفیت تماس.", "د تماس کیفیت ارزونه."), icon: CheckSquare },
    { id: "settings", title: tr("Settings", "تنظیمات", "تنظیمات"), description: tr("Routing rules and parameters.", "قوانین و پارامترها.", "قوانین او پیرامیټرونه."), icon: Settings },
  ];

  const activeSectionObj = sectionsList.find(s => s.id === section);
  const ActiveIcon = activeSectionObj?.icon || Headphones;

  return (
    <div className="hq-callcenter-module grid gap-4" dir={language === "en" ? "ltr" : "rtl"}>
      <style>{`
        .hq-callcenter-module .cc-hub-card {
          border: 1px solid rgba(181,220,248,.5);
          border-radius: 1.1rem;
          background: rgba(241,250,255,.65);
          backdrop-filter: blur(16px);
          padding: 12px 14px;
          text-align: start;
          transition: all .3s ease;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 8px;
          cursor: pointer;
          min-height: 96px;
        }
        .hq-callcenter-module .cc-hub-card:hover {
          transform: translateY(-2px);
          border-color: rgba(36,166,255,.5);
          box-shadow: 0 16px 40px rgba(36,166,255,.12);
        }
        .hq-shell[data-theme="dark"] .hq-callcenter-module .cc-hub-card {
          background: rgba(13,39,61,.86);
          border-color: rgba(181,222,246,.2);
        }
 
        /* CALLCENTER_DOCUMENTS_STYLE_V1 */
        .hq-callcenter-module{color:#183a54}
        .hq-callcenter-module :is(.cc-hub-card,.cc-card,.cc-timeline,.cc-lookup,.cc-call-picker-menu,.cc-call-dialog){
          border:1px solid #b5dcf888;border-radius:20px;
          background:rgba(235,247,255,.78);color:inherit;
          backdrop-filter:blur(18px);box-shadow:0 12px 36px rgba(7,44,75,.10)
        }
        .hq-callcenter-module .cc-hub-card{padding:16px}
        .hq-callcenter-module .cc-primary{border:1px solid #167deb!important;background:#167deb!important;color:white!important}
        .hq-callcenter-module :is(.cc-card,.cc-call-dialog,.cc-lookup) :is(input,select,textarea){
          box-sizing:border-box;min-width:0;border:1px solid #91bddb99;border-radius:10px;
          background:rgba(255,255,255,.78);color:inherit;font:inherit
        }
        .hq-callcenter-module :is(.cc-card,.cc-timeline) :is(th,td){
          padding:12px;border-bottom:1px solid #91bddb55;text-align:start
        }
        .hq-shell[data-theme=dark] .hq-callcenter-module{color:#e7f4ff}
        .hq-shell[data-theme=dark] .hq-callcenter-module :is(.cc-hub-card,.cc-card,.cc-timeline,.cc-lookup,.cc-call-picker-menu,.cc-call-dialog){
          background:rgba(13,39,61,.88);border-color:#b5def638;color:#e7f4ff
        }
        .hq-shell[data-theme=dark] .hq-callcenter-module :is(.cc-card,.cc-call-dialog,.cc-lookup) :is(input,select,textarea){
          background:rgba(22,60,89,.78);color:#e7f4ff
        }
        @media(max-width:639px){.hq-callcenter-module :is(.cc-card,.cc-timeline){padding:14px}}
     
      /* CALLCENTER_BUTTONS_3D_V1 */
      .hq-callcenter button,
      .hq-callcenter [role="button"] {
        position: relative;
        border-style: solid;
        outline: 1px solid rgba(255,255,255,.22);
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,.42),
          0 3px 0 rgba(10,45,70,.28),
          0 6px 12px rgba(10,45,70,.18) !important;
        transition: transform .14s ease, box-shadow .14s ease, filter .14s ease;
      }
      .hq-callcenter button:hover:not(:disabled),
      .hq-callcenter [role="button"]:hover {
        transform: translateY(-1px);
        filter: brightness(1.035);
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,.48),
          0 4px 0 rgba(10,45,70,.27),
          0 8px 16px rgba(10,45,70,.22) !important;
      }
      .hq-callcenter button:active:not(:disabled),
      .hq-callcenter [role="button"]:active {
        transform: translateY(2px);
        box-shadow:
          inset 0 2px 4px rgba(10,45,70,.18),
          0 1px 0 rgba(10,45,70,.24) !important;
      }
      .hq-callcenter button:disabled {
        box-shadow: none !important;
        outline-color: transparent;
      }
`}</style>

      {section === null ? (
        <div className="space-y-4">
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {sectionsList.map(card => {
              const Icon = card.icon;
              return (
                <button
                  key={card.id}
                  type="button"
                  className="cc-hub-card group"
                  onClick={() => setSection(card.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-400/30 bg-sky-400/10 text-sky-500 group-hover:scale-110 transition-transform shadow-[0_0_12px_rgba(34,211,238,0.15)]">
                      <Icon className="h-5 w-5" />
                    </div>
                    {rtl ? (
                      <ArrowLeft className="h-4 w-4 text-slate-400 group-hover:-translate-x-1 group-hover:text-sky-500 transition-all" />
                    ) : (
                      <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 group-hover:text-sky-500 transition-all" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-black group-hover:text-sky-500 transition-colors">
                      {card.title}
                    </h3>
                    
                  </div>
                </button>
              );
            })}
          </section>
        </div>
      ) : (
        <div className="grid gap-4">
          {/* Unified Header for Open Section */}
          <div className="cc-card p-3.5 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSection(null)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border border-cyan-400/30 bg-white/20 hover:bg-white/30 transition-all"
                aria-label={tr("Back to sections", "بازگشت به بخش‌ها", "بخشونو ته ګرځیدل")}
              >
                {rtl ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
                <span>{tr("Sections", "بخش‌ها", "بخشونه")}</span>
              </button>
              <div className="flex items-center gap-2">
                <ActiveIcon className="h-5 w-5 text-sky-500" />
                <h2 className="text-sm sm:text-base font-black">{activeSectionObj?.title}</h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRefreshTrigger(v => v + 1)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border border-cyan-400/30 bg-white/20 hover:bg-white/30 transition-all"
                title={tr("Refresh", "تازه‌سازی", "تازه کول")}
              >
                <RefreshCcw className="h-4 w-4" />
                <span>{tr("Refresh", "تازه‌سازی", "تازه کول")}</span>
              </button>
            </div>
          </div>

          {/* Active Section Content */}
          {section === "dashboard" && (
            <CallCenterDashboard session={session} language={language} refreshTrigger={refreshTrigger} />
          )}
          {section === "calls" && (
            <CustomerCallLogs key={`calls:${session.tenantId}:${session.companyId || ""}`} session={session} language={language} refreshTrigger={refreshTrigger} />
          )}
          {section === "tickets" && (
            <Workspace key={`tickets:${session.tenantId}:${session.companyId || ""}`} session={session} language={language} refreshTrigger={refreshTrigger} />
          )}
          {section === "followups" && (
            <CustomerFollowUps
              key={`followups:${session.tenantId}:${session.companyId || ""}`}
              session={session}
              language={language}
              refreshTrigger={refreshTrigger}
            />
          )}

          {/* CALLCENTER_AGENTS_UI_V1 */}
          {section === "agents" && (
            <CallCenterAgents session={session} language={language}
              refreshTrigger={refreshTrigger} />
          )}
          {/* CALLCENTER_SUPERVISOR_UI_V1 */}
          {section === "supervisor" && (
            <CallCenterSupervisor session={session} language={language}
              refreshTrigger={refreshTrigger} />
          )}
          {section === "reports" && (
            <CallCenterReports session={session} language={language} refreshTrigger={refreshTrigger} />
          )}
          {section === "quality" && (
            <CallCenterQuality session={session} language={language} refreshTrigger={refreshTrigger} />
          )}
          {section === "settings" && <CallCenterSettings session={session} language={language} />}
        </div>
      )}
    </div>
  );
}
