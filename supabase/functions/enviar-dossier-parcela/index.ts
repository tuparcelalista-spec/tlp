import { Resend } from 'npm:resend@3';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeadersFor, jsonResponseFor } from '../_shared/cors.ts';
import { consumeRateLimit, publicError, readJson, EMAIL_RE } from '../_shared/security.ts';

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeadersFor(req) });
  if (req.method !== 'POST') return jsonResponseFor(req, { error: 'METODO_NO_PERMITIDO' }, 405);

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY') || '';
    if (!resendApiKey) throw new Error('CONFIGURACION_INCOMPLETA');

    const body = await readJson(req, 4_000);
    const name = String(body?.name || '').trim().slice(0, 120);
    const email = String(body?.email || '').trim().toLowerCase();
    const parcelId = String(body?.parcelId || '').trim().slice(0, 80);

    if (!name) throw new Error('NOMBRE_INVALIDO');
    if (!EMAIL_RE.test(email)) throw new Error('CORREO_INVALIDO');
    if (!parcelId) throw new Error('PUBLICACION_INVALIDA');

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    await consumeRateLimit(supabase, req, 'enviar-dossier-parcela', 5, 600, email);

    const resend = new Resend(resendApiKey);

    await resend.emails.send({
      from: 'Tu Parcela Lista <partners@parcelalista.cl>',
      to: [email],
      bcc: ['tuparcelalista@gmail.com'],
      reply_to: 'tuparcelalista@gmail.com',
      subject: `Dossier Premium de Inversión - Parcela ${parcelId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
            <h2>Hola ${escapeHtml(name)},</h2>
            <p>Gracias por solicitar el <strong>Dossier de Inversión Premium</strong> para la parcela <strong>${escapeHtml(parcelId)}</strong>.</p>
            <p>Hemos recibido tu solicitud exitosamente. Un analista de Tu Parcela Lista se pondrá en contacto contigo muy pronto (o te enviaremos el reporte PDF a este correo en las próximas horas) para que puedas revisar en detalle:</p>
            <ul>
              <li>El análisis de plusvalía a 5 años</li>
              <li>Factibilidad técnica de agua y luz</li>
              <li>El estudio topográfico preliminar</li>
            </ul>
            <p>Si tienes alguna consulta urgente, puedes comunicarte ahora mismo con nuestro experto escribiéndole a WhatsApp:</p>
            <br>
            <a href="https://wa.me/56988508361" style="background: #25D366; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Consultar por WhatsApp</a>
            <br><br>
            <hr style="border: 1px solid #e2e8f0;">
            <small style="color: #94a3b8;">El equipo de Tu Parcela Lista</small>
        </div>
      `,
    });

    return jsonResponseFor(req, { success: true });
  } catch (error) {
    console.error('enviar-dossier-parcela', error);
    return jsonResponseFor(req, { error: publicError(error) }, 400);
  }
});
