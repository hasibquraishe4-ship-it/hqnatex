from django.db import connection, transaction
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.common.tenant import set_current_tenant
from apps.companies.models import Company
from apps.iam.models import MembershipRole, Permission, Role, RolePermission, TenantMembership, User
from apps.tenancy.models import Tenant
from .models import Partner


class PartnerIsolationTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.view_perm = Permission.objects.create(key="partners.view", name="View partners")
        cls.manage_perm = Permission.objects.create(key="partners.manage", name="Manage partners")
        
        cls.tenant_a = Tenant.objects.create(code="TEST-A", name="Tenant A", status="active")
        cls.tenant_b = Tenant.objects.create(code="TEST-B", name="Tenant B", status="active")
        
        cls.user_a = User.objects.create_user(email="a@example.invalid", password="TestPass123!", full_name="A")
        cls.user_b = User.objects.create_user(email="b@example.invalid", password="TestPass123!", full_name="B")

        for tenant, user, code in ((cls.tenant_a, cls.user_a, "A"), (cls.tenant_b, cls.user_b, "B")):
            with transaction.atomic():
                set_current_tenant(tenant.id, local=True)
                company = Company.objects.create(tenant=tenant, code=f"C-{code}", legal_name=f"Company {code}", is_primary=True)
                
                # Create a partner for each tenant
                Partner.objects.create(
                    tenant=tenant,
                    company=company,
                    code=f"P-{code}",
                    legal_name=f"Partner {code}",
                    status="active"
                )
                
                membership = TenantMembership.objects.create(tenant=tenant, user=user, status="active")
                role = Role.objects.create(tenant=tenant, key="admin", name="Admin", status="active")
                RolePermission.objects.create(tenant=tenant, role=role, permission=cls.view_perm)
                RolePermission.objects.create(tenant=tenant, role=role, permission=cls.manage_perm)
                MembershipRole.objects.create(tenant=tenant, membership=membership, role=role)

    def token(self, user):
        return str(RefreshToken.for_user(user).access_token)

    def test_tenant_a_sees_only_tenant_a_partner(self):
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token(self.user_a)}", HTTP_X_TENANT_ID=str(self.tenant_a.id))
        response = client.get("/api/v1/partners/")
        self.assertEqual(response.status_code, 200)
        results = response.json()["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["code"], "P-A")

    def test_tenant_a_cannot_see_tenant_b_partner_details(self):
        # Get Tenant B's partner ID
        with transaction.atomic():
            set_current_tenant(self.tenant_b.id, local=True)
            partner_b = Partner.objects.get(code="P-B")
        
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token(self.user_a)}", HTTP_X_TENANT_ID=str(self.tenant_a.id))
        response = client.get(f"/api/v1/partners/{partner_b.id}/")
        self.assertEqual(response.status_code, 404)

    def test_tenant_a_cannot_create_partner_for_tenant_b(self):
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token(self.user_a)}", HTTP_X_TENANT_ID=str(self.tenant_a.id))
        
        # Try to use Tenant B's company ID
        with transaction.atomic():
            set_current_tenant(self.tenant_b.id, local=True)
            company_b = Company.objects.get(code="C-B")
            
        response = client.post("/api/v1/partners/", {
            "company": str(company_b.id),
            "code": "ILLEGAL",
            "legal_name": "Illegal Partner"
        })
        # Should fail validation because company is not in Tenant A's context (filtered out by RLS/Queryset)
        self.assertEqual(response.status_code, 400)

    def test_database_rls_filters_partners(self):
        with transaction.atomic():
            set_current_tenant(self.tenant_a.id, local=True)
            with connection.cursor() as cursor:
                cursor.execute("SELECT code FROM partners_partners")
                rows = [row[0] for row in cursor.fetchall()]
        self.assertEqual(rows, ["P-A"])

    def test_rbac_denies_view_without_permission(self):
        # Create user without permission
        user_no_perm = User.objects.create_user(email="noperm@example.invalid", password="TestPass123!", full_name="No Perm")
        with transaction.atomic():
            set_current_tenant(self.tenant_a.id, local=True)
            TenantMembership.objects.create(tenant=self.tenant_a, user=user_no_perm, status="active")
            # No roles assigned
            
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token(user_no_perm)}", HTTP_X_TENANT_ID=str(self.tenant_a.id))
        response = client.get("/api/v1/partners/")
        self.assertEqual(response.status_code, 403)
