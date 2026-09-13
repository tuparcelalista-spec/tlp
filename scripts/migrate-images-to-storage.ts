import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Script autónomo para migrar las imágenes legacy de frontend-v2/image
 * hacia Supabase Storage con normalización de rutas (eliminación de espacios,
 * tildes y caracteres especiales) y generación de sentencias SQL idempotentes.
 *
 * Uso:
 *   npx tsx scripts/migrate-images-to-storage.ts
 *   npx tsx scripts/migrate-images-to-storage.ts --execute (si se tienen credenciales)
 */

const SUPABASE_PROJECT_REF = "hwyscirbycojwndyzozn";
const SUPABASE_BUCKET = "tpl-propiedades-propietario";
const PUBLIC_BASE_URL = `https://${SUPABASE_PROJECT_REF}.supabase.co/storage/v1/object/public/${SUPABASE_BUCKET}`;

const SOURCE_DIR = path.resolve(process.cwd(), "frontend-v2", "image");
const OUTPUT_SQL = path.resolve(
  process.cwd(),
  "supabase",
  "migrations",
  "20260913100000_tpl_migracion_imagenes_storage_v1.sql"
);

function slugifyFileName(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  const base = path.basename(fileName, ext);
  const clean = base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remover tildes
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_") // reemplazar espacios y caracteres raros
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `${clean}${ext}`;
}

function slugifyRelativePath(relPath: string): string {
  const parts = relPath.split(/[/\\]/);
  const cleanedParts = parts.map((part, idx) => {
    if (idx === parts.length - 1) {
      return slugifyFileName(part);
    }
    return part
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");
  });
  return cleanedParts.join("/");
}

function getAllFiles(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, fileList);
    } else {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

export async function runMigration() {
  console.log("=================================================");
  console.log("   TPL — Migración de Imágenes a Supabase Storage ");
  console.log("=================================================");
  console.log(`Buscando imágenes en: ${SOURCE_DIR}`);

  const allFiles = getAllFiles(SOURCE_DIR);
  console.log(`Total de archivos encontrados: ${allFiles.length}`);

  const mappings: Array<{
    absolutePath: string;
    originalRelativePath: string;
    cleanedRelativePath: string;
    publicUrl: string;
  }> = [];

  for (const file of allFiles) {
    const relPath = path.relative(SOURCE_DIR, file).replace(/\\/g, "/");
    const cleanedPath = slugifyRelativePath(relPath);
    const storagePath = `legacy/${cleanedPath}`;
    const publicUrl = `${PUBLIC_BASE_URL}/${storagePath}`;

    mappings.push({
      absolutePath: file,
      originalRelativePath: relPath,
      cleanedRelativePath: storagePath,
      publicUrl,
    });
  }

  // Generar sentencias SQL para tpl_propiedad_imagenes
  let sqlContent = `-- Migración generada automáticamente por scripts/migrate-images-to-storage.ts
-- Actualiza las filas de tpl_propiedad_imagenes para apuntar al bucket público de Supabase Storage
-- eliminando la dependencia del servidor legacy y normalizando nombres de archivo.

begin;

`;

  for (const m of mappings) {
    const legacyPattern = `%${m.originalRelativePath}%`;
    sqlContent += `update public.tpl_propiedad_imagenes
  set url = '${m.publicUrl}',
      storage_path = '${m.cleanedRelativePath}'
  where (url ilike '${legacyPattern}' or storage_path ilike '${legacyPattern}');

`;
  }

  sqlContent += `commit;
`;

  fs.writeFileSync(OUTPUT_SQL, sqlContent, "utf-8");
  console.log(`✓ Archivo de migración SQL generado exitosamente en:\n  ${OUTPUT_SQL}`);

  console.log("\nResumen de saneamiento de nombres de archivo:");
  const withSpaces = mappings.filter((m) => m.originalRelativePath.includes(" "));
  console.log(`- Archivos que tenían espacios en el nombre original: ${withSpaces.length}`);
  if (withSpaces.length > 0) {
    console.log("  Ejemplos corregidos:");
    for (const sample of withSpaces.slice(0, 5)) {
      console.log(`    Antes: "${sample.originalRelativePath}"`);
      console.log(`    Ahora: "${sample.cleanedRelativePath}"`);
    }
  }

  console.log("\n=================================================");
  console.log("Instrucciones de ejecución en Supabase:");
  console.log("1. Asegurarse de que el bucket 'tpl-propiedades-propietario' sea público.");
  console.log("2. Subir la carpeta 'legacy/' generada al bucket de Supabase Storage.");
  console.log("3. Ejecutar la migración SQL en el editor SQL de Supabase.");
  console.log("=================================================");
}

if (process.argv[1]?.includes("migrate-images")) {
  void runMigration();
}
