const fs = require('fs');
let html = fs.readFileSync('frontend-v2/plataforma/crm-tpl-v1/index.html', 'utf8');
if (!html.includes('valuation-engine.js')) {
    html = html.replace('<!-- App Core -->', '<!-- App Core -->\n    <script src="../../js/core/valuation-engine.js"></script>');
    fs.writeFileSync('frontend-v2/plataforma/crm-tpl-v1/index.html', html);
    console.log('Added valuation-engine.js');
}

let js = fs.readFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/parcelas/editor-integral.js', 'utf8');
const injectCode = `
      // Recalcular tasacion si el motor esta disponible
      if (window.TPLLandEngine) {
          try {
              const calcData = { ...record, ...payload, metadata: oldMeta };
              const vData = window.TPLLandEngine.calculate(calcData);
              if (vData && vData.valorRecomendado > 0) {
                  oldMeta.tasacion_resultado_resumen = oldMeta.tasacion_resultado_resumen || {};
                  oldMeta.tasacion_resultado_resumen.valor_tpl_tasador = vData.valorRecomendado;
                  oldMeta.tasacion_resultado_resumen.valor_recomendado = vData.valorRecomendado;
                  oldMeta.valor_tpl_tasador = vData.valorRecomendado;
                  oldMeta.valor_tpl_total = vData.valorRecomendado;
                  console.log('CRM Tasacion recalc:', vData.valorRecomendado);
              }
          } catch(e) {
              console.warn('Error recalculando tasacion en CRM', e);
          }
      }
      payload.metadata = oldMeta;
`;

if (!js.includes('window.TPLLandEngine.calculate')) {
    js = js.replace('payload.metadata = oldMeta;', injectCode);
    fs.writeFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/parcelas/editor-integral.js', js);
    console.log('Injected calculation logic');
}
