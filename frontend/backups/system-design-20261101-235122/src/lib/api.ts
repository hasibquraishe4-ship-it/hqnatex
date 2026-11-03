const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export const SESSION_STORAGE_KEY = "hqnatex.erp.session";
export const SESSION_UPDATED_EVENT = "hqnatex:session-updated";
export const SESSION_EXPIRED_EVENT = "hqnatex:session-expired";

export type Session = {
  access: string;
  refresh: string;
  tenantId: string;
  tenantCode: string;
  tenantName: string;
  companyId?: string;
};

export type HealthResponse = {
  status: string;
  service?: string;
  version?: string;
};

export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

type RefreshResponse = {
  access: string;
  refresh?: string;
};

let refreshInFlight: Promise<RefreshResponse> | null = null;

function authorizationHeaderName(): string {
  return import.meta.env.DEV && !API_BASE
    ? "X-HQNATEX-Authorization"
    : "Authorization";
}

function publishSession(session: Session) {
  if (typeof window === "undefined") return;

  const snapshot = { ...session };

  localStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify(snapshot),
  );

  window.dispatchEvent(
    new CustomEvent<Session>(
      SESSION_UPDATED_EVENT,
      { detail: snapshot },
    ),
  );
}

function publishSessionExpired() {
  if (typeof window === "undefined") return;

  localStorage.removeItem(
    SESSION_STORAGE_KEY,
  );

  window.dispatchEvent(
    new Event(SESSION_EXPIRED_EVENT),
  );
}

async function refreshSession(
  session: Session,
): Promise<boolean> {
  if (!session.refresh) return false;

  try {
    if (!refreshInFlight) {
      refreshInFlight = (
        async () => {
          const response = await fetch(
            `${API_BASE}/api/v1/auth/refresh`,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                refresh: session.refresh,
              }),
            },
          );

          const body =
            await response
              .json()
              .catch(() => ({}));

          if (!response.ok) {
            const detail =
              typeof body?.detail === "string"
                ? body.detail
                : JSON.stringify(body);

            throw new Error(
              detail ||
                `HTTP ${response.status}`,
            );
          }

          return body as RefreshResponse;
        }
      )().finally(() => {
        refreshInFlight = null;
      });
    }

    const tokens =
      await refreshInFlight;

    if (!tokens.access) {
      return false;
    }

    session.access = tokens.access;

    if (tokens.refresh) {
      session.refresh = tokens.refresh;
    }

    publishSession(session);

    return true;
  } catch {
    publishSessionExpired();
    return false;
  }
}

async function request<T>(
  path: string,
  options: RequestInit,
  session: Session | undefined,
  allowRefresh: boolean,
): Promise<T> {
  const headers =
    new Headers(options.headers);

  // HQNATEX_HR_EMPLOYEE_PHOTO_UPLOAD_V1_API
  const bodyIsFormData =
    typeof FormData !== "undefined" &&
    options.body instanceof FormData;

  if (
    !headers.has("Content-Type") &&
    options.body &&
    !bodyIsFormData
  ) {
    headers.set(
      "Content-Type",
      "application/json",
    );
  }

  if (session?.access) {
    headers.set(
      authorizationHeaderName(),
      `Bearer ${session.access}`,
    );
  }

  if (session?.tenantId) {
    headers.set(
      "X-Tenant-ID",
      session.tenantId,
    );
  }

  if (session?.companyId) {
    headers.set(
      "X-Company-ID",
      session.companyId,
    );
  }

  const response = await fetch(
    `${API_BASE}${path}`,
    {
      ...options,
      headers,
    },
  );

  const body =
    await response
      .json()
      .catch(() => ({}));

  if (
    response.status === 401 &&
    allowRefresh &&
    session?.refresh &&
    path !== "/api/v1/auth/refresh"
  ) {
    const refreshed =
      await refreshSession(session);

    if (refreshed) {
      return request<T>(
        path,
        options,
        session,
        false,
      );
    }
  }

  if (!response.ok) {
    const serializedBody =
      JSON.stringify(body);

    const detail =
      typeof body?.detail === "string" &&
      body.detail.trim()
        ? body.detail
        : serializedBody &&
            serializedBody !== "{}" &&
            serializedBody !== "[]" &&
            serializedBody !== "null"
          ? serializedBody
          : "";

    throw new Error(
      detail ||
        `HTTP ${response.status}`,
    );
  }

  return body as T;
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
  session?: Session,
): Promise<T> {
  return request<T>(
    path,
    options,
    session,
    true,
  );
}

export async function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return api<HealthResponse>("/api/v1/health/live", { signal });
}

type TenantContextResponse = {
  tenant_id: string;
  membership_id: string | null;
  companies: Array<{
    id: string;
    code: string;
    legal_name: string;
    trade_name: string;
    status: string;
    is_primary: boolean;
  }>;
};

export async function login(email: string, password: string, tenantCode: string): Promise<Session> {
  const tokens = await api<{ access: string; refresh: string }>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, tenant_code: tenantCode }),
  });

  const resolved = await api<{ tenant_id: string; tenant_code: string; tenant_name: string }>(
    "/api/v1/auth/tenant/resolve",
    { method: "POST", body: JSON.stringify({ tenant_code: tenantCode }) },
    { access: tokens.access, refresh: tokens.refresh, tenantId: "", tenantCode: "", tenantName: "" }
  );

  const baseSession: Session = {
    access: tokens.access,
    refresh: tokens.refresh,
    tenantId: resolved.tenant_id,
    tenantCode: resolved.tenant_code,
    tenantName: resolved.tenant_name,
  };

  const context = await api<TenantContextResponse>(
    "/api/v1/tenant/context",
    {},
    baseSession,
  );

  const primaryCompany = context.companies.find(
    (company) =>
      company.status === "active" &&
      company.is_primary,
  );

  return {
    ...baseSession,
    companyId: primaryCompany?.id,
  };
}
/**
 * Load every page from a paginated API endpoint.
 *
 * HQNATEX catalog selectors must not depend on a fixed page size.
 * The backend may use 50, 100, or another pagination size.
 * We follow pagination until `next` becomes null.
 */
export async function collectAllPages<T>(
  fetchPage: (
    params: string,
  ) => Promise<Paginated<T>>,
  params = "",
): Promise<Paginated<T>> {
  const normalized =
    params.startsWith("?")
      ? params.slice(1)
      : params;

  const query =
    new URLSearchParams(normalized);

  // The caller may accidentally provide a page.
  // Full collection always starts from page 1.
  query.delete("page");

  const results: T[] = [];

  let page = 1;
  let total = 0;

  while (true) {
    query.set(
      "page",
      String(page),
    );

    const queryString =
      query.toString();

    const response =
      await fetchPage(
        queryString
          ? `?${queryString}`
          : "",
      );

    if (page === 1) {
      total = response.count;
    }

    results.push(
      ...response.results,
    );

    if (
      !response.next ||
      response.results.length === 0 ||
      results.length >= response.count
    ) {
      break;
    }

    page += 1;
  }

  return {
    count:
      total || results.length,
    next: null,
    previous: null,
    results,
  };
}


