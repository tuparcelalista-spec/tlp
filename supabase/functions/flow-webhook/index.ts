import { createClient } from 'npm:@supabase/supabase-js@2';
import { flowGet } from '../_shared/flow.ts';
import { consumeRateLimit } from '../_shared/security.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405, headers: { 'Cache-Control': 'no-store' } });
  try {
    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > 16_000) return new Response('payload too large', { status: 413 });
    const form = await req.formData();
    const token = String(form.get('token') || '').trim();
    if (!token || token.length > 500) return new Response('invalid token', { status: 400 });

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const internalSecret = Deno.env.get('TPL_INTERNAL_FUNCTIONS_SECRET') || '';
    if (!supabaseUrl || !serviceKey || !internalSecret) throw new Error('CONFIGURACION_INCOMPLETA');

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    await consumeRateLimit(supabase, req, 'flow-webhook', 120, 300, token.slice(0, 32));

    const status = await flowGet('/payment/getStatus', { token });
    const commerceOrder = String(status.commerceOrder || '').slice(0, 120);
    if (!commerceOrder) throw new Error('ORDEN_FLOW_INVALIDA');

    const nextState = Number(status.status) === 2 ? 'pagado'
      : Number(status.status) === 3 ? 'rechazado'
      : Number(status.status) === 4 ? 'cancelado'
      : 'pago_iniciado';
    const patch: Record<string, unknown> = {
      estado: nextState,
      referencia_pago: String(status.flowOrder || '').slice(0, 120),
      metadata: { flow_status: status, webhook_at: new Date().toISOString() },
    };
    if (nextState === 'pagado') patch.pagado_at = new Date().toISOString();

    const { data: order, error } = await supabase.from('tpl_ordenes_informe')
      .update(patch).eq('codigo', commerceOrder).select('id').single();
    if (error) throw error;

    if (nextState === 'pagado' && order?.id) {
      const response = await fetch(`${supabaseUrl}/functions/v1/generar-informe-premium`, {
        method: 'POST',
        headers: { 'x-tpl-internal-secret': internalSecret, 'Content-Type': 'application/json' },
        body: JSON.stringify({ orden_id: order.id }),
      });
      if (!response.ok) console.error('No fue posible iniciar informe', response.status);
    }
    return new Response('ok', { status: 200, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
  } catch (error) {
    console.error('flow-webhook', error instanceof Error ? error.message : error);
    return new Response('error', { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
});
