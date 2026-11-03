import { getTranslation as getUiTranslation } from "../../i18n";
import { PageHeader as SharedPageHeader } from "../../components/PageHeader";
import { SecondaryButton as SharedSecondaryButton, Select as SharedSelect, DatePicker as SharedDatePicker, PrimaryButton as SharedPrimaryButton } from "../../components/Interface";
import { DataTable as SharedDataTable } from "../../components/DataTable";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Eye,
  Loader2,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { useTranslation } from "../../lib/i18n";
import {
  accountingApi,
  fetchers,
  type Session,
} from "../../lib/api";
import type {
  FinanceFilterState,
  FinanceTabId,
} from "./FinanceTypes";

type Props = {
  session: Session;
  filters: FinanceFilterState;
  onNavigateTab: (tab: FinanceTabId) => void;
};

type LedgerApiLine = {
  id: string;
  created_at?: string | null;
  updated_at?: string | null;
  tenant?: string | null;
  company?: string | null;
  journal_entry?: string | null;
  account_code?: string | null;
  amount?: string | number | null;
  direction?: string | null;
  journal_number?: string | null;
  journal_date?: string | null;
  journal_status?: string | null;
};

type AccountRecord = {
  id?: string | null;
  code?: string | null;
  account_code?: string | null;
  name?: string | null;
  account_name?: string | null;
  title?: string | null;
  normal_balance?: string | null;
  status?: string | null;
  is_active?: boolean | null;
  is_posting?: boolean | null;
};

type LedgerRow = {
  id: string;
  journalId: string;
  journalNumber: string;
  journalDate: string;
  journalStatus: string;
  accountCode: string;
  accountName: string;
  direction: "debit" | "credit";
  amount: number;
  debit: number;
  credit: number;
  balance: number;
};

type PaginatedResponse<T> = {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: T[];
};

