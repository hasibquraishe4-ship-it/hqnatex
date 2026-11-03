from decimal import Decimal

# HQNATEX_HR_EMPLOYEE_PHOTO_UPLOAD_V1_IMPORTS
import json

from io import BytesIO
from uuid import uuid4

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage

from PIL import (
    Image,
    UnidentifiedImageError,
)


from django.db import (
    models,
    transaction,
)
from django.db.models import (
    Q,
    Sum,
)
from django.utils import timezone

from rest_framework import (
    status,
    viewsets,
)
from rest_framework.decorators import (
    action,
)
from rest_framework.exceptions import (
    MethodNotAllowed,
    PermissionDenied,
    ValidationError,
)
from rest_framework.permissions import (
    IsAuthenticated,
)
from rest_framework.response import (
    Response,
)

from apps.platform_tenancy_v3.rls import (
    set_rls_context,
)

from apps.common.permissions import (
    TenantContextPermission,
    CompanyContextPermission,
)

from .models import (
    Department,
    Position,
)

from .models_full import (
    Employee,
    EmploymentContract,
    WorkShift,
    EmployeeShift,
    Attendance,
    LeaveType,
    LeaveBalance,
    LeaveRequest,
    PublicHoliday,
    Overtime,
    SalaryProfile,
    PayrollTaxBracket,
    Allowance,
    Deduction,
    PayrollPeriod,
    PayrollRun,
    PayrollEntry,
    PayrollPayment,
    Payslip,
    EmployeeLoan,
    SalaryAdvance,
    Vacancy,
    Candidate,
    Interview,
    OnboardingTask,
    PerformanceReview,
    Training,
    TrainingParticipant,
    DisciplinaryAction,
    PromotionTransfer,
    EmployeeAsset,
    EmergencyContact,
    EmployeeBankAccount,
    EmployeeDocument,
    Termination,
    Clearance,
    ApprovalRequest,
    HRAuditEvent,
)

from .permissions_full import (
    HRRBACPermission,
)

from .serializers_full import (
    serializer_for,
)


def _field_names(model):

    return {
        field.name
        for field in model._meta.fields
    }


def _audit_payload(values):

    output = {}

    for key, value in values.items():

        if isinstance(
            value,
            (
                str,
                int,
                float,
                bool,
                type(None),
            ),
        ):
            output[key] = value

        else:
            output[key] = str(
                value
            )

    return output


class HRScopedViewSet(
    viewsets.ModelViewSet
):

    permission_classes = [
        IsAuthenticated,
        TenantContextPermission,
        CompanyContextPermission,
        HRRBACPermission,
    ]

    permission_read = "hr.view"
    permission_write = "hr.manage"

    action_permissions = {}

    def _context(self):

        tenant_id = getattr(
            self.request,
            "tenant_id",
            None,
        )

        company_id = getattr(
            self.request,
            "company_id",
            None,
        )

        if (
            not tenant_id
            or
            not company_id
        ):
            raise PermissionDenied(
                "Active tenant/company context is required."
            )

        set_rls_context(
            "default",
            tenant_id,
            company_id,
        )

        return (
            tenant_id,
            company_id,
        )

    def get_queryset(self):

        tenant_id, company_id = (
            self._context()
        )

        queryset = (
            self.queryset
            .filter(
                tenant_id=tenant_id,
                company_id=company_id,
            )
        )

        names = _field_names(
            self.queryset.model
        )

        branch_id = (
            self.request.headers.get(
                "X-Branch-ID"
            )
            or
            self.request.query_params.get(
                "branch_id"
            )
        )

        if (
            branch_id
            and
            "branch_id" in names
        ):
            queryset = queryset.filter(
                branch_id=branch_id
            )

        status_value = (
            self.request.query_params.get(
                "status"
            )
        )

        if (
            status_value
            and
            "status" in names
        ):
            queryset = queryset.filter(
                status=status_value
            )

        employee_id = (
            self.request.query_params.get(
                "employee_id"
            )
        )

        if (
            employee_id
            and
            "employee" in names
        ):
            queryset = queryset.filter(
                employee_id=employee_id
            )

        search = (
            self.request.query_params
            .get(
                "search",
                "",
            )
            .strip()
        )

        if search:

            query = Q()
            searchable = []

            for field in (
                self.queryset.model
                ._meta
                .get_fields()
            ):

                if isinstance(
                    field,
                    (
                        models.CharField,
                        models.TextField,
                        models.EmailField,
                    ),
                ):
                    searchable.append(
                        field.name
                    )

            for field_name in searchable:

                query |= Q(
                    **{
                        f"{field_name}__icontains":
                            search
                    }
                )

            if searchable:
                queryset = queryset.filter(
                    query
                )

        if "created_at" in names:
            queryset = queryset.order_by(
                "-created_at"
            )
        else:
            queryset = queryset.order_by(
                "pk"
            )

        return queryset

    def perform_create(
        self,
        serializer,
    ):

        tenant_id, company_id = (
            self._context()
        )

        model = (
            serializer.Meta.model
        )

        names = _field_names(
            model
        )

        save_kwargs = {
            "tenant_id":
                tenant_id,
            "company_id":
                company_id,
        }

        branch_id = (
            self.request.headers.get(
                "X-Branch-ID"
            )
        )

        if (
            branch_id
            and
            "branch_id" in names
        ):
            save_kwargs[
                "branch_id"
            ] = branch_id

        if (
            "requested_by"
            in names
        ):
            save_kwargs[
                "requested_by"
            ] = self.request.user

        instance = serializer.save(
            **save_kwargs
        )

        self._write_audit(
            "create",
            instance,
            serializer.validated_data,
        )

    def perform_update(
        self,
        serializer,
    ):

        self._context()

        instance = serializer.save()

        self._write_audit(
            "update",
            instance,
            serializer.validated_data,
        )

    def destroy(
        self,
        request,
        *args,
        **kwargs,
    ):

        raise MethodNotAllowed(
            "DELETE"
        )

    def _write_audit(
        self,
        action_name,
        instance,
        values=None,
    ):

        if isinstance(
            instance,
            HRAuditEvent,
        ):
            return

        tenant_id, company_id = (
            self._context()
        )

        HRAuditEvent.objects.create(
            tenant_id=tenant_id,
            company_id=company_id,
            branch_id=getattr(
                instance,
                "branch_id",
                None,
            ),
            actor=(
                self.request.user
                if self.request.user.is_authenticated
                else None
            ),
            action=action_name,
            object_type=
                instance._meta.label,
            object_id=getattr(
                instance,
                "pk",
                None,
            ),
            payload=_audit_payload(
                values or {}
            ),
        )


