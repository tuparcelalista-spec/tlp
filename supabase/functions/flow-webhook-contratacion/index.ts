import { createClient } from 'npm:@supabase/supabase-js@2';
import { flowGet } from '../_shared/flow.ts';
import { consumeRateLimit } from '../_shared/security.ts';

// ---------------------------------------------------------------------------
// Confirmación de pago de un plan de servicio contratado desde el publicador.
//
// Este webhook NO comparte tabla con flow-webhook (informes y reservas). Se
// separó a propósito: aquel es lo único que confirma las reservas de parcela
// pagadas, y un error introducido ahí rompería un cobro que ya funciona.
//
// Todo lo que pasa después del pago —etiquetas, oportunidad, tareas del equipo
// y correo al cliente— ocurre dentro de una sola transacción en
// tpl_confirmar_contratacion_servicio_v1. Aquí solo se traduce el estado de
// Flow y se llama a esa función. Si Flow reintenta el aviso (lo hace), la RPC
// es idempotente y no duplica nada.
// ---------------------------------------------------------------------------

const sinCache = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405, headers: sinCache });

  try {
    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > 16_000) return new Response('payload too large', { status: 413, headers: sinCache });

    const form = await req.formData();
    const token = String(form.get('token') || '').trim();
    if (!token || token.length > 500) return new Response('invalid token', { status: 400, headers: sinCache });

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    if (!supabaseUrl || !serviceKey) throw new Error('CONFIGURACION_INCOMPLETA');

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    await consumeRateLimit(supabase, req, 'flow-webhook-contratacion', 120, 300, token.slice(0, 32));

    // El estado se pregunta a Flow con la API firmada; nunca se cree lo que
    // venga en el formulario del aviso.
    const status = await flowGet('/payment/getStatus', { token });
    const commerceOrder = String(status.commerceOrder || '').slice(0, 120);
    if (!commerceOrder) throw new Error('ORDEN_FLOW_INVALIDA');

    const { data: contratacion, error: lookupError } = await supabase
      .from('tpl_contrataciones_servicio')
      .select('id, codigo, estado_pago, plan_codigo')
      .eq('codigo', commerceOrder)
      .maybeSingle();
    if (lookupError) throw lookupError;

    if (!contratacion?.id) {
      // Puede ser un aviso de otra familia de órdenes apuntado por error a esta
      // URL. Se registra y se responde 200 para que Flow no reintente en bucle.
      console.error('flow-webhook-contratacion: no existe la contratación', commerceOrder);
      return new Response('ok', { status: 200, headers: sinCache });
    }

    const codigoFlow = Number(status.status);
    const medioPago = String(status.paymentData?.media || '').slice(0, 60);
    const flowOrder = String(status.flowOrder || '').slice(0, 120);

    if (codigoFlow === 2) {
      const { data, error } = await supabase.rpc('tpl_confirmar_contratacion_servicio_v1', {
        p_contratacion_id: contratacion.id,
        p_pago: {
          proveedor: 'flow',
          medio_pago: medioPago || 'Flow',
          flow_order: flowOrder,
          flow_status: codigoFlow,
        },
      });

      if (error || !data?.ok) {
        // El dinero ya se cobró. Si las automatizaciones fallan, lo peor que se
        // puede hacer es callarlo: queda el evento en alta prioridad para que
        // alguien lo active a mano desde el CRM.
        console.error('flow-webhook-contratacion: fallo al confirmar', error || data);
        await supabase.from('tpl_eventos').insert({
          evento: 'contratacion.confirmacion_fallida',
          categoria: 'comercial',
          origen: 'flow',
          prioridad: 'alta',
          descripcion: 'El pago del plan se confirmó en Flow pero no se aplicaron las automatizaciones del CRM. Activar a mano.',
          metadata: {
            contratacion_id: contratacion.id,
            codigo: commerceOrder,
            flow_order: flowOrder,
            error: error?.message || null,
          },
        });
        // 500 para que Flow reintente: la RPC es idempotente, reintentar es seguro.
        return new Response('error', { status: 500, headers: sinCache });
      }

      return new Response('ok', { status: 200, headers: sinCache });
    }

    if (codigoFlow === 3 || codigoFlow === 4) {
      await supabase.rpc('tpl_marcar_contratacion_fallida_v1', {
        p_contratacion_id: contratacion.id,
        p_estado: codigoFlow === 3 ? 'rechazado' : 'cancelado',
        p_detalle: { flow_status: codigoFlow, flow_order: flowOrder, medio_pago: medioPago },
      });
      return new Response('ok', { status: 200, headers: sinCache });
    }

    // status 1 = pendiente. No se toca nada: la orden ya está en 'pago_iniciado'.
    return new Response('ok', { status: 200, headers: sinCache });
  } catch (error) {
    console.error('flow-webhook-contratacion', error instanceof Error ? error.message : error);
    return new Response('error', { status: 500, headers: sinCache });
  }
});
