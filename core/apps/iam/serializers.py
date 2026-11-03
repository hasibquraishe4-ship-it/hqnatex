from django.db import transaction
from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field

from apps.common.tenant import set_current_tenant
from apps.companies.models import Company
from .models import CompanyMembership, MembershipRole, Permission, Role, RolePermission, TenantMembership, User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "full_name", "status", "is_staff", "created_at", "updated_at"]
        read_only_fields = ["id", "is_staff", "created_at", "updated_at"]


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ["id", "key", "name", "description"]


class RoleSerializer(serializers.ModelSerializer):
    permission_keys = serializers.ListField(
        child=serializers.CharField(max_length=160), required=False, write_only=True
    )
    permissions = PermissionSerializer(many=True, read_only=True)

    class Meta:
        model = Role
        fields = ["id", "tenant", "key", "name", "status", "is_system", "permissions", "permission_keys", "created_at", "updated_at"]
        read_only_fields = ["id", "tenant", "created_at", "updated_at"]

    def _sync_permissions(self, role, keys):
        if keys is None:
            return
        perms = list(Permission.objects.filter(key__in=keys))
        if len(perms) != len(set(keys)):
            found = {p.key for p in perms}
            missing = sorted(set(keys) - found)
            raise serializers.ValidationError({"permission_keys": [f"Unknown permission: {x}" for x in missing]})
        RolePermission.objects.filter(tenant_id=role.tenant_id, role=role).delete()
        RolePermission.objects.bulk_create(
            [RolePermission(tenant_id=role.tenant_id, role=role, permission=p) for p in perms]
        )

    @transaction.atomic
    def create(self, validated_data):
        keys = validated_data.pop("permission_keys", None)
        role = super().create(validated_data)
        self._sync_permissions(role, keys)
        return role

    @transaction.atomic
    def update(self, instance, validated_data):
        keys = validated_data.pop("permission_keys", None)
        role = super().update(instance, validated_data)
        self._sync_permissions(role, keys)
        return role


class TenantMembershipSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    email = serializers.EmailField(write_only=True)
    full_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    role_keys = serializers.ListField(child=serializers.CharField(max_length=100), write_only=True, required=False)
    roles = serializers.SerializerMethodField()

    class Meta:
        model = TenantMembership
        fields = ["id", "tenant", "user", "status", "email", "full_name", "password", "role_keys", "roles", "created_at", "updated_at"]
        read_only_fields = ["id", "tenant", "user", "created_at", "updated_at"]

    @extend_schema_field({"type": "array", "items": {"type": "string"}})
    def get_roles(self, obj):
        return list(
            obj.membership_roles.filter(tenant_id=obj.tenant_id)
            .values_list("role__key", flat=True)
        )

    @transaction.atomic
    def create(self, validated_data):
        tenant_id = self.context["request"].tenant_id
        set_current_tenant(tenant_id, local=True)
        email = validated_data.pop("email")
        full_name = validated_data.pop("full_name", "")
        password = validated_data.pop("password", "")
        role_keys = validated_data.pop("role_keys", [])
        user, created = User.objects.get_or_create(
            email=email,
            defaults={"full_name": full_name or email, "status": User.Status.ACTIVE},
        )
        if created and password:
            user.set_password(password)
            user.save(update_fields=["password"])
        membership, _ = TenantMembership.objects.update_or_create(
            tenant_id=tenant_id,
            user=user,
            defaults={"status": validated_data.get("status", TenantMembership.Status.ACTIVE)},
        )
        if role_keys:
            roles = list(Role.objects.filter(tenant_id=tenant_id, key__in=role_keys))
            if len(roles) != len(set(role_keys)):
                raise serializers.ValidationError({"role_keys": "One or more roles do not exist in this tenant."})
            MembershipRole.objects.filter(tenant_id=tenant_id, membership=membership).delete()
            MembershipRole.objects.bulk_create(
                [MembershipRole(tenant_id=tenant_id, membership=membership, role=r) for r in roles]
            )
        return membership


    @transaction.atomic
    def update(self, instance, validated_data):
        request = self.context["request"]
        tenant_id = request.tenant_id
        set_current_tenant(tenant_id, local=True)

        if validated_data.get("password") or validated_data.get("full_name"):
            raise serializers.ValidationError(
                "Change global identity and password through the self-profile workflow."
            )
        if validated_data.get("email") and validated_data["email"] != instance.user.email:
            raise serializers.ValidationError(
                {"email": "Membership cannot be moved to another user."}
            )

        validated_data.pop("email", None)
        validated_data.pop("full_name", None)
        validated_data.pop("password", None)
        role_keys = validated_data.pop("role_keys", None)

        instance = TenantMembership.objects.select_for_update().get(
            pk=instance.pk,
            tenant_id=tenant_id,
        )
        instance = super().update(instance, validated_data)

        if role_keys is not None:
            unique_keys = set(role_keys)
            roles = list(
                Role.objects.filter(
                    tenant_id=tenant_id,
                    status=Role.Status.ACTIVE,
                    key__in=unique_keys,
                )
            )
            if len(roles) != len(unique_keys):
                raise serializers.ValidationError({
                    "role_keys": "Select active roles belonging to this tenant."
                })

            MembershipRole.objects.filter(
                tenant_id=tenant_id,
                membership=instance,
            ).delete()
            MembershipRole.objects.bulk_create([
                MembershipRole(
                    tenant_id=tenant_id,
                    membership=instance,
                    role=role,
                )
                for role in roles
            ])

        return instance



class CompanyMembershipSerializer(serializers.ModelSerializer):
    company_code = serializers.CharField(source="company.code", read_only=True)
    company_name = serializers.CharField(source="company.legal_name", read_only=True)
    user_email = serializers.EmailField(source="membership.user.email", read_only=True)

    class Meta:
        model = CompanyMembership
        fields = [
            "id",
            "tenant",
            "membership",
            "company",
            "company_code",
            "company_name",
            "user_email",
            "status",
            "is_default",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "tenant",
            "company_code",
            "company_name",
            "user_email",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        request = self.context["request"]
        tenant_id = request.tenant_id

        membership = attrs.get(
            "membership",
            getattr(self.instance, "membership", None),
        )
        company = attrs.get(
            "company",
            getattr(self.instance, "company", None),
        )
        status = attrs.get(
            "status",
            getattr(self.instance, "status", CompanyMembership.Status.ACTIVE),
        )
        is_default = attrs.get(
            "is_default",
            getattr(self.instance, "is_default", False),
        )

        if membership is None or membership.tenant_id != tenant_id:
            raise serializers.ValidationError(
                {"membership": "Membership must belong to the active tenant."}
            )

        if company is None or company.tenant_id != tenant_id:
            raise serializers.ValidationError(
                {"company": "Company must belong to the active tenant."}
            )

        if company.status != Company.Status.ACTIVE and status == CompanyMembership.Status.ACTIVE:
            raise serializers.ValidationError(
                {"company": "Active access requires an active company."}
            )

        if is_default and status != CompanyMembership.Status.ACTIVE:
            raise serializers.ValidationError(
                {"is_default": "Only active company access may be default."}
            )

        return attrs


class MyCompanySerializer(serializers.ModelSerializer):
    is_default = serializers.SerializerMethodField()

    class Meta:
        model = Company
        fields = [
            "id",
            "code",
            "legal_name",
            "trade_name",
            "status",
            "is_default",
        ]

    def get_is_default(self, obj):
        default_ids = self.context.get("default_company_ids", set())
        return obj.id in default_ids