def make_viewset(
    model,
    domain="hr",
):

    prefix = (
        "payroll"
        if domain == "payroll"
        else "hr"
    )

    attrs = {
        "queryset":
            model.objects.all(),

        "serializer_class":
            serializer_for(
                model
            ),

        "permission_read":
            f"{prefix}.view",

        "permission_write":
            f"{prefix}.manage",

        "__module__":
            __name__,
    }

    return type(
        f"{model.__name__}ViewSet",
        (
            HRScopedViewSet,
        ),
        attrs,
    )


DepartmentViewSet = (
    make_viewset(
        Department
    )
)

PositionViewSet = (
    make_viewset(
        Position
    )
)

_EmployeeViewSetBase = (
    make_viewset(
        Employee
    )
)


class EmployeeViewSet(
    _EmployeeViewSetBase
):

    # HQNATEX_HR_EMPLOYEE_PHOTO_UPLOAD_V1_BACKEND

    PHOTO_MAX_BYTES = (
        5 * 1024 * 1024
    )

    PHOTO_FORMATS = {
        "JPEG": "jpg",
        "PNG": "png",
        "WEBP": "webp",
    }



    # HQNATEX_HR_PHOTO_AUTHENTICATED_READ_V1
    @action(detail=True, methods=["get"], url_path="photo-file")
    def photo_file(self, request, pk=None):
        from django.http import FileResponse, Http404
        from pathlib import PurePosixPath

        # Reuse the existing scoped queryset and object permissions.
        employee = self.get_object()
        tenant_id, company_id = self._context()
        storage_name = self._storage_name_from_url(employee.photo_url)
        prefix = (
            f"hr/employee-photos/{tenant_id}/"
            f"{company_id}/{employee.pk}/"
        )
        if not storage_name or not storage_name.startswith(prefix):
            raise Http404("Employee photo not found.")

        relative = storage_name[len(prefix):]
        if (
            not relative
            or "/" in relative
            or "\\" in relative
            or relative in (".", "..")
        ):
            raise Http404("Employee photo not found.")

        content_types = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".webp": "image/webp",
        }
        content_type = content_types.get(
            PurePosixPath(storage_name).suffix.lower()
        )
        if not content_type:
            raise Http404("Employee photo not found.")

        try:
            photo_stream = default_storage.open(storage_name, "rb")
        except FileNotFoundError:
            raise Http404("Employee photo not found.")

        response = FileResponse(
            photo_stream,
            content_type=content_type,
            as_attachment=False,
            filename=relative,
        )
        response["Cache-Control"] = "private, no-store"
        response["X-Content-Type-Options"] = "nosniff"
        return response

    def _employee_payload(
        self,
        request,
    ):

        raw_payload = (
            request.data.get(
                "payload"
            )
        )


        if raw_payload is None:

            data = request.data

            if hasattr(
                data,
                "dict",
            ):
                data = data.dict()
            else:
                data = dict(data)

            data.pop(
                "photo",
                None,
            )

            data.pop(
                "payload",
                None,
            )

            return data


        if not isinstance(
            raw_payload,
            str,
        ):

            raise ValidationError({
                "photo_url":
                    "Invalid employee multipart payload."
            })


        try:

            payload = json.loads(
                raw_payload
            )

        except Exception:

            raise ValidationError({
                "photo_url":
                    "Invalid employee multipart payload."
            })


        if not isinstance(
            payload,
            dict,
        ):

            raise ValidationError({
                "photo_url":
                    "Invalid employee multipart payload."
            })


        return payload


    def _validated_photo(
        self,
        upload,
    ):

        if upload is None:
            return None


        size = int(
            getattr(
                upload,
                "size",
                0,
            )
            or 0
        )


        if (
            size <= 0
            or
            size > self.PHOTO_MAX_BYTES
        ):

            raise ValidationError({
                "photo_url":
                    "Employee photo must be 5 MB or smaller."
            })


        raw = upload.read()


        if (
            not raw
            or
            len(raw)
            > self.PHOTO_MAX_BYTES
        ):

            raise ValidationError({
                "photo_url":
                    "Employee photo must be 5 MB or smaller."
            })


        try:

            image = Image.open(
                BytesIO(raw)
            )

            detected = str(
                image.format
                or ""
            ).upper()

            image.verify()

        except (
            UnidentifiedImageError,
            OSError,
            ValueError,
            Image.DecompressionBombError,
        ):

            raise ValidationError({
                "photo_url":
                    "Employee photo must be a valid JPG, PNG, or WebP image."
            })


        extension = (
            self.PHOTO_FORMATS.get(
                detected
            )
        )


        if not extension:

            raise ValidationError({
                "photo_url":
                    "Employee photo must be JPG, PNG, or WebP."
            })


        return (
            raw,
            extension,
        )


    def _storage_name_from_url(
        self,
        photo_url,
    ):

        if not photo_url:
            return None


        media_url = str(
            settings.MEDIA_URL
            or ""
        )


        if (
            media_url
            and
            str(photo_url).startswith(
                media_url
            )
        ):

            return str(
                photo_url
            )[
                len(media_url):
            ].lstrip("/")


        return None


    def _save_employee_photo(
        self,
        instance,
        validated_photo,
    ):

        if validated_photo is None:
            return None


        raw, extension = (
            validated_photo
        )

        tenant_id, company_id = (
            self._context()
        )


        old_storage_name = (
            self._storage_name_from_url(
                getattr(
                    instance,
                    "photo_url",
                    "",
                )
            )
        )


        relative_name = (
            "hr/employee-photos/"
            f"{tenant_id}/"
            f"{company_id}/"
            f"{instance.pk}/"
            f"{uuid4().hex}."
            f"{extension}"
        )


        saved_name = None


        try:

            saved_name = (
                default_storage.save(
                    relative_name,
                    ContentFile(raw),
                )
            )


            photo_url = str(
                default_storage.url(
                    saved_name
                )
            )


            if len(photo_url) > 200:

                raise ValidationError({
                    "photo_url":
                        "Stored employee photo URL exceeds 200 characters."
                })


            instance.photo_url = (
                photo_url
            )


            update_fields = [
                "photo_url",
            ]


            if any(
                field.name
                == "updated_at"
                for field
                in instance._meta.fields
            ):
                update_fields.append(
                    "updated_at"
                )


            instance.save(
                update_fields=
                    update_fields
            )


            self._write_audit(
                "photo_update",
                instance,
                {
                    "photo_url":
                        photo_url,
                },
            )


            if (
                old_storage_name
                and
                old_storage_name
                != saved_name
            ):

                transaction.on_commit(
                    lambda
                    name=old_storage_name:
                    default_storage.delete(
                        name
                    )
                )


            return saved_name


        except Exception:

            if (
                saved_name
                and
                default_storage.exists(
                    saved_name
                )
            ):

                default_storage.delete(
                    saved_name
                )

            raise


    def create(
        self,
        request,
        *args,
        **kwargs,
    ):

        payload = (
            self._employee_payload(
                request
            )
        )

        validated_photo = (
            self._validated_photo(
                request.FILES.get(
                    "photo"
                )
            )
        )


        serializer = (
            self.get_serializer(
                data=payload
            )
        )

        serializer.is_valid(
            raise_exception=True
        )


        saved_name = None


        try:

            with transaction.atomic():

                self.perform_create(
                    serializer
                )

                if (
                    validated_photo
                    is not None
                ):

                    saved_name = (
                        self._save_employee_photo(
                            serializer.instance,
                            validated_photo,
                        )
                    )


        except Exception:

            if (
                saved_name
                and
                default_storage.exists(
                    saved_name
                )
            ):

                default_storage.delete(
                    saved_name
                )

            raise


        headers = (
            self.get_success_headers(
                serializer.data
            )
        )


        return Response(
            serializer.data,
            status=
                status.HTTP_201_CREATED,
            headers=headers,
        )


    def update(
        self,
        request,
        *args,
        **kwargs,
    ):

        partial = bool(
            kwargs.pop(
                "partial",
                False,
            )
        )


        instance = (
            self.get_object()
        )


        payload = (
            self._employee_payload(
                request
            )
        )

        validated_photo = (
            self._validated_photo(
                request.FILES.get(
                    "photo"
                )
            )
        )


        serializer = (
            self.get_serializer(
                instance,
                data=payload,
                partial=partial,
            )
        )

        serializer.is_valid(
            raise_exception=True
        )


        saved_name = None


        try:

            with transaction.atomic():

                self.perform_update(
                    serializer
                )

                if (
                    validated_photo
                    is not None
                ):

                    saved_name = (
                        self._save_employee_photo(
                            serializer.instance,
                            validated_photo,
                        )
                    )


        except Exception:

            if (
                saved_name
                and
                default_storage.exists(
                    saved_name
                )
            ):

                default_storage.delete(
                    saved_name
                )

            raise


        if getattr(
            serializer.instance,
            "_prefetched_objects_cache",
            None,
        ):

            serializer.instance._prefetched_objects_cache = {}


        return Response(
            serializer.data
        )


