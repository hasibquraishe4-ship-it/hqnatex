import uuid

from rest_framework import serializers

from .models import Sale, SaleItem


class SaleItemSerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(source="service.name_english", read_only=True)
    package_name = serializers.CharField(source="package.name_english", read_only=True)

    class Meta:
        model = SaleItem
        fields = [
            "id", "tenant", "sale", "line_no", "item_type", "service", "service_name",
            "package", "package_name", "description_snapshot", "quantity", "unit_price",
            "line_total", "share_eligible", "metadata", "created_at", "updated_at"
        ]
        read_only_fields = ["id", "tenant", "line_total", "created_at", "updated_at"]

    def validate(self, attrs):
        tenant_id = self.context["request"].tenant_id
        sale = attrs.get("sale", getattr(self.instance, "sale", None))
        service = attrs.get("service", getattr(self.instance, "service", None))
        package = attrs.get("package", getattr(self.instance, "package", None))
        item_type = attrs.get("item_type", getattr(self.instance, "item_type", None))
        share_eligible = attrs.get("share_eligible", getattr(self.instance, "share_eligible", True))

        for name, obj in (("sale", sale), ("service", service), ("package", package)):
            if obj is not None and obj.tenant_id != tenant_id:
                raise serializers.ValidationError({name: f"{name.title()} belongs to another tenant."})
        if sale and sale.status != Sale.Status.DRAFT:
            raise serializers.ValidationError({"sale": "Items can only be changed while the sale is draft."})
        if package and service and package.service_id != service.id:
            raise serializers.ValidationError({"package": "Package does not belong to the selected service."})
        if package and service is None:
            attrs["service"] = package.service
            service = package.service

        creating = self.instance is None

        service_changed = (
            creating
            or (
                "service" in attrs
                and service is not None
                and str(
                    getattr(
                        self.instance,
                        "service_id",
                        "",
                    )
                )
                != str(service.id)
            )
        )

        package_changed = (
            (
                creating
                and package is not None
            )
            or (
                "package" in attrs
                and str(
                    getattr(
                        self.instance,
                        "package_id",
                        "",
                    )
                    or ""
                )
                != str(
                    getattr(
                        package,
                        "id",
                        "",
                    )
                    or ""
                )
            )
        )

        if (
            service
            and service_changed
            and service.status != "active"
        ):
            raise serializers.ValidationError(
                {
                    "service":
                    "Inactive service cannot be added to a new sale."
                }
            )

        if package and package_changed:
            if package.status != "active":
                raise serializers.ValidationError(
                    {
                        "package":
                        "Inactive package cannot be added to a new sale."
                    }
                )

            if package.service.status != "active":
                raise serializers.ValidationError(
                    {
                        "package":
                        "Package belongs to an inactive service."
                    }
                )
        if item_type == SaleItem.ItemType.PACKAGE and package is None:
            raise serializers.ValidationError({"package": "Package item requires a package."})
        if item_type == SaleItem.ItemType.EQUIPMENT:
            raise serializers.ValidationError(
                {"item_type": "Equipment sale is blocked until Warehouse Product/Stock/Serial is canonical in FULL-05."}
            )
        if share_eligible and service is None:
            raise serializers.ValidationError({"service": "Share-eligible item requires a service context."})
        return attrs

    def create(self, validated_data):
        if not validated_data.get("line_no"):
            sale = validated_data["sale"]
            last = sale.items.order_by("-line_no").values_list("line_no", flat=True).first() or 0
            validated_data["line_no"] = last + 1
        obj = super().create(validated_data)
        obj.sale.recalculate_totals()
        return obj

    def update(self, instance, validated_data):
        obj = super().update(instance, validated_data)
        obj.sale.recalculate_totals()
        return obj


class SaleSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.legal_name", read_only=True)
    branch_name = serializers.CharField(source="branch.name", read_only=True)
    customer_name = serializers.CharField(source="customer.display_name", read_only=True)
    customer_service_identifier = serializers.CharField(source="customer_service.identifier", read_only=True)
    agency_name = serializers.CharField(source="agency.name", read_only=True)
    items = SaleItemSerializer(many=True, read_only=True)
    invoice_id = serializers.SerializerMethodField()

    class Meta:
        model = Sale
        fields = [
            "id", "tenant", "company", "company_name", "branch", "branch_name", "agency", "agency_name", "customer",
            "customer_name", "customer_service", "customer_service_identifier", "sale_number",
            "sale_type", "status", "sale_date", "currency", "subtotal", "discount_amount",
            "total", "notes", "posted_at", "invoice_id", "items", "created_at", "updated_at"
        ]
        read_only_fields = [
            "id", "tenant", "sale_number", "status", "subtotal", "total", "posted_at",
            "invoice_id", "created_at", "updated_at"
        ]

    def get_invoice_id(self, obj) -> str | None:
        invoice = obj.invoices.first()
        return str(invoice.id) if invoice else None

    def validate(self, attrs):
        tenant_id = self.context["request"].tenant_id
        company = attrs.get("company", getattr(self.instance, "company", None))
        branch = attrs.get("branch", getattr(self.instance, "branch", None))
        agency = attrs.get("agency", getattr(self.instance, "agency", None))
        customer = attrs.get("customer", getattr(self.instance, "customer", None))
        customer_service = attrs.get("customer_service", getattr(self.instance, "customer_service", None))

        for name, obj in (
            ("company", company), ("branch", branch), ("agency", agency),
            ("customer", customer), ("customer_service", customer_service)
        ):
            if obj is not None and obj.tenant_id != tenant_id:
                raise serializers.ValidationError({name: f"{name.title()} belongs to another tenant."})
        if customer and company and customer.company_id != company.id:
            raise serializers.ValidationError({"customer": "Customer does not belong to the selected company."})
        if customer_service and customer and customer_service.customer_id != customer.id:
            raise serializers.ValidationError({"customer_service": "Customer service does not belong to the selected customer."})

        customer_service_changed = (
            self.instance is None
            or (
                "customer_service" in attrs
                and customer_service is not None
                and str(
                    getattr(
                        self.instance,
                        "customer_service_id",
                        "",
                    )
                )
                != str(customer_service.id)
            )
        )

        if (
            customer_service
            and customer_service_changed
        ):
            if customer_service.service.status != "active":
                raise serializers.ValidationError(
                    {
                        "customer_service":
                        "Customer service uses an inactive service and cannot be used for a new sale."
                    }
                )

            if (
                customer_service.package_id
                and customer_service.package.status
                != "active"
            ):
                raise serializers.ValidationError(
                    {
                        "customer_service":
                        "Customer service uses an inactive package and cannot be used for a new sale."
                    }
                )
        if branch and company and branch.company_id != company.id:
            raise serializers.ValidationError({"branch": "Branch does not belong to the selected company."})
        if agency and company and agency.company_id != company.id:
            raise serializers.ValidationError({"agency": "Agency does not belong to the selected company."})
        if self.instance and self.instance.status == Sale.Status.POSTED:
            raise serializers.ValidationError({"status": "Posted sale is immutable; use a future correction/reversal workflow."})
        return attrs

    def create(self, validated_data):
        validated_data.setdefault("sale_number", f"SAL-{uuid.uuid4().hex[:12].upper()}")
        return super().create(validated_data)
