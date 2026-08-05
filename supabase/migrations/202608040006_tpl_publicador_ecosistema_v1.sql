-- ============================================================
-- TPL PUBLICADOR -> ECOSISTEMA v1
-- Fecha: 2026-08-04
-- Completa automáticamente la ficha maestra, scores y tareas CRM
-- después de que tpl_publicar_propiedad_v3 crea una propiedad.
-- ============================================================

create or replace function public.tpl_publicador_completitud_v1(p_propiedad public.tpl_propiedades, p_payload jsonb)
returns numeric
language plpgsql
immutable
set search_path = public
as $$
declare
  v_points numeric := 0;
  v_total numeric := 16;
  v_contacto jsonb := coalesce(p_payload->'contacto','{}'::jsonb);
  v_terreno jsonb := coalesce(p_payload->'terreno','{}'::jsonb);
  v_casa jsonb := coalesce(p_payload->'casa','{}'::jsonb);
begin
  if p_propiedad.tipo is not null then v_points:=v_points+1; end if;
  if p_propiedad.region is not null then v_points:=v_points+1; end if;
  if p_propiedad.comuna is not null then v_points:=v_points+1; end if;
  if p_propiedad.superficie_m2 is not null and p_propiedad.superficie_m2>0 then v_points:=v_points+1; end if;
  if p_propiedad.precio_publicado is not null and p_propiedad.precio_publicado>0 then v_points:=v_points+1; end if;
  if p_propiedad.lat is not null and p_propiedad.lng is not null then v_points:=v_points+1; end if;
  if nullif(trim(coalesce(v_terreno->>'rol','')),'') is not null then v_points:=v_points+1; end if;
  if nullif(trim(coalesce(v_terreno->>'agua','')),'') is not null then v_points:=v_points+1; end if;
  if nullif(trim(coalesce(v_terreno->>'luz','')),'') is not null then v_points:=v_points+1; end if;
  if nullif(trim(coalesce(v_terreno->>'acceso','')),'') is not null then v_points:=v_points+1; end if;
  if nullif(trim(coalesce(v_terreno->>'topografia','')),'') is not null then v_points:=v_points+1; end if;
  if nullif(trim(coalesce(p_propiedad.titulo,'')),'') is not null then v_points:=v_points+1; end if;
  if length(trim(coalesce(p_propiedad.descripcion,'')))>=120 then v_points:=v_points+1; end if;
  if jsonb_array_length(coalesce(p_payload->'photoNames','[]'::jsonb))>=6 then v_points:=v_points+1; end if;
  if nullif(trim(coalesce(v_contacto->>'email','')),'') is not null then v_points:=v_points+1; end if;
  if p_propiedad.tipo in ('casa','casa_sola','casa_con_terreno','parcela_con_casa') then
    if coalesce((v_casa->>'superficie')::numeric,0)>0 then v_points:=v_points+1; end if;
  else
    v_total:=15;
  end if;
  return round(least(100,(v_points/v_total)*100),2);
exception when others then
  return 0;
end;
$$;

create or replace function public.tpl_integrar_propiedad_publicada_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payload jsonb := '{}'::jsonb;
  v_terreno jsonb := '{}'::jsonb;
  v_casa jsonb := '{}'::jsonb;
  v_estrategia jsonb := '{}'::jsonb;
  v_contacto jsonb := '{}'::jsonb;
  v_completitud numeric := 0;
  v_calidad numeric := 0;
  v_confianza numeric := 0;
  v_urgencia text := 'normal';
  v_acepta_ofertas boolean;
  v_objetivo text;
  v_fotos integer := 0;
