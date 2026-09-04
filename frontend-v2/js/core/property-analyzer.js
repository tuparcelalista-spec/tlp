export function analyzeProperty(parcel, canonicalValuation, marketAnalysisData) {
  const normalize = (v) => String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const priceNumber = (v) => Number(String(v || "").replace(/[^0-9]/g, "")) || 0;
  const positive = (v) => ["si","sí","true","1","disponible","incluido","con"].some(x => normalize(v) === normalize(x));

  function tags() {
    const out=[];
    if(positive(parcel.facilidad)||positive(parcel.facilidad_pago)) out.push("Facilidad de pago");
    if(positive(parcel.naturaleza)) out.push("Entorno natural");
    if(positive(parcel.servicios)||positive(parcel.servicios_cerca)) out.push("Servicios cerca");
    if(positive(parcel.agua)) out.push("Agua informada");
    if(positive(parcel.luz)||positive(parcel.electricidad)) out.push("Electricidad");
    if(positive(parcel.rol)) out.push("Rol propio");
    return out;
  }

  function diagnosis() {
    const included=[], pending=[];
    if(positive(parcel.rol)) included.push("Rol propio informado"); else pending.push("Confirmar situación de rol y documentación");
    if(positive(parcel.luz)||positive(parcel.electricidad)) included.push("Electricidad o factibilidad informada"); else pending.push("Confirmar solución eléctrica o paneles solares");
    if(positive(parcel.agua)) included.push("Disponibilidad de agua informada"); else pending.push("Definir puntera, pozo u otra solución de agua");
    const text=normalize([parcel.descripcion,parcel.detalle].join(" "));
    if(/cercad|cerco|cierre perimetral/.test(text)) included.push("Cerco o cierre informado"); else pending.push("Evaluar cerco perimetral");
    if(/porton|portón/.test(text)) included.push("Portón informado"); else pending.push("Evaluar portón de acceso");
    if(/fosa|alcantarillado/.test(text)) included.push("Solución sanitaria informada"); else pending.push("Definir fosa o solución sanitaria");
    if(/acceso|camino/.test(text)) included.push("Acceso o camino mencionado"); else pending.push("Confirmar estado del acceso");
    return {included,pending};
  }

  function opportunityBand(score) {
    if(score>=85) return {key:'excellent',label:'Excelente valoración',seal:'Sello TPL Verde'};
    if(score>=70) return {key:'very-good',label:'Muy buena valoración',seal:'Sello TPL'};
    if(score>=50) return {key:'balanced',label:'Valoración TPL',seal:'Evaluación equilibrada'};
    if(score>=30) return {key:'review',label:'Con oportunidades de mejora',seal:'Revisión recomendada'};
    return {key:'critical',label:'Requiere atención',seal:'Condición crítica'};
  }

  function factorScore(value, fallback=45) {
    if(positive(value)) return 100;
    const v=normalize(value);
    if(/factibilidad|cercan|disponib|proyectad|posib/.test(v)) return 70;
    if(/no|sin|pendiente|desconoc/.test(v)) return 25;
    return fallback;
  }

  function buildOpportunity() {
    const a=marketAnalysisData||{};
    const saved=canonicalValuation||{};
    const result=saved.resultado||{};
    const published=Number(saved.precio_publicado||parcel.precioNumero||priceNumber(parcel.precio)||0);
    // Única fuente oficial: última tasación persistida en tpl_tasaciones o valores de parcelas.js
    const suggested=Number(saved.valor_tpl_tasador||saved.valor_tpl_total||result.valor_tpl_total||result.valor_recomendado||result.recommended||result.ideal||a.suggestedCommunalValue||a.technicalValue||0);
    const technical=Number(saved.valor_tpl_tasador_ajustado||saved.valor_tpl_tasador||result.valor_tpl_tasador_ajustado||result.valor_tpl_tasador||result.valorTplTasadorAjustado||result.valorTplTasador||a.technicalValue||suggested);
    const observed=Number(saved.valor_comunal||result.valor_comunal||result.valorComunal||result.referencia_comunal_total||a.observedCommunalValue||0);
    const area = Number(parcel.superficie || parcel.tamano || parcel.superficie_m2 || 0);
    const averageFallback = Math.round((technical + observed + (1680 * area)) / 3);
    const average=Number(saved.valor_venta_apuro||result.valor_venta_apuro||result.valorVentaApuro||result.quick||result.agile||a.urgencyValue||averageFallback);
    const urgency=average;

    let priceScore=60;
    if(published&&suggested){
      const ratio=published/suggested;
      if(ratio<=.80) priceScore=100;
      else if(ratio<=.90) priceScore=92;
      else if(ratio<=.97) priceScore=84;
      else if(ratio<=1.05) priceScore=74;
      else if(ratio<=1.15) priceScore=58;
      else if(ratio<=1.30) priceScore=40;
      else priceScore=22;
    }
    const accessText=normalize([parcel.acceso,parcel.tipoAcceso,parcel.camino,parcel.descripcion].join(' '));
    const access=/paviment|asfalt/.test(accessText)?100:/ripio|estabiliz|buen acceso|camino publico/.test(accessText)?82:/servidumbre|camino interior/.test(accessText)?62:45;
    const topo=normalize(parcel.topografia||parcel.pendiente||'');
    const topography=/plana|regular|suave/.test(topo)?92:/mixta|ondulad/.test(topo)?72:/pendiente|quebrad/.test(topo)?48:58;
    const natureText=normalize([parcel.vista,parcel.vegetacion,parcel.entorno,parcel.descripcion].join(' '));
    const nature=/rio|lago|bosque nativo|vista|volcan|estero|naturaleza/.test(natureText)?90:/rural|campo|vegetacion/.test(natureText)?72:55;
    const signals=Array.isArray(a.signals)?a.signals.length:0;
    const investment=Math.min(95,55+(signals*7)+(a?.tone==='opportunity'?18:a?.tone==='good'?10:0));

    const factors=[
      {key:'price',label:'Precio frente a referencia',score:priceScore,weight:40},
      {key:'access',label:'Acceso',score:access,weight:10},
      {key:'water',label:'Agua',score:factorScore(parcel.agua),weight:8},
      {key:'power',label:'Electricidad',score:factorScore(parcel.luz||parcel.electricidad),weight:8},
      {key:'role',label:'Documentación y rol',score:factorScore(parcel.rol),weight:8},
      {key:'topography',label:'Topografía para construir',score:topography,weight:8},
      {key:'nature',label:'Entorno y calidad de vida',score:nature,weight:8},
      {key:'investment',label:'Potencial de inversión',score:investment,weight:10}
    ];
    const score=Math.max(0,Math.min(100,Math.round(factors.reduce((sum,f)=>sum+(f.score*f.weight/100),0))));
    return {score,band:opportunityBand(score),factors,published,observed,average,technical,suggested,a};
  }

  return {
    tags: tags(),
    diagnosis: diagnosis(),
    opportunity: buildOpportunity()
  };
}
