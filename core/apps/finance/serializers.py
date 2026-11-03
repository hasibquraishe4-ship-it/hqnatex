from rest_framework import serializers

from .models import Account


class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Account

        fields = [
            "id",
            "tenant",
            "company",
            "parent",
            "code",
            "name",
            "account_type",
            "normal_balance",
            "is_posting",
            "status",
            "description",
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

    def validate(self, data):
        request = self.context.get("request")

        tenant_id = (
            getattr(request, "tenant_id", None)
            if request
            else None
        )

        company_id = (
            getattr(request, "company_id", None)
            if request
            else None
        )

        if not tenant_id:
            return data

        if not company_id:
            raise serializers.ValidationError(
                {
                    "company":
                    "Active company context is required."
                }
            )

        parent = data.get(
            "parent",
            getattr(
                self.instance,
                "parent",
                None,
            ),
        )

        if parent:
            if parent.tenant_id != tenant_id:
                raise serializers.ValidationError(
                    {
                        "parent":
                        "Parent account belongs to another tenant."
                    }
                )

            if str(parent.company_id) != str(company_id):
                raise serializers.ValidationError(
                    {
                        "parent":
                        "Parent account must belong to the active company."
                    }
                )

            if (
                self.instance
                and parent.id == self.instance.id
            ):
                raise serializers.ValidationError(
                    {
                        "parent":
                        "An account cannot be its own parent."
                    }
                )

        return data
