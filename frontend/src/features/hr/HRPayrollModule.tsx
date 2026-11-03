import { getTranslation as getUiTranslation } from "../../i18n";
import { DataTable as SharedDataTable } from "../../components/DataTable";
import { SecondaryButton as SharedSecondaryButton, Select as SharedSelect, PrimaryButton as SharedPrimaryButton } from "../../components/Interface";
import { PageHeader as SharedPageHeader } from "../../components/PageHeader";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Activity,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Loader2,
  Pencil,
  Plus,
  RefreshCcw,
  Save,
  Search,
  ShieldCheck,
  Users,
  WalletCards,
  X,
} from "lucide-react";

import {
  api,
  type Paginated,
  type Session,
} from "../../lib/api";


type Language =
  | "en"
  | "fa"
  | "ps";

type GroupKey =
  | "people"
  | "time"
  | "payroll"
  | "talent"
  | "lifecycle"
  | "governance";

type Row =
  Record<string, unknown>;

type MetaChoice = {
  value: unknown;
  display_name: string;
};

type MetaField = {
  type?: string;
  required?: boolean;
  read_only?: boolean;
  allow_null?: boolean;
  label?: string;
  choices?: MetaChoice[];
};

type Resource = {
  key: string;
  path: string;
  group: GroupKey;

  title: {
    en: string;
    fa: string;
    ps: string;
  };

  readOnly?: boolean;
};

type Props = {
  session: Session;
};


const COPY = { en: getUiTranslation("en").featureCopy.hr_HRPayrollModule.COPY, fa: getUiTranslation("fa").featureCopy.hr_HRPayrollModule.COPY, ps: getUiTranslation("ps").featureCopy.hr_HRPayrollModule.COPY };


const GROUP_LABELS: Record<
  GroupKey,
  Record<Language, string>
> = {
  people: {
    en: "Employees & Organization",
    fa: "کارمندان و سازمان",
    ps: "کارکوونکي او اداره",
  },

  time: {
    en: "Attendance & Leave",
    fa: "حاضری و رخصتی",
    ps: "حاضري او رخصتي",
  },

  payroll: {
    en: "Payroll",
    fa: "معاشات",
    ps: "معاشات",
  },

  talent: {
    en: "Recruitment & Performance",
    fa: "استخدام و عملکرد",
    ps: "استخدام او ارزونه",
  },

  lifecycle: {
    en: "Employee Lifecycle",
    fa: "چرخه کارمند",
    ps: "د کارکوونکي دوره",
  },

  governance: {
    en: "Governance & Self Service",
    fa: "کنترول و خدمات کارمند",
    ps: "کنټرول او ځان-خدمت",
  },
};


const RESOURCES: Resource[] = [

  {
    key: "employees",
    path: "/api/v1/hr/employees/",
    group: "people",
    title: {
      en: "Employees",
      fa: "کارمندان",
      ps: "کارکوونکي",
    },
  },

  {
    key: "departments",
    path: "/api/v1/hr/departments/",
    group: "people",
    title: {
      en: "Departments",
      fa: "دیپارتمنت‌ها",
      ps: "څانګې",
    },
  },

  {
    key: "positions",
    path: "/api/v1/hr/positions/",
    group: "people",
    title: {
      en: "Positions",
      fa: "بست‌ها",
      ps: "بستونه",
    },
  },

  {
    key: "contracts",
    path: "/api/v1/hr/contracts/",
    group: "people",
    title: {
      en: "Contracts",
      fa: "قراردادها",
      ps: "قراردادونه",
    },
  },

  {
    key: "emergency-contacts",
    path: "/api/v1/hr/emergency-contacts/",
    group: "people",
    title: {
      en: "Emergency Contacts",
      fa: "تماس اضطراری",
      ps: "بیړنۍ اړیکې",
    },
  },

  {
    key: "bank-accounts",
    path: "/api/v1/hr/bank-accounts/",
    group: "people",
    title: {
      en: "Bank Accounts",
      fa: "حساب‌های بانکی",
      ps: "بانکي حسابونه",
    },
  },

  {
    key: "employee-documents",
    path: "/api/v1/hr/employee-documents/",
    group: "people",
    title: {
      en: "Employee Documents",
      fa: "اسناد کارمند",
      ps: "د کارکوونکي اسناد",
    },
  },


  {
    key: "shifts",
    path: "/api/v1/hr/shifts/",
    group: "time",
    title: {
      en: "Work Shifts",
      fa: "شیفت‌ها",
      ps: "کاري شیفټونه",
    },
  },

  {
    key: "employee-shifts",
    path: "/api/v1/hr/employee-shifts/",
    group: "time",
    title: {
      en: "Shift Assignments",
      fa: "تخصیص شیفت",
      ps: "د شیفټ تخصیص",
    },
  },

  {
    key: "attendances",
    path: "/api/v1/hr/attendances/",
    group: "time",
    title: {
      en: "Attendance",
      fa: "حاضری",
      ps: "حاضري",
    },
  },

  {
    key: "leave-types",
    path: "/api/v1/hr/leave-types/",
    group: "time",
    title: {
      en: "Leave Types",
      fa: "انواع رخصتی",
      ps: "د رخصتۍ ډولونه",
    },
  },

  {
    key: "leave-balances",
    path: "/api/v1/hr/leave-balances/",
    group: "time",
    title: {
      en: "Leave Balances",
      fa: "باقی رخصتی",
      ps: "د رخصتۍ پاتې",
    },
  },

  {
    key: "leave-requests",
    path: "/api/v1/hr/leave-requests/",
    group: "time",
    title: {
      en: "Leave Requests",
      fa: "درخواست‌های رخصتی",
      ps: "د رخصتۍ غوښتنې",
    },
  },

  {
    key: "public-holidays",
    path: "/api/v1/hr/public-holidays/",
    group: "time",
    title: {
      en: "Public Holidays",
      fa: "تعطیلات رسمی",
      ps: "رسمي رخصتۍ",
    },
  },

  {
    key: "overtimes",
    path: "/api/v1/hr/overtimes/",
    group: "time",
    title: {
      en: "Overtime",
      fa: "اضافه‌کاری",
      ps: "اضافي کار",
    },
  },


  {
    key: "salary-profiles",
    path: "/api/v1/hr/salary-profiles/",
    group: "payroll",
    title: {
      en: "Salary Profiles",
      fa: "پروفایل معاش",
      ps: "د معاش پروفایل",
    },
  },

  {
    key: "tax-brackets",
    path: "/api/v1/hr/tax-brackets/",
    group: "payroll",
    title: {
      en: "Tax Brackets",
      fa: "جدول مالیات معاش",
      ps: "د معاش مالیاتي جدول",
    },
  },

  {
    key: "allowances",
    path: "/api/v1/hr/allowances/",
    group: "payroll",
    title: {
      en: "Allowances",
      fa: "امتیازات",
      ps: "امتیازات",
    },
  },

  {
    key: "deductions",
    path: "/api/v1/hr/deductions/",
    group: "payroll",
    title: {
      en: "Deductions",
      fa: "کسورات",
      ps: "کسرونه",
    },
  },

  {
    key: "payroll-periods",
    path: "/api/v1/hr/payroll-periods/",
    group: "payroll",
    title: {
      en: "Payroll Periods",
      fa: "دوره‌های معاش",
      ps: "د معاش دورې",
    },
  },

  {
    key: "payroll-runs",
    path: "/api/v1/hr/payroll-runs/",
    group: "payroll",
    title: {
      en: "Payroll Runs",
      fa: "اجرای معاشات",
      ps: "د معاش اجرا",
    },
  },

  {
    key: "payroll-entries",
    path: "/api/v1/hr/payroll-entries/",
    group: "payroll",
    title: {
      en: "Payroll Entries",
      fa: "جزئیات معاشات",
      ps: "د معاش جزئیات",
    },
    readOnly: true,
  },

  {
    key: "payroll-payments",
    path: "/api/v1/hr/payroll-payments/",
    group: "payroll",
    title: {
      en: "Payroll Payments",
      fa: "پرداخت معاش",
      ps: "د معاش تادیات",
    },
  },

  {
    key: "payslips",
    path: "/api/v1/hr/payslips/",
    group: "payroll",
    title: {
      en: "Payslips",
      fa: "فیش معاش",
      ps: "د معاش پاڼه",
    },
    readOnly: true,
  },

  {
    key: "employee-loans",
    path: "/api/v1/hr/employee-loans/",
    group: "payroll",
    title: {
      en: "Employee Loans",
      fa: "قرض کارمند",
      ps: "د کارکوونکي پور",
    },
  },

  {
    key: "salary-advances",
    path: "/api/v1/hr/salary-advances/",
    group: "payroll",
    title: {
      en: "Salary Advances",
      fa: "پیش‌پرداخت معاش",
      ps: "مخکینی معاش",
    },
  },


  {
    key: "vacancies",
    path: "/api/v1/hr/vacancies/",
    group: "talent",
    title: {
      en: "Vacancies",
      fa: "بست‌های خالی",
      ps: "خالي بستونه",
    },
  },

  {
    key: "candidates",
    path: "/api/v1/hr/candidates/",
    group: "talent",
    title: {
      en: "Candidates",
      fa: "کاندیداها",
      ps: "نوماندان",
    },
  },

  {
    key: "interviews",
    path: "/api/v1/hr/interviews/",
    group: "talent",
    title: {
      en: "Interviews",
      fa: "مصاحبه‌ها",
      ps: "مرکې",
    },
  },

  {
    key: "onboarding-tasks",
    path: "/api/v1/hr/onboarding-tasks/",
    group: "talent",
    title: {
      en: "Onboarding",
      fa: "آغاز وظیفه",
      ps: "د کار پیل",
    },
  },

  {
    key: "performance-reviews",
    path: "/api/v1/hr/performance-reviews/",
    group: "talent",
    title: {
      en: "Performance Reviews",
      fa: "ارزیابی عملکرد",
      ps: "د فعالیت ارزونه",
    },
  },

  {
    key: "trainings",
    path: "/api/v1/hr/trainings/",
    group: "talent",
    title: {
      en: "Training",
      fa: "آموزش",
      ps: "روزنه",
    },
  },

  {
    key: "training-participants",
    path: "/api/v1/hr/training-participants/",
    group: "talent",
    title: {
      en: "Training Participants",
      fa: "اشتراک‌کنندگان آموزش",
      ps: "د روزنې ګډونوال",
    },
  },


  {
    key: "disciplinary-actions",
    path: "/api/v1/hr/disciplinary-actions/",
    group: "lifecycle",
    title: {
      en: "Disciplinary Actions",
      fa: "اخطار و انضباط",
      ps: "انضباطي اقدامات",
    },
  },

  {
    key: "promotion-transfers",
    path: "/api/v1/hr/promotion-transfers/",
    group: "lifecycle",
    title: {
      en: "Promotion & Transfer",
      fa: "ترفیع و انتقال",
      ps: "ترفیع او انتقال",
    },
  },

  {
    key: "employee-assets",
    path: "/api/v1/hr/employee-assets/",
    group: "lifecycle",
    title: {
      en: "Employee Assets",
      fa: "تجهیزات تحویلی",
      ps: "سپارل شوي وسایل",
    },
  },

  {
    key: "terminations",
    path: "/api/v1/hr/terminations/",
    group: "lifecycle",
    title: {
      en: "Termination & Resignation",
      fa: "ختم وظیفه و استعفا",
      ps: "د دندې ختم",
    },
  },

  {
    key: "clearances",
    path: "/api/v1/hr/clearances/",
    group: "lifecycle",
    title: {
      en: "Clearance",
      fa: "تصفیه و تحویل‌دهی",
      ps: "تصفیه",
    },
  },


  {
    key: "approval-requests",
    path: "/api/v1/hr/approval-requests/",
    group: "governance",
    title: {
      en: "Approval Workflow",
      fa: "تأییدات",
      ps: "تاییدونه",
    },
  },

  {
    key: "audit-events",
    path: "/api/v1/hr/audit-events/",
    group: "governance",
    title: {
      en: "Audit History",
      fa: "تاریخچه تغییرات",
      ps: "د بدلون تاریخچه",
    },
    readOnly: true,
  },

  {
    key: "self-service",
    path: "/api/v1/hr/self-service/",
    group: "governance",
    title: {
      en: "Employee Self Service",
      fa: "خدمات شخصی کارمند",
      ps: "د کارکوونکي ځان-خدمت",
    },
    readOnly: true,
  },
];


const GROUPS: GroupKey[] = [
  "people",
  "time",
  "payroll",
  "talent",
  "lifecycle",
  "governance",
];


const FIELD_LABELS: Record<
  string,
  Record<Language, string>
> = {
  employee_number: {
    en: "Employee No.",
    fa: "شماره پرسونلی",
    ps: "د کارکوونکي شمېره",
  },

  first_name: {
    en: "First Name",
    fa: "نام",
    ps: "نوم",
  },

  last_name: {
    en: "Last Name",
    fa: "تخلص",
    ps: "تخلص",
  },

  name: {
    en: "Name",
    fa: "نام",
    ps: "نوم",
  },

  title: {
    en: "Title",
    fa: "عنوان",
    ps: "عنوان",
  },

  code: {
    en: "Code",
    fa: "کد",
    ps: "کوډ",
  },

  employee: {
    en: "Employee",
    fa: "کارمند",
    ps: "کارکوونکی",
  },

  department: {
    en: "Department",
    fa: "دیپارتمنت",
    ps: "څانګه",
  },

  position: {
    en: "Position",
    fa: "بست",
    ps: "بست",
  },

  status: {
    en: "Status",
    fa: "وضعیت",
    ps: "حالت",
  },

  date: {
    en: "Date",
    fa: "تاریخ",
    ps: "نېټه",
  },

  start_date: {
    en: "Start Date",
    fa: "تاریخ شروع",
    ps: "د پیل نېټه",
  },

  end_date: {
    en: "End Date",
    fa: "تاریخ ختم",
    ps: "د پای نېټه",
  },

  base_salary: {
    en: "Base Salary",
    fa: "معاش پایه",
    ps: "اساسي معاش",
  },

  gross_pay: {
    en: "Gross Pay",
    fa: "معاش ناخالص",
    ps: "ناخالص معاش",
  },

  net_pay: {
    en: "Net Pay",
    fa: "معاش خالص",
    ps: "خالص معاش",
  },

  tax_total: {
    en: "Tax",
    fa: "مالیات",
    ps: "مالیه",
  },

  amount: {
    en: "Amount",
    fa: "مبلغ",
    ps: "مبلغ",
  },

  currency: {
    en: "Currency",
    fa: "واحد پول",
    ps: "اسعار",
  },

  phone: {
    en: "Phone",
    fa: "شماره تماس",
    ps: "تلیفون",
  },

  email: {
    en: "Email",
    fa: "ایمیل",
    ps: "برېښنالیک",
  },

  created_at: {
    en: "Created",
    fa: "تاریخ ثبت",
    ps: "د ثبت نېټه",
  },
};


function currentLanguage(): Language {

  if (
    typeof document ===
    "undefined"
  ) {
    return "fa";
  }

  const value =
    (
      document
        .documentElement
        .lang || ""
    ).toLowerCase();

  if (
    value.startsWith("en")
  ) {
    return "en";
  }

  if (
    value.startsWith("ps")
  ) {
    return "ps";
  }

  return "fa";
}


function useLanguage(): Language {

  const [
    language,
    setLanguage,
  ] = useState<Language>(
    currentLanguage,
  );

  useEffect(() => {

    if (
      typeof document ===
      "undefined"
    ) {
      return;
    }

    const observer =
      new MutationObserver(
        () => {
          setLanguage(
            currentLanguage(),
          );
        },
      );

    observer.observe(
      document.documentElement,
      {
        attributes: true,
        attributeFilter: [
          "lang",
          "dir",
        ],
      },
    );

    return () => {
      observer.disconnect();
    };

  }, []);

  return language;
}


function printable(
  value: unknown,
): string {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  try {
    return JSON.stringify(
      value,
    );
  } catch {
    return String(value);
  }
}


function humanize(
  value: string,
): string {

  return value
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (match) =>
        match.toUpperCase(),
    );
}


function metadataFromOptions(
  response: unknown,
): Record<string, MetaField> {

  if (
    !response ||
    typeof response !== "object"
  ) {
    return {};
  }

  const root =
    response as {
      actions?: {
        POST?: unknown;
        PUT?: unknown;
        PATCH?: unknown;
      };
    };

  const candidate =
    root.actions?.POST ??
    root.actions?.PUT ??
    root.actions?.PATCH;

  if (
    !candidate ||
    typeof candidate !== "object"
  ) {
    return {};
  }

  return candidate as Record<
    string,
    MetaField
  >;
}



