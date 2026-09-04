(()=>{
'use strict';
const params=new URLSearchParams(location.search);const id=params.get('id');const urlToken=params.get('t');
const key=id?`tpl_project_access_${id}`:'';const token=urlToken||(key?sessionStorage.getItem(key):'');
async function boot(){
 if(id&&token&&window.TPLDataService?.getProjectByAccessToken){
  try{const project=await window.TPLDataService.getProjectByAccessToken(id,token);project.accessToken=token;project.canonical=true;sessionStorage.setItem(key,token);sessionStorage.setItem('tpl_v2_current_project',JSON.stringify(project));if(urlToken){params.delete('t');history.replaceState({},'',`${location.pathname}?${params.toString()}${location.hash}`)} }
  catch(error){console.error('TPL Proyecto: acceso canónico no disponible.',error);sessionStorage.removeItem('tpl_v2_current_project');}
 }
 const script=document.createElement('script');script.src='./js/proyecto.js?v=20260901-guard';script.defer=true;document.body.appendChild(script);
}
boot();
})();
