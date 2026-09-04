-- ============================================================
-- TPL TASADOR v3 · MOTOR COMERCIAL CONFIGURABLE · PREVIEW
-- 2026-08-07
--
-- OBJETIVO
--   Probar el nuevo método TPL SIN reemplazar todavía el Tasador oficial.
--
-- LÓGICA
--   1) Base nacional en UF para 5.000 m².
--   2) Superficie con precio marginal decreciente.
--   3) Multiplicador por distancia al hub / ciudad grande.
--   4) -1% por km al centro comunal (tope configurable).
--   5) -1% por km a ruta principal asfaltada (tope configurable).
--   6) Ajustes acumulativos: Rol, agua, electricidad, cerco, cuerpo de agua.
--   7) Turismo configurable.
--   8) Promedio FINAL 50/50 con referencia comunal, si existe.
--
-- IMPORTANTE
--   Esta migración NO cambia el worker ni escribe nuevas tasaciones.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1) PARÁMETROS EDITABLES DEL TASADOR
-- ------------------------------------------------------------

create table if not exists public.tpl_tasador_parametros_v3 (
  clave text primary key,
  valor_numerico numeric not null,
  unidad text not null,
  descripcion text,
  activo boolean not null default true,
  version text not null default 'tpl-tasador-v3-preview-20260807',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.tpl_tasador_parametros_v3(clave,valor_numerico,unidad,descripcion)
values
  ('base_5000_uf',250,'uf','Valor nacional base para una parcela de 5.000 m²'),
  ('superficie_ratio_0_7000',1.00,'ratio','Valor marginal por m² hasta 7.000 m²'),
  ('superficie_ratio_7000_10000',0.75,'ratio','Valor marginal por m² entre 7.001 y 10.000 m²'),
  ('superficie_ratio_10000_20000',0.50,'ratio','Valor marginal por m² entre 10.001 y 20.000 m²'),
  ('superficie_ratio_sobre_20000',0.25,'ratio','Valor marginal por m² sobre 20.000 m²'),

  ('descuento_comuna_pct_km',1,'porcentaje','Descuento porcentual por km al centro comunal'),
  ('descuento_comuna_max_pct',30,'porcentaje','Tope máximo de descuento por distancia comunal'),
  ('descuento_ruta_pct_km',1,'porcentaje','Descuento porcentual por km a ruta principal asfaltada'),
  ('descuento_ruta_max_pct',30,'porcentaje','Tope máximo de descuento por distancia a ruta'),

  ('rol_propio_pct',10,'porcentaje','Bonificación por Rol propio'),
  ('sin_rol_propio_pct',-20,'porcentaje','Penalización por no tener Rol propio'),
  ('agua_factibilidad_pct',10,'porcentaje','Bonificación por agua o factibilidad de agua'),
  ('luz_factibilidad_pct',15,'porcentaje','Bonificación por factibilidad eléctrica'),
  ('luz_empalme_pct',25,'porcentaje','Bonificación por empalme/conexión eléctrica'),
  ('cerco_pct',5,'porcentaje','Bonificación por parcela cercada'),
  ('cuerpo_agua_pct',20,'porcentaje','Bonificación por río, estero, vertiente, lago, laguna o termas'),

  ('turismo_regional_mult',1.20,'multiplicador','Turismo regional'),
  ('turismo_nacional_mult',1.50,'multiplicador','Turismo nacional'),
  ('turismo_internacional_mult',2.00,'multiplicador','Turismo internacional'),

  ('peso_valor_tecnico_final',0.50,'peso','Peso del cálculo técnico antes del promedio comunal'),
  ('peso_promedio_comunal_final',0.50,'peso','Peso de la referencia comunal en el ajuste final')
on conflict (clave) do nothing;

-- ------------------------------------------------------------
-- 2) CURVA DE DISTANCIA A CIUDAD GRANDE / HUB
--    Respeta los tramos definidos por TPL.
-- ------------------------------------------------------------

