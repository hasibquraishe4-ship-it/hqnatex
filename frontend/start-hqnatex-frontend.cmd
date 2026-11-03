@echo off
cd /d H:\hqnatex\frontend

"H:\node.exe" "H:\node_modules\npm\bin\npm-cli.js" run dev -- --host 0.0.0.0 > "H:\hqnatex\frontend\frontend-start.log" 2>&1