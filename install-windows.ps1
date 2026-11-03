$ErrorActionPreference = 'Stop'
Write-Host 'HQNATEX Windows installer' -ForegroundColor Cyan
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Docker Desktop نصب نیست.' }
docker info *> $null
if ($LASTEXITCODE -ne 0) { throw 'Docker Desktop اجرا نیست.' }
docker compose -f docker-compose.windows.yml up -d --build
if ($LASTEXITCODE -ne 0) { throw 'ساخت یا اجرای سرویس‌ها ناموفق شد.' }
Write-Host 'Frontend: http://localhost:5173' -ForegroundColor Green
Write-Host 'Backend: http://localhost:8000/api/v1/health/live' -ForegroundColor Green
