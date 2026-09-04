const fs = require('fs');
const path = 'd:/BIOTV MARKETING/NUEVO BIOTV/PÁGINAS WEB/TPL PAGINA MALA/TPL PRUEBA NUEVA/frontend-v2/js/core/valuation-engine.js';

let content = fs.readFileSync(path, 'utf8');

const targetStr = '  function calculate(parcela) {';
const replacementStr = `  function calculate(parcela) {
      if (parcela.valor_tpl_recomendado || parcela.valor_tpl_tasador) {
          let vFinal = parcela.valor_tpl_recomendado || parcela.valor_tpl_tasador;
          let vBase = parcela.valor_comunal || (vFinal * 1.2);
          return {
              valorRecomendado: vFinal,
              valor_recomendado: vFinal,
              valorComunalBase: vBase,
              valorMarginal: vBase,
              baseDepreciada: vFinal,
              ajustesPorcentajeTotal: 0,
              ajustesDesglose: [{ nombre: "Tasación Oficial TPL", valor: "Guardada" }],
              puntaje: 85
          };
      }`;

if (content.indexOf(targetStr) !== -1) {
    fs.writeFileSync(path, content.replace(targetStr, replacementStr), 'utf8');
    console.log('Valuation engine patch successful');
} else {
    console.log('Could not find function calculate(parcela) {');
}
