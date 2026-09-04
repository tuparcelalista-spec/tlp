// Envía al cliente el resumen de su cotización con un botón para pedir el
// inicio del proyecto. El botón lleva un token de un solo uso lógico que la
// página pública canjea contra tpl_confirmar_comienzo_proyecto_v1.
import { Resend } from 'npm:resend@3';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeadersFor, jsonResponseFor } from '../_shared/cors.ts';
import { consumeRateLimit, publicError, readJson, EMAIL_RE } from '../_shared/security.ts';

const SITIO = 'https://www.parcelalista.cl';

function esc(v: unknown) {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const clp = (n: unknown) => {
  const v = Number(n) || 0;
  return '$' + v.toLocaleString('es-CL', { maximumFractionDigits: 0 });
};

/** Fila del desglose. Solo se pinta si hay monto. */
function fila(concepto: string, detalle: string, monto: number) {
  if (!monto) return '';
  return `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #e6edf3;">
        <span style="color:#173e5c;font-weight:600;">${esc(concepto)}</span>
        ${detalle ? `<br><span style="color:#66788a;font-size:13px;">${esc(detalle)}</span>` : ''}
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #e6edf3;text-align:right;color:#173e5c;font-weight:700;white-space:nowrap;">
        ${clp(monto)}
      </td>
    </tr>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeadersFor(req) });
  if (req.method !== 'POST') return jsonResponseFor(req, { ok: false, error: 'METODO_NO_PERMITIDO' }, 405);

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY') || '';
    if (!resendApiKey) throw new Error('CONFIGURACION_INCOMPLETA');

    const body = await readJson(req, 24_000);
    const nombre = String(body?.nombre || '').trim().slice(0, 120);
    const email = String(body?.email || '').trim().toLowerCase();
    const token = String(body?.token || '').trim();
    const p = body?.proyecto || {};

    if (nombre.length < 2) throw new Error('NOMBRE_INVALIDO');
    if (!EMAIL_RE.test(email)) throw new Error('CORREO_INVALIDO');
    if (token.length < 20) throw new Error('TOKEN_INVALIDO');

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    await consumeRateLimit(supabase, req, 'enviar-resumen-cotizacion', 6, 600, email);

    const parcela = p?.parcela || {};
    const vivienda = p?.vivienda || {};
    const precios = p?.precios || {};
    const extras: Array<Record<string, unknown>> = Array.isArray(p?.extras) ? p.extras : [];

    const superficieCasa = Number(vivienda?.m2) || 0;
    const filasExtras = extras
      .filter((e) => Number(e?.precio) > 0)
      .map((e) => fila(String(e?.nombre || 'Obra adicional'), String(e?.detalle || ''), Number(e?.precio)))
      .join('');

    const enlaceComenzar = `${SITIO}/comenzar-proyecto.html?t=${encodeURIComponent(token)}`;

    const html = `
<div style="background:#eef3f7;padding:24px 0;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #dce5ed;">

    <div style="background:#073a5a;padding:26px 28px;">
      <div style="color:#ffffff;font-size:20px;font-weight:700;">Tu Parcela Lista</div>
      <div style="color:#a8c6db;font-size:13px;margin-top:4px;letter-spacing:.08em;">RESUMEN DE TU PROYECTO</div>
    </div>

    <div style="padding:28px;">
      <p style="margin:0 0 6px;color:#173e5c;font-size:18px;font-weight:700;">Hola ${esc(nombre)},</p>
      <p style="margin:0 0 22px;color:#5b6b7c;font-size:15px;line-height:1.6;">
        Este es el resumen del proyecto que armaste. Los valores son referenciales:
        la instalación, el traslado, los permisos y las condiciones del terreno se
        confirman antes de contratar.
      </p>

      ${parcela?.nombre ? `
      <div style="background:#f6f9fb;border:1px solid #e0e9f0;border-radius:12px;padding:16px;margin-bottom:20px;">
        <div style="color:#66788a;font-size:12px;letter-spacing:.1em;font-weight:700;">TU PARCELA</div>
        <div style="color:#173e5c;font-size:16px;font-weight:700;margin-top:5px;">${esc(parcela.nombre)}</div>
        <div style="color:#66788a;font-size:13px;margin-top:3px;">
          ${esc(parcela.comuna || '')}${parcela.superficieM2 ? ` · ${Number(parcela.superficieM2).toLocaleString('es-CL')} m²` : ''}
        </div>
      </div>` : ''}

      <table style="width:100%;border-collapse:collapse;font-size:15px;">
        ${fila('Parcela', String(parcela?.comuna || ''), Number(precios?.parcel))}
        ${fila('Vivienda', vivienda?.nombre ? `${vivienda.nombre}${superficieCasa ? ` · ${superficieCasa} m²` : ''}` : '', Number(precios?.house))}
        ${fila('Fundación', String(p?.fundacion?.name || ''), Number(precios?.foundation))}
        ${filasExtras}
        <tr>
          <td style="padding:16px 0 0;color:#073a5a;font-size:17px;font-weight:800;">Total estimado</td>
          <td style="padding:16px 0 0;text-align:right;color:#073a5a;font-size:19px;font-weight:800;white-space:nowrap;">
            ${clp(precios?.total)}
          </td>
        </tr>
      </table>

      <div style="margin:30px 0 10px;text-align:center;">
        <a href="${esc(enlaceComenzar)}"
           style="display:inline-block;background:#db5b24;color:#ffffff;text-decoration:none;
                  padding:16px 30px;border-radius:10px;font-size:16px;font-weight:700;">
          Contactarme para empezar proyecto
        </a>
      </div>
      <p style="margin:0;text-align:center;color:#8b9aa8;font-size:13px;">
        Al pulsar, un asesor TPL te contacta para dar el primer paso.
      </p>
    </div>

    <div style="background:#f6f9fb;padding:18px 28px;border-top:1px solid #e6edf3;">
      <p style="margin:0;color:#8b9aa8;font-size:12px;line-height:1.6;">
        Recibes este correo porque solicitaste tu cotización en Tu Parcela Lista.
        Si no fuiste tú, puedes ignorarlo.
      </p>
    </div>

  </div>
</div>`;

    const resend = new Resend(resendApiKey);
    const envio = await resend.emails.send({
      from: Deno.env.get('TPL_EMAIL_FROM') || 'Tu Parcela Lista <partners@parcelalista.cl>',
      to: [email],
      reply_to: Deno.env.get('TPL_REPLY_TO') || 'tuparcelalista@gmail.com',
      subject: `Tu proyecto en ${parcela?.comuna || 'tu parcela'} — ${clp(precios?.total)}`,
      html,
    });

    if ((envio as { error?: unknown })?.error) {
      console.error('Resend error:', (envio as { error?: unknown }).error);
      throw new Error('ENVIO_FALLIDO');
    }

    return jsonResponseFor(req, { ok: true });
  } catch (error) {
    return jsonResponseFor(req, { ok: false, error: publicError(error) }, 400);
  }
});
