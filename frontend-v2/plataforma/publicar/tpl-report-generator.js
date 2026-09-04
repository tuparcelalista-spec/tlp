/**
 * tpl-report-generator.js — Generador Modular de Informe TPL Business V3 (Dossier Ejecutivo)
 * Arquitectura 100% modular en 3 páginas A4 orientadas a alta conversión y defensa de precio.
 * Utiliza variables del motor V2.4 y CONIT exclusivamente.
 */
(function(){
  'use strict';

  function formatMoney(num){
    const n = Number(num||0);
    if(isNaN(n) || !n) return '$0';
    return '$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  function formatDate(isoStr){
    const d = isoStr ? new Date(isoStr) : new Date();
    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
  }

  function getOpportunityIndex(valorTpl, valorComunal) {
    if(!valorTpl || !valorComunal) return { label: 'Valor de mercado', color: '#64748b' };
    const diff = ((valorComunal - valorTpl) / valorComunal) * 100;
    
    if(diff > 15) return { label: 'Muy buena oportunidad', color: '#198754' };
    if(diff > 5) return { label: 'Buena oportunidad', color: '#0c5da5' };
    if(diff > -5) return { label: 'Valor de mercado', color: '#64748b' };
    return { label: 'Sobre mercado comunal', color: '#a94b29' };
  }

  function createHeader(leadRef, pageNum, totalPages){
    return `
      <div class="tpl-dossier-header">
        <div class="tpl-dossier-header-brand">
          <strong>TU PARCELA LISTA</strong>
          <small>DOSSIER EJECUTIVO DE VALORACIÓN TÉCNICA</small>
        </div>
        <div class="tpl-dossier-header-meta">
          <span>REFERENCIA: <strong>${leadRef}</strong></span>
          <span>PÁGINA ${pageNum} DE ${totalPages}</span>
        </div>
      </div>
    `;
  }

  function createFooter(leadRef){
    return `
      <div class="tpl-dossier-footer">
        <p>Documento técnico emitido por el motor de tasación V2.4 de Tu Parcela Lista (Referencia ${leadRef})</p>
        <small>Este documento constituye una valoración estimativa comercial para la toma de decisiones y no reemplaza un peritaje judicial o tasación hipotecaria bancaria.</small>
      </div>
    `;
  }

  function renderPage1(valData, leadData, formValues){
    const comuna = valData?.location || formValues?.comuna || 'Ubicación no especificada';
    const dateStr = formatDate(leadData?.createdAt);

    return `
      <div class="tpl-v3-dossier-page">
        <div class="tpl-dossier-cover">
          <img class="tpl-dossier-cover__img" src="../../assets/hero-familia-casa-campo-premium.webp" alt="Cover">
          <div class="tpl-dossier-cover__content">
            <div class="tpl-dossier-cover__logo">TU PARCELA LISTA</div>
            <div class="tpl-dossier-cover__titles">
              <h1>Dossier Ejecutivo<br>de Valoración Comercial</h1>
              <p>Análisis técnico territorial y recomendación de precio</p>
            </div>
            <div class="tpl-dossier-cover__meta">
              <div>
                <span>UBICACIÓN</span>
                <strong>${comuna}</strong>
              </div>
              <div>
                <span>EMITIDO EL</span>
                <strong>${dateStr}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderPage2(valData, leadData, formValues){
    const leadRef = leadData?.leadRef || 'TPL-INFO-' + Math.floor(1000 + Math.random()*9000);
    const area = Number(valData?.area || formValues?.superficie || 5000);
    const idealPrice = valData?.valorFinal ?? 0;
    const quickPrice = valData?.valorPorApuro ?? 0;
    const patientPrice = valData?.valorPromedioReferencia ?? 0;
    const comunalPrice = valData?.comunalBase ?? patientPrice;
    
    const opp = getOpportunityIndex(idealPrice, comunalPrice);

    return `
      <div class="tpl-v3-dossier-page">
        ${createHeader(leadRef, 2, 3)}
        
        <div class="tpl-dossier-body">
          <h2 class="tpl-dossier-title">Resumen Ejecutivo</h2>
          
          <div class="tpl-dossier-value-hero">
            <div class="tpl-dossier-value-hero__main">
              <h3>VALOR TPL TASADOR TÉCNICO</h3>
              <div class="val">${formatMoney(idealPrice)}</div>
              <p>Valoración calculada utilizando el motor TPL V2.4, ponderando atributos del terreno, inteligencia de conectividad (CONIT) y el mercado comunal actual.</p>
            </div>
            <div class="tpl-dossier-opp-index">
              <span>ÍNDICE DE OPORTUNIDAD</span>
              <strong style="color: ${opp.color}">${opp.label}</strong>
            </div>
          </div>

          <div class="tpl-dossier-section">
            <h4 class="tpl-dossier-section-title">REFERENCIAS DE MERCADO</h4>
            <div class="tpl-dossier-grid-3">
              <div class="tpl-dossier-metric-card">
                <small>VALOR COMUNAL BASE</small>
                <strong>${formatMoney(comunalPrice)}</strong>
              </div>
              <div class="tpl-dossier-metric-card">
                <small>VALOR PROMEDIO (REFERENCIA)</small>
                <strong>${formatMoney(patientPrice)}</strong>
              </div>
              <div class="tpl-dossier-metric-card">
                <small>VALOR POR APURO (LIQUIDEZ)</small>
                <strong>${formatMoney(quickPrice)}</strong>
              </div>
            </div>
          </div>

          <div class="tpl-dossier-section">
            <h4 class="tpl-dossier-section-title">INTELIGENCIA TERRITORIAL (CONIT)</h4>
            <table class="tpl-dossier-table">
              <tbody>
                <tr>
                  <td>Ciudad Principal / Cabecera</td>
                  <td>${valData?.conit?.ciudadPrincipal || 'No informada'}</td>
                </tr>
                <tr>
                  <td>Tiempos y Distancias</td>
                  <td>${valData?.conit?.tiempos || 'No especificado'}</td>
                </tr>
                <tr>
                  <td>Servicios e Infraestructura</td>
                  <td>${valData?.conit?.servicios || 'Evaluación estándar'}</td>
                </tr>
                <tr>
                  <td>Nivel de Conectividad</td>
                  <td><strong>${valData?.conit?.indice || 'N/A'} / 100</strong></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="tpl-dossier-section" style="margin-bottom: 0;">
            <h4 class="tpl-dossier-section-title">ANÁLISIS DEL TERRENO</h4>
            <table class="tpl-dossier-table">
              <tbody>
                <tr>
                  <td>Superficie Total</td>
                  <td>${area.toLocaleString('es-CL')} m²</td>
                </tr>
                <tr>
                  <td>Topografía</td>
                  <td>${formValues?.topografia || 'No informada'}</td>
                </tr>
                <tr>
                  <td>Acceso y Camino</td>
                  <td>${formValues?.acceso || 'No informado'}</td>
                </tr>
                <tr>
                  <td>Factibilidad de Agua</td>
                  <td>${formValues?.agua || 'No informada'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        ${createFooter(leadRef)}
      </div>
    `;
  }

  function renderPage3(valData, leadData, formValues){
    const leadRef = leadData?.leadRef || 'TPL-INFO-' + Math.floor(1000 + Math.random()*9000);
    const idealPrice = valData?.valorFinal ?? 0;
    const quickPrice = valData?.valorPorApuro ?? 0;
    
    const hasGoodWater = formValues?.agua?.toLowerCase().includes('pozo') || formValues?.agua?.toLowerCase().includes('apr');
    const hasGoodRoad = formValues?.acceso?.toLowerCase().includes('buen estado') || formValues?.acceso?.toLowerCase().includes('pavimentado');
    const isFlat = formValues?.topografia?.toLowerCase().includes('plana');
    const conitScore = parseInt(valData?.conit?.indice || '0', 10);

    const strengths = [];
    if(hasGoodWater) strengths.push('Alta factibilidad hídrica reportada');
    if(hasGoodRoad) strengths.push('Condiciones de acceso favorables');
    if(isFlat) strengths.push('Topografía plana que optimiza el aprovechamiento constructivo');
    if(conitScore >= 70) strengths.push('Excelente conectividad e índice CONIT superior a la media');

    const limitations = [];
    if(!hasGoodWater) limitations.push('Condición hídrica restrictiva reportada');
    if(!hasGoodRoad) limitations.push('Accesos pueden presentar dificultades según temporada');
    if(!isFlat) limitations.push('Topografía desafiante que requiere inversión extra en movimientos de tierra');
    if(conitScore < 50) limitations.push('Lejanía relativa a cabeceras urbanas y servicios críticos');

    if(strengths.length === 0) strengths.push('Atributos estándar del mercado comunal');
    if(limitations.length === 0) limitations.push('Sin limitaciones aparentes reportadas');

    return `
      <div class="tpl-v3-dossier-page">
        ${createHeader(leadRef, 3, 3)}
        
        <div class="tpl-dossier-body">
          <h2 class="tpl-dossier-title">Conclusión Ejecutiva</h2>
          
          <div class="tpl-dossier-section">
            <h4 class="tpl-dossier-section-title">FORTALEZAS DE LA PROPIEDAD</h4>
            <ul class="tpl-dossier-list">
              ${strengths.map(s => `<li>${s}</li>`).join('')}
            </ul>
          </div>

          <div class="tpl-dossier-section">
            <h4 class="tpl-dossier-section-title">RIESGOS Y LIMITACIONES</h4>
            <ul class="tpl-dossier-list">
              ${limitations.map(l => `<li>${l}</li>`).join('')}
            </ul>
          </div>

          <div class="tpl-dossier-section">
            <h4 class="tpl-dossier-section-title">RANGO DE PUBLICACIÓN RECOMENDADO</h4>
            <p style="font-size: 1.05rem; line-height: 1.6; color: #334155;">Para una estrategia de comercialización óptima, se sugiere publicar la propiedad entre <strong>${formatMoney(quickPrice)}</strong> (piso de negociación) y <strong>${formatMoney(idealPrice)}</strong> (valor técnico esperado).</p>
          </div>

          <div class="tpl-dossier-value-hero" style="background: #eef2f6; border-color: #cbd5e1; margin-top: 60px;">
            <div class="tpl-dossier-value-hero__main">
              <h3>RECOMENDACIÓN FINAL DEL TASADOR</h3>
              <p style="font-size: 1.1rem; color: #0f172a; max-width: 100%;">De acuerdo con el algoritmo TPL V2.4, la propiedad presenta condiciones suficientes para competir en el mercado actual. Si el objetivo es liquidez a corto plazo, el piso de ${formatMoney(quickPrice)} debería atraer ofertas inmediatas; de lo contrario, el precio técnico TPL de ${formatMoney(idealPrice)} es defendible ante un comprador que valore los atributos territoriales y el nivel CONIT informado.</p>
            </div>
          </div>
        </div>

        ${createFooter(leadRef)}
      </div>
    `;
  }

  function openReport(valData, leadData, formValues){
    let container = document.getElementById('tplReportPrintContainer');
    if(!container){
      container = document.createElement('div');
      container.id = 'tplReportPrintContainer';
      document.body.appendChild(container);
    }

    const html = `
      <div class="tpl-report-topbar">
        <div class="tpl-report-topbar-brand">
          <strong style="color: #0f172a; font-size: 1.15rem;">Dossier Ejecutivo TPL Business</strong>
          <small style="color: #64748b; display: block; margin-top: 4px;">Referencia ${leadData?.leadRef || 'TPL'} · Listo para guardar en PDF</small>
        </div>
        <div style="display: flex; gap: 12px;">
          <button type="button" class="btn ghost tpl-btn-close-report" onclick="window.TPLReportGenerator.closeReport()" style="padding: 10px 16px; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; cursor: pointer; font-weight: 600;">Cerrar</button>
          <button type="button" class="btn primary tpl-btn-print-report" onclick="window.print()" style="padding: 10px 16px; border: none; border-radius: 8px; background: #073b6f; color: #fff; cursor: pointer; font-weight: 600;">Imprimir Dossier PDF</button>
        </div>
      </div>
      <div class="tpl-report-pages-wrap">
        ${renderPage1(valData, leadData, formValues)}
        ${renderPage2(valData, leadData, formValues)}
        ${renderPage3(valData, leadData, formValues)}
      </div>
    `;

    container.innerHTML = html;
    container.hidden = false;
    document.body.classList.add('tpl-report-open');

    if(window.TPLValuationCRM?.event && valData?.sessionId){
      window.TPLValuationCRM.event(valData.sessionId, 'dossier_pdf_visualizado', { leadRef: leadData?.leadRef });
    }
  }

  function closeReport(){
    const container = document.getElementById('tplReportPrintContainer');
    if(container) container.hidden = true;
    document.body.classList.remove('tpl-report-open');
  }

  window.TPLReportGenerator = {
    openReport,
    closeReport,
    renderPage1,
    renderPage2,
    renderPage3
  };
})();