// Module Fetching Helpers
export const fetchers = {
  dashboard: (session: Session) => api<any>("/api/v1/dashboard/stats", {}, session),
  customers: (session: Session, params = "") => api<Paginated<any>>(`/api/v1/customers/${params}`, {}, session),
  services: (session: Session, params = "") => api<Paginated<any>>(`/api/v1/catalog/services/${params}`, {}, session),

  allServices: (
    session: Session,
    params = "",
  ) =>
    collectAllPages<any>(
      (pageParams) =>
        api<Paginated<any>>(
          `/api/v1/catalog/services/${pageParams}`,
          {},
          session,
        ),
      params,
    ),

  packages: (session: Session, params = "") => api<Paginated<any>>(`/api/v1/catalog/packages/${params}`, {}, session),

  allPackages: (
    session: Session,
    params = "",
  ) =>
    collectAllPages<any>(
      (pageParams) =>
        api<Paginated<any>>(
          `/api/v1/catalog/packages/${pageParams}`,
          {},
          session,
        ),
      params,
    ),
  sales: (session: Session, params = "") => api<Paginated<any>>(`/api/v1/sales/${params}`, {}, session),
  saleItems: (session: Session, params = "") =>
    api<Paginated<any>>(
      `/api/v1/sale-items/${params}`,
      {},
      session,
    ),
  invoices: (session: Session, params = "") => api<Paginated<any>>(`/api/v1/billing/invoices/${params}`, {}, session),
  payments: (session: Session, params = "") => api<Paginated<any>>(`/api/v1/billing/payments/${params}`, {}, session),
  paymentAllocations: (session: Session, params = "") =>
    api<Paginated<any>>(
      `/api/v1/billing/payment-allocations/${params}`,
      {},
      session,
    ),
  revenue: (session: Session, params = "") => api<Paginated<any>>(`/api/v1/revenue/transactions/${params}`, {}, session),
  revenueAllocations: (session: Session, params = "") => api<Paginated<any>>(`/api/v1/revenue/allocations/${params}`, {}, session),
  shareRules: (session: Session, params = "") => api<Paginated<any>>(`/api/v1/revenue/share-rules/${params}`, {}, session),
  agencies: (session: Session, params = "") => api<Paginated<any>>(`/api/v1/agencies/${params}`, {}, session),
  partners: (session: Session, params = "") => api<Paginated<any>>(`/api/v1/partners/${params}`, {}, session),
  accounts: (session: Session, params = "") => api<Paginated<any>>(`/api/v1/finance/accounts/${params}`, {}, session),
  noc: (session: Session, params = "") => api<Paginated<any>>(`/api/v1/noc/resources/${params}`, {}, session),
  users: (session: Session, params = "") => api<Paginated<any>>(`/api/v1/iam/memberships/${params}`, {}, session),
  branches: (session: Session, params = "") => api<Paginated<any>>(`/api/v1/branches/${params}`, {}, session),
  receivables: (session: Session, params = "") => api<Paginated<any>>(`/api/v1/billing/receivables/${params}`, {}, session),
  customerServices: (session: Session, params = "") => api<Paginated<any>>(`/api/v1/customer-services/${params}`, {}, session),
  customerServiceTechnicalValues: (session: Session, params = "") =>
    api<Paginated<any>>(
      `/api/v1/customer-service-technical-values/${params}`,
      {},
      session,
    ),
  customerServiceChangeRequests: (session: Session, params = "") =>
    api<Paginated<any>>(
      `/api/v1/customer-service-change-requests/${params}`,
      {},
      session,
    ),
  customerServicePackageHistory: (session: Session, params = "") =>
    api<Paginated<any>>(
      `/api/v1/customer-service-package-history/${params}`,
      {},
      session,
    ),
  customerServiceStatusHistory: (session: Session, params = "") =>
    api<Paginated<any>>(
      `/api/v1/customer-service-status-history/${params}`,
      {},
      session,
    ),
  customerServiceAgencyHistory: (session: Session, params = "") =>
    api<Paginated<any>>(
      `/api/v1/customer-service-agency-history/${params}`,
      {},
      session,
    ),
  customerEquipmentAssignments: (session: Session, params = "") =>
    api<Paginated<any>>(
      `/api/v1/customer-equipment-assignments/${params}`,
      {},
      session,
    ),
  customerTickets: (session: Session, params = "") =>
    api<Paginated<any>>(
      `/api/v1/customer-tickets/${params}`,
      {},
      session,
    ),
  customerServiceActivations: (session: Session, params = "") =>
    api<Paginated<any>>(
      `/api/v1/customer-service-activations/${params}`,
      {},
      session,
    ),
  customerServiceWorkOrders: (session: Session, params = "") =>
    api<Paginated<any>>(
      `/api/v1/customer-service-work-orders/${params}`,
      {},
      session,
    ),
  customerServiceProvisioningJobs: (session: Session, params = "") =>
    api<Paginated<any>>(
      `/api/v1/customer-service-provisioning-jobs/${params}`,
      {},
      session,
    ),
  customerServiceIpAssignments: (session: Session, params = "") =>
    api<Paginated<any>>(
      `/api/v1/customer-service-ip-assignments/${params}`,
      {},
      session,
    ),
  customerServiceRadiusAccounts: (session: Session, params = "") =>
    api<Paginated<any>>(
      `/api/v1/customer-service-radius-accounts/${params}`,
      {},
      session,
    ),
  customerServiceTestResults: (session: Session, params = "") =>
    api<Paginated<any>>(
      `/api/v1/customer-service-test-results/${params}`,
      {},
      session,
    ),
  customerServiceChecklists: (session: Session, params = "") =>
    api<Paginated<any>>(
      `/api/v1/customer-service-checklists/${params}`,
      {},
      session,
    ),
  customerServiceFieldVisits: (session: Session, params = "") =>
    api<Paginated<any>>(
      `/api/v1/customer-service-field-visits/${params}`,
      {},
      session,
    ),
  customerServiceSuspensions: (session: Session, params = "") =>
    api<Paginated<any>>(
      `/api/v1/customer-service-suspensions/${params}`,
      {},
      session,
    ),
  customerServiceTerminations: (session: Session, params = "") =>
    api<Paginated<any>>(
      `/api/v1/customer-service-terminations/${params}`,
      {},
      session,
    ),
  customerServiceDecommissions: (session: Session, params = "") =>
    api<Paginated<any>>(
      `/api/v1/customer-service-decommissions/${params}`,
      {},
      session,
    ),
  customerServiceChangeHistory: (session: Session, params = "") =>
    api<Paginated<any>>(
      `/api/v1/customer-service-change-history/${params}`,
      {},
      session,
    ),
  customerServiceAttachments: (session: Session, params = "") =>
    api<Paginated<any>>(
      `/api/v1/customer-service-attachments/${params}`,
      {},
      session,
    ),
  technicalProfiles: (session: Session, params = "") =>
    api<Paginated<any>>(
      `/api/v1/catalog/technical-profiles/${params}`,
      {},
      session,
    ),
  customerServiceFullProfile: (session: Session, id: string) =>
    api<any>(
      `/api/v1/customer-services/${id}/full_profile/`,
      {},
      session,
    ),
  me: (session: Session) => api<any>("/api/v1/users/me", {}, session),
  context: (session: Session) => api<any>("/api/v1/tenant/context", {}, session),
  companies: (session: Session, params = "") => api<Paginated<any>>(`/api/v1/companies/${params}`, {}, session),
  updateCompany: (
    session: Session,
    companyId: string,
    payload: {
      code?: string;
      legal_name?: string;
      trade_name?: string;
    }
  ) =>
    api<any>(
      `/api/v1/companies/${companyId}/`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
      session
    ),
  categories: (session: Session, params = "") => api<Paginated<any>>(`/api/v1/catalog/categories/${params}`, {}, session),
  technicalFields: (session: Session, params = "") => api<Paginated<any>>(`/api/v1/catalog/technical-fields/${params}`, {}, session),
  technologies: (session: Session, params = "") =>
    api<Paginated<any>>(
      `/api/v1/catalog/technologies/${params}`,
      {},
      session,
    ),
  serviceTechnologies: (session: Session, params = "") =>
    api<Paginated<any>>(
      `/api/v1/catalog/service-technologies/${params}`,
      {},
      session,
    ),
  packagePrices: (session: Session, params = "") => api<Paginated<any>>(`/api/v1/catalog/package-prices/${params}`, {}, session),
  receipts: (session: Session, params = "") => api<Paginated<any>>(`/api/v1/billing/receipts/${params}`, {}, session),
  networkPolicies: (session: Session, params = "") => api<Paginated<any>>(`/api/v1/network/policies/${params}`, {}, session),
  auditLogs: (session: Session, params = "") => api<Paginated<any>>(`/api/v1/audit/logs/${params}`, {}, session),
  roles: (session: Session, params = "") => api<Paginated<any>>(`/api/v1/iam/roles/${params}`, {}, session),
  permissions: (session: Session, params = "") => api<Paginated<any>>(`/api/v1/iam/permissions/${params}`, {}, session),
  networkReadiness: {
    addresses: (session: Session, params = "") => api<Paginated<any>>(`/api/v1/network/address-rules/${params}`, {}, session),
    vpns: (session: Session, params = "") => api<Paginated<any>>(`/api/v1/network/vpns/${params}`, {}, session),
    devices: (session: Session, params = "") => api<Paginated<any>>(`/api/v1/network/devices/${params}`, {}, session),
    apiClients: (session: Session, params = "") => api<Paginated<any>>(`/api/v1/network/api-clients/${params}`, {}, session),
    integrations: (session: Session, params = "") => api<Paginated<any>>(`/api/v1/network/integrations/${params}`, {}, session),
    observations: (session: Session, params = "") => api<Paginated<any>>(`/api/v1/network/observations/${params}`, {}, session),
  },
};

