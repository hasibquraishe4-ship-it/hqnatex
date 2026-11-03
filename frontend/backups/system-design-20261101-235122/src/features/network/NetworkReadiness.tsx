import { useCallback, useEffect, useMemo, useState } from "react";
import { Globe2, Network, PlugZap, RadioTower, ShieldCheck, Workflow, Plus, RefreshCw, Pencil, X } from "lucide-react";
import { DataTable, StatusBadge, type Column } from "../../components/DataTable";
import { api, fetchers, type Session } from "../../lib/api";
import { useTranslation } from "../../lib/i18n";

type Props = { session: Session };
type Tab = "addresses" | "vpns" | "devices" | "apiClients" | "integrations" | "observations";
type NetworkRow = Record<string, any> & { id: string };
type FormField = { key: string; label: string; type?: "text" | "number" | "date" | "select" | "textarea" | "checkbox"; required?: boolean; options?: string[]; help?: string };

const tabEndpoints: Record<Tab, string> = {
  addresses: "address-rules", vpns: "vpns", devices: "devices",
  apiClients: "api-clients", integrations: "integrations", observations: "observations",
};

const formFields: Partial<Record<Tab, FormField[]>> = {
  addresses: [
    { key: "label", label: "Label", required: true },
    { key: "cidr", label: "IP / CIDR", required: true, help: "Example: 192.0.2.0/24" },
    { key: "rule_type", label: "Rule type", type: "select", required: true, options: ["allow", "block", "office", "branch", "api", "device", "public", "private"] },
    { key: "purpose", label: "Purpose" },
    { key: "status", label: "Status", type: "select", required: true, options: ["active", "inactive", "blocked"] },
    { key: "valid_from", label: "Valid from", type: "date" },
    { key: "valid_to", label: "Valid to", type: "date" },
  ],
  vpns: [
    { key: "name", label: "Name", required: true },
    { key: "cidr", label: "IP / CIDR", required: true, help: "Example: 10.20.0.0/16" },
    { key: "tunnel_type", label: "Tunnel type", type: "select", required: true, options: ["ipsec", "wireguard", "openvpn", "mpls", "private", "other"] },
    { key: "gateway", label: "Gateway" }, { key: "provider", label: "Provider" },
    { key: "secret_ref", label: "Secret reference", help: "Reference only; do not enter a password or key." },
    { key: "status", label: "Status", type: "select", required: true, options: ["active", "inactive", "planned"] },
  ],
  devices: [
    { key: "code", label: "Device code", required: true }, { key: "name", label: "Name", required: true },
    { key: "device_type", label: "Device type", type: "select", required: true, options: ["router", "radius", "nas", "olt", "dslam", "switch", "firewall", "server", "access_point", "other"] },
    { key: "management_ip", label: "Management IP / CIDR" }, { key: "vendor", label: "Vendor" },
    { key: "model", label: "Model" }, { key: "serial_number", label: "Serial number" },
    { key: "access_mode", label: "Access mode", type: "select", required: true, options: ["read_only", "config_only"] },
    { key: "secret_ref", label: "Secret reference", help: "Reference only; no credentials are stored here." },
    { key: "status", label: "Status", type: "select", required: true, options: ["active", "inactive", "planned"] },
  ],
  apiClients: [
    { key: "name", label: "Client name", required: true }, { key: "client_id", label: "Client ID", required: true },
    { key: "key_fingerprint", label: "Key fingerprint" },
    { key: "secret_ref", label: "Secret reference", help: "Reference only; never paste a secret key." },
    { key: "allowed_cidrs", label: "Allowed CIDRs", type: "textarea", help: "One IP or CIDR per line." },
    { key: "scopes", label: "Scopes", type: "textarea", help: "One scope per line." },
    { key: "rate_limit_per_minute", label: "Rate limit / minute", type: "number", required: true },
    { key: "expires_at", label: "Expires at", type: "date" },
    { key: "status", label: "Status", type: "select", required: true, options: ["active", "inactive", "revoked"] },
  ],
  integrations: [
    { key: "code", label: "Integration code", required: true }, { key: "name", label: "Name", required: true },
    { key: "integration_type", label: "Type", type: "select", required: true, options: ["radius", "nas", "router", "olt", "dslam", "api", "webhook", "snmp", "other"] },
    { key: "host", label: "Host" }, { key: "port", label: "Port", type: "number" },
    { key: "base_url", label: "Base URL" }, { key: "auth_mode", label: "Authentication mode" },
    { key: "secret_ref", label: "Secret reference", help: "Reference only; no credentials are stored here." },
    { key: "execution_mode", label: "Execution mode", type: "select", required: true, options: ["read_only", "config_only"] },
    { key: "enabled", label: "Enabled", type: "checkbox" },
    { key: "status", label: "Status", type: "select", required: true, options: ["configured", "active", "inactive", "error"] },
  ],
};

