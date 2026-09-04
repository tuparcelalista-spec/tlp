-- Corrige dos huecos de datos entre el publicador (publicar-v2) y el resto
-- del sistema, reportados por el usuario: una publicación aprobada aparece
-- en la grilla del CRM con el logo genérico en vez de la foto real, y le
-- faltan campos (agua, luz, acceso, topografía, rol, cierre, portón, y toda
-- la sección de vivienda) que sí se ven para una parcela creada a mano o
-- editada por el propietario.
--
-- CAUSA 1 (fotos): las fotos de una publicación se guardan en
-- tpl_propiedad_imagenes (tabla aparte, vía tpl_registrar_foto_propietario_v1
-- desde la función subir-foto-propietario), nunca en
-- tpl_propiedades.metadata->'imagenes'. La vista crm_parcelas_resumen (la
-- que alimenta la grilla del CRM) solo miraba metadata, así que nunca
-- encontraba nada para una propiedad publicada así y el frontend caía al
-- logo de reemplazo.
--
-- CAUSA 2 (campos faltantes): cuando alguien publica desde publicar-v2,
-- tpl_integrar_propiedad_publicada_v1 (trigger after insert en
-- tpl_propiedades) guarda los datos del terreno y la vivienda SOLO en las
-- tablas especializadas tpl_activo_terreno / tpl_activo_vivienda. Nunca
-- toca las columnas planas de tpl_propiedades (agua, electricidad, acceso,
-- topografia, rol_situacion, cierre_perimetral, porton, suelo, casa_datos)
-- que SÍ llena tpl_propietario_actualizar_por_token_v1 (cuando el
-- propietario edita su ficha) y que lee/escribe el editor integral del CRM.
-- Por eso la bandeja de revisión, la grilla y el editor ven esas columnas
-- vacías para toda propiedad que llegó por el publicador, aunque la persona
-- sí haya informado esos datos al publicar.
begin;

-- El editor integral del CRM ya asume que estas columnas existen (ver el
-- comentario en editor-integral.js: "...leen `casa_datos`, la columna") y
-- la pantalla de revisión lee p.suelo directamente, pero ninguna migración
-- del repo las crea explícitamente. add column if not exists es inocuo si
-- ya existen (p.ej. si se agregaron a mano en el SQL Editor).
alter table public.tpl_propiedades
  add column if not exists suelo text,
  add column if not exists casa_datos jsonb not null default '{}'::jsonb;

-- 1) Vista de la grilla del CRM: agrega la foto real desde
--    tpl_propiedad_imagenes (portada primero si hay una marcada, si no la
--    de menor "orden"), y solo cae al metadata legado si esa tabla no tiene
--    ninguna fila para la propiedad.
create or replace view public.crm_parcelas_resumen as
select
  p.id,
  p.codigo,
  p.titulo,
  p.comuna,
  p.region,
  p.superficie_m2,
  p.precio_publicado,
  p.estado,
  p.publicada_at,
  extract(day from now() - p.publicada_at) as dias_publicada,
  coalesce(
    fotos.url_portada,
    (p.metadata -> 'imagenes') ->> 0,
    ((p.metadata -> 'imagenes') -> 0) ->> 'url',
    p.metadata ->> 'imagen_principal'
  ) as foto_principal,
  coalesce(fotos.total, jsonb_array_length(coalesce(p.metadata -> 'imagenes', '[]'::jsonb)))::integer as total_fotos,
  pl.nombre as plan_nombre,
  s.periodo_hasta as expiracion_plan,
  p.metadata ->> 'valor_tpl_tecnico' as valor_tpl_tecnico,
  p.metadata ->> 'valor_promedio_comunal' as valor_promedio_comunal,
  p.metadata ->> 'valor_tpl_tasador' as valor_tpl_tasador,
  p.metadata ->> 'valor_tpl_tasador_ajustado' as valor_tpl_tasador_ajustado,
  p.metadata ->> 'valor_comunal' as valor_comunal,
  p.metadata ->> 'valor_tpl_recomendado' as valor_tpl_recomendado,
  p.metadata ->> 'valor_venta_apuro' as valor_venta_apuro
