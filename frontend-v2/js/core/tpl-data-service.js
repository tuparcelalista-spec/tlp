(function (window) {
  'use strict';
  const LOCAL_SUBMISSIONS='tpl_frontend_v2_publicaciones_v1';
  const LOCAL_EVENTS='tpl_core_eventos_v1';

  function supabaseClient(){
    return window.tplSupabase || window.tplCrmSupabase || window.supabaseClient || null;
  }
  function read(key,fallback=[]){try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback));}catch{return fallback;}}
  function write(key,value){localStorage.setItem(key,JSON.stringify(value));}
  function emit(evento,payload){
    const events=read(LOCAL_EVENTS,[]);events.unshift({id:crypto.randomUUID?.()||String(Date.now()),evento,payload,createdAt:new Date().toISOString()});write(LOCAL_EVENTS,events.slice(0,500));
    window.dispatchEvent(new CustomEvent('tpl:event',{detail:{evento,payload}}));
  }
  async function publishProperty(payload){
    const client=supabaseClient();
    if(client?.rpc){
      const {data,error}=await client.rpc('tpl_publicar_propiedad_v2',{p_payload:payload});
      if(!error){emit('propiedad.publicada',{...data,source:'supabase'});return {...data,source:'supabase'};}
      console.warn('TPL Data Service: RPC no disponible; se usará respaldo local.',error);
    }
    const list=read(LOCAL_SUBMISSIONS,[]);const local={...payload,id:payload.id||crypto.randomUUID?.()||`tpl-${Date.now()}`,status:'pendiente_revision',createdAt:new Date().toISOString(),source:'local'};list.unshift(local);write(LOCAL_SUBMISSIONS,list);emit('propiedad.publicada',{id:local.id,source:'local'});return {ok:true,propiedad_id:local.id,codigo:local.id,source:'local'};
  }
  async function listPublishedProperties(){
    const client=supabaseClient();
    if(client?.from){const {data,error}=await client.from('tpl_propiedades').select('*,tpl_necesidades(*)').order('created_at',{ascending:false});if(!error)return data||[];}
    return read(LOCAL_SUBMISSIONS,[]);
  }
  async function listEvents(){
    const client=supabaseClient();
    if(client?.from){const {data,error}=await client.from('tpl_eventos').select('*').order('created_at',{ascending:false}).limit(200);if(!error)return data||[];}
    return read(LOCAL_EVENTS,[]);
  }
  window.TPLDataService=Object.freeze({publishProperty,listPublishedProperties,listEvents,emit,hasBackend:()=>Boolean(supabaseClient())});
})(window);
