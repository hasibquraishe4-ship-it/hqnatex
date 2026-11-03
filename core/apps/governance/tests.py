from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

from django.db import close_old_connections, transaction
from django.test import TransactionTestCase
from rest_framework.exceptions import ValidationError

from apps.companies.models import Company
from apps.platform_tenancy_v3.rls import set_rls_context
from apps.tenancy.models import Tenant

from .models import NumberingSeries
from .services import allocate_number


class NumberingSeriesServiceTests(TransactionTestCase):

    def _company(self, tenant, code):
        with transaction.atomic():
            set_rls_context("default", tenant.id, None)
            return Company.objects.create(
                tenant=tenant,
                code=code,
                legal_name=f"Company {code}",
                is_primary=True,
            )

    def _series(
        self,
        tenant,
        company,
        *,
        key="invoice",
        prefix="INV-",
        next_number=1,
        padding=6,
        is_active=True,
    ):
        with transaction.atomic():
            set_rls_context(
                "default",
                tenant.id,
                company.id,
            )

            return NumberingSeries.objects.create(
                tenant=tenant,
                company=company,
                series_key=key,
                prefix=prefix,
                next_number=next_number,
                padding=padding,
                is_active=is_active,
            )

    def _read_series(self, tenant, company, key):
        with transaction.atomic():
            set_rls_context(
                "default",
                tenant.id,
                company.id,
            )

            return NumberingSeries.objects.get(
                tenant=tenant,
                company=company,
                series_key=key,
            )

    def setUp(self):
        self.tenant_a = Tenant.objects.create(
            code="NUM-A",
            name="Numbering Tenant A",
            status="active",
        )

        self.company_a = self._company(
            self.tenant_a,
            "NUM-A",
        )

    def test_allocate_number_formats_and_increments(self):
        self._series(
            self.tenant_a,
            self.company_a,
            key="invoice",
            prefix="INV-",
            next_number=42,
            padding=6,
        )

        first = allocate_number(
            tenant_id=self.tenant_a.id,
            company_id=self.company_a.id,
            series_key="invoice",
        )

        second = allocate_number(
            tenant_id=self.tenant_a.id,
            company_id=self.company_a.id,
            series_key="invoice",
        )

        self.assertEqual(first, "INV-000042")
        self.assertEqual(second, "INV-000043")

        row = self._read_series(
            self.tenant_a,
            self.company_a,
            "invoice",
        )

        self.assertEqual(row.next_number, 44)

    def test_allocate_without_prefix(self):
        self._series(
            self.tenant_a,
            self.company_a,
            key="journal",
            prefix=None,
            next_number=7,
            padding=4,
        )

        value = allocate_number(
            tenant_id=self.tenant_a.id,
            company_id=self.company_a.id,
            series_key="journal",
        )

        self.assertEqual(value, "0007")

    def test_inactive_series_is_rejected(self):
        self._series(
            self.tenant_a,
            self.company_a,
            key="receipt",
            is_active=False,
        )

        with self.assertRaises(ValidationError):
            allocate_number(
                tenant_id=self.tenant_a.id,
                company_id=self.company_a.id,
                series_key="receipt",
            )

    def test_missing_series_is_rejected(self):
        with self.assertRaises(ValidationError):
            allocate_number(
                tenant_id=self.tenant_a.id,
                company_id=self.company_a.id,
                series_key="missing",
            )

    def test_tenant_company_scopes_have_independent_sequences(self):
        tenant_b = Tenant.objects.create(
            code="NUM-B",
            name="Numbering Tenant B",
            status="active",
        )

        company_b = self._company(
            tenant_b,
            "NUM-B",
        )

        self._series(
            self.tenant_a,
            self.company_a,
            key="invoice",
            prefix="A-",
            next_number=1,
            padding=3,
        )

        self._series(
            tenant_b,
            company_b,
            key="invoice",
            prefix="B-",
            next_number=10,
            padding=3,
        )

        value_a = allocate_number(
            tenant_id=self.tenant_a.id,
            company_id=self.company_a.id,
            series_key="invoice",
        )

        value_b = allocate_number(
            tenant_id=tenant_b.id,
            company_id=company_b.id,
            series_key="invoice",
        )

        self.assertEqual(value_a, "A-001")
        self.assertEqual(value_b, "B-010")

    def test_concurrent_allocation_does_not_duplicate_numbers(self):
        self._series(
            self.tenant_a,
            self.company_a,
            key="invoice",
            prefix="INV-",
            next_number=1,
            padding=6,
        )

        barrier = Barrier(2)

        def worker():
            close_old_connections()

            try:
                barrier.wait()

                return allocate_number(
                    tenant_id=self.tenant_a.id,
                    company_id=self.company_a.id,
                    series_key="invoice",
                )
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=2) as executor:
            results = list(
                executor.map(
                    lambda _: worker(),
                    range(2),
                )
            )

        self.assertEqual(
            sorted(results),
            [
                "INV-000001",
                "INV-000002",
            ],
        )

        row = self._read_series(
            self.tenant_a,
            self.company_a,
            "invoice",
        )

        self.assertEqual(row.next_number, 3)
