/**
 * Tests puros de `adaptCasasToHouses()` — Bloque 2.2.
 *
 * No depende de `@tpl/core` en tiempo de ejecución (`House` se importa solo
 * como tipo en houseAdapter.ts, se borra al compilar) — se ejecuta con el
 * mecanismo simple ya establecido (typescript ya declarado como
 * devDependency, sin dependencias nuevas):
 *
 *   npx tsc --module commonjs --moduleResolution node --target es2020 \
 *     --esModuleInterop --skipLibCheck --outDir <dir-temporal> \
 *     apps/publico/lib/search/__tests__/houseAdapter.test.ts
 *   node <dir-temporal>/__tests__/houseAdapter.test.js
 *
 * Fixtures controlados, con la forma real de frontend-v2/casas.js — no son
 * evidencia de Supabase.
 */
import assert from "node:assert/strict";
import { adaptCasasToHouses, type RawCasaInput } from "../houseAdapter";

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

test("mapea id/nombre/valorCasa/metros/habitaciones al contrato House", () => {
  const raw: RawCasaInput = { id: "aura18", nombre: "Casa prefabricada 18m²", valorCasa: 2_490_000, metros: 18, habitaciones: 1 };
  const [house] = adaptCasasToHouses([raw]);
  assert.deepEqual(house, { id: "aura18", name: "Casa prefabricada 18m²", price: 2_490_000, areaM2: 18, rooms: 1 });
});

test("usa 'precio' como respaldo cuando 'valorCasa' no está", () => {
  const raw: RawCasaInput = { id: "x1", precio: 1_000_000 };
  const [house] = adaptCasasToHouses([raw]);
  assert.equal(house!.price, 1_000_000);
});

test("descarta filas sin id", () => {
  const raw = { valorCasa: 1_000_000 } as RawCasaInput;
  assert.deepEqual(adaptCasasToHouses([raw]), []);
});

test("descarta filas sin precio numérico positivo (no inventa un precio)", () => {
  const sinPrecio: RawCasaInput = { id: "sin-precio" };
  const precioCero: RawCasaInput = { id: "precio-cero", valorCasa: 0 };
  const precioNegativo: RawCasaInput = { id: "precio-negativo", valorCasa: -5 };
  assert.deepEqual(adaptCasasToHouses([sinPrecio, precioCero, precioNegativo]), []);
});

test("nombre ausente usa respaldo 'Casa'; metros/habitaciones ausentes se omiten (no 0 inventado)", () => {
  const raw: RawCasaInput = { id: "sin-nombre", valorCasa: 3_000_000 };
  const [house] = adaptCasasToHouses([raw]);
  assert.equal(house!.name, "Casa");
  assert.equal("areaM2" in house!, false);
  assert.equal("rooms" in house!, false);
});

console.log(`\n${passed} ok, ${failed} fallidos.`);
if (failed > 0) process.exitCode = 1;
