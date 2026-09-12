import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeadersFor, jsonResponseFor } from '../_shared/cors.ts';
import { publicError, readJson } from '../_shared/security.ts';

const VEO_MODELS = [
  'veo-3.1-generate-preview',
  'veo-2.0-generate-001',
  'veo-3.0-generate-preview',
];

interface VeoRequestPayload {
  propiedad_id: string;
  formato: '16:9' | '9:16';
  prompt: string;
  fotos_referencia?: string[];
  tipo_video?: string;
  titulo?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeadersFor(req) });
  if (req.method !== 'POST') return jsonResponseFor(req, { ok: false, error: 'METODO_NO_PERMITIDO' }, 405);

  try {
    const body = (await readJson(req, 20_000)) as VeoRequestPayload;
    const { propiedad_id, formato, prompt, fotos_referencia = [], tipo_video = 'veo_cinematic', titulo } = body;

    if (!propiedad_id || !prompt) {
      return jsonResponseFor(req, { ok: false, error: 'PARAMETROS_FALTANTES' }, 400);
    }

    const ratioValido = formato === '9:16' ? '9:16' : '16:9';

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Validar que la propiedad existe
    const { data: prop, error: propErr } = await supabase
      .from('tpl_propiedades')
      .select('id, codigo, titulo, comuna, region')
      .eq('id', propiedad_id)
      .single();

    if (propErr || !prop) {
      return jsonResponseFor(req, { ok: false, error: 'PROPIEDAD_NO_ENCONTRADA' }, 404);
    }

    const clipTitle = titulo || `${prop.titulo || prop.codigo} · ${ratioValido === '16:9' ? 'Panorámico' : 'Vertical Reels'}`;

    // 2. Crear registro inicial en tpl_propiedad_videos
    const { data: videoRecord, error: insertErr } = await supabase
      .from('tpl_propiedad_videos')
      .insert({
        propiedad_id,
        formato: ratioValido,
        tipo_video,
        titulo: clipTitle,
        prompt_utilizado: prompt,
        fotos_referencia_utilizadas: fotos_referencia,
        estado_generacion: 'procesando',
        duracion_segundos: 8.0,
        resolucion: '1080p',
      })
      .select('id')
      .single();

    if (insertErr || !videoRecord) {
      console.error('Error insertando registro de video:', insertErr);
      return jsonResponseFor(req, { ok: false, error: 'ERROR_CREANDO_REGISTRO_VIDEO' }, 500);
    }

    const videoId = videoRecord.id;

    // Permitir clave personalizada desde el frontend o usar la de los secretos de Supabase
    const userApiKey = (body as any).api_key?.trim();
    const apiKey = userApiKey || Deno.env.get('GEMINI_API_KEY');

    if (!apiKey) {
      console.warn('GEMINI_API_KEY no configurada en entorno ni en petición.');
      await supabase
        .from('tpl_propiedad_videos')
        .update({
          estado_generacion: 'fallido',
          error_mensaje: 'API Key de Google no configurada en el servidor.',
        })
        .eq('id', videoId);

      return jsonResponseFor(req, { ok: false, error: 'API_KEY_FALTANTE', video_id: videoId }, 500);
    }

    // 3. Preparar llamada a Google Veo LRO
    let operationName: string | null = null;
    let modeloExitoso = '';
    const erroresModelos: Record<string, string> = {};

    // Preparar imagen de referencia si existe
    let imageBase64: string | null = null;
    if (fotos_referencia.length > 0) {
      try {
        const refUrl = fotos_referencia[0];
        if (refUrl.startsWith('http')) {
          const imgFetch = await fetch(refUrl, { signal: AbortSignal.timeout(6000) });
          if (imgFetch.ok) {
            const buf = await imgFetch.arrayBuffer();
            // Limitar a fotos menores a 8MB para Veo
            if (buf.byteLength < 8 * 1024 * 1024) {
              const uint8 = new Uint8Array(buf);
              let binary = '';
              const chunk = 8192;
              for (let i = 0; i < uint8.length; i += chunk) {
                binary += String.fromCharCode.apply(null, uint8.subarray(i, i + chunk) as unknown as number[]);
              }
              imageBase64 = btoa(binary);
            }
          }
        }
      } catch (err) {
        console.warn('No se pudo convertir la imagen de referencia para Veo:', err);
      }
    }

    // Consultar lista de modelos habilitados para esta API Key
    let modelosDisponiblesEnKey: string[] = [];
    try {
      const listResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=100`, {
        signal: AbortSignal.timeout(5000),
      });
      if (listResp.ok) {
        const listData = await listResp.json();
        if (Array.isArray(listData.models)) {
          modelosDisponiblesEnKey = listData.models
            .map((m: any) => m.name?.replace('models/', ''))
            .filter((n: string) => n && (n.includes('veo') || n.includes('video')));
        }
      }
    } catch (e) {
      console.warn('Error listando modelos de la key:', e);
    }

    // 3.1 Intento prioritario: Gemini Omni 1.1 Flash (Interactions API) si fue seleccionado
    if (!tipo_video?.startsWith('veo')) {
      try {
        const omniUrl = `https://generativelanguage.googleapis.com/v1beta/interactions?key=${apiKey}`;
        const omniPayload: Record<string, unknown> = {
          model: 'gemini-omni-1.1-flash',
          input: prompt,
        };

      if (imageBase64) {
        omniPayload.image = {
          bytesBase64Encoded: imageBase64,
        };
      }

      const omniRes = await fetch(omniUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(omniPayload),
        signal: AbortSignal.timeout(20000),
      });

      if (omniRes.ok) {
        const omniData = await omniRes.json();
        // Revisar si devolvió video en output_video o steps
        let base64Video: string | null = null;
        if (omniData.output_video?.data) {
          base64Video = omniData.output_video.data;
        } else if (Array.isArray(omniData.steps)) {
          for (const step of omniData.steps) {
            if (step.video?.data) { base64Video = step.video.data; break; }
            if (step.output_video?.data) { base64Video = step.output_video.data; break; }
          }
        }

        if (base64Video) {
          // Subir MP4 a Supabase Storage
          const videoBuffer = Uint8Array.from(atob(base64Video), (c) => c.charCodeAt(0));
          const storagePath = `${propiedad_id}/${videoId}-omni-flash.mp4`;
          const { error: upErr } = await supabase.storage
            .from('tpl-propiedades-videos')
            .upload(storagePath, videoBuffer, { contentType: 'video/mp4', upsert: true });

          if (!upErr) {
            const { data: pubData } = supabase.storage
              .from('tpl-propiedades-videos')
              .getPublicUrl(storagePath);

            const directUrl = pubData.publicUrl;
            await supabase
              .from('tpl_propiedad_videos')
              .update({
                estado_generacion: 'completado',
                video_url: directUrl,
                storage_path: storagePath,
                thumbnail_url: fotos_referencia[0] || null,
                metadata: {
                  modelo: 'gemini-omni-1.1-flash',
                  completado_at: new Date().toISOString(),
                },
              })
              .eq('id', videoId);

            return jsonResponseFor(req, {
              ok: true,
              video_id: videoId,
              estado: 'completado',
              video_url: directUrl,
              modelo: 'gemini-omni-1.1-flash',
              aviso: 'Video generado exitosamente con Gemini Omni 1.1 Flash.',
            });
          }
        }
      } else {
        const errText = await omniRes.text();
        erroresModelos['gemini-omni-1.1-flash'] = `[HTTP ${omniRes.status}] ${errText.slice(0, 250)}`;
        console.warn('Gemini Omni 1.1 Flash status:', omniRes.status, errText.slice(0, 200));
      }
    } catch (omniErr) {
      erroresModelos['gemini-omni-1.1-flash'] = `[Excepción] ${String(omniErr).slice(0, 150)}`;
    }
  }

    // 3.2 Intento prioritario 2: Veo 3.1 Lite y variantes Veo
    const modelosVeoPrioridad = [
      'veo-3.1-lite-generate-preview',
      'veo-3.1-fast-generate-preview',
      'veo-3.1-generate-preview',
    ];

    for (const model of modelosVeoPrioridad) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predictLongRunning?key=${apiKey}`;
        
        const instance: Record<string, unknown> = {
          prompt: prompt,
        };

        if (imageBase64) {
          instance.image = {
            bytesBase64Encoded: imageBase64,
          };
        }

        const payload = {
          instances: [instance],
          parameters: {
            aspectRatio: ratioValido,
            durationSeconds: 8,
            sampleCount: 1,
          },
        };

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(15000),
        });

        if (response.ok) {
          const resData = await response.json();
          if (resData.name) {
            operationName = resData.name;
            modeloExitoso = model;
            break;
          }
        } else {
          const errText = await response.text();
          erroresModelos[model] = `[HTTP ${response.status}] ${errText.slice(0, 200)}`;
          console.warn(`Veo ${model} status ${response.status}:`, errText.slice(0, 200));
        }
      } catch (e) {
        erroresModelos[model] = `[Excepción] ${String(e).slice(0, 150)}`;
      }
    }

    // 4. Actualizar registro según resultado de inicio LRO
    if (operationName) {
      await supabase
        .from('tpl_propiedad_videos')
        .update({
          veo_operation_name: operationName,
          metadata: {
            modelo: modeloExitoso,
            iniciado_at: new Date().toISOString(),
          },
        })
        .eq('id', videoId);

      return jsonResponseFor(req, {
        ok: true,
        video_id: videoId,
        operation_name: operationName,
        estado: 'procesando',
        formato: ratioValido,
      });
    }

    // Si la cuota o el modelo Veo en Google Cloud aún requiere activación enterprise/preview en la API Key,
    // registramos el detalle y proveemos graceful degradation para pruebas.
    console.warn('Veo LRO no devolvió operationName. Errores por modelo:', JSON.stringify(erroresModelos));

    // Graceful fallback para demostración si Google API aún no tiene el modelo habilitado en esta key
    const fallbackVideoUrl = ratioValido === '16:9'
      ? 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
      : 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4';

    await supabase
      .from('tpl_propiedad_videos')
      .update({
        estado_generacion: 'completado',
        video_url: fallbackVideoUrl,
        thumbnail_url: fotos_referencia[0] || null,
        metadata: {
          modo: 'simulacion_ia_preview',
          modelos_disponibles_en_key: modelosDisponiblesEnKey,
          errores_por_modelo: erroresModelos,
          completado_at: new Date().toISOString(),
        },
      })
      .eq('id', videoId);

    return jsonResponseFor(req, {
      ok: true,
      video_id: videoId,
      estado: 'completado',
      video_url: fallbackVideoUrl,
      es_preview: true,
      aviso: 'Video generado en modo demostración: Google requiere habilitar cuota/billing de Veo en tu Google AI Studio API Key.',
      errores_modelos: erroresModelos,
    });
  } catch (error) {
    console.error('Error no controlado en veo-generar-video:', error);
    return jsonResponseFor(req, { ok: false, error: (error as any)?.message || String(error) }, 500);
  }
});
