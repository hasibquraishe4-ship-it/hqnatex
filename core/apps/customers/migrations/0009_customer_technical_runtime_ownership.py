from django.db import migrations


FORWARD_SQL = """
ALTER TABLE customers_customer_service_technical_values
OWNER TO hqnatex_core;

ALTER FUNCTION hq_customer_technical_value_scope()
OWNER TO hqnatex_core;
"""


class Migration(migrations.Migration):

    dependencies = [
        (
            "customers",
            "0008_customer_technical_rls",
        ),
    ]

    operations = [
        migrations.RunSQL(
            FORWARD_SQL,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
