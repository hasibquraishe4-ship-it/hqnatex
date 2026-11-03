import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("finance", "0003_finance_accounts_company_rls"),
        ("treasury", "0003_wave2_scope_rls"),
    ]

    operations = [
        migrations.AddField(
            model_name="cashbankaccount",
            name="account_type",
            field=models.CharField(
                choices=[
                    ("cash", "Cash"),
                    ("bank", "Bank"),
                ],
                max_length=16,
            ),
        ),
        migrations.AddField(
            model_name="cashbankaccount",
            name="gl_account",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="cash_bank_accounts",
                to="finance.account",
            ),
        ),
        migrations.AddField(
            model_name="cashbankaccount",
            name="is_active",
            field=models.BooleanField(
                default=True,
            ),
        ),
    ]
