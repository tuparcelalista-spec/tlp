(function(window){'use strict';
  const getClient=()=>window.TPLBusinessAuth.getClient();
  async function rpc(name,params){const {data,error}=await getClient().rpc(name,params||{});if(error)throw error;return data;}
  async function getAgenda(){return rpc('tpl_agenda_propietario_resumen_v1');}
  async function markNotification(id){return rpc('tpl_agenda_marcar_notificacion_v1',{p_notificacion_id:id});}
  window.TPLBusinessService=Object.freeze({getAgenda,markNotification});
})(window);
