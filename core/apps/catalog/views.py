from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status as drf_status

from apps.common.api import TenantScopedModelViewSet
from .models import Package, PackagePrice, Service, ServiceCategory, ServiceTechnicalField, ServiceTechnicalProfile, Technology, ServiceTechnology
from .serializers import PackagePriceSerializer, PackageSerializer, ServiceCategorySerializer, ServiceSerializer, ServiceTechnicalFieldSerializer, ServiceTechnicalProfileSerializer, TechnologySerializer, ServiceTechnologySerializer


class ServiceCategoryViewSet(TenantScopedModelViewSet):
    queryset = ServiceCategory.objects.all()
    serializer_class = ServiceCategorySerializer
    permission_classes = [IsAuthenticated, *TenantScopedModelViewSet.permission_classes]
    permission_read = "services.view"
    permission_write = "services.manage"


class ServiceTechnicalProfileViewSet(TenantScopedModelViewSet):
    queryset = ServiceTechnicalProfile.objects.select_related("service").prefetch_related("fields").all()
    serializer_class = ServiceTechnicalProfileSerializer
    permission_classes = [IsAuthenticated, *TenantScopedModelViewSet.permission_classes]
    permission_read = "services.view"
    permission_write = "services.manage"

    def get_queryset(self):
        qs = super().get_queryset()
        service_id = self.request.query_params.get("service")
        if service_id:
            qs = qs.filter(service_id=service_id)
        return qs


class ServiceViewSet(TenantScopedModelViewSet):
    queryset = Service.objects.select_related("category").prefetch_related("technical_fields").all()
    serializer_class = ServiceSerializer
    permission_classes = [IsAuthenticated, *TenantScopedModelViewSet.permission_classes]
    permission_read = "services.view"
    permission_write = "services.manage"

    def get_queryset(self):
        qs = super().get_queryset()

        status_value = self.request.query_params.get("status")
        category_id = self.request.query_params.get("category")

        if status_value in {
            Service.Status.ACTIVE,
            Service.Status.INACTIVE,
        }:
            qs = qs.filter(status=status_value)

        if category_id:
            qs = qs.filter(category_id=category_id)

        return qs

    def destroy(self, request, *args, **kwargs):
        """
        HQNATEX catalog records are never hard-deleted.
        DELETE means deactivate so historical references remain intact.
        """
        instance = self.get_object()

        if instance.status != Service.Status.INACTIVE:
            instance.status = Service.Status.INACTIVE
            instance.save(
                update_fields=[
                    "status",
                    "updated_at",
                ]
            )

        serializer = self.get_serializer(instance)

        return Response(
            serializer.data,
            status=drf_status.HTTP_200_OK,
        )


class ServiceTechnicalFieldViewSet(TenantScopedModelViewSet):
    queryset = ServiceTechnicalField.objects.select_related("service").all()
    serializer_class = ServiceTechnicalFieldSerializer
    permission_classes = [IsAuthenticated, *TenantScopedModelViewSet.permission_classes]
    permission_read = "services.view"
    permission_write = "services.manage"


class PackageViewSet(TenantScopedModelViewSet):
    queryset = Package.objects.select_related("service").prefetch_related("prices").all()
    serializer_class = PackageSerializer
    permission_classes = [IsAuthenticated, *TenantScopedModelViewSet.permission_classes]
    permission_read = "packages.view"
    permission_write = "packages.manage"

    def get_queryset(self):
        qs = super().get_queryset()

        status_value = self.request.query_params.get("status")
        service_id = self.request.query_params.get("service")
        available = (
            self.request.query_params
            .get("available", "")
            .strip()
            .lower()
        )

        if status_value in {
            Package.Status.ACTIVE,
            Package.Status.INACTIVE,
        }:
            qs = qs.filter(status=status_value)

        if service_id:
            qs = qs.filter(service_id=service_id)

        if available in {
            "1",
            "true",
            "yes",
        }:
            qs = qs.filter(
                status=Package.Status.ACTIVE,
                service__status=Service.Status.ACTIVE,
            )

        return qs

    def destroy(self, request, *args, **kwargs):
        """
        HQNATEX packages are never hard-deleted.
        DELETE means deactivate so billing/sales history remains intact.
        """
        instance = self.get_object()

        if instance.status != Package.Status.INACTIVE:
            instance.status = Package.Status.INACTIVE
            instance.save(
                update_fields=[
                    "status",
                    "updated_at",
                ]
            )

        serializer = self.get_serializer(instance)

        return Response(
            serializer.data,
            status=drf_status.HTTP_200_OK,
        )


class PackagePriceViewSet(TenantScopedModelViewSet):
    queryset = PackagePrice.objects.select_related("package").all()
    serializer_class = PackagePriceSerializer
    permission_classes = [IsAuthenticated, *TenantScopedModelViewSet.permission_classes]
    permission_read = "packages.view"
    permission_write = "packages.manage"



class TechnologyViewSet(TenantScopedModelViewSet):
    queryset = Technology.objects.all()
    serializer_class = TechnologySerializer
    permission_classes = [
        IsAuthenticated,
        *TenantScopedModelViewSet.permission_classes,
    ]
    permission_read = "services.view"
    permission_write = "services.manage"


class ServiceTechnologyViewSet(TenantScopedModelViewSet):
    queryset = (
        ServiceTechnology.objects
        .select_related("service", "technology")
        .all()
    )
    serializer_class = ServiceTechnologySerializer
    permission_classes = [
        IsAuthenticated,
        *TenantScopedModelViewSet.permission_classes,
    ]
    permission_read = "services.view"
    permission_write = "services.manage"
