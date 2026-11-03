from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    dependencies = [("network_access", "0001_initial")]

    operations = [
        migrations.CreateModel(
            name="SubscriberRouterBinding",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("allowed_mac", models.CharField(max_length=32)),
                ("status", models.CharField(default="active", max_length=16)),
                ("approved_at", models.DateTimeField(blank=True, null=True)),
                ("removed_at", models.DateTimeField(blank=True, null=True)),
                ("notes", models.TextField(blank=True)),
                ("customer_service", models.OneToOneField(on_delete=django.db.models.deletion.PROTECT, related_name="router_binding", to="customers.customerservice")),
                ("device", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="subscriber_bindings", to="network_access.managednetworkdevice")),
            ],
            options={"db_table": "network_access_subscriber_router_bindings"},
        ),
        migrations.CreateModel(
            name="SubscriberDevice",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("mac_address", models.CharField(max_length=32)),
                ("hostname", models.CharField(blank=True, max_length=255)),
                ("device_type", models.CharField(blank=True, max_length=64)),
                ("ip_address", models.GenericIPAddressField(blank=True, null=True)),
                ("first_seen_at", models.DateTimeField(blank=True, null=True)),
                ("last_seen_at", models.DateTimeField(blank=True, null=True)),
                ("status", models.CharField(default="observed", max_length=16)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("customer_service", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="network_devices", to="customers.customerservice")),
            ],
            options={"db_table": "network_access_subscriber_devices"},
        ),
        migrations.CreateModel(
            name="RadiusSession",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("username", models.CharField(max_length=255)),
                ("session_id", models.CharField(max_length=255)),
                ("nas_ip_address", models.GenericIPAddressField(blank=True, null=True)),
                ("framed_ip_address", models.GenericIPAddressField(blank=True, null=True)),
                ("calling_station_id", models.CharField(blank=True, max_length=64)),
                ("started_at", models.DateTimeField(blank=True, null=True)),
                ("ended_at", models.DateTimeField(blank=True, null=True)),
                ("input_octets", models.BigIntegerField(default=0)),
                ("output_octets", models.BigIntegerField(default=0)),
                ("status", models.CharField(default="online", max_length=16)),
                ("customer_service", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="radius_sessions", to="customers.customerservice")),
            ],
            options={"db_table": "network_access_radius_sessions"},
        ),
        migrations.CreateModel(
            name="ActivationAuditLog",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("action", models.CharField(max_length=32)),
                ("result", models.CharField(max_length=16)),
                ("details", models.JSONField(blank=True, default=dict)),
                ("customer_service", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="activation_audit_logs", to="customers.customerservice")),
                ("requested_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="iam.user")),
            ],
            options={"db_table": "network_access_activation_audit_logs"},
        ),
        migrations.AddField(model_name="subscriberrouterbinding", name="tenant", field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="subscriber_router_bindings", to="tenancy.tenant")),
        migrations.AddField(model_name="subscriberrouterbinding", name="company", field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="subscriber_router_bindings", to="companies.company")),
        migrations.AddField(model_name="subscriberdevice", name="tenant", field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="subscriber_devices", to="tenancy.tenant")),
        migrations.AddField(model_name="subscriberdevice", name="company", field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="subscriber_devices", to="companies.company")),
        migrations.AddField(model_name="radiussession", name="tenant", field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="radius_sessions", to="tenancy.tenant")),
        migrations.AddField(model_name="radiussession", name="company", field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="radius_sessions", to="companies.company")),
        migrations.AddField(model_name="activationauditlog", name="tenant", field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="activation_audit_logs", to="tenancy.tenant")),
        migrations.AddField(model_name="activationauditlog", name="company", field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="activation_audit_logs", to="companies.company")),
    ]
