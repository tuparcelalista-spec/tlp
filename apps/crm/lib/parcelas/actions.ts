"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "../supabase/server";
import { getParcelaDetalle, getFotosDeParcela, getAnalyticsDeParcela, type ParcelaDetalle, type ParcelaImagen, type ParcelaAnalyticsRow } from "./data";

export type CargarEditorResult = { ok: true; record: ParcelaDetalle; fotos: ParcelaImagen[] } | { ok: false; motivo: string };

/**
 * Puerto de la carga inicial de `openIntegralEditor()` + `cargarFotosGrid()`
 * en `editor-integral.js`: trae la fila completa y sus fotos en un solo
 * viaje (el modal cliente no puede llamar a `getParcelaDetalle`/
 * `getFotosDeParcela` directo — viven en un Server Action porque necesitan
 * el cliente de Supabase atado a cookies).
 */
export async function cargarParcelaParaEditorAction(id: string): Promise<CargarEditorResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const record = await getParcelaDetalle(supabase, id);
    if (!record) return { ok: false, motivo: "No pudimos recuperar la parcela." };
    const fotos = await getFotosDeParcela(supabase, id);
    return { ok: true, record, fotos };
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : String(err);
    console.error("[CRM] cargarParcelaParaEditorAction:", mensaje);
    return { ok: false, motivo: "No pudimos recuperar la parcela." };
  }
}

/** Puerto de la carga perezosa de la pestaña "🕵️ Asesor Espía" en `editor-integral.js`. */
export async function cargarAnalyticsAction(parcelaId: string): Promise<ParcelaAnalyticsRow[]> {
  try {
    const supabase = await createSupabaseServerClient();
    return await getAnalyticsDeParcela(supabase, parcelaId);
  } catch (err) {
    console.error("[CRM] cargarAnalyticsAction:", err instanceof Error ? err.message : err);
    return [];
  }
}

/** Recarga solo las fotos (tras subir/eliminar/marcar portada), igual que `cargarFotosGrid()`. */
export async function recargarFotosAction(parcelaId: string): Promise<ParcelaImagen[]> {
  const supabase = await createSupabaseServerClient();
  return getFotosDeParcela(supabase, parcelaId);
}

export type ParcelaActionResult = { ok: true } | { ok: false; motivo: string; requiereConfirmacionPapelera?: boolean };

/**
 * Puerto 1:1 del handler de `.btn-delete-parcela` en `modules/parcelas/index.js`:
 * intenta el borrado físico; si la base responde `23503` (violación de FK —
 * la parcela tiene tasaciones/cotizaciones asociadas), el original mostraba
 * un SEGUNDO `confirm()` para archivar en su lugar. Aquí ese segundo paso se
 * hace en dos llamadas desde el cliente (esta función devuelve
 * `requiereConfirmacionPapelera: true` en vez de decidir sola) para poder
 * mostrar el mismo confirm() nativo antes de archivar.
 */
export async function eliminarParcelaAction(id: string): Promise<ParcelaActionResult> {
  try {
    const supabase = await createSupabaseServerClient();
    // .select('id') es clave aquí: sin representación, Supabase devuelve
    // 200/error:null aunque RLS haya bloqueado el borrado y 0 filas se hayan
    // tocado (mismo problema documentado en el original).
    const { data: borradas, error } = await supabase.from("tpl_propiedades").delete().eq("id", id).select("id");

    if (error && error.code === "23503") {
      return { ok: false, motivo: "Tiene historial (cotizaciones o tasaciones) asociado.", requiereConfirmacionPapelera: true };
    }
    if (error) throw error;
    if (!borradas?.length) {
      throw new Error("La base no confirmó el borrado (0 filas afectadas). Revisa que tu usuario tenga permisos de staff en el CRM.");
    }

    revalidatePath("/parcelas");
    return { ok: true };
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : String(err);
    console.error("[CRM] eliminarParcelaAction:", mensaje);
    return { ok: false, motivo: mensaje };
  }
}

/** Puerto del camino "MOVERLA A LA PAPELERA (estado: 'eliminada')" del mismo handler. */
export async function archivarComoEliminadaAction(id: string): Promise<ParcelaActionResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: archivadas, error } = await supabase.from("tpl_propiedades").update({ estado: "eliminada" }).eq("id", id).select("id");
    if (error) throw error;
    if (!archivadas?.length) {
      throw new Error("La base no confirmó el archivado. Revisa que tu usuario tenga permisos de staff en el CRM.");
    }
    revalidatePath("/parcelas");
    return { ok: true };
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : String(err);
    console.error("[CRM] archivarComoEliminadaAction:", mensaje);
    return { ok: false, motivo: mensaje };
  }
}

