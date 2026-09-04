import { createClient } from 'npm:@supabase/supabase-js@2';
import { Resend } from 'npm:resend@3';
import { flowGet } from '../_shared/flow.ts';
import { consumeRateLimit } from '../_shared/security.ts';

function esc(v: unknown) {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const clp = (n: unknown) => {
  const v = Number(n) || 0;
  return '$' + v.toLocaleString('es-CL', { maximumFractionDigits: 0 });
};

// Correo de confirmación de reserva pagada. No debe romper el webhook si
// falla: Flow espera 200 igual, y el pago/bloqueo ya quedaron confirmados
// en la base de datos antes de llegar aquí. Sigue el mismo patrón que
// enviar-resumen-cotizacion (Resend + RESEND_API_KEY / TPL_EMAIL_FROM / TPL_REPLY_TO).
async function enviarConfirmacionReserva(opts: {
  email: string; nombre: string; codigo: string; montoClp: unknown;
  parcelaTitulo: string; parcelaComuna: string; reembolsableHasta: string;
}) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY') || '';
  if (!resendApiKey || !opts.email) {
    console.error('enviarConfirmacionReserva: falta RESEND_API_KEY o email, no se envía correo.');
    return;
  }
  try {
    const fechaLimite = new Date(opts.reembolsableHasta).toLocaleString('es-CL', {
      dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Santiago',
    });
    const html = `
<div style="background:#eef3f7;padding:24px 0;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #dce5ed;">
    <div style="background:#073a5a;padding:26px 28px;">
      <div style="color:#ffffff;font-size:20px;font-weight:700;">Tu Parcela Lista</div>
      <div style="color:#a8c6db;font-size:13px;margin-top:4px;letter-spacing:.08em;">RESERVA CONFIRMADA</div>
    </div>
    <div style="padding:28px;">
      <p style="margin:0 0 6px;color:#173e5c;font-size:18px;font-weight:700;">Hola ${esc(opts.nombre)},</p>
      <p style="margin:0 0 22px;color:#5b6b7c;font-size:15px;line-height:1.6;">
        Recibimos tu pago de reserva. Un asesor TPL te contactará para coordinar
        los próximos pasos de tu compra.
      </p>
      <div style="background:#f6f9fb;border:1px solid #e0e9f0;border-radius:12px;padding:16px;margin-bottom:20px;">
        <div style="color:#66788a;font-size:12px;letter-spacing:.1em;font-weight:700;">PARCELA RESERVADA</div>
        <div style="color:#173e5c;font-size:16px;font-weight:700;margin-top:5px;">${esc(opts.parcelaTitulo)}</div>
        <div style="color:#66788a;font-size:13px;margin-top:3px;">${esc(opts.parcelaComuna)}</div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:15px;">
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #e6edf3;color:#173e5c;font-weight:600;">Monto de la reserva</td>
          <td style="padding:10px 0;border-bottom:1px solid #e6edf3;text-align:right;color:#173e5c;font-weight:700;">${clp(opts.montoClp)}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#173e5c;font-weight:600;">Código de orden</td>
          <td style="padding:10px 0;text-align:right;color:#173e5c;font-weight:700;">${esc(opts.codigo)}</td>
        </tr>
      </table>
      <div style="margin:22px 0 0;background:#fff7ed;border:1px solid #fadfc0;border-radius:10px;padding:14px 16px;">
        <p style="margin:0;color:#8a5a1c;font-size:13px;line-height:1.6;">
          Esta reserva es reembolsable si nos escribes antes del <strong>${esc(fechaLimite)}</strong>
          (24 horas desde el pago).
        </p>
      </div>
    </div>
    <div style="background:#f6f9fb;padding:18px 28px;border-top:1px solid #e6edf3;">
      <p style="margin:0;color:#8b9aa8;font-size:12px;line-height:1.6;">
        Recibes este correo porque reservaste una parcela en Tu Parcela Lista.
        Si tienes dudas, responde directamente este correo.
      </p>
    </div>
  </div>
</div>`;

    const resend = new Resend(resendApiKey);
    const envio = await resend.emails.send({
      from: Deno.env.get('TPL_EMAIL_FROM') || 'Tu Parcela Lista <partners@parcelalista.cl>',
      to: [opts.email],
      reply_to: Deno.env.get('TPL_REPLY_TO') || 'tuparcelalista@gmail.com',
      subject: `Reserva confirmada — ${opts.parcelaTitulo}`,
      html,
    });
    if ((envio as { error?: unknown })?.error) {
      console.error('enviarConfirmacionReserva: Resend error', (envio as { error?: unknown }).error);
    }
  } catch (error) {
    console.error('enviarConfirmacionReserva: fallo inesperado', error instanceof Error ? error.message : error);
  }
}

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
    if (nextState === 'pagado') {
      patch.pagado_at = new Date().toISOString();
      // Reserva de parcela: reembolsable dentro de las primeras 24 horas
      // desde el pago (regla de negocio confirmada 2026-09-03). Para
      // informes/planes esta columna simplemente queda en null.
      patch.reembolsable_hasta = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    }

    const { data: order, error } = await supabase.from('tpl_ordenes_informe')
      .update(patch).eq('codigo', commerceOrder).select('id,tipo_informe,contacto,entrada_snapshot,propiedad_id,monto_clp').single();
    if (error) throw error;

    if (nextState === 'pagado' && order?.id) {
      // La tabla de órdenes ya no vende solo informes: TPL Studio cobra por
      // aquí los planes de marketing, y ahora también la reserva de parcela.
      // Sin esta bifurcación, pagar una reserva disparaba la generación de
      // una tasación premium que nadie pidió.
      if (order.tipo_informe === 'reserva_parcela') {
        // La parcela queda "reservada" en firme (ya no depende del bloqueo
        // temporal de 1 mes creado al iniciar el pago). Si el pago fue
        // rechazado/cancelado, el bloqueo simplemente expira solo.
        if (order.propiedad_id) {
          await supabase.from('tpl_propiedades')
            .update({ estado_publicacion: 'reservada', reservada_hasta: null, updated_at: new Date().toISOString() })
            .eq('id', order.propiedad_id);
        }
        await supabase.from('tpl_eventos').insert({
          evento: 'reserva_parcela_pagada',
          categoria: 'comercial',
          origen: 'flow',
          prioridad: 'alta',
          descripcion: 'Reserva de parcela pagada. Reembolsable hasta 24h desde el pago; coordinar siguientes pasos con el cliente.',
          metadata: {
            orden_id: order.id,
            codigo: commerceOrder,
            propiedad_id: order.propiedad_id,
            contacto: order.contacto ?? null,
            parcela: order.entrada_snapshot ?? null,
            reembolsable_hasta: patch.reembolsable_hasta,
          },
        });
        {
          const contacto = (order.contacto ?? {}) as Record<string, unknown>;
          const parcela = (order.entrada_snapshot ?? {}) as Record<string, unknown>;
          await enviarConfirmacionReserva({
            email: String(contacto?.email || ''),
            nombre: String(contacto?.nombre || 'cliente'),
            codigo: commerceOrder,
            montoClp: order.monto_clp,
            parcelaTitulo: String(parcela?.titulo || 'tu parcela'),
            parcelaComuna: String(parcela?.comuna || ''),
            reembolsableHasta: String(patch.reembolsable_hasta || ''),
          });
        }
        // Activa el proyecto en el CRM (tpl_proyectos) y dispara el matching
        // automático de la Red Partner por zona. Ver
        // tpl_confirmar_reserva_pagada_v1 (idempotente vía
        // tpl_ordenes_informe.metadata->>proyecto_id): si esto falla, la
        // reserva y el pago ya quedaron confirmados igual, solo queda
        // pendiente de activarse a mano desde el CRM.
        {
          const { data: confirmacion, error: confirmError } = await supabase.rpc('tpl_confirmar_reserva_pagada_v1', { p_orden_id: order.id });
          if (confirmError || !confirmacion?.ok) {
            console.error('No fue posible activar el proyecto de la reserva', confirmError || confirmacion);
            await supabase.from('tpl_eventos').insert({
              evento: 'reserva_parcela_confirmacion_fallida',
              categoria: 'comercial',
              origen: 'flow',
              prioridad: 'alta',
              descripcion: 'El pago de la reserva se confirmó pero no se pudo crear el proyecto/oportunidad automáticamente. Revisar manualmente.',
              metadata: { orden_id: order.id, error: confirmError?.message || confirmacion?.motivo || null },
            });
          }
        }
      } else {
        const esInforme = !order.tipo_informe || order.tipo_informe === 'tasacion_premium';
        if (esInforme) {
          const response = await fetch(`${supabaseUrl}/functions/v1/generar-informe-premium`, {
            method: 'POST',
            headers: { 'x-tpl-internal-secret': internalSecret, 'Content-Type': 'application/json' },
            body: JSON.stringify({ orden_id: order.id }),
          });
          if (!response.ok) console.error('No fue posible iniciar informe', response.status);
        } else {
          // Un plan de marketing lo ejecutan personas: se deja el encargo en la
          // bandeja del CRM en vez de intentar automatizarlo.
          await supabase.from('tpl_eventos').insert({
            evento: 'plan_marketing_pagado',
            categoria: 'comercial',
            origen: 'flow',
            prioridad: 'alta',
            descripcion: `Plan de marketing pagado y pendiente de ejecución (${order.tipo_informe}).`,
            metadata: {
              orden_id: order.id,
              tipo: order.tipo_informe,
              codigo: commerceOrder,
              contacto: order.contacto ?? null,
              propiedad: order.entrada_snapshot ?? null,
            },
          });
        }
      }
    }
    return new Response('ok', { status: 200, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
  } catch (error) {
    console.error('flow-webhook', error instanceof Error ? error.message : error);
    return new Response('error', { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
});
