from django.db import transaction
import datetime
from decimal import Decimal

from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.agencies.models import Agency
from apps.audit.models import AuditLog
from apps.branches.models import Branch
from apps.catalog.models import Package, Service
from apps.common.api import (
    CompanyScopedModelViewSet,
    CompanyScopedReadOnlyModelViewSet,
)

from .models import (
    Customer,
    CustomerEquipmentAssignment,
    CustomerServiceTechnicalValue,
    CustomerService,
    CustomerTicket,
    ServiceAgencyHistory,
    ServiceChangeRequest,
    ServicePackageHistory,
    ServiceStatusHistory,
    ServiceActivation,
    InstallationWorkOrder,
    ProvisioningJob,
    IPAssignment,
    RadiusAccount,
    TechnicalTestResult,
    ActivationChecklist,
    FieldVisit,
    ServiceSuspension,
    ServiceTermination,
    DecommissionRecord,
    TechnicalChangeHistory,
    TechnicalAttachment,
)
from .serializers import (
    CustomerEquipmentAssignmentSerializer,
    CustomerServiceTechnicalValueSerializer,
    CustomerSerializer,
    CustomerServiceSerializer,
    CustomerTicketSerializer,
    ServiceAgencyHistorySerializer,
    ServiceChangeRequestSerializer,
    ServicePackageHistorySerializer,
    ServiceStatusHistorySerializer,
    ServiceActivationSerializer,
    InstallationWorkOrderSerializer,
    ProvisioningJobSerializer,
    IPAssignmentSerializer,
    RadiusAccountSerializer,
    TechnicalTestResultSerializer,
    ActivationChecklistSerializer,
    FieldVisitSerializer,
    ServiceSuspensionSerializer,
    ServiceTerminationSerializer,
    DecommissionRecordSerializer,
    TechnicalChangeHistorySerializer,
    TechnicalAttachmentSerializer,
)


class CustomerViewSet(CompanyScopedModelViewSet):
    queryset = Customer.objects.select_related(
        "company",
        "branch",
        "agency",
    ).all()
    serializer_class = CustomerSerializer
    permission_read = "customers.view"
    permission_write = "customers.manage"

    @action(detail=False, methods=["get"])
    def stats(self, request):
        tenant_id = request.tenant_id
        company_id = request.company_id

        customers_qs = Customer.objects.filter(tenant_id=tenant_id, company_id=company_id)
        services_qs = CustomerService.objects.filter(tenant_id=tenant_id, company_id=company_id)

        now = timezone.now()
        thirty_days_ago = now - datetime.timedelta(days=30)
        today = timezone.localdate()
        in_7_days = today + datetime.timedelta(days=7)
        in_30_days = today + datetime.timedelta(days=30)

        total_customers = customers_qs.count()
        active_customers = customers_qs.filter(status="active").count()
        inactive_customers = customers_qs.filter(status="inactive").count()
        suspended_customers = customers_qs.filter(status="blocked").count()
        new_customers = customers_qs.filter(created_at__gte=thirty_days_ago).count()

        total_subscriptions = services_qs.count()
        active_subscriptions = services_qs.filter(status="active").count()
        suspended_subscriptions = services_qs.filter(status="suspended").count()
        terminated_subscriptions = services_qs.filter(status="terminated").count()

        # Expired subscriptions: ended_at < now or status in ['expired', 'terminated']
        expired_subscriptions = services_qs.filter(
            Q(ended_at__lt=now) | Q(next_renewal_date__lt=today)
        ).exclude(status__in=["terminated", "draft"]).count()

        renewals_due_7d = services_qs.filter(
            status="active",
            next_renewal_date__gte=today,
            next_renewal_date__lte=in_7_days,
        ).count()

        renewals_due_30d = services_qs.filter(
            status="active",
            next_renewal_date__gte=today,
            next_renewal_date__lte=in_30_days,
        ).count()

        # By Service Breakdown
        by_service_raw = (
            services_qs.values("service__code", "service__name_english")
            .annotate(count=Count("id"))
            .order_by("-count")[:10]
        )
        by_service = [
            {"code": item["service__code"], "name": item["service__name_english"], "count": item["count"]}
            for item in by_service_raw
        ]

        # By Status Breakdown
        by_status_raw = services_qs.values("status").annotate(count=Count("id"))
        by_status = {item["status"]: item["count"] for item in by_status_raw}

        # By Agency Breakdown
        by_agency_raw = (
            services_qs.filter(agency__isnull=False)
            .values("agency__name")
            .annotate(count=Count("id"))
            .order_by("-count")[:10]
        )
        by_agency = [
            {"name": item["agency__name"], "count": item["count"]}
            for item in by_agency_raw
        ]

        # Active services & packages count
        active_services_count = Service.objects.filter(tenant_id=tenant_id, status="active").count()
        active_packages_count = Package.objects.filter(tenant_id=tenant_id, status="active").count()

        return Response({
            "total_customers": total_customers,
            "active_customers": active_customers,
            "inactive_customers": inactive_customers,
            "suspended_customers": suspended_customers,
            "new_customers_30d": new_customers,
            "total_subscriptions": total_subscriptions,
            "active_subscriptions": active_subscriptions,
            "expired_subscriptions": expired_subscriptions,
            "suspended_subscriptions": suspended_subscriptions,
            "terminated_subscriptions": terminated_subscriptions,
            "renewals_due_7d": renewals_due_7d,
            "renewals_due_30d": renewals_due_30d,
            "active_services_count": active_services_count,
            "active_packages_count": active_packages_count,
            "by_service": by_service,
            "by_status": by_status,
            "by_agency": by_agency,
        })

    @action(detail=False, methods=["get"])
    def near_renewals(self, request):
        days = int(request.query_params.get("days", 30))
        tenant_id = request.tenant_id
        company_id = request.company_id
        today = timezone.localdate()
        target_date = today + datetime.timedelta(days=days)

        qs = CustomerService.objects.filter(
            tenant_id=tenant_id,
            company_id=company_id,
            status="active",
        ).filter(
            Q(next_renewal_date__lte=target_date) | Q(ended_at__date__lte=target_date)
        ).select_related("customer", "service", "package", "agency", "branch").order_by("next_renewal_date", "ended_at")

        serializer = CustomerServiceSerializer(qs, many=True, context={"request": request})
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def full_profile(self, request, pk=None):
        customer = self.get_object()
        tenant_id = request.tenant_id
        company_id = request.company_id

        # Subscriptions
        subscriptions = CustomerService.objects.filter(
            tenant_id=tenant_id,
            customer=customer,
        ).select_related("service", "package", "branch", "agency")
        sub_data = CustomerServiceSerializer(subscriptions, many=True, context={"request": request}).data

        # Invoices
        from apps.billing.models import Invoice, Payment, Receivable
        invoices_qs = Invoice.objects.filter(tenant_id=tenant_id, customer=customer).order_by("-issue_date")[:20]
        invoices = [
            {
                "id": str(inv.id),
                "invoice_number": inv.invoice_number,
                "status": inv.status,
                "issue_date": str(inv.issue_date),
                "total": str(inv.total),
                "currency": inv.currency,
            }
            for inv in invoices_qs
        ]

        # Receivables & Outstanding
        recs_qs = Receivable.objects.filter(tenant_id=tenant_id, customer=customer)
        total_invoiced = sum((r.original_amount for r in recs_qs), Decimal("0.00"))
        total_outstanding = sum((r.outstanding_amount for r in recs_qs if r.status in ["open", "partial"]), Decimal("0.00"))

        # Payments
        payments_qs = Payment.objects.filter(tenant_id=tenant_id, customer=customer).order_by("-payment_date")[:20]
        payments = [
            {
                "id": str(p.id),
                "payment_number": p.payment_number,
                "status": p.status,
                "payment_date": str(p.payment_date),
                "amount": str(p.amount),
                "currency": p.currency,
                "method": p.method,
            }
            for p in payments_qs
        ]
        total_paid = sum((p.amount for p in payments_qs if p.status == "posted"), Decimal("0.00"))

        # Equipment
        equipment_qs = CustomerEquipmentAssignment.objects.filter(
            tenant_id=tenant_id,
            customer_service__customer=customer,
        ).select_related("customer_service")
        equipment = CustomerEquipmentAssignmentSerializer(equipment_qs, many=True).data

        # Tickets
        tickets_qs = CustomerTicket.objects.filter(
            tenant_id=tenant_id,
            customer=customer,
        ).select_related("service", "customer_service").order_by("-created_at")
        tickets = CustomerTicketSerializer(tickets_qs, many=True).data

        # History / Audit
        audit_qs = AuditLog.objects.filter(
            tenant_id=tenant_id,
            object_type__in=["customers.customer", "customers.customerservice"],
        ).filter(
            Q(object_id=customer.id) | Q(object_id__in=[s.id for s in subscriptions])
        ).order_by("-created_at")[:50]
        audit = [
            {
                "id": str(log.id),
                "action": log.action,
                "object_type": log.object_type,
                "created_at": str(log.created_at),
                "metadata": log.metadata,
            }
            for log in audit_qs
        ]

        customer_data = CustomerSerializer(customer, context={"request": request}).data

        return Response({
            "customer": customer_data,
            "subscriptions": sub_data,
            "financial": {
                "total_invoiced": str(total_invoiced),
                "total_paid": str(total_paid),
                "outstanding_balance": str(total_outstanding),
                "invoices": invoices,
                "payments": payments,
            },
            "equipment": equipment,
            "tickets": tickets,
            "audit_history": audit,
        })


