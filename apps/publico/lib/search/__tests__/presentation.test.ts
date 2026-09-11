/**
 * Tests puros de `toSearchViewModel()` / `toPropertyCardViewModel()` —
 * Bloque 2.3 (incluye el ajuste de distancia — Opción A).
 *
 * Desde el ajuste de distancia, `presentation.ts` importa `distanceKm` de
 * `@tpl/core` en tiempo de ejecución (ya no son solo tipos) — este archivo
 * necesita el mismo shim de NODE_PATH que `supabaseSearchRepository.test.ts`
 * (Bloque 2.2): compilar `@tpl/core` a JS plano en un directorio temporal y
 * exponerlo vía `NODE_PATH` como si fuera el paquete real (ver informe de
 * cierre del Bloque 2.2/2.3 para el comando exacto). `@tpl/core` no tiene
 * build propio (`main: "./src/index.ts"`) — Next.js lo resuelve sin
 * problema, un `node` plano no.
 *
 * Fixtures controlados — no son evidencia de Supabase.
 */
import assert from "node:assert/strict";
import type {
  Property,
  PropertyCharacteristics,
  PropertyValuation,
  SearchResult,
  House,
  ProjectCombination,
} from "@tpl/core";
import { toSearchViewModel, toPropertyCardViewModel, summarizeCatalogForHome } from "../presentation";

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

const EMPTY_CHARACTERISTICS: PropertyCharacteristics = {
  legalSituation: null,
  electricity: null,
  water: null,
  access: null,
  topography: null,
  soilType: null,
  exposure: null,
  mainView: null,
  vegetation: null,
  fencing: null,
  gate: null,
  isGatedCommunity: null,
  naturalFeatures: [],
};

const EMPTY_VALUATION: PropertyValuation = { technicalValue: null, communalAverageValue: null, recommendedValue: null };

let counter = 0;
function makeProperty(overrides: Partial<Property> = {}): Property {
  counter += 1;
  return {
    id: `fixture-${counter}`,
    code: `FIX-${counter}`,
    type: "parcela",
    subtype: null,
    status: "publicada",
    featured: false,
    opportunity: false,
    publishedAt: null,
    title: "Parcela de prueba",
    description: "",
    price: 10_000_000,
    currency: "CLP",
    region: "Región de prueba",
    commune: "Yumbel",
    sector: null,
    coordinates: null,
    landAreaM2: 5000,
    builtAreaM2: null,
    images: [],
    coverImage: "",
    video: null,
    characteristics: { ...EMPTY_CHARACTERISTICS },
    valuation: { ...EMPTY_VALUATION },
    attributes: {},
    ...overrides,
  };
}

function makeHouse(overrides: Partial<House> = {}): House {
  return { id: "house-1", name: "Casa de prueba", price: 5_000_000, ...overrides };
}

function propertyResult(properties: Property[], total = properties.length): SearchResult {
  return { intent: "property", properties, total };
}

// 1. Property -> ViewModel
test("Property -> PropertyCardViewModel: campos básicos mapeados", () => {
  const property = makeProperty({ title: "Parcela con vista", commune: "Yumbel", price: 30_000_000, landAreaM2: 8000 });
  const vm = toPropertyCardViewModel(property);
  assert.equal(vm.id, property.id);
  assert.equal(vm.title, "Parcela con vista");
  assert.equal(vm.location, "Yumbel");
  assert.equal(vm.href, `/propiedades/${property.code}`);
  assert.equal(vm.featured, false);
  assert.equal(vm.opportunity, false);
});

test("location compone sector + comuna cuando el sector existe", () => {
  const property = makeProperty({ sector: "Virquenco", commune: "Los Ángeles" });
  const vm = toPropertyCardViewModel(property);
  assert.equal(vm.location, "Virquenco, Los Ángeles");
});

// 2. SearchResult -> ViewModel
test("SearchResult (intent property) -> SearchViewModel: modo, items, contador", () => {
  const properties = [makeProperty(), makeProperty()];
  const vm = toSearchViewModel(propertyResult(properties, 2));
  assert.equal(vm.mode, "property");
  assert.equal(vm.items.length, 2);
  assert.equal(vm.totalCount, 2);
  assert.equal(vm.isEmpty, false);
});