_LeaveRequestBase = (
    make_viewset(
        LeaveRequest
    )
)


class LeaveRequestViewSet(
    _LeaveRequestBase
):

    @action(
        detail=True,
        methods=["post"],
    )
    def approve(
        self,
        request,
        pk=None,
    ):

        leave = self.get_object()

        if leave.status == "approved":

            return Response(
                {
                    "status":
                        "approved"
                }
            )

        with transaction.atomic():

            balance, _ = (
                LeaveBalance.objects
                .select_for_update()
                .get_or_create(
                    tenant_id=
                        request.tenant_id,
                    company_id=
                        request.company_id,
                    employee=
                        leave.employee,
                    leave_type=
                        leave.leave_type,
                    year=
                        leave.start_date.year,
                    defaults={
                        "branch_id":
                            leave.branch_id,
                        "allocated_days":
                            leave.leave_type
                            .annual_quota_days,
                        "used_days":
                            Decimal("0"),
                    },
                )
            )

            quota = (
                balance.allocated_days
            )

            next_used = (
                balance.used_days
                + leave.days
            )

            if (
                quota > 0
                and
                next_used > quota
            ):
                raise ValidationError(
                    "Leave balance is insufficient."
                )

            balance.used_days = (
                next_used
            )

            balance.save(
                update_fields=[
                    "used_days",
                    "updated_at",
                ]
            )

            leave.status = (
                "approved"
            )

            leave.approved_by = (
                request.user
            )

            leave.approved_at = (
                timezone.now()
            )

            leave.save(
                update_fields=[
                    "status",
                    "approved_by",
                    "approved_at",
                    "updated_at",
                ]
            )

        self._write_audit(
            "approve_leave",
            leave,
        )

        return Response(
            {
                "status":
                    leave.status
            }
        )

    @action(
        detail=True,
        methods=["post"],
    )
    def reject(
        self,
        request,
        pk=None,
    ):

        leave = self.get_object()

        with transaction.atomic():

            if leave.status == "approved":

                balance = (
                    LeaveBalance.objects
                    .select_for_update()
                    .filter(
                        employee=
                            leave.employee,
                        leave_type=
                            leave.leave_type,
                        year=
                            leave.start_date.year,
                    )
                    .first()
                )

                if balance:

                    balance.used_days = max(
                        Decimal("0"),
                        balance.used_days
                        - leave.days,
                    )

                    balance.save(
                        update_fields=[
                            "used_days",
                            "updated_at",
                        ]
                    )

            leave.status = (
                "rejected"
            )

            leave.approved_by = (
                request.user
            )

            leave.approved_at = (
                timezone.now()
            )

            leave.save(
                update_fields=[
                    "status",
                    "approved_by",
                    "approved_at",
                    "updated_at",
                ]
            )

        self._write_audit(
            "reject_leave",
            leave,
        )

        return Response(
            {
                "status":
                    leave.status
            }
        )


