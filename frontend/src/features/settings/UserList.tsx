import { getTranslation as getUiTranslation } from "../../i18n";
import { PageHeader as SharedPageHeader } from "../../components/PageHeader";
import { PrimaryButton as SharedPrimaryButton, SecondaryButton as SharedSecondaryButton, FilterBar as SharedFilterBar, Select as SharedSelect } from "../../components/Interface";
import { useEffect, useState, useCallback, type FormEvent } from "react";
import { Plus, Edit, Shield } from "lucide-react";
import { DataTable, type Column, StatusBadge } from "../../components/DataTable";
import { api, fetchers, type Session } from "../../lib/api";
import { useTranslation } from "../../lib/i18n";

type Props = { session: Session };
type Membership = {
  id: string;
  user?: { email?: string; full_name?: string };
  roles?: string[];
  status: string;
};

export function UserList({ session }: Props) {
    const { t, language } = useTranslation();
  const tr = (en: string, fa: string, ps: string) =>
    language === "fa" ? fa : language === "ps" ? ps : en;
  const [data, setData] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [sort, setSort] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState<{
    mode: "invite" | "roles" | "status";
    row?: Membership;
  } | null>(null);
  const [availableRoles, setAvailableRoles] = useState<any[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [status, setStatus] = useState("active");
  const [invite, setInvite] = useState({ email: "", full_name: "", password: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      let params = `?page=${page}&page_size=${pageSize}`;
      if (searchTerm) params += `&search=${encodeURIComponent(searchTerm)}`;
      if (sort) params += `&ordering=${sort.direction === "desc" ? "-" : ""}${sort.key}`;
      const res = await fetchers.users(session, params);
      setData(res.results);
      setTotalCount(res.count);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.noRecords);
    } finally {
      setLoading(false);
    }
  }, [session, page, pageSize, searchTerm, sort, t]);

  useEffect(() => { void load(); }, [load]);

  const loadRoles = async () => {
    const result = await fetchers.roles(session, "?page_size=100");
    const active = result.results.filter((item: any) => item.status === "active");
    setAvailableRoles(active);
    return active;
  };

  const openInvite = async () => {
    setFormError("");
    try {
      await loadRoles();
      setInvite({ email: "", full_name: "", password: "" });
      setSelectedRoles([]);
      setStatus("active");
      setEditor({ mode: "invite" });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const openRoles = async (row: Membership) => {
    setFormError("");
    try {
      const roles = await loadRoles();
      setSelectedRoles((row.roles || []).filter(key => roles.some((role: any) => role.key === key)));
      setStatus(row.status || "active");
      setEditor({ mode: "roles", row });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const openStatus = (row: Membership) => {
    setFormError("");
    setStatus(row.status || "active");
    setEditor({ mode: "status", row });
  };

  const saveMembership = async (event: FormEvent) => {
    event.preventDefault();
    if (!editor || saving) return;
    setSaving(true);
    setFormError("");
    try {
      if (editor.mode === "invite") {
        await api("/api/v1/iam/memberships/", {
          method: "POST",
          body: JSON.stringify({
            email: invite.email.trim(),
            full_name: invite.full_name.trim(),
            ...(invite.password ? { password: invite.password } : {}),
            status,
            role_keys: selectedRoles,
          }),
        }, session);
      } else {
        const payload = editor.mode === "roles"
          ? { role_keys: selectedRoles, status }
          : { status };
        await api(`/api/v1/iam/memberships/${encodeURIComponent(editor.row!.id)}/`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        }, session);
      }
      setEditor(null);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Membership>[] = [
    {
      header: "User",
      accessor: row => row.user?.email || row.id,
      className: "text-white font-bold",
    },
    { header: "Name", accessor: row => row.user?.full_name || "—" },
    { header: "Tenant", accessor: () => "Active tenant" },
    {
      header: "Roles",
      accessor: row => (
        <div className="flex flex-wrap gap-1">
          {row.roles?.map(role => (
            <span key={role} className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 text-[9px] font-black uppercase border border-cyan-500/20">
              {role}
            </span>
          )) || "—"}
        </div>
      ),
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
    { header: "Scope", accessor: () => "Tenant membership", className: "text-[10px] opacity-60" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <SharedPageHeader native as="div" className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight">{getUiTranslation(language).systemPhrases.users_access_6c78bba}</h2>
          <p className="text-xs text-slate-500 font-medium mt-1">{getUiTranslation(language).systemPhrases.manage_platform_identity_and_rbac_5cf6468}</p>
        </div>
        <SharedPrimaryButton type="button" onClick={() => void openInvite()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-sm">
          <Plus className="h-4 w-4" />{getUiTranslation(language).systemPhrases.invite_user_83b7b6b}
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
          <div className="flex gap-1">
            <SharedSecondaryButton type="button" aria-label={getUiTranslation(language).systemPhrases.edit_user_roles_c054c41}
              onClick={() => void openRoles(row)}
              className="p-2 rounded-lg bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10">
              <Shield className="h-4 w-4" />
            </SharedSecondaryButton>
            <SharedSecondaryButton type="button" aria-label={getUiTranslation(language).systemPhrases.edit_membership_status_11546be}
              onClick={() => openStatus(row)}
              className="p-2 rounded-lg bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10">
              <Edit className="h-4 w-4" />
            </SharedSecondaryButton>
          </div>
        )}
      />

      {editor && (
        <SharedFilterBar as="div" className="hq-visual-overlay fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 p-4"
          onMouseDown={event => { if (event.target === event.currentTarget && !saving) setEditor(null); }}>
          <form role="dialog" aria-modal="true" aria-labelledby="membership-editor-title"
            onSubmit={saveMembership}
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/15 bg-slate-900 p-5 text-white shadow-2xl space-y-4">
            <h3 id="membership-editor-title" className="text-lg font-bold">
              {editor.mode === "invite" ? getUiTranslation(language).systemPhrases.add_user_to_tenant_2b4e0ac : editor.mode === "roles" ? getUiTranslation(language).systemPhrases.edit_user_roles_c054c41 : getUiTranslation(language).systemPhrases.change_membership_status_ac6a914}
            </h3>
            {formError && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-red-300">{formError}</p>}

            {editor.mode === "invite" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span>{getUiTranslation(language).systemPhrases.email_2195f5a}</span>
                  <input required type="email" value={invite.email}
                    onChange={e => setInvite({ ...invite, email: e.target.value })}
                    className="hq-input w-full rounded-lg border border-white/15 bg-slate-800 px-3 py-2" />
                </label>
                <label className="space-y-1 text-sm">
                  <span>{getUiTranslation(language).systemPhrases.full_name_64ef4c5}</span>
                  <input value={invite.full_name}
                    onChange={e => setInvite({ ...invite, full_name: e.target.value })}
                    className="hq-input w-full rounded-lg border border-white/15 bg-slate-800 px-3 py-2" />
                </label>
                <label className="space-y-1 text-sm sm:col-span-2">
                  <span>{getUiTranslation(language).systemPhrases.password_required_only_for_a_new_account_a46f6ea}</span>
                  <input type="password" autoComplete="new-password" value={invite.password}
                    onChange={e => setInvite({ ...invite, password: e.target.value })}
                    className="hq-input w-full rounded-lg border border-white/15 bg-slate-800 px-3 py-2" />
                </label>
              </div>
            )}

            {editor.mode !== "status" && (
              <div className="rounded-xl border border-white/10 p-3">
                <h4 className="mb-2 font-semibold">{getUiTranslation(language).systemPhrases.active_roles_d1e82b4} ({selectedRoles.length})</h4>
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {availableRoles.map(role => (
                    <label key={role.id} className="flex items-center gap-3 rounded-lg bg-white/[0.03] p-2 text-sm">
                      <input type="checkbox" checked={selectedRoles.includes(role.key)}
                        onChange={e => setSelectedRoles(keys => e.target.checked
                          ? [...keys, role.key]
                          : keys.filter(key => key !== role.key))} />
                      <span><b>{role.key}</b>{role.name ? ` · ${role.name}` : ""}</span>
                    </label>
                  ))}
                  {!availableRoles.length && <p className="text-sm text-slate-400">{getUiTranslation(language).systemPhrases.no_active_roles_returned_c47dd2c}</p>}
                </div>
              </div>
            )}

            <label className="block space-y-1 text-sm">
              <span>{getUiTranslation(language).systemPhrases.membership_status_1553427}</span>
              <SharedSelect value={status} onChange={e => setStatus(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-slate-800 px-3 py-2">
                {["active", "invited", "suspended", "closed"].map(value => (
                  <option key={value} value={value}>{value === "active" ? getUiTranslation(language).systemPhrases.active_c03b4ce : value === "invited" ? getUiTranslation(language).systemPhrases.invited_bd61a7e : value === "suspended" ? getUiTranslation(language).systemPhrases.suspended_63728e9 : getUiTranslation(language).systemPhrases.closed_7e53e5f}</option>
                ))}
              </SharedSelect>
            </label>

            <div className="flex justify-end gap-2">
              <SharedSecondaryButton type="button" disabled={saving} onClick={() => setEditor(null)}
                className="rounded-lg border border-white/15 px-4 py-2">{getUiTranslation(language).systemPhrases.cancel_354ef38}</SharedSecondaryButton>
              <SharedPrimaryButton type="submit" disabled={saving}
                className="rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-slate-950">
                {saving ? getUiTranslation(language).systemPhrases.saving_c40420d : getUiTranslation(language).systemPhrases.save_7ae3684}
              </SharedPrimaryButton>
            </div>
          </form>
        </SharedFilterBar>
      )}
    </div>
  );
}
