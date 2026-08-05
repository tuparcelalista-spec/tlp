import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { consumeRateLimit, EMAIL_RE, publicError, readJson, UUID_RE } from '../_shared/security.ts';

type Json = Record<string, unknown>;

const clean = (value: unknown, max = 240) => String(value ?? '').replace(/[\r\n<>]/g, ' ').trim().slice(0, max);
const html = (value: unknown) => clean(value, 500).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');

async function sendEmail(params: {
  apiKey: string;
  from: string;
  replyTo: string;
  to: string;
  subject: string;
  body: string;
  idempotencyKey: string;
}) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': params.idempotencyKey,
    },
    body: JSON.stringify({
      from: params.from,
      to: [params.to],
      reply_to: params.replyTo,
      subject: params.subject,
      html: params.body,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Resend: ${payload?.message || response.statusText}`);
  return payload;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return jsonResponse(req, { ok: false, error: 'Método no permitido.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const siteUrl = (Deno.env.get('TPL_SITE_URL') || 'https://www.parcelalista.cl').replace(/\/$/, '');
  const from = Deno.env.get('TPL_OWNER_EMAIL_FROM') || 'Tu Parcela Lista <propietarios@parcelalista.cl>';
  const replyTo = Deno.env.get('TPL_REPLY_TO') || 'tuparcelalista@gmail.com';

  if (!supabaseUrl || !serviceKey) return jsonResponse(req, { ok: false, error: 'Configuración Supabase incompleta.' }, 500);
  if (!resendKey) return jsonResponse(req, { ok: false, error: 'RESEND_API_KEY no configurada.' }, 500);

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let onboardingId: string | null = null;
  try {
    await consumeRateLimit(supabase, req, 'activar-propietario', 8, 3600);
    const body = await readJson(req, 16000) as Json;
    const publicacionId = clean(body.publicacion_id, 80);
    const requestedEmail = clean(body.email, 250).toLowerCase();
    if (!UUID_RE.test(publicacionId)) throw new Error('PUBLICACION_INVALIDA');
    if (!EMAIL_RE.test(requestedEmail)) throw new Error('CORREO_INVALIDO');

    const { data: publication, error: publicationError } = await supabase
      .from('tpl_publicaciones')
      .select('id,codigo,estado,publicador_actor_id,responsable_actor_id,datos,created_at')
      .eq('id', publicacionId)
      .single();
    if (publicationError || !publication) throw new Error('Publicación no encontrada.');

    const actorId = publication.responsable_actor_id || publication.publicador_actor_id;
    if (!actorId) throw new Error('La publicación no tiene propietario vinculado.');

    const { data: actor, error: actorError } = await supabase
      .from('tpl_actores')
      .select('id,nombre,email,telefono')
      .eq('id', actorId)
      .single();
    if (actorError || !actor) throw new Error('Propietario no encontrado.');
    const actorEmail = clean(actor.email, 250).toLowerCase();
    if (!actorEmail || actorEmail !== requestedEmail) throw new Error('El correo no coincide con la publicación.');

    const ageMs = Date.now() - new Date(publication.created_at).getTime();
    if (!Number.isFinite(ageMs) || ageMs > 7 * 24 * 60 * 60 * 1000) throw new Error('La ventana de activación automática expiró.');

    const { data: property } = await supabase
      .from('tpl_propiedades')
      .select('id,codigo,titulo,comuna,sector,superficie_m2,precio_publicado')
      .eq('publicacion_id', publicacionId)
      .maybeSingle();

    const { data: existing } = await supabase
      .from('tpl_onboarding_propietario')
      .select('*')
      .eq('publicacion_id', publicacionId)
      .maybeSingle();

    if (existing?.estado === 'completado') {
      return jsonResponse(req, { ok: true, already_completed: true, estado: 'completado', agenda_url: `${siteUrl}/plataforma/tpl-business/` });
    }
    if (existing && Number(existing.intentos || 0) >= 5) throw new Error('Se alcanzó el máximo de reintentos automáticos.');

    const { data: onboarding, error: upsertError } = await supabase
      .from('tpl_onboarding_propietario')
      .upsert({
        publicacion_id: publicacionId,
        propiedad_id: property?.id || null,
        actor_id: actorId,
        email: actorEmail,
        estado: 'procesando',
        intentos: Number(existing?.intentos || 0) + 1,
        ultimo_error: null,
        metadata: { origen: 'publicador_v2', codigo_publicacion: publication.codigo },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'publicacion_id' })
      .select('*')
      .single();
    if (upsertError || !onboarding) throw upsertError || new Error('No fue posible preparar la activación.');
    onboardingId = onboarding.id;

    const { data: freePlan, error: planError } = await supabase
      .from('tpl_planes_comerciales')
      .select('id,codigo,nombre')
      .eq('codigo', 'gratis')
      .eq('activo', true)
      .single();
    if (planError || !freePlan) throw new Error('Plan Gratis no disponible.');

    let subscriptionId = onboarding.suscripcion_id as string | null;
    if (!subscriptionId) {
      let subscriptionQuery = supabase.from('tpl_suscripciones').select('id')
        .eq('actor_id', actorId).eq('plan_id', freePlan.id).in('estado', ['activa', 'prueba']);
      subscriptionQuery = property?.id ? subscriptionQuery.eq('propiedad_id', property.id) : subscriptionQuery.is('propiedad_id', null);
      const { data: subscription } = await subscriptionQuery.maybeSingle();
      if (subscription?.id) subscriptionId = subscription.id;
      else {
        const { data: createdSubscription, error: subscriptionError } = await supabase
          .from('tpl_suscripciones')
          .insert({
            actor_id: actorId,
            propiedad_id: property?.id || null,
            plan_id: freePlan.id,
            estado: 'activa',
            metadata: { origen: 'onboarding_publicacion', publicacion_id: publicacionId },
          })
          .select('id').single();
        if (subscriptionError) throw subscriptionError;
        subscriptionId = createdSubscription.id;
      }
    }

    const redirectTo = `${siteUrl}/plataforma/tpl-business/`;
    let authUserId: string | null = onboarding.auth_user_id as string | null;
    let actionLink = '';
    let invitationKind = 'invite';

    const invite = await supabase.auth.admin.generateLink({
      type: 'invite',
      email: actorEmail,
      options: { redirectTo, data: { nombre: actor.nombre, actor_id: actorId, origen: 'publicador_gratis' } },
    });

    if (!invite.error && invite.data?.properties?.action_link) {
      actionLink = invite.data.properties.action_link;
      authUserId = invite.data.user?.id || null;
    } else {
      invitationKind = 'magiclink';
      const magic = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: actorEmail,
        options: { redirectTo },
      });
      if (magic.error || !magic.data?.properties?.action_link) {
        throw new Error(`No fue posible generar el acceso seguro: ${magic.error?.message || invite.error?.message || 'sin enlace'}`);
      }
      actionLink = magic.data.properties.action_link;
      authUserId = magic.data.user?.id || authUserId;
    }

    const name = html(actor.nombre || 'Propietario');
    const propertyName = html(property?.titulo || property?.codigo || publication.codigo || 'tu propiedad');
    const publicationCode = html(publication.codigo || publicacionId.slice(0, 8));
    const agendaUrl = `${siteUrl}/plataforma/tpl-business/`;

    let publicationEmailId = onboarding.correo_publicacion_id as string | null;
    if (onboarding.correo_publicacion_estado !== 'enviado') {
      const sent = await sendEmail({
        apiKey: resendKey,
        from,
        replyTo,
        to: actorEmail,
        subject: `Recibimos tu propiedad en Tu Parcela Lista · ${publicationCode}`,
        idempotencyKey: `tpl-publicacion-${publicacionId}`,
        body: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#17324d"><h2>Hola ${name}, recibimos tu propiedad</h2><p>La publicación de <strong>${propertyName}</strong> quedó registrada con el código <strong>${publicationCode}</strong>.</p><p>Ahora está en <strong>revisión TPL</strong>. Revisaremos los antecedentes, fotografías, tasación y preparación comercial antes de aprobarla.</p><div style="background:#f2f6f9;padding:16px;border-radius:10px"><strong>Estado actual:</strong> Pendiente de revisión<br><strong>Plan:</strong> Publicación Gratis</div><p>Te avisaremos por correo cuando sea aprobada o cuando necesitemos confirmar algún antecedente.</p><p><a href="${agendaUrl}" style="display:inline-block;background:#0b395d;color:white;padding:12px 18px;border-radius:8px;text-decoration:none">Abrir Mi Propiedad TPL</a></p><p>Equipo Tu Parcela Lista</p></div>`,
      });
      publicationEmailId = sent.id || null;
    }

    let welcomeEmailId = onboarding.correo_bienvenida_id as string | null;
    if (onboarding.correo_bienvenida_estado !== 'enviado') {
      const sent = await sendEmail({
        apiKey: resendKey,
        from,
        replyTo,
        to: actorEmail,
        subject: 'Tu Agenda Virtual del Propietario ya está disponible',
        idempotencyKey: `tpl-bienvenida-${publicacionId}`,
        body: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#17324d"><h2>Bienvenido a Mi Propiedad TPL</h2><p>Activamos tu <strong>Plan Gratis</strong> para administrar ${propertyName}.</p><ul><li>1 publicación activa</li><li>Agenda Virtual del Propietario</li><li>Estadísticas básicas</li><li>1 edición posterior gratuita</li><li>Recepción y seguimiento de consultas</li></ul><p>Usa el siguiente enlace seguro para ${invitationKind === 'invite' ? 'crear tu acceso' : 'ingresar'}:</p><p><a href="${actionLink}" style="display:inline-block;background:#f2b705;color:#17324d;padding:13px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Entrar a Mi Propiedad TPL</a></p><p style="font-size:12px;color:#607080">Por seguridad, no compartas este enlace. Si expira, puedes solicitar uno nuevo desde la pantalla de acceso.</p><p>Equipo Tu Parcela Lista</p></div>`,
      });
      welcomeEmailId = sent.id || null;
    }

    try {
      await supabase.from('tpl_notificaciones_actor').insert([
        {
          actor_id: actorId,
          propiedad_id: property?.id || null,
          tipo: 'publicacion',
          titulo: 'Publicación recibida',
          mensaje: `La publicación ${publication.codigo || ''} está pendiente de revisión TPL.`,
          accion_url: '/plataforma/tpl-business/',
          metadata: { publicacion_id: publicacionId },
        },
        {
          actor_id: actorId,
          propiedad_id: property?.id || null,
          tipo: 'cuenta',
          titulo: 'Plan Gratis activado',
          mensaje: 'Tu Agenda Virtual del Propietario ya está disponible.',
          accion_url: '/plataforma/tpl-business/',
          metadata: { plan: 'gratis', suscripcion_id: subscriptionId },
        },
      ]);
    } catch (notificationError) {
      console.warn('No fue posible crear notificaciones internas.', notificationError);
    }

    await supabase.from('tpl_onboarding_propietario').update({
      auth_user_id: authUserId,
      suscripcion_id: subscriptionId,
      estado: 'completado',
      correo_publicacion_estado: 'enviado',
      correo_bienvenida_estado: 'enviado',
      correo_publicacion_id: publicationEmailId,
      correo_bienvenida_id: welcomeEmailId,
      invitacion_enviada_at: new Date().toISOString(),
      completado_at: new Date().toISOString(),
      ultimo_error: null,
      updated_at: new Date().toISOString(),
    }).eq('id', onboarding.id);

    try {
      await supabase.from('tpl_eventos').insert({
        actor_id: actorId,
        propiedad_id: property?.id || null,
        evento: 'propietario_gratis_activado',
        categoria: 'onboarding',
        origen: 'edge_function',
        prioridad: 'media',
        descripcion: 'Plan Gratis, acceso e invitaciones del propietario activados.',
        metadata: { publicacion_id: publicacionId, suscripcion_id: subscriptionId, auth_user_id: authUserId },
      });
    } catch (eventError) {
      console.warn('No fue posible registrar el evento de onboarding.', eventError);
    }

    return jsonResponse(req, {
      ok: true,
      estado: 'completado',
      publicacion_id: publicacionId,
      propiedad_id: property?.id || null,
      actor_id: actorId,
      plan: 'gratis',
      agenda_url: agendaUrl,
      correos_enviados: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No fue posible activar al propietario.';
    console.error('activar-propietario-gratis:', error);
    if (onboardingId) {
      try {
        await supabase.from('tpl_onboarding_propietario').update({
          estado: 'error',
          ultimo_error: message.slice(0, 1000),
          updated_at: new Date().toISOString(),
        }).eq('id', onboardingId);
      } catch (updateError) {
        console.warn('No fue posible registrar el error de onboarding.', updateError);
      }
    }
    return jsonResponse(req, { ok: false, error: publicError(error) }, 400);
  }
});
