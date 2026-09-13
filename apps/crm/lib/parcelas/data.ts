import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Fila de la vista `crm_parcelas_resumen` (verificada contra la ÚLTIMA
 * versión — `20260903030000_tpl_fix_crm_parcelas_resumen_eliminadas_v1.sql`,
 * que reemplaza a `202608130001` y `20260831030000`; las tres hacen
 * `create or replace view`, así que solo la más reciente manda): id, codigo,
 * titulo, comuna, region, superficie_m2, precio_publicado, estado,
 * publicada_at, dias_publicada, foto_principal, total_fotos, plan_nombre,
 * expiracion_plan, valor_tpl_tecnico, valor_promedio_comunal,
 * valor_tpl_tasador, valor_tpl_tasador_ajustado, valor_comunal,
 * valor_tpl_recomendado, valor_venta_apuro. La vista ya filtra
 * `estado is distinct from 'eliminada'` — la papelera no aparece aquí.
 */
export interface ParcelaResumen {
  id: string;
  codigo: string | null;
  titulo: string | null;
  comuna: string | null;
  region: string | null;
  superficie_m2: number | null;
  precio_publicado: number | null;
  estado: string | null;
  publicada_at: string | null;
  dias_publicada: number | null;
  foto_principal: string | null;
  total_fotos: number | null;
  plan_nombre: string | null;
  expiracion_plan: string | null;
  propietario_id?: string | null;
  valor_tpl_tasador?: number | string | null;
  valor_tpl_tasador_ajustado?: number | string | null;
  valor_comunal?: number | string | null;
  valor_tpl_promedio_comunal?: number | string | null;
  valor_tpl_recomendado?: number | string | null;
  valor_tpl?: number | string | null;
  valor_venta_apuro?: number | string | null;
  metadata?: unknown;
  [key: string]: unknown;
}

/** Fila completa de `tpl_propiedades` — la que edita el editor integral. Se tipan solo los campos que el formulario lee/escribe; el resto viaja igual. */
export interface ParcelaDetalle {
  id: string;
  codigo: string | null;
  titulo: string | null;
  nombre?: string | null;
  estado: string | null;
  tipo: string | null;
  precio_publicado: number | null;
  precio_base?: number | null;
  superficie_m2: number | null;
  descripcion: string | null;
  rol_situacion: string | null;
  region: string | null;
  comuna: string | null;
  sector: string | null;
  distancia_ruta_principal_km: number | null;
  lat: number | null;
  lng: number | null;
  electricidad: string | null;
  agua: string | null;
  acceso: string | null;
  topografia: string | null;
  suelo: string | null;
  cierre_perimetral: string | null;
  porton: string | null;
  atributos_naturales: string[] | string | null;
  corredor_asignado: string | null;
  corredor?: string | null;
  contacto_nombre?: string | null;
  contacto_telefono?: string | null;
  contacto_email?: string | null;
  dueno_nombre?: string | null;
  dueno_telefono?: string | null;
  dueno_email?: string | null;
  encargado_proyecto?: string | null;
  encargado?: string | null;
  casa_datos?: Record<string, unknown> | null;
  metadata: Record<string, unknown> | string | null;
  precio_publicado_actual?: number | null;
  [key: string]: unknown;
}

export interface ParcelaImagen {
  id: string;
  url: string | null;
  storage_path: string | null;
  es_portada: boolean | null;
  orden: number | null;
}

export interface ParcelaAnalyticsRow {
  id: string;
  action_type: string | null;
  time_spent_seconds: number | null;
  created_at: string;
}

/**
 * Puerto de `init()` en `modules/parcelas/index.js`: intenta la vista ligera
 * `crm_parcelas_resumen` primero; si falla o viene vacía, cae al snapshot
 * global (`tpl_crm_snapshot_v1()['parcelas']`) — mismo fallback textual del
 * original ("Vista crm_parcelas_resumen falló o está vacía. Usando snapshot
 * global.").
 */
export async function getParcelasResumen(supabase: SupabaseClient): Promise<ParcelaResumen[]> {
  const { data, error } = await supabase.from("crm_parcelas_resumen").select("*").order("publicada_at", { ascending: false });

  if (!error && data && data.length > 0) {
    return data as ParcelaResumen[];
  }

  const { data: snapshot, error: snapshotError } = await supabase.rpc("tpl_crm_snapshot_v1");
  if (snapshotError) throw snapshotError;
  return Array.isArray(snapshot?.parcelas) ? (snapshot.parcelas as ParcelaResumen[]) : [];
}

/** Fila completa para el editor integral (`select *` sobre `tpl_propiedades`, como hace `openIntegralEditor`). */
export async function getParcelaDetalle(supabase: SupabaseClient, id: string): Promise<ParcelaDetalle | null> {
  const { data, error } = await supabase.from("tpl_propiedades").select("*").eq("id", id).single();
  if (error) {
    if (error.code === "PGRST116") return null; // no encontrada
    throw error;
  }
  return data as ParcelaDetalle;
}