// 3. preservación de los tres valores de valoración
test("preserva los tres valores de valoración, distintos y formateados", () => {
  const property = makeProperty({
    valuation: { technicalValue: 40_000_000, communalAverageValue: 45_000_000, recommendedValue: 42_000_000 },
  });
  const vm = toPropertyCardViewModel(property);
  assert.notEqual(vm.valuation.technicalValueLabel, vm.valuation.communalAverageValueLabel);
  assert.notEqual(vm.valuation.communalAverageValueLabel, vm.valuation.recommendedValueLabel);
  assert.equal(vm.valuation.technicalValueLabel, "$40.000.000");
  assert.equal(vm.valuation.communalAverageValueLabel, "$45.000.000");
  assert.equal(vm.valuation.recommendedValueLabel, "$42.000.000");
});

test("valoración null se preserva como null, no como '0' ni string vacío", () => {
  const property = makeProperty({ valuation: { ...EMPTY_VALUATION } });
  const vm = toPropertyCardViewModel(property);
  assert.equal(vm.valuation.technicalValueLabel, null);
  assert.equal(vm.valuation.communalAverageValueLabel, null);
  assert.equal(vm.valuation.recommendedValueLabel, null);
});

// 4. formato de precio únicamente en la capa de presentación
test("priceLabel es un string formateado en CLP; Property.price sigue siendo number", () => {
  const property = makeProperty({ price: 54_000_000 });
  const vm = toPropertyCardViewModel(property);
  assert.equal(typeof property.price, "number");
  assert.equal(vm.priceLabel, "$54.000.000");
});

test("priceLabel es undefined cuando Property.price es null (no inventa un precio)", () => {
  const property = makeProperty({ price: null });
  const vm = toPropertyCardViewModel(property);
  assert.equal(vm.priceLabel, undefined);
});

// 5. ausencia de mutación del Property original
test("no muta el Property original ni el SearchResult recibido", () => {
  const property = makeProperty({ title: "Original", price: 10_000_000 });
  const result = propertyResult([property]);
  const snapshotProperty = JSON.parse(JSON.stringify(property));
  const snapshotResult = JSON.parse(JSON.stringify(result));

  toSearchViewModel(result, { filters: { intent: "property", commune: "Yumbel" }, ranking: { criterion: "economic" } });

  assert.deepEqual(JSON.parse(JSON.stringify(property)), snapshotProperty);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), snapshotResult);
});

test("no muta el Property original al calcular distanceKm con origin", () => {
  const property = makeProperty({ coordinates: { lat: -36.81, lng: -73.06 } });
  const snapshot = JSON.parse(JSON.stringify(property));
  toPropertyCardViewModel(property, { origin: { lat: -36.8, lng: -73.05 } });
  assert.deepEqual(JSON.parse(JSON.stringify(property)), snapshot);
  assert.equal(Object.keys(property.coordinates!).length, 2, "coordinates no debe ganar campos nuevos (ej. distanceKm inyectado ahí)");
});

// 6. property mode
test("modo property: appliedRanking presente, appliedFilters resume los filtros usados", () => {
  const vm = toSearchViewModel(propertyResult([makeProperty()]), {
    filters: { intent: "property", commune: "Yumbel", priceMax: 50_000_000 },
    ranking: { criterion: "economic" },
  });
  assert.equal(vm.mode, "property");
  if (vm.mode !== "property") throw new Error("unreachable");
  assert.deepEqual(vm.appliedRanking, { criterion: "economic", label: "Precio: menor a mayor" });
  assert.equal(vm.appliedFilters.length, 2);
  assert.ok(vm.appliedFilters.some((f) => f.label.includes("Yumbel")));
  assert.ok(vm.appliedFilters.some((f) => f.label.includes("50.000.000")));
});

