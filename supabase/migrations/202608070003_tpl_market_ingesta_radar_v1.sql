
-- ============================================================
-- TPL MARKET INTELLIGENCE v1.1
-- INGESTA + RADAR
-- 2026-08-07
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

-- 1) Normalizador simple reutilizando GEOINT si existe.
create or replace function public.tpl_market_normalizar_texto_v1(p_texto text)
returns text
language sql
immutable
as $$
  select trim(regexp_replace(
    translate(lower(coalesce(p_texto,'')),
      'áéíóúüñÁÉÍÓÚÜÑ',
      'aeiouunAEIOUUN'),
    '\s+',' ','g'
  ));
$$;

-- 2) Fingerprint básico de propiedad.
create or replace function public.tpl_market_fingerprint_v1(
  p_comuna text,
  p_sector text,
  p_superficie_m2 numeric,
  p_titulo text
)
returns text
language sql
immutable
set search_path=public,extensions
as $$
  select encode(
    extensions.digest(
      public.tpl_market_normalizar_texto_v1(coalesce(p_comuna,'')) || '|' ||
      public.tpl_market_normalizar_texto_v1(coalesce(p_sector,'')) || '|' ||
      coalesce(round(p_superficie_m2)::text,'') || '|' ||
      left(public.tpl_market_normalizar_texto_v1(coalesce(p_titulo,'')),120),
      'sha256'
    ),
    'hex'
  );
$$;

