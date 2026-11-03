from __future__ import annotations

import json
from datetime import date
from decimal import Decimal
from pathlib import Path

from django.core.management.base import (
    BaseCommand,
    CommandError,
)
from django.db import transaction

from apps.catalog.models import (
    Package,
    PackagePrice,
    Service,
    ServiceCategory,
)
from apps.common.tenant import (
    set_current_tenant,
)
from apps.tenancy.models import Tenant


BASELINE_FILE = (
    Path(__file__)
    .resolve()
    .parents[2]
    / "data"
    / "final_catalog_baseline.json"
)


def decimal_or_none(value):
    if value in (
        None,
        "",
    ):
        return None

    return Decimal(
        str(value)
    )


class Command(BaseCommand):
    help = (
        "Seed the HQNATEX final dynamic ISP "
        "catalog baseline. Existing services and "
        "packages are preserved and never "
        "overwritten or deleted."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--tenant-code",
            required=True,
        )

        parser.add_argument(
            "--dry-run",
            action="store_true",
        )

    def handle(
        self,
        *args,
        **options,
    ):
        tenant_code = (
            options[
                "tenant_code"
            ].strip()
        )

        dry_run = bool(
            options["dry_run"]
        )

        if not BASELINE_FILE.exists():
            raise CommandError(
                "Baseline file not found: "
                f"{BASELINE_FILE}"
            )

        data = json.loads(
            BASELINE_FILE.read_text(
                encoding="utf-8"
            )
        )

        services_data = data.get(
            "services",
            [],
        )

        packages_data = data.get(
            "packages",
            [],
        )

        categories_data = data.get(
            "categories",
            [],
        )

        prices_data = data.get(
            "prices",
            [],
        )

        if len(
            services_data
        ) != 64:
            raise CommandError(
                "Baseline certification failed: "
                "expected 64 services."
            )

        if len(
            packages_data
        ) != 396:
            raise CommandError(
                "Baseline certification failed: "
                "expected 396 packages."
            )

        tenant = (
            Tenant.objects
            .filter(
                code=tenant_code,
            )
            .first()
        )

        if tenant is None:
            raise CommandError(
                f"Tenant not found: "
                f"{tenant_code}"
            )

        with transaction.atomic():
            set_current_tenant(
                tenant.id,
                local=True,
            )

            existing_service_codes = set(
                Service.objects
                .filter(
                    tenant=tenant,
                )
                .values_list(
                    "code",
                    flat=True,
                )
            )

            existing_package_codes = set(
                Package.objects
                .filter(
                    tenant=tenant,
                )
                .values_list(
                    "code",
                    flat=True,
                )
            )

            baseline_service_codes = {
                row["code"]
                for row
                in services_data
            }

            baseline_package_codes = {
                row["code"]
                for row
                in packages_data
            }

            missing_service_codes = (
                baseline_service_codes
                - existing_service_codes
            )

            missing_package_codes = (
                baseline_package_codes
                - existing_package_codes
            )

            custom_services = (
                existing_service_codes
                - baseline_service_codes
            )

            custom_packages = (
                existing_package_codes
                - baseline_package_codes
            )

            self.stdout.write(
                "================================"
            )

            self.stdout.write(
                "HQNATEX_DYNAMIC_CATALOG_BASELINE"
            )

            self.stdout.write(
                "================================"
            )

            self.stdout.write(
                "TENANT="
                + tenant.code
            )

            self.stdout.write(
                "BASELINE_SERVICES="
                + str(
                    len(
                        services_data
                    )
                )
            )

            self.stdout.write(
                "BASELINE_PACKAGES="
                + str(
                    len(
                        packages_data
                    )
                )
            )

            self.stdout.write(
                "EXISTING_CUSTOM_SERVICES="
                + str(
                    len(
                        custom_services
                    )
                )
            )

            self.stdout.write(
                "EXISTING_CUSTOM_PACKAGES="
                + str(
                    len(
                        custom_packages
                    )
                )
            )

            self.stdout.write(
                "MISSING_BASELINE_SERVICES="
                + str(
                    len(
                        missing_service_codes
                    )
                )
            )

            self.stdout.write(
                "MISSING_BASELINE_PACKAGES="
                + str(
                    len(
                        missing_package_codes
                    )
                )
            )

            if dry_run:
                self.stdout.write(
                    "DRY_RUN=YES"
                )

                self.stdout.write(
                    "DATABASE_CHANGED=NO"
                )

                self.stdout.write(
                    "EXISTING_RECORDS_OVERWRITTEN=0"
                )

                self.stdout.write(
                    "CUSTOM_RECORDS_DELETED=0"
                )

                return

            category_map = {}

            for row in categories_data:
                category = (
                    ServiceCategory.objects
                    .filter(
                        tenant=tenant,
                        code=row["code"],
                    )
                    .first()
                )

                if category is None:
                    category = (
                        ServiceCategory.objects
                        .create(
                            tenant=tenant,
                            code=row["code"],
                            name_english=row[
                                "name_english"
                            ],
                            name_dari=row.get(
                                "name_dari",
                                "",
                            ),
                            name_pashto=row.get(
                                "name_pashto",
                                "",
                            ),
                            status=row.get(
                                "status",
                                "active",
                            ),
                        )
                    )

                category_map[
                    row["code"]
                ] = category

            service_map = {}

            created_services = 0
            preserved_services = 0

            for row in services_data:
                service = (
                    Service.objects
                    .filter(
                        tenant=tenant,
                        code=row["code"],
                    )
                    .first()
                )

                if service is None:
                    category = (
                        category_map[
                            row[
                                "category_code"
                            ]
                        ]
                    )

                    service = (
                        Service.objects
                        .create(
                            tenant=tenant,
                            category=category,
                            code=row[
                                "code"
                            ],
                            name_english=row[
                                "name_english"
                            ],
                            name_dari=row.get(
                                "name_dari",
                                "",
                            ),
                            name_pashto=row.get(
                                "name_pashto",
                                "",
                            ),
                            status=row.get(
                                "status",
                                "active",
                            ),
                            translation_status=(
                                row.get(
                                    "translation_status",
                                    "pending",
                                )
                            ),
                            pricing_model=row.get(
                                "pricing_model",
                                "",
                            ),
                            technical_summary=(
                                row.get(
                                    "technical_summary",
                                    "",
                                )
                            ),
                            supports_equipment=(
                                row.get(
                                    "supports_equipment"
                                )
                            ),
                            supports_noc=(
                                row.get(
                                    "supports_noc"
                                )
                            ),
                            capabilities=(
                                row.get(
                                    "capabilities",
                                    {},
                                )
                            ),
                            source_status=(
                                row.get(
                                    "source_status",
                                    "baseline",
                                )
                            ),
                        )
                    )

                    created_services += 1

                else:
                    preserved_services += 1

                service_map[
                    row["code"]
                ] = service

            package_map = {}

            created_packages = 0
            preserved_packages = 0

            for row in packages_data:
                package = (
                    Package.objects
                    .filter(
                        tenant=tenant,
                        code=row["code"],
                    )
                    .first()
                )

                if package is None:
                    service = (
                        service_map[
                            row[
                                "service_code"
                            ]
                        ]
                    )

                    package = (
                        Package.objects
                        .create(
                            tenant=tenant,
                            service=service,
                            code=row[
                                "code"
                            ],
                            name_english=row[
                                "name_english"
                            ],
                            name_dari=row.get(
                                "name_dari",
                                "",
                            ),
                            name_pashto=row.get(
                                "name_pashto",
                                "",
                            ),
                            package_type=row[
                                "package_type"
                            ],
                            speed_mbps=(
                                decimal_or_none(
                                    row.get(
                                        "speed_mbps"
                                    )
                                )
                            ),
                            quota_gb=(
                                decimal_or_none(
                                    row.get(
                                        "quota_gb"
                                    )
                                )
                            ),
                            period_months=row.get(
                                "period_months",
                                1,
                            ),
                            status=row.get(
                                "status",
                                "active",
                            ),
                            metadata=row.get(
                                "metadata",
                                {},
                            ),
                        )
                    )

                    created_packages += 1

                else:
                    preserved_packages += 1

                package_map[
                    row["code"]
                ] = package

            created_prices = 0
            preserved_prices = 0

            for row in prices_data:
                package = package_map.get(
                    row[
                        "package_code"
                    ]
                )

                if package is None:
                    continue

                effective_from = (
                    date.fromisoformat(
                        row[
                            "effective_from"
                        ]
                    )
                )

                existing_price = (
                    PackagePrice.objects
                    .filter(
                        tenant=tenant,
                        package=package,
                        effective_from=(
                            effective_from
                        ),
                    )
                    .first()
                )

                if existing_price:
                    preserved_prices += 1
                    continue

                effective_to = None

                if row.get(
                    "effective_to"
                ):
                    effective_to = (
                        date.fromisoformat(
                            row[
                                "effective_to"
                            ]
                        )
                    )

                PackagePrice.objects.create(
                    tenant=tenant,
                    package=package,
                    amount=Decimal(
                        str(
                            row["amount"]
                        )
                    ),
                    currency=row.get(
                        "currency",
                        "AFN",
                    ),
                    effective_from=(
                        effective_from
                    ),
                    effective_to=(
                        effective_to
                    ),
                    status=row.get(
                        "status",
                        "active",
                    ),
                    source_note=row.get(
                        "source_note",
                        "",
                    ),
                )

                created_prices += 1

            self.stdout.write(
                "CREATED_SERVICES="
                + str(
                    created_services
                )
            )

            self.stdout.write(
                "PRESERVED_EXISTING_SERVICES="
                + str(
                    preserved_services
                )
            )

            self.stdout.write(
                "CREATED_PACKAGES="
                + str(
                    created_packages
                )
            )

            self.stdout.write(
                "PRESERVED_EXISTING_PACKAGES="
                + str(
                    preserved_packages
                )
            )

            self.stdout.write(
                "CREATED_PRICES="
                + str(
                    created_prices
                )
            )

            self.stdout.write(
                "PRESERVED_EXISTING_PRICES="
                + str(
                    preserved_prices
                )
            )

            self.stdout.write(
                "CUSTOM_SERVICES_DELETED=0"
            )

            self.stdout.write(
                "CUSTOM_PACKAGES_DELETED=0"
            )

            self.stdout.write(
                "EXISTING_SERVICES_OVERWRITTEN=0"
            )

            self.stdout.write(
                "EXISTING_PACKAGES_OVERWRITTEN=0"
            )

            self.stdout.write(
                self.style.SUCCESS(
                    "FINAL_DYNAMIC_CATALOG_"
                    "BASELINE_SEED=PASS"
                )
            )