_OvertimeBase = (
    make_viewset(
        Overtime
    )
)


class OvertimeViewSet(
    _OvertimeBase
):

    def _decision(
        self,
        request,
        decision,
    ):

        overtime = (
            self.get_object()
        )

        overtime.status = (
            decision
        )

        overtime.approved_by = (
            request.user
        )

        overtime.approved_at = (
            timezone.now()
        )

        overtime.save(
            update_fields=[
                "status",
                "approved_by",
                "approved_at",
                "updated_at",
            ]
        )

        self._write_audit(
            f"{decision}_overtime",
            overtime,
        )

        return Response(
            {
                "status":
                    overtime.status
            }
        )

    @action(
        detail=True,
        methods=["post"],
    )
    def approve(
        self,
        request,
        pk=None,
    ):
        return self._decision(
            request,
            "approved",
        )

    @action(
        detail=True,
        methods=["post"],
    )
    def reject(
        self,
        request,
        pk=None,
    ):
        return self._decision(
            request,
            "rejected",
        )


_SalaryAdvanceBase = (
    make_viewset(
        SalaryAdvance,
        "payroll",
    )
)


class SalaryAdvanceViewSet(
    _SalaryAdvanceBase
):

    def _decision(
        self,
        request,
        decision,
    ):

        advance = (
            self.get_object()
        )

        if (
            decision == "approved"
            and
            advance.approved_amount <= 0
        ):
            raise ValidationError(
                "Approved amount must be greater than zero."
            )

        advance.status = (
            decision
        )

        advance.approved_by = (
            request.user
        )

        advance.approved_at = (
            timezone.now()
        )

        advance.save(
            update_fields=[
                "status",
                "approved_by",
                "approved_at",
                "updated_at",
            ]
        )

        self._write_audit(
            f"{decision}_salary_advance",
            advance,
        )

        return Response(
            {
                "status":
                    advance.status
            }
        )

    @action(
        detail=True,
        methods=["post"],
    )
    def approve(
        self,
        request,
        pk=None,
    ):
        return self._decision(
            request,
            "approved",
        )

    @action(
        detail=True,
        methods=["post"],
    )
    def reject(
        self,
        request,
        pk=None,
    ):
        return self._decision(
            request,
            "rejected",
        )


_PromotionTransferBase = (
    make_viewset(
        PromotionTransfer
    )
)


