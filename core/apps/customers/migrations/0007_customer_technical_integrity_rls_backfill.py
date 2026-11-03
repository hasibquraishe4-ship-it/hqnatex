from django.db import migrations


FORWARD_SQL = r"""
CREATE OR REPLACE FUNCTION hq_customer_technical_value_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    cs_tenant uuid;
    cs_company uuid;
    cs_service uuid;

    tf_tenant uuid;
    tf_service uuid;
    tf_key varchar(100);
BEGIN
    SELECT tenant_id, company_id, service_id
      INTO cs_tenant, cs_company, cs_service
      FROM customers_customer_services
     WHERE id = NEW.customer_service_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'customer technical value: customer service not found';
    END IF;

    SELECT tenant_id, service_id, key
      INTO tf_tenant, tf_service, tf_key
      FROM catalog_service_technical_fields
     WHERE id = NEW.technical_field_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'customer technical value: technical field not found';
    END IF;

    IF NEW.tenant_id IS DISTINCT FROM cs_tenant THEN
        RAISE EXCEPTION
            'customer technical value tenant mismatch';
    END IF;

    IF NEW.company_id IS DISTINCT FROM cs_company THEN
        RAISE EXCEPTION
            'customer technical value company mismatch';
    END IF;

    IF tf_tenant IS DISTINCT FROM cs_tenant THEN
        RAISE EXCEPTION
            'customer technical field tenant mismatch';
    END IF;

    IF tf_service IS DISTINCT FROM cs_service THEN
        RAISE EXCEPTION
            'customer technical field service mismatch';
    END IF;

    IF TG_OP = 'INSERT'
       OR NEW.technical_field_id IS DISTINCT FROM OLD.technical_field_id
    THEN
        NEW.key_snapshot := tf_key;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hq_customer_technical_value_scope_trg
ON customers_customer_service_technical_values;

CREATE TRIGGER hq_customer_technical_value_scope_trg
BEFORE INSERT OR UPDATE
ON customers_customer_service_technical_values
FOR EACH ROW
EXECUTE FUNCTION hq_customer_technical_value_scope();


INSERT INTO customers_customer_service_technical_values
(
    id,
    created_at,
    updated_at,
    tenant_id,
    company_id,
    customer_service_id,
    technical_field_id,
    key_snapshot,
    value,
    status
)
SELECT
    md5(
        cs.id::text
        || ':'
        || tf.id::text
    )::uuid,
    NOW(),
    NOW(),
    cs.tenant_id,
    cs.company_id,
    cs.id,
    tf.id,
    tf.key,
    kv.value,
    'active'
FROM customers_customer_services cs
CROSS JOIN LATERAL jsonb_each(
    COALESCE(
        cs.technical_values,
        '{}'::jsonb
    )
) AS kv(key, value)
JOIN catalog_service_technical_fields tf
  ON tf.tenant_id = cs.tenant_id
 AND tf.service_id = cs.service_id
 AND tf.key = kv.key
 AND tf.status = 'active'
ON CONFLICT (
    tenant_id,
    customer_service_id,
    technical_field_id
)
DO NOTHING;

"""


REVERSE_SQL = r"""
DROP TRIGGER IF EXISTS hq_customer_technical_value_scope_trg
ON customers_customer_service_technical_values;

DROP FUNCTION IF EXISTS hq_customer_technical_value_scope();
"""


class Migration(migrations.Migration):

    dependencies = [
        (
            "customers",
            "0006_customerservicetechnicalvalue",
        ),
    ]

    operations = [
        migrations.RunSQL(
            FORWARD_SQL,
            reverse_sql=REVERSE_SQL,
        ),
    ]
