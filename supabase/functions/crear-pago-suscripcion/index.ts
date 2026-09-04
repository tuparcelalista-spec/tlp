import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { flowPost } from '../_shared/flow.ts';
import { consumeRateLimit, EMAIL_RE, publicError, readJson } from '../_shared/security.ts';

// ---------------------------------------------------------------------------
// Antes esta función escribía en tpl_ordenes_suscripcion (tabla que no existía
// en ninguna migración) con plan_solicitado='pro' (código que no existe en
// tpl_planes_comerciales: los reales son gratis, basico, profesional,
// premium). Cualquier intento de pago fallaba.
//
// Ahora recibe { plan_codigo } (por ejemplo "profesional"), busca el plan
// real, exige que tenga precio_mensual_clp cargado, y crea la orden en
// tpl_ordenes_suscripcion (migración 20260903080000).
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ ok: false, error: 'Método no permitido.' }, 405);
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    await consumeRateLimit(supabase, req, 'crear-pago-suscripcion', 10, 600);
    const payload = await readJson(req, 48000);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('NO_AUTORIZADO');
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error('USUARIO_NO_ENCONTRADO');

    // tpl_actores NO tiene columna auth_user_id (ese era un bug heredado del
    // archivo original que esta función reemplaza) — el patrón real del
    // proyecto para resolver el actor de un usuario autenticado es por
    // correo (ver 202608020001_tpl_business_partner_trial_v1.sql).
    const userEmail = String(user.email || '').trim();
    if (!userEmail) throw new Error('ACTOR_NO_ENCONTRADO');
    const { data: actor } = await supabase.from('tpl_actores').select('id, nombre, email').ilike('email', userEmail).maybeSingle();
    if (!actor) throw new Error('ACTOR_NO_ENCONTRADO');

    const planCodigo = String(payload?.plan_codigo || '').trim().toLowerCase();
    if (!planCodigo) throw new Error('PLAN_REQUERIDO');

    const { data: plan, error: planError } = await supabase
      .from('tpl_planes_comerciales')
      .select('id, codigo, nombre, precio_mensual_clp, activo')
      .eq('codigo', planCodigo)
      .eq('activo', true)
      .single();
    if (planError || !plan) throw new Error('Plan no encontrado.');
    if (!plan.precio_mensual_clp || plan.precio_mensual_clp <= 0) {
      throw new Error('Este plan todavía no tiene pago automático disponible. Escríbenos y lo activamos.');
    }

    const ordenId = crypto.randomUUID();
    const codigo = `SUB-${Date.now()}`;
    const monto = plan.precio_mensual_clp;

    const { error: insertError } = await supabase.from('tpl_ordenes_suscripcion').insert({
      id: ordenId,
      actor_id: actor.id,
      plan_id: plan.id,
      codigo,
      monto_clp: monto,
      estado: 'pendiente_pago',
    });
    if (insertError) throw new Error(insertError.message || 'No se pudo crear la orden de suscripción.');

    const siteUrl = (Deno.env.get('TPL_SITE_URL') || 'https://www.parcelalista.cl').replace(/\/$/, '');
    const confirmationUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/flow-webhook-suscripcion`;
    const returnUrl = `${siteUrl}/plataforma/tpl-business-v2/?pago=exito`;
    const email = String(actor.email || payload?.email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) throw new Error('CORREO_INVALIDO');

    const flow = await flowPost('/payment/create', {
      commerceOrder: codigo,
      subject: `Suscripción ${plan.nombre} · Tu Parcela Lista`,
      currency: 'CLP',
      amount: monto,
      email,
      urlConfirmation: confirmationUrl,
      urlReturn: returnUrl,
      optional: JSON.stringify({ orden_id: ordenId, actor_id: actor.id, plan_id: plan.id, plan_codigo: plan.codigo }),
    });

    await supabase.from('tpl_ordenes_suscripcion').update({
      estado: 'pago_iniciado', proveedor_pago: 'flow', referencia_pago: String(flow.flowOrder || ''),
      metadata: { flow_token: flow.token, flow_order: flow.flowOrder, payment_created_at: new Date().toISOString() },
    }).eq('id', ordenId);

    return jsonResponse({ ok: true, orden_id: ordenId, codigo, plan: plan.codigo, monto_clp: monto, payment_url: `${flow.url}?token=${encodeURIComponent(flow.token)}` });
  } catch (error) {
    console.error(error);
    return jsonResponse({ ok: false, error: publicError(error) }, 400);
  }
});
