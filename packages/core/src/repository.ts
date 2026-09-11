import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeProperty, type RawPropertyImageInput, type RawPropertyInput } from "./normalizeProperty";
import type { Property } from "./property";

const PUBLISHED_STATUS = "publicada";

/**
 * Columnas reales de `tpl_propiedades` que alimentan `RawPropertyInput`.
 * Se excluye `subtipo` a propósito: `normalizeSubtype()` lo ignora siempre
 * (regla aprobada, Bloque 1.2) y traerlo por la red no tendría uso alguno.
 */
const PROPERTY_COLUMNS = [
  "id",
  "codigo",
  "tipo",
  "estado",
  "destacada",
  "oportunidad_tpl",
  "publicada_at",
  "titulo",
  "descripcion",
  "precio_publicado",
  "moneda",
  "region",
  "comuna",
  "sector",
  "lat",
  "lng",
  "superficie_m2",
  "rol_situacion",
  "electricidad",
  "agua",
  "acceso",
  "topografia",
  "suelo",
  "exposicion",
  "vista_principal",
  "vegetacion",
  "cierre_perimetral",
  "porton",
  "condominio",
  "atributos_naturales",
  "casa_datos",
  "metadata",
].join(", ");

const IMAGE_COLUMNS = "propiedad_id, url, storage_path, alt, orden, es_portada";

type RawPropertyRow = Omit<RawPropertyInput, "imagenes" | "video">;

interface RawImageRow extends RawPropertyImageInput {
  propiedad_id: string;
}

export interface PropertyListOptions {
  limit?: number;
}

/**
 * Contrato de acceso a propiedades públicas — Bloque 1.3. Únicamente estos
 * dos métodos (aprobado): sin filtros, sin FTS, sin PostGIS, sin proximidad,
 * sin paginación ni orden expuesto — eso es diseño de un bloque futuro no
 * autorizado todavía (ver docs/TPL-FASE-3-AUDITORIA-ARQUITECTURA.md).
 */
export interface PropertyRepository {
  list(options?: PropertyListOptions): Promise<Property[]>;
  getByCode(code: string): Promise<Property | null>;
}

/**
 * Implementación de solo lectura pública contra Supabase (clave `anon`,
 * sujeta a RLS — nunca `service_role`). Garantiza 1 consulta a
 * `tpl_propiedades` + 1 consulta batch a `tpl_propiedad_imagenes` (nunca
 * N+1), sin importar cuántas propiedades se devuelvan.
 *
 * `video` se pasa siempre como `null` a `normalizeProperty()` en este
 * bloque: la consulta batch de `tpl_propiedad_videos` (con el filtro
 * `publicado_en_parcela = true`) no forma parte del alcance aprobado de
 * Bloque 1.3 — solo propiedades + imágenes. Queda documentado como alcance
 * pendiente, no como un olvido.
 *
 * No hay tipos generados de Supabase para este esquema todavía, por lo que
 * `SupabaseClient` se usa sin genéricos y las filas se tipan manualmente
 * como `RawPropertyRow`/`RawImageRow` — mismo patrón ya usado en
 * `RawPropertyInput` (Bloque 1.2).
 */
export class SupabasePropertyRepository implements PropertyRepository {
  constructor(private readonly client: SupabaseClient) {}

  async list(options: PropertyListOptions = {}): Promise<Property[]> {
    let query = this.client
      .from("tpl_propiedades")
      .select(PROPERTY_COLUMNS)
      .eq("estado", PUBLISHED_STATUS)
      .order("publicada_at", { ascending: false });

    if (typeof options.limit === "number") {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`SupabasePropertyRepository.list: ${error.message}`);
    }

    return this.hydrate((data ?? []) as unknown as RawPropertyRow[]);
  }

  async getByCode(code: string): Promise<Property | null> {
    const { data, error } = await this.client
      .from("tpl_propiedades")
      .select(PROPERTY_COLUMNS)
      .eq("estado", PUBLISHED_STATUS)
      .eq("codigo", code)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`SupabasePropertyRepository.getByCode: ${error.message}`);
    }
    if (!data) return null;

    const [property] = await this.hydrate([data as unknown as RawPropertyRow]);
    return property ?? null;
  }

  /**
   * Adjunta imágenes con UNA sola consulta batch (`in propiedad_id`) para
   * todo el lote recibido — nunca una consulta por propiedad.
   */
  private async hydrate(rows: RawPropertyRow[]): Promise<Property[]> {
    if (rows.length === 0) return [];

    const ids = rows.map((row) => row.id);
    const { data: imageRows, error: imagesError } = await this.client
      .from("tpl_propiedad_imagenes")
      .select(IMAGE_COLUMNS)
      .in("propiedad_id", ids);

    if (imagesError) {
      throw new Error(`SupabasePropertyRepository: error al obtener imágenes: ${imagesError.message}`);
    }

    const imagesByPropertyId = new Map<string, RawPropertyImageInput[]>();
    for (const img of (imageRows ?? []) as unknown as RawImageRow[]) {
      const list = imagesByPropertyId.get(img.propiedad_id) ?? [];
      list.push(img);
      imagesByPropertyId.set(img.propiedad_id, list);
    }

    return rows.map((row) =>
      normalizeProperty({
        ...row,
        imagenes: imagesByPropertyId.get(row.id) ?? [],
        video: null,
      }),
    );
  }
}
