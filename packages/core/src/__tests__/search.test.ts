/**
 * Tests puros del motor de Search — Bloque 2.1 (Search Core).
 *
 * No es un test runner instalado (sin Vitest/Jest, a propósito — mismo
 * criterio que `repository.smoke.ts`, Bloque 1.3). Se ejecuta compilando
 * este archivo (y `search.ts`) con el `typescript` ya declarado como
 * devDependency, sin dependencias nuevas:
 *
 *   npx tsc --project packages/core/tsconfig.json --module commonjs \
 *     --moduleResolution node --outDir <dir-temporal> \
 *     packages/core/src/__tests__/search.test.ts
 *   node <dir-temporal>/__tests__/search.test.js
 *
 * Todos los datos de este archivo son fixtures CONTROLADOS e inventados
 * para ejercitar el motor — ninguno pretende ser evidencia de una fila real
 * de Supabase (a diferencia de las fixtures de `normalizeProperty`, Bloque
 * 1.2, que sí estaban ancladas a filas reales observadas).
 */
import assert from "node:assert/strict";
import type { Property, PropertyCharacteristics, PropertyValuation } from "../property";
import {
  runSearch,
  searchProperties,
  rankProperties,
  searchProjectCombinations,
  distanceKm,
  type SearchFilters,
  type House,
} from "../search";

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

// ---------------------------------------------------------------------------
// Fixture factory — Property completo con valores por defecto neutros;
// cada test sobreescribe solo lo que le importa.
// ---------------------------------------------------------------------------

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

const EMPTY_VALUATION: PropertyValuation = {
  technicalValue: null,
  communalAverageValue: null,
  recommendedValue: null,
};

