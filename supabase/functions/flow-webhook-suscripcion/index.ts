import { createClient } from 'npm:@supabase/supabase-js@2';
import { flowGet } from '../_shared/flow.ts';
import { consumeRateLimit } from '../_shared/security.ts';
import { Resend } from 'npm:resend@3';

// ---------------------------------------------------------------------------
// Antes: actualizaba tpl_ordenes_suscripcion (tabla inexistente) y hacía
// supabase.from('tpl_actores').update({ plan: order.plan_solicitado }) —
// tpl_actores no tiene columna "plan". El upgrade de plan nunca se aplicaba
// en ningún lado real.
//
// Ahora: actualiza la orden real (tabla creada en 20260903080000), y al
// pagarse activa/renueva la suscripción en tpl_suscripciones — la tabla que
// SÍ usa el resto del sistema (por ejemplo activar-propietario-gratis) para
// saber qué plan tiene cada actor.
// ---------------------------------------------------------------------------

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
    const resendApiKey = Deno.env.get('RESEND_API_KEY') || '';
    if (!supabaseUrl || !serviceKey) throw new Error('CONFIGURACION_INCOMPLETA');

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    await consumeRateLimit(supabase, req, 'flow-webhook-suscripcion', 120, 300, token.slice(0, 32));

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

    const { data: order, error } = await supabase.from('tpl_ordenes_suscripcion')
      .update(patch).eq('codigo', commerceOrder).select('id, actor_id, plan_id').single();
    if (error) throw error;

    if (nextState === 'pagado' && order?.actor_id && order?.plan_id) {
      const { data: plan } = await supabase.from('tpl_planes_comerciales').select('id, nombre').eq('id', order.plan_id).single();

      // Activa o renueva 30 días la suscripción del actor a este plan.
      const { data: existente } = await supabase.from('tpl_suscripciones')
        .select('id').eq('actor_id', order.actor_id).eq('plan_id', order.plan_id).is('propiedad_id', null).maybeSingle();

      const periodoHasta = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      if (existente?.id) {
        await supabase.from('tpl_suscripciones').update({
          estado: 'activa', periodo_hasta: periodoHasta, updated_at: new Date().toISOString(),
          metadata: { origen: 'pago_flow', orden_id: order.id },
        }).eq('id', existente.id);
      } else {
        await supabase.from('tpl_suscripciones').insert({
          actor_id: order.actor_id, plan_id: order.plan_id, estado: 'activa',
          periodo_hasta: periodoHasta, metadata: { origen: 'pago_flow', orden_id: order.id },
        });
      }

      const { data: actor } = await supabase.from('tpl_actores').select('nombre, email').eq('id', order.actor_id).single();

      if (actor?.email && resendApiKey) {
        const resend = new Resend(resendApiKey);
        try {
          await resend.emails.send({
            from: 'Soporte TPL <soporte@parcelalista.cl>',
            to: [actor.email],
            bcc: ['tuparcelalista@gmail.com'],
            reply_to: 'tuparcelalista@gmail.com',
            subject: `¡Bienvenido al ${plan?.nombre || 'nuevo plan'}!`,
            html: `<h1>¡Hola ${actor.nombre || 'Propietario'}, gracias por mejorar tu plan!</h1>
                   <p>Tu pago fue procesado con éxito. Tu cuenta ya tiene los beneficios de <strong>${plan?.nombre || 'tu nuevo plan'}</strong>, activos por 30 días.</p>
                   <p>Entra a <a href="https://www.parcelalista.cl/plataforma/tpl-business-v2/">TPL Business</a> para empezar a usarlos.</p>
                   <br><br><small>El Equipo de Tu Parcela Lista</small>`
          });
        } catch (mailError) {
          console.error('Error enviando email:', mailError);
        }
      }
    }
    return new Response('ok', { status: 200, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
  } catch (error) {
    console.error('flow-webhook-suscripcion', error instanceof Error ? error.message : error);
    return new Response('error', { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
});
