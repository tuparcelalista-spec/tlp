/**
 * Tests puros del resolver de imágenes — Bloque 2.6. Sin `@tpl/core` en
 * tiempo de ejecución (solo tipos) — mecanismo simple establecido:
 *
 *   npx tsc --module commonjs --moduleResolution node --target es2020 \
 *     --esModuleInterop --skipLibCheck --outDir <dir-temporal> \
 *     apps/publico/lib/images/__tests__/resolvePropertyImageUrl.test.ts
 *   node <dir-temporal>/__tests__/resolvePropertyImageUrl.test.js
 *
 * Los casos de rutas con espacios/vacías/absolutas están tomados de la
 * auditoría real del Bloque 2.6 (190 filas de `tpl_propiedad_imagenes`),
 * no son datos inventados.
 */
import assert from "node:assert/strict";
import { resolvePropertyImageUrl, resolvePropertyGallery } from "../resolvePropertyImageUrl";
import type { PropertyImage } from "@tpl/core";

let passed = 0;
let failed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed += 1;
    console.log(`  ok - ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`  FAIL - ${name}`);
    console.error(`    ${error instanceof Error ? error.message : error}`);
  }
}

// Caso A — Storage
test("URL absoluta de Supabase Storage se conserva tal cual", () => {
  const real =
    "https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/fd0f2233-5bb9-4ec4-a046-f551418fe887/17b08230-virquenco_sector_1.webp";
  const result = resolvePropertyImageUrl(real);
  assert.equal(result.url, real);
  assert.equal(result.origin, "storage");
});

// Caso B — legacy (Bloque 3.16: path local same-origin, ver
// `next.config.mjs` — rewrite "/legacy-image/:path*" ->
// "https://www.parcelalista.cl/image/:path*". El dato crudo ya trae el
// prefijo "image/"; se quita para no duplicarlo con el que agrega el
// rewrite en su destino.)
test("ruta legacy sin espacios se resuelve contra el path local /legacy-image (rewrite same-origin)", () => {
  const result = resolvePropertyImageUrl("image/duenos/yumbel/pirigallo/pirigallo_(1).webp");
  assert.equal(result.url, "/legacy-image/duenos/yumbel/pirigallo/pirigallo_(1).webp");
  assert.equal(result.origin, "legacy");
});

test("ruta legacy CON espacios se codifica correctamente (%20, no espacio literal)", () => {
  const result = resolvePropertyImageUrl("image/nipas_venega/nipas_venegas (1).webp");
  assert.equal(result.url, "/legacy-image/nipas_venega/nipas_venegas%20(1).webp");
  assert.equal(result.origin, "legacy");
});

test("ruta legacy con slash inicial no produce doble slash", () => {
  const result = resolvePropertyImageUrl("/image/foo/bar.webp");
  assert.equal(result.url, "/legacy-image/foo/bar.webp");
});

test("los segmentos de carpeta se codifican individualmente (las '/' no se codifican)", () => {
  const result = resolvePropertyImageUrl("image/a b/c d.webp");
  assert.equal(result.url, "/legacy-image/a%20b/c%20d.webp");
});

test("el prefijo 'image/' del dato crudo no se duplica con el del rewrite", () => {
  const result = resolvePropertyImageUrl("image/nacimiento/el_roble.webp");
  assert.ok(!result.url!.includes("/legacy-image/image/"), `no debe duplicar 'image/': ${result.url}`);
  assert.equal(result.url, "/legacy-image/nacimiento/el_roble.webp");
});

// Caso C — missing
test("string vacío produce origin 'missing' y url null, no una URL adivinada", () => {
  const result = resolvePropertyImageUrl("");
  assert.deepEqual(result, { url: null, origin: "missing" });
});

test("null produce origin 'missing'", () => {
  assert.deepEqual(resolvePropertyImageUrl(null), { url: null, origin: "missing" });
});

test("undefined produce origin 'missing'", () => {
  assert.deepEqual(resolvePropertyImageUrl(undefined), { url: null, origin: "missing" });
});

test("solo espacios en blanco produce origin 'missing'", () => {
  assert.deepEqual(resolvePropertyImageUrl("   "), { url: null, origin: "missing" });
});

// Caso externo (defensivo — 0 casos reales hoy, pero no debe romperse)
test("URL absoluta que no es de Storage se conserva con origin 'external'", () => {
  const result = resolvePropertyImageUrl("https://example.com/foto.jpg");
  assert.equal(result.url, "https://example.com/foto.jpg");
  assert.equal(result.origin, "external");
});

// resolvePropertyGallery
test("resolvePropertyGallery preserva alt/isCover/order y resuelve cada url", () => {
  const images: PropertyImage[] = [
    { url: "image/a.webp", alt: "Foto 1", isCover: false, order: 1 },
    { url: "", alt: null, isCover: true, order: 0 },
  ];
  const resolved = resolvePropertyGallery(images);
  assert.equal(resolved[0]!.url, "/legacy-image/a.webp");
  assert.equal(resolved[0]!.alt, "Foto 1");
  assert.equal(resolved[0]!.order, 1);
  assert.equal(resolved[1]!.origin, "missing");
  assert.equal(resolved[1]!.isCover, true);
});

console.log(`\n${passed} ok, ${failed} fallidos.`);
if (failed > 0) process.exitCode = 1;