class PromotionTransferViewSet(
    _PromotionTransferBase
):

    @action(
        detail=True,
        methods=["post"],
    )
    def approve(
        self,
        request,
        pk=None,
    ):

        change = self.get_object()

        employee = (
            change.employee
        )

        with transaction.atomic():

            if change.to_department_id:
                employee.department_id = (
                    change.to_department_id
                )

            if change.to_position_id:
                employee.position_id = (
                    change.to_position_id
                )

            if change.to_branch_id:
                employee.branch_id = (
                    change.to_branch_id
                )

            employee.save()

            if (
                change.new_salary
                is not None
            ):

                SalaryProfile.objects.update_or_create(
                    tenant_id=
                        request.tenant_id,
                    company_id=
                        request.company_id,
                    employee=
                        employee,
                    effective_from=
                        change.effective_date,
                    defaults={
                        "branch_id":
                            employee.branch_id,
                        "base_salary":
                            change.new_salary,
                        "currency":
                            "AFN",
                        "pay_frequency":
                            "monthly",
                        "status":
                            "active",
                    },
                )

            change.status = (
                "approved"
            )

            change.approved_by = (
                request.user
            )

            change.approved_at = (
                timezone.now()
            )

            change.save(
                update_fields=[
                    "status",
                    "approved_by",
                    "approved_at",
                    "updated_at",
                ]
            )

        self._write_audit(
            "approve_promotion_transfer",
            change,
        )

        return Response(
            {
                "status":
                    change.status
            }
        )

    @action(
        detail=True,
        methods=["post"],
    )
    def reject(
        self,
        request,
        pk=None,
    ):

        change = self.get_object()

        change.status = (
            "rejected"
        )

        change.approved_by = (
            request.user
        )

        change.approved_at = (
            timezone.now()
        )

        change.save(
            update_fields=[
                "status",
                "approved_by",
                "approved_at",
                "updated_at",
            ]
        )

        self._write_audit(
            "reject_promotion_transfer",
            change,
        )

        return Response(
            {
                "status":
                    change.status
            }
        )


_TerminationBase = (
    make_viewset(
        Termination
    )
)


class TerminationViewSet(
    _TerminationBase
):

    @action(
        detail=True,
        methods=["post"],
    )
    def approve(
        self,
        request,
        pk=None,
    ):

        termination = (
            self.get_object()
        )

        with transaction.atomic():

            termination.status = (
                "approved"
            )

            termination.approved_by = (
                request.user
            )

            termination.approved_at = (
                timezone.now()
            )

            termination.save(
                update_fields=[
                    "status",
                    "approved_by",
                    "approved_at",
                    "updated_at",
                ]
            )

            employee = (
                termination.employee
            )

            employee.employment_status = (
                "terminated"
            )

            employee.save(
                update_fields=[
                    "employment_status",
                    "updated_at",
                ]
            )

        self._write_audit(
            "approve_termination",
            termination,
        )

        return Response(
            {
                "status":
                    termination.status
            }
        )


_ClearanceBase = (
    make_viewset(
        Clearance
    )
)


class ClearanceViewSet(
    _ClearanceBase
):

    @action(
        detail=True,
        methods=["post"],
        url_path="clear",
    )
    def clear_item(
        self,
        request,
        pk=None,
    ):

        item = self.get_object()

        item.clearance_status = (
            "cleared"
        )

        item.cleared_by = (
            request.user
        )

        item.cleared_at = (
            timezone.now()
        )

        item.save(
            update_fields=[
                "clearance_status",
                "cleared_by",
                "cleared_at",
                "updated_at",
            ]
        )

        self._write_audit(
            "clearance_complete",
            item,
        )

        return Response(
            {
                "status":
                    item.clearance_status
            }
        )


_EmployeeAssetBase = (
    make_viewset(
        EmployeeAsset
    )
)


class EmployeeAssetViewSet(
    _EmployeeAssetBase
):

    @action(
        detail=True,
        methods=["post"],
        url_path="return",
    )
    def return_asset(
        self,
        request,
        pk=None,
    ):

        asset = self.get_object()

        asset.status = (
            "returned"
        )

        asset.returned_at = (
            timezone.now()
        )

        condition = (
            request.data.get(
                "condition_in",
                "",
            )
        )

        asset.condition_in = (
            str(condition)
        )

        asset.save(
            update_fields=[
                "status",
                "returned_at",
                "condition_in",
                "updated_at",
            ]
        )

        self._write_audit(
            "return_employee_asset",
            asset,
        )

        return Response(
            {
                "status":
                    asset.status
            }
        )


_ApprovalBase = (
    make_viewset(
        ApprovalRequest
    )
)


class ApprovalRequestViewSet(
    _ApprovalBase
):

    def _decision(
        self,
        request,
        decision,
    ):

        obj = self.get_object()

        obj.status = (
            decision
        )

        obj.approver = (
            request.user
        )

        obj.decided_at = (
            timezone.now()
        )

        obj.comments = str(
            request.data.get(
                "comments",
                obj.comments,
            )
        )

        obj.save(
            update_fields=[
                "status",
                "approver",
                "decided_at",
                "comments",
                "updated_at",
            ]
        )

        self._write_audit(
            f"{decision}_approval_request",
            obj,
        )

        return Response(
            {
                "status":
                    obj.status
            }
        )

    @action(
        detail=True,
        methods=["post"],
    )
    def approve(
        self,
        request,
        pk=None,
    ):
        return self._decision(
            request,
            "approved",
        )

    @action(
        detail=True,
        methods=["post"],
    )
    def reject(
        self,
        request,
        pk=None,
    ):
        return self._decision(
            request,
            "rejected",
        )


