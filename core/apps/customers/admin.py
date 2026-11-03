from django.contrib import admin
from .models import Customer, CustomerService, ServiceChangeRequest, ServicePackageHistory, ServiceStatusHistory
for model in (Customer, CustomerService, ServicePackageHistory, ServiceStatusHistory, ServiceChangeRequest):
    admin.site.register(model)