// Company Write Helpers
export type CompanyPayload = {
  code: string;
  legal_name: string;
  trade_name?: string;
  status: "active" | "inactive" | "suspended";
  is_primary: boolean;
};

export const companyApi = {
  create: (session: Session, payload: CompanyPayload) =>
    api<any>(
      "/api/v1/companies/",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      session,
    ),

  retrieve: (session: Session, companyId: string) =>
    api<any>(
      `/api/v1/companies/${companyId}/`,
      {},
      session,
    ),

  update: (
    session: Session,
    companyId: string,
    payload: Partial<CompanyPayload>,
  ) =>
    api<any>(
      `/api/v1/companies/${companyId}/`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
      session,
    ),
};

// Branch Write Helpers
export type BranchPayload = {
  company: string;
  code: string;
  name: string;
  status: "active" | "inactive";
};

export const branchApi = {
  create: (session: Session, payload: BranchPayload) =>
    api<any>(
      "/api/v1/branches/",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      session,
    ),

  retrieve: (session: Session, branchId: string) =>
    api<any>(
      `/api/v1/branches/${branchId}/`,
      {},
      session,
    ),

  update: (
    session: Session,
    branchId: string,
    payload: Partial<BranchPayload>,
  ) =>
    api<any>(
      `/api/v1/branches/${branchId}/`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
      session,
    ),
};

// Agency Write Helpers
export type AgencyPayload = {
  company: string;
  branch: string | null;
  code: string;
  name: string;
  status: "active" | "inactive" | "suspended";
};

export const agencyApi = {
  create: (session: Session, payload: AgencyPayload) =>
    api<any>(
      "/api/v1/agencies/",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      session,
    ),

  retrieve: (session: Session, agencyId: string) =>
    api<any>(
      `/api/v1/agencies/${agencyId}/`,
      {},
      session,
    ),

  update: (
    session: Session,
    agencyId: string,
    payload: Partial<AgencyPayload>,
  ) =>
    api<any>(
      `/api/v1/agencies/${agencyId}/`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
      session,
    ),
};

// Partner Write Helpers
export type PartnerPayload = {
  company: string;
  code: string;
  legal_name: string;
  trade_name: string;
  tax_id: string;
  registration_no: string;
  phone: string;
  email: string;
  address: string;
  status: "active" | "inactive" | "suspended";
};

export const partnerApi = {
  create: (session: Session, payload: PartnerPayload) =>
    api<any>(
      "/api/v1/partners/",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      session,
    ),

  retrieve: (session: Session, partnerId: string) =>
    api<any>(
      `/api/v1/partners/${partnerId}/`,
      {},
      session,
    ),

  update: (
    session: Session,
    partnerId: string,
    payload: Partial<PartnerPayload>,
  ) =>
    api<any>(
      `/api/v1/partners/${partnerId}/`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
      session,
    ),
};

// Service Category Write Helpers
export type ServiceCategoryPayload = {
  code: string;
  name_english: string;
  name_dari: string;
  name_pashto: string;
  status: string;
};

export const serviceCategoryApi = {
  create: (
    session: Session,
    payload: ServiceCategoryPayload,
  ) =>
    api<any>(
      "/api/v1/catalog/categories/",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      session,
    ),

  retrieve: (
    session: Session,
    categoryId: string,
  ) =>
    api<any>(
      `/api/v1/catalog/categories/${categoryId}/`,
      {},
      session,
    ),

  update: (
    session: Session,
    categoryId: string,
    payload: Partial<ServiceCategoryPayload>,
  ) =>
    api<any>(
      `/api/v1/catalog/categories/${categoryId}/`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
      session,
    ),
};

// Service Write Helpers
export type ServicePayload = {
  category: string;
  code: string;
  name_english: string;
  name_dari: string;
  name_pashto: string;
  status: "active" | "inactive";
  translation_status: "complete" | "pending";
  pricing_model: string;
  technical_summary: string;
  supports_equipment: boolean | null;
  supports_noc: boolean | null;
  capabilities: Record<string, unknown>;
};

export const serviceApi = {
  create: (
    session: Session,
    payload: ServicePayload,
  ) =>
    api<any>(
      "/api/v1/catalog/services/",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      session,
    ),

  retrieve: (
    session: Session,
    serviceId: string,
  ) =>
    api<any>(
      `/api/v1/catalog/services/${serviceId}/`,
      {},
      session,
    ),

  update: (
    session: Session,
    serviceId: string,
    payload: Partial<ServicePayload>,
  ) =>
    api<any>(
      `/api/v1/catalog/services/${serviceId}/`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
      session,
    ),
};

// Service Technical Field Write Helpers
export type TechnicalFieldPayload = {
  service: string;
  key: string;
  label_english: string;
  label_dari: string;
  label_pashto: string;
  field_type:
    | "text"
    | "integer"
    | "decimal"
    | "boolean"
    | "date"
    | "ip"
    | "cidr"
    | "choice";
  required: boolean;
  options: unknown[];
  sort_order: number;
  status: string;
};

export const technicalFieldApi = {
  create: (
    session: Session,
    payload: TechnicalFieldPayload,
  ) =>
    api<any>(
      "/api/v1/catalog/technical-fields/",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      session,
    ),

  retrieve: (
    session: Session,
    fieldId: string,
  ) =>
    api<any>(
      `/api/v1/catalog/technical-fields/${fieldId}/`,
      {},
      session,
    ),

  update: (
    session: Session,
    fieldId: string,
    payload: Partial<TechnicalFieldPayload>,
  ) =>
    api<any>(
      `/api/v1/catalog/technical-fields/${fieldId}/`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
      session,
    ),
};