-- 3) Upsert actor + contactos públicos.
create or replace function public.tpl_market_upsert_actor_v1(
  p_fuente_codigo text,
  p_nombre text default null,
  p_empresa text default null,
  p_tipo_actor text default 'desconocido',
  p_telefono text default null,
  p_email text default null,
  p_url_origen text default null,
  p_oficina text default null,
  p_mls_agente_id text default null
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_actor_id uuid;
  v_fuente_id uuid;
  v_nombre_norm text := public.tpl_market_normalizar_texto_v1(p_nombre);
  v_empresa_norm text := public.tpl_market_normalizar_texto_v1(p_empresa);
begin
  select id into v_fuente_id
  from public.tpl_market_fuentes
  where codigo=p_fuente_codigo and activo=true;

  if v_fuente_id is null then
    raise exception 'FUENTE_NO_EXISTE: %', p_fuente_codigo;
  end if;

  if coalesce(v_nombre_norm,'')='' and coalesce(v_empresa_norm,'')='' then
    return null;
  end if;

  select id into v_actor_id
  from public.tpl_market_actores
  where coalesce(nombre_normalizado,'')=coalesce(v_nombre_norm,'')
    and coalesce(empresa_normalizada,'')=coalesce(v_empresa_norm,'')
  limit 1;

  if v_actor_id is null then
    insert into public.tpl_market_actores(
      nombre,nombre_normalizado,empresa,empresa_normalizada,tipo_actor,
      oficina,mls_agente_id,primera_vez_visto,ultima_vez_visto,confianza
    )
    values(
      nullif(p_nombre,''),nullif(v_nombre_norm,''),
      nullif(p_empresa,''),nullif(v_empresa_norm,''),
      case when p_tipo_actor in ('particular','corredor','inmobiliaria','desarrollador','oficina')
           then p_tipo_actor else 'desconocido' end,
      nullif(p_oficina,''),nullif(p_mls_agente_id,''),
      now(),now(),70
    )
    returning id into v_actor_id;
  else
    update public.tpl_market_actores
       set ultima_vez_visto=now(),
           oficina=coalesce(nullif(p_oficina,''),oficina),
           mls_agente_id=coalesce(nullif(p_mls_agente_id,''),mls_agente_id),
           updated_at=now()
     where id=v_actor_id;
  end if;

  if coalesce(trim(p_telefono),'')<>'' then
    insert into public.tpl_market_actor_contactos(
      actor_id,tipo,valor,valor_normalizado,fuente_id,url_origen,
      visible_publicamente,uso
    )
    values(
      v_actor_id,'telefono',trim(p_telefono),
      regexp_replace(trim(p_telefono),'[^0-9+]','','g'),
      v_fuente_id,p_url_origen,true,'identificacion_y_gestion_comercial_interna'
    )
    on conflict(actor_id,tipo,valor) do update set
      ultima_vez_visto=now(),activo=true,url_origen=excluded.url_origen;
  end if;

  if coalesce(trim(p_email),'')<>'' then
    insert into public.tpl_market_actor_contactos(
      actor_id,tipo,valor,valor_normalizado,fuente_id,url_origen,
      visible_publicamente,uso
    )
    values(
      v_actor_id,'email',trim(p_email),lower(trim(p_email)),
      v_fuente_id,p_url_origen,true,'identificacion_y_gestion_comercial_interna'
    )
    on conflict(actor_id,tipo,valor) do update set
      ultima_vez_visto=now(),activo=true,url_origen=excluded.url_origen;
  end if;

  return v_actor_id;
end;
$$;

-- 4) Ingesta de una publicación normalizada.
create or replace function public.tpl_market_ingestar_publicacion_v1(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public,extensions
as $$
declare
  v_fuente_codigo text := p->>'fuente_codigo';
  v_fuente_id uuid;
  v_actor_id uuid;
  v_propiedad_id uuid;
  v_publicacion_id uuid;
  v_fingerprint text;
  v_url text := p->>'url';
  v_fuente_publicacion_id text := p->>'fuente_publicacion_id';
  v_codigo_mls text := p->>'codigo_mls';
  v_titulo text := p->>'titulo';
  v_comuna text := p->>'comuna';
  v_sector text := p->>'sector';
  v_zona text := p->>'zona';
  v_region text := p->>'region';
  v_region_codigo text := p->>'region_codigo';
  v_provincia text := p->>'provincia';
  v_superficie numeric := nullif(p->>'superficie_m2','')::numeric;
  v_precio_clp numeric := nullif(p->>'precio_clp','')::numeric;
  v_precio_uf numeric := nullif(p->>'precio_uf','')::numeric;
  v_uf_clp numeric := nullif(p->>'uf_clp','')::numeric;
  v_tipo_tpl text := coalesce(nullif(p->>'tipo_tpl',''),'desconocido');
  v_estado text := coalesce(nullif(p->>'estado',''),'activa');
  v_hash text;
  v_es_nuevo boolean := false;
begin
  if coalesce(v_fuente_codigo,'')='' then
    return jsonb_build_object('ok',false,'error','FUENTE_REQUERIDA');
  end if;
  if coalesce(v_url,'')='' and coalesce(v_fuente_publicacion_id,'')='' then
    return jsonb_build_object('ok',false,'error','URL_O_ID_REQUERIDO');
  end if;

  select id into v_fuente_id
  from public.tpl_market_fuentes
  where codigo=v_fuente_codigo and activo=true;

  if v_fuente_id is null then
    return jsonb_build_object('ok',false,'error','FUENTE_NO_EXISTE','fuente',v_fuente_codigo);
  end if;

  v_actor_id := public.tpl_market_upsert_actor_v1(
    v_fuente_codigo,
    p->'actor'->>'nombre',
    p->'actor'->>'empresa',
    coalesce(p->'actor'->>'tipo','desconocido'),
    p->'actor'->>'telefono',
    p->'actor'->>'email',
    v_url,
    p->'actor'->>'oficina',
    p->'actor'->>'mls_agente_id'
  );

  v_fingerprint := public.tpl_market_fingerprint_v1(v_comuna,v_sector,v_superficie,v_titulo);

  select id into v_propiedad_id
  from public.tpl_market_propiedades
  where fingerprint=v_fingerprint
  limit 1;

  if v_propiedad_id is null then
    insert into public.tpl_market_propiedades(
      fingerprint,tipo_tpl,region_codigo,region,provincia,comuna,zona_texto,sector,localidad,
      direccion_publica,lat,lng,superficie_terreno_m2,superficie_construida_m2,
      dormitorios,banos,tiene_vivienda,rol_publicado,agua_estado,electricidad_estado,
      cercada,porton,condominio,topografia,acceso_tipo,atributos_naturales,
      descripcion_normalizada,confianza,primera_vez_vista,ultima_vez_vista,metadata
    )
    values(
      v_fingerprint,v_tipo_tpl,v_region_codigo,v_region,v_provincia,v_comuna,v_zona,v_sector,
      p->>'localidad',p->>'direccion_publica',
      nullif(p->>'lat','')::numeric,nullif(p->>'lng','')::numeric,v_superficie,
      nullif(p->>'superficie_construida_m2','')::numeric,
      nullif(p->>'dormitorios','')::integer,nullif(p->>'banos','')::integer,
      nullif(p->>'tiene_vivienda','')::boolean,
      nullif(p->>'rol_publicado','')::boolean,
      p->>'agua_estado',p->>'electricidad_estado',
      nullif(p->>'cercada','')::boolean,nullif(p->>'porton','')::boolean,
      nullif(p->>'condominio','')::boolean,p->>'topografia',p->>'acceso_tipo',
      coalesce(p->'atributos_naturales','[]'::jsonb),
      public.tpl_market_normalizar_texto_v1(p->>'descripcion'),
      coalesce(nullif(p->>'confianza','')::smallint,60),
      now(),now(),coalesce(p->'metadata','{}'::jsonb)
    )
    returning id into v_propiedad_id;
  else
    update public.tpl_market_propiedades
       set ultima_vez_vista=now(),
           activa_observada=true,
           updated_at=now(),
           metadata=metadata||coalesce(p->'metadata','{}'::jsonb)
     where id=v_propiedad_id;
  end if;

  if v_fuente_publicacion_id is not null then
    select id into v_publicacion_id
    from public.tpl_market_publicaciones
    where fuente_id=v_fuente_id and fuente_publicacion_id=v_fuente_publicacion_id
    limit 1;
  end if;

  if v_publicacion_id is null and coalesce(v_url,'')<>'' then
    select id into v_publicacion_id
    from public.tpl_market_publicaciones
    where fuente_id=v_fuente_id and url=v_url
    limit 1;
  end if;

  if v_publicacion_id is null then
    insert into public.tpl_market_publicaciones(
      propiedad_id,fuente_id,actor_id,fuente_publicacion_id,codigo_mls,url,titulo,tipo_fuente,
      estado,primera_captura_at,ultima_captura_at,ultima_vista_activa_at,metadata
    )
    values(
      v_propiedad_id,v_fuente_id,v_actor_id,v_fuente_publicacion_id,v_codigo_mls,
      coalesce(v_url,'urn:'||v_fuente_codigo||':'||v_fuente_publicacion_id),
      v_titulo,p->>'tipo_fuente',v_estado,now(),now(),
      case when v_estado='activa' then now() end,
      coalesce(p->'publicacion_metadata','{}'::jsonb)
    )
    returning id into v_publicacion_id;
    v_es_nuevo := true;
  else
    update public.tpl_market_publicaciones
       set propiedad_id=coalesce(propiedad_id,v_propiedad_id),
           actor_id=coalesce(v_actor_id,actor_id),
           codigo_mls=coalesce(v_codigo_mls,codigo_mls),
           titulo=coalesce(v_titulo,titulo),
           estado=v_estado,
           ultima_captura_at=now(),
           ultima_vista_activa_at=case when v_estado='activa' then now() else ultima_vista_activa_at end,
           updated_at=now()
     where id=v_publicacion_id;
  end if;

  v_hash := encode(extensions.digest(
    coalesce(v_precio_clp::text,'')||'|'||
    coalesce(v_precio_uf::text,'')||'|'||
    coalesce(v_superficie::text,'')||'|'||
    coalesce(v_titulo,'')||'|'||
    coalesce(p->>'descripcion',''),
    'sha256'
  ),'hex');

  if not exists(
    select 1 from public.tpl_market_publicacion_snapshots
    where publicacion_id=v_publicacion_id and hash_contenido=v_hash
  ) then
    insert into public.tpl_market_publicacion_snapshots(
      publicacion_id,capturado_at,fecha_valor,moneda,precio_publicado,precio_clp,precio_uf,uf_clp,
      superficie_m2,zona_texto,sector,descripcion,atributos,raw_resumen,hash_contenido,
      activo_en_fuente,metadata
    )
    values(
      v_publicacion_id,now(),current_date,
      case when v_precio_uf is not null and v_precio_clp is null then 'UF' else 'CLP' end,
      coalesce(v_precio_clp,v_precio_uf),v_precio_clp,v_precio_uf,v_uf_clp,
      v_superficie,v_zona,v_sector,p->>'descripcion',
      coalesce(p->'atributos','{}'::jsonb),p,v_hash,
      (v_estado='activa'),coalesce(p->'snapshot_metadata','{}'::jsonb)
    );
  end if;

  return jsonb_build_object(
    'ok',true,
    'nueva_publicacion',v_es_nuevo,
    'propiedad_id',v_propiedad_id,
    'publicacion_id',v_publicacion_id,
    'actor_id',v_actor_id,
    'fingerprint',v_fingerprint
  );
exception when others then
  return jsonb_build_object('ok',false,'error',sqlerrm,'payload',p);
end;
$$;

-- 5) Ingesta de lote.
create or replace function public.tpl_market_ingestar_lote_v1(p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  item jsonb;
  r jsonb;
  v_total int := 0;
  v_ok int := 0;
  v_error int := 0;
  v_nuevas int := 0;
  v_resultados jsonb := '[]'::jsonb;
begin
  if jsonb_typeof(p_items)<>'array' then
    return jsonb_build_object('ok',false,'error','SE_ESPERA_ARRAY_JSON');
  end if;

  for item in select value from jsonb_array_elements(p_items)
  loop
    v_total := v_total+1;
    r := public.tpl_market_ingestar_publicacion_v1(item);
    v_resultados := v_resultados || jsonb_build_array(r);
    if coalesce((r->>'ok')::boolean,false) then
      v_ok := v_ok+1;
      if coalesce((r->>'nueva_publicacion')::boolean,false) then
        v_nuevas := v_nuevas+1;
      end if;
    else
      v_error := v_error+1;
    end if;
  end loop;

  return jsonb_build_object(
    'ok',v_error=0,
    'total',v_total,
    'procesadas',v_ok,
    'nuevas',v_nuevas,
    'errores',v_error,
    'resultados',v_resultados
  );
end;
$$;

-- 6) Radar competitivo por comuna/zona/sector.
create or replace function public.tpl_market_radar_v1(
  p_comuna text,
  p_tipo_tpl text,
  p_precio_clp numeric,
  p_superficie_m2 numeric default null,
  p_zona text default null,
  p_sector text default null,
  p_tolerancia_superficie_pct numeric default 25
)
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
with universo as (
  select *
  from public.tpl_market_publicaciones_actuales_v1 a
  where a.estado='activa'
    and coalesce(a.precio_clp,0)>0
    and public.tpl_market_normalizar_texto_v1(a.comuna)
        = public.tpl_market_normalizar_texto_v1(p_comuna)
    and a.tipo_tpl=p_tipo_tpl
    and (
      nullif(public.tpl_market_normalizar_texto_v1(p_zona),'') is null
      or public.tpl_market_normalizar_texto_v1(coalesce(a.zona,''))
         = public.tpl_market_normalizar_texto_v1(p_zona)
    )
    and (
      nullif(public.tpl_market_normalizar_texto_v1(p_sector),'') is null
      or public.tpl_market_normalizar_texto_v1(coalesce(a.sector,''))
         = public.tpl_market_normalizar_texto_v1(p_sector)
    )
    and (
      coalesce(p_superficie_m2,0)<=0
      or coalesce(a.superficie_m2,0)<=0
      or a.superficie_m2 between
         p_superficie_m2*(1-p_tolerancia_superficie_pct/100.0)
         and p_superficie_m2*(1+p_tolerancia_superficie_pct/100.0)
    )
),
stats as (
 select
   count(*)::int n,
   min(precio_clp) minimo,
   percentile_cont(0.25) within group(order by precio_clp) p25,
   percentile_cont(0.50) within group(order by precio_clp) mediana,
   avg(precio_clp) promedio,
   percentile_cont(0.75) within group(order by precio_clp) p75,
   max(precio_clp) maximo,
   count(*) filter(where precio_clp<p_precio_clp)::int mas_baratas
 from universo
)
select jsonb_build_object(
 'comuna',p_comuna,'zona',p_zona,'sector',p_sector,'tipo_tpl',p_tipo_tpl,
 'comparables',n,
 'posicion_por_precio',case when p_precio_clp>0 then mas_baratas+1 end,
 'percentil_aproximado',case when n>0 and p_precio_clp>0 then round(((mas_baratas+1)::numeric/n)*100,1) end,
 'minimo_clp',round(minimo),'p25_clp',round(p25),'mediana_clp',round(mediana),
 'promedio_clp',round(promedio),'p75_clp',round(p75),'maximo_clp',round(maximo),
 'diferencia_vs_mediana_pct',case when coalesce(mediana,0)>0 and p_precio_clp>0
   then round((((p_precio_clp-mediana)/mediana)*100)::numeric,1) end,
 'confianza',case when n>=30 then 'alta' when n>=15 then 'media-alta'
                  when n>=8 then 'media' when n>=4 then 'baja' else 'insuficiente' end
)
from stats;
$$;

