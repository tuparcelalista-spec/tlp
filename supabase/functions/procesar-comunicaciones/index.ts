import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { consumeRateLimit, publicError, readJson, safeHttpUrl } from '../_shared/security.ts';


const escapeHtml = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

function button(label: string, href?: string) {
  const safe = safeHttpUrl(href);
  if (!safe) return '';
  return `<p style="margin:24px 0"><a href="${escapeHtml(safe)}" style="background:#0b395d;color:#fff;padding:13px 18px;border-radius:8px;text-decoration:none;font-weight:700">${escapeHtml(label)}</a></p>`;
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
    case 'publicacion_aprobada': {
      // Se envía cuando un asesor aprueba la publicación desde la bandeja de
      // revisión del CRM. Además de avisar, invita a entrar a TPL Business,
      // que es donde la persona sigue el proceso de venta.
      const codigo = escapeHtml(payload.codigo || '');
      const comuna = escapeHtml(payload.comuna || '');
      return base(`
        <h2>Tu propiedad ya está publicada</h2>
        <p>${name ? `${name}, r` : 'R'}evisamos los antecedentes de <strong>${title}</strong>${comuna ? ` en ${comuna}` : ''} y quedó activa en el catálogo de Tu Parcela Lista.</p>
        ${codigo ? `<p style="color:#60758a;font-size:14px">Código de tu propiedad: <strong>${codigo}</strong></p>` : ''}
        <h3 style="margin-top:26px">Ahora puedes gestionarla tú</h3>
        <p>Crea tu acceso a <strong>TPL Business</strong> y tendrás en un solo lugar:</p>
        <ul style="padding-left:18px;line-height:1.7">
          <li>Tu informe de valor, con el detalle de cómo llegamos a esa cifra.</li>
          <li>Tu propia página de venta, lista para compartir.</li>
          <li>Campañas en Google, según cuánta prisa tengas.</li>
        </ul>
        <p>Solo necesitas crear una contraseña: tu correo ya está registrado.</p>
        ${button('Crear mi acceso a TPL Business', url)}`);
    }

    case 'publicacion_rechazada': {
      // El rechazo siempre lleva motivo: la RPC no deja rechazar sin él. Sin
      // decir qué corregir, la persona no puede hacer nada con el aviso.
      const motivo = escapeHtml(payload.motivo || '');
      return base(`
        <h2>Necesitamos un ajuste antes de publicar</h2>
        <p>${name ? `${name}, r` : 'R'}evisamos <strong>${title}</strong> y todavía no podemos activarla en el catálogo.</p>
        ${motivo ? `<div style="margin:20px 0;padding:16px 18px;background:#fff7ed;border-left:4px solid #ea580c;border-radius:6px">
          <strong style="display:block;margin-bottom:6px;color:#9a3412">Qué hay que corregir</strong>
          <span style="color:#7c2d12">${motivo}</span>
        </div>` : ''}
        <p>No perdiste nada de lo que ingresaste. Corrige lo señalado y vuelve a enviarla; la revisamos de nuevo el mismo día.</p>
        ${button('Corregir mi publicación', url)}
        <p style="color:#60758a;font-size:14px">Si algo no te queda claro, respóndenos este correo y te ayudamos.</p>`);
    }

    case 'publicacion_recibida': {
      // Confirmación al publicar. Antes no se enviaba ningún correo: la
      // persona entregaba su propiedad y no recibía constancia de nada.
      const comuna = escapeHtml(payload.comuna || '');
      const superficie = payload.superficie ? `${Number(payload.superficie).toLocaleString('es-CL')} m²` : '';
      const codigo = escapeHtml(payload.codigo || '');
      const precio = payload.precio ? `$${Number(payload.precio).toLocaleString('es-CL')}` : '';
      return base(`
        <h2>Recibimos tu propiedad${name ? `, ${name}` : ''}</h2>
        <p>Ya está en nuestra bandeja de revisión. Un asesor TPL valida los antecedentes
           antes de publicarla, para que llegue al catálogo bien presentada.</p>
        <table style="width:100%;border-collapse:collapse;margin:18px 0;font-size:15px">
          ${title ? `<tr><td style="padding:8px 0;border-bottom:1px solid #e6edf3;color:#60758a">Propiedad</td><td style="padding:8px 0;border-bottom:1px solid #e6edf3;text-align:right;font-weight:600">${title}</td></tr>` : ''}
          ${comuna ? `<tr><td style="padding:8px 0;border-bottom:1px solid #e6edf3;color:#60758a">Comuna</td><td style="padding:8px 0;border-bottom:1px solid #e6edf3;text-align:right;font-weight:600">${comuna}</td></tr>` : ''}
          ${superficie ? `<tr><td style="padding:8px 0;border-bottom:1px solid #e6edf3;color:#60758a">Superficie</td><td style="padding:8px 0;border-bottom:1px solid #e6edf3;text-align:right;font-weight:600">${escapeHtml(superficie)}</td></tr>` : ''}
          ${precio ? `<tr><td style="padding:8px 0;border-bottom:1px solid #e6edf3;color:#60758a">Precio informado</td><td style="padding:8px 0;border-bottom:1px solid #e6edf3;text-align:right;font-weight:600">${escapeHtml(precio)}</td></tr>` : ''}
          ${codigo ? `<tr><td style="padding:8px 0;color:#60758a">Código</td><td style="padding:8px 0;text-align:right;font-weight:600">${codigo}</td></tr>` : ''}
        </table>
        <p style="color:#60758a;font-size:14px">Si necesitas corregir algo, responde este correo y lo ajustamos antes de publicar.</p>
        ${button('Ver el catálogo TPL', url || 'https://www.parcelalista.cl/')}`);
    }
    case 'contratacion_confirmada': {
      // Se encola dentro de tpl_confirmar_contratacion_servicio_v1, en la misma
      // transacción que crea la oportunidad y las tareas: si el correo no cabe,
      // tampoco queda un cliente contratado a medias.
      //
      // "Próximos pasos" cambia por plan porque no es lo mismo haber comprado
      // visibilidad que haber entregado la venta a un corredor: un texto
      // genérico dejaba a la persona sin saber qué esperaba de ella.
      const plan = escapeHtml(payload.plan || 'tu plan');
      const planCodigo = String(payload.plan_codigo || '');
      const codigo = escapeHtml(payload.codigo || '');
      const fecha = escapeHtml(payload.fecha || '');
      const propiedad = escapeHtml(payload.propiedad || 'tu propiedad');
      const medioPago = escapeHtml(payload.medio_pago || '');
      const condicion = escapeHtml(payload.condicion || '');
      const facturaUrl = safeHttpUrl(payload.factura_url);
      const montoNum = Number(payload.monto || 0);
      const monto = montoNum > 0 ? `$${montoNum.toLocaleString('es-CL')}` : '';
      const vence = payload.vence_at
        ? new Date(String(payload.vence_at)).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })
        : '';
      const beneficios = Array.isArray(payload.beneficios) ? payload.beneficios.map(String) : [];

      const pasos: Record<string, string[]> = {
        publicacion: [
          'Tu anuncio queda activo apenas termine la revisión de nuestro equipo.',
          'Las consultas de los interesados te llegan directo a tu correo y teléfono.',
          'Puedes editar el anuncio cuando quieras escribiéndonos.',
        ],
        destacado: [
          'Activamos el destacado y la prioridad en búsquedas dentro de las próximas 24 horas.',
          'Programamos la difusión de tu parcela en las redes sociales de TPL.',
          'Te avisamos cuando empiece a subir el número de visitas.',
        ],
        marketing: [
          'Un ejecutivo te contacta en 24 horas para levantar el material de tu propiedad.',
          'Producimos tu landing, el video y las piezas publicitarias.',
          'Lanzamos las campañas y te enviamos un informe cada semana.',
        ],
        asesoria: [
          'Te asignamos un corredor responsable y te llama dentro de las próximas 24 horas.',
          'Coordinamos la visita a terreno y armamos el Informe de Propiedad.',
          'Desde ahí nos hacemos cargo: consultas, visitas, negociación y cierre.',
        ],
      };
      const proximos = pasos[planCodigo] || pasos.publicacion;

      const fila = (etiqueta: string, valor: string) => valor
        ? `<tr><td style="padding:9px 0;border-bottom:1px solid #e6edf3;color:#60758a">${etiqueta}</td><td style="padding:9px 0;border-bottom:1px solid #e6edf3;text-align:right;font-weight:600">${valor}</td></tr>`
        : '';

      return base(`
        <h2>¡Listo${name ? `, ${name}` : ''}! Contrataste ${plan}</h2>
        <p>Ya quedó registrado en tu ficha de Tu Parcela Lista. Este correo es tu comprobante.</p>

        <table style="width:100%;border-collapse:collapse;margin:18px 0;font-size:15px">
          ${fila('Plan contratado', plan)}
          ${fila('Propiedad', propiedad)}
          ${fila('N° de orden', codigo)}
          ${fila('Fecha', fecha)}
          ${fila('Monto pagado', monto)}
          ${fila('Medio de pago', medioPago)}
          ${fila('Condición', condicion)}
          ${fila('Vigente hasta', escapeHtml(vence))}
        </table>

        ${beneficios.length ? `
        <h3 style="margin-top:26px">Qué incluye</h3>
        <ul style="padding-left:18px;line-height:1.75">
          ${beneficios.map((b) => `<li>${escapeHtml(b)}</li>`).join('')}
        </ul>` : ''}

        <h3 style="margin-top:26px">Próximos pasos</h3>
        <ol style="padding-left:18px;line-height:1.75">
          ${proximos.map((paso) => `<li>${escapeHtml(paso)}</li>`).join('')}
        </ol>

        ${button('Ver mi anuncio', url || 'https://www.parcelalista.cl/')}
        ${facturaUrl ? `<p style="margin:-8px 0 22px"><a href="${escapeHtml(facturaUrl)}" style="color:#0b395d;font-weight:600">Descargar la factura</a></p>` : ''}

        <div style="margin-top:26px;padding:16px 18px;background:#f2f6f9;border-radius:10px">
          <strong style="display:block;margin-bottom:6px">¿Necesitas algo?</strong>
          <span style="color:#4a5c6e;font-size:14px">
            Escríbenos a <a href="mailto:tuparcelalista@gmail.com" style="color:#0b395d">tuparcelalista@gmail.com</a>
            o respondiendo este correo. También estamos en
            <a href="https://www.parcelalista.cl" style="color:#0b395d">parcelalista.cl</a>.
          </span>
        </div>`);
    }

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
    case 'interes_propiedad_recibido': {
      // Se encola automáticamente (trigger tpl_oportunidades_notificar_interes)
      // cuando alguien deja una consulta pública sobre una parcela publicada.
      // Antes esto no existía: el propietario o corredor nunca se enteraba.
      const interesado = escapeHtml(payload.interesado_nombre || 'Un interesado');
      const contactoEmail = escapeHtml(payload.interesado_email || '');
      const contactoTelefono = escapeHtml(payload.interesado_telefono || '');
      const mensajeInteresado = escapeHtml(payload.mensaje || '');
      const waLink = String(payload.wa_link || '');
      return base(`
        <h2>${interesado} se interesó en ${title}</h2>
        <p>${name ? `${name}, r` : 'R'}ecibimos una consulta nueva sobre tu propiedad. Estos son los datos de contacto:</p>
        <table style="width:100%;border-collapse:collapse;margin:18px 0;font-size:15px">
          <tr><td style="padding:8px 0;border-bottom:1px solid #e6edf3;color:#60758a">Nombre</td><td style="padding:8px 0;border-bottom:1px solid #e6edf3;text-align:right;font-weight:600">${interesado}</td></tr>
          ${contactoEmail ? `<tr><td style="padding:8px 0;border-bottom:1px solid #e6edf3;color:#60758a">Correo</td><td style="padding:8px 0;border-bottom:1px solid #e6edf3;text-align:right;font-weight:600">${contactoEmail}</td></tr>` : ''}
          ${contactoTelefono ? `<tr><td style="padding:8px 0;border-bottom:1px solid #e6edf3;color:#60758a">Teléfono</td><td style="padding:8px 0;border-bottom:1px solid #e6edf3;text-align:right;font-weight:600">${contactoTelefono}</td></tr>` : ''}
        </table>
        ${mensajeInteresado ? `<div style="margin:16px 0;padding:14px 16px;background:#f2f6f9;border-radius:8px"><strong>Mensaje:</strong> ${mensajeInteresado}</div>` : ''}
        <p style="color:#60758a;font-size:14px">Responde pronto: las consultas que se contestan en la primera hora convierten mucho mejor.</p>
        ${waLink ? button('Responder por WhatsApp', waLink) : ''}`);
    }
    case 'partner_nueva_reserva_zona': {
      // Se encola desde tpl_confirmar_reserva_pagada_v1 cuando una reserva
      // pagada hace match automático con un partner publicado en la zona.
      const partnerNombre = escapeHtml(payload.partner_nombre || '');
      const parcela = escapeHtml(payload.parcela || 'una parcela');
      const comuna = escapeHtml(payload.comuna || '');
      return base(`
        <h2>Nueva reserva en tu zona de cobertura</h2>
        <p>${partnerNombre ? `Hola ${partnerNombre}, r` : 'R'}egistramos una reserva pagada de <strong>${parcela}</strong>${comuna ? ` en ${comuna}` : ''}, dentro de tu zona de cobertura.</p>
        <p>Te contactamos automáticamente porque tienes buena experiencia y disponibilidad para este tipo de servicio. Prepárate: si el cliente avanza a compra confirmada, te lo ofreceremos como su profesional de confianza para la notaría/escritura.</p>
        <p style="color:#60758a;font-size:14px">No necesitas hacer nada todavía — este es un aviso preventivo del CRM de Tu Parcela Lista.</p>`);
    }
    case 'oferta_partner_cliente': {
      // Se encola cuando la oportunidad pasa a "vendida": ofrece al comprador
      // el partner que quedó sugerido en el proyecto desde la reserva.
      const clienteNombre = escapeHtml(payload.cliente_nombre || '');
      const partnerNombre = escapeHtml(payload.partner_nombre || 'un profesional de nuestra Red Partner');
      const waLink = payload.partner_whatsapp ? `https://wa.me/${String(payload.partner_whatsapp).replace(/\D/g,'')}` : '';
      return base(`
        <h2>Tenemos a alguien que puede ayudarte con tu escritura</h2>
        <p>${clienteNombre ? `Hola ${clienteNombre}, ¡` : '¡'}felicitaciones por tu compra!</p>
        <p><strong>${partnerNombre}</strong> es parte de nuestra Red Partner y puede ayudarte a coordinar los trámites de notaría y escritura.</p>
        <p style="color:#60758a;font-size:14px">Si prefieres gestionarlo por tu cuenta, no hay problema — este es solo un contacto sugerido.</p>
        ${waLink ? button('Contactar por WhatsApp', waLink) : ''}`);
    }
    case 'partner_cliente_confirmado': {
      // Contraparte del anterior: avisa al partner que el cliente ya está
      // confirmado y puede contactarlo.
      const partnerNombre = escapeHtml(payload.partner_nombre || '');
      const clienteNombre = escapeHtml(payload.cliente_nombre || 'El cliente');
      const clienteTelefono = escapeHtml(payload.cliente_telefono || '');
      const waLink = payload.cliente_telefono ? `https://wa.me/${String(payload.cliente_telefono).replace(/\D/g,'')}` : '';
      return base(`
        <h2>Cliente confirmado: puedes contactarlo</h2>
        <p>${partnerNombre ? `Hola ${partnerNombre}, ` : ''}la reserva que te avisamos en su momento ya se confirmó como venta.</p>
        <p><strong>${clienteNombre}</strong>${clienteTelefono ? ` — ${clienteTelefono}` : ''} está en condiciones de coordinar contigo los siguientes pasos.</p>
        ${waLink ? button('Escribir por WhatsApp', waLink) : ''}`);
    }
    default:
      return base(`<h2>${title}</h2><p>${message}</p>${button('Abrir TPL', url)}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return new Response(JSON.stringify({ ok:false,error:'METODO_NO_PERMITIDO' }), { status:405, headers:{ ...corsHeaders, 'Content-Type':'application/json' } });
  const secret = Deno.env.get('TPL_COMMUNICATIONS_SECRET') || '';
  if (!secret || req.headers.get('x-tpl-secret') !== secret) {
    return new Response(JSON.stringify({ ok: false, error: 'NO_AUTORIZADO' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (!url || !serviceKey || !resendKey) {
    return new Response(JSON.stringify({ ok: false, error: 'CONFIGURACION_INCOMPLETA' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  try { await consumeRateLimit(admin, req, 'procesar-comunicaciones', 180, 3600); } catch (error) {
    return new Response(JSON.stringify({ ok:false,error:publicError(error) }), { status:429, headers:{ ...corsHeaders, 'Content-Type':'application/json' } });
  }
  const body = await readJson(req, 8000).catch(() => ({}));
  const limit = Math.min(100, Math.max(1, Number(body?.limit || 20)));
  const worker = `edge-${crypto.randomUUID()}`;
  const { data: rows, error: claimError } = await admin.rpc('tpl_reclamar_comunicaciones_v1', { p_worker: worker, p_limite: limit });
  if (claimError) return new Response(JSON.stringify({ ok: false, error: claimError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

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

  return new Response(JSON.stringify({ ok: true, procesados: results.length, enviados: results.filter((x) => x.ok).length, errores: results.filter((x) => !x.ok).length, results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
