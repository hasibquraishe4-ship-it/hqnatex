from apps.common.api import CompanyScopedModelViewSet

from .models import (
    CustomerServiceNetworkResource,
    NetworkResource,
)
from .serializers import (
    CustomerServiceNetworkResourceSerializer,
    NetworkResourceSerializer,
)


class NetworkResourceViewSet(CompanyScopedModelViewSet):
    queryset = NetworkResource.objects.select_related(
        "company",
        "branch",
        "parent",
    ).all()
    serializer_class = NetworkResourceSerializer
    permission_read = "noc.view"
    permission_write = "noc.manage"


class CustomerServiceNetworkResourceViewSet(CompanyScopedModelViewSet):
    queryset = CustomerServiceNetworkResource.objects.select_related(
        "company",
        "customer_service",
        "resource",
    ).all()
    serializer_class = CustomerServiceNetworkResourceSerializer
    permission_read = "noc.view"
    permission_write = "noc.manage"
