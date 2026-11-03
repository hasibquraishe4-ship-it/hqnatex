import { getTranslation as getUiTranslation } from "../../i18n";
import { PageHeader as SharedPageHeader } from "../../components/PageHeader";
import { PrimaryButton as SharedPrimaryButton, SecondaryButton as SharedSecondaryButton } from "../../components/Interface";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Plus, Shield, ShieldCheck } from "lucide-react";
import { DataTable, type Column, StatusBadge } from "../../components/DataTable";
import { api, fetchers, type Session } from "../../lib/api";
import { useTranslation } from "../../lib/i18n";

type Props = { session: Session };
type Permission = { id: string; key: string; name: string };
type Role = {
  id: string;
  key: string;
  name: string;
  status: string;
  is_system: boolean;
  permissions: Permission[];
};


const permissionResources: Record<string, [string, string]> = {
  "accounting.journals": ["ژورنال‌های حسابداری", "ژورنالونو"],
  "accounting.ledger": ["دفترکل عمومی", "عمومي لیجر"],
  "accounting.periods": ["دوره‌های حسابداری", "محاسبې دورې"],
  agencies: ["نمایندگی‌ها", "نمایندګۍ"],
  audit: ["گزارش‌های حسابرسی", "د پلټنې راپورونه"],
  billing: ["بل‌ها، مطالبات، پرداخت‌ها و رسیدها", "بلونه، پورونه، تادیات او رسیدونه"],
  "billing.payments": ["پرداخت‌های تخصیص‌شده", "وېشل شوي تادیات"],
  branches: ["شعبه‌ها", "څانګې"],
  companies: ["شرکت‌ها", "شرکتونه"],
  contracts: ["قراردادها", "قراردادونه"],
  correspondence: ["مکاتبات", "مکتوبونه"],
  customers: ["مشتریان و خدمات مشتری", "پېرودونکي او د هغوی خدمتونه"],
  documents: ["اسناد", "اسناد"],
  "finance.accounts": ["حساب‌های مالی", "مالي حسابونه"],
  hr: ["اطلاعات منابع بشری", "د بشري سرچینو معلومات"],
  "iam.roles": ["نقش‌ها و دسترسی‌ها", "رولونه او اجازې"],
  "iam.users": ["کاربران مجموعه", "د ټیننټ کاروونکي"],
  noc: ["منابع مرکز عملیات شبکه", "د شبکې د عملیاتو مرکز سرچینې"],
  packages: ["بسته‌ها و تاریخچهٔ قیمت", "بستې او د بیو تاریخچه"],
  partners: ["شرکا", "شریکان"],
  payroll: ["معاشات", "معاشونه"],
  projects: ["پروژه‌ها و وظایف", "پروژې او دندې"],
  "revenue.rules": ["قواعد مؤثر تقسیم عواید", "د عوایدو د ونډې نافذ قواعد"],
  "revenue.settlements": ["تصفیه‌های نمایندگی", "د نمایندګیو تصفیه"],
  revenue: ["عواید و تخصیص سهم‌ها", "عواید او د ونډو وېش"],
  sales: ["فروش‌ها", "خرڅلاو"],
  services: ["فهرست خدمات و مشخصات فنی", "د خدمتونو لړ او تخنیکي ځانګړنې"],
  "settings.appearance": ["ظاهر و هویت بصری", "بڼه او نښه"],
  warehouse: ["گدام و تدارکات", "ګودام او تدارکات"],
  "workspace.archive": ["آرشیف فضای کاری", "د کاري چاپېریال آرشیف"],
  "workspace.audit": ["فعالیت‌های فضای کاری", "د کاري چاپېریال فعالیتونه"],
  "workspace.dashboard": ["داشبورد فضای کاری", "د کاري چاپېریال ډشبورډ"],
  "workspace.reports": ["گزارش‌های فضای کاری", "د کاري چاپېریال راپورونه"],
};

