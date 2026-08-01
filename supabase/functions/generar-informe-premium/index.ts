import { createClient } from 'npm:@supabase/supabase-js@2';
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

const money = (n: unknown) => `$${Math.round(Number(n || 0)).toLocaleString('es-CL')}`;
const clean = (v: unknown) => String(v ?? 'No informado').replace(/[\r\n]+/g, ' ').slice(0, 160);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization') || '';
    if (!auth.includes(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '__missing__')) return jsonResponse({ ok: false, error: 'No autorizado.' }, 401);
    const { orden_id } = await req.json();
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: order, error } = await supabase.from('tpl_ordenes_informe').select('*').eq('id', orden_id).single();
    if (error || !order) throw new Error('Orden no encontrada.');
    if (!['pagado','generando','disponible'].includes(order.estado)) throw new Error('La orden aún no está pagada.');
    if (order.estado === 'disponible') return jsonResponse({ ok: true, already_generated: true });
    await supabase.from('tpl_ordenes_informe').update({ estado: 'generando' }).eq('id', orden_id);

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
    const bytes = await pdf.save();
    const path = `${new Date().getUTCFullYear()}/${order.id}/informe-${order.codigo}.pdf`;
    await supabase.storage.createBucket('informes-tasacion', { public: false }).catch(() => null);
    const { error: uploadError } = await supabase.storage.from('informes-tasacion').upload(path, bytes, { contentType: 'application/pdf', upsert: true });
    if (uploadError) throw uploadError;
    await supabase.from('tpl_informes_tasacion').upsert({ orden_id: order.id, tasacion_id: order.tasacion_id, version_plantilla: 'tpl-premium-v1', storage_bucket: 'informes-tasacion', storage_path: path, estado: 'disponible', generado_at: new Date().toISOString(), metadata: { engine_version: order.version_motor } }, { onConflict: 'orden_id' });
    await supabase.from('tpl_ordenes_informe').update({ estado: 'disponible', disponible_at: new Date().toISOString() }).eq('id', order.id);

    const resendKey = Deno.env.get('RESEND_API_KEY');
    const from = Deno.env.get('TPL_EMAIL_FROM');
    if (resendKey && from && order.contacto?.email) {
      const { data: signed } = await supabase.storage.from('informes-tasacion').createSignedUrl(path, 60 * 60 * 24 * 7);
      await fetch('https://api.resend.com/emails', { method:'POST', headers:{ Authorization:`Bearer ${resendKey}`,'Content-Type':'application/json' }, body:JSON.stringify({ from, to:[order.contacto.email], subject:`Tu Informe Premium TPL ${order.codigo}`, html:`<h2>Tu informe está listo</h2><p>Hola ${clean(order.contacto.nombre)}, puedes descargarlo durante los próximos 7 días.</p><p><a href="${signed?.signedUrl}">Descargar informe PDF</a></p>` }) });
    }
    return jsonResponse({ ok: true, orden_id: order.id, estado: 'disponible' });
  } catch (error) {
    console.error(error);
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : 'No fue posible generar el informe.' }, 400);
  }
});
