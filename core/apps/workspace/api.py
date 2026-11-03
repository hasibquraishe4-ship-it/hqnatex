from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count, F, Q
from django.utils import timezone
from rest_framework import serializers
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.common.api import CompanyScopedModelViewSet
from apps.iam.models import CompanyMembership
from apps.audit.models import AuditLog
from .models import Document, Project, ProjectTask


def company_users(request):
    if not getattr(request, "tenant_id", None) or not getattr(request, "company_id", None):
        return get_user_model().objects.none()
    ids = CompanyMembership.objects.filter(
        tenant_id=request.tenant_id,
        company_id=request.company_id,
        status="active",
        membership__tenant_id=request.tenant_id,
        membership__status="active",
    ).values_list("membership__user_id", flat=True)
    return get_user_model().objects.filter(pk__in=ids)


class ScopedSerializer(serializers.ModelSerializer):
    def to_internal_value(self, data):
        if not hasattr(data, "keys"):
            raise serializers.ValidationError("Expected an object.")
        allowed = {key for key, field in self.fields.items() if not field.read_only}
        unexpected = set(data.keys()) - allowed
        if unexpected:
            raise serializers.ValidationError({
                str(key): "This field is not accepted." for key in sorted(unexpected)
            })
        return super().to_internal_value(data)

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get("request")
        tenant = getattr(request, "tenant_id", None)
        company = getattr(request, "company_id", None)
        if "project" in fields:
            fields["project"].queryset = (
                Project.objects.filter(tenant_id=tenant, company_id=company)
                if tenant and company else Project.objects.none()
            )
        for key in ("manager", "assigned_to"):
            if key in fields:
                fields[key].queryset = company_users(request)
        return fields

    def validate(self, attrs):
        request = self.context.get("request")
        if not getattr(request, "tenant_id", None) or not getattr(request, "company_id", None):
            raise serializers.ValidationError("Active tenant/company is required.")
        for key in ("manager", "assigned_to"):
            user = attrs.get(key)
            if user is not None and not getattr(user, "is_active", False):
                raise serializers.ValidationError({key: "User is inactive."})
        return attrs


class ProjectSerializer(ScopedSerializer):
    manager_name = serializers.CharField(source="manager.full_name", read_only=True)
    task_count = serializers.IntegerField(read_only=True)
    done_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Project
        fields = [
            "id", "code", "title", "description", "status", "manager", "manager_name",
            "starts_on", "due_on", "budget", "currency", "task_count", "done_count",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
        validators = []

    def validate(self, attrs):
        attrs = super().validate(attrs)
        current = self.instance
        start = attrs.get("starts_on", getattr(current, "starts_on", None))
        due = attrs.get("due_on", getattr(current, "due_on", None))
        if start and due and due < start:
            raise serializers.ValidationError({"due_on": "Due date precedes start date."})
        if attrs.get("budget", 0) < 0:
            raise serializers.ValidationError({"budget": "Budget cannot be negative."})
        request = self.context["request"]
        code = attrs.get("code", getattr(current, "code", ""))
        existing = Project.objects.filter(
            tenant_id=request.tenant_id, company_id=request.company_id, code=code,
        )
        if current:
            existing = existing.exclude(pk=current.pk)
        if existing.exists():
            raise serializers.ValidationError({"code": "Project code already exists."})
        return attrs


class TaskSerializer(ScopedSerializer):
    project_title = serializers.CharField(source="project.title", read_only=True)
    assigned_name = serializers.CharField(source="assigned_to.full_name", read_only=True)

    class Meta:
        model = ProjectTask
        fields = [
            "id", "project", "project_title", "title", "description", "assigned_to",
            "assigned_name", "status", "priority", "due_on", "completed_at",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "completed_at", "created_at", "updated_at"]


class DocumentSerializer(ScopedSerializer):
    project_title = serializers.CharField(source="project.title", read_only=True)
    has_file = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            "id", "project", "project_title", "title", "reference_number",
            "category", "description", "issued_on", "expires_on", "status",
            "has_file", "original_name", "content_type", "size_bytes",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "original_name", "content_type", "size_bytes", "created_at", "updated_at",
        ]
        validators = []

    def get_has_file(self, obj):
        return bool(obj.storage_key)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        issued = attrs.get("issued_on", getattr(self.instance, "issued_on", None))
        expires = attrs.get("expires_on", getattr(self.instance, "expires_on", None))
        if issued and expires and expires < issued:
            raise serializers.ValidationError({"expires_on": "Expiry precedes issue date."})
        return attrs


