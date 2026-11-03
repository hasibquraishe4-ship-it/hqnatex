import os
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.catalog.models import Service, ServiceTechnicalProfile, ServiceTechnicalField

from apps.catalog.technical_profile_legacy_definitions import TECH_PROFILES_DEF

class Command(BaseCommand):
    help = "RETIRED: use reconcile_technical_profiles_v2 instead"

    def handle(self, *args, **options):

        # HQNATEX_LEGACY_TECH_PROFILE_SEEDER_RETIRED
        #
        # This legacy substring/category-based seeder is intentionally
        # blocked because it can assign semantically incorrect profiles
        # to the final ISP service catalog.
        #
        # Keep TECH_PROFILES_DEF importable because Technical Profile V2
        # currently reuses validated legacy family definitions.
        from django.core.management.base import CommandError

        raise CommandError(
            "seed_technical_profiles is retired. "
            "Use reconcile_technical_profiles_v2 instead."
        )

        from django.db import connection
        from apps.tenancy.models import Tenant

        self.stdout.write("Starting ISP Technical Profiles & Fields Seeding...")

        tenants = list(Tenant.objects.filter(status="active"))
        self.stdout.write(f"Total active tenants found: {len(tenants)}")

        total_matched_services = 0
        total_profiles_created = 0
        total_fields_created = 0

        for tenant in tenants:
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT set_config('app.current_tenant_id', %s, false)",
                    [str(tenant.id)],
                )

            services = list(
                Service.objects.filter(tenant=tenant).select_related("category")
            )
            if not services:
                continue

            with transaction.atomic():
                for service in services:
                    code_lower = service.code.lower()
                    name_lower = service.name_english.lower()
                    cat_lower = service.category.code.lower() if service.category else ""

                    matched_family = None
                    for family_key, family_spec in TECH_PROFILES_DEF.items():
                        for pattern in family_spec["patterns"]:
                            if pattern in code_lower or pattern in name_lower or pattern in cat_lower:
                                matched_family = (family_key, family_spec)
                                break
                        if matched_family:
                            break

                    if not matched_family:
                        matched_family = ("FIBER", TECH_PROFILES_DEF["FIBER"])

                    family_key, family_spec = matched_family
                    total_matched_services += 1

                    # Create or update ServiceTechnicalProfile
                    profile, created_p = ServiceTechnicalProfile.objects.update_or_create(
                        tenant=tenant,
                        service=service,
                        name=family_spec["name"],
                        version="v1.0",
                        defaults={
                            "status": "active",
                            "is_default": True,
                            "metadata": {"technology_family": family_key},
                        }
                    )
                    if created_p:
                        total_profiles_created += 1

                    # Create or update fields for this profile
                    for f_key, f_en, f_da, f_ps, f_type, f_req, f_opts, f_sort in family_spec["fields"]:
                        field_obj, created_f = ServiceTechnicalField.objects.update_or_create(
                            tenant=tenant,
                            service=service,
                            key=f_key,
                            defaults={
                                "technical_profile": profile,
                                "label_english": f_en,
                                "label_dari": f_da,
                                "label_pashto": f_ps,
                                "field_type": f_type,
                                "required": f_req,
                                "options": f_opts,
                                "sort_order": f_sort,
                                "status": "active",
                            }
                        )
                        if created_f:
                            total_fields_created += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully processed {total_matched_services} services: created/updated {total_profiles_created} profiles and {total_fields_created} technical fields across {len(tenants)} tenants!"
            )
        )
