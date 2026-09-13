import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Fila de `tpl_tasaciones` (verificada contra `202607300001_tpl_comercial_crm_v1.sql`,
 * la migración que crea la tabla). Solo se tipan los campos que
 * `modules/tasaciones/index.js` realmente pinta en la tabla de historial.
 */
export interface TasacionRow {
  id: string;
  created_at: string;
  propiedad_id: string | null;
  version_motor: string | null;
  superficie_m2: number | null;
  precio_publicado: number | null;
  valor_tpl_m2: number | null;
  valor_tpl_total: number | null;
  es_oportunidad: boolean | null;
  [key: string]: unknown;
}

/**
 * Puerto de `init()`/`render()` en `modules/tasaciones/index.js`: ese módulo
 * lee `arr('tasaciones')`, un array poblado en `core/state.js` desde
 * `tpl_crm_snapshot_v1()`. A diferencia de Parcelas, aquí NO existe una vista
 * ligera equivalente a `crm_parcelas_resumen` — se verificó (grep sobre todas
 * las migraciones que tocan `tpl_tasaciones`) que ninguna política RLS le da
 * a `authenticated` SELECT directo sobre la tabla; el snapshot
 * (`security definer`, exige `tpl_es_staff()`) es la única vía de lectura
 * disponible para el CRM. Por eso este puerto llama al snapshot directo, sin
 * el patrón "vista primero, snapshot de respaldo" usado en Parcelas.
 */
