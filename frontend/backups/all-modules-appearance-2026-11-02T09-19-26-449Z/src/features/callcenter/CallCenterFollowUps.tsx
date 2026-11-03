import { SecondaryButton as SharedSecondaryButton, FilterBar as SharedFilterBar, Select as SharedSelect } from "../../components/Interface";
import { DataTable as SharedDataTable } from "../../components/DataTable";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { FormEvent } from "react";

import {
  CalendarClock,
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  X,
  XCircle,
} from "lucide-react";

import {
  api,
  type Paginated,
  type Session,
} from "../../lib/api";


type Lang = "en" | "fa" | "ps";
type Row = Record<string, unknown>;

type FollowUpForm = {
  customer: string;
  ticket: string;
  scheduled_at: string;
  subject: string;
  notes: string;
  priority: string;
};

type Summary = {
  total: number;
  pending: number;
  completed: number;
  cancelled: number;
  overdue: number;
};


function rowsOf(
  data: Row[] | Paginated<Row>,
): Row[] {
  return Array.isArray(data)
    ? data
    : data.results;
}


function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : String(error);
}


function text(value: unknown) {
  return value == null
    ? ""
    : String(value);
}


function localInput(value: unknown) {
  if (!value) {
    return "";
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (number: number) =>
    String(number).padStart(2, "0");

  return (
    `${date.getFullYear()}-` +
    `${pad(date.getMonth() + 1)}-` +
    `${pad(date.getDate())}T` +
    `${pad(date.getHours())}:` +
    `${pad(date.getMinutes())}`
  );
}


function displayDate(
  value: unknown,
  language: Lang,
) {
  if (!value) {
    return "—";
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const locale =
    language === "en"
      ? "en-GB"
      : language === "fa"
        ? "fa-AF"
        : "ps-AF";

  return new Intl.DateTimeFormat(
    locale,
    {
      calendar: "gregory",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    },
  ).format(date);
}


function lookupLabel(
  row: Row,
  kind: "customer" | "ticket",
) {
  if (kind === "ticket") {
    return (
      text(row.ticket_number) ||
      text(row.subject) ||
      text(row.code) ||
      text(row.id)
    );
  }

  const code =
    text(row.customer_no) ||
    text(row.code) ||
    text(row.identifier);

  const name =
    text(row.display_name) ||
    text(row.name) ||
    text(row.full_name) ||
    text(row.customer_name) ||
    text(row.name_english);

  return (
    [code, name]
      .filter(Boolean)
      .join(" — ") ||
    text(row.id)
  );
}


function FollowUpLookup({
  session,
  language,
  kind,
  value,
  selectedLabel,
  customer,
  disabled,
  onSelect,
}: {
  session: Session;
  language: Lang;
  kind: "customer" | "ticket";
  value: string;
  selectedLabel: string;
  customer?: string;
  disabled: boolean;
  onSelect: (row: Row | null) => void;
}) {
  const tr = (
    en: string,
    fa: string,
    ps: string,
  ) =>
    language === "en"
      ? en
      : language === "fa"
        ? fa
        : ps;

  const [page, setPage] =
    useState(1);

  const [rows, setRows] =
    useState<Row[]>([]);

  const [next, setNext] =
    useState(false);

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState("");

  const [term, setTerm] =
    useState("");

  const [open, setOpen] =
    useState(false);

  useEffect(() => {
    if (
      !open ||
      !session.companyId ||
      (
        kind === "ticket" &&
        !customer
      )
    ) {
      return;
    }

    let active = true;

    const controller =
      new AbortController();

    setBusy(true);
    setError("");

    const endpoint =
      kind === "customer"
        ? "/api/v1/customers/"
        : "/api/v1/customer-tickets/";

    const query =
      new URLSearchParams({
        page: String(page),
      });

    if (
      kind === "ticket" &&
      customer
    ) {
      query.set(
        "customer",
        customer,
      );
    }

    api<Row[] | Paginated<Row>>(
      `${endpoint}?${query.toString()}`,
      {
        signal: controller.signal,
      },
      session,
    )
      .then(data => {
        if (!active) {
          return;
        }

        setRows(
          rowsOf(data),
        );

        setNext(
          !Array.isArray(data) &&
          Boolean(data.next),
        );
      })
      .catch(errorValue => {
        if (!active) {
          return;
        }

        setError(
          errorMessage(errorValue),
        );
      })
      .finally(() => {
        if (active) {
          setBusy(false);
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [
    open,
    session.tenantId,
    session.companyId,
    session.access,
    kind,
    customer,
    page,
  ]);

  useEffect(() => {
    setPage(1);
    setTerm("");

    if (
      kind === "ticket" &&
      !customer
    ) {
      setOpen(false);
    }
  }, [
    kind,
    customer,
  ]);

  const normalized =
    term.trim().toLocaleLowerCase();

  const available =
    rows.filter(row =>
      !normalized ||
      lookupLabel(
        row,
        kind,
      )
        .toLocaleLowerCase()
        .includes(normalized),
    );

  const display =
    selectedLabel ||
    value ||
    tr(
      kind === "customer"
        ? "Select customer"
        : "Select ticket",
      kind === "customer"
        ? "انتخاب مشترک"
        : "انتخاب تیکت",
      kind === "customer"
        ? "پېرودونکی وټاکئ"
        : "ټکټ وټاکئ",
    );

  return (
    <div className="cc-followup-picker">
      <SharedSecondaryButton
        type="button"
        className="cc-followup-picker-button"
        disabled={disabled}
        aria-expanded={open}
        onClick={() =>
          setOpen(
            current => !current,
          )
        }
      >
        <span className="truncate">
          {display}
        </span>

        <span
          aria-hidden="true"
          className="cc-followup-picker-chevron"
        >
          {open ? "⌃" : "⌄"}
        </span>
      </SharedSecondaryButton>

      {open && (
        <div className="cc-followup-picker-menu">
          <div className="cc-followup-picker-search">
            <Search className="h-4 w-4" />

            <input
              autoFocus
              value={term}
              placeholder={tr(
                "Search",
                "جستجو",
                "لټون",
              )}
              onChange={event =>
                setTerm(
                  event.target.value,
                )
              }
            />
          </div>

          {error && (
            <p
              role="alert"
              className="px-3 py-2 text-xs text-red-600"
            >
              {error}
            </p>
          )}

          <div className="cc-followup-picker-options">
            {busy ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : (
              <>
                {available.map(row => {
                  const id =
                    text(row.id);

                  return (
                    <SharedSecondaryButton
                      key={id}
                      type="button"
                      className="cc-followup-picker-option"
                      aria-pressed={
                        value === id
                      }
                      onClick={() => {
                        onSelect(row);
                        setOpen(false);
                      }}
                    >
                      {lookupLabel(
                        row,
                        kind,
                      )}
                    </SharedSecondaryButton>
                  );
                })}

                {!available.length && (
                  <p className="p-3 text-xs opacity-60">
                    {tr(
                      "No records found.",
                      "موردی یافت نشد.",
                      "ریکارډ ونه موندل شو.",
                    )}
                  </p>
                )}
              </>
            )}
          </div>

          <div className="cc-followup-picker-footer">
            <SharedSecondaryButton
              type="button"
              disabled={
                busy ||
                page <= 1
              }
              onClick={() =>
                setPage(
                  value =>
                    value - 1,
                )
              }
            >
              ‹
            </SharedSecondaryButton>

            <span>
              {tr(
                "Page",
                "صفحه",
                "پاڼه",
              )}{" "}
              {page}
            </span>

            <SharedSecondaryButton
              type="button"
              disabled={
                busy ||
                !next
              }
              onClick={() =>
                setPage(
                  value =>
                    value + 1,
                )
              }
            >
              ›
            </SharedSecondaryButton>
          </div>

          {value && (
            <SharedSecondaryButton
              type="button"
              className="cc-followup-picker-clear"
              onClick={() => {
                onSelect(null);
                setOpen(false);
              }}
            >
              {tr(
                "Clear selection",
                "پاک کردن انتخاب",
                "ټاکنه پاکه کړئ",
              )}
            </SharedSecondaryButton>
          )}
        </div>
      )}
    </div>
  );
}


export function CustomerFollowUps({
  session,
  language,
  refreshTrigger,
}: {
  session: Session;
  language: Lang;
  refreshTrigger: number;
}) {
  const tr = (
    en: string,
    fa: string,
    ps: string,
  ) =>
    language === "en"
      ? en
      : language === "fa"
        ? fa
        : ps;

  const emptyForm =
    (): FollowUpForm => ({
      customer: "",
      ticket: "",
      scheduled_at: "",
      subject: "",
      notes: "",
      priority: "normal",
    });

  const [rows, setRows] =
    useState<Row[]>([]);

  const [summary, setSummary] =
    useState<Summary>({
      total: 0,
      pending: 0,
      completed: 0,
      cancelled: 0,
      overdue: 0,
    });

  const [page, setPage] =
    useState(1);

  const [next, setNext] =
    useState(false);

  const [count, setCount] =
    useState(0);

  const [search, setSearch] =
    useState("");

  const [draftSearch, setDraftSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("");

  const [
    priorityFilter,
    setPriorityFilter,
  ] = useState("");

  const [version, setVersion] =
    useState(0);

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState("");

  const [notice, setNotice] =
    useState("");

  const [modal, setModal] =
    useState(false);

  const [selected, setSelected] =
    useState<Row | null>(null);

  const [form, setForm] =
    useState<FollowUpForm>(
      emptyForm,
    );

  const [
    customerLabel,
    setCustomerLabel,
  ] = useState("");

  const [
    ticketLabel,
    setTicketLabel,
  ] = useState("");

  const [saving, setSaving] =
    useState(false);

  const [saveError, setSaveError] =
    useState("");

  const [actionBusy, setActionBusy] =
    useState("");

  useEffect(() => {
    if (!session.companyId) {
      setRows([]);
      setSummary({
        total: 0,
        pending: 0,
        completed: 0,
        cancelled: 0,
        overdue: 0,
      });
      setCount(0);
      setNext(false);
      setBusy(false);
      setError(
        tr(
          "Select a company first.",
          "ابتدا شرکت را انتخاب کنید.",
          "لومړی شرکت وټاکئ.",
        ),
      );
      return;
    }

    let active = true;

    const controller =
      new AbortController();

    setBusy(true);
    setError("");

    const query =
      new URLSearchParams({
        page: String(page),
      });

    const summaryQuery =
      new URLSearchParams();

    if (search) {
      query.set("q", search);
      summaryQuery.set(
        "q",
        search,
      );
    }

    if (statusFilter) {
      query.set(
        "status",
        statusFilter,
      );
      summaryQuery.set(
        "status",
        statusFilter,
      );
    }

    if (priorityFilter) {
      query.set(
        "priority",
        priorityFilter,
      );
      summaryQuery.set(
        "priority",
        priorityFilter,
      );
    }

    Promise.all([
      api<Row[] | Paginated<Row>>(
        `/api/v1/customer-followups/?${query.toString()}`,
        {
          signal:
            controller.signal,
        },
        session,
      ),
      api<Summary>(
        `/api/v1/customer-followups/summary/?${summaryQuery.toString()}`,
        {
          signal:
            controller.signal,
        },
        session,
      ),
    ])
      .then(
        ([
          listData,
          summaryData,
        ]) => {
          if (!active) {
            return;
          }

          setRows(
            rowsOf(listData),
          );

          setNext(
            !Array.isArray(
              listData,
            ) &&
            Boolean(listData.next),
          );

          setCount(
            Array.isArray(
              listData,
            )
              ? listData.length
              : listData.count,
          );

          setSummary(
            summaryData,
          );
        },
      )
      .catch(errorValue => {
        if (!active) {
          return;
        }

        setError(
          errorMessage(
            errorValue,
          ),
        );
      })
      .finally(() => {
        if (active) {
          setBusy(false);
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [
    session.tenantId,
    session.companyId,
    session.access,
    page,
    search,
    statusFilter,
    priorityFilter,
    version,
    refreshTrigger,
  ]);

  function openCreate() {
    setSelected(null);
    setForm(
      emptyForm(),
    );
    setCustomerLabel("");
    setTicketLabel("");
    setSaveError("");
    setNotice("");
    setModal(true);
  }

  function openEdit(
    row: Row,
  ) {
    setSelected(row);

    setForm({
      customer:
        text(row.customer),
      ticket:
        text(row.ticket),
      scheduled_at:
        localInput(
          row.scheduled_at,
        ),
      subject:
        text(row.subject),
      notes:
        text(row.notes),
      priority:
        text(row.priority) ||
        "normal",
    });

    setCustomerLabel(
      text(
        row.customer_label,
      ),
    );

    setTicketLabel(
      text(
        row.ticket_number,
      ),
    );

    setSaveError("");
    setNotice("");
    setModal(true);
  }

  async function save(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (!form.customer) {
      setSaveError(
        tr(
          "Customer is required.",
          "انتخاب مشترک الزامی است.",
          "د پېرودونکي ټاکل اړین دي.",
        ),
      );
      return;
    }

    if (
      !form.subject.trim()
    ) {
      setSaveError(
        tr(
          "Subject is required.",
          "موضوع الزامی است.",
          "موضوع اړین دی.",
        ),
      );
      return;
    }

    if (
      !form.scheduled_at
    ) {
      setSaveError(
        tr(
          "Scheduled date and time are required.",
          "تاریخ و ساعت پیگیری الزامی است.",
          "د تعقیب نېټه او وخت اړین دي.",
        ),
      );
      return;
    }

    const scheduled =
      new Date(
        form.scheduled_at,
      );

    if (
      Number.isNaN(
        scheduled.getTime(),
      )
    ) {
      setSaveError(
        tr(
          "Invalid scheduled date.",
          "تاریخ پیگیری معتبر نیست.",
          "د تعقیب نېټه ناسمه ده.",
        ),
      );
      return;
    }

    setSaving(true);
    setSaveError("");
    setNotice("");

    const payload = {
      customer:
        form.customer,
      ticket:
        form.ticket || null,
      scheduled_at:
        scheduled.toISOString(),
      subject:
        form.subject.trim(),
      notes:
        form.notes.trim(),
      priority:
        form.priority,
    };

    try {
      const editing =
        Boolean(selected?.id);

      const path =
        editing
          ? `/api/v1/customer-followups/${encodeURIComponent(
              text(
                selected?.id,
              ),
            )}/`
          : "/api/v1/customer-followups/";

      await api<Row>(
        path,
        {
          method:
            editing
              ? "PATCH"
              : "POST",
          body:
            JSON.stringify(
              payload,
            ),
        },
        session,
      );

      setModal(false);

      setNotice(
        editing
          ? tr(
              "Follow-up updated.",
              "پیگیری ویرایش شد.",
              "تعقیب تازه شو.",
            )
          : tr(
              "Follow-up created.",
              "پیگیری ایجاد شد.",
              "تعقیب جوړ شو.",
            ),
      );

      setVersion(
        value => value + 1,
      );
    } catch (errorValue) {
      setSaveError(
        errorMessage(
          errorValue,
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function complete(
    row: Row,
  ) {
    const id =
      text(row.id);

    if (!id) {
      return;
    }

    const outcome =
      window.prompt(
        tr(
          "Outcome / result",
          "نتیجه پیگیری",
          "د تعقیب پایله",
        ),
        text(row.outcome),
      );

    if (
      outcome === null
    ) {
      return;
    }

    setActionBusy(
      `complete:${id}`,
    );

    setError("");

    try {
      await api<Row>(
        `/api/v1/customer-followups/${encodeURIComponent(id)}/complete/`,
        {
          method: "POST",
          body:
            JSON.stringify({
              outcome,
            }),
        },
        session,
      );

      setNotice(
        tr(
          "Follow-up completed.",
          "پیگیری تکمیل شد.",
          "تعقیب بشپړ شو.",
        ),
      );

      setVersion(
        value => value + 1,
      );
    } catch (errorValue) {
      setError(
        errorMessage(
          errorValue,
        ),
      );
    } finally {
      setActionBusy("");
    }
  }

  async function cancel(
    row: Row,
  ) {
    const id =
      text(row.id);

    if (!id) {
      return;
    }

    const confirmed =
      window.confirm(
        tr(
          "Cancel this follow-up?",
          "این پیگیری لغو شود؟",
          "دا تعقیب لغوه شي؟",
        ),
      );

    if (!confirmed) {
      return;
    }

    setActionBusy(
      `cancel:${id}`,
    );

    setError("");

    try {
      await api<Row>(
        `/api/v1/customer-followups/${encodeURIComponent(id)}/cancel/`,
        {
          method: "POST",
          body:
            JSON.stringify({}),
        },
        session,
      );

      setNotice(
        tr(
          "Follow-up cancelled.",
          "پیگیری لغو شد.",
          "تعقیب لغوه شو.",
        ),
      );

      setVersion(
        value => value + 1,
      );
    } catch (errorValue) {
      setError(
        errorMessage(
          errorValue,
        ),
      );
    } finally {
      setActionBusy("");
    }
  }

  const statusLabel = (
    value: unknown,
  ) => {
    switch (text(value)) {
      case "pending":
        return tr(
          "Pending",
          "در انتظار",
          "په تمه",
        );

      case "completed":
        return tr(
          "Completed",
          "تکمیل",
          "بشپړ",
        );

      case "cancelled":
        return tr(
          "Cancelled",
          "لغو",
          "لغوه",
        );

      default:
        return (
          text(value) ||
          "—"
        );
    }
  };

  const priorityLabel = (
    value: unknown,
  ) => {
    switch (text(value)) {
      case "low":
        return tr(
          "Low",
          "پایین",
          "ټیټ",
        );

      case "normal":
        return tr(
          "Normal",
          "عادی",
          "عادي",
        );

      case "high":
        return tr(
          "High",
          "بالا",
          "لوړ",
        );

      case "urgent":
        return tr(
          "Urgent",
          "فوری",
          "عاجل",
        );

      default:
        return (
          text(value) ||
          "—"
        );
    }
  };

  const cards = [
    {
      key: "total",
      label: tr(
        "Total",
        "مجموع",
        "ټول",
      ),
      value: summary.total,
    },
    {
      key: "pending",
      label: tr(
        "Pending",
        "در انتظار",
        "په تمه",
      ),
      value:
        summary.pending,
    },
    {
      key: "completed",
      label: tr(
        "Completed",
        "تکمیل",
        "بشپړ",
      ),
      value:
        summary.completed,
    },
    {
      key: "cancelled",
      label: tr(
        "Cancelled",
        "لغو",
        "لغوه",
      ),
      value:
        summary.cancelled,
    },
    {
      key: "overdue",
      label: tr(
        "Overdue",
        "گذشته از موعد",
        "له وخته تېر",
      ),
      value:
        summary.overdue,
    },
  ];

  return (
    <div
      className="grid gap-4"
      dir={
        language === "en"
          ? "ltr"
          : "rtl"
      }
    >
      <style>{`
        .cc-followups-panel {
          border:
            1px solid
            rgba(125, 211, 252, .28);
          border-radius:
            1.35rem;
          background:
            rgba(255, 255, 255, .48);
          backdrop-filter:
            blur(18px);
          box-shadow:
            0 14px 42px
            rgba(15, 23, 42, .08);
        }

        .hq-shell[data-theme="dark"]
        .cc-followups-panel {
          background:
            rgba(15, 23, 42, .42);
          border-color:
            rgba(125, 211, 252, .16);
        }

        .cc-followup-kpi {
          border:
            1px solid
            rgba(125, 211, 252, .26);
          border-radius:
            1.1rem;
          background:
            rgba(255, 255, 255, .52);
          padding:
            14px;
        }

        .hq-shell[data-theme="dark"]
        .cc-followup-kpi {
          background:
            rgba(255, 255, 255, .05);
        }

        .cc-followup-status {
          display:
            inline-flex;
          align-items:
            center;
          justify-content:
            center;
          border-radius:
            999px;
          padding:
            4px 9px;
          font-size:
            11px;
          font-weight:
            800;
          border:
            1px solid
            rgba(125, 211, 252, .28);
          background:
            rgba(125, 211, 252, .08);
        }

        /* ================================================
           FOLLOW-UP MODAL — MATCH NEW CALL RECORD
           ================================================ */

        .cc-followups-overlay {
          position:
            fixed;
          inset:
            0;
          z-index:
            2147482000;
          display:
            flex;
          align-items:
            center;
          justify-content:
            center;
          padding:
            22px;
          background:
            rgba(15, 23, 42, .36);
          backdrop-filter:
            blur(4px);
        }

        .cc-followups-modal {
          box-sizing:
            border-box;
          width:
            min(1090px, calc(100vw - 44px));
          height:
            min(610px, calc(100vh - 70px));
          min-height:
            min(560px, calc(100vh - 70px));
          display:
            grid;
          grid-template-rows:
            auto minmax(0, 1fr) auto;
          overflow:
            hidden;
          border:
            1px solid
            rgba(255, 255, 255, .76);
          border-radius:
            20px;
          background:
            linear-gradient(
              135deg,
              rgba(232, 247, 255, .96),
              rgba(184, 211, 230, .93)
            );
          box-shadow:
            0 28px 80px
            rgba(15, 23, 42, .30);
          color:
            #173b57;
          backdrop-filter:
            blur(26px);
        }

        .cc-followups-modal > header {
          min-height:
            74px;
          display:
            flex;
          align-items:
            center;
          justify-content:
            space-between;
          gap:
            16px;
          padding:
            0 24px;
          border-bottom:
            1px solid
            rgba(255, 255, 255, .48);
          background:
            rgba(235, 248, 255, .76);
        }

        .cc-followups-modal > header h3 {
          margin:
            0;
          font-size:
            23px;
          line-height:
            1.2;
          font-weight:
            850;
          letter-spacing:
            -.02em;
          color:
            #1f2937;
        }

        .cc-followups-modal > header p {
          display:
            none;
        }

        .cc-followups-modal > header button {
          min-width:
            34px;
          width:
            34px;
          height:
            34px;
          padding:
            0;
          border:
            0;
          background:
            transparent;
          box-shadow:
            none;
        }

        .cc-followup-form-grid {
          min-height:
            0;
          overflow-y:
            auto;
          display:
            grid;
          grid-template-columns:
            minmax(0, 1fr)
            minmax(0, 1fr);
          grid-auto-flow:
            row;
          align-content:
            start;
          gap:
            22px 20px;
          padding:
            26px 34px 30px;
          background:
            rgba(137, 177, 205, .22);
        }

        .cc-followup-form-grid > label {
          min-width:
            0;
          width:
            100%;
        }

        .cc-followup-form-grid
        .cc-followup-form-error {
          grid-column:
            1 / -1;
        }

        .cc-followups-modal > main {
          min-height:
            0;
        }

        .cc-followups-modal label {
          align-content:
            start;
          gap:
            9px;
        }

        .cc-followups-modal label > span {
          color:
            #234967;
          font-size:
            15px;
          font-weight:
            800;
        }

        .cc-followups-modal input,
        .cc-followups-modal select,
        .cc-followups-modal textarea,
        .cc-followup-picker-button {
          box-sizing:
            border-box;
          width:
            100%;
          min-height:
            56px;
          border:
            2px solid
            rgba(255, 255, 255, .82);
          border-radius:
            12px;
          outline:
            none;
          background:
            rgba(236, 248, 255, .79);
          color:
            #173b57;
          padding:
            0 16px;
          font-size:
            16px;
          font-weight:
            600;
          box-shadow:
            inset 0 1px 0
            rgba(255, 255, 255, .46);
          transition:
            border-color .15s ease,
            box-shadow .15s ease,
            background .15s ease;
        }

        .cc-followups-modal textarea {
          min-height:
            112px;
          padding-top:
            14px;
          padding-bottom:
            14px;
          resize:
            vertical;
        }

        .cc-followups-modal input:focus,
        .cc-followups-modal select:focus,
        .cc-followups-modal textarea:focus,
        .cc-followup-picker-button:focus {
          border-color:
            rgba(56, 189, 248, .82);
          background:
            rgba(245, 252, 255, .94);
          box-shadow:
            0 0 0 3px
            rgba(56, 189, 248, .15);
        }

        .cc-followups-modal > footer {
          min-height:
            84px;
          display:
            flex;
          align-items:
            center;
          justify-content:
            flex-end;
          gap:
            12px;
          padding:
            0 24px;
          border-top:
            1px solid
            rgba(255, 255, 255, .48);
          background:
            rgba(230, 246, 255, .82);
        }

        .cc-followups-modal > footer button {
          min-height:
            42px;
          padding:
            0 16px;
          border-radius:
            10px;
          font-weight:
            800;
        }

        .cc-followup-picker {
          position:
            relative;
          width:
            100%;
        }

        .cc-followup-picker-button {
          display:
            flex;
          align-items:
            center;
          justify-content:
            space-between;
          gap:
            12px;
          text-align:
            start;
        }

        .cc-followup-picker-chevron {
          flex:
            0 0 auto;
          font-size:
            18px;
          opacity:
            .65;
        }

        .cc-followup-picker-menu {
          position:
            absolute;
          inset-inline:
            0;
          top:
            calc(100% + 7px);
          z-index:
            80;
          overflow:
            hidden;
          border:
            1px solid
            rgba(125, 211, 252, .55);
          border-radius:
            12px;
          background:
            rgba(244, 251, 255, .99);
          box-shadow:
            0 18px 45px
            rgba(15, 23, 42, .22);
          backdrop-filter:
            blur(20px);
        }

        .cc-followup-picker-search {
          display:
            flex;
          align-items:
            center;
          gap:
            8px;
          padding:
            9px;
          border-bottom:
            1px solid
            rgba(125, 211, 252, .28);
        }

        .cc-followup-picker-search input {
          min-height:
            42px;
          height:
            42px;
          border-width:
            1px;
          padding:
            0 12px;
          font-size:
            13px;
        }

        .cc-followup-picker-options {
          max-height:
            190px;
          overflow-y:
            auto;
          padding:
            6px;
        }

        .cc-followup-picker-option {
          display:
            flex;
          width:
            100%;
          min-height:
            40px;
          align-items:
            center;
          justify-content:
            flex-start;
          border:
            0;
          border-radius:
            8px;
          background:
            transparent;
          color:
            #173b57;
          padding:
            8px 10px;
          text-align:
            start;
          font-size:
            13px;
          font-weight:
            700;
        }

        .cc-followup-picker-option:hover,
        .cc-followup-picker-option[aria-pressed="true"] {
          background:
            rgba(56, 189, 248, .12);
        }

        .cc-followup-picker-footer {
          display:
            flex;
          align-items:
            center;
          justify-content:
            space-between;
          gap:
            10px;
          padding:
            7px 9px;
          border-top:
            1px solid
            rgba(125, 211, 252, .24);
          font-size:
            11px;
        }

        .cc-followup-picker-footer button {
          min-width:
            32px;
          min-height:
            30px;
          padding:
            0;
        }

        .cc-followup-picker-clear {
          width:
            100%;
          min-height:
            34px;
          border:
            0;
          border-top:
            1px solid
            rgba(125, 211, 252, .24);
          border-radius:
            0;
          background:
            rgba(239, 68, 68, .04);
          color:
            #b91c1c;
          font-size:
            11px;
        }

        .hq-shell[data-theme="dark"]
        .cc-followups-modal {
          background:
            linear-gradient(
              135deg,
              rgba(21, 43, 62, .97),
              rgba(17, 35, 51, .97)
            );
          color:
            #e5f3fb;
          border-color:
            rgba(125, 211, 252, .22);
        }

        .hq-shell[data-theme="dark"]
        .cc-followups-modal > header,
        .hq-shell[data-theme="dark"]
        .cc-followups-modal > footer {
          background:
            rgba(18, 39, 56, .92);
          border-color:
            rgba(125, 211, 252, .14);
        }

        .hq-shell[data-theme="dark"]
        .cc-followup-form-grid {
          background:
            rgba(15, 30, 44, .52);
        }

        .hq-shell[data-theme="dark"]
        .cc-followups-modal > header h3,
        .hq-shell[data-theme="dark"]
        .cc-followups-modal label > span {
          color:
            #e5f3fb;
        }

        .hq-shell[data-theme="dark"]
        .cc-followups-modal input,
        .hq-shell[data-theme="dark"]
        .cc-followups-modal select,
        .hq-shell[data-theme="dark"]
        .cc-followups-modal textarea,
        .hq-shell[data-theme="dark"]
        .cc-followup-picker-button {
          border-color:
            rgba(125, 211, 252, .20);
          background:
            rgba(255, 255, 255, .07);
          color:
            #edf8ff;
        }

        .hq-shell[data-theme="dark"]
        .cc-followup-picker-menu {
          background:
            rgba(19, 40, 57, .99);
          border-color:
            rgba(125, 211, 252, .22);
        }

        .hq-shell[data-theme="dark"]
        .cc-followup-picker-option {
          color:
            #edf8ff;
        }

        @media (max-width: 760px) {
          .cc-followups-overlay {
            padding:
              10px;
          }

          .cc-followups-modal {
            width:
              calc(100vw - 20px);
            height:
              calc(100vh - 20px);
            min-height:
              0;
            border-radius:
              16px;
          }

          .cc-followups-modal > header {
            min-height:
              64px;
            padding:
              0 16px;
          }

          .cc-followups-modal > header h3 {
            font-size:
              19px;
          }

          .cc-followup-form-grid {
            grid-template-columns:
              1fr;
            gap:
              16px;
            padding:
              18px 16px 24px;
          }

          .cc-followups-modal > main
          .md\\:col-span-2 {
            grid-column:
              auto;
          }

          .cc-followups-modal > footer {
            min-height:
              72px;
            padding:
              0 16px;
          }
        }
      
        /* CALLCENTER_FOLLOWUP_MODAL_POSITION_V1 */
        @media (min-width: 900px) {
          .cc-followups-overlay {
            --cc-sidebar-offset: clamp(220px, 19vw, 270px);
            padding-left: 22px;
            padding-right: calc(22px + var(--cc-sidebar-offset));
          }

          .cc-followups-modal {
            width: min(
              1090px,
              calc(100vw - 44px - var(--cc-sidebar-offset))
            );
            max-width: 100%;
          }
        }

        @media (max-width: 899px) {
          .cc-followups-overlay {
            padding: 12px;
          }

          .cc-followups-modal {
            width: calc(100vw - 24px);
            height: min(610px, calc(100dvh - 24px));
            min-height: min(420px, calc(100dvh - 24px));
          }
        }

        
        /* CALLCENTER_FOLLOWUP_SIZE_STANDARD_V1 */
        @media (min-width: 900px) {
          .cc-followups-overlay {
            --cc-sidebar-offset: clamp(220px, 19vw, 270px);
            padding-left: 8px;
            padding-right: calc(8px + var(--cc-sidebar-offset));
          }

          .cc-followups-modal {
            width: min(
              1100px,
              calc(100vw - 16px - var(--cc-sidebar-offset))
            );
            height: min(600px, calc(100dvh - 24px));
            min-height: min(560px, calc(100dvh - 24px));
            max-height: calc(100dvh - 24px);
          }
        }

        @media (max-width: 899px) {
          .cc-followups-overlay {
            padding: 10px;
          }

          .cc-followups-modal {
            width: calc(100vw - 20px);
            height: min(600px, calc(100dvh - 20px));
            min-height: min(440px, calc(100dvh - 20px));
            max-height: calc(100dvh - 20px);
          }
        }


        /* CALLCENTER_FOLLOWUP_BUTTON_SIZE_V1 */
        .cc-followups-panel > div:first-child > div:last-child button,
        .cc-followups-panel > form button {
          min-height: 44px;
          padding: 10px 18px;
          font-size: 14px;
        }
        

        /* CALLCENTER_FOLLOWUP_BUTTONS_ALIGN_V2 */
        .cc-followups-panel > div:first-child > div:last-child button,
        .cc-followups-panel > form button {
          box-sizing: border-box !important;
          display: inline-flex !important;
          flex-direction: row !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 8px !important;
          height: 46px !important;
          min-height: 46px !important;
          padding: 0 16px !important;
          font-size: 13px !important;
          line-height: 1 !important;
          white-space: nowrap !important;
        }
        \n        `}</style>

      <section className="cc-followups-panel p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-sky-500" />

              <h3 className="text-base font-black">
                {tr(
                  "Follow-ups / Callbacks",
                  "پیگیری‌ها / تماس‌های برگشتی",
                  "تعقیبونه / بېرته اړیکې",
                )}
              </h3>
            </div>

            <p className="mt-1 text-xs opacity-70">
              {tr(
                "Real scheduled customer callbacks and follow-up queue.",
                "صف واقعی پیگیری‌ها و تماس‌های برگشتی مشترکین.",
                "د پېرودونکو د تعقیب او بېرته اړیکو اصلي کتار.",
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">


            <SharedSecondaryButton
              type="button"
              className="cc-primary"
              disabled={
                !session.companyId
              }
              onClick={
                openCreate
              }
            >
              <Plus className="h-4 w-4" />

              {tr(
                "New follow-up",
                "پیگیری جدید",
                "نوی تعقیب",
              )}
            </SharedSecondaryButton>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {cards.map(card => (
          <div
            key={card.key}
            className="cc-followup-kpi"
          >
            <p className="text-[11px] font-bold opacity-65">
              {card.label}
            </p>

            <p className="mt-1 text-2xl font-black">
              {card.value}
            </p>
          </div>
        ))}
      </section>

      <section className="cc-followups-panel p-4">
        <SharedFilterBar as="form"
          className="flex flex-wrap items-end gap-2"
          onSubmit={event => {
            event.preventDefault();
            setPage(1);
            setSearch(
              draftSearch.trim(),
            );
          }}
        >
          <label className="grid min-w-[210px] flex-1 gap-1">
            <span className="text-xs font-bold">
              {tr(
                "Search",
                "جستجو",
                "لټون",
              )}
            </span>

            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />

              <input
                className="w-full ps-9"
                value={
                  draftSearch
                }
                placeholder={tr(
                  "Subject, notes, outcome or ticket",
                  "موضوع، یادداشت، نتیجه یا تیکت",
                  "موضوع، یادښت، پایله یا ټکټ",
                )}
                onChange={event =>
                  setDraftSearch(
                    event.target.value,
                  )
                }
              />
            </div>
          </label>

          <label className="grid gap-1">
            <span className="text-xs font-bold">
              {tr(
                "Status",
                "وضعیت",
                "حالت",
              )}
            </span>

            <SharedSelect
              value={
                statusFilter
              }
              onChange={event => {
                setPage(1);
                setStatusFilter(
                  event.target.value,
                );
              }}
            >
              <option value="">
                {tr(
                  "All statuses",
                  "همه وضعیت‌ها",
                  "ټول حالتونه",
                )}
              </option>

              <option value="pending">
                {tr(
                  "Pending",
                  "در انتظار",
                  "په تمه",
                )}
              </option>

              <option value="completed">
                {tr(
                  "Completed",
                  "تکمیل",
                  "بشپړ",
                )}
              </option>

              <option value="cancelled">
                {tr(
                  "Cancelled",
                  "لغو",
                  "لغوه",
                )}
              </option>
            </SharedSelect>
          </label>

          <label className="grid gap-1">
            <span className="text-xs font-bold">
              {tr(
                "Priority",
                "اولویت",
                "لومړیتوب",
              )}
            </span>

            <SharedSelect
              value={
                priorityFilter
              }
              onChange={event => {
                setPage(1);
                setPriorityFilter(
                  event.target.value,
                );
              }}
            >
              <option value="">
                {tr(
                  "All priorities",
                  "همه اولویت‌ها",
                  "ټول لومړیتوبونه",
                )}
              </option>

              <option value="low">
                {tr(
                  "Low",
                  "پایین",
                  "ټیټ",
                )}
              </option>

              <option value="normal">
                {tr(
                  "Normal",
                  "عادی",
                  "عادي",
                )}
              </option>

              <option value="high">
                {tr(
                  "High",
                  "بالا",
                  "لوړ",
                )}
              </option>

              <option value="urgent">
                {tr(
                  "Urgent",
                  "فوری",
                  "عاجل",
                )}
              </option>
            </SharedSelect>
          </label>

          <SharedSecondaryButton type="submit">
            <Search className="h-4 w-4" />

            {tr(
              "Search",
              "جستجو",
              "لټون",
            )}
          </SharedSecondaryButton>
        </SharedFilterBar>
      </section>

      {notice && (
        <div
          role="status"
          className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-xs font-bold"
        >
          {notice}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-xs text-red-700 dark:text-red-300"
        >
          {error}
        </div>
      )}

      <section className="cc-followups-panel overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-sky-200/40 px-4 py-3 dark:border-white/10">
          <p className="text-xs font-bold">
            {tr(
              "Records",
              "سوابق",
              "ریکارډونه",
            )}:{" "}
            {count}
          </p>

          {busy && (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
        </div>

        {!busy &&
        !error &&
        rows.length === 0 ? (
          <p className="p-6 text-center text-sm opacity-70">
            {tr(
              "No follow-ups found.",
              "هیچ پیگیری یافت نشد.",
              "هیڅ تعقیب ونه موندل شو.",
            )}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <SharedDataTable native className="w-full min-w-[1120px] text-xs">
              <thead>
                <tr>
                  <th className="p-3 text-start">
                    {tr(
                      "Scheduled",
                      "زمان پیگیری",
                      "د تعقیب وخت",
                    )}
                  </th>

                  <th className="p-3 text-start">
                    {tr(
                      "Subject",
                      "موضوع",
                      "موضوع",
                    )}
                  </th>

                  <th className="p-3 text-start">
                    {tr(
                      "Customer",
                      "مشترک",
                      "پېرودونکی",
                    )}
                  </th>

                  <th className="p-3 text-start">
                    {tr(
                      "Ticket",
                      "تیکت",
                      "ټکټ",
                    )}
                  </th>

                  <th className="p-3 text-start">
                    {tr(
                      "Priority",
                      "اولویت",
                      "لومړیتوب",
                    )}
                  </th>

                  <th className="p-3 text-start">
                    {tr(
                      "Status",
                      "وضعیت",
                      "حالت",
                    )}
                  </th>

                  <th className="p-3 text-start">
                    {tr(
                      "Operator",
                      "اپراتور",
                      "اپراتور",
                    )}
                  </th>

                  <th className="p-3 text-start">
                    {tr(
                      "Outcome",
                      "نتیجه",
                      "پایله",
                    )}
                  </th>

                  <th className="p-3 text-start">
                    {tr(
                      "Actions",
                      "عملیات",
                      "عملونه",
                    )}
                  </th>
                </tr>
              </thead>

              <tbody>
                {rows.map(row => {
                  const id =
                    text(row.id);

                  const status =
                    text(
                      row.status,
                    );

                  return (
                    <tr
                      key={id}
                      className="border-t border-sky-100/70 dark:border-white/5"
                    >
                      <td className="p-3 whitespace-nowrap">
                        {displayDate(
                          row.scheduled_at,
                          language,
                        )}
                      </td>

                      <td className="p-3">
                        <div className="max-w-[220px]">
                          <p className="font-bold">
                            {text(
                              row.subject,
                            ) ||
                              "—"}
                          </p>

                          {text(
                            row.notes,
                          ) && (
                            <p className="mt-1 line-clamp-2 opacity-60">
                              {text(
                                row.notes,
                              )}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="p-3">
                        {text(
                          row.customer_label,
                        ) ||
                          text(
                            row.customer,
                          ) ||
                          "—"}
                      </td>

                      <td className="p-3">
                        {text(
                          row.ticket_number,
                        ) ||
                          "—"}
                      </td>

                      <td className="p-3">
                        <span className="cc-followup-status">
                          {priorityLabel(
                            row.priority,
                          )}
                        </span>
                      </td>

                      <td className="p-3">
                        <span className="cc-followup-status">
                          {statusLabel(
                            row.status,
                          )}
                        </span>
                      </td>

                      <td className="p-3">
                        {text(
                          row.assigned_to_name,
                        ) ||
                          "—"}
                      </td>

                      <td className="p-3">
                        <div className="max-w-[180px] break-words">
                          {text(
                            row.outcome,
                          ) ||
                            "—"}
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          <SharedSecondaryButton
                            type="button"
                            title={tr(
                              "Edit",
                              "ویرایش",
                              "سمون",
                            )}
                            onClick={() =>
                              openEdit(
                                row,
                              )
                            }
                          >
                            <Pencil className="h-4 w-4" />
                          </SharedSecondaryButton>

                          {status ===
                            "pending" && (
                            <>
                              <SharedSecondaryButton
                                type="button"
                                title={tr(
                                  "Complete",
                                  "تکمیل",
                                  "بشپړول",
                                )}
                                disabled={
                                  Boolean(
                                    actionBusy,
                                  )
                                }
                                onClick={() =>
                                  void complete(
                                    row,
                                  )
                                }
                              >
                                {actionBusy ===
                                `complete:${id}` ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                )}
                              </SharedSecondaryButton>

                              <SharedSecondaryButton
                                type="button"
                                title={tr(
                                  "Cancel",
                                  "لغو",
                                  "لغوه",
                                )}
                                disabled={
                                  Boolean(
                                    actionBusy,
                                  )
                                }
                                onClick={() =>
                                  void cancel(
                                    row,
                                  )
                                }
                              >
                                {actionBusy ===
                                `cancel:${id}` ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-500" />
                                )}
                              </SharedSecondaryButton>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </SharedDataTable>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-sky-200/40 px-4 py-3 text-xs dark:border-white/10">
          <SharedSecondaryButton
            type="button"
            disabled={
              busy ||
              page <= 1
            }
            onClick={() =>
              setPage(
                value =>
                  value - 1,
              )
            }
          >
            ‹{" "}
            {tr(
              "Previous",
              "قبلی",
              "مخکینی",
            )}
          </SharedSecondaryButton>

          <span>
            {tr(
              "Page",
              "صفحه",
              "پاڼه",
            )}{" "}
            {page}
          </span>

          <SharedSecondaryButton
            type="button"
            disabled={
              busy ||
              !next
            }
            onClick={() =>
              setPage(
                value =>
                  value + 1,
              )
            }
          >
            {tr(
              "Next",
              "بعدی",
              "بل",
            )}{" "}
            ›
          </SharedSecondaryButton>
        </div>
      </section>

      {modal && createPortal(
        <div className="cc-followups-overlay">
          <form
            className="cc-followups-modal"
            onSubmit={save}
          >
            <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-sky-200/50 bg-inherit px-5 py-4 dark:border-white/10">
              <div>
                <h3 className="font-black">
                  {selected
                    ? tr(
                        "Edit follow-up",
                        "ویرایش پیگیری",
                        "د تعقیب سمون",
                      )
                    : tr(
                        "New follow-up",
                        "پیگیری جدید",
                        "نوی تعقیب",
                      )}
                </h3>

                <p className="mt-1 text-xs opacity-65">
                  {tr(
                    "Schedule and manage a real customer callback.",
                    "زمان‌بندی و مدیریت تماس برگشتی واقعی مشترک.",
                    "د پېرودونکي اصلي بېرته اړیکه مهالویش او اداره کړئ.",
                  )}
                </p>
              </div>

              <SharedSecondaryButton
                type="button"
                disabled={saving}
                onClick={() =>
                  setModal(false)
                }
              >
                <X className="h-4 w-4" />
              </SharedSecondaryButton>
            </header>

            <main className="cc-followup-form-grid">
              <label className="grid gap-2">
                <span className="text-xs font-black">
                  {tr(
                    "Customer",
                    "مشترک",
                    "پېرودونکی",
                  )} *
                </span>

                <FollowUpLookup
                  session={session}
                  language={language}
                  kind="customer"
                  value={
                    form.customer
                  }
                  selectedLabel={
                    customerLabel
                  }
                  disabled={saving}
                  onSelect={row => {
                    const newCustomer =
                      row
                        ? text(
                            row.id,
                          )
                        : "";

                    setForm(
                      current => ({
                        ...current,
                        customer:
                          newCustomer,
                        ticket: "",
                      }),
                    );

                    setCustomerLabel(
                      row
                        ? lookupLabel(
                            row,
                            "customer",
                          )
                        : "",
                    );

                    setTicketLabel("");
                  }}
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-black">
                  {tr(
                    "Ticket",
                    "تیکت",
                    "ټکټ",
                  )}
                </span>

                <FollowUpLookup
                  session={session}
                  language={language}
                  kind="ticket"
                  customer={
                    form.customer
                  }
                  value={
                    form.ticket
                  }
                  selectedLabel={
                    ticketLabel
                  }
                  disabled={
                    saving ||
                    !form.customer
                  }
                  onSelect={row => {
                    setForm(
                      current => ({
                        ...current,
                        ticket: row
                          ? text(
                              row.id,
                            )
                          : "",
                      }),
                    );

                    setTicketLabel(
                      row
                        ? lookupLabel(
                            row,
                            "ticket",
                          )
                        : "",
                    );
                  }}
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-black">
                  {tr(
                    "Scheduled date & time",
                    "تاریخ و ساعت پیگیری",
                    "د تعقیب نېټه او وخت",
                  )} *
                </span>

                <input
                  type="datetime-local"
                  value={
                    form.scheduled_at
                  }
                  disabled={saving}
                  onChange={event =>
                    setForm(
                      current => ({
                        ...current,
                        scheduled_at:
                          event.target
                            .value,
                      }),
                    )
                  }
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-black">
                  {tr(
                    "Priority",
                    "اولویت",
                    "لومړیتوب",
                  )}
                </span>

                <SharedSelect
                  value={
                    form.priority
                  }
                  disabled={saving}
                  onChange={event =>
                    setForm(
                      current => ({
                        ...current,
                        priority:
                          event.target
                            .value,
                      }),
                    )
                  }
                >
                  <option value="low">
                    {tr(
                      "Low",
                      "پایین",
                      "ټیټ",
                    )}
                  </option>

                  <option value="normal">
                    {tr(
                      "Normal",
                      "عادی",
                      "عادي",
                    )}
                  </option>

                  <option value="high">
                    {tr(
                      "High",
                      "بالا",
                      "لوړ",
                    )}
                  </option>

                  <option value="urgent">
                    {tr(
                      "Urgent",
                      "فوری",
                      "عاجل",
                    )}
                  </option>
                </SharedSelect>
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-black">
                  {tr(
                    "Subject",
                    "موضوع",
                    "موضوع",
                  )} *
                </span>

                <input
                  value={
                    form.subject
                  }
                  disabled={saving}
                  maxLength={240}
                  onChange={event =>
                    setForm(
                      current => ({
                        ...current,
                        subject:
                          event.target
                            .value,
                      }),
                    )
                  }
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-black">
                  {tr(
                    "Notes",
                    "یادداشت",
                    "یادښت",
                  )}
                </span>

                <textarea
                  rows={5}
                  value={
                    form.notes
                  }
                  disabled={saving}
                  onChange={event =>
                    setForm(
                      current => ({
                        ...current,
                        notes:
                          event.target
                            .value,
                      }),
                    )
                  }
                />
              </label>

              {saveError && (
                <p
                  role="alert"
                  className="cc-followup-form-error rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-700 dark:text-red-300"
                >
                  {saveError}
                </p>
              )}
            </main>

            <footer className="sticky bottom-0 flex justify-end gap-2 border-t border-sky-200/50 bg-inherit px-5 py-4 dark:border-white/10">
              <SharedSecondaryButton
                type="button"
                disabled={saving}
                onClick={() =>
                  setModal(false)
                }
              >
                {tr(
                  "Close",
                  "بستن",
                  "تړل",
                )}
              </SharedSecondaryButton>

              <SharedSecondaryButton
                type="submit"
                className="cc-primary"
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}

                {selected
                  ? tr(
                      "Save changes",
                      "ذخیره تغییرات",
                      "بدلونونه خوندي کړئ",
                    )
                  : tr(
                      "Create follow-up",
                      "ایجاد پیگیری",
                      "تعقیب جوړ کړئ",
                    )}
              </SharedSecondaryButton>
            </footer>
          </form>
        </div>,
        document.body,
      )}
    </div>
  );
}
