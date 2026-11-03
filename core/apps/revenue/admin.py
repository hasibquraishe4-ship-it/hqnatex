from django.contrib import admin
from .models import RevenueAllocation, RevenueTransaction, ShareRule
for model in (ShareRule, RevenueTransaction, RevenueAllocation):
    admin.site.register(model)
