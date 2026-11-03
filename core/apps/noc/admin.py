from django.contrib import admin
from .models import CustomerServiceNetworkResource, NetworkResource
admin.site.register(NetworkResource)
admin.site.register(CustomerServiceNetworkResource)
