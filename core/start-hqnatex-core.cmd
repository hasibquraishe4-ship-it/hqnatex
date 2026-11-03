@echo off
cd /d H:\hqnatex\core

set "HQNATEX_DB_NAME=hqnatex"
set "HQNATEX_DB_USER=hqnatex_app"
set "HQNATEX_DB_PASSWORD=HQ706089#@@"
set "HQNATEX_DB_HOST=127.0.0.1"
set "HQNATEX_DB_PORT=5432"
set "REDIS_URL=redis://127.0.0.1:6379/0"
set "DJANGO_SETTINGS_MODULE=config.settings"

"C:\Users\Hasib Quraishe\AppData\Local\Programs\Python\Python313\python.exe" manage.py runserver 0.0.0.0:8000