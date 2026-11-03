from .runtime import current_database_alias

PLATFORM_ONLY_APPS = {"platform_tenancy_v3"}

class HQNATEXTenantDatabaseRouter:
    def db_for_read(self, model, **hints):
        if model._meta.app_label in PLATFORM_ONLY_APPS:
            return "default"
        return current_database_alias()

    def db_for_write(self, model, **hints):
        if model._meta.app_label in PLATFORM_ONLY_APPS:
            return "default"
        return current_database_alias()

    def allow_relation(self, obj1, obj2, **hints):
        db1=getattr(obj1._state,"db",None); db2=getattr(obj2._state,"db",None)
        if db1 and db2: return db1==db2
        return None

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        if db=="default": return True
        if app_label in PLATFORM_ONLY_APPS: return False
        return True
