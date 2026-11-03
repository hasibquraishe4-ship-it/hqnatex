from django.db import connection, transaction
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.common.tenant import set_current_tenant
from apps.companies.models import Company
from apps.iam.models import MembershipRole, Permission, Role, RolePermission, TenantMembership, User
from apps.tenancy.models import Tenant


class Full01IsolationTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.permission = Permission.objects.create(key="companies.view", name="View companies")
        cls.tenant_a = Tenant.objects.create(code="TEST-A", name="Tenant A", status="active")
        cls.tenant_b = Tenant.objects.create(code="TEST-B", name="Tenant B", status="active")
        cls.user_a = User.objects.create_user(email="a@example.invalid", password="TestPass123!", full_name="A")
        cls.user_b = User.objects.create_user(email="b@example.invalid", password="TestPass123!", full_name="B")

        for tenant, user, code in ((cls.tenant_a, cls.user_a, "A"), (cls.tenant_b, cls.user_b, "B")):
            with transaction.atomic():
                set_current_tenant(tenant.id, local=True)
                Company.objects.create(tenant=tenant, code=code, legal_name=f"Company {code}", is_primary=True)
                membership = TenantMembership.objects.create(tenant=tenant, user=user, status="active")
                role = Role.objects.create(tenant=tenant, key="viewer", name="Viewer", status="active")
                RolePermission.objects.create(tenant=tenant, role=role, permission=cls.permission)
                MembershipRole.objects.create(tenant=tenant, membership=membership, role=role)

    def token(self, user):
        return str(RefreshToken.for_user(user).access_token)

    def test_tenant_a_sees_only_tenant_a_company(self):
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token(self.user_a)}", HTTP_X_TENANT_ID=str(self.tenant_a.id))
        response = client.get("/api/v1/companies/")
        self.assertEqual(response.status_code, 200)
        results = response.json()["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["code"], "A")

    def test_tenant_a_cannot_switch_to_tenant_b(self):
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token(self.user_a)}", HTTP_X_TENANT_ID=str(self.tenant_b.id))
        response = client.get("/api/v1/companies/")
        self.assertEqual(response.status_code, 403)

    def test_database_rls_filters_cross_tenant_rows(self):
        with transaction.atomic():
            set_current_tenant(self.tenant_a.id, local=True)
            with connection.cursor() as cursor:
                cursor.execute("SELECT code FROM companies_companies ORDER BY code")
                rows = [row[0] for row in cursor.fetchall()]
        self.assertEqual(rows, ["A"])