def _component_total(
    model,
    employee,
    period,
):

    base = (
        model.objects
        .filter(
            employee=employee,
            status="active",
        )
    )

    recurring = (
        Q(recurring=True)
        &
        (
            Q(
                effective_from__isnull=True
            )
            |
            Q(
                effective_from__lte=
                    period.end_date
            )
        )
        &
        (
            Q(
                effective_to__isnull=True
            )
            |
            Q(
                effective_to__gte=
                    period.start_date
            )
        )
    )

    one_time = (
        Q(
            recurring=False,
            effective_from__gte=
                period.start_date,
            effective_from__lte=
                period.end_date,
        )
    )

    return (
        base.filter(
            recurring | one_time
        )
        .aggregate(
            total=Sum(
                "amount"
            )
        )["total"]
        or Decimal("0")
    )


_PayrollRunBase = (
    make_viewset(
        PayrollRun,
        "payroll",
    )
)


class PayrollRunViewSet(
    _PayrollRunBase
):

    permission_write = (
        "payroll.manage"
    )

    action_permissions = {
        "generate":
            "payroll.process",

        "finalize":
            "payroll.process",
    }

    @action(
        detail=True,
        methods=["post"],
    )
    def generate(
        self,
        request,
        pk=None,
    ):

        payroll_run = (
            self.get_object()
        )

        if (
            payroll_run.status
            == "finalized"
        ):
            raise ValidationError(
                "Finalized payroll cannot be regenerated."
            )

        period = (
            payroll_run.period
        )

        employees = (
            Employee.objects
            .filter(
                tenant_id=
                    request.tenant_id,
                company_id=
                    request.company_id,
                employment_status__in=[
                    "active",
                    "probation",
                ],
            )
            .order_by(
                "employee_number"
            )
        )

        generated = 0
        skipped = 0

        with transaction.atomic():

            for employee in employees:

                salary = (
                    SalaryProfile.objects
                    .filter(
                        tenant_id=
                            request.tenant_id,
                        company_id=
                            request.company_id,
                        employee=
                            employee,
                        status=
                            "active",
                        effective_from__lte=
                            period.end_date,
                    )
                    .order_by(
                        "-effective_from"
                    )
                    .first()
                )

                if salary is None:

                    skipped += 1
                    continue

                allowance_total = (
                    _component_total(
                        Allowance,
                        employee,
                        period,
                    )
                )

                deduction_total = (
                    _component_total(
                        Deduction,
                        employee,
                        period,
                    )
                )

                overtime_total = (
                    Overtime.objects
                    .filter(
                        tenant_id=
                            request.tenant_id,
                        company_id=
                            request.company_id,
                        employee=
                            employee,
                        status=
                            "approved",
                        date__range=(
                            period.start_date,
                            period.end_date,
                        ),
                    )
                    .aggregate(
                        total=Sum(
                            "amount"
                        )
                    )["total"]
                    or Decimal("0")
                )

                gross = (
                    salary.base_salary
                    + allowance_total
                    + overtime_total
                )

                bracket = (
                    PayrollTaxBracket.objects
                    .filter(
                        tenant_id=
                            request.tenant_id,
                        company_id=
                            request.company_id,
                        status="active",
                        currency=
                            salary.currency,
                        effective_from__lte=
                            period.end_date,
                        minimum_amount__lte=
                            gross,
                    )
                    .filter(
                        Q(
                            maximum_amount__isnull=True
                        )
                        |
                        Q(
                            maximum_amount__gte=
                                gross
                        )
                    )
                    .filter(
                        Q(
                            effective_to__isnull=True
                        )
                        |
                        Q(
                            effective_to__gte=
                                period.start_date
                        )
                    )
                    .order_by(
                        "-minimum_amount"
                    )
                    .first()
                )

                tax_total = (
                    Decimal("0")
                )

                if bracket:

                    taxable_above = max(
                        gross
                        - bracket.minimum_amount,
                        Decimal("0"),
                    )

                    tax_total = (
                        bracket.fixed_amount
                        +
                        (
                            taxable_above
                            *
                            bracket.rate_percent
                            /
                            Decimal("100")
                        )
                    )

                net = (
                    gross
                    - deduction_total
                    - tax_total
                )

                PayrollEntry.objects.update_or_create(
                    run=
                        payroll_run,
                    employee=
                        employee,
                    defaults={
                        "tenant_id":
                            request.tenant_id,

                        "company_id":
                            request.company_id,

                        "branch_id":
                            employee.branch_id,

                        "salary_profile":
                            salary,

                        "base_salary":
                            salary.base_salary,

                        "allowance_total":
                            allowance_total,

                        "overtime_total":
                            overtime_total,

                        "gross_pay":
                            gross,

                        "deduction_total":
                            deduction_total,

                        "tax_total":
                            tax_total,

                        "net_pay":
                            net,

                        "currency":
                            salary.currency,

                        "status":
                            "calculated",
                    },
                )

                generated += 1

            payroll_run.status = (
                "processed"
            )

            payroll_run.processed_at = (
                timezone.now()
            )

            payroll_run.processed_by = (
                request.user
            )

            payroll_run.save(
                update_fields=[
                    "status",
                    "processed_at",
                    "processed_by",
                    "updated_at",
                ]
            )

        self._write_audit(
            "generate_payroll",
            payroll_run,
            {
                "generated":
                    generated,

                "skipped_without_salary":
                    skipped,
            },
        )

        return Response(
            {
                "status":
                    payroll_run.status,

                "generated_entries":
                    generated,

                "skipped_without_salary":
                    skipped,
            }
        )

    @action(
        detail=True,
        methods=["post"],
    )
    def finalize(
        self,
        request,
        pk=None,
    ):

        payroll_run = (
            self.get_object()
        )

        if (
            payroll_run.status
            not in (
                "processed",
                "approved",
            )
        ):
            raise ValidationError(
                "Payroll must be processed before finalization."
            )

        created_slips = 0

        with transaction.atomic():

            entries = (
                PayrollEntry.objects
                .select_for_update()
                .filter(
                    run=
                        payroll_run
                )
                .select_related(
                    "employee"
                )
            )

            for entry in entries:

                entry.status = (
                    "finalized"
                )

                entry.save(
                    update_fields=[
                        "status",
                        "updated_at",
                    ]
                )

                slip_number = (
                    f"{payroll_run.run_number}-"
                    f"{entry.employee.employee_number}"
                )

                _, created = (
                    Payslip.objects
                    .get_or_create(
                        tenant_id=
                            request.tenant_id,

                        company_id=
                            request.company_id,

                        payroll_entry=
                            entry,

                        defaults={
                            "branch_id":
                                entry.branch_id,

                            "slip_number":
                                slip_number,

                            "issued_at":
                                timezone.now(),

                            "status":
                                "issued",
                        },
                    )
                )

                if created:
                    created_slips += 1

            payroll_run.status = (
                "finalized"
            )

            payroll_run.save(
                update_fields=[
                    "status",
                    "updated_at",
                ]
            )

        self._write_audit(
            "finalize_payroll",
            payroll_run,
            {
                "payslips_created":
                    created_slips,
            },
        )

        return Response(
            {
                "status":
                    payroll_run.status,

                "payslips_created":
                    created_slips,
            }
        )


