/**
 * Tests de `normalizeProperty()` — creados en P1-03 (2026-09-12).
 *
 * Hasta ahora `normalizeProperty` solo tenía FIXTURES
 * (`normalizeProperty.fixtures.ts`), que validan la forma vía typecheck
 * pero no comprueban ni un valor. La corrección de las cascadas de
 * valoración necesita aserciones reales, así que este archivo las agrega
 * siguiendo exactamente el mismo patrón de `search.test.ts` (Bloque 2.1):
 * sin instalar ningún test runner nuevo, con `node:assert/strict`.
 *
 *   npx tsc --project packages/core/tsconfig.json --module commonjs \
 *     --moduleResolution node --outDir <dir-temporal> \
 *     packages/core/src/__tests__/normalizeProperty.test.ts
 *   node <dir-temporal>/__tests__/normalizeProperty.test.js
 *
 * Las cascadas esperadas están tomadas literalmente de
 * `frontend-v2/js/parcela.js:valoracionGuardada()`, que es lo que hoy
 * alimenta la ficha pública en producción. Cualquier cambio a esas listas
 * de claves debe romper estos tests.
 */
import assert from "node:assert/strict";
import { normalizeProperty, type RawPropertyInput } from "../normalizeProperty";

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

function conMetadata(metadata: Record<string, unknown> | string): RawPropertyInput {
  return { id: "00000000-0000-4000-8000-00000000ffff", codigo: "test", tipo: "parcela", metadata };
}

// ---------------------------------------------------------------------------
// recommendedValue — la cascada que P1-03 corrige
// ---------------------------------------------------------------------------

test("recommended: 1ª clave — valor_tpl_recomendado gana sobre las demás", () => {
  const p = normalizeProperty(
    conMetadata({ valor_tpl_recomendado: 50_000_000, valor_tpl_tasador_ajustado: 44_000_000, valor_tpl_tasador: 41_000_000 }),
  );
  assert.equal(p.valuation.recommendedValue, 50_000_000);
});

test("recommended: 2ª clave — cae a valor_tpl_tasador_ajustado cuando falta la 1ª", () => {
  const p = normalizeProperty(conMetadata({ valor_tpl_tasador_ajustado: 44_000_000, valor_tpl_tasador: 41_000_000 }));
  assert.equal(p.valuation.recommendedValue, 44_000_000);
});

test("recommended: 3ª clave — cae a valor_tpl_tasador cuando faltan las dos primeras", () => {
  const p = normalizeProperty(conMetadata({ valor_tpl_tasador: 41_000_000 }));
  assert.equal(p.valuation.recommendedValue, 41_000_000);
});

test("recommended: null cuando no hay ninguna de las tres claves", () => {
  const p = normalizeProperty(conMetadata({ valor_comunal: 58_000_000 }));
  assert.equal(p.valuation.recommendedValue, null);
});

test("recommended: REGRESIÓN P1-03 — una parcela con solo la clave histórica ya NO queda sin tasación", () => {
  // Este es exactamente el caso que producía la discrepancia: se mostraba en
  // parcela.html y no en /propiedades/[codigo].
  const p = normalizeProperty(conMetadata({ valor_tpl_tasador: 31_100_000 }));
  assert.notEqual(p.valuation.recommendedValue, null, "debe resolver el valor, no quedar en null");
  assert.equal(p.valuation.recommendedValue, 31_100_000);
});

// ---------------------------------------------------------------------------
// communalAverageValue y technicalValue — cascadas que ya existían
// ---------------------------------------------------------------------------

test("comunal: respeta el orden valor_comunal > valor_promedio_comunal > valor_tpl_promedio_comunal", () => {
  assert.equal(
    normalizeProperty(conMetadata({ valor_comunal: 1, valor_promedio_comunal: 2, valor_tpl_promedio_comunal: 3 })).valuation
      .communalAverageValue,
    1,
  );
  assert.equal(
    normalizeProperty(conMetadata({ valor_promedio_comunal: 2, valor_tpl_promedio_comunal: 3 })).valuation.communalAverageValue,
    2,
  );
  assert.equal(normalizeProperty(conMetadata({ valor_tpl_promedio_comunal: 3 })).valuation.communalAverageValue, 3);
});

test("técnico: respeta el orden valor_tpl_tecnico > valor_tpl_tasador_base > valor_tpl_tasador_ajustado", () => {
  assert.equal(
    normalizeProperty(conMetadata({ valor_tpl_tecnico: 1, valor_tpl_tasador_base: 2, valor_tpl_tasador_ajustado: 3 })).valuation
      .technicalValue,
    1,
  );
  assert.equal(
    normalizeProperty(conMetadata({ valor_tpl_tasador_base: 2, valor_tpl_tasador_ajustado: 3 })).valuation.technicalValue,
    2,
  );
  assert.equal(normalizeProperty(conMetadata({ valor_tpl_tasador_ajustado: 3 })).valuation.technicalValue, 3);
});

