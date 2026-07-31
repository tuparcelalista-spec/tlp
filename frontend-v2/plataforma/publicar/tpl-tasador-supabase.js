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
async function register(input,result,ctx){
 const payload=enrich(input,result,ctx);
 if(!global.TPLDataService?.registerValuation)return {...payload,registration:null};
 try{
  const registration=await global.TPLDataService.registerValuation(payload.input,payload.result);
  return {...payload,registration};
 }catch(error){
  console.warn('TPL Tasador: la tasación se calculó, pero no se pudo registrar en Supabase.',error);
  return {...payload,registration:null,registrationError:error};
 }
}
global.TPLTasadorSupabase=Object.freeze({loadContext,enrich,register});
})(window);
