import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  collectAllPages,
  fetchers,
  ipAssignmentApi,
  type Paginated,
  type Session,
} from "../../lib/api";

import {
  useTranslation,
} from "../../lib/i18n";


type AssignmentType =
  | "static_ipv4"
  | "static_ipv6"
  | "pppoe_framed"
  | "subnet_prefix"
  | "cgnat";


type AssignmentStatus =
  | "active"
  | "reserved"
  | "released";


type IPAssignment = {
  id: string;

  tenant: string;
  company: string;

  customer_service: string;
  customer_name: string;
  service_identifier: string;

  ip_resource_id: string;

  assignment_type: AssignmentType;

  ip_address: string;
  subnet_mask: string;

  cidr_prefix: number | null;

  gateway: string;
  primary_dns: string;
  secondary_dns: string;

  vlan_id: number | null;

  assigned_at: string;
  released_at: string | null;

  status: AssignmentStatus;

  created_at: string;
  updated_at: string;
};


type CustomerServiceOption = {
  id: string;

  customer_name?: string;
  service_name?: string;
  package_name?: string | null;

  identifier?: string;
  username?: string;

  status?: string;
};


type NetworkResourceOption = {
  id: string;

  code?: string;
  name?: string;

  resource_type?: string;
  status?: string;

  company?: string;
  company_name?: string;

  metadata?: Record<
    string,
    unknown
  >;
};


type IPAssignmentForm = {
  customer_service: string;

  ip_resource_id: string;

  assignment_type: AssignmentType;

  ip_address: string;
  subnet_mask: string;

  cidr_prefix: string;

  gateway: string;
  primary_dns: string;
  secondary_dns: string;

  vlan_id: string;

  assigned_at: string;
  released_at: string;

  status: AssignmentStatus;
};


type ModalMode =
  | "create"
  | "view"
  | "edit"
  | null;


type Notice = {
  type: "success" | "error";
  message: string;
};


const PAGE_SIZE = 25;