begin
  if new.publicacion_id is null then return new; end if;

  select coalesce(datos,'{}'::jsonb)
    into v_payload
  from public.tpl_publicaciones
  where id=new.publicacion_id;

  v_terreno:=coalesce(v_payload->'terreno','{}'::jsonb);
  v_casa:=coalesce(v_payload->'casa','{}'::jsonb);
  v_estrategia:=coalesce(v_payload->'estrategia','{}'::jsonb);
  v_contacto:=coalesce(v_payload->'contacto','{}'::jsonb);
  v_fotos:=jsonb_array_length(coalesce(v_payload->'photoNames','[]'::jsonb));

  v_completitud:=public.tpl_publicador_completitud_v1(new,v_payload);
  v_calidad:=least(100,round(
      25
      + case when length(trim(coalesce(new.descripcion,'')))>=220 then 20 else 0 end
      + case when v_fotos>=6 then 25 when v_fotos>=3 then 12 else 0 end
      + case when new.precio_publicado>0 then 15 else 0 end
      + case when new.lat is not null and new.lng is not null then 15 else 0 end
  ,2));
  v_confianza:=least(95,round(35+(v_completitud*.60),2));

  insert into public.tpl_activo_terreno(
    propiedad_id,superficie_util_m2,forma_terreno,orientacion,uso_suelo,subdivisible,
    rol_tipo,rol_numero,agua_tipo,agua_distancia_m,electricidad_tipo,electricidad_distancia_m,
    internet,senal_movil,acceso_invierno,riesgo_inundacion,riesgo_incendio,atributos
  ) values (
    new.id,new.superficie_m2,nullif(v_terreno->>'forma',''),nullif(v_terreno->>'orientacion',''),
    nullif(v_terreno->>'usoSuelo',''),
    case when lower(coalesce(v_terreno->>'subdivision','')) in ('si','sí','true','posible') then true
         when lower(coalesce(v_terreno->>'subdivision','')) in ('no','false') then false else null end,
    nullif(v_terreno->>'rol',''),nullif(v_terreno->>'rolNumero',''),nullif(v_terreno->>'agua',''),
    public.tpl_num(v_terreno,'distanciaAguaM'),nullif(v_terreno->>'luz',''),
    public.tpl_num(v_terreno,'distanciaPosteM'),nullif(v_terreno->>'internet',''),
    nullif(v_terreno->>'senalMovil',''),nullif(v_terreno->>'acceso',''),
    nullif(v_terreno->>'riesgoInundacion',''),nullif(v_terreno->>'riesgoIncendio',''),v_terreno
  ) on conflict(propiedad_id) do update set
    superficie_util_m2=excluded.superficie_util_m2,uso_suelo=excluded.uso_suelo,
    subdivisible=excluded.subdivisible,rol_tipo=excluded.rol_tipo,agua_tipo=excluded.agua_tipo,
    electricidad_tipo=excluded.electricidad_tipo,electricidad_distancia_m=excluded.electricidad_distancia_m,
    acceso_invierno=excluded.acceso_invierno,atributos=excluded.atributos,updated_at=now();

  if new.tipo in ('casa','casa_sola','casa_con_terreno','parcela_con_casa') then
    insert into public.tpl_activo_vivienda(
      propiedad_id,superficie_construida_m2,anio_construccion,estado_conservacion,
      material_principal,numero_pisos,dormitorios,banos,estacionamientos,tipo_calefaccion,
      regularizacion,equipamiento
    ) values (
      new.id,public.tpl_num(v_casa,'superficie'),public.tpl_num(v_casa,'anio')::integer,
      nullif(v_casa->>'estado',''),nullif(v_casa->>'material',''),public.tpl_num(v_casa,'pisos')::integer,
      public.tpl_num(v_casa,'habitaciones')::integer,public.tpl_num(v_casa,'banos'),
      public.tpl_num(v_casa,'estacionamientos')::integer,nullif(v_casa->>'calefaccion',''),
      jsonb_build_object('estado',v_casa->>'regularizacion'),v_casa
    ) on conflict(propiedad_id) do update set
      superficie_construida_m2=excluded.superficie_construida_m2,
      anio_construccion=excluded.anio_construccion,estado_conservacion=excluded.estado_conservacion,
      material_principal=excluded.material_principal,numero_pisos=excluded.numero_pisos,
      dormitorios=excluded.dormitorios,banos=excluded.banos,estacionamientos=excluded.estacionamientos,
      tipo_calefaccion=excluded.tipo_calefaccion,regularizacion=excluded.regularizacion,
      equipamiento=excluded.equipamiento,updated_at=now();
  end if;

  v_urgencia:=case lower(coalesce(v_estrategia->>'urgencia',''))
    when 'sin_apuro' then 'sin_apuro'
    when 'algo_apuro' then 'normal'
    when 'apurado' then 'alta'
    when 'muy_apurado' then 'urgente'
    else 'normal' end;
  v_acepta_ofertas:=lower(coalesce(v_estrategia->>'negociacionPrecio','')) in ('ofertas','ofertas_y_mejoras');
  v_objetivo:=case v_urgencia when 'urgente' then 'vender_rapido' when 'alta' then 'vender_pronto' else 'obtener_mejor_valor' end;

  insert into public.tpl_activo_comercial(
    propiedad_id,urgencia_venta,objetivo_propietario,acepta_ofertas,
    publico_objetivo,canales_activos,anuncio_url,whatsapp_publico,email_publico,telefono_publico,
    ultima_recomendacion
  ) values (
    new.id,v_urgencia,v_objetivo,v_acepta_ofertas,'[]'::jsonb,
    jsonb_build_array('portal_tpl'),'/parcela.html?id='||new.codigo,
    '+56988508361',null,null,
    case when v_completitud<70 then 'Completar antecedentes para aumentar la precisión y calidad del anuncio.'
         when v_fotos<6 then 'Agregar al menos seis fotografías representativas.'
         else 'Revisar la tasación y preparar la estrategia de publicación.' end
  ) on conflict(propiedad_id) do update set
    urgencia_venta=excluded.urgencia_venta,objetivo_propietario=excluded.objetivo_propietario,
    acepta_ofertas=excluded.acepta_ofertas,anuncio_url=excluded.anuncio_url,
    whatsapp_publico=excluded.whatsapp_publico,ultima_recomendacion=excluded.ultima_recomendacion,
    updated_at=now();

  insert into public.tpl_activo_scores(
    propiedad_id,nivel_informacion,calidad_anuncio,confianza_tasacion,estado_comercial,
    explicacion,calculado_at,version_motor
  ) values (
    new.id,v_completitud,v_calidad,v_confianza,'captada',
    jsonb_build_object(
      'fotografias',v_fotos,
      'contacto_completo',coalesce(v_contacto->>'email','')<>'',
      'recomendacion',case when v_completitud<70 then 'Completar información' when v_fotos<6 then 'Mejorar galería' else 'Lista para revisión' end
    ),now(),'tpl-publicador-ecosistema-v1'
  ) on conflict(propiedad_id) do update set
    nivel_informacion=excluded.nivel_informacion,calidad_anuncio=excluded.calidad_anuncio,
    confianza_tasacion=excluded.confianza_tasacion,estado_comercial=excluded.estado_comercial,
    explicacion=excluded.explicacion,calculado_at=now(),version_motor=excluded.version_motor;

  update public.tpl_propiedades
     set completitud_pct=v_completitud,
         salud_anuncio_pct=v_calidad,
         contacto_publico_modo='tpl',
         plan_codigo='gratis',
         metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object(
           'ecosistema_integrado',true,
           'ecosistema_version','v1',
           'diagnostico_inicial',jsonb_build_object(
             'nivel_informacion',v_completitud,
             'calidad_anuncio',v_calidad,
             'confianza_tasacion',v_confianza
           )
         )
   where id=new.id;

  insert into public.tpl_tareas(actor_id,propiedad_id,titulo,detalle,tipo,prioridad,estado,vence_at,metadata)
  select coalesce(new.propietario_actor_id,new.corredor_actor_id),new.id,
         case when v_fotos<6 then 'Revisar y completar fotografías' else 'Revisar publicación captada' end,
         case when v_completitud<70 then 'La propiedad necesita antecedentes adicionales antes de maximizar su diagnóstico.'
              when v_fotos<6 then 'Solicitar fotografías representativas y revisar las recibidas.'
              else 'Validar antecedentes y activar la publicación cuando corresponda.' end,
         'onboarding_propiedad',case when v_urgencia in ('alta','urgente') then 'alta' else 'media' end,
         'pendiente',now()+interval '2 days',jsonb_build_object('origen','publicador','publicacion_id',new.publicacion_id)
  where not exists(
    select 1 from public.tpl_tareas t where t.propiedad_id=new.id and t.tipo='onboarding_propiedad' and t.estado in ('pendiente','en_progreso','esperando')
  );

  insert into public.tpl_eventos(actor_id,propiedad_id,evento,categoria,origen,pagina,prioridad,descripcion,metadata)
  values(
    coalesce(new.propietario_actor_id,new.corredor_actor_id),new.id,'ecosistema.propiedad_integrada','ecosistema','publicador',
    '/plataforma/publicar/','media','La propiedad fue integrada a Ficha Maestra, CRM, diagnóstico e infraestructura de Mi Propiedad TPL.',
    jsonb_build_object('publicacion_id',new.publicacion_id,'completitud',v_completitud,'calidad_anuncio',v_calidad,'confianza_tasacion',v_confianza,'fotos',v_fotos)
  );

  return new;
