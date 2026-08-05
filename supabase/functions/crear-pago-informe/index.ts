import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { flowPost } from '../_shared/flow.ts';
import { consumeRateLimit, EMAIL_RE, publicError, readJson } from '../_shared/security.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return jsonResponse(req, { ok: false, error: 'Método no permitido.' }, 405);
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    await consumeRateLimit(supabase, req, 'crear-pago-informe', 10, 600);
    const payload = await readJson(req, 48000);
    const { data: order, error } = await supabase.rpc('tpl_crear_orden_informe_v1', { p_payload: payload });
    if (error || !order?.ok) throw new Error(error?.message || 'No se pudo crear la orden.');

    const siteUrl = (Deno.env.get('TPL_SITE_URL') || 'https://www.parcelalista.cl').replace(/\/$/, '');
    const confirmationUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/flow-webhook`;
    const returnUrl = `${siteUrl}/plataforma/publicar/pago-informe.html?orden=${encodeURIComponent(order.orden_id)}`;
    const email = String(payload?.contacto?.email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) throw new Error('CORREO_INVALIDO');
    const flow = await flowPost('/payment/create', {
      commerceOrder: order.codigo,
      subject: 'Informe Premium de Tasación TPL',
      currency: 'CLP',
      amount: Number(order.monto_clp),
      email,
      urlConfirmation: confirmationUrl,
      urlReturn: returnUrl,
      optional: JSON.stringify({ orden_id: order.orden_id, tipo: 'tasacion_premium' }),
    });

    await supabase.from('tpl_ordenes_informe').update({
      estado: 'pago_iniciado', proveedor_pago: 'flow', referencia_pago: String(flow.flowOrder || ''),
      metadata: { flow_token: flow.token, flow_order: flow.flowOrder, payment_created_at: new Date().toISOString() },
    }).eq('id', order.orden_id);

    return jsonResponse(req, { ok: true, ...order, payment_url: `${flow.url}?token=${encodeURIComponent(flow.token)}` });
  } catch (error) {
    console.error(error);
    return jsonResponse(req, { ok: false, error: publicError(error) }, 400);
  }
});