-- 7) Auditoría extendida.
create or replace function public.tpl_market_auditoria_v2()
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
select jsonb_build_object(
 'generado_at',now(),
 'fuentes_activas',(select count(*) from public.tpl_market_fuentes where activo),
 'regiones_con_fotografia',(select count(distinct region_codigo) from public.tpl_market_cobertura_regional),
 'misiones',(select count(*) from public.tpl_market_misiones),
 'propiedades',(select count(*) from public.tpl_market_propiedades),
 'publicaciones',(select count(*) from public.tpl_market_publicaciones),
 'publicaciones_activas',(select count(*) from public.tpl_market_publicaciones where estado='activa'),
 'snapshots',(select count(*) from public.tpl_market_publicacion_snapshots),
 'actores',(select count(*) from public.tpl_market_actores),
 'contactos_publicos',(select count(*) from public.tpl_market_actor_contactos where visible_publicamente),
 'zonas',(select count(*) from public.tpl_market_zonas),
 'radar_disponible',true,
 'ingesta_disponible',true,
 'modo','LISTO_PARA_INGESTAR_PUBLICACIONES_REALES'
);
$$;

revoke all on function public.tpl_market_upsert_actor_v1(text,text,text,text,text,text,text,text,text) from public;
revoke all on function public.tpl_market_ingestar_publicacion_v1(jsonb) from public;
revoke all on function public.tpl_market_ingestar_lote_v1(jsonb) from public;
revoke all on function public.tpl_market_radar_v1(text,text,numeric,numeric,text,text,numeric) from public;
revoke all on function public.tpl_market_auditoria_v2() from public;

grant execute on function public.tpl_market_upsert_actor_v1(text,text,text,text,text,text,text,text,text) to service_role;
grant execute on function public.tpl_market_ingestar_publicacion_v1(jsonb) to service_role;
grant execute on function public.tpl_market_ingestar_lote_v1(jsonb) to service_role;
grant execute on function public.tpl_market_radar_v1(text,text,numeric,numeric,text,text,numeric) to authenticated,service_role;
grant execute on function public.tpl_market_auditoria_v2() to authenticated,service_role;