const copy = {
  en: {
    title: "IP Assignments",
    subtitle:
      "Assign IPv4/IPv6 addresses, prefixes, gateways, DNS and VLAN information to customer services using NOC IP resources.",

    newAssignment: "New IP assignment",
    createAssignment: "Create IP assignment",
    editAssignment: "Edit IP assignment",
    assignmentDetails: "IP assignment details",

    customer: "Customer",
    customerService: "Customer service",
    serviceIdentifier: "Service identifier",

    networkResource: "NOC IP resource",
    noResource: "No NOC resource selected",

    resourceType: "Resource type",
    resourceStatus: "Resource status",

    assignmentType: "Assignment type",

    ipAddress: "IP address",
    subnetMask: "Subnet mask",
    cidrPrefix: "CIDR prefix",

    gateway: "Gateway",
    primaryDns: "Primary DNS",
    secondaryDns: "Secondary DNS",

    vlanId: "VLAN ID",

    assignedAt: "Assigned at",
    releasedAt: "Released at",

    status: "Status",

    actions: "Actions",
    view: "View",
    edit: "Edit",
    save: "Save",
    cancel: "Cancel",
    close: "Close",

    allStatuses: "All statuses",
    allServices: "All customer services",

    selectCustomerService: "Select customer service",
    selectResource: "Select IP Pool / IP Prefix",

    loading: "Loading...",
    loadingServices: "Loading customer services...",
    loadingResources: "Loading NOC IP resources...",

    noRecords: "No IP assignments found.",
    noServices: "No customer services available.",
    noResources:
      "No IP Pool or IP Prefix resources are available.",

    customerServiceRequired:
      "Customer service is required.",

    ipAddressRequired:
      "IP address is required.",

    invalidCidr:
      "CIDR prefix must be an integer between 0 and 128.",

    invalidVlan:
      "VLAN ID must be an integer.",

    created:
      "IP assignment created successfully.",

    updated:
      "IP assignment updated successfully.",

    loadFailed:
      "Unable to load IP assignments.",

    saveFailed:
      "Unable to save IP assignment.",

    previous: "Previous",
    next: "Next",
    page: "Page",
    records: "records",

    optional: "Optional",

    static_ipv4: "Static IPv4",
    static_ipv6: "Static IPv6",
    pppoe_framed: "PPPoE Framed IP",
    subnet_prefix: "Subnet / Prefix",
    cgnat: "CGNAT",

    active: "Active",
    reserved: "Reserved",
    released: "Released",

    ip_pool: "IP Pool",
    ip_prefix: "IP Prefix",
  },

  fa: {
    title: "تخصیص آدرس‌های IP",
    subtitle:
      "تخصیص IPv4/IPv6، Prefix، Gateway، DNS و VLAN به خدمات مشترکین با استفاده از منابع IP بخش NOC.",

    newAssignment: "تخصیص IP جدید",
    createAssignment: "ثبت تخصیص IP",
    editAssignment: "ویرایش تخصیص IP",
    assignmentDetails: "جزئیات تخصیص IP",

    customer: "مشترک",
    customerService: "خدمت مشترک",
    serviceIdentifier: "شناسه خدمت",

    networkResource: "منبع IP در NOC",
    noResource: "بدون منبع NOC",

    resourceType: "نوع منبع",
    resourceStatus: "وضعیت منبع",

    assignmentType: "نوع تخصیص",

    ipAddress: "آدرس IP",
    subnetMask: "Subnet Mask",
    cidrPrefix: "CIDR Prefix",

    gateway: "Gateway",
    primaryDns: "DNS اصلی",
    secondaryDns: "DNS ثانوی",

    vlanId: "VLAN ID",

    assignedAt: "زمان تخصیص",
    releasedAt: "زمان آزادسازی",

    status: "وضعیت",

    actions: "عملیات",
    view: "مشاهده",
    edit: "ویرایش",
    save: "ذخیره",
    cancel: "انصراف",
    close: "بستن",

    allStatuses: "همه وضعیت‌ها",
    allServices: "همه خدمات مشترکین",

    selectCustomerService:
      "خدمت مشترک را انتخاب کنید",

    selectResource:
      "IP Pool یا IP Prefix را انتخاب کنید",

    loading: "در حال بارگذاری...",
    loadingServices:
      "در حال بارگذاری خدمات مشترکین...",

    loadingResources:
      "در حال بارگذاری منابع IP بخش NOC...",

    noRecords:
      "هیچ تخصیص IP ثبت نشده است.",

    noServices:
      "هیچ خدمت مشترکی موجود نیست.",

    noResources:
      "هیچ IP Pool یا IP Prefix موجود نیست.",

    customerServiceRequired:
      "انتخاب خدمت مشترک الزامی است.",

    ipAddressRequired:
      "آدرس IP الزامی است.",

    invalidCidr:
      "CIDR Prefix باید عدد صحیح بین ۰ تا ۱۲۸ باشد.",

    invalidVlan:
      "VLAN ID باید عدد صحیح باشد.",

    created:
      "تخصیص IP با موفقیت ثبت شد.",

    updated:
      "تخصیص IP با موفقیت ویرایش شد.",

    loadFailed:
      "بارگذاری تخصیص‌های IP ممکن نشد.",

    saveFailed:
      "ذخیره تخصیص IP ممکن نشد.",

    previous: "قبلی",
    next: "بعدی",
    page: "صفحه",
    records: "رکورد",

    optional: "اختیاری",

    static_ipv4: "IPv4 ثابت",
    static_ipv6: "IPv6 ثابت",
    pppoe_framed: "IP ثابت PPPoE",
    subnet_prefix: "Subnet / Prefix",
    cgnat: "CGNAT",

    active: "فعال",
    reserved: "رزروشده",
    released: "آزادشده",

    ip_pool: "IP Pool",
    ip_prefix: "IP Prefix",
  },

  ps: {
    title: "د IP پتو ټاکنه",
    subtitle:
      "د NOC د IP سرچینو په وسیله د پېرودونکو خدماتو ته IPv4/IPv6، Prefix، Gateway، DNS او VLAN وټاکئ.",

    newAssignment: "نوې IP ټاکنه",
    createAssignment: "IP ټاکنه ثبت کړئ",
    editAssignment: "IP ټاکنه سمول",
    assignmentDetails: "د IP ټاکنې معلومات",

    customer: "پېرودونکی",
    customerService: "د پېرودونکي خدمت",
    serviceIdentifier: "د خدمت پېژند",

    networkResource: "د NOC د IP سرچینه",
    noResource: "د NOC سرچینه نه ده ټاکل شوې",

    resourceType: "د سرچینې ډول",
    resourceStatus: "د سرچینې حالت",

    assignmentType: "د ټاکنې ډول",

    ipAddress: "IP پته",
    subnetMask: "Subnet Mask",
    cidrPrefix: "CIDR Prefix",

    gateway: "Gateway",
    primaryDns: "اصلي DNS",
    secondaryDns: "دوهم DNS",

    vlanId: "VLAN ID",

    assignedAt: "د ټاکنې وخت",
    releasedAt: "د خوشې کېدو وخت",

    status: "حالت",

    actions: "کړنې",
    view: "کتل",
    edit: "سمول",
    save: "خوندي کول",
    cancel: "لغوه",
    close: "بندول",

    allStatuses: "ټول حالتونه",
    allServices: "د پېرودونکو ټول خدمتونه",

    selectCustomerService:
      "د پېرودونکي خدمت وټاکئ",

    selectResource:
      "IP Pool یا IP Prefix وټاکئ",

    loading: "بارېږي...",
    loadingServices:
      "د پېرودونکو خدمتونه بارېږي...",

    loadingResources:
      "د NOC د IP سرچینې بارېږي...",

    noRecords:
      "د IP هېڅ ټاکنه نشته.",

    noServices:
      "د پېرودونکي هېڅ خدمت نشته.",

    noResources:
      "IP Pool یا IP Prefix سرچینه نشته.",

    customerServiceRequired:
      "د پېرودونکي خدمت ټاکل اړین دي.",

    ipAddressRequired:
      "IP پته اړینه ده.",

    invalidCidr:
      "CIDR Prefix باید له ۰ څخه تر ۱۲۸ پورې صحیح عدد وي.",

    invalidVlan:
      "VLAN ID باید صحیح عدد وي.",

    created:
      "IP ټاکنه په بریالیتوب ثبت شوه.",

    updated:
      "IP ټاکنه په بریالیتوب بدله شوه.",

    loadFailed:
      "د IP ټاکنې ونه لوستل شوې.",

    saveFailed:
      "IP ټاکنه خوندي نه شوه.",

    previous: "مخکینی",
    next: "بل",
    page: "پاڼه",
    records: "ریکارډونه",

    optional: "اختیاري",

    static_ipv4: "ثابت IPv4",
    static_ipv6: "ثابت IPv6",
    pppoe_framed: "PPPoE Framed IP",
    subnet_prefix: "Subnet / Prefix",
    cgnat: "CGNAT",

    active: "فعال",
    reserved: "رزرف شوی",
    released: "خوشې شوی",

    ip_pool: "IP Pool",
    ip_prefix: "IP Prefix",
  },
} as const;


