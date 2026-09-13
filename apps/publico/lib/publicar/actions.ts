"use server";

import { createSupabasePublicClient } from "@tpl/core";
import { searchProperties } from "../search/supabaseSearchRepository";
import { formatPriceCLP } from "./wizardState";

/**
 * "Cálculo orientativo de valor" — Paso 3. Decisión explícita, documentada:
 * NO se portó el motor de tasación real (`TPLLandEngine`/`TPLHouseEngine`,
 * ver auditoría de `publicar-v2`) porque no fue autorizado en este bloque —
 * son fórmulas de negocio grandes que merecen su propia revisión línea por
 * línea, no un port apurado. Tampoco se inventa una cifra.
 *
 * Lo que sí se puede mostrar de forma honesta con lo ya aprobado: el precio
 * promedio real de las propiedades YA PUBLICADAS en la misma comuna,
 * reutilizando `searchProperties()` (Search Core, sin lógica nueva, mismo
 * filtro `commune` que ya usa `getRelatedProperties()`). Si la comuna no
 * tiene propiedades publicadas todavía, se devuelve `null` — la página
 * dice "sin datos de mercado en tu comuna todavía", nunca un número
 * inventado.
 */
export interface ComunaPriceReference {
  comuna: string;
  sampleSize: number;
  averagePrice: number;
  averagePriceLabel: string | undefined;
}

export async function getComunaPriceReference(comuna: string): Promise<ComunaPriceReference | null> {
  const trimmed = comuna.trim();
  if (!trimmed) return null;

  const result = await searchProperties({ intent: "property", commune: trimmed });
  if (result.intent !== "property" || result.properties.length === 0) return null;

  const preciosReales = result.properties
    .map((property) => property.price)
    .filter((price): price is number => typeof price === "number" && price > 0);

  if (preciosReales.length === 0) return null;

  const promedio = Math.round(preciosReales.reduce((suma, precio) => suma + precio, 0) / preciosReales.length);

  return {
    comuna: trimmed,
    sampleSize: preciosReales.length,
    averagePrice: promedio,
    averagePriceLabel: formatPriceCLP(promedio),
  };
}

/**
 * P1 — "Hacer que /publicar publique de verdad" (2026-09-13).
 *
 * Hasta acá `PublishWizard` terminaba en un mensaje de WhatsApp: nunca
 * escribía nada en Supabase (documentado explícitamente en
 * `wizardState.ts` y en el propio `PublishWizard.tsx` como decisión, no
 * como olvido). Con el dato de contacto ya recolectado (paso 4, nuevo),
 * esta acción llama a la RPC real y ya existente `tpl_publicar_propiedad_v3`
 * (`supabase/migrations/20260901180000_tpl_publicador_conflicto_identidad_actor_v1.sql`)
 * — la MISMA que usa el publicador legacy — así que la propiedad queda
 * `estado: 'pendiente_revision'` en `tpl_propiedades`, con su actor, su
 * tasación preliminar (si corresponde) y su correo de confirmación
 * encolado, sin tabla ni RPC nuevas.
 *
 * NUNCA lanza: el wizard abre WhatsApp igual pase lo que pase con la
 * persistencia (mismo patrón que `registrarSolicitudVisita`).
 */
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return createSupabasePublicClient({ url, anonKey });
}

export type PublicarPropiedadResult =
  | { ok: true; codigo: string; codigoPropiedad: string; estado: string }
  | { ok: false; motivo: string };

export async function publicarPropiedadAction(payload: Record<string, unknown>): Promise<PublicarPropiedadResult> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc("tpl_publicar_propiedad_v3", { p_payload: payload });

    if (error) {
      console.error("[TPL] publicarPropiedadAction — error de Supabase:", error.message);
      return { ok: false, motivo: error.message };
    }

    const respuesta = data as { ok?: boolean; codigo?: string; codigo_propiedad?: string; estado?: string; error?: string } | null;
    if (!respuesta?.ok) {
      console.error("[TPL] publicarPropiedadAction — la RPC respondió sin ok:", respuesta?.error);
      return { ok: false, motivo: respuesta?.error ?? "RESPUESTA_INVALIDA" };
    }

    return {
      ok: true,
      codigo: respuesta.codigo ?? "",
      codigoPropiedad: respuesta.codigo_propiedad ?? "",
      estado: respuesta.estado ?? "pendiente_revision",
    };
  } catch (err: unknown) {
    const motivo = err instanceof Error ? err.message : "ERROR_INESPERADO";
    console.error("[TPL] publicarPropiedadAction — excepción:", motivo);
    return { ok: false, motivo };
  }
}