create table if not exists public.tpl_tasador_distancia_hub_v3 (
  id bigserial primary key,
  km_desde numeric not null,
  km_hasta numeric,
  multiplicador numeric not null check (multiplicador > 0),
  etiqueta text not null,
  orden integer not null unique,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tpl_tasador_distancia_hub_v3_rango_chk
    check (km_desde >= 0 and (km_hasta is null or km_hasta >= km_desde))
);

insert into public.tpl_tasador_distancia_hub_v3
  (km_desde,km_hasta,multiplicador,etiqueta,orden)
values
  (0,3,9.00,'0 a 3 km',1),
  (3,7,7.00,'Más de 3 hasta 7 km',2),
  (7,15,6.00,'Más de 7 hasta 15 km',3),
  (15,20,5.00,'Más de 15 hasta 20 km',4),
  (20,30,4.00,'Más de 20 hasta 30 km',5),
  (30,40,3.00,'Más de 30 hasta 40 km',6),
  (40,50,2.00,'Más de 40 hasta 50 km',7),
  (50,60,1.80,'Más de 50 hasta 60 km',8),
  (60,70,1.60,'Más de 60 hasta 70 km',9),
  (70,80,1.45,'Más de 70 hasta 80 km',10),
  (80,100,1.30,'Más de 80 hasta 100 km',11),
  (100,null,1.20,'Más de 100 km',12)
on conflict (orden) do update set
  km_desde=excluded.km_desde,
  km_hasta=excluded.km_hasta,
  multiplicador=excluded.multiplicador,
  etiqueta=excluded.etiqueta,
  activo=true,
  updated_at=now();

-- ------------------------------------------------------------
-- 3) ATLAS COMERCIAL COMUNAL v3
--    Se guarda en UF/m² para que el CRM pueda actualizar la UF y
--    los valores CLP suban automáticamente sin alterar la historia.
-- ------------------------------------------------------------

create table if not exists public.tpl_tasador_valores_comunales_v3 (
  id uuid primary key default gen_random_uuid(),
  comuna_key text not null,
  comuna text not null,
  segmento text not null default 'parcela_sola_5k_10k',
  minimo_uf_m2 numeric,
  promedio_uf_m2 numeric,
  premium_uf_m2 numeric,
  cantidad_muestra integer not null default 0,
  confianza text,
  fuentes jsonb not null default '[]'::jsonb,
  fecha_observacion date,
  activo boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tpl_tasador_valores_comunales_v3_unique
    unique(comuna_key,segmento)
);

-- Semilla inicial: referencias que ya tenía el Tasador.
-- Se convierten a UF usando la UF configurada actualmente en el CRM.
do $$
declare
  v_uf_json jsonb;
  v_uf numeric;