class WorkspaceViewSet(CompanyScopedModelViewSet):
    def _audit_record(self, obj, verb, before=None):
        AuditLog.objects.create(
            tenant_id=self.request.tenant_id,
            actor=self.request.user,
            action=f"workspace_{verb}",
            object_type=obj._meta.label_lower,
            object_id=obj.pk,
            metadata={
                "company_id": str(self.request.company_id),
                "status_before": before,
                "status_after": getattr(obj, "status", None),
            },
        )

    def perform_create(self, serializer):
        super().perform_create(serializer)
        self._audit_record(serializer.instance, "created")

    def perform_update(self, serializer):
        before = getattr(serializer.instance, "status", None)
        super().perform_update(serializer)
        self._audit_record(serializer.instance, "updated", before)


    http_method_names = ["get", "post", "patch", "head", "options"]
    search_fields = ()
    choice_filters = ()

    def get_queryset(self):
        qs = super().get_queryset()
        # فیلترها فقط برای فهرست؛ ویرایش به فیلتر صفحه وابسته نیست.
        if self.action != "list":
            return qs
        term = self.request.query_params.get("search", "").strip()
        if term:
            condition = Q()
            for field in self.search_fields:
                condition |= Q(**{field + "__icontains": term})
            qs = qs.filter(condition)
        for key in self.choice_filters:
            value = self.request.query_params.get(key)
            if value:
                choices = dict(self.queryset.model._meta.get_field(key).choices)
                if value not in choices:
                    raise serializers.ValidationError({key: "Invalid filter."})
                qs = qs.filter(**{key: value})
        project = self.request.query_params.get("project")
        if project and self.queryset.model is not Project:
            project = serializers.UUIDField().run_validation(project)
            qs = qs.filter(project_id=project)
        return qs

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)


class ProjectViewSet(WorkspaceViewSet):
    queryset = Project.objects.select_related("manager").annotate(
        task_count=Count("tasks", filter=Q(
            tasks__tenant_id=F("tenant_id"),
            tasks__company_id=F("company_id"),
        )),
        done_count=Count("tasks", filter=Q(
            tasks__status="done",
            tasks__tenant_id=F("tenant_id"),
            tasks__company_id=F("company_id"),
        )),
    )
    serializer_class = ProjectSerializer
    permission_read = "projects.view"
    permission_write = "projects.manage"
    search_fields = ("code", "title")
    choice_filters = ("status",)

    @action(detail=False, methods=["get"])
    def assignees(self, request):
        users = company_users(request).order_by("email")
        page = self.paginate_queryset(users)
        records = users if page is None else page
        data = [
            {"id": str(user.pk), "name": user.full_name, "email": user.email}
            for user in records if getattr(user, "is_active", False)
        ]
        return Response(data) if page is None else self.get_paginated_response(data)


class TaskViewSet(WorkspaceViewSet):
    queryset = ProjectTask.objects.select_related("project", "assigned_to").all()
    serializer_class = TaskSerializer
    permission_read = "projects.view"
    permission_write = "projects.manage"
    search_fields = ("title", "project__code")
    choice_filters = ("status", "priority")

    def perform_create(self, serializer):
        if serializer.validated_data.get("status") == "done":
            serializer.validated_data["completed_at"] = timezone.now()
        super().perform_create(serializer)

    def perform_update(self, serializer):
        previous = serializer.instance
        state = serializer.validated_data.get("status", previous.status)
        serializer.validated_data["completed_at"] = (
            previous.completed_at or timezone.now() if state == "done" else None
        )
        super().perform_update(serializer)


from .files import DocumentFileActions


class DocumentViewSet(DocumentFileActions, WorkspaceViewSet):
    queryset = Document.objects.select_related("project").all()
    serializer_class = DocumentSerializer
    permission_read = "documents.view"
    permission_write = "documents.manage"
    search_fields = ("title", "reference_number")
    choice_filters = ("status", "category")
