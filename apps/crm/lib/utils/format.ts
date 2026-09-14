/** Puerto 1:1 de `formatCLP()` en `crm-tpl-v1/core/utils.js`. */
export function formatCLP(value: number | null | undefined): string {
  if (value === null || value === undefined) return "$0";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
  }).format(value);
}

/**
 * Puerto 1:1 de `relativeDate()` en `crm-tpl-v1/core/utils.js` — "Hoy" /
 * "Mañana" / "Ayer", `Intl.RelativeTimeFormat` para el resto de la ventana
 * de ±30 días, y fecha corta fuera de ese rango. Antes solo vivía en el
 * bundle legacy; el módulo de Revisión es el primero en necesitarlo del
 * lado de Next.js.
 */
export function relativeDate(dateString: string | null | undefined): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
  const daysDifference = Math.round((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  if (daysDifference === 0) return "Hoy";
  if (daysDifference === 1) return "Mañana";
  if (daysDifference === -1) return "Ayer";

  if (Math.abs(daysDifference) < 30) {
    return rtf.format(daysDifference, "day");
  }

  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}
