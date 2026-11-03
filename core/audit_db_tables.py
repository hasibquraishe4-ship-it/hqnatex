import os
import django
from django.db import connection

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

with connection.cursor() as cursor:
    # List all tables
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
    """)
    tables = [row[0] for row in cursor.fetchall()]
    print(f"TOTAL_TABLES: {len(tables)}")
    for table in tables:
        print(f"TABLE: {table}")

    # List RLS policies
    print("\nRLS_POLICIES:")
    cursor.execute("SELECT tablename, policyname, roles, cmd, qual FROM pg_policies WHERE schemaname = 'public'")
    for row in cursor.fetchall():
        print(f"Table: {row[0]}, Policy: {row[1]}, Roles: {row[2]}, Cmd: {row[3]}, Qual: {row[4]}")

    # List Foreign Keys
    print("\nFOREIGN_KEYS:")
    cursor.execute("""
        SELECT
            tc.table_name, 
            kcu.column_name, 
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name 
        FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema='public'
    """)
    for row in cursor.fetchall():
        print(f"FK: {row[0]}.{row[1]} -> {row[2]}.{row[3]}")