function initialForm(): IPAssignmentForm {
  return {
    customer_service: "",

    ip_resource_id: "",

    assignment_type:
      "static_ipv4",

    ip_address: "",
    subnet_mask: "",

    cidr_prefix: "",

    gateway: "",
    primary_dns: "",
    secondary_dns: "",

    vlan_id: "",

    assigned_at: "",
    released_at: "",

    status: "active",
  };
}


function toDateTimeInput(
  value?: string | null,
): string {
  if (!value) return "";

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "";
  }

  const local = new Date(
    date.getTime() -
      date.getTimezoneOffset() *
        60_000,
  );

  return local
    .toISOString()
    .slice(0, 16);
}


function toApiDateTime(
  value: string,
): string | null {
  if (!value) return null;

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }

  return date.toISOString();
}


function statusClass(
  status: AssignmentStatus,
): string {
  if (status === "active") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  }

  if (status === "reserved") {
    return "border-amber-400/20 bg-amber-400/10 text-amber-300";
  }

  return "border-slate-400/20 bg-slate-400/10 text-slate-300";
}


export function IPAssignmentList({
  session,
}: {
  session: Session;
}) {
  const {
    language,
  } = useTranslation();

  const lang =
    language === "fa" ||
    language === "ps"
      ? language
      : "en";

  const ui = copy[lang];


  const [
    data,
    setData,
  ] =
    useState<
      Paginated<IPAssignment>
    >({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });


  const [
    customerServices,
    setCustomerServices,
  ] =
    useState<
      CustomerServiceOption[]
    >([]);


  const [
    networkResources,
    setNetworkResources,
  ] =
    useState<
      NetworkResourceOption[]
    >([]);


  const [
    page,
    setPage,
  ] =
    useState(1);


  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState("");


  const [
    customerServiceFilter,
    setCustomerServiceFilter,
  ] =
    useState("");


  const [
    modalMode,
    setModalMode,
  ] =
    useState<ModalMode>(null);


  const [
    selected,
    setSelected,
  ] =
    useState<
      IPAssignment | null
    >(null);


  const [
    form,
    setForm,
  ] =
    useState<IPAssignmentForm>(
      initialForm(),
    );


  const [
    loading,
    setLoading,
  ] =
    useState(false);


  const [
    serviceLoading,
    setServiceLoading,
  ] =
    useState(false);


  const [
    resourceLoading,
    setResourceLoading,
  ] =
    useState(false);


  const [
    saving,
    setSaving,
  ] =
    useState(false);


  const [
    error,
    setError,
  ] =
    useState("");


  const [
    notice,
    setNotice,
  ] =
    useState<Notice | null>(
      null,
    );


  const [
    refreshKey,
    setRefreshKey,
  ] =
    useState(0);


  useEffect(() => {
    let cancelled = false;

    async function loadServices() {
      setServiceLoading(true);

      try {
        const response =
          await collectAllPages<
            CustomerServiceOption
          >(
            (params) =>
              fetchers.customerServices(
                session,
                params,
              ),
            "",
          );

        if (!cancelled) {
          setCustomerServices(
            response.results,
          );
        }
      } catch {
        if (!cancelled) {
          setCustomerServices([]);
        }
      } finally {
        if (!cancelled) {
          setServiceLoading(false);
        }
      }
    }

    void loadServices();

    return () => {
      cancelled = true;
    };
  }, [
    session.access,
    session.tenantId,
    session.companyId,
  ]);


  useEffect(() => {
    let cancelled = false;

    async function loadResources() {
      setResourceLoading(true);

      try {
        const response =
          await collectAllPages<
            NetworkResourceOption
          >(
            (params) =>
              fetchers.noc(
                session,
                params,
              ),
            "",
          );

        const filtered =
          response.results
            .filter(
              (row) =>
                row.resource_type ===
                  "ip_pool" ||
                row.resource_type ===
                  "ip_prefix",
            )
            .sort((a, b) => {
              const left = [
                a.resource_type,
                a.code,
                a.name,
              ]
                .filter(Boolean)
                .join("|");

              const right = [
                b.resource_type,
                b.code,
                b.name,
              ]
                .filter(Boolean)
                .join("|");

              return left.localeCompare(
                right,
              );
            });

        if (!cancelled) {
          setNetworkResources(
            filtered,
          );
        }
      } catch {
        if (!cancelled) {
          setNetworkResources([]);
        }
      } finally {
        if (!cancelled) {
          setResourceLoading(false);
        }
      }
    }

    void loadResources();

    return () => {
      cancelled = true;
    };
  }, [
    session.access,
    session.tenantId,
    session.companyId,
  ]);


  useEffect(() => {
    let cancelled = false;

    async function loadAssignments() {
      setLoading(true);
      setError("");

      try {
        const params =
          new URLSearchParams();

        params.set(
          "page",
          String(page),
        );

        params.set(
          "page_size",
          String(PAGE_SIZE),
        );

        if (statusFilter) {
          params.set(
            "status",
            statusFilter,
          );
        }

        if (
          customerServiceFilter
        ) {
          params.set(
            "customer_service",
            customerServiceFilter,
          );
        }

        const response =
          await fetchers
            .customerServiceIpAssignments(
              session,
              `?${params.toString()}`,
            );

        if (!cancelled) {
          setData(
            response as Paginated<
              IPAssignment
            >,
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : ui.loadFailed,
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadAssignments();

    return () => {
      cancelled = true;
    };
  }, [
    session.access,
    session.tenantId,
    session.companyId,
    page,
    statusFilter,
    customerServiceFilter,
    refreshKey,
    ui.loadFailed,
  ]);


  const pageCount =
    Math.max(
      1,
      Math.ceil(
        data.count /
          PAGE_SIZE,
      ),
    );


  const selectedService =
    useMemo(
      () =>
        customerServices.find(
          (row) =>
            row.id ===
            form.customer_service,
        ) || null,
      [
        customerServices,
        form.customer_service,
      ],
    );


  const resourceById =
    useMemo(() => {
      const map =
        new Map<
          string,
          NetworkResourceOption
        >();

      for (
        const row
        of networkResources
      ) {
        map.set(
          row.id,
          row,
        );
      }

      return map;
    }, [
      networkResources,
    ]);


  function assignmentTypeLabel(
    value: AssignmentType,
  ): string {
    return ui[value];
  }


  function statusLabel(
    value: AssignmentStatus,
  ): string {
    return ui[value];
  }


  function resourceTypeLabel(
    value?: string,
  ): string {
    if (value === "ip_pool") {
      return ui.ip_pool;
    }

    if (value === "ip_prefix") {
      return ui.ip_prefix;
    }

    return value || "—";
  }


  function formatDate(
    value?: string | null,
  ): string {
    if (!value) return "—";

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      return value;
    }

    try {
      return new Intl.DateTimeFormat(
        lang === "fa"
          ? "fa-AF"
          : lang === "ps"
            ? "ps-AF"
            : "en-GB",
        {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        },
      ).format(date);
    } catch {
      return date.toLocaleString();
    }
  }


  function serviceLabel(
    row: CustomerServiceOption,
  ): string {
    return [
      row.customer_name,
      row.identifier,
      row.service_name,
    ]
      .filter(Boolean)
      .join(" — ");
  }


  function resourceLabel(
    row: NetworkResourceOption,
  ): string {
    const identity = [
      row.code,
      row.name,
    ]
      .filter(Boolean)
      .join(" — ");

    const detail = [
      resourceTypeLabel(
        row.resource_type,
      ),
      row.status,
    ]
      .filter(Boolean)
      .join(" · ");

    return [
      identity || row.id,
      detail,
    ]
      .filter(Boolean)
      .join(" | ");
  }


  function updateForm<
    K extends keyof IPAssignmentForm,
  >(
    key: K,
    value: IPAssignmentForm[K],
  ) {
    setForm(
      (current) => ({
        ...current,
        [key]: value,
      }),
    );
  }


  function openCreate() {
    setSelected(null);
    setForm(initialForm());
    setError("");
    setNotice(null);
    setModalMode("create");
  }


  function openView(
    row: IPAssignment,
  ) {
    setSelected(row);
    setError("");
    setNotice(null);
    setModalMode("view");
  }


  function openEdit(
    row: IPAssignment,
  ) {
    setSelected(row);

    setForm({
      customer_service:
        row.customer_service,

      ip_resource_id:
        row.ip_resource_id || "",

      assignment_type:
        row.assignment_type,

      ip_address:
        row.ip_address || "",

      subnet_mask:
        row.subnet_mask || "",

      cidr_prefix:
        row.cidr_prefix ===
        null
          ? ""
          : String(
              row.cidr_prefix,
            ),

      gateway:
        row.gateway || "",

      primary_dns:
        row.primary_dns || "",

      secondary_dns:
        row.secondary_dns || "",

      vlan_id:
        row.vlan_id === null
          ? ""
          : String(
              row.vlan_id,
            ),

      assigned_at:
        toDateTimeInput(
          row.assigned_at,
        ),

      released_at:
        toDateTimeInput(
          row.released_at,
        ),

      status:
        row.status,
    });

    setError("");
    setNotice(null);
    setModalMode("edit");
  }


  function closeModal() {
    if (saving) return;

    setModalMode(null);
    setSelected(null);
    setError("");
  }


  async function submit() {
    if (
      !form.customer_service
    ) {
      setError(
        ui.customerServiceRequired,
      );

      return;
    }


    if (
      !form.ip_address.trim()
    ) {
      setError(
        ui.ipAddressRequired,
      );

      return;
    }


    let cidrPrefix:
      number | null = null;

    if (
      form.cidr_prefix.trim()
    ) {
      const parsed =
        Number(
          form.cidr_prefix,
        );

      if (
        !Number.isInteger(
          parsed,
        ) ||
        parsed < 0 ||
        parsed > 128
      ) {
        setError(
          ui.invalidCidr,
        );

        return;
      }

      cidrPrefix = parsed;
    }


    let vlanId:
      number | null = null;

    if (
      form.vlan_id.trim()
    ) {
      const parsed =
        Number(
          form.vlan_id,
        );

      if (
        !Number.isInteger(
          parsed,
        )
      ) {
        setError(
          ui.invalidVlan,
        );

        return;
      }

      vlanId = parsed;
    }


    const payload: Record<
      string,
      unknown
    > = {
      customer_service:
        form.customer_service,

      ip_resource_id:
        form.ip_resource_id,

      assignment_type:
        form.assignment_type,

      ip_address:
        form.ip_address.trim(),

      subnet_mask:
        form.subnet_mask.trim(),

      cidr_prefix:
        cidrPrefix,

      gateway:
        form.gateway.trim(),

      primary_dns:
        form.primary_dns.trim(),

      secondary_dns:
        form.secondary_dns.trim(),

      vlan_id:
        vlanId,

      released_at:
        toApiDateTime(
          form.released_at,
        ),

      status:
        form.status,
    };


    if (
      form.assigned_at
    ) {
      payload.assigned_at =
        toApiDateTime(
          form.assigned_at,
        );
    }


    setSaving(true);
    setError("");
    setNotice(null);

    try {
      if (
        modalMode ===
        "create"
      ) {
        await ipAssignmentApi
          .create(
            session,
            payload,
          );

        setPage(1);

        setNotice({
          type: "success",
          message: ui.created,
        });
      } else if (
        modalMode ===
          "edit" &&
        selected
      ) {
        await ipAssignmentApi
          .update(
            session,
            selected.id,
            payload,
          );

        setNotice({
          type: "success",
          message: ui.updated,
        });
      }

      setModalMode(null);
      setSelected(null);

      setRefreshKey(
        (value) =>
          value + 1,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : ui.saveFailed,
      );
    } finally {
      setSaving(false);
    }
  }


  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            {ui.title}
          </h2>

          <p className="mt-1 max-w-3xl text-sm font-medium text-slate-500">
            {ui.subtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-cyan-500 px-5 text-sm font-black text-slate-950 transition hover:bg-cyan-400 active:scale-[.98]"
        >
          {ui.newAssignment}
        </button>
      </div>


      {notice && (
        <div
          className={
            notice.type ===
            "success"
              ? "rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-300"
              : "rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm font-bold text-rose-300"
          }
        >
          {notice.message}
        </div>
      )}


      <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-4 lg:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-xs font-bold text-slate-500">
            {ui.status}
          </span>

          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(
                event.target.value,
              );

              setPage(1);
            }}
            className="glass-input w-full"
          >
            <option value="">
              {ui.allStatuses}
            </option>

            {(
              [
                "active",
                "reserved",
                "released",
              ] as AssignmentStatus[]
            ).map(
              (status) => (
                <option
                  key={status}
                  value={status}
                >
                  {statusLabel(
                    status,
                  )}
                </option>
              ),
            )}
          </select>
        </label>


        <label className="space-y-1.5">
          <span className="text-xs font-bold text-slate-500">
            {ui.customerService}
          </span>

          <select
            value={
              customerServiceFilter
            }
            onChange={(event) => {
              setCustomerServiceFilter(
                event.target.value,
              );

              setPage(1);
            }}
            className="glass-input w-full"
          >
            <option value="">
              {ui.allServices}
            </option>

            {customerServices.map(
              (row) => (
                <option
                  key={row.id}
                  value={row.id}
                >
                  {serviceLabel(
                    row,
                  )}
                </option>
              ),
            )}
          </select>
        </label>
      </div>


      {error &&
        !modalMode && (
          <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm font-bold text-rose-300">
            {error}
          </div>
        )}


      <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40">
        <div className="overflow-x-auto">
          <table className="min-w-[1380px] w-full text-sm">
            <thead className="border-b border-white/10 bg-white/[.03]">
              <tr className="text-xs font-black text-slate-500">
                <th className="px-4 py-4 text-start">
                  {ui.ipAddress}
                </th>

                <th className="px-4 py-4 text-start">
                  {ui.customer}
                </th>

                <th className="px-4 py-4 text-start">
                  {ui.serviceIdentifier}
                </th>

                <th className="px-4 py-4 text-start">
                  {ui.assignmentType}
                </th>

                <th className="px-4 py-4 text-start">
                  {ui.networkResource}
                </th>

                <th className="px-4 py-4 text-start">
                  {ui.cidrPrefix}
                </th>

                <th className="px-4 py-4 text-start">
                  {ui.vlanId}
                </th>

                <th className="px-4 py-4 text-start">
                  {ui.status}
                </th>

                <th className="px-4 py-4 text-start">
                  {ui.assignedAt}
                </th>

                <th className="px-4 py-4 text-start">
                  {ui.actions}
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-12 text-center font-bold text-slate-500"
                  >
                    {ui.loading}
                  </td>
                </tr>
              ) : data.results.length ===
                0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-12 text-center font-bold text-slate-500"
                  >
                    {ui.noRecords}
                  </td>
                </tr>
              ) : (
                data.results.map(
                  (row) => {
                    const resource =
                      row.ip_resource_id
                        ? resourceById.get(
                            row.ip_resource_id,
                          )
                        : undefined;

                    return (
                      <tr
                        key={row.id}
                        className="transition hover:bg-white/[.025]"
                      >
                        <td className="px-4 py-4 font-mono text-xs font-bold text-cyan-300">
                          {row.ip_address ||
                            "—"}
                        </td>

                        <td className="px-4 py-4 font-bold text-white">
                          {row.customer_name ||
                            "—"}
                        </td>

                        <td className="px-4 py-4 font-mono text-xs text-cyan-300">
                          {row.service_identifier ||
                            "—"}
                        </td>

                        <td className="px-4 py-4 text-slate-300">
                          {assignmentTypeLabel(
                            row.assignment_type,
                          )}
                        </td>

                        <td className="px-4 py-4 text-xs text-slate-300">
                          {resource
                            ? resourceLabel(
                                resource,
                              )
                            : row.ip_resource_id ||
                              "—"}
                        </td>

                        <td className="px-4 py-4 font-mono text-slate-300">
                          {row.cidr_prefix ??
                            "—"}
                        </td>

                        <td className="px-4 py-4 font-mono text-slate-300">
                          {row.vlan_id ??
                            "—"}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-black ${statusClass(
                              row.status,
                            )}`}
                          >
                            {statusLabel(
                              row.status,
                            )}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-slate-400">
                          {formatDate(
                            row.assigned_at,
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                openView(
                                  row,
                                )
                              }
                              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:bg-white/10"
                            >
                              {ui.view}
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                openEdit(
                                  row,
                                )
                              }
                              className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-bold text-cyan-300 transition hover:bg-cyan-400/15"
                            >
                              {ui.edit}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                )
              )}
            </tbody>
          </table>
        </div>


        <div className="flex flex-col gap-3 border-t border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs font-bold text-slate-500">
            {ui.page}{" "}
            {page} /{" "}
            {pageCount}
            {" · "}
            {data.count}{" "}
            {ui.records}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={
                !data.previous ||
                loading
              }
              onClick={() =>
                setPage(
                  (value) =>
                    Math.max(
                      1,
                      value - 1,
                    ),
                )
              }
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {ui.previous}
            </button>

            <button
              type="button"
              disabled={
                !data.next ||
                loading
              }
              onClick={() =>
                setPage(
                  (value) =>
                    value + 1,
                )
              }
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {ui.next}
            </button>
          </div>
        </div>
      </div>


      {modalMode && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[2rem] border border-white/10 bg-slate-950 p-6 shadow-2xl lg:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-white">
                  {modalMode ===
                  "create"
                    ? ui.createAssignment
                    : modalMode ===
                        "edit"
                      ? ui.editAssignment
                      : ui.assignmentDetails}
                </h3>

                {selected && (
                  <p className="mt-1 text-xs font-medium text-slate-500">
                    {selected.ip_address}
                    {" · "}
                    {selected.customer_name}
                    {" · "}
                    {selected.service_identifier}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300"
              >
                {ui.close}
              </button>
            </div>


            {error && (
              <div className="mb-5 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm font-bold text-rose-300">
                {error}
              </div>
            )}


            {modalMode ===
            "view" ? (
              selected && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Info
                    label={
                      ui.ipAddress
                    }
                    value={
                      selected.ip_address
                    }
                  />

                  <Info
                    label={
                      ui.assignmentType
                    }
                    value={assignmentTypeLabel(
                      selected.assignment_type,
                    )}
                  />

                  <Info
                    label={
                      ui.status
                    }
                    value={statusLabel(
                      selected.status,
                    )}
                  />

                  <Info
                    label={
                      ui.customer
                    }
                    value={
                      selected.customer_name
                    }
                  />

                  <Info
                    label={
                      ui.serviceIdentifier
                    }
                    value={
                      selected.service_identifier
                    }
                  />

                  <Info
                    label={
                      ui.networkResource
                    }
                    value={
                      selected.ip_resource_id
                        ? (
                            resourceById.get(
                              selected.ip_resource_id,
                            )
                              ? resourceLabel(
                                  resourceById.get(
                                    selected.ip_resource_id,
                                  )!,
                                )
                              : selected.ip_resource_id
                          )
                        : ui.noResource
                    }
                  />

                  <Info
                    label={
                      ui.subnetMask
                    }
                    value={
                      selected.subnet_mask ||
                      "—"
                    }
                  />

                  <Info
                    label={
                      ui.cidrPrefix
                    }
                    value={
                      selected.cidr_prefix ===
                      null
                        ? "—"
                        : String(
                            selected.cidr_prefix,
                          )
                    }
                  />

                  <Info
                    label={
                      ui.gateway
                    }
                    value={
                      selected.gateway ||
                      "—"
                    }
                  />

                  <Info
                    label={
                      ui.primaryDns
                    }
                    value={
                      selected.primary_dns ||
                      "—"
                    }
                  />

                  <Info
                    label={
                      ui.secondaryDns
                    }
                    value={
                      selected.secondary_dns ||
                      "—"
                    }
                  />

                  <Info
                    label={
                      ui.vlanId
                    }
                    value={
                      selected.vlan_id ===
                      null
                        ? "—"
                        : String(
                            selected.vlan_id,
                          )
                    }
                  />

                  <Info
                    label={
                      ui.assignedAt
                    }
                    value={formatDate(
                      selected.assigned_at,
                    )}
                  />

                  <Info
                    label={
                      ui.releasedAt
                    }
                    value={formatDate(
                      selected.released_at,
                    )}
                  />
                </div>
              )
            ) : (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                <label className="space-y-1.5 md:col-span-2 lg:col-span-3">
                  <span className="text-xs font-bold text-slate-500">
                    {ui.customerService}
                  </span>

                  <select
                    value={
                      form.customer_service
                    }
                    disabled={
                      modalMode ===
                        "edit" ||
                      serviceLoading
                    }
                    onChange={(event) =>
                      updateForm(
                        "customer_service",
                        event.target.value,
                      )
                    }
                    className="glass-input w-full disabled:opacity-60"
                  >
                    <option value="">
                      {serviceLoading
                        ? ui.loadingServices
                        : ui.selectCustomerService}
                    </option>

                    {customerServices.map(
                      (row) => (
                        <option
                          key={row.id}
                          value={row.id}
                        >
                          {serviceLabel(
                            row,
                          )}
                        </option>
                      ),
                    )}
                  </select>

                  {!serviceLoading &&
                    customerServices.length ===
                      0 && (
                      <p className="text-xs font-medium text-amber-300">
                        {ui.noServices}
                      </p>
                    )}

                  {selectedService && (
                    <p className="text-xs font-medium text-cyan-300">
                      {serviceLabel(
                        selectedService,
                      )}
                    </p>
                  )}
                </label>


                <label className="space-y-1.5 md:col-span-2 lg:col-span-3">
                  <span className="text-xs font-bold text-slate-500">
                    {ui.networkResource}{" "}
                    ({ui.optional})
                  </span>

                  <select
                    value={
                      form.ip_resource_id
                    }
                    disabled={
                      resourceLoading
                    }
                    onChange={(event) =>
                      updateForm(
                        "ip_resource_id",
                        event.target.value,
                      )
                    }
                    className="glass-input w-full disabled:opacity-60"
                  >
                    <option value="">
                      {resourceLoading
                        ? ui.loadingResources
                        : ui.noResource}
                    </option>

                    {networkResources.map(
                      (row) => (
                        <option
                          key={row.id}
                          value={row.id}
                        >
                          {resourceLabel(
                            row,
                          )}
                        </option>
                      ),
                    )}
                  </select>

                  {!resourceLoading &&
                    networkResources.length ===
                      0 && (
                      <p className="text-xs font-medium text-amber-300">
                        {ui.noResources}
                      </p>
                    )}
                </label>


                <label className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-500">
                    {ui.assignmentType}
                  </span>

                  <select
                    value={
                      form.assignment_type
                    }
                    onChange={(event) =>
                      updateForm(
                        "assignment_type",
                        event.target
                          .value as AssignmentType,
                      )
                    }
                    className="glass-input w-full"
                  >
                    {(
                      [
                        "static_ipv4",
                        "static_ipv6",
                        "pppoe_framed",
                        "subnet_prefix",
                        "cgnat",
                      ] as AssignmentType[]
                    ).map(
                      (value) => (
                        <option
                          key={value}
                          value={value}
                        >
                          {assignmentTypeLabel(
                            value,
                          )}
                        </option>
                      ),
                    )}
                  </select>
                </label>


                <TextField
                  label={
                    ui.ipAddress
                  }
                  value={
                    form.ip_address
                  }
                  onChange={(value) =>
                    updateForm(
                      "ip_address",
                      value,
                    )
                  }
                />


                <label className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-500">
                    {ui.status}
                  </span>

                  <select
                    value={
                      form.status
                    }
                    onChange={(event) =>
                      updateForm(
                        "status",
                        event.target
                          .value as AssignmentStatus,
                      )
                    }
                    className="glass-input w-full"
                  >
                    {(
                      [
                        "active",
                        "reserved",
                        "released",
                      ] as AssignmentStatus[]
                    ).map(
                      (value) => (
                        <option
                          key={value}
                          value={value}
                        >
                          {statusLabel(
                            value,
                          )}
                        </option>
                      ),
                    )}
                  </select>
                </label>


                <TextField
                  label={`${ui.subnetMask} (${ui.optional})`}
                  value={
                    form.subnet_mask
                  }
                  onChange={(value) =>
                    updateForm(
                      "subnet_mask",
                      value,
                    )
                  }
                />


                <NumberField
                  label={`${ui.cidrPrefix} (${ui.optional})`}
                  value={
                    form.cidr_prefix
                  }
                  min={0}
                  max={128}
                  onChange={(value) =>
                    updateForm(
                      "cidr_prefix",
                      value,
                    )
                  }
                />


                <TextField
                  label={`${ui.gateway} (${ui.optional})`}
                  value={
                    form.gateway
                  }
                  onChange={(value) =>
                    updateForm(
                      "gateway",
                      value,
                    )
                  }
                />


                <TextField
                  label={`${ui.primaryDns} (${ui.optional})`}
                  value={
                    form.primary_dns
                  }
                  onChange={(value) =>
                    updateForm(
                      "primary_dns",
                      value,
                    )
                  }
                />


                <TextField
                  label={`${ui.secondaryDns} (${ui.optional})`}
                  value={
                    form.secondary_dns
                  }
                  onChange={(value) =>
                    updateForm(
                      "secondary_dns",
                      value,
                    )
                  }
                />


                <NumberField
                  label={`${ui.vlanId} (${ui.optional})`}
                  value={
                    form.vlan_id
                  }
                  onChange={(value) =>
                    updateForm(
                      "vlan_id",
                      value,
                    )
                  }
                />


                <DateTimeField
                  label={`${ui.assignedAt} (${ui.optional})`}
                  value={
                    form.assigned_at
                  }
                  onChange={(value) =>
                    updateForm(
                      "assigned_at",
                      value,
                    )
                  }
                />


                <DateTimeField
                  label={`${ui.releasedAt} (${ui.optional})`}
                  value={
                    form.released_at
                  }
                  onChange={(value) =>
                    updateForm(
                      "released_at",
                      value,
                    )
                  }
                />
              </div>
            )}


            <div className="mt-7 flex flex-wrap justify-end gap-3">
              {modalMode ===
              "view" ? (
                <>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold text-slate-300"
                  >
                    {ui.close}
                  </button>

                  {selected && (
                    <button
                      type="button"
                      onClick={() =>
                        openEdit(
                          selected,
                        )
                      }
                      className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-black text-slate-950"
                    >
                      {ui.edit}
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={saving}
                    className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold text-slate-300 disabled:opacity-50"
                  >
                    {ui.cancel}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      void submit()
                    }
                    disabled={saving}
                    className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-black text-slate-950 disabled:opacity-50"
                  >
                    {saving
                      ? ui.loading
                      : ui.save}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[.03] p-4">
      <div className="text-xs font-bold text-slate-500">
        {label}
      </div>

      <div className="mt-2 break-words text-sm font-bold text-slate-100">
        {value || "—"}
      </div>
    </div>
  );
}


function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (
    value: string,
  ) => void;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-bold text-slate-500">
        {label}
      </span>

      <input
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
        className="glass-input w-full"
      />
    </label>
  );
}


function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: string;
  min?: number;
  max?: number;
  onChange: (
    value: string,
  ) => void;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-bold text-slate-500">
        {label}
      </span>

      <input
        type="number"
        step={1}
        min={min}
        max={max}
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
        className="glass-input w-full"
      />
    </label>
  );
}


function DateTimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (
    value: string,
  ) => void;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-bold text-slate-500">
        {label}
      </span>

      <input
        type="datetime-local"
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
        className="glass-input w-full"
      />
    </label>
  );
}