class CustomerServiceViewSet(CompanyScopedModelViewSet):
    queryset = CustomerService.objects.select_related(
        "company",
        "customer",
        "service",
        "package",
        "branch",
        "agency",
    ).all()
    serializer_class = CustomerServiceSerializer
    permission_read = "customers.view"
    permission_write = "customers.manage"

    def perform_create(self, serializer):
        obj = serializer.save(
            tenant_id=self.request.tenant_id,
            company_id=self.request.company_id,
        )

        ServiceStatusHistory.objects.create(
            tenant_id=self.request.tenant_id,
            company_id=obj.company_id,
            customer_service=obj,
            from_status="",
            to_status=obj.status,
            reason="initial",
        )

        if obj.package_id:
            ServicePackageHistory.objects.create(
                tenant_id=self.request.tenant_id,
                company_id=obj.company_id,
                customer_service=obj,
                old_package=None,
                new_package=obj.package,
                reason="initial",
            )

        AuditLog.objects.create(
            tenant_id=self.request.tenant_id,
            actor=self.request.user,
            action="create",
            object_type=obj._meta.label_lower,
            object_id=obj.pk,
            metadata={
                "api": True,
                "company_id": str(obj.company_id),
            },
        )

    def perform_update(self, serializer):
        old_package_id = serializer.instance.package_id
        old_status = serializer.instance.status

        obj = serializer.save(
            company_id=self.request.company_id,
        )

        if old_status != obj.status:
            ServiceStatusHistory.objects.create(
                tenant_id=self.request.tenant_id,
                company_id=obj.company_id,
                customer_service=obj,
                from_status=old_status,
                to_status=obj.status,
                reason="api update",
            )

        if old_package_id != obj.package_id:
            ServicePackageHistory.objects.create(
                tenant_id=self.request.tenant_id,
                company_id=obj.company_id,
                customer_service=obj,
                old_package_id=old_package_id,
                new_package=obj.package,
                reason="api update",
            )

        AuditLog.objects.create(
            tenant_id=self.request.tenant_id,
            actor=self.request.user,
            action="update",
            object_type=obj._meta.label_lower,
            object_id=obj.pk,
            metadata={
                "api": True,
                "company_id": str(obj.company_id),
            },
        )

    @action(detail=True, methods=["post"])
    def renew(self, request, pk=None):
        subscription = self.get_object()
        months = int(request.data.get("months", 1))
        new_package_id = request.data.get("package_id")
        notes = request.data.get("notes", "Renewal workflow")

        if subscription.service.status != "active":
            return Response(
                {
                    "service":
                    "This service is inactive and cannot be renewed."
                },
                status=400,
            )

        new_pkg = None

        if new_package_id:
            new_pkg = Package.objects.filter(
                id=new_package_id,
                tenant_id=request.tenant_id,
                service=subscription.service,
                status=Package.Status.ACTIVE,
                service__status="active",
            ).first()

            if new_pkg is None:
                return Response(
                    {
                        "package":
                        "Selected package is unavailable, inactive, or does not belong to the active service."
                    },
                    status=400,
                )

        elif (
            subscription.package_id
            and subscription.package.status
            != Package.Status.ACTIVE
        ):
            return Response(
                {
                    "package":
                    "The current package is inactive. Select an active package before renewal."
                },
                status=400,
            )

        now = timezone.now()
        base_time = subscription.ended_at if subscription.ended_at and subscription.ended_at > now else now
        new_ended_at = base_time + datetime.timedelta(days=30 * months)
        new_renewal_date = new_ended_at.date()

        old_status = subscription.status
        subscription.ended_at = new_ended_at
        subscription.next_renewal_date = new_renewal_date
        subscription.status = CustomerService.Status.ACTIVE

        old_package_id = subscription.package_id
        if (
            new_package_id
            and str(new_package_id)
            != str(old_package_id)
        ):
            subscription.package = new_pkg

            ServicePackageHistory.objects.create(
                tenant_id=request.tenant_id,
                company_id=subscription.company_id,
                customer_service=subscription,
                old_package_id=old_package_id,
                new_package=new_pkg,
                reason=f"Renewal package change: {notes}",
            )

        subscription.save(update_fields=["ended_at", "next_renewal_date", "status", "package", "updated_at"])

        ServiceStatusHistory.objects.create(
            tenant_id=request.tenant_id,
            company_id=subscription.company_id,
            customer_service=subscription,
            from_status=old_status,
            to_status=CustomerService.Status.ACTIVE,
            reason=f"Renewed for {months} month(s). {notes}".strip(),
        )

        AuditLog.objects.create(
            tenant_id=request.tenant_id,
            actor=request.user,
            action="renew",
            object_type=subscription._meta.label_lower,
            object_id=subscription.pk,
            metadata={
                "months": months,
                "new_ended_at": str(new_ended_at),
                "notes": notes,
            },
        )

        serializer = self.get_serializer(subscription)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def suspend(self, request, pk=None):
        subscription = self.get_object()
        reason = request.data.get("reason", "Suspension requested")
        old_status = subscription.status

        subscription.status = CustomerService.Status.SUSPENDED
        subscription.save(update_fields=["status", "updated_at"])

        ServiceStatusHistory.objects.create(
            tenant_id=request.tenant_id,
            company_id=subscription.company_id,
            customer_service=subscription,
            from_status=old_status,
            to_status=CustomerService.Status.SUSPENDED,
            reason=reason,
        )

        AuditLog.objects.create(
            tenant_id=request.tenant_id,
            actor=request.user,
            action="suspend",
            object_type=subscription._meta.label_lower,
            object_id=subscription.pk,
            metadata={"reason": reason},
        )

        serializer = self.get_serializer(subscription)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def reactivate(self, request, pk=None):
        subscription = self.get_object()
        reason = request.data.get("reason", "Reactivation")
        old_status = subscription.status

        subscription.status = CustomerService.Status.ACTIVE
        subscription.save(update_fields=["status", "updated_at"])

        ServiceStatusHistory.objects.create(
            tenant_id=request.tenant_id,
            company_id=subscription.company_id,
            customer_service=subscription,
            from_status=old_status,
            to_status=CustomerService.Status.ACTIVE,
            reason=reason,
        )

        AuditLog.objects.create(
            tenant_id=request.tenant_id,
            actor=request.user,
            action="reactivate",
            object_type=subscription._meta.label_lower,
            object_id=subscription.pk,
            metadata={"reason": reason},
        )

        serializer = self.get_serializer(subscription)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def terminate(self, request, pk=None):
        subscription = self.get_object()
        reason = request.data.get("reason", "Termination")
        old_status = subscription.status

        subscription.status = CustomerService.Status.TERMINATED
        subscription.ended_at = timezone.now()
        subscription.save(update_fields=["status", "ended_at", "updated_at"])

        ServiceStatusHistory.objects.create(
            tenant_id=request.tenant_id,
            company_id=subscription.company_id,
            customer_service=subscription,
            from_status=old_status,
            to_status=CustomerService.Status.TERMINATED,
            reason=reason,
        )

        AuditLog.objects.create(
            tenant_id=request.tenant_id,
            actor=request.user,
            action="terminate",
            object_type=subscription._meta.label_lower,
            object_id=subscription.pk,
            metadata={"reason": reason},
        )

        serializer = self.get_serializer(subscription)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def change_package(self, request, pk=None):
        subscription = self.get_object()
        new_package_id = request.data.get("package_id")
        reason = request.data.get("reason", "Package change")

        if not new_package_id:
            return Response({"package_id": "Required"}, status=status.HTTP_400_BAD_REQUEST)

        new_pkg = Package.objects.filter(
            id=new_package_id,
            tenant_id=request.tenant_id,
            service=subscription.service,
        ).first()

        if not new_pkg:
            return Response(
                {"package_id": "Invalid package for this service."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        old_package = subscription.package
        subscription.package = new_pkg

        # Update pricing if active package price exists
        current_price = new_pkg.current_price()
        if current_price:
            subscription.base_price = current_price.amount
            subscription.final_price = max(current_price.amount - subscription.discount, Decimal("0.00"))
            subscription.currency = current_price.currency

        subscription.save(update_fields=["package", "base_price", "final_price", "currency", "updated_at"])

        ServicePackageHistory.objects.create(
            tenant_id=request.tenant_id,
            company_id=subscription.company_id,
            customer_service=subscription,
            old_package=old_package,
            new_package=new_pkg,
            reason=reason,
        )

        AuditLog.objects.create(
            tenant_id=request.tenant_id,
            actor=request.user,
            action="change_package",
            object_type=subscription._meta.label_lower,
            object_id=subscription.pk,
            metadata={"old_package_id": str(old_package.id) if old_package else None, "new_package_id": str(new_pkg.id), "reason": reason},
        )

        serializer = self.get_serializer(subscription)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def transfer_agency(self, request, pk=None):
        subscription = self.get_object()
        to_agency_id = request.data.get("to_agency_id")
        to_branch_id = request.data.get("to_branch_id")
        reason = request.data.get("reason", "Agency transfer")

        if not to_agency_id:
            return Response({"to_agency_id": "Required"}, status=status.HTTP_400_BAD_REQUEST)

        to_agency = Agency.objects.filter(id=to_agency_id, tenant_id=request.tenant_id, company_id=request.company_id).first()
        if not to_agency:
            return Response({"to_agency_id": "Invalid agency for current company."}, status=status.HTTP_400_BAD_REQUEST)

        to_branch = None
        if to_branch_id:
            to_branch = Branch.objects.filter(id=to_branch_id, tenant_id=request.tenant_id, company_id=request.company_id).first()
        elif to_agency.branch_id:
            to_branch = to_agency.branch

        old_agency = subscription.agency
        old_branch = subscription.branch

        subscription.agency = to_agency
        if to_branch:
            subscription.branch = to_branch
        subscription.save(update_fields=["agency", "branch", "updated_at"])

        actor_username = (
            getattr(request.user, "email", None)
            or (request.user.get_username() if hasattr(request.user, "get_username") else None)
            or str(request.user)
            or ""
        )
        actor_display = getattr(request.user, "full_name", None) or actor_username

        ServiceAgencyHistory.objects.create(
            tenant_id=request.tenant_id,
            company_id=subscription.company_id,
            customer_service=subscription,
            from_agency=old_agency,
            to_agency=to_agency,
            from_branch=old_branch,
            to_branch=to_branch,
            reason=reason,
            effective_date=timezone.localdate(),
            approved_by=str(actor_display or actor_username)[:160],
            user_name=str(actor_username or actor_display)[:160],
        )

        AuditLog.objects.create(
            tenant_id=request.tenant_id,
            actor=request.user,
            action="transfer_agency",
            object_type=subscription._meta.label_lower,
            object_id=subscription.pk,
            metadata={"from_agency_id": str(old_agency.id) if old_agency else None, "to_agency_id": str(to_agency.id), "reason": reason},
        )

        serializer = self.get_serializer(subscription)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def full_profile(self, request, pk=None):
        subscription = self.get_object()
        tenant_id = request.tenant_id

        # Network resources
        from apps.noc.models import CustomerServiceNetworkResource
        from apps.noc.serializers import CustomerServiceNetworkResourceSerializer
        noc_qs = CustomerServiceNetworkResource.objects.filter(
            tenant_id=tenant_id,
            customer_service=subscription,
        ).select_related("resource")
        noc_data = CustomerServiceNetworkResourceSerializer(noc_qs, many=True).data

        # Equipment
        eq_qs = CustomerEquipmentAssignment.objects.filter(
            tenant_id=tenant_id,
            customer_service=subscription,
        )
        eq_data = CustomerEquipmentAssignmentSerializer(eq_qs, many=True).data

        # Status History
        status_history_qs = ServiceStatusHistory.objects.filter(
            tenant_id=tenant_id,
            customer_service=subscription,
        ).order_by("-created_at")
        status_data = ServiceStatusHistorySerializer(status_history_qs, many=True).data

        # Package History
        pkg_history_qs = ServicePackageHistory.objects.filter(
            tenant_id=tenant_id,
            customer_service=subscription,
        ).select_related("old_package", "new_package").order_by("-created_at")
        pkg_data = ServicePackageHistorySerializer(pkg_history_qs, many=True).data

        # Agency History
        agency_history_qs = ServiceAgencyHistory.objects.filter(
            tenant_id=tenant_id,
            customer_service=subscription,
        ).select_related("from_agency", "to_agency", "from_branch", "to_branch").order_by("-created_at")
        agency_data = ServiceAgencyHistorySerializer(agency_history_qs, many=True).data

        # Tickets
        tickets_qs = CustomerTicket.objects.filter(
            tenant_id=tenant_id,
            customer_service=subscription,
        ).order_by("-created_at")
        tickets_data = CustomerTicketSerializer(tickets_qs, many=True).data

        # Invoices
        from apps.billing.models import Invoice
        invoices_qs = Invoice.objects.filter(tenant_id=tenant_id, customer_service=subscription).order_by("-issue_date")[:10]
        invoices_data = [
            {
                "id": str(i.id),
                "invoice_number": i.invoice_number,
                "status": i.status,
                "issue_date": str(i.issue_date),
                "total": str(i.total),
                "currency": i.currency,
            }
            for i in invoices_qs
        ]

        from apps.catalog.serializers import ServiceTechnicalFieldSerializer, ServiceTechnicalProfileSerializer

        # Technical Schema & Dynamic Fields for this specific Service
        tech_fields_qs = subscription.service.technical_fields.filter(status="active").order_by("sort_order")
        tech_fields_data = ServiceTechnicalFieldSerializer(tech_fields_qs, many=True).data
        tech_profiles_qs = subscription.service.technical_profiles.filter(status="active")
        tech_profiles_data = ServiceTechnicalProfileSerializer(tech_profiles_qs, many=True).data

        # Technical Values List
        tech_vals_qs = subscription.technical_value_rows.all().select_related("technical_field")
        tech_vals_data = CustomerServiceTechnicalValueSerializer(tech_vals_qs, many=True).data

        # Lifecycle datasets
        activations_data = ServiceActivationSerializer(subscription.activations.all(), many=True).data
        work_orders_data = InstallationWorkOrderSerializer(subscription.work_orders.all(), many=True).data
        provisioning_jobs_data = ProvisioningJobSerializer(subscription.provisioning_jobs.all(), many=True).data
        ip_assignments_data = IPAssignmentSerializer(subscription.ip_assignments.all(), many=True).data
        radius_accounts_data = RadiusAccountSerializer(subscription.radius_accounts.all(), many=True).data
        test_results_data = TechnicalTestResultSerializer(subscription.test_results.all(), many=True).data
        checklists_data = ActivationChecklistSerializer(subscription.activation_checklists.all(), many=True).data
        field_visits_data = FieldVisitSerializer(subscription.field_visits.all(), many=True).data
        suspensions_data = ServiceSuspensionSerializer(subscription.suspensions.all(), many=True).data
        terminations_data = ServiceTerminationSerializer(subscription.terminations.all(), many=True).data
        decommissions_data = DecommissionRecordSerializer(subscription.decommissions.all(), many=True).data
        change_history_data = TechnicalChangeHistorySerializer(subscription.technical_change_history.all(), many=True).data
        attachments_data = TechnicalAttachmentSerializer(subscription.attachments.all(), many=True).data

        sub_data = self.get_serializer(subscription).data

        return Response({
            "subscription": sub_data,
            "technical_fields": tech_fields_data,
            "technical_profiles": tech_profiles_data,
            "technical_values_list": tech_vals_data,
            "network_resources": noc_data,
            "equipment": eq_data,
            "ip_assignments": ip_assignments_data,
            "radius_accounts": radius_accounts_data,
            "activations": activations_data,
            "work_orders": work_orders_data,
            "provisioning_jobs": provisioning_jobs_data,
            "test_results": test_results_data,
            "checklists": checklists_data,
            "field_visits": field_visits_data,
            "suspensions": suspensions_data,
            "terminations": terminations_data,
            "decommissions": decommissions_data,
            "technical_change_history": change_history_data,
            "status_history": status_data,
            "package_history": pkg_data,
            "agency_history": agency_data,
            "tickets": tickets_data,
            "attachments": attachments_data,
            "invoices": invoices_data,
        })


class CustomerServiceTechnicalValueViewSet(
    CompanyScopedModelViewSet
):
    queryset = (
        CustomerServiceTechnicalValue.objects
        .select_related(
            "customer_service",
            "customer_service__customer",
            "customer_service__service",
            "technical_field",
        )
        .all()
    )

    serializer_class = CustomerServiceTechnicalValueSerializer

    permission_read = "customers.view"
    permission_write = "customers.manage"

    def get_queryset(self):
        qs = super().get_queryset()

        customer_service_id = self.request.query_params.get(
            "customer_service"
        )
        technical_field_id = self.request.query_params.get(
            "technical_field"
        )
        status_value = self.request.query_params.get(
            "status"
        )

        if customer_service_id:
            qs = qs.filter(
                customer_service_id=customer_service_id
            )

        if technical_field_id:
            qs = qs.filter(
                technical_field_id=technical_field_id
            )

        if status_value:
            qs = qs.filter(
                status=status_value
            )

        return qs

    # CSTV_SOFT_DELETE_SYNC
    def perform_destroy(
        self,
        instance,
    ):
        """
        Preserve the normalized technical-value row as
        inactive history instead of physically deleting it.

        Updating through the serializer intentionally invokes
        CustomerServiceTechnicalValueSerializer.update(),
        which refreshes CustomerService.technical_values from
        active normalized rows.
        """
        serializer = self.get_serializer(
            instance,
            data={
                "status":
                    CustomerServiceTechnicalValue
                    .Status.INACTIVE,
            },
            partial=True,
        )

        serializer.is_valid(
            raise_exception=True
        )

        serializer.save()


class CustomerEquipmentAssignmentViewSet(CompanyScopedModelViewSet):
    queryset = CustomerEquipmentAssignment.objects.select_related(
        "company",
        "customer_service",
        "customer_service__customer",
        "customer_service__service",
    ).all()
    serializer_class = CustomerEquipmentAssignmentSerializer
    permission_read = "customers.view"
    permission_write = "customers.manage"

    def perform_create(self, serializer):
        obj = serializer.save(
            tenant_id=self.request.tenant_id,
            company_id=self.request.company_id,
        )
        AuditLog.objects.create(
            tenant_id=self.request.tenant_id,
            actor=self.request.user,
            action="assign_equipment",
            object_type=obj._meta.label_lower,
            object_id=obj.pk,
            metadata={"serial_number": obj.serial_number, "equipment_type": obj.equipment_type},
        )


class ServiceAgencyHistoryViewSet(CompanyScopedReadOnlyModelViewSet):
    queryset = ServiceAgencyHistory.objects.select_related(
        "company",
        "customer_service",
        "from_agency",
        "to_agency",
        "from_branch",
        "to_branch",
    ).all()
    serializer_class = ServiceAgencyHistorySerializer
    permission_read = "customers.view"


class CustomerTicketViewSet(CompanyScopedModelViewSet):
    queryset = CustomerTicket.objects.select_related(
        "company",
        "customer",
        "customer_service",
        "service",
    ).all()
    serializer_class = CustomerTicketSerializer
    permission_read = "customers.view"
    permission_write = "customers.manage"

    @transaction.atomic
    def perform_create(self, serializer):
        obj = serializer.save(
            tenant_id=self.request.tenant_id,
            company_id=self.request.company_id,
        )
        AuditLog.objects.create(
            tenant_id=self.request.tenant_id,
            actor=self.request.user,
            action="create_ticket",
            object_type=obj._meta.label_lower,
            object_id=obj.pk,
            metadata={
                "ticket_number": obj.ticket_number,
                "category": obj.category,
                "company_id": str(obj.company_id),
                "timeline_version": 1,
                "initial": {
                    key: getattr(obj, key)
                    for key in (
                        "status", "category", "priority",
                        "assigned_user", "assigned_team",
                    )
                },
            },
        )

    # HQNATEX_CALLCENTER_TICKETS_API_V1
    def get_queryset(self):
        queryset = super().get_queryset()
        for key in ("status", "category", "priority"):
            value = self.request.query_params.get(key)
            if value:
                queryset = queryset.filter(**{key: value})

        term = self.request.query_params.get("search", "").strip()
        if term:
            queryset = queryset.filter(
                Q(ticket_number__icontains=term)
                | Q(subject__icontains=term)
                | Q(customer__display_name__icontains=term)
                | Q(assigned_user__icontains=term)
            )
        return queryset.order_by("-created_at", "-id")

    @action(detail=False, methods=["get"])
    def summary(self, request):
        queryset = self.get_queryset()
        counts = dict(
            queryset.values("status")
            .annotate(total=Count("id"))
            .values_list("status", "total")
        )
        return Response({
            "total": sum(counts.values()),
            "open": counts.get("open", 0),
            "in_progress": counts.get("in_progress", 0),
            "resolved": counts.get("resolved", 0),
            "closed": counts.get("closed", 0),
            "cancelled": counts.get("cancelled", 0),
        })

    @transaction.atomic
    def perform_update(self, serializer):
        # HQNATEX_TICKET_TIMELINE_BACKEND_V1
        tracked = (
            "subject", "category", "priority", "status",
            "assigned_team", "assigned_user",
            "description", "resolution", "notes",
            "opened_at", "closed_at",
        )
        obj = self.get_queryset().select_for_update(of=("self",)).get(
            pk=serializer.instance.pk,
        )

        def snapshot(instance):
            result = {}
            for key in tracked:
                value = getattr(instance, key)
                result[key] = (
                    value.isoformat()
                    if hasattr(value, "isoformat") else value
                )
            return result

        before = snapshot(obj)
        serializer.instance = obj
        obj = serializer.save(
            tenant_id=self.request.tenant_id,
            company_id=self.request.company_id,
        )
        after = snapshot(obj)
        changes = {
            key: {"old": before[key], "new": after[key]}
            for key in tracked if before[key] != after[key]
        }
        AuditLog.objects.create(
            tenant_id=self.request.tenant_id,
            actor=self.request.user,
            action="update",
            object_type=obj._meta.label_lower,
            object_id=obj.pk,
            metadata={
                "api": True,
                "company_id": str(obj.company_id),
                "ticket_number": obj.ticket_number,
                "timeline_version": 1,
                "changes": changes,
            },
        )

    @action(detail=True, methods=["get"])
    def timeline(self, request, pk=None):
        from rest_framework.pagination import PageNumberPagination

        # Resolve the company-scoped ticket before reading any audit event.
        ticket = self.get_object()
        events = AuditLog.objects.filter(
            tenant_id=request.tenant_id,
            object_type=ticket._meta.label_lower,
            object_id=ticket.pk,
        ).select_related("actor").order_by("-created_at", "-id")

        paginator = PageNumberPagination()
        paginator.page_size = 25
        page = paginator.paginate_queryset(events, request, view=self)
        allowed = {
            "subject", "category", "priority", "status",
            "assigned_team", "assigned_user",
            "description", "resolution", "notes",
            "opened_at", "closed_at",
        }
        items = []
        for event in page:
            metadata = event.metadata if isinstance(event.metadata, dict) else {}
            event_company = metadata.get("company_id")
            if event_company is not None and str(event_company) != str(ticket.company_id):
                continue
            raw_changes = metadata.get("changes", {})
            changes = {
                key: {"old": value["old"], "new": value["new"]}
                for key, value in raw_changes.items()
                if key in allowed and isinstance(value, dict)
                and "old" in value and "new" in value
            } if isinstance(raw_changes, dict) else {}
            raw_initial = metadata.get("initial", {})
            initial = {
                key: value for key, value in raw_initial.items()
                if key in allowed
            } if isinstance(raw_initial, dict) else {}
            items.append({
                "id": str(event.pk),
                "action": event.action,
                "created_at": event.created_at,
                "actor_id": str(event.actor_id) if event.actor_id else None,
                "actor_email": event.actor.email if event.actor_id else None,
                "changes": changes,
                "initial": initial,
                "change_details_recorded": metadata.get("timeline_version") == 1,
            })
        return paginator.get_paginated_response(items)


    # HQNATEX_TICKET_COMMENTS_API_V1
    @action(detail=True, methods=["get", "post"])
    @transaction.atomic
    def comments(self, request, pk=None):
        from django.shortcuts import get_object_or_404
        from rest_framework import serializers as comment_serializers
        from rest_framework.pagination import PageNumberPagination
        from .models import TicketComment

        # Existing authentication, RBAC and company-scoped lookup run first.
        ticket = self.get_object()

        def represent(comment):
            return {
                "id": str(comment.pk),
                "ticket": str(comment.ticket_id),
                "parent": (
                    str(comment.parent_id) if comment.parent_id else None
                ),
                "body": comment.body,
                "author_id": (
                    str(comment.author_id) if comment.author_id else None
                ),
                "author_email": (
                    comment.author.email if comment.author_id else None
                ),
                "created_at": comment.created_at,
                "updated_at": comment.updated_at,
            }

        scoped = TicketComment.objects.filter(
            tenant_id=request.tenant_id,
            company_id=request.company_id,
            ticket_id=ticket.pk,
        )

        if request.method == "GET":
            paginator = PageNumberPagination()
            paginator.page_size = 25
            page = paginator.paginate_queryset(
                scoped.select_related("author").order_by("created_at", "id"),
                request,
                view=self,
            )
            return paginator.get_paginated_response(
                [represent(comment) for comment in page]
            )

        class CommentInput(comment_serializers.Serializer):
            body = comment_serializers.CharField(
                max_length=10000,
                allow_blank=False,
                trim_whitespace=True,
            )
            parent = comment_serializers.UUIDField(
                required=False, allow_null=True,
            )

            def to_internal_value(self, data):
                if not hasattr(data, "keys"):
                    raise comment_serializers.ValidationError(
                        "Expected an object."
                    )
                unknown = set(data.keys()) - {"body", "parent"}
                if unknown:
                    raise comment_serializers.ValidationError({
                        str(key): "This field is not accepted."
                        for key in sorted(unknown)
                    })
                return super().to_internal_value(data)

        incoming = CommentInput(data=request.data)
        incoming.is_valid(raise_exception=True)

        # Lock only the ticket row, preserving existing nullable relations.
        ticket = get_object_or_404(
            self.get_queryset().select_for_update(of=("self",)),
            pk=ticket.pk,
        )
        parent = None
        parent_id = incoming.validated_data.get("parent")
        if parent_id is not None:
            parent = get_object_or_404(scoped, pk=parent_id)

        comment = TicketComment.objects.create(
            tenant_id=request.tenant_id,
            company_id=request.company_id,
            ticket=ticket,
            author=request.user,
            parent=parent,
            body=incoming.validated_data["body"],
        )
        AuditLog.objects.create(
            tenant_id=request.tenant_id,
            actor=request.user,
            action="create_ticket_comment",
            object_type=comment._meta.label_lower,
            object_id=comment.pk,
            metadata={
                "company_id": str(request.company_id),
                "ticket_id": str(ticket.pk),
                "parent_id": str(parent.pk) if parent else None,
            },
        )
        return Response(represent(comment), status=status.HTTP_201_CREATED)


    @action(detail=False, methods=["get"])
    def assignees(self, request):
        from rest_framework.pagination import PageNumberPagination
        from .serializers import ticket_assignee_memberships

        queryset = ticket_assignee_memberships(request)
        term = request.query_params.get("search", "").strip()
        if term:
            queryset = queryset.filter(
                Q(membership__user__full_name__icontains=term)
                | Q(membership__user__email__icontains=term)
            )

        paginator = PageNumberPagination()
        paginator.page_size = 25
        page = paginator.paginate_queryset(queryset, request, view=self)
        return paginator.get_paginated_response([
            {
                "id": str(item.membership.user_id),
                "email": item.membership.user.email,
                "full_name": item.membership.user.full_name,
                "display_name": (
                    item.membership.user.full_name
                    or item.membership.user.email
                ),
            }
            for item in page
        ])


class ServiceChangeRequestViewSet(CompanyScopedModelViewSet):
    queryset = ServiceChangeRequest.objects.select_related(
        "company",
        "customer_service",
    ).all()
    serializer_class = ServiceChangeRequestSerializer
    permission_read = "customers.view"
    permission_write = "customers.manage"


class ServicePackageHistoryViewSet(CompanyScopedReadOnlyModelViewSet):
    queryset = ServicePackageHistory.objects.select_related(
        "company",
        "customer_service",
    ).all()
    serializer_class = ServicePackageHistorySerializer
    permission_read = "customers.view"


class ServiceStatusHistoryViewSet(CompanyScopedReadOnlyModelViewSet):
    queryset = ServiceStatusHistory.objects.select_related(
        "company",
        "customer_service",
    ).all()
    serializer_class = ServiceStatusHistorySerializer
    permission_read = "customers.view"


class ServiceActivationViewSet(CompanyScopedModelViewSet):
    queryset = ServiceActivation.objects.select_related("company", "customer_service", "customer_service__customer", "customer_service__service").all()
    serializer_class = ServiceActivationSerializer
    permission_read = "customers.view"
    permission_write = "customers.manage"

    def get_queryset(self):
        qs = super().get_queryset()
        cs_id = self.request.query_params.get("customer_service")
        status_val = self.request.query_params.get("status")
        if cs_id:
            qs = qs.filter(customer_service_id=cs_id)
        if status_val:
            qs = qs.filter(status=status_val)
        return qs

    def perform_create(self, serializer):
        obj = serializer.save(tenant_id=self.request.tenant_id, company_id=self.request.company_id)
        AuditLog.objects.create(
            tenant_id=self.request.tenant_id,
            actor=self.request.user,
            action="create_activation",
            object_type=obj._meta.label_lower,
            object_id=obj.pk,
            metadata={"activation_type": obj.activation_type, "status": obj.status},
        )


class InstallationWorkOrderViewSet(CompanyScopedModelViewSet):
    queryset = InstallationWorkOrder.objects.select_related("company", "customer_service", "customer_service__customer", "activation").all()
    serializer_class = InstallationWorkOrderSerializer
    permission_read = "customers.view"
    permission_write = "customers.manage"

    def get_queryset(self):
        qs = super().get_queryset()
        cs_id = self.request.query_params.get("customer_service")
        status_val = self.request.query_params.get("status")
        if cs_id:
            qs = qs.filter(customer_service_id=cs_id)
        if status_val:
            qs = qs.filter(status=status_val)
        return qs

    def perform_create(self, serializer):
        obj = serializer.save(tenant_id=self.request.tenant_id, company_id=self.request.company_id)
        AuditLog.objects.create(
            tenant_id=self.request.tenant_id,
            actor=self.request.user,
            action="create_work_order",
            object_type=obj._meta.label_lower,
            object_id=obj.pk,
            metadata={"order_number": obj.order_number, "work_type": obj.work_type, "status": obj.status},
        )


class ProvisioningJobViewSet(CompanyScopedModelViewSet):
    queryset = ProvisioningJob.objects.select_related("company", "customer_service", "customer_service__customer", "activation").all()
    serializer_class = ProvisioningJobSerializer
    permission_read = "customers.view"
    permission_write = "customers.manage"

    def get_queryset(self):
        qs = super().get_queryset()
        cs_id = self.request.query_params.get("customer_service")
        status_val = self.request.query_params.get("status")
        if cs_id:
            qs = qs.filter(customer_service_id=cs_id)
        if status_val:
            qs = qs.filter(status=status_val)
        return qs

    def perform_create(self, serializer):
        obj = serializer.save(tenant_id=self.request.tenant_id, company_id=self.request.company_id)
        AuditLog.objects.create(
            tenant_id=self.request.tenant_id,
            actor=self.request.user,
            action="create_provisioning_job",
            object_type=obj._meta.label_lower,
            object_id=obj.pk,
            metadata={"job_number": obj.job_number, "provisioning_type": obj.provisioning_type, "target_system": obj.target_system},
        )


class IPAssignmentViewSet(CompanyScopedModelViewSet):
    queryset = IPAssignment.objects.select_related("company", "customer_service", "customer_service__customer").all()
    serializer_class = IPAssignmentSerializer
    permission_read = "customers.view"
    permission_write = "customers.manage"

    def get_queryset(self):
        qs = super().get_queryset()
        cs_id = self.request.query_params.get("customer_service")
        status_val = self.request.query_params.get("status")
        if cs_id:
            qs = qs.filter(customer_service_id=cs_id)
        if status_val:
            qs = qs.filter(status=status_val)
        return qs

    def perform_create(self, serializer):
        obj = serializer.save(tenant_id=self.request.tenant_id, company_id=self.request.company_id)
        AuditLog.objects.create(
            tenant_id=self.request.tenant_id,
            actor=self.request.user,
            action="assign_ip",
            object_type=obj._meta.label_lower,
            object_id=obj.pk,
            metadata={"ip_address": obj.ip_address, "assignment_type": obj.assignment_type},
        )


class RadiusAccountViewSet(CompanyScopedModelViewSet):
    queryset = RadiusAccount.objects.select_related("company", "customer_service", "customer_service__customer").all()
    serializer_class = RadiusAccountSerializer
    permission_read = "customers.view"
    permission_write = "customers.manage"

    def get_queryset(self):
        qs = super().get_queryset()
        cs_id = self.request.query_params.get("customer_service")
        status_val = self.request.query_params.get("status")
        if cs_id:
            qs = qs.filter(customer_service_id=cs_id)
        if status_val:
            qs = qs.filter(status=status_val)
        return qs

    def perform_create(self, serializer):
        obj = serializer.save(tenant_id=self.request.tenant_id, company_id=self.request.company_id)
        AuditLog.objects.create(
            tenant_id=self.request.tenant_id,
            actor=self.request.user,
            action="create_radius_account",
            object_type=obj._meta.label_lower,
            object_id=obj.pk,
            metadata={"username": obj.username, "service_type": obj.service_type},
        )


class TechnicalTestResultViewSet(CompanyScopedModelViewSet):
    queryset = TechnicalTestResult.objects.select_related("company", "customer_service", "customer_service__customer", "activation").all()
    serializer_class = TechnicalTestResultSerializer
    permission_read = "customers.view"
    permission_write = "customers.manage"

    def get_queryset(self):
        qs = super().get_queryset()
        cs_id = self.request.query_params.get("customer_service")
        test_type = self.request.query_params.get("test_type")
        if cs_id:
            qs = qs.filter(customer_service_id=cs_id)
        if test_type:
            qs = qs.filter(test_type=test_type)
        return qs

    def perform_create(self, serializer):
        obj = serializer.save(tenant_id=self.request.tenant_id, company_id=self.request.company_id)
        AuditLog.objects.create(
            tenant_id=self.request.tenant_id,
            actor=self.request.user,
            action="record_test_result",
            object_type=obj._meta.label_lower,
            object_id=obj.pk,
            metadata={"test_type": obj.test_type, "result": obj.result},
        )


class ActivationChecklistViewSet(CompanyScopedModelViewSet):
    queryset = ActivationChecklist.objects.select_related("company", "customer_service", "activation").all()
    serializer_class = ActivationChecklistSerializer
    permission_read = "customers.view"
    permission_write = "customers.manage"

    def get_queryset(self):
        qs = super().get_queryset()
        cs_id = self.request.query_params.get("customer_service")
        act_id = self.request.query_params.get("activation")
        if cs_id:
            qs = qs.filter(customer_service_id=cs_id)
        if act_id:
            qs = qs.filter(activation_id=act_id)
        return qs

    def perform_create(self, serializer):
        obj = serializer.save(tenant_id=self.request.tenant_id, company_id=self.request.company_id)
        AuditLog.objects.create(
            tenant_id=self.request.tenant_id,
            actor=self.request.user,
            action="update_checklist",
            object_type=obj._meta.label_lower,
            object_id=obj.pk,
            metadata={"checklist_item_id": obj.checklist_item_id, "result": obj.result},
        )


class FieldVisitViewSet(CompanyScopedModelViewSet):
    queryset = FieldVisit.objects.select_related("company", "customer_service", "fault_ticket", "installation_work_order").all()
    serializer_class = FieldVisitSerializer
    permission_read = "customers.view"
    permission_write = "customers.manage"

    def get_queryset(self):
        qs = super().get_queryset()
        cs_id = self.request.query_params.get("customer_service")
        if cs_id:
            qs = qs.filter(customer_service_id=cs_id)
        return qs

    def perform_create(self, serializer):
        obj = serializer.save(tenant_id=self.request.tenant_id, company_id=self.request.company_id)
        AuditLog.objects.create(
            tenant_id=self.request.tenant_id,
            actor=self.request.user,
            action="record_field_visit",
            object_type=obj._meta.label_lower,
            object_id=obj.pk,
            metadata={"visit_type": obj.visit_type, "result": obj.result},
        )


class ServiceSuspensionViewSet(CompanyScopedModelViewSet):
    queryset = ServiceSuspension.objects.select_related("company", "customer_service").all()
    serializer_class = ServiceSuspensionSerializer
    permission_read = "customers.view"
    permission_write = "customers.manage"

    def get_queryset(self):
        qs = super().get_queryset()
        cs_id = self.request.query_params.get("customer_service")
        status_val = self.request.query_params.get("status")
        if cs_id:
            qs = qs.filter(customer_service_id=cs_id)
        if status_val:
            qs = qs.filter(status=status_val)
        return qs

    def perform_create(self, serializer):
        obj = serializer.save(tenant_id=self.request.tenant_id, company_id=self.request.company_id)
        AuditLog.objects.create(
            tenant_id=self.request.tenant_id,
            actor=self.request.user,
            action="suspend_service",
            object_type=obj._meta.label_lower,
            object_id=obj.pk,
            metadata={"reason": obj.reason, "status": obj.status},
        )


class ServiceTerminationViewSet(CompanyScopedModelViewSet):
    queryset = ServiceTermination.objects.select_related("company", "customer_service").all()
    serializer_class = ServiceTerminationSerializer
    permission_read = "customers.view"
    permission_write = "customers.manage"

    def get_queryset(self):
        qs = super().get_queryset()
        cs_id = self.request.query_params.get("customer_service")
        status_val = self.request.query_params.get("status")
        if cs_id:
            qs = qs.filter(customer_service_id=cs_id)
        if status_val:
            qs = qs.filter(status=status_val)
        return qs

    def perform_create(self, serializer):
        obj = serializer.save(tenant_id=self.request.tenant_id, company_id=self.request.company_id)
        AuditLog.objects.create(
            tenant_id=self.request.tenant_id,
            actor=self.request.user,
            action="terminate_service",
            object_type=obj._meta.label_lower,
            object_id=obj.pk,
            metadata={"reason": obj.reason, "status": obj.status},
        )


class DecommissionRecordViewSet(CompanyScopedModelViewSet):
    queryset = DecommissionRecord.objects.select_related("company", "customer_service", "termination").all()
    serializer_class = DecommissionRecordSerializer
    permission_read = "customers.view"
    permission_write = "customers.manage"

    def get_queryset(self):
        qs = super().get_queryset()
        cs_id = self.request.query_params.get("customer_service")
        term_id = self.request.query_params.get("termination")
        if cs_id:
            qs = qs.filter(customer_service_id=cs_id)
        if term_id:
            qs = qs.filter(termination_id=term_id)
        return qs

    def perform_create(self, serializer):
        obj = serializer.save(tenant_id=self.request.tenant_id, company_id=self.request.company_id)
        AuditLog.objects.create(
            tenant_id=self.request.tenant_id,
            actor=self.request.user,
            action="record_decommission",
            object_type=obj._meta.label_lower,
            object_id=obj.pk,
            metadata={"resource_type": obj.resource_type, "resource_id": obj.resource_id, "status": obj.status},
        )


class TechnicalChangeHistoryViewSet(CompanyScopedReadOnlyModelViewSet):
    queryset = TechnicalChangeHistory.objects.select_related("company", "customer_service").all()
    serializer_class = TechnicalChangeHistorySerializer
    permission_read = "customers.view"

    def get_queryset(self):
        qs = super().get_queryset()
        cs_id = self.request.query_params.get("customer_service")
        entity_type = self.request.query_params.get("entity_type")
        if cs_id:
            qs = qs.filter(customer_service_id=cs_id)
        if entity_type:
            qs = qs.filter(entity_type=entity_type)
        return qs


class TechnicalAttachmentViewSet(CompanyScopedModelViewSet):
    queryset = TechnicalAttachment.objects.select_related("company", "customer_service").all()
    serializer_class = TechnicalAttachmentSerializer
    permission_read = "customers.view"
    permission_write = "customers.manage"

    def get_queryset(self):
        qs = super().get_queryset()
        cs_id = self.request.query_params.get("customer_service")
        doc_type = self.request.query_params.get("document_type")
        if cs_id:
            qs = qs.filter(customer_service_id=cs_id)
        if doc_type:
            qs = qs.filter(document_type=doc_type)
        return qs

    def perform_create(self, serializer):
        obj = serializer.save(tenant_id=self.request.tenant_id, company_id=self.request.company_id)
        AuditLog.objects.create(
            tenant_id=self.request.tenant_id,
            actor=self.request.user,
            action="upload_technical_attachment",
            object_type=obj._meta.label_lower,
            object_id=obj.pk,
            metadata={"title": obj.title, "document_type": obj.document_type},
        )

