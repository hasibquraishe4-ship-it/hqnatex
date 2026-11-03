from django.apps import apps

from rest_framework.permissions import (
    BasePermission,
    SAFE_METHODS,
)

from apps.platform_tenancy_v3.rls import (
    set_rls_context,
)


class HRRBACPermission(
    BasePermission
):

    message = (
        "You do not have the required "
        "HR/Payroll permission."
    )

    def has_permission(
        self,
        request,
        view,
    ):

        user = request.user

        if (
            not user
            or
            not user.is_authenticated
        ):
            return False

        tenant_id = getattr(
            request,
            "tenant_id",
            None,
        )

        company_id = getattr(
            request,
            "company_id",
            None,
        )

        if (
            not tenant_id
            or
            not company_id
        ):
            return False

        if getattr(
            user,
            "is_superuser",
            False,
        ):
            return True

        action_permissions = getattr(
            view,
            "action_permissions",
            {},
        )

        action = getattr(
            view,
            "action",
            None,
        )

        required = (
            action_permissions.get(
                action
            )
            if action
            else None
        )

        if not required:

            if request.method in SAFE_METHODS:

                required = getattr(
                    view,
                    "permission_read",
                    "hr.view",
                )

            else:

                required = getattr(
                    view,
                    "permission_write",
                    "hr.manage",
                )

        if not required:
            return True

        set_rls_context(
            "default",
            tenant_id,
            company_id,
        )

        MembershipRole = (
            apps.get_model(
                "iam",
                "MembershipRole",
            )
        )

        RolePermission = (
            apps.get_model(
                "iam",
                "RolePermission",
            )
        )

        role_ids = list(
            MembershipRole.objects
            .filter(
                tenant_id=tenant_id,
                membership__user_id=
                    user.pk,
            )
            .values_list(
                "role_id",
                flat=True,
            )
        )

        if not role_ids:
            return False

        return (
            RolePermission.objects
            .filter(
                tenant_id=tenant_id,
                role_id__in=
                    role_ids,
                permission__key=
                    required,
            )
            .exists()
        )
