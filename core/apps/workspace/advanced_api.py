import csv
import io
from datetime import date, timedelta

from django.db.models import Q
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import serializers
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit.models import AuditLog
from apps.common.permissions import (
    CompanyContextPermission,
    TenantContextPermission,
    TenantRBACPermission,
)
from apps.customers.models import Customer
from apps.hr.models import Employee
from apps.partners.models import Partner
from apps.warehouse.models import Supplier
from .api import (
    DocumentSerializer,
    ProjectSerializer,
    ScopedSerializer,
    WorkspaceViewSet,
)
from .models import Contract, Correspondence, Document, Project, ProjectTask


class ContractSerializer(ScopedSerializer):
    party_name = serializers.SerializerMethodField()

    class Meta:
        model = Contract
        fields = [
            "id", "contract_number", "title", "party_type",
            "customer", "supplier", "employee", "partner", "party_name",
            "project", "document", "starts_on", "ends_on", "amount",
            "currency", "status", "notes", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "party_name", "created_at", "updated_at"]
        validators = []

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get("request")
        tenant = getattr(request, "tenant_id", None)
        company = getattr(request, "company_id", None)

        scoped_models = {
            "customer": Customer,
            "supplier": Supplier,
            "employee": Employee,
            "partner": Partner,
            "document": Document,
        }
        for name, model in scoped_models.items():
            if name in fields:
                fields[name].queryset = (
                    model.objects.filter(tenant_id=tenant, company_id=company)
                    if tenant and company else model.objects.none()
                )
        return fields

    def get_party_name(self, obj):
        person = (
            obj.customer or obj.supplier or obj.employee or obj.partner
        )
        if person is None:
            return ""
        for name in (
            "display_name", "legal_name", "trade_name", "name",
            "full_name", "employee_number", "code", "email",
        ):
            value = getattr(person, name, None)
            if value:
                return str(value)
        parts = [
            str(getattr(person, "first_name", "") or "").strip(),
            str(getattr(person, "last_name", "") or "").strip(),
        ]
        return " ".join(part for part in parts if part)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        request = self.context["request"]
        current = self.instance

        party_type = attrs.get("party_type", getattr(current, "party_type", None))
        party_fields = ("customer", "supplier", "employee", "partner")
        chosen = {
            key: attrs.get(key, getattr(current, key, None))
            for key in party_fields
        }
        selected = [key for key, value in chosen.items() if value is not None]
        if selected != [party_type]:
            raise serializers.ValidationError({
                "party_type": "Select exactly one matching contract party."
            })

        starts = attrs.get("starts_on", getattr(current, "starts_on", None))
        ends = attrs.get("ends_on", getattr(current, "ends_on", None))
        if starts and ends and ends < starts:
            raise serializers.ValidationError({
                "ends_on": "End date cannot precede start date."
            })

        number = attrs.get(
            "contract_number", getattr(current, "contract_number", "")
        )
        existing = Contract.objects.filter(
            tenant_id=request.tenant_id,
            company_id=request.company_id,
            contract_number=number,
        )
        if current:
            existing = existing.exclude(pk=current.pk)
        if existing.exists():
            raise serializers.ValidationError({
                "contract_number": "This contract number already exists."
            })
        return attrs


class CorrespondenceSerializer(ScopedSerializer):
    document_title = serializers.CharField(
        source="document.title", read_only=True, default=""
    )

    class Meta:
        model = Correspondence
        fields = [
            "id", "direction", "letter_number", "reference_number",
            "subject", "sender", "recipient", "correspondence_date",
            "document", "document_title", "status", "notes",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "document_title", "created_at", "updated_at"]
        validators = []

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get("request")
        tenant = getattr(request, "tenant_id", None)
        company = getattr(request, "company_id", None)
        if "document" in fields:
            fields["document"].queryset = (
                Document.objects.filter(tenant_id=tenant, company_id=company)
                if tenant and company else Document.objects.none()
            )
        return fields

    def validate(self, attrs):
        attrs = super().validate(attrs)
        request = self.context["request"]
        current = self.instance
        number = attrs.get(
            "letter_number", getattr(current, "letter_number", "")
        )
        existing = Correspondence.objects.filter(
            tenant_id=request.tenant_id,
            company_id=request.company_id,
            letter_number=number,
        )
        if current:
            existing = existing.exclude(pk=current.pk)
        if existing.exists():
            raise serializers.ValidationError({
                "letter_number": "This letter number already exists."
            })
        return attrs


