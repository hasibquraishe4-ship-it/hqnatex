import { PageHeader as SharedPageHeader } from "../../components/PageHeader";
import { PrimaryButton as SharedPrimaryButton, SecondaryButton as SharedSecondaryButton, Select as SharedSelect, DatePicker as SharedDatePicker, FormField as Field, DetailField as Detail } from "../../components/Interface";
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
  FileText,
  Loader2,
  Pencil,
  Plus,
  Send,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";

import {
  DataTable,
  StatusBadge,
  type Column,
} from "../../components/DataTable";

import {
  fetchers,
  saleApi,
  saleItemApi,
  type SaleItemPayload,
  type SalePayload,
  type Session,
} from "../../lib/api";

import { useTranslation } from "../../lib/i18n";

type Props = {
  session: Session;
};

type SaleStatus =
  | "draft"
  | "posted"
  | "cancelled";

type SaleType =
  | "new"
  | "renewal"
  | "change"
  | "mixed";

type ItemType =
  | "service"
  | "package"
  | "installation"
  | "rental"
  | "fee"
  | "equipment";

type SaleItem = {
  id: string;
  tenant: string;
  sale: string;
  line_no: number;
  item_type: ItemType;

  service: string | null;
  service_name: string | null;

  package: string | null;
  package_name: string | null;

  description_snapshot: string;
  quantity: string;
  unit_price: string;
  line_total: string;
  share_eligible: boolean;

  metadata: Record<string, unknown>;

  created_at: string;
  updated_at: string;
};