const permissionSpecial: Record<string, [string, string]> = {
  "billing.manage": ["مدیریت پرداخت‌های پیش‌نویس و تخصیص‌ها", "د مسودې تادیاتو او وېش مدیریت"],
  "hr.self_service": ["استفاده از خدمات شخصی کارمند", "د کارکوونکي د ځان‌خدمت کارول"],
  "payroll.manage": ["مدیریت تنظیمات معاشات", "د معاشونو د تنظیماتو مدیریت"],
  "payroll.process": ["پردازش و نهایی‌سازی معاشات", "د معاشونو پروسس او نهایي کول"],
  "revenue.rules.manage": ["مدیریت قواعد مؤثر تقسیم عواید", "د عوایدو د ونډې د نافذو قواعدو مدیریت"],
  "revenue.settlements.manage": ["ایجاد و مدیریت تصفیه‌های نمایندگی", "د نمایندګیو د تصفیې جوړول او مدیریت"],
};

function permissionLabel(key: string, fallback: string, language: string): string {
  const special = permissionSpecial[key];
  if (special) return language === "fa" ? special[0] : language === "ps" ? special[1] : fallback;

  const action = key.slice(key.lastIndexOf(".") + 1);
  const resourceKey = key.slice(0, key.lastIndexOf("."));
  const resource = permissionResources[resourceKey];
  if (!resource) return fallback;

  if (language === "fa") {
    if (action === "manage") return `مدیریت ${resource[0]}`;
    if (action === "view") return `مشاهدهٔ ${resource[0]}`;
    if (action === "post") return `ثبت ${resource[0]}`;
  }
  if (language === "ps") {
    if (action === "manage") return `د ${resource[1]} مدیریت`;
    if (action === "view") return `د ${resource[1]} لیدل`;
    if (action === "post") return `د ${resource[1]} ثبت`;
  }
  return fallback;
}

