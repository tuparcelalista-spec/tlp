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

    const pdf = await PDFDocument.create();
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const page = pdf.addPage([595, 842]);
    const blue = rgb(0.03, 0.22, 0.38), yellow = rgb(0.95, 0.72, 0.12);
    page.drawRectangle({ x: 0, y: 760, width: 595, height: 82, color: blue });
    page.drawText('TU PARCELA LISTA', { x: 40, y: 805, size: 12, font: bold, color: yellow });
    page.drawText('Informe Premium de Tasación', { x: 40, y: 778, size: 22, font: bold, color: rgb(1,1,1) });
    let y = 730;
    const row = (label: string, value: unknown) => { page.drawText(label, { x: 42, y, size: 10, font: bold, color: blue }); page.drawText(clean(value), { x: 210, y, size: 10, font: regular }); y -= 22; };
    const input = order.entrada_snapshot || {}, result = order.resultado_snapshot || {};
    row('Código', order.codigo); row('Solicitante', order.contacto?.nombre); row('Correo', order.contacto?.email);
    row('Comuna / sector', `${input.comuna || ''} ${input.sector || ''}`.trim()); row('Superficie', `${Number(input.superficie || input.superficie_m2 || 0).toLocaleString('es-CL')} m²`);
    row('Rol informado', input.rol || input.rolPropiedad || 'No informado');
    y -= 8; page.drawRectangle({ x: 36, y: y-72, width: 523, height: 82, color: rgb(.95,.97,.99) });
    page.drawText('Resultado económico orientativo', { x: 50, y: y-10, size: 14, font: bold, color: blue });
    page.drawText(`Valor recomendado: ${money(result.recommended || result.valorRecomendado || result.valor_estimado)}`, { x: 50, y: y-36, size: 17, font: bold, color: blue });
    page.drawText(`Rango: ${money(result.min || result.valorMinimo)} a ${money(result.max || result.valorMaximo)}`, { x: 50, y: y-58, size: 10, font: regular });
    y -= 105;
    const sections = [
      ['Análisis comercial', result.commercialSummary || result.resumenComercial || 'El valor debe contrastarse con antecedentes verificables, estado del acceso, servicios y condiciones reales de venta.'],
      ['Fortalezas declaradas', Array.isArray(result.strengths) ? result.strengths.join(' · ') : (result.fortalezas || 'Revisar atributos naturales, conectividad, agua y electricidad.')],
      ['Recomendación TPL', result.recommendation || result.recomendacion || 'Publicar dentro del rango recomendado mejora la competitividad y la calidad de las consultas.'],
    ];
    for (const [title, text] of sections) { page.drawText(title, { x: 42, y, size: 13, font: bold, color: blue }); y -= 18; const words = clean(text).split(' '); let line=''; for (const word of words) { const test=`${line} ${word}`.trim(); if (regular.widthOfTextAtSize(test,10)>505) { page.drawText(line,{x:42,y,size:10,font:regular}); y-=15; line=word; } else line=test; } if(line){page.drawText(line,{x:42,y,size:10,font:regular});y-=15;} y-=13; }
    page.drawText('Documento orientativo. Los antecedentes declarados deben verificarse antes de una operación.', { x: 42, y: 42, size: 8, font: regular, color: rgb(.35,.4,.45) });

    if (territorial) {
      const p2 = pdf.addPage([595,842]);
      p2.drawRectangle({ x:0, y:780, width:595, height:62, color:blue });
      p2.drawText('LECTURA TERRITORIAL TPL', { x:40, y:808, size:18, font:bold, color:rgb(1,1,1) });
      let ty=750;
      const section=(title:string, lines:string[])=>{
        p2.drawText(title,{x:42,y:ty,size:13,font:bold,color:blue});ty-=20;
        for(const raw of lines.filter(Boolean).slice(0,7)){
          const words=clean(raw).split(' ');let line='';
          for(const word of words){const test=`${line} ${word}`.trim();if(regular.widthOfTextAtSize(test,9.5)>490){p2.drawText(line,{x:48,y:ty,size:9.5,font:regular});ty-=14;line=word}else line=test}
          if(line){p2.drawText(line,{x:48,y:ty,size:9.5,font:regular});ty-=14}
        }
        ty-=12;
      };
      const u=territorial.ubicacion||{}, a=territorial.accesibilidad||{}, i=territorial.infraestructura||{}, d=territorial.distancias||{}, idx=territorial.indices_tpl||{};
      section('Ubicación y accesibilidad',[
        `${clean(u.comuna||input.comuna)} · ${clean(u.region||input.region)}`,
        u.lat&&u.lng?`Punto analizado: ${u.lat}, ${u.lng}`:'Ubicación comunal referencial',
        a.tipo?`Acceso declarado: ${a.tipo}`:'',a.topografia?`Topografía: ${a.topografia}`:'',a.suelo?`Suelo declarado: ${a.suelo}`:''
      ]);
      section('Infraestructura y cercanías',[
        i.agua?`Agua: ${i.agua}`:'Agua por confirmar',i.electricidad?`Electricidad: ${i.electricidad}`:'Electricidad por confirmar',
        d.centro_comuna_km!=null?`Centro comunal: ${Number(d.centro_comuna_km).toFixed(1)} km aprox.`:'',d.ciudad_principal_km!=null?`Ciudad principal: ${Number(d.ciudad_principal_km).toFixed(1)} km aprox.`:''
      ]);
      section('Índices y potencial TPL',[
        idx.territorial?.score!=null?`Índice territorial: ${idx.territorial.score}/100 · ${clean(idx.territorial.label)}`:'',
        idx.propiedad?.score!=null?`Índice de propiedad: ${idx.propiedad.score}/100 · ${clean(idx.propiedad.label)}`:'',
        ...(territorial.resumen_publico?.potenciales||[])
      ]);
      section('Recomendaciones y próximos pasos',(territorial.recomendaciones||[]).map((r:any)=>`${r.title||'Recomendación'}: ${r.detail||''}`));
      p2.drawText('Esta lectura combina datos declarados y cálculos TPL. Riesgos, factibilidades y antecedentes legales deben verificarse con fuentes técnicas u oficiales.',{x:42,y:38,size:8,font:regular,color:rgb(.35,.4,.45)});
    }
    const bytes = await pdf.save();
    const path = `${new Date().getUTCFullYear()}/${order.id}/informe-${order.codigo}.pdf`;
    await supabase.storage.createBucket('informes-tasacion', { public: false }).catch(() => null);
    const { error: uploadError } = await supabase.storage.from('informes-tasacion').upload(path, bytes, { contentType: 'application/pdf', upsert: true });
    if (uploadError) throw uploadError;
    await supabase.from('tpl_informes_tasacion').upsert({ orden_id: order.id, tasacion_id: order.tasacion_id, propiedad_id: order.propiedad_id, version_plantilla: 'tpl-premium-crm-v3', storage_bucket: 'informes-tasacion', storage_path: path, estado: 'disponible', generado_at: new Date().toISOString(), generado_por: userId, metadata: { engine_version: order.version_motor, analisis_territorial_id: territorial?.id || null, source: 'crm' } }, { onConflict: 'orden_id' });
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
