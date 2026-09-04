param(
  [string]$ProjectRef = "",
  [string]$OutDir = ".\backups\tpl-market"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $OutDir)) {
  New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$target = Join-Path $OutDir "tpl-market-$stamp"
New-Item -ItemType Directory -Force -Path $target | Out-Null

Write-Host "Creando backup en $target"

# Requiere tener Supabase CLI logueado y el proyecto linkeado.
supabase db dump --linked --data-only --schema public --file (Join-Path $target "public-data.sql")
supabase db dump --linked --schema public --file (Join-Path $target "public-schema.sql")

Copy-Item ".\supabase\migrations\*.sql" (Join-Path $target "migrations\") -Force -ErrorAction SilentlyContinue

Write-Host "Backup completado:"
Write-Host $target
