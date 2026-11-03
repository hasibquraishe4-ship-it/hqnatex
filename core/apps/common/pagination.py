from rest_framework.pagination import (
    PageNumberPagination,
)


class HQNATEXPageNumberPagination(
    PageNumberPagination
):
    """
    Central HQNATEX API pagination.

    Default:
        50 records

    Client-controlled:
        ?page_size=10
        ?page_size=25
        ?page_size=50
        ?page_size=100

    Existing larger operational lookups are also
    supported safely up to 500 records per request.
    """

    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 500
