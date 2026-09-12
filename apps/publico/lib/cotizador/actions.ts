"use server";

import { createSupabasePublicClient } from "@tpl/core";

/**
 * P1-02 — Persistencia de la oportunidad del Cotizador Web.
 *
 * Invoca la RPC canónica `tpl_registrar_oportunidad_publica_v1` con:
 *   - tipo: 'cotizacion'
 *   - origen: 'cotizador_web'
 *   - metadata: { parcela_codigo, parcela_titulo, vivienda, fundacion, extras, precios, canal: 'whatsapp', formulario: 'cotizador' }
 *
 * Al igual que en `apps/publico/lib/leads/actions.ts`:
 * 1. NUNCA lanza excepciones al llamador (devuelve objeto de resultado).
 * 2. Tolera fallos y antiduplicado (10 minutos) de Supabase.
 */

const TIPO_COTIZACION = "cotizacion";
const ORIGEN_COTIZADOR = "cotizador_web";

export interface RegistrarCotizacionInput {
  nombre: string;
  telefono: string;
  email?: string;
  parcelCode: string;
  parcelTitle: string;
  houseModelName: string;
  houseSurfaceM2: number;
  housePrice: number;
  foundationName?: string;
  foundationPrice: number;
  extrasBreakdown: Array<{ name: string; subtotal: number }>;
  totalProjectPrice: number;
}

export type RegistrarCotizacionResult =
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

export async function registrarCotizacionAction(
  input: RegistrarCotizacionInput
): Promise<RegistrarCotizacionResult> {
  const nombre = input.nombre.trim();
  const telefono = input.telefono.trim();
  const email = (input.email || "").trim().toLowerCase();

  if (nombre.length < 2) return { ok: false, motivo: "NOMBRE_REQUERIDO" };
  if (!telefono && !email) return { ok: false, motivo: "CONTACTO_REQUERIDO" };
  if (telefono && telefono.replace(/\D/g, "").length < 8) {
    return { ok: false, motivo: "TELEFONO_INVALIDO" };
  }

  const payload = {
    nombre_contacto: nombre,
    telefono: telefono || null,
    email: email || null,
    tipo: TIPO_COTIZACION,
    origen: ORIGEN_COTIZADOR,
    prioridad: "alta",
    presupuesto: Math.round(input.totalProjectPrice),
    mensaje: `Cotización de proyecto: Parcela "${input.parcelTitle}" + Vivienda "${input.houseModelName}" (${input.houseSurfaceM2} m²). Total: $${new Intl.NumberFormat("es-CL").format(Math.round(input.totalProjectPrice))} CLP.`,
    metadata: {
      parcela_codigo: input.parcelCode,
      parcela_titulo: input.parcelTitle,
      vivienda: {
        modelo: input.houseModelName,
        superficie_m2: input.houseSurfaceM2,
        precio: input.housePrice,
      },
      fundacion: {
        tipo: input.foundationName ?? "No seleccionada",
        precio: input.foundationPrice,
      },
      extras: input.extrasBreakdown,
      precios: {
        total: Math.round(input.totalProjectPrice),
      },
      canal: "whatsapp",
      formulario: "cotizador",
    },
  };

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc("tpl_registrar_oportunidad_publica_v1", {
      p_payload: payload,
    });

    if (error) {
      if (typeof error.message === "string" && error.message.includes("SOLICITUD_RECIENTE_EXISTENTE")) {
        return { ok: true, duplicada: true };
      }
      console.error("[TPL] registrarCotizacionAction — error de Supabase:", error.message);
      return { ok: false, motivo: error.message };
    }

    const respuesta = data as { ok?: boolean; codigo?: string; error?: string } | null;
    if (!respuesta?.ok) {
      console.error("[TPL] registrarCotizacionAction — la RPC respondió sin ok:", respuesta?.error);
      return { ok: false, motivo: respuesta?.error ?? "RESPUESTA_INVALIDA" };
    }

    return { ok: true, codigo: respuesta.codigo };
  } catch (err: unknown) {
    const motivo = err instanceof Error ? err.message : "ERROR_INESPERADO";
    console.error("[TPL] registrarCotizacionAction — excepción:", motivo);
    return { ok: false, motivo };
  }
}
