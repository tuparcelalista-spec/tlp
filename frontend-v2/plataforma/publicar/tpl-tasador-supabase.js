(function(global){
'use strict';
let contextPromise=null;
function num(v){const n=Number(v);return Number.isFinite(n)?n:0}
async function loadContext(force=false){
 if(force)contextPromise=null;
 if(!contextPromise)contextPromise=(async()=>{
  if(!global.TPLDataService?.getTasadorContext)return {uf:null,references:[]};
  const ctx=await global.TPLDataService.getTasadorContext();
  const ufClp=num(ctx?.uf?.valor_clp);
  if(global.TPLLandEngine?.setMarketReferences)global.TPLLandEngine.setMarketReferences(ctx?.references||[],{ufClp});
  return ctx||{uf:null,references:[]};
 })().catch(error=>{contextPromise=null;console.warn('TPL Tasador: contexto Supabase no disponible.',error);return {uf:null,references:[]}});
 return contextPromise;
}
function enrich(input,result,ctx){
 const ufClp=num(ctx?.uf?.valor_clp);
 const recommended=num(result?.recommended ?? result?.ideal ?? result?.market);
 const agile=num(result?.agile ?? result?.quick);
 const potential=num(result?.technicalPotential ?? result?.patient);
 const immediate=num(result?.immediateReference);
 const enrichedInput={...input,ufClpUsed:ufClp||null,ufDateUsed:ctx?.uf?.fecha_valor||null,ufSource:ctx?.uf?.fuente||null};
 const enrichedResult={...result,ufClpUsed:ufClp||null,recommendedUf:ufClp>0?Number((recommended/ufClp).toFixed(4)):null,agileUf:ufClp>0?Number((agile/ufClp).toFixed(4)):null,potentialUf:ufClp>0?Number((potential/ufClp).toFixed(4)):null,immediateUf:ufClp>0&&immediate>0?Number((immediate/ufClp).toFixed(4)):null};
 return {input:enrichedInput,result:enrichedResult};
}
function listRecommendations(input,result){
 const out=[];const add=(title,detail,priority='media')=>out.push({title,detail,priority,source:'calculado_tpl'});
 if(!input.water||/no|sin|pendiente/i.test(String(input.water)))add('Confirmar solución de agua','Validar pozo, puntera, APR o factibilidad antes de definir el proyecto.','alta');
 if(!input.electricity||/no|sin|pendiente/i.test(String(input.electricity)))add('Confirmar energía','Revisar empalme, distancia a postación o alternativa solar.','alta');
 if(!input.rol)add('Revisar documentación','Confirmar Rol, deslindes y antecedentes antes de una operación.','alta');
 if(Number(input.area||0)>=5000)add('Planificar por etapas','La superficie permite reservar áreas para vivienda, quincho, huerta o una futura cabaña.');
 if(result?.priceAnalysis?.classification)add('Revisar estrategia de precio',String(result.priceAnalysis.classification));
 return out.slice(0,8);
}
function canonical(input,result,registration){
 const nearby=result?.nearbyContext||result?.landResult?.nearbyContext||input?.nearbyContext||{};
 const nearest=(key)=>nearby?.[key]?.nearest||null;
 const rec=listRecommendations(input,result);
 const territorial=result?.territorialIndex||result?.landResult?.territorialIndex||input?.territorialIndex||null;
 const property=result?.propertyIndex||result?.landResult?.propertyIndex||input?.propertyIndex||null;
 const location={region:input.region||'',comuna:input.comuna||'',lat:Number(input.lat)||null,lng:Number(input.lng)||null,metodo:(Number(input.lat)&&Number(input.lng))?'coordenadas':'comuna',precision:(Number(input.lat)&&Number(input.lng))?'punto_confirmado':'referencia_comunal',google_maps_url:(Number(input.lat)&&Number(input.lng))?`https://www.google.com/maps?q=${input.lat},${input.lng}`:null};
 const distances={centro_comuna_km:input.communeDistanceKm??null,ciudad_principal_km:input.majorCityDistanceKm??input.distanceKm??null,salud:nearest('healthServices'),educacion:nearest('education'),comercio:nearest('commerce'),seguridad:nearest('security'),atractivo:nearest('attractions')};
 const infrastructure={agua:input.water||null,electricidad:input.electricity||null,distancia_postacion_m:input.electricityPoleDistanceM??null,rol:input.rol||null,cierre:input.fencing||null,porton:input.gate||null,condominio:input.condominium||null};
 const access={tipo:input.access||null,distancia_ruta_km:input.routeDistanceKm??null,topografia:input.topography||null,suelo:input.soil||null,exposicion:input.exposure||null};
 const environment={vista:input.view||null,vegetacion:input.vegetation||null,naturaleza:input.nature||[],turismo:input.tourism||input.tourismLevel||null};
 const publicSummary={headline:territorial?`${territorial.label} para desarrollar un proyecto de campo`:'Ubicación analizada por TPL',potenciales:[Number(input.area||0)>=5000?'Vivienda y expansión futura':null,input.tourism?'Turismo o segunda vivienda':null,input.water?'Proyecto productivo sujeto a validación':null].filter(Boolean),pendientes:rec.filter(x=>x.priority==='alta').map(x=>x.title),confidence:'Información declarada y cálculos TPL; validar antecedentes técnicos y legales.'};
 const projectAnalysis={headline:'Cómo influye el terreno en tu proyecto',next_steps:rec,layout_hints:[input.exposure?`Considerar exposición ${input.exposure} al ubicar la vivienda.`:null,input.topography?`Adaptar fundaciones y accesos a topografía ${input.topography}.`:null,Number(input.area||0)>=5000?'Reservar espacio para quincho, huerta o una futura unidad de arriendo.':null].filter(Boolean)};
 return {origen:input.origen||input.source||'tasador_publico',propiedad_id:input.propiedadId||input.propiedad_id||registration?.propiedad_id||null,propiedad_codigo:input.propiedadCodigo||input.propiedad_codigo||input.codigo||null,tasacion_id:registration?.tasacion_id||null,proyecto_id:input.proyectoId||input.proyecto_id||null,nivel_confianza:(Number(input.lat)&&Number(input.lng))?'preciso':'orientativo',ubicacion:location,geometria:{superficie_declarada_m2:Number(input.area||input.superficie||0)||null,perimetro_m:input.perimeterM||null,poligono:input.polygon||null},accesibilidad:access,entorno:environment,infraestructura:infrastructure,distancias:distances,riesgos:{estado:'pendiente_fuentes_oficiales',items:[]},clima:{estado:'pendiente_fuentes_oficiales'},indices_tpl:{territorial,propiedad:property,precio:result?.priceAnalysis||result?.landResult?.priceAnalysis||null},recomendaciones:rec,resumen_publico:publicSummary,analisis_proyecto:projectAnalysis,informe_premium:{valor_recomendado:result?.recommended??result?.ideal??result?.market??null,venta_agil:result?.agile??result?.quick??null,mercado_potencial:result?.technicalPotential??result?.patient??null,referencia_comunal:result?.marketReference||result?.landResult?.marketReference||null,secciones:['ubicacion','accesibilidad','entorno','infraestructura','distancias','indices_tpl','recomendaciones']},entrada:input,resultado:result,version_motor:result?.engineVersion||result?.method||'tpl-land-engine-v2',metadata:{generated_at:new Date().toISOString()}};
}
async function register(input,result,ctx,options={}){
 const payload=enrich(input,result,ctx);let registration=null,analysis=null;
 try{if(global.TPLDataService?.registerValuation)registration=await global.TPLDataService.registerValuation(payload.input,payload.result)}catch(error){if(options.strict)throw error;console.warn('TPL Tasador: registro de tasación pendiente.',error)}
 try{if(global.TPLDataService?.registerTerritorialAnalysis)analysis=await global.TPLDataService.registerTerritorialAnalysis(canonical(payload.input,payload.result,registration))}catch(error){console.warn('TPL Tasador: análisis territorial pendiente.',error)}
 return {...payload,registration,analysis};
}
async function loadObservedComparables(input){ try{return await global.TPLDataService?.getObservedComparables?.(input)}catch(error){console.warn('TPL Tasador: comparables observados no disponibles.',error);return {ok:true,cantidad:0,confianza:'insuficiente',peso_sugerido:0}} }
global.TPLTasadorSupabase=Object.freeze({loadContext,loadObservedComparables,enrich,canonical,register});
})(window);
