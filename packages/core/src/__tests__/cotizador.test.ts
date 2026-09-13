import assert from "node:assert/strict";
import {
  calculateProjectBudget,
  HOUSE_MODELS,
  FOUNDATION_OPTIONS,
  ADDITIONAL_WORKS,
  CONSTRUCTION_SYSTEM_RATES,
} from "../cotizador";

export function runCotizadorTests() {
  // Test 1: Modelos de casas del legado con datos válidos
  assert.ok(HOUSE_MODELS.length >= 14, "Debe contener al menos 14 modelos de casas");
  const aura36 = HOUSE_MODELS.find((m) => m.id === "aura36");
  assert.ok(aura36, "Modelo aura36 debe existir");
  assert.equal(aura36?.valorCasa, 4840000, "Valor de aura36 debe ser 4.840.000");
  assert.equal(aura36?.metros, 36, "Superficie de aura36 debe ser 36m²");
  assert.equal(aura36?.empresa, "ChileHome", "Empresa debe ser ChileHome");

  // Test 2: Cálculo con casa prefabricada, radier y pozo + fosa
  const estimate1 = calculateProjectBudget({
    parcelPriceClp: 25000000,
    housing: {
      mode: "prefab",
      houseModelId: "aura36",
    },
    foundationId: "radier_hormigon", // $95.000 / m² * 36m² = $3.420.000
    selectedExtras: [
      { workId: "pozo_profundo", quantity: 30 }, // $50.000 * 30m = $1.500.000
      { workId: "fosa_septica", quantity: 1 }, // $1.500.000
    ],
  });

  assert.equal(estimate1.parcelPrice, 25000000);
  assert.equal(estimate1.housePrice, 4840000);
  assert.equal(estimate1.houseSurfaceM2, 36);
  assert.equal(estimate1.foundationPrice, 95000 * 36);
  assert.equal(estimate1.extrasPrice, 3000000);
  const expectedTotal1 = 25000000 + 4840000 + 95000 * 36 + 3000000;
  assert.equal(estimate1.totalProjectPrice, expectedTotal1);
  assert.ok(estimate1.details.houseName.includes("Casa prefabricada 36m²"));
  assert.ok(estimate1.details.foundationName?.includes("Radier de hormigón"));
  assert.equal(estimate1.details.extrasBreakdown.length, 2);

  // Test 3: Cálculo con diseño a medida Metalcon
  const rateMetalcon = CONSTRUCTION_SYSTEM_RATES.metalcon.valorM2; // 370.000
  const estimate2 = calculateProjectBudget({
    parcelPriceClp: 0, // usuario ya tiene terreno
    housing: {
      mode: "custom",
      system: "metalcon",
      surfaceM2: 80,
      rooms: 3,
    },
    selectedExtras: [],
  });

  assert.equal(estimate2.parcelPrice, 0);
  assert.equal(estimate2.housePrice, rateMetalcon * 80);
  assert.equal(estimate2.houseSurfaceM2, 80);
  assert.equal(estimate2.foundationPrice, 0);
  assert.equal(estimate2.extrasPrice, 0);
  assert.equal(estimate2.totalProjectPrice, rateMetalcon * 80);
  assert.ok(estimate2.details.houseName.includes("Metalcon"));

  // Test 4: Catálogo completo de 15 obras y cálculo dinámico base casa_m2
  assert.ok(ADDITIONAL_WORKS.length >= 15, "Debe contener al menos 15 obras adicionales");
  // P1-05: ids fieles al legacy (frontend-v2/extras.js) — no las variantes
  // que se habían colado ("instalacion_electrica" en minúscula, "porton_acceso").
  const elec = ADDITIONAL_WORKS.find((w) => w.id === "Instalacion_electrica");
  assert.ok(elec, "Debe existir Instalacion_electrica (con mayúscula, igual que el legacy)");
  assert.equal(elec?.base, "casa_m2", "Base de Instalacion_electrica debe ser casa_m2");

  const pisoCeramico = ADDITIONAL_WORKS.find((w) => w.id === "piso ceramico");
  assert.ok(pisoCeramico, "El id debe ser 'piso ceramico' (con espacio), igual que el legacy");

  assert.ok(ADDITIONAL_WORKS.some((w) => w.id === "porton"), "El id debe ser 'porton', igual que el legacy");
  assert.ok(!ADDITIONAL_WORKS.some((w) => w.id === "porton_acceso"), "'porton_acceso' no debe existir: no es el id original");

  // Los maxQty deben calzar exactamente con frontend-v2/extras.js.
  assert.equal(ADDITIONAL_WORKS.find((w) => w.id === "artefactos_cocina")?.maxQty, 1);
  assert.equal(ADDITIONAL_WORKS.find((w) => w.id === "artefactos_bano")?.maxQty, 3);
  assert.equal(ADDITIONAL_WORKS.find((w) => w.id === "fosa_septica")?.maxQty, 5);
  assert.equal(ADDITIONAL_WORKS.find((w) => w.id === "cierre_perimetral")?.maxQty, 500);
  assert.equal(ADDITIONAL_WORKS.find((w) => w.id === "quincho")?.maxQty, 30);

  const estimate4 = calculateProjectBudget({
    parcelPriceClp: 20000000,
    housing: {
      mode: "prefab",
      houseModelId: "aura36", // 36 m²
    },
    selectedExtras: [
      { workId: "Instalacion_electrica", quantity: 1 }, // 15.000 * 36 = 540.000 (prueba de case insensitivity)
      { workId: "piso_ceramico", quantity: 1 }, // 32.000 * 36 = 1.152.000
    ],
  });

  assert.equal(estimate4.houseSurfaceM2, 36);
  assert.equal(estimate4.extrasPrice, 15000 * 36 + 32000 * 36);
  assert.equal(estimate4.details.extrasBreakdown.length, 2);
  assert.equal(estimate4.details.extrasBreakdown[0].quantity, 36);
  assert.equal(estimate4.details.extrasBreakdown[0].subtotal, 540000);

  console.log("✓ Todos los tests del Cotizador Core pasaron exitosamente.");
}

// Ejecución directa si se invoca con node
if (typeof process !== "undefined" && process.argv[1]?.includes("cotizador.test")) {
  runCotizadorTests();
}
