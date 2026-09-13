"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "../supabase/server";
import { getParcelaDetalle } from "../parcelas/data";
import { calcularSimilitud, derivarTargetSimilitud, mapearComparableCatastro, type MercadoComparable } from "./data";

export type AnalisisIaResult = { ok: true; analisis: string; comparablesUsados: number } | { ok: false; motivo: string };

/**
 * Puerto de los códigos de error que `openPremiumReport()` mapea en la rama
 * `data-tool-action="ai-generate"`, verificados contra `publicError()` en
 * `supabase/functions/_shared/security.ts` (la Edge Function nunca devuelve
 * un mensaje fuera de esta lista fija).
 */
const MOTIVOS_IA: Record<string, string> = {
  NO_AUTORIZADO: "Tu usuario no tiene permisos de staff para generar el análisis.",
  SESION_REQUERIDA: "Tu sesión expiró. Vuelve a entrar al CRM.",
  DATOS_INSUFICIENTES: "Falta comuna o superficie en la ficha de la parcela.",
  DEMASIADAS_SOLICITUDES: "Demasiadas solicitudes seguidas. Espera unos minutos.",
  IA_NO_DISPONIBLE: "El servicio de IA no responde ahora. Inténtalo en unos minutos.",
};

/**
 * Puerto de la rama `data-tool-action="ai-generate"` en
 * `modules/tasaciones/premium-report.js`. Reemplaza al stub que el CRM tenía
 * antes (`const generateMarketAnalysis = async () => "Análisis IA simulado
 * (Falta ai.js)"`, limpiado de la base en
 * `20260901170000_tpl_limpiar_ai_analisis_simulado_v1.sql`) por la llamada
 * real a la Edge Function `gemini-analisis-mercado`.
 *
 * Diferencia deliberada frente al original: el original hacía un `fetch()`
 * manual a la URL de la función con un `Authorization: Bearer` obtenido a
 * mano de `client.auth.getSession()`, porque corría en el navegador sin
 * cookies de servidor. Aquí, igual que en `subirFotoAction`
 * (`lib/parcelas/actions.ts`), `supabase.functions.invoke()` sobre el cliente
 * de `@supabase/ssr` ya reenvía el Bearer de la sesión de cookies
 * automáticamente — no hace falta el paso manual, y los códigos de error
 * (`SESION_REQUERIDA`, etc.) siguen llegando igual desde la función.
 */
export async function generarAnalisisIaAction(propiedadId: string): Promise<AnalisisIaResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const record = await getParcelaDetalle(supabase, propiedadId);
    if (!record) return { ok: false, motivo: "No se encontró la parcela seleccionada." };

    const { data: catastro, error: catError } = await supabase.from("tpl_catastro_mercado").select("*").order("created_at", { ascending: false }).limit(300);
    if (catError) throw catError;

    const comparables: MercadoComparable[] = ((catastro as Record<string, unknown>[]) || []).map(mapearComparableCatastro);
    const objetivo = derivarTargetSimilitud(record);
    comparables.forEach((c: MercadoComparable) => {
      c.similarity = calcularSimilitud(objetivo, c);
    });
    comparables.sort((a: MercadoComparable, b: MercadoComparable) => (b.similarity || 0) - (a.similarity || 0));
    const top5 = comparables.slice(0, 5);

    const { data, error } = await supabase.functions.invoke("gemini-analisis-mercado", {
      body: {
        propiedad: {
          comuna: record.comuna,
          superficie: objetivo.superficie,
          precio: record.precio_publicado,
          agua: record.agua,
          luz: record.electricidad,
          topografia: record.topografia,
          rol: record.rol_situacion,
        },
        comparables: top5,
      },
    });
    if (error) throw error;
    if (!data?.ok) {
      return { ok: false, motivo: MOTIVOS_IA[data?.error as string] || "No se pudo generar el análisis." };
    }

    const { error: saveError } = await supabase.from("tpl_propiedades").update({ ai_analisis: data.analisis }).eq("id", propiedadId);
    if (saveError) {
      const msg = saveError.message.toLowerCase();
      if (msg.includes("could not find the 'ai_analisis' column")) {
        return { ok: false, motivo: "Falta la columna 'ai_analisis' en la tabla tpl_propiedades." };
      }
      // Un fallo de permisos ya no se traga en silencio (el original mostraba
      // "generado con éxito" aunque nada se guardara).
      return { ok: false, motivo: "El análisis se generó pero no se pudo guardar: " + saveError.message };
    }

    revalidatePath("/parcelas");
    return { ok: true, analisis: data.analisis as string, comparablesUsados: (data.comparables_usados as number) ?? top5.length };
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : String(err);
    console.error("[CRM] generarAnalisisIaAction:", mensaje);
    return { ok: false, motivo: mensaje };
  }
}

/** Lee `ai_analisis` actual para mostrar "✓ Análisis ya generado" al abrir el modal, igual que `record.ai_analisis` en el original. */
export async function obtenerAnalisisIaExistenteAction(propiedadId: string): Promise<string | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("tpl_propiedades").select("ai_analisis").eq("id", propiedadId).single();
    if (error) return null;
    return (data?.ai_analisis as string) || null;
  } catch {
    return null;
  }
}
