/** Puerto 1:1 de `formatCLP()` en `crm-tpl-v1/core/utils.js`. */
export function formatCLP(value: number | null | undefined): string {
  if (value === null || value === undefined) return "$0";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
  }).format(value);
}