const fieldLabels: Record<string, [string, string, string]> = {
  label: ["Label", "عنوان", "سرلیک"], cidr: ["IP / CIDR", "IP / CIDR", "IP / CIDR"],
  rule_type: ["Rule type", "نوع قاعده", "د قاعدې ډول"], purpose: ["Purpose", "هدف", "موخه"],
  status: ["Status", "وضعیت", "حالت"], valid_from: ["Valid from", "اعتبار از", "د اعتبار پیل"],
  valid_to: ["Valid to", "اعتبار تا", "د اعتبار پای"], name: ["Name", "نام", "نوم"],
  tunnel_type: ["Tunnel type", "نوع تونل", "د تونل ډول"], gateway: ["Gateway", "دروازه شبکه", "Gateway"],
  provider: ["Provider", "ارائه‌دهنده", "وړاندې کوونکی"], secret_ref: ["Secret reference", "مرجع رمز", "د پټنوم مرجع"],
  code: ["Code", "کد", "کوډ"], device_type: ["Device type", "نوع تجهیزات", "د وسیلې ډول"],
  management_ip: ["Management IP / CIDR", "IP مدیریتی / CIDR", "مدیریتي IP / CIDR"],
  vendor: ["Vendor", "سازنده", "جوړونکی"], model: ["Model", "مدل", "ماډل"],
  serial_number: ["Serial number", "شماره سریال", "سریال شمېره"], access_mode: ["Access mode", "حالت دسترسی", "د لاسرسي حالت"],
  client_id: ["Client ID", "شناسه کلاینت", "د کلاینت پېژند"], key_fingerprint: ["Key fingerprint", "اثر انگشت کلید", "د کیلي نښه"],
  allowed_cidrs: ["Allowed CIDRs", "CIDRهای مجاز", "مجاز CIDRونه"], scopes: ["Scopes", "سطوح دسترسی", "د لاسرسي ساحې"],
  rate_limit_per_minute: ["Rate limit / minute", "حد درخواست در دقیقه", "په دقیقه کې د غوښتنو حد"],
  expires_at: ["Expires at", "تاریخ انقضا", "د پای نېټه"], integration_type: ["Integration type", "نوع یکپارچه‌سازی", "د ادغام ډول"],
  host: ["Host", "میزبان", "کوربه"], port: ["Port", "پورت", "پورټ"], base_url: ["Base URL", "آدرس پایه", "بنسټیز URL"],
  auth_mode: ["Authentication mode", "روش احراز هویت", "د هویت تایید حالت"],
  execution_mode: ["Execution mode", "حالت اجرا", "د اجرا حالت"], enabled: ["Enabled", "فعال", "فعال"],
};

const tabIcons: Record<Tab, any> = {
  addresses: Globe2, vpns: ShieldCheck, devices: RadioTower,
  apiClients: Network, integrations: PlugZap, observations: Workflow,
};