/** Puerto de `cargarFotosGrid()` en `editor-integral.js`. */
export async function getFotosDeParcela(supabase: SupabaseClient, propiedadId: string): Promise<ParcelaImagen[]> {
  const { data, error } = await supabase
    .from("tpl_propiedad_imagenes")
    .select("id,url,storage_path,es_portada,orden")
    .eq("propiedad_id", propiedadId)
    .order("es_portada", { ascending: false })
    .order("orden", { ascending: true });
  if (error) throw error;
  return (data || []) as ParcelaImagen[];
}

/** Puerto de la carga de `#ei-tab-analytics` en `editor-integral.js` (tabla `tpl_web_analytics`, últimos 20 eventos). */
export async function getAnalyticsDeParcela(supabase: SupabaseClient, parcelaId: string): Promise<ParcelaAnalyticsRow[]> {
  const { data, error } = await supabase
    .from("tpl_web_analytics")
    .select("*")
    .eq("parcela_id", parcelaId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data || []) as ParcelaAnalyticsRow[];
}

function numero(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
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
 * Puerto 1:1 del cálculo de `compScore`/`maxComp` (sobre 10 puntos) inline en
 * `renderParcela()` de `modules/parcelas/index.js` — DELIBERADAMENTE no el
 * de `parcel-filters.js` (`calculateCompletionScore`, sobre 21 puntos): ese
 * archivo, junto con `ParcelaList.js`/`ParcelaFilters.js`/`detail.js`, no lo
 * importa `modules/parcelas/index.js` ni ningún otro módulo activo — es
 * código huérfano que el router nunca carga. El score que el staff ve
 * realmente en la grilla es este.
 */
export function calcularCompletionScore(p: ParcelaResumen): { score: number; color: string } {
  const maxComp = 10;
  let compScore = 0;
  if (numero(p.precio_publicado) > 0) compScore++;
  if (numero(p.superficie_m2) > 0) compScore++;
  if (p.comuna) compScore++;
  if (p.lat && p.lng) compScore++;
  if (p.agua) compScore++;
  if (p.electricidad || p.luz) compScore++;
  if (p.acceso) compScore++;
  if (p.topografia || p.suelo) compScore++;
  if (numero(p.total_fotos) >= 6) compScore++;

  let hasVideo = false;
  const meta = parseMetadata(p.metadata);
  if (meta?.videoUrl) hasVideo = true;
  if (hasVideo) compScore++;

  const score = Math.round((compScore / maxComp) * 100);
  const color = score < 60 ? "#f44336" : score < 85 ? "#ff9800" : "#4caf50";
  return { score, color };
}

/** Puerto 1:1 de `calculateExpiration()` en `modules/parcelas/index.js`. */
export function calcularExpiracion(dateStr: string | null | undefined): { text: string; colorClass: string } {
  if (!dateStr) return { text: "Sin fecha de expiración", colorClass: "exp-normal" };
  const exp = new Date(dateStr);
  const today = new Date();
  const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { text: `⏳ Expirado hace ${Math.abs(diffDays)} días`, colorClass: "exp-danger" };
  if (diffDays < 7) return { text: `⏳ Expira en ${diffDays} días`, colorClass: "exp-warning" };
  return { text: `⏳ Expira en ${diffDays} días`, colorClass: "exp-normal" };
}

export interface FiltrosParcelas {
  query: string;
  region: string;
  comuna: string;
}

/**
 * Puerto 1:1 del filtro de `render()` en `modules/parcelas/index.js`
 * (búsqueda por código+título, región, comuna). El filtro de "ocultar
 * parcelas de corredores" que también vive ahí depende de `actores` del
 * snapshot completo (`tpl_crm_snapshot_v1()`), que este piloto no carga en
 * el listado (usa la vista ligera `crm_parcelas_resumen`, que no trae
 * `propietario_id` con roles resueltos) — se deja fuera del piloto y se
 * documenta aquí para no perder el rastro del comportamiento original.
 */
export function filtrarParcelas(parcelas: ParcelaResumen[], filtros: FiltrosParcelas): ParcelaResumen[] {
  return parcelas.filter((p) => {
    if (filtros.query) {
      const q = filtros.query.toLowerCase();
      const texto = `${p.codigo || ""} ${p.titulo || ""}`.toLowerCase();
      if (!texto.includes(q)) return false;
    }
    if (filtros.region && p.region !== filtros.region) return false;
    if (filtros.comuna && p.comuna !== filtros.comuna) return false;
    return true;
  });
}

/** Puerto de `[...new Set(localParcelas.map(p => p.region).filter(Boolean))].sort()`. */
export function regionesDisponibles(parcelas: ParcelaResumen[]): string[] {
  return Array.from(new Set(parcelas.map((p) => p.region).filter((v): v is string => Boolean(v)))).sort();
}

/** Puerto de la misma lógica para comunas. */
export function comunasDisponibles(parcelas: ParcelaResumen[]): string[] {
  return Array.from(new Set(parcelas.map((p) => p.comuna).filter((v): v is string => Boolean(v)))).sort();
}
