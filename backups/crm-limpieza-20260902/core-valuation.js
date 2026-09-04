/**
 * core/valuation.js — Pure valuation functions for CRM V1
 */

/**
 * Returns the valuation values including dynamically calculated ones
 * @param {Object} record - The property record (or a combined record with valuation info)
 * @param {Object} [valuation] - Optional latest valuation object if not on record
 */
export function valuationValues(record, valuation = null) {
  const v = valuation || record.tasacion_actual || record.valuation || record.geoint || {};
  const result = v.resultado || v.result || v;
  const roundPrice = (val) => Math.round(Number(val || 0) / 10000) * 10000;
  
  const valorTplTecnico = Number(result.valor_tpl_tecnico || result.valorFinal || result.technical || 0);
  const valorTplPromedioComunal = Number(result.valor_tpl_promedio_comunal || result.valorComunal || result.valorPromedioReferencia || 0);
  const precioPublicado = Number(record.precio_publicado || 0);
  
  let valorTplRecomendado = Number(result.valor_tpl_recomendado || result.valorFinal || result.valor_tpl_tasador || v.valor_tpl_total || 0);
  if (valorTplTecnico > 0) {
      if (valorTplPromedioComunal > 0 && precioPublicado > 0) {
          valorTplRecomendado = roundPrice((valorTplTecnico + valorTplPromedioComunal + precioPublicado) / 3);
      } else if (valorTplPromedioComunal > 0) {
          valorTplRecomendado = roundPrice((valorTplTecnico + valorTplPromedioComunal) / 2);
      }
  }
  
  let valorTplApuro = Number(result.valor_tpl_apuro || result.valorPorApuro || 0);
  if (valorTplTecnico > 0 || valorTplPromedioComunal > 0) {
      const area = Number(record.superficie_m2 || 0);
      const m2Ref = 1680;
      const tplVal = valorTplTecnico || valorTplRecomendado || 0;
      const comunalVal = valorTplPromedioComunal || 0;
      valorTplApuro = roundPrice((tplVal + comunalVal + (m2Ref * area)) / 3);
  }

  return {
    valuation: v,
    valorTplTecnico,
    valorTplPromedioComunal,
    valorTplRecomendado,
    precioPublicado,
    valorTplApuro
  };
}

/**
 * Formats a money value
 */
const fmtMoney = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n
    ? new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)
    : '—';
};

/**
 * Returns the commercial tier classification based on price and TPL value
 */
export function getCommercialTier(r) {
  const price = Number(r?.precio_publicado || 0);
  const tplM2 = Number(r?.valor_tpl_m2 || 0);
  const area = Number(r?.superficie_m2 || 0);
  const tplValue = tplM2 && area ? tplM2 * area : 0;
  if (!price || !tplValue) return null;
  
  const ratio = price / tplValue;
  const manual = Boolean(r?.seleccion_tpl === true || r?.metadata?.seleccion_tpl === true);
  const discount = Math.max(0, Math.round((1 - ratio) * 100));
  
  if (manual && ratio <= 1.005) return { key: 'selection', label: 'Selección TPL' };
  if (ratio <= .85) return { key: 'great-opportunity', label: `Gran Oportunidad · ${discount}% bajo TPL` };
  if (ratio <= .95) return { key: 'opportunity', label: `Oportunidad · ${discount}% bajo TPL` };
  if (ratio <= 1.005) return { key: 'featured', label: 'Destacada TPL' };
  
  return null;
}

/**
 * Renders the valuation summary HTML card
 */