_HRAuditBase = (
    make_viewset(
        HRAuditEvent
    )
)


class HRAuditEventViewSet(
    _HRAuditBase
):

    http_method_names = [
        "get",
        "head",
        "options",
    ]


class EmployeeSelfServiceViewSet(
    viewsets.ViewSet
):

    permission_classes = [
        IsAuthenticated,
        TenantContextPermission,
        CompanyContextPermission,
        HRRBACPermission,
    ]

    permission_read = (
        "hr.self_service"
    )

    permission_write = (
        "hr.self_service"
    )

    def _context(
        self,
        request,
    ):

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
            raise PermissionDenied(
                "Tenant/company context required."
            )

        set_rls_context(
            "default",
            tenant_id,
            company_id,
        )

        return (
            tenant_id,
            company_id,
        )

    def _employee(
        self,
        request,
    ):

        tenant_id, company_id = (
            self._context(
                request
            )
        )

        return (
            Employee.objects
            .filter(
                tenant_id=
                    tenant_id,
                company_id=
                    company_id,
                user=
                    request.user,
            )
            .first()
        )

    def list(
        self,
        request,
    ):

        employee = (
            self._employee(
                request
            )
        )

        if employee is None:

            return Response(
                {
                    "count": 0,
                    "next": None,
                    "previous": None,
                    "results": [],
                }
            )

        serializer = (
            serializer_for(
                Employee
            )(
                employee,
                context={
                    "request":
                        request
                },
            )
        )

        return Response(
            {
                "count": 1,
                "next": None,
                "previous": None,
                "results": [
                    serializer.data
                ],
            }
        )

    @action(
        detail=False,
        methods=[
            "get",
            "post",
        ],
        url_path="leave-requests",
    )
    def leave_requests(
        self,
        request,
    ):

        employee = (
            self._employee(
                request
            )
        )

        if employee is None:
            raise ValidationError(
                "Employee profile is not linked to this user."
            )

        if request.method == "GET":

            rows = (
                LeaveRequest.objects
                .filter(
                    employee=
                        employee
                )
                .order_by(
                    "-created_at"
                )
            )

            serializer = (
                serializer_for(
                    LeaveRequest
                )(
                    rows,
                    many=True,
                    context={
                        "request":
                            request
                    },
                )
            )

            return Response(
                serializer.data
            )

        data = request.data.copy()

        data["employee"] = (
            str(employee.pk)
        )

        serializer = (
            serializer_for(
                LeaveRequest
            )(
                data=data,
                context={
                    "request":
                        request
                },
            )
        )

        serializer.is_valid(
            raise_exception=True
        )

        obj = serializer.save(
            tenant_id=
                request.tenant_id,
            company_id=
                request.company_id,
            branch_id=
                employee.branch_id,
            status=
                "pending",
        )

        return Response(
            serializer_for(
                LeaveRequest
            )(
                obj,
                context={
                    "request":
                        request
                },
            ).data,
            status=
                status.HTTP_201_CREATED,
        )

    @action(
        detail=False,
        methods=["get"],
        url_path="payslips",
    )
    def payslips(
        self,
        request,
    ):

        employee = (
            self._employee(
                request
            )
        )

        if employee is None:
            return Response([])

        rows = (
            Payslip.objects
            .filter(
                payroll_entry__employee=
                    employee
            )
            .order_by(
                "-issued_at"
            )
        )

        return Response(
            serializer_for(
                Payslip
            )(
                rows,
                many=True,
                context={
                    "request":
                        request
                },
            ).data
        )

    @action(
        detail=False,
        methods=["get"],
        url_path="attendance",
    )
    def attendance(
        self,
        request,
    ):

        employee = (
            self._employee(
                request
            )
        )

        if employee is None:
            return Response([])

        rows = (
            Attendance.objects
            .filter(
                employee=
                    employee
            )
            .order_by(
                "-date"
            )[:100]
        )

        return Response(
            serializer_for(
                Attendance
            )(
                rows,
                many=True,
                context={
                    "request":
                        request
                },
            ).data
        )


