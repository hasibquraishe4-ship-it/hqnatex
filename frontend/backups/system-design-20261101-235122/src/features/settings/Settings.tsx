import { useEffect, useState, type FormEvent } from "react";
import {
  Building2,
  CheckCircle2,
  Palette,
  Save,
  Settings2,
  TriangleAlert,
} from "lucide-react";

import {
  fetchers,
  type Session,
} from "../../lib/api";

import { useTranslation } from "../../lib/i18n";
import { BackgroundBrandingPanel } from "./BackgroundBrandingPanel";

type Props = {
  session: Session;
  context: any;
  onCompanyChange: (companyId: string) => void;
};

type CompanyForm = {
  code: string;
  legal_name: string;
  trade_name: string;
};

export function Settings({
  session,
  context,
  onCompanyChange,
}: Props) {
  const { t } = useTranslation();

  const contextCompany =
    context?.companies?.find(
      (company: any) => company.id === session.companyId
    ) ||
    context?.companies?.[0];

  const [savedCompany, setSavedCompany] = useState<any>(null);

  const currentCompany =
    savedCompany?.id === contextCompany?.id
      ? savedCompany
      : contextCompany;

  const [form, setForm] = useState<CompanyForm>({
    code: "",
    legal_name: "",
    trade_name: "",
  });

  const [activeSettingsSection, setActiveSettingsSection] =
    useState<"company" | "appearance">("company");

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setSavedCompany(null);

    setForm({
      code: contextCompany?.code ?? "",
      legal_name: contextCompany?.legal_name ?? "",
      trade_name: contextCompany?.trade_name ?? "",
    });

    setSuccess("");
    setError("");
  }, [
    contextCompany?.id,
    contextCompany?.code,
    contextCompany?.legal_name,
    contextCompany?.trade_name,
  ]);

  const changeCompany = (companyId: string) => {
    setSavedCompany(null);
    setSuccess("");
    setError("");
    onCompanyChange(companyId);
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();

    if (!currentCompany?.id) {
      setError(t.settings.noCompany);
      return;
    }

    try {
      setSaving(true);
      setSuccess("");
      setError("");

      const updated = await fetchers.updateCompany(
        session,
        currentCompany.id,
        {
          code: form.code.trim(),
          legal_name: form.legal_name.trim(),
          trade_name: form.trade_name.trim(),
        }
      );

      setSavedCompany(updated);

      setForm({
        code: updated?.code ?? form.code,
        legal_name: updated?.legal_name ?? form.legal_name,
        trade_name: updated?.trade_name ?? form.trade_name,
      });

      setSuccess(t.settings.saveSuccess);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t.settings.saveFailed
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1120px] space-y-4 animate-in fade-in duration-300 hq-general-settings-typography">
      <style>{`
        /* GENERAL_SETTINGS_TYPOGRAPHY_V1 */
        .hq-general-settings-typography {
          color: #18364f !important;
          font-family: "Vazirmatn", "Noto Sans Arabic", Tahoma, Arial, sans-serif !important;
          font-size: 14px;
          line-height: 1.75;
        }
        .hq-general-settings-typography :is(h1,h2,h3,h4) {
          color: #102f49 !important;
          font-weight: 800 !important;
        }
        .hq-general-settings-typography p {
          color: #385970 !important;
        }
        .hq-general-settings-typography button {
          font-family: inherit !important;
          font-size: 14px !important;
          font-weight: 700 !important;
        }
        .hq-general-settings-typography :is(input,select,textarea) {
          color: #18364f !important;
          font-family: inherit !important;
          font-size: 14px !important;
          border-color: #8aa9bf !important;
        }
        .hq-general-settings-typography :is(input,select,textarea)::placeholder {
          color: #60798d !important;
          opacity: 1 !important;
        }
        .hq-shell[data-theme=dark] .hq-general-settings-typography :is(h1,h2,h3,h4,p) {
          color: #e4f2fc !important;
        }
        .hq-shell[data-theme=dark] .hq-general-settings-typography :is(input,select,textarea) {
          color: #e7f4ff !important;
          background-color: #17364d !important;
          border-color: #789bb5 !important;
        }
      `}</style>

      <section className="glass-panel rounded-[1.4rem] p-4 lg:p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-2.5">
            <Settings2 className="h-5 w-5 text-cyan-400" />
          </div>

          <div>
            <h2 className="text-xl lg:text-[1.35rem] font-black tracking-tight text-white">
              {t.settings.settingsCenter}
            </h2>

            <p className="mt-1 text-xs lg:text-[13px] font-medium text-slate-500">
              {t.settings.settingsCenterSubtitle}
            </p>
          </div>
        </div>
      </section>

      <section className="glass-panel rounded-[1.4rem] p-2.5">
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setActiveSettingsSection("company")}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-start transition-all ${
              activeSettingsSection === "company"
                ? "border-cyan-500/35 bg-cyan-500/10 text-cyan-300 shadow-[0_0_24px_rgba(34,211,238,0.07)]"
                : "border-white/5 bg-white/[0.035] text-slate-400 hover:bg-white/[0.06]"
            }`}
          >
            <Building2 className="h-5 w-5 shrink-0" />

            <div>
              <p className="text-sm font-black">
                {t.settings.generalSettings}
              </p>

              <p className="mt-0.5 text-[11px] font-semibold opacity-70">
                {t.settings.generalSettingsDesc}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveSettingsSection("appearance")}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-start transition-all ${
              activeSettingsSection === "appearance"
                ? "border-cyan-500/35 bg-cyan-500/10 text-cyan-300 shadow-[0_0_24px_rgba(34,211,238,0.07)]"
                : "border-white/5 bg-white/[0.035] text-slate-400 hover:bg-white/[0.06]"
            }`}
          >
            <Palette className="h-5 w-5 shrink-0" />

            <div>
              <p className="text-sm font-black">
                {t.settings.appearanceBranding}
              </p>

              <p className="mt-0.5 text-[11px] font-semibold opacity-70">
                {t.settings.appearanceBrandingDesc}
              </p>
            </div>
          </button>
        </div>
      </section>

      {activeSettingsSection === "company" ? (
        <>
      <section className="glass-panel rounded-[1.4rem] p-4 lg:p-5">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="rounded-xl bg-cyan-500/10 p-2 text-cyan-400">
            <Building2 className="h-5 w-5" />
          </div>

          <div>
            <h3 className="font-bold text-white">
              {t.settings.companyContext}
            </h3>

            <p className="mt-1 text-xs font-medium text-slate-500">
              {t.settings.activeCompany}
            </p>
          </div>
        </div>

        {context?.companies?.length ? (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,320px))] gap-2.5">
            {context.companies.map((company: any) => {
              const active =
                currentCompany?.id === company.id;

              return (
                <button
                  key={company.id}
                  type="button"
                  onClick={() => changeCompany(company.id)}
                  className={`rounded-xl border p-3 text-start transition-all ${
                    active
                      ? "border-cyan-500/40 bg-cyan-500/10 shadow-[0_0_20px_rgba(34,211,238,0.08)]"
                      : "border-white/5 bg-white/5 hover:border-white/10 hover:bg-white/[0.07]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-white">
                        {company.trade_name ||
                          company.legal_name ||
                          company.code}
                      </p>

                      <p className="mt-0.5 truncate font-mono text-[9px] font-bold uppercase tracking-wider text-slate-500">
                        {company.code}
                      </p>
                    </div>

                    {active && (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-cyan-400" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-sm font-medium text-slate-500">
            {t.settings.noCompany}
          </p>
        )}
      </section>

      {currentCompany && (
        <form
          onSubmit={handleSave}
          className="glass-panel rounded-[1.4rem] p-4 lg:p-5"
        >
          <div className="mb-4">
            <h3 className="text-base lg:text-lg font-black text-white">
              {t.settings.entityProfile}
            </h3>

            <p className="mt-1 text-xs font-medium text-slate-500">
              {t.settings.profileHelp}
            </p>
          </div>

          <div className="grid gap-3.5 md:grid-cols-2">
            <label className="space-y-1.5">
              <span className="block text-xs font-bold uppercase tracking-widest text-slate-500">
                {t.settings.legalName}
              </span>

              <input
                value={form.legal_name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    legal_name: event.target.value,
                  }))
                }
                className="glass-input w-full"
                required
              />
            </label>

            <label className="space-y-1.5">
              <span className="block text-xs font-bold uppercase tracking-widest text-slate-500">
                {t.settings.tradeName}
              </span>

              <input
                value={form.trade_name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    trade_name: event.target.value,
                  }))
                }
                className="glass-input w-full"
              />
            </label>

            <label className="space-y-1.5">
              <span className="block text-xs font-bold uppercase tracking-widest text-slate-500">
                {t.settings.internalCode}
              </span>

              <input
                value={form.code}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    code: event.target.value,
                  }))
                }
                className="glass-input w-full font-mono"
                required
              />
            </label>

            <div className="space-y-1.5">
              <span className="block text-xs font-bold uppercase tracking-widest text-slate-500">
                {t.settings.status}
              </span>

              <div className="glass-input flex min-h-10 items-center">
                <span className="text-sm font-bold text-slate-300">
                  {currentCompany.status || "—"}
                </span>
              </div>
            </div>
          </div>

          {success && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {success}
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300">
              <TriangleAlert className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="mt-5 flex justify-end border-t border-white/5 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-black text-slate-950 transition-all hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-4 w-4" />

              {saving
                ? t.settings.saving
                : t.settings.saveProfile}
            </button>
          </div>
        </form>
      )}
        </>
      ) : (
        <BackgroundBrandingPanel session={session} />
      )}
      </div>
    );
  }