begin
  begin
    execute 'select to_jsonb(public.tpl_obtener_uf_v1())' into v_uf_json;
    v_uf := nullif(v_uf_json->>'valor_clp','')::numeric;
  exception when others then
    v_uf := null;
  end;

  if coalesce(v_uf,0) <= 0 then
    raise exception 'UF_NO_CONFIGURADA: actualiza la UF desde el CRM antes de instalar Tasador v3';
  end if;

  insert into public.tpl_tasador_valores_comunales_v3
    (comuna_key,comuna,segmento,minimo_uf_m2,promedio_uf_m2,premium_uf_m2,
     cantidad_muestra,confianza,fuentes,fecha_observacion,metadata)
  values
    ('quillon','Quillón','parcela_sola_5k_10k',3626/v_uf,4800/v_uf,5928/v_uf,22,'media-alta',
      '["Portal Inmobiliario","Yapo","Portal Terreno"]'::jsonb,'2026-07-29',
      jsonb_build_object('semilla_clp',jsonb_build_object('minimo_m2',3626,'promedio_m2',4800,'premium_m2',5928),'uf_instalacion',v_uf)),

    ('florida','Florida','parcela_sola_5k_10k',3800/v_uf,6000/v_uf,7143/v_uf,9,'media',
      '["Portal Inmobiliario","Yapo","Portal Terreno"]'::jsonb,'2026-07-31',
      jsonb_build_object('semilla_clp',jsonb_build_object('minimo_m2',3800,'promedio_m2',6000,'premium_m2',7143),'uf_instalacion',v_uf)),

    ('nacimiento','Nacimiento','parcela_sola_5k_10k',3508/v_uf,4294/v_uf,5015/v_uf,4,'baja-media',
      '["Portal Inmobiliario","Yapo","Portal Terreno"]'::jsonb,'2026-07-31',
      jsonb_build_object('semilla_clp',jsonb_build_object('minimo_m2',3508,'promedio_m2',4294,'premium_m2',5015),'uf_instalacion',v_uf)),

    ('yumbel','Yumbel','parcela_sola_5k_10k',3500/v_uf,4800/v_uf,6500/v_uf,8,'media',
      '["Portal Inmobiliario","Yapo","Portal Terreno"]'::jsonb,'2026-07-31',
      jsonb_build_object('semilla_clp',jsonb_build_object('minimo_m2',3500,'promedio_m2',4800,'premium_m2',6500),'uf_instalacion',v_uf)),

    ('negrete','Negrete','parcela_sola_5k_10k',5270/v_uf,6750/v_uf,9160/v_uf,3,'media-baja',
      '["Portal Inmobiliario","Yapo"]'::jsonb,'2026-07-31',
      jsonb_build_object('semilla_clp',jsonb_build_object('minimo_m2',5270,'promedio_m2',6750,'premium_m2',9160),'uf_instalacion',v_uf)),

    ('ranquil','Ránquil / Ñipas','parcela_sola_5k_10k',4000/v_uf,5000/v_uf,6500/v_uf,4,'media-baja',
      '["Portal Inmobiliario","Yapo"]'::jsonb,'2026-07-31',
      jsonb_build_object('semilla_clp',jsonb_build_object('minimo_m2',4000,'promedio_m2',5000,'premium_m2',6500),'uf_instalacion',v_uf)),

    ('nipas','Ñipas','parcela_sola_5k_10k',4000/v_uf,5000/v_uf,6500/v_uf,4,'media-baja',
      '["Portal Inmobiliario","Yapo"]'::jsonb,'2026-07-31',
      jsonb_build_object('alias_de','ranquil','semilla_clp',jsonb_build_object('minimo_m2',4000,'promedio_m2',5000,'premium_m2',6500),'uf_instalacion',v_uf)),

    ('pucon','Pucón','parcela_sola_5k_10k',9625/v_uf,10300/v_uf,12385/v_uf,8,'media',
      '["Portal Inmobiliario","Yapo","Portal Terreno"]'::jsonb,'2026-07-29',
      jsonb_build_object('semilla_clp',jsonb_build_object('minimo_m2',9625,'promedio_m2',10300,'premium_m2',12385),'uf_instalacion',v_uf)),

    ('caburgua','Caburgua','parcela_sola_5k_10k',9625/v_uf,10300/v_uf,12385/v_uf,8,'media',
      '["Portal Inmobiliario","Yapo","Portal Terreno"]'::jsonb,'2026-07-29',
      jsonb_build_object('alias_de','pucon','semilla_clp',jsonb_build_object('minimo_m2',9625,'promedio_m2',10300,'premium_m2',12385),'uf_instalacion',v_uf))
  on conflict(comuna_key,segmento) do nothing;
end $$;

-- ------------------------------------------------------------
-- 4) HELPERS
-- ------------------------------------------------------------

create or replace function public.tpl_tasador_v3_param_v1(p_clave text)
returns numeric
language sql
stable
security definer
set search_path=public
as $$
  select valor_numerico
  from public.tpl_tasador_parametros_v3
  where clave=p_clave and activo=true
  limit 1;
$$;

