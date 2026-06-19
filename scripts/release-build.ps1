# Build release Windows con artefatti updater firmati.
# Prerequisito:
#   %USERPROFILE%\.tauri\preventivoai-desktop.key
#   %USERPROFILE%\.tauri\preventivoai-desktop.password

$ErrorActionPreference = "Stop"
$KeyPath = Join-Path $env:USERPROFILE ".tauri\preventivoai-desktop.key"
$PasswordPath = Join-Path $env:USERPROFILE ".tauri\preventivoai-desktop.password"
$ProjectRoot = Split-Path $PSScriptRoot -Parent

if (-not (Test-Path $KeyPath)) {
  Write-Error "Chiave non trovata: $KeyPath"
}
if (-not (Test-Path $PasswordPath)) {
  Write-Error "Password non trovata: $PasswordPath"
}

$env:CI = "true"
$env:CARGO_TARGET_DIR = Join-Path $ProjectRoot "src-tauri\target"
$env:TAURI_SIGNING_PRIVATE_KEY = (Get-Content $KeyPath -Raw).Trim()
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = (Get-Content $PasswordPath -Raw).Trim()

Set-Location $ProjectRoot
npm run tauri:build

Write-Host ""
Write-Host "Artefatti in src-tauri\target\release\bundle\"
Write-Host "Genera latest.json con:"
Write-Host "  npm run updater:manifest -- <versione> `"Note release`" https://github.com/danielegalmax/preventivoai-desktop/releases/download/v<versione>"
