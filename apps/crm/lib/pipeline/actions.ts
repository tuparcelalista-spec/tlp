"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "../supabase/server";
import { COLUMNAS } from "./columns";

export type MoverOportunidadResult = { ok: true } | { ok: false; motivo: string };

/**
 * Puerto 1:1 de `moverOportunidad()` en
 * `crm-tpl-v1/modules/pipeline/index.js` — misma RPC
 * (`tpl_crm_actualizar_estado_oportunidad_v1`), mismo comentario de
 * auditoría. La RPC exige sesión de staff (`auth.uid()` + `tpl_es_staff()`
 * dentro de la función, ver `202608090002_...sql`); como esta Server Action
 * usa `createSupabaseServerClient()` (cookies de la request), corre con la
 * identidad real del staff logueado — nunca con la clave anon.
 */
export async function moverOportunidadAction(oportunidadId: string, estadoOrigen: string, estadoDestino: string): Promise<MoverOportunidadResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const destino = COLUMNAS.find((c) => c.id === estadoDestino);

    const { error } = await supabase.rpc("tpl_crm_actualizar_estado_oportunidad_v1", {
      p_oportunidad_id: oportunidadId,
      p_estado: estadoDestino,
      p_comentario: `Movida desde "${estadoOrigen}" en el tablero`,
    });
    if (error) throw error;

    revalidatePath("/pipeline");
    return { ok: true };
  } catch (err) {
    const motivo = err instanceof Error ? err.message : "No se pudo guardar el cambio.";
    console.error("[CRM] moverOportunidadAction:", motivo);
    return { ok: false, motivo };
  }
}

export type DescartarOportunidadResult =
  | { ok: true; modo: "eliminada" }
  | { ok: true; modo: "cancelada" }
  | { ok: false; motivo: string; requiereConfirmarCancelacion?: true };

/**
 * Puerto 1:1 de `descartarOportunidad()` — mismo patrón de borrado que el
 * borrado de parcelas: intenta el borrado definitivo primero; si Postgres
 * responde violación de FK (`23503`, la oportunidad tiene historial —
 * visitas, comunicaciones, un proyecto), en vez de fallar en seco ofrece
 * marcarla `cancelada` vía la misma RPC de cambio de estado.
 *
 * `confirmarCancelacion` reemplaza el `confirm()` nativo del navegador que
 * usa la versión legacy (no existe en un Server Action): el cliente vuelve
 * a llamar esta acción con `confirmarCancelacion: true` solo si el usuario
 * aceptó el diálogo de confirmación en pantalla.
 */
export async function descartarOportunidadAction(oportunidadId: string, confirmarCancelacion = false): Promise<DescartarOportunidadResult> {
  const supabase = await createSupabaseServerClient();

  try {
    // .select('id') es imprescindible: sin representación, Supabase responde
    // 200 / error:null aunque RLS haya bloqueado el borrado sin tocar
    // ninguna fila, y el descarte se anunciaría como éxito sin serlo.
    const { data: borradas, error } = await supabase.from("tpl_oportunidades").delete().eq("id", oportunidadId).select("id");

    if (error && (error as { code?: string }).code === "23503") {
      if (!confirmarCancelacion) {
        return {
          ok: false,
          motivo: "No se puede borrar definitivamente porque tiene historial asociado (visitas, correos o un proyecto). ¿Marcarla como cancelada en su lugar?",
          requiereConfirmarCancelacion: true,
        };
      }

      const { error: errRpc } = await supabase.rpc("tpl_crm_actualizar_estado_oportunidad_v1", {
        p_oportunidad_id: oportunidadId,
        p_estado: "cancelada",
        p_comentario: "Descartada desde el tablero del pipeline",
      });
      if (errRpc) throw errRpc;

      revalidatePath("/pipeline");
      return { ok: true, modo: "cancelada" };
    }

    if (error) throw error;
    if (!borradas?.length) {
      throw new Error("La base no confirmó el borrado (0 filas afectadas). Revisa que tu usuario tenga permisos de staff en el CRM.");
    }

    revalidatePath("/pipeline");
    return { ok: true, modo: "eliminada" };
  } catch (err) {
    const motivo = err instanceof Error ? err.message : "No se pudo eliminar la oportunidad.";
    console.error("[CRM] descartarOportunidadAction:", motivo);
    return { ok: false, motivo };
  }
}