create or replace function public.tpl_tasador_v3_factor_hub_v1(p_km numeric)
returns numeric
language sql
stable
security definer
set search_path=public
as $$
  select multiplicador
  from public.tpl_tasador_distancia_hub_v3
  where activo=true
    and coalesce(p_km,0) > km_desde
    and (km_hasta is null or coalesce(p_km,0) <= km_hasta)
  order by orden
  limit 1;
$$;

-- Corrige específicamente 0 km para entrar al primer tramo.
create or replace function public.tpl_tasador_v3_factor_hub_v1(p_km numeric)
returns numeric
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_km numeric := greatest(0,coalesce(p_km,0));
  v_factor numeric;
begin
  select multiplicador into v_factor
  from public.tpl_tasador_distancia_hub_v3
  where activo=true
    and (
      (orden=1 and v_km >= km_desde and (km_hasta is null or v_km <= km_hasta))
      or
      (orden>1 and v_km > km_desde and (km_hasta is null or v_km <= km_hasta))
    )
  order by orden
  limit 1;

  return coalesce(v_factor,1);
end;
$$;

create or replace function public.tpl_tasador_v3_superficie_base_uf_v1(p_area numeric)
returns numeric
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_area numeric := greatest(0,coalesce(p_area,0));
  v_base_5000 numeric := public.tpl_tasador_v3_param_v1('base_5000_uf');
  v_rate numeric;
  v_total numeric := 0;
begin
  if v_area <= 0 then return 0; end if;

  -- UF/m² implícita del valor base de 5.000 m².
  v_rate := v_base_5000 / 5000.0;

  v_total :=
      least(v_area,7000) * v_rate * public.tpl_tasador_v3_param_v1('superficie_ratio_0_7000')
    + greatest(least(v_area,10000)-7000,0) * v_rate * public.tpl_tasador_v3_param_v1('superficie_ratio_7000_10000')
    + greatest(least(v_area,20000)-10000,0) * v_rate * public.tpl_tasador_v3_param_v1('superficie_ratio_10000_20000')
    + greatest(v_area-20000,0) * v_rate * public.tpl_tasador_v3_param_v1('superficie_ratio_sobre_20000');

  return round(v_total,4);
end;
$$;

-- ------------------------------------------------------------
-- 5) MOTOR v3 EN MODO PREVIEW
-- ------------------------------------------------------------

