import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Landmark,
  Loader2,
  RefreshCw,
  WalletCards,
} from "lucide-react";
import { useTranslation } from "../../lib/i18n";
import { fetchers, type Session } from "../../lib/api";
import type { FinanceFilterState, FinanceTabId } from "./FinanceTypes";

type Props = {
  session: Session;
  filters: FinanceFilterState;
  onNavigateTab: (tab: FinanceTabId) => void;
};

type CashBankLoadState =
  | { kind: "loading"; amount: null }
  | { kind: "available"; amount: number }
  | { kind: "unavailable"; amount: null }
  | { kind: "error"; amount: null };

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null) return null;
  return value as Record<string, unknown>;
}

export function CashBankView({ session, filters, onNavigateTab }: Props) {
  const { language, rtl } = useTranslation();

  /*
   * CashBankView intentionally does not fabricate filter-scoped treasury
   * details. The existing Dashboard aggregate API currently exposes only the
   * certified cash_bank aggregate and availability flag.
   */
  void filters;
  void onNavigateTab;

  const copy = {
    fa: {
      title: "نقد و بانک",
      subtitle: "نمایش اطلاعات واقعی نقد و بانک از API سیستم",
      aggregateTitle: "مجموع نقد و بانک",
      aggregateSubtitle: "مقدار واقعی گزارش‌شده توسط داشبورد سیستم",
      sourceLabel: "منبع داده: API واقعی داشبورد",
      currency: "افغانی",
      loading: "در حال دریافت اطلاعات واقعی...",
      unavailable: "اطلاعات مجموع نقد و بانک در حال حاضر از API قابل دسترس نیست.",
      errorTitle: "دریافت اطلاعات نقد و بانک ناموفق بود",
      errorDetail: "API واقعی پاسخ موفق نداد. هیچ داده محلی یا نمونه نمایش داده نشده است.",
      retry: "تلاش دوباره",
      detailTitle: "حساب‌ها و تراکنش‌های نقد و بانک",
      detailUnavailable:
        "API جزئیات خزانه‌داری برای حساب‌ها، تراکنش‌ها، انتقالات و مغایرت‌گیری هنوز در Frontend موجود نیست؛ بنابراین هیچ حساب، تراکنش، موجودی یا انتقال ساختگی نمایش داده نمی‌شود.",
      detailUnavailableShort: "جزئیات واقعی هنوز از API قابل دریافت نیست.",
      realData: "داده واقعی",
      noFakeData: "داده ساختگی غیرفعال است",
      availability: "وضعیت دسترسی",
      available: "قابل دسترس",
      notAvailable: "غیرقابل دسترس",
    },
    ps: {
      title: "نغدي او بانک",
      subtitle: "د سیسټم له واقعي API څخه د نغدو او بانک معلومات",
      aggregateTitle: "د نغدو او بانک ټولیز مقدار",
      aggregateSubtitle: "د سیسټم د ډشبورډ له خوا راپور شوی واقعي مقدار",
      sourceLabel: "د معلوماتو سرچینه: د ډشبورډ واقعي API",
      currency: "افغانۍ",
      loading: "واقعي معلومات ترلاسه کېږي...",
      unavailable: "د نغدو او بانک ټولیز معلومات اوس مهال له API څخه د لاسرسي وړ نه دي.",
      errorTitle: "د نغدو او بانک معلومات ترلاسه نه شول",
      errorDetail: "واقعي API بریالی ځواب ور نه کړ. هېڅ محلي یا بېلګه معلومات نه دي ښودل شوي.",
      retry: "بیا هڅه",
      detailTitle: "د نغدو او بانک حسابونه او معاملې",
      detailUnavailable:
        "د خزانه‌دارۍ د حسابونو، معاملو، انتقالاتو او بانکي تطبیق لپاره تفصیلي Frontend API لا نشته؛ له همدې امله هېڅ جعلي حساب، معامله، بیلانس یا انتقال نه ښودل کېږي.",
      detailUnavailableShort: "واقعي تفصیلي معلومات لا له API څخه د ترلاسه کولو وړ نه دي.",
      realData: "واقعي معلومات",
      noFakeData: "جعلي معلومات غیرفعال دي",
      availability: "د لاسرسي حالت",
      available: "د لاسرسي وړ",
      notAvailable: "د لاسرسي وړ نه دی",
    },
    en: {
      title: "Cash & Bank",
      subtitle: "Real Cash & Bank information from the system API",
      aggregateTitle: "Cash & Bank Aggregate",
      aggregateSubtitle: "Real aggregate reported by the system dashboard",
      sourceLabel: "Data source: real Dashboard API",
      currency: "AFN",
      loading: "Loading real data...",
      unavailable: "The Cash & Bank aggregate is currently unavailable from the API.",
      errorTitle: "Cash & Bank data could not be loaded",
      errorDetail: "The real API did not return successfully. No local or sample data is being shown.",
      retry: "Retry",
      detailTitle: "Cash & Bank Accounts and Transactions",
      detailUnavailable:
        "A detailed frontend Treasury API for accounts, transactions, transfers, and reconciliation is not available yet. No fabricated account, transaction, balance, or transfer data is shown.",
      detailUnavailableShort: "Real detailed Treasury data is not yet available through the API.",
      realData: "Real data",
      noFakeData: "Fabricated data disabled",
      availability: "Availability",
      available: "Available",
      notAvailable: "Unavailable",
    },
  }[language];

  const [state, setState] = useState<CashBankLoadState>({
    kind: "loading",
    amount: null,
  });

  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat(
        language === "fa" ? "fa-AF" : language === "ps" ? "ps-AF" : "en-US",
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        },
      ),
    [language],
  );

  const loadCashBankAggregate = useCallback(async () => {
    setState({ kind: "loading", amount: null });

    try {
      const raw = await fetchers.dashboard(session);

      const root = asRecord(raw);
      const wrappedData = root ? asRecord(root.data) : null;
      const payload = wrappedData ?? root;
      const finance = payload ? asRecord(payload.finance) : null;

      const available = finance?.cash_bank_available === true;
      const rawAmount = finance?.cash_bank;

      const amount =
        typeof rawAmount === "number" && Number.isFinite(rawAmount)
          ? rawAmount
          : null;

      if (available && amount !== null) {
        setState({ kind: "available", amount });
        return;
      }

      setState({ kind: "unavailable", amount: null });
    } catch {
      setState({ kind: "error", amount: null });
    }
  }, [session]);

  useEffect(() => {
    void loadCashBankAggregate();
  }, [loadCashBankAggregate]);

  const availabilityText =
    state.kind === "available" ? copy.available : copy.notAvailable;

  return (
    <div
      dir={rtl ? "rtl" : "ltr"}
      className="space-y-4 animate-in fade-in duration-300"
    >
      <section className="glass-panel rounded-2xl border border-white/10 p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-2 text-cyan-300">
                <WalletCards className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <h2 className="text-sm font-black text-white">
                  {copy.title}
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  {copy.subtitle}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {copy.realData}
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-500/20 bg-slate-500/10 px-2.5 py-1 text-[10px] font-black text-slate-300">
              {copy.noFakeData}
            </span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.65fr)]">
        <div className="glass-card rounded-2xl border border-white/10 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="rounded-xl border border-sky-400/20 bg-sky-500/10 p-2.5 text-sky-300">
                <Landmark className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <h3 className="text-xs font-black text-white">
                  {copy.aggregateTitle}
                </h3>
                <p className="mt-1 text-[11px] text-slate-400">
                  {copy.aggregateSubtitle}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void loadCashBankAggregate()}
              disabled={state.kind === "loading"}
              aria-label={copy.retry}
              title={copy.retry}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${state.kind === "loading" ? "animate-spin" : ""}`}
              />
            </button>
          </div>

          <div className="mt-5">
            {state.kind === "loading" ? (
              <div className="flex min-h-16 items-center gap-2 text-xs font-bold text-slate-300">
                <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
                <span>{copy.loading}</span>
              </div>
            ) : state.kind === "available" ? (
              <div>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="font-mono text-2xl font-black tracking-tight text-white sm:text-3xl">
                    {numberFormatter.format(state.amount)}
                  </span>
                  <span className="text-xs font-black text-cyan-300">
                    {copy.currency}
                  </span>
                </div>

                <p className="mt-2 text-[10px] font-bold text-slate-500">
                  {copy.sourceLabel}
                </p>
              </div>
            ) : state.kind === "error" ? (
              <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
                  <div>
                    <p className="text-xs font-black text-rose-200">
                      {copy.errorTitle}
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-rose-100/70">
                      {copy.errorDetail}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                  <p className="text-xs leading-5 text-amber-100/80">
                    {copy.unavailable}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="glass-card rounded-2xl border border-white/10 p-4 sm:p-5">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
            {copy.availability}
          </p>

          <div className="mt-3 flex items-center gap-2">
            <span
              className={
                state.kind === "available"
                  ? "h-2.5 w-2.5 rounded-full bg-emerald-400"
                  : state.kind === "loading"
                    ? "h-2.5 w-2.5 animate-pulse rounded-full bg-slate-400"
                    : "h-2.5 w-2.5 rounded-full bg-amber-400"
              }
            />

            <span className="text-xs font-black text-white">
              {state.kind === "loading" ? copy.loading : availabilityText}
            </span>
          </div>

          <p className="mt-3 text-[11px] leading-5 text-slate-400">
            {copy.sourceLabel}
          </p>
        </div>
      </section>

      <section className="glass-panel rounded-2xl border border-amber-400/15 bg-amber-500/[0.03] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-2 text-amber-300">
            <AlertTriangle className="h-4 w-4" />
          </div>

          <div className="min-w-0">
            <h3 className="text-xs font-black text-white">
              {copy.detailTitle}
            </h3>

            <p className="mt-1.5 text-[11px] leading-5 text-slate-300">
              {copy.detailUnavailable}
            </p>

            <p className="mt-2 text-[10px] font-bold text-amber-300/80">
              {copy.detailUnavailableShort}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
