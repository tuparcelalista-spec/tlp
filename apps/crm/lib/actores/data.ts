import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Puerto de las lecturas de `modules/actores/{index,detail}.js` (fila cruda
 * de `tpl_actores`, expuesta dentro de `tpl_crm_snapshot_v1()['actores']`
 * — verificado contra `202608090002_tpl_crm_snapshot_comercial_v1.sql`:
 * `select a.id, a.tipo_actor, a.nombre, a.rut, a.email, a.telefono,
 * a.region, a.comuna, a.direccion, a.origen, a.estado, a.metadata,
 * a.created_at, a.updated_at, ... roles from public.tpl_actores a`).
 */
export interface ActorCrudo {
  id: string;
  nombre: string | null;
  rut: string | null;
  email: string | null;
  telefono: string | null;
  region: string | null;
  comuna: string | null;
  estado: string | null;
  roles: string[] | null;
  created_at: string | null;
  [key: string]: unknown;
}

/** Fila de `oportunidades` — mismo tipo que usa el pipeline (ver lib/pipeline/data.ts), ampliado con el vínculo al actor. */
export interface OportunidadDeActor {
  id: string;
  codigo?: string | null;
  estado?: string | null;
  propiedad_titulo?: string | null;
  actor_id?: string | null;
  actor_cliente_id?: string | null;
  [key: string]: unknown;
}

/** Fila de `crm_parcelas` (= `tpl_propiedades.*` + campos de tasación — ver `202607300001_tpl_comercial_crm_v1.sql`). */
export interface ParcelaDeActor {
  id: string;
  codigo?: string | null;
  titulo?: string | null;
  comuna?: string | null;
  precio_publicado?: number | null;
  propietario_id?: string | null;
  foto_principal?: string | null;
  imagen?: string | null;
  [key: string]: unknown;
}

/** Puerto de `verArchivados ? todos : todos.filter(a => a.estado !== 'archivado')` en `actores/index.js`. */
export function splitActivosArchivados(actores: ActorCrudo[]): { activos: ActorCrudo[]; archivados: ActorCrudo[] } {
  const archivados = actores.filter((a) => a.estado === "archivado");
  const activos = actores.filter((a) => a.estado !== "archivado");
  return { activos, archivados };
}

/**
 * Puerto de `arr('oportunidades').filter(op => (op.actor_id || op.actor_cliente_id) === id)`
 * en `actores/detail.js` — se aceptan ambos nombres de campo, igual que el original.
 */
export function oportunidadesDeActor(oportunidades: OportunidadDeActor[], actorId: string): OportunidadDeActor[] {
  return oportunidades.filter((op) => (op.actor_id || op.actor_cliente_id) === actorId);
}

/** Puerto de `arr('parcelas').filter(p => p.propietario_id === id)` en `actores/detail.js`. */
export function parcelasDeActor(parcelas: ParcelaDeActor[], actorId: string): ParcelaDeActor[] {
  return parcelas.filter((p) => p.propietario_id === actorId);
}

export interface ActoresSnapshot {
  actores: ActorCrudo[];
  oportunidades: OportunidadDeActor[];
  parcelas: ParcelaDeActor[];
}

/**
 * Llama a `tpl_crm_snapshot_v1()` (misma RPC que usa `boot.js` y ya usa
 * `lib/pipeline/data.ts`) y extrae las tres colecciones que el directorio de
 * actores necesita. `supabase` debe ser el cliente atado a la sesión de
 * staff — la RPC exige `authenticated`.
 */
export async function getActoresSnapshot(supabase: SupabaseClient): Promise<ActoresSnapshot> {
  const { data, error } = await supabase.rpc("tpl_crm_snapshot_v1");
  if (error) throw error;

  return {
    actores: Array.isArray(data?.actores) ? data.actores : [],
    oportunidades: Array.isArray(data?.oportunidades) ? data.oportunidades : [],
    parcelas: Array.isArray(data?.parcelas) ? data.parcelas : [],
  };
}