function asNumber(value: unknown): number {
  const parsed =
    typeof value === "number"
      ? value
      : Number(String(value ?? "").replace(/,/g, ""));

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function asText(value: unknown): string {
  if (
    value === null
    || value === undefined
  ) {
    return "";
  }

  return String(value);
}

function accountCodeOf(
  account: AccountRecord,
): string {
  return asText(
    account.code
    ?? account.account_code,
  ).trim();
}

function accountNameOf(
  account: AccountRecord,
): string {
  return asText(
    account.name
    ?? account.account_name
    ?? account.title,
  ).trim();
}

async function loadAllPages<T>(
  loader: (
    params: string,
  ) => Promise<PaginatedResponse<T>>,
): Promise<T[]> {
  const collected: T[] = [];
  let page = 1;

  while (page <= 1000) {
    const result =
      await loader(
        `?page=${page}&page_size=500`,
      );

    const rows =
      Array.isArray(
        result?.results,
      )
        ? result.results
        : [];

    collected.push(
      ...rows,
    );

    if (!result?.next) {
      return collected;
    }

    page += 1;
  }

  throw new Error(
    "Pagination safety limit reached before the server returned the final page.",
  );
}

function dateValue(
  value: string,
): number {
  if (!value) {
    return 0;
  }

  const time =
    new Date(
      value,
    ).getTime();

  return Number.isFinite(
    time,
  )
    ? time
    : 0;
}

export function GeneralLedgerView({
  session,
  filters,
  onNavigateTab,
}: Props) {
  const {
    language,
    rtl,
  } = useTranslation();

  void filters;

  const [ledgerLines, setLedgerLines] =
    useState<LedgerApiLine[]>([]);

  const [accounts, setAccounts] =
    useState<AccountRecord[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [refreshKey, setRefreshKey] =
    useState(0);

  const [searchQuery, setSearchQuery] =
    useState("");

  const [accountFilter, setAccountFilter] =
    useState("all");

  const [fromDate, setFromDate] =
    useState("");

  const [toDate, setToDate] =
    useState("");

  const [selectedRow, setSelectedRow] =
    useState<LedgerRow | null>(
      null,
    );

  const copies = {en:getUiTranslation("en").featureCopy.finance_GeneralLedgerView.local0,fa:getUiTranslation("fa").featureCopy.finance_GeneralLedgerView.local0,ps:getUiTranslation("ps").featureCopy.finance_GeneralLedgerView.local0};

  const copy =
    copies[
      language as keyof typeof copies
    ]
    ?? copies.en;

  const fmt = useCallback(
    (
      value: number,
    ) =>
      new Intl.NumberFormat(
        language === "fa"
          ? "fa-AF"
          : language === "ps"
            ? "ps-AF"
            : "en-US",
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        },
      ).format(
        value,
      ),
    [language],
  );

  const loadLedger =
    useCallback(
      async () => {
        setLoading(
          true,
        );

        setError(
          "",
        );

        try {
          const [
            realLedger,
            realAccounts,
          ] =
            await Promise.all([
              loadAllPages<LedgerApiLine>(
                (
                  params,
                ) =>
                  accountingApi.generalLedger(
                    session,
                    params,
                  ),
              ),

              loadAllPages<AccountRecord>(
                (
                  params,
                ) =>
                  fetchers.accounts(
                    session,
                    params,
                  ),
              ),
            ]);

          setLedgerLines(
            realLedger,
          );

          setAccounts(
            realAccounts,
          );
        } catch (
          caught
        ) {
          setLedgerLines(
            [],
          );

          setAccounts(
            [],
          );

          setError(
            caught instanceof Error
              ? caught.message
              : copy.loadError,
          );
        } finally {
          setLoading(
            false,
          );
        }
      },
      [
        session,
        copy.loadError,
      ],
    );

  useEffect(
    () => {
      void loadLedger();
    },
    [
      loadLedger,
      refreshKey,
    ],
  );

  const accountMap =
    useMemo(
      () => {
        const map =
          new Map<
            string,
            AccountRecord
          >();

        for (
          const account
          of accounts
        ) {
          const code =
            accountCodeOf(
              account,
            );

          if (code) {
            map.set(
              code,
              account,
            );
          }
        }

        return map;
      },
      [accounts],
    );

  const availableAccounts =
    useMemo(
      () =>
        accounts
          .map(
            (
              account,
            ) => ({
              code:
                accountCodeOf(
                  account,
                ),
              name:
                accountNameOf(
                  account,
                ),
            }),
          )
          .filter(
            (
              account,
            ) =>
              Boolean(
                account.code,
              ),
          )
          .sort(
            (
              a,
              b,
            ) =>
              a.code.localeCompare(
                b.code,
              ),
          ),
      [accounts],
    );

  const allRows =
    useMemo(
      () => {
        const chronological =
          [...ledgerLines]
            .sort(
              (
                left,
                right,
              ) => {
                const dateDifference =
                  dateValue(
                    asText(
                      left.journal_date
                      ?? left.created_at,
                    ),
                  )
                  - dateValue(
                    asText(
                      right.journal_date
                      ?? right.created_at,
                    ),
                  );

                if (
                  dateDifference
                  !== 0
                ) {
                  return dateDifference;
                }

                return asText(
                  left.id,
                ).localeCompare(
                  asText(
                    right.id,
                  ),
                );
              },
            );

        const rawBalances =
          new Map<
            string,
            number
          >();

        return chronological.map(
          (
            line,
          ): LedgerRow => {
            const accountCode =
              asText(
                line.account_code,
              ).trim();

            const account =
              accountMap.get(
                accountCode,
              );

            const direction =
              asText(
                line.direction,
              ).toLowerCase()
                === "credit"
                ? "credit"
                : "debit";

            const amount =
              asNumber(
                line.amount,
              );

            const debit =
              direction
                === "debit"
                ? amount
                : 0;

            const credit =
              direction
                === "credit"
                ? amount
                : 0;

            const previous =
              rawBalances.get(
                accountCode,
              )
              ?? 0;

            const nextRaw =
              previous
              + debit
              - credit;

            rawBalances.set(
              accountCode,
              nextRaw,
            );

            const normalBalance =
              asText(
                account?.normal_balance,
              ).toLowerCase();

            const displayBalance =
              normalBalance
                === "credit"
                ? -nextRaw
                : nextRaw;

            return {
              id:
                asText(
                  line.id,
                ),

              journalId:
                asText(
                  line.journal_entry,
                ),

              journalNumber:
                asText(
                  line.journal_number,
                ),

              journalDate:
                asText(
                  line.journal_date
                  ?? line.created_at,
                ),

              journalStatus:
                asText(
                  line.journal_status,
                ),

              accountCode,

              accountName:
                accountNameOf(
                  account
                  ?? {},
                ),

              direction,

              amount,

              debit,

              credit,

              balance:
                displayBalance,
            };
          },
        );
      },
      [
        ledgerLines,
        accountMap,
      ],
    );

  const filteredRows =
    useMemo(
      () => {
        const query =
          searchQuery
            .trim()
            .toLowerCase();

        return allRows
          .filter(
            (
              row,
            ) => {
              if (
                accountFilter
                  !== "all"
                && row.accountCode
                  !== accountFilter
              ) {
                return false;
              }

              const rowDate =
                row.journalDate
                  .slice(
                    0,
                    10,
                  );

              if (
                fromDate
                && rowDate
                && rowDate
                  < fromDate
              ) {
                return false;
              }

              if (
                toDate
                && rowDate
                && rowDate
                  > toDate
              ) {
                return false;
              }

              if (!query) {
                return true;
              }

              const haystack =
                [
                  row.journalNumber,
                  row.journalId,
                  row.accountCode,
                  row.accountName,
                  row.journalStatus,
                ]
                  .join(
                    " ",
                  )
                  .toLowerCase();

              return haystack.includes(
                query,
              );
            },
          )
          .sort(
            (
              left,
              right,
            ) =>
              dateValue(
                right.journalDate,
              )
              - dateValue(
                left.journalDate,
              ),
          );
      },
      [
        allRows,
        accountFilter,
        fromDate,
        toDate,
        searchQuery,
      ],
    );

  const totals =
    useMemo(
      () =>
        filteredRows.reduce(
          (
            accumulator,
            row,
          ) => ({
            debit:
              accumulator.debit
              + row.debit,

            credit:
              accumulator.credit
              + row.credit,
          }),
          {
            debit: 0,
            credit: 0,
          },
        ),
      [filteredRows],
    );

  const difference =
    totals.debit
    - totals.credit;

  const balanced =
    Math.abs(
      difference,
    )
    < 0.005;

  return (
    <div
      className="space-y-4"
      dir={
        rtl
          ? "rtl"
          : "ltr"
      }
    >
      <div className="glass-panel rounded-2xl p-4 lg:p-5 border border-white/10">
        <SharedPageHeader native as="div" className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base lg:text-lg font-black text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-cyan-400" />
                {copy.title}
              </h2>

              <span className="px-2 py-1 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-[10px] font-black uppercase tracking-wider text-emerald-300">
                {copy.realData}
              </span>
            </div>

            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              {copy.subtitle}
            </p>
          </div>

          <SharedSecondaryButton
            type="button"
            onClick={() =>
              setRefreshKey(
                (
                  value,
                ) =>
                  value + 1,
              )
            }
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-slate-300 hover:text-white hover:border-cyan-500/30 disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                loading
                  ? "animate-spin"
                  : ""
              }`}
            />
            {copy.refresh}
          </SharedSecondaryButton>
        </SharedPageHeader>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div className="glass-card rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3">
            <p className="text-[10px] uppercase font-black tracking-wider text-slate-500">
              {copy.totalDebit}
            </p>
            <p className="mt-1 font-mono text-sm font-black text-emerald-300">
              {fmt(
                totals.debit,
              )}
            </p>
          </div>

          <div className="glass-card rounded-xl border border-rose-500/20 bg-rose-950/20 p-3">
            <p className="text-[10px] uppercase font-black tracking-wider text-slate-500">
              {copy.totalCredit}
            </p>
            <p className="mt-1 font-mono text-sm font-black text-rose-300">
              {fmt(
                totals.credit,
              )}
            </p>
          </div>

          <div className="glass-card rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-3">
            <p className="text-[10px] uppercase font-black tracking-wider text-slate-500">
              {copy.netBalance}
            </p>
            <p className="mt-1 font-mono text-sm font-black text-cyan-300">
              {fmt(
                difference,
              )}
            </p>
          </div>

          <div
            className={`glass-card rounded-xl border p-3 ${
              balanced
                ? "border-emerald-500/20 bg-emerald-950/20"
                : "border-amber-500/20 bg-amber-950/20"
            }`}
          >
            <p className="text-[10px] uppercase font-black tracking-wider text-slate-500">
              {filteredRows.length} {copy.rows}
            </p>

            <div className="mt-1 flex items-center gap-2">
              {balanced ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-400" />
              )}

              <span
                className={`text-xs font-bold ${
                  balanced
                    ? "text-emerald-300"
                    : "text-amber-300"
                }`}
              >
                {balanced
                  ? copy.balanced
                  : copy.unbalanced}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-4 border border-white/10">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-2.5">
          <div className="relative">
            <Search
              className={`absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 ${
                rtl
                  ? "right-3"
                  : "left-3"
              }`}
            />

            <input
              value={searchQuery}
              onChange={(
                event,
              ) =>
                setSearchQuery(
                  event.target.value,
                )
              }
              placeholder={copy.search}
              className={`w-full glass-input text-xs ${
                rtl
                  ? "pr-9"
                  : "pl-9"
              }`}
            />
          </div>

          <SharedSelect
            value={accountFilter}
            onChange={(
              event,
            ) =>
              setAccountFilter(
                event.target.value,
              )
            }
            className="glass-input text-xs w-full"
          >
            <option value="all">
              {copy.allAccounts}
            </option>

            {availableAccounts.map(
              (
                account,
              ) => (
                <option
                  key={account.code}
                  value={account.code}
                >
                  {account.code}
                  {account.name
                    ? ` — ${account.name}`
                    : ""}
                </option>
              ),
            )}
          </SharedSelect>

          <label className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500">
              {copy.fromDate}
            </span>
            <SharedDatePicker
              type="date"
              value={fromDate}
              onChange={(
                event,
              ) =>
                setFromDate(
                  event.target.value,
                )
              }
              className="glass-input text-xs w-full"
            />
          </label>

          <label className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500">
              {copy.toDate}
            </span>
            <SharedDatePicker
              type="date"
              value={toDate}
              onChange={(
                event,
              ) =>
                setToDate(
                  event.target.value,
                )
              }
              className="glass-input text-xs w-full"
            />
          </label>

          <div className="flex items-end">
            <SharedSecondaryButton
              type="button"
              onClick={() => {
                setSearchQuery("");
                setAccountFilter("all");
                setFromDate("");
                setToDate("");
              }}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-bold text-slate-400 hover:text-white"
            >
              ×
            </SharedSecondaryButton>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-500/25 bg-rose-950/20 p-4 text-sm text-rose-300 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />

          <div>
            <div className="font-bold">
              {copy.loadError}
            </div>

            <div className="mt-1 text-xs text-rose-300/80 break-words">
              {error}
            </div>
          </div>
        </div>
      )}

      <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
        {loading ? (
          <div className="min-h-52 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
            <span className="text-xs font-bold">
              {copy.loading}
            </span>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="min-h-52 flex items-center justify-center px-5 text-center text-xs text-slate-500">
            {copy.empty}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <SharedDataTable native className="w-full min-w-[980px] text-xs">
              <thead className="bg-white/[0.03] border-b border-white/10">
                <tr>
                  <th className="px-4 py-3 text-start text-slate-400 font-black uppercase tracking-wider">
                    {copy.date}
                  </th>
                  <th className="px-4 py-3 text-start text-slate-400 font-black uppercase tracking-wider">
                    {copy.journal}
                  </th>
                  <th className="px-4 py-3 text-start text-slate-400 font-black uppercase tracking-wider">
                    {copy.account}
                  </th>
                  <th className="px-4 py-3 text-end text-slate-400 font-black uppercase tracking-wider">
                    {copy.debit}
                  </th>
                  <th className="px-4 py-3 text-end text-slate-400 font-black uppercase tracking-wider">
                    {copy.credit}
                  </th>
                  <th className="px-4 py-3 text-end text-slate-400 font-black uppercase tracking-wider">
                    {copy.balance}
                  </th>
                  <th className="px-4 py-3 text-center text-slate-400 font-black uppercase tracking-wider">
                    {copy.status}
                  </th>
                  <th className="px-4 py-3 text-center text-slate-400 font-black uppercase tracking-wider">
                    {copy.actions}
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/5">
                {filteredRows.map(
                  (
                    row,
                  ) => (
                    <tr
                      key={row.id}
                      className="hover:bg-white/[0.025] transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-400">
                        {row.journalDate
                          ? row.journalDate.slice(
                              0,
                              10,
                            )
                          : "—"}
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-cyan-300">
                          {row.journalNumber
                            || row.journalId
                            || "—"}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-mono font-bold text-white">
                          {row.accountCode
                            || "—"}
                        </div>

                        {row.accountName && (
                          <div className="mt-0.5 text-[10px] text-slate-500">
                            {row.accountName}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 text-end font-mono font-bold text-emerald-300">
                        {row.debit > 0
                          ? fmt(
                              row.debit,
                            )
                          : "—"}
                      </td>

                      <td className="px-4 py-3 text-end font-mono font-bold text-rose-300">
                        {row.credit > 0
                          ? fmt(
                              row.credit,
                            )
                          : "—"}
                      </td>

                      <td className="px-4 py-3 text-end font-mono font-bold text-slate-200">
                        {fmt(
                          row.balance,
                        )}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-black uppercase text-emerald-300">
                          {row.journalStatus
                            || "—"}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <SharedSecondaryButton
                          type="button"
                          onClick={() =>
                            setSelectedRow(
                              row,
                            )
                          }
                          className="inline-flex p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:border-cyan-500/30"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </SharedSecondaryButton>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </SharedDataTable>
          </div>
        )}
      </div>

      {selectedRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="glass-panel w-full max-w-2xl rounded-2xl border border-white/15 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="text-sm font-black text-white">
                  {copy.details}
                </h3>

                <p className="mt-1 font-mono text-xs text-cyan-300">
                  {selectedRow.journalNumber
                    || selectedRow.journalId
                    || "—"}
                </p>
              </div>

              <SharedSecondaryButton
                type="button"
                onClick={() =>
                  setSelectedRow(
                    null,
                  )
                }
                className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </SharedSecondaryButton>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {[
                [
                  copy.journalId,
                  selectedRow.journalId,
                ],
                [
                  copy.date,
                  selectedRow.journalDate,
                ],
                [
                  copy.accountCode,
                  selectedRow.accountCode,
                ],
                [
                  copy.account,
                  selectedRow.accountName,
                ],
                [
                  copy.direction,
                  selectedRow.direction,
                ],
                [
                  copy.amount,
                  fmt(
                    selectedRow.amount,
                  ),
                ],
                [
                  copy.balance,
                  fmt(
                    selectedRow.balance,
                  ),
                ],
                [
                  copy.status,
                  selectedRow.journalStatus,
                ],
              ].map(
                (
                  [
                    label,
                    value,
                  ],
                ) => (
                  <div
                    key={label}
                    className="p-3 rounded-xl bg-white/[0.02] border border-white/5"
                  >
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      {label}
                    </div>

                    <div className="mt-1 text-slate-200 break-all">
                      {value
                        || "—"}
                    </div>
                  </div>
                ),
              )}
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-3 border-t border-white/10">
              <SharedPrimaryButton
                type="button"
                onClick={() =>
                  onNavigateTab(
                    "journalEntries",
                  )
                }
                className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-500/15"
              >
                {copy.viewJournal}
              </SharedPrimaryButton>

              <SharedSecondaryButton
                type="button"
                onClick={() =>
                  setSelectedRow(
                    null,
                  )
                }
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-slate-300 hover:text-white"
              >
                {copy.close}
              </SharedSecondaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