type Sale = {
  id: string;
  tenant: string;

  company: string;
  company_name: string;

  branch: string | null;
  branch_name: string | null;

  agency: string | null;
  agency_name: string | null;

  customer: string;
  customer_name: string;

  customer_service: string | null;
  customer_service_identifier: string | null;

  sale_number: string;
  sale_type: SaleType;
  status: SaleStatus;

  sale_date: string;
  currency: string;

  subtotal: string;
  discount_amount: string;
  total: string;

  notes: string;

  posted_at: string | null;
  invoice_id: string | null;

  items: SaleItem[];

  created_at: string;
  updated_at: string;
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

type CustomerServiceOption = {
  id: string;
  customer: string;
  customer_name: string;
  service: string;
  service_name: string;
  package: string | null;
  package_name: string | null;
  branch: string | null;
  agency: string | null;
  identifier: string;
  username: string;
  status: string;
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

type ServiceOption = {
  id: string;
  code: string;
  name_english: string;
  status?: string;
};

type CurrentPrice = {
  amount: string;
  currency: string;
} | null;

type PackageOption = {
  id: string;
  service: string;
  code: string;
  name_english: string;
  status?: string;
  current_price?: CurrentPrice;
};

type ModalMode =
  | "create"
  | "view"
  | "edit";

type ItemModalMode =
  | "list"
  | "create"
  | "edit";

type Notice = {
  type: "success" | "error";
  message: string;
};

type SaleForm = {
  branch: string;
  agency: string;
  customer: string;
  customer_service: string;
  sale_type: SaleType;
  sale_date: string;
  currency: string;
  discount_amount: string;
  notes: string;
};

type ItemForm = {
  item_type: Exclude<ItemType, "equipment">;
  service: string;
  package: string;
  description_snapshot: string;
  quantity: string;
  unit_price: string;
  share_eligible: boolean;
  metadata: string;
};

function todayLocal() {
  const date = new Date();

  const pad = (value: number) =>
    String(value).padStart(2, "0");

  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
  ].join("");
}

const EMPTY_SALE_FORM: SaleForm = {
  branch: "",
  agency: "",
  customer: "",
  customer_service: "",
  sale_type: "renewal",
  sale_date: todayLocal(),
  currency: "AFN",
  discount_amount: "0.00",
  notes: "",
};

const EMPTY_ITEM_FORM: ItemForm = {
  item_type: "package",
  service: "",
  package: "",
  description_snapshot: "",
  quantity: "1",
  unit_price: "0.00",
  share_eligible: true,
  metadata: "{}",
};

export function SaleList({
  session,
}: Props) {
  const { t } = useTranslation();

  const [data, setData] =
    useState<Sale[]>([]);

  const [customers, setCustomers] =
    useState<CustomerOption[]>([]);

  const [
    customerServices,
    setCustomerServices,
  ] =
    useState<CustomerServiceOption[]>([]);

  const [branches, setBranches] =
    useState<BranchOption[]>([]);

  const [agencies, setAgencies] =
    useState<AgencyOption[]>([]);

  const [services, setServices] =
    useState<ServiceOption[]>([]);

  const [packages, setPackages] =
    useState<PackageOption[]>([]);

  const [loading, setLoading] =
    useState(true);

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

  const [modalMode, setModalMode] =
    useState<ModalMode | null>(null);

  const [selected, setSelected] =
    useState<Sale | null>(null);

  const [form, setForm] =
    useState<SaleForm>({
      ...EMPTY_SALE_FORM,
    });

  const [
    itemModalMode,
    setItemModalMode,
  ] =
    useState<ItemModalMode | null>(
      null,
    );

  const [selectedItem, setSelectedItem] =
    useState<SaleItem | null>(null);

  const [itemForm, setItemForm] =
    useState<ItemForm>({
      ...EMPTY_ITEM_FORM,
    });

  const [saving, setSaving] =
    useState(false);

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
        saleRes,
        customerRes,
        customerServiceRes,
        branchRes,
        agencyRes,
        serviceRes,
        packageRes,
      ] = await Promise.all([
        fetchers.sales(
          session,
          params,
        ),

        fetchers.customers(
          session,
          "?page_size=100&ordering=display_name",
        ),

        fetchers.customerServices(
          session,
          "?page_size=100",
        ),

        fetchers.branches(
          session,
          "?page_size=100&ordering=name",
        ),

        fetchers.agencies(
          session,
          "?page_size=100&ordering=name",
        ),

        fetchers.allServices(
          session,
          "?status=active&ordering=name_english",
        ),

        fetchers.allPackages(
          session,
          "?available=1&ordering=name_english",
        ),
      ]);

      setData(saleRes.results);
      setTotalCount(saleRes.count);

      setCustomers(
        customerRes.results,
      );

      setCustomerServices(
        customerServiceRes.results,
      );

      setBranches(
        branchRes.results,
      );

      setAgencies(
        agencyRes.results,
      );

      setServices(
        serviceRes.results,
      );

      setPackages(
        packageRes.results,
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

  const availableCustomerServices =
    useMemo(
      () =>
        customerServices.filter(
          (record) =>
            !form.customer ||
            record.customer ===
              form.customer,
        ),
      [
        customerServices,
        form.customer,
      ],
    );

  const availablePackages =
    useMemo(
      () =>
        packages.filter(
          (pkg) =>
            (!itemForm.service ||
              pkg.service ===
                itemForm.service) &&
            pkg.status !==
              "inactive",
        ),
      [
        packages,
        itemForm.service,
      ],
    );

  const updateField = <
    K extends keyof SaleForm
  >(
    key: K,
    value: SaleForm[K],
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const updateItemField = <
    K extends keyof ItemForm
  >(
    key: K,
    value: ItemForm[K],
  ) => {
    setItemForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const changeCustomer = (
    customerId: string,
  ) => {
    const customer =
      customers.find(
        (item) =>
          item.id === customerId,
      );

    setForm((current) => ({
      ...current,
      customer: customerId,
      customer_service: "",
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
          (item) =>
            item.id ===
            current.agency,
        );

      const agencyValid =
        !agency ||
        !branchId ||
        !agency.branch ||
        agency.branch ===
          branchId;

      return {
        ...current,
        branch: branchId,
        agency: agencyValid
          ? current.agency
          : "",
      };
    });
  };

  const openCreate = () => {
    setNotice(null);
    setSelected(null);

    setForm({
      ...EMPTY_SALE_FORM,
      sale_date: todayLocal(),
    });

    setModalMode("create");
  };

  const openView = (
    row: Sale,
  ) => {
    setNotice(null);
    setSelected(row);
    setModalMode("view");
  };

  const openEdit = (
    row: Sale,
  ) => {
    if (
      row.status === "posted"
    ) {
      setNotice({
        type: "error",
        message:
          "Posted sales are immutable.",
      });
      return;
    }

    setNotice(null);
    setSelected(row);

    setForm({
      branch:
        row.branch || "",
      agency:
        row.agency || "",
      customer:
        row.customer,
      customer_service:
        row.customer_service ||
        "",
      sale_type:
        row.sale_type,
      sale_date:
        row.sale_date,
      currency:
        row.currency || "AFN",
      discount_amount:
        row.discount_amount ||
        "0.00",
      notes:
        row.notes || "",
    });

    setModalMode("edit");
  };

  const closeModal = () => {
    if (saving) return;

    setModalMode(null);
    setSelected(null);

    setForm({
      ...EMPTY_SALE_FORM,
      sale_date: todayLocal(),
    });
  };

  const submitSale = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!session.companyId) {
      setNotice({
        type: "error",
        message:
          "An active company must be selected before creating a sale.",
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

    if (!form.sale_date) {
      setNotice({
        type: "error",
        message:
          "Sale date is required.",
      });
      return;
    }

    const discount =
      Number(
        form.discount_amount,
      );

    if (
      Number.isNaN(discount) ||
      discount < 0
    ) {
      setNotice({
        type: "error",
        message:
          "Discount amount cannot be negative.",
      });
      return;
    }

    const payload:
      SalePayload = {
      company:
        session.companyId,

      branch:
        form.branch || null,

      agency:
        form.agency || null,

      customer:
        form.customer,

      customer_service:
        form.customer_service ||
        null,

      sale_type:
        form.sale_type,

      sale_date:
        form.sale_date,

      currency:
        form.currency.trim() ||
        "AFN",

      discount_amount:
        form.discount_amount,

      notes:
        form.notes.trim(),
    };

    try {
      setSaving(true);
      setNotice(null);

      let result: Sale;

      if (
        modalMode === "create"
      ) {
        result =
          await saleApi.create(
            session,
            payload,
          );
      } else if (
        modalMode === "edit" &&
        selected
      ) {
        result =
          await saleApi.update(
            session,
            selected.id,
            payload,
          );
      } else {
        return;
      }

      await load();

      setSelected(result);
      setModalMode("view");

      setNotice({
        type: "success",
        message:
          modalMode === "create"
            ? "Draft sale created successfully."
            : "Sale updated successfully.",
      });
    } catch (err) {
      setNotice({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Sale operation failed.",
      });
    } finally {
      setSaving(false);
    }
  };

  const refreshSelected =
    async (
      saleId: string,
    ) => {
      const fresh:
        Sale =
        await saleApi.retrieve(
          session,
          saleId,
        );

      setSelected(fresh);

      setData((current) =>
        current.map((row) =>
          row.id === fresh.id
            ? fresh
            : row,
        ),
      );

      return fresh;
    };

  const openItems =
    async (row: Sale) => {
      try {
        setSaving(true);
        setNotice(null);

        const fresh:
          Sale =
          await saleApi.retrieve(
            session,
            row.id,
          );

        setSelected(fresh);
        setModalMode(null);

        setSelectedItem(null);

        setItemForm({
          ...EMPTY_ITEM_FORM,
        });

        setItemModalMode(
          "list",
        );
      } catch (err) {
        setNotice({
          type: "error",
          message:
            err instanceof Error
              ? err.message
              : "Unable to load sale items.",
        });
      } finally {
        setSaving(false);
      }
    };

  const openCreateItem = () => {
    if (
      !selected ||
      selected.status !== "draft"
    ) {
      return;
    }

    setSelectedItem(null);

    setItemForm({
      ...EMPTY_ITEM_FORM,
    });

    setItemModalMode(
      "create",
    );
  };

  const openEditItem = (
    item: SaleItem,
  ) => {
    if (
      !selected ||
      selected.status !== "draft"
    ) {
      return;
    }

    setSelectedItem(item);

    setItemForm({
      item_type:
        item.item_type ===
        "equipment"
          ? "service"
          : item.item_type,

      service:
        item.service || "",

      package:
        item.package || "",

      description_snapshot:
        item.description_snapshot ||
        "",

      quantity:
        item.quantity,

      unit_price:
        item.unit_price,

      share_eligible:
        item.share_eligible,

      metadata:
        JSON.stringify(
          item.metadata || {},
          null,
          2,
        ),
    });

    setItemModalMode(
      "edit",
    );
  };

  const changeItemService = (
    serviceId: string,
  ) => {
    setItemForm((current) => {
      const currentPackage =
        packages.find(
          (pkg) =>
            pkg.id ===
            current.package,
        );

      return {
        ...current,
        service: serviceId,
        package:
          currentPackage &&
          currentPackage.service ===
            serviceId
            ? current.package
            : "",
      };
    });
  };

  const changePackage = (
    packageId: string,
  ) => {
    const pkg =
      packages.find(
        (item) =>
          item.id === packageId,
      );

    setItemForm(
      (current) => ({
        ...current,

        package:
          packageId,

        service:
          pkg?.service ||
          current.service,

        description_snapshot:
          pkg
            ? `${pkg.code} — ${pkg.name_english}`
            : current.description_snapshot,

        unit_price:
          pkg?.current_price
            ?.amount ||
          current.unit_price,
      }),
    );
  };

  const submitItem = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!selected) {
      return;
    }

    if (
      selected.status !== "draft"
    ) {
      setNotice({
        type: "error",
        message:
          "Items can only be changed while the sale is draft.",
      });
      return;
    }

    if (
      !itemForm.description_snapshot.trim()
    ) {
      setNotice({
        type: "error",
        message:
          "Item description is required.",
      });
      return;
    }

    if (
      itemForm.item_type ===
        "package" &&
      !itemForm.package
    ) {
      setNotice({
        type: "error",
        message:
          "Package item requires a package.",
      });
      return;
    }

    if (
      itemForm.share_eligible &&
      !itemForm.service
    ) {
      setNotice({
        type: "error",
        message:
          "Share-eligible item requires a service.",
      });
      return;
    }

    const quantity =
      Number(
        itemForm.quantity,
      );

    const unitPrice =
      Number(
        itemForm.unit_price,
      );

    if (
      Number.isNaN(quantity) ||
      quantity <= 0
    ) {
      setNotice({
        type: "error",
        message:
          "Quantity must be greater than zero.",
      });
      return;
    }

    if (
      Number.isNaN(unitPrice) ||
      unitPrice < 0
    ) {
      setNotice({
        type: "error",
        message:
          "Unit price cannot be negative.",
      });
      return;
    }

    let metadata:
      Record<string, unknown>;

    try {
      const parsed =
        JSON.parse(
          itemForm.metadata.trim() ||
            "{}",
        );

      if (
        typeof parsed !==
          "object" ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        throw new Error();
      }

      metadata =
        parsed as Record<
          string,
          unknown
        >;
    } catch {
      setNotice({
        type: "error",
        message:
          "Metadata must be a valid JSON object.",
      });
      return;
    }

    const nextLineNo =
      selected.items.length
        ? Math.max(
            ...selected.items.map(
              (item) =>
                item.line_no,
            ),
          ) + 1
        : 1;

    const payload:
      SaleItemPayload = {
      sale:
        selected.id,

      line_no:
        selectedItem
          ? selectedItem.line_no
          : nextLineNo,

      item_type:
        itemForm.item_type,

      service:
        itemForm.service ||
        null,

      package:
        itemForm.package ||
        null,

      description_snapshot:
        itemForm.description_snapshot.trim(),

      quantity:
        itemForm.quantity,

      unit_price:
        itemForm.unit_price,

      share_eligible:
        itemForm.share_eligible,

      metadata,
    };

    try {
      setSaving(true);
      setNotice(null);

      if (
        itemModalMode ===
        "create"
      ) {
        await saleItemApi.create(
          session,
          payload,
        );
      } else if (
        itemModalMode ===
          "edit" &&
        selectedItem
      ) {
        await saleItemApi.update(
          session,
          selectedItem.id,
          payload,
        );
      }

      await refreshSelected(
        selected.id,
      );

      await load();

      setSelectedItem(null);

      setItemForm({
        ...EMPTY_ITEM_FORM,
      });

      setItemModalMode(
        "list",
      );

      setNotice({
        type: "success",
        message:
          "Sale item saved successfully.",
      });
    } catch (err) {
      setNotice({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Sale item operation failed.",
      });
    } finally {
      setSaving(false);
    }
  };

  const removeItem =
    async (
      item: SaleItem,
    ) => {
      if (
        !selected ||
        selected.status !==
          "draft"
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          `Delete line ${item.line_no}?`,
        );

      if (!confirmed) {
        return;
      }

      try {
        setSaving(true);
        setNotice(null);

        await saleItemApi.remove(
          session,
          item.id,
        );

        await refreshSelected(
          selected.id,
        );

        await load();

        setNotice({
          type: "success",
          message:
            "Draft sale item deleted.",
        });
      } catch (err) {
        setNotice({
          type: "error",
          message:
            err instanceof Error
              ? err.message
              : "Unable to delete sale item.",
        });
      } finally {
        setSaving(false);
      }
    };

  const postSale =
    async (row: Sale) => {
      if (
        row.status !== "draft"
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          `Post sale ${row.sale_number}? Posted sales become immutable.`,
        );

      if (!confirmed) {
        return;
      }

      try {
        setSaving(true);
        setNotice(null);

        const posted:
          Sale =
          await saleApi.post(
            session,
            row.id,
          );

        setSelected(posted);

        await load();

        setNotice({
          type: "success",
          message:
            `Sale ${posted.sale_number} posted successfully.`,
        });

        if (
          itemModalMode
        ) {
          setItemModalMode(
            null,
          );
        }

        if (
          modalMode ===
          "view"
        ) {
          setModalMode(
            "view",
          );
        }
      } catch (err) {
        setNotice({
          type: "error",
          message:
            err instanceof Error
              ? err.message
              : "Sale post failed.",
        });
      } finally {
        setSaving(false);
      }
    };

  const columns:
    Column<Sale>[] = [
    {
      header:
        t.sales.saleNum,
      accessor:
        "sale_number",
      className:
        "font-bold text-white",
      sortable: true,
    },

    {
      header:
        t.sales.date,
      accessor: (row) =>
        row.sale_date
          ? new Date(
              `${row.sale_date}T00:00:00`,
            ).toLocaleDateString()
          : "—",
      sortKey:
        "sale_date",
      sortable: true,
    },

    {
      header:
        t.sales.customer,
      accessor:
        "customer_name",
      sortKey:
        "customer__display_name",
      sortable: true,
    },

    {
      header:
        t.sales.type,
      accessor: (row) => (
        <span className="rounded-md border border-white/5 bg-white/5 px-2 py-0.5 text-[10px] font-bold capitalize">
          {row.sale_type}
        </span>
      ),
      sortable: true,
    },

    {
      header:
        "Items",
      accessor: (row) =>
        String(
          row.items?.length ||
            0,
        ),
    },

    {
      header:
        t.sales.total,
      accessor: (row) =>
        `${row.total} ${row.currency}`,
      className:
        "font-mono text-end text-cyan-400",
      sortKey:
        "total",
      sortable: true,
    },

    {
      header:
        t.sales.status,
      accessor: (row) => (
        <StatusBadge
          status={
            t.common[
              row.status as keyof typeof t.common
            ] || row.status
          }
          type={
            row.status ===
              "posted"
              ? "success"
              : row.status ===
                  "cancelled"
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
      <div className="space-y-6 animate-in fade-in duration-500">

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
              <ShoppingCart className="h-5 w-5 text-cyan-300" />
            </div>

            <div>
              <h2 className="text-xl font-black text-white">
                {t.sales.title}
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {t.sales.subtitle}
              </p>
            </div>
          </div>

          <SharedPrimaryButton
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950"
          >
            <Plus className="h-4 w-4" />
            New Sale
          </SharedPrimaryButton>
        </SharedPageHeader>

        <DataTable
          columns={columns}
          data={data}
          loading={loading}
          totalCount={
            totalCount
          }
          currentPage={
            page
          }
          pageSize={
            pageSize
          }
          onPageChange={
            setPage
          }
          onPageSizeChange={
            setPageSize
          }
          onSearch={
            setSearchTerm
          }
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
                title="View"
              >
                <Eye className="h-4 w-4" />
              </SharedSecondaryButton>

              {row.status !==
                "posted" && (
                <SharedSecondaryButton
                  type="button"
                  onClick={() =>
                    openEdit(
                      row,
                    )
                  }
                  className="rounded-lg border border-cyan-400/10 bg-cyan-400/5 p-2 text-cyan-400"
                  title="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </SharedSecondaryButton>
              )}

              <SharedSecondaryButton
                type="button"
                onClick={() =>
                  openItems(row)
                }
                className="rounded-lg border border-violet-400/10 bg-violet-400/5 p-2 text-violet-300"
                title="Sale Items"
              >
                <ShoppingCart className="h-4 w-4" />
              </SharedSecondaryButton>

              {row.status ===
                "draft" && (
                <SharedSecondaryButton
                  type="button"
                  onClick={() =>
                    postSale(row)
                  }
                  className="rounded-lg border border-emerald-400/10 bg-emerald-400/5 p-2 text-emerald-300"
                  title="Post Sale"
                >
                  <Send className="h-4 w-4" />
                </SharedSecondaryButton>
              )}

              {row.invoice_id && (
                <SharedSecondaryButton
                  type="button"
                  onClick={() =>
                    setNotice({
                      type: "success",
                      message:
                        `Invoice ID: ${row.invoice_id}`,
                    })
                  }
                  className="rounded-lg border border-white/5 bg-white/5 p-2 text-slate-300"
                  title="Invoice Reference"
                >
                  <FileText className="h-4 w-4" />
                </SharedSecondaryButton>
              )}
            </div>
          )}
        />
      </div>

      {modalMode && (
        <div className="hq-visual-overlay fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">

          <div className="hq-visual-panel hq-visual-dialog max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-[28px] border border-white/10 bg-slate-950 p-6 shadow-2xl">

            <div className="mb-6 flex items-center justify-between">

              <div>
                <h3 className="text-lg font-black text-white">
                  {modalMode ===
                  "create"
                    ? "New Sale"
                    : modalMode ===
                        "edit"
                      ? "Edit Sale"
                      : "Sale Details"}
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Draft → Items → Post
                </p>
              </div>

              <SharedSecondaryButton
                type="button"
                onClick={
                  closeModal
                }
                disabled={
                  saving
                }
                className="rounded-xl border border-white/10 p-2 text-slate-400"
              >
                <X className="h-5 w-5" />
              </SharedSecondaryButton>
            </div>

            {modalMode ===
              "view" &&
            selected ? (
              <div className="space-y-5">

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

                  <Detail
                    label="Sale Number"
                    value={
                      selected.sale_number
                    }
                  />

                  <Detail
                    label="Status"
                    value={
                      selected.status
                    }
                  />

                  <Detail
                    label="Sale Type"
                    value={
                      selected.sale_type
                    }
                  />

                  <Detail
                    label="Date"
                    value={
                      selected.sale_date
                    }
                  />

                  <Detail
                    label="Company"
                    value={
                      selected.company_name ||
                      selected.company
                    }
                  />

                  <Detail
                    label="Branch"
                    value={
                      selected.branch_name ||
                      "—"
                    }
                  />

                  <Detail
                    label="Agency"
                    value={
                      selected.agency_name ||
                      "—"
                    }
                  />

                  <Detail
                    label="Customer"
                    value={
                      selected.customer_name
                    }
                  />

                  <Detail
                    label="Customer Service"
                    value={
                      selected.customer_service_identifier ||
                      "—"
                    }
                  />

                  <Detail
                    label="Subtotal"
                    value={`${selected.subtotal} ${selected.currency}`}
                  />

                  <Detail
                    label="Discount"
                    value={`${selected.discount_amount} ${selected.currency}`}
                  />

                  <Detail
                    label="Total"
                    value={`${selected.total} ${selected.currency}`}
                  />

                  <Detail
                    label="Posted At"
                    value={
                      selected.posted_at ||
                      "—"
                    }
                  />

                  <Detail
                    label="Invoice ID"
                    value={
                      selected.invoice_id ||
                      "—"
                    }
                  />
                </div>

                <Detail
                  label="Notes"
                  value={
                    selected.notes ||
                    "—"
                  }
                />

                <div className="flex flex-wrap justify-end gap-3 border-t border-white/10 pt-5">

                  <SharedSecondaryButton
                    type="button"
                    onClick={() =>
                      openItems(
                        selected,
                      )
                    }
                    className="flex items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-400/10 px-4 py-2 text-sm font-bold text-violet-300"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Manage Items
                  </SharedSecondaryButton>

                  {selected.status !==
                    "posted" && (
                    <SharedSecondaryButton
                      type="button"
                      onClick={() =>
                        openEdit(
                          selected,
                        )
                      }
                      className="flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-300"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit Sale
                    </SharedSecondaryButton>
                  )}

                  {selected.status ===
                    "draft" && (
                    <SharedSecondaryButton
                      type="button"
                      onClick={() =>
                        postSale(
                          selected,
                        )
                      }
                      className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-black text-slate-950"
                    >
                      <Send className="h-4 w-4" />
                      Post Sale
                    </SharedSecondaryButton>
                  )}
                </div>
              </div>
            ) : (
              <form
                onSubmit={
                  submitSale
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
                        event,
                      ) =>
                        changeCustomer(
                          event.target
                            .value,
                        )
                      }
                      className="sale-input"
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

                  <Field label="Customer Service">
                    <SharedSelect
                      value={
                        form.customer_service
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "customer_service",
                          event.target
                            .value,
                        )
                      }
                      disabled={
                        !form.customer
                      }
                      className="sale-input disabled:opacity-40"
                    >
                      <option value="">
                        No Customer Service
                      </option>

                      {availableCustomerServices.map(
                        (record) => (
                          <option
                            key={
                              record.id
                            }
                            value={
                              record.id
                            }
                          >
                            {
                              record.service_name
                            }{" "}
                            —{" "}
                            {record.identifier ||
                              record.username ||
                              record.id.slice(
                                0,
                                8,
                              )}
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
                        event,
                      ) =>
                        changeBranch(
                          event.target
                            .value,
                        )
                      }
                      className="sale-input"
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
                            {
                              branch.code
                            }{" "}
                            —{" "}
                            {
                              branch.name
                            }
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
                        event,
                      ) =>
                        updateField(
                          "agency",
                          event.target
                            .value,
                        )
                      }
                      className="sale-input"
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
                            {
                              agency.code
                            }{" "}
                            —{" "}
                            {
                              agency.name
                            }
                          </option>
                        ),
                      )}
                    </SharedSelect>
                  </Field>

                  <Field
                    label="Sale Type"
                    required
                  >
                    <SharedSelect
                      value={
                        form.sale_type
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "sale_type",
                          event.target
                            .value as SaleType,
                        )
                      }
                      className="sale-input"
                    >
                      <option value="new">
                        New
                      </option>

                      <option value="renewal">
                        Renewal
                      </option>

                      <option value="change">
                        Change
                      </option>

                      <option value="mixed">
                        Mixed
                      </option>
                    </SharedSelect>
                  </Field>

                  <Field
                    label="Sale Date"
                    required
                  >
                    <SharedDatePicker
                      type="date"
                      value={
                        form.sale_date
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "sale_date",
                          event.target
                            .value,
                        )
                      }
                      className="sale-input"
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
                        event,
                      ) =>
                        updateField(
                          "currency",
                          event.target
                            .value.toUpperCase(),
                        )
                      }
                      className="hq-input sale-input"
                    />
                  </Field>

                  <Field label="Discount Amount">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        form.discount_amount
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "discount_amount",
                          event.target
                            .value,
                        )
                      }
                      className="hq-input sale-input"
                    />
                  </Field>
                </div>

                <Field label="Notes">
                  <textarea
                    rows={4}
                    value={
                      form.notes
                    }
                    onChange={(
                      event,
                    ) =>
                      updateField(
                        "notes",
                        event.target
                          .value,
                      )
                    }
                    className="hq-input sale-input resize-y"
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
                    onClick={
                      closeModal
                    }
                    disabled={
                      saving
                    }
                    className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300"
                  >
                    Cancel
                  </SharedSecondaryButton>

                  <SharedPrimaryButton
                    type="submit"
                    disabled={
                      saving
                    }
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
                          ? "Create Draft Sale"
                          : "Save Changes"}
                      </>
                    )}
                  </SharedPrimaryButton>
                </div>
              </form>
            )}

            <style>{`
              .sale-input {
                width: 100%;
                border-radius: .9rem;
                border: 1px solid rgba(255,255,255,.10);
                background: rgba(255,255,255,.045);
                padding: .72rem .85rem;
                color: rgb(241 245 249);
                outline: none;
              }

              .sale-input:focus {
                border-color: rgba(34,211,238,.45);
                box-shadow:
                  0 0 0 3px rgba(34,211,238,.07);
              }

              .sale-input option {
                background: rgb(15 23 42);
                color: white;
              }
            `}</style>
          </div>
        </div>
      )}

      {itemModalMode &&
      selected && (
        <div className="hq-visual-overlay fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md">

          <div className="hq-visual-panel hq-visual-dialog max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-[28px] border border-white/10 bg-slate-950 p-6 shadow-2xl">

            <div className="mb-6 flex items-center justify-between">

              <div>
                <h3 className="text-lg font-black text-white">
                  Sale Items
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  {selected.sale_number} — {selected.customer_name}
                </p>
              </div>

              <SharedSecondaryButton
                type="button"
                onClick={() => {
                  if (!saving) {
                    setItemModalMode(
                      null,
                    );
                  }
                }}
                disabled={
                  saving
                }
                className="rounded-xl border border-white/10 p-2 text-slate-400"
              >
                <X className="h-5 w-5" />
              </SharedSecondaryButton>
            </div>

            {itemModalMode ===
            "list" ? (
              <div className="space-y-5">

                <div className="grid gap-3 md:grid-cols-4">

                  <Summary
                    label="Subtotal"
                    value={`${selected.subtotal} ${selected.currency}`}
                  />

                  <Summary
                    label="Discount"
                    value={`${selected.discount_amount} ${selected.currency}`}
                  />

                  <Summary
                    label="Total"
                    value={`${selected.total} ${selected.currency}`}
                  />

                  <Summary
                    label="Status"
                    value={
                      selected.status
                    }
                  />
                </div>

                {selected.status ===
                  "draft" && (
                  <div className="flex justify-end">

                    <SharedPrimaryButton
                      type="button"
                      onClick={
                        openCreateItem
                      }
                      className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950"
                    >
                      <Plus className="h-4 w-4" />
                      Add Item
                    </SharedPrimaryButton>
                  </div>
                )}

                <div className="overflow-x-auto rounded-2xl border border-white/10">

                  <SharedDataTable native className="w-full text-sm">

                    <thead className="bg-white/[0.04] text-slate-400">
                      <tr>
                        <th className="p-3 text-start">
                          #
                        </th>
                        <th className="p-3 text-start">
                          Type
                        </th>
                        <th className="p-3 text-start">
                          Description
                        </th>
                        <th className="p-3 text-end">
                          Qty
                        </th>
                        <th className="p-3 text-end">
                          Unit Price
                        </th>
                        <th className="p-3 text-end">
                          Total
                        </th>
                        <th className="p-3 text-start">
                          Share
                        </th>
                        <th className="p-3 text-start">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {!selected.items ||
                      selected.items.length ===
                        0 ? (
                        <tr>
                          <td
                            colSpan={8}
                            className="p-8 text-center text-slate-500"
                          >
                            No sale items.
                          </td>
                        </tr>
                      ) : (
                        selected.items.map(
                          (item) => (
                            <tr
                              key={
                                item.id
                              }
                              className="border-t border-white/5"
                            >
                              <td className="p-3 font-mono text-slate-400">
                                {
                                  item.line_no
                                }
                              </td>

                              <td className="p-3 capitalize text-slate-300">
                                {
                                  item.item_type
                                }
                              </td>

                              <td className="p-3">
                                <div className="font-bold text-white">
                                  {
                                    item.description_snapshot
                                  }
                                </div>

                                <div className="mt-1 text-[10px] text-slate-500">
                                  {item.service_name ||
                                    "No service"}
                                  {item.package_name
                                    ? ` • ${item.package_name}`
                                    : ""}
                                </div>
                              </td>

                              <td className="p-3 text-end font-mono">
                                {
                                  item.quantity
                                }
                              </td>

                              <td className="p-3 text-end font-mono">
                                {
                                  item.unit_price
                                }
                              </td>

                              <td className="p-3 text-end font-mono font-bold text-cyan-300">
                                {
                                  item.line_total
                                }
                              </td>

                              <td className="p-3">
                                {item.share_eligible
                                  ? "Yes"
                                  : "No"}
                              </td>

                              <td className="p-3">
                                {selected.status ===
                                  "draft" && (
                                  <div className="flex gap-2">

                                    <SharedSecondaryButton
                                      type="button"
                                      onClick={() =>
                                        openEditItem(
                                          item,
                                        )
                                      }
                                      className="rounded-lg border border-cyan-400/10 bg-cyan-400/5 p-2 text-cyan-400"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </SharedSecondaryButton>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        removeItem(
                                          item,
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
                  "draft" &&
                selected.items?.length >
                  0 && (
                  <div className="flex justify-end border-t border-white/10 pt-5">

                    <SharedSecondaryButton
                      type="button"
                      onClick={() =>
                        postSale(
                          selected,
                        )
                      }
                      className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2 text-sm font-black text-slate-950"
                    >
                      <Send className="h-4 w-4" />
                      Post Sale
                    </SharedSecondaryButton>
                  </div>
                )}
              </div>
            ) : (
              <form
                onSubmit={
                  submitItem
                }
                className="space-y-5"
              >

                <div className="grid gap-4 md:grid-cols-2">

                  <Field
                    label="Item Type"
                    required
                  >
                    <SharedSelect
                      value={
                        itemForm.item_type
                      }
                      onChange={(
                        event,
                      ) =>
                        updateItemField(
                          "item_type",
                          event.target
                            .value as ItemForm["item_type"],
                        )
                      }
                      className="sale-input"
                    >
                      <option value="service">
                        Service
                      </option>

                      <option value="package">
                        Package
                      </option>

                      <option value="installation">
                        Installation
                      </option>

                      <option value="rental">
                        Rental
                      </option>

                      <option value="fee">
                        Fee
                      </option>
                    </SharedSelect>
                  </Field>

                  <Field label="Service">
                    <SharedSelect
                      value={
                        itemForm.service
                      }
                      onChange={(
                        event,
                      ) =>
                        changeItemService(
                          event.target
                            .value,
                        )
                      }
                      className="sale-input"
                    >
                      <option value="">
                        No Service
                      </option>

                      {services
                        .filter(
                          (service) =>
                            service.status !==
                            "inactive",
                        )
                        .map(
                          (service) => (
                            <option
                              key={
                                service.id
                              }
                              value={
                                service.id
                              }
                            >
                              {
                                service.code
                              }{" "}
                              —{" "}
                              {
                                service.name_english
                              }
                            </option>
                          ),
                        )}
                    </SharedSelect>
                  </Field>

                  <Field
                    label="Package"
                    required={
                      itemForm.item_type ===
                      "package"
                    }
                  >
                    <SharedSelect
                      value={
                        itemForm.package
                      }
                      onChange={(
                        event,
                      ) =>
                        changePackage(
                          event.target
                            .value,
                        )
                      }
                      className="sale-input"
                    >
                      <option value="">
                        No Package
                      </option>

                      {availablePackages.map(
                        (pkg) => (
                          <option
                            key={
                              pkg.id
                            }
                            value={
                              pkg.id
                            }
                          >
                            {
                              pkg.code
                            }{" "}
                            —{" "}
                            {
                              pkg.name_english
                            }
                          </option>
                        ),
                      )}
                    </SharedSelect>
                  </Field>

                  <Field
                    label="Description"
                    required
                  >
                    <input
                      maxLength={255}
                      value={
                        itemForm.description_snapshot
                      }
                      onChange={(
                        event,
                      ) =>
                        updateItemField(
                          "description_snapshot",
                          event.target
                            .value,
                        )
                      }
                      className="hq-input sale-input"
                    />
                  </Field>

                  <Field
                    label="Quantity"
                    required
                  >
                    <input
                      type="number"
                      min="0.001"
                      step="0.001"
                      value={
                        itemForm.quantity
                      }
                      onChange={(
                        event,
                      ) =>
                        updateItemField(
                          "quantity",
                          event.target
                            .value,
                        )
                      }
                      className="hq-input sale-input"
                    />
                  </Field>

                  <Field
                    label="Unit Price"
                    required
                  >
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        itemForm.unit_price
                      }
                      onChange={(
                        event,
                      ) =>
                        updateItemField(
                          "unit_price",
                          event.target
                            .value,
                        )
                      }
                      className="hq-input sale-input"
                    />
                  </Field>
                </div>

                <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">

                  <input
                    type="checkbox"
                    checked={
                      itemForm.share_eligible
                    }
                    onChange={(
                      event,
                    ) =>
                      updateItemField(
                        "share_eligible",
                        event.target
                          .checked,
                      )
                    }
                  />

                  <span className="text-sm font-bold text-white">
                    Share Eligible
                  </span>
                </label>

                <Field label="Metadata JSON">
                  <textarea
                    rows={5}
                    spellCheck={false}
                    value={
                      itemForm.metadata
                    }
                    onChange={(
                      event,
                    ) =>
                      updateItemField(
                        "metadata",
                        event.target
                          .value,
                      )
                    }
                    className="hq-input sale-input resize-y font-mono text-xs"
                  />
                </Field>

                <div className="rounded-xl border border-amber-400/10 bg-amber-400/5 px-4 py-3 text-xs text-amber-200">
                  Equipment sale is intentionally unavailable in this stage until Warehouse Product / Stock / Serial becomes canonical.
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
                    onClick={() =>
                      setItemModalMode(
                        "list",
                      )
                    }
                    disabled={
                      saving
                    }
                    className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300"
                  >
                    Back
                  </SharedSecondaryButton>

                  <SharedPrimaryButton
                    type="submit"
                    disabled={
                      saving
                    }
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

                        {itemModalMode ===
                        "create"
                          ? "Add Item"
                          : "Save Item"}
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
    <div className="hq-visual-panel rounded-2xl border border-white/10 bg-white/[0.03] p-4">

      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
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