// HQNATEX_HR_PHOTO_AUTHENTICATED_READ_V1
function EmployeeStoredPhoto({
  session,
  employeeId,
  photoUrl,
  localSrc = "",
  className,
  alt,
}: {
  session: Session;
  employeeId: unknown;
  photoUrl: unknown;
  localSrc?: string;
  className: string;
  alt: string;
}) {
  const [result, setResult] = useState({
    key: "",
    url: "",
    failed: false,
  });
  const id = employeeId == null ? "" : String(employeeId);
  const saved = typeof photoUrl === "string" ? photoUrl : "";
  const requestKey = JSON.stringify([
    id, saved, session.tenantId, session.companyId, session.access,
  ]);

  useEffect(() => {
    if (localSrc || !id || !saved) return;
    const controller = new AbortController();
    let disposed = false;
    let objectUrl = "";

    const load = async () => {
      try {
        const base = import.meta.env.VITE_API_BASE_URL ?? "";
        const headers = new Headers();
        headers.set(
          import.meta.env.DEV && !base
            ? "X-HQNATEX-Authorization"
            : "Authorization",
          `Bearer ${session.access}`,
        );
        headers.set("X-Tenant-ID", session.tenantId);
        if (session.companyId) {
          headers.set("X-Company-ID", session.companyId);
        }

        const response = await fetch(
          `${base}/api/v1/hr/employees/${encodeURIComponent(id)}/photo-file/`,
          {
            method: "GET",
            headers,
            cache: "no-store",
            signal: controller.signal,
          },
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const mime = (response.headers.get("Content-Type") || "")
          .split(";")[0].trim().toLowerCase();
        if (
          mime !== "image/jpeg" &&
          mime !== "image/png" &&
          mime !== "image/webp"
        ) throw new Error("Unexpected photo response");

        const blob = await response.blob();
        if (!blob.size) throw new Error("Empty photo");
        if (disposed) return;
        objectUrl = URL.createObjectURL(blob);
        setResult({ key: requestKey, url: objectUrl, failed: false });
      } catch {
        if (!disposed) {
          setResult({ key: requestKey, url: "", failed: true });
        }
      }
    };

    void load();
    return () => {
      disposed = true;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [
    id, saved, localSrc, requestKey,
    session.access, session.tenantId, session.companyId,
  ]);

  const current = result.key === requestKey;
  const src = localSrc || (current ? result.url : "");
  if (src) {
    return <img src={src} className={className} alt={alt} />;
  }

  const failed = current && result.failed;
  return (
    <span
      className={className}
      role="status"
      style={{
        display: "grid",
        placeItems: "center",
        textAlign: "center",
        padding: "12px",
      }}
      data-photo-state={failed ? "error" : "loading"}
    >
      {failed
        ? <><span aria-hidden="true">⚠</span> {alt}</>
        : <Loader2 className="h-5 w-5 animate-spin" aria-label={alt} />}
    </span>
  );
}


// HQNATEX_HR_EMPLOYEE_CHOICES_V1
function employeeChoiceLabel(
  key: string,
  value: unknown,
  language: Language,
  fallback: string,
): string {
  const choices: Record<string, Record<string, Record<Language, string>>> = {
    gender: {
      "مرد": { en: "Male", fa: "مرد", ps: "نارینه" },
      "زن": { en: "Female", fa: "زن", ps: "ښځینه" },
    },
    marital_status: {
      single: { en: "Single", fa: "مجرد", ps: "ناواده" },
      married: { en: "Married", fa: "متأهل", ps: "واده شوی" },
    },
    employment_status: {
      active: { en: "Active", fa: "فعال", ps: "فعال" },
      inactive: { en: "Inactive", fa: "غیرفعال", ps: "غیرفعال" },
    },
  };
  return choices[key]?.[String(value)]?.[language] ?? fallback;
}


// HQNATEX_HR_TABLE_TRANSLATION_V1
function employeeTableLabel(
  key: string,
  language: Language,
  fallback: string,
): string {
  const labels: Record<string, Record<Language, string>> = {
    branch_id: { en: "Branch", fa: "شعبه", ps: "څانګه" },
    employee_number: {
      en: "Employee number", fa: "شماره کارمند", ps: "د کارکوونکي شمېره",
    },
    first_name: { en: "First name", fa: "نام", ps: "نوم" },
    last_name: { en: "Last name", fa: "تخلص", ps: "تخلص" },
    father_name: { en: "Father name", fa: "نام پدر", ps: "د پلار نوم" },
    gender: { en: "Gender", fa: "جنسیت", ps: "جنسیت" },
    marital_status: {
      en: "Marital status", fa: "وضعیت تأهل", ps: "د واده حالت",
    },
    employment_status: {
      en: "Employment status", fa: "وضعیت استخدام", ps: "د ګمارنې حالت",
    },
    created_at: {
      en: "Created at", fa: "تاریخ ثبت", ps: "د ثبت نېټه",
    },
    updated_at: {
      en: "Updated at", fa: "تاریخ بروزرسانی", ps: "د نوي کولو نېټه",
    },
  };
  return labels[key]?.[language] ?? fallback;
}


// HQNATEX_HR_DIRECTORY_REFERENCE_V1
function EmployeeDirectory({
  rows, session, language, onView, onEdit, readOnly,
}: {
  rows: Row[];
  session: Session;
  language: Language;
  onView: (row: Row) => void;
  onEdit: (row: Row) => void;
  readOnly: boolean;
}) {
  const tr = (en: string, fa: string, ps: string) =>
    language === "fa" ? fa : language === "ps" ? ps : en;

  const scope = JSON.stringify([
    session.tenantId, session.companyId, session.access,
  ]);

  const [lookup, setLookup] = useState<{
    scope: string;
    names: Record<string, string>;
    failed: boolean;
  }>({ scope: "", names: {}, failed: false });

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const load = async () => {
      const names: Record<string, string> = {};

      const results = await Promise.allSettled([
        ["branch_id", "/api/v1/branches/"],
        ["department",
          RESOURCES.find(r => r.key === "departments")?.path],
        ["position",
          RESOURCES.find(r => r.key === "positions")?.path],
      ].map(async ([key, endpoint]) => {
        if (!endpoint || !key) {
          throw new Error("Missing relation endpoint");
        }

        for (let page = 1; page <= 50; page++) {
          const separator = endpoint.includes("?") ? "&" : "?";
          const data = await api<Row[] | Paginated<Row>>(
            `${endpoint}${separator}page=${page}`,
            { signal: controller.signal },
            session,
          );

          const batch = Array.isArray(data)
            ? data : data.results;

          for (const row of batch) {
            const name = [row.code, row.name]
              .filter(Boolean).join(" — ");
            if (row.id != null && name) {
              names[`${key}:${row.id}`] = name;
            }
          }

          if (Array.isArray(data) || !data.next) return;
          if (page === 50) {
            throw new Error("Relation pagination limit");
          }
        }
      }));

      if (active) {
        setLookup({
          scope,
          names,
          failed: results.some(r => r.status === "rejected"),
        });
      }
    };

    void load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [
    scope, session.tenantId,
    session.companyId, session.access,
  ]);

  const relation = (row: Row, key: string) => {
    const value = row[key];
    if (value == null || value === "") return "—";
    if (lookup.scope !== scope) return "…";
    return lookup.names[`${key}:${value}`] || String(value);
  };

  const actions = tr("Actions", "عملیات", "کړنې");

  return (
    <div
      className="hq-employee-directory"
      dir={language === "en" ? "ltr" : "rtl"}
    >
      {lookup.scope === scope && lookup.failed && (
        <p role="status" className="p-3 text-xs text-amber-600">
          {tr(
            "Some organization names could not be loaded.",
            "نام برخی بخش‌های سازمانی بارگیری نشد.",
            "د ځینو سازماني برخو نومونه نه شول پورته کېدای.",
          )}
        </p>
      )}

      <div className="overflow-x-auto">
        <SharedDataTable native>
          <thead>
            <tr>
              {[
                tr("Employee", "کارمند", "کارکوونکی"),
                tr("Employee number", "شماره کارمند",
                   "د کارکوونکي شمېره"),
                tr("Branch", "شعبه", "څانګه"),
                tr("Department", "دیپارتمنت", "ډیپارټمنټ"),
                tr("Position", "بست", "بست"),
                tr("Status", "وضعیت", "حالت"),
                actions,
              ].map(label => (
                <th key={label} scope="col">{label}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row, index) => {
              const name = [row.first_name, row.last_name]
                .filter(Boolean).join(" ") || "—";

              return (
                <tr key={String(row.id ?? index)}>
                  <td>
                    <div className="hq-directory-person">
                      <div className="hq-directory-avatar">
                        {row.photo_url ? (
                          <EmployeeStoredPhoto
                            session={session}
                            employeeId={row.id}
                            photoUrl={row.photo_url}
                            className="h-full w-full object-cover"
                            alt={name}
                          />
                        ) : (
                          <Users
                            aria-hidden="true"
                            className="h-5 w-5"
                          />
                        )}
                      </div>
                      <div>
                        <strong>{name}</strong>
                        <small dir="auto">
                          {String(row.email || row.phone || "—")}
                        </small>
                      </div>
                    </div>
                  </td>

                  <td dir="auto">
                    {String(row.employee_number || "—")}
                  </td>

                  {["branch_id", "department", "position"].map(key => (
                    <td key={key}>{relation(row, key)}</td>
                  ))}

                  <td>
                    <span
                      className="hq-directory-status"
                      data-status={String(row.employment_status)}
                    >
                      {employeeChoiceLabel(
                        "employment_status",
                        row.employment_status,
                        language,
                        String(row.employment_status || "—"),
                      )}
                    </span>
                  </td>

                  <td>
                    <div className="flex gap-2">
                      <SharedSecondaryButton
                        type="button"
                        onClick={() => onView(row)}
                        aria-label={`${tr("View", "مشاهده", "کتل")} ${name}`}
                        title={tr("View", "مشاهده", "کتل")}
                      >
                        <Eye className="h-4 w-4" />
                      </SharedSecondaryButton>

                      {!readOnly && (
                        <SharedSecondaryButton
                          type="button"
                          onClick={() => onEdit(row)}
                          aria-label={`${tr("Edit", "ویرایش", "سمول")} ${name}`}
                          title={tr("Edit", "ویرایش", "سمول")}
                        >
                          <Pencil className="h-4 w-4" />
                        </SharedSecondaryButton>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </SharedDataTable>
      </div>
    </div>
  );
}

export function HRPayrollModule({
  session,
}: Props) {

  const language =
    useLanguage();

  const c =
    COPY[language];

  const [employeeTab, setEmployeeTab] = useState("basic");

  const rtl =
    language !== "en";

  const [
    activeGroup,
    setActiveGroup,
  ] = useState<GroupKey>(
    "people",
  );

  const [
    activeKey,
    setActiveKey,
  ] = useState(
    "employees",
  );

  const [
    rows,
    setRows,
  ] = useState<Row[]>([]);

  const [
    pageData,
    setPageData,
  ] = useState<
    Paginated<Row> | null
  >(null);

  const [
    metadata,
    setMetadata,
  ] = useState<
    Record<string, MetaField>
  >({});


  const [
    metadataError,
    setMetadataError,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    page,
    setPage,
  ] = useState(1);

  const [
    dashboardCounts,
    setDashboardCounts,
  ] = useState<
    Record<
      string,
      number | null
    >
  >({});

  const [
    modalMode,
    setModalMode,
  ] = useState<
    "view"
    | "create"
    | "edit"
    | null
  >(null);

  const [
    selected,
    setSelected,
  ] = useState<
    Row | null
  >(null);

  const [
    form,
    setForm,
  ] = useState<
    Record<string, unknown>
  >({});

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    processingId,
    setProcessingId,
  ] = useState<
    string | null
  >(null);


  const activeResource =
    useMemo(
      () =>
        RESOURCES.find(
          (resource) =>
            resource.key ===
            activeKey,
        ) ??
        RESOURCES[0],
      [activeKey],
    );


  const resourcesForGroup =
    useMemo(
      () =>
        RESOURCES.filter(
          (resource) =>
            resource.group ===
            activeGroup,
        ),
      [activeGroup],
    );


  const metadataEntries =
    useMemo(
      () =>
        Object.entries(
          metadata,
        ) as Array<
          [
            string,
            MetaField,
          ]
        >,
      [metadata],
    );


  const titleFor =
    useCallback(
      (
        resource: Resource,
      ) =>
        resource.title[
          language
        ],
      [language],
    );


  const fieldLabel =
    useCallback(
      (
        key: string,
        field?: MetaField,
      ) => {
        if (key === "marital_status") {
          return language === "fa"
            ? "وضعیت تأهل"
            : language === "ps"
              ? "د واده حالت"
              : "Marital status";
        }


        const translated =
          FIELD_LABELS[key];

        if (translated) {
          return translated[
            language
          ];
        }

        return (
          field?.label ||
          humanize(key)
        );
      },
      [language],
    );


  // HQNATEX_HR_METADATA_CONSUMER_FIX_V1
  const loadMetadata =
    useCallback(
      async (
        resource: Resource,
      ): Promise<
        Record<
          string,
          MetaField
        >
      > => {

        setMetadataError("");

        try {

          // HQNATEX_HR_METADATA_TRANSPORT_V4_1
          //
          // Cloud Shell DEV:
          // Browser GET -> Vite rewrite -> DRF OPTIONS.
          //
          // Production keeps the canonical OPTIONS request.
          const useMetadataBridge =
            import.meta.env.DEV &&
            !import.meta.env.VITE_API_BASE_URL;

          const metadataPath =
            useMetadataBridge
              ? `/__hqnatex/hr-form-metadata?path=${encodeURIComponent(
                  resource.path,
                )}`
              : resource.path;

          const response =
            await api<unknown>(
              metadataPath,
              {
                method:
                  useMetadataBridge
                    ? "GET"
                    : "OPTIONS",
              },
              session,
            );

          const fields =
            metadataFromOptions(
              response,
            );

          if (
            Object.keys(
              fields,
            ).length === 0
          ) {

            throw new Error(
              `FORM_METADATA_EMPTY:${resource.key}`,
            );

          }

          setMetadata(
            fields,
          );

          setMetadataError("");

          return fields;

        } catch (err) {

          const message =
            err instanceof Error
              ? err.message
              : String(err);

          console.error(
            "HQNATEX_HR_FORM_METADATA_FAILURE",
            {
              resource:
                resource.key,
              path:
                resource.path,
              message,
            },
          );

          setMetadata({});

          setMetadataError(
            message,
          );

          return {};

        }

      },
      [
        session.access,
        session.tenantId,
        session.companyId,
      ],
    );


  const loadResource =
    useCallback(
      async () => {

        setLoading(true);
        setError("");

        try {

          const query =
            new URLSearchParams();

          query.set(
            "page",
            String(page),
          );

          if (
            search.trim()
          ) {
            query.set(
              "search",
              search.trim(),
            );
          }

          const data =
            await api<
              Paginated<Row>
            >(
              `${activeResource.path}?${query.toString()}`,
              {},
              session,
            );

          setPageData(
            data,
          );

          setRows(
            data.results || [],
          );

          await loadMetadata(
            activeResource,
          );

        } catch (err) {

          setRows([]);
          setPageData(null);

          setError(
            err instanceof Error
              ? err.message
              : String(err),
          );

        } finally {

          setLoading(false);

        }

      },
      [
        activeResource,
        page,
        search,
        session.access,
        session.tenantId,
        session.companyId,
        loadMetadata,
      ],
    );


  const loadDashboard =
    useCallback(
      async () => {

        const targets = [
          "employees",
          "attendances",
          "leave-requests",
          "payroll-runs",
          "vacancies",
          "terminations",
        ];

        const tasks =
          targets.map(
            async (
              key,
            ) => {

              const resource =
                RESOURCES.find(
                  (item) =>
                    item.key ===
                    key,
                );

              if (!resource) {
                throw new Error(
                  `RESOURCE_NOT_FOUND:${key}`,
                );
              }

              const data =
                await api<
                  Paginated<Row>
                >(
                  `${resource.path}?page=1`,
                  {},
                  session,
                );

              return {
                key,
                count:
                  data.count || 0,
              };

            },
          );

        const results =
          await Promise.allSettled(
            tasks,
          );

        const next:
          Record<
            string,
            number | null
          > = {};

        results.forEach(
          (
            result,
            index,
          ) => {

            const key =
              targets[index];

            next[key] =
              result.status ===
              "fulfilled"
                ? result.value.count
                : null;

          },
        );

        setDashboardCounts(
          next,
        );

      },
      [
        session.access,
        session.tenantId,
        session.companyId,
      ],
    );


  useEffect(
    () => {
      void loadDashboard();
    },
    [loadDashboard],
  );


  useEffect(
    () => {
      void loadResource();
    },
    [loadResource],
  );


  const visibleFields =
    useMemo(
      () => {

        const excluded =
          new Set([
            "id",
            "tenant",
            "company",
            "notes",
            "updated_at",
          ]);

        const metaKeys =
          metadataEntries
            .map(
              ([key]) =>
                key,
            )
            .filter(
              (key) =>
                !excluded.has(
                  key,
                ),
            );

        if (
          metaKeys.length
        ) {
          return metaKeys.slice(
            0,
            8,
          );
        }

        if (
          rows.length
        ) {
          return Object.keys(
            rows[0],
          )
            .filter(
              (key) =>
                !excluded.has(
                  key,
                ),
            )
            .slice(
              0,
              8,
            );
        }

        return [];

      },
      [
        metadataEntries,
        rows,
      ],
    );


  // HQNATEX_HR_SMART_FORM_RENDERER_V1

  const [
    fieldErrors,
    setFieldErrors,
  ] = useState<
    Record<string, string>
  >({});


  useEffect(() => {
    const key = Object.keys(fieldErrors)[0];
    if (!key) return;
    setEmployeeTab(
      ["branch_id", "user", "department", "position", "manager"]
        .includes(key) ? "job" :
      key === "notes" ? "notes" : "basic"
    );
  }, [fieldErrors]);

  const [
    relationOptions,
    setRelationOptions,
  ] = useState<
    Record<
      string,
      Array<{
        value: string;
        label: string;
      }>
    >
  >({});


  const [
    relationLoading,
    setRelationLoading,
  ] = useState<
    Record<string, boolean>
  >({});


  const [
    relationSearch,
    setRelationSearch,
  ] = useState<
    Record<string, string>
  >({});


  const smartFieldLabels:
    Record<
      string,
      {
        en: string;
        fa: string;
        ps: string;
      }
    > = {

      branch_id: {
        en: "Branch",
        fa: "شعبه",
        ps: "څانګه",
      },

      branch: {
        en: "Branch",
        fa: "شعبه",
        ps: "څانګه",
      },

      notes: {
        en: "Notes",
        fa: "یادداشت",
        ps: "یادښت",
      },

      code: {
        en: "Code",
        fa: "کد",
        ps: "کوډ",
      },

      name: {
        en: "Name",
        fa: "نام",
        ps: "نوم",
      },

      description: {
        en: "Description",
        fa: "توضیحات",
        ps: "تشریح",
      },

      status: {
        en: "Status",
        fa: "وضعیت",
        ps: "حالت",
      },

      metadata: {
        en: "Metadata",
        fa: "معلومات اضافی",
        ps: "اضافي معلومات",
      },

      parent: {
        en: "Parent",
        fa: "بخش بالادست",
        ps: "لوړه برخه",
      },

      employee_number: {
        en: "Employee number",
        fa: "شماره کارمند",
        ps: "د کارمند شمېره",
      },

      first_name: {
        en: "First name",
        fa: "نام",
        ps: "نوم",
      },

      last_name: {
        en: "Last name",
        fa: "تخلص",
        ps: "تخلص",
      },

      father_name: {
        en: "Father name",
        fa: "نام پدر",
        ps: "د پلار نوم",
      },

      gender: {
        en: "Gender",
        fa: "جنسیت",
        ps: "جنسیت",
      },

      date_of_birth: {
        en: "Date of birth",
        fa: "تاریخ تولد",
        ps: "د زېږېدو نېټه",
      },

      national_id: {
        en: "National ID",
        fa: "شماره تذکره",
        ps: "د تذکرې شمېره",
      },

      passport_number: {
        en: "Passport number",
        fa: "شماره پاسپورت",
        ps: "د پاسپورټ شمېره",
      },

      phone: {
        en: "Phone",
        fa: "شماره تماس",
        ps: "د اړیکې شمېره",
      },

      alternate_phone: {
        en: "Alternate phone",
        fa: "شماره تماس بدیل",
        ps: "بدیل د اړیکې شمېره",
      },

      email: {
        en: "Email",
        fa: "ایمیل",
        ps: "برېښنالیک",
      },

      address: {
        en: "Address",
        fa: "آدرس",
        ps: "پته",
      },

      hire_date: {
        en: "Hire date",
        fa: "تاریخ استخدام",
        ps: "د استخدام نېټه",
      },

      employment_status: {
        en: "Employment status",
        fa: "وضعیت استخدام",
        ps: "د استخدام حالت",
      },

      photo_url: {
        en: "Photo URL",
        fa: "لینک عکس",
        ps: "د عکس لینک",
      },

      user: {
        en: "User account",
        fa: "حساب کاربری",
        ps: "کارن حساب",
      },

      department: {
        en: "Department",
        fa: "دیپارتمنت",
        ps: "څانګه",
      },

      position: {
        en: "Position",
        fa: "بست",
        ps: "بست",
      },

      manager: {
        en: "Manager",
        fa: "مدیر",
        ps: "مدیر",
      },

      level: {
        en: "Level",
        fa: "سطح",
        ps: "کچه",
      },

      min_salary: {
        en: "Minimum salary",
        fa: "حداقل معاش",
        ps: "لږ تر لږه معاش",
      },

      max_salary: {
        en: "Maximum salary",
        fa: "حداکثر معاش",
        ps: "اعظمي معاش",
      },

      start_time: {
        en: "Start time",
        fa: "زمان شروع",
        ps: "د پیل وخت",
      },

      end_time: {
        en: "End time",
        fa: "زمان ختم",
        ps: "د پای وخت",
      },

      break_minutes: {
        en: "Break minutes",
        fa: "دقایق استراحت",
        ps: "د دمې دقیقې",
      },

      working_days: {
        en: "Working days",
        fa: "روزهای کاری",
        ps: "کاري ورځې",
      },

      annual_quota_days: {
        en: "Annual leave quota",
        fa: "سهمیه سالانه رخصتی",
        ps: "د رخصتۍ کلنۍ ونډه",
      },

      is_paid: {
        en: "Paid leave",
        fa: "رخصتی با معاش",
        ps: "با معاشه رخصتي",
      },

      start_date: {
        en: "Start date",
        fa: "تاریخ شروع",
        ps: "د پیل نېټه",
      },

      end_date: {
        en: "End date",
        fa: "تاریخ ختم",
        ps: "د پای نېټه",
      },

      days: {
        en: "Days",
        fa: "روزها",
        ps: "ورځې",
      },

      reason: {
        en: "Reason",
        fa: "دلیل",
        ps: "دلیل",
      },

      employee: {
        en: "Employee",
        fa: "کارمند",
        ps: "کارمند",
      },

      leave_type: {
        en: "Leave type",
        fa: "نوع رخصتی",
        ps: "د رخصتۍ ډول",
      },

      approved_at: {
        en: "Approved at",
        fa: "زمان تایید",
        ps: "د تایید وخت",
      },

      approved_by: {
        en: "Approved by",
        fa: "تاییدکننده",
        ps: "تاییدوونکی",
      },

      run_number: {
        en: "Payroll run number",
        fa: "شماره اجرای معاش",
        ps: "د معاش اجرا شمېره",
      },

      processed_at: {
        en: "Processed at",
        fa: "زمان اجرا",
        ps: "د اجرا وخت",
      },

      period: {
        en: "Payroll period",
        fa: "دوره معاش",
        ps: "د معاش دوره",
      },

      processed_by: {
        en: "Processed by",
        fa: "اجراکننده",
        ps: "اجرا کوونکی",
      },

      effective_from: {
        en: "Effective from",
        fa: "قابل اجرا از",
        ps: "له نېټې د تطبیق",
      },

      base_salary: {
        en: "Base salary",
        fa: "معاش پایه",
        ps: "اساسي معاش",
      },

      currency: {
        en: "Currency",
        fa: "ارز",
        ps: "اسعار",
      },

      pay_frequency: {
        en: "Pay frequency",
        fa: "دوره پرداخت",
        ps: "د معاش ورکولو دوره",
      },

      shift: {
        en: "Shift",
        fa: "شیفت",
        ps: "شفټ",
      },

    };


  const smartFieldLabel =
    (
      key: string,
      field: MetaField,
    ) => {

      const translated =
        smartFieldLabels[
          key
        ];

      if (translated) {

        return language ===
          "fa"
          ? translated.fa
          : language ===
              "ps"
            ? translated.ps
            : translated.en;

      }

      return fieldLabel(
        key,
        field,
      );

    };


  // HQNATEX_HR_SOURCE_GROUNDED_CONTROLS_V1
  //
  // Audit result:
  // - metadata is a free JSON object.
  // - working_days is a JSON list but Backend publishes no
  //   canonical day-token choices.
  //
  // Therefore working_days is handled as a generic list editor,
  // not as raw JSON and not as a fabricated weekday dropdown.
  const isJsonField =
    (
      key: string,
    ) =>
      key === "metadata";


  const canonicalCreateDefaultsFor =
    (
      resourceKey: string,
    ): Record<
      string,
      unknown
    > => {

      const defaults:
        Record<
          string,
          Record<
            string,
            unknown
          >
        > = {

          departments: {
            status:
              "active",
          },

          positions: {
            status:
              "active",
          },

          employees: {
            employment_status:
              "active",
          },

          shifts: {
            working_days:
              "",
            status:
              "active",
          },

          "leave-types": {
            annual_quota_days:
              "0",
            is_paid:
              true,
            status:
              "active",
          },

          "leave-requests": {
            status:
              "pending",
          },

          "payroll-periods": {
            status:
              "open",
          },

          "payroll-runs": {
            status:
              "draft",
          },

          "salary-profiles": {
            base_salary:
              "0",
            currency:
              "AFN",
            pay_frequency:
              "monthly",
            status:
              "active",
          },

        };


      return (
        defaults[
          resourceKey
        ] ?? {}
      );

    };


  const workingDaysFromFormValue =
    (
      value: unknown,
    ): string[] => {

      if (
        Array.isArray(
          value,
        )
      ) {

        return value
          .map(
            (
              item,
            ) =>
              String(
                item,
              ).trim(),
          )
          .filter(Boolean);

      }


      if (
        typeof value !==
          "string"
      ) {
        return [];
      }


      const trimmed =
        value.trim();


      if (!trimmed) {
        return [];
      }


      // Accept legacy JSON-list input safely.
      if (
        trimmed.indexOf(
          "[",
        ) === 0
      ) {

        try {

          const parsed =
            JSON.parse(
              trimmed,
            );


          if (
            Array.isArray(
              parsed,
            )
          ) {

            return parsed
              .map(
                (
                  item,
                ) =>
                  String(
                    item,
                  ).trim(),
              )
              .filter(
                Boolean,
              );

          }

        } catch {

          // Fall through to generic token parsing.
        }

      }


      return trimmed
        .split(
          /[,;\n]+/,
        )
        .map(
          (
            item,
          ) =>
            item.trim(),
        )
        .filter(Boolean);

    };


  const relationEndpointFor =
    (
      key: string,
    ): string | null => {

      if (
        key === "branch" ||
        key === "branch_id"
      ) {
        return "/api/v1/branches/";
      }

      const direct:
        Record<string, string> = {

          employee:
            "employees",

          manager:
            "employees",

          department:
            "departments",

          position:
            "positions",

          leave_type:
            "leave-types",

          period:
            "payroll-periods",

          shift:
            "shifts",

          parent:
            "departments",

        };


      const resourceKey =
        direct[key];


      if (resourceKey) {

        const resource =
          RESOURCES.find(
            (item) =>
              item.key ===
              resourceKey,
          );

        return (
          resource?.path ??
          null
        );

      }


      const normalized =
        key
          .replace(
            /_id$/,
            "",
          )
          .replace(
            /_/g,
            "-",
          );


      const genericCandidates =
        [
          normalized,
          `${normalized}s`,
        ];


      const generic =
        RESOURCES.find(
          (item) =>
            genericCandidates
              .indexOf(
                item.key,
              ) >= 0,
        );


      return (
        generic?.path ??
        null
      );

    };


  const selectorLabel =
    (
      row: Row,
    ) => {

      const id =
        row.id ===
          undefined ||
        row.id ===
          null
          ? ""
          : String(
              row.id,
            );


      const employeeNumber =
        row.employee_number
          ? String(
              row.employee_number,
            )
          : "";


      const firstName =
        row.first_name
          ? String(
              row.first_name,
            )
          : "";


      const lastName =
        row.last_name
          ? String(
              row.last_name,
            )
          : "";


      if (
        employeeNumber ||
        firstName ||
        lastName
      ) {

        return [
          employeeNumber,
          [
            firstName,
            lastName,
          ]
            .filter(Boolean)
            .join(" "),
        ]
          .filter(Boolean)
          .join(" — ");

      }


      const code =
        row.code
          ? String(
              row.code,
            )
          : "";


      const name =
        row.name
          ? String(
              row.name,
            )
          : "";


      if (
        code ||
        name
      ) {

        return [
          code,
          name,
        ]
          .filter(Boolean)
          .join(" — ");

      }


      const runNumber =
        row.run_number
          ? String(
              row.run_number,
            )
          : "";


      if (runNumber) {
        return runNumber;
      }


      return id;

    };


  const loadSelectorRows =
    async (
      endpoint: string,
    ): Promise<Row[]> => {

      const output:
        Row[] = [];

      let pageNumber = 1;


      while (
        pageNumber <= 50
      ) {

        const separator =
          endpoint.indexOf(
            "?",
          ) >= 0
            ? "&"
            : "?";


        const response =
          await api<unknown>(
            `${endpoint}${separator}page=${pageNumber}`,
            {},
            session,
          );


        if (
          Array.isArray(
            response,
          )
        ) {

          return response as
            Row[];

        }


        if (
          !response ||
          typeof response !==
            "object"
        ) {
          break;
        }


        const envelope =
          response as {
            count?: unknown;
            next?: unknown;
            results?: unknown;
          };


        const batch =
          Array.isArray(
            envelope.results,
          )
            ? (
                envelope.results as
                  Row[]
              )
            : [];


        output.push(
          ...batch,
        );


        if (
          batch.length === 0 ||
          !envelope.next
        ) {
          break;
        }


        pageNumber += 1;

      }


      return output;

    };


  const loadRelationOptions =
    async (
      meta:
        Record<
          string,
          MetaField
        >,
    ) => {

      const nextOptions:
        Record<
          string,
          Array<{
            value: string;
            label: string;
          }>
        > = {};


      const loading:
        Record<string, boolean> = {};


      const endpointCache:
        Record<
          string,
          Row[]
        > = {};


      const entries =
        Object.entries(
          meta,
        ) as Array<
          [
            string,
            MetaField,
          ]
        >;


      for (
        const [
          key,
          field,
        ] of entries
      ) {

        if (
          field.read_only ||
          isJsonField(
            key,
          )
        ) {
          continue;
        }


        const endpoint =
          relationEndpointFor(
            key,
          );


        if (!endpoint) {
          continue;
        }


        loading[key] =
          true;

      }


      setRelationLoading(
        loading,
      );


      for (
        const [
          key,
          field,
        ] of entries
      ) {

        if (
          field.read_only ||
          isJsonField(
            key,
          )
        ) {
          continue;
        }


        const endpoint =
          relationEndpointFor(
            key,
          );


        if (!endpoint) {
          continue;
        }


        try {

          if (
            !endpointCache[
              endpoint
            ]
          ) {

            endpointCache[
              endpoint
            ] =
              await loadSelectorRows(
                endpoint,
              );

          }


          nextOptions[key] =
            endpointCache[
              endpoint
            ]
              .map(
                (
                  row,
                ) => ({

                  value:
                    row.id ===
                      undefined ||
                    row.id ===
                      null
                      ? ""
                      : String(
                          row.id,
                        ),

                  label:
                    selectorLabel(
                      row,
                    ),

                }),
              )
              .filter(
                (
                  option,
                ) =>
                  Boolean(
                    option.value,
                  ),
              );

        } catch (
          error
        ) {

          console.error(
            "HQNATEX_HR_RELATION_SELECTOR_FAILURE",
            {
              field:
                key,
              endpoint,
              error,
            },
          );

          nextOptions[key] =
            [];

        }

      }


      setRelationOptions(
        nextOptions,
      );

      setRelationLoading({});

      setRelationSearch({});

    };


  const localRequiredMessage =
    language === "fa"
      ? "این فیلد الزامی است."
      : language === "ps"
        ? "دا فیلډ اړین دی."
        : "This field is required.";


  const localInvalidJsonMessage =
    language === "fa"
      ? "ساختار JSON معتبر نیست."
      : language === "ps"
        ? "د JSON جوړښت سم نه دی."
        : "Invalid JSON structure.";


  const validateLocalForm =
    () => {

      const nextErrors:
        Record<string, string> = {};


      metadataEntries.forEach(
        (
          [
            key,
            field,
          ],
        ) => {

          if (
            field.read_only
          ) {
            return;
          }


          const value =
            form[key];


          if (
            field.required &&
            (
              value === "" ||
              value === null ||
              value === undefined
            )
          ) {

            nextErrors[key] =
              localRequiredMessage;

            return;

          }


          if (
            isJsonField(
              key,
            ) &&
            typeof value ===
              "string" &&
            value.trim() !== ""
          ) {

            try {

              JSON.parse(
                value,
              );

            } catch {

              nextErrors[key] =
                localInvalidJsonMessage;

            }

          }

        },
      );


      setFieldErrors(
        nextErrors,
      );


      return (
        Object.keys(
          nextErrors,
        ).length === 0
      );

    };


  const parseBackendErrors =
    (
      raw: string,
    ) => {

      const next:
        Record<string, string> = {};

      let globalMessage = "";


      try {

        const parsed =
          JSON.parse(
            raw,
          ) as
            Record<
              string,
              unknown
            >;


        Object.entries(
          parsed,
        ).forEach(
          (
            [
              key,
              value,
            ],
          ) => {

            const message =
              Array.isArray(
                value,
              )
                ? value
                    .map(
                      (
                        item,
                      ) =>
                        String(
                          item,
                        ),
                    )
                    .join(" ")
                : typeof value ===
                    "string"
                  ? value
                  : JSON.stringify(
                      value,
                    );


            if (
              key ===
                "detail" ||
              key ===
                "non_field_errors"
            ) {

              globalMessage =
                message;

            } else {

              next[key] =
                message;

            }

          },
        );

      } catch {

        globalMessage =
          raw;

      }


      return {
        fields:
          next,

        global:
          globalMessage,
      };

    };


  const openCreate =
    async () => {

      setMetadataError("");
      setFieldErrors({});
      setRelationSearch({});

      const meta =
        await loadMetadata(
          activeResource,
        );

      setSelected(
        null,
      );


      if (
        Object.keys(
          meta,
        ).length === 0
      ) {

        setForm({});

        setModalMode(
          "create",
        );

        return;

      }


      await loadRelationOptions(
        meta,
      );


      const defaults =
        canonicalCreateDefaultsFor(
          activeResource.key,
        );


      const initial:
        Record<
          string,
          unknown
        > = {};


      (
        Object.entries(
          meta,
        ) as Array<
          [
            string,
            MetaField,
          ]
        >
      ).forEach(
        (
          [
            key,
            field,
          ],
        ) => {

          if (
            field.read_only
          ) {
            return;
          }


          if (
            Object.prototype
              .hasOwnProperty
              .call(
                defaults,
                key,
              )
          ) {

            initial[key] =
              defaults[
                key
              ];

          } else if (
            field.type ===
            "boolean"
          ) {

            initial[key] =
              false;

          } else if (
            key ===
            "working_days"
          ) {

            initial[key] =
              "";

          } else if (
            key ===
            "metadata"
          ) {

            initial[key] =
              "{}";

          } else {

            initial[key] =
              "";

          }

        },
      );


      setForm(
        initial,
      );

      setEmployeeTab("basic");
      setModalMode(
        "create",
      );

    };


  const openEdit =
    async (
      row: Row,
    ) => {

      setMetadataError("");
      setFieldErrors({});
      setRelationSearch({});


      const meta =
        await loadMetadata(
          activeResource,
        );


      if (
        Object.keys(
          meta,
        ).length === 0
      ) {

        setForm({});
        setSelected(row);

        setModalMode(
          "edit",
        );

        return;

      }


      await loadRelationOptions(
        meta,
      );


      const initial:
        Record<
          string,
          unknown
        > = {};


      (
        Object.entries(
          meta,
        ) as Array<
          [
            string,
            MetaField,
          ]
        >
      ).forEach(
        (
          [
            key,
            field,
          ],
        ) => {

          if (
            field.read_only
          ) {
            return;
          }


          const value =
            row[key];


          if (
            key ===
            "working_days"
          ) {

            initial[key] =
              workingDaysFromFormValue(
                value,
              ).join(
                ", ",
              );


          } else if (
            isJsonField(
              key,
            )
          ) {

            if (
              typeof value ===
                "string"
            ) {

              initial[key] =
                value;

            } else {

              initial[key] =
                JSON.stringify(
                  value ?? {},
                  null,
                  2,
                );

            }


          } else if (
            field.type ===
              "datetime" &&
            typeof value ===
              "string"
          ) {

            initial[key] =
              value.length >= 16
                ? value.slice(
                    0,
                    16,
                  )
                : value;


          } else if (
            value &&
            typeof value ===
              "object" &&
            "id" in value
          ) {

            initial[key] =
              (
                value as {
                  id?: unknown;
                }
              ).id ?? "";


          } else {

            initial[key] =
              value ?? "";

          }

        },
      );


      setForm(
        initial,
      );

      setSelected(
        row,
      );

      setEmployeeTab("basic");
      setModalMode(
        "edit",
      );

    };


  const openView =
    (
      row: Row,
    ) => {

      setSelected(
        row,
      );

      setModalMode(
        "view",
      );
    };


  const payloadFromForm =
    () => {

      const payload:
        Record<
          string,
          unknown
        > = {};


      metadataEntries.forEach(
        (
          [
            key,
            field,
          ],
        ) => {

          // HQNATEX_HR_PHOTO_PAYLOAD_FIX_V1
          // The backend owns photo_url; photo files use multipart upload.
          if (
            field.read_only ||
            (activeResource.key === "employees" && key === "photo_url")
          ) {
            return;
          }


          let value =
            form[key];


          if (
            key ===
            "working_days"
          ) {

            value =
              workingDaysFromFormValue(
                value,
              );

          } else if (
            isJsonField(
              key,
            ) &&
            typeof value ===
              "string" &&
            value.trim() !== ""
          ) {

            value =
              JSON.parse(
                value,
              );

          }


          if (
            value === "" &&
            field.allow_null
          ) {

            value =
              null;

          }


          payload[key] =
            value;

        },
      );


      return payload;

    };


  // HQNATEX_HR_EMPLOYEE_PHOTO_UPLOAD_V1_FRONTEND
  const [
    employeePhotoFile,
    setEmployeePhotoFile,
  ] = useState<File | null>(
    null,
  );

  const [
    employeePhotoPreview,
    setEmployeePhotoPreview,
  ] = useState(
    "",
  );


  useEffect(
    () => {

      setEmployeePhotoFile(
        null,
      );

      setEmployeePhotoPreview(
        "",
      );

    },
    [
      modalMode,
      selected?.id,
      activeResource.key,
    ],
  );


  useEffect(
    () => {

      return () => {

        if (
          employeePhotoPreview
            .startsWith(
              "blob:",
            )
        ) {

          URL.revokeObjectURL(
            employeePhotoPreview,
          );

        }

      };

    },
    [
      employeePhotoPreview,
    ],
  );


  const employeeMutationBody =
    (
      payload:
        Record<string, unknown>,
    ): BodyInit => {

      if (
        activeResource.key !==
          "employees"
        ||
        !employeePhotoFile
      ) {

        return JSON.stringify(
          payload,
        );

      }


      const body =
        new FormData();


      body.append(
        "payload",
        JSON.stringify(
          payload,
        ),
      );


      body.append(
        "photo",
        employeePhotoFile,
        employeePhotoFile.name,
      );


      return body;

    };


  const saveForm =
    async () => {

      setError("");
      setFieldErrors({});


      if (
        !validateLocalForm()
      ) {
        return;
      }


      setSaving(true);


      try {

        const payload =
          payloadFromForm();


        if (
          modalMode ===
          "create"
        ) {

          await api(
            activeResource.path,
            {
              method:
                "POST",

              body:
                employeeMutationBody(payload),
            },
            session,
          );


        } else if (
          modalMode ===
            "edit" &&
          selected?.id
        ) {

          await api(
            `${activeResource.path}${String(selected.id)}/`,
            {
              method:
                "PATCH",

              body:
                employeeMutationBody(payload),
            },
            session,
          );

        }


        setModalMode(
          null,
        );

        setSelected(
          null,
        );

        setFieldErrors({});

        setEmployeePhotoFile(
          null,
        );

        setEmployeePhotoPreview(
          "",
        );

        await loadResource();

        await loadDashboard();


      } catch (
        err
      ) {

        const raw =
          err instanceof Error
            ? err.message
            : String(
                err,
              );


        const parsed =
          parseBackendErrors(
            raw,
          );


        setFieldErrors(
          parsed.fields,
        );


        if (
          parsed.global
        ) {

          setError(
            parsed.global,
          );

        } else if (
          Object.keys(
            parsed.fields,
          ).length === 0
        ) {

          setError(
            raw,
          );

        } else {

          setError("");

        }


      } finally {

        setSaving(false);

      }

    };


  const processPayroll =
    async (
      row: Row,
    ) => {

      if (!row.id) {
        return;
      }

      const id =
        String(
          row.id,
        );

      setProcessingId(
        id,
      );

      try {

        await api(
          `/api/v1/hr/payroll-runs/${id}/generate/`,
          {
            method: "POST",
            body: "{}",
          },
          session,
        );

        await loadResource();
        await loadDashboard();

      } catch (err) {

        setError(
          err instanceof Error
            ? err.message
            : String(err),
        );

      } finally {

        setProcessingId(
          null,
        );

      }
    };


  const exportCsv =
    () => {

      if (
        !rows.length ||
        !visibleFields.length
      ) {
        return;
      }

      const quote =
        (
          value: unknown,
        ) =>
          `"${printable(value)
            .replaceAll(
              '"',
              '""',
            )}"`;

      const content = [
        visibleFields.join(","),
        ...rows.map(
          (row) =>
            visibleFields
              .map(
                (field) =>
                  quote(
                    row[
                      field
                    ],
                  ),
              )
              .join(","),
        ),
      ].join("\n");

      const blob =
        new Blob(
          [content],
          {
            type:
              "text/csv;charset=utf-8",
          },
        );

      const url =
        URL.createObjectURL(
          blob,
        );

      const anchor =
        document.createElement(
          "a",
        );

      anchor.href =
        url;

      anchor.download =
        `${activeResource.key}.csv`;

      anchor.click();

      URL.revokeObjectURL(
        url,
      );
    };


  const renderField =
    (
      key: string,
      field: MetaField,
    ) => {

      if (
        field.read_only
      ) {
        return null;
      }


      const value =
        form[key];


      const errorText =
        fieldErrors[
          key
        ];


      const label =
        smartFieldLabel(
          key,
          field,
        );


      const update =
        (
          next: unknown,
        ) => {

          setForm(
            (current) => ({
              ...current,
              [key]:
                next,
            }),
          );


          setFieldErrors(
            (
              current,
            ) => {

              if (
                !current[
                  key
                ]
              ) {
                return current;
              }


              const nextErrors = {
                ...current,
              };


              delete nextErrors[
                key
              ];


              return nextErrors;

            },
          );

        };


      const requiredMark =
        field.required
          ? " *"
          : "";


      const commonLabel = (
        <span className="mb-1.5 block text-[11px] font-bold text-slate-500 dark:text-slate-300">
          {label}
          <span className="text-rose-500">
            {requiredMark}
          </span>
        </span>
      );


      const errorNode =
        errorText
          ? (
              <div className="mt-1.5 text-[10px] font-bold text-rose-500">
                {errorText}
              </div>
            )
          : null;


      if (
        activeResource.key ===
          "employees"
        &&
        key ===
          "photo_url"
      ) {

        const photoLabel =
          language === "fa"
            ? "عکس کارمند"
            : language === "ps"
              ? "د کارکوونکي عکس"
              : "Employee photo";


        const chooseLabel =
          language === "fa"
            ? "انتخاب عکس"
            : language === "ps"
              ? "عکس انتخاب کړئ"
              : "Choose photo";


        const help =
          language === "fa"
            ? "JPG، PNG یا WebP — حداکثر 5 MB"
            : language === "ps"
              ? "JPG، PNG یا WebP — تر 5 MB پورې"
              : "JPG, PNG or WebP — maximum 5 MB";


        const preview =
          employeePhotoPreview
          ||
          (
            typeof value ===
              "string"
              ? value
              : ""
          );


        return (
          <div
            key={key}
            className="h-full rounded-[1.5rem] border border-cyan-400/15 bg-gradient-to-b from-cyan-500/[0.08] via-white/[0.04] to-blue-500/[0.04] p-4 shadow-lg shadow-cyan-950/5 dark:via-slate-950/20"
          >

            <span className="mb-2 block text-[11px] font-bold text-slate-500 dark:text-slate-300">
              {photoLabel}
            </span>


            <div className="flex flex-col gap-4">

              <div className="flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-[1.25rem] border border-cyan-400/15 bg-white/40 shadow-inner dark:bg-slate-950/30">

                {preview ? (
                  <EmployeeStoredPhoto
                    session={session}
                    employeeId={selected?.id}
                    photoUrl={value}
                    localSrc={employeePhotoPreview}
                    alt={photoLabel}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="px-2 text-center text-[10px] font-bold text-slate-400">
                    {photoLabel}
                  </span>
                )}

              </div>


              <div className="min-w-0 flex-1">

                <label className="inline-flex w-full cursor-pointer items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-2.5 text-xs font-black text-cyan-600 transition hover:bg-cyan-500/15 dark:text-cyan-300">

                  {chooseLabel}

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={
                      (
                        event,
                      ) => {

                        const file =
                          event
                            .currentTarget
                            .files?.[0]
                          ??
                          null;


                        if (!file) {

                          setEmployeePhotoFile(
                            null,
                          );

                          setEmployeePhotoPreview(
                            "",
                          );

                          return;

                        }


                        const allowed = [
                          "image/jpeg",
                          "image/png",
                          "image/webp",
                        ];


                        if (
                          file.type
                          &&
                          !allowed.includes(
                            file.type,
                          )
                        ) {

                          setFieldErrors(
                            (
                              current,
                            ) => ({
                              ...current,
                              photo_url:
                                language === "fa"
                                  ? "فقط عکس JPG، PNG یا WebP مجاز است."
                                  : language === "ps"
                                    ? "یوازې JPG، PNG یا WebP عکس منل کېږي."
                                    : "Only JPG, PNG or WebP images are allowed.",
                            }),
                          );

                          event.currentTarget.value =
                            "";

                          return;

                        }


                        if (
                          file.size >
                            5 * 1024 * 1024
                        ) {

                          setFieldErrors(
                            (
                              current,
                            ) => ({
                              ...current,
                              photo_url:
                                language === "fa"
                                  ? "حجم عکس نباید بیشتر از 5 MB باشد."
                                  : language === "ps"
                                    ? "د عکس اندازه باید له 5 MB څخه زیاته نه وي."
                                    : "The photo must be 5 MB or smaller.",
                            }),
                          );

                          event.currentTarget.value =
                            "";

                          return;

                        }


                        const objectUrl =
                          URL.createObjectURL(
                            file,
                          );


                        setEmployeePhotoFile(
                          file,
                        );

                        setEmployeePhotoPreview(
                          objectUrl,
                        );


                        setFieldErrors(
                          (
                            current,
                          ) => {

                            if (
                              !current
                                .photo_url
                            ) {
                              return current;
                            }


                            const next = {
                              ...current,
                            };

                            delete next
                              .photo_url;

                            return next;

                          },
                        );

                      }
                    }
                  />

                </label>


                <div className="mt-2 text-[10px] font-medium text-slate-400">
                  {help}
                </div>


                {employeePhotoFile && (
                  <div className="mt-1 truncate text-[10px] font-bold text-slate-500 dark:text-slate-300">
                    {employeePhotoFile.name}
                  </div>
                )}

              </div>

            </div>

            {errorNode}

          </div>
        );

      }



      if (
        field.type ===
        "boolean"
      ) {

        return (
          <label
            key={key}
            className={
              `flex items-center justify-between gap-3 rounded-xl border p-3 ${
                errorText
                  ? "border-rose-400/40 bg-rose-500/5"
                  : "border-white/10 bg-white/[0.03]"
              }`
            }
          >

            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
              {label}
              <span className="text-rose-500">
                {requiredMark}
              </span>
            </span>

            <input
              type="checkbox"
              checked={
                Boolean(
                  value,
                )
              }
              onChange={
                (
                  event,
                ) =>
                  update(
                    event
                      .target
                      .checked,
                  )
              }
              className="h-4 w-4 rounded"
            />

            {errorNode}

          </label>
        );

      }


      if (
        field.choices &&
        field.choices.length
      ) {

        return (
          <label
            key={key}
            className="block"
          >

            {commonLabel}

            <SharedSelect
              value={
                value ===
                  undefined ||
                value ===
                  null
                  ? ""
                  : String(
                      value,
                    )
              }
              onChange={
                (
                  event,
                ) => {

                  const raw =
                    event
                      .target
                      .value;


                  const selectedChoice =
                    field.choices
                      ?.find(
                        (
                          choice,
                        ) =>
                          String(
                            choice.value,
                          ) ===
                          raw,
                      );


                  update(
                    selectedChoice
                      ? selectedChoice
                          .value
                      : raw,
                  );

                }
              }
              className={
                `w-full rounded-xl border bg-white/5 px-3 py-2.5 text-xs outline-none ${
                  errorText
                    ? "border-rose-400/50"
                    : "border-white/10 focus:border-cyan-400/40"
                }`
              }
            >

              <option value="">
                {
                  language === "fa"
                    ? "انتخاب کنید..."
                    : language === "ps"
                      ? "انتخاب کړئ..."
                      : "Select..."
                }
              </option>

              {field.choices.map(
                (
                  choice,
                ) => (
                  <option
                    key={
                      String(
                        choice.value,
                      )
                    }
                    value={
                      String(
                        choice.value,
                      )
                    }
                  >
                    {activeResource.key === "employees"
                      ? employeeChoiceLabel(
                          key, choice.value, language, choice.display_name
                        )
                      : choice.display_name}
                  </option>
                ),
              )}

            </SharedSelect>

            {errorNode}

          </label>
        );

      }


      const relationEndpoint =
        relationEndpointFor(
          key,
        );


      if (
        relationEndpoint &&
        !isJsonField(
          key,
        )
      ) {

        const options =
          relationOptions[
            key
          ] ?? [];


        const search =
          relationSearch[
            key
          ] ?? "";


        const normalizedSearch =
          search
            .toLowerCase()
            .trim();


        const filtered =
          normalizedSearch
            ? options.filter(
                (
                  option,
                ) =>
                  option.label
                    .toLowerCase()
                    .indexOf(
                      normalizedSearch,
                    ) >= 0 ||
                  option.value
                    .toLowerCase()
                    .indexOf(
                      normalizedSearch,
                    ) >= 0,
              )
            : options;


        const currentValue =
          value ===
            undefined ||
          value ===
            null
            ? ""
            : String(
                value,
              );


        const currentExists =
          options.some(
            (
              option,
            ) =>
              option.value ===
              currentValue,
          );


        return (
          <label
            key={key}
            className="block"
          >

            {commonLabel}

            <input
              type="search"
              value={
                search
              }
              onChange={
                (
                  event,
                ) =>
                  setRelationSearch(
                    (
                      current,
                    ) => ({
                      ...current,
                      [key]:
                        event
                          .target
                          .value,
                    }),
                  )
              }
              placeholder={
                language === "fa"
                  ? "جستجو..."
                  : language === "ps"
                    ? "لټون..."
                    : "Search..."
              }
              className="hq-input mb-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[10px] outline-none focus:border-cyan-400/40"
            />

            <SharedSelect
              value={
                currentValue
              }
              disabled={
                Boolean(
                  relationLoading[
                    key
                  ],
                )
              }
              onChange={
                (
                  event,
                ) =>
                  update(
                    event
                      .target
                      .value,
                  )
              }
              className={
                `w-full rounded-xl border bg-white/5 px-3 py-2.5 text-xs outline-none ${
                  errorText
                    ? "border-rose-400/50"
                    : "border-white/10 focus:border-cyan-400/40"
                }`
              }
            >

              <option value="">
                {
                  relationLoading[
                    key
                  ]
                    ? (
                        language ===
                        "fa"
                          ? "در حال بارگذاری..."
                          : language ===
                              "ps"
                            ? "د بارولو په حال کې..."
                            : "Loading..."
                      )
                    : (
                        language ===
                        "fa"
                          ? "انتخاب کنید..."
                          : language ===
                              "ps"
                            ? "انتخاب کړئ..."
                            : "Select..."
                      )
                }
              </option>

              {
                currentValue &&
                !currentExists &&
                (
                  <option
                    value={
                      currentValue
                    }
                  >
                    {currentValue}
                  </option>
                )
              }

              {filtered.map(
                (
                  option,
                ) => (
                  <option
                    key={
                      option.value
                    }
                    value={
                      option.value
                    }
                  >
                    {
                      option.label
                    }
                  </option>
                ),
              )}

            </SharedSelect>

            {errorNode}

          </label>
        );

      }


      if (
        key ===
        "working_days"
      ) {

        const listValues =
          workingDaysFromFormValue(
            value,
          );


        return (
          <label
            key={key}
            className="block"
          >

            {commonLabel}

            <input
              type="text"
              value={
                value ===
                  undefined ||
                value ===
                  null
                  ? ""
                  : String(
                      value,
                    )
              }
              onChange={
                (
                  event,
                ) =>
                  update(
                    event
                      .target
                      .value,
                  )
              }
              placeholder={
                language === "fa"
                  ? "مقادیر را با کامه جدا کنید"
                  : language === "ps"
                    ? "ارزښتونه په کامه جلا کړئ"
                    : "Separate values with commas"
              }
              className={
                `w-full rounded-xl border bg-white/5 px-3 py-2.5 text-xs outline-none ${
                  errorText
                    ? "border-rose-400/50"
                    : "border-white/10 focus:border-cyan-400/40"
                }`
              }
            />

            <div className="mt-2 flex flex-wrap gap-1.5">

              {listValues.map(
                (
                  item,
                  index,
                ) => (
                  <span
                    key={
                      `${item}-${index}`
                    }
                    className="rounded-lg border border-cyan-400/20 bg-cyan-500/10 px-2 py-1 text-[10px] font-bold text-cyan-600 dark:text-cyan-300"
                  >
                    {item}
                  </span>
                ),
              )}

            </div>

            <div className="mt-1.5 text-[10px] text-slate-400">

              {
                language === "fa"
                  ? "Backend این فیلد را به شکل فهرست ذخیره می‌کند؛ مجموعه مجاز روزها هنوز در قرارداد Backend تعریف نشده است."
                  : language === "ps"
                    ? "Backend دا فیلډ د لېست په توګه ساتي؛ د ورځو مجاز ارزښتونه لا په Backend قرارداد کې نه دي تعریف شوي."
                    : "Backend stores this field as a list; allowed day codes are not yet published by the Backend contract."
              }

            </div>

            {errorNode}

          </label>
        );

      }


      if (
        isJsonField(
          key,
        ) ||
        key === "notes" ||
        key === "description" ||
        key === "address" ||
        key === "reason"
      ) {

        return (
          <label
            key={key}
            className="block"
          >

            {commonLabel}

            <textarea
              value={
                value ===
                  undefined ||
                value ===
                  null
                  ? ""
                  : String(
                      value,
                    )
              }
              onChange={
                (
                  event,
                ) =>
                  update(
                    event
                      .target
                      .value,
                  )
              }
              rows={
                isJsonField(
                  key,
                )
                  ? 5
                  : 3
              }
              spellCheck={
                !isJsonField(
                  key,
                )
              }
              placeholder={
                isJsonField(
                  key,
                )
                  ? "{}"
                  : ""
              }
              className={
                `w-full resize-y rounded-xl border bg-white/5 px-3 py-2.5 text-xs outline-none ${
                  isJsonField(
                    key,
                  )
                    ? "font-mono"
                    : ""
                } ${
                  errorText
                    ? "border-rose-400/50"
                    : "border-white/10 focus:border-cyan-400/40"
                }`
              }
            />

            {errorNode}

          </label>
        );

      }


      const inputType =
        field.type ===
        "date"
          ? "date"
          : field.type ===
              "time"
            ? "time"
            : field.type ===
                "datetime"
              ? "datetime-local"
              : field.type ===
                  "email"
                ? "email"
                : field.type ===
                    "url"
                  ? "url"
                  : (
                      field.type ===
                        "integer" ||
                      field.type ===
                        "decimal"
                    )
                    ? "number"
                    : "text";


      const step =
        field.type ===
        "integer"
          ? "1"
          : field.type ===
              "decimal"
            ? "any"
            : undefined;


      return (
        <label
          key={key}
          className="block"
        >

          {commonLabel}

          <input
            type={
              inputType
            }
            step={
              step
            }
            value={
              value ===
                undefined ||
              value ===
                null
                ? ""
                : String(
                    value,
                  )
            }
            onChange={
              (
                event,
              ) =>
                update(
                  event
                    .target
                    .value,
                )
            }
            className={
              `w-full rounded-xl border bg-white/5 px-3 py-2.5 text-xs outline-none ${
                errorText
                  ? "border-rose-400/50"
                  : "border-white/10 focus:border-cyan-400/40"
              }`
            }
          />

          {errorNode}

        </label>
      );

    };


  const dashboardResources =
    [
      "employees",
      "attendances",
      "leave-requests",
      "payroll-runs",
      "vacancies",
      "terminations",
    ];


  const dashboardIcons = [
    Users,
    CalendarDays,
    FileText,
    WalletCards,
    BriefcaseBusiness,
    Activity,
  ];


  const successfulDashboard =
    Object.values(
      dashboardCounts,
    ).filter(
      (value) =>
        value !== null,
    ).length;


  return (
    <div
      dir={
        rtl
          ? "rtl"
          : "ltr"
      }
      className="space-y-3 pb-8"
    >

      <style>{`
/* HQNATEX_HR_DIRECTORY_REFERENCE_V1 */
.hq-employee-directory {
  --directory-line: rgba(104,161,204,.22);
  border-top: 1px solid var(--directory-line);
  background: linear-gradient(135deg,rgba(114,193,255,.08),rgba(255,255,255,.04));
}
.hq-employee-directory table {
  width:100%; min-width:900px; border-collapse:collapse;
  text-align:start; font-size:12px;
}
.hq-employee-directory th {
  text-align:start; padding:16px; font-size:11px;
  color:#66849e; background:rgba(113,184,236,.08);
  white-space:nowrap;
}
.hq-employee-directory td {
  padding:15px 16px; border-top:1px solid var(--directory-line);
  max-width:240px; overflow-wrap:anywhere;
}
.hq-employee-directory tbody tr:hover {
  background:rgba(56,189,248,.06);
}
.hq-directory-person {
  display:flex; align-items:center; gap:12px; min-width:200px;
}
.hq-directory-person strong { display:block; font-size:13px; }
.hq-directory-person small {
  display:block; margin-top:5px; color:#718aa0; font-size:10px;
}
.hq-directory-avatar {
  width:44px; height:48px; flex-shrink:0; border-radius:12px;
  overflow:hidden; display:grid; place-items:center;
  background:rgba(56,189,248,.1); color:#3995ce;
  border:1px solid var(--directory-line);
}
.hq-directory-status {
  display:inline-flex; align-items:center; gap:6px;
  border-radius:20px; padding:6px 11px;
  font-size:10px; font-weight:800;
  background:rgba(148,163,184,.12);
}
.hq-directory-status:before {
  content:""; width:6px; height:6px;
  border-radius:50%; background:currentColor;
}
.hq-directory-status[data-status="active"] {
  color:#168362; background:rgba(16,185,129,.12);
}
.hq-directory-status[data-status="inactive"] {
  color:#e05d68; background:rgba(244,63,94,.1);
}
.hq-employee-directory button {
  padding:9px; border-radius:10px;
  border:1px solid var(--directory-line);
  color:#2588ce; background:rgba(56,189,248,.06);
}
.hq-employee-directory button:focus-visible,
.hq-employee-tabs button:focus-visible {
  outline:2px solid #38bdf8; outline-offset:2px;
}
.hq-employee-tabs {
  display:flex; flex-shrink:0; gap:6px; overflow-x:auto;
  padding:12px 20px; border-bottom:1px solid rgba(104,161,204,.22);
  background:rgba(131,199,245,.07);
}
.hq-employee-tabs button {
  display:flex; align-items:center; justify-content:center;
  gap:8px; flex:1; white-space:nowrap; border-radius:11px;
  padding:12px 16px; font-size:12px; font-weight:800; color:#64839c;
}
.hq-employee-tabs svg { width:16px; height:16px; }
.hq-employee-tabs button[aria-selected="true"] {
  color:white; background:linear-gradient(135deg,#279af4,#1467d9);
  box-shadow:0 5px 16px rgba(18,112,225,.2);
}
.hq-employee-premium section[hidden] { display:none!important; }
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-premium) {
  border-radius:22px!important;
}
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-premium)
.hq-hr-modal-header { padding:22px 24px!important; }
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-premium)
.hq-hr-modal-footer {
  justify-content:flex-end; padding:16px 24px!important;
}
.hq-shell[data-theme] .hq-employee-premium
:is(input:not([type=file]),select) { min-height:44px; }
.hq-shell[data-theme] .hq-employee-premium
> aside > div > div > div:first-child {
  max-width:220px; margin-inline:auto;
}
.hq-shell[data-theme] .hq-employee-premium > aside label {
  min-height:64px; border-style:dashed!important;
}
@media(max-width:639px) {
  .hq-employee-tabs { padding:8px; gap:4px; }
  .hq-employee-tabs button { padding:10px; font-size:10px; }
  .hq-employee-tabs svg { display:none; }
}
`}</style>
      <section className="glass-panel rounded-[1.5rem] p-4 lg:p-5">

        <SharedPageHeader native as="div" className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

          <div>

            <div className="mb-1 flex items-center gap-2 text-cyan-400">
              <ShieldCheck className="h-4 w-4" />

              <span className="text-[10px] font-black uppercase tracking-widest">
                {c.backend}
              </span>
            </div>

            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              {c.title}
            </h1>

            <p className="mt-1 max-w-3xl text-xs font-medium text-slate-500 dark:text-slate-400">
              {c.subtitle}
            </p>

          </div>


          <div className="flex items-center gap-2">

            <div
              className={
                `inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold ${
                  successfulDashboard ===
                  dashboardResources.length
                    ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-500"
                    : successfulDashboard > 0
                      ? "border-amber-400/30 bg-amber-500/10 text-amber-500"
                      : "border-rose-400/30 bg-rose-500/10 text-rose-500"
                }`
              }
            >
              <CheckCircle2 className="h-4 w-4" />

              {
                successfulDashboard ===
                dashboardResources.length
                  ? c.connected
                  : successfulDashboard > 0
                    ? c.partial
                    : c.unavailable
              }
            </div>


            <SharedPrimaryButton
              type="button"
              onClick={
                () => {
                  void loadDashboard();
                  void loadResource();
                }
              }
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-500"
            >
              <RefreshCcw className="h-4 w-4" />
              {c.refresh}
            </SharedPrimaryButton>

          </div>

        </SharedPageHeader>

      </section>


      <section className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">

        {dashboardResources.map(
          (
            key,
            index,
          ) => {

            const Icon =
              dashboardIcons[
                index
              ];

            const resource =
              RESOURCES.find(
                (item) =>
                  item.key ===
                  key,
              );

            return (
              <SharedSecondaryButton
                type="button"
                key={key}
                onClick={
                  () => {

                    if (
                      resource
                    ) {
                      setActiveGroup(
                        resource.group,
                      );

                      setActiveKey(
                        resource.key,
                      );

                      setPage(1);
                    }

                  }
                }
                className="glass-panel rounded-2xl p-3 text-start"
              >

                <div className="mb-2 flex items-center justify-between">
                  <Icon className="h-4 w-4 text-cyan-500" />

                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                </div>

                <div className="text-xl font-black">
                  {
                    dashboardCounts[
                      key
                    ] ?? "—"
                  }
                </div>

                <div className="mt-1 text-[10px] font-bold text-slate-500">
                  {
                    resource
                      ? titleFor(
                          resource,
                        )
                      : key
                  }
                </div>

              </SharedSecondaryButton>
            );

          },
        )}

      </section>


      <section className="space-y-3">

        {/* HR MAIN SECTIONS AS CARDS */}
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">

          {GROUPS.map(
            (
              group,
              index,
            ) => {

              const active =
                activeGroup === group;

              const GroupIcon =
                [
                  Users,
                  CalendarDays,
                  WalletCards,
                  BriefcaseBusiness,
                  Activity,
                  ShieldCheck,
                ][index] || FileText;

              const groupCount =
                RESOURCES.filter(
                  (resource) =>
                    resource.group === group,
                ).length;

              return (
                <SharedSecondaryButton
                  key={group}
                  type="button"
                  onClick={
                    () => {

                      setActiveGroup(
                        group,
                      );

                      const first =
                        RESOURCES.find(
                          (resource) =>
                            resource.group === group,
                        );

                      if (first) {

                        setActiveKey(
                          first.key,
                        );

                        setPage(1);
                        setSearch("");

                      }

                    }
                  }
                  className={
                    `group relative min-h-[92px] overflow-hidden rounded-2xl border p-3 text-start transition-all duration-200 ${
                      active
                        ? "border-cyan-400/40 bg-cyan-500/15 shadow-[0_10px_35px_rgba(6,182,212,0.12)]"
                        : "border-white/10 bg-white/[0.055] hover:-translate-y-0.5 hover:border-cyan-400/25 hover:bg-white/[0.09]"
                    }`
                  }
                >

                  <div className="flex items-start justify-between gap-3">

                    <div
                      className={
                        `flex h-9 w-9 items-center justify-center rounded-xl border ${
                          active
                            ? "border-cyan-400/30 bg-cyan-500/15 text-cyan-500"
                            : "border-white/10 bg-white/[0.05] text-slate-500 group-hover:text-cyan-500"
                        }`
                      }
                    >
                      <GroupIcon className="h-4 w-4" />
                    </div>

                    <span
                      className={
                        `rounded-lg px-2 py-1 text-[9px] font-black ${
                          active
                            ? "bg-cyan-500/15 text-cyan-500"
                            : "bg-white/[0.05] text-slate-400"
                        }`
                      }
                    >
                      {groupCount}
                    </span>

                  </div>

                  <div
                    className={
                      `mt-3 text-[11px] font-black leading-5 ${
                        active
                          ? "text-cyan-500"
                          : "text-slate-600 dark:text-slate-300"
                      }`
                    }
                  >
                    {
                      GROUP_LABELS[
                        group
                      ][language]
                    }
                  </div>

                  {active && (
                    <div className="absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-cyan-400" />
                  )}

                </SharedSecondaryButton>
              );

            },
          )}

        </div>


        {/* SELECTED SECTION ITEMS AS CARDS */}
        <div className="glass-panel rounded-[1.5rem] p-3">

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">

            {resourcesForGroup.map(
              (
                resource,
                index,
              ) => {

                const active =
                  activeKey ===
                  resource.key;

                const ResourceIcon =
                  [
                    Users,
                    BriefcaseBusiness,
                    FileText,
                    CalendarDays,
                    Activity,
                    WalletCards,
                    ShieldCheck,
                  ][
                    index % 7
                  ];

                return (
                  <SharedSecondaryButton
                    key={
                      resource.key
                    }
                    type="button"
                    onClick={
                      () => {

                        setActiveKey(
                          resource.key,
                        );

                        setPage(1);
                        setSearch("");

                      }
                    }
                    className={
                      `group relative min-h-[78px] rounded-2xl border p-3 text-start transition-all duration-200 ${
                        active
                          ? "border-cyan-400/40 bg-cyan-500/15 shadow-[0_8px_26px_rgba(6,182,212,0.10)]"
                          : "border-white/10 bg-white/[0.035] hover:-translate-y-0.5 hover:border-cyan-400/25 hover:bg-white/[0.075]"
                      }`
                    }
                  >

                    <div className="flex items-start justify-between gap-2">

                      <div
                        className={
                          `flex h-8 w-8 items-center justify-center rounded-xl ${
                            active
                              ? "bg-cyan-500/15 text-cyan-500"
                              : "bg-white/[0.05] text-slate-400 group-hover:text-cyan-500"
                          }`
                        }
                      >
                        <ResourceIcon className="h-4 w-4" />
                      </div>

                      {active && (
                        <CheckCircle2 className="h-4 w-4 text-cyan-500" />
                      )}

                    </div>

                    <div
                      className={
                        `mt-2 text-[10px] font-black leading-5 ${
                          active
                            ? "text-cyan-500"
                            : "text-slate-600 dark:text-slate-300"
                        }`
                      }
                    >
                      {
                        titleFor(
                          resource,
                        )
                      }
                    </div>

                  </SharedSecondaryButton>
                );

              },
            )}

          </div>

        </div>

      </section>


      <section className="glass-panel overflow-hidden rounded-[1.5rem]">

        <SharedPageHeader native as="div" className="flex flex-col gap-3 border-b border-white/10 p-3 lg:flex-row lg:items-center lg:justify-between">

          <div>

            <h2 className="font-black text-slate-900 dark:text-white">
              {
                titleFor(
                  activeResource,
                )
              }
            </h2>

            <div className="mt-1 text-[10px] text-slate-500">
              {c.total}:{" "}
              {
                pageData?.count ??
                0
              }
            </div>

          </div>


          <div className="flex flex-wrap items-center gap-2">

            <div className="relative">

              <Search
                className={
                  `absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 ${
                    rtl
                      ? "right-3"
                      : "left-3"
                  }`
                }
              />

              <input
                value={search}
                onChange={
                  (
                    event,
                  ) => {
                    setSearch(
                      event
                        .target
                        .value,
                    );

                    setPage(1);
                  }
                }
                placeholder={
                  c.search
                }
                className={
                  `w-56 rounded-xl border border-white/10 bg-white/5 py-2 text-xs ${
                    rtl
                      ? "pr-9 pl-3"
                      : "pl-9 pr-3"
                  }`
                }
              />

            </div>


            <SharedSecondaryButton
              type="button"
              onClick={
                exportCsv
              }
              className="inline-flex items-center gap-1 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold"
            >
              <Download className="h-4 w-4" />
              {c.export}
            </SharedSecondaryButton>


            {!activeResource.readOnly && (
              <SharedPrimaryButton
                type="button"
                onClick={
                  () =>
                    void openCreate()
                }
                className="inline-flex items-center gap-1 rounded-xl bg-cyan-500/15 px-3 py-2 text-xs font-black text-cyan-500"
              >
                <Plus className="h-4 w-4" />
                {c.create}
              </SharedPrimaryButton>
            )}

          </div>

        </SharedPageHeader>


        {error && (
          <div className="m-3 rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-xs text-rose-500">
            {error}
          </div>
        )}


        {loading ? (

          <div className="flex min-h-48 items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-cyan-500" />
          </div>

        ) : rows.length === 0 ? (

          <div className="flex min-h-48 flex-col items-center justify-center text-center">

            <FileText className="mb-2 h-8 w-8 text-slate-400/40" />

            <div className="text-sm font-black text-slate-500">
              {c.noRecords}
            </div>

          </div>

        ) : (

          activeResource.key === "employees" ? (
            <EmployeeDirectory
              key={`${session.tenantId}:${session.companyId}`}
              rows={rows}
              session={session}
              language={language}
              onView={openView}
              onEdit={openEdit}
              readOnly={Boolean(activeResource.readOnly)}
            />
          ) : <div className="overflow-x-auto">

            <SharedDataTable native className="w-full min-w-[850px] text-xs">

              <thead>

                <tr>

                  {visibleFields.map(
                    (
                      field,
                    ) => (
                      <th
                        key={
                          field
                        }
                        className="px-3 py-2 text-start text-[10px] font-black text-slate-500"
                      >
                        {
                          activeResource.key === "employees"
                            ? employeeTableLabel(
                                field, language,
                                fieldLabel(field, metadata[field])
                              )
                            : fieldLabel(field, metadata[field])
                        }
                      </th>
                    ),
                  )}

                  <th className="px-3 py-2 text-start text-[10px] font-black text-slate-500">
                    {c.actions}
                  </th>

                </tr>

              </thead>


              <tbody>

                {rows.map(
                  (
                    row,
                    index,
                  ) => (
                    <tr
                      key={
                        String(
                          row.id ??
                          index,
                        )
                      }
                      className="border-t border-white/[0.05]"
                    >

                      {visibleFields.map(
                        (
                          field,
                        ) => (
                          <td
                            key={
                              field
                            }
                            className="px-3 py-2 font-medium"
                          >
                            {
                              activeResource.key === "employees"
                                ? employeeChoiceLabel(
                                    field, row[field], language,
                                    printable(row[field])
                                  )
                                : printable(row[field])
                            }
                          </td>
                        ),
                      )}


                      <td className="px-3 py-2">

                        <div className="flex items-center gap-1">

                          <SharedPrimaryButton
                            type="button"
                            onClick={
                              () =>
                                openView(
                                  row,
                                )
                            }
                            className="rounded-lg p-1.5 hover:bg-cyan-500/10"
                          >
                            <Eye className="h-4 w-4" />
                          </SharedPrimaryButton>


                          {!activeResource.readOnly && (
                            <SharedPrimaryButton
                              type="button"
                              onClick={
                                () =>
                                  openEdit(
                                    row,
                                  )
                              }
                              className="rounded-lg p-1.5 hover:bg-cyan-500/10"
                            >
                              <Pencil className="h-4 w-4" />
                            </SharedPrimaryButton>
                          )}


                          {activeResource.key ===
                            "payroll-runs" &&
                            row.id !==
                              undefined &&
                            row.id !==
                              null && (

                              <SharedPrimaryButton
                                type="button"
                                disabled={
                                  processingId ===
                                  String(
                                    row.id,
                                  )
                                }
                                onClick={
                                  () =>
                                    void processPayroll(
                                      row,
                                    )
                                }
                                className="rounded-lg bg-cyan-500/10 px-2 py-1 text-[10px] font-black text-cyan-500"
                              >
                                {
                                  processingId ===
                                  String(
                                    row.id,
                                  )
                                    ? c.processing
                                    : c.processPayroll
                                }
                              </SharedPrimaryButton>

                            )}

                        </div>

                      </td>

                    </tr>
                  ),
                )}

              </tbody>

            </SharedDataTable>

          </div>

        )}


        <div className="flex items-center justify-between border-t border-white/10 p-3">

          <SharedSecondaryButton
            type="button"
            disabled={
              !pageData?.previous
            }
            onClick={
              () =>
                setPage(
                  Math.max(
                    1,
                    page - 1,
                  ),
                )
            }
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs disabled:opacity-30"
          >
            {c.previous}
          </SharedSecondaryButton>

          <span className="text-xs font-bold text-slate-500">
            {page}
          </span>

          <SharedSecondaryButton
            type="button"
            disabled={
              !pageData?.next
            }
            onClick={
              () =>
                setPage(
                  page + 1,
                )
            }
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs disabled:opacity-30"
          >
            {c.next}
          </SharedSecondaryButton>

        </div>

      </section>


      {modalMode && (

        <>
          {/* HQNATEX_HR_FORM_MODAL_RESPONSIVE_LAYOUT_V1 */}
          <div className="hq-visual-overlay hq-hr-modal-layer fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-slate-950/60 p-2 backdrop-blur-sm sm:p-4">

            <div className={`hq-hr-modal-panel glass-panel flex max-h-[92vh] w-full flex-col overflow-hidden rounded-2xl border border-white/10 shadow-2xl sm:max-h-[90vh] lg:max-h-[88vh] shadow-2xl shadow-slate-950/20 ring-1 ring-white/10 ${activeResource.key === "employees" ? "max-w-[76rem]" : "max-w-4xl"}`}>

              <div className="hq-hr-modal-header flex shrink-0 items-center justify-between gap-3 border-b border-white/10 p-3 sm:p-4">

                <div className="min-w-0 flex-1 break-words text-sm font-black sm:text-base">

                {
                  modalMode ===
                  "create"
                    ? c.create
                    : modalMode ===
                      "edit"
                      ? c.edit
                      : c.view
                }

                {" — "}

                {
                  titleFor(
                    activeResource,
                  )
                }

              </div>

                <SharedSecondaryButton
                  type="button"
                  aria-label="Close"
                  onClick={
                    () =>
                      setModalMode(
                        null,
                      )
                  }
                  className="shrink-0 rounded-lg p-2 transition hover:bg-white/5"
                >
                <X className="h-5 w-5" />
              </SharedSecondaryButton>

            </div>



              {activeResource.key === "employees" &&
               modalMode !== "view" && (
                <div
                  className="hq-employee-tabs"
                  role="tablist"
                  aria-label={
                    language === "en" ? "Employee information" :
                    language === "fa" ? "اطلاعات کارمند" :
                    "د کارکوونکي معلومات"
                  }
                >
                  {[
                    ["basic",
                      language === "en" ? "Basic information" :
                      language === "fa" ? "اطلاعات اصلی" :
                      "اصلي معلومات"],
                    ["job",
                      language === "en" ? "Job & organization" :
                      language === "fa" ? "اطلاعات شغلی" :
                      "دندې معلومات"],
                    ["notes",
                      language === "en" ? "Notes" :
                      language === "fa" ? "یادداشت" : "یادښت"],
                  ].map(([key, label], index) => (
                    <SharedSecondaryButton
                      key={key}
                      id={`hq-employee-tab-${key}`}
                      type="button"
                      role="tab"
                      aria-selected={employeeTab === key}
                      aria-controls={`hq-employee-panel-${key}`}
                      tabIndex={employeeTab === key ? 0 : -1}
                      onClick={() => setEmployeeTab(key)}
                      onKeyDown={event => {
                        const keys = ["basic", "job", "notes"];
                        let next = index;
                        if (event.key === "Home") next = 0;
                        else if (event.key === "End") next = 2;
                        else if (event.key === "ArrowRight")
                          next = (index + (rtl ? 2 : 1)) % 3;
                        else if (event.key === "ArrowLeft")
                          next = (index + (rtl ? 1 : 2)) % 3;
                        else return;
                        event.preventDefault();
                        setEmployeeTab(keys[next]);
                        document.getElementById(
                          `hq-employee-tab-${keys[next]}`
                        )?.focus();
                      }}
                    >
                      {index === 0 ? <Users /> :
                       index === 1 ? <BriefcaseBusiness /> :
                       <FileText />}
                      {label}
                    </SharedSecondaryButton>
                  ))}
                </div>
              )}

              <div className="hq-hr-modal-body custom-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain p-3 sm:p-4">

              {modalMode ===
                "view" &&
              selected ? (

                
<>
  {activeResource.key === "employees" ? (() => {
    const employee = selected;

    const tr = (fa: string, ps: string, en: string) =>
      language === "fa" ? fa : language === "ps" ? ps : en;

    const labels: Record<string, string> = {
      employee_number: tr(
        "شماره کارمند", "د کارکوونکي شمېره", "Employee number"
      ),
      first_name: tr("نام", "نوم", "First name"),
      last_name: tr("تخلص", "تخلص", "Last name"),
      father_name: tr("نام پدر", "د پلار نوم", "Father name"),
      gender: tr("جنسیت", "جنسیت", "Gender"),
      marital_status: tr(
        "وضعیت تأهل", "د واده حالت", "Marital status"
      ),
      date_of_birth: tr(
        "تاریخ تولد", "د زېږېدو نېټه", "Date of birth"
      ),
      national_id: tr(
        "شماره تذکره", "د تذکرې شمېره", "National ID"
      ),
      passport_number: tr(
        "شماره پاسپورت", "د پاسپورټ شمېره", "Passport number"
      ),
      phone: tr("شماره تماس", "د اړیکې شمېره", "Phone"),
      alternate_phone: tr(
        "شماره تماس بدیل", "بدیله اړیکه", "Alternate phone"
      ),
      email: tr("ایمیل", "برېښنالیک", "Email"),
      address: tr("آدرس", "پته", "Address"),
      hire_date: tr(
        "تاریخ استخدام", "د ګمارنې نېټه", "Hire date"
      ),
      employment_status: tr(
        "وضعیت استخدام", "د ګمارنې حالت", "Employment status"
      ),
      branch_id: tr("شعبه", "څانګه", "Branch"),
      department: tr("دیپارتمنت", "ډیپارټمنټ", "Department"),
      position: tr("بست", "بست", "Position"),
      manager: tr("مدیر", "مدیر", "Manager"),
      user: tr("حساب کاربری", "کارن حساب", "User account"),
      notes: tr("یادداشت", "یادښت", "Notes"),
      id: tr("شناسه", "پېژند", "ID"),
      tenant: tr("شناسه سازمان", "د سازمان پېژند", "Tenant ID"),
      company: tr("شناسه شرکت", "د شرکت پېژند", "Company ID"),
      created_at: tr(
        "تاریخ ایجاد", "د جوړېدو نېټه", "Created at"
      ),
      updated_at: tr(
        "آخرین تغییر", "وروستی بدلون", "Updated at"
      ),
    };

    const display = (key: string): string => {
      const value = employee[key];

      if (value === null || value === undefined || value === "") {
        return "—";
      }

      const option = (relationOptions[key] ?? []).find(
        item => String(item.value) === String(value)
      );

      if (option) return option.label;

      if (key === "created_at" || key === "updated_at") {
        const date = new Date(String(value));

        if (!Number.isNaN(date.getTime())) {
          return new Intl.DateTimeFormat(
            language === "en"
              ? "en-GB"
              : language === "ps"
                ? "ps-AF"
                : "fa-AF",
            {
              calendar: "gregory",
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            }
          ).format(date);
        }
      }

      return employeeChoiceLabel(key, value, language, printable(value));
    };

    const groups = [
      {
        title: tr(
          "معلومات شخصی", "شخصي معلومات", "Personal information"
        ),
        keys: [
          "employee_number", "first_name", "last_name",
          "father_name", "gender", "marital_status", "date_of_birth",
          "national_id", "passport_number",
        ],
      },
      {
        title: tr(
          "معلومات تماس", "د اړیکې معلومات", "Contact information"
        ),
        keys: ["phone", "alternate_phone", "email", "address"],
      },
      {
        title: tr(
          "معلومات وظیفوی و سازمانی",
          "دندې او سازماني معلومات",
          "Job & organization"
        ),
        keys: [
          "hire_date", "employment_status", "branch_id",
          "department", "position", "manager", "user",
        ],
      },
      {
        title: tr("یادداشت", "یادښت", "Notes"),
        keys: ["notes"],
      },
    ];

    const renderItem = (key: string) => (
      <div className="hq-profile-item" key={key}>
        <dt>{labels[key] ?? fieldLabel(key, metadata[key])}</dt>
        <dd>{display(key)}</dd>
      </div>
    );

    const fullName = [
      employee.first_name,
      employee.last_name,
    ].filter(
      value => typeof value === "string" && value.trim()
    ).join(" ");

    const photo = typeof employee.photo_url === "string"
      ? employee.photo_url
      : "";

    const primaryKeys = new Set([
      "photo_url",
      ...groups.flatMap(group => group.keys),
    ]);

    const technicalKeys = Object.keys(employee).filter(
      key => !primaryKeys.has(key)
    );

    return (
      <div
        className="hq-employee-profile"
        data-rtl={rtl ? "true" : "false"}
      >
        <style>{`
/* HQNATEX_HR_EMPLOYEE_PROFILE_V1_FIXED */
.hq-employee-profile {
  grid-column: 1 / -1;
  display: grid !important;
  grid-template-columns: minmax(0,1fr);
  gap: 20px;
  min-width: 0;
  align-items: start;
  direction: ltr;
}
.hq-employee-profile[data-rtl="true"] > * { direction: rtl; }
.hq-employee-profile[data-rtl="false"] > * { direction: ltr; }
.hq-employee-profile > div { min-width: 0; }
.hq-employee-profile > aside {
  width: min(100%,300px) !important;
  position: static !important;
  justify-self: center;
  min-width: 0;
}
@container (min-width: 760px) {
  .hq-employee-profile {
    grid-template-columns: minmax(220px,28%) minmax(0,1fr);
  }
  .hq-employee-profile > aside {
    width: 100% !important;
    position: sticky !important;
    top: 0;
  }
}
.hq-shell[data-theme="light"] .hq-hr-modal-panel:has(.hq-employee-profile) {
  --hr-glass: rgba(235,246,255,.74);
  --hr-card: rgba(255,255,255,.30);
  --hr-input: rgba(255,255,255,.40);
  --hr-bar: rgba(232,245,255,.76);
  --hr-text: #183650;
  --hr-muted: #45637c;
  --hr-line: rgba(68,133,190,.32);
  --hr-option: #edf6ff;
  color-scheme: light;
}
.hq-shell[data-theme="dark"] .hq-hr-modal-panel:has(.hq-employee-profile) {
  --hr-glass: rgba(7,24,43,.76);
  --hr-card: rgba(24,57,84,.30);
  --hr-input: rgba(3,19,35,.38);
  --hr-bar: rgba(10,32,53,.80);
  --hr-text: #e9f4ff;
  --hr-muted: #b3cce0;
  --hr-line: rgba(106,193,239,.28);
  --hr-option: #102b43;
  color-scheme: dark;
}
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-profile) { 
      container-type: inline-size;
      background: var(--hr-glass) !important;
      color: var(--hr-text) !important;
      border: 1px solid var(--hr-line) !important;
      backdrop-filter: blur(24px) saturate(140%);
      -webkit-backdrop-filter: blur(24px) saturate(140%);
      box-shadow: 0 24px 80px rgba(0,20,45,.28),
                  inset 0 1px 0 rgba(255,255,255,.20) !important;
     }
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-profile) .hq-hr-modal-body { 
      background: transparent !important;
     }
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-profile) .hq-hr-modal-header { 
      background: var(--hr-bar) !important;
      color: var(--hr-text) !important;
      border-color: var(--hr-line) !important;
      backdrop-filter: blur(18px);
     }
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-profile) .hq-hr-modal-header * { 
      color: var(--hr-text) !important;
     }
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-profile) .hq-hr-modal-footer { 
      background: var(--hr-bar) !important;
      border-color: var(--hr-line) !important;
      backdrop-filter: blur(18px);
     }
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-profile) .hq-employee-profile > aside > div { 
      background: var(--hr-card) !important;
      border: 1px solid var(--hr-line) !important;
      border-radius: 18px !important;
      backdrop-filter: blur(14px);
      box-shadow: inset 0 1px 0 rgba(255,255,255,.15) !important;
     }
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-profile) .hq-employee-profile > div > section { 
      background: var(--hr-card) !important;
      border: 1px solid var(--hr-line) !important;
      border-radius: 18px !important;
      backdrop-filter: blur(14px);
      box-shadow: inset 0 1px 0 rgba(255,255,255,.15) !important;
     }
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-profile) .hq-employee-profile section > div:first-child { 
      background: transparent !important;
      border-color: var(--hr-line) !important;
     }
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-profile) .hq-employee-profile [class*='text-slate-'] { 
      color: var(--hr-muted) !important;
     }
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-profile) .hq-employee-profile [class*='font-black'] { 
      color: var(--hr-text) !important;
     }
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-profile) .hq-employee-profile input:not([type='file']) { 
      background: var(--hr-input) !important;
      color: var(--hr-text) !important;
      border: 1px solid var(--hr-line) !important;
      border-radius: 11px !important;
      box-shadow: inset 0 1px 2px rgba(0,20,40,.04) !important;
     }
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-profile) .hq-employee-profile select { 
      background: var(--hr-input) !important;
      color: var(--hr-text) !important;
      border: 1px solid var(--hr-line) !important;
      border-radius: 11px !important;
     }
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-profile) .hq-employee-profile textarea { 
      background: var(--hr-input) !important;
      color: var(--hr-text) !important;
      border: 1px solid var(--hr-line) !important;
      border-radius: 11px !important;
     }
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-profile) .hq-employee-profile option { 
      background: var(--hr-option) !important;
      color: var(--hr-text) !important;
     }
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-profile) .hq-employee-profile input::placeholder { 
      color: var(--hr-muted) !important;
      opacity: .8;
     }
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-profile) .hq-employee-profile textarea::placeholder { 
      color: var(--hr-muted) !important;
      opacity: .8;
     }
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-profile) .hq-employee-profile :is(input,select,textarea):focus { 
      outline: 2px solid #38bdf8 !important;
      outline-offset: 2px;
     }
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-profile) .hq-employee-profile > aside > div > div > div:first-child { 
      background: var(--hr-input) !important;
      border: 1px dashed var(--hr-line) !important;
     }
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-profile) .hq-employee-profile > aside label { 
      background: linear-gradient(135deg,#168afa,#0866d9) !important;
      color: #fff !important;
      border: 1px solid rgba(100,200,255,.65) !important;
      min-height: 44px;
      box-shadow: 0 5px 18px rgba(0,112,230,.20) !important;
     }
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-profile) .hq-hr-modal-footer button:first-child { 
      background: var(--hr-card) !important;
      color: var(--hr-text) !important;
      border: 1px solid var(--hr-line) !important;
     }
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-profile) .hq-hr-modal-footer button:last-child { 
      background: linear-gradient(135deg,#168afa,#0866d9) !important;
      color: #fff !important;
      border: 1px solid rgba(100,200,255,.65) !important;
     }
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-profile) .hq-hr-modal-footer button:disabled { 
      opacity: .55 !important;
     }

.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-profile) .hq-profile-heading {
    margin: 0;
    font-size: 17px;
    font-weight: 800;
    color: var(--hr-text) !important;
}
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-profile) .hq-profile-section-title {
    padding: 14px 16px;
    margin: 0;
    border-bottom: 1px solid var(--hr-line);
    color: var(--hr-text) !important;
    font-size: 13px;
    font-weight: 800;
}
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-profile) .hq-profile-fields {
    display: grid;
    grid-template-columns: minmax(0,1fr);
    gap: 12px;
    padding: 16px;
    margin: 0;
}
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-profile) .hq-profile-item {
    min-width: 0;
    padding: 10px 12px;
    border: 1px solid var(--hr-line);
    border-radius: 11px;
    background: var(--hr-input);
}
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-profile) .hq-profile-item dt {
    color: var(--hr-muted) !important;
    font-size: 11px;
    font-weight: 700;
}
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-profile) .hq-profile-item dd {
    margin: 6px 0 0;
    color: var(--hr-text) !important;
    font-size: 13px;
    line-height: 1.7;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
}
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-profile) .hq-profile-photo {
    display: block;
    width: 100%;
    aspect-ratio: 4/5;
    object-fit: cover;
    border-radius: 14px;
    background: var(--hr-input);
    border: 1px solid var(--hr-line);
}
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-profile) .hq-profile-placeholder {
    display: grid;
    place-items: center;
    color: var(--hr-muted) !important;
}
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-profile) .hq-profile-summary {
    padding: 14px 0 0;
    overflow-wrap: anywhere;
}
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-profile) .hq-profile-summary p {
    margin: 8px 0 0;
    color: var(--hr-muted);
    font-size: 12px;
    line-height: 1.7;
}
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-profile) .hq-profile-technical {
    border: 1px solid var(--hr-line);
    border-radius: 14px;
    background: var(--hr-card);
}
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-profile) .hq-profile-technical summary {
    cursor: pointer;
    padding: 14px 16px;
    color: var(--hr-muted);
    font-size: 12px;
    font-weight: 700;
}
@container (min-width: 520px) {
    .hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-profile) .hq-profile-fields {
        grid-template-columns: repeat(2,minmax(0,1fr));
    }
}
`}</style>

        <aside>
          <div style={{ padding: "16px" }}>
            {photo ? (
              <EmployeeStoredPhoto
                className="hq-profile-photo"
                session={session}
                employeeId={employee.id}
                photoUrl={photo}
                alt={
                  fullName ||
                  tr(
                    "عکس کارمند",
                    "د کارکوونکي عکس",
                    "Employee photo"
                  )
                }
              />
            ) : (
              <div
                className="hq-profile-photo hq-profile-placeholder"
              >
                {tr("عکس موجود نیست", "عکس نشته", "No photo")}
              </div>
            )}

            <div className="hq-profile-summary">
              <h3 className="hq-profile-heading">
                {fullName || "—"}
              </h3>

              <p>
                {labels.employee_number}:{" "}
                {display("employee_number")}
              </p>

              <p>
                {labels.employment_status}:{" "}
                {display("employment_status")}
              </p>
            </div>
          </div>
        </aside>

        <div className="space-y-4">
          {groups.map(group => (
            <section key={group.keys[0]}>
              <h3 className="hq-profile-section-title">
                {group.title}
              </h3>

              <dl className="hq-profile-fields">
                {group.keys.filter(
                  key => Object.prototype.hasOwnProperty.call(
                    employee, key
                  )
                ).map(renderItem)}
              </dl>
            </section>
          ))}

          {technicalKeys.length > 0 && (
            <details className="hq-profile-technical">
              <summary>
                {tr(
                  "مشخصات فنی و زمان ثبت",
                  "تخنیکي معلومات او د ثبت وخت",
                  "Technical details & timestamps"
                )}
              </summary>

              <dl className="hq-profile-fields">
                {technicalKeys.map(renderItem)}
              </dl>
            </details>
          )}
        </div>
      </div>
    );
  })() : (
    <div className="hq-hr-view-grid grid grid-cols-1 gap-2 sm:grid-cols-2">

                  {Object.entries(
                    selected,
                  ).map(
                    (
                      [
                        key,
                        value,
                      ],
                    ) => (
                      <div
                        key={
                          key
                        }
                        className="rounded-xl border border-white/10 p-3"
                      >
                        <div className="text-[10px] font-black text-slate-500">
                          {
                            fieldLabel(
                              key,
                              metadata[
                                key
                              ],
                            )
                          }
                        </div>

                        <div className="mt-1 break-all text-xs font-medium">
                          {
                            printable(
                              value,
                            )
                          }
                        </div>
                      </div>
                    ),
                  )}

                </div>
  )}
</>

) : metadataEntries.length ===
                0 ? (

                <div className="py-12 text-center">

                  <div className="text-sm font-bold text-slate-500">
                    {
                      c.metadataUnavailable
                    }
                  </div>

                  {metadataError && (
                    <div className="mx-auto mt-3 max-w-xl rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-[11px] font-medium text-rose-500">
                      {metadataError}
                    </div>
                  )}

                </div>

              ) : (

                <div className="hq-hr-form-grid grid grid-cols-1 gap-3 md:grid-cols-2">

                  {/* HQNATEX_HR_EMPLOYEE_MODAL_PREMIUM_LAYOUT_V1 */}

                  {activeResource.key ===
                  "employees" ? (

                    <div className="hq-employee-premium" data-rtl={rtl ? "true" : "false"}>
<style>{`
/* HQNATEX_HR_MODAL_GLASS_V3 */
.hq-employee-premium {
  grid-column: 1 / -1;
  display: grid !important;
  grid-template-columns: minmax(0,1fr);
  gap: 20px;
  min-width: 0;
  align-items: start;
  direction: ltr;
}
.hq-employee-premium[data-rtl="true"] > * { direction: rtl; }
.hq-employee-premium[data-rtl="false"] > * { direction: ltr; }
.hq-employee-premium > div { min-width: 0; }
.hq-employee-premium > aside {
  width: min(100%,300px) !important;
  position: static !important;
  justify-self: center;
  min-width: 0;
}
@container (min-width: 760px) {
  .hq-employee-premium {
    grid-template-columns: minmax(220px,28%) minmax(0,1fr);
  }
  .hq-employee-premium > aside {
    width: 100% !important;
    position: sticky !important;
    top: 0;
  }
}
.hq-shell[data-theme="light"] .hq-hr-modal-panel:has(.hq-employee-premium) {
  --hr-glass: rgba(235,246,255,.74);
  --hr-card: rgba(255,255,255,.30);
  --hr-input: rgba(255,255,255,.40);
  --hr-bar: rgba(232,245,255,.76);
  --hr-text: #183650;
  --hr-muted: #45637c;
  --hr-line: rgba(68,133,190,.32);
  --hr-option: #edf6ff;
  color-scheme: light;
}
.hq-shell[data-theme="dark"] .hq-hr-modal-panel:has(.hq-employee-premium) {
  --hr-glass: rgba(7,24,43,.76);
  --hr-card: rgba(24,57,84,.30);
  --hr-input: rgba(3,19,35,.38);
  --hr-bar: rgba(10,32,53,.80);
  --hr-text: #e9f4ff;
  --hr-muted: #b3cce0;
  --hr-line: rgba(106,193,239,.28);
  --hr-option: #102b43;
  color-scheme: dark;
}
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-premium) { 
      container-type: inline-size;
      background: var(--hr-glass) !important;
      color: var(--hr-text) !important;
      border: 1px solid var(--hr-line) !important;
      backdrop-filter: blur(24px) saturate(140%);
      -webkit-backdrop-filter: blur(24px) saturate(140%);
      box-shadow: 0 24px 80px rgba(0,20,45,.28),
                  inset 0 1px 0 rgba(255,255,255,.20) !important;
     }
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-premium) .hq-hr-modal-body { 
      background: transparent !important;
     }
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-premium) .hq-hr-modal-header { 
      background: var(--hr-bar) !important;
      color: var(--hr-text) !important;
      border-color: var(--hr-line) !important;
      backdrop-filter: blur(18px);
     }
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-premium) .hq-hr-modal-header * { 
      color: var(--hr-text) !important;
     }
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-premium) .hq-hr-modal-footer { 
      background: var(--hr-bar) !important;
      border-color: var(--hr-line) !important;
      backdrop-filter: blur(18px);
     }
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-premium) .hq-employee-premium > aside > div { 
      background: var(--hr-card) !important;
      border: 1px solid var(--hr-line) !important;
      border-radius: 18px !important;
      backdrop-filter: blur(14px);
      box-shadow: inset 0 1px 0 rgba(255,255,255,.15) !important;
     }
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-premium) .hq-employee-premium > div > section { 
      background: var(--hr-card) !important;
      border: 1px solid var(--hr-line) !important;
      border-radius: 18px !important;
      backdrop-filter: blur(14px);
      box-shadow: inset 0 1px 0 rgba(255,255,255,.15) !important;
     }
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-premium) .hq-employee-premium section > div:first-child { 
      background: transparent !important;
      border-color: var(--hr-line) !important;
     }
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-premium) .hq-employee-premium [class*='text-slate-'] { 
      color: var(--hr-muted) !important;
     }
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-premium) .hq-employee-premium [class*='font-black'] { 
      color: var(--hr-text) !important;
     }
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-premium) .hq-employee-premium input:not([type='file']) { 
      background: var(--hr-input) !important;
      color: var(--hr-text) !important;
      border: 1px solid var(--hr-line) !important;
      border-radius: 11px !important;
      box-shadow: inset 0 1px 2px rgba(0,20,40,.04) !important;
     }
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-premium) .hq-employee-premium select { 
      background: var(--hr-input) !important;
      color: var(--hr-text) !important;
      border: 1px solid var(--hr-line) !important;
      border-radius: 11px !important;
     }
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-premium) .hq-employee-premium textarea { 
      background: var(--hr-input) !important;
      color: var(--hr-text) !important;
      border: 1px solid var(--hr-line) !important;
      border-radius: 11px !important;
     }
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-premium) .hq-employee-premium option { 
      background: var(--hr-option) !important;
      color: var(--hr-text) !important;
     }
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-premium) .hq-employee-premium input::placeholder { 
      color: var(--hr-muted) !important;
      opacity: .8;
     }
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-premium) .hq-employee-premium textarea::placeholder { 
      color: var(--hr-muted) !important;
      opacity: .8;
     }
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-premium) .hq-employee-premium :is(input,select,textarea):focus { 
      outline: 2px solid #38bdf8 !important;
      outline-offset: 2px;
     }
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-premium) .hq-employee-premium > aside > div > div > div:first-child { 
      background: var(--hr-input) !important;
      border: 1px dashed var(--hr-line) !important;
     }
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-premium) .hq-employee-premium > aside label { 
      background: linear-gradient(135deg,#168afa,#0866d9) !important;
      color: #fff !important;
      border: 1px solid rgba(100,200,255,.65) !important;
      min-height: 44px;
      box-shadow: 0 5px 18px rgba(0,112,230,.20) !important;
     }
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-premium) .hq-hr-modal-footer button:first-child { 
      background: var(--hr-card) !important;
      color: var(--hr-text) !important;
      border: 1px solid var(--hr-line) !important;
     }
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-premium) .hq-hr-modal-footer button:last-child { 
      background: linear-gradient(135deg,#168afa,#0866d9) !important;
      color: #fff !important;
      border: 1px solid rgba(100,200,255,.65) !important;
     }
.hq-shell[data-theme] .hq-hr-modal-panel:has(.hq-employee-premium) .hq-hr-modal-footer button:disabled { 
      opacity: .55 !important;
     }

/* HQNATEX_HR_GLASS_V4 */
.hq-shell[data-theme="light"]
.hq-hr-modal-panel:has(.hq-employee-premium) {
  --hr-glass: rgba(239,249,255,.86);
  --hr-card: rgba(255,255,255,.38);
  --hr-input: rgba(255,255,255,.52);
  --hr-bar: rgba(235,247,255,.64);
  --hr-text: #183650;
  --hr-muted: #476783;
  --hr-line: rgba(96,164,220,.26);
  --hr-option: #f1f8ff;
  background:
    radial-gradient(
      ellipse at 8% 0%,
      rgba(255,255,255,.8),
      transparent 60%
    ),
    linear-gradient(
      125deg,
      rgba(245,251,255,.88),
      rgba(220,240,255,.8)
    ) !important;
  backdrop-filter: blur(32px) saturate(160%) !important;
  -webkit-backdrop-filter: blur(32px) saturate(160%) !important;
  border: 1px solid rgba(255,255,255,.75) !important;
  box-shadow:
    0 28px 80px rgba(16,57,99,.24),
    inset 0 1px 0 rgba(255,255,255,.95) !important;
}

.hq-shell[data-theme="dark"]
.hq-hr-modal-panel:has(.hq-employee-premium) {
  --hr-glass: rgba(10,31,52,.8);
  --hr-card: rgba(43,83,115,.22);
  --hr-input: rgba(14,41,64,.42);
  --hr-bar: rgba(24,57,83,.5);
  --hr-text: #e9f5ff;
  --hr-muted: #bad2e5;
  --hr-line: rgba(130,201,245,.24);
  --hr-option: #15344c;
  background:
    radial-gradient(
      ellipse at 8% 0%,
      rgba(66,145,195,.24),
      transparent 60%
    ),
    linear-gradient(
      125deg,
      rgba(16,42,65,.88),
      rgba(8,29,48,.8)
    ) !important;
  backdrop-filter: blur(32px) saturate(150%) !important;
  -webkit-backdrop-filter: blur(32px) saturate(150%) !important;
  box-shadow:
    0 28px 80px rgba(0,12,28,.4),
    inset 0 1px 0 rgba(196,231,255,.18) !important;
}

.hq-shell[data-theme]
.hq-hr-modal-panel:has(.hq-employee-premium)
.hq-hr-modal-body {
  background: transparent !important;
}

.hq-shell[data-theme]
.hq-hr-modal-panel:has(.hq-employee-premium)
:is(.hq-hr-modal-header,.hq-hr-modal-footer,.hq-employee-tabs) {
  background: var(--hr-bar) !important;
  border-color: var(--hr-line) !important;
  backdrop-filter: blur(18px) !important;
  -webkit-backdrop-filter: blur(18px) !important;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.12);
}

.hq-shell[data-theme]
.hq-hr-modal-panel:has(.hq-employee-premium)
.hq-employee-tabs button:not([aria-selected="true"]) {
  background: transparent !important;
  color: var(--hr-muted) !important;
}

.hq-shell[data-theme]
.hq-hr-modal-panel:has(.hq-employee-premium)
.hq-employee-tabs button[aria-selected="true"] {
  background:
    linear-gradient(135deg,#29a7ff,#126ce5) !important;
  color: #fff !important;
  border: 1px solid rgba(255,255,255,.35);
  box-shadow:
    0 6px 18px rgba(20,119,225,.2),
    inset 0 1px 0 rgba(255,255,255,.25);
}

.hq-shell[data-theme]
.hq-hr-modal-panel:has(.hq-employee-premium)
.hq-employee-premium > aside > div,
.hq-shell[data-theme]
.hq-hr-modal-panel:has(.hq-employee-premium)
.hq-employee-premium > div > section {
  background: var(--hr-card) !important;
  border: 1px solid var(--hr-line) !important;
  backdrop-filter: blur(16px) !important;
  -webkit-backdrop-filter: blur(16px) !important;
  box-shadow:
    0 8px 24px rgba(30,104,160,.04),
    inset 0 1px 0 rgba(255,255,255,.3) !important;
}

.hq-shell[data-theme]
.hq-hr-modal-panel:has(.hq-employee-premium)
.hq-employee-premium :is(input:not([type="file"]),select,textarea) {
  background: var(--hr-input) !important;
  border-color: var(--hr-line) !important;
  color: var(--hr-text) !important;
  box-shadow: inset 0 1px 2px rgba(37,102,155,.03) !important;
}

.hq-shell[data-theme]
.hq-hr-modal-panel:has(.hq-employee-premium)
.hq-employee-premium section > div:first-child {
  background: transparent !important;
}

/* HQNATEX_HR_TRANSPARENT_GLASS_V5 */

/* Keep the page visible behind the employee form. */
.hq-shell[data-theme]
.hq-hr-modal-layer:has(.hq-employee-premium) {
  background: rgba(12,35,60,.12) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

.hq-shell[data-theme="light"]
.hq-hr-modal-panel:has(.hq-employee-premium) {
  --hr-card: rgba(255,255,255,.16);
  --hr-input: rgba(255,255,255,.46);
  --hr-bar: rgba(236,248,255,.22);
  --hr-line: rgba(128,184,223,.38);
  --hr-text: #12334e;
  --hr-muted: #355872;
  background:
    linear-gradient(
      135deg,
      rgba(246,252,255,.42),
      rgba(203,233,255,.26)
    ) !important;
  border: 1px solid rgba(255,255,255,.72) !important;
  backdrop-filter: blur(14px) saturate(145%) !important;
  -webkit-backdrop-filter: blur(14px) saturate(145%) !important;
  box-shadow:
    0 24px 70px rgba(17,57,91,.22),
    inset 0 1px 0 rgba(255,255,255,.65) !important;
}

.hq-shell[data-theme="dark"]
.hq-hr-modal-panel:has(.hq-employee-premium) {
  --hr-card: rgba(30,72,103,.16);
  --hr-input: rgba(9,30,49,.48);
  --hr-bar: rgba(17,44,66,.24);
  --hr-line: rgba(139,204,245,.3);
  background:
    linear-gradient(
      135deg,
      rgba(19,49,73,.48),
      rgba(8,28,47,.32)
    ) !important;
  backdrop-filter: blur(14px) saturate(145%) !important;
  -webkit-backdrop-filter: blur(14px) saturate(145%) !important;
}

/* Avoid stacking several blur layers inside the glass. */
.hq-shell[data-theme]
.hq-hr-modal-panel:has(.hq-employee-premium)
:is(.hq-hr-modal-header,.hq-hr-modal-footer,.hq-employee-tabs),
.hq-shell[data-theme]
.hq-hr-modal-panel:has(.hq-employee-premium)
.hq-employee-premium > aside > div,
.hq-shell[data-theme]
.hq-hr-modal-panel:has(.hq-employee-premium)
.hq-employee-premium > div > section {
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
`}</style>

                      {/* Employee photo */}
                      <aside className="self-start xl:sticky xl:top-0 xl:w-[18rem] xl:shrink-0">

                        {metadataEntries
                          .filter(
                            (
                              [
                                key,
                                field,
                              ],
                            ) =>
                              key ===
                                "photo_url"
                              &&
                              !field.read_only,
                          )
                          .map(
                            (
                              [
                                key,
                                field,
                              ],
                            ) =>
                              renderField(
                                key,
                                field,
                              ),
                          )}

                      </aside>


                      {/* Employee information */}
                      <div className="min-w-0 flex-1 space-y-4">

                        <section id="hq-employee-panel-basic" role="tabpanel" aria-labelledby="hq-employee-tab-basic" hidden={employeeTab !== "basic"} className="overflow-hidden rounded-[1.5rem] border border-cyan-400/10 bg-white/[0.04] shadow-sm dark:bg-slate-950/20">

                          <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-l from-cyan-500/[0.08] via-transparent to-blue-500/[0.04] px-4 py-3">

                            <div>

                              <div className="text-sm font-black text-slate-800 dark:text-white">
                                {
                                  language ===
                                  "fa"
                                    ? "اطلاعات اصلی"
                                    : language ===
                                        "ps"
                                      ? "اصلي معلومات"
                                      : "Basic information"
                                }
                              </div>

                              <div className="mt-0.5 text-[10px] font-medium text-slate-400">
                                {
                                  language ===
                                  "fa"
                                    ? "مشخصات هویتی، تماس و استخدام کارمند"
                                    : language ===
                                        "ps"
                                      ? "د کارکوونکي پېژندنه، اړیکه او دندې معلومات"
                                      : "Identity, contact and employment details"
                                }
                              </div>

                            </div>

                            <div className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[10px] font-black text-cyan-500">
                              HR
                            </div>

                          </div>


                          <div className="grid gap-3 p-4 sm:grid-cols-2">

                            {metadataEntries
                              .filter(
                                (
                                  [
                                    key,
                                    field,
                                  ],
                                ) =>
                                  !field.read_only
                                  &&
                                  key !==
                                    "photo_url"
                                  &&
                                  key !==
                                    "notes"
                                  &&
                                  ![
                                    "branch_id",
                                    "user",
                                    "department",
                                    "position",
                                    "manager",
                                  ].includes(
                                    key,
                                  ),
                              )
                              .map(
                                (
                                  [
                                    key,
                                    field,
                                  ],
                                ) => (

                                  <div
                                    key={
                                      `employee-basic-${key}`
                                    }
                                    className={
                                      [
                                        "address",
                                      ].includes(
                                        key,
                                      )
                                        ? "sm:col-span-2"
                                        : ""
                                    }
                                  >

                                    {renderField(
                                      key,
                                      field,
                                    )}

                                  </div>

                                ),
                              )}

                          </div>

                        </section>


                        {metadataEntries.some(
                          (
                            [
                              key,
                              field,
                            ],
                          ) =>
                            !field.read_only
                            &&
                            [
                              "branch_id",
                              "user",
                              "department",
                              "position",
                              "manager",
                            ].includes(
                              key,
                            ),
                        ) && (

                          <section id="hq-employee-panel-job" role="tabpanel" aria-labelledby="hq-employee-tab-job" hidden={employeeTab !== "job"} className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.035] shadow-sm dark:bg-slate-950/20">

                            <div className="border-b border-white/10 px-4 py-3">

                              <div className="text-sm font-black text-slate-800 dark:text-white">
                                {
                                  language ===
                                  "fa"
                                    ? "اطلاعات شغلی و سازمانی"
                                    : language ===
                                        "ps"
                                      ? "دندې او سازماني معلومات"
                                      : "Job & organization"
                                }
                              </div>

                              <div className="mt-0.5 text-[10px] font-medium text-slate-400">
                                {
                                  language ===
                                  "fa"
                                    ? "شعبه، دیپارتمنت، بست، مدیر و حساب کاربری"
                                    : language ===
                                        "ps"
                                      ? "څانګه، ډیپارټمنټ، بست، مدیر او کارن حساب"
                                      : "Branch, department, position, manager and user"
                                }
                              </div>

                            </div>


                            <div className="grid gap-3 p-4 sm:grid-cols-2">

                              {metadataEntries
                                .filter(
                                  (
                                    [
                                      key,
                                      field,
                                    ],
                                  ) =>
                                    !field.read_only
                                    &&
                                    [
                                      "branch_id",
                                      "user",
                                      "department",
                                      "position",
                                      "manager",
                                    ].includes(
                                      key,
                                    ),
                                )
                                .map(
                                  (
                                    [
                                      key,
                                      field,
                                    ],
                                  ) => (

                                    <div
                                      key={
                                        `employee-org-${key}`
                                      }
                                    >

                                      {renderField(
                                        key,
                                        field,
                                      )}

                                    </div>

                                  ),
                                )}

                            </div>

                          </section>

                        )}


                        {metadataEntries.some(
                          (
                            [
                              key,
                              field,
                            ],
                          ) =>
                            key ===
                              "notes"
                            &&
                            !field.read_only,
                        ) && (

                          <section id="hq-employee-panel-notes" role="tabpanel" aria-labelledby="hq-employee-tab-notes" hidden={employeeTab !== "notes"} className="hq-visual-panel rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-4 shadow-sm dark:bg-slate-950/20">

                            <div className="mb-3 text-sm font-black text-slate-800 dark:text-white">
                              {
                                language ===
                                "fa"
                                  ? "یادداشت"
                                  : language ===
                                      "ps"
                                    ? "یادښت"
                                    : "Notes"
                              }
                            </div>

                            {metadataEntries
                              .filter(
                                (
                                  [
                                    key,
                                    field,
                                  ],
                                ) =>
                                  key ===
                                    "notes"
                                  &&
                                  !field.read_only,
                              )
                              .map(
                                (
                                  [
                                    key,
                                    field,
                                  ],
                                ) =>
                                  renderField(
                                    key,
                                    field,
                                  ),
                              )}

                          </section>

                        )}

                      </div>

                    </div>

                  ) : (

                    <>

                      {metadataEntries
                        .filter(
                          (
                            [
                              ,
                              field,
                            ],
                          ) =>
                            !field.read_only,
                        )
                        .map(
                          (
                            [
                              key,
                              field,
                            ],
                          ) =>
                            renderField(
                              key,
                              field,
                            ),
                        )}

                    </>

                  )}

                </div>

              )}

            </div>


            {modalMode !==
              "view" && (

              <div className="hq-hr-modal-footer flex shrink-0 flex-wrap justify-end gap-2 border-t border-white/10 p-3 sm:p-4">

                <SharedSecondaryButton
                  type="button"
                  onClick={
                    () =>
                      setModalMode(
                        null,
                      )
                  }
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold"
                >
                  {c.cancel}
                </SharedSecondaryButton>

                <SharedPrimaryButton
                  type="button"
                  disabled={
                    saving
                  }
                  onClick={
                    () =>
                      void saveForm()
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-500/15 px-4 py-2 text-xs font-black text-cyan-500"
                >

                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}

                  {c.save}

                </SharedPrimaryButton>

              </div>

            )}

            </div>

          </div>
        </>

      )}

    </div>
  );
}


export default HRPayrollModule;