// Package Write Helpers
export type PackagePayload = {
  service: string;
  code: string;
  name_english: string;
  name_dari: string;
  name_pashto: string;
  package_type:
    | "unlimited"
    | "limited"
    | "contract"
    | "voucher"
    | "fee"
    | "rental";
  speed_mbps: string | null;
  quota_gb: string | null;
  period_months: number;
  status: "active" | "inactive";
  metadata: Record<string, unknown>;
};

export const packageApi = {
  create: (
    session: Session,
    payload: PackagePayload,
  ) =>
    api<any>(
      "/api/v1/catalog/packages/",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      session,
    ),

  retrieve: (
    session: Session,
    packageId: string,
  ) =>
    api<any>(
      `/api/v1/catalog/packages/${packageId}/`,
      {},
      session,
    ),

  update: (
    session: Session,
    packageId: string,
    payload: Partial<PackagePayload>,
  ) =>
    api<any>(
      `/api/v1/catalog/packages/${packageId}/`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
      session,
    ),
};

// Package Price Write Helpers
export type PackagePricePayload = {
  package: string;
  amount: string;
  currency: string;
  effective_from: string;
  effective_to: string | null;
  status: string;
  source_note: string;
};

export const packagePriceApi = {
  create: (
    session: Session,
    payload: PackagePricePayload,
  ) =>
    api<any>(
      "/api/v1/catalog/package-prices/",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      session,
    ),

  retrieve: (
    session: Session,
    priceId: string,
  ) =>
    api<any>(
      `/api/v1/catalog/package-prices/${priceId}/`,
      {},
      session,
    ),

  update: (
    session: Session,
    priceId: string,
    payload: Partial<PackagePricePayload>,
  ) =>
    api<any>(
      `/api/v1/catalog/package-prices/${priceId}/`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
      session,
    ),
};

// Customer Write Helpers
export type CustomerPayload = {
  code?: string;
  branch: string | null;
  agency: string | null;
  customer_type:
    | "individual"
    | "business"
    | "government";
  display_name: string;
  phone: string;
  email: string;
  address: string;
  external_reference: string;
  status:
    | "active"
    | "inactive"
    | "blocked";
};

export const customerApi = {
  create: (
    session: Session,
    payload: CustomerPayload,
  ) =>
    api<any>(
      "/api/v1/customers/",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      session,
    ),

  retrieve: (
    session: Session,
    customerId: string,
  ) =>
    api<any>(
      `/api/v1/customers/${customerId}/`,
      {},
      session,
    ),

  update: (
    session: Session,
    customerId: string,
    payload: Partial<CustomerPayload>,
  ) =>
    api<any>(
      `/api/v1/customers/${customerId}/`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
      session,
    ),
};

// Customer Service Write Helpers
export type CustomerServicePayload = {
  customer: string;
  service: string;
  package: string | null;
  branch: string | null;
  agency: string | null;
  identifier: string;
  username: string;
  status:
    | "draft"
    | "pending"
    | "active"
    | "suspended"
    | "terminated";
  technical_values: Record<string, unknown>;
  started_at: string | null;
  ended_at: string | null;
};

export const customerServiceApi = {
  create: (
    session: Session,
    payload: CustomerServicePayload,
  ) =>
    api<any>(
      "/api/v1/customer-services/",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      session,
    ),

  retrieve: (
    session: Session,
    customerServiceId: string,
  ) =>
    api<any>(
      `/api/v1/customer-services/${customerServiceId}/`,
      {},
      session,
    ),

  update: (
    session: Session,
    customerServiceId: string,
    payload: Partial<CustomerServicePayload>,
  ) =>
    api<any>(
      `/api/v1/customer-services/${customerServiceId}/`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
      session,
    ),

  renew: (
    session: Session,
    customerServiceId: string,
    payload: {
      months: number;
      new_package_id?: string;
      notes?: string;
    },
  ) =>
    api<any>(
      `/api/v1/customer-services/${customerServiceId}/renew/`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      session,
    ),

  reactivate: (
    session: Session,
    customerServiceId: string,
    payload: {
      reason?: string;
    } = {},
  ) =>
    api<any>(
      `/api/v1/customer-services/${customerServiceId}/reactivate/`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      session,
    ),

  changePackage: (
    session: Session,
    customerServiceId: string,
    payload: {
      package_id: string;
      reason?: string;
    },
  ) =>
    api<any>(
      `/api/v1/customer-services/${customerServiceId}/change_package/`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      session,
    ),

  transferAgency: (
    session: Session,
    customerServiceId: string,
    payload: {
      to_agency_id: string;
      to_branch_id?: string;
      reason?: string;
    },
  ) =>
    api<any>(
      `/api/v1/customer-services/${customerServiceId}/transfer_agency/`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      session,
    ),

};

// Customer Service Change Request Write Helpers
export type ServiceChangeRequestPayload = {
  customer_service: string;
  change_type: string;
  requested_values: Record<string, unknown>;
  status:
    | "requested"
    | "approved"
    | "rejected"
    | "applied"
    | "cancelled";
  reason: string;
};

export const serviceChangeRequestApi = {
  create: (
    session: Session,
    payload: ServiceChangeRequestPayload,
  ) =>
    api<any>(
      "/api/v1/customer-service-change-requests/",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      session,
    ),

  retrieve: (
    session: Session,
    requestId: string,
  ) =>
    api<any>(
      `/api/v1/customer-service-change-requests/${requestId}/`,
      {},
      session,
    ),

  update: (
    session: Session,
    requestId: string,
    payload: Partial<ServiceChangeRequestPayload>,
  ) =>
    api<any>(
      `/api/v1/customer-service-change-requests/${requestId}/`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
      session,
    ),
};

export const serviceActivationApi = {
  create: (session: Session, payload: any) =>
    api<any>("/api/v1/customer-service-activations/", { method: "POST", body: JSON.stringify(payload) }, session),
  update: (session: Session, id: string, payload: any) =>
    api<any>(`/api/v1/customer-service-activations/${id}/`, { method: "PATCH", body: JSON.stringify(payload) }, session),
};

export const installationWorkOrderApi = {
  create: (session: Session, payload: any) =>
    api<any>("/api/v1/customer-service-work-orders/", { method: "POST", body: JSON.stringify(payload) }, session),
  update: (session: Session, id: string, payload: any) =>
    api<any>(`/api/v1/customer-service-work-orders/${id}/`, { method: "PATCH", body: JSON.stringify(payload) }, session),
};

export const provisioningJobApi = {
  create: (session: Session, payload: any) =>
    api<any>("/api/v1/customer-service-provisioning-jobs/", { method: "POST", body: JSON.stringify(payload) }, session),
  update: (session: Session, id: string, payload: any) =>
    api<any>(`/api/v1/customer-service-provisioning-jobs/${id}/`, { method: "PATCH", body: JSON.stringify(payload) }, session),
};

export const ipAssignmentApi = {
  create: (session: Session, payload: any) =>
    api<any>("/api/v1/customer-service-ip-assignments/", { method: "POST", body: JSON.stringify(payload) }, session),
  update: (session: Session, id: string, payload: any) =>
    api<any>(`/api/v1/customer-service-ip-assignments/${id}/`, { method: "PATCH", body: JSON.stringify(payload) }, session),
};

export const radiusAccountApi = {
  create: (session: Session, payload: any) =>
    api<any>("/api/v1/customer-service-radius-accounts/", { method: "POST", body: JSON.stringify(payload) }, session),
  update: (session: Session, id: string, payload: any) =>
    api<any>(`/api/v1/customer-service-radius-accounts/${id}/`, { method: "PATCH", body: JSON.stringify(payload) }, session),
};

export const technicalTestResultApi = {
  create: (session: Session, payload: any) =>
    api<any>("/api/v1/customer-service-test-results/", { method: "POST", body: JSON.stringify(payload) }, session),
};

