from rest_framework import serializers

from .models import (
    CustomerServiceNetworkResource,
    NetworkResource,
)


class NetworkResourceSerializer(serializers.ModelSerializer):
    parent_code = serializers.CharField(
        source="parent.code",
        read_only=True,
    )

    class Meta:
        model = NetworkResource
        fields = [
            "id",
            "tenant",
            "company",
            "branch",
            "parent",
            "parent_code",
            "code",
            "name",
            "resource_type",
            "status",
            "capacity",
            "unit",
            "attributes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "tenant",
            "company",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        request = self.context["request"]
        tenant_id = request.tenant_id
        company_id = request.company_id

        branch = attrs.get(
            "branch",
            getattr(self.instance, "branch", None),
        )
        parent = attrs.get(
            "parent",
            getattr(self.instance, "parent", None),
        )

        if branch:
            if branch.tenant_id != tenant_id:
                raise serializers.ValidationError(
                    {"branch": "Branch belongs to another tenant."}
                )
            if str(branch.company_id) != str(company_id):
                raise serializers.ValidationError(
                    {"branch": "Branch belongs to another company."}
                )

        if parent:
            if parent.tenant_id != tenant_id:
                raise serializers.ValidationError(
                    {"parent": "Parent resource belongs to another tenant."}
                )
            if str(parent.company_id) != str(company_id):
                raise serializers.ValidationError(
                    {"parent": "Parent resource belongs to another company."}
                )

        return attrs


class CustomerServiceNetworkResourceSerializer(
    serializers.ModelSerializer
):
    resource_code = serializers.CharField(
        source="resource.code",
        read_only=True,
    )

    class Meta:
        model = CustomerServiceNetworkResource
        fields = [
            "id",
            "tenant",
            "company",
            "customer_service",
            "resource",
            "resource_code",
            "purpose",
            "status",
            "active_from",
            "active_to",
            "metadata",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "tenant",
            "company",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        request = self.context["request"]
        tenant_id = request.tenant_id
        company_id = request.company_id

        customer_service = attrs.get(
            "customer_service",
            getattr(self.instance, "customer_service", None),
        )
        resource = attrs.get(
            "resource",
            getattr(self.instance, "resource", None),
        )

        if customer_service:
            if customer_service.tenant_id != tenant_id:
                raise serializers.ValidationError(
                    {
                        "customer_service":
                        "Customer service belongs to another tenant."
                    }
                )

            if str(customer_service.company_id) != str(company_id):
                raise serializers.ValidationError(
                    {
                        "customer_service":
                        "Customer service belongs to another company."
                    }
                )

        if resource:
            if resource.tenant_id != tenant_id:
                raise serializers.ValidationError(
                    {
                        "resource":
                        "Network resource belongs to another tenant."
                    }
                )

            if str(resource.company_id) != str(company_id):
                raise serializers.ValidationError(
                    {
                        "resource":
                        "Network resource belongs to another company."
                    }
                )

        if (
            customer_service
            and resource
            and customer_service.company_id != resource.company_id
        ):
            raise serializers.ValidationError(
                {
                    "resource":
                    "Network resource and customer service company mismatch."
                }
            )

        return attrs
