"use server";

import {
  createSupabasePublicClient,
  type OwnerSummaryResponse,
  type OwnerPropertyUpdatePayload,
  type OwnerPropertyUpdateResponse,
} from "@tpl/core";
import {
  toOwnerPortalViewModel,
  type OwnerPortalViewModel,
  type RawOwnerResumenResponse,
} from "./presentation";

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Faltan variables NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return createSupabasePublicClient({ url, anonKey });
}

/**
 * Obtiene el ViewModel del portal del propietario a partir de su token seguro.
 * Aplica la capa de transformación pura de presentation.ts (con 15 tests unitarios y fallbacks canónicos).
 */
export async function getOwnerPortalViewModel(token: string): Promise<OwnerPortalViewModel | null> {
  const cleanToken = token ? token.trim() : "";
  if (!cleanToken) return null;

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc("tpl_propietario_resumen_por_token_v1", {
      p_token: cleanToken,
    });

    if (error || !data) return null;
    return toOwnerPortalViewModel(data as RawOwnerResumenResponse);
  } catch {
    return null;
  }
}

/**
 * Obtiene el resumen de la propiedad y su tasación mediante el enlace seguro del propietario.
 * Invoca la función SECURITY DEFINER `tpl_propietario_resumen_por_token_v1`.
 */
export async function getOwnerPropertySummary(token: string): Promise<OwnerSummaryResponse> {
  const cleanToken = token ? token.trim() : "";
  if (!cleanToken) {
    return { ok: false, error: "Enlace no disponible o token vacío." };
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc("tpl_propietario_resumen_por_token_v1", {
      p_token: cleanToken,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    if (!data || data.ok === false) {
      return { ok: false, error: (data?.error as string) || "Enlace inválido o vencido." };
    }

    return data as OwnerSummaryResponse;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error inesperado al consultar la propiedad";
    return { ok: false, error: msg };
  }
}

/**
 * Actualiza los atributos de la propiedad mediante el enlace seguro del propietario.
 * Invoca la función SECURITY DEFINER `tpl_propietario_actualizar_por_token_v1`.
 */
export async function updateOwnerProperty(
  token: string,
  payload: OwnerPropertyUpdatePayload,
): Promise<OwnerPropertyUpdateResponse> {
  const cleanToken = token ? token.trim() : "";
  if (!cleanToken) {
    return { ok: false, error: "Enlace no disponible o token vacío." };
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc("tpl_propietario_actualizar_por_token_v1", {
      p_token: cleanToken,
      p_payload: payload,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    if (!data || data.ok === false) {
      return { ok: false, error: (data?.error as string) || "No fue posible actualizar la propiedad." };
    }

    return data as OwnerPropertyUpdateResponse;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error inesperado al actualizar la propiedad";
    return { ok: false, error: msg };
  }
}