from public.tpl_propiedades p
left join lateral (
  select
    (array_agg(i.url order by i.es_portada desc, i.orden asc nulls last))[1] as url_portada,
    count(*) as total
  from public.tpl_propiedad_imagenes i
  where i.propiedad_id = p.id
) fotos on true
left join public.tpl_suscripciones s on p.id = s.propiedad_id and s.estado = 'activa'
left join public.tpl_planes_comerciales pl on s.plan_id = pl.id
where p.estado is distinct from 'eliminada';

revoke all on public.crm_parcelas_resumen from public, anon;
grant select on public.crm_parcelas_resumen to authenticated;

-- 2) Trigger de integración: mismo cuerpo que 202608040006, más el backfill
--    de las columnas planas (al final, antes de las tareas/eventos). Usa
--    coalesce(nullif(...),columna) igual que tpl_propietario_actualizar_por_token_v1:
--    solo pisa el valor si el payload trae algo, nunca borra un dato que ya
--    estuviera cargado a mano.
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

  -- NUEVO: backfill de las columnas planas de tpl_propiedades que lee
  -- directo la bandeja de revisión, la grilla del CRM y el editor integral
  -- (ver comentario de cabecera). coalesce(nullif(...),columna) para no
  -- pisar nunca un valor ya cargado a mano.
  update public.tpl_propiedades
     set completitud_pct=v_completitud,
         salud_anuncio_pct=v_calidad,
         contacto_publico_modo='tpl',
         plan_codigo='gratis',
         agua=coalesce(nullif(trim(coalesce(v_terreno->>'agua','')),''),agua),
         electricidad=coalesce(nullif(trim(coalesce(v_terreno->>'luz','')),''),electricidad),
         acceso=coalesce(nullif(trim(coalesce(v_terreno->>'acceso','')),''),acceso),
         topografia=coalesce(nullif(trim(coalesce(v_terreno->>'topografia','')),''),topografia),
         rol_situacion=coalesce(nullif(trim(coalesce(v_terreno->>'rol','')),''),rol_situacion),
         cierre_perimetral=coalesce(nullif(trim(coalesce(v_terreno->>'cierre','')),''),cierre_perimetral),
         porton=coalesce(nullif(trim(coalesce(v_terreno->>'porton','')),''),porton),
         suelo=coalesce(nullif(trim(coalesce(v_payload->>'suelo',v_terreno->>'condicionSuelo','')),''),suelo),
         casa_datos=case when v_casa <> '{}'::jsonb then v_casa else casa_datos end,
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

-- 3) Backfill puntual para publicaciones que ya llegaron antes de este fix
--    y siguen con las columnas planas vacías (no toca las que el staff ya
--    haya editado a mano, por el mismo coalesce/nullif de arriba).
do $$
declare
  r record;
  v_terreno jsonb;
  v_casa jsonb;
begin
  for r in
    select p.id, pub.datos
    from public.tpl_propiedades p
    join public.tpl_publicaciones pub on pub.id = p.publicacion_id
    where p.publicacion_id is not null
  loop
    v_terreno := coalesce(r.datos->'terreno','{}'::jsonb);
    v_casa := coalesce(r.datos->'casa','{}'::jsonb);
    update public.tpl_propiedades set
      agua=coalesce(nullif(trim(coalesce(v_terreno->>'agua','')),''),agua),
      electricidad=coalesce(nullif(trim(coalesce(v_terreno->>'luz','')),''),electricidad),
      acceso=coalesce(nullif(trim(coalesce(v_terreno->>'acceso','')),''),acceso),
      topografia=coalesce(nullif(trim(coalesce(v_terreno->>'topografia','')),''),topografia),
      rol_situacion=coalesce(nullif(trim(coalesce(v_terreno->>'rol','')),''),rol_situacion),
      cierre_perimetral=coalesce(nullif(trim(coalesce(v_terreno->>'cierre','')),''),cierre_perimetral),
      porton=coalesce(nullif(trim(coalesce(v_terreno->>'porton','')),''),porton),
      suelo=coalesce(nullif(trim(coalesce(r.datos->>'suelo',v_terreno->>'condicionSuelo','')),''),suelo),
      casa_datos=case when v_casa <> '{}'::jsonb and (casa_datos is null or casa_datos = '{}'::jsonb) then v_casa else casa_datos end
    where id = r.id;
  end loop;
end $$;

commit;
