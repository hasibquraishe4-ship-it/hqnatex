from django.core.management.base import (
    BaseCommand,
    CommandError,
)


class Command(BaseCommand):
    help = (
        "RETIRED legacy HQNATEX FULL-02 catalog seeder. "
        "It must not be used because it contains the obsolete "
        "pre-final service catalog."
    )

    def handle(self, *args, **options):
        raise CommandError(
            "RETIRED_SEEDER: seed_full02 is permanently disabled. "
            "The current HQNATEX catalog baseline is the final "
            "64-service catalog. New services must be created "
            "dynamically through the Catalog UI/API or the "
            "final baseline seeder."
        )
