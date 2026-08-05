import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tpl-secret',
};

const escapeHtml = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

function button(label: string, href?: string) {
  if (!href) return '';
  return `<p style="margin:24px 0"><a href="${escapeHtml(href)}" style="background:#0b395d;color:#fff;padding:13px 18px;border-radius:8px;text-decoration:none;font-weight:700">${escapeHtml(label)}</a></p>`;
}

function render(template: string, payload: Record<string, unknown>) {
  const name = escapeHtml(payload.nombre || payload.name || '');
  const title = escapeHtml(payload.titulo || payload.servicio || payload.propiedad || 'Tu Parcela Lista');
  const url = String(payload.continuar_url || payload.accion_url || payload.url || payload.link || '');
  const message = escapeHtml(payload.mensaje || payload.descripcion || payload.comentario || 'Tienes una nueva actualización en TPL.');
  const amount = payload.monto ? `$${Number(payload.monto).toLocaleString('es-CL')}` : '';
  const base = (content: string) => `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#17324d;line-height:1.55"><div style="border-bottom:4px solid #f2b705;padding-bottom:12px"><strong style="font-size:21px">Tu Parcela Lista</strong></div>${content}<p style="margin-top:28px;color:#60758a;font-size:13px">Este correo fue generado por una acción registrada en TPL.</p></div>`;

  switch (template) {
    case 'partner_continuar_registro':
      return base(`<h2>Continúa tu registro en TPL Pro Network</h2><p>Guardamos correctamente tu información${name ? `, ${name}` : ''}.</p><p>Tu perfil está completado en un <strong>${escapeHtml(payload.porcentaje || 0)}%</strong>.</p>${button('Continuar registro', url)}`);
    case 'publicador_continuar_borrador':
    case 'propietario_continuar_publicacion':
      return base(`<h2>Continúa el diagnóstico de tu propiedad</h2><p>Guardamos tus antecedentes. Completa la ficha para mejorar la precisión de la tasación.</p>${button('Continuar diagnóstico', url)}`);
    case 'avance_nuevo_cliente':
    case 'partner_avance_publicado':
      return base(`<h2>Nuevo avance en ${title}</h2><p>${message}</p><p><strong>Avance informado:</strong> ${escapeHtml(payload.porcentaje || '')}%</p>${amount ? `<p><strong>Monto solicitado:</strong> ${amount}</p>` : ''}${button('Revisar avance', url)}`);
    case 'avance_revisado_partner':
      return base(`<h2>El cliente revisó un avance</h2><p>${message}</p>${button('Abrir trabajo', url)}`);
    case 'pago_informado_partner':
      return base(`<h2>El cliente informó un pago</h2><p><strong>Monto:</strong> ${amount}</p><p>${message}</p>${button('Revisar comprobante', url)}`);
    case 'pago_confirmado_cliente':
      return base(`<h2>Pago confirmado</h2><p>La empresa confirmó la recepción de ${amount || 'tu pago'}.</p>${button('Ver proyecto', url)}`);
    case 'pago_rechazado_cliente':
      return base(`<h2>El pago necesita revisión</h2><p>${message}</p>${button('Revisar pago', url)}`);
    default:
      return base(`<h2>${title}</h2><p>${message}</p>${button('Abrir TPL', url)}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const secret = Deno.env.get('TPL_COMMUNICATIONS_SECRET') || '';
  if (!secret || req.headers.get('x-tpl-secret') !== secret) {
    return new Response(JSON.stringify({ ok: false, error: 'NO_AUTORIZADO' }), { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (!url || !serviceKey || !resendKey) {
    return new Response(JSON.stringify({ ok: false, error: 'CONFIGURACION_INCOMPLETA' }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const body = await req.json().catch(() => ({}));
  const limit = Math.min(100, Math.max(1, Number(body?.limit || 20)));
  const worker = `edge-${crypto.randomUUID()}`;
  const { data: rows, error: claimError } = await admin.rpc('tpl_reclamar_comunicaciones_v1', { p_worker: worker, p_limite: limit });
  if (claimError) return new Response(JSON.stringify({ ok: false, error: claimError.message }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });

  const from = Deno.env.get('TPL_EMAIL_FROM') || 'Tu Parcela Lista <notificaciones@parcelalista.cl>';
  const replyTo = Deno.env.get('TPL_REPLY_TO') || 'tuparcelalista@gmail.com';
  const results = [];
  for (const row of rows || []) {
    try {
      if (!String(row.destinatario || '').includes('@')) throw new Error('DESTINATARIO_INVALIDO');
      const html = render(String(row.plantilla || 'generica'), row.payload || {});
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': String(row.payload?.idempotency_key || `tpl-com-${row.id}`),
        },
        body: JSON.stringify({ from, to: [row.destinatario], reply_to: replyTo, subject: row.asunto || 'Actualización de Tu Parcela Lista', html }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.message || `RESEND_${response.status}`);
      await admin.rpc('tpl_finalizar_comunicacion_v1', { p_id: row.id, p_ok: true, p_proveedor_id: result?.id || null, p_error: null });
      results.push({ id: row.id, ok: true, provider_id: result?.id || null });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await admin.rpc('tpl_finalizar_comunicacion_v1', { p_id: row.id, p_ok: false, p_proveedor_id: null, p_error: message });
      results.push({ id: row.id, ok: false, error: message });
    }
  }

  return new Response(JSON.stringify({ ok: true, procesados: results.length, enviados: results.filter((x) => x.ok).length, errores: results.filter((x) => !x.ok).length, results }), { headers: { ...cors, 'Content-Type': 'application/json' } });
});
