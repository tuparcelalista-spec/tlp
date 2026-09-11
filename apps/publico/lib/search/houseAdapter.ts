import type { House } from "@tpl/core";

/**
 * Adaptador `casas.js` (frontend-v2) → `House` (Search Core, `@tpl/core`).
 * Bloque 2.2 — vive fuera de `packages/core` a propósito: el motor puro no
 * puede importar ni leer `casas.js` (violaría su aislamiento de
 * `frontend-v2`), así que esta transformación es responsabilidad de quien
 * integra el motor, no del motor mismo.
 *
 * `casas.js` NO se toca ni se migra aquí — este archivo no lo importa en
 * ningún momento. Quien invoque `adaptCasasToHouses()` es responsable de
 * conseguir el arreglo crudo por su cuenta (hoy no existe ningún mecanismo
 * en `apps/publico` para obtenerlo — ver limitación documentada en el
 * informe de cierre del Bloque 2.2).
 */

/**
 * Forma cruda real observada en `frontend-v2/casas.js` (370 líneas,
 * catálogo estático de modelos ChileHome), verificada leyendo el archivo
 * directamente durante la auditoría de Search
 * (`docs/TPL-FASE-3-SEARCH-DISENO-DECISIONES.md` §10). Solo se listan los
 * campos que este adaptador efectivamente usa — `casas.js` tiene más
 * campos (`empresa`, `foto`, `imagenes`, `descripcion_breve`, `tiempo`,
 * `banos`) que no tienen equivalente en `House` y no se copian.
 */
export interface RawCasaInput {
  id: string;
  nombre?: string | null;
  /** Campo real y principal en `casas.js` (ej. `valorCasa: 2490000`). */
  valorCasa?: number | null;
  /** Respaldo — mismo criterio que `housePrice()` en `frontend-v2/js/index.js`. */
  precio?: number | null;
  /** Campo real en `casas.js` (ej. `metros: 18`). */
  metros?: number | null;
  /** Campo real en `casas.js` (ej. `habitaciones: 1`). */
  habitaciones?: number | null;
}

function toFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/**
 * Mapeo exacto utilizado (documentado, no inventado):
 *
 *   RawCasaInput.id            -> House.id
 *   RawCasaInput.nombre        -> House.name  (respaldo: "Casa")
 *   RawCasaInput.valorCasa,
 *   con respaldo en .precio    -> House.price (respaldo: 0, y se descarta
 *                                  después — ver nota)
 *   RawCasaInput.metros        -> House.areaM2
 *   RawCasaInput.habitaciones  -> House.rooms
 *
 * Se descartan (sin id válido, o sin precio numérico positivo) en vez de
 * producir un `House` con datos inventados: `searchProjectCombinations()`
 * (Search Core) ya filtra casas con `price <= 0`, pero filtrarlas aquí
 * también evita construir un `House` sin precio real que otro llamador
 * pudiera usar fuera de ese camino.
 */
export function adaptCasasToHouses(rawCasas: RawCasaInput[]): House[] {
  const houses: House[] = [];
  for (const raw of rawCasas) {
    if (typeof raw.id !== "string" || raw.id.length === 0) continue;
    const price = toFiniteNumber(raw.valorCasa) ?? toFiniteNumber(raw.precio);
    if (price === undefined || price <= 0) continue;

    const house: House = { id: raw.id, name: raw.nombre || "Casa", price };
    const areaM2 = toFiniteNumber(raw.metros);
    if (areaM2 !== undefined) house.areaM2 = areaM2;
    const rooms = toFiniteNumber(raw.habitaciones);
    if (rooms !== undefined) house.rooms = rooms;
    houses.push(house);
  }
  return houses;
}
