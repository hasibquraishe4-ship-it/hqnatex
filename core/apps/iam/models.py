from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.db import models

from apps.common.models import UUIDTimestampModel
from apps.tenancy.models import Tenant


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, email: str, password: str | None = None, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email: str, password: str, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("status", "active")
        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True")
        return self.create_user(email, password, **extra_fields)


class User(UUIDTimestampModel, AbstractBaseUser):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        DISABLED = "disabled", "Disabled"
        LOCKED = "locked", "Locked"

    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ACTIVE)
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)

    USERNAME_FIELD = "email"
    objects = UserManager()

    class Meta:
        db_table = "iam_users"
        indexes = [models.Index(fields=["status"], name="ix_user_status")]

    @property
    def is_active(self) -> bool:
        return self.status == self.Status.ACTIVE

    def has_perm(self, perm, obj=None) -> bool:
        return bool(self.is_superuser)

    def has_module_perms(self, app_label) -> bool:
        return bool(self.is_superuser)

    def __str__(self) -> str:
        return self.email


class TenantMembership(UUIDTimestampModel):
    class Status(models.TextChoices):
        INVITED = "invited", "Invited"
        ACTIVE = "active", "Active"
        SUSPENDED = "suspended", "Suspended"
        CLOSED = "closed", "Closed"

    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="memberships")
    user = models.ForeignKey(User, on_delete=models.PROTECT, related_name="tenant_memberships")
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.INVITED)

    class Meta:
        db_table = "iam_tenant_memberships"
        constraints = [
            models.UniqueConstraint(fields=["tenant", "user"], name="uq_membership_tenant_user"),
            models.UniqueConstraint(fields=["tenant", "id"], name="uq_membership_tenant_id"),
        ]
        indexes = [
            models.Index(fields=["tenant", "status"], name="ix_membership_tenant_status"),
            models.Index(fields=["user"], name="ix_membership_user"),
        ]


class Permission(UUIDTimestampModel):
    key = models.CharField(max_length=160, unique=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    class Meta:
        db_table = "iam_permissions"
        ordering = ["key"]

    def __str__(self) -> str:
        return self.key


class Role(UUIDTimestampModel):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"

    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="roles")
    key = models.CharField(max_length=100)
    name = models.CharField(max_length=255)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ACTIVE)
    is_system = models.BooleanField(default=False)
    permissions = models.ManyToManyField(
        Permission, through="RolePermission", related_name="roles"
    )

    class Meta:
        db_table = "iam_roles"
        constraints = [
            models.UniqueConstraint(fields=["tenant", "key"], name="uq_role_tenant_key"),
            models.UniqueConstraint(fields=["tenant", "id"], name="uq_role_tenant_id"),
        ]
        indexes = [models.Index(fields=["tenant", "status"], name="ix_role_tenant_status")]

    def __str__(self) -> str:
        return f"{self.tenant_id}:{self.key}"


class RolePermission(models.Model):
    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT)
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name="role_permissions")
    permission = models.ForeignKey(Permission, on_delete=models.PROTECT)

    class Meta:
        db_table = "iam_role_permissions"
        constraints = [
            models.UniqueConstraint(fields=["role", "permission"], name="uq_role_permission")
        ]
        indexes = [models.Index(fields=["tenant", "role"], name="ix_role_permission_tenant")]


class MembershipRole(models.Model):
    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT)
    membership = models.ForeignKey(
        TenantMembership, on_delete=models.CASCADE, related_name="membership_roles"
    )
    role = models.ForeignKey(Role, on_delete=models.PROTECT, related_name="membership_roles")

    class Meta:
        db_table = "iam_membership_roles"
        constraints = [
            models.UniqueConstraint(fields=["membership", "role"], name="uq_membership_role")
        ]
        indexes = [models.Index(fields=["tenant", "role"], name="ix_membership_role_tenant")]

class CompanyMembership(UUIDTimestampModel):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"
        SUSPENDED = "suspended", "Suspended"

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.PROTECT,
        related_name="company_memberships",
    )
    membership = models.ForeignKey(
        TenantMembership,
        on_delete=models.CASCADE,
        related_name="company_memberships",
    )
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.PROTECT,
        related_name="user_memberships",
    )
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.ACTIVE,
    )
    is_default = models.BooleanField(default=False)

    class Meta:
        db_table = "iam_company_memberships"
        constraints = [
            models.UniqueConstraint(
                fields=["membership", "company"],
                name="uq_company_membership_grant",
            ),
            models.UniqueConstraint(
                fields=["membership"],
                condition=models.Q(is_default=True, status="active"),
                name="uq_company_membership_default",
            ),
            models.CheckConstraint(
                condition=models.Q(is_default=False) | models.Q(status="active"),
                name="ck_cmpmem_default_active",
            ),
        ]
        indexes = [
            models.Index(
                fields=["tenant", "status"],
                name="ix_cmpmem_tenant_status",
            ),
            models.Index(
                fields=["membership", "status"],
                name="ix_cmpmem_member_status",
            ),
            models.Index(
                fields=["company", "status"],
                name="ix_cmpmem_company_status",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.membership_id}:{self.company_id}"