export function RoleList({ session }: Props) {
    const { t, language } = useTranslation();
  const tr = (en: string, fa: string, ps: string) =>
    language === "fa" ? fa : language === "ps" ? ps : en;
  const [data, setData] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [sort, setSort] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState<"create" | Role | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [roleForm, setRoleForm] = useState({ key: "", name: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      let params = `?page=${page}&page_size=${pageSize}`;
      if (searchTerm) params += `&search=${encodeURIComponent(searchTerm)}`;
      if (sort) params += `&ordering=${sort.direction === "desc" ? "-" : ""}${sort.key}`;
      const res = await fetchers.roles(session, params);
      setData(res.results);
      setTotalCount(res.count);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.noRecords);
    } finally {
      setLoading(false);
    }
  }, [session, page, pageSize, searchTerm, sort, t]);

  useEffect(() => { void load(); }, [load]);

  const loadPermissions = async () => {
    const res = await fetchers.permissions(session, "?page_size=100");
    setPermissions(res.results);
  };

  const openCreate = async () => {
    try {
      setError("");
      await loadPermissions();
      setRoleForm({ key: "", name: "" });
      setSelectedKeys([]);
      setEditor("create");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const openEdit = async (role: Role) => {
    try {
      setError("");
      await loadPermissions();
      setRoleForm({ key: role.key, name: role.name });
      setSelectedKeys((role.permissions || []).map(item => item.key));
      setEditor(role);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const saveRole = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const editing = editor !== null && editor !== "create";
      const url = editing
        ? `/api/v1/iam/roles/${encodeURIComponent(editor.id)}/`
        : "/api/v1/iam/roles/";
      await api(url, {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify({
          ...(editing ? {} : { key: roleForm.key.trim() }),
          name: roleForm.name.trim(),
          ...(editing ? {} : { status: "active" }),
          permission_keys: selectedKeys,
        }),
      }, session);
      setEditor(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Role>[] = [
    {
      header: "Key",
      accessor: "key",
      className: "text-white font-mono text-[11px]",
      sortable: true,
    },
    {
      header: "Name",
      accessor: "name",
      className: "text-white font-bold",
      sortable: true,
    },
    {
      header: "System",
      accessor: row => row.is_system
        ? <span className="flex items-center gap-1 text-amber-400 text-[10px] font-black uppercase"><ShieldCheck className="h-3 w-3" />System</span>
        : <span className="text-slate-500 text-[10px] font-bold uppercase">Custom</span>,
      sortable: true,
    },
    {
      header: "Status",
      accessor: row => (
        <StatusBadge
          status={t.common[row.status as keyof typeof t.common] || row.status}
          type={row.status === "active" ? "success" : "default"}
        />
      ),
      sortable: true,
    },
    {
      header: "Permissions",
      accessor: row => row.permissions?.length || 0,
      className: "text-end font-mono",
    },
  ];

  const isEditing = editor !== null && editor !== "create";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <SharedPageHeader native as="div" className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight">{getUiTranslation(language).systemPhrases.security_roles_29436d7}</h2>
          <p className="text-xs text-slate-500 font-medium mt-1">{getUiTranslation(language).systemPhrases.define_authorization_boundaries_and_access_level_2e1eae9}</p>
        </div>
        <SharedPrimaryButton type="button" onClick={() => void openCreate()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-sm">
          <Plus className="h-4 w-4" />{getUiTranslation(language).systemPhrases.create_role_df4004f}
        </SharedPrimaryButton>
      </SharedPageHeader>

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        totalCount={totalCount}
        currentPage={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onSearch={setSearchTerm}
        onSort={(key, direction) => setSort({ key, direction })}
        error={error}
        actions={row => (
          <SharedSecondaryButton type="button" aria-label={getUiTranslation(language).systemPhrases.edit_role_permissions_e9fef34}
            onClick={() => void openEdit(row)}
            className="p-2 rounded-lg bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10">
            <Shield className="h-4 w-4" />
          </SharedSecondaryButton>
        )}
      />

      {editor && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 p-4"
          onMouseDown={event => { if (event.target === event.currentTarget && !saving) setEditor(null); }}>
          <form role="dialog" aria-modal="true" aria-labelledby="role-editor-title"
            onSubmit={saveRole}
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/15 bg-slate-900 p-5 text-white shadow-2xl space-y-4">
            <h3 id="role-editor-title" className="text-lg font-bold">
              {isEditing ? getUiTranslation(language).systemPhrases.edit_role_permissions_e9fef34 : getUiTranslation(language).systemPhrases.create_role_1a29351}
            </h3>
            {error && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-red-300">{error}</p>}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span>{getUiTranslation(language).systemPhrases.role_key_57a1c45}</span>
                <input required disabled={isEditing} value={roleForm.key}
                  onChange={e => setRoleForm({ ...roleForm, key: e.target.value })}
                  className="w-full rounded-lg border border-white/15 bg-slate-800 px-3 py-2 disabled:opacity-60" />
              </label>
              <label className="space-y-1 text-sm">
                <span>{getUiTranslation(language).systemPhrases.role_name_8480c32}</span>
                <input required value={roleForm.name}
                  onChange={e => setRoleForm({ ...roleForm, name: e.target.value })}
                  className="w-full rounded-lg border border-white/15 bg-slate-800 px-3 py-2" />
              </label>
            </div>
            <div className="rounded-xl border border-white/10 p-3">
              <h4 className="mb-2 font-semibold">{getUiTranslation(language).systemPhrases.permissions_4f205ad} ({selectedKeys.length})</h4>
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {permissions.map(permission => (
                  <label key={permission.id} className="flex items-center gap-3 rounded-lg bg-white/[0.03] p-2 text-sm">
                    <input type="checkbox" checked={selectedKeys.includes(permission.key)}
                      onChange={e => setSelectedKeys(keys => e.target.checked
                        ? [...keys, permission.key]
                        : keys.filter(key => key !== permission.key))} />
                    <span><b>{permission.key}</b>{permission.name ? ` · ${permissionLabel(permission.key, permission.name, language)}` : ""}</span>
                  </label>
                ))}
                {!permissions.length && <p className="text-sm text-slate-400">{getUiTranslation(language).systemPhrases.no_permissions_returned_2c7fcce}</p>}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <SharedSecondaryButton type="button" disabled={saving} onClick={() => setEditor(null)}
                className="rounded-lg border border-white/15 px-4 py-2">{getUiTranslation(language).systemPhrases.cancel_354ef38} </SharedSecondaryButton>
              <SharedPrimaryButton type="submit" disabled={saving}
                className="rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-slate-950">
                {saving ? getUiTranslation(language).systemPhrases.saving_c40420d : getUiTranslation(language).systemPhrases.save_7ae3684}
              </SharedPrimaryButton>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
