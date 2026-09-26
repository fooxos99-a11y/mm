# شغّل هذا الملف من داخل مجلد المشروع "ممارس" في PowerShell:
#   powershell -ExecutionPolicy Bypass -File .\finish-sonar-cleanup.ps1
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

# 1) حذف ملفات لم تعد مستخدمة (تحذف من الجهاز ومن Git)
git rm -q --ignore-unmatch -- backend/package.json backend/vite.config.js backend/resources/js/app.js backend/resources/js/bootstrap.js backend/resources/css/app.css backend/database/seeders/E2EAccountSeeder.php

# 2) إخراج الملفات المولّدة من Git (تبقى على جهازك، وصارت داخل .gitignore)
git rm -r -q --cached --ignore-unmatch -- .deploy docs/mobile-audit-2026-09-12/gesture-followup/live frontend/scripts/mobile-audit frontend/gesture-recheck-results frontend/gesture-test-results frontend/webkit-fixes-results
Get-ChildItem frontend -File | Where-Object { $_.Name -match '^mobile-(audit|fixes|gesture|live|webkit)-' } | ForEach-Object { git rm -q --cached --ignore-unmatch -- ("frontend/" + $_.Name) }

# 3) ملفات GitHub Actions المحدثة (ضعها بجانب هذا السكربت داخل مجلد workflows-updated)
if (Test-Path .\workflows-updated) {
  Copy-Item .\workflows-updated\*.yml .\.github\workflows\ -Force
  Remove-Item .\workflows-updated -Recurse -Force
}

# 4) إعداد سونار: الملف موجود على GitHub ولم يُسحب بعد
git pull --rebase --autostash
if (Test-Path .\sonar-project.properties.new) {
  Move-Item .\sonar-project.properties.new .\sonar-project.properties -Force
}

git add -A
git status --short | Select-Object -First 20
Write-Host "جاهز. راجع التغييرات ثم: git commit -m 'Sonar fixes' && git push"
