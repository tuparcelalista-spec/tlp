/**
 * Fixtures de `normalizeProperty()` — Bloque 1.2.
 *
 * No es un archivo de test runtime (no hay Vitest/Jest instalado todavía,
 * a propósito). Cada fixture está tipada como `RawPropertyInput` y cada
 * resultado como `Property`: si `normalizeProperty()` alguna vez deja de
 * cumplir el contrato, o si una fixture deja de ser una entrada válida,
 * `pnpm --filter @tpl/core typecheck` falla. Cuando se autorice un test
 * runner, este archivo se puede importar directamente para escribir los
 * `assert`/`expect` reales sobre estos mismos casos.
 *
 * Los casos A y C están modelados sobre filas reales verificadas contra
 * producción (2026-09-10, misma clave `anon` que ya usa el navegador) —
 * comuna, título y estructura de `casa_datos` son reales. Los valores de
 * `metadata.valor_tpl_*` en el Caso A son de ejemplo (no se capturó una
 * fila real con esos tres valores simultáneamente no nulos) — se marcan
 * como tal, no se presentan como un valor observado.
 */
import { normalizeProperty, type RawPropertyInput } from "../normalizeProperty";
import type { Property } from "../property";

// ---------------------------------------------------------------------------
// Caso A — Parcela completa (estructura real: fila "Virquenco", producción)
// ---------------------------------------------------------------------------
export const fixtureA_parcelaCompleta: RawPropertyInput = {
  id: "fd0f2233-5bb9-4ec4-a046-f551418fe887",
  codigo: "TPL-ADBA0CE82E",
  tipo: "parcela",
  estado: "publicada",
  titulo: "Parcela en centro de Virquenco con Luz y cercada.",
  descripcion: "Gran terreno de 1,2 hectáreas (12500mts2) completamente cercada en pleno centro de Virquenco.",
  region: "Región del Biobío",
  comuna: "Los Ángeles",
  sector: "virquenco",
  lat: -37.457295,
  lng: -72.4989711,
  superficie_m2: 12500,
  precio_publicado: 54000000,
  moneda: "CLP",
  rol_situacion: "Rol propio",
  electricidad: "Conectada",
  agua: "Factibilidad",
  acceso: "Camino público pavimentado",
  topografia: "Plana",
  suelo: "Muy fértil",
  exposicion: null,
  vista_principal: null,
  vegetacion: "Pradera despejada",
  cierre_perimetral: "Cerrado completo",
  porton: "Con portón",
  condominio: true,
  atributos_naturales: [],
  destacada: false,
  oportunidad_tpl: true,
  publicada_at: "2026-09-03T16:58:02.364257+00:00",
  // Valores de EJEMPLO para ejercitar la precedencia de valoración — no observados simultáneamente en esta fila real.
  metadata: {
    valor_tpl_tecnico: 48000000,
    valor_comunal: 58000000,
    valor_tpl_recomendado: 50000000,
  },
  casa_datos: {},
  imagenes: [
    {
      url: "https://hwyscirbycojwndyzozn.supabase.co/storage/v1/object/public/tpl-propiedades-propietario/fd0f2233/foto1.webp",
      orden: 0,
      es_portada: false,
    },
  ],
  video: null,
};
export const resultA: Property = normalizeProperty(fixtureA_parcelaCompleta);

// ---------------------------------------------------------------------------
// Caso B — Parcela con muchos nulls (estructura real: fila "Los Guindos")
// ---------------------------------------------------------------------------
export const fixtureB_muchosNulls: RawPropertyInput = {
  id: "86fc06ab-2a4c-427b-9d81-13db9d6177d7",
  codigo: "los_guindos_media_hectarea",
  tipo: "parcela",
  estado: "publicada",
  titulo: "Los Guindos Nativo – Bosque Nahuelbuta | Nacimiento",
  descripcion: "Parcela de 5.000 m² ubicada en el sector Los Guindos, comuna de Nacimiento.",
  region: "Biobío",
  comuna: "Nacimiento",
  sector: null,
  lat: -37.53577,
  lng: -72.9466,
  superficie_m2: 5000,
  precio_publicado: 9578000,
  rol_situacion: "si",
  electricidad: "no",
  agua: "no",
  acceso: "No especificado",
  topografia: null,
  suelo: null,
  exposicion: null,
  vista_principal: "Por confirmar",
  vegetacion: "Sí",
  cierre_perimetral: null,
  porton: null,
  condominio: null,
  atributos_naturales: ["naturaleza"],
  destacada: false,
  oportunidad_tpl: false,
  publicada_at: "2026-08-02T18:11:02.783268+00:00",
  metadata: {},
  casa_datos: {},
  imagenes: [
    { url: "image/nacimiento/los_guindos/los_guindos_89_1 (1).webp", orden: 0, es_portada: false },
    { url: "image/nacimiento/los_guindos/los_guindos_89_1 (2).webp", orden: 1, es_portada: false },
  ],
  video: null,
};
export const resultB: Property = normalizeProperty(fixtureB_muchosNulls);

