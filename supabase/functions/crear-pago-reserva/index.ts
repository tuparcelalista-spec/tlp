import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { flowPost } from '../_shared/flow.ts';
import { consumeRateLimit, EMAIL_RE, publicError, readJson } from '../_shared/security.ts';

// Cobra la reserva de una parcela (1% del valor publicado). El monto NUNCA
// se recibe del cliente: lo calcula tpl_crear_orden_reserva_v1() leyendo
// tpl_propiedades.precio_publicado en el servidor. Ver migración
// 20260903020000_tpl_reserva_parcela_pago_v1.sql para las reglas de bloqueo
// (1 mes) y reembolso (24 horas post-pago).
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ ok: false, error: 'Método no permitido.' }, 405);
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    await consumeRateLimit(supabase, req, 'crear-pago-reserva', 10, 600);
    const payload = await readJson(req, 16000);

    const email = String(payload?.contacto?.email || payload?.email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) throw new Error('CORREO_INVALIDO');
    if (!String(payload?.parcela_codigo || '').trim()) throw new Error('Falta la parcela a reservar.');

    const { data: order, error } = await supabase.rpc('tpl_crear_orden_reserva_v1', { p_payload: payload });
    if (error || !order?.ok) throw new Error(error?.message || 'No se pudo crear la reserva.');

    const siteUrl = (Deno.env.get('TPL_SITE_URL') || 'https://www.parcelalista.cl').replace(/\/$/, '');
    const confirmationUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/flow-webhook`;
    const returnUrl = `${siteUrl}/proyecto.html?id=${encodeURIComponent(String(payload.parcela_codigo))}&reserva=${encodeURIComponent(order.orden_id)}`;

    const flow = await flowPost('/payment/create', {
      commerceOrder: order.codigo,
      subject: 'Reserva de parcela - Tu Parcela Lista',
      currency: 'CLP',
      amount: Number(order.monto_clp),
      email,
      urlConfirmation: confirmationUrl,
      urlReturn: returnUrl,
      optional: JSON.stringify({ orden_id: order.orden_id, tipo: 'reserva_parcela', parcela_codigo: payload.parcela_codigo }),
    });

    await supabase.from('tpl_ordenes_informe').update({
      estado: 'pago_iniciado', proveedor_pago: 'flow', referencia_pago: String(flow.flowOrder || ''),
      metadata: { flow_token: flow.token, flow_order: flow.flowOrder, payment_created_at: new Date().toISOString() },
    }).eq('id', order.orden_id);

    return jsonResponse({ ok: true, ...order, payment_url: `${flow.url}?token=${encodeURIComponent(flow.token)}` });
  } catch (error) {
    console.error(error);
    return jsonResponse({ ok: false, error: publicError(error) }, 400);
  }
});
