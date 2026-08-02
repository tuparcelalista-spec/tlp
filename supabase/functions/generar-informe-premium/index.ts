import { createClient } from 'npm:@supabase/supabase-js@2';
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

const money=(n:unknown)=>`$${Math.round(Number(n||0)).toLocaleString('es-CL')}`;
const clean=(v:unknown,max=500)=>String(v??'No informado').replace(/[\r\n]+/g,' ').slice(0,max);
const isEmail=(v:string)=>/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);

Deno.serve(async(req)=>{
 if(req.method==='OPTIONS') return new Response('ok',{headers:corsHeaders});
 try{
  const url=Deno.env.get('SUPABASE_URL')!, service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin=createClient(url,service);
  const bearer=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');
  let staff=false;
  if(bearer && bearer!==service){
    const userClient=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:`Bearer ${bearer}`}}});
    const {data:{user}}=await userClient.auth.getUser();
    if(user){ const {data}=await admin.from('tpl_staff').select('activo').eq('user_id',user.id).eq('activo',true).maybeSingle(); staff=!!data; }
  } else if(bearer===service) staff=true;
  if(!staff) return jsonResponse({ok:false,error:'No autorizado.'},401);

  const body=await req.json(); const ordenId=body.orden_id; const enviar=body.enviar!==false;
  const overrideEmail=clean(body.email||'',180).toLowerCase();
  const {data:order,error}=await admin.from('tpl_ordenes_informe').select('*').eq('id',ordenId).single();
  if(error||!order) throw new Error('Orden no encontrada.');
  if(!['pagado','generando','disponible'].includes(order.estado)) throw new Error('La orden no está habilitada.');

  await admin.from('tpl_ordenes_informe').update({estado:'generando'}).eq('id',ordenId);
  const input=order.entrada_snapshot||{}, result=order.resultado_snapshot||{};
  const pdf=await PDFDocument.create(); const regular=await pdf.embedFont(StandardFonts.Helvetica); const bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  const blue=rgb(.025,.20,.34), yellow=rgb(.95,.70,.08), light=rgb(.95,.97,.98), gray=rgb(.35,.42,.46);
  let image:any=null; const imgs=Array.isArray(input.imagenes)?input.imagenes:[];
  const imageUrl=typeof imgs[0]==='string'?imgs[0]:imgs[0]?.url;
  if(imageUrl){try{const r=await fetch(imageUrl);if(r.ok){const b=new Uint8Array(await r.arrayBuffer());image=/png/i.test(r.headers.get('content-type')||'')?await pdf.embedPng(b):await pdf.embedJpg(b);}}catch{} }

  let page=pdf.addPage([595,842]);
  if(image){ const d=image.scale(1); const scale=Math.max(595/d.width,360/d.height); page.drawImage(image,{x:0,y:482,width:d.width*scale,height:d.height*scale}); page.drawRectangle({x:0,y:482,width:595,height:360,color:blue,opacity:.38}); }
  else page.drawRectangle({x:0,y:482,width:595,height:360,color:blue});
  page.drawText('TU PARCELA LISTA',{x:42,y:795,size:11,font:bold,color:yellow});
  page.drawText('INFORME PREMIUM DE TASACIÓN',{x:42,y:765,size:22,font:bold,color:rgb(1,1,1)});
  page.drawText(clean(input.titulo||input.codigo||'Propiedad TPL',70),{x:42,y:535,size:28,font:bold,color:rgb(1,1,1)});
  page.drawText(clean(`${input.comuna||''} · ${Number(input.superficie_m2||0).toLocaleString('es-CL')} m²`,90),{x:42,y:505,size:13,font:regular,color:rgb(1,1,1)});
  page.drawRectangle({x:36,y:350,width:523,height:100,color:light});
  page.drawText('VALOR RECOMENDADO TPL',{x:52,y:420,size:10,font:bold,color:gray});
  page.drawText(money(result.valorRecomendado||result.recommended),{x:52,y:382,size:27,font:bold,color:blue});
  page.drawText(`Precio publicado: ${money(input.precio_publicado)} · Diferencia: ${Number(result.diferencia_pct||0).toFixed(1)}%`,{x:52,y:360,size:10,font:regular,color:gray});
  page.drawText('Resumen ejecutivo',{x:42,y:315,size:17,font:bold,color:blue});
  const summary=`Esta tasación analiza la propiedad ubicada en ${input.comuna||'la zona informada'}, considerando su superficie, precio publicado, referencia comunal y antecedentes declarados. Clasificación actual: ${result.clasificacion||'sin clasificación'}.`;
  drawParagraph(page,summary,42,292,510,regular,10,14,blue);
  page.drawText('Documento orientativo sujeto a verificación técnica, comercial y legal.',{x:42,y:42,size:8,font:regular,color:gray});

  page=pdf.addPage([595,842]); let y=790;
  const heading=(t:string)=>{page.drawText(t,{x:42,y,size:16,font:bold,color:blue});y-=28;};
  const row=(a:string,b:unknown)=>{page.drawText(a,{x:42,y,size:9,font:bold,color:gray});page.drawText(clean(b,100),{x:230,y,size:10,font:regular,color:blue});y-=21;};
  heading('Ficha de la propiedad'); row('Código',input.codigo);row('Comuna / sector',`${input.comuna||''} ${input.sector||''}`.trim());row('Superficie',`${Number(input.superficie_m2||0).toLocaleString('es-CL')} m²`);row('Rol',input.rol);row('Agua',input.agua);row('Electricidad',input.electricidad);row('Acceso',input.acceso);
  y-=12;heading('Comparación económica');row('Precio publicado',money(input.precio_publicado));row('Precio publicado por m²',money(result.precio_publicado_m2));row('Valor TPL por m²',money(result.valor_tpl_m2));row('Referencia comunal por m²',money(result.referencia_comunal_m2));row('Valor total recomendado',money(result.valorRecomendado||result.recommended));row('Clasificación',result.clasificacion);row('Oportunidad TPL',result.es_oportunidad?'Sí':'No');
  y-=12;heading('Lectura y recomendaciones TPL');
  const recs=Array.isArray(result.factores)?result.factores:[]; const fallback=['Confirmar antecedentes legales y factibilidad de servicios.','Revisar la fotografía principal y completar material audiovisual.','Ajustar el precio cuando exista una diferencia relevante frente al valor recomendado.'];
  for(const r of (recs.length?recs:fallback).slice(0,8)){page.drawCircle({x:47,y:y+3,size:3,color:yellow}); y=drawParagraph(page,typeof r==='string'?r:(r.descripcion||r.nombre||JSON.stringify(r)),60,y,480,regular,10,14,blue)-6;}
  if(input.descripcion){y-=6;heading('Descripción comercial');drawParagraph(page,clean(input.descripcion,1000),42,y,510,regular,10,14,blue);}
  page.drawText(`Generado el ${new Intl.DateTimeFormat('es-CL',{dateStyle:'long'}).format(new Date())}`,{x:42,y:35,size:8,font:regular,color:gray});

  const bytes=await pdf.save(); const path=`${new Date().getUTCFullYear()}/${order.propiedad_id||'sin-propiedad'}/${order.id}/informe-${order.codigo}.pdf`;
  await admin.storage.createBucket('informes-tasacion',{public:false}).catch(()=>null);
  const {error:up}=await admin.storage.from('informes-tasacion').upload(path,bytes,{contentType:'application/pdf',upsert:true}); if(up) throw up;
  const recipient=isEmail(overrideEmail)?overrideEmail:clean(order.contacto?.email||'',180).toLowerCase();
  await admin.from('tpl_informes_tasacion').upsert({orden_id:order.id,tasacion_id:order.tasacion_id,propiedad_id:order.propiedad_id,version_plantilla:'tpl-premium-crm-v2',storage_bucket:'informes-tasacion',storage_path:path,estado:'disponible',generado_at:new Date().toISOString(),enviado_a:recipient||null,metadata:{engine_version:order.version_motor,source:'crm'}},{onConflict:'orden_id'});
  await admin.from('tpl_ordenes_informe').update({estado:'disponible',disponible_at:new Date().toISOString()}).eq('id',order.id);
  const {data:signed}=await admin.storage.from('informes-tasacion').createSignedUrl(path,60*60*24*7);
  let sent=false;
  if(enviar&&recipient){const key=Deno.env.get('RESEND_API_KEY'),from=Deno.env.get('TPL_EMAIL_FROM')||'Tu Parcela Lista <informes@parcelalista.cl>',reply=Deno.env.get('TPL_REPLY_TO');if(key){const res=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({from,to:[recipient],reply_to:reply||undefined,subject:`Informe Premium TPL · ${clean(input.titulo||input.codigo,80)}`,html:`<h2>Tu Informe Premium TPL está listo</h2><p>Hola ${clean(order.contacto?.nombre||'')}, preparamos el análisis de <strong>${clean(input.titulo||input.codigo)}</strong>.</p><p><a href="${signed?.signedUrl}">Descargar informe PDF</a></p><p>El enlace estará disponible durante 7 días.</p>`})});sent=res.ok;if(sent) await admin.from('tpl_informes_tasacion').update({enviado_at:new Date().toISOString(),enviado_a:recipient,asunto_envio:`Informe Premium TPL · ${clean(input.titulo||input.codigo,80)}`}).eq('orden_id',order.id);}}
  return jsonResponse({ok:true,orden_id:order.id,estado:'disponible',download_url:signed?.signedUrl||null,enviado:sent,email:recipient||null});
 }catch(error){console.error(error);return jsonResponse({ok:false,error:error instanceof Error?error.message:'No fue posible generar el informe.'},400);}
});

function drawParagraph(page:any,text:string,x:number,y:number,width:number,font:any,size:number,lineHeight:number,color:any){let line='';for(const word of clean(text,1600).split(' ')){const test=`${line} ${word}`.trim();if(font.widthOfTextAtSize(test,size)>width){page.drawText(line,{x,y,size,font,color});y-=lineHeight;line=word;}else line=test;}if(line){page.drawText(line,{x,y,size,font,color});y-=lineHeight;}return y;}
