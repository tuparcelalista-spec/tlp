(function(window){'use strict';
  const getClient=()=>window.TPLBusinessAuth.getClient();
  async function rpc(name,params){const {data,error}=await getClient().rpc(name,params||{});if(error)throw error;return data;}
  async function getPortal(){return rpc('tpl_portal_resumen_v1');}
  async function markNotification(id){return rpc('tpl_agenda_marcar_notificacion_v1',{p_notificacion_id:id});}
  async function getExecution(){return rpc('tpl_ejecucion_resumen_v1');}
  async function saveMilestones(orderId,milestones){return rpc('tpl_partner_guardar_hitos_v1',{p_orden_id:orderId,p_hitos:milestones});}
  async function submitProgress(orderId,payload){return rpc('tpl_partner_registrar_avance_v1',{p_orden_id:orderId,p_payload:payload});}
  async function reviewProgress(progressId,decision,comment){return rpc('tpl_cliente_revisar_avance_v1',{p_avance_id:progressId,p_decision:decision,p_comentario:comment||null});}
  async function reportPayment(paymentId,payload){return rpc('tpl_cliente_informar_pago_v1',{p_pago_id:paymentId,p_medio_pago:payload.medio_pago,p_referencia:payload.referencia||null,p_comprobante_storage_path:payload.comprobante_storage_path||null});}
  async function reviewPayment(paymentId,decision,comment){return rpc('tpl_partner_revisar_pago_v1',{p_pago_id:paymentId,p_decision:decision,p_comentario:comment||null});}
  async function getFinancialSummary(orderId){return rpc('tpl_resumen_financiero_orden_v1',{p_orden_id:orderId});}
  window.TPLBusinessService=Object.freeze({getPortal,getAgenda:getPortal,markNotification,getExecution,saveMilestones,submitProgress,reviewProgress,reportPayment,reviewPayment,getFinancialSummary});
})(window);
