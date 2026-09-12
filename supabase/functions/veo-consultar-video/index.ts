import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeadersFor, jsonResponseFor } from '../_shared/cors.ts';
import { publicError, readJson } from '../_shared/security.ts';

interface ConsultaPayload {
  video_id: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeadersFor(req) });
  if (req.method !== 'POST') return jsonResponseFor(req, { ok: false, error: 'METODO_NO_PERMITIDO' }, 405);

  try {
    const body = (await readJson(req, 10_000)) as ConsultaPayload;
    const { video_id } = body;

    if (!video_id) {
      return jsonResponseFor(req, { ok: false, error: 'VIDEO_ID_REQUERIDO' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Obtener registro de video
    const { data: video, error: vErr } = await supabase
      .from('tpl_propiedad_videos')
      .select('*')
      .eq('id', video_id)
      .single();

    if (vErr || !video) {
      return jsonResponseFor(req, { ok: false, error: 'VIDEO_NO_ENCONTRADO' }, 404);
    }

    // 2. Si ya está completado o fallido, retornar de inmediato
    if (video.estado_generacion === 'completado') {
      return jsonResponseFor(req, {
        ok: true,
        video_id: video.id,
        estado: 'completado',
        video_url: video.video_url,
        thumbnail_url: video.thumbnail_url,
        publicado_en_parcela: video.publicado_en_parcela,
        duracion_segundos: video.duracion_segundos,
      });
    }

    if (video.estado_generacion === 'fallido') {
      return jsonResponseFor(req, {
        ok: false,
        video_id: video.id,
        estado: 'fallido',
        error: video.error_mensaje || 'Error en renderizado de video',
      });
    }

    // 3. Consultar estado en Google Veo si existe operación
    const operationName = video.veo_operation_name;
    const apiKey = Deno.env.get('GEMINI_API_KEY');

    if (!operationName || !apiKey) {
      return jsonResponseFor(req, {
        ok: true,
        video_id: video.id,
        estado: video.estado_generacion,
        video_url: video.video_url,
      });
    }

    const opUrl = `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${apiKey}`;
    const opRes = await fetch(opUrl, { signal: AbortSignal.timeout(8000) });

    if (!opRes.ok) {
      console.warn(`Error consultando operación Veo: ${opRes.status}`);
      return jsonResponseFor(req, {
        ok: true,
        video_id: video.id,
        estado: 'procesando',
      });
    }

    const opData = await opRes.json();

    // 4. Si aún no termina:
    if (!opData.done) {
      return jsonResponseFor(req, {
        ok: true,
        video_id: video.id,
        estado: 'procesando',
        progreso_estimado: opData.metadata?.progressPercent || null,
      });
    }

    // 5. Si falló en Google:
    if (opData.error) {
      const msg = opData.error.message || 'Fallo reportado por Google Veo';
      await supabase
        .from('tpl_propiedad_videos')
        .update({
          estado_generacion: 'fallido',
          error_mensaje: msg,
        })
        .eq('id', video.id);

      return jsonResponseFor(req, {
        ok: false,
        video_id: video.id,
        estado: 'fallido',
        error: msg,
      });
    }

    // 6. Operación completada: extraer video y persistir en Supabase Storage
    const sample = opData.response?.generatedSamples?.[0] || opData.response?.videos?.[0];
    const sourceUri = sample?.video?.uri || sample?.uri;

    let finalVideoUrl = sourceUri;
    let storagePath: string | null = null;

    if (sourceUri && sourceUri.startsWith('http')) {
      try {
        const vidFetch = await fetch(sourceUri);
        if (vidFetch.ok) {
          const vidBuffer = await vidFetch.arrayBuffer();
          storagePath = `${video.propiedad_id}/${video.id}.mp4`;

          const { error: upErr } = await supabase.storage
            .from('tpl-propiedades-videos')
            .upload(storagePath, vidBuffer, {
              contentType: 'video/mp4',
              upsert: true,
            });

          if (!upErr) {
            const { data: pubData } = supabase.storage
              .from('tpl-propiedades-videos')
              .getPublicUrl(storagePath);
            if (pubData?.publicUrl) {
              finalVideoUrl = pubData.publicUrl;
            }
          }
        }
      } catch (storageErr) {
        console.warn('Error subiendo video a Supabase Storage:', storageErr);
      }
    }

    // 7. Actualizar base de datos con video listo
    await supabase
      .from('tpl_propiedad_videos')
      .update({
        estado_generacion: 'completado',
        video_url: finalVideoUrl,
        storage_path: storagePath,
        updated_at: new Date().toISOString(),
      })
      .eq('id', video.id);

    return jsonResponseFor(req, {
      ok: true,
      video_id: video.id,
      estado: 'completado',
      video_url: finalVideoUrl,
    });
  } catch (error) {
    console.error('Error en veo-consultar-video:', error);
    return jsonResponseFor(req, { ok: false, error: publicError(error) }, 500);
  }
});
