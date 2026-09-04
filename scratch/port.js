
const fs = require('fs');
let apiCode = fs.readFileSync('api/tasador.js', 'utf8');

let engineCore = apiCode.substring(apiCode.indexOf('const ENGINE_VERSION'), apiCode.lastIndexOf('try {'));

let newEngine = \/**
 * TPL Land Valuation Engine V2.2 (Unified from API)
 */
(function(global) {

\ + engineCore + \

  function calculateFrontend(p) {
      const input = {
          ...p,
          area: p.superficie_m2 || p.tamano || 5000,
          distanceKm: p.distanciaConcepcion ? parseInt(String(p.distanciaConcepcion).replace(/\\\D/g, '')) : 0,
          communeDistanceKm: p.distanciaComuna ? parseInt(String(p.distanciaComuna).replace(/\\\D/g, '')) : 0,
          electricity: p.luz,
          water: p.agua,
          fencing: p.cierres,
          condominium: p.condominio,
          topography: p.topografia,
          nature: [p.naturaleza, p.descripcion],
          tourism: p.localidad && ['pucon','villarrica','caburgua'].includes(String(p.localidad).toLowerCase()) ? 'nacional' : (['pucon','villarrica','caburgua'].includes(String(p.comuna).toLowerCase()) ? 'nacional' : p.turismo),
      };
      
      const result = calculate(input);
      
      if (!result.error) {
          result.valorRecomendado = result.valor_recomendado;
          result.valorComunalBase = result.valor_comunal;
          result.valorMarginal = result.base;
          result.baseDepreciada = result.territorialBase;
          result.ajustesPorcentajeTotal = result.totalPct;
          result.ajustesDesglose = []; 
      }
      return result;
  }

  global.TPLLandEngine = {
    calculate: calculateFrontend,
    MARKET_REFERENCES,
    calculateRaw: calculate
  };

})(typeof window !== 'undefined' ? window : global);
\;

fs.writeFileSync('frontend-v2/js/core/valuation-engine.js', newEngine);
console.log('Ported!');

