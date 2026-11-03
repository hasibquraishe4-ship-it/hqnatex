from apps.common.api import CompanyScopedModelViewSet

from .models import Account
from .serializers import AccountSerializer


class AccountViewSet(CompanyScopedModelViewSet):
    queryset = Account.objects.select_related(
        "company",
        "parent",
    )

    serializer_class = AccountSerializer

    permission_read = "finance.accounts.view"
    permission_write = "finance.accounts.manage"

    filterset_fields = [
        "parent",
        "account_type",
        "status",
        "is_posting",
    ]

    search_fields = [
        "code",
        "name",
        "description",
    ]
