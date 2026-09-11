/**
 * Smoke test real de `searchProperties()` — Bloque 2.2. Ejecuta el flujo
 * completo Supabase -> PropertyRepository -> Property[] -> Search Core ->
 * SearchResult contra datos reales (clave `anon`, sujeta a RLS). Solo
 * lectura — ninguna escritura, ninguna migración, ningún cambio de schema.
 *
 * Requiere NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY (las
 * mismas ya definidas en el `.env.local` de la raíz desde el Bloque 1.3).
 * Nunca lee `service_role`, nunca imprime valores de credenciales.
 */
import assert from "node:assert/strict";
import { searchProperties } from "../supabaseSearchRepository";
import { getPropertyDetail, getFeaturedProperties, getOpportunityProperties } from "../actions";

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

  // Caso 1: catálogo general (sin filtros), ranking económico por defecto.
  const general = await searchProperties({ intent: "property" });
  assert.ok(Array.isArray(general.properties), "properties debe ser un array");
  assert.equal(general.intent, "property");
  console.log(`[smoke] OK — catálogo general: ${general.properties.length} propiedad(es) (total=${general.total}).`);

  if (general.properties.length === 0) {
    console.warn("[smoke] Catálogo vacío — se omiten los casos que dependen de datos reales.");
    return;
  }

  // Caso 2: búsqueda real por la comuna de la primera propiedad encontrada.
  const realCommune = general.properties[0]!.commune;
  if (realCommune) {
    const byCommune = await searchProperties({ intent: "property", commune: realCommune });
    assert.ok(byCommune.properties.every((p) => p.commune === realCommune), "todas las propiedades deben ser de la comuna pedida");
    console.log(`[smoke] OK — búsqueda por comuna ("${realCommune}"): ${byCommune.properties.length} resultado(s).`);
  }

  // Caso 3: keyword usando la palabra más larga del título de la primera
  // propiedad (más robusto que la primera palabra, que a veces es un
  // artículo corto como "La"/"El").
  const words = general.properties[0]!.title.split(/\s+/).filter((w) => w.length > 3);
  const longestWord = words.sort((a, b) => b.length - a.length)[0];
  if (longestWord) {
    const byKeyword = await searchProperties({ intent: "property", keyword: longestWord });
    assert.ok(byKeyword.properties.length >= 1, "la propia propiedad de origen debe aparecer en su propia búsqueda por keyword");
    console.log(`[smoke] OK — búsqueda por keyword ("${longestWord}"): ${byKeyword.properties.length} resultado(s).`);
  } else {
    console.warn("[smoke] Título sin palabras de más de 3 letras — se omite el caso de keyword en esta corrida.");
  }

  // Fase 3.12 — getPropertyDetail(): código real y código inexistente.
  const realCode = general.properties[0]!.code;
  const detail = await getPropertyDetail(realCode);
  assert.ok(detail, "getPropertyDetail() con un código real no debe devolver null");
  assert.equal(detail!.code, realCode);
  assert.ok(
    detail!.valuation.technicalValueLabel !== undefined &&
      detail!.valuation.communalAverageValueLabel !== undefined &&
      detail!.valuation.recommendedValueLabel !== undefined,
    "los 3 campos de valoración deben existir en el ViewModel (aunque su valor sea null)",
  );
  console.log(`[smoke] OK — getPropertyDetail("${realCode}") devolvió detalle real, con los 3 campos de valoración presentes.`);

  const missing = await getPropertyDetail("codigo-que-no-existe-xyz");
  assert.equal(missing, null, "getPropertyDetail() con un código inexistente debe devolver null");
  console.log('[smoke] OK — getPropertyDetail("codigo-que-no-existe-xyz") devolvió null.');

  // Fase 3.6 — featured/opportunity (filtro a nivel de llamador, ver actions.ts).
  const featured = await getFeaturedProperties(6);
  const opportunities = await getOpportunityProperties(6);
  assert.ok(Array.isArray(featured) && Array.isArray(opportunities));
  console.log(`[smoke] OK — ${featured.length} destacada(s), ${opportunities.length} oportunidad(es) TPL reales.`);

  console.log("[smoke] OK — flujo completo Supabase -> PropertyRepository -> Search Core -> SearchResult verificado.");
}

main().catch((error) => {
  console.error("[smoke] Falló:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
