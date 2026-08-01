import { createClient } from 'npm:@supabase/supabase-js@2';
import { flowGet } from '../_shared/flow.ts';

Deno.serve(async (req) => {
  try {
    const form = await req.formData();
    const token = String(form.get('token') || '');
    if (!token) return new Response('missing token', { status: 400 });
    const status = await flowGet('/payment/getStatus', { token });
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const commerceOrder = String(status.commerceOrder || '');
    const nextState = Number(status.status) === 2 ? 'pagado' : Number(status.status) === 3 ? 'rechazado' : Number(status.status) === 4 ? 'cancelado' : 'pago_iniciado';
    const patch: Record<string, unknown> = {
      estado: nextState,
      referencia_pago: String(status.flowOrder || ''),
      metadata: { flow_status: status, webhook_at: new Date().toISOString() },
    };
    if (nextState === 'pagado') patch.pagado_at = new Date().toISOString();
    const { data: order, error } = await supabase.from('tpl_ordenes_informe').update(patch).eq('codigo', commerceOrder).select('id').single();
    if (error) throw error;
    if (nextState === 'pagado' && order?.id) {
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/generar-informe-premium`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ orden_id: order.id }),
      });
    }
    return new Response('ok', { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response('error', { status: 500 });
  }
});
