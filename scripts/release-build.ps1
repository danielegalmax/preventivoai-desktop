# Build release Windows con artefatti updater firmati.
# Prerequisito: chiave in %USERPROFILE%\.tauri\preventivoai-desktop.key

$ErrorActionPreference = "Stop"
$KeyPath = Join-Path $env:USERPROFILE ".tauri\preventivoai-desktop.key"

if (-not (Test-Path $KeyPath)) {
  Write-Error "Chiave non trovata: $KeyPath`nGenera con: npm run tauri signer generate -- -w `"$KeyPath`" -f --ci"
}

$env:TAURI_SIGNING_PRIVATE_KEY_PATH = $KeyPath
npm run tauri:build

Write-Host ""
Write-Host "Artefatti in src-tauri\target\release\bundle\"
Write-Host "Genera latest.json con:"
Write-Host "  npm run updater:manifest -- <versione> `"Note release`" https://github.com/danielegalmax/preventivoai-desktop/releases/download/v<versione>"
