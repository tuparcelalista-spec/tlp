-- ============================================================
-- TPL MARKET INTELLIGENCE v1.3
-- UF -> CLP AUTOMÁTICO PARA MARKET INTELLIGENCE
-- 2026-08-07
-- ============================================================

-- 1) Helper para obtener UF actual desde la función oficial TPL.
create or replace function public.tpl_market_uf_actual_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v jsonb;
begin
  begin
    execute 'select to_jsonb(public.tpl_obtener_uf_v1())' into v;
  exception when others then
    return jsonb_build_object(
      'ok',false,
      'error','UF_NO_DISPONIBLE',
      'detalle',sqlerrm
    );
  end;

  return jsonb_build_object(
    'ok',true,
    'valor_clp',nullif(v->>'valor_clp','')::numeric,
    'fecha_valor',v->>'fecha_valor',
    'fuente',v->>'fuente'
  );
end;
$$;

-- 2) Reemplaza la ingesta para convertir automáticamente UF -> CLP
--    cuando el aviso trae UF y no trae CLP.
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
  v_uf jsonb;
begin
  if coalesce(v_fuente_codigo,'')='' then
    return jsonb_build_object('ok',false,'error','FUENTE_REQUERIDA');
  end if;

  if coalesce(v_url,'')='' and coalesce(v_fuente_publicacion_id,'')='' then
    return jsonb_build_object('ok',false,'error','URL_O_ID_REQUERIDO');
  end if;

  -- UF -> CLP automática solo si falta precio CLP.
  if v_precio_clp is null and v_precio_uf is not null then
    if v_uf_clp is null then
      v_uf := public.tpl_market_uf_actual_v1();
      if coalesce((v_uf->>'ok')::boolean,false) then
        v_uf_clp := nullif(v_uf->>'valor_clp','')::numeric;
      end if;
    end if;

    if coalesce(v_uf_clp,0) > 0 then
      v_precio_clp := round(v_precio_uf * v_uf_clp);
    end if;
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

  v_fingerprint := public.tpl_market_fingerprint_v1(
    v_comuna,v_sector,v_superficie,v_titulo
  );

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
    where fuente_id=v_fuente_id
      and fuente_publicacion_id=v_fuente_publicacion_id
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
           ultima_vista_activa_at=
             case when v_estado='activa' then now() else ultima_vista_activa_at end,
           updated_at=now()
     where id=v_publicacion_id;
  end if;

  v_hash := encode(
    extensions.digest(
      coalesce(v_precio_clp::text,'')||'|'||
      coalesce(v_precio_uf::text,'')||'|'||
      coalesce(v_uf_clp::text,'')||'|'||
      coalesce(v_superficie::text,'')||'|'||
      coalesce(v_titulo,'')||'|'||
      coalesce(p->>'descripcion',''),
      'sha256'
    ),
    'hex'
  );

  if not exists(
    select 1
    from public.tpl_market_publicacion_snapshots
    where publicacion_id=v_publicacion_id
      and hash_contenido=v_hash
  ) then
    insert into public.tpl_market_publicacion_snapshots(
      publicacion_id,capturado_at,fecha_valor,moneda,
      precio_publicado,precio_clp,precio_uf,uf_clp,
      superficie_m2,zona_texto,sector,descripcion,
      atributos,raw_resumen,hash_contenido,activo_en_fuente,metadata
    )
    values(
      v_publicacion_id,now(),current_date,
      case when v_precio_uf is not null and nullif(p->>'precio_clp','') is null
           then 'UF' else 'CLP' end,
      coalesce(v_precio_uf,v_precio_clp),
      v_precio_clp,v_precio_uf,v_uf_clp,
      v_superficie,v_zona,v_sector,p->>'descripcion',
      coalesce(p->'atributos','{}'::jsonb),
      p,
      v_hash,
      (v_estado='activa'),
      coalesce(p->'snapshot_metadata','{}'::jsonb) ||
      case when v_precio_uf is not null and v_uf_clp is not null then
        jsonb_build_object('conversion_uf_clp',true,'uf_clp_aplicada',v_uf_clp)
      else '{}'::jsonb end
    );
  end if;

  return jsonb_build_object(
    'ok',true,
    'nueva_publicacion',v_es_nuevo,
    'propiedad_id',v_propiedad_id,
    'publicacion_id',v_publicacion_id,
    'actor_id',v_actor_id,
    'fingerprint',v_fingerprint,
    'precio_uf',v_precio_uf,
    'uf_clp',v_uf_clp,
    'precio_clp',v_precio_clp
  );
exception when others then
  return jsonb_build_object('ok',false,'error',sqlerrm,'payload',p);
end;
$$;

-- 3) Backfill: completa snapshots antiguos con UF pero sin CLP usando
--    la UF oficial configurada actualmente en TPL.
create or replace function public.tpl_market_backfill_uf_clp_v1()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uf jsonb;
  v_uf_clp numeric;
  v_actualizados integer := 0;
begin
  v_uf := public.tpl_market_uf_actual_v1();

  if not coalesce((v_uf->>'ok')::boolean,false) then
    return jsonb_build_object(
      'ok',false,
      'error','UF_NO_DISPONIBLE',
      'detalle',v_uf
    );
  end if;

  v_uf_clp := nullif(v_uf->>'valor_clp','')::numeric;

  if coalesce(v_uf_clp,0) <= 0 then
    return jsonb_build_object('ok',false,'error','UF_INVALIDA');
  end if;

  update public.tpl_market_publicacion_snapshots
     set uf_clp=v_uf_clp,
         precio_clp=round(precio_uf*v_uf_clp),
         metadata=metadata ||
           jsonb_build_object(
             'conversion_uf_clp',true,
             'uf_clp_aplicada',v_uf_clp,
             'backfill_at',now(),
             'nota','Backfill con UF oficial TPL vigente al 2026-08-07'
           )
   where precio_uf is not null
     and precio_clp is null;

  get diagnostics v_actualizados = row_count;

  return jsonb_build_object(
    'ok',true,
    'uf_clp',v_uf_clp,
    'fecha_uf',v_uf->>'fecha_valor',
    'fuente_uf',v_uf->>'fuente',
    'snapshots_actualizados',v_actualizados
  );
end;
$$;

-- 4) Auditoría UF / CLP.
create or replace function public.tpl_market_auditoria_uf_v1()
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
select jsonb_build_object(
  'generado_at',now(),
  'snapshots_total',(select count(*) from public.tpl_market_publicacion_snapshots),
  'snapshots_con_uf',(select count(*) from public.tpl_market_publicacion_snapshots where precio_uf is not null),
  'uf_sin_clp',(select count(*) from public.tpl_market_publicacion_snapshots where precio_uf is not null and precio_clp is null),
  'uf_con_clp',(select count(*) from public.tpl_market_publicacion_snapshots where precio_uf is not null and precio_clp is not null),
  'modo','UF_CLP_ACTIVO'
);
$$;

revoke all on function public.tpl_market_uf_actual_v1() from public;
revoke all on function public.tpl_market_backfill_uf_clp_v1() from public;
revoke all on function public.tpl_market_auditoria_uf_v1() from public;

grant execute on function public.tpl_market_uf_actual_v1()
  to authenticated,service_role;

grant execute on function public.tpl_market_backfill_uf_clp_v1()
  to service_role;

grant execute on function public.tpl_market_auditoria_uf_v1()
  to authenticated,service_role;
