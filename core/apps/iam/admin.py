from django.contrib import admin
from .models import MembershipRole, Permission, Role, RolePermission, TenantMembership, User
for model in (User, TenantMembership, Permission, Role, RolePermission, MembershipRole):
    admin.site.register(model)
