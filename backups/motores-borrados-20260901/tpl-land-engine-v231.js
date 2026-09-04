// ═══════════════════════════════════════════════════════════════════════════════
// TPL Land Engine V2.3.1 — Capa Híbrida de Inteligencia (Deno / ESM)
// ═══════════════════════════════════════════════════════════════════════════════

import { TPLLandEngine as EngineV23 } from './tpl-land-engine.js';

const ENGINE_VERSION = 'tpl-land-engine-v2.3.1-hybrid';

/**
 * Calcula la tasación híbrida envolviendo al motor V2.3 clásico.
 * @param {Object} input - Datos físicos y geográficos de la propiedad
 * @param {Object} [context] - Contexto comercial y de geointeligencia (CONIT, Mercado)
 */
function calculate(input, context = {}) {
  // Pre-procesamiento de entradas para corregir sesgos sistemáticos sin alterar el motor V2.3
  const correctedInput = { ...input };

  // Corrección de Turismo: mapear 'internacional' a 'nacional' para activar multiplicador x4 (+300%) y protección territorial
  const rawTourism = String(input.tourism || input.tourismLevel || 'sin_categoria').toLowerCase();
  if (rawTourism === 'internacional' || rawTourism === 'nacional') {
    correctedInput.tourism = 'nacional';
  } else if (rawTourism === 'regional' || rawTourism === 'local' || rawTourism === 'provincial') {
    correctedInput.tourism = 'regional';
  }

  // 1. Obtener valoración técnica clásica del motor V2.3 usando la entrada saneada
  const v23Result = EngineV23.calculate(correctedInput);
  if (v23Result.error) return v23Result;

  const valorTecnico = v23Result.valorFinal;

  // 2. Extraer parámetros CONIT, mercado y turismo
  const conit = context.conit || {};
  const market = context.market || {};
  
  const turismo = correctedInput.tourism;
  
  // 3. Calcular Índice Comercial (0 a 100)
  let scoreComercial = 50; // Base neutra

  // A. Potencial Cabañas / Turístico
  const tieneAgua = /apr|pozo|agua disponible|con agua/.test(String(input.water || '').toLowerCase());
  const tieneAtractivo = (input.nature || []).some(x => /rio|lago|estero|vertiente/.test(String(x).toLowerCase()));
  const topografiaSuave = /plana|suave/.test(String(input.topography || '').toLowerCase());
  
  if (tieneAgua && tieneAtractivo && topografiaSuave) scoreComercial += 15;
  else if (tieneAgua && topografiaSuave) scoreComercial += 5;

  // B. Potencial Subdivisión
  const area = Number(input.area || input.superficie || 0);
  if (area >= 10000) scoreComercial += 10;

  // C. CONIT - Accesibilidad Temporal (Tiempos de viaje)
  const tiempoHub = Number(conit.economic_hub_time_mins ?? 999);
  const tiempoComuna = Number(conit.commune_center_time_mins ?? 999);
  
  if (tiempoHub <= 30) scoreComercial += 15;
  else if (tiempoHub <= 60) scoreComercial += 8;
  else scoreComercial -= 10;

  if (tiempoComuna <= 15) scoreComercial += 10;

  // D. Zona Turística
  if (turismo === 'nacional') scoreComercial += 20;
  else if (turismo === 'regional') scoreComercial += 10;

  // Normalizar Score Comercial entre 0 y 100
  scoreComercial = Math.max(0, Math.min(100, scoreComercial));

  // 4. Analizar Desviación vs Referencia Comunal
  const medianaComunal = Number(market.medianM2 ?? 0) * area;
  const comparaCount = Number(market.sampleSize ?? 0);
  let desviacionPct = 0;
  let ajusteComercial = 0;

  if (medianaComunal > 0) {
    desviacionPct = ((valorTecnico - medianaComunal) / medianaComunal) * 100;

    // Regla de ajuste comercial limitado (Max ±10%)
    // Requiere muestra >= 15 y una desviación extrema (>= 40%)
    if (comparaCount >= 15 && Math.abs(desviacionPct) >= 40) {
      ajusteComercial = desviacionPct > 0 ? -0.10 : 0.10; // Reducir si está sobreestimado, aumentar si está subestimado
    }
  }

  // 5. Calcular valorFinal Híbrido
  const valorFinal = Math.round(valorTecnico * (1 + ajusteComercial));

  // 6. Determinar Nivel de Confianza
  let nivelConfianza = v23Result.propertyIndex?.score >= 70 ? 'alta' : 'media';
  if (Math.abs(desviacionPct) >= 40) nivelConfianza = 'baja'; // Alerta de discrepancia

  return {
    ...v23Result,
    valorFinal,
    valorTecnico,
    valorComunal: medianaComunal || null,
    desviacionComunalPct: medianaComunal > 0 ? Number(desviacionPct.toFixed(1)) : null,
    comparaCount,
    indiceComercial: scoreComercial,
    nivelConfianza,
    zonaTuristica: turismo,
    ajusteComercialAplicado: Number((ajusteComercial * 100).toFixed(1)),
    versionMotor: ENGINE_VERSION
  };
}

export const TPLLandEngineV231 = Object.freeze({
  ENGINE_VERSION,
  calculate
});
