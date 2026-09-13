/**
 * Tests puros de `wizardState.ts` — sin `@tpl/core` en tiempo de ejecución,
 * sin React. Mismo mecanismo simple ya establecido:
 *
 *   npx tsc --module commonjs --moduleResolution node --target es2020 \
 *     --esModuleInterop --skipLibCheck --outDir <dir-temporal> \
 *     apps/publico/lib/publicar/__tests__/wizardState.test.ts
 *   node <dir-temporal>/__tests__/wizardState.test.js
 */
import assert from "node:assert/strict";
import {
  INITIAL_PUBLISH_WIZARD_STATE,
  validatePublishStep,
  buildPublishWhatsAppMessage,
  buildPublicarPropiedadPayload,
  parseCLPInput,
  formatPriceCLP,
  PUBLISH_PLANS,
  type PublishWizardFormState,
} from "../wizardState";

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

function form(overrides: Partial<PublishWizardFormState> = {}): PublishWizardFormState {
  return { ...INITIAL_PUBLISH_WIZARD_STATE, ...overrides };
}

// --- parseCLPInput / formatPriceCLP ---
test("parseCLPInput: '45.000.000' -> 45000000", () => {
  assert.equal(parseCLPInput("45.000.000"), 45000000);
});
test("parseCLPInput: '' -> undefined (no inventa 0)", () => {
  assert.equal(parseCLPInput(""), undefined);
});
test("formatPriceCLP: null/undefined -> undefined", () => {
  assert.equal(formatPriceCLP(null), undefined);
  assert.equal(formatPriceCLP(undefined), undefined);
});

// --- validatePublishStep ---
test("paso 1: sin región falla con mensaje específico", () => {
  const r = validatePublishStep(1, form());
  assert.equal(r.ok, false);
  assert.match(r.mensaje ?? "", /región/i);
});
test("paso 1: con región pero sin comuna falla", () => {
  const r = validatePublishStep(1, form({ regionCode: "CL-BI" }));
  assert.equal(r.ok, false);
  assert.match(r.mensaje ?? "", /comuna/i);
});
test("paso 1: con región/comuna pero sin marcar el mapa falla", () => {
  const r = validatePublishStep(1, form({ regionCode: "CL-BI", comuna: "Yumbel" }));
  assert.equal(r.ok, false);
  assert.match(r.mensaje ?? "", /mapa/i);
});
test("paso 1: completo (región+comuna+lat/lng) pasa", () => {
  const r = validatePublishStep(1, form({ regionCode: "CL-BI", comuna: "Yumbel", lat: -37.1, lng: -72.6 }));
  assert.equal(r.ok, true);
});
test("paso 1: lat/lng en 0,0 (Golfo de Guinea) NO se confunde con 'sin marcar' — 0 es una coordenada válida", () => {
  const r = validatePublishStep(1, form({ regionCode: "CL-BI", comuna: "Yumbel", lat: 0, lng: 0 }));
  assert.equal(r.ok, true);
});

test("paso 2: sin superficie falla", () => {
  const r = validatePublishStep(2, form());
  assert.equal(r.ok, false);
  assert.match(r.mensaje ?? "", /superficie/i);
});
test("paso 2: superficie '0' no es válida (no se puede publicar un terreno de 0 m²)", () => {
  const r = validatePublishStep(2, form({ superficieM2Text: "0" }));
  assert.equal(r.ok, false);
});
test("paso 2: falta rol/agua/luz uno por uno", () => {
  assert.match(validatePublishStep(2, form({ superficieM2Text: "5000" })).mensaje ?? "", /rol/i);
  assert.match(validatePublishStep(2, form({ superficieM2Text: "5000", rolPropio: "si" })).mensaje ?? "", /agua/i);
  assert.match(validatePublishStep(2, form({ superficieM2Text: "5000", rolPropio: "si", agua: "pozo" })).mensaje ?? "", /eléctric/i);
});
test("paso 2: completo pasa", () => {
  const r = validatePublishStep(2, form({ superficieM2Text: "5000", rolPropio: "si", agua: "pozo", luz: "red" }));
  assert.equal(r.ok, true);
});

test("paso 3: sin precio falla", () => {
  const r = validatePublishStep(3, form());
  assert.equal(r.ok, false);
});
test("paso 3: precio válido pasa", () => {
  const r = validatePublishStep(3, form({ precioEsperadoText: "45000000" }));
  assert.equal(r.ok, true);
});

test("paso 4 (Contacto): sin nombre falla", () => {
  const r = validatePublishStep(4, form());
  assert.equal(r.ok, false);
  assert.match(r.mensaje ?? "", /nombre/i);
});
test("paso 4 (Contacto): con nombre pero sin teléfono ni correo válido falla", () => {
  const r = validatePublishStep(4, form({ contactoNombre: "Juan Pérez" }));
  assert.equal(r.ok, false);
  assert.match(r.mensaje ?? "", /teléfono|correo/i);
});
test("paso 4 (Contacto): nombre + teléfono válido pasa", () => {
  const r = validatePublishStep(4, form({ contactoNombre: "Juan Pérez", contactoTelefono: "+56912345678" }));
  assert.equal(r.ok, true);
});
test("paso 4 (Contacto): nombre + correo válido (sin teléfono) también pasa", () => {
  const r = validatePublishStep(4, form({ contactoNombre: "Juan Pérez", contactoCorreo: "juan@correo.cl" }));
  assert.equal(r.ok, true);
});