create or replace function public.tpl_tasador_v3_preview_propiedad_v1(
  p_propiedad_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  p public.tpl_propiedades%rowtype;
  g public.tpl_geoint_propiedad_contexto%rowtype;

  v_uf_json jsonb;
  v_uf numeric;

  v_area numeric;
  v_base_uf numeric;
  v_factor_hub numeric;
  v_valor_uf numeric;

  v_desc_comuna_pct numeric;
  v_desc_ruta_pct numeric;
  v_comuna_km numeric;
  v_hub_km numeric;
  v_ruta_km numeric;

  v_rol text;
  v_agua text;
  v_luz text;
  v_cerco text;
  v_naturaleza text;
  v_turismo text;

  v_ajustes jsonb := '[]'::jsonb;

  v_comuna_key text;
  v_ref public.tpl_tasador_valores_comunales_v3%rowtype;
  v_ref_total_uf numeric;
  v_ref_min_uf numeric;
  v_ref_premium_uf numeric;

  v_peso_tecnico numeric;
  v_peso_comunal numeric;
  v_final_uf numeric;
  v_tecnico_uf numeric;
begin
  select * into p
  from public.tpl_propiedades
  where id=p_propiedad_id;

  if not found then
    return jsonb_build_object('ok',false,'error','PROPIEDAD_NO_EXISTE');
  end if;

  select * into g
  from public.tpl_geoint_propiedad_contexto
  where propiedad_id=p.id;

  begin
    execute 'select to_jsonb(public.tpl_obtener_uf_v1())' into v_uf_json;
    v_uf := nullif(v_uf_json->>'valor_clp','')::numeric;
  exception when others then
    v_uf := null;
  end;

  if coalesce(v_uf,0)<=0 then
    return jsonb_build_object('ok',false,'error','UF_NO_CONFIGURADA');
  end if;

  v_area := coalesce(p.superficie_m2,0);
  if v_area<=0 then
    return jsonb_build_object('ok',false,'error','SUPERFICIE_INVALIDA');
  end if;

  v_hub_km := coalesce(g.distancia_hub_efectivo_km,0);
  v_comuna_km := coalesce(g.distancia_centro_comunal_km,0);
  v_ruta_km := greatest(0,coalesce(p.distancia_ruta_principal_km,0));

  -- Base + ciudad grande.
  v_base_uf := public.tpl_tasador_v3_superficie_base_uf_v1(v_area);
  v_factor_hub := public.tpl_tasador_v3_factor_hub_v1(v_hub_km);
  v_valor_uf := v_base_uf * v_factor_hub;

  -- Depreciación comunal: -1%/km con tope.
  v_desc_comuna_pct := least(
    public.tpl_tasador_v3_param_v1('descuento_comuna_max_pct'),
    v_comuna_km * public.tpl_tasador_v3_param_v1('descuento_comuna_pct_km')
  );
  v_valor_uf := v_valor_uf * (1 - v_desc_comuna_pct/100.0);

  -- Distancia a ruta principal asfaltada: -1%/km con tope.
  v_desc_ruta_pct := least(
    public.tpl_tasador_v3_param_v1('descuento_ruta_max_pct'),
    v_ruta_km * public.tpl_tasador_v3_param_v1('descuento_ruta_pct_km')
  );
  v_valor_uf := v_valor_uf * (1 - v_desc_ruta_pct/100.0);

  -- Normalizaciones.
  v_rol := public.tpl_geoint_normalizar_texto_v1(coalesce(p.rol_situacion,''));
  v_agua := public.tpl_geoint_normalizar_texto_v1(coalesce(p.agua,''));
  v_luz := public.tpl_geoint_normalizar_texto_v1(coalesce(p.electricidad,''));
  v_cerco := public.tpl_geoint_normalizar_texto_v1(coalesce(p.cierre_perimetral,''));
  v_turismo := public.tpl_geoint_normalizar_texto_v1(coalesce(g.nivel_turismo,''));

  select string_agg(public.tpl_geoint_normalizar_texto_v1(x), ' ')
    into v_naturaleza
  from jsonb_array_elements_text(coalesce(p.atributos_naturales,'[]'::jsonb)) x;

  v_naturaleza := coalesce(v_naturaleza,'');

  -- Rol.
  if v_rol ~ 'rol propio|propio' then
    v_valor_uf := v_valor_uf * (1 + public.tpl_tasador_v3_param_v1('rol_propio_pct')/100.0);
    v_ajustes := v_ajustes || jsonb_build_array(jsonb_build_object('factor','rol_propio','pct',public.tpl_tasador_v3_param_v1('rol_propio_pct')));
  elsif v_rol ~ 'sin rol|compartido|cesion' then
    v_valor_uf := v_valor_uf * (1 + public.tpl_tasador_v3_param_v1('sin_rol_propio_pct')/100.0);
    v_ajustes := v_ajustes || jsonb_build_array(jsonb_build_object('factor','sin_rol_propio','pct',public.tpl_tasador_v3_param_v1('sin_rol_propio_pct')));
  end if;

  -- Agua / factibilidad.
  if v_agua ~ 'factibilidad|apr|pozo|puntera|agua disponible|con agua' then
    v_valor_uf := v_valor_uf * (1 + public.tpl_tasador_v3_param_v1('agua_factibilidad_pct')/100.0);
    v_ajustes := v_ajustes || jsonb_build_array(jsonb_build_object('factor','agua','pct',public.tpl_tasador_v3_param_v1('agua_factibilidad_pct')));
  end if;

  -- Electricidad: empalme reemplaza factibilidad, no se suman ambos.
  if v_luz ~ 'empalme|conectada|conexion|conectado' then
    v_valor_uf := v_valor_uf * (1 + public.tpl_tasador_v3_param_v1('luz_empalme_pct')/100.0);
    v_ajustes := v_ajustes || jsonb_build_array(jsonb_build_object('factor','empalme_electrico','pct',public.tpl_tasador_v3_param_v1('luz_empalme_pct')));
  elsif v_luz ~ 'factibilidad|postacion|poste' then
    v_valor_uf := v_valor_uf * (1 + public.tpl_tasador_v3_param_v1('luz_factibilidad_pct')/100.0);
    v_ajustes := v_ajustes || jsonb_build_array(jsonb_build_object('factor','factibilidad_electrica','pct',public.tpl_tasador_v3_param_v1('luz_factibilidad_pct')));
  end if;

  -- Cerco.
  if v_cerco <> '' and v_cerco !~ 'sin cierre|sin cerco|no' then
    v_valor_uf := v_valor_uf * (1 + public.tpl_tasador_v3_param_v1('cerco_pct')/100.0);
    v_ajustes := v_ajustes || jsonb_build_array(jsonb_build_object('factor','cerco','pct',public.tpl_tasador_v3_param_v1('cerco_pct')));
  end if;

  -- Cuerpo de agua: una sola bonificación aunque existan varios.
  if v_naturaleza ~ 'rio|estero|vertiente|lago|laguna|terma|termal' then
    v_valor_uf := v_valor_uf * (1 + public.tpl_tasador_v3_param_v1('cuerpo_agua_pct')/100.0);
    v_ajustes := v_ajustes || jsonb_build_array(jsonb_build_object('factor','cuerpo_agua','pct',public.tpl_tasador_v3_param_v1('cuerpo_agua_pct')));
  end if;

  -- Turismo.
  if v_turismo='regional' then
    v_valor_uf := v_valor_uf * public.tpl_tasador_v3_param_v1('turismo_regional_mult');
    v_ajustes := v_ajustes || jsonb_build_array(jsonb_build_object('factor','turismo_regional','mult',public.tpl_tasador_v3_param_v1('turismo_regional_mult')));
  elsif v_turismo='nacional' then
    v_valor_uf := v_valor_uf * public.tpl_tasador_v3_param_v1('turismo_nacional_mult');
    v_ajustes := v_ajustes || jsonb_build_array(jsonb_build_object('factor','turismo_nacional','mult',public.tpl_tasador_v3_param_v1('turismo_nacional_mult')));
  elsif v_turismo='internacional' then
    v_valor_uf := v_valor_uf * public.tpl_tasador_v3_param_v1('turismo_internacional_mult');
    v_ajustes := v_ajustes || jsonb_build_array(jsonb_build_object('factor','turismo_internacional','mult',public.tpl_tasador_v3_param_v1('turismo_internacional_mult')));
  end if;

  v_tecnico_uf := v_valor_uf;

  -- Referencia comunal: prioridad localidad/sector y luego comuna.
  v_comuna_key := public.tpl_geoint_normalizar_texto_v1(coalesce(p.sector,p.comuna,''));

  select * into v_ref
  from public.tpl_tasador_valores_comunales_v3 r
  where r.activo=true
    and r.segmento='parcela_sola_5k_10k'
    and r.comuna_key in (
      v_comuna_key,
      public.tpl_geoint_normalizar_texto_v1(coalesce(p.comuna,''))
    )
  order by case when r.comuna_key=v_comuna_key then 0 else 1 end
  limit 1;

  -- Por ahora las referencias sembradas son para parcelas <10.000 m².
  if found and v_area < 10000 and coalesce(v_ref.promedio_uf_m2,0)>0 then
    v_ref_total_uf := v_ref.promedio_uf_m2 * v_area;
    v_ref_min_uf := coalesce(v_ref.minimo_uf_m2,0) * v_area;
    v_ref_premium_uf := coalesce(v_ref.premium_uf_m2,0) * v_area;

    v_peso_tecnico := public.tpl_tasador_v3_param_v1('peso_valor_tecnico_final');
    v_peso_comunal := public.tpl_tasador_v3_param_v1('peso_promedio_comunal_final');

    v_final_uf := (v_tecnico_uf*v_peso_tecnico) + (v_ref_total_uf*v_peso_comunal);
  else
    v_final_uf := v_tecnico_uf;
  end if;

  return jsonb_build_object(
    'ok',true,
    'version','tpl-tasador-v3-preview-20260807',
    'propiedad_id',p.id,
    'codigo',p.codigo,
    'titulo',p.titulo,
    'comuna',p.comuna,
    'sector',p.sector,
    'superficie_m2',v_area,
    'precio_publicado',p.precio_publicado,

    'uf',jsonb_build_object(
      'valor_clp',v_uf,
      'fecha',v_uf_json->>'fecha_valor',
      'fuente',v_uf_json->>'fuente'
    ),

    'distancias',jsonb_build_object(
      'centro_comunal_km',round(v_comuna_km,2),
      'hub_grande_km',round(v_hub_km,2),
      'ruta_principal_km',round(v_ruta_km,2),
      'factor_hub',v_factor_hub,
      'descuento_comuna_pct',round(v_desc_comuna_pct,2),
      'descuento_ruta_pct',round(v_desc_ruta_pct,2)
    ),

    'base',jsonb_build_object(
      'base_superficie_uf',round(v_base_uf,2),
      'base_superficie_clp',round(v_base_uf*v_uf),
      'despues_hub_uf',round(v_base_uf*v_factor_hub,2)
    ),

    'ajustes',v_ajustes,

    'mercado_comunal',case when v_ref.id is not null and v_area<10000 then
      jsonb_build_object(
        'comuna_key',v_ref.comuna_key,
        'minimo_uf_m2',v_ref.minimo_uf_m2,
        'promedio_uf_m2',v_ref.promedio_uf_m2,
        'premium_uf_m2',v_ref.premium_uf_m2,
        'minimo_total_clp',round(v_ref_min_uf*v_uf),
        'promedio_total_clp',round(v_ref_total_uf*v_uf),
        'premium_total_clp',round(v_ref_premium_uf*v_uf),
        'confianza',v_ref.confianza
      )
      else null end,

    'valor_tecnico_uf',round(v_tecnico_uf,2),
    'valor_tecnico_clp',round(v_tecnico_uf*v_uf),
    'valor_final_uf',round(v_final_uf,2),
    'valor_final_clp',round(v_final_uf*v_uf),
    'valor_final_m2_clp',round((v_final_uf*v_uf)/nullif(v_area,0))
  );
end;
$$;

-- ------------------------------------------------------------
-- 6) RADIOGRAFÍA DE TODA LA CARTERA SIN ESCRIBIR TASACIONES
-- ------------------------------------------------------------

