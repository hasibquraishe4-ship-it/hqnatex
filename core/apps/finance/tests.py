from django.db import connection, transaction
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.common.tenant import set_current_tenant
from apps.companies.models import Company
from apps.iam.models import MembershipRole, Permission, Role, RolePermission, TenantMembership, User
from apps.tenancy.models import Tenant
from .models import Account


class AccountIsolationTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.view_perm = Permission.objects.create(key="finance.accounts.view", name="View accounts")
        cls.manage_perm = Permission.objects.create(key="finance.accounts.manage", name="Manage accounts")
        
        cls.tenant_a = Tenant.objects.create(code="TEST-A", name="Tenant A", status="active")
        cls.tenant_b = Tenant.objects.create(code="TEST-B", name="Tenant B", status="active")
        
        cls.user_a = User.objects.create_user(email="a@example.invalid", password="TestPass123!", full_name="A")
        cls.user_b = User.objects.create_user(email="b@example.invalid", password="TestPass123!", full_name="B")

        for tenant, user, code in ((cls.tenant_a, cls.user_a, "A"), (cls.tenant_b, cls.user_b, "B")):
            with transaction.atomic():
                set_current_tenant(tenant.id, local=True)
                company = Company.objects.create(tenant=tenant, code=f"C-{code}", legal_name=f"Company {code}", is_primary=True)
                
                # Create a base account for each tenant
                Account.objects.create(
                    tenant=tenant,
                    company=company,
                    code="1000",
                    name=f"Assets {code}",
                    account_type="asset",
                    normal_balance="debit",
                    is_posting=False,
                    status="active"
                )
                
                membership = TenantMembership.objects.create(tenant=tenant, user=user, status="active")
                role = Role.objects.create(tenant=tenant, key="admin", name="Admin", status="active")
                RolePermission.objects.create(tenant=tenant, role=role, permission=cls.view_perm)
                RolePermission.objects.create(tenant=tenant, role=role, permission=cls.manage_perm)
                MembershipRole.objects.create(tenant=tenant, membership=membership, role=role)

    def token(self, user):
        return str(RefreshToken.for_user(user).access_token)

    def test_tenant_a_sees_only_tenant_a_accounts(self):
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token(self.user_a)}", HTTP_X_TENANT_ID=str(self.tenant_a.id))
        response = client.get("/api/v1/finance/accounts/")
        self.assertEqual(response.status_code, 200)
        results = response.json()["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["code"], "1000")
        self.assertIn("Assets A", results[0]["name"])

    def test_cannot_create_account_for_another_tenant_company(self):
        with transaction.atomic():
            set_current_tenant(self.tenant_b.id, local=True)
            company_b = Company.objects.get(code="C-B")
            
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token(self.user_a)}", HTTP_X_TENANT_ID=str(self.tenant_a.id))
        
        response = client.post("/api/v1/finance/accounts/", {
            "company": str(company_b.id),
            "code": "1001",
            "name": "Illegal",
            "account_type": "asset",
            "normal_balance": "debit"
        })
        self.assertEqual(response.status_code, 400)
        self.assertIn("company", response.json())

    def test_parent_must_belong_to_same_company(self):
        with transaction.atomic():
            set_current_tenant(self.tenant_a.id, local=True)
            company_a = Company.objects.get(code="C-A")
            company_a2 = Company.objects.create(tenant=self.tenant_a, code="C-A2", legal_name="Company A2")
            account_a = Account.objects.get(code="1000", company=company_a)
            
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token(self.user_a)}", HTTP_X_TENANT_ID=str(self.tenant_a.id))
        
        response = client.post("/api/v1/finance/accounts/", {
            "company": str(company_a2.id),
            "parent": str(account_a.id),
            "code": "1001",
            "name": "Invalid Parent",
            "account_type": "asset",
            "normal_balance": "debit"
        })
        self.assertEqual(response.status_code, 400)
        self.assertIn("parent", response.json())

    def test_database_rls_filters_accounts(self):
        with transaction.atomic():
            set_current_tenant(self.tenant_a.id, local=True)
            with connection.cursor() as cursor:
                cursor.execute("SELECT code FROM finance_accounts")
                rows = [row[0] for row in cursor.fetchall()]
        self.assertEqual(rows, ["1000"])

    def test_cannot_delete_account(self):
        with transaction.atomic():
            set_current_tenant(self.tenant_a.id, local=True)
            account = Account.objects.get(code="1000")
            
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token(self.user_a)}", HTTP_X_TENANT_ID=str(self.tenant_a.id))
        
        response = client.delete(f"/api/v1/finance/accounts/{account.id}/")
        self.assertEqual(response.status_code, 405) # Hard delete disabled in viewset
