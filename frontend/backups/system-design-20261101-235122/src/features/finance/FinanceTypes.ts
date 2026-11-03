export type FinanceTabId =
  | "dashboard"
  | "generalLedger"
  | "chartOfAccounts"
  | "journalEntries"
  | "cashBank"
  | "receivables"
  | "payables"
  | "settlements"
  | "expenses"
  | "taxes"
  | "periods"
  | "reports";

export type FinanceFilterState = {
  companyId: string;
  branchId: string;
  agencyId: string;
  dateRange: "all" | "today" | "this_week" | "this_month" | "this_quarter" | "this_year" | "custom";
  startDate: string;
  endDate: string;
  currency: string;
};

export type GeneralLedgerEntry = {
  id: string;
  date: string;
  voucherNo: string;
  accountCode: string;
  accountName: string;
  accountType: "asset" | "liability" | "equity" | "revenue" | "expense";
  description: string;
  debit: number;
  credit: number;
  balance: number;
  companyId: string;
  companyName: string;
  branchName: string;
  agencyName?: string;
  status: "posted" | "draft" | "reversed";
  createdBy: string;
  postedBy?: string;
};

export type CashBankAccount = {
  id: string;
  name: string;
  type: "cash" | "bank";
  accountNumber: string;
  bankName?: string;
  currency: string;
  balance: number;
  companyId: string;
  branchName: string;
  status: "active" | "inactive";
  lastReconciledDate: string;
};

export type CashBankTransaction = {
  id: string;
  date: string;
  accountId: string;
  accountName: string;
  type: "deposit" | "withdrawal" | "transfer" | "collection" | "settlement" | "expense";
  reference: string;
  counterparty: string;
  inflow: number;
  outflow: number;
  balance: number;
  isReconciled: boolean;
  notes?: string;
};

export type ReceivableItem = {
  id: string;
  invoiceNo: string;
  customerName: string;
  customerCode: string;
  invoiceDate: string;
  dueDate: string;
  originalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  currency: string;
  agingDays: number;
  agingBracket: "current" | "1-30" | "31-60" | "61-90" | "90+";
  status: "unpaid" | "partial" | "overdue" | "paid";
  agencyName?: string;
};

export type PayableItem = {
  id: string;
  referenceNo: string;
  payeeName: string;
  payeeType: "agency" | "supplier" | "contractor" | "tax_authority";
  agencyId?: string;
  date: string;
  dueDate: string;
  payableAmount: number;
  paidAmount: number;
  balanceAmount: number;
  currency: string;
  agingDays: number;
  agingBracket: "current" | "1-30" | "31-60" | "60+";
  status: "unpaid" | "partial" | "overdue" | "settled";
};

export type ExpenseItem = {
  id: string;
  expenseNo: string;
  category: "bandwidth" | "infrastructure" | "power_fuel" | "salaries" | "office_operations" | "marketing" | "tax";
  categoryName: string;
  amount: number;
  currency: string;
  date: string;
  companyId: string;
  companyName: string;
  branchName: string;
  payee: string;
  paymentMethod: "cash" | "bank_transfer" | "cheque" | "card";
  reference: string;
  status: "approved" | "pending" | "paid";
  accountCode: string;
  accountName: string;
};

export type TaxItem = {
  id: string;
  taxType: "agency_withholding" | "salary_tax" | "brt_sales_tax" | "corporate_income_tax";
  taxTypeName: string;
  taxRatePercent: number;
  taxableBase: number;
  taxPayable: number;
  taxPaid: number;
  balanceDue: number;
  period: string;
  companyName: string;
  status: "filed" | "pending" | "paid";
  dueDate: string;
};

export type FinancialReportType =
  | "trial_balance"
  | "profit_loss"
  | "balance_sheet"
  | "cash_flow"
  | "general_ledger"
  | "account_statement"
  | "receivable_aging"
  | "payable_aging"
  | "revenue_expense";
