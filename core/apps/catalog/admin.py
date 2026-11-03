from django.contrib import admin
from .models import Package, PackagePrice, Service, ServiceCategory, ServiceTechnicalField, Technology, ServiceTechnology
for model in (ServiceCategory, Service, ServiceTechnicalField, Package, PackagePrice, Technology, ServiceTechnology):
    admin.site.register(model)
