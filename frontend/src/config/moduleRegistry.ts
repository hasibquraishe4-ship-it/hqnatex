/**
 * HQNATEX Canonical Module Registry
 *
 * This file is the single source of truth for:
 * - top-level module order
 * - Sidebar module order
 * - Module Hub card order
 * - default application section per module
 * - module grouping relationships
 *
 * IMPORTANT:
 * Business data, permissions and API state do not belong here.
 * This registry contains UI/navigation metadata only.
 */

export type SectionKey =
  | "dashboard"
  | "security"
  | "organization"
  | "subscribersServices"
  | "customers"
  | "services"
  | "packages"
  | "sales"
  | "billing"
  | "payments"
  | "revenue"
  | "agencies"
  | "partners"
  | "settlements"
  | "finance"
  | "accounting"
  | "expenses"
  | "tax"
  | "warehouse"
  | "equipment"
  | "procurement"
  | "assets"
  | "noc"
  | "hr"
  | "payroll"
  | "callcenter"
  | "documents"
  | "projects"
  | "reports"
  | "bi"
  | "audit"
  | "integrations"
  | "settings"
  | "profile";

export type FinanceSubviewKey =
  | "dashboard"
  | "generalLedger"
  | "chartOfAccounts"
  | "journals"
  | "cashBank"
  | "receivables"
  | "payables"
  | "settlements"
  | "expenses"
  | "taxes"
  | "periods"
  | "reports";

export type CanonicalModuleId =
  | "dashboard"
  | "organization"
  | "subscribers-services"
  | "sales"
  | "billing-payments"
  | "revenue-settlements"
  | "treasury"
  | "finance-accounting"
  | "warehouse-procurement"
  | "equipment-assets"
  | "network-noc"
  | "hr-payroll"
  | "call-center"
  | "documents-projects"
  | "reports-bi"
  | "security-audit"
  | "integrations"
  | "settings"
  | "profile";

export type CanonicalModuleLabelKey =
  | "dashboard"
  | "organization"
  | "subscribersServices"
  | "sales"
  | "billingPayments"
  | "revenueSettlements"
  | "treasury"
  | "financeAccounting"
  | "warehouseProcurement"
  | "equipmentAssets"
  | "networkNoc"
  | "hrPayroll"
  | "callCenter"
  | "documentsProjects"
  | "reportsBi"
  | "securityAudit"
  | "integrations"
  | "settings"
  | "profile";

export interface ModuleTarget {
  section: SectionKey;
  financeSubview?: FinanceSubviewKey;
}

export interface CanonicalModule {
  order: number;
  id: CanonicalModuleId;
  labelKey: CanonicalModuleLabelKey;
  target: ModuleTarget;
  sections: readonly SectionKey[];
  childrenCollapsible: boolean;
}

