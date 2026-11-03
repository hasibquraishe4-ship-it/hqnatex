import os
import django
from django.db import connection

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

tables = [
    "customers_customer_services",
    "customers_service_status_history",
    "customers_service_package_history",
    "customers_service_change_requests",
    "noc_customer_service_resources",
]

with connection.cursor() as cursor:
    for table in tables:
        print(f"Checking table: {table}")
        cursor.execute(f"SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = '{table}' AND column_name = 'company_id'")
        row = cursor.fetchone()
        if row:
            print(f"  {row[0]}: is_nullable = {row[1]}")
        else:
            print(f"  company_id NOT FOUND in {table}")

    print("\nChecking RLS Policies:")
    cursor.execute("SELECT tablename, policyname, roles, cmd, qual FROM pg_policies WHERE schemaname = 'public'")
    for row in cursor.fetchall():
        print(f"Table: {row[0]}, Policy: {row[1]}, Roles: {row[2]}, Cmd: {row[3]}, Qual: {row[4]}")
