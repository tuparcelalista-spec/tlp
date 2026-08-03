import { createClient } from 'npm:@supabase/supabase-js@2';
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

const money = (n: unknown) => `$${Math.round(Number(n || 0)).toLocaleString('es-CL')}`;
const clean = (v: unknown, max = 500) => String(v ?? 'No informado').replace(/[\r\n]+/g, ' ').slice(0, max);
const isEmail = (v: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(url, service);
    const bearer = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    let authorized = false;
    let userId: string | null = null;
    if (bearer && bearer === service) {
      authorized = true;
    } else if (bearer) {
      const userClient = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${bearer}` } } });
      const { data: { user } } = await userClient.auth.getUser();
      userId = user?.id || null;
      if (userId) {
        const { data: staff } = await supabase.from('tpl_staff').select('user_id').eq('user_id', userId).eq('activo', true).maybeSingle();
        authorized = Boolean(staff);
      }
    }
    if (!authorized) return jsonResponse({ ok: false, error: 'No autorizado.' }, 401);
    const body = await req.json();
    const orden_id = body.orden_id;
    const enviar = body.enviar !== false;
    const overrideEmail = clean(body.email || '', 180).toLowerCase();
    const { data: order, error } = await supabase.from('tpl_ordenes_informe').select('*').eq('id', orden_id).single();
    if (error || !order) throw new Error('Orden no encontrada.');
    if (!['pagado','generando','disponible'].includes(order.estado)) throw new Error('La orden no está habilitada para generar el informe.');
    await supabase.from('tpl_ordenes_informe').update({ estado: 'generando' }).eq('id', orden_id);

    let territorial: any = null;
    if (order.tasacion_id) {
      const { data: analysis } = await supabase.from('tpl_analisis_territoriales').select('*').eq('tasacion_id', order.tasacion_id).order('created_at', { ascending: false }).limit(1).maybeSingle();
      territorial = analysis || null;
    }
    if (!territorial && order.propiedad_id) {
      const { data: analysis } = await supabase.from('tpl_analisis_territoriales').select('*').eq('propiedad_id', order.propiedad_id).eq('estado','vigente').order('created_at', { ascending: false }).limit(1).maybeSingle();
      territorial = analysis || null;
    }

    const input = order.entrada_snapshot || {}, result = order.resultado_snapshot || {};
    const house = input.casa_datos || input.house || {};
    const assetType = input.tipoActivo || input.tipo_activo || (input.soloVivienda ? 'casa' : ((input.incluyeVivienda || input.incluye_vivienda || Number(input.areaCasa || house.superficie_m2 || 0) > 0) ? 'parcela_casa' : 'parcela'));
    const tplValue = Number(result.ideal || result.recommended || result.valorRecomendado || result.valor_estimado || 0);
    const quickValue = Number(result.quick || result.agile || result.valorMinimo || (tplValue * .93));
    const patientValue = Number(result.patient || result.technicalPotential || result.valorMaximo || tplValue);
    const askingValue = Number(input.asking || input.precio_publicado || 0);
    const communalValue = Number(result.marketReference?.medianValue || result.marketReference?.median_value || result.referencia_comunal_total || 0);
    const observedValue = Number(result.observedComparables?.mediana_total || 0);
    const communalM2 = Number(result.marketReference?.medianM2 || result.referencia_comunal_m2 || 0);

    const has = (v: unknown) => v !== undefined && v !== null && String(v).trim() !== '' && String(v).toLowerCase() !== 'no informado';
    const yes = (v: unknown) => /^(si|sí|true|1|propio|instalado|completo|completamente|apr|pozo|puntera)/i.test(String(v || ''));
    const strengths: string[] = [];
    const limits: string[] = [];
    const improvements: Array<{title:string, reason:string, partner:string, points:number, priority:string}> = [];
    let quality = 0;
    const addQuality = (condition:boolean, points:number) => { if (condition) quality += points; };
    addQuality(has(input.region) && has(input.comuna), 70);
    addQuality(Number(input.superficie || input.superficie_m2 || input.area || 0) > 0 || assetType === 'casa', 50);
    addQuality(has(input.lat) && has(input.lng), 100);
    addQuality(has(input.rol || input.rolPropiedad), 90);
    addQuality(has(input.agua || input.water), 70);
    addQuality(has(input.electricidad || input.electricity), 70);
    addQuality(has(input.acceso || input.access), 55);
    addQuality(has(input.topografia || input.topography), 45);
    addQuality(has(input.suelo || input.soil), 35);
    addQuality(has(input.cierre_perimetral || input.fencing), 35);
    addQuality(Boolean(territorial), 100);
    addQuality(Boolean(result.marketReference || result.observedComparables), 80);
    addQuality(tplValue > 0, 100);
    addQuality(Boolean(order.tasacion_id), 50);
    addQuality(assetType === 'parcela' || Number(input.areaCasa || house.superficie_m2 || house.m2 || 0) > 0, 50);
    quality = Math.min(1000, quality);

    const water = input.agua || input.water;
    const electricity = input.electricidad || input.electricity;
    const fencing = input.cierre_perimetral || input.fencing;
    const access = input.acceso || input.access;
    const role = input.rol || input.rolPropiedad;
    if (yes(role)) strengths.push('Situación de Rol favorable o informada como propia.'); else { limits.push('Situación legal o Rol pendiente de validación.'); improvements.push({title:'Validar antecedentes legales',reason:'Aumenta la confianza del comprador y la calidad del informe.',partner:'Gestoría, abogado o topógrafo Partner TPL',points:55,priority:'Alta'}); }
    if (yes(water) || /factibilidad|apr|pozo|puntera/i.test(String(water||''))) strengths.push(`Disponibilidad o factibilidad de agua informada: ${clean(water)}.`); else { limits.push('Agua no confirmada o sin factibilidad informada.'); improvements.push({title:'Estudio y solución de agua',reason:'Confirmar APR, pozo, puntera o factibilidad reduce incertidumbre.',partner:'Especialista en pozos, APR o soluciones sanitarias Partner TPL',points:45,priority:'Alta'}); }
    if (/empalme|instalado/i.test(String(electricity||''))) strengths.push('Empalme eléctrico informado como instalado.'); else { limits.push('Electricidad pendiente o solo con factibilidad.'); improvements.push({title:'Regularizar o instalar electricidad',reason:'Mejora habitabilidad y reduce costos percibidos por el comprador.',partner:'Instalador eléctrico autorizado Partner TPL',points:40,priority:'Alta'}); }
    if (/completamente|completo/i.test(String(fencing||''))) strengths.push('Cierre perimetral completo.'); else { limits.push('Cierre perimetral incompleto o no informado.'); improvements.push({title:'Instalar cierre perimetral',reason:'Mejora delimitación, seguridad, privacidad y presentación comercial.',partner:'Cercos y portones Partner TPL',points:35,priority:'Alta'}); }
    if (/pavimentado|ripio bueno/i.test(String(access||''))) strengths.push(`Acceso favorable: ${clean(access)}.`); else { limits.push('Acceso con condición mejorable o pendiente de confirmar.'); improvements.push({title:'Mejorar acceso y entrada',reason:'Facilita visitas, reduce objeciones y mejora la percepción general.',partner:'Movimiento de tierra y caminos Partner TPL',points:30,priority:'Media'}); }
    if (!has(input.lat) || !has(input.lng)) { limits.push('Ubicación exacta no validada.'); improvements.push({title:'Georreferenciar la propiedad',reason:'Permite calcular servicios, rutas y contexto territorial con mayor precisión.',partner:'Topógrafo o asesor territorial TPL',points:70,priority:'Alta'}); }
    if (assetType !== 'parcela') {
      const areaHouse = Number(input.areaCasa || house.superficie_m2 || house.m2 || 0);
      if (areaHouse > 0) strengths.push(`Vivienda registrada con ${areaHouse.toLocaleString('es-CL')} m² construidos.`); else { limits.push('Superficie construida no confirmada.'); improvements.push({title:'Medir y documentar la vivienda',reason:'Permite separar correctamente el valor del terreno y la construcción.',partner:'Arquitecto o topógrafo Partner TPL',points:50,priority:'Alta'}); }
      if (!has(input.estadoCasa || house.estado)) { improvements.push({title:'Evaluar estado de conservación',reason:'La antigüedad y el estado afectan directamente el valor construido.',partner:'Constructor o inspector Partner TPL',points:30,priority:'Media'}); }
    }
    if (!strengths.length) strengths.push('La propiedad dispone de antecedentes básicos suficientes para una primera lectura TPL.');
    if (!improvements.some(x=>x.title.includes('Fotograf'))) improvements.push({title:'Fotografía y presentación profesional',reason:'Una mejor presentación aumenta calidad de consultas y facilita comparar atributos.',partner:'Fotografía y drone Partner TPL',points:25,priority:'Media'});
    const projectedQuality = Math.min(1000, quality + improvements.slice(0,5).reduce((a,x)=>a+x.points,0));
    const qualityLabel = quality >= 900 ? 'Excelencia TPL' : quality >= 800 ? 'Muy completa' : quality >= 650 ? 'Buena' : quality >= 500 ? 'En desarrollo' : quality >= 300 ? 'Información insuficiente' : 'Revisión prioritaria';

    const pdf = await PDFDocument.create();
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const blue = rgb(0.03, 0.22, 0.38), yellow = rgb(0.95, 0.72, 0.12), green=rgb(.07,.48,.30), orange=rgb(.86,.38,.08), pale=rgb(.95,.97,.99), gray=rgb(.35,.4,.45);
    const wrap=(page:any,text:string,x:number,y:number,maxWidth=500,size=10,font=regular,lineHeight=14,color=rgb(.08,.12,.16))=>{let line='';for(const word of clean(text,2000).split(' ')){const test=`${line} ${word}`.trim();if(font.widthOfTextAtSize(test,size)>maxWidth&&line){page.drawText(line,{x,y,size,font,color});y-=lineHeight;line=word}else line=test}if(line){page.drawText(line,{x,y,size,font,color});y-=lineHeight}return y;};
    const header=(page:any,title:string,subtitle='')=>{page.drawRectangle({x:0,y:770,width:595,height:72,color:blue});page.drawText('TU PARCELA LISTA',{x:40,y:816,size:11,font:bold,color:yellow});page.drawText(title,{x:40,y:790,size:19,font:bold,color:rgb(1,1,1)});if(subtitle)page.drawText(clean(subtitle,100),{x:40,y:773,size:8,font:regular,color:rgb(.88,.94,.98)});};
    const bullet=(page:any,text:string,y:number,color=blue)=>{page.drawCircle({x:48,y:y+3,size:2.5,color});return wrap(page,text,58,y,485,9.5,regular,13);};

    const page1=pdf.addPage([595,842]); header(page1,'Informe Premium TPL', assetType==='parcela_casa'?'Parcela + casa':assetType==='casa'?'Vivienda':'Parcela / campo');
    page1.drawText(clean(input.titulo || input.codigo || order.codigo,90),{x:40,y:735,size:22,font:bold,color:blue});
    page1.drawText(`${clean(input.comuna||'')} · ${clean(input.region||'')}`,{x:40,y:710,size:11,font:regular,color:gray});
    page1.drawRectangle({x:36,y:590,width:523,height:92,color:pale});
    page1.drawText('VALOR TÉCNICO TPL',{x:52,y:656,size:10,font:bold,color:blue});
    page1.drawText(money(tplValue),{x:52,y:620,size:25,font:bold,color:blue});
    page1.drawText(`Confianza informativa: ${quality}/1.000 · ${qualityLabel}`,{x:52,y:600,size:10,font:regular,color:gray});
    const minV=Math.min(quickValue||tplValue,tplValue,patientValue||tplValue,askingValue||tplValue,communalValue||tplValue); const maxV=Math.max(quickValue||tplValue,tplValue,patientValue||tplValue,askingValue||tplValue,communalValue||tplValue); const span=Math.max(1,maxV-minV); const sx=(v:number)=>55+((v-minV)/span)*480;
    page1.drawText('ESTRATEGIA COMERCIAL',{x:40,y:550,size:12,font:bold,color:blue}); page1.drawLine({start:{x:55,y:500},end:{x:535,y:500},thickness:5,color:rgb(.82,.86,.89)});
    const mark=(v:number,label:string,color:any,dy:number)=>{if(!v)return;const x=sx(v);page1.drawCircle({x,y:500,size:6,color});page1.drawText(label,{x:Math.max(38,Math.min(500,x-25)),y:dy,size:8,font:bold,color});page1.drawText(money(v),{x:Math.max(38,Math.min(490,x-28)),y:dy-12,size:8,font:regular,color:gray});};
    mark(quickValue,'CON APURO',orange,475); mark(tplValue,'VALOR TPL',blue,525); mark(patientValue,'SIN APURO',green,475); if(askingValue)mark(askingValue,'PROPIETARIO',rgb(.42,.18,.62),545); if(communalValue)mark(communalValue,'VALOR COMUNAL',rgb(.65,.48,.04),455);
    page1.drawRectangle({x:36,y:270,width:523,height:145,color:rgb(.98,.98,.97)}); page1.drawText('RESUMEN EJECUTIVO',{x:52,y:388,size:12,font:bold,color:blue});
    let yy=365; const communalDelta=communalValue?Math.round(((tplValue-communalValue)/communalValue)*100):null; yy=wrap(page1,`El Valor Técnico TPL recomendado es ${money(tplValue)} y fue calculado de forma independiente con los antecedentes particulares de la propiedad. El escenario con apuro deriva de ese valor y se ubica en ${money(quickValue)}; el escenario sin apuro se sitúa en ${money(patientValue)}. ${communalValue?`El Valor Comunal TPL es ${money(communalValue)} (${money(communalM2)}/m²) y se presenta únicamente como referencia estadística. La diferencia es ${communalDelta>=0?'+':''}${communalDelta}%.`:'No existe una referencia comunal validada suficiente para este segmento.'}`,52,yy,490,10,regular,15);
    page1.drawText('ÍNDICE DE CALIDAD TPL',{x:40,y:220,size:12,font:bold,color:blue}); page1.drawRectangle({x:40,y:185,width:515,height:18,color:rgb(.87,.90,.92)}); page1.drawRectangle({x:40,y:185,width:515*(quality/1000),height:18,color:quality>=800?green:quality>=500?yellow:orange}); page1.drawText(`${quality} / 1.000 · ${qualityLabel}`,{x:40,y:160,size:13,font:bold,color:blue}); page1.drawText(`Proyección al completar mejoras prioritarias: ${projectedQuality}/1.000`,{x:40,y:140,size:10,font:regular,color:gray});
    page1.drawText('Informe comercial orientativo. No reemplaza peritaje presencial, tasación bancaria ni revisión legal.',{x:40,y:38,size:8,font:regular,color:gray});

    const page2=pdf.addPage([595,842]); header(page2,'Diagnóstico de la propiedad','Fortalezas, factores limitantes y calidad de los antecedentes'); let y2=740;
    page2.drawText('FORTALEZAS',{x:40,y:y2,size:13,font:bold,color:green});y2-=22;for(const t of strengths.slice(0,9)){y2=bullet(page2,t,y2,green);y2-=4} y2-=8;
    page2.drawText('FACTORES QUE LIMITAN LA CONFIANZA O COMERCIALIZACIÓN',{x:40,y:y2,size:12,font:bold,color:orange});y2-=22;for(const t of (limits.length?limits:['No se detectaron limitaciones relevantes con los datos disponibles.']).slice(0,9)){y2=bullet(page2,t,y2,orange);y2-=4}
    y2-=10;page2.drawText('DESGLOSE DEL ACTIVO',{x:40,y:y2,size:12,font:bold,color:blue});y2-=24;
    const breakdown=result.desglose||{}; const rows=[['Terreno',breakdown.valorTerreno],['Vivienda',breakdown.valorCasa],['Fundación',breakdown.valorFundacion],['Obras adicionales',breakdown.sumaObrasAdicionales]];for(const [l,v] of rows){if(Number(v)>0){page2.drawText(String(l),{x:50,y:y2,size:10,font:regular});page2.drawText(money(v),{x:390,y:y2,size:10,font:bold,color:blue});y2-=20}}
    page2.drawText('Los antecedentes declarados deben verificarse antes de una operación.',{x:40,y:38,size:8,font:regular,color:gray});

    const page3=pdf.addPage([595,842]); header(page3,'Plan de Mejoramiento TPL','Acciones priorizadas y servicios disponibles mediante la Red Partner TPL'); let y3=738;
    for(const item of improvements.slice(0,7)){page3.drawRectangle({x:38,y:y3-80,width:519,height:88,color:pale,borderColor:rgb(.83,.87,.90),borderWidth:1});page3.drawText(`${item.priority.toUpperCase()} · ${item.title}`,{x:52,y:y3-20,size:11,font:bold,color:item.priority==='Alta'?orange:blue});let ty=wrap(page3,item.reason,52,y3-39,485,9,regular,12);page3.drawText(`Impacto estimado en calidad: +${item.points} puntos`,{x:52,y:y3-67,size:8.5,font:bold,color:green});page3.drawText(clean(item.partner,80),{x:290,y:y3-67,size:8.5,font:regular,color:blue});y3-=100;if(y3<100)break}
    page3.drawText('Las mejoras elevan preparación, presentación y confianza; no garantizan por sí solas un aumento exacto del precio.',{x:40,y:38,size:8,font:regular,color:gray});

    if (territorial) {
      const page4=pdf.addPage([595,842]); header(page4,'Lectura territorial TPL','Ubicación, accesibilidad, infraestructura y cercanías'); let y4=738;
      const u=territorial.ubicacion||{}, a=territorial.accesibilidad||{}, i=territorial.infraestructura||{}, d=territorial.distancias||{}, idx=territorial.indices_tpl||{};
      const sec=(title:string, lines:string[])=>{page4.drawText(title,{x:40,y:y4,size:12,font:bold,color:blue});y4-=20;for(const t of lines.filter(Boolean).slice(0,8)){y4=bullet(page4,t,y4,blue);y4-=3}y4-=10;};
      sec('Ubicación y accesibilidad',[`${clean(u.comuna||input.comuna)} · ${clean(u.region||input.region)}`,u.lat&&u.lng?`Punto analizado: ${u.lat}, ${u.lng}`:'Ubicación comunal referencial',a.tipo?`Acceso: ${a.tipo}`:'',a.topografia?`Topografía: ${a.topografia}`:'',a.suelo?`Suelo informado: ${a.suelo}`:'']);
      sec('Infraestructura y distancias',[i.agua?`Agua: ${i.agua}`:'Agua por confirmar',i.electricidad?`Electricidad: ${i.electricidad}`:'Electricidad por confirmar',d.centro_comuna_km!=null?`Centro comunal: ${Number(d.centro_comuna_km).toFixed(1)} km aprox.`:'',d.ciudad_principal_km!=null?`Ciudad principal: ${Number(d.ciudad_principal_km).toFixed(1)} km aprox.`:'']);
      sec('Índices TPL',[idx.territorial?.score!=null?`Índice territorial: ${idx.territorial.score}/100 · ${clean(idx.territorial.label)}`:'',idx.propiedad?.score!=null?`Índice de propiedad: ${idx.propiedad.score}/100 · ${clean(idx.propiedad.label)}`:'',...(territorial.resumen_publico?.potenciales||[])]);
      page4.drawText('Las distancias y cercanías son orientativas y deben comprobarse cuando sean determinantes para la decisión.',{x:40,y:38,size:8,font:regular,color:gray});
    }
    const bytes = await pdf.save();
    const path = `${new Date().getUTCFullYear()}/${order.id}/informe-${order.codigo}.pdf`;
    await supabase.storage.createBucket('informes-tasacion', { public: false }).catch(() => null);
    const { error: uploadError } = await supabase.storage.from('informes-tasacion').upload(path, bytes, { contentType: 'application/pdf', upsert: true });
    if (uploadError) throw uploadError;
    await supabase.from('tpl_informes_tasacion').upsert({ orden_id: order.id, tasacion_id: order.tasacion_id, propiedad_id: order.propiedad_id, version_plantilla: 'tpl-premium-independiente-v5', storage_bucket: 'informes-tasacion', storage_path: path, estado: 'disponible', generado_at: new Date().toISOString(), generado_por: userId, metadata: { engine_version: order.version_motor, analisis_territorial_id: territorial?.id || null, source: 'crm', asset_type: assetType, quality_score: quality, projected_quality_score: projectedQuality, improvements: improvements.slice(0,7) } }, { onConflict: 'orden_id' });
    await supabase.from('tpl_ordenes_informe').update({ estado: 'disponible', disponible_at: new Date().toISOString() }).eq('id', order.id);

    const { data: signed } = await supabase.storage.from('informes-tasacion').createSignedUrl(path, 60 * 60 * 24 * 7);
    const recipient = isEmail(overrideEmail) ? overrideEmail : clean(order.contacto?.email || '', 180).toLowerCase();
    let sent = false;
    const resendKey = Deno.env.get('RESEND_API_KEY');
    const from = Deno.env.get('TPL_EMAIL_FROM') || 'Tu Parcela Lista <informes@parcelalista.cl>';
    const replyTo = Deno.env.get('TPL_REPLY_TO');
    if (enviar && resendKey && recipient) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to: [recipient],
          reply_to: replyTo || undefined,
          subject: `Informe Premium TPL · ${clean(input.titulo || input.codigo || order.codigo, 80)}`,
          html: `<h2>Tu Informe Premium TPL está listo</h2><p>Hola ${clean(order.contacto?.nombre || 'cliente')}, puedes descargarlo durante los próximos 7 días.</p><p><a href="${signed?.signedUrl}">Descargar informe PDF</a></p>`
        })
      });
      sent = response.ok;
      if (!sent) console.error('Resend:', await response.text());
      if (sent) {
        await supabase.from('tpl_informes_tasacion').update({ enviado_at: new Date().toISOString(), enviado_a: recipient, asunto_envio: `Informe Premium TPL · ${clean(input.titulo || input.codigo || order.codigo, 80)}` }).eq('orden_id', order.id);
      }
    }
    return jsonResponse({ ok: true, orden_id: order.id, estado: 'disponible', download_url: signed?.signedUrl || null, enviado: sent, email: recipient || null });
  } catch (error) {
    console.error(error);
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : 'No fue posible generar el informe.' }, 400);
  }
});