class ContractViewSet(WorkspaceViewSet):
    queryset = Contract.objects.select_related(
        "customer", "supplier", "employee", "partner", "project", "document",
    ).all()
    serializer_class = ContractSerializer
    permission_read = "contracts.view"
    permission_write = "contracts.manage"
    search_fields = ("contract_number", "title")
    choice_filters = ("party_type", "status", "currency")

    @action(detail=False, methods=["get"])
    def parties(self, request):
        party_type = request.query_params.get("type", "").strip()
        models = {
            "customer": (Customer, ("display_name", "code", "phone")),
            "supplier": (Supplier, ("name", "code", "phone")),
            "employee": (Employee, ("first_name", "last_name", "employee_number")),
            "partner": (Partner, ("legal_name", "trade_name", "code")),
        }
        if party_type not in models:
            raise serializers.ValidationError({"type": "Invalid party type."})

        model, label_fields = models[party_type]
        rows = model.objects.filter(
            tenant_id=request.tenant_id, company_id=request.company_id,
        )
        term = request.query_params.get("search", "").strip()
        if term:
            query = Q()
            for field in label_fields:
                query |= Q(**{field + "__icontains": term})
            rows = rows.filter(query)

        result = []
        for row in rows.order_by("pk")[:100]:
            label = " ".join(
                str(getattr(row, field, "") or "").strip()
                for field in label_fields
            ).strip()
            result.append({"id": str(row.pk), "label": label or str(row.pk)})
        return Response(result)


class CorrespondenceViewSet(WorkspaceViewSet):
    queryset = Correspondence.objects.select_related("document").all()
    serializer_class = CorrespondenceSerializer
    permission_read = "correspondence.view"
    permission_write = "correspondence.manage"
    search_fields = ("letter_number", "reference_number", "subject", "sender", "recipient")
    choice_filters = ("direction", "status")


