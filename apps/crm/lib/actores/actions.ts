"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "../supabase/server";

export type ArchivarActorResult = { ok: true; sinCambios: boolean } | { ok: false; motivo: string };

/**
 * Puerto 1:1 de `archivarActor()` en `crm-tpl-v1/modules/actores/index.js`
 * — misma RPC (`tpl_crm_archivar_actor_v1`, verificada en
 * `20260904010000_tpl_crm_archivar_actor_v1.sql`). El comentario original
 * explica por qué esto NO puede hacerse con un update directo: `tpl_actores`
 * tiene RLS habilitado y cero policies — solo la RPC (security definer +
 * `tpl_es_staff()`) puede cambiar el estado.
 */
export async function archivarActorAction(actorId: string, archivar: boolean, motivo?: string): Promise<ArchivarActorResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("tpl_crm_archivar_actor_v1", {
      p_actor_id: actorId,
      p_archivar: archivar,
      p_motivo: motivo ?? null,
    });
    if (error) throw error;
    if (!data?.ok) throw new Error(data?.error || "La base no confirmó el cambio.");

    revalidatePath("/actores");
    return { ok: true, sinCambios: Boolean(data?.sin_cambios) };
  } catch (err) {
    // Mismo diagnóstico que el original: el error más probable si esto
    // falla es que la migración 20260904010000 no se haya corrido todavía
    // (PostgREST responde 404 / PGRST202 si la RPC no existe).
    const mensaje = err instanceof Error ? err.message : String(err);
    const falta = mensaje.toLowerCase().includes("tpl_crm_archivar_actor_v1") || (err as { code?: string })?.code === "PGRST202";
    const motivoFinal = falta ? "Falta correr la migración 20260904010000 en Supabase para poder archivar actores." : "No se pudo archivar: " + mensaje;
    console.error("[CRM] archivarActorAction:", motivoFinal);
    return { ok: false, motivo: motivoFinal };
  }
}
