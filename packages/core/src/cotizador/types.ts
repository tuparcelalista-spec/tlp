/**
 * Tipos y contratos del dominio Cotizador TPL — Proyecto Llave en Mano.
 *
 * Consolida el cálculo de:
 * Terreno (Parcela) + Vivienda (Prefabricada o A Medida) + Fundación + Obras Adicionales.
 */

export type HouseType = "prefabricada" | "diseno_propio";

export type ConstructionMaterial = "madera" | "metalcon" | "premium" | "hormigon";

export interface HouseModel {
  id: string;
  tipo: HouseType;
  empresa: string;
  nombre: string;
  metros: number;
  habitaciones: number;
  banos: number;
  valorCasa: number;
  valorM2?: number;
  material?: ConstructionMaterial;
  foto: string;
  imagenes: string[];
  plano?: string;
  descripcionBreve: string;
  tiempoEstimado: string;
}

export interface ConstructionSystemRate {
  id: ConstructionMaterial;
  nombre: string;
  descripcion: string;
  valorM2: number;
}

export interface FoundationOption {
  id: string;
  nombre: string;
  tipoCalculo: "mt2";
  valorPorM2: number;
  empresa: string;
}

export type ExtraWorkUnit = "unidad" | "metro" | "mt2" | "hora";

export interface AdditionalWorkItem {
  id: string;
  nombre: string;
  tipoCalculo: ExtraWorkUnit;
  valorUnitario: number;
  defaultQty: number;
  minQty: number;
  maxQty: number;
  descripcion: string;
}

export interface SelectedExtraWork {
  workId: string;
  quantity: number;
}

export type HousingChoice =
  | {
      mode: "prefab";
      houseModelId: string;
    }
  | {
      mode: "custom";
      system: ConstructionMaterial;
      surfaceM2: number;
      rooms: number;
    };

export interface CotizadorConfiguration {
  parcelPriceClp?: number;
  housing: HousingChoice;
  foundationId?: string;
  selectedExtras: SelectedExtraWork[];
}

export interface ProjectBudgetEstimate {
  parcelPrice: number;
  housePrice: number;
  houseSurfaceM2: number;
  foundationPrice: number;
  extrasPrice: number;
  totalProjectPrice: number;
  details: {
    houseName: string;
    foundationName: string | null;
    extrasBreakdown: Array<{
      workId: string;
      name: string;
      unitPrice: number;
      quantity: number;
      subtotal: number;
    }>;
  };
}