export function NetworkReadiness({ session }: Props) {
  const { t, language } = useTranslation();
  const langIndex = language === "fa" ? 1 : language === "ps" ? 2 : 0;
  const [tab, setTab] = useState<Tab>("addresses");
  const [showNetworkMenu, setShowNetworkMenu] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{key:string; direction:"asc"|"desc"} | null>(null);
  const [editing, setEditing] = useState<NetworkRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      let params = `?page=${page}&page_size=${pageSize}`;
      if (search) params += `&search=${encodeURIComponent(search)}`;
      if (sort) params += `&ordering=${sort.direction === "desc" ? "-" : ""}${sort.key}`;
      const res = await fetchers.networkReadiness[tab](session, params);
      setData(res.results); setCount(res.count);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.networkAccess.loadError);
    } finally { setLoading(false); }
  }, [page,pageSize,search,sort,session,tab,t]);

  useEffect(() => { setPage(1); setSearch(""); setSort(null); }, [tab]);
  useEffect(() => { if (!showNetworkMenu) void load(); }, [load, showNetworkMenu]);

  const openForm = (row?: NetworkRow) => {
    setEditing(row || null);
    const next: Record<string, any> = {};
    for (const field of formFields[tab] || []) {
      const value = row?.[field.key];
      if (field.key === "allowed_cidrs" || field.key === "scopes") {
        next[field.key] = Array.isArray(value) ? value.join("\n") : "";
      } else if (field.type === "date" && value) {
        next[field.key] = String(value).slice(0, 16);
      } else {
        next[field.key] = value ?? (field.type === "checkbox" ? false : "");
      }
    }
    setForm(next);
    setFormError("");
    setFormOpen(true);
  };

  const saveForm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true); setFormError(""); setNotice("");
    const payload: Record<string, any> = { ...form };
    for (const key of ["allowed_cidrs", "scopes"]) {
      if (key in payload) payload[key] = String(payload[key] || "").split(/[\n,]+/).map((v: string) => v.trim()).filter(Boolean);
    }
    for (const field of formFields[tab] || []) {
      if (field.type === "date" && payload[field.key]) {
        const date = new Date(payload[field.key]);
        payload[field.key] = Number.isNaN(date.getTime()) ? null : date.toISOString();
      } else if (field.type === "date" && !payload[field.key]) payload[field.key] = null;
      if (field.type === "number" && payload[field.key] !== "") payload[field.key] = Number(payload[field.key]);
    }
    try {
      const base = `/api/v1/network/${tabEndpoints[tab]}/`;
      await api(
        editing ? `${base}${encodeURIComponent(editing.id)}/` : base,
        { method: editing ? "PATCH" : "POST", body: JSON.stringify(payload) },
        session,
      );
      setFormOpen(false); setEditing(null);
      setNotice(t.networkAccess.saved);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e));
    } finally { setSaving(false); }
  };

  const columns = useMemo<Column<any>[]>(() => {
    const status: Column<any> = {
      header: t.networkAccess.status,
      accessor: (row:any) => <StatusBadge status={row.status || "-"} type={["active","online","configured"].includes(row.status) ? "success" : "default"} />,
      sortable: true, sortKey: "status",
    };
    if (tab === "addresses") return [
      {header:t.networkAccess.label,accessor:"label",sortable:true},
      {header:t.networkAccess.cidr,accessor:"cidr",className:"font-mono text-cyan-400",sortable:true},
      {header:t.networkAccess.type,accessor:"rule_type",sortable:true},
      {header:t.networkAccess.purpose,accessor:"purpose"}, status,
    ];
    if (tab === "vpns") return [
      {header:t.networkAccess.name,accessor:"name",sortable:true},
      {header:t.networkAccess.cidr,accessor:"cidr",className:"font-mono text-cyan-400"},
      {header:t.networkAccess.type,accessor:"tunnel_type",sortable:true},
      {header:t.networkAccess.gateway,accessor:"gateway"},
      {header:t.networkAccess.provider,accessor:"provider"}, status,
    ];
    if (tab === "devices") return [
      {header:t.networkAccess.code,accessor:"code",sortable:true,className:"font-mono text-cyan-400"},
      {header:t.networkAccess.name,accessor:"name",sortable:true},
      {header:t.networkAccess.type,accessor:"device_type",sortable:true},
      {header:t.networkAccess.managementIp,accessor:"management_ip",className:"font-mono"},
      {header:t.networkAccess.vendorModel,accessor:(r:any)=>`${r.vendor || "-"} ${r.model || ""}`},
      {header:t.networkAccess.accessMode,accessor:"access_mode"}, status,
    ];
    if (tab === "apiClients") return [
      {header:t.networkAccess.name,accessor:"name",sortable:true},
      {header:t.networkAccess.clientId,accessor:"client_id",className:"font-mono text-cyan-400",sortable:true},
      {header:t.networkAccess.fingerprint,accessor:"key_fingerprint",className:"font-mono"},
      {header:t.networkAccess.rateLimit,accessor:"rate_limit_per_minute"},
      {header:t.networkAccess.scopes,accessor:(r:any)=>Array.isArray(r.scopes)?r.scopes.join(", "):"-"}, status,
    ];
    if (tab === "integrations") return [
      {header:t.networkAccess.code,accessor:"code",sortable:true,className:"font-mono text-cyan-400"},
      {header:t.networkAccess.name,accessor:"name",sortable:true},
      {header:t.networkAccess.type,accessor:"integration_type",sortable:true},
      {header:t.networkAccess.endpoint,accessor:(r:any)=>r.base_url || [r.host,r.port].filter(Boolean).join(":") || "-"},
      {header:t.networkAccess.executionMode,accessor:"execution_mode"},
      {header:t.networkAccess.enabled,accessor:(r:any)=>r.enabled?t.common.active:t.common.inactive}, status,
    ];
    return [
      {header:t.networkAccess.target,accessor:"target",sortable:true},
      {header:t.networkAccess.type,accessor:"observation_type"},
      {header:t.networkAccess.latency,accessor:(r:any)=>r.latency_ms?`${r.latency_ms} ms`:"-"},
      {header:t.networkAccess.checkedAt,accessor:"checked_at",sortable:true}, status,
    ];
  }, [tab,t]);

  const tabs:Array<{key:Tab;label:string}> = [
    {key:"addresses",label:t.networkAccess.addressRules},
    {key:"vpns",label:t.networkAccess.vpns},
    {key:"devices",label:t.networkAccess.devices},
    {key:"apiClients",label:t.networkAccess.apiClients},
    {key:"integrations",label:t.networkAccess.integrations},
    {key:"observations",label:t.networkAccess.observations},
  ];

  return (
    <div className={`network-readiness space-y-6 animate-in fade-in duration-500 ${showNetworkMenu ? "network-menu-open" : "network-section-open"}`}>
      <style>{`
        .network-readiness{color:#183650}
        #network-readiness-dialog{width:min(1080px,calc(100vw - 24px))!important;
          transform:translateX(-80px)!important; /* NETWORK_MODAL_SIDEBAR_OVERLAP_FIX */
          background:#cbdce8!important;background-color:#cbdce8!important;
          color:#183650!important;border:1px solid #b9e1f5!important;opacity:1!important;
          box-shadow:0 24px 90px #06172d66!important}
        #network-readiness-dialog form{background:#cbdce8!important;background-color:#cbdce8!important;color:#183650!important}
background-color:#eaf6ff!important;
          color:#183650!important;border:1px solid #b9e1f5!important;opacity:1!important;
          box-shadow:0 24px 90px #06172d66!important}
        #network-readiness-dialog form{background:#eaf6ff!important;background-color:#eaf6ff!important;color:#183650!important}
        #network-readiness-dialog header,#network-readiness-dialog footer{
          background:#f8fcff!important;background-color:#f8fcff!important;border-color:#79aeca66!important}
        #network-readiness-dialog header p,#network-readiness-dialog small{color:#405c73!important;font-weight:600}
        #network-readiness-dialog label,#network-readiness-dialog h2{color:#183650!important}
        #network-readiness-dialog :is(input:not([type=checkbox]),select,textarea){
          box-sizing:border-box;min-height:44px;background:#e5eff6!important;background-color:#e5eff6!important;
          color:#183650!important;border:1px solid #91bddb!important;border-radius:10px;padding:10px 12px;opacity:1!important}
        #network-readiness-dialog select option{background:#fff!important;color:#183650!important}
        #network-readiness-dialog footer{border-top:1px solid #79aeca66!important}
        #network-readiness-dialog footer button:first-child{color:#183650!important;
          background:#fff!important;border:1px solid #91bddb!important}
        #network-readiness-dialog footer button:last-child{background:#12b9d0!important;color:#062f45!important}
        .hq-shell[data-theme=dark] #network-readiness-dialog,
        .hq-shell[data-theme=dark] #network-readiness-dialog form{background:#102d44!important;background-color:#102d44!important;color:#e8f5ff!important}
        .hq-shell[data-theme=dark] #network-readiness-dialog :is(header,footer){background:#163b55!important;background-color:#163b55!important}
        .hq-shell[data-theme=dark] #network-readiness-dialog :is(label,#network-form-title){color:#e8f5ff!important}
        .hq-shell[data-theme=dark] #network-readiness-dialog :is(input:not([type=checkbox]),select,textarea){
          background:#0b2235!important;color:#e8f5ff!important;border-color:#4e7895!important}
        .hq-shell[data-theme=dark] #network-readiness-dialog header p,
        .hq-shell[data-theme=dark] #network-readiness-dialog small{color:#b3ccdd!important}
        @media(max-width:1023px){
          #network-readiness-dialog{transform:none!important;width:calc(100vw - 24px)!important}
        }
        /* NETWORK_MODAL_FINAL_LAYOUT_FIX */
        #network-readiness-dialog{
          position:fixed!important;left:12px!important;right:auto!important;top:50%!important;
          width:min(1080px,calc(100vw - 280px))!important;max-width:none!important;
          margin:0!important;transform:translateY(-50%)!important;
          height:min(600px,calc(100dvh - 24px))!important;height:min(600px,calc(100dvh - 24px))!important;max-height:calc(100dvh - 24px)!important;overflow:hidden!important
        }
        @media(max-width:1023px){
          #network-readiness-dialog{
            left:50%!important;right:auto!important;top:50%!important;
            width:calc(100vw - 24px)!important;max-width:none!important;
            transform:translate(-50%,-50%)!important
          }
        }
      
        /* NETWORK_FORM_MATCH_DOCUMENTS_V1 */
        #network-readiness-dialog{
          box-sizing:border-box!important;
          width:min(960px,calc(100vw - 300px))!important;
          max-width:calc(100vw - 300px)!important;
          height:min(560px,calc(100dvh - 32px))!important;
          max-height:calc(100dvh - 32px)!important
        }
        #network-readiness-dialog form{
          max-height:calc(100% - 68px)!important;
          overflow-y:auto!important
        }
        @media(max-width:900px){
          #network-readiness-dialog{
            width:calc(100vw - 24px)!important;
            max-width:calc(100vw - 24px)!important;
            height:calc(100dvh - 32px)!important;
            max-height:calc(100dvh - 32px)!important
          }
        }

        /* NETWORK_FORM_BIGGER_V2 */
        #network-readiness-dialog{
          box-sizing:border-box!important;
          width:min(1080px,calc(100vw - 280px))!important;
          max-width:calc(100vw - 280px)!important;
          height:min(680px,calc(100dvh - 24px))!important;
          max-height:calc(100dvh - 24px)!important
        }
        #network-readiness-dialog form{
          max-height:calc(100% - 68px)!important;
          overflow-y:auto!important
        }
        @media(max-width:900px){
          #network-readiness-dialog{
            width:calc(100vw - 24px)!important;
            max-width:calc(100vw - 24px)!important;
            height:calc(100dvh - 24px)!important;
            max-height:calc(100dvh - 24px)!important
          }
        }

        /* NETWORK_DOCUMENTS_STYLE_V1 */
        .network-readiness{
          box-sizing:border-box;background:#edf6fc!important;
          border:1px solid #c6dce9;border-radius:22px;
          padding:20px;color:#1d3a52!important;
          box-shadow:0 10px 28px rgba(20,65,92,.12)
        }
        .network-readiness :is(h1,h2,h3,.text-white){color:#1d3a52!important}
        .network-readiness :is(.text-slate-300,.text-slate-400,.text-slate-500){color:#49677e!important}
        .network-readiness .glass-panel{
          background:#fff!important;border:1px solid #c7dce9!important;
          box-shadow:0 6px 18px rgba(20,65,92,.08)
        }
        .network-readiness > div:nth-of-type(2) button{
          background:#fff!important;color:#34546c!important;
          border:1px solid #c7dce9!important
        }
        .network-readiness > div:nth-of-type(2) button[class*="bg-cyan-500/10"]{
          background:#1683d8!important;color:#fff!important;border-color:#1683d8!important
        }
        .network-readiness thead tr{
          background:#dcebf6!important;border-color:#c3d9e7!important
        }
        .network-readiness th{color:#38566d!important}
        .network-readiness td{color:#25445b!important}
        .network-readiness tbody tr:hover{background:#eef7fc!important}
        .network-readiness .glass-input{
          background:#fff!important;color:#203d54!important;
          border:1px solid #b8d0e0!important
        }
        @media(max-width:639px){
          .network-readiness{padding:12px;border-radius:16px}
        }

        /* NETWORK_DOCUMENTS_LAYOUT_V2 */
        .network-readiness{
          box-sizing:border-box!important;max-width:100%;min-width:0;
          padding:clamp(12px,2vw,24px)!important;border:1px solid #c6dce9!important;
          border-radius:22px!important;background:#edf6fc!important;color:#1d3a52!important;
          box-shadow:0 8px 24px rgba(20,65,92,.10)!important
        }
        .network-readiness > .glass-panel{
          padding:clamp(16px,2vw,24px)!important;border:1px solid #c7dce9!important;
          border-radius:18px!important;background:#fff!important;
          box-shadow:0 5px 16px rgba(20,65,92,.07)!important
        }
        .network-readiness :is(h1,h2,h3,.text-white){color:#1d3a52!important}
        .network-readiness :is(.text-slate-200,.text-slate-300,.text-slate-400,.text-slate-500){
          color:#49677e!important
        }
        .network-readiness > div:nth-of-type(2){
          padding:8px;border:1px solid #c7dce9;border-radius:16px;background:#fff;
          box-shadow:0 4px 14px rgba(20,65,92,.06)
        }
        .network-readiness > div:nth-of-type(2) button{
          background:#f5faff!important;color:#34546c!important;border:1px solid #c7dce9!important
        }
        .network-readiness > div:nth-of-type(2) button[class*="bg-cyan-500/10"]{
          background:#1683d8!important;color:#fff!important;border-color:#1683d8!important
        }
        .network-readiness > div:nth-of-type(3){
          padding:12px 14px;border:1px solid #c7dce9;border-radius:16px;background:#fff
        }
        .network-readiness .glass-panel{
          border-color:#c7dce9!important;background:#fff!important;color:#25445b!important;
          box-shadow:0 5px 16px rgba(20,65,92,.07)!important
        }
        .network-readiness thead tr{background:#dcebf6!important;border-color:#c3d9e7!important}
        .network-readiness th{color:#38566d!important}
        .network-readiness td{color:#25445b!important}
        .network-readiness tbody tr:hover{background:#eef7fc!important}
        .network-readiness input:not([type=checkbox]){
          background:#fff!important;color:#203d54!important;border-color:#b8d0e0!important
        }
        .hq-shell[data-theme=dark] .network-readiness{
          background:#102d44!important;color:#e8f5ff!important;border-color:#315a74!important
        }
        .hq-shell[data-theme=dark] .network-readiness :is(.glass-panel,>div:nth-of-type(2),>div:nth-of-type(3)){
          background:#163b55!important;color:#e8f5ff!important;border-color:#315a74!important
        }
        .hq-shell[data-theme=dark] .network-readiness :is(h1,h2,h3,th,td,.text-slate-200,.text-slate-300,.text-slate-400,.text-slate-500){
          color:#e8f5ff!important
        }
        @media(max-width:639px){
          .network-readiness{padding:10px!important;border-radius:16px!important}
          .network-readiness > .glass-panel{padding:14px!important}
        }

        /* NETWORK_SECTION_CARDS_V1 */
        .network-menu-open>div:first-of-type{display:none!important}
        .network-section-cards{
          display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px
        }
        .network-section-card{
          display:flex;min-height:88px;align-items:center;justify-content:space-between;
          gap:12px;padding:14px 18px;border:1px solid #b9d6e7;border-radius:20px;
          background:rgba(235,247,255,.92);color:#25465e;font-size:16px;font-weight:800;
          text-align:start;box-shadow:0 8px 22px rgba(15,74,104,.10);
          transition:transform .16s ease,background .16s ease
        }
        .network-section-card:hover{transform:translateY(-2px);background:#dceffc}
        .network-section-icon{
          display:grid;width:44px;height:44px;flex:none;place-items:center;
          border-radius:14px;background:#d3eafb;color:#1683d8
        }
        .network-section-header{
          display:flex;align-items:center;justify-content:space-between;gap:12px;
          padding:14px 18px;border:1px solid #c7dce9;border-radius:16px;background:#fff
        }
        .network-section-header h2{margin:0;color:#1d3a52;font-size:20px;font-weight:800}
        .hq-shell[data-theme=dark] .network-section-card,
        .hq-shell[data-theme=dark] .network-section-header{
          background:#163b55;color:#e8f5ff;border-color:#315a74
        }
        .hq-shell[data-theme=dark] .network-section-header h2{color:#e8f5ff}
        @media(max-width:900px){.network-section-cards{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:520px){
          .network-section-cards{grid-template-columns:1fr}
          .network-section-card{min-height:70px}
        }

        /* NETWORK_SECTION_READABILITY_V1 */
        .network-readiness form.relative.group{
          width:min(100%,420px)!important;flex:1 1 320px!important
        }
        .network-readiness form.relative.group input{
          box-sizing:border-box!important;width:100%!important;min-height:46px!important;
          padding:11px 14px!important;font-size:14px!important;border-radius:12px!important
        }
        .network-readiness .space-y-4>div:first-child{
          align-items:center!important;gap:14px!important
        }
        .network-readiness .glass-panel table th{
          padding:14px 16px!important;font-size:13px!important;line-height:1.5!important
        }
        .network-readiness .glass-panel table td{
          padding:14px 16px!important;font-size:14px!important;
          line-height:1.6!important;vertical-align:middle!important
        }
        .network-readiness .glass-panel table tbody tr:hover{
          background:rgba(34,181,210,.07)!important
        }
        .hq-shell[data-theme=light] .network-readiness .glass-panel table thead tr{
          background:#dceefa!important
        }
        .hq-shell[data-theme=light] .network-readiness .glass-panel table th,
        .hq-shell[data-theme=light] .network-readiness .glass-panel table td{
          color:#29465d!important
        }
        @media(max-width:639px){
          .network-readiness form.relative.group{flex-basis:100%!important}
          .network-readiness .glass-panel table th,
          .network-readiness .glass-panel table td{
            padding:11px 12px!important;font-size:13px!important
          }
        }

        /* NETWORK_VPN_FORM_LAYOUT_V1 */
        #network-readiness-dialog{
          position:fixed!important;left:16px!important;right:auto!important;top:50%!important;
          width:min(940px,calc(100vw - 300px))!important;max-width:none!important;
          max-height:84vh!important;margin:0!important;transform:translateY(-50%)!important;
          display:flex!important;flex-direction:column!important
        }
        #network-readiness-dialog>header,
        #network-readiness-dialog>form>footer{flex:none!important}
        #network-readiness-dialog>form{
          display:flex!important;flex:1 1 auto!important;min-height:0!important;
          max-height:none!important;flex-direction:column!important
        }
        #network-readiness-dialog>form>div:first-child{
          display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;
          align-content:start!important;gap:16px!important;flex:1 1 auto!important;
          min-height:0!important;overflow-y:auto!important;padding:20px!important
        }
        #network-readiness-dialog>form>div:first-child>label{
          display:grid!important;align-content:start!important;gap:8px!important;
          min-width:0!important;font-size:14px!important;line-height:1.5!important
        }
        #network-readiness-dialog>form>div:first-child>label>span{
          display:block!important;min-height:22px!important
        }
        #network-readiness-dialog>form>div:first-child label :is(input:not([type=checkbox]),select,textarea){
          box-sizing:border-box!important;width:100%!important;min-width:0!important;
          min-height:44px!important;border-radius:10px!important;font-size:14px!important
        }
        #network-readiness-dialog>form>footer{
          position:sticky!important;bottom:0!important;z-index:2!important;
          justify-content:flex-start!important;padding:12px 20px!important
        }
        @media(max-width:1023px){
          #network-readiness-dialog{
            left:50%!important;right:auto!important;top:50%!important;
            width:calc(100vw - 28px)!important;max-height:88vh!important;
            transform:translate(-50%,-50%)!important
          }
        }
        @media(max-width:639px){
          #network-readiness-dialog>form>div:first-child{
            grid-template-columns:minmax(0,1fr)!important;gap:12px!important;padding:16px!important
          }
        }

        /* NETWORK_FORMS_UNIFORM_V2 */
        #network-readiness-dialog{
          position:fixed!important;left:max(270px,calc(260px + (100vw - 1200px)/2))!important;
          right:auto!important;top:50%!important;width:min(940px,calc(100vw - 320px))!important;
          max-width:none!important;max-height:84vh!important;margin:0!important;
          transform:translateY(-50%)!important;display:flex!important;flex-direction:column!important
        }
        #network-readiness-dialog>header,
        #network-readiness-dialog>form>footer{flex:none!important}
        #network-readiness-dialog>form{
          display:flex!important;flex:1 1 auto!important;min-height:0!important;
          max-height:none!important;flex-direction:column!important
        }
        #network-readiness-dialog>form>div:first-child{
          display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;
          align-content:start!important;gap:16px!important;flex:1 1 auto!important;
          min-height:0!important;overflow-y:auto!important;padding:20px!important
        }
        #network-readiness-dialog>form>div:first-child>label{
          display:grid!important;align-content:start!important;gap:8px!important;
          min-width:0!important;font-size:14px!important;line-height:1.5!important
        }
        #network-readiness-dialog>form>div:first-child>label>span{
          display:block!important;min-height:22px!important
        }
        #network-readiness-dialog>form>div:first-child label :is(input:not([type=checkbox]),select,textarea){
          box-sizing:border-box!important;width:100%!important;min-width:0!important;
          min-height:46px!important;border-radius:10px!important;font-size:14px!important
        }
        #network-readiness-dialog>form>div:first-child label input[type=checkbox]{
          width:20px!important;height:20px!important;min-height:20px!important
        }
        #network-readiness-dialog>form>footer{
          position:sticky!important;bottom:0!important;z-index:2!important;
          display:flex!important;justify-content:flex-end!important;gap:10px!important;
          padding:12px 20px!important
        }
        #network-readiness-dialog>form>footer button{
          display:inline-flex!important;align-items:center!important;justify-content:center!important;
          min-height:42px!important;padding:9px 18px!important;font-size:14px!important
        }
        #network-readiness-dialog>form>footer button:first-child{
          color:#183650!important;background:#fff!important;border:1px solid #91bddb!important
        }
        #network-readiness-dialog>form>footer button:last-child{
          color:#062f45!important;background:#12b9d0!important
        }
        @media(max-width:1023px){
          #network-readiness-dialog{
            left:50%!important;right:auto!important;top:50%!important;
            width:calc(100vw - 28px)!important;max-height:88vh!important;
            transform:translate(-50%,-50%)!important
          }
        }
        @media(max-width:639px){
          #network-readiness-dialog>form>div:first-child{
            grid-template-columns:minmax(0,1fr)!important;gap:12px!important;padding:16px!important
          }
        }

        /* NETWORK_FORM_WIDTH_1090_V1 */
        #network-readiness-dialog{
          width:min(1090px,calc(100vw - 280px))!important;
          max-width:none!important
        }
        html[dir="ltr"] #network-readiness-dialog{
          left:max(270px,calc((100vw + 260px - 1090px)/2))!important;
          right:auto!important
        }
        html[dir="rtl"] #network-readiness-dialog{
          right:max(270px,calc((100vw + 260px - 1090px)/2))!important;
          left:auto!important
        }
        @media(max-width:1023px){
          #network-readiness-dialog{
            left:50%!important;right:auto!important;
            width:calc(100vw - 28px)!important;
            transform:translate(-50%,-50%)!important
          }
        }

        /* NETWORK_FORM_WIDTH_1200_V1 */
        .network-readiness>div[role="presentation"]{
          z-index:9999!important
        }
        #network-readiness-dialog{
          z-index:10000!important;width:min(1200px,calc(100vw - 32px))!important;
          max-width:none!important
        }
        html[dir="ltr"] #network-readiness-dialog,
        html[dir="rtl"] #network-readiness-dialog{
          left:50%!important;right:auto!important;
          transform:translate(-50%,-50%)!important
        }
        @media(max-width:1023px){
          #network-readiness-dialog{
            width:calc(100vw - 24px)!important
          }
        }

        /* NETWORK_FORM_WIDTH_RESTORE_1090_V1 */
        #network-readiness-dialog{
          width:min(1090px,calc(100vw - 32px))!important;
          max-width:none!important
        }
        html[dir="ltr"] #network-readiness-dialog,
        html[dir="rtl"] #network-readiness-dialog{
          left:50%!important;right:auto!important;
          transform:translate(-50%,-50%)!important
        }
        @media(max-width:1023px){
          #network-readiness-dialog{width:calc(100vw - 24px)!important}
        }

        /* NETWORK_FORM_CENTERED_V1 */
        .network-readiness>div[role="presentation"]{
          position:fixed!important;inset:0!important;z-index:10000!important;
          display:flex!important;align-items:center!important;justify-content:center!important;
          padding:16px!important;overflow:auto!important
        }
        html[dir="ltr"] #network-readiness-dialog,
        html[dir="rtl"] #network-readiness-dialog{
          position:relative!important;left:auto!important;right:auto!important;top:auto!important;
          transform:none!important;margin:auto!important;
          width:min(1090px,calc(100vw - 32px))!important;max-width:none!important;
          max-height:calc(100vh - 32px)!important
        }
        @media(max-width:639px){
          .network-readiness>div[role="presentation"]{padding:10px!important}
          html[dir="ltr"] #network-readiness-dialog,
          html[dir="rtl"] #network-readiness-dialog{
            width:calc(100vw - 20px)!important;max-height:calc(100vh - 20px)!important
          }
        }
`}</style>
      <div className="glass-panel rounded-3xl p-6 border border-amber-400/15">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
            <ShieldCheck className="h-6 w-6 text-amber-300" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">{t.networkAccess.title}</h1>
            <p className="mt-1 text-sm text-slate-400">{t.networkAccess.subtitle}</p>
            <p className="mt-3 text-xs font-bold text-amber-300">{t.networkAccess.safetyNotice}</p>
          </div>
        </div>
      </div>

      {showNetworkMenu ? (
        <div className="network-section-cards">
          {tabs.map(({key,label}) => {
            const Icon = tabIcons[key];
            return (
              <button
                key={key}
                type="button"
                className="network-section-card"
                onClick={() => { setTab(key); setShowNetworkMenu(false); }}
              >
                <span className="network-section-icon"><Icon size={21} /></span>
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <header className="network-section-header">
          <h2>{tabs.find(item => item.key === tab)?.label}</h2>
          <button type="button" onClick={() => { setFormOpen(false); setShowNetworkMenu(true); }}>
            {language === "fa" ? "همه بخش‌ها" : language === "ps" ? "ټولې برخې" : "All sections"}
          </button>
        </header>
      )}

      {!showNetworkMenu && <>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2">
          {formFields[tab] && <button type="button" onClick={() => openForm()}
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-sm font-bold text-cyan-200 hover:bg-cyan-500/20">
            <Plus size={16} />{t.networkAccess.addRecord}
          </button>}
          <button type="button" onClick={() => void load()} disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-slate-200 hover:bg-white/10 disabled:opacity-50">
            <RefreshCw size={15} />{t.networkAccess.refresh}
          </button>
        </div>
        {notice && <p role="status" className="text-sm font-semibold text-emerald-300">{notice}</p>}
      </div>

      <DataTable
        title={tabs.find(x=>x.key===tab)?.label}
        columns={columns} data={data} loading={loading} error={error}
        totalCount={count} currentPage={page} pageSize={pageSize}
        onPageChange={setPage} onPageSizeChange={setPageSize}
        onSearch={setSearch} onSort={(key,direction)=>setSort({key,direction})}
        actions={formFields[tab] ? (row: NetworkRow) => <button type="button" onClick={() => openForm(row)}
          aria-label={t.networkAccess.editRecord} title={t.networkAccess.editRecord}
          className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-bold text-slate-200 hover:border-cyan-400/40 hover:text-cyan-200">
          <Pencil size={13} />{t.networkAccess.editRecord}
        </button> : undefined}
      />

      {formOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setFormOpen(false); }}>
        <section id="network-readiness-dialog" role="dialog" aria-modal="true" aria-labelledby="network-form-title" className="max-h-[92vh] overflow-hidden rounded-2xl border border-white/15 bg-slate-900 text-white shadow-2xl">
          <header className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
            <div><h2 id="network-form-title" className="text-lg font-bold">{editing ? t.networkAccess.editRecord : t.networkAccess.addRecord}</h2>
              <p className="mt-1 text-xs text-slate-400">{t.networkAccess.configOnlyNotice}</p></div>
            <button type="button" disabled={saving} onClick={() => setFormOpen(false)} aria-label={t.common.cancel} className="rounded-lg p-2 text-slate-300 hover:bg-white/10"><X size={18}/></button>
          </header>
          <form onSubmit={saveForm} className="flex max-h-[calc(92vh-70px)] flex-col">
            <div className="grid grid-cols-1 gap-4 overflow-y-auto p-5 sm:grid-cols-2">
              {(formFields[tab] || []).map((field) => <label key={field.key} className={`grid min-w-0 gap-1.5 text-sm font-semibold ${field.type === "textarea" ? "sm:col-span-2" : ""}`}>
                <span>{(fieldLabels[field.key] || [field.label, field.label, field.label])[langIndex]}{field.required ? " *" : ""}</span>
                {field.type === "select" ? <select required={field.required} value={form[field.key] ?? ""} onChange={(e) => setForm((old) => ({...old,[field.key]:e.target.value}))} className="min-h-11 rounded-lg border border-white/15 bg-slate-800 px-3 text-white">
                  <option value="">—</option>{field.options?.map((option) => <option key={option} value={option}>{option}</option>)}
                </select> : field.type === "textarea" ? <textarea rows={3} value={form[field.key] ?? ""} onChange={(e) => setForm((old) => ({...old,[field.key]:e.target.value}))} className="rounded-lg border border-white/15 bg-slate-800 px-3 py-2 text-white"/> : field.type === "checkbox" ? <input type="checkbox" checked={Boolean(form[field.key])} onChange={(e) => setForm((old) => ({...old,[field.key]:e.target.checked}))} className="h-5 w-5 accent-cyan-500"/> : <input type={field.type === "date" ? "datetime-local" : field.type || "text"} required={field.required} min={field.key === "rate_limit_per_minute" ? 1 : undefined} value={form[field.key] ?? ""} onChange={(e) => setForm((old) => ({...old,[field.key]:e.target.value}))} className="min-h-11 min-w-0 rounded-lg border border-white/15 bg-slate-800 px-3 text-white"/>}
                {field.help && <small className="font-normal text-slate-400">{field.help}</small>}
              </label>)}
              {formError && <p role="alert" className="whitespace-pre-wrap break-words text-sm text-rose-300 sm:col-span-2">{formError}</p>}
            </div>
            <footer className="flex justify-end gap-2 border-t border-white/10 px-5 py-4">
              <button type="button" disabled={saving} onClick={() => setFormOpen(false)} className="rounded-lg border border-white/15 px-4 py-2 text-sm">{t.common.cancel}</button>
              <button type="submit" disabled={saving} className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50">{saving ? t.common.saving : t.common.saveChanges}</button>
            </footer>
          </form>
        </section>
      </div>}
      </>}
    </div>
  );
}