export async function getTasacionesHistorial(supabase: SupabaseClient): Promise<TasacionRow[]> {
  const { data, error } = await supabase.rpc("tpl_crm_snapshot_v1");
  if (error) throw error;
  const filas = Array.isArray(data?.tasaciones) ? (data.tasaciones as TasacionRow[]) : [];
  // El snapshot ya viene ordenado por created_at desc (ver la migración), pero
  // se reordena en el cliente igual que hacía el original (`.sort()` en
  // `render()`) por si el snapshot cambia de orden en el futuro.
  return [...filas].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export interface MercadoComparable {
  id: string;
  name: string;
  comuna: string;
  superficie: number;
  precio: number;
  tiene_agua: boolean;
  tiene_luz: boolean;
  tiene_bosque: boolean;
  es_plana: boolean;
  tiene_rio: boolean;
  tiene_lago: boolean;
  tiene_asfalto: boolean;
  similarity?: number;
}

export interface TargetSimilitud {
  comuna: string;
  superficie: number;
  tiene_agua: boolean;
  tiene_luz: boolean;
  tiene_bosque: boolean;
  es_plana: boolean;
  tiene_rio: boolean;
  tiene_lago: boolean;
  tiene_asfalto: boolean;
}

/**
 * Puerto 1:1 de `calculateSimilarity()` en `modules/tasaciones/premium-report.js`.
 * El comentario original explica por qué existe: antes era `(a,b) => 0.85`
 * constante, así que el `sort` posterior no reordenaba nada y los "5
 * comparables más parecidos" eran en realidad los 5 avisos más recientes de
 * toda la tabla, sin relación con la propiedad.
 */
export function calcularSimilitud(objetivo: TargetSimilitud, candidato: MercadoComparable): number {
  let puntaje = 0;
  let peso = 0;

  // Misma comuna: el factor que más pesa en suelo rural.
  peso += 3;
  const c1 = String(objetivo.comuna || "").trim().toLowerCase();
  const c2 = String(candidato.comuna || "").trim().toLowerCase();
  if (c1 && c2 && c1 === c2) puntaje += 3;

  // Superficie: por razón, no por diferencia absoluta (5.000 y 10.000 m² se
  // parecen mucho más que 500 y 5.500 m²).
  const s1 = Number(objetivo.superficie) || 0;
  const s2 = Number(candidato.superficie) || 0;
  if (s1 > 0 && s2 > 0) {
    peso += 3;
    const razon = Math.min(s1, s2) / Math.max(s1, s2);
    puntaje += 3 * razon;
  }

  const atributos = ["tiene_agua", "tiene_luz", "es_plana", "tiene_rio", "tiene_asfalto", "tiene_bosque"] as const;
  for (const attr of atributos) {
    peso += 1;
    if (Boolean(objetivo[attr]) === Boolean(candidato[attr])) puntaje += 1;
  }

  return peso > 0 ? puntaje / peso : 0;
}

function contieneAlguna(textos: string[], variantes: string[]): boolean {
  return variantes.some((v) => textos.some((t) => t.includes(v)));
}

/**
 * Puerto adaptado de `targetForSim` en `openPremiumReport()`. El original lee
 * `record.atributos_json?.agua`, `?.luz`, `?.bosque`, `?.topografia`,
 * `?.rio`, `?.lago`, `?.acceso` — un campo `atributos_json` que, verificado
 * contra el esquema real de `tpl_propiedades` al construir el editor integral
 * (`ParcelaEditorModal`/`GuardarParcelaInput`), no existe: la tabla tiene
 * `agua`/`electricidad`/`topografia`/`acceso` como texto libre y
 * `atributos_naturales` como lista de strings, no un objeto de booleanos.
 * Se deriva el mismo conjunto de 7 atributos por coincidencia de subcadena
 * sobre esas columnas reales — el mismo criterio que el propio original ya
 * usa del lado del catastro (`mapearComparableCatastro`, más abajo), no una
 * regresión de un campo que funcionaba.
 */
export function derivarTargetSimilitud(record: {
  comuna?: string | null;
  superficie_m2?: number | null;
  agua?: string | null;
  electricidad?: string | null;
  topografia?: string | null;
  acceso?: string | null;
  atributos_naturales?: string[] | string | null;
}): TargetSimilitud {
  const naturales = Array.isArray(record.atributos_naturales) ? record.atributos_naturales.join(" ") : String(record.atributos_naturales || "");
  const nat = naturales.toLowerCase();
  const agua = String(record.agua || "").toLowerCase();
  const electricidad = String(record.electricidad || "").toLowerCase();
  const topografia = String(record.topografia || "").toLowerCase();
  const acceso = String(record.acceso || "").toLowerCase();

  return {
    comuna: record.comuna || "",
    superficie: Number(record.superficie_m2) || 0,
    tiene_agua: contieneAlguna([agua, nat], ["agua", "vertiente"]),
    tiene_luz: contieneAlguna([electricidad, nat], ["luz", "empalme"]),
    tiene_bosque: contieneAlguna([nat], ["bosque", "nativo"]),
    es_plana: contieneAlguna([topografia, nat], ["plano", "plana"]),
    tiene_rio: contieneAlguna([nat], ["río", "rio"]),
    tiene_lago: contieneAlguna([nat], ["lago"]),
    tiene_asfalto: contieneAlguna([acceso, nat], ["asfalto", "pavimento"]),
  };
}

/** Puerto 1:1 del `.map()` sobre `tpl_catastro_mercado` en `openPremiumReport()`. */
export function mapearComparableCatastro(d: Record<string, unknown>): MercadoComparable {
  const attr = String(d.atributos || "").toLowerCase();
  const precioClp = Number(d.precio_clp) || 0;
  const precioUf = Number(d.precio_uf) || 0;
  return {
    id: String(d.id ?? ""),
    name: (d.titulo as string) || "Propiedad de mercado",
    comuna: (d.comuna as string) || "",
    superficie: Number(d.superficie_m2) || 0,
    precio: precioClp || (precioUf ? precioUf * 38000 : 0),
    tiene_agua: attr.includes("agua") || attr.includes("vertiente"),
    tiene_luz: attr.includes("luz") || attr.includes("empalme"),
    tiene_bosque: attr.includes("bosque") || attr.includes("nativo"),
    es_plana: attr.includes("plano") || attr.includes("plana"),
    tiene_rio: attr.includes("río") || attr.includes("rio"),
    tiene_lago: attr.includes("lago"),
    tiene_asfalto: attr.includes("asfalto") || attr.includes("pavimento"),
  };
}
