import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const BUCKET = 'tpl-propiedades-propietario';
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX = 8 * 1024 * 1024;

// Ventana durante la que se aceptan fotos de una publicación recién creada.
// Quien acaba de publicar sube sus fotos en el momento; pasado ese rato, el
// par de identificadores deja de servir para subir nada.
const VENTANA_PUBLICACION_MIN = 120;
const MAX_FOTOS_POR_PROPIEDAD = 20;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const urlPublica = (path: string) =>
  `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/${BUCKET}/${path}`;

// Confirma que quien llama es staff del CRM, usando SU PROPIO token (no el
// service role) para que auth.uid() dentro de tpl_es_staff() sea el usuario
// real. Se usa para las tres acciones que el editor del CRM puede pedir:
// subir una foto a mano, eliminarla, o marcarla como portada.
async function verificarStaff(req: Request): Promise<boolean> {
  const auth = req.headers.get('Authorization') || '';
  const jwt = auth.replace(/^Bearer\s+/i, '').trim();
  if (!jwt) return false;
  try {
    const asUser = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false },
    });
    const { data: esStaff } = await asUser.rpc('tpl_es_staff');
    return esStaff === true;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    if (req.method !== 'POST') return json({ ok: false, error: 'METODO_NO_PERMITIDO' }, 405);

    const form = await req.formData();
    const accion = String(form.get('accion') || 'subir').trim();

    const url = Deno.env.get('SUPABASE_URL')!;
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const sb = createClient(url, key, { auth: { persistSession: false } });

    // ------------------------------------------------------------------
    // Eliminar / marcar portada: solo staff del CRM, sobre una foto que ya
    // está guardada. No requieren token de propietario ni ventana de
    // publicación porque quien pide esto ya pasó por el login del CRM.
    // ------------------------------------------------------------------
    if (accion === 'eliminar' || accion === 'portada') {
      if (!(await verificarStaff(req))) throw new Error('NO_AUTORIZADO');

      const imagenId = String(form.get('imagen_id') || '').trim();
      if (!imagenId) throw new Error('DATOS_INVALIDOS');

      const { data: imagen, error: imgErr } = await sb
        .from('tpl_propiedad_imagenes')
        .select('id,propiedad_id,storage_path')
        .eq('id', imagenId)
        .maybeSingle();
      if (imgErr) throw imgErr;
      if (!imagen) throw new Error('FOTO_NO_ENCONTRADA');

      if (accion === 'eliminar') {
        if (imagen.storage_path) {
          await sb.storage.from(BUCKET).remove([imagen.storage_path]);
        }
        const { data: borradas, error: delErr } = await sb
          .from('tpl_propiedad_imagenes')
          .delete()
          .eq('id', imagenId)
          .select('id');
        if (delErr) throw delErr;
        if (!borradas?.length) throw new Error('NO_SE_PUDO_ELIMINAR');
        return json({ ok: true });
      }

      // portada: solo una foto por propiedad puede quedar marcada.
      const { error: limpiarErr } = await sb
        .from('tpl_propiedad_imagenes')
        .update({ es_portada: false })
        .eq('propiedad_id', imagen.propiedad_id);
      if (limpiarErr) throw limpiarErr;

      const { data: marcada, error: marcarErr } = await sb
        .from('tpl_propiedad_imagenes')
        .update({ es_portada: true })
        .eq('id', imagenId)
        .select('id');
      if (marcarErr) throw marcarErr;
      if (!marcada?.length) throw new Error('NO_SE_PUDO_MARCAR');
      return json({ ok: true });
    }

    // ------------------------------------------------------------------
    // Subir (comportamiento por defecto, compatible con lo anterior).
    // ------------------------------------------------------------------
    const token = String(form.get('token') || '').trim();
    const publicacionId = String(form.get('publicacion_id') || '').trim();
    const propiedadIdEntrada = String(form.get('propiedad_id') || '').trim();
    const file = form.get('file');

    if (!(file instanceof File)) throw new Error('DATOS_INVALIDOS');
    if (!ALLOWED.has(file.type) || file.size <= 0 || file.size > MAX) throw new Error('ARCHIVO_NO_PERMITIDO');

    let propertyId = '';

    if (token) {
      // Vía original: el propietario entra con el enlace que le enviamos.
      const { data: ctx, error: ctxErr } = await sb.rpc('tpl_propietario_contexto_proceso_v1', { p_token: token });
      if (ctxErr || !ctx?.ok) throw new Error(ctx?.error || ctxErr?.message || 'ENLACE_INVALIDO_O_VENCIDO');
      propertyId = String(ctx.propiedad.id);
    } else if (publicacionId && propiedadIdEntrada) {
      // Vía publicador: alguien acaba de publicar y todavía no tiene enlace
      // de propietario. Los dos identificadores los devuelve
      // tpl_publicar_propiedad_v3 únicamente a quien hizo la publicación.
      const { data: prop, error: propErr } = await sb
        .from('tpl_propiedades')
        .select('id,publicacion_id,estado')
        .eq('id', propiedadIdEntrada)
        .maybeSingle();
      if (propErr) throw propErr;
      if (!prop || prop.publicacion_id !== publicacionId) throw new Error('PUBLICACION_NO_CORRESPONDE');

      const { data: pub, error: pubErr } = await sb
        .from('tpl_publicaciones')
        .select('id,estado,created_at')
        .eq('id', publicacionId)
        .maybeSingle();
      if (pubErr) throw pubErr;
      if (!pub) throw new Error('PUBLICACION_NO_ENCONTRADA');
      if (pub.estado !== 'pendiente_revision') throw new Error('PUBLICACION_YA_REVISADA');

      const minutos = (Date.now() - new Date(pub.created_at).getTime()) / 60000;
      if (minutos > VENTANA_PUBLICACION_MIN) throw new Error('VENTANA_DE_CARGA_VENCIDA');

      propertyId = String(prop.id);
    } else if (propiedadIdEntrada) {
      // Vía staff del CRM: alguien del equipo está completando fotos a
      // mano desde el editor de la parcela (no tiene token ni acaba de
      // publicar; puede ser cualquier propiedad en cualquier estado).
      if (!(await verificarStaff(req))) throw new Error('DATOS_INVALIDOS');
      propertyId = propiedadIdEntrada;
    } else {
      throw new Error('DATOS_INVALIDOS');
    }

    const { count, error: cntErr } = await sb
      .from('tpl_propiedad_imagenes')
      .select('id', { count: 'exact', head: true })
      .eq('propiedad_id', propertyId);
    if (cntErr) throw cntErr;
    if ((count ?? 0) >= MAX_FOTOS_POR_PROPIEDAD) throw new Error('DEMASIADAS_FOTOS');

    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const clean = (file.name || 'foto').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 80);
    const path = `${propertyId}/${crypto.randomUUID()}-${clean.replace(/\.[^.]+$/, '')}.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    const { error: upErr } = await sb.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: file.type, upsert: false, cacheControl: '3600' });
    if (upErr) throw upErr;

    const { data: imageId, error: regErr } = await sb.rpc('tpl_registrar_foto_propietario_v1', {
      p_propiedad_id: propertyId,
      p_storage_path: path,
      p_metadata: {
        nombre_original: file.name,
        tipo: file.type,
        size: file.size,
        // `origen` no sirve aquí: tpl_registrar_foto_propietario_v1 lo
        // sobrescribe con 'link_propietario' al fusionar la metadata. Se usa
        // otra clave para poder distinguir de dónde vino la foto.
        origen_carga: token ? 'link_propietario' : (publicacionId ? 'publicador' : 'crm_staff'),
      },
    });
    if (regErr) {
      await sb.storage.from(BUCKET).remove([path]);
      throw regErr;
    }

    return json({ ok: true, image_id: imageId, storage_path: path, url: urlPublica(path) });
  } catch (e) {
    console.error(e);
    return json({ ok: false, error: e instanceof Error ? e.message : 'ERROR_INTERNO' }, 400);
  }
});
