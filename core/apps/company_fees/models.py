import uuid
from django.utils import timezone
from django.db.models import Q, F
from django.db import models
from apps.common.models import UUIDTimestampModel
from apps.tenancy.models import Tenant
from apps.companies.models import Company

class FeeType(UUIDTimestampModel):
    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name='fee_types')
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name='fee_types')
    name = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=18, decimal_places=2)

    class Meta:
        db_table = 'fee_types'
        unique_together = ('tenant', 'company', 'name')
