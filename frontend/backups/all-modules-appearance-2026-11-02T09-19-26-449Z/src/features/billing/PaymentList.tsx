import { PageHeader as SharedPageHeader } from "../../components/PageHeader";
import { PrimaryButton as SharedPrimaryButton, SecondaryButton as SharedSecondaryButton, FilterBar as SharedFilterBar, Select as SharedSelect, DatePicker as SharedDatePicker, FormField as Field, DetailField as Detail } from "../../components/Interface";
import { DataTable as SharedDataTable } from "../../components/DataTable";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  Loader2,
  Pencil,
  Plus,
  Send,
  Trash2,
  Wallet,
  X,
} from "lucide-react";

import {
  DataTable,
  StatusBadge,
  type Column,
} from "../../components/DataTable";

import {
  fetchers,
  paymentAllocationApi,
  paymentApi,
  type PaymentAllocationPayload,
  type PaymentPayload,
  type Session,
} from "../../lib/api";

import { useTranslation } from "../../lib/i18n";

type Props = {
  session: Session;
};

type PaymentStatus =
  | "draft"
  | "posted"
  | "void";

type PaymentMethod =
  | "cash"
  | "bank"
  | "electronic"
  | "other";

type Payment = {
  id: string;
  company: string;
  branch: string | null;
  agency: string | null;
  customer: string;
  customer_name: string;
  payment_number: string;
  status: PaymentStatus;
  payment_date: string;
  amount: string;
  currency: string;
  method: PaymentMethod;
  reference: string;
  treasury_status:
    | "pending_treasury"
    | "reconciled"
    | "legacy_incomplete";
  posted_at: string | null;
  created_at: string;
  updated_at: string;
};

type Allocation = {
  id: string;
  payment: string;
  receivable: string;
  invoice_number: string;
  amount: string;
  created_at: string;
};

type Receipt = {
  id: string;
  payment: string;
  payment_number: string;
  receipt_number: string;
  status: string;
  amount: string;
  currency: string;
  issued_at: string;
};

type Receivable = {
  id: string;
  invoice: string;
  invoice_number: string;
  customer: string;
  customer_name: string;
  original_amount: string;
  allocated_amount: string;
  outstanding_amount: string;
  currency: string;
  status: string;
};

type CustomerOption = {
  id: string;
  company: string;
  branch: string | null;
  agency: string | null;
  code: string;
  display_name: string;
  status?: string;
};

type BranchOption = {
  id: string;
  company: string;
  code: string;
  name: string;
  status?: string;
};

type AgencyOption = {
  id: string;
  company: string;
  branch: string | null;
  code: string;
  name: string;
  status?: string;
};

type ModalMode =
  | "create"
  | "view"
  | "edit";

type AllocationMode =
  | "list"
  | "create"
  | "edit";

type Notice = {
  type: "success" | "error";
  message: string;
};

type PaymentForm = {
  branch: string;
  agency: string;
  customer: string;
  payment_date: string;
  amount: string;
  currency: string;
  method: PaymentMethod;
  reference: string;
};

type AllocationForm = {
  receivable: string;
  amount: string;
};

function todayLocal() {
  const d = new Date();

  const pad = (v: number) =>
    String(v).padStart(2, "0");

  return [
    d.getFullYear(),
    "-",
    pad(d.getMonth() + 1),
    "-",
    pad(d.getDate()),
  ].join("");
}

const EMPTY_PAYMENT: PaymentForm = {
  branch: "",
  agency: "",
  customer: "",
  payment_date: todayLocal(),
  amount: "",
  currency: "AFN",
  method: "cash",
  reference: "",
};

const EMPTY_ALLOCATION: AllocationForm = {
  receivable: "",
  amount: "",
};