end;
$$;

drop trigger if exists trg_tpl_integrar_propiedad_publicada on public.tpl_propiedades;
create trigger trg_tpl_integrar_propiedad_publicada
after insert on public.tpl_propiedades
for each row
when (new.publicacion_id is not null)
execute function public.tpl_integrar_propiedad_publicada_v1();

-- Integra propiedades ya captadas que aún no tengan componentes.
insert into public.tpl_activo_terreno(propiedad_id,superficie_util_m2,agua_tipo,electricidad_tipo,acceso_invierno,atributos)
select p.id,p.superficie_m2,p.agua,p.electricidad,p.acceso,coalesce(pub.datos->'terreno','{}'::jsonb)
from public.tpl_propiedades p
join public.tpl_publicaciones pub on pub.id=p.publicacion_id
left join public.tpl_activo_terreno t on t.propiedad_id=p.id
where t.propiedad_id is null
on conflict(propiedad_id) do nothing;

create or replace function public.tpl_estado_ecosistema_publicacion_v1(p_publicacion_id uuid,p_propiedad_id uuid)
returns jsonb
language sql
security definer
set search_path=public
as $$
  select jsonb_build_object(
    'ok',exists(select 1 from public.tpl_propiedades p where p.id=p_propiedad_id and p.publicacion_id=p_publicacion_id),
    'ficha_maestra',exists(select 1 from public.tpl_activo_terreno where propiedad_id=p_propiedad_id),
    'componente_vivienda',exists(select 1 from public.tpl_activo_vivienda where propiedad_id=p_propiedad_id),
    'comercial',exists(select 1 from public.tpl_activo_comercial where propiedad_id=p_propiedad_id),
    'scores',exists(select 1 from public.tpl_activo_scores where propiedad_id=p_propiedad_id),
    'crm_tarea',exists(select 1 from public.tpl_tareas where propiedad_id=p_propiedad_id),
    'timeline',exists(select 1 from public.tpl_eventos where propiedad_id=p_propiedad_id and evento='ecosistema.propiedad_integrada'),
    'tasacion',exists(select 1 from public.tpl_tasaciones where propiedad_id=p_propiedad_id),
    'necesidades',coalesce((select count(*) from public.tpl_necesidades_proyecto where propiedad_id=p_propiedad_id),0),
    'completitud',coalesce((select completitud_pct from public.tpl_propiedades where id=p_propiedad_id),0),
    'salud_anuncio',coalesce((select salud_anuncio_pct from public.tpl_propiedades where id=p_propiedad_id),0)
  );
$$;

revoke all on function public.tpl_estado_ecosistema_publicacion_v1(uuid,uuid) from public;
grant execute on function public.tpl_estado_ecosistema_publicacion_v1(uuid,uuid) to anon,authenticated;
