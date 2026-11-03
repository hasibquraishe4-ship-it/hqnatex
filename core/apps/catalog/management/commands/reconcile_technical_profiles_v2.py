from django.core.management.base import (
    BaseCommand,
    CommandError,
)
from django.db import (
    connection,
    transaction,
)

from apps.catalog.models import (
    Service,
    ServiceTechnicalField,
    ServiceTechnicalProfile,
)
from apps.catalog.technical_profile_v2 import (
    RETIRED_SERVICE_CODES,
    SERVICE_TECH_FAMILY_V2,
    TECH_PROFILES_V2,
)
from apps.customers.models import (
    CustomerServiceTechnicalValue,
)
from apps.tenancy.models import Tenant


class Command(BaseCommand):
    help = (
        "Dry-run or reconcile the explicit HQNATEX "
        "Technical Profile V2 baseline."
    )

    def add_arguments(
        self,
        parser,
    ):
        parser.add_argument(
            "--tenant-code",
            required=True,
        )

        parser.add_argument(
            "--apply",
            action="store_true",
            help=(
                "Apply changes. Without this flag "
                "the command is read-only."
            ),
        )

    def handle(
        self,
        *args,
        **options,
    ):
        tenant_code = options[
            "tenant_code"
        ]

        apply_changes = bool(
            options["apply"]
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

        with connection.cursor() as cursor:
            cursor.execute(
                (
                    "SELECT set_config("
                    "'app.current_tenant_id', "
                    "%s, false)"
                ),
                [
                    str(
                        tenant.id
                    )
                ],
            )

        services = {
            service.code: service
            for service in (
                Service.objects
                .filter(
                    tenant=tenant,
                    status="active",
                )
                .select_related(
                    "category",
                )
            )
        }

        mapped_codes = set(
            SERVICE_TECH_FAMILY_V2
        )

        if len(mapped_codes) != 64:
            raise CommandError(
                "V2 baseline map must contain "
                "exactly 64 service codes."
            )

        retired_in_map = sorted(
            mapped_codes
            & RETIRED_SERVICE_CODES
        )

        if retired_in_map:
            raise CommandError(
                "Retired service codes exist "
                f"in V2 map: {retired_in_map}"
            )

        missing_baseline = sorted(
            mapped_codes
            - set(services)
        )

        custom_active = sorted(
            set(services)
            - mapped_codes
        )

        missing_families = sorted(
            {
                family
                for family
                in SERVICE_TECH_FAMILY_V2
                .values()
                if family
                not in TECH_PROFILES_V2
            }
        )

        if missing_families:
            raise CommandError(
                "Missing profile definitions: "
                f"{missing_families}"
            )

        self.stdout.write(
            f"TENANT={tenant.code}"
        )

        self.stdout.write(
            f"MODE="
            f"{'APPLY' if apply_changes else 'DRY_RUN'}"
        )

        self.stdout.write(
            f"ACTIVE_SERVICES="
            f"{len(services)}"
        )

        self.stdout.write(
            f"BASELINE_MAP_COUNT="
            f"{len(mapped_codes)}"
        )

        self.stdout.write(
            f"MISSING_BASELINE_CODES="
            f"{missing_baseline}"
        )

        self.stdout.write(
            f"CUSTOM_ACTIVE_SERVICES="
            f"{custom_active}"
        )

        self.stdout.write(
            f"TECH_FAMILY_COUNT="
            f"{len(TECH_PROFILES_V2)}"
        )

        if missing_baseline:
            raise CommandError(
                "One or more final baseline "
                "services are missing."
            )

        customer_value_rows = (
            CustomerServiceTechnicalValue
            .objects
            .filter(
                tenant=tenant,
                customer_service__service__code__in=(
                    mapped_codes
                ),
            )
            .count()
        )

        self.stdout.write(
            "CUSTOMER_TECHNICAL_VALUE_ROWS="
            f"{customer_value_rows}"
        )

        if (
            apply_changes
            and customer_value_rows
            != 0
        ):
            raise CommandError(
                "Apply blocked because customer "
                "technical-value rows exist. "
                "This construction-time command "
                "does not rewrite live customer "
                "technical history."
            )

        changed_services = []
        profile_mismatch = []
        field_mismatch = []

        expected_active_field_total = 0

        for code in sorted(
            mapped_codes
        ):
            service = services[
                code
            ]

            family = (
                SERVICE_TECH_FAMILY_V2[
                    code
                ]
            )

            spec = (
                TECH_PROFILES_V2[
                    family
                ]
            )

            target_fields = {
                row[0]
                for row
                in spec["fields"]
            }

            expected_active_field_total += (
                len(
                    target_fields
                )
            )

            active_profiles = list(
                ServiceTechnicalProfile
                .objects
                .filter(
                    tenant=tenant,
                    service=service,
                    status="active",
                )
            )

            active_families = []

            for profile in active_profiles:
                metadata = (
                    profile.metadata
                    if isinstance(
                        profile.metadata,
                        dict,
                    )
                    else {}
                )

                active_families.append(
                    metadata.get(
                        "technology_family"
                    )
                )

            current_fields = set(
                ServiceTechnicalField
                .objects
                .filter(
                    tenant=tenant,
                    service=service,
                    status="active",
                )
                .values_list(
                    "key",
                    flat=True,
                )
            )

            profile_ok = (
                len(
                    active_profiles
                )
                == 1
                and active_families
                == [family]
                and bool(
                    active_profiles[0]
                    .is_default
                )
            )

            fields_ok = (
                current_fields
                == target_fields
            )

            if not profile_ok:
                profile_mismatch.append(
                    code
                )

            if not fields_ok:
                field_mismatch.append(
                    code
                )

            if (
                not profile_ok
                or not fields_ok
            ):
                changed_services.append(
                    code
                )

            missing_fields = sorted(
                target_fields
                - current_fields
            )

            extra_fields = sorted(
                current_fields
                - target_fields
            )

            self.stdout.write("")
            self.stdout.write(
                "SERVICE="
                f"{code}"
                " | "
                f"{service.name_english}"
            )

            self.stdout.write(
                "CURRENT_FAMILY="
                f"{active_families}"
            )

            self.stdout.write(
                "TARGET_FAMILY="
                f"{family}"
            )

            self.stdout.write(
                "CURRENT_FIELD_COUNT="
                f"{len(current_fields)}"
            )

            self.stdout.write(
                "TARGET_FIELD_COUNT="
                f"{len(target_fields)}"
            )

            self.stdout.write(
                "MISSING_FIELDS="
                f"{missing_fields}"
            )

            self.stdout.write(
                "EXTRA_FIELDS="
                f"{extra_fields}"
            )

        self.stdout.write("")
        self.stdout.write(
            "PROFILE_MISMATCH_COUNT="
            f"{len(profile_mismatch)}"
        )

        self.stdout.write(
            "PROFILE_MISMATCH_CODES="
            f"{profile_mismatch}"
        )

        self.stdout.write(
            "FIELD_MISMATCH_COUNT="
            f"{len(field_mismatch)}"
        )

        self.stdout.write(
            "FIELD_MISMATCH_CODES="
            f"{field_mismatch}"
        )

        self.stdout.write(
            "SERVICES_REQUIRING_CHANGE="
            f"{changed_services}"
        )

        self.stdout.write(
            "EXPECTED_ACTIVE_FIELD_TOTAL="
            f"{expected_active_field_total}"
        )

        if not apply_changes:
            self.stdout.write(
                self.style.SUCCESS(
                    "TECH_PROFILE_V2_DRY_RUN=PASS"
                )
            )

            self.stdout.write(
                "DATABASE_CHANGED=NO"
            )

            return

        with transaction.atomic():

            for code in sorted(
                mapped_codes
            ):
                service = services[
                    code
                ]

                family = (
                    SERVICE_TECH_FAMILY_V2[
                        code
                    ]
                )

                spec = (
                    TECH_PROFILES_V2[
                        family
                    ]
                )

                target_keys = [
                    row[0]
                    for row
                    in spec["fields"]
                ]

                (
                    ServiceTechnicalProfile
                    .objects
                    .filter(
                        tenant=tenant,
                        service=service,
                    )
                    .update(
                        is_default=False,
                    )
                )

                profile, _ = (
                    ServiceTechnicalProfile
                    .objects
                    .update_or_create(
                        tenant=tenant,
                        service=service,
                        name=spec[
                            "name"
                        ],
                        version="v2.0",
                        defaults={
                            "status":
                                "active",
                            "is_default":
                                True,
                            "metadata": {
                                "technology_family":
                                    family,
                                "profile_catalog":
                                    "HQNATEX_V2",
                            },
                        },
                    )
                )

                (
                    ServiceTechnicalProfile
                    .objects
                    .filter(
                        tenant=tenant,
                        service=service,
                    )
                    .exclude(
                        pk=profile.pk,
                    )
                    .update(
                        status="inactive",
                        is_default=False,
                    )
                )

                (
                    ServiceTechnicalField
                    .objects
                    .filter(
                        tenant=tenant,
                        service=service,
                        status="active",
                    )
                    .exclude(
                        key__in=target_keys,
                    )
                    .update(
                        status="inactive",
                    )
                )

                for (
                    key,
                    label_en,
                    label_da,
                    label_ps,
                    field_type,
                    required,
                    field_options,
                    sort_order,
                ) in spec["fields"]:

                    (
                        ServiceTechnicalField
                        .objects
                        .update_or_create(
                            tenant=tenant,
                            service=service,
                            key=key,
                            defaults={
                                "technical_profile":
                                    profile,
                                "label_english":
                                    label_en,
                                "label_dari":
                                    label_da,
                                "label_pashto":
                                    label_ps,
                                "field_type":
                                    field_type,
                                "required":
                                    required,
                                "options":
                                    field_options,
                                "sort_order":
                                    sort_order,
                                "status":
                                    "active",
                            },
                        )
                    )

        self.stdout.write(
            self.style.SUCCESS(
                "TECH_PROFILE_V2_APPLY=PASS"
            )
        )