export interface GuardarParcelaInput {
  id: string;
  titulo: string;
  estado: string;
  tipo: string;
  descripcion: string;
  superficie_m2: string;
  precio_publicado: string;
  rol_situacion: string;
  region: string;
  comuna: string;
  sector: string;
  distancia_ruta_principal_km: string;
  lat: string;
  lng: string;
  electricidad: string;
  agua: string;
  acceso: string;
  topografia: string;
  suelo: string;
  cierre_perimetral: string;
  porton: string;
  atributos_naturales: string;
  corredor_asignado: string;
  video_url: string;
  imagenes: string;
  dueno_nombre: string;
  dueno_telefono: string;
  dueno_email: string;
  encargado_proyecto: string;
  mat_casa: string;
  sup_casa: string;
  dorm_casa: string;
  banos_casa: string;
  casa_reg: string;
  casa_ant: string;
  extra_piscina: string;
  extra_piscmat: string;
  extra_piscm2: string;
  extra_quincho: string;
  extra_cabana: string;
  extra_riego: string;
}

function numeroONull(value: string): number | null {
  const n = Number(value);
  return value !== "" && Number.isFinite(n) ? n : null;
}

function parseMetadata(metadata: unknown): Record<string, unknown> {
  if (!metadata) return {};
  if (typeof metadata === "string") {
    try {
      return JSON.parse(metadata) || {};
    } catch {
      return {};
    }
  }
  if (typeof metadata === "object") return metadata as Record<string, unknown>;
  return {};
}

/**
 * Puerto 1:1 del `submit` de `#editorIntegralForm` en `editor-integral.js`:
 * arma el mismo payload de columnas + fusiona `metadata` (video, imágenes
 * por URL, contacto propietario, datos de casa) + copia los datos de casa a
 * `payload.casa_datos` (columna real, no solo metadata — el comentario
 * original explica que el informe premium y el recálculo por lotes leen
 * `casa_datos`, no `metadata.materialidad` etc.).
 *
 * Lo que este puerto NO hace — a propósito, no por descuido — es
 * recalcular la tasación con `window.TPLLandEngine`: ese motor vive en
 * `frontend-v2/js/core/valuation-engine.js`, un script global cargado por
 * `<script src=...>` en el `index.html` del CRM legacy, fuera de
 * `modules/parcelas/` y de cualquier otro módulo migrado hasta ahora. El
 * propio original ya degradaba con gracia cuando ese motor no estaba
 * disponible (todo el bloque de recálculo vive bajo `if (window.TPLLandEngine)`),
 * así que omitirlo aquí dentro de Next.js —donde `window` ni siquiera existe
 * del lado del servidor— es exactamente ese mismo camino, no una regresión:
 * los campos de tasación (`valor_tpl_recomendado`, etc.) simplemente no se
 * tocan en este guardado y conservan el valor calculado la última vez que
 * corrió `scripts/recalcular-tasaciones.mjs` o el CRM legacy.
 */
