# HQNATEX FULL-03 — Sales / Billing / Revenue Sharing Evidence

Canonical chain implemented in FULL-03:

Customer → CustomerService → Sale → SaleItem → Invoice → Receivable ← PaymentAllocation ← Payment → Receipt

Revenue is sourced from posted Sale/SaleItem, not from Payment.

Revenue Sharing:
- Effective-dated ShareRule is selected by tenant + company + agency + service + sale date.
- Partner Share + Company Base Share + Agency Gross Share must equal 100%.
- Agency Tax is outside the 100% split and is deducted after Agency Gross Share.
- Used ShareRule financial fields are immutable; create a new effective-dated version instead.
- Seed examples use 70/15/15 and 10% Agency Tax only as configurable test data, never as hard-coded runtime logic.
- New UI uses Agency terminology only.

Boundaries intentionally preserved:
- Customer Outstanding is Receivable/Payment Allocation truth.
- Agency Outstanding/Settlement is not created in FULL-03 and remains a separate FULL-04 domain.
- Partner Settlement, cash/bank ledger, GL posting, financial corrections and certified Net Profit remain FULL-04.
- Posted Payment is marked `pending_treasury` until FULL-04 connects Cash/Bank and GL.
- Equipment Sale is blocked until Warehouse Product/Stock/Serial truth exists in FULL-05.
- Sale-level discounts are blocked in FULL-03 until an approved attribution/allocation rule is implemented; no guessed revenue attribution is allowed.
