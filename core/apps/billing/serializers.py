import uuid

from rest_framework import serializers

from .models import Invoice, InvoiceItem, Payment, PaymentAllocation, Receipt, Receivable


class InvoiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceItem
        fields = "__all__"


class InvoiceSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.legal_name", read_only=True)
    branch_name = serializers.CharField(source="branch.name", read_only=True)
    agency_name = serializers.CharField(source="agency.name", read_only=True)
    customer_name = serializers.CharField(source="customer.display_name", read_only=True)
    sale_number = serializers.CharField(source="sale.sale_number", read_only=True)
    items = InvoiceItemSerializer(many=True, read_only=True)

    class Meta:
        model = Invoice
        fields = [
            "id", "tenant", "company", "company_name", "branch", "branch_name", "agency", "agency_name", "customer", "customer_name",
            "customer_service", "sale", "sale_number", "invoice_number", "status",
            "issue_date", "due_date", "currency", "subtotal", "discount_amount", "total",
            "issued_at", "items", "created_at", "updated_at"
        ]
        read_only_fields = fields


class ReceivableSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.legal_name", read_only=True)
    invoice_number = serializers.CharField(source="invoice.invoice_number", read_only=True)
    issue_date = serializers.DateField(source="invoice.issue_date", read_only=True)
    due_date = serializers.DateField(source="invoice.due_date", read_only=True, allow_null=True)
    customer_code = serializers.CharField(source="customer.code", read_only=True)
    customer_name = serializers.CharField(source="customer.display_name", read_only=True)
    allocated_amount = serializers.DecimalField(max_digits=18, decimal_places=2, read_only=True)
    outstanding_amount = serializers.DecimalField(max_digits=18, decimal_places=2, read_only=True)

    class Meta:
        model = Receivable
        fields = [
            "id", "tenant", "company", "company_name",
            "invoice", "invoice_number", "issue_date", "due_date",
            "customer", "customer_code", "customer_name",
            "original_amount", "allocated_amount", "outstanding_amount", "currency",
            "status", "created_at", "updated_at"
        ]
        read_only_fields = fields


class PaymentSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.display_name", read_only=True)

    class Meta:
        model = Payment
        fields = [
            "id", "tenant", "company", "branch", "agency", "customer", "customer_name",
            "payment_number", "status", "payment_date", "amount", "currency", "method",
            "reference", "treasury_status", "posted_at", "created_at", "updated_at"
        ]
        read_only_fields = [
            "id", "tenant", "payment_number", "status", "treasury_status",
            "posted_at", "created_at", "updated_at"
        ]

    def validate(self, attrs):
        tenant_id = self.context["request"].tenant_id
        company_id = self.context["request"].company_id
        company = attrs.get("company", getattr(self.instance, "company", None))
        branch = attrs.get("branch", getattr(self.instance, "branch", None))
        agency = attrs.get("agency", getattr(self.instance, "agency", None))
        customer = attrs.get("customer", getattr(self.instance, "customer", None))
        for name, obj in (("company", company), ("branch", branch), ("agency", agency), ("customer", customer)):
            if obj is not None and obj.tenant_id != tenant_id:
                raise serializers.ValidationError({name: f"{name.title()} belongs to another tenant."})
        if company is not None and company.id != company_id:
            raise serializers.ValidationError({"company": "Selected company does not match active company context."})
        for name, obj in (("branch", branch), ("agency", agency), ("customer", customer)):
            if obj is not None and obj.company_id != company_id:
                raise serializers.ValidationError({name: f"{name.title()} does not belong to active company."})
        if customer and company and customer.company_id != company.id:
            raise serializers.ValidationError({"customer": "Customer does not belong to selected company."})
        if branch and company and branch.company_id != company.id:
            raise serializers.ValidationError({"branch": "Branch does not belong to selected company."})
        if agency and company and agency.company_id != company.id:
            raise serializers.ValidationError({"agency": "Agency does not belong to selected company."})
        if self.instance and self.instance.status == Payment.Status.POSTED:
            raise serializers.ValidationError({"status": "Posted payment is immutable; use a future correction/reversal workflow."})
        return attrs

    def create(self, validated_data):
        validated_data.setdefault("payment_number", f"PAY-{uuid.uuid4().hex[:12].upper()}")
        return super().create(validated_data)


class PaymentAllocationSerializer(serializers.ModelSerializer):
    invoice_number = serializers.CharField(source="receivable.invoice.invoice_number", read_only=True)

    class Meta:
        model = PaymentAllocation
        fields = [
            "id", "tenant", "company", "payment", "receivable", "invoice_number", "amount",
            "created_at", "updated_at"
        ]
        read_only_fields = ["id", "tenant", "company", "created_at", "updated_at"]

    def validate(self, attrs):
        tenant_id = self.context["request"].tenant_id
        company_id = self.context["request"].company_id
        payment = attrs.get("payment", getattr(self.instance, "payment", None))
        receivable = attrs.get("receivable", getattr(self.instance, "receivable", None))
        amount = attrs.get("amount", getattr(self.instance, "amount", None))
        for name, obj in (("payment", payment), ("receivable", receivable)):
            if obj is not None and obj.tenant_id != tenant_id:
                raise serializers.ValidationError({name: f"{name.title()} belongs to another tenant."})
        if payment is not None and payment.company_id != company_id:
            raise serializers.ValidationError({"payment": "Payment does not belong to active company."})
        if receivable is not None and receivable.company_id != company_id:
            raise serializers.ValidationError({"receivable": "Receivable does not belong to active company."})
        if payment and receivable and payment.company_id != receivable.company_id:
            raise serializers.ValidationError({"receivable": "Payment and receivable must belong to the same company."})
        if payment and payment.status != Payment.Status.DRAFT:
            raise serializers.ValidationError({"payment": "Allocations can only change while payment is draft."})
        if payment and receivable and payment.customer_id != receivable.customer_id:
            raise serializers.ValidationError({"receivable": "Receivable belongs to another customer."})
        if payment and receivable and payment.currency != receivable.currency:
            raise serializers.ValidationError({"currency": "Payment and receivable currencies must match."})
        if amount is not None and amount <= 0:
            raise serializers.ValidationError({"amount": "Allocation amount must be greater than zero."})
        return attrs


class ReceiptSerializer(serializers.ModelSerializer):
    payment_number = serializers.CharField(source="payment.payment_number", read_only=True)

    class Meta:
        model = Receipt
        fields = [
            "id", "tenant", "payment", "payment_number", "receipt_number", "status",
            "amount", "currency", "issued_at", "created_at", "updated_at"
        ]
        read_only_fields = fields
