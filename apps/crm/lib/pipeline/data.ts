import type { SupabaseClient } from "@supabase/supabase-js";
import { COLUMNA_IDS } from "./columns";
import { formatCLP } from "../utils/format";

/**
 * Fila cruda que devuelve `tpl_crm_snapshot_v1()` dentro de `oportunidades`
 * (verificado directamente contra
 * `supabase/migrations/202608090002_tpl_crm_snapshot_comercial_v1.sql`:
 * `select o.*, a.nombre as actor_nombre, ..., p.titulo as propiedad_titulo,
 * ...`). Solo se tipan los campos que este tablero realmente consume — el
 * resto de columnas de `tpl_oportunidades` viaja igual en el jsonb pero no
 * hace falta declararlas aquí.
 */
export interface OportunidadCruda {
  id: string;
  estado: string | null;
  codigo?: string | null;
  presupuesto?: number | string | null;
  actor_nombre?: string | null;
  propiedad_titulo?: string | null;
  [key: string]: unknown;
}

export interface PipelineCard {
  id: string;
  columnId: string;
  title: string;
  subtitle: string;
  meta: string;
  badge: string;
  dismissable: true;
}

/**
 * Puerto 1:1 de la función `init()` de
 * `crm-tpl-v1/modules/pipeline/index.js` (la parte que arma `cards`, sin el
 * DOM). Mismo criterio: un `estado` desconocido no hace desaparecer la
 * tarjeta — cae en "Nuevas" con una nota de cuál era su estado real, para
 * que alguien la reclasifique en vez de perderla de vista.
 */
export function mapOportunidadesACards(oportunidades: OportunidadCruda[]): PipelineCard[] {
  return oportunidades.map((o) => {
    const conocido = COLUMNA_IDS.includes(o.estado ?? "");
    const columnId = conocido ? (o.estado as string) : "nueva";

    const meta = conocido ? (o.codigo ?? "") : [o.codigo, `estado real: ${o.estado || "sin estado"}`].filter(Boolean).join(" · ");

    const presupuesto = Number(o.presupuesto);

    return {
      id: o.id,
      columnId,
      title: o.propiedad_titulo || o.codigo || "Oportunidad",
      subtitle: o.actor_nombre || "Sin cliente asignado",
      meta,
      badge: presupuesto > 0 ? formatCLP(presupuesto) : "",
      dismissable: true,
    };
  });
}

export interface PipelineSnapshot {
  cards: PipelineCard[];
  total: number;
}

/**
 * Llama a `tpl_crm_snapshot_v1()` (la MISMA RPC que usa `boot.js` del CRM
 * legacy) y extrae solo `oportunidades` — el snapshot completo trae además
 * actores, visitas, parcelas, tasaciones, etc., que este módulo piloto no
 * necesita todavía. `supabase` debe ser el cliente atado a la sesión de
 * staff (ver `lib/supabase/server.ts`): la RPC está `grant`eada solo a
 * `authenticated` y revocada de `anon`.
 */
export async function getPipelineSnapshot(supabase: SupabaseClient): Promise<PipelineSnapshot> {
  const { data, error } = await supabase.rpc("tpl_crm_snapshot_v1");
  if (error) throw error;

  const oportunidades: OportunidadCruda[] = Array.isArray(data?.oportunidades) ? data.oportunidades : [];

  return {
    cards: mapOportunidadesACards(oportunidades),
    total: oportunidades.length,
  };
}