test("paso 5: siempre pasa (solo selección de plan, sin campos propios)", () => {
  assert.equal(validatePublishStep(5, form()).ok, true);
});

// --- buildPublishWhatsAppMessage ---
test("mensaje de WhatsApp incluye comuna, región, superficie, agua, luz, rol, precio, coordenadas y plan", () => {
  const f = form({
    regionCode: "CL-BI",
    comuna: "Yumbel",
    sector: "Camino interior",
    lat: -37.12345,
    lng: -72.65432,
    superficieM2Text: "5.000",
    rolPropio: "si",
    agua: "pozo",
    luz: "red",
    precioEsperadoText: "45000000",
  });
  const mensaje = buildPublishWhatsAppMessage(f, "Yumbel", "Región del Biobío", PUBLISH_PLANS[1]!);

  assert.match(mensaje, /Yumbel, Región del Biobío/);
  assert.match(mensaje, /Camino interior/);
  assert.match(mensaje, /5\.000 m²/);
  assert.match(mensaje, /Rol propio: Sí/);
  assert.match(mensaje, /Agua: Pozo/);
  assert.match(mensaje, /Luz: Red eléctrica/);
  assert.match(mensaje, /\$45\.000\.000/);
  assert.match(mensaje, /-37\.12345, -72\.65432/);
  assert.match(mensaje, /Plan Destacado \(\$120\.000\)/);
});

test("mensaje de WhatsApp: campos vacíos/opcionales (sector, precio, nombre) no dejan huecos ni texto roto", () => {
  const f = form({ comuna: "Yumbel", lat: -37.1, lng: -72.6, rolPropio: "no", agua: "apr", luz: "paneles" });
  const mensaje = buildPublishWhatsAppMessage(f, "Yumbel", "", PUBLISH_PLANS[0]!);
  assert.ok(!mensaje.includes("undefined"));
  assert.ok(!mensaje.includes("null"));
  assert.ok(!mensaje.includes("Soy ."));
  assert.match(mensaje, /Plan Básico \(\$50\.000\)/);
});

test("mensaje de WhatsApp: incluye el nombre de contacto cuando está presente", () => {
  const f = form({ comuna: "Yumbel", contactoNombre: "Juan Pérez" });
  const mensaje = buildPublishWhatsAppMessage(f, "Yumbel", "", PUBLISH_PLANS[0]!);
  assert.match(mensaje, /Soy Juan Pérez\./);
});

test("mensaje de WhatsApp: incluye el código de propiedad cuando la publicación ya se guardó", () => {
  const f = form({ comuna: "Yumbel" });
  const mensaje = buildPublishWhatsAppMessage(f, "Yumbel", "", PUBLISH_PLANS[0]!, "TPL-ABC12345");
  assert.match(mensaje, /Código de mi publicación: TPL-ABC12345\./);
});

// --- buildPublicarPropiedadPayload ---
test("payload de publicación: mapea tipo, ubicación, superficie/precio y contacto tal como los espera tpl_publicar_propiedad_v3", () => {
  const f = form({
    tipoPropiedad: "casa_con_terreno",
    comuna: "Yumbel",
    sector: "Camino interior",
    lat: -37.1,
    lng: -72.6,
    superficieM2Text: "5.000",
    precioEsperadoText: "45.000.000",
    rolPropio: "si",
    agua: "pozo",
    luz: "red",
    contactoNombre: "Juan Pérez",
    contactoTelefono: "+56912345678",
    contactoCorreo: "juan@correo.cl",
  });
  const payload = buildPublicarPropiedadPayload(f, "Yumbel", "Región del Biobío") as any;

  assert.equal(payload.tipo, "casa_con_terreno");
  assert.equal(payload.region, "Región del Biobío");
  assert.equal(payload.comuna, "Yumbel");
  assert.equal(payload.localidad, "Camino interior");
  assert.equal(payload.superficie, 5000);
  assert.equal(payload.precio, 45000000);
  assert.deepEqual(payload.coords, { lat: -37.1, lng: -72.6 });
  assert.equal(payload.terreno.rol, "Sí");
  assert.equal(payload.terreno.agua, "Pozo");
  assert.equal(payload.terreno.luz, "Red eléctrica");
  assert.equal(payload.contacto.nombre, "Juan Pérez");
  assert.equal(payload.contacto.telefono, "+56912345678");
  assert.equal(payload.contacto.email, "juan@correo.cl");
  assert.equal(payload.contacto.responsable, "propietario");
});

test("payload de publicación: sin título propio, arma uno legible con tipo + comuna", () => {
  const f = form({ tipoPropiedad: "parcela", contactoNombre: "Juan Pérez" });
  const payload = buildPublicarPropiedadPayload(f, "Yumbel", "Región del Biobío") as any;
  assert.equal(payload.titulo, "Parcela en Yumbel");
});

test("payload de publicación: con título propio, se respeta tal cual", () => {
  const f = form({ titulo: "Hermosa parcela con vista al valle", contactoNombre: "Juan Pérez" });
  const payload = buildPublicarPropiedadPayload(f, "Yumbel", "Región del Biobío") as any;
  assert.equal(payload.titulo, "Hermosa parcela con vista al valle");
});

console.log(`\n${passed} ok, ${failed} fallidos.`);
if (failed > 0) process.exitCode = 1;