export function PaymentList({
  session,
}: Props) {
  const { t } = useTranslation();

  const [data, setData] =
    useState<Payment[]>([]);

  const [customers, setCustomers] =
    useState<CustomerOption[]>([]);

  const [branches, setBranches] =
    useState<BranchOption[]>([]);

  const [agencies, setAgencies] =
    useState<AgencyOption[]>([]);

  const [receivables, setReceivables] =
    useState<Receivable[]>([]);

  const [allocations, setAllocations] =
    useState<Allocation[]>([]);

  const [receipt, setReceipt] =
    useState<Receipt | null>(null);

  const [selected, setSelected] =
    useState<Payment | null>(null);

  const [
    selectedAllocation,
    setSelectedAllocation,
  ] = useState<Allocation | null>(
    null,
  );

  const [modalMode, setModalMode] =
    useState<ModalMode | null>(null);

  const [
    allocationMode,
    setAllocationMode,
  ] = useState<AllocationMode | null>(
    null,
  );

  const [form, setForm] =
    useState<PaymentForm>({
      ...EMPTY_PAYMENT,
    });

  const [
    allocationForm,
    setAllocationForm,
  ] = useState<AllocationForm>({
    ...EMPTY_ALLOCATION,
  });

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [totalCount, setTotalCount] =
    useState(0);

  const [page, setPage] =
    useState(1);

  const [pageSize, setPageSize] =
    useState(10);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [sort, setSort] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);

  const [error, setError] =
    useState("");

  const [notice, setNotice] =
    useState<Notice | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      let params =
        `?page=${page}&page_size=${pageSize}`;

      if (searchTerm) {
        params +=
          `&search=${encodeURIComponent(
            searchTerm,
          )}`;
      }

      if (sort) {
        params +=
          `&ordering=${
            sort.direction === "desc"
              ? "-"
              : ""
          }${sort.key}`;
      }

      const [
        paymentRes,
        customerRes,
        branchRes,
        agencyRes,
        receivableRes,
      ] = await Promise.all([
        fetchers.payments(
          session,
          params,
        ),

        fetchers.customers(
          session,
          "?page_size=100&ordering=display_name",
        ),

        fetchers.branches(
          session,
          "?page_size=100&ordering=name",
        ),

        fetchers.agencies(
          session,
          "?page_size=100&ordering=name",
        ),

        fetchers.receivables(
          session,
          "?page_size=100",
        ),
      ]);

      setData(paymentRes.results);
      setTotalCount(
        paymentRes.count,
      );

      setCustomers(
        customerRes.results,
      );

      setBranches(
        branchRes.results,
      );

      setAgencies(
        agencyRes.results,
      );

      setReceivables(
        receivableRes.results,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t.common.noRecords,
      );
    } finally {
      setLoading(false);
    }
  }, [
    session,
    page,
    pageSize,
    searchTerm,
    sort,
    t,
  ]);

  useEffect(() => {
    load();
  }, [load]);

  const companyBranches =
    useMemo(
      () =>
        branches.filter(
          (branch) =>
            (!session.companyId ||
              branch.company ===
                session.companyId) &&
            branch.status !==
              "inactive",
        ),
      [
        branches,
        session.companyId,
      ],
    );

  const availableAgencies =
    useMemo(
      () =>
        agencies.filter(
          (agency) => {
            if (
              session.companyId &&
              agency.company !==
                session.companyId
            ) {
              return false;
            }

            if (
              agency.status ===
                "inactive" ||
              agency.status ===
                "suspended"
            ) {
              return false;
            }

            if (
              form.branch &&
              agency.branch &&
              agency.branch !==
                form.branch
            ) {
              return false;
            }

            return true;
          },
        ),
      [
        agencies,
        form.branch,
        session.companyId,
      ],
    );

  const availableReceivables =
    useMemo(
      () =>
        receivables.filter(
          (row) =>
            row.customer ===
              selected?.customer &&
            row.currency ===
              selected?.currency &&
            (
              Number(
                row.outstanding_amount,
              ) > 0 ||
              allocations.some(
                (allocation) =>
                  allocation.receivable ===
                  row.id,
              )
            ),
        ),
      [
        receivables,
        selected,
        allocations,
      ],
    );

  const allocatedTotal =
    allocations.reduce(
      (total, allocation) =>
        total +
        Number(
          allocation.amount ||
            0,
        ),
      0,
    );

  const remainingAmount =
    selected
      ? Number(selected.amount) -
        allocatedTotal
      : 0;

  const updateField = <
    K extends keyof PaymentForm
  >(
    key: K,
    value: PaymentForm[K],
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const changeCustomer = (
    customerId: string,
  ) => {
    const customer =
      customers.find(
        (row) =>
          row.id === customerId,
      );

    setForm((current) => ({
      ...current,
      customer: customerId,
      branch:
        customer?.branch ||
        current.branch,
      agency:
        customer?.agency ||
        current.agency,
    }));
  };

  const changeBranch = (
    branchId: string,
  ) => {
    setForm((current) => {
      const agency =
        agencies.find(
          (row) =>
            row.id ===
            current.agency,
        );

      const valid =
        !agency ||
        !branchId ||
        !agency.branch ||
        agency.branch === branchId;

      return {
        ...current,
        branch: branchId,
        agency: valid
          ? current.agency
          : "",
      };
    });
  };

  const loadPaymentDetails =
    async (
      payment: Payment,
    ) => {
      const [
        allocationRes,
        receiptRes,
      ] = await Promise.all([
        fetchers.paymentAllocations(
          session,
          "?page_size=100",
        ),

        fetchers.receipts(
          session,
          "?page_size=100",
        ),
      ]);

      setAllocations(
        allocationRes.results.filter(
          (row: Allocation) =>
            row.payment ===
            payment.id,
        ),
      );

      const foundReceipt =
        receiptRes.results.find(
          (row: Receipt) =>
            row.payment ===
            payment.id,
        ) || null;

      setReceipt(foundReceipt);
    };

  const openCreate = () => {
    setSelected(null);
    setAllocations([]);
    setReceipt(null);
    setNotice(null);

    setForm({
      ...EMPTY_PAYMENT,
      payment_date:
        todayLocal(),
    });

    setModalMode("create");
  };

  const openView =
    async (
      row: Payment,
    ) => {
      try {
        setSaving(true);
        setNotice(null);

        const fresh:
          Payment =
          await paymentApi.retrieve(
            session,
            row.id,
          );

        setSelected(fresh);

        await loadPaymentDetails(
          fresh,
        );

        setModalMode("view");
      } catch (err) {
        setNotice({
          type: "error",
          message:
            err instanceof Error
              ? err.message
              : "Unable to load payment.",
        });
      } finally {
        setSaving(false);
      }
    };

  const openEdit = (
    row: Payment,
  ) => {
    if (
      row.status === "posted"
    ) {
      setNotice({
        type: "error",
        message:
          "Posted payments are immutable.",
      });
      return;
    }

    setSelected(row);
    setNotice(null);

    setForm({
      branch:
        row.branch || "",
      agency:
        row.agency || "",
      customer:
        row.customer,
      payment_date:
        row.payment_date,
      amount:
        row.amount,
      currency:
        row.currency,
      method:
        row.method,
      reference:
        row.reference || "",
    });

    setModalMode("edit");
  };

  const closeModal = () => {
    if (saving) return;

    setModalMode(null);
    setSelected(null);
    setAllocations([]);
    setReceipt(null);
  };

  const submitPayment = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!session.companyId) {
      setNotice({
        type: "error",
        message:
          "Select an active company first.",
      });
      return;
    }

    if (!form.customer) {
      setNotice({
        type: "error",
        message:
          "Customer is required.",
      });
      return;
    }

    const amount =
      Number(form.amount);

    if (
      Number.isNaN(amount) ||
      amount <= 0
    ) {
      setNotice({
        type: "error",
        message:
          "Payment amount must be greater than zero.",
      });
      return;
    }

    const payload:
      PaymentPayload = {
      company:
        session.companyId,

      branch:
        form.branch || null,

      agency:
        form.agency || null,

      customer:
        form.customer,

      payment_date:
        form.payment_date,

      amount:
        form.amount,

      currency:
        form.currency.trim() ||
        "AFN",

      method:
        form.method,

      reference:
        form.reference.trim(),
    };

    try {
      setSaving(true);
      setNotice(null);

      let result:
        Payment;

      if (
        modalMode === "create"
      ) {
        result =
          await paymentApi.create(
            session,
            payload,
          );
      } else if (
        modalMode === "edit" &&
        selected
      ) {
        result =
          await paymentApi.update(
            session,
            selected.id,
            payload,
          );
      } else {
        return;
      }

      await load();

      setSelected(result);
      setAllocations([]);
      setReceipt(null);
      setModalMode("view");

      setNotice({
        type: "success",
        message:
          modalMode === "create"
            ? "Draft payment created successfully."
            : "Payment updated successfully.",
      });
    } catch (err) {
      setNotice({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Payment operation failed.",
      });
    } finally {
      setSaving(false);
    }
  };

  const openAllocations =
    async (
      payment: Payment,
    ) => {
      try {
        setSaving(true);
        setNotice(null);

        const fresh:
          Payment =
          await paymentApi.retrieve(
            session,
            payment.id,
          );

        setSelected(fresh);

        await loadPaymentDetails(
          fresh,
        );

        setAllocationMode(
          "list",
        );

        setModalMode(null);
      } catch (err) {
        setNotice({
          type: "error",
          message:
            err instanceof Error
              ? err.message
              : "Unable to load allocations.",
        });
      } finally {
        setSaving(false);
      }
    };

  const openCreateAllocation =
    () => {
      if (
        !selected ||
        selected.status !==
          "draft"
      ) {
        return;
      }

      setSelectedAllocation(null);

      setAllocationForm({
        receivable: "",
        amount:
          remainingAmount > 0
            ? remainingAmount.toFixed(
                2,
              )
            : "",
      });

      setAllocationMode(
        "create",
      );
    };

  const openEditAllocation = (
    allocation: Allocation,
  ) => {
    if (
      !selected ||
      selected.status !==
        "draft"
    ) {
      return;
    }

    setSelectedAllocation(
      allocation,
    );

    setAllocationForm({
      receivable:
        allocation.receivable,
      amount:
        allocation.amount,
    });

    setAllocationMode(
      "edit",
    );
  };

  const refreshAllocationData =
    async () => {
      if (!selected) {
        return;
      }

      await loadPaymentDetails(
        selected,
      );

      const freshReceivables =
        await fetchers.receivables(
          session,
          "?page_size=100",
        );

      setReceivables(
        freshReceivables.results,
      );
    };

  const submitAllocation =
    async (
      event: FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault();

      if (!selected) {
        return;
      }

      const amount =
        Number(
          allocationForm.amount,
        );

      if (
        !allocationForm.receivable
      ) {
        setNotice({
          type: "error",
          message:
            "Receivable is required.",
        });
        return;
      }

      if (
        Number.isNaN(amount) ||
        amount <= 0
      ) {
        setNotice({
          type: "error",
          message:
            "Allocation amount must be greater than zero.",
        });
        return;
      }

      const payload:
        PaymentAllocationPayload = {
        payment:
          selected.id,

        receivable:
          allocationForm.receivable,

        amount:
          allocationForm.amount,
      };

      try {
        setSaving(true);
        setNotice(null);

        if (
          allocationMode ===
          "create"
        ) {
          await paymentAllocationApi.create(
            session,
            payload,
          );
        } else if (
          allocationMode ===
            "edit" &&
          selectedAllocation
        ) {
          await paymentAllocationApi.update(
            session,
            selectedAllocation.id,
            payload,
          );
        }

        await refreshAllocationData();

        setAllocationMode(
          "list",
        );

        setSelectedAllocation(
          null,
        );

        setNotice({
          type: "success",
          message:
            "Payment allocation saved.",
        });
      } catch (err) {
        setNotice({
          type: "error",
          message:
            err instanceof Error
              ? err.message
              : "Allocation operation failed.",
        });
      } finally {
        setSaving(false);
      }
    };

  const removeAllocation =
    async (
      allocation: Allocation,
    ) => {
      if (
        !selected ||
        selected.status !==
          "draft"
      ) {
        return;
      }

      if (
        !window.confirm(
          `Remove allocation for ${allocation.invoice_number}?`,
        )
      ) {
        return;
      }

      try {
        setSaving(true);
        setNotice(null);

        await paymentAllocationApi.remove(
          session,
          allocation.id,
        );

        await refreshAllocationData();

        setNotice({
          type: "success",
          message:
            "Allocation removed.",
        });
      } catch (err) {
        setNotice({
          type: "error",
          message:
            err instanceof Error
              ? err.message
              : "Unable to remove allocation.",
        });
      } finally {
        setSaving(false);
      }
    };

  const postPayment =
    async (
      payment: Payment,
    ) => {
      try {
        setSaving(true);
        setNotice(null);

        await loadPaymentDetails(
          payment,
        );

        const allocationRes =
          await fetchers.paymentAllocations(
            session,
            "?page_size=100",
          );

        const rows =
          allocationRes.results.filter(
            (row: Allocation) =>
              row.payment ===
              payment.id,
          );

        const total =
          rows.reduce(
            (
              sum: number,
              row: Allocation,
            ) =>
              sum +
              Number(row.amount),
            0,
          );

        if (
          rows.length === 0
        ) {
          setNotice({
            type: "error",
            message:
              "Payment must have at least one allocation before posting.",
          });

          return;
        }

        if (
          Math.abs(
            total -
              Number(
                payment.amount,
              ),
          ) > 0.005
        ) {
          setNotice({
            type: "error",
            message:
              `Allocated total ${total.toFixed(2)} must equal payment amount ${Number(payment.amount).toFixed(2)}.`,
          });

          return;
        }

        if (
          !window.confirm(
            `Post payment ${payment.payment_number}? Posted payments become immutable.`,
          )
        ) {
          return;
        }

        const posted:
          Payment =
          await paymentApi.post(
            session,
            payment.id,
          );

        setSelected(posted);

        await load();
        await loadPaymentDetails(
          posted,
        );

        setAllocationMode(null);
        setModalMode("view");

        setNotice({
          type: "success",
          message:
            `Payment ${posted.payment_number} posted successfully.`,
        });
      } catch (err) {
        setNotice({
          type: "error",
          message:
            err instanceof Error
              ? err.message
              : "Payment posting failed.",
        });
      } finally {
        setSaving(false);
      }
    };

  const columns:
    Column<Payment>[] = [
    {
      header:
        t.finance.paymentNum,
      accessor:
        "payment_number",
      className:
        "font-bold text-white",
      sortable: true,
    },

    {
      header:
        t.finance.date,
      accessor:
        "payment_date",
      sortable: true,
    },

    {
      header:
        t.finance.customer,
      accessor:
        "customer_name",
      sortable: true,
      sortKey:
        "customer__display_name",
    },

    {
      header:
        t.finance.amount,
      accessor: (row) =>
        `${row.amount} ${row.currency}`,
      className:
        "font-mono text-end text-cyan-400",
      sortable: true,
    },

    {
      header: "Method",
      accessor:
        "method",
    },

    {
      header: "Reference",
      accessor: (row) =>
        row.reference || "—",
      className:
        "font-mono text-xs",
    },

    {
      header: "Treasury",
      accessor:
        "treasury_status",
    },

    {
      header:
        t.finance.status,
      accessor: (row) => (
        <StatusBadge
          status={row.status}
          type={
            row.status ===
              "posted"
              ? "success"
              : row.status ===
                  "void"
                ? "danger"
                : "default"
          }
        />
      ),
      sortable: true,
    },
  ];

  return (
    <>
      <div className="space-y-6">

        {notice && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              notice.type ===
              "success"
                ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                : "border-rose-400/20 bg-rose-400/10 text-rose-300"
            }`}
          >
            {notice.message}
          </div>
        )}

        <SharedPageHeader native as="div" className="flex flex-wrap items-center justify-between gap-4">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
              <Wallet className="h-5 w-5 text-cyan-300" />
            </div>

            <div>
              <h2 className="text-xl font-black text-white">
                Payments
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Draft → Allocate → Post → Receipt
              </p>
            </div>
          </div>

          <SharedPrimaryButton
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950"
          >
            <Plus className="h-4 w-4" />
            New Payment
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
          onPageSizeChange={
            setPageSize
          }
          onSearch={setSearchTerm}
          onSort={(
            key,
            direction,
          ) =>
            setSort({
              key,
              direction,
            })
          }
          error={error}
          actions={(row) => (
            <div className="flex gap-2">

              <SharedSecondaryButton
                type="button"
                onClick={() =>
                  openView(row)
                }
                className="rounded-lg border border-white/5 bg-white/5 p-2 text-slate-400"
              >
                <Eye className="h-4 w-4" />
              </SharedSecondaryButton>

              {row.status ===
                "draft" && (
                <>
                  <SharedSecondaryButton
                    type="button"
                    onClick={() =>
                      openEdit(row)
                    }
                    className="rounded-lg border border-cyan-400/10 bg-cyan-400/5 p-2 text-cyan-400"
                  >
                    <Pencil className="h-4 w-4" />
                  </SharedSecondaryButton>

                  <SharedSecondaryButton
                    type="button"
                    onClick={() =>
                      openAllocations(
                        row,
                      )
                    }
                    className="rounded-lg border border-violet-400/10 bg-violet-400/5 p-2 text-violet-300"
                    title="Allocations"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </SharedSecondaryButton>

                  <SharedSecondaryButton
                    type="button"
                    onClick={() =>
                      postPayment(
                        row,
                      )
                    }
                    className="rounded-lg border border-emerald-400/10 bg-emerald-400/5 p-2 text-emerald-300"
                    title="Post Payment"
                  >
                    <Send className="h-4 w-4" />
                  </SharedSecondaryButton>
                </>
              )}
            </div>
          )}
        />
      </div>

      {modalMode && (
        <SharedFilterBar as="div" className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">

          <div className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-[28px] border border-white/10 bg-slate-950 p-6">

            <div className="mb-6 flex items-center justify-between">

              <h3 className="text-lg font-black text-white">
                {modalMode === "create"
                  ? "New Payment"
                  : modalMode === "edit"
                    ? "Edit Payment"
                    : "Payment Details"}
              </h3>

              <SharedSecondaryButton
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-xl border border-white/10 p-2 text-slate-400"
              >
                <X className="h-5 w-5" />
              </SharedSecondaryButton>
            </div>

            {modalMode ===
              "view" &&
            selected ? (
              <div className="space-y-5">

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

                  <Detail
                    label="Payment Number"
                    value={
                      selected.payment_number
                    }
                  />

                  <Detail
                    label="Customer"
                    value={
                      selected.customer_name
                    }
                  />

                  <Detail
                    label="Amount"
                    value={`${selected.amount} ${selected.currency}`}
                  />

                  <Detail
                    label="Status"
                    value={
                      selected.status
                    }
                  />

                  <Detail
                    label="Method"
                    value={
                      selected.method
                    }
                  />

                  <Detail
                    label="Reference"
                    value={
                      selected.reference ||
                      "—"
                    }
                  />

                  <Detail
                    label="Treasury Status"
                    value={
                      selected.treasury_status
                    }
                  />

                  <Detail
                    label="Posted At"
                    value={
                      selected.posted_at ||
                      "—"
                    }
                  />
                </div>

                {receipt && (
                  <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4">

                    <p className="text-xs font-black uppercase text-emerald-300">
                      Receipt
                    </p>

                    <p className="mt-2 font-mono font-bold text-white">
                      {receipt.receipt_number}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {receipt.amount} {receipt.currency}
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap justify-end gap-3 border-t border-white/10 pt-5">

                  <SharedSecondaryButton
                    type="button"
                    onClick={() =>
                      openAllocations(
                        selected,
                      )
                    }
                    className="rounded-xl border border-violet-400/20 bg-violet-400/10 px-4 py-2 text-sm font-bold text-violet-300"
                  >
                    View Allocations
                  </SharedSecondaryButton>

                  {selected.status ===
                    "draft" && (
                    <>
                      <SharedSecondaryButton
                        type="button"
                        onClick={() =>
                          openEdit(
                            selected,
                          )
                        }
                        className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-300"
                      >
                        Edit Payment
                      </SharedSecondaryButton>

                      <SharedSecondaryButton
                        type="button"
                        onClick={() =>
                          postPayment(
                            selected,
                          )
                        }
                        className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-black text-slate-950"
                      >
                        <Send className="h-4 w-4" />
                        Post Payment
                      </SharedSecondaryButton>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <form
                onSubmit={
                  submitPayment
                }
                className="space-y-5"
              >

                <div className="grid gap-4 md:grid-cols-2">

                  <Field
                    label="Customer"
                    required
                  >
                    <SharedSelect
                      value={
                        form.customer
                      }
                      onChange={(
                        e,
                      ) =>
                        changeCustomer(
                          e.target.value,
                        )
                      }
                      className="billing-input"
                    >
                      <option value="">
                        Select Customer
                      </option>

                      {customers.map(
                        (customer) => (
                          <option
                            key={
                              customer.id
                            }
                            value={
                              customer.id
                            }
                          >
                            {
                              customer.code
                            }{" "}
                            —{" "}
                            {
                              customer.display_name
                            }
                          </option>
                        ),
                      )}
                    </SharedSelect>
                  </Field>

                  <Field label="Branch">
                    <SharedSelect
                      value={
                        form.branch
                      }
                      onChange={(
                        e,
                      ) =>
                        changeBranch(
                          e.target.value,
                        )
                      }
                      className="billing-input"
                    >
                      <option value="">
                        No Branch
                      </option>

                      {companyBranches.map(
                        (branch) => (
                          <option
                            key={
                              branch.id
                            }
                            value={
                              branch.id
                            }
                          >
                            {branch.code} — {branch.name}
                          </option>
                        ),
                      )}
                    </SharedSelect>
                  </Field>

                  <Field label="Agency">
                    <SharedSelect
                      value={
                        form.agency
                      }
                      onChange={(
                        e,
                      ) =>
                        updateField(
                          "agency",
                          e.target.value,
                        )
                      }
                      className="billing-input"
                    >
                      <option value="">
                        No Agency
                      </option>

                      {availableAgencies.map(
                        (agency) => (
                          <option
                            key={
                              agency.id
                            }
                            value={
                              agency.id
                            }
                          >
                            {agency.code} — {agency.name}
                          </option>
                        ),
                      )}
                    </SharedSelect>
                  </Field>

                  <Field
                    label="Payment Date"
                    required
                  >
                    <SharedDatePicker
                      type="date"
                      value={
                        form.payment_date
                      }
                      onChange={(
                        e,
                      ) =>
                        updateField(
                          "payment_date",
                          e.target.value,
                        )
                      }
                      className="billing-input"
                    />
                  </Field>

                  <Field
                    label="Amount"
                    required
                  >
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={
                        form.amount
                      }
                      onChange={(
                        e,
                      ) =>
                        updateField(
                          "amount",
                          e.target.value,
                        )
                      }
                      className="billing-input"
                    />
                  </Field>

                  <Field
                    label="Currency"
                    required
                  >
                    <input
                      maxLength={8}
                      value={
                        form.currency
                      }
                      onChange={(
                        e,
                      ) =>
                        updateField(
                          "currency",
                          e.target.value.toUpperCase(),
                        )
                      }
                      className="billing-input"
                    />
                  </Field>

                  <Field
                    label="Method"
                    required
                  >
                    <SharedSelect
                      value={
                        form.method
                      }
                      onChange={(
                        e,
                      ) =>
                        updateField(
                          "method",
                          e.target.value as PaymentMethod,
                        )
                      }
                      className="billing-input"
                    >
                      <option value="cash">Cash</option>
                      <option value="bank">Bank</option>
                      <option value="electronic">Electronic</option>
                      <option value="other">Other</option>
                    </SharedSelect>
                  </Field>

                  <Field label="Reference">
                    <input
                      maxLength={160}
                      value={
                        form.reference
                      }
                      onChange={(
                        e,
                      ) =>
                        updateField(
                          "reference",
                          e.target.value,
                        )
                      }
                      className="billing-input"
                    />
                  </Field>
                </div>

                {notice?.type ===
                  "error" && (
                  <ErrorBox>
                    {notice.message}
                  </ErrorBox>
                )}

                <div className="flex justify-end gap-3 border-t border-white/10 pt-5">

                  <SharedSecondaryButton
                    type="button"
                    onClick={closeModal}
                    disabled={saving}
                    className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300"
                  >
                    Cancel
                  </SharedSecondaryButton>

                  <SharedPrimaryButton
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2 text-sm font-black text-slate-950 disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        {modalMode ===
                        "create"
                          ? "Create Draft Payment"
                          : "Save Changes"}
                      </>
                    )}
                  </SharedPrimaryButton>
                </div>
              </form>
            )}

            <style>{`
              .billing-input {
                width: 100%;
                border-radius: .9rem;
                border: 1px solid rgba(255,255,255,.10);
                background: rgba(255,255,255,.045);
                padding: .72rem .85rem;
                color: rgb(241 245 249);
                outline: none;
              }

              .billing-input:focus {
                border-color: rgba(34,211,238,.45);
                box-shadow: 0 0 0 3px rgba(34,211,238,.07);
              }

              .billing-input option {
                background: rgb(15 23 42);
                color: white;
              }
            `}</style>
          </div>
        </SharedFilterBar>
      )}

      {allocationMode &&
      selected && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md">

          <div className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-[28px] border border-white/10 bg-slate-950 p-6">

            <div className="mb-6 flex items-center justify-between">

              <div>
                <h3 className="text-lg font-black text-white">
                  Payment Allocations
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  {selected.payment_number}
                </p>
              </div>

              <SharedSecondaryButton
                type="button"
                onClick={() =>
                  setAllocationMode(
                    null,
                  )
                }
                disabled={saving}
                className="rounded-xl border border-white/10 p-2 text-slate-400"
              >
                <X className="h-5 w-5" />
              </SharedSecondaryButton>
            </div>

            {allocationMode ===
            "list" ? (
              <div className="space-y-5">

                <div className="grid gap-3 md:grid-cols-3">

                  <Summary
                    label="Payment"
                    value={`${selected.amount} ${selected.currency}`}
                  />

                  <Summary
                    label="Allocated"
                    value={`${allocatedTotal.toFixed(2)} ${selected.currency}`}
                  />

                  <Summary
                    label="Remaining"
                    value={`${remainingAmount.toFixed(2)} ${selected.currency}`}
                  />
                </div>

                {selected.status ===
                  "draft" && (
                  <div className="flex justify-end">

                    <SharedPrimaryButton
                      type="button"
                      onClick={
                        openCreateAllocation
                      }
                      className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950"
                    >
                      <Plus className="h-4 w-4" />
                      Add Allocation
                    </SharedPrimaryButton>
                  </div>
                )}

                <div className="overflow-x-auto rounded-2xl border border-white/10">

                  <SharedDataTable native className="w-full text-sm">

                    <thead className="bg-white/[0.04] text-slate-400">
                      <tr>
                        <th className="p-3 text-start">
                          Invoice
                        </th>
                        <th className="p-3 text-end">
                          Amount
                        </th>
                        <th className="p-3 text-start">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {allocations.length ===
                      0 ? (
                        <tr>
                          <td
                            colSpan={3}
                            className="p-8 text-center text-slate-500"
                          >
                            No allocations.
                          </td>
                        </tr>
                      ) : (
                        allocations.map(
                          (allocation) => (
                            <tr
                              key={
                                allocation.id
                              }
                              className="border-t border-white/5"
                            >
                              <td className="p-3 font-bold text-white">
                                {
                                  allocation.invoice_number
                                }
                              </td>

                              <td className="p-3 text-end font-mono text-cyan-300">
                                {
                                  allocation.amount
                                }{" "}
                                {
                                  selected.currency
                                }
                              </td>

                              <td className="p-3">

                                {selected.status ===
                                  "draft" && (
                                  <div className="flex gap-2">

                                    <SharedSecondaryButton
                                      type="button"
                                      onClick={() =>
                                        openEditAllocation(
                                          allocation,
                                        )
                                      }
                                      className="rounded-lg border border-cyan-400/10 bg-cyan-400/5 p-2 text-cyan-400"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </SharedSecondaryButton>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        removeAllocation(
                                          allocation,
                                        )
                                      }
                                      className="rounded-lg border border-rose-400/10 bg-rose-400/5 p-2 text-rose-300"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ),
                        )
                      )}
                    </tbody>
                  </SharedDataTable>
                </div>

                {selected.status ===
                  "draft" && (
                  <div className="flex justify-end border-t border-white/10 pt-5">

                    <SharedSecondaryButton
                      type="button"
                      onClick={() =>
                        postPayment(
                          selected,
                        )
                      }
                      disabled={
                        allocations.length ===
                          0 ||
                        Math.abs(
                          remainingAmount,
                        ) > 0.005
                      }
                      className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2 text-sm font-black text-slate-950 disabled:opacity-40"
                    >
                      <Send className="h-4 w-4" />
                      Post Payment
                    </SharedSecondaryButton>
                  </div>
                )}
              </div>
            ) : (
              <form
                onSubmit={
                  submitAllocation
                }
                className="space-y-5"
              >

                <Field
                  label="Receivable / Invoice"
                  required
                >
                  <SharedSelect
                    value={
                      allocationForm.receivable
                    }
                    onChange={(
                      e,
                    ) =>
                      setAllocationForm(
                        (current) => ({
                          ...current,
                          receivable:
                            e.target
                              .value,
                        }),
                      )
                    }
                    className="billing-input"
                  >
                    <option value="">
                      Select Receivable
                    </option>

                    {availableReceivables.map(
                      (row) => (
                        <option
                          key={
                            row.id
                          }
                          value={
                            row.id
                          }
                        >
                          {
                            row.invoice_number
                          }{" "}
                          — Outstanding{" "}
                          {
                            row.outstanding_amount
                          }{" "}
                          {
                            row.currency
                          }
                        </option>
                      ),
                    )}
                  </SharedSelect>
                </Field>

                <Field
                  label="Allocation Amount"
                  required
                >
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={
                      allocationForm.amount
                    }
                    onChange={(
                      e,
                    ) =>
                      setAllocationForm(
                        (current) => ({
                          ...current,
                          amount:
                            e.target
                              .value,
                        }),
                      )
                    }
                    className="billing-input"
                  />
                </Field>

                {notice?.type ===
                  "error" && (
                  <ErrorBox>
                    {notice.message}
                  </ErrorBox>
                )}

                <div className="flex justify-end gap-3 border-t border-white/10 pt-5">

                  <SharedSecondaryButton
                    type="button"
                    onClick={() =>
                      setAllocationMode(
                        "list",
                      )
                    }
                    disabled={saving}
                    className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300"
                  >
                    Back
                  </SharedSecondaryButton>

                  <SharedPrimaryButton
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2 text-sm font-black text-slate-950 disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Save Allocation
                      </>
                    )}
                  </SharedPrimaryButton>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}





function Summary({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">

      <p className="text-[10px] font-black uppercase text-slate-500">
        {label}
      </p>

      <p className="mt-2 font-mono text-sm font-black text-white">
        {value}
      </p>
    </div>
  );
}

function ErrorBox({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex gap-2 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-300">

      <AlertTriangle className="h-5 w-5 shrink-0" />

      <span>
        {children}
      </span>
    </div>
  );
}
