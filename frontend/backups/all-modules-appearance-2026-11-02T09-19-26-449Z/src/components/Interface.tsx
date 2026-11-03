import { createElement, forwardRef, type ComponentProps, type ReactNode } from "react";
import { AlertCircle, LoaderCircle, ShieldX } from "lucide-react";
import { useTranslation } from "../lib/i18n";

export function Card({ className = "", ...props }: ComponentProps<"section">) {
  return <section {...props} className={`hq-card ${className}`} />;
}

export function FilterBar<T extends "div" | "form" = "div">({ as, className = "", ...props }: { as?: T } & ComponentProps<T>) {
  return createElement(as || "div", { ...props, className: `hq-filter-bar ${className}` });
}

export function FormField({ label, required = false, children, hint, error, span, className = "" }: {
  label: ReactNode; required?: boolean; children: ReactNode;
  hint?: ReactNode; error?: ReactNode; span?: boolean; className?: string;
}) {
  return <label className={`hq-form-field ${span ? "md:col-span-2" : ""} ${className}`}>
    <span className="hq-field-label">{label}{required && <span aria-hidden="true"> *</span>}</span>
    {children}
    {hint && <span className="hq-field-hint">{hint}</span>}
    {error && <span className="hq-field-error" role="alert">{error}</span>}
  </label>;
}

type ButtonProps = ComponentProps<"button">;
export function PrimaryButton({ className = "", type = "button", ...props }: ButtonProps) {
  return <button {...props} type={type} className={`hq-button hq-button-primary ${className}`} />;
}
export function SecondaryButton({ className = "", type = "button", ...props }: ButtonProps) {
  return <button {...props} type={type} className={`hq-button hq-button-secondary ${className}`} />;
}

export const SearchBox = forwardRef<HTMLInputElement, ComponentProps<"input">>(function SearchBox(
  { className = "", type = "search", ...props }, ref,
) {
  const { t } = useTranslation();
  return <input aria-label={t.common.search} {...props} ref={ref} type={type} className={`hq-input hq-search ${className}`} />;
});

export const Select = forwardRef<HTMLSelectElement, ComponentProps<"select">>(function Select(
  { className = "", ...props }, ref,
) { return <select {...props} ref={ref} className={`hq-input ${className}`} />; });

export const DatePicker = forwardRef<HTMLInputElement, ComponentProps<"input">>(function DatePicker(
  { className = "", ...props }, ref,
) { return <input {...props} ref={ref} type="date" dir="ltr" className={`hq-input ${className}`} />; });

type StateProps = { children?: ReactNode; compact?: boolean };
export function LoadingState({ children, compact }: StateProps) {
  const { t } = useTranslation();
  return <div className={`hq-state ${compact ? "hq-state-compact" : ""}`} role="status" aria-live="polite">
    <LoaderCircle className="hq-state-icon animate-spin" aria-hidden="true" />{children || t.common.loading}
  </div>;
}
export function EmptyState({ children, compact }: StateProps) {
  const { t } = useTranslation();
  return <div className={`hq-state ${compact ? "hq-state-compact" : ""}`}>{children || t.common.noRecords}</div>;
}
export function ErrorState({ children, compact }: StateProps) {
  const { t } = useTranslation();
  return <div className={`hq-state hq-state-error ${compact ? "hq-state-compact" : ""}`} role="alert">
    <AlertCircle className="hq-state-icon" aria-hidden="true" />{children || t.systemUi.error}
  </div>;
}
export function PermissionDenied({ children }: StateProps) {
  const { t } = useTranslation();
  return <div className="hq-state hq-state-denied" role="status">
    <ShieldX className="hq-state-icon" aria-hidden="true" />
    <strong>{t.common.accessDenied}</strong>{children || t.common.accessDeniedDescription}
  </div>;
}

export function Alert({ children, tone = "info", className = "", ...props }: ComponentProps<"div"> & {
  tone?: "info" | "success" | "error";
}) {
  return <div {...props} role={tone === "error" ? "alert" : "status"} className={`hq-alert hq-alert-${tone} ${className}`}>{children}</div>;
}

export function DetailField({ label, value, mono = false }: { label: ReactNode; value?: ReactNode; mono?: boolean }) {
  const { t } = useTranslation();
  return <div className="hq-detail-field"><span className="hq-field-label">{label}</span>
    <div className={mono ? "font-mono" : undefined}>{value === null || value === undefined || value === "" ? t.systemUi.notConfigured : value}</div></div>;
}

export function Pagination<T extends "div" | "footer" = "div">({ as, className = "", ...props }: { as?: T } & ComponentProps<T>) {
  return createElement(as || "div", { ...props, className: `hq-pagination ${className}` });
}
