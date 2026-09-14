import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActorCrudo } from "../actores/data";
import type { OportunidadDeActor } from "../actores/data";

/**
 * Fila de `visitas` dentro de `tpl_crm_snapshot_v1()` (verificada contra
 * `202608090002_tpl_crm_snapshot_comercial_v1.sql`: `select v.*,
 * o.codigo as oportunidad_codigo, o.estado as oportunidad_estado,
 * o.actor_cliente_id, a.nombre as actor_nombre, a.email as actor_email,
 * staff.nombre as staff_nombre, pr.codigo as proyecto_codigo, p.id as
 * propiedad_id, p.codigo as propiedad_codigo, p.titulo as propiedad_titulo,
 * p.comuna as propiedad_comuna, p.region as propiedad_region from
 * public.tpl_visitas v ...`). El CHECK real de la tabla (`202608090000_tpl_crm_visitas_v1.sql`)
 * es programada · confirmada · realizada · cancelada · no_asistio.
 */
export interface VisitaRow {
  id: string;
  oportunidad_id: string;
  usuario_staff_id: string | null;
  fecha_hora: string;
  estado: string;
  resultado: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
  oportunidad_codigo: string | null;
  oportunidad_estado: string | null;
  actor_cliente_id: string | null;
  actor_nombre: string | null;
  actor_email: string | null;
  staff_nombre: string | null;
  proyecto_codigo: string | null;
  propiedad_id: string | null;
  propiedad_codigo: string | null;
  propiedad_titulo: string | null;
  propiedad_comuna: string | null;
  propiedad_region: string | null;
  [key: string]: unknown;
}

export interface EstadoVisitaInfo {
  etiqueta: string;
  clase: string;
}

/** Puerto 1:1 de `ESTADOS` en `modules/visitas/index.js`. */
export const ESTADOS: Record<string, EstadoVisitaInfo> = {
  programada: { etiqueta: "Programada", clase: "visita-badge--programada" },
  confirmada: { etiqueta: "Confirmada", clase: "visita-badge--confirmada" },
  realizada: { etiqueta: "Realizada", clase: "visita-badge--realizada" },
  no_asistio: { etiqueta: "No asistió", clase: "visita-badge--no-asistio" },
  cancelada: { etiqueta: "Cancelada", clase: "visita-badge--cancelada" },
};

/** Puerto de `CANCELABLES` en el original. */
export const CANCELABLES = ["programada", "confirmada"];

/**
 * Estados terminales según el guard de `tpl_crm_actualizar_visita_v1`
 * (`202608090001_tpl_crm_rpcs_v1.sql`): una vez en uno de estos, la RPC
 * rechaza volver a 'programada'/'confirmada' con `TRANSICION_TERMINAL_BLOQUEADA`.
 * Se usa para no ofrecer en la UI una transición que el backend va a rechazar.
 */
export const TERMINALES = ["realizada", "cancelada", "no_asistio"];

/**
 * Próximos estados válidos desde uno dado, para el control "Cambiar estado"
 * (funcionalidad nueva — ver el comentario en `HerramientasModal`... no, en
 * `VisitasAgenda.tsx`, sobre por qué el original nunca ofrecía esto).
 */
export function transicionesDisponibles(estado: string): string[] {
  if (estado === "programada") return ["confirmada", "realizada", "no_asistio"];
  if (estado === "confirmada") return ["realizada", "no_asistio"];
  return [];
}

export function infoEstado(estado: string): EstadoVisitaInfo {
  return ESTADOS[estado] || { etiqueta: estado || "Sin estado", clase: "visita-badge--desconocido" };
}

export function esCancelable(estado: string): boolean {
  return CANCELABLES.includes(estado);
}

