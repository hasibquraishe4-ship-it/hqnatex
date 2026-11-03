import { PageHeader as SharedPageHeader } from "../../components/PageHeader";
import { SecondaryButton as SharedSecondaryButton, PrimaryButton as SharedPrimaryButton } from "../../components/Interface";
import { useEffect, useState } from "react";
import { api, type Paginated, type Session } from "../../lib/api";

type Lang = "en" | "fa" | "ps";
type Priority = "low" | "normal" | "high" | "urgent";
type Day = "sunday" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday";
type Outcome = "answered" | "missed" | "no_answer" | "busy" | "failed" | "cancelled";
type Criterion = "greeting" | "verification" | "understanding" | "accuracy" | "communication";
type Agent = { id: string; email: string; display_name?: string; full_name?: string };
type Queue = { key: string; name: string; agents: string[] };
type Configuration = {
  queues: Queue[];
  business_hours: {
    timezone: string;
    days: Record<Day, { enabled: boolean; open: string; close: string }>;
  };
  sla: {
    first_response_minutes: Record<Priority, number>;
    resolution_minutes: Record<Priority, number>;
  };
  outcomes: Outcome[];
  quality_rubric: { key: Criterion; weight: number }[];
};
type Props = { session: Session; language: Lang };

const dayKeys: Day[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const priorities: Priority[] = ["low", "normal", "high", "urgent"];
const outcomeKeys: Outcome[] = ["answered", "missed", "no_answer", "busy", "failed", "cancelled"];
const criterionKeys: Criterion[] = ["greeting", "verification", "understanding", "accuracy", "communication"];

function defaults(): Configuration {
  return {
    queues: [],
    business_hours: {
      timezone: "Asia/Kabul",
      days: Object.fromEntries(dayKeys.map(day => [
        day, { enabled: day !== "friday", open: "08:00", close: "17:00" },
      ])) as Configuration["business_hours"]["days"],
    },
    sla: {
      first_response_minutes: { low: 60, normal: 30, high: 15, urgent: 5 },
      resolution_minutes: { low: 1440, normal: 480, high: 120, urgent: 60 },
    },
    outcomes: [...outcomeKeys],
    quality_rubric: criterionKeys.map(key => ({ key, weight: 20 })),
  };
}

export function CallCenterSettings({ session, language }: Props) {
  const tr = (en: string, fa: string, ps: string) =>
    language === "fa" ? fa : language === "ps" ? ps : en;
  const [value, setValue] = useState<Configuration>(defaults);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    api<{ configuration: Configuration }>(
      "/api/v1/customer-call-center-settings/current/",
      { signal: controller.signal },
      session,
    ).then(result => {
      if (active && result.configuration) setValue(result.configuration);
    }).catch(err => {
      if (active) setError(err instanceof Error ? err.message : String(err));
    }).finally(() => {
      if (active) setLoading(false);
    });

    api<Paginated<Agent>>(
      "/api/v1/customer-call-logs/agents/?page_size=100",
      { signal: controller.signal },
      session,
    ).then(result => {
      if (active) setAgents(result.results || []);
    }).catch(() => {
      if (active) setAgents([]);
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [session.tenantId, session.companyId, session.access]);

  const rubricTotal = value.quality_rubric.reduce((sum, item) => sum + Number(item.weight || 0), 0);
  const panel = "rounded-2xl border border-sky-200/50 bg-white/55 p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/35";
  const input = "w-full rounded-lg border border-sky-200 bg-white/80 px-3 py-2 text-sm text-slate-800 dark:border-white/15 dark:bg-slate-800 dark:text-white";

  function patchDay(day: Day, patch: Partial<Configuration["business_hours"]["days"][Day]>) {
    setValue(current => ({
      ...current,
      business_hours: {
        ...current.business_hours,
        days: {
          ...current.business_hours.days,
          [day]: { ...current.business_hours.days[day], ...patch },
        },
      },
    }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await api(
        "/api/v1/customer-call-center-settings/current/",
        { method: "PUT", body: JSON.stringify({ configuration: value }) },
        session,
      );
      setNotice(tr("Settings saved.", "تنظیمات ذخیره شد.", "تنظیمات خوندي شول."));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  const dayLabels: Record<Day, [string, string, string]> = {
    sunday: ["Sunday", "یکشنبه", "یکشنبه"],
    monday: ["Monday", "دوشنبه", "دوشنبه"],
    tuesday: ["Tuesday", "سه‌شنبه", "سه‌شنبه"],
    wednesday: ["Wednesday", "چهارشنبه", "چهارشنبه"],
    thursday: ["Thursday", "پنجشنبه", "پنجشنبه"],
    friday: ["Friday", "جمعه", "جمعه"],
    saturday: ["Saturday", "شنبه", "شنبه"],
  };
  const outcomeLabels: Record<Outcome, [string, string, string]> = {
    answered: ["Answered", "پاسخ‌داده‌شده", "ځواب شوی"],
    missed: ["Missed", "از‌دست‌رفته", "له لاسه وتلی"],
    no_answer: ["No answer", "بدون پاسخ", "بې ځوابه"],
    busy: ["Busy", "مشغول", "بوخت"],
    failed: ["Failed", "ناموفق", "ناکام"],
    cancelled: ["Cancelled", "لغوشده", "لغوه شوی"],
  };
  const rubricLabels: Record<Criterion, [string, string, string]> = {
    greeting: ["Greeting", "خوش‌آمدگویی", "روغبړ"],
    verification: ["Identity verification", "تأیید هویت", "د هویت تایید"],
    understanding: ["Understanding the issue", "درک مشکل", "د ستونزې درک"],
    accuracy: ["Accuracy of solution", "درستی راه‌حل", "د حل‌لارې کره‌والی"],
    communication: ["Communication", "شیوهٔ ارتباط", "اړیکه"],
  };
  const priorityLabels: Record<Priority, [string, string, string]> = {
    low: ["Low", "کم", "ټیټ"],
    normal: ["Normal", "عادی", "عادي"],
    high: ["High", "زیاد", "لوړ"],
    urgent: ["Urgent", "فوری", "بیړنی"],
  };

  if (loading) {
    return <p className="rounded-xl border border-white/20 bg-white/40 p-5 text-sm">
      {tr("Loading call center settings…", "در حال دریافت تنظیمات کال‌سنتر…", "د اړیکو مرکز تنظیمات ترلاسه کېږي…")}
    </p>;
  }

  return (
    <form onSubmit={save} className="space-y-4 hq-cc-settings-font">
      <SharedPageHeader native as="header" className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">
            {tr("Call Center Settings", "تنظیمات کال‌سنتر", "د اړیکو مرکز تنظیمات")}
          </h2>
          <p className="mt-1 text-xs opacity-70">
            {tr("Queues, working hours, SLA, call outcomes and quality scoring.",
              "صف‌ها، ساعات کاری، SLA، نتیجه‌های تماس و امتیاز کیفیت.",
              "صفونه، کاري ساعتونه، SLA، د اړیکو پایلې او د کیفیت نمرې.")}
          </p>
        </div>
        
      </SharedPageHeader>

      {error && <p role="alert" className="rounded-lg bg-red-100 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-lg bg-emerald-100 p-3 text-sm text-emerald-800">{notice}</p>}

      <section className={panel}>
        <h3 className="mb-3 font-bold">{tr("Queues and agents", "صف‌ها و اپراتورها", "صفونه او کارکوونکي")}</h3>
        <div className="space-y-3">
          {value.queues.map((queue, index) => (
            <div key={queue.key} className="rounded-xl border border-sky-200/50 p-3">
              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <label className="grid gap-1 text-xs">
                  {tr("Queue name", "نام صف", "د صف نوم")}
                  <input className={input} value={queue.name}
                    onChange={e => setValue(c => ({ ...c, queues: c.queues.map((q, i) => i === index ? { ...q, name: e.target.value } : q) }))} />
                </label>
                <button type="button" onClick={() => setValue(c => ({ ...c, queues: c.queues.filter((_, i) => i !== index) }))}
                  className="self-end rounded-lg border border-red-300 px-3 py-2 text-xs text-red-700">
                  {tr("Remove", "حذف", "لرې کول")}
                </button>
              </div>
              <p className="mb-2 mt-3 text-xs font-semibold">{tr("Assigned agents", "اپراتورهای این صف", "د دې صف کارکوونکي")}</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {agents.map(agent => (
                  <label key={agent.id} className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={queue.agents.includes(agent.email)}
                      onChange={e => setValue(c => ({
                        ...c,
                        queues: c.queues.map((q, i) => i !== index ? q : {
                          ...q,
                          agents: e.target.checked
                            ? [...q.agents, agent.email]
                            : q.agents.filter(email => email !== agent.email),
                        }),
                      }))} />
                    <span>{agent.display_name || agent.full_name || agent.email}</span>
                  </label>
                ))}
                {!agents.length && <p className="text-xs opacity-60">
                  {tr("No eligible agents found.", "اپراتور فعالی پیدا نشد.", "فعال کارکوونکي ونه موندل شول.")}
                </p>}
              </div>
            </div>
          ))}
          <SharedSecondaryButton type="button" onClick={() => setValue(c => ({
            ...c,
            queues: [...c.queues, { key: `queue-${Date.now()}`, name: "", agents: [] }],
          }))} className="rounded-lg border border-cyan-500/40 px-4 py-2 text-sm">
            + {tr("Add queue", "افزودن صف", "صف اضافه کړئ")}
          </SharedSecondaryButton>
        </div>
      </section>

      <section className={panel}>
        <h3 className="mb-3 font-bold">{tr("Working hours", "ساعات کاری", "کاري ساعتونه")}</h3>
        <label className="mb-3 grid max-w-sm gap-1 text-xs">
          {tr("Time zone", "منطقهٔ زمانی", "مهال‌سیمه")}
          <input className={input} value={value.business_hours.timezone}
            onChange={e => setValue(c => ({ ...c, business_hours: { ...c.business_hours, timezone: e.target.value } }))} />
        </label>
        <div className="space-y-2">
          {dayKeys.map(day => {
            const schedule = value.business_hours.days[day];
            return <div key={day} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-lg border border-sky-200/40 p-2 sm:grid-cols-[1fr_auto_auto_auto]">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={schedule.enabled} onChange={e => patchDay(day, { enabled: e.target.checked })} />
                {dayLabels[day][language === "fa" ? 1 : language === "ps" ? 2 : 0]}
              </label>
              <input aria-label={`${day} open`} type="time" className={input} value={schedule.open}
                disabled={!schedule.enabled} onChange={e => patchDay(day, { open: e.target.value })} />
              <span className="text-xs opacity-60">{tr("to", "تا", "تر")}</span>
              <input aria-label={`${day} close`} type="time" className={input} value={schedule.close}
                disabled={!schedule.enabled} onChange={e => patchDay(day, { close: e.target.value })} />
            </div>;
          })}
        </div>
      </section>

      <section className={panel}>
        <h3 className="mb-3 font-bold">{tr("SLA targets (minutes)", "هدف‌های SLA (دقیقه)", "د SLA موخې (دقیقې)")}</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {priorities.map(priority => (
            <div key={priority} className="grid grid-cols-3 items-center gap-2 rounded-lg border border-sky-200/40 p-3">
              <b className="text-sm">{priorityLabels[priority][language === "fa" ? 1 : language === "ps" ? 2 : 0]}</b>
              <label className="grid gap-1 text-[11px]">{tr("First response", "پاسخ نخست", "لومړی ځواب")}
                <input type="number" min={1} max={10080} className={input} value={value.sla.first_response_minutes[priority]}
                  onChange={e => setValue(c => ({ ...c, sla: { ...c.sla, first_response_minutes: { ...c.sla.first_response_minutes, [priority]: Number(e.target.value) } } }))} />
              </label>
              <label className="grid gap-1 text-[11px]">{tr("Resolution", "حل مشکل", "د ستونزې حل")}
                <input type="number" min={1} max={10080} className={input} value={value.sla.resolution_minutes[priority]}
                  onChange={e => setValue(c => ({ ...c, sla: { ...c.sla, resolution_minutes: { ...c.sla.resolution_minutes, [priority]: Number(e.target.value) } } }))} />
              </label>
            </div>
          ))}
        </div>
      </section>

      <section className={panel}>
        <h3 className="mb-3 font-bold">{tr("Enabled call outcomes", "نتیجه‌های فعال تماس", "فعالې پایلې")}</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {outcomeKeys.map(outcome => (
            <label key={outcome} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={value.outcomes.includes(outcome)}
                onChange={e => setValue(c => ({
                  ...c,
                  outcomes: e.target.checked
                    ? [...c.outcomes, outcome]
                    : c.outcomes.filter(item => item !== outcome),
                }))} />
              {outcomeLabels[outcome][language === "fa" ? 1 : language === "ps" ? 2 : 0]}
            </label>
          ))}
        </div>
      </section>

      <section className={panel}>
        <h3 className="mb-1 font-bold">{tr("Quality scorecard", "معیارهای ارزیابی کیفیت", "د کیفیت ارزونې معیارونه")}</h3>
        <p className="mb-3 text-xs opacity-70">{tr("Weights must total 100%.", "مجموع وزن‌ها باید ۱۰۰٪ باشد.", "د وزنونو مجموعه باید ۱۰۰٪ وي.")}</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {value.quality_rubric.map(item => (
            <label key={item.key} className="grid gap-1 text-xs">
              {rubricLabels[item.key][language === "fa" ? 1 : language === "ps" ? 2 : 0]}
              <input type="number" min={1} max={100} className={input} value={item.weight}
                onChange={e => setValue(c => ({
                  ...c,
                  quality_rubric: c.quality_rubric.map(row =>
                    row.key === item.key ? { ...row, weight: Number(e.target.value) } : row),
                }))} />
            </label>
          ))}
        </div>
        <p className={`mt-3 text-sm font-bold ${rubricTotal === 100 ? "text-emerald-700" : "text-red-600"}`}>
          {tr("Total", "مجموع", "ټول")}: {rubricTotal}%
        </p>
      </section>

      <div className="flex justify-end">
        <SharedPrimaryButton type="submit" disabled={saving || rubricTotal !== 100}
          className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-50">
          {saving ? tr("Saving…", "در حال ذخیره…", "خوندي کېږي…") :
            tr("Save settings", "ذخیره تنظیمات", "تنظیمات خوندي کړئ")}
        </SharedPrimaryButton>
      </div>
    
      {/* CALLCENTER_SETTINGS_TYPOGRAPHY_V1 */}
      <style>{`
        .hq-cc-settings-font {
          color: #17364f !important;
          font-family: "Vazirmatn", "Noto Sans Arabic", Tahoma, Arial, sans-serif !important;
          font-size: 14px;
          line-height: 1.7;
        }
        .hq-cc-settings-font :is(h1,h2,h3,h4,legend) {
          color: #10334e !important;
          font-weight: 800 !important;
          letter-spacing: 0;
        }
        .hq-cc-settings-font :is(label,label span,p,small) {
          color: #35566f !important;
        }
        .hq-cc-settings-font label {
          font-weight: 700 !important;
        }
        .hq-cc-settings-font :is(input,select,textarea) {
          color: #17364f !important;
          font-size: 14px !important;
          font-weight: 600 !important;
          border-color: rgba(42, 105, 148, .45) !important;
        }
        .hq-cc-settings-font :is(input,select,textarea)::placeholder {
          color: #687f91 !important;
          opacity: 1;
        }
        .hq-cc-settings-font input[type="checkbox"] {
          accent-color: #0891b2;
        }
        .hq-shell[data-theme=dark] .hq-cc-settings-font,
        .hq-shell[data-theme=dark] .hq-cc-settings-font :is(h1,h2,h3,h4,legend,label,label span,p,small) {
          color: #d9ebf8 !important;
        }
        .hq-shell[data-theme=dark] .hq-cc-settings-font :is(input,select,textarea) {
          color: #e7f4ff !important;
          background: rgba(13, 38, 58, .82) !important;
          border-color: rgba(125, 190, 225, .42) !important;
        }
      `}</style>

      {/* CALLCENTER_SETTINGS_TYPOGRAPHY_V2 */}
      <style>{`
        .hq-cc-settings-font {
          color: #10283c !important;
          font-family: "Vazirmatn", "Noto Sans Arabic", Tahoma, Arial, sans-serif !important;
          font-size: 15px !important;
          line-height: 1.8 !important;
        }
        .hq-cc-settings-font :is(h1,h2,h3,h4,legend) {
          color: #09263d !important;
          font-size: 18px !important;
          font-weight: 800 !important;
        }
        .hq-cc-settings-font :is(label,label span) {
          color: #163b55 !important;
          font-size: 15px !important;
          font-weight: 700 !important;
        }
        .hq-cc-settings-font :is(p,small) {
          color: #34556d !important;
          font-size: 14px !important;
        }
        .hq-cc-settings-font :is(input,select,textarea) {
          color: #102a40 !important;
          background-color: rgba(245, 250, 255, .94) !important;
          font-size: 15px !important;
          font-weight: 600 !important;
          border-color: #789bb5 !important;
        }
        .hq-cc-settings-font :is(input,select,textarea)::placeholder {
          color: #526d82 !important;
          opacity: 1 !important;
        }
        .hq-shell[data-theme=dark] .hq-cc-settings-font :is(h1,h2,h3,h4,legend,label,label span,p,small) {
          color: #f0f7fc !important;
        }
        .hq-shell[data-theme=dark] .hq-cc-settings-font :is(input,select,textarea) {
          color: #f0f7fc !important;
          background-color: #17364d !important;
          border-color: #789bb5 !important;
        }
      `}</style>
</form>
  );
}