HR_ROUTE_REGISTRY = [

    (
        "hr/departments",
        DepartmentViewSet,
        "hr-department",
    ),

    (
        "hr/positions",
        PositionViewSet,
        "hr-position",
    ),

    (
        "hr/employees",
        EmployeeViewSet,
        "hr-employee",
    ),

    (
        "hr/contracts",
        make_viewset(
            EmploymentContract
        ),
        "hr-contract",
    ),

    (
        "hr/shifts",
        make_viewset(
            WorkShift
        ),
        "hr-shift",
    ),

    (
        "hr/employee-shifts",
        make_viewset(
            EmployeeShift
        ),
        "hr-employee-shift",
    ),

    (
        "hr/attendances",
        make_viewset(
            Attendance
        ),
        "hr-attendance",
    ),

    (
        "hr/leave-types",
        make_viewset(
            LeaveType
        ),
        "hr-leave-type",
    ),

    (
        "hr/leave-balances",
        make_viewset(
            LeaveBalance
        ),
        "hr-leave-balance",
    ),

    (
        "hr/leave-requests",
        LeaveRequestViewSet,
        "hr-leave-request",
    ),

    (
        "hr/public-holidays",
        make_viewset(
            PublicHoliday
        ),
        "hr-public-holiday",
    ),

    (
        "hr/overtimes",
        OvertimeViewSet,
        "hr-overtime",
    ),

    (
        "hr/salary-profiles",
        make_viewset(
            SalaryProfile,
            "payroll",
        ),
        "payroll-salary-profile",
    ),

    (
        "hr/tax-brackets",
        make_viewset(
            PayrollTaxBracket,
            "payroll",
        ),
        "payroll-tax-bracket",
    ),

    (
        "hr/allowances",
        make_viewset(
            Allowance,
            "payroll",
        ),
        "payroll-allowance",
    ),

    (
        "hr/deductions",
        make_viewset(
            Deduction,
            "payroll",
        ),
        "payroll-deduction",
    ),

    (
        "hr/payroll-periods",
        make_viewset(
            PayrollPeriod,
            "payroll",
        ),
        "payroll-period",
    ),

    (
        "hr/payroll-runs",
        PayrollRunViewSet,
        "payroll-run",
    ),

    (
        "hr/payroll-entries",
        make_viewset(
            PayrollEntry,
            "payroll",
        ),
        "payroll-entry",
    ),

    (
        "hr/payroll-payments",
        make_viewset(
            PayrollPayment,
            "payroll",
        ),
        "payroll-payment",
    ),

    (
        "hr/payslips",
        make_viewset(
            Payslip,
            "payroll",
        ),
        "payroll-payslip",
    ),

    (
        "hr/employee-loans",
        make_viewset(
            EmployeeLoan,
            "payroll",
        ),
        "payroll-employee-loan",
    ),

    (
        "hr/salary-advances",
        SalaryAdvanceViewSet,
        "payroll-salary-advance",
    ),

    (
        "hr/vacancies",
        make_viewset(
            Vacancy
        ),
        "hr-vacancy",
    ),

    (
        "hr/candidates",
        make_viewset(
            Candidate
        ),
        "hr-candidate",
    ),

    (
        "hr/interviews",
        make_viewset(
            Interview
        ),
        "hr-interview",
    ),

    (
        "hr/onboarding-tasks",
        make_viewset(
            OnboardingTask
        ),
        "hr-onboarding-task",
    ),

    (
        "hr/performance-reviews",
        make_viewset(
            PerformanceReview
        ),
        "hr-performance-review",
    ),

    (
        "hr/trainings",
        make_viewset(
            Training
        ),
        "hr-training",
    ),

    (
        "hr/training-participants",
        make_viewset(
            TrainingParticipant
        ),
        "hr-training-participant",
    ),

    (
        "hr/disciplinary-actions",
        make_viewset(
            DisciplinaryAction
        ),
        "hr-disciplinary-action",
    ),

    (
        "hr/promotion-transfers",
        PromotionTransferViewSet,
        "hr-promotion-transfer",
    ),

    (
        "hr/employee-assets",
        EmployeeAssetViewSet,
        "hr-employee-asset",
    ),

    (
        "hr/emergency-contacts",
        make_viewset(
            EmergencyContact
        ),
        "hr-emergency-contact",
    ),

    (
        "hr/bank-accounts",
        make_viewset(
            EmployeeBankAccount
        ),
        "hr-bank-account",
    ),

    (
        "hr/employee-documents",
        make_viewset(
            EmployeeDocument
        ),
        "hr-employee-document",
    ),

    (
        "hr/terminations",
        TerminationViewSet,
        "hr-termination",
    ),

    (
        "hr/clearances",
        ClearanceViewSet,
        "hr-clearance",
    ),

    (
        "hr/approval-requests",
        ApprovalRequestViewSet,
        "hr-approval-request",
    ),

    (
        "hr/audit-events",
        HRAuditEventViewSet,
        "hr-audit-event",
    ),
]
