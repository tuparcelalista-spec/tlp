"use server";

import { searchProperties } from "../search/supabaseSearchRepository";
import { formatPriceCLP } from "./wizardState";

/**
 * "Cálculo orientativo de valor" — Paso 3. Decisión explícita, documentada:
 * NO se portó el motor de tasación real (`TPLLandEngine`/`TPLHouseEngine`,
 * ver auditoría de `publicar-v2`) porque no fue autorizado en este bloque —
 * son fórmulas de negocio grandes que merecen su propia revisión línea por
 * línea, no un port apurado. Tampoco se inventa una cifra.
 *
 * Lo que sí se puede mostrar de forma honesta con lo ya aprobado: el precio
 * promedio real de las propiedades YA PUBLICADAS en la misma comuna,
 * reutilizando `searchProperties()` (Search Core, sin lógica nueva, mismo
 * filtro `commune` que ya usa `getRelatedProperties()`). Si la comuna no
 * tiene propiedades publicadas todavía, se devuelve `null` — la página
 * dice "sin datos de mercado en tu comuna todavía", nunca un número
 * inventado.
 */
export interface ComunaPriceReference {
  comuna: string;
  sampleSize: number;
  averagePrice: number;
  averagePriceLabel: string | undefined;
}

export async function getComunaPriceReference(comuna: string): Promise<ComunaPriceReference | null> {
  const trimmed = comuna.trim();
  if (!trimmed) return null;

  const result = await searchProperties({ intent: "property", commune: trimmed });
  if (result.intent !== "property" || result.properties.length === 0) return null;

  const preciosReales = result.properties
    .map((property) => property.price)
    .filter((price): price is number => typeof price === "number" && price > 0);

  if (preciosReales.length === 0) return null;

  const promedio = Math.round(preciosReales.reduce((suma, precio) => suma + precio, 0) / preciosReales.length);

  return {
    comuna: trimmed,
    sampleSize: preciosReales.length,
    averagePrice: promedio,
    averagePriceLabel: formatPriceCLP(promedio),
  };
}
