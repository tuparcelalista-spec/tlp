-- TPL · Parche 04 · Fuente canónica e historial del Motor de Inteligencia
begin;

create index if not exists tpl_tasaciones_propiedad_version_idx
  on public.tpl_tasaciones(propiedad_id, created_at desc, id desc);

create or replace function public.tpl_tasacion_canonica_activo_v1(p_identificador text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prop public.tpl_propiedades;
  v_tas public.tpl_tasaciones;
  v_total integer;
begin
  select * into v_prop
  from public.tpl_propiedades p
  where p.id::text = trim(p_identificador)
     or p.codigo = trim(p_identificador)
     or p.metadata->>'source_legacy_id' = trim(p_identificador)
  order by case when p.id::text=trim(p_identificador) then 0 when p.codigo=trim(p_identificador) then 1 else 2 end
  limit 1;

  if v_prop.id is null then
    return jsonb_build_object('ok',false,'error','ACTIVO_NO_ENCONTRADO');
  end if;

  select * into v_tas
  from public.tpl_tasaciones t
  where t.propiedad_id=v_prop.id
  order by t.created_at desc,t.id desc
  limit 1;

  select count(*) into v_total from public.tpl_tasaciones where propiedad_id=v_prop.id;

  if v_tas.id is null then
    return jsonb_build_object(
      'ok',true,'propiedad_id',v_prop.id,'codigo',v_prop.codigo,
      'tiene_tasacion',false,'total_versiones',0
    );
  end if;

  return jsonb_build_object(
    'ok',true,
    'propiedad_id',v_prop.id,
    'codigo',v_prop.codigo,
    'tipo_activo',v_prop.tipo,
    'tiene_tasacion',true,
    'total_versiones',v_total,
    'tasacion',jsonb_build_object(
      'id',v_tas.id,
      'tipo',v_tas.tipo,
      'valor_tpl_total',v_tas.valor_tpl_total,
      'valor_tpl_m2',v_tas.valor_tpl_m2,
      'precio_publicado',v_tas.precio_publicado,
      'precio_publicado_m2',v_tas.precio_publicado_m2,
      'referencia_comunal_m2',v_tas.referencia_comunal_m2,
      'diferencia_publicado_vs_tpl_pct',v_tas.diferencia_publicado_vs_tpl_pct,
      'clasificacion',v_tas.clasificacion,
      'es_oportunidad',v_tas.es_oportunidad,
      'factores',v_tas.factores,
      'resultado',v_tas.resultado,
      'version_motor',v_tas.version_motor,
      'created_at',v_tas.created_at
    )
  );
end;
$$;

revoke all on function public.tpl_tasacion_canonica_activo_v1(text) from public;
grant execute on function public.tpl_tasacion_canonica_activo_v1(text) to anon, authenticated;

create or replace function public.tpl_crm_historial_tasaciones_v1(p_propiedad_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.tpl_es_staff() then
    raise exception 'Acceso CRM no autorizado' using errcode='42501';
  end if;

  return jsonb_build_object(
    'ok',true,
    'propiedad_id',p_propiedad_id,
    'versiones',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',t.id,
        'numero_version',x.numero_version,
        'tipo',t.tipo,
        'valor_tpl_total',t.valor_tpl_total,
        'valor_tpl_m2',t.valor_tpl_m2,
        'precio_publicado',t.precio_publicado,
        'diferencia_pct',t.diferencia_publicado_vs_tpl_pct,
        'clasificacion',t.clasificacion,
        'version_motor',t.version_motor,
        'created_at',t.created_at
      ) order by t.created_at desc,t.id desc)
      from (
        select tt.*,row_number() over(order by tt.created_at,tt.id) numero_version
        from public.tpl_tasaciones tt where tt.propiedad_id=p_propiedad_id
      ) x
      join public.tpl_tasaciones t on t.id=x.id
    ),'[]'::jsonb)
  );
end;
$$;