// 7. project mode
test("modo project: cada item trae la parcela + la casa + el precio total, sin appliedRanking", () => {
  const property = makeProperty({ price: 15_000_000 });
  const house = makeHouse({ name: "Casa 24m²", price: 5_000_000, areaM2: 24, rooms: 2 });
  const combination: ProjectCombination = { property, house, totalPrice: 20_000_000 };
  const result: SearchResult = { intent: "project", properties: [], combinations: [combination], total: 1 };

  const vm = toSearchViewModel(result);
  assert.equal(vm.mode, "project");
  if (vm.mode !== "project") throw new Error("unreachable");
  assert.equal(vm.items.length, 1);
  assert.equal(vm.items[0]!.houseName, "Casa 24m²");
  assert.equal(vm.items[0]!.houseAreaLabel, "24 m²");
  assert.equal(vm.items[0]!.houseRoomsLabel, "2 dormitorios");
  assert.equal(vm.items[0]!.totalPriceLabel, "$20.000.000");
  assert.equal(vm.items[0]!.property.id, property.id);
  assert.equal("appliedRanking" in vm, false);
});

// 8. resultado vacío
test("SearchResult vacío (modo property) produce isEmpty=true y items=[]", () => {
  const vm = toSearchViewModel(propertyResult([], 0));
  assert.equal(vm.isEmpty, true);
  assert.deepEqual(vm.items, []);
  assert.equal(vm.totalCount, 0);
});

test("SearchResult vacío (modo project, sin combinations) produce isEmpty=true", () => {
  const result: SearchResult = { intent: "project", properties: [], combinations: [], total: 0 };
  const vm = toSearchViewModel(result);
  assert.equal(vm.isEmpty, true);
  assert.deepEqual(vm.items, []);
});

test("SearchResult vacío (modo project, combinations undefined) no lanza", () => {
  const result: SearchResult = { intent: "project", properties: [], total: 0 };
  const vm = toSearchViewModel(result);
  assert.equal(vm.isEmpty, true);
});

// 9. manejo de distancia — reutilizando distanceKm de @tpl/core (Opción A)
test("distanceKm se calcula cuando hay origin válido y la propiedad tiene coordenadas", () => {
  const origin = { lat: -36.8, lng: -73.05 };
  const property = makeProperty({ coordinates: { lat: -36.81, lng: -73.06 } }); // ~1.4 km
  const vm = toPropertyCardViewModel(property, { origin });
  assert.equal(typeof vm.distanceKm, "number");
  assert.ok(vm.distanceKm! > 0 && vm.distanceKm! < 5, `distancia esperada ~1.4km, obtuvo ${vm.distanceKm}`);
});

test("distanceKm es undefined sin origin (comportamiento por defecto sin cambios)", () => {
  const property = makeProperty({ coordinates: { lat: -36.8, lng: -73.05 } });
  assert.equal(toPropertyCardViewModel(property).distanceKm, undefined);
  assert.equal(toPropertyCardViewModel(property, {}).distanceKm, undefined);
});

test("distanceKm es undefined si la propiedad no tiene coordenadas propias, aunque haya origin", () => {
  const origin = { lat: -36.8, lng: -73.05 };
  const property = makeProperty({ coordinates: null });
  assert.equal(toPropertyCardViewModel(property, { origin }).distanceKm, undefined);
});

test("distanceKm es undefined si el origin tiene coordenadas inválidas (NaN) — no lanza, no aproxima", () => {
  const property = makeProperty({ coordinates: { lat: -36.8, lng: -73.05 } });
  const vm = toPropertyCardViewModel(property, { origin: { lat: NaN, lng: -73.05 } });
  assert.equal(vm.distanceKm, undefined);
});

test("distanceKm en toSearchViewModel: se propaga options.origin a cada item", () => {
  const origin = { lat: -36.8, lng: -73.05 };
  const cercana = makeProperty({ coordinates: { lat: -36.81, lng: -73.06 } });
  const sinCoords = makeProperty({ coordinates: null });
  const vm = toSearchViewModel(propertyResult([cercana, sinCoords]), { origin });
  if (vm.mode !== "property") throw new Error("unreachable");
  assert.equal(typeof vm.items[0]!.distanceKm, "number");
  assert.equal(vm.items[1]!.distanceKm, undefined);
});

test("distanceKm usa exactamente el mismo cálculo que Search Core (mismo resultado que distanceKm de @tpl/core)", () => {
  // Import diferido: solo esta aserción necesita el runtime real de @tpl/core.
  const { distanceKm: coreDistanceKm } = require("@tpl/core") as { distanceKm: typeof import("@tpl/core").distanceKm };
  const origin = { lat: -36.8, lng: -73.05 };
  const point = { lat: -37.5, lng: -72.5 };
  const property = makeProperty({ coordinates: point });
  const expected = coreDistanceKm(origin.lat, origin.lng, point.lat, point.lng);
  const vm = toPropertyCardViewModel(property, { origin });
  assert.equal(vm.distanceKm, expected);
});