/** Puerto de `arr('visitas').sort((a,b) => new Date(a.fecha_hora) - new Date(b.fecha_hora))`. */
export function ordenarPorFecha(visitas: VisitaRow[]): VisitaRow[] {
  return [...visitas].sort((a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime());
}

/** Puerto de `verCanceladas ? todas : todas.filter(v => v.estado !== 'cancelada')`. */
export function filtrarVisibles(visitas: VisitaRow[], verCanceladas: boolean): VisitaRow[] {
  return verCanceladas ? visitas : visitas.filter((v) => v.estado !== "cancelada");
}

export function contarCanceladas(visitas: VisitaRow[]): number {
  return visitas.filter((v) => v.estado === "cancelada").length;
}

export interface OportunidadAgendable {
  id: string;
  label: string;
}

/**
 * Estados de oportunidad en los que agendar una visita nueva tiene sentido —
 * excluye los 3 estados terminales del embudo comercial (ver `COLUMNAS` en
 * `lib/pipeline/columns.ts`: vendida/perdida/cancelada). La RPC
 * `tpl_crm_agendar_visita_v1` no impone esta restricción ella misma (acepta
 * cualquier oportunidad existente), así que es un criterio de UI, no de
 * negocio impuesto por la base.
 */
const ESTADOS_OPORTUNIDAD_NO_AGENDABLES = ["vendida", "perdida", "cancelada"];

export function oportunidadesAgendables(oportunidades: OportunidadDeActor[]): OportunidadAgendable[] {
  return oportunidades
    .filter((o) => !ESTADOS_OPORTUNIDAD_NO_AGENDABLES.includes(String(o.estado || "")))
    .map((o) => ({
      id: o.id,
      label: [o.codigo, o.propiedad_titulo, o.actor_nombre].filter(Boolean).join(" · ") || o.id,
    }));
}

export interface StaffAsignable {
  id: string;
  nombre: string;
}

/**
 * Puerto adaptado de quién puede figurar como "Staff Asignado" en una
 * visita. `usuario_staff_id` referencia `tpl_actores(id)` (no `tpl_staff`,
 * que es la tabla de autorización de acceso al CRM, indexada por
 * `auth.users.id`) — son dos identidades distintas del mismo asesor. Se
 * listan los actores con rol `asesor_tpl` o `administrador` (los únicos
 * valores de `tpl_actor_roles.rol` pensados para esto, ver
 * `202607300000_tpl_nucleo_v1.sql`).
 */
export function staffAsignable(actores: ActorCrudo[]): StaffAsignable[] {
  return actores
    .filter((a) => Array.isArray(a.roles) && (a.roles.includes("asesor_tpl") || a.roles.includes("administrador")))
    .map((a) => ({ id: a.id, nombre: a.nombre || "Sin nombre" }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

export interface VisitasPageData {
  visitas: VisitaRow[];
  oportunidades: OportunidadAgendable[];
  staff: StaffAsignable[];
}

/**
 * Puerto de `init()` en `modules/visitas/index.js`: lee `visitas` del mismo
 * snapshot que ya usan Pipeline/Actores/Tasaciones. Además extrae
 * `oportunidades` y `actores` (con sus roles) del MISMO viaje para poblar
 * los selects del modal "Agendar Visita" — no hace tres llamadas separadas a
 * la RPC por lo mismo que ya evita `lib/pipeline/data.ts`.
 */
export async function getVisitasPageData(supabase: SupabaseClient): Promise<VisitasPageData> {
  const { data, error } = await supabase.rpc("tpl_crm_snapshot_v1");
  if (error) throw error;

  const visitasCrudas: VisitaRow[] = Array.isArray(data?.visitas) ? data.visitas : [];
  const oportunidadesCrudas: OportunidadDeActor[] = Array.isArray(data?.oportunidades) ? data.oportunidades : [];
  const actoresCrudos: ActorCrudo[] = Array.isArray(data?.actores) ? data.actores : [];

  return {
    visitas: ordenarPorFecha(visitasCrudas),
    oportunidades: oportunidadesAgendables(oportunidadesCrudas),
    staff: staffAsignable(actoresCrudos),
  };
}
