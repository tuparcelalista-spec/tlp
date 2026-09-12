/**
 * Tests puros de `searchState.ts` — Bloque 2.4. Sin React, sin `@tpl/core`
 * en tiempo de ejecución (solo tipos) — mismo mecanismo simple que
 * `houseAdapter.test.ts`/`presentation.test.ts` (antes del ajuste de
 * distancia):
 *
 *   npx tsc --module commonjs --moduleResolution node --target es2020 \
 *     --esModuleInterop --skipLibCheck --outDir <dir-temporal> \
 *     apps/publico/components/search/__tests__/searchState.test.ts
 *   node <dir-temporal>/__tests__/searchState.test.js
 */
import assert from "node:assert/strict";
import {
  buildSearchFilters,
  parseCLPInput,
  deriveSearchStatus,
  INITIAL_SEARCH_FORM_STATE,
  type SearchFormState,
} from "../searchState";

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

function form(overrides: Partial<SearchFormState> = {}): SearchFormState {
  return { ...INITIAL_SEARCH_FORM_STATE, ...overrides };
}

// ---------------------------------------------------------------------------
// parseCLPInput
// ---------------------------------------------------------------------------

test("parseCLPInput: '10.000.000' -> 10000000", () => {
  assert.equal(parseCLPInput("10.000.000"), 10_000_000);
});

test("parseCLPInput: '$10.000.000' -> 10000000 (símbolo ignorado)", () => {
  assert.equal(parseCLPInput("$10.000.000"), 10_000_000);
});

test("parseCLPInput: '' -> undefined (no 0 inventado)", () => {
  assert.equal(parseCLPInput(""), undefined);
});

test("parseCLPInput: solo espacios -> undefined", () => {
  assert.equal(parseCLPInput("   "), undefined);
});

// ---------------------------------------------------------------------------
// buildSearchFilters — 1 test por filtro pedido
// ---------------------------------------------------------------------------

test("buildSearchFilters: keyword", () => {
  const filters = buildSearchFilters(form({ keyword: "  bosque nativo  " }));
  assert.equal(filters.keyword, "bosque nativo");
});

test("buildSearchFilters: keyword vacío no se envía", () => {
  const filters = buildSearchFilters(form({ keyword: "   " }));
  assert.equal("keyword" in filters, false);
});

test("buildSearchFilters: commune", () => {
  const filters = buildSearchFilters(form({ commune: "Yumbel" }));
  assert.equal(filters.commune, "Yumbel");
});

test("buildSearchFilters: priceMin", () => {
  const filters = buildSearchFilters(form({ priceMinText: "10.000.000" }));
  assert.equal(filters.priceMin, 10_000_000);
});

test("buildSearchFilters: priceMax", () => {
  const filters = buildSearchFilters(form({ priceMaxText: "50.000.000" }));
  assert.equal(filters.priceMax, 50_000_000);
});

test("buildSearchFilters: landAreaMin", () => {
  const filters = buildSearchFilters(form({ landAreaMinText: "5000" }));
  assert.equal(filters.landAreaMin, 5000);
});

test("buildSearchFilters: landAreaMax", () => {
  const filters = buildSearchFilters(form({ landAreaMaxText: "20000" }));
  assert.equal(filters.landAreaMax, 20_000);
});

test("buildSearchFilters: propertyType", () => {
  const filters = buildSearchFilters(form({ propertyType: "casa" }));
  assert.equal(filters.propertyType, "casa");
});

test("buildSearchFilters: propertyType vacío ('Todos los tipos') no se envía", () => {
  const filters = buildSearchFilters(form({ propertyType: "" }));
  assert.equal("propertyType" in filters, false);
});

test("buildSearchFilters: naturalFeatures", () => {
  const filters = buildSearchFilters(form({ naturalFeatures: ["bosque", "río"] }));
  assert.deepEqual(filters.naturalFeatures, ["bosque", "río"]);
});

test("buildSearchFilters: coordinates + radiusKm solo si nearbyEnabled", () => {
  const origin = { lat: -36.8, lng: -73.05 };
  const conNearby = buildSearchFilters(form({ nearbyEnabled: true, origin, radiusKm: 10 }));
  assert.deepEqual(conNearby.coordinates, origin);
  assert.equal(conNearby.radiusKm, 10);

  const sinNearby = buildSearchFilters(form({ nearbyEnabled: false, origin, radiusKm: 10 }));
  assert.equal("coordinates" in sinNearby, false);
  assert.equal("radiusKm" in sinNearby, false);
});

test("buildSearchFilters: intent por defecto 'property'", () => {
  const filters = buildSearchFilters(form());
  assert.equal(filters.intent, "property");
});

test("buildSearchFilters: intent 'project' con totalBudget y comuna", () => {
  const filters = buildSearchFilters(form({ intent: "project", totalBudgetText: "40.000.000", commune: "Pinto" }));
  assert.equal(filters.intent, "project");
  assert.equal(filters.totalBudget, 40_000_000);
  assert.equal(filters.commune, "Pinto");
});

test("buildSearchFilters: combinación de varios filtros a la vez", () => {
  const filters = buildSearchFilters(
    form({ commune: "Yumbel", priceMinText: "10.000.000", priceMaxText: "50.000.000", landAreaMinText: "5000", naturalFeatures: ["bosque"] }),
  );
  assert.equal(filters.commune, "Yumbel");
  assert.equal(filters.priceMin, 10_000_000);
  assert.equal(filters.priceMax, 50_000_000);
  assert.equal(filters.landAreaMin, 5000);
  assert.deepEqual(filters.naturalFeatures, ["bosque"]);
});

// ---------------------------------------------------------------------------
// deriveSearchStatus — los 5 estados, mutuamente excluyentes
// ---------------------------------------------------------------------------

test("deriveSearchStatus: idle antes de buscar", () => {
  assert.equal(deriveSearchStatus({ hasSearched: false, isLoading: false, error: null, isEmpty: false }), "idle");
});

test("deriveSearchStatus: loading tiene prioridad incluso si hasSearched es false", () => {
  assert.equal(deriveSearchStatus({ hasSearched: false, isLoading: true, error: null, isEmpty: false }), "loading");
});

test("deriveSearchStatus: success con resultados", () => {
  assert.equal(deriveSearchStatus({ hasSearched: true, isLoading: false, error: null, isEmpty: false }), "success");
});

test("deriveSearchStatus: empty tras buscar sin resultados", () => {
  assert.equal(deriveSearchStatus({ hasSearched: true, isLoading: false, error: null, isEmpty: true }), "empty");
});

test("deriveSearchStatus: error tiene prioridad sobre empty/success", () => {
  assert.equal(deriveSearchStatus({ hasSearched: true, isLoading: false, error: "algo falló", isEmpty: true }), "error");
});

console.log(`\n${passed} ok, ${failed} fallidos.`);
if (failed > 0) process.exitCode = 1;