// 10. ningún acceso a Supabase desde el adapter
test("toSearchViewModel/toPropertyCardViewModel son síncronas (ninguna I/O, ningún acceso a Supabase)", () => {
  const before = Date.now();
  toSearchViewModel(propertyResult([makeProperty(), makeProperty(), makeProperty()]));
  const elapsedMs = Date.now() - before;
  assert.ok(elapsedMs < 50, "una función que hiciera red tardaría más que esto — confirma que es puro cómputo local");
});

// 11. summarizeCatalogForHome — Trust Bar + Commune Ribbon (paridad con legacy)
test("summarizeCatalogForHome: cuenta total/comunas/regiones y agrupa comunas por región", () => {
  const summary = summarizeCatalogForHome([
    makeProperty({ commune: "Nacimiento", region: "Biobío" }),
    makeProperty({ commune: "Yumbel", region: "Biobío" }),
    makeProperty({ commune: "Pemuco", region: "Ñuble" }),
  ]);
  assert.equal(summary.totalPublished, 3);
  assert.equal(summary.communeCount, 3);
  assert.equal(summary.regionCount, 2);
  assert.deepEqual(
    summary.communesByRegion.map((g) => g.region),
    ["Biobío", "Ñuble"],
  );
  assert.deepEqual(summary.communesByRegion[0]!.communes, ["Nacimiento", "Yumbel"]);
});

test("summarizeCatalogForHome: normaliza 'Región del Biobío' a 'Biobío' (no cuenta como región distinta)", () => {
  const summary = summarizeCatalogForHome([
    makeProperty({ commune: "Nacimiento", region: "Biobío" }),
    makeProperty({ commune: "Yumbel", region: "Región del Biobío" }),
  ]);
  assert.equal(summary.regionCount, 1);
  assert.equal(summary.communesByRegion[0]!.region, "Biobío");
  assert.deepEqual(summary.communesByRegion[0]!.communes, ["Nacimiento", "Yumbel"]);
});

test("summarizeCatalogForHome: 'Desconocida'/vacío cae en 'Otras zonas', no inventa una región", () => {
  const summary = summarizeCatalogForHome([
    makeProperty({ commune: "Caburgua", region: "Desconocida" }),
    makeProperty({ commune: "Pucón", region: "" }),
  ]);
  assert.equal(summary.communesByRegion.length, 1);
  assert.equal(summary.communesByRegion[0]!.region, "Otras zonas");
});

test("summarizeCatalogForHome: regiones ordenadas Biobío, Ñuble, La Araucanía, Maule, Otras zonas (mismo orden real del legacy)", () => {
  const summary = summarizeCatalogForHome([
    makeProperty({ commune: "Cauquenes", region: "Maule" }),
    makeProperty({ commune: "Caburgua", region: "Desconocida" }),
    makeProperty({ commune: "Pucón", region: "La Araucanía" }),
    makeProperty({ commune: "Pemuco", region: "Ñuble" }),
    makeProperty({ commune: "Nacimiento", region: "Biobío" }),
  ]);
  assert.deepEqual(
    summary.communesByRegion.map((g) => g.region),
    ["Biobío", "Ñuble", "La Araucanía", "Maule", "Otras zonas"],
  );
});

test("summarizeCatalogForHome: sin piso artificial — con datos reales de menos de 3 regiones, muestra el número real", () => {
  const summary = summarizeCatalogForHome([makeProperty({ commune: "Nacimiento", region: "Biobío" })]);
  assert.equal(summary.regionCount, 1, "no debe inflarse a un mínimo de 3 como hacía el legacy (Math.max(regiones, 3))");
});

test("summarizeCatalogForHome: catálogo vacío no lanza y devuelve ceros", () => {
  const summary = summarizeCatalogForHome([]);
  assert.deepEqual(summary, { totalPublished: 0, communeCount: 0, regionCount: 0, communesByRegion: [] });
});

console.log(`\n${passed} ok, ${failed} fallidos.`);
if (failed > 0) process.exitCode = 1;
