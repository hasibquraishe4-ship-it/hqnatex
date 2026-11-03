from django.contrib import admin
from .models import Invoice, InvoiceItem, Payment, PaymentAllocation, Receipt, Receivable
for model in (Invoice, InvoiceItem, Receivable, Payment, PaymentAllocation, Receipt):
    admin.site.register(model)
