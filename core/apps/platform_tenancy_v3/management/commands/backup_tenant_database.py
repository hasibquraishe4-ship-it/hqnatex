import os, shutil, subprocess
from pathlib import Path
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from apps.platform_tenancy_v3.models import TenantDatabase
from apps.platform_tenancy_v3.runtime import secret_from_ref

class Command(BaseCommand):
    help = "Backup one tenant database using pg_dump."

    def add_arguments(self, parser):
        parser.add_argument("db_alias")
        parser.add_argument("--output-dir", default=str(Path.home() / "HQNATEX_BACKUPS"))

    def handle(self, *args, **o):
        pg_dump=shutil.which("pg_dump")
        if not pg_dump:
            raise CommandError("pg_dump not found.")
        reg=TenantDatabase.objects.get(db_alias=o["db_alias"])
        outdir=Path(o["output_dir"]);outdir.mkdir(parents=True,exist_ok=True)
        out=outdir / ("%s_%s.dump" % (reg.db_alias, timezone.now().strftime("%Y%m%d_%H%M%S")))
        env=os.environ.copy();env["PGPASSWORD"]=secret_from_ref(reg.password_secret_ref)
        cmd=[pg_dump,"-Fc","-h",reg.db_host,"-p",str(reg.db_port),"-U",reg.db_user,"-f",str(out),reg.db_name]
        p=subprocess.run(cmd,env=env,text=True,capture_output=True)
        if p.returncode:
            raise CommandError(p.stderr)
        reg.last_backup_at=timezone.now()
        reg.save(update_fields=["last_backup_at","updated_at"])
        self.stdout.write(self.style.SUCCESS(str(out)))
