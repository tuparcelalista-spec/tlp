#!/usr/bin/env bash
set -euo pipefail

OUTDIR="${1:-./backups/tpl-market}"
STAMP="$(date +%Y%m%d-%H%M%S)"
TARGET="$OUTDIR/tpl-market-$STAMP"

mkdir -p "$TARGET/migrations"

echo "Creando backup en $TARGET"

supabase db dump --linked --data-only --schema public --file "$TARGET/public-data.sql"
supabase db dump --linked --schema public --file "$TARGET/public-schema.sql"

cp supabase/migrations/*.sql "$TARGET/migrations/" 2>/dev/null || true

echo "Backup completado: $TARGET"