revoke all on function public.tpl_crm_historial_tasaciones_v1(uuid) from public;
grant execute on function public.tpl_crm_historial_tasaciones_v1(uuid) to authenticated;

create or replace function public.tpl_after_tasacion_ecosistema_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_confianza numeric;
  v_info numeric;
  v_missing integer:=0;
begin
  v_missing :=
    (case when nullif(trim(coalesce(new.entrada->>'region','')),'') is null then 1 else 0 end)+
    (case when nullif(trim(coalesce(new.entrada->>'comuna','')),'') is null then 1 else 0 end)+
    (case when coalesce(new.superficie_m2,0)<=0 then 1 else 0 end)+
    (case when new.entrada->>'electricidad' is null and new.entrada->>'power' is null then 1 else 0 end)+
    (case when new.entrada->>'agua' is null and new.entrada->>'water' is null then 1 else 0 end)+
    (case when new.entrada->>'acceso' is null and new.entrada->>'road' is null then 1 else 0 end);

  v_info := greatest(25,least(100,100-(v_missing*12)));
  v_confianza := greatest(35,least(98,v_info-(case when new.referencia_comunal_m2 is null then 12 else 0 end)));

  insert into public.tpl_activo_scores(
    propiedad_id,nivel_informacion,confianza_tasacion,estado_comercial,explicacion,calculado_at,version_motor
  ) values (
    new.propiedad_id,v_info,v_confianza,
    case when new.diferencia_publicado_vs_tpl_pct>15 then 'precio_alto'
         when new.diferencia_publicado_vs_tpl_pct<-10 then 'oportunidad'
         else 'precio_competitivo' end,
    jsonb_build_object(
      'ultima_tasacion_id',new.id,
      'campos_clave_faltantes',v_missing,
      'clasificacion',new.clasificacion,
      'diferencia_pct',new.diferencia_publicado_vs_tpl_pct
    ),now(),coalesce(new.version_motor,'motor-no-informado')
  ) on conflict(propiedad_id) do update set
    nivel_informacion=excluded.nivel_informacion,
    confianza_tasacion=excluded.confianza_tasacion,
    estado_comercial=excluded.estado_comercial,
    explicacion=coalesce(public.tpl_activo_scores.explicacion,'{}'::jsonb)||excluded.explicacion,
    calculado_at=now(),
    version_motor=excluded.version_motor;

  insert into public.tpl_eventos(
    actor_id,propiedad_id,evento,categoria,origen,prioridad,descripcion,metadata
  ) values(
    new.actor_id,new.propiedad_id,'inteligencia.tasacion_generada','inteligencia','motor_tasador',
    case when v_confianza<65 then 'alta' else 'media' end,
    'Se generó una nueva versión del diagnóstico de valor.',
    jsonb_build_object('tasacion_id',new.id,'valor_tpl_total',new.valor_tpl_total,'confianza',v_confianza,'version_motor',new.version_motor)
  );

  if v_confianza<65 and not exists(
    select 1 from public.tpl_tareas
    where propiedad_id=new.propiedad_id and estado in('pendiente','en_progreso','esperando')
      and metadata->>'origen'='tasacion_confianza_baja'
  ) then
    insert into public.tpl_tareas(actor_id,propiedad_id,titulo,detalle,tipo,prioridad,estado,metadata)
    values(new.actor_id,new.propiedad_id,'Completar antecedentes para mejorar tasación',
      'La confianza del diagnóstico es baja. Completar agua, electricidad, acceso, ubicación y antecedentes comparables.',
      'mejorar_tasacion','alta','pendiente',
      jsonb_build_object('origen','tasacion_confianza_baja','tasacion_id',new.id,'confianza',v_confianza));
  end if;

  return new;
end;
$$;

drop trigger if exists trg_tpl_after_tasacion_ecosistema on public.tpl_tasaciones;
create trigger trg_tpl_after_tasacion_ecosistema
after insert on public.tpl_tasaciones
for each row execute function public.tpl_after_tasacion_ecosistema_v1();

commit;
