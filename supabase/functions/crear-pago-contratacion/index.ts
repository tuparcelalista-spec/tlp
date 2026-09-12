import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeadersFor, jsonResponseFor } from '../_shared/cors.ts';
import { flowPost } from '../_shared/flow.ts';
import { consumeRateLimit, EMAIL_RE, publicError, readJson } from '../_shared/security.ts';

// ---------------------------------------------------------------------------
// Contratación de un plan de servicio desde la pantalla que aparece al terminar
// de publicar (publicador V2).
//
// Quien llega aquí NO tiene sesión: acaba de publicar como anónimo. Por eso la
// función no exige Authorization de usuario (a diferencia de
// crear-pago-suscripcion) y toda la validación vive en la RPC:
// tpl_crear_contratacion_servicio_v1 exige que la propiedad exista y calcula el
// monto desde tpl_planes_servicio. Un monto enviado por el navegador se ignora.
//
// El plan "Asesoría TPL" no cobra nada por adelantado (2% + IVA al vender), así
// que no pasa por Flow: se confirma en el acto y dispara las mismas
// automatizaciones de CRM que un plan pagado.
// ---------------------------------------------------------------------------

// La pantalla de planes vive tanto en producción como en el Live Server local
// (127.0.0.1:5501, donde las rutas llevan el prefijo /frontend-v2/). Flow
// necesita una URL absoluta de retorno, así que el navegador manda la suya y
// aquí se acepta SOLO si el origen está en la lista blanca: si no se valida,
// esto sería un redirector abierto firmado por TPL.
function urlDeRetorno(base: unknown, codigo: string) {
  const siteUrl = (Deno.env.get('TPL_SITE_URL') || 'https://www.parcelalista.cl').replace(/\/$/, '');
  const porDefecto = `${siteUrl}/plataforma/publicar-v2/confirmacion.html`;
  const permitidos = [
    ...(Deno.env.get('TPL_ALLOWED_ORIGINS') || '').split(',').map((o) => o.trim()).filter(Boolean),
    'https://www.parcelalista.cl',
    'https://parcelalista.cl',
  ];
  const esLocal = (origin: string) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

  let destino = porDefecto;
  const crudo = String(base ?? '').trim();
  if (crudo) {
    try {
      const parsed = new URL(crudo);
      if (permitidos.includes(parsed.origin) || esLocal(parsed.origin)) {
        destino = `${parsed.origin}${parsed.pathname.replace(/\/$/, '')}/confirmacion.html`;
      }
    } catch { /* base inválida: se usa la de producción */ }
  }
  return `${destino}?orden=${encodeURIComponent(codigo)}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeadersFor(req) });
  if (req.method !== 'POST') return jsonResponseFor(req, { ok: false, error: 'METODO_NO_PERMITIDO' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    if (!supabaseUrl || !serviceKey) throw new Error('CONFIGURACION_INCOMPLETA');

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const payload = await readJson(req, 16_000);

    const email = String(payload?.contacto?.email || payload?.email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) throw new Error('CORREO_INVALIDO');

    // La clave del rate limit incluye el correo: evita que un mismo visitante
    // genere órdenes en cadena sin castigar a otra persona tras la misma IP.
    await consumeRateLimit(supabase, req, 'crear-pago-contratacion', 12, 600, email);

    const { data: orden, error } = await supabase.rpc('tpl_crear_contratacion_servicio_v1', {
      p_payload: payload,
    });
    if (error) throw new Error(error.message || 'SOLICITUD_NO_PROCESADA');
    if (!orden?.ok) throw new Error('SOLICITUD_NO_PROCESADA');

    const returnUrl = urlDeRetorno(payload?.retorno_base, orden.codigo);

    // ---- Plan sin cobro inicial: se activa de inmediato --------------------
    if (!orden.requiere_pago) {
      const { data: confirmacion, error: confirmError } = await supabase.rpc(
        'tpl_confirmar_contratacion_servicio_v1',
        { p_contratacion_id: orden.contratacion_id, p_pago: { proveedor: 'sin_cobro', medio_pago: 'Sin cobro inicial' } },
      );
      if (confirmError || !confirmacion?.ok) {
        // La contratación quedó creada; lo que falló son las automatizaciones.
        // Se deja constancia para poder activarla a mano desde el CRM en vez de
        // devolverle a la persona un éxito que no ocurrió.
        console.error('No se pudo activar la contratación sin cobro', confirmError || confirmacion);
        await supabase.from('tpl_eventos').insert({
          evento: 'contratacion.activacion_fallida',
          categoria: 'comercial',
          origen: 'publicador',
          prioridad: 'alta',
          descripcion: 'La contratación sin cobro se creó pero no se aplicaron las automatizaciones. Activar a mano.',
          metadata: { contratacion_id: orden.contratacion_id, error: confirmError?.message || null },
        });
        throw new Error('ACTIVACION_FALLIDA');
      }

      return jsonResponseFor(req, {
        ok: true,
        requiere_pago: false,
        contratacion_id: orden.contratacion_id,
        codigo: orden.codigo,
        plan_codigo: orden.plan_codigo,
        plan_nombre: orden.plan_nombre,
        monto_clp: 0,
        redirect_url: returnUrl,
      });
    }

    // ---- Plan pagado: se arma la orden en Flow -----------------------------
    const confirmationUrl = `${supabaseUrl}/functions/v1/flow-webhook-contratacion`;
    const flow = await flowPost('/payment/create', {
      commerceOrder: orden.codigo,
      subject: `${orden.plan_nombre} · Tu Parcela Lista`,
      currency: 'CLP',
      amount: Number(orden.monto_clp),
      email,
      urlConfirmation: confirmationUrl,
      urlReturn: returnUrl,
      optional: JSON.stringify({
        contratacion_id: orden.contratacion_id,
        plan: orden.plan_codigo,
      }),
    });

    await supabase.from('tpl_contrataciones_servicio').update({
      estado_pago: 'pago_iniciado',
      proveedor_pago: 'flow',
      flow_order: String(flow.flowOrder || ''),
      flow_token: String(flow.token || ''),
      referencia_pago: String(flow.flowOrder || ''),
      // Sin `metadata:` aquí a propósito: supabase-js reemplaza el jsonb entero
      // y borraría el `origen` que dejó la RPC. Lo de Flow ya tiene columnas
      // propias (flow_order / flow_token).
    }).eq('id', orden.contratacion_id);

    return jsonResponseFor(req, {
      ok: true,
      requiere_pago: true,
      contratacion_id: orden.contratacion_id,
      codigo: orden.codigo,
      plan_codigo: orden.plan_codigo,
      plan_nombre: orden.plan_nombre,
      monto_clp: orden.monto_clp,
      payment_url: `${flow.url}?token=${encodeURIComponent(flow.token)}`,
    });
  } catch (error) {
    console.error('crear-pago-contratacion', error instanceof Error ? error.message : error);
    return jsonResponseFor(req, { ok: false, error: publicError(error) }, 400);
  }
});
