"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "../supabase/server";

export type VisitaActionResult = { ok: true } | { ok: false; motivo: string };

/**
 * Puerto 1:1 de `cancelarVisita()` en `modules/visitas/index.js`: update
 * directo sobre `tpl_visitas` — la policy `tpl_visitas_staff_all`
 * (`202608090000_tpl_crm_visitas_v1.sql`) es `for all` a staff autenticado,
 * así que a diferencia de `tpl_actores`/`tpl_oportunidades` (RLS sin
 * ninguna policy, que obligan a pasar por una RPC security definer) el
 * update directo alcanza. `.select('id')` es obligatorio: sin
 * representación, Supabase devuelve 200/error:null aunque RLS haya
 * bloqueado el update y 0 filas se hayan tocado.
 */
export async function cancelarVisitaAction(id: string, motivo: string | null): Promise<VisitaActionResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("tpl_visitas")
      .update({
        estado: "cancelada",
        notas: motivo?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id");

    if (error) throw error;
    if (!data?.length) {
      throw new Error("La base no confirmó la cancelación (0 filas afectadas). Revisa que tu usuario tenga permisos de staff en el CRM.");
    }

    revalidatePath("/visitas");
    return { ok: true };
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : String(err);
    console.error("[CRM] cancelarVisitaAction:", mensaje);
    return { ok: false, motivo: mensaje };
  }
}

export interface AgendarVisitaInput {
  oportunidadId: string;
  staffId: string;
  fechaHoraIso: string;
  notas: string;
}

const MOTIVOS_AGENDAR: Record<string, string> = {
  OPORTUNIDAD_INEXISTENTE: "La oportunidad seleccionada ya no existe.",
  EJECUTIVO_INEXISTENTE: "El ejecutivo seleccionado no es un actor válido.",
  COLISION_HORARIO_EJECUTIVO: "Ese ejecutivo ya tiene otra visita agendada dentro de ±2 horas de ese horario. Elige otra hora o ejecutivo.",
};

/**
 * Puerto de `scheduleVisita()` en `frontend-v2/js/core/tpl-data-service.js`
 * — una función que YA envolvía `tpl_crm_agendar_visita_v1` pero que ningún
 * módulo de `crm-tpl-v1/modules/` llegó a llamar nunca (verificado por
 * `grep` sobre todo `frontend-v2`: cero referencias a `scheduleVisita` ni a
 * la RPC fuera de su propia definición). El botón "Agendar Visita" del CRM
 * legacy no tenía handler y terminó reemplazado por un link a `#pipeline`
 * que tampoco crea nada — ver el comentario de cabecera de
 * `modules/visitas/index.js`. Esta acción es la primera vez que esa RPC
 * (con su chequeo real de colisión de horario del ejecutivo) queda conectada
 * a una pantalla.
 */
export async function agendarVisitaAction(input: AgendarVisitaInput): Promise<VisitaActionResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("tpl_crm_agendar_visita_v1", {
      p_oportunidad_id: input.oportunidadId,
      p_staff_id: input.staffId,
      p_fecha_hora: input.fechaHoraIso,
      p_notas: input.notas.trim() || null,
    });
    if (error) {
      const mensaje = error.message || "";
      const codigo = Object.keys(MOTIVOS_AGENDAR).find((c) => mensaje.includes(c));
      throw new Error(codigo ? MOTIVOS_AGENDAR[codigo] : mensaje.includes("no autorizado") ? "Tu usuario no tiene permisos de staff en el CRM." : mensaje);
    }
    if (!data?.ok) throw new Error("No se pudo agendar la visita.");

    revalidatePath("/visitas");
    revalidatePath("/pipeline");
    return { ok: true };
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : String(err);
    console.error("[CRM] agendarVisitaAction:", mensaje);
    return { ok: false, motivo: mensaje };
  }
}

export interface ActualizarEstadoVisitaInput {
  visitaId: string;
  estado: string;
  resultado?: string;
}

const MOTIVOS_ACTUALIZAR: Record<string, string> = {
  ESTADO_INVALIDO: "Ese estado no es válido para una visita.",
  VISITA_INEXISTENTE: "La visita ya no existe.",
  TRANSICION_TERMINAL_BLOQUEADA: "Esta visita ya quedó en un estado final (realizada, cancelada o no asistió) y no se puede reabrir.",
};

/**
 * Puerto de `updateVisita()` en `tpl-data-service.js` — igual que
 * `agendarVisitaAction`, envuelve una RPC (`tpl_crm_actualizar_visita_v1`,
 * con su propio guard de transiciones irreversibles) que ya existía pero
 * ningún módulo llamaba. Habilita "Confirmar" / "Marcar realizada" / "No
 * asistió" desde `VisitasAgenda`, algo que el CRM legacy no ofrecía en
 * ninguna pantalla (solo se podía cancelar).
 */
export async function actualizarEstadoVisitaAction(input: ActualizarEstadoVisitaInput): Promise<VisitaActionResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("tpl_crm_actualizar_visita_v1", {
      p_visita_id: input.visitaId,
      p_estado: input.estado,
      p_resultado: input.resultado?.trim() || null,
      p_notas: null,
    });
    if (error) {
      const mensaje = error.message || "";
      const codigo = Object.keys(MOTIVOS_ACTUALIZAR).find((c) => mensaje.includes(c));
      throw new Error(codigo ? MOTIVOS_ACTUALIZAR[codigo] : mensaje);
    }
    if (!data?.ok) throw new Error("No se pudo actualizar la visita.");

    revalidatePath("/visitas");
    return { ok: true };
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : String(err);
    console.error("[CRM] actualizarEstadoVisitaAction:", mensaje);
    return { ok: false, motivo: mensaje };
  }
}