export const activationChecklistApi = {
  create: (session: Session, payload: any) =>
    api<any>("/api/v1/customer-service-checklists/", { method: "POST", body: JSON.stringify(payload) }, session),
  update: (session: Session, id: string, payload: any) =>
    api<any>(`/api/v1/customer-service-checklists/${id}/`, { method: "PATCH", body: JSON.stringify(payload) }, session),
};

export const fieldVisitApi = {
  create: (session: Session, payload: any) =>
    api<any>("/api/v1/customer-service-field-visits/", { method: "POST", body: JSON.stringify(payload) }, session),
  update: (session: Session, id: string, payload: any) =>
    api<any>(`/api/v1/customer-service-field-visits/${id}/`, { method: "PATCH", body: JSON.stringify(payload) }, session),
};

export const serviceSuspensionApi = {
  create: (session: Session, payload: any) =>
    api<any>("/api/v1/customer-service-suspensions/", { method: "POST", body: JSON.stringify(payload) }, session),
  update: (session: Session, id: string, payload: any) =>
    api<any>(`/api/v1/customer-service-suspensions/${id}/`, { method: "PATCH", body: JSON.stringify(payload) }, session),
};

export const serviceTerminationApi = {
  create: (session: Session, payload: any) =>
    api<any>("/api/v1/customer-service-terminations/", { method: "POST", body: JSON.stringify(payload) }, session),
  update: (session: Session, id: string, payload: any) =>
    api<any>(`/api/v1/customer-service-terminations/${id}/`, { method: "PATCH", body: JSON.stringify(payload) }, session),
};

export const decommissionRecordApi = {
  create: (session: Session, payload: any) =>
    api<any>("/api/v1/customer-service-decommissions/", { method: "POST", body: JSON.stringify(payload) }, session),
  update: (session: Session, id: string, payload: any) =>
    api<any>(`/api/v1/customer-service-decommissions/${id}/`, { method: "PATCH", body: JSON.stringify(payload) }, session),
};

export const equipmentAssignmentApi = {
  create: (session: Session, payload: any) =>
    api<any>("/api/v1/customer-equipment-assignments/", { method: "POST", body: JSON.stringify(payload) }, session),
  update: (session: Session, id: string, payload: any) =>
    api<any>(`/api/v1/customer-equipment-assignments/${id}/`, { method: "PATCH", body: JSON.stringify(payload) }, session),
};

export const technicalAttachmentApi = {
  create: (session: Session, payload: any) =>
    api<any>("/api/v1/customer-service-attachments/", { method: "POST", body: JSON.stringify(payload) }, session),

  update: (
    session: Session,
    id: string,
    payload: any,
  ) =>
    api<any>(
      `/api/v1/customer-service-attachments/${id}/`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
      session,
    ),
};

// Sales Write Helpers
export type SalePayload = {
  company: string;
  branch: string | null;
  agency: string | null;
  customer: string;
  customer_service: string | null;
  sale_type:
    | "new"
    | "renewal"
    | "change"
    | "mixed";
  sale_date: string;
  currency: string;
  discount_amount: string;
  notes: string;
};

export const saleApi = {
  create: (
    session: Session,
    payload: SalePayload,
  ) =>
    api<any>(
      "/api/v1/sales/",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      session,
    ),

  retrieve: (
    session: Session,
    saleId: string,
  ) =>
    api<any>(
      `/api/v1/sales/${saleId}/`,
      {},
      session,
    ),

  update: (
    session: Session,
    saleId: string,
    payload: Partial<SalePayload>,
  ) =>
    api<any>(
      `/api/v1/sales/${saleId}/`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
      session,
    ),

  post: (
    session: Session,
    saleId: string,
  ) =>
    api<any>(
      `/api/v1/sales/${saleId}/post/`,
      {
        method: "POST",
      },
      session,
    ),
};

export type SaleItemPayload = {
  sale: string;
  line_no: number;
  item_type:
    | "service"
    | "package"
    | "installation"
    | "rental"
    | "fee"
    | "equipment";
  service: string | null;
  package: string | null;
  description_snapshot: string;
  quantity: string;
  unit_price: string;
  share_eligible: boolean;
  metadata: Record<string, unknown>;
};

export const saleItemApi = {
  create: (
    session: Session,
    payload: SaleItemPayload,
  ) =>
    api<any>(
      "/api/v1/sale-items/",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      session,
    ),

  retrieve: (
    session: Session,
    itemId: string,
  ) =>
    api<any>(
      `/api/v1/sale-items/${itemId}/`,
      {},
      session,
    ),

  update: (
    session: Session,
    itemId: string,
    payload: Partial<SaleItemPayload>,
  ) =>
    api<any>(
      `/api/v1/sale-items/${itemId}/`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
      session,
    ),

  remove: (
    session: Session,
    itemId: string,
  ) =>
    api<any>(
      `/api/v1/sale-items/${itemId}/`,
      {
        method: "DELETE",
      },
      session,
    ),
};

// Billing Payment Write Helpers
export type PaymentPayload = {
  company: string;
  branch: string | null;
  agency: string | null;
  customer: string;
  payment_date: string;
  amount: string;
  currency: string;
  method:
    | "cash"
    | "bank"
    | "electronic"
    | "other";
  reference: string;
};

export const paymentApi = {
  create: (
    session: Session,
    payload: PaymentPayload,
  ) =>
    api<any>(
      "/api/v1/billing/payments/",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      session,
    ),

  retrieve: (
    session: Session,
    paymentId: string,
  ) =>
    api<any>(
      `/api/v1/billing/payments/${paymentId}/`,
      {},
      session,
    ),

  update: (
    session: Session,
    paymentId: string,
    payload: Partial<PaymentPayload>,
  ) =>
    api<any>(
      `/api/v1/billing/payments/${paymentId}/`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
      session,
    ),

  post: (
    session: Session,
    paymentId: string,
  ) =>
    api<any>(
      `/api/v1/billing/payments/${paymentId}/post/`,
      {
        method: "POST",
      },
      session,
    ),
};

export type PaymentAllocationPayload = {
  payment: string;
  receivable: string;
  amount: string;
};

export const paymentAllocationApi = {
  create: (
    session: Session,
    payload: PaymentAllocationPayload,
  ) =>
    api<any>(
      "/api/v1/billing/payment-allocations/",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      session,
    ),

  update: (
    session: Session,
    allocationId: string,
    payload: Partial<PaymentAllocationPayload>,
  ) =>
    api<any>(
      `/api/v1/billing/payment-allocations/${allocationId}/`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
      session,
    ),

  remove: (
    session: Session,
    allocationId: string,
  ) =>
    api<any>(
      `/api/v1/billing/payment-allocations/${allocationId}/`,
      {
        method: "DELETE",
      },
      session,
    ),
};

// Revenue Share Rule Write Helpers
export type ShareRulePayload = {
  agency: string | null;
  service: string;
  code: string;
  status: "active" | "inactive";
  effective_from: string;
  effective_to: string | null;
  partner_share_percent: string;
  company_base_share_percent: string;
  agency_gross_share_percent: string;
  agency_tax_enabled: boolean;
  agency_tax_percent: string;
  source_note: string;
};

export const shareRuleApi = {
  create: (
    session: Session,
    payload: ShareRulePayload,
  ) =>
    api<any>(
      "/api/v1/revenue/share-rules/",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      session,
    ),

  retrieve: (
    session: Session,
    ruleId: string,
  ) =>
    api<any>(
      `/api/v1/revenue/share-rules/${ruleId}/`,
      {},
      session,
    ),

  update: (
    session: Session,
    ruleId: string,
    payload: Partial<ShareRulePayload>,
  ) =>
    api<any>(
      `/api/v1/revenue/share-rules/${ruleId}/`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
      session,
    ),
};