// ---------------------------------------------------------------------------
// Caso C — Real, inconsistente: tipo='casa' con casa_datos={} (fila real "Río Claro")
// Ejercita exactamente el hallazgo de la auditoría: hasHouse debe salir
// `true` (por tipo==='casa'), NO por casa_datos (que está vacío).
// ---------------------------------------------------------------------------
export const fixtureC_tipoCasaSinDatos: RawPropertyInput = {
  id: "14d670f4-70ca-4706-ab78-47a7c0f4a619",
  codigo: "rio_claro_con_casa",
  tipo: "casa",
  estado: "publicada",
  titulo: "Río Claro – Parcela con Vivienda para Remodelar | Yumbel",
  comuna: "Yumbel",
  superficie_m2: 5000,
  precio_publicado: 31100000,
  casa_datos: {},
  metadata: {},
  imagenes: [],
  video: null,
};
export const resultC: Property = normalizeProperty(fixtureC_tipoCasaSinDatos);

// ---------------------------------------------------------------------------
// Caso D — tipo='parcela' con casa_datos NO vacío (estructura real observada
// en producción). hasHouse debe salir `true` por casa_datos, pese a
// type === 'parcela' — el otro lado del mismo hallazgo que el Caso C.
// ---------------------------------------------------------------------------
export const fixtureD_parcelaConCasaDatos: RawPropertyInput = {
  id: "00000000-0000-4000-8000-000000000001",
  codigo: "ejemplo_parcela_con_casa",
  tipo: "parcela",
  estado: "publicada",
  titulo: "Parcela con vivienda existente",
  comuna: "Yumbel",
  superficie_m2: 8000,
  precio_publicado: 45000000,
  casa_datos: {
    banos: null,
    dormitorios: null,
    riego: "",
    cabana: "",
    piscina: "",
    quincho: "",
    piscina_m2: 0,
    piscina_mat: "fibra",
    materialidad: "estandar",
    regularizada: "",
    antiguedadAnios: 0,
    antiguedad_anios: 0,
    superficieConstruida: null,
    superficie_construida: 85,
  },
  metadata: {},
  imagenes: [],
  video: null,
};
export const resultD: Property = normalizeProperty(fixtureD_parcelaConCasaDatos);

// ---------------------------------------------------------------------------
// Caso E — metadata como string JSON vs. como objeto ya parseado.
// Deben normalizar a la MISMA valoración.
// ---------------------------------------------------------------------------
const metadataObjeto = { valor_tpl_recomendado: 20000000, valor_comunal: 22000000 };

export const fixtureE1_metadataObjeto: RawPropertyInput = {
  id: "00000000-0000-4000-8000-000000000002",
  codigo: "ejemplo_metadata_objeto",
  tipo: "parcela",
  metadata: metadataObjeto,
};
export const resultE1: Property = normalizeProperty(fixtureE1_metadataObjeto);

export const fixtureE2_metadataString: RawPropertyInput = {
  id: "00000000-0000-4000-8000-000000000003",
  codigo: "ejemplo_metadata_string",
  tipo: "parcela",
  metadata: JSON.stringify(metadataObjeto),
};
export const resultE2: Property = normalizeProperty(fixtureE2_metadataString);

// ---------------------------------------------------------------------------
// Caso F — Imágenes múltiples y resolución de portada (es_portada en una
// posición distinta de la primera).
// ---------------------------------------------------------------------------
export const fixtureF_imagenesMultiples: RawPropertyInput = {
  id: "00000000-0000-4000-8000-000000000004",
  codigo: "ejemplo_galeria",
  tipo: "parcela",
  imagenes: [
    { url: "image/ejemplo/foto-1.webp", orden: 0, es_portada: false },
    { url: "image/ejemplo/foto-2-portada.webp", orden: 1, es_portada: true },
    { url: "image/ejemplo/foto-3.webp", orden: 2, es_portada: false },
  ],
};
export const resultF: Property = normalizeProperty(fixtureF_imagenesMultiples);
