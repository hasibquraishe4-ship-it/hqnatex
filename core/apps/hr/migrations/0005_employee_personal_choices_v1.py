from django.db import migrations, models


class Migration(migrations.Migration):
    atomic = True

    dependencies = [
        ("hr", "0004_full_hr_payroll_rls_v1"),
    ]

    operations = [
        migrations.AddField(
            model_name="employee",
            name="marital_status",
            field=models.CharField(
                max_length=32,
                blank=True,
                default="",
                choices=[("single", "Single"), ("married", "Married")],
            ),
        ),
        migrations.AlterField(
            model_name="employee",
            name="gender",
            field=models.CharField(
                max_length=32,
                blank=True,
                default="",
                choices=[("مرد", "Male"), ("زن", "Female")],
            ),
        ),
        migrations.AlterField(
            model_name="employee",
            name="employment_status",
            field=models.CharField(
                max_length=32,
                default="active",
                db_index=True,
                choices=[("active", "Active"), ("inactive", "Inactive")],
            ),
        ),
    ]
