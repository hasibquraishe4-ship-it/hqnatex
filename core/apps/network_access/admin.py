from django.contrib import admin
from .models import (
    APIClientRegistry, CompanyNetworkPolicy, ConnectivityObservation,
    IntegrationEndpoint, ManagedNetworkDevice, NetworkAddressRule, VPNProfile,
)

admin.site.register(CompanyNetworkPolicy)
admin.site.register(NetworkAddressRule)
admin.site.register(VPNProfile)
admin.site.register(ManagedNetworkDevice)
admin.site.register(APIClientRegistry)
admin.site.register(IntegrationEndpoint)
admin.site.register(ConnectivityObservation)
