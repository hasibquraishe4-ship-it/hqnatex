import uuid
import django.db.models.deletion
from django.db import migrations, models
from django.db.models import Q

RLS_FORWARD = r'''
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'network_access_company_policies',
    'network_access_address_rules',
    'network_access_vpn_profiles',
    'network_access_devices',
    'network_access_api_clients',
    'network_access_integrations',
    'network_access_observations'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS network_company_isolation ON %I', t);
    EXECUTE format(
      'CREATE POLICY network_company_isolation ON %I '
      'USING (tenant_id::text = current_setting(''app.current_tenant_id'', true) '
      'AND company_id::text = current_setting(''app.current_company_id'', true)) '
      'WITH CHECK (tenant_id::text = current_setting(''app.current_tenant_id'', true) '
      'AND company_id::text = current_setting(''app.current_company_id'', true))', t
    );
  END LOOP;
END $$;
'''

RLS_REVERSE = r'''
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'network_access_company_policies',
    'network_access_address_rules',
    'network_access_vpn_profiles',
    'network_access_devices',
    'network_access_api_clients',
    'network_access_integrations',
    'network_access_observations'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS network_company_isolation ON %I', t);
    EXECUTE format('ALTER TABLE %I NO FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;
'''

class Migration(migrations.Migration):
    initial = True
    dependencies = [
        ("tenancy","0002_full01_tenant_integrity_rls"),
        ("companies","0001_initial"),
        ("branches","0001_initial"),
        ("noc","0004_company_scope_finalize"),
    ]
    operations = [
        migrations.CreateModel(
            name="CompanyNetworkPolicy",
            fields=[
                ("id",models.UUIDField(default=uuid.uuid4,editable=False,primary_key=True,serialize=False)),
                ("created_at",models.DateTimeField(auto_now_add=True)),
                ("updated_at",models.DateTimeField(auto_now=True)),
                ("ui_access_mode",models.CharField(choices=[("off","Off"),("allowlist","Allowlist"),("vpn_only","VPN Only")],default="off",max_length=16)),
                ("api_access_mode",models.CharField(choices=[("off","Off"),("allowlist","Allowlist"),("vpn_only","VPN Only")],default="off",max_length=16)),
                ("status",models.CharField(default="active",max_length=16)),
                ("notes",models.TextField(blank=True)),
                ("live_activation_enabled",models.BooleanField(default=False,editable=False)),
                ("device_write_enabled",models.BooleanField(default=False,editable=False)),
                ("company",models.OneToOneField(on_delete=django.db.models.deletion.PROTECT,related_name="network_access_policy",to="companies.company")),
                ("tenant",models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="network_access_policies",to="tenancy.tenant")),
            ], options={"db_table":"network_access_company_policies"},
        ),
        migrations.CreateModel(
            name="NetworkAddressRule",
            fields=[
                ("id",models.UUIDField(default=uuid.uuid4,editable=False,primary_key=True,serialize=False)),
                ("created_at",models.DateTimeField(auto_now_add=True)),
                ("updated_at",models.DateTimeField(auto_now=True)),
                ("label",models.CharField(max_length=160)),("cidr",models.CharField(max_length=64)),
                ("rule_type",models.CharField(choices=[("allow","Allowed"),("block","Blocked"),("office","Office"),("branch","Branch"),("api","API"),("device","Device"),("public","Public"),("private","Private")],max_length=16)),
                ("purpose",models.CharField(blank=True,max_length=255)),("status",models.CharField(default="active",max_length=16)),
                ("valid_from",models.DateTimeField(blank=True,null=True)),("valid_to",models.DateTimeField(blank=True,null=True)),
                ("metadata",models.JSONField(blank=True,default=dict)),
                ("branch",models.ForeignKey(blank=True,null=True,on_delete=django.db.models.deletion.PROTECT,related_name="network_address_rules",to="branches.branch")),
                ("company",models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="network_address_rules",to="companies.company")),
                ("tenant",models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="network_address_rules",to="tenancy.tenant")),
            ], options={"db_table":"network_access_address_rules","ordering":["label","cidr"]},
        ),
        migrations.CreateModel(
            name="VPNProfile",
            fields=[
                ("id",models.UUIDField(default=uuid.uuid4,editable=False,primary_key=True,serialize=False)),
                ("created_at",models.DateTimeField(auto_now_add=True)),("updated_at",models.DateTimeField(auto_now=True)),
                ("name",models.CharField(max_length=160)),("cidr",models.CharField(max_length=64)),("gateway",models.CharField(blank=True,max_length=255)),
                ("provider",models.CharField(blank=True,max_length=160)),("tunnel_type",models.CharField(choices=[("ipsec","IPsec"),("wireguard","WireGuard"),("openvpn","OpenVPN"),("mpls","MPLS / Private WAN"),("private","Private Network"),("other","Other")],default="private",max_length=24)),
                ("secret_ref",models.CharField(blank=True,max_length=255)),("status",models.CharField(default="active",max_length=16)),
                ("metadata",models.JSONField(blank=True,default=dict)),
                ("branch",models.ForeignKey(blank=True,null=True,on_delete=django.db.models.deletion.PROTECT,related_name="vpn_profiles",to="branches.branch")),
                ("company",models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="vpn_profiles",to="companies.company")),
                ("tenant",models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="vpn_profiles",to="tenancy.tenant")),
            ], options={"db_table":"network_access_vpn_profiles","ordering":["name"]},
        ),
        migrations.CreateModel(
            name="ManagedNetworkDevice",
            fields=[
                ("id",models.UUIDField(default=uuid.uuid4,editable=False,primary_key=True,serialize=False)),
                ("created_at",models.DateTimeField(auto_now_add=True)),("updated_at",models.DateTimeField(auto_now=True)),
                ("code",models.CharField(max_length=100)),("name",models.CharField(max_length=255)),
                ("device_type",models.CharField(choices=[("router","Router"),("radius","RADIUS"),("nas","NAS"),("olt","OLT"),("dslam","DSLAM"),("switch","Switch"),("firewall","Firewall"),("server","Server"),("access_point","Access Point"),("other","Other")],max_length=24)),
                ("management_ip",models.CharField(blank=True,max_length=64)),("vendor",models.CharField(blank=True,max_length=120)),
                ("model",models.CharField(blank=True,max_length=120)),("serial_number",models.CharField(blank=True,max_length=160)),
                ("access_mode",models.CharField(choices=[("config_only","Configuration Only"),("read_only","Read Only")],default="config_only",max_length=16)),
                ("secret_ref",models.CharField(blank=True,max_length=255)),("status",models.CharField(default="active",max_length=16)),
                ("last_known_state",models.CharField(blank=True,max_length=32)),("last_seen_at",models.DateTimeField(blank=True,null=True)),
                ("metadata",models.JSONField(blank=True,default=dict)),
                ("branch",models.ForeignKey(blank=True,null=True,on_delete=django.db.models.deletion.PROTECT,related_name="managed_network_devices",to="branches.branch")),
                ("company",models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="managed_network_devices",to="companies.company")),
                ("network_resource",models.ForeignKey(blank=True,null=True,on_delete=django.db.models.deletion.PROTECT,related_name="managed_device_records",to="noc.networkresource")),
                ("tenant",models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="managed_network_devices",to="tenancy.tenant")),
            ], options={"db_table":"network_access_devices","ordering":["device_type","code"]},
        ),
        migrations.CreateModel(
            name="APIClientRegistry",
            fields=[
                ("id",models.UUIDField(default=uuid.uuid4,editable=False,primary_key=True,serialize=False)),
                ("created_at",models.DateTimeField(auto_now_add=True)),("updated_at",models.DateTimeField(auto_now=True)),
                ("name",models.CharField(max_length=160)),("client_id",models.CharField(max_length=160)),
                ("key_fingerprint",models.CharField(blank=True,max_length=255)),("secret_ref",models.CharField(blank=True,max_length=255)),
                ("allowed_cidrs",models.JSONField(blank=True,default=list)),("scopes",models.JSONField(blank=True,default=list)),
                ("rate_limit_per_minute",models.PositiveIntegerField(default=60)),("status",models.CharField(default="active",max_length=16)),
                ("expires_at",models.DateTimeField(blank=True,null=True)),("metadata",models.JSONField(blank=True,default=dict)),
                ("company",models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="network_api_clients",to="companies.company")),
                ("tenant",models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="network_api_clients",to="tenancy.tenant")),
            ], options={"db_table":"network_access_api_clients","ordering":["name"]},
        ),
        migrations.CreateModel(
            name="IntegrationEndpoint",
            fields=[
                ("id",models.UUIDField(default=uuid.uuid4,editable=False,primary_key=True,serialize=False)),
                ("created_at",models.DateTimeField(auto_now_add=True)),("updated_at",models.DateTimeField(auto_now=True)),
                ("code",models.CharField(max_length=100)),("name",models.CharField(max_length=255)),
                ("integration_type",models.CharField(choices=[("radius","RADIUS"),("nas","NAS"),("router","Router"),("olt","OLT"),("dslam","DSLAM"),("api","API"),("webhook","Webhook"),("snmp","SNMP"),("other","Other")],max_length=24)),
                ("host",models.CharField(blank=True,max_length=255)),("port",models.PositiveIntegerField(blank=True,null=True)),
                ("base_url",models.URLField(blank=True)),("auth_mode",models.CharField(blank=True,max_length=32)),
                ("secret_ref",models.CharField(blank=True,max_length=255)),("execution_mode",models.CharField(choices=[("config_only","Configuration Only"),("read_only","Read Only")],default="config_only",max_length=16)),
                ("enabled",models.BooleanField(default=False)),("status",models.CharField(default="configured",max_length=16)),
                ("last_checked_at",models.DateTimeField(blank=True,null=True)),("metadata",models.JSONField(blank=True,default=dict)),
                ("branch",models.ForeignKey(blank=True,null=True,on_delete=django.db.models.deletion.PROTECT,related_name="integration_endpoints",to="branches.branch")),
                ("company",models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="integration_endpoints",to="companies.company")),
                ("tenant",models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="integration_endpoints",to="tenancy.tenant")),
            ], options={"db_table":"network_access_integrations","ordering":["integration_type","code"]},
        ),
        migrations.CreateModel(
            name="ConnectivityObservation",
            fields=[
                ("id",models.UUIDField(default=uuid.uuid4,editable=False,primary_key=True,serialize=False)),
                ("created_at",models.DateTimeField(auto_now_add=True)),("updated_at",models.DateTimeField(auto_now=True)),
                ("target",models.CharField(max_length=255)),("observation_type",models.CharField(default="manual",max_length=32)),
                ("status",models.CharField(max_length=32)),("latency_ms",models.DecimalField(blank=True,decimal_places=3,max_digits=12,null=True)),
                ("checked_at",models.DateTimeField()),("details",models.JSONField(blank=True,default=dict)),
                ("company",models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="connectivity_observations",to="companies.company")),
                ("device",models.ForeignKey(blank=True,null=True,on_delete=django.db.models.deletion.PROTECT,related_name="connectivity_observations",to="network_access.managednetworkdevice")),
                ("integration",models.ForeignKey(blank=True,null=True,on_delete=django.db.models.deletion.PROTECT,related_name="connectivity_observations",to="network_access.integrationendpoint")),
                ("tenant",models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="connectivity_observations",to="tenancy.tenant")),
            ], options={"db_table":"network_access_observations","ordering":["-checked_at"]},
        ),
        migrations.AddConstraint(model_name="companynetworkpolicy",constraint=models.UniqueConstraint(fields=("tenant","company"),name="uq_netpolicy_tenant_company")),
        migrations.AddConstraint(model_name="companynetworkpolicy",constraint=models.CheckConstraint(condition=Q(live_activation_enabled=False),name="ck_netpolicy_live_activation_off")),
        migrations.AddConstraint(model_name="companynetworkpolicy",constraint=models.CheckConstraint(condition=Q(device_write_enabled=False),name="ck_netpolicy_device_write_off")),
        migrations.AddIndex(model_name="companynetworkpolicy",index=models.Index(fields=["tenant","company","status"],name="ix_netpolicy_scope_status")),
        migrations.AddConstraint(model_name="networkaddressrule",constraint=models.UniqueConstraint(fields=("tenant","company","cidr","rule_type"),name="uq_netaddr_company_cidr_type")),
        migrations.AddIndex(model_name="networkaddressrule",index=models.Index(fields=["tenant","company","status"],name="ix_netaddr_scope_status")),
        migrations.AddIndex(model_name="networkaddressrule",index=models.Index(fields=["tenant","company","rule_type"],name="ix_netaddr_scope_type")),
        migrations.AddConstraint(model_name="vpnprofile",constraint=models.UniqueConstraint(fields=("tenant","company","name"),name="uq_vpn_company_name")),
        migrations.AddIndex(model_name="vpnprofile",index=models.Index(fields=["tenant","company","status"],name="ix_vpn_scope_status")),
        migrations.AddConstraint(model_name="managednetworkdevice",constraint=models.UniqueConstraint(fields=("tenant","company","code"),name="uq_netdevice_company_code")),
        migrations.AddConstraint(model_name="managednetworkdevice",constraint=models.CheckConstraint(condition=Q(access_mode__in=["config_only","read_only"]),name="ck_netdevice_no_write_mode")),
        migrations.AddIndex(model_name="managednetworkdevice",index=models.Index(fields=["tenant","company","status"],name="ix_netdevice_scope_status")),
        migrations.AddIndex(model_name="managednetworkdevice",index=models.Index(fields=["tenant","company","device_type"],name="ix_netdevice_scope_type")),
        migrations.AddConstraint(model_name="apiclientregistry",constraint=models.UniqueConstraint(fields=("tenant","company","client_id"),name="uq_apiclient_company_id")),
        migrations.AddIndex(model_name="apiclientregistry",index=models.Index(fields=["tenant","company","status"],name="ix_apiclient_scope_status")),
        migrations.AddConstraint(model_name="integrationendpoint",constraint=models.UniqueConstraint(fields=("tenant","company","code"),name="uq_integration_company_code")),
        migrations.AddConstraint(model_name="integrationendpoint",constraint=models.CheckConstraint(condition=Q(execution_mode__in=["config_only","read_only"]),name="ck_integration_no_write_mode")),
        migrations.AddIndex(model_name="integrationendpoint",index=models.Index(fields=["tenant","company","status"],name="ix_integration_scope_status")),
        migrations.AddIndex(model_name="integrationendpoint",index=models.Index(fields=["tenant","company","integration_type"],name="ix_integration_scope_type")),
        migrations.AddIndex(model_name="connectivityobservation",index=models.Index(fields=["tenant","company","checked_at"],name="ix_netobs_scope_time")),
        migrations.AddIndex(model_name="connectivityobservation",index=models.Index(fields=["tenant","company","status"],name="ix_netobs_scope_status")),
        migrations.RunSQL(RLS_FORWARD,RLS_REVERSE),
    ]