export function renderValuationSummaryCard(record, valuation = null) {
  const v = valuationValues(record, valuation);
  if (!v.valorTplRecomendado) return '<div class="crm-valuation-empty"><strong>Sin tasación registrada</strong><span>Usa Tasación rápida para una referencia inicial o Tasación completa para incorporar mapa, accesos y atributos detallados.</span></div>';
  
  const intel = v.valuation?.resultado || {};
  
  const hubName = intel.conit?.economic_hub_name || record.geoint?.economic_hub_name || record.metadata?.tasador_entrada?.economic_hub_name || '';
  const hubDist = intel.conit?.economic_hub_distance_km || record.geoint?.economic_hub_distance_km || record.metadata?.tasador_entrada?.economic_hub_distance_km || 0;
  const hubTime = intel.conit?.economic_hub_time_mins || record.geoint?.economic_hub_time_mins || record.metadata?.tasador_entrada?.economic_hub_time_mins || 0;
  
  const comunaName = intel.conit?.commune_center_name || record.geoint?.commune_center_name || record.metadata?.tasador_entrada?.commune_center_name || '';
  const comunaDist = intel.conit?.commune_center_distance_km || record.geoint?.commune_center_distance_km || record.distancia_centro_comuna_km || record.metadata?.distancia_centro_comuna_km || v.valuation?.entrada?.communeDistanceKm || 0;
  const comunaTime = intel.conit?.commune_center_time_mins || record.geoint?.commune_center_time_mins || record.metadata?.tasador_entrada?.commune_center_time_mins || 0;
  
  const zonaTuristica = String(intel.zonaTuristica || 'sin_categoria').replace('_', ' ');
  const nivelConectividad = intel.conit?.connectivity_level || record.geoint?.connectivity_level || record.metadata?.tasador_entrada?.connectivity_level || 'Básico';
  const indiceComercial = intel.indiceComercial || 0;

  const diffComunal = (v.valorTplRecomendado && v.valorTplPromedioComunal) ? ((v.valorTplRecomendado - v.valorTplPromedioComunal) / v.valorTplPromedioComunal) * 100 : 0;
  const diffStr = diffComunal > 0 ? `+${diffComunal.toFixed(1)}%` : `${diffComunal.toFixed(1)}%`;
  const diffClass = diffComunal > 0 ? 'text-green' : (diffComunal < 0 ? 'text-red' : 'text-gray');
  const precioPub = Number(record.precio_publicado || 0);
  const oportunidadTPL = (precioPub > 0 && v.valorTplRecomendado > 0) ? Math.round((v.valorTplRecomendado / precioPub) * 100) : 0;
  
  let oppBadge = '';
  if (oportunidadTPL > 120) oppBadge = '<span class="exec-badge bg-green">Excelente Oportunidad</span>';
  else if (oportunidadTPL > 100) oppBadge = '<span class="exec-badge bg-blue">Buena Oportunidad</span>';
  else if (oportunidadTPL > 0) oppBadge = '<span class="exec-badge bg-gray">En precio de mercado</span>';

  return `
<div class="crm-executive-panel">
<div class="exec-header">
  <h3>Tasador TPL V2.4</h3>
  <div style="display:flex; gap:8px;">
    <span class="exec-badge bg-blue">Tasación Activa</span>
    ${oppBadge}
  </div>
</div>

<div class="exec-top-tier">
  <div class="exec-focal-point">
    <span class="exec-label">Valor Estimado TPL</span>
    <strong class="exec-value-huge">${fmtMoney(v.valorTplRecomendado)}</strong>
    <div style="display:flex; justify-content:space-between; margin-top:8px;">
      <span class="exec-diff ${diffClass}"><strong>${diffStr}</strong> vs comunal</span>
      <span class="exec-label" style="font-size:0.8rem;">Confianza: ${intel.confianza || 'Media'}</span>
    </div>
  </div>
  <div class="exec-secondary-tier">
    <div class="exec-card-minimal">
      <span class="exec-label">Rango Estimado</span>
      <strong class="exec-value-small">${v.valuation?.resultado?.rangoInferior ? fmtMoney(v.valuation.resultado.rangoInferior) + ' - ' + fmtMoney(v.valuation.resultado.rangoSuperior) : '-'}</strong>
    </div>
    <div class="exec-card-minimal">
      <span class="exec-label">Valor Comunal (Ref)</span>
      <strong class="exec-value-small">${v.valorTplPromedioComunal > 0 ? fmtMoney(v.valorTplPromedioComunal) : '—'}</strong>
    </div>
    <div class="exec-card-minimal">
      <span class="exec-label">Venta Rápida (Apuro)</span>
      <strong class="exec-value-small muted">${v.valorTplApuro > 0 ? fmtMoney(v.valorTplApuro) : '—'}</strong>
    </div>
  </div>
</div>

<div class="exec-conit-block">
  <header class="conit-header">
    <h4>Conectividad Territorial (CONIT)</h4>
    <span class="exec-badge bg-gray">Índice: ${indiceComercial}/100</span>
  </header>
  <div class="conit-grid">
    <div class="conit-item">
      <span class="conit-label">Ciudad Principal</span>
      <strong class="conit-val">${hubName || '—'}</strong>
      <span class="conit-sub">${hubDist} km · ${hubTime} min</span>
    </div>
    <div class="conit-item">
      <span class="conit-label">Cabecera Comunal</span>
      <strong class="conit-val">${comunaName || '—'}</strong>
      <span class="conit-sub">${comunaDist} km · ${comunaTime} min</span>
    </div>
    <div class="conit-item">
      <span class="conit-label">Nivel Conectividad</span>
      <strong class="conit-val">${nivelConectividad}</strong>
      <span class="conit-sub" style="text-transform: capitalize;">${zonaTuristica.replace('_', ' ')}</span>
    </div>
  </div>
</div>
</div>`;
}
