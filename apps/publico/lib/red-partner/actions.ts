"use server";

import { createSupabasePublicClient } from "@tpl/core";

/**
 * Persistencia de la postulación a la Red Partner — versión reducida.
 *
 * === POR QUÉ "REDUCIDA" Y NO EL PORTE COMPLETO DE `red-partner-v2` ===
 *
 * El formulario legacy real (`frontend-v2/red-partner-v2/index.html` +
 * `postular.js`, 29KB de JS) no es un formulario de postulación: es el
 * intake de un producto de perfil profesional pago ("TPL Studio") con
 * planes (`PLAN_PRICES`), subida de logo/galería a un bucket propio
 * (`partner-postulaciones-v2`), un constructor de "método de trabajo por
 * etapas" y borrador guardable server-side. Portar eso es una migración
 * de producto aparte, no un ítem de "brechas visuales" — decisión ya
 * tomada explícitamente en `PartnerApplicationDialog.tsx` y confirmada de
 * nuevo con el usuario antes de ampliar este formulario.
 *
 * Lo que SÍ se amplía acá (de "oficio + comuna" a un formulario real de
 * postulación) usa el mismo patrón ya validado del resto del sitio:
 * `tpl_registrar_oportunidad_publica_v1` con `tipo: 'servicio'` (el valor
 * del dominio para "alguien que ofrece un servicio", confirmado contra
 * `RegistrarSolicitudVisitaInput`/`registrarCotizacionAction`) y todo el
 * detalle real (rubro, especialidades, comunas, experiencia, condiciones
 * comerciales, consentimientos) viaja en `metadata` — sin tabla, RPC ni
 * bucket nuevos.
 *
 * Mismas dos reglas de UX que `registrarSolicitudVisita` /
 * `registrarCotizacionAction`:
 * 1. Nunca lanza excepciones al llamador.
 * 2. Tolera fallos y antiduplicado (10 minutos) de Supabase — el diálogo
 *    abre WhatsApp igual pase lo que pase con la persistencia.
 */

const TIPO_POSTULACION = "servicio";
const ORIGEN_RED_PARTNER = "red_partner_postulacion";

export interface RegistrarPostulacionPartnerInput {
  nombreComercial: string;
  nombreResponsable: string;
  telefono: string;
  whatsapp: string;
  correo?: string;
  tipoServicio: string;
  especialidades: string[];
  especialidadOtra?: string;
  region: string;
  comunas: string[];
  anosExperiencia: number;
  disponibilidad: string;
  diferenciacion: string[];
  diferenciacionOtra?: string;
  porcentajeAnticipo?: string;
  garantiaServicio?: string;
  emiteFactura: boolean;
  trabajaBajoMarcaTpl: boolean;
}

export type RegistrarPostulacionPartnerResult =
  | { ok: true; codigo?: string; duplicada?: boolean }
  | { ok: false; motivo: string };

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return createSupabasePublicClient({ url, anonKey });
}

export async function registrarPostulacionPartnerAction(
  input: RegistrarPostulacionPartnerInput,
): Promise<RegistrarPostulacionPartnerResult> {
  const nombreComercial = input.nombreComercial.trim();
  const nombreResponsable = input.nombreResponsable.trim();
  const telefono = input.telefono.trim();
  const correo = (input.correo || "").trim().toLowerCase();

  if (nombreComercial.length < 2) return { ok: false, motivo: "NOMBRE_COMERCIAL_REQUERIDO" };
  if (nombreResponsable.length < 2) return { ok: false, motivo: "NOMBRE_RESPONSABLE_REQUERIDO" };
  if (telefono.replace(/\D/g, "").length < 8) return { ok: false, motivo: "TELEFONO_INVALIDO" };
  if (!input.tipoServicio) return { ok: false, motivo: "TIPO_SERVICIO_REQUERIDO" };
  if (!input.region) return { ok: false, motivo: "REGION_REQUERIDA" };

  const especialidades = [...input.especialidades, input.especialidadOtra?.trim()].filter(
    (item): item is string => Boolean(item),
  );
  const comunas = input.comunas.filter(Boolean);

  const payload = {
    nombre_contacto: nombreResponsable,
    telefono,
    email: correo || null,
    tipo: TIPO_POSTULACION,
    origen: ORIGEN_RED_PARTNER,
    prioridad: "media",
    mensaje: `Postulación Red Partner: "${nombreComercial}" (${nombreResponsable}) — ${input.tipoServicio}, ${comunas.length} comuna(s) en ${input.region}, ${input.anosExperiencia} años de experiencia.`,
    metadata: {
      nombre_comercial: nombreComercial,
      whatsapp: input.whatsapp.trim() || telefono,
      tipo_servicio: input.tipoServicio,
      especialidades,
      region: input.region,
      comunas,
      anos_experiencia: input.anosExperiencia,
      disponibilidad: input.disponibilidad,
      diferenciacion: [...input.diferenciacion, input.diferenciacionOtra?.trim()].filter(
        (item): item is string => Boolean(item),
      ),
      porcentaje_anticipo: input.porcentajeAnticipo?.trim() || null,
      garantia_servicio: input.garantiaServicio?.trim() || null,
      emite_factura: input.emiteFactura,
      trabaja_bajo_marca_tpl: input.trabajaBajoMarcaTpl,
      canal: "whatsapp",
      formulario: "red_partner_postulacion",
    },
  };

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc("tpl_registrar_oportunidad_publica_v1", { p_payload: payload });

    if (error) {
      if (typeof error.message === "string" && error.message.includes("SOLICITUD_RECIENTE_EXISTENTE")) {
        return { ok: true, duplicada: true };
      }
      console.error("[TPL] registrarPostulacionPartnerAction — error de Supabase:", error.message);
      return { ok: false, motivo: error.message };
    }

    const respuesta = data as { ok?: boolean; codigo?: string; error?: string } | null;
    if (!respuesta?.ok) {
      console.error("[TPL] registrarPostulacionPartnerAction — la RPC respondió sin ok:", respuesta?.error);
      return { ok: false, motivo: respuesta?.error ?? "RESPUESTA_INVALIDA" };
    }

    return { ok: true, codigo: respuesta.codigo };
  } catch (err: unknown) {
    const motivo = err instanceof Error ? err.message : "ERROR_INESPERADO";
    console.error("[TPL] registrarPostulacionPartnerAction — excepción:", motivo);
    return { ok: false, motivo };
  }
}
