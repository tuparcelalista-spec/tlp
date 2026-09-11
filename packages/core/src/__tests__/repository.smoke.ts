/**
 * Smoke test de `SupabasePropertyRepository` — Bloque 1.3.
 *
 * Ejecuta una lectura pública real y de solo lectura contra Supabase (clave
 * `anon`, sujeta a RLS) y valida la forma del resultado. No es un test
 * runner (no hay Vitest/Jest instalado, a propósito) — se ejecuta
 * directamente con Node, que en esta versión soporta `.ts` de forma nativa:
 *
 * Node ejecuta `.ts` de forma nativa (borrado de tipos), pero su resolutor
 * ESM exige la extensión exacta del archivo en disco en CADA import
 * relativo de toda la cadena transitiva — a diferencia de `tsc`/bundlers,
 * que resuelven imports sin extensión (`moduleResolution: "bundler"`, el
 * modo de este paquete). Añadir extensiones a los imports de
 * `property.ts`/`normalizeProperty.ts` para acomodar esto está fuera de
 * regla en este bloque (archivos protegidos salvo error bloqueante). Por
 * eso este archivo, igual que el resto del paquete, no usa extensiones en
 * sus imports, y se ejecuta compilándolo primero con el `typescript` ya
 * declarado como devDependency (sin dependencias nuevas):
 *
 *   npx tsc --project packages/core/tsconfig.json --module commonjs \
 *     --moduleResolution node --outDir <dir-temporal> \
 *     packages/core/src/__tests__/repository.smoke.ts
 *   node <dir-temporal>/repository.smoke.js
 *
 * Requiere `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` (o
 * equivalentes) en el entorno. Este archivo NUNCA lee `service_role` ni
 * ninguna otra credencial privada, y no imprime ningún valor de credencial
 * en ningún caso. Si faltan, se detiene con un mensaje claro y código de
 * salida distinto de 0 en vez de fallar de forma críptica o de inventar un
 * valor por defecto.
 */
import assert from "node:assert/strict";
import { createSupabasePublicClient } from "../supabaseClient";
import { SupabasePropertyRepository } from "../repository";
import type { Property } from "../property";

async function main(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.error(
      "[smoke] Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY en el entorno. " +
        "No se imprime ningún valor. Smoke test detenido — no se realizó ninguna conexión a Supabase.",
    );
    process.exitCode = 1;
    return;
  }

  const client = createSupabasePublicClient({ url, anonKey });
  const repository = new SupabasePropertyRepository(client);

  const results = await repository.list({ limit: 3 });

  assert.ok(Array.isArray(results), "list() debe devolver un array");
  assert.ok(results.length <= 3, "list({ limit: 3 }) no debe devolver más de 3 resultados");

  if (results.length === 0) {
    console.warn("[smoke] list({ limit: 3 }) devolvió 0 resultados publicados — verificar si es esperado.");
  }

  for (const property of results) {
    assertIsPublishedProperty(property);
  }

  console.log(`[smoke] OK — ${results.length} propiedad(es) verificada(s), forma correcta, todas publicadas.`);

  await checkGetByCode(repository, results);
}

/**
 * Verifica `getByCode()` en sus dos casos de contrato: código real (tomado
 * dinámicamente del resultado de `list()`, nunca hardcodeado) → `Property`
 * no-null; código inexistente → estrictamente `null`.
 */
async function checkGetByCode(repository: SupabasePropertyRepository, listResults: Property[]): Promise<void> {
  if (listResults.length === 0) {
    console.warn("[smoke] getByCode(): sin resultados de list() para tomar un código real — se omite el caso existoso.");
  } else {
    const realCode = listResults[0]!.code;
    const found = await repository.getByCode(realCode);

    assert.notEqual(found, null, `getByCode("${realCode}") no debe devolver null`);
    assertIsPublishedProperty(found as Property);
    assert.equal((found as Property).code, realCode, "getByCode() debe devolver la propiedad con el código solicitado");

    console.log(`[smoke] OK — getByCode("${realCode}") devolvió Property no-null con forma correcta.`);
  }

  const notFound = await repository.getByCode("codigo-que-no-existe-xyz");
  assert.equal(notFound, null, 'getByCode("codigo-que-no-existe-xyz") debe devolver estrictamente null');
  console.log('[smoke] OK — getByCode("codigo-que-no-existe-xyz") devolvió null.');
}

function assertIsPublishedProperty(property: Property): void {
  assert.equal(typeof property.id, "string");
  assert.ok(property.id.length > 0, "id no debe estar vacío");
  assert.equal(typeof property.code, "string");
  assert.ok(property.code.length > 0, "code no debe estar vacío");
  assert.equal(typeof property.title, "string");
  assert.equal(typeof property.commune, "string");
  assert.equal(property.price === null || typeof property.price === "number", true, "price debe ser number o null");
  assert.ok(Array.isArray(property.images), "images debe ser un array");
  assert.equal(property.status, "publicada", "list() no debe devolver propiedades no publicadas");
}

main().catch((error) => {
  console.error("[smoke] Falló:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
