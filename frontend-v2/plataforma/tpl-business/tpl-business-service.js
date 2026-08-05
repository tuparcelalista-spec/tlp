(function(window){'use strict';
  const getClient=()=>window.TPLBusinessAuth.getClient();
  const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const ALLOWED_RPC=new Set([
    'tpl_portal_resumen_v1','tpl_agenda_marcar_notificacion_v1','tpl_ejecucion_resumen_v1',
    'tpl_partner_guardar_hitos_v1','tpl_partner_registrar_avance_v1','tpl_cliente_revisar_avance_v1',
    'tpl_cliente_informar_pago_v1','tpl_partner_revisar_pago_v1','tpl_resumen_financiero_orden_v1',
    'tpl_partner_oportunidades_v1','tpl_partner_manifestar_interes_v1'
  ]);
  const requireUuid=(value,label)=>{const v=String(value||'').trim();if(!UUID_RE.test(v))throw new Error(`${label||'Identificador'} inválido.`);return v;};
  const cleanText=(value,max=1000)=>String(value||'').trim().slice(0,max);
  async function rpc(name,params){
    if(!ALLOWED_RPC.has(name))throw new Error('Operación no autorizada.');
    await window.TPLBusinessAuth.enforceActiveSession();
    const {data,error}=await getClient().rpc(name,params||{});
    if(error)throw error;return data;
  }
  async function getPortal(){return rpc('tpl_portal_resumen_v1');}
  async function markNotification(id){return rpc('tpl_agenda_marcar_notificacion_v1',{p_notificacion_id:requireUuid(id,'Notificación')});}
  async function getExecution(){return rpc('tpl_ejecucion_resumen_v1');}
  async function saveMilestones(orderId,milestones){
    if(!Array.isArray(milestones)||milestones.length>50)throw new Error('La lista de hitos no es válida.');
    return rpc('tpl_partner_guardar_hitos_v1',{p_orden_id:requireUuid(orderId,'Orden'),p_hitos:milestones});
  }
  async function submitProgress(orderId,payload){
    const safe=payload&&typeof payload==='object'?payload:{};
    if(JSON.stringify(safe).length>50000)throw new Error('El avance supera el tamaño permitido.');
    return rpc('tpl_partner_registrar_avance_v1',{p_orden_id:requireUuid(orderId,'Orden'),p_payload:safe});
  }
  async function reviewProgress(progressId,decision,comment){
    const d=cleanText(decision,30).toLowerCase();if(!['aprobado','rechazado','observado','aprobar','rechazar'].includes(d))throw new Error('Decisión inválida.');
    return rpc('tpl_cliente_revisar_avance_v1',{p_avance_id:requireUuid(progressId,'Avance'),p_decision:d,p_comentario:cleanText(comment,2000)||null});
  }
  async function reportPayment(paymentId,payload){
    const p=payload&&typeof payload==='object'?payload:{};
    return rpc('tpl_cliente_informar_pago_v1',{p_pago_id:requireUuid(paymentId,'Pago'),p_medio_pago:cleanText(p.medio_pago,80),p_referencia:cleanText(p.referencia,200)||null,p_comprobante_storage_path:cleanText(p.comprobante_storage_path,500)||null});
  }
  async function reviewPayment(paymentId,decision,comment){
    const d=cleanText(decision,30).toLowerCase();if(!['confirmado','rechazado','aprobar','rechazar'].includes(d))throw new Error('Decisión inválida.');
    return rpc('tpl_partner_revisar_pago_v1',{p_pago_id:requireUuid(paymentId,'Pago'),p_decision:d,p_comentario:cleanText(comment,2000)||null});
  }
  async function getFinancialSummary(orderId){return rpc('tpl_resumen_financiero_orden_v1',{p_orden_id:requireUuid(orderId,'Orden')});}
  async function getPartnerOpportunities(){return rpc('tpl_partner_oportunidades_v1');}
  async function expressPartnerInterest(matchId,message){return rpc('tpl_partner_manifestar_interes_v1',{p_match_id:requireUuid(matchId,'Oportunidad'),p_mensaje:cleanText(message,1500)||null});}
  window.TPLBusinessService=Object.freeze({getPortal,getAgenda:getPortal,markNotification,getExecution,saveMilestones,submitProgress,reviewProgress,reportPayment,reviewPayment,getFinancialSummary,getPartnerOpportunities,expressPartnerInterest});
})(window);