let fixtureCounter = 0;
function makeProperty(overrides: Partial<Property> = {}): Property {
  fixtureCounter += 1;
  return {
    id: `fixture-${fixtureCounter}`,
    code: `FIX-${fixtureCounter}`,
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
    commune: "Comuna Prueba",
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

function propertyFilters(overrides: Partial<SearchFilters> = {}): SearchFilters {
  return { intent: "property", ...overrides };
}

// ---------------------------------------------------------------------------
// 1-3. keyword
// ---------------------------------------------------------------------------

test("keyword: encuentra coincidencia en title", () => {
  const target = makeProperty({ title: "Parcela con vista al volcán" });
  const other = makeProperty({ title: "Sitio urbano" });
  const result = searchProperties([target, other], propertyFilters({ keyword: "volcán" }));
  assert.deepEqual(result.map((p) => p.id), [target.id]);
});

test("keyword: encuentra coincidencia en description", () => {
  const target = makeProperty({ description: "Rodeada de bosque nativo y un estero." });
  const other = makeProperty({ description: "Terreno plano sin vegetación." });
  const result = searchProperties([target, other], propertyFilters({ keyword: "estero" }));
  assert.deepEqual(result.map((p) => p.id), [target.id]);
});

test("keyword: con más de un término exige que todos aparezcan (AND, no frase exacta)", () => {
  const target = makeProperty({
    title: "Parcela en sector cordillerano",
    description: "Tiene bosque nativo y acceso a un río cercano, con luz disponible.",
    characteristics: { ...EMPTY_CHARACTERISTICS, electricity: "Conectada" },
  });
  // Ojo: el matcher es léxico, no semántico — el texto de estas fixtures
  // negativas no debe contener las otras palabras clave ni como negación
  // ("sin río ni luz" SÍ contiene "río" y "luz" como subcadenas).
  const soloBosque = makeProperty({ description: "Bosque nativo denso, terreno seco y despejado." });
  const soloRio = makeProperty({ description: "Terreno junto a un caudaloso curso de agua, sin árboles." });
  const result = searchProperties(
    [target, soloBosque, soloRio],
    propertyFilters({ keyword: "bosque río luz" }),
  );
  assert.deepEqual(result.map((p) => p.id), [target.id]);
});

// ---------------------------------------------------------------------------
// 4. comuna
// ---------------------------------------------------------------------------

test("comuna: igualdad exacta normalizada (acentos/mayúsculas)", () => {
  const target = makeProperty({ commune: "Los Ángeles" });
  const other = makeProperty({ commune: "Nacimiento" });
  const result = searchProperties([target, other], propertyFilters({ commune: "los angeles" }));
  assert.deepEqual(result.map((p) => p.id), [target.id]);
});

// ---------------------------------------------------------------------------
// 5-6. precio min/max
// ---------------------------------------------------------------------------

test("precio mínimo: excluye por debajo y precios null", () => {
  const barata = makeProperty({ price: 5_000_000 });
  const cara = makeProperty({ price: 20_000_000 });
  const sinPrecio = makeProperty({ price: null });
  const result = searchProperties([barata, cara, sinPrecio], propertyFilters({ priceMin: 10_000_000 }));
  assert.deepEqual(result.map((p) => p.id), [cara.id]);
});

test("precio máximo: excluye por encima y precios null", () => {
  const barata = makeProperty({ price: 5_000_000 });
  const cara = makeProperty({ price: 20_000_000 });
  const sinPrecio = makeProperty({ price: null });
  const result = searchProperties([barata, cara, sinPrecio], propertyFilters({ priceMax: 10_000_000 }));
  assert.deepEqual(result.map((p) => p.id), [barata.id]);
});

// ---------------------------------------------------------------------------
// 7-8. superficie min/max
// ---------------------------------------------------------------------------

test("superficie mínima: excluye por debajo y superficie null", () => {
  const chica = makeProperty({ landAreaM2: 1000 });
  const grande = makeProperty({ landAreaM2: 15000 });
  const sinDato = makeProperty({ landAreaM2: null });
  const result = searchProperties([chica, grande, sinDato], propertyFilters({ landAreaMin: 10000 }));
  assert.deepEqual(result.map((p) => p.id), [grande.id]);
});

test("superficie máxima: excluye por encima y superficie null", () => {
  const chica = makeProperty({ landAreaM2: 1000 });
  const grande = makeProperty({ landAreaM2: 15000 });
  const sinDato = makeProperty({ landAreaM2: null });
  const result = searchProperties([chica, grande, sinDato], propertyFilters({ landAreaMax: 10000 }));
  assert.deepEqual(result.map((p) => p.id), [chica.id]);
});

// ---------------------------------------------------------------------------
// 9. naturalFeatures
// ---------------------------------------------------------------------------

test("naturalFeatures: filtra por intersección normalizada", () => {
  const conBosque = makeProperty({ characteristics: { ...EMPTY_CHARACTERISTICS, naturalFeatures: ["Bosque", "Río"] } });
  const sinNada = makeProperty({ characteristics: { ...EMPTY_CHARACTERISTICS, naturalFeatures: [] } });
  const result = searchProperties([conBosque, sinNada], propertyFilters({ naturalFeatures: ["río"] }));
  assert.deepEqual(result.map((p) => p.id), [conBosque.id]);
});

// ---------------------------------------------------------------------------
// 10. proximidad
// ---------------------------------------------------------------------------

test("proximidad: filtra sin coordenadas propias y rankea por distancia real", () => {
  const origin = { lat: -36.8, lng: -73.05 };
  const cercana = makeProperty({ coordinates: { lat: -36.81, lng: -73.06 } }); // ~1.4 km
  const lejana = makeProperty({ coordinates: { lat: -37.5, lng: -72.5 } }); // ~90 km
  const sinCoords = makeProperty({ coordinates: null });

  const matched = searchProperties([lejana, sinCoords, cercana], propertyFilters({ coordinates: origin }));
  assert.deepEqual(
    matched.map((p) => p.id).sort(),
    [cercana.id, lejana.id].sort(),
  );

  const ranked = rankProperties(matched, { criterion: "distance", origin });
  assert.deepEqual(ranked.map((p) => p.id), [cercana.id, lejana.id]);
});

test("proximidad: rankProperties exige 'origin' para criterion 'distance'", () => {
  assert.throws(() => rankProperties([makeProperty()], { criterion: "distance" }), /requiere "origin"/);
});

// ---------------------------------------------------------------------------
// 10b. radiusKm — corrección de revisión de código
// ---------------------------------------------------------------------------

test("radiusKm: propiedad dentro del radio queda incluida", () => {
  const origin = { lat: -36.8, lng: -73.05 };
  const dentro = makeProperty({ coordinates: { lat: -36.81, lng: -73.06 } }); // ~1.4 km
  const result = searchProperties([dentro], propertyFilters({ coordinates: origin, radiusKm: 5 }));
  assert.deepEqual(result.map((p) => p.id), [dentro.id]);
});

test("radiusKm: propiedad exactamente en el límite queda incluida (<=, no <)", () => {
  const origin = { lat: -36.8, lng: -73.05 };
  const point = { lat: -36.81, lng: -73.06 };
  const enElLimite = makeProperty({ coordinates: point });
  const exactBoundary = distanceKm(origin.lat, origin.lng, point.lat, point.lng);
  const result = searchProperties([enElLimite], propertyFilters({ coordinates: origin, radiusKm: exactBoundary }));
  assert.deepEqual(result.map((p) => p.id), [enElLimite.id]);
});

test("radiusKm === 0: válido, exige coincidencia exacta de ubicación", () => {
  const origin = { lat: -36.8, lng: -73.05 };
  const mismoPunto = makeProperty({ coordinates: { ...origin } });
  const puntoCercanoNoIdentico = makeProperty({ coordinates: { lat: -36.8001, lng: -73.05 } });
  const result = searchProperties(
    [mismoPunto, puntoCercanoNoIdentico],
    propertyFilters({ coordinates: origin, radiusKm: 0 }),
  );
  assert.deepEqual(result.map((p) => p.id), [mismoPunto.id]);
});

test("radiusKm: propiedad fuera del radio queda excluida", () => {
  const origin = { lat: -36.8, lng: -73.05 };
  const fuera = makeProperty({ coordinates: { lat: -37.5, lng: -72.5 } }); // ~90 km
  const result = searchProperties([fuera], propertyFilters({ coordinates: origin, radiusKm: 5 }));
  assert.deepEqual(result, []);
});

test("radiusKm: propiedad sin coordenadas queda excluida aunque haya radiusKm", () => {
  const origin = { lat: -36.8, lng: -73.05 };
  const sinCoords = makeProperty({ coordinates: null });
  const result = searchProperties([sinCoords], propertyFilters({ coordinates: origin, radiusKm: 999999 }));
  assert.deepEqual(result, []);
});

test("radiusKm inválido: negativo lanza", () => {
  assert.throws(
    () => searchProperties([makeProperty()], propertyFilters({ coordinates: { lat: 0, lng: 0 }, radiusKm: -1 })),
    /no puede ser negativo/,
  );
});

test("radiusKm inválido: NaN lanza", () => {
  assert.throws(
    () => searchProperties([makeProperty()], propertyFilters({ coordinates: { lat: 0, lng: 0 }, radiusKm: NaN })),
    /debe ser un número finito/,
  );
});

test("radiusKm inválido: Infinity lanza (la única forma de expresar 'sin tope' es omitir el campo)", () => {
  assert.throws(
    () => searchProperties([makeProperty()], propertyFilters({ coordinates: { lat: 0, lng: 0 }, radiusKm: Infinity })),
    /debe ser un número finito/,
  );
});

test("radiusKm inválido: presente sin coordinates lanza", () => {
  assert.throws(
    () => searchProperties([makeProperty()], propertyFilters({ radiusKm: 10 })),
    /requiere "coordinates"/,
  );
});

test("coordinates sin radiusKm: sin cambios — solo exige coordenadas propias, sin tope de distancia", () => {
  const origin = { lat: -36.8, lng: -73.05 };
  const lejana = makeProperty({ coordinates: { lat: -37.5, lng: -72.5 } }); // ~90 km, sin radiusKm no se excluye
  const result = searchProperties([lejana], propertyFilters({ coordinates: origin }));
  assert.deepEqual(result.map((p) => p.id), [lejana.id]);
});

// ---------------------------------------------------------------------------
// 11. combinación de filtros
// ---------------------------------------------------------------------------

test("combinación de filtros: comuna + precio + superficie a la vez", () => {
  const match = makeProperty({ commune: "Yumbel", price: 30_000_000, landAreaM2: 8000 });
  const otraComuna = makeProperty({ commune: "Nacimiento", price: 30_000_000, landAreaM2: 8000 });
  const fueraDePrecio = makeProperty({ commune: "Yumbel", price: 90_000_000, landAreaM2: 8000 });
  const fueraDeSuperficie = makeProperty({ commune: "Yumbel", price: 30_000_000, landAreaM2: 500 });

  const result = searchProperties(
    [match, otraComuna, fueraDePrecio, fueraDeSuperficie],
    propertyFilters({ commune: "Yumbel", priceMin: 10_000_000, priceMax: 50_000_000, landAreaMin: 5000 }),
  );
  assert.deepEqual(result.map((p) => p.id), [match.id]);
});

// ---------------------------------------------------------------------------
// 12. ranking (económico, base)
// ---------------------------------------------------------------------------

test("ranking economic: ascendente por precio, null al final", () => {
  const cara = makeProperty({ price: 50_000_000 });
  const barata = makeProperty({ price: 10_000_000 });
  const sinPrecio = makeProperty({ price: null });
  const ranked = rankProperties([cara, sinPrecio, barata], { criterion: "economic" });
  assert.deepEqual(ranked.map((p) => p.id), [barata.id, cara.id, sinPrecio.id]);
});

test("ranking large: hectárea o más primero, luego por superficie descendente", () => {
  const chica = makeProperty({ landAreaM2: 2000 });
  const grande = makeProperty({ landAreaM2: 20000 });
  const mediana = makeProperty({ landAreaM2: 12000 });
  const ranked = rankProperties([chica, mediana, grande], { criterion: "large" });
  assert.deepEqual(ranked.map((p) => p.id), [grande.id, mediana.id, chica.id]);
});

test("ranking opportunity: no filtra, solo reordena (oportunidades primero)", () => {
  const oportunidad = makeProperty({ price: 40_000_000, valuation: { ...EMPTY_VALUATION, recommendedValue: 50_000_000 } });
  const normal = makeProperty({ price: 45_000_000, valuation: { ...EMPTY_VALUATION, recommendedValue: 46_000_000 } });
  const ranked = rankProperties([normal, oportunidad], { criterion: "opportunity" });
  assert.equal(ranked.length, 2, "opportunity no debe eliminar propiedades, solo reordenar");
  assert.deepEqual(ranked.map((p) => p.id), [oportunidad.id, normal.id]);
});

// ---------------------------------------------------------------------------
// 13. payment/services como ranking legacy
// ---------------------------------------------------------------------------

test("ranking payment: heurística legacy sobre texto, sin campo estructurado", () => {
  const conFacilidad = makeProperty({ description: "Vendemos con facilidad de pago y pie bajo." });
  const sinMencion = makeProperty({ description: "Terreno plano, sin más detalles." });
  const ranked = rankProperties([sinMencion, conFacilidad], { criterion: "payment" });
  assert.deepEqual(ranked.map((p) => p.id), [conFacilidad.id, sinMencion.id]);
});

test("ranking services: heurística legacy sobre texto, sin campo estructurado", () => {
  const cercaDeColegio = makeProperty({ description: "A 10 minutos del colegio y el hospital del pueblo." });
  const sinMencion = makeProperty({ description: "Terreno plano, sin más detalles." });
  const ranked = rankProperties([sinMencion, cercaDeColegio], { criterion: "services" });
  assert.deepEqual(ranked.map((p) => p.id), [cercaDeColegio.id, sinMencion.id]);
});

// ---------------------------------------------------------------------------
// 14. ausencia de resultados
// ---------------------------------------------------------------------------

test("ausencia de resultados: filtro imposible devuelve arreglo vacío, no error", () => {
  const p = makeProperty({ commune: "Yumbel" });
  const result = searchProperties([p], propertyFilters({ commune: "Comuna que no existe" }));
  assert.deepEqual(result, []);
  const ranked = rankProperties(result, { criterion: "economic" });
  assert.deepEqual(ranked, []);
});

// ---------------------------------------------------------------------------
// 15. determinismo
// ---------------------------------------------------------------------------

test("determinismo: misma entrada produce siempre la misma salida", () => {
  const catalog = [
    makeProperty({ commune: "Yumbel", price: 20_000_000, landAreaM2: 6000 }),
    makeProperty({ commune: "Yumbel", price: 15_000_000, landAreaM2: 7000 }),
    makeProperty({ commune: "Yumbel", price: 15_000_000, landAreaM2: 3000 }),
  ];
  const filters = propertyFilters({ commune: "Yumbel" });
  const first = rankProperties(searchProperties(catalog, filters), { criterion: "economic" }).map((p) => p.id);
  const second = rankProperties(searchProperties(catalog, filters), { criterion: "economic" }).map((p) => p.id);
  assert.deepEqual(first, second);
});

test("determinismo: searchProperties/rankProperties no mutan el arreglo de entrada", () => {
  const catalog = [makeProperty({ price: 50_000_000 }), makeProperty({ price: 10_000_000 })];
  const originalOrder = catalog.map((p) => p.id);
  rankProperties(searchProperties(catalog, propertyFilters()), { criterion: "economic" });
  assert.deepEqual(catalog.map((p) => p.id), originalOrder, "el arreglo original no debe reordenarse in-place");
});

// ---------------------------------------------------------------------------
// 16. modo "property" (runSearch, extremo a extremo)
// ---------------------------------------------------------------------------

test("runSearch intent property: filtra, rankea y aplica limit", () => {
  const catalog = [
    makeProperty({ commune: "Yumbel", price: 30_000_000 }),
    makeProperty({ commune: "Yumbel", price: 10_000_000 }),
    makeProperty({ commune: "Yumbel", price: 20_000_000 }),
    makeProperty({ commune: "Otra", price: 5_000_000 }),
  ];
  const result = runSearch(catalog, propertyFilters({ commune: "Yumbel", limit: 2 }), { ranking: { criterion: "economic" } });
  assert.equal(result.intent, "property");
  assert.equal(result.total, 3, "total refleja los que califican, antes del limit");
  assert.equal(result.properties.length, 2);
  assert.deepEqual(
    result.properties.map((p) => p.price),
    [10_000_000, 20_000_000],
  );
  assert.equal(result.combinations, undefined);
});

// ---------------------------------------------------------------------------
// 17. modo "project"
// ---------------------------------------------------------------------------

test("searchProjectCombinations: dentro del margen, sin repetir parcela ni casa, máximo 6", () => {
  const budget = 20_000_000;
  const parcels = [
    makeProperty({ price: 15_000_000 }), // + house-1 (5M) = 20M -> score 0
    makeProperty({ price: 12_000_000 }), // + house-1 = 17M -> score 3M
    makeProperty({ price: 1_000_000 }), // + house-1 = 6M -> score 14M > margen, descartado
  ];
  const houses = [makeHouse({ id: "house-1", price: 5_000_000 })];
  const combos = searchProjectCombinations(parcels, houses, budget);
  assert.equal(combos.length, 1, "una sola casa disponible: no puede haber más de 1 combinación sin repetirla");
  assert.equal(combos[0]!.totalPrice, 20_000_000);
});

test("runSearch intent project: usa house[] inyectado, nunca lee casas.js", () => {
  const parcel = makeProperty({ price: 15_000_000 });
  const houses = [makeHouse({ id: "house-1", price: 5_000_000, name: "Casa 24m²" })];
  const result = runSearch(parcel ? [parcel] : [], propertyFilters({ intent: "project", totalBudget: 20_000_000 }), { houses });
  assert.equal(result.intent, "project");
  assert.equal(result.properties.length, 0, "en modo project, 'properties' queda vacío por contrato — el resultado va en 'combinations'");
  assert.equal(result.combinations?.length, 1);
  assert.equal(result.combinations?.[0]!.house.id, "house-1");
  assert.equal(result.total, 1);
});

// ---------------------------------------------------------------------------
// 18. modo "project" sin totalBudget — corrección de revisión de código
// ---------------------------------------------------------------------------

test("runSearch intent project sin totalBudget: lanza en vez de asumir presupuesto 0", () => {
  const parcel = makeProperty({ price: 15_000_000 });
  assert.throws(
    () => runSearch([parcel], propertyFilters({ intent: "project" }), { houses: [makeHouse()] }),
    /requiere "totalBudget"/,
  );
});

test("runSearch intent project con totalBudget no finito: lanza", () => {
  const parcel = makeProperty({ price: 15_000_000 });
  assert.throws(
    () => runSearch([parcel], propertyFilters({ intent: "project", totalBudget: NaN }), { houses: [makeHouse()] }),
    /debe ser un número finito/,
  );
});

// ---------------------------------------------------------------------------
// 19. límites numéricos inválidos — corrección de revisión de código
// ---------------------------------------------------------------------------

test("priceMin no finito lanza", () => {
  assert.throws(() => searchProperties([makeProperty()], propertyFilters({ priceMin: NaN })), /debe ser un número finito/);
});

test("priceMax no finito lanza", () => {
  assert.throws(() => searchProperties([makeProperty()], propertyFilters({ priceMax: Infinity })), /debe ser un número finito/);
});

test("landAreaMin no finito lanza", () => {
  assert.throws(() => searchProperties([makeProperty()], propertyFilters({ landAreaMin: NaN })), /debe ser un número finito/);
});

test("landAreaMax no finito lanza", () => {
  assert.throws(() => searchProperties([makeProperty()], propertyFilters({ landAreaMax: -Infinity })), /debe ser un número finito/);
});

test("limit negativo lanza en vez de recortar desde el final del arreglo (Array.slice)", () => {
  const catalog = [makeProperty(), makeProperty(), makeProperty()];
  assert.throws(() => runSearch(catalog, propertyFilters({ limit: -5 })), /no puede ser negativo/);
});

test("limit no finito lanza", () => {
  const catalog = [makeProperty()];
  assert.throws(() => runSearch(catalog, propertyFilters({ limit: Infinity })), /debe ser un número finito/);
});

test("limit === 0 es válido: devuelve cero resultados, no un error", () => {
  const catalog = [makeProperty(), makeProperty()];
  const result = runSearch(catalog, propertyFilters({ limit: 0 }));
  assert.equal(result.properties.length, 0);
  assert.equal(result.total, 2, "total sigue reflejando los que califican, antes del limit");
});

// ---------------------------------------------------------------------------
// Resumen
// ---------------------------------------------------------------------------

console.log(`\n${passed} ok, ${failed} fallidos.`);
if (failed > 0) process.exitCode = 1;
