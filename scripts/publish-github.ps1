# Crea repo GitHub e push (dopo gh auth login)
$ErrorActionPreference = "Stop"
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

Set-Location $PSScriptRoot\..

gh auth status | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Autenticati con: gh auth login --hostname github.com --git-protocol https --web"
  exit 1
}

gh repo create danielegalmax/preventivoai-desktop --private --source=. --remote=origin --push
