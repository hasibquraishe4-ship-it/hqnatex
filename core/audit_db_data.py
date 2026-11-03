import os
import django
from django.db import connection

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

with connection.cursor() as cursor:
    # Users
    cursor.execute("SELECT count(*) FROM iam_users")
    user_count = cursor.fetchone()[0]
    print(f"ACTUAL_USERS: {user_count}")

    # Roles
    cursor.execute("SELECT count(*) FROM iam_roles")
    role_count = cursor.fetchone()[0]
    print(f"ACTUAL_ROLES: {role_count}")

    # Permissions
    cursor.execute("SELECT count(*) FROM iam_permissions")
    perm_count = cursor.fetchone()[0]
    print(f"ACTUAL_PERMISSIONS: {perm_count}")

    # Tenants
    cursor.execute("SELECT count(*) FROM tenancy_tenants")
    tenant_count = cursor.fetchone()[0]
    print(f"ACTUAL_TENANTS: {tenant_count}")

    # Companies
    cursor.execute("SELECT count(*) FROM companies_companies")
    company_count = cursor.fetchone()[0]
    print(f"ACTUAL_COMPANIES: {company_count}")

    # Check for RLS being active on connections
    cursor.execute("SHOW row_security")
    row_security = cursor.fetchone()[0]
    print(f"PG_ROW_SECURITY: {row_security}")

    # Check current setting for tenant_id (should be empty in default session)
    try:
        cursor.execute("SELECT current_setting('app.current_tenant_id', true)")
        setting = cursor.fetchone()[0]
        print(f"CURRENT_TENANT_ID_SETTING: '{setting}'")
    except Exception as e:
        print(f"CURRENT_TENANT_ID_SETTING: ERROR {e}")
