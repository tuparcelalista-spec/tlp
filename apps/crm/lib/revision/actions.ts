"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "../supabase/server";
import type { DetallePublicacion } from "./data";
import { getDetallePublicacion } from "./data";

export type DetalleActionResult = { ok: true; detalle: DetallePublicacion } | { ok: false; motivo: string };

/**
 * Puerto del handler de `.btn-revisar` en `init()`: carga la ficha completa
 * (`tpl_publicacion_detalle_v1`) bajo demanda, al abrir el panel — no en el
 * listado, igual que el original.
 */
export async function obtenerDetallePublicacionAction(publicacionId: string): Promise<DetalleActionResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const detalle = await getDetallePublicacion(supabase, publicacionId);
    return { ok: true, detalle };
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : String(err);
    console.error("[CRM] obtenerDetallePublicacionAction:", mensaje);
    return { ok: false, motivo: mensaje };
  }
}

export type DecisionRevisionResult = { ok: true; mensaje: string } | { ok: false; motivo: string };

/**
 * Puerto 1:1 de `decidir()` en `conectarDecision()` — una sola RPC
 * (`tpl_revisar_publicacion_v1`) para aprobar o rechazar, que además encola
 * el correo de aviso a quien publicó. La RPC ya valida "rechazar sin motivo"
 * del lado de la base (`Para rechazar hay que indicar el motivo`); acá se
 * repite la misma validación de UI que el original para no esperar el viaje
 * de red en el caso más común de error.
 */
export async function revisarPublicacionAction(
  publicacionId: string,
  decision: "aprobar" | "rechazar",
  motivo: string | null,
): Promise<DecisionRevisionResult> {
  const motivoLimpio = motivo?.trim() || null;

  if (decision === "rechazar" && !motivoLimpio) {
    return { ok: false, motivo: "Escribe el motivo del rechazo: es lo que le vamos a explicar a la persona." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("tpl_revisar_publicacion_v1", {
      p_publicacion_id: publicacionId,
      p_decision: decision,
      p_motivo: motivoLimpio,
    });

    if (error) {
      const mensaje = error.message || "";
      throw new Error(mensaje.includes("no autorizado") ? "Tu usuario no tiene permisos de staff en el CRM." : mensaje);
    }
    if (!data?.ok) throw new Error(data?.error || "No pudimos registrar la decisión.");

    const aviso = data?.correo_encolado ? `Le avisamos a ${data.destinatario}.` : "No había correo registrado, así que no se envió aviso.";
    const mensaje = decision === "aprobar" ? `Publicada. ${aviso}` : `Rechazada. ${aviso}`;

    revalidatePath("/revision");
    revalidatePath("/parcelas");
    return { ok: true, mensaje };
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : String(err);
    console.error("[CRM] revisarPublicacionAction:", mensaje);
    return { ok: false, motivo: mensaje };
  }
}
