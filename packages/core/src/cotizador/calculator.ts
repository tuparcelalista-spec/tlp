import type { CotizadorConfiguration, ProjectBudgetEstimate } from "./types";
import {
  HOUSE_MODELS,
  CONSTRUCTION_SYSTEM_RATES,
  FOUNDATION_OPTIONS,
  ADDITIONAL_WORKS,
} from "./catalog";

/**
 * Función matemática pura para calcular el presupuesto integral de un proyecto rural.
 * No genera efectos secundarios ni depende de APIs externas.
 */
export function calculateProjectBudget(config: CotizadorConfiguration): ProjectBudgetEstimate {
  const parcelPrice = Math.max(0, config.parcelPriceClp ?? 0);

  let housePrice = 0;
  let houseSurfaceM2 = 0;
  let houseName = "Vivienda por definir";

  const housing = config.housing;
  if (housing.mode === "prefab") {
    const model = HOUSE_MODELS.find((m) => m.id === housing.houseModelId);
    if (model) {
      housePrice = model.valorCasa;
      houseSurfaceM2 = model.metros;
      houseName = `${model.nombre} (${model.empresa})`;
    }
  } else if (housing.mode === "custom") {
    const rateConfig = CONSTRUCTION_SYSTEM_RATES[housing.system];
    const surface = Math.max(18, Math.min(400, housing.surfaceM2));
    const rate = rateConfig ? rateConfig.valorM2 : 270000;
    housePrice = rate * surface;
    houseSurfaceM2 = surface;
    houseName = `Diseño en ${rateConfig?.nombre ?? housing.system} (${surface} m²)`;
  }

  let foundationPrice = 0;
  let foundationName: string | null = null;

  if (config.foundationId) {
    const foundation = FOUNDATION_OPTIONS.find((f) => f.id === config.foundationId);
    if (foundation) {
      foundationPrice = foundation.valorPorM2 * houseSurfaceM2;
      foundationName = foundation.nombre;
    }
  }

  let extrasPrice = 0;
  const extrasBreakdown: ProjectBudgetEstimate["details"]["extrasBreakdown"] = [];

  for (const item of config.selectedExtras) {
    const workDef = ADDITIONAL_WORKS.find((w) => w.id === item.workId);
    if (workDef && item.quantity > 0) {
      const qty = Math.min(workDef.maxQty, Math.max(workDef.minQty, item.quantity));
      const subtotal = workDef.valorUnitario * qty;
      extrasPrice += subtotal;
      extrasBreakdown.push({
        workId: workDef.id,
        name: workDef.nombre,
        unitPrice: workDef.valorUnitario,
        quantity: qty,
        subtotal,
      });
    }
  }

  const totalProjectPrice = parcelPrice + housePrice + foundationPrice + extrasPrice;

  return {
    parcelPrice,
    housePrice,
    houseSurfaceM2,
    foundationPrice,
    extrasPrice,
    totalProjectPrice,
    details: {
      houseName,
      foundationName,
      extrasBreakdown,
    },
  };
}