// Finance Account Write Helpers
export type AccountPayload = {
  parent: string | null;
  code: string;
  name: string;
  account_type:
    | "asset"
    | "liability"
    | "equity"
    | "revenue"
    | "expense";
  normal_balance:
    | "debit"
    | "credit";
  is_posting: boolean;
  status:
    | "active"
    | "inactive";
  description: string;
};

export const accountApi = {
  create: (
    session: Session,
    payload: AccountPayload,
  ) =>
    api<any>(
      "/api/v1/finance/accounts/",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      session,
    ),

  retrieve: (
    session: Session,
    accountId: string,
  ) =>
    api<any>(
      `/api/v1/finance/accounts/${accountId}/`,
      {},
      session,
    ),

  update: (
    session: Session,
    accountId: string,
    payload: Partial<AccountPayload>,
  ) =>
    api<any>(
      `/api/v1/finance/accounts/${accountId}/`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
      session,
    ),
};


/* ==========================================================
   Accounting API
   ========================================================== */

export type AccountingPeriodPayload = {
  name: string;
  start_date: string;
  end_date: string;
  status?: "open" | "closed" | "locked";
};

export type AccountingPeriod = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: "open" | "closed" | "locked";
  created_at?: string;
  updated_at?: string;
};

export type JournalLinePayload = {
  journal_entry: string;
  account_code: string;
  amount: string | number;
  direction: "debit" | "credit";
};

export type JournalLine = {
  id: string;
  journal_entry: string;
  account_code: string;
  amount: string;
  direction: "debit" | "credit";
  created_at?: string;
  updated_at?: string;
};

export type JournalEntryPayload = {
  entry_number: string;
  entry_date: string;
  description?: string;
};

export type JournalEntry = {
  id: string;
  entry_number: string;
  entry_date: string;
  description: string;
  status: "draft" | "posted";
  lines: JournalLine[];
  debit_total: string;
  credit_total: string;
  is_balanced: boolean;
  created_at?: string;
  updated_at?: string;
};

export const accountingApi = {
  // Existing list fetchers
  periods: (session: Session, params = "") =>
    api<Paginated<AccountingPeriod>>(
      `/api/v1/accounting/periods/${params}`,
      {},
      session,
    ),

  journals: (session: Session, params = "") =>
    api<Paginated<JournalEntry>>(
      `/api/v1/accounting/journal-entries/${params}`,
      {},
      session,
    ),

  journalLines: (session: Session, params = "") =>
    api<Paginated<JournalLine>>(
      `/api/v1/accounting/journal-lines/${params}`,
      {},
      session,
    ),
  generalLedger: (session: Session, params = "") =>
    api<Paginated<any>>(
      `/api/v1/accounting/general-ledger/${params}`,
      {},
      session,
    ),

  // Period operations
  createPeriod: (session: Session, payload: AccountingPeriodPayload) =>
    api<AccountingPeriod>(
      "/api/v1/accounting/periods/",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      session,
    ),

  retrievePeriod: (session: Session, periodId: string) =>
    api<AccountingPeriod>(
      `/api/v1/accounting/periods/${periodId}/`,
      {},
      session,
    ),

  updatePeriod: (
    session: Session,
    periodId: string,
    payload: Partial<AccountingPeriodPayload>,
  ) =>
    api<AccountingPeriod>(
      `/api/v1/accounting/periods/${periodId}/`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
      session,
    ),

  // Journal Entry operations
  createJournal: (session: Session, payload: JournalEntryPayload) =>
    api<JournalEntry>(
      "/api/v1/accounting/journal-entries/",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      session,
    ),

  retrieveJournal: (session: Session, journalId: string) =>
    api<JournalEntry>(
      `/api/v1/accounting/journal-entries/${journalId}/`,
      {},
      session,
    ),

  updateJournal: (
    session: Session,
    journalId: string,
    payload: Partial<JournalEntryPayload>,
  ) =>
    api<JournalEntry>(
      `/api/v1/accounting/journal-entries/${journalId}/`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
      session,
    ),

  deleteJournal: (session: Session, journalId: string) =>
    api<any>(
      `/api/v1/accounting/journal-entries/${journalId}/`,
      {
        method: "DELETE",
      },
      session,
    ),

  postJournal: (session: Session, journalId: string) =>
    api<JournalEntry>(
      `/api/v1/accounting/journal-entries/${journalId}/post/`,
      {
        method: "POST",
      },
      session,
    ),

  // Journal Line operations
  createJournalLine: (session: Session, payload: JournalLinePayload) =>
    api<JournalLine>(
      "/api/v1/accounting/journal-lines/",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      session,
    ),

  updateJournalLine: (
    session: Session,
    lineId: string,
    payload: Partial<JournalLinePayload>,
  ) =>
    api<JournalLine>(
      `/api/v1/accounting/journal-lines/${lineId}/`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
      session,
    ),

  deleteJournalLine: (session: Session, lineId: string) =>
    api<any>(
      `/api/v1/accounting/journal-lines/${lineId}/`,
      {
        method: "DELETE",
      },
      session,
    ),

  // Sub-namespaces
  period: {
    create: (session: Session, payload: AccountingPeriodPayload) =>
      accountingApi.createPeriod(session, payload),
    retrieve: (session: Session, periodId: string) =>
      accountingApi.retrievePeriod(session, periodId),
    update: (
      session: Session,
      periodId: string,
      payload: Partial<AccountingPeriodPayload>,
    ) => accountingApi.updatePeriod(session, periodId, payload),
  },

  journal: {
    create: (session: Session, payload: JournalEntryPayload) =>
      accountingApi.createJournal(session, payload),
    retrieve: (session: Session, journalId: string) =>
      accountingApi.retrieveJournal(session, journalId),
    update: (
      session: Session,
      journalId: string,
      payload: Partial<JournalEntryPayload>,
    ) => accountingApi.updateJournal(session, journalId, payload),
    delete: (session: Session, journalId: string) =>
      accountingApi.deleteJournal(session, journalId),
    post: (session: Session, journalId: string) =>
      accountingApi.postJournal(session, journalId),
  },

  journalLine: {
    create: (session: Session, payload: JournalLinePayload) =>
      accountingApi.createJournalLine(session, payload),
    update: (
      session: Session,
      lineId: string,
      payload: Partial<JournalLinePayload>,
    ) => accountingApi.updateJournalLine(session, lineId, payload),
    delete: (session: Session, lineId: string) =>
      accountingApi.deleteJournalLine(session, lineId),
  },
};


// HQNATEX_TECHNOLOGY_MASTER_API_V1

export function createTechnology(
  session: Session,
  payload: Record<string, unknown>,
) {
  return api<any>(
    "/api/v1/catalog/technologies/",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    session,
  );
}

export function updateTechnology(
  session: Session,
  technologyId: string,
  payload: Record<string, unknown>,
) {
  return api<any>(
    `/api/v1/catalog/technologies/${technologyId}/`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    session,
  );
}


// HQNATEX_SERVICE_TECHNOLOGY_API_V1

export function createServiceTechnology(
  session: Session,
  payload: Record<string, unknown>,
) {
  return api<any>(
    "/api/v1/catalog/service-technologies/",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    session,
  );
}

export function updateServiceTechnology(
  session: Session,
  serviceTechnologyId: string,
  payload: Record<string, unknown>,
) {
  return api<any>(
    `/api/v1/catalog/service-technologies/${serviceTechnologyId}/`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    session,
  );
}