export async function guardarParcelaAction(input: GuardarParcelaInput): Promise<ParcelaActionResult> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: actual, error: fetchError } = await supabase.from("tpl_propiedades").select("metadata,casa_datos").eq("id", input.id).single();
    if (fetchError) throw fetchError;

    const naturales = input.atributos_naturales
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const imagenes = input.imagenes
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const oldMeta = parseMetadata(actual?.metadata);
    oldMeta.videoUrl = input.video_url;
    oldMeta.imagenes = imagenes;
    oldMeta.contacto_nombre = input.dueno_nombre;
    oldMeta.contacto_telefono = input.dueno_telefono;
    oldMeta.contacto_email = input.dueno_email;
    oldMeta.encargado_proyecto = input.encargado_proyecto;
    oldMeta.materialidad = input.mat_casa || "";
    oldMeta.superficie_construida = numeroONull(input.sup_casa);
    oldMeta.dormitorios = numeroONull(input.dorm_casa);
    oldMeta.banos = numeroONull(input.banos_casa);
    oldMeta.regularizada = input.casa_reg;
    oldMeta.antiguedad_anios = numeroONull(input.casa_ant) || 0;
    oldMeta.piscina = input.extra_piscina;
    oldMeta.piscina_mat = input.extra_piscmat;
    oldMeta.piscina_m2 = numeroONull(input.extra_piscm2) || 0;
    oldMeta.quincho = input.extra_quincho;
    oldMeta.cabana = input.extra_cabana;
    oldMeta.riego = input.extra_riego;

    const casaDatosPrevios = (actual?.casa_datos as Record<string, unknown> | null) || {};

    const payload: Record<string, unknown> = {
      titulo: input.titulo,
      estado: input.estado,
      tipo: input.tipo,
      descripcion: input.descripcion,
      superficie_m2: numeroONull(input.superficie_m2),
      precio_publicado: numeroONull(input.precio_publicado),
      rol_situacion: input.rol_situacion,
      region: input.region,
      comuna: input.comuna,
      sector: input.sector,
      lat: numeroONull(input.lat),
      lng: numeroONull(input.lng),
      distancia_ruta_principal_km: numeroONull(input.distancia_ruta_principal_km),
      electricidad: input.electricidad,
      agua: input.agua,
      acceso: input.acceso,
      topografia: input.topografia,
      suelo: input.suelo,
      cierre_perimetral: input.cierre_perimetral,
      porton: input.porton,
      atributos_naturales: naturales.length ? naturales : null,
      corredor_asignado: input.corredor_asignado || null,
      updated_at: new Date().toISOString(),
      metadata: oldMeta,
      casa_datos: {
        ...casaDatosPrevios,
        materialidad: oldMeta.materialidad || "",
        superficie_construida: oldMeta.superficie_construida,
        superficieConstruida: oldMeta.superficie_construida,
        dormitorios: oldMeta.dormitorios,
        banos: oldMeta.banos,
        regularizada: oldMeta.regularizada || "",
        antiguedad_anios: oldMeta.antiguedad_anios || 0,
        antiguedadAnios: oldMeta.antiguedad_anios || 0,
        piscina: oldMeta.piscina || "",
        piscina_mat: oldMeta.piscina_mat || "",
        piscina_m2: oldMeta.piscina_m2 || 0,
        quincho: oldMeta.quincho || "",
        cabana: oldMeta.cabana || "",
        riego: oldMeta.riego || "",
      },
    };

    const { data: saved, error: saveError } = await supabase.from("tpl_propiedades").update(payload).eq("id", input.id).select("id");
    if (saveError) throw saveError;
    if (!saved?.length) {
      throw new Error("La base no confirmó el guardado (0 filas afectadas). Revisa que tu usuario tenga permisos de staff en el CRM.");
    }

    revalidatePath("/parcelas");
    return { ok: true };
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : String(err);
    console.error("[CRM] guardarParcelaAction:", mensaje);
    return { ok: false, motivo: mensaje };
  }
}

export type GenerarLinkResult = { ok: true; token: string; expiresAt: string | null } | { ok: false; motivo: string };

/**
 * Puerto de `getOwnerToken()` en `share-modal.js` (RPC
 * `tpl_crm_generar_link_propietario_v1`, verificada contra
 * `20260909170000_tpl_fix_link_propietario_no_revoke_v1.sql`, la versión más
 * reciente). Nota importante conservada del original: esta RPC exige
 * `public.tpl_es_admin()`, NO `tpl_es_staff()` — es más estricta que el
 * resto del CRM. Un miembro de staff sin rol de administrador recibirá
 * `NO_AUTORIZADO`; el original ya mostraba ese error tal cual dentro del
 * modal (`⚠️ Error al generar enlace seguro: ...`) en vez de ocultarlo, así
 * que aquí se hace lo mismo con un mensaje explícito.
 */
export async function generarLinkPropietarioAction(propiedadId: string): Promise<GenerarLinkResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("tpl_crm_generar_link_propietario_v1", {
      p_propiedad_id: propiedadId,
      p_dias: 30,
    });
    if (error) throw error;
    if (!data?.ok || !data?.token) throw new Error(data?.error || "No se pudo generar el enlace seguro.");
    return { ok: true, token: data.token as string, expiresAt: (data.expires_at as string) || null };
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : String(err);
    const esNoAutorizado = mensaje.includes("NO_AUTORIZADO");
    const motivo = esNoAutorizado ? "Solo administradores TPL pueden generar el enlace del propietario (requiere tpl_es_admin())." : mensaje;
    console.error("[CRM] generarLinkPropietarioAction:", motivo);
    return { ok: false, motivo };
  }
}

