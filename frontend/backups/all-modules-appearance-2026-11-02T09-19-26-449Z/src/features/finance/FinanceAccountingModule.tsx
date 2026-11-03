import type { Session } from "../../lib/api";
import { FinanceCommandCenter } from "./FinanceCommandCenter";
import type { FinanceTabId } from "./FinanceTypes";

type Props = {
  session: Session;
  initialTab?: FinanceTabId;
  onSectionChange: (
    section: "billing" | "revenue" | "finance",
    financeTab?: FinanceTabId,
  ) => void;
};

export function FinanceAccountingModule({
  session,
  initialTab,
  onSectionChange,
}: Props) {
  return (
    <FinanceCommandCenter
      session={session}
      initialTab={initialTab}
      onSectionChange={onSectionChange}
    />
  );
}