test("valor_tpl_tasador_ajustado alimenta recommended Y technical, igual que el legacy", () => {
  const p = normalizeProperty(conMetadata({ valor_tpl_tasador_ajustado: 44_000_000 }));
  assert.equal(p.valuation.recommendedValue, 44_000_000);
  assert.equal(p.valuation.technicalValue, 44_000_000);
});

// ---------------------------------------------------------------------------
// Predicado de validez: paridad con `Number.isFinite(v) && v > 0` del legacy
// ---------------------------------------------------------------------------

test("un 0 guardado NO es un valor: salta a la siguiente clave de la cascada", () => {
  const p = normalizeProperty(conMetadata({ valor_tpl_recomendado: 0, valor_tpl_tasador_ajustado: 44_000_000 }));
  assert.equal(p.valuation.recommendedValue, 44_000_000, "un 0 no puede ganarle a una clave con dato real");
});

test("un 0 en todas las claves resuelve a null, nunca a 0 (evita mostrar '$0')", () => {
  const p = normalizeProperty(conMetadata({ valor_tpl_recomendado: 0, valor_tpl_tasador: 0 }));
  assert.equal(p.valuation.recommendedValue, null);
});

test("un valor negativo se descarta", () => {
  const p = normalizeProperty(conMetadata({ valor_tpl_recomendado: -1, valor_tpl_tasador: 41_000_000 }));
  assert.equal(p.valuation.recommendedValue, 41_000_000);
});

test("un número guardado como string SÍ se lee (jsonb no garantiza el tipo)", () => {
  const p = normalizeProperty(conMetadata({ valor_tpl_recomendado: "50000000" }));
  assert.equal(p.valuation.recommendedValue, 50_000_000);
});

test("un string no numérico se descarta y la cascada continúa", () => {
  const p = normalizeProperty(conMetadata({ valor_tpl_recomendado: "sin dato", valor_tpl_tasador: 41_000_000 }));
  assert.equal(p.valuation.recommendedValue, 41_000_000);
});

test("null / cadena vacía / undefined se tratan como ausentes", () => {
  assert.equal(normalizeProperty(conMetadata({ valor_tpl_recomendado: null })).valuation.recommendedValue, null);
  assert.equal(normalizeProperty(conMetadata({ valor_tpl_recomendado: "" })).valuation.recommendedValue, null);
  assert.equal(normalizeProperty(conMetadata({})).valuation.recommendedValue, null);
});

test("NaN e Infinity se descartan", () => {
  assert.equal(normalizeProperty(conMetadata({ valor_tpl_recomendado: Number.NaN })).valuation.recommendedValue, null);
  assert.equal(normalizeProperty(conMetadata({ valor_tpl_recomendado: Number.POSITIVE_INFINITY })).valuation.recommendedValue, null);
});

// ---------------------------------------------------------------------------
// metadata como string JSON — misma valoración que como objeto
// ---------------------------------------------------------------------------

test("metadata como string JSON produce la misma valoración que como objeto", () => {
  const objeto = { valor_tpl_tasador: 41_000_000, valor_comunal: 45_000_000 };
  const comoObjeto = normalizeProperty(conMetadata(objeto));
  const comoString = normalizeProperty(conMetadata(JSON.stringify(objeto)));
  assert.deepEqual(comoString.valuation, comoObjeto.valuation);
  assert.equal(comoString.valuation.recommendedValue, 41_000_000);
});

test("metadata con JSON inválido no rompe: valoración vacía", () => {
  const p = normalizeProperty(conMetadata("{no es json"));
  assert.deepEqual(p.valuation, { technicalValue: null, communalAverageValue: null, recommendedValue: null });
});

// ---------------------------------------------------------------------------
// No-regresión: el resto del contrato no cambió con P1-03
// ---------------------------------------------------------------------------

test("no-regresión: precio 0 sigue siendo 0 (el predicado > 0 es SOLO de valoración)", () => {
  const p = normalizeProperty({ id: "x", codigo: "c", tipo: "parcela", precio_publicado: 0, metadata: {} });
  assert.equal(p.price, 0, "precio_publicado no pasa por el predicado de valoración");
});

test("no-regresión: superficie 0 sigue siendo 0", () => {
  const p = normalizeProperty({ id: "x", codigo: "c", tipo: "parcela", superficie_m2: 0, metadata: {} });
  assert.equal(p.landAreaM2, 0);
});

test("no-regresión: portada por es_portada gana sobre orden 0", () => {
  const p = normalizeProperty({
    id: "x",
    codigo: "c",
    tipo: "parcela",
    imagenes: [
      { url: "a.webp", orden: 0, es_portada: false },
      { url: "b.webp", orden: 1, es_portada: true },
    ],
  });
  assert.equal(p.coverImage, "b.webp");
});

test("no-regresión: subtype sigue siendo null siempre", () => {
  assert.equal(normalizeProperty({ id: "x", subtipo: "parcel" }).subtype, null);
});

// ---------------------------------------------------------------------------
// Resumen
// ---------------------------------------------------------------------------

console.log(`\n${passed} ok, ${failed} fallidos.`);
if (failed > 0) process.exitCode = 1;