export const customerTicketApi = {
  create: (
    session: Session,
    payload: any,
  ) =>
    api<any>(
      "/api/v1/customer-tickets/",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      session,
    ),

  update: (
    session: Session,
    id: string,
    payload: any,
  ) =>
    api<any>(
      `/api/v1/customer-tickets/${id}/`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
      session,
    ),
};

export type AgencySettlementStatus =
  | "draft"
  | "approved"
  | "paid"
  | "void";

export type AgencySettlementLineRecord = {
  id: string;
  tenant: string;
  company: string;
  settlement: string;
  revenue_transaction: string;
  revenue_number?: string | null;
  recognition_date?: string | null;
  share_rule?: string | null;
  gross_share_amount: string;
  tax_amount: string;
  net_amount: string;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AgencySettlementRecord = {
  id: string;
  tenant: string;
  company: string;
  agency: string;
  agency_name?: string | null;
  settlement_number: string;
  period_start: string;
  period_end: string;
  currency: string;
  status: AgencySettlementStatus;
  gross_share_amount: string;
  tax_amount: string;
  net_payable_amount: string;
  paid_amount: string;
  balance_amount: string;
  approved_by_user_id?: string | null;
  approved_at?: string | null;
  paid_at?: string | null;
  reference?: string;
  notes?: string;
  lines?: AgencySettlementLineRecord[];
  created_at: string;
  updated_at: string;
};

export type AgencySettlementPage = {
  count: number;
  next?: string | null;
  previous?: string | null;
  results: AgencySettlementRecord[];
};

export type AgencySettlementCreatePayload = {
  agency_id: string;
  period_start: string;
  period_end: string;
  currency?: string;
  reference?: string;
  notes?: string;
};

export type AgencySettlementApprovePayload = {
  notes?: string;
};

export type AgencySettlementMarkPaidPayload = {
  reference?: string;
  notes?: string;
};

export type AgencySettlementVoidPayload = {
  reason: string;
};

export const agencySettlementApi = {
  list: (
    session: Session,
    params = "",
  ) =>
    api<AgencySettlementPage>(
      `/api/v1/revenue/agency-settlements/${params}`,
      {},
      session,
    ),

  retrieve: (
    session: Session,
    id: string,
  ) =>
    api<AgencySettlementRecord>(
      `/api/v1/revenue/agency-settlements/${id}/`,
      {},
      session,
    ),

  create: (
    session: Session,
    payload: AgencySettlementCreatePayload,
  ) =>
    api<AgencySettlementRecord>(
      "/api/v1/revenue/agency-settlements/",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      session,
    ),

  approve: (
    session: Session,
    id: string,
    payload: AgencySettlementApprovePayload = {},
  ) =>
    api<AgencySettlementRecord>(
      `/api/v1/revenue/agency-settlements/${id}/approve/`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      session,
    ),

  markPaid: (
    session: Session,
    id: string,
    payload: AgencySettlementMarkPaidPayload = {},
  ) =>
    api<AgencySettlementRecord>(
      `/api/v1/revenue/agency-settlements/${id}/mark-paid/`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      session,
    ),

  void: (
    session: Session,
    id: string,
    payload: AgencySettlementVoidPayload,
  ) =>
    api<AgencySettlementRecord>(
      `/api/v1/revenue/agency-settlements/${id}/void/`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      session,
    ),
};

// HQNATEX-AGENCY-SETTLEMENT-READONLY-V1
// HQNATEX-AGENCY-SETTLEMENT-MUTATION-V1



// HQNATEX_SETTINGS_BRANDING_API_V1D2B_START

export type SystemBackgroundConfig = {
  key: string;
  mode: "default" | "custom";
  background_url: string;
  is_custom: boolean;
  uses_default: boolean;
  position: string;
  size: string;
  dark_overlay_opacity: number;
  light_overlay_opacity: number;
  content_type: string | null;
  size_bytes: number | null;
  width: number | null;
  height: number | null;
  sha256: string | null;
  updated_at: string | null;
};

export type SystemBackgroundOptions = {
  position: string;
  size: string;
  dark_overlay_opacity: number;
  light_overlay_opacity: number;
};

const BRANDING_BACKGROUND_PATH =
  "/api/v1/settings/branding/background";

const BRANDING_BACKGROUND_FILE_PATH =
  "/api/v1/settings/branding/background/file";

const BRANDING_BACKGROUND_RESET_PATH =
  "/api/v1/settings/branding/background/reset";

function brandingHeaders(
  session: Session,
): Headers {
  const headers = new Headers();

  if (session.access) {
    const authHeader =
      import.meta.env.DEV
        ? "X-HQNATEX-Authorization"
        : "Authorization";

    headers.set(
      authHeader,
      `Bearer ${session.access}`,
    );
  }

  if (session.tenantId) {
    headers.set(
      "X-Tenant-ID",
      session.tenantId,
    );
  }

  if (session.companyId) {
    headers.set(
      "X-Company-ID",
      session.companyId,
    );
  }

  return headers;
}

async function brandingJsonResponse<T>(
  response: Response,
): Promise<T> {
  let body: any = {};

  try {
    body = await response.json();
  } catch {
    body = {};
  }

  if (!response.ok) {
    const detail =
      typeof body?.detail === "string"
        ? body.detail
        : `HTTP ${response.status}`;

    throw new Error(detail);
  }

  return body as T;
}

async function uploadSystemBackground(
  session: Session,
  file: File,
  options: SystemBackgroundOptions,
): Promise<SystemBackgroundConfig> {
  const body = new FormData();

  body.append(
    "background",
    file,
    file.name,
  );

  body.append(
    "position",
    options.position,
  );

  body.append(
    "size",
    options.size,
  );

  body.append(
    "dark_overlay_opacity",
    String(
      options.dark_overlay_opacity,
    ),
  );

  body.append(
    "light_overlay_opacity",
    String(
      options.light_overlay_opacity,
    ),
  );

  /*
   * Do NOT set Content-Type manually.
   * Browser must generate multipart boundary.
   */
  const response = await fetch(
    `${API_BASE}${BRANDING_BACKGROUND_PATH}`,
    {
      method: "POST",
      headers: brandingHeaders(session),
      body,
    },
  );

  return brandingJsonResponse<SystemBackgroundConfig>(
    response,
  );
}

async function fetchSystemBackgroundBlob(
  session: Session,
): Promise<Blob> {
  const response = await fetch(
    `${API_BASE}${BRANDING_BACKGROUND_FILE_PATH}`,
    {
      method: "GET",
      headers: brandingHeaders(session),
    },
  );

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status}`,
    );
  }

  return response.blob();
}

export const brandingApi = {
  get: (
    session: Session,
  ) =>
    api<SystemBackgroundConfig>(
      BRANDING_BACKGROUND_PATH,
      {},
      session,
    ),

  upload:
    uploadSystemBackground,

  update: (
    session: Session,
    options: SystemBackgroundOptions,
  ) =>
    api<SystemBackgroundConfig>(
      BRANDING_BACKGROUND_PATH,
      {
        method: "PATCH",
        body: JSON.stringify(options),
      },
      session,
    ),

  remove: (
    session: Session,
  ) =>
    api<unknown>(
      BRANDING_BACKGROUND_PATH,
      {
        method: "DELETE",
      },
      session,
    ),

  reset: (
    session: Session,
  ) =>
    api<SystemBackgroundConfig>(
      BRANDING_BACKGROUND_RESET_PATH,
      {
        method: "POST",
      },
      session,
    ),

  fileBlob:
    fetchSystemBackgroundBlob,
};

// HQNATEX_SETTINGS_BRANDING_API_V1D2B_END

// HQNATEX_WAREHOUSE_REAL_DATA_V1F3L_BEGIN

export type WarehouseRecord = {
  id: string;
  tenant: string;
  company: string;
  branch: string | null;
  code: string;
  name: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type WarehouseSupplierRecord = {
  id: string;
  tenant: string;
  company: string;
  code: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type WarehouseInventoryItemRecord = {
  id: string;
  tenant: string;
  company: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  serialized: boolean;
  minimum_stock: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type WarehouseStockRecord = {
  id: string;
  tenant: string;
  company: string;
  warehouse: string;
  item: string;
  quantity: string;
  reserved_quantity: string;
  average_unit_cost: string;
  item_name: string;
  item_sku: string;
  warehouse_name: string;
  created_at: string;
  updated_at: string;
};

export type WarehouseInventorySerialRecord = {
  id: string;
  tenant: string;
  company: string;
  item: string;
  warehouse: string;
  serial_number: string;
  status: string;
  item_name: string;
  item_sku: string;
  warehouse_name: string;
  created_at: string;
  updated_at: string;
};

export type WarehouseStockMovementRecord = {
  id: string;
  tenant: string;
  company: string;
  item: string;
  from_warehouse: string | null;
  to_warehouse: string | null;
  movement_type: string;
  quantity: string;
  unit_cost: string | null;
  reference_type: string;
  reference_id: string | null;
  occurred_at: string;
  created_by: string;
  item_name: string;
  item_sku: string;
  from_warehouse_name: string | null;
  to_warehouse_name: string | null;
  created_at: string;
  updated_at: string;
};

export type WarehousePurchaseRequestRecord = {
  id: string;
  tenant: string;
  company: string;
  request_number: string;
  warehouse: string;
  requested_by: string;
  status: string;
  request_date: string;
  notes: string;
  warehouse_name: string;
  lines: unknown[];
  created_at: string;
  updated_at: string;
};

export type WarehousePurchaseOrderRecord = {
  id: string;
  tenant: string;
  company: string;
  order_number: string;
  supplier: string;
  warehouse: string;
  purchase_request: string | null;
  status: string;
  order_date: string;
  currency: string;
  total_amount: string;
  created_by: string;
  approved_by: string | null;
  approved_at: string | null;
  supplier_name: string;
  warehouse_name: string;
  lines: unknown[];
  created_at: string;
  updated_at: string;
};

export type WarehouseGoodsReceiptRecord = {
  id: string;
  tenant: string;
  company: string;
  receipt_number: string;
  purchase_order: string | null;
  supplier: string;
  warehouse: string;
  received_at: string;
  received_by: string;
  status: string;
  notes: string;
  supplier_name: string;
  warehouse_name: string;
  lines: unknown[];
  created_at: string;
  updated_at: string;
};

export const warehouseApi = {
  warehouses: (
    session: Session,
    params = "",
  ) =>
    api<Paginated<WarehouseRecord>>(
      `/api/v1/warehouse/warehouses/${params}`,
      {},
      session,
    ),

  suppliers: (
    session: Session,
    params = "",
  ) =>
    api<Paginated<WarehouseSupplierRecord>>(
      `/api/v1/warehouse/suppliers/${params}`,
      {},
      session,
    ),

  inventoryItems: (
    session: Session,
    params = "",
  ) =>
    api<Paginated<WarehouseInventoryItemRecord>>(
      `/api/v1/warehouse/inventory-items/${params}`,
      {},
      session,
    ),

  warehouseStocks: (
    session: Session,
    params = "",
  ) =>
    api<Paginated<WarehouseStockRecord>>(
      `/api/v1/warehouse/warehouse-stocks/${params}`,
      {},
      session,
    ),

  inventorySerials: (
    session: Session,
    params = "",
  ) =>
    api<Paginated<WarehouseInventorySerialRecord>>(
      `/api/v1/warehouse/inventory-serials/${params}`,
      {},
      session,
    ),

  stockMovements: (
    session: Session,
    params = "",
  ) =>
    api<Paginated<WarehouseStockMovementRecord>>(
      `/api/v1/warehouse/stock-movements/${params}`,
      {},
      session,
    ),

  purchaseRequests: (
    session: Session,
    params = "",
  ) =>
    api<Paginated<WarehousePurchaseRequestRecord>>(
      `/api/v1/warehouse/purchase-requests/${params}`,
      {},
      session,
    ),

  purchaseOrders: (
    session: Session,
    params = "",
  ) =>
    api<Paginated<WarehousePurchaseOrderRecord>>(
      `/api/v1/warehouse/purchase-orders/${params}`,
      {},
      session,
    ),

  goodsReceipts: (
    session: Session,
    params = "",
  ) =>
    api<Paginated<WarehouseGoodsReceiptRecord>>(
      `/api/v1/warehouse/goods-receipts/${params}`,
      {},
      session,
    ),
};

// HQNATEX_WAREHOUSE_REAL_DATA_V1F3L_END



// ÙØ§ÛŒÙ„ Ø®ØµÙˆØµÛŒ Ø¨Ø§ Ù‡Ù…Ø§Ù† Ù†Ø´Ø³Øª Ùˆ ØªÙ…Ø¯ÛŒØ¯ ØªÙˆÚ©Ù†
export async function workspaceFileBlob(
  id: string,
  session: Session,
  signal?: AbortSignal,
): Promise<Blob> {
  const path = `/api/v1/workspace/documents/${encodeURIComponent(id)}/download/`;
  for (let attempt = 0; attempt < 2; attempt++) {
    const headers = new Headers();
    headers.set(authorizationHeaderName(), `Bearer ${session.access}`);
    headers.set("X-Tenant-ID", session.tenantId);
    if (session.companyId) headers.set("X-Company-ID", session.companyId);
    const response = await fetch(`${API_BASE}${path}`, {
      headers, signal, cache: "no-store",
    });
    if (
      response.status === 401 && attempt === 0 &&
      session.refresh && await refreshSession(session)
    ) continue;
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(
        typeof data?.detail === "string"
          ? data.detail
          : `HTTP ${response.status}`,
      );
    }
    return response.blob();
  }
  throw new Error("HTTP 401");
}


// Ú¯Ø²Ø§Ø±Ø´ CSV Ø¨Ø§ Ù†Ø´Ø³Øª ÙØ¹Ø§Ù„ Ùˆ ÛŒÚ© Ø¨Ø§Ø± ØªÙ…Ø¯ÛŒØ¯ ØªÙˆÚ©Ù†
export async function workspaceReportBlob(
  type: string,
  session: Session,
  signal?: AbortSignal,
): Promise<Blob> {
  const path =
    `/api/v1/workspace/reports/export/?type=${encodeURIComponent(type)}`;

  for (let attempt = 0; attempt < 2; attempt++) {
    const headers = new Headers();
    headers.set(
      authorizationHeaderName(),
      `Bearer ${session.access}`,
    );
    headers.set("X-Tenant-ID", session.tenantId);
    if (session.companyId) {
      headers.set("X-Company-ID", session.companyId);
    }

    const response = await fetch(`${API_BASE}${path}`, {
      method: "GET",
      headers,
      signal,
      cache: "no-store",
    });

    if (
      response.status === 401 &&
      attempt === 0 &&
      session.refresh &&
      await refreshSession(session)
    ) {
      continue;
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(body || `HTTP ${response.status}`);
    }

    return response.blob();
  }

  throw new Error("HTTP 401");
}