create or replace function public.tpl_tasador_v3_preview_cartera_v1()
returns table (
  codigo text,
  titulo text,
  comuna text,
  superficie_m2 numeric,
  precio_publicado bigint,
  valor_v3 bigint,
  diferencia_pct numeric,
  valor_v3_m2 bigint,
  hub_km numeric,
  comuna_km numeric,
  ruta_km numeric,
  factor_hub numeric,
  turismo text,
  valor_tecnico bigint,
  promedio_comunal bigint,
  detalle jsonb
)
language sql
stable
security definer
set search_path=public
as $$
  with calculos as (
    select
      p.*,
      public.tpl_tasador_v3_preview_propiedad_v1(p.id) as j
    from public.tpl_propiedades p
    where p.estado in ('publicada','activa','disponible')
  )
  select
    p.codigo,
    p.titulo,
    p.comuna,
    p.superficie_m2,
    p.precio_publicado,
    nullif(p.j->>'valor_final_clp','')::numeric::bigint as valor_v3,
    case
      when coalesce(nullif(p.j->>'valor_final_clp','')::numeric,0)>0
       and coalesce(p.precio_publicado,0)>0
      then round(
        ((p.precio_publicado-nullif(p.j->>'valor_final_clp','')::numeric)
          /nullif(p.j->>'valor_final_clp','')::numeric)*100,1
      )
      else null
    end as diferencia_pct,
    nullif(p.j->>'valor_final_m2_clp','')::numeric::bigint as valor_v3_m2,
    nullif(p.j->'distancias'->>'hub_grande_km','')::numeric as hub_km,
    nullif(p.j->'distancias'->>'centro_comunal_km','')::numeric as comuna_km,
    nullif(p.j->'distancias'->>'ruta_principal_km','')::numeric as ruta_km,
    nullif(p.j->'distancias'->>'factor_hub','')::numeric as factor_hub,
    coalesce(g.nivel_turismo,'sin_influencia') as turismo,
    nullif(p.j->>'valor_tecnico_clp','')::numeric::bigint as valor_tecnico,
    nullif(p.j->'mercado_comunal'->>'promedio_total_clp','')::numeric::bigint as promedio_comunal,
    p.j as detalle
  from calculos p
  left join public.tpl_geoint_propiedad_contexto g on g.propiedad_id=p.id
  order by p.comuna,p.codigo;
