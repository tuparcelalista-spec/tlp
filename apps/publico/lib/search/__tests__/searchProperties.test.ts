/**
 * Tests de integración de `searchProperties()` — Bloque 2.2. Verifican el
 * CABLEADO (repositorio -> Search Core -> SearchResult), no la lógica
 * interna de filtrado/ranking, que ya está cubierta exhaustivamente por
 * `packages/core/src/__tests__/search.test.ts` (Bloque 2.1).
 *
 * Usan un `PropertyRepository` FALSO inyectado vía `options.repository` —
 * cero llamadas de red, cero Supabase real. El smoke test read-only contra
 * Supabase real vive aparte, en `searchProperties.smoke.ts`.
 *
 * Requiere resolver `@tpl/core` en tiempo de ejecución (a diferencia de
 * `houseAdapter.test.ts`) — se ejecuta con el mismo mecanismo de
 * compilación que el resto del proyecto, más un NODE_PATH que apunta a una
 * compilación plana y temporal de `@tpl/core` (ver informe de cierre del
 * Bloque 2.2 para el comando exacto). `@tpl/core` no tiene paso de build
 * propio (Fase 1: `"main": "./src/index.ts"`, sin `dist/`) — Next.js lo
 * resuelve sin problema porque transpila TS de paquetes del workspace; un
 * `node` plano no, así que este archivo necesita ese paso adicional solo
 * para poder ejecutarse fuera de Next.js.
 */
import assert from "node:assert/strict";
import type { Property, PropertyCharacteristics, PropertyValuation, PropertyRepository } from "@tpl/core";
import { searchProperties } from "../supabaseSearchRepository";
import { adaptCasasToHouses } from "../houseAdapter";

let passed = 0;
let failed = 0;
function test(name: string, fn: () => Promise<void> | void): Promise<void> {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passed += 1;
      console.log(`  ok - ${name}`);
    })
    .catch((error) => {
      failed += 1;
      console.error(`  FAIL - ${name}`);
      console.error(`    ${error instanceof Error ? error.message : error}`);
    });
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

/** Repositorio falso — implementa el contrato PropertyRepository (Bloque 1) sin tocar Supabase. */
function fakeRepository(properties: Property[]): PropertyRepository {
  return {
    async list() {
      return properties;
    },
    async getByCode(code: string) {
      return properties.find((p) => p.code === code) ?? null;
    },
  };
}

async function main() {
  await test("Supabase (simulado) -> Property[] -> Search Core: búsqueda por comuna", async () => {
    const repository = fakeRepository([
      makeProperty({ commune: "Yumbel" }),
      makeProperty({ commune: "Nacimiento" }),
    ]);
    const result = await searchProperties({ intent: "property", commune: "Yumbel" }, { repository });
    assert.equal(result.properties.length, 1);
    assert.equal(result.properties[0]!.commune, "Yumbel");
  });

  await test("búsqueda por keyword", async () => {
    const repository = fakeRepository([
      makeProperty({ title: "Parcela con bosque nativo" }),
      makeProperty({ title: "Sitio urbano" }),
    ]);
    const result = await searchProperties({ intent: "property", keyword: "bosque" }, { repository });
    assert.equal(result.properties.length, 1);
  });

  await test("precio (priceMin/priceMax)", async () => {
    const repository = fakeRepository([
      makeProperty({ price: 5_000_000 }),
      makeProperty({ price: 50_000_000 }),
    ]);
    const result = await searchProperties({ intent: "property", priceMin: 10_000_000 }, { repository });
    assert.equal(result.properties.length, 1);
    assert.equal(result.properties[0]!.price, 50_000_000);
  });

  await test("superficie (landAreaMin/landAreaMax)", async () => {
    const repository = fakeRepository([
      makeProperty({ landAreaM2: 1000 }),
      makeProperty({ landAreaM2: 20000 }),
    ]);
    const result = await searchProperties({ intent: "property", landAreaMin: 10000 }, { repository });
    assert.equal(result.properties.length, 1);
    assert.equal(result.properties[0]!.landAreaM2, 20000);
  });

  await test("naturalFeatures", async () => {
    const repository = fakeRepository([
      makeProperty({ characteristics: { ...EMPTY_CHARACTERISTICS, naturalFeatures: ["bosque"] } }),
      makeProperty({ characteristics: { ...EMPTY_CHARACTERISTICS, naturalFeatures: [] } }),
    ]);
    const result = await searchProperties({ intent: "property", naturalFeatures: ["bosque"] }, { repository });
    assert.equal(result.properties.length, 1);
  });

  await test("coordinates + radiusKm", async () => {
    const origin = { lat: -36.8, lng: -73.05 };
    const repository = fakeRepository([
      makeProperty({ coordinates: { lat: -36.81, lng: -73.06 } }), // cerca
      makeProperty({ coordinates: { lat: -37.5, lng: -72.5 } }), // lejos (~90km)
    ]);
    const result = await searchProperties({ intent: "property", coordinates: origin, radiusKm: 5 }, { repository });
    assert.equal(result.properties.length, 1);
  });

  await test("ranking se aplica (economic, ascendente)", async () => {
    const repository = fakeRepository([
      makeProperty({ price: 30_000_000 }),
      makeProperty({ price: 10_000_000 }),
    ]);
    const result = await searchProperties({ intent: "property" }, { repository, ranking: { criterion: "economic" } });
    assert.deepEqual(
      result.properties.map((p) => p.price),
      [10_000_000, 30_000_000],
    );
  });

  await test("ausencia de resultados: SearchResult con arreglo vacío, no error", async () => {
    const repository = fakeRepository([makeProperty({ commune: "Yumbel" })]);
    const result = await searchProperties({ intent: "property", commune: "Comuna inexistente" }, { repository });
    assert.deepEqual(result.properties, []);
    assert.equal(result.total, 0);
  });

  await test("modo project: usa House[] adaptado desde una forma tipo casas.js", async () => {
    const repository = fakeRepository([makeProperty({ price: 15_000_000 })]);
    const houses = adaptCasasToHouses([{ id: "aura18", nombre: "Casa 18m²", valorCasa: 5_000_000 }]);
    const result = await searchProperties(
      { intent: "project", totalBudget: 20_000_000 },
      { repository, houses },
    );
    assert.equal(result.intent, "project");
    assert.equal(result.combinations?.length, 1);
    assert.equal(result.combinations?.[0]!.house.id, "aura18");
  });

  await test("sin repository inyectado y sin variables de entorno: lanza con mensaje claro (no falla silenciosamente)", async () => {
    const savedUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const savedKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    try {
      await assert.rejects(searchProperties({ intent: "property" }), /faltan NEXT_PUBLIC_SUPABASE_URL/);
    } finally {
      if (savedUrl !== undefined) process.env.NEXT_PUBLIC_SUPABASE_URL = savedUrl;
      if (savedKey !== undefined) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = savedKey;
    }
  });

  console.log(`\n${passed} ok, ${failed} fallidos.`);
  if (failed > 0) process.exitCode = 1;
}

main();