export type FotoActionResult = { ok: true; imageId?: string; url?: string } | { ok: false; motivo: string };

/**
 * Puerto de la subida en `initEIFotos()` de `editor-integral.js`: llama a la
 * misma Edge Function `subir-foto-propietario` con `accion` implícito
 * ("subir", el default) — la función verifica que quien llama sea staff
 * (`verificarStaff()`, lee el Authorization: Bearer de la request) cuando
 * llega solo `propiedad_id` sin `token` de propietario ni `publicacion_id`
 * (ver `supabase/functions/subir-foto-propietario/index.ts`, rama "Vía staff
 * del CRM"). El cliente de `@supabase/ssr` adjunta ese Bearer automáticamente
 * desde la sesión de cookies, igual que en el navegador.
 */
export async function subirFotoAction(propiedadId: string, file: File): Promise<FotoActionResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const body = new FormData();
    body.append("propiedad_id", propiedadId);
    body.append("file", file, file.name);
    const { data, error } = await supabase.functions.invoke("subir-foto-propietario", { body });
    if (error) throw error;
    if (!data?.ok) throw new Error(data?.error || "Fallo desconocido al subir la foto.");
    revalidatePath("/parcelas");
    return { ok: true, imageId: data.image_id, url: data.url };
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : String(err);
    console.error("[CRM] subirFotoAction:", mensaje);
    return { ok: false, motivo: mensaje };
  }
}

/** Puerto de la rama `accion=eliminar` del mismo flujo. */
export async function eliminarFotoAction(imagenId: string): Promise<FotoActionResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const body = new FormData();
    body.append("accion", "eliminar");
    body.append("imagen_id", imagenId);
    const { data, error } = await supabase.functions.invoke("subir-foto-propietario", { body });
    if (error) throw error;
    if (!data?.ok) throw new Error(data?.error || "No se pudo completar la acción.");
    revalidatePath("/parcelas");
    return { ok: true };
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : String(err);
    console.error("[CRM] eliminarFotoAction:", mensaje);
    return { ok: false, motivo: mensaje };
  }
}

/** Puerto de la rama `accion=portada` del mismo flujo. */
export async function marcarPortadaAction(imagenId: string): Promise<FotoActionResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const body = new FormData();
    body.append("accion", "portada");
    body.append("imagen_id", imagenId);
    const { data, error } = await supabase.functions.invoke("subir-foto-propietario", { body });
    if (error) throw error;
    if (!data?.ok) throw new Error(data?.error || "No se pudo completar la acción.");
    revalidatePath("/parcelas");
    return { ok: true };
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : String(err);
    console.error("[CRM] marcarPortadaAction:", mensaje);
    return { ok: false, motivo: mensaje };
  }
}

/**
 * El botón "⚡ Sincronizar Tasaciones" de `modules/parcelas/index.js` recorre
 * TODAS las parcelas publicadas y llama a `window.TPLLandEngine.calculate()`
 * (motor definido en `frontend-v2/js/core/valuation-engine.js`, cargado como
 * script global — no un módulo de `crm-tpl-v1/modules/`). Ese motor no se ha
 * portado a Next.js todavía: no es parte de ningún archivo bajo
 * `modules/parcelas/`, y portarlo bien merece su propio módulo (es la misma
 * pieza que usa el tasador público). El original, sin el motor cargado,
 * simplemente no hacía nada por cada parcela (el chequeo `if
 * (window.TPLLandEngine)` envuelve TODO el cuerpo del loop) y al final
 * igual mostraba "Sincronización finalizada. Éxitos: 0. Errores: 0." — un
 * mensaje que no le dice nada útil al staff sobre por qué no pasó nada. Esta
 * función devuelve el motivo real en vez de fingir una corrida vacía.
 */
export async function sincronizarTasacionesAction(): Promise<ParcelaActionResult> {
  return {
    ok: false,
    motivo: "El motor de tasación (frontend-v2/js/core/valuation-engine.js) todavía no se portó a Next.js. La sincronización masiva queda pendiente para cuando ese motor se migre.",
  };
}
