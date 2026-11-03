import { useEffect, useRef, type ComponentProps, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useTranslation } from "../lib/i18n";
import { PrimaryButton, SecondaryButton } from "./Interface";

type NativeModalProps = ComponentProps<"div"> & { native: true };
type DialogProps = {
  native?: false; open: boolean; title: ReactNode; onClose: () => void;
  children: ReactNode; footer?: ReactNode; busy?: boolean; className?: string;
};

export function Modal(props: NativeModalProps | DialogProps) {
  if (props.native) {
    const { native: _native, className = "", ...rest } = props;
    return <div role="dialog" aria-modal="true" {...rest} className={`hq-modal-panel ${className}`} />;
  }
  return <ManagedModal {...props} />;
}

function ManagedModal({ open, title, onClose, children, footer, busy, className = "" }: DialogProps) {
  const { t } = useTranslation();
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    return () => previous?.focus();
  }, [open]);
  if (!open) return null;
  return createPortal(<div className="hq-modal-layer">
    <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : undefined}
      className={`hq-modal-panel ${className}`} onKeyDown={event => {
        if (event.key === "Escape" && !busy) { event.stopPropagation(); onClose(); }
        if (event.key !== "Tab") return;
        const targets = panel.current?.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex='0']");
        if (!targets?.length) { event.preventDefault(); return; }
        const first = targets[0], last = targets[targets.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }}>
      <header className="hq-modal-header"><h2>{title}</h2><SecondaryButton disabled={busy} onClick={onClose} aria-label={t.systemUi.close}><X size={18} /></SecondaryButton></header>
      <div className="hq-modal-body">{children}</div>
      {footer && <footer className="hq-modal-footer">{footer}</footer>}
    </div>
  </div>, document.querySelector(".hq-shell") || document.body);
}

export function ConfirmDialog({ onConfirm, confirmLabel, ...props }: Omit<DialogProps, "footer"> & {
  onConfirm: () => void; confirmLabel?: string;
}) {
  const { t } = useTranslation();
  return <Modal {...props} footer={<>
    <SecondaryButton onClick={props.onClose} disabled={props.busy}>{t.systemUi.cancel}</SecondaryButton>
    <PrimaryButton onClick={onConfirm} disabled={props.busy}>{confirmLabel || t.systemUi.confirm}</PrimaryButton>
  </>} />;
}
