-- Tu Parcela Lista
-- Avisar al propietario/corredor cuando llega un interesado
-- Fecha: 2026-09-03
--
-- QUÉ HACE
--   Hoy, cuando alguien deja una consulta pública (tpl_registrar_oportunidad_
--   publica_v1 -> tpl_oportunidades), esa consulta queda visible solo en el
--   CRM interno. El propietario o corredor dueño de la ficha no se entera a
--   menos que un ejecutivo TPL revise el CRM y decida avisarle por fuera del
--   sistema. Este archivo agrega un trigger que, cuando la oportunidad trae
--   el código de una parcela publicada (metadata->>'parcela_codigo'),
--   encola automáticamente un correo real al dueño de esa ficha usando la
--   cola tpl_comunicaciones_cola / procesar-comunicaciones que YA existe y
--   ya funciona en el proyecto (no se inventa infraestructura nueva).
--
-- SOBRE WHATSAPP
--   El proyecto no tiene una cuenta de WhatsApp Business API: no es posible
--   enviar un WhatsApp automático real. Lo que sí se puede, y se hace aquí,
--   es incluir en el correo un botón "Responder por WhatsApp" que abre un
--   chat directo con el interesado (wa.me) cuando dejó teléfono, para que
--   el propietario responda en un clic apenas lee el correo.
--
-- TABLAS AFECTADAS
--   Ninguna se altera. Se agrega un trigger AFTER INSERT sobre
--   tpl_oportunidades y una función asociada.
--
-- RIESGOS
--   Bajo. Si no se puede resolver la propiedad o su dueño, el trigger no
--   hace nada (no bloquea el insert original). Toda excepción interna se
--   atrapa para no romper el registro de la oportunidad.

create or replace function public.tpl_notificar_interes_propiedad()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_codigo_parcela text;
  v_propiedad record;
  v_actor record;
  v_wa_link text;
begin
  begin
    v_codigo_parcela := nullif(trim(coalesce(new.metadata->>'parcela_codigo','')), '');
    if v_codigo_parcela is null then
      return new;
    end if;

    select id, codigo, titulo, comuna, propietario_actor_id, corredor_actor_id
      into v_propiedad
      from public.tpl_propiedades
     where codigo = v_codigo_parcela
     limit 1;

    if v_propiedad.id is null then
      return new;
    end if;

    -- Prioriza al corredor si la ficha tiene uno asignado; si no, al propietario.
    select id, nombre, email
      into v_actor
      from public.tpl_actores
     where id = coalesce(v_propiedad.corredor_actor_id, v_propiedad.propietario_actor_id)
     limit 1;

    if v_actor.id is null or coalesce(v_actor.email,'') = '' then
      return new;
    end if;

    if coalesce(new.telefono,'') <> '' then
      v_wa_link := 'https://wa.me/' || regexp_replace(new.telefono, '\D', '', 'g')
        || '?text=' || replace(coalesce('Hola ' || new.nombre_contacto || ', te escribo por tu consulta en Tu Parcela Lista sobre ' || coalesce(v_propiedad.titulo, v_propiedad.codigo), ''), ' ', '%20');
    end if;

    insert into public.tpl_comunicaciones_cola(actor_id, canal, destinatario, plantilla, asunto, payload)
    values (
      v_actor.id,
      'email',
      v_actor.email,
      'interes_propiedad_recibido',
      'Alguien se interesó en ' || coalesce(v_propiedad.titulo, v_propiedad.codigo),
      jsonb_build_object(
        'nombre', v_actor.nombre,
        'propiedad', coalesce(v_propiedad.titulo, v_propiedad.codigo),
        'codigo', v_propiedad.codigo,
        'comuna', v_propiedad.comuna,
        'interesado_nombre', new.nombre_contacto,
        'interesado_email', new.email,
        'interesado_telefono', new.telefono,
        'mensaje', new.mensaje,
        'tipo_consulta', new.tipo,
        'wa_link', v_wa_link,
        'idempotency_key', 'interes-oportunidad-' || new.id::text
      )
    )
    on conflict do nothing;
  exception when others then
    -- Nunca debe impedir que se registre la oportunidad del interesado.
    raise warning 'tpl_notificar_interes_propiedad: %', sqlerrm;
  end;

  return new;
end;
$$;

drop trigger if exists tpl_oportunidades_notificar_interes on public.tpl_oportunidades;
create trigger tpl_oportunidades_notificar_interes
  after insert on public.tpl_oportunidades
  for each row execute function public.tpl_notificar_interes_propiedad();