class WorkspaceDashboardViewSet(WorkspaceViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    permission_read = "workspace.dashboard.view"
    permission_write = "workspace.dashboard.view"
    http_method_names = ["get", "head", "options"]

    def list(self, request, *args, **kwargs):
        today = timezone.localdate()
        projects = Project.objects.filter(
            tenant_id=request.tenant_id, company_id=request.company_id,
        )
        tasks = ProjectTask.objects.filter(
            tenant_id=request.tenant_id, company_id=request.company_id,
        )
        documents = Document.objects.filter(
            tenant_id=request.tenant_id, company_id=request.company_id,
        )
        contracts = Contract.objects.filter(
            tenant_id=request.tenant_id, company_id=request.company_id,
        )
        correspondence = Correspondence.objects.filter(
            tenant_id=request.tenant_id, company_id=request.company_id,
        )
        recent = AuditLog.objects.filter(
            tenant_id=request.tenant_id,
            metadata__company_id=str(request.company_id),
            action__startswith="workspace_",
        ).select_related("actor").order_by("-created_at")[:8]

        return Response({
            "active_projects": projects.filter(status="active").count(),
            "open_tasks": tasks.exclude(status__in=("done", "cancelled")).count(),
            "overdue_tasks": tasks.exclude(
                status__in=("done", "cancelled")
            ).filter(due_on__lt=today).count(),
            "new_documents": documents.filter(status="active").count(),
            "documents_expiring_soon": documents.filter(
                status="active",
                expires_on__gte=today,
                expires_on__lte=today + timedelta(days=30),
            ).count(),
            "active_contracts": contracts.filter(status="active").count(),
            "open_correspondence": correspondence.filter(
                status="registered"
            ).count(),
            "recent_activity": [
                {
                    "id": str(item.pk),
                    "action": item.action,
                    "object_type": item.object_type,
                    "object_id": str(item.object_id or ""),
                    "actor": (
                        getattr(item.actor, "full_name", "")
                        or getattr(item.actor, "email", "")
                    ),
                    "created_at": item.created_at.isoformat(),
                }
                for item in recent
            ],
        })


class WorkspaceArchiveViewSet(WorkspaceViewSet):
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
    permission_read = "workspace.archive.view"
    permission_write = "workspace.archive.view"
    http_method_names = ["get", "head", "options"]

    def list(self, request, *args, **kwargs):
        tenant, company = request.tenant_id, request.company_id
        term = request.query_params.get("search", "").strip()
        results = []

        docs = Document.objects.filter(
            tenant_id=tenant, company_id=company, status="archived",
        )
        contracts = Contract.objects.filter(
            tenant_id=tenant, company_id=company,
            status__in=("expired", "terminated", "archived"),
        )
        letters = Correspondence.objects.filter(
            tenant_id=tenant, company_id=company, status="archived",
        )
        projects = Project.objects.filter(
            tenant_id=tenant, company_id=company,
            status__in=("completed", "cancelled"),
        )

        sources = (
            ("document", docs, ("title", "reference_number")),
            ("contract", contracts, ("title", "contract_number")),
            ("correspondence", letters, ("subject", "letter_number")),
            ("project", projects, ("title", "code")),
        )
        for kind, queryset, search_fields in sources:
            if term:
                condition = Q()
                for field in search_fields:
                    condition |= Q(**{field + "__icontains": term})
                queryset = queryset.filter(condition)
            for row in queryset.order_by("-updated_at")[:100]:
                title = (
                    getattr(row, "title", None)
                    or getattr(row, "subject", None)
                    or getattr(row, "contract_number", None)
                    or getattr(row, "letter_number", None)
                    or ""
                )
                reference = (
                    getattr(row, "reference_number", None)
                    or getattr(row, "contract_number", None)
                    or getattr(row, "letter_number", None)
                    or getattr(row, "code", None)
                    or ""
                )
                results.append({
                    "id": str(row.pk),
                    "kind": kind,
                    "title": title,
                    "reference": reference,
                    "status": row.status,
                    "updated_at": row.updated_at.isoformat(),
                })

        results.sort(key=lambda item: item["updated_at"], reverse=True)
        return Response({
            "count": len(results),
            "next": None,
            "previous": None,
            "results": results[:200],
        })


class WorkspaceReportsViewSet(WorkspaceViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    permission_read = "workspace.reports.view"
    permission_write = "workspace.reports.view"
    http_method_names = ["get", "head", "options"]

    def list(self, request, *args, **kwargs):
        tenant, company = request.tenant_id, request.company_id
        return Response({
            "projects": Project.objects.filter(
                tenant_id=tenant, company_id=company,
            ).count(),
            "tasks": ProjectTask.objects.filter(
                tenant_id=tenant, company_id=company,
            ).count(),
            "documents": Document.objects.filter(
                tenant_id=tenant, company_id=company,
            ).count(),
            "contracts": Contract.objects.filter(
                tenant_id=tenant, company_id=company,
            ).count(),
            "correspondence": Correspondence.objects.filter(
                tenant_id=tenant, company_id=company,
            ).count(),
            "available_exports": [
                "projects", "tasks", "documents", "contracts", "correspondence",
            ],
        })

    @action(detail=False, methods=["get"])
    def export(self, request):
        tenant, company = request.tenant_id, request.company_id
        kind = request.query_params.get("type", "").strip()
        definitions = {
            "projects": (
                Project.objects.filter(tenant_id=tenant, company_id=company),
                ("code", "title", "status", "starts_on", "due_on", "budget", "currency"),
            ),
            "tasks": (
                ProjectTask.objects.filter(
                    tenant_id=tenant, company_id=company,
                ).select_related("project"),
                ("project__title", "title", "status", "priority", "due_on"),
            ),
            "documents": (
                Document.objects.filter(tenant_id=tenant, company_id=company),
                ("title", "reference_number", "category", "status", "issued_on", "expires_on"),
            ),
            "contracts": (
                Contract.objects.filter(tenant_id=tenant, company_id=company),
                ("contract_number", "title", "party_type", "starts_on", "ends_on",
                 "amount", "currency", "status"),
            ),
            "correspondence": (
                Correspondence.objects.filter(tenant_id=tenant, company_id=company),
                ("direction", "letter_number", "reference_number", "subject",
                 "sender", "recipient", "correspondence_date", "status"),
            ),
        }
        if kind not in definitions:
            raise serializers.ValidationError({"type": "Invalid report type."})

        queryset, columns = definitions[kind]
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(columns)

        for row in queryset.order_by("-created_at")[:10000]:
            values = []
            for column in columns:
                value = row
                for part in column.split("__"):
                    value = getattr(value, part, "")
                value = "" if value is None else str(value)
                if value[:1] in ("=", "+", "-", "@", "\t", "\r"):
                    value = "'" + value
                values.append(value)
            writer.writerow(values)

        response = HttpResponse(
            "\ufeff" + output.getvalue(),
            content_type="text/csv; charset=utf-8",
        )
        response["Content-Disposition"] = (
            f'attachment; filename="workspace-{kind}.csv"'
        )
        response["Cache-Control"] = "private, no-store"
        return response


class WorkspaceActivityView(APIView):
    permission_classes = [
        IsAuthenticated,
        TenantContextPermission,
        CompanyContextPermission,
        TenantRBACPermission,
    ]

    def permission_key_for_method(self, method):
        return "workspace.audit.view"

    def get(self, request):
        rows = AuditLog.objects.filter(
            tenant_id=request.tenant_id,
            metadata__company_id=str(request.company_id),
            action__startswith="workspace_",
        ).select_related("actor").order_by("-created_at")

        term = request.query_params.get("search", "").strip()
        if term:
            rows = rows.filter(
                Q(action__icontains=term)
                | Q(object_type__icontains=term)
            )

        page = self.request.query_params.get("page", "1")
        try:
            page_number = max(1, int(page))
        except ValueError:
            raise serializers.ValidationError({"page": "Invalid page."})

        start = (page_number - 1) * 50
        total = rows.count()
        items = rows[start:start + 50]
        return Response({
            "count": total,
            "next": page_number * 50 < total,
            "previous": page_number > 1,
            "results": [
                {
                    "id": str(row.pk),
                    "action": row.action,
                    "object_type": row.object_type,
                    "object_id": str(row.object_id or ""),
                    "actor": (
                        getattr(row.actor, "full_name", "")
                        or getattr(row.actor, "email", "")
                    ),
                    "metadata": row.metadata,
                    "created_at": row.created_at.isoformat(),
                }
                for row in items
            ],
        })