$$;

-- ------------------------------------------------------------
-- 7) AUDITORÍA
-- ------------------------------------------------------------

create or replace function public.tpl_tasador_v3_auditoria_v1()
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  select jsonb_build_object(
    'version','tpl-tasador-v3-preview-20260807',
    'generado_at',now(),
    'parametros_activos',(select count(*) from public.tpl_tasador_parametros_v3 where activo),
    'tramos_hub',(select count(*) from public.tpl_tasador_distancia_hub_v3 where activo),
    'comunas_mercado',(select count(*) from public.tpl_tasador_valores_comunales_v3 where activo),
    'propiedades_preview',(select count(*) from public.tpl_tasador_v3_preview_cartera_v1()),
    'modo','SOLO_PREVIEW_NO_MODIFICA_TASACIONES'
  );
$$;

-- ------------------------------------------------------------
-- 8) SEGURIDAD
-- ------------------------------------------------------------

alter table public.tpl_tasador_parametros_v3 enable row level security;
alter table public.tpl_tasador_distancia_hub_v3 enable row level security;
alter table public.tpl_tasador_valores_comunales_v3 enable row level security;

revoke all on public.tpl_tasador_parametros_v3 from anon,authenticated;
revoke all on public.tpl_tasador_distancia_hub_v3 from anon,authenticated;
revoke all on public.tpl_tasador_valores_comunales_v3 from anon,authenticated;

grant select on public.tpl_tasador_parametros_v3 to authenticated;
grant select on public.tpl_tasador_distancia_hub_v3 to authenticated;
grant select on public.tpl_tasador_valores_comunales_v3 to authenticated;

grant all on public.tpl_tasador_parametros_v3 to service_role;
grant all on public.tpl_tasador_distancia_hub_v3 to service_role;
grant all on public.tpl_tasador_valores_comunales_v3 to service_role;

revoke all on function public.tpl_tasador_v3_preview_propiedad_v1(uuid) from public;
revoke all on function public.tpl_tasador_v3_preview_cartera_v1() from public;
revoke all on function public.tpl_tasador_v3_auditoria_v1() from public;

grant execute on function public.tpl_tasador_v3_preview_propiedad_v1(uuid) to authenticated,service_role;
grant execute on function public.tpl_tasador_v3_preview_cartera_v1() to authenticated,service_role;
grant execute on function public.tpl_tasador_v3_auditoria_v1() to authenticated,service_role;

comment on function public.tpl_tasador_v3_preview_cartera_v1()
is 'Tasador TPL v3 en modo preview. No escribe ni reemplaza tpl_tasaciones.';