export const CANONICAL_MODULE_REGISTRY = [
  {
    order: 1,
    id: "dashboard",
    labelKey: "dashboard",
    target: {
      section: "dashboard",
    },
    sections: [
      "dashboard",
    ],
    childrenCollapsible: false,
  },

  {
    order: 2,
    id: "organization",
    labelKey: "organization",
    target: {
      section: "organization",
    },
    sections: [
      "organization",
      "agencies",
      "partners",
    ],
    childrenCollapsible: true,
  },

  {
    order: 3,
    id: "subscribers-services",
    labelKey: "subscribersServices",
    target: {
      section: "subscribersServices",
    },
    sections: [
      "subscribersServices",
      "customers",
      "services",
      "packages",
    ],
    childrenCollapsible: true,
  },

  {
    order: 4,
    id: "sales",
    labelKey: "sales",
    target: {
      section: "sales",
    },
    sections: [
      "sales",
    ],
    childrenCollapsible: false,
  },

  {
    order: 5,
    id: "billing-payments",
    labelKey: "billingPayments",
    target: {
      section: "billing",
    },
    sections: [
      "billing",
      "payments",
    ],
    childrenCollapsible: true,
  },

  {
    order: 6,
    id: "revenue-settlements",
    labelKey: "revenueSettlements",
    target: {
      section: "revenue",
    },
    sections: [
      "revenue",
      "settlements",
    ],
    childrenCollapsible: true,
  },

  {
    order: 7,
    id: "treasury",
    labelKey: "treasury",
    target: {
      section: "finance",
      financeSubview: "cashBank",
    },
    sections: [
      "finance",
    ],
    childrenCollapsible: false,
  },

  {
    order: 8,
    id: "finance-accounting",
    labelKey: "financeAccounting",
    target: {
      section: "finance",
      financeSubview: "dashboard",
    },
    sections: [
      "finance",
      "accounting",
      "expenses",
      "tax",
    ],
    childrenCollapsible: true,
  },

  {
    order: 9,
    id: "warehouse-procurement",
    labelKey: "warehouseProcurement",
    target: {
      section: "warehouse",
    },
    sections: [
      "warehouse",
      "procurement",
    ],
    childrenCollapsible: true,
  },

  {
    order: 10,
    id: "equipment-assets",
    labelKey: "equipmentAssets",
    target: {
      section: "equipment",
    },
    sections: [
      "equipment",
      "assets",
    ],
    childrenCollapsible: true,
  },

  {
    order: 11,
    id: "network-noc",
    labelKey: "networkNoc",
    target: {
      section: "noc",
    },
    sections: [
      "noc",
    ],
    childrenCollapsible: false,
  },

  {
    order: 12,
    id: "hr-payroll",
    labelKey: "hrPayroll",
    target: {
      section: "hr",
    },
    sections: [
      "hr",
      "payroll",
    ],
    childrenCollapsible: true,
  },

  {
    order: 13,
    id: "call-center",
    labelKey: "callCenter",
    target: {
      section: "callcenter",
    },
    sections: [
      "callcenter",
    ],
    childrenCollapsible: false,
  },

  {
    order: 14,
    id: "documents-projects",
    labelKey: "documentsProjects",
    target: {
      section: "projects",
    },
    sections: [
      "documents",
      "projects",
    ],
    childrenCollapsible: true,
  },

  {
    order: 15,
    id: "reports-bi",
    labelKey: "reportsBi",
    target: {
      section: "reports",
    },
    sections: [
      "reports",
      "bi",
    ],
    childrenCollapsible: true,
  },

  {
    order: 16,
    id: "security-audit",
    labelKey: "securityAudit",
    target: {
      section: "security",
    },
    sections: [
      "security",
      "audit",
    ],
    childrenCollapsible: true,
  },

  {
    order: 17,
    id: "integrations",
    labelKey: "integrations",
    target: {
      section: "integrations",
    },
    sections: [
      "integrations",
    ],
    childrenCollapsible: false,
  },

  {
    order: 18,
    id: "settings",
    labelKey: "settings",
    target: {
      section: "settings",
    },
    sections: [
      "settings",
    ],
    childrenCollapsible: false,
  },

  {
    order: 19,
    id: "profile",
    labelKey: "profile",
    target: {
      section: "profile",
    },
    sections: [
      "profile",
    ],
    childrenCollapsible: false,
  },
] as const satisfies readonly CanonicalModule[];

export const CANONICAL_MODULE_ORDER =
  CANONICAL_MODULE_REGISTRY.map(
    (module) => module.id,
  );

export const CANONICAL_MODULE_COUNT =
  CANONICAL_MODULE_REGISTRY.length;

export function getCanonicalModule(
  id: CanonicalModuleId,
) {
  return CANONICAL_MODULE_REGISTRY.find(
    (module) => module.id === id,
  );
}

export function getCanonicalModuleBySection(
  section: SectionKey,
) {
  return CANONICAL_MODULE_REGISTRY.find(
    (module) =>
      module.target.section === section ||
      module.sections.includes(section as never),
  );
}

export function isCanonicalSection(
  value: string,
): value is SectionKey {
  return CANONICAL_MODULE_REGISTRY.some(
    (module) =>
      module.target.section === value ||
      module.sections.some(
        (section) => section === value,
      ),
  );
}
