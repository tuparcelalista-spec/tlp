"use server";

import { createSupabasePublicClient } from "@tpl/core";

/**
 * P1-01 — Persistencia del lead de "Agendar visita" (2026-09-12).
 *
 * === POR QUÉ UNA RPC Y NO UN INSERT DIRECTO A `tpl_oportunidades` ===
 *
 * La instrucción original decía "inserta el lead en `tpl_oportunidades`".
 * Se implementa a través de la RPC `tpl_registrar_oportunidad_publica_v1`,
 * que es la que YA inserta en esa misma tabla, porque leer su definición
 * (`supabase/migrations/20260901120000_tpl_oportunidad_publica_contacto_flexible_v1.sql`)
 * deja claro que un `.insert()` crudo perdería cuatro cosas que el negocio
 * ya tiene resueltas:
 *
 *   1. El `codigo` legible (`OP-YYYYMMDD-XXXXXX`) que genera la función.
 *   2. El antiduplicado de 10 minutos por vía de contacto + parcela.
 *   3. El evento `oportunidad_publica_recibida` en `tpl_eventos`.
 *   4. La validación de contacto (nombre ≥ 2, y correo O teléfono válido).
 *
 * Además es `security definer`, que es el patrón del proyecto para escribir
 * en tablas del CRM desde el sitio público con la clave `anon` — el mismo
 * camino que usa hoy `frontend-v2` en el cotizador
 * (`tpl-data-service.js:createPublicOpportunity`). No se creó ni se alteró
 * ningún objeto de Supabase para esto.
 *
 * NO se usa `tpl_registrar_lead_v1`: está confirmada como rota en
 * producción (404, auditoría de Fase 0) y su fallback apunta a
 * `tpl_crm_oportunidades`, que tampoco existe. Ese saneamiento es P0-03 y
 * sigue pendiente; esta implementación no depende de él.
 *
 * === DOS DIFERENCIAS CON LO PEDIDO, POR LÍMITES REALES DEL ESQUEMA ===
 *
 *  · `estado: 'nuevo'` → la RPC fija el estado internamente en **`'nueva'`**
 *    (femenino) y no acepta override. Se respeta el valor real del esquema.
 *  · `canal: 'whatsapp'` → `tpl_oportunidades` no tiene columna `canal`. El
 *    equivalente real son `origen` (texto) y `metadata` (jsonb), así que el
 *    canal viaja como `metadata.canal = 'whatsapp'` y el origen queda como
 *    `'agendar_visita'`, que es el mismo literal que usa el legacy.
 */

/** `tipo` admitido por la RPC: consulta | cotizacion | reserva | compra | arriendo | servicio. */
const TIPO_CONSULTA = "consulta";
const ORIGEN_AGENDAR_VISITA = "agendar_visita";

export interface RegistrarSolicitudVisitaInput {
  nombre: string;
  telefono: string;
  propertyCode: string;
  propertyTitle: string;
}

export type RegistrarSolicitudVisitaResult =
  /** Quedó registrada (o ya existía una idéntica en los últimos 10 minutos). */
  | { ok: true; codigo?: string; duplicada?: boolean }
  /** No se pudo registrar. `motivo` es para logging/telemetría, NUNCA para mostrar al visitante. */
  | { ok: false; motivo: string };

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return createSupabasePublicClient({ url, anonKey });
}

/**
 * Registra la solicitud de visita. **Nunca lanza**: devuelve siempre un
 * resultado. Es deliberado — el llamador (`ScheduleVisitDialog`) tiene que
 * poder abrir WhatsApp pase lo que pase, y una caída de Supabase no puede
 * convertirse en un visitante que no logra contactar.
 */
export async function registrarSolicitudVisita(
  input: RegistrarSolicitudVisitaInput,
): Promise<RegistrarSolicitudVisitaResult> {
  const nombre = input.nombre.trim();
  const telefono = input.telefono.trim();

  // Mismas condiciones mínimas que valida la RPC — comprobarlas acá evita un
  // viaje de red garantizadamente fallido, no reemplaza su validación.
  if (nombre.length < 2) return { ok: false, motivo: "NOMBRE_REQUERIDO" };
  if (telefono.replace(/\D/g, "").length < 8) return { ok: false, motivo: "TELEFONO_INVALIDO" };

  const payload = {
    nombre_contacto: nombre,
    telefono,
    tipo: TIPO_CONSULTA,
    origen: ORIGEN_AGENDAR_VISITA,
    prioridad: "media",
    mensaje: `Solicita coordinar una visita a "${input.propertyTitle}" (código ${input.propertyCode}).`,
    metadata: {
      // `parcela_codigo` es la clave que usa el antiduplicado de la RPC — sin
      // ella, dos solicitudes a parcelas distintas del mismo teléfono en 10
      // minutos se tratarían como la misma.
      parcela_codigo: input.propertyCode,
      parcela_titulo: input.propertyTitle,
      canal: "whatsapp",
      formulario: "agendar_visita",
    },
  };

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc("tpl_registrar_oportunidad_publica_v1", { p_payload: payload });

    if (error) {
      // La RPC señala el duplicado con `raise exception`, que llega como
      // error. No es un fallo desde el punto de vista del visitante: su
      // solicitud ya está registrada.
      if (typeof error.message === "string" && error.message.includes("SOLICITUD_RECIENTE_EXISTENTE")) {
        return { ok: true, duplicada: true };
      }
      console.error("[TPL] registrarSolicitudVisita — error de Supabase:", error.message);
      return { ok: false, motivo: error.message };
    }

    const respuesta = data as { ok?: boolean; codigo?: string; error?: string } | null;
    if (!respuesta?.ok) {
      console.error("[TPL] registrarSolicitudVisita — la RPC respondió sin ok:", respuesta?.error);
      return { ok: false, motivo: respuesta?.error ?? "RESPUESTA_INVALIDA" };
    }

    return { ok: true, codigo: respuesta.codigo };
  } catch (err: unknown) {
    const motivo = err instanceof Error ? err.message : "ERROR_INESPERADO";
    console.error("[TPL] registrarSolicitudVisita — excepción:", motivo);
    return { ok: false, motivo };
  }
}
