import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Fila de `tpl_publicaciones` (verificada contra `202607300000_tpl_nucleo_v1.sql`,
 * líneas 90-117): id, codigo, publicador_actor_id, responsable_actor_id, tipo,
 * estado, origen, datos (jsonb con el resumen que llenó quien publicó:
 * titulo/comuna/superficie/precio/contacto), diagnostico, tasacion_preliminar,
 * motivo_revision, enviada_at, revisada_at, aprobada_at, created_at, updated_at.
 *
 * El snapshot (`tpl_crm_snapshot_v1` → clave `publicaciones_revision`, en
 * `202608090002_tpl_crm_snapshot_comercial_v1.sql`) ya filtra por
 * `estado in ('enviada','pendiente_revision','requiere_correccion')` y ordena
 * por `created_at desc` — exactamente lo que leía `arr('publicaciones_revision')`
 * en `modules/revision/index.js`.
 */
export interface DatosPublicacion {
  titulo?: string | null;
  comuna?: string | null;
  superficie?: number | string | null;
  precio?: number | string | null;
  contacto?: {
    nombre?: string | null;
    email?: string | null;
    telefono?: string | null;
  } | null;
  [key: string]: unknown;
}

export interface PublicacionRevision {
  id: string;
  codigo: string | null;
  tipo: string | null;
  estado: string;
  origen: string | null;
  datos: DatosPublicacion | null;
  motivo_revision: string | null;
  enviada_at: string | null;
  revisada_at: string | null;
  aprobada_at: string | null;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

/** Fila completa de `tpl_propiedades` asociada a la publicación — mismos campos que lee `pintarDetalle()` en el legacy. */
export interface PropiedadEnRevision {
  id: string;
  titulo: string | null;
  tipo: string | null;
  comuna: string | null;
  region: string | null;
  sector: string | null;
  superficie_m2: number | null;
  precio_publicado: number | null;
  descripcion: string | null;
  rol_situacion: string | null;
  agua: string | null;
  electricidad: string | null;
  acceso: string | null;
  topografia: string | null;
  suelo: string | null;
  cierre_perimetral: string | null;
  porton: string | null;
  atributos_naturales: string[] | string | null;
  casa_datos?: Record<string, unknown> | string | null;
  metadata: Record<string, unknown> | string | null;
  lat: number | null;
  lng: number | null;
  [key: string]: unknown;
}

export interface FotoPublicacion {
  id: string;
  url: string | null;
  storage_path: string | null;
  orden: number | null;
  metadata: { nombre_original?: string | null } | Record<string, unknown> | null;
}

export interface DetallePublicacion {
  publicacion: PublicacionRevision & { id: string };
  propiedad: PropiedadEnRevision;
  fotos: FotoPublicacion[];
  tasacion: { valor_tpl_total?: number | null; [key: string]: unknown };
}

/**
 * Puerto 1:1 de `CAMPOS_REQUERIDOS` en `modules/revision/index.js`: campos que
 * el resto de las parcelas muestra siempre (rellenados por el trigger de
 * integración o cargados a mano en el editor). Si una publicación llega sin
 * ellos hay que avisarle a quien revisa antes de aprobar.
 */
export const CAMPOS_REQUERIDOS: { etiqueta: string; valor: (p: PropiedadEnRevision) => unknown }[] = [
  { etiqueta: "Superficie", valor: (p) => p.superficie_m2 },
  { etiqueta: "Precio pedido", valor: (p) => p.precio_publicado },
  { etiqueta: "Comuna", valor: (p) => p.comuna },
  { etiqueta: "Región", valor: (p) => p.region },
  { etiqueta: "Descripción", valor: (p) => p.descripcion },
  { etiqueta: "Agua", valor: (p) => p.agua },
  { etiqueta: "Electricidad", valor: (p) => p.electricidad },
  { etiqueta: "Acceso", valor: (p) => p.acceso },
  { etiqueta: "Topografía", valor: (p) => p.topografia },
  { etiqueta: "Rol / situación", valor: (p) => p.rol_situacion },
];

/** Puerto 1:1 de `vacio()`. */
export function vacio(v: unknown): boolean {
  return v === null || v === undefined || v === "";
}

/** Puerto 1:1 de `camposFaltantes()`: campos requeridos vacíos + "Fotos" si no trae ninguna. */
export function camposFaltantes(p: PropiedadEnRevision, fotos: FotoPublicacion[] | null | undefined): string[] {
  const faltantes = CAMPOS_REQUERIDOS.filter((c) => vacio(c.valor(p))).map((c) => c.etiqueta);
  if (!fotos || !fotos.length) faltantes.push("Fotos");
  return faltantes;
}

/**
 * Puerto 1:1 del helper `clp()` local de `modules/revision/index.js` — a
 * diferencia de `formatCLP()` compartido (que muestra "$0"), este devuelve
 * "—" para valores no positivos: en la ficha de revisión un precio en 0 es
 * un dato faltante, no un precio real.
 */
export function montoOGuion(n: unknown): string {
  const num = Number(n);
  if (!(num > 0)) return "—";
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(num);
}

/** Vista previa de fila de la bandeja — puerto de la fila de `render()`. */
export interface PreviewPublicacion {
  titulo: string;
  codigo: string;
  comuna: string;
  superficieLabel: string;
  precioLabel: string;
  fechaIso: string;
}

/** Puerto 1:1 de `const d = r.datos || {}` + el armado de cada `<td>` de la fila. */
export function previewDePublicacion(r: PublicacionRevision): PreviewPublicacion {
  const d = r.datos || {};
  const superficie = d.superficie;
  return {
    titulo: (d.titulo as string) || r.codigo || "Sin título",
    codigo: r.codigo || "",
    comuna: (d.comuna as string) || "—",
    superficieLabel: superficie ? `${Number(superficie).toLocaleString("es-CL")} m²` : "—",
    precioLabel: montoOGuion(d.precio),
    fechaIso: r.enviada_at || r.created_at,
  };
}

/**
 * Puerto de `init()` en `modules/revision/index.js`: una sola llamada a
 * `tpl_crm_snapshot_v1()`, extrayendo `publicaciones_revision` (mismo patrón
 * de reutilización de snapshot que Actores/Parcelas/Tasaciones/Visitas).
 */
export async function getRevisionPageData(supabase: SupabaseClient): Promise<PublicacionRevision[]> {
  const { data, error } = await supabase.rpc("tpl_crm_snapshot_v1");
  if (error) throw error;
  return Array.isArray(data?.publicaciones_revision) ? (data.publicaciones_revision as PublicacionRevision[]) : [];
}

/**
 * Puerto de la carga de detalle en `init()` (botón `.btn-revisar`): llama a
 * `tpl_publicacion_detalle_v1`, que arma en un solo viaje publicación +
 * propiedad + fotos + última tasación.
 */
export async function getDetallePublicacion(supabase: SupabaseClient, publicacionId: string): Promise<DetallePublicacion> {
  const { data, error } = await supabase.rpc("tpl_publicacion_detalle_v1", { p_publicacion_id: publicacionId });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error || "No pudimos abrir la publicación.");
  return {
    publicacion: data.publicacion,
    propiedad: data.propiedad,
    fotos: Array.isArray(data.fotos) ? data.fotos : [],
    tasacion: data.tasacion || {},
  };
}
