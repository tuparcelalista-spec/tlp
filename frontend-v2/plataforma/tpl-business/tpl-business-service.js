(function(window){'use strict';
  const getClient=()=>window.TPLBusinessAuth.getClient();
  async function rpc(name,params){const {data,error}=await getClient().rpc(name,params||{});if(error)throw error;return data;}
  async function getPortal(){return rpc('tpl_portal_resumen_v1');}
  async function markNotification(id){return rpc('tpl_agenda_marcar_notificacion_v1',{p_notificacion_id:id});}
  window.TPLBusinessService=Object.freeze({getPortal,getAgenda:getPortal,markNotification});
})(window);
