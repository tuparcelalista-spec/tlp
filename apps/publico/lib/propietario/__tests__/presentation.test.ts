/**
 * Tests puros de `toOwnerPortalViewModel()` — Fase 4, Paso 1. Sin
 * `@tpl/core` en tiempo de ejecución (solo el tipo importado en
 * `actions.ts`, no aquí) — mismo mecanismo simple ya establecido:
 *
 *   npx tsc --module commonjs --moduleResolution node --target es2020 \
 *     --esModuleInterop --skipLibCheck --outDir <dir-temporal> \
 *     apps/publico/lib/propietario/__tests__/presentation.test.ts
 *   node <dir-temporal>/__tests__/presentation.test.js
 *
 * Los shapes de `raw` están tomados de la definición real del RPC
 * (`supabase/migrations/202608050013_tpl_tasador_canonico_mi_propiedad_v1.sql`)
 * y de los fallbacks reales de `frontend-v2/plataforma/propietario/js/app.js`
 * / `mi-parcela.js` — no son datos inventados.
 */
import assert from "node:assert/strict";
import { toOwnerPortalViewModel, type RawOwnerResumenResponse, type RawOwnerResumenSuccess } from "../presentation";

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

function baseRaw(overrides: Partial<RawOwnerResumenSuccess> = {}): RawOwnerResumenSuccess {
  return {
    ok: true,
    expires_at: "2026-10-01T00:00:00Z",
    propiedad: {
      id: "prop-1",
      codigo: "el_roble",
      titulo: "El Roble Nativo",
      region: "Biobío",
      comuna: "Nacimiento",
      sector: "El Roble",
      superficie_m2: 5000,
      precio_publicado: 6690000,
      estado: "publicada",
      propietario_contacto: { nombre: "Juan Pérez" },
      updated_at: "2026-09-01T00:00:00Z",
    },
    tasacion: {},
    ...overrides,
  };
}

test("ok:false (token inválido/vencido) devuelve null, no lanza", () => {
  const raw: RawOwnerResumenResponse = { ok: false, error: "ENLACE_INVALIDO_O_VENCIDO" };
  assert.equal(toOwnerPortalViewModel(raw), null);
});

test("null/undefined de entrada devuelve null (fallo de red, no de la RPC)", () => {
  assert.equal(toOwnerPortalViewModel(null), null);
  assert.equal(toOwnerPortalViewModel(undefined), null);
});

test("mapea campos básicos de la propiedad", () => {
  const vm = toOwnerPortalViewModel(baseRaw());
  assert.ok(vm);
  assert.equal(vm!.propiedad.codigo, "el_roble");
  assert.equal(vm!.propiedad.titulo, "El Roble Nativo");
  assert.equal(vm!.propiedad.comuna, "Nacimiento");
  assert.equal(vm!.propiedad.region, "Biobío");
  assert.equal(vm!.propiedad.sector, "El Roble");
  assert.equal(vm!.propiedad.superficieM2, 5000);
  assert.equal(vm!.propiedad.precioPublicado, 6690000);
  assert.equal(vm!.expiresAt, "2026-10-01T00:00:00Z");
});

test("título ausente cae en 'Tu propiedad', no en un string vacío", () => {
  const vm = toOwnerPortalViewModel(baseRaw({ propiedad: { ...baseRaw().propiedad, titulo: null } as never }));
  assert.equal(vm!.propiedad.titulo, "Tu propiedad");
});

test("nombre de contacto: se usa solo el primer nombre", () => {
  const vm = toOwnerPortalViewModel(baseRaw());
  assert.equal(vm!.propiedad.contactoNombre, "Juan");
});

test("sin contacto declarado, contactoNombre es null (la página decide el saludo genérico)", () => {
  const raw = baseRaw();
  const vm = toOwnerPortalViewModel({ ...raw, propiedad: { ...raw.propiedad, propietario_contacto: null } });
  assert.equal(vm!.propiedad.contactoNombre, null);
});

test("tasación vacía ({}) produce valuation null, no valores en 0 inventados", () => {
  const vm = toOwnerPortalViewModel(baseRaw({ tasacion: {} }));
  assert.equal(vm!.valuation, null);
});

test("valuation real: usa valor_tpl_oficial primero, ventaApuro desde resultado.valor_venta_apuro", () => {
  const vm = toOwnerPortalViewModel(
    baseRaw({
      tasacion: {
        valor_tpl_oficial: 10120000,
        valor_tpl_m2: 2024,
        clasificacion: "Bajo mercado",
        resultado: { valor_venta_apuro: 8500000 },
        created_at: "2026-09-05T00:00:00Z",
      },
    }),
  );
  assert.ok(vm!.valuation);
  assert.equal(vm!.valuation!.valorFinal, 10120000);
  assert.equal(vm!.valuation!.valorFinalLabel, "$10.120.000");
  assert.equal(vm!.valuation!.ventaApuro, 8500000);
  assert.equal(vm!.valuation!.ventaApuroLabel, "$8.500.000");
  assert.equal(vm!.valuation!.clasificacion, "Bajo mercado");
  assert.equal(vm!.valuation!.calculadaAt, "2026-09-05T00:00:00Z");
});

test("valuation: fallback a valor_tpl_total si falta valor_tpl_oficial", () => {
  const vm = toOwnerPortalViewModel(baseRaw({ tasacion: { valor_tpl_total: 24510000 } }));
  assert.equal(vm!.valuation!.valorFinal, 24510000);
});

test("valuation: fallback a resultado.valorFinal si faltan ambos campos de nivel superior", () => {
  const vm = toOwnerPortalViewModel(baseRaw({ tasacion: { resultado: { valorFinal: 17320000 } } }));
  assert.equal(vm!.valuation!.valorFinal, 17320000);
});

test("valuation: ventaApuro usa valorPorApuro si falta valor_venta_apuro (nombre alternativo real del motor)", () => {
  const vm = toOwnerPortalViewModel(baseRaw({ tasacion: { valor_tpl_oficial: 10000000, resultado: { valorPorApuro: 7000000 } } }));
  assert.equal(vm!.valuation!.ventaApuro, 7000000);
});

test("valuation: ventaApuro es 0 (no inventado) cuando no hay ningún campo de apuro", () => {
  const vm = toOwnerPortalViewModel(baseRaw({ tasacion: { valor_tpl_oficial: 10000000 } }));
  assert.equal(vm!.valuation!.ventaApuro, 0);
});

test("valuation: m2 se calcula desde valorFinal/superficie si falta valor_tpl_m2", () => {
  const vm = toOwnerPortalViewModel(baseRaw({ tasacion: { valor_tpl_oficial: 10000000 } }));
  assert.equal(vm!.valuation!.m2, Math.round(10000000 / 5000));
});

test("valuation: clasificación usa resultado.priceAnalysis.classification si falta el campo de nivel superior", () => {
  const vm = toOwnerPortalViewModel(
    baseRaw({ tasacion: { valor_tpl_oficial: 10000000, resultado: { priceAnalysis: { classification: "Sobre mercado" } } } }),
  );
  assert.equal(vm!.valuation!.clasificacion, "Sobre mercado");
});

test("valuation: 'valorFinal' 0/ausente en toda la cadena produce valuation null, no $0", () => {
  const vm = toOwnerPortalViewModel(baseRaw({ tasacion: { clasificacion: "sin datos" } }));
  assert.equal(vm!.valuation, null);
});

console.log(`\n${passed} ok, ${failed} fallidos.`);
if (failed > 0) process.exitCode = 1;
