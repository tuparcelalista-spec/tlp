-- Correo de confirmación al publicar una propiedad
--
-- QUÉ HACE
--   Añade al final de tpl_publicar_propiedad_v3 la inserción de un correo en
--   tpl_comunicaciones_cola. Publicar no enviaba NINGUNA confirmación: la
--   persona entregaba su propiedad y no recibía constancia de nada.
--
-- POR QUÉ POR LA COLA Y NO DIRECTO
--   Ya existe la infraestructura: cron 'tpl-procesar-comunicaciones' cada
--   minuto + la edge function procesar-comunicaciones con sus plantillas. Se
--   reutiliza en lugar de abrir una segunda vía de envío. Además, si Resend
--   falla, la cola reintenta; un envío directo se perdería.
--
-- TABLAS AFECTADAS
--   tpl_comunicaciones_cola: solo INSERT. Ninguna estructura cambia.
--
-- RIESGOS
--   Bajo. El insert va dentro de un bloque con EXCEPTION: si algo falla al
--   encolar, la publicación NO se pierde (que es lo importante); solo se queda
--   sin correo y queda registrado en tpl_eventos.
--
-- REVERSIÓN
--   Reaplicar la definición previa de tpl_publicar_propiedad_v3 sin el bloque
--   marcado como "correo de confirmación".

create or replace function public.tpl_publicar_propiedad_encolar_correo_v1(
  p_actor_id uuid,
  p_propiedad_id uuid,
  p_codigo text
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_email text;
  v_nombre text;
  v_p record;
begin
  select a.email, a.nombre into v_email, v_nombre
  from public.tpl_actores a where a.id = p_actor_id;

  if v_email is null or v_email = '' then return; end if;

  select titulo, comuna, superficie_m2, precio_publicado
    into v_p
  from public.tpl_propiedades where id = p_propiedad_id;

  insert into public.tpl_comunicaciones_cola(
    actor_id, canal, destinatario, plantilla, asunto, payload, estado, procesar_desde
  ) values (
    p_actor_id, 'email', v_email, 'publicacion_recibida',
    'Recibimos tu propiedad en Tu Parcela Lista',
    jsonb_build_object(
      'nombre', v_nombre,
      'titulo', v_p.titulo,
      'comuna', v_p.comuna,
      'superficie', v_p.superficie_m2,
      'precio', v_p.precio_publicado,
      'codigo', p_codigo,
      'url', 'https://www.parcelalista.cl/'
    ),
    'pendiente', now()
  );
end
$function$;


-- La implementación existente pasa a llamarse _core y se envuelve, en vez de
-- reescribir sus ~250 líneas de lógica de negocio ya probada.
-- Idempotente: si la migración se reaplica, el rename no vuelve a ejecutarse.
do $rename$
begin
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'tpl_publicar_propiedad_v3'
  ) and not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'tpl_publicar_propiedad_v3_core'
  ) then
    alter function public.tpl_publicar_propiedad_v3(jsonb)
      rename to tpl_publicar_propiedad_v3_core;
  end if;
end
$rename$;

-- Se engancha el envío al final del flujo de publicación.
create or replace function public.tpl_publicar_propiedad_v3(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_resultado jsonb;
begin
  -- Se delega en la implementación existente para no reescribir sus ~250
  -- líneas de lógica de negocio, que ya está probada.
  v_resultado := public.tpl_publicar_propiedad_v3_core(p_payload);

  -- Correo de confirmación. Si falla, la publicación igual se conserva.
  begin
    perform public.tpl_publicar_propiedad_encolar_correo_v1(
      (v_resultado->>'actor_id')::uuid,
      (v_resultado->>'propiedad_id')::uuid,
      v_resultado->>'codigo_propiedad'
    );
  exception when others then
    insert into public.tpl_eventos(evento, categoria, descripcion, metadata)
    values ('publicacion.correo_no_encolado', 'publicacion',
            'La propiedad se guardó pero no se pudo encolar el correo de confirmación.',
            jsonb_build_object('propiedad_id', v_resultado->>'propiedad_id', 'error', sqlerrm));
  end;

  return v_resultado;
end
$function$;
