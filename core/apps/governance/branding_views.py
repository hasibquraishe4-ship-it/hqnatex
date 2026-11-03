from __future__ import annotations

from django.core.files.storage import default_storage
from django.http import FileResponse, Http404

from rest_framework import status
from rest_framework.parsers import (
    FormParser,
    JSONParser,
    MultiPartParser,
)
from rest_framework.permissions import (
    BasePermission,
    IsAuthenticated,
)
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import (
    CompanyContextPermission,
    IsPlatformAdmin,
    TenantContextPermission,
    TenantRBACPermission,
)

from apps.governance.branding_service import (
    BACKGROUND_PERMISSION_MANAGE,
    BACKGROUND_PERMISSION_VIEW,
    get_background_setting,
    patch_background_options,
    remove_background,
    reset_background,
    resolved_value,
    serialize_background,
    upload_background,
)


class BrandingSettingsPermission(
    BasePermission
):
    """
    Platform administrators are allowed directly.

    Tenant users require the canonical settings RBAC key
    returned by permission_key_for_method().
    """

    def has_permission(
        self,
        request,
        view,
    ) -> bool:

        if IsPlatformAdmin().has_permission(
            request,
            view,
        ):
            return True

        return (
            TenantRBACPermission()
            .has_permission(
                request,
                view,
            )
        )


class BrandingScopedAPIView(
    APIView
):
    permission_classes = [
        IsAuthenticated,
        TenantContextPermission,
        CompanyContextPermission,
        BrandingSettingsPermission,
    ]


class BrandingBackgroundView(
    BrandingScopedAPIView
):
    parser_classes = [
        MultiPartParser,
        FormParser,
        JSONParser,
    ]

    def permission_key_for_method(
        self,
        method: str,
    ) -> str:

        if method in {
            "GET",
            "HEAD",
            "OPTIONS",
        }:
            return (
                BACKGROUND_PERMISSION_VIEW
            )

        return (
            BACKGROUND_PERMISSION_MANAGE
        )

    def get(
        self,
        request,
    ):

        setting = get_background_setting(
            tenant_id=request.tenant_id,
            company_id=request.company_id,
        )

        return Response(
            serialize_background(
                setting=setting,
            )
        )

    def post(
        self,
        request,
    ):

        upload = request.FILES.get(
            "background"
        )

        if upload is None:
            return Response(
                {
                    "background":
                        [
                            "Background image is required."
                        ]
                },
                status=(
                    status
                    .HTTP_400_BAD_REQUEST
                ),
            )

        setting = upload_background(
            request=request,
            upload=upload,
            options=request.data,
        )

        return Response(
            serialize_background(
                setting=setting,
            ),
            status=(
                status.HTTP_200_OK
            ),
        )

    def patch(
        self,
        request,
    ):

        setting = patch_background_options(
            request=request,
            data=request.data,
        )

        return Response(
            serialize_background(
                setting=setting,
            )
        )

    def delete(
        self,
        request,
    ):

        setting = remove_background(
            request=request,
        )

        return Response(
            serialize_background(
                setting=setting,
            )
        )


class BrandingBackgroundResetView(
    BrandingScopedAPIView
):

    def permission_key_for_method(
        self,
        method: str,
    ) -> str:
        return (
            BACKGROUND_PERMISSION_MANAGE
        )

    def post(
        self,
        request,
    ):

        setting = reset_background(
            request=request,
        )

        return Response(
            serialize_background(
                setting=setting,
            )
        )


class BrandingBackgroundFileView(
    BrandingScopedAPIView
):

    def permission_key_for_method(
        self,
        method: str,
    ) -> str:
        return (
            BACKGROUND_PERMISSION_VIEW
        )

    def get(
        self,
        request,
    ):

        setting = get_background_setting(
            tenant_id=request.tenant_id,
            company_id=request.company_id,
        )

        value = resolved_value(
            setting,
        )

        storage_key = value.get(
            "storage_key"
        )

        if (
            value.get("mode")
            != "custom"
            or not storage_key
        ):
            raise Http404(
                "Custom background not found."
            )

        if not default_storage.exists(
            storage_key
        ):
            raise Http404(
                "Background asset not found."
            )

        response = FileResponse(
            default_storage.open(
                storage_key,
                "rb",
            ),
            content_type=(
                value.get(
                    "content_type"
                )
                or "application/octet-stream"
            ),
        )

        response[
            "Content-Disposition"
        ] = 'inline; filename="system-background"'

        response[
            "Cache-Control"
        ] = (
            "private, max-age=300"
        )

        checksum = value.get(
            "sha256"
        )

        if checksum:
            response["ETag"] = (
                f'"{checksum}"'
            )

        return response
