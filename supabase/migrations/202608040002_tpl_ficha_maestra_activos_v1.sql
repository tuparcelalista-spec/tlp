-- ============================================================
-- TPL CORE — FICHA MAESTRA DE ACTIVOS INMOBILIARIOS v1
-- Fecha: 2026-08-04
-- Extiende tpl_propiedades sin duplicar propiedades, actores,
-- servicios ni partners existentes.
-- ============================================================

create extension if not exists pgcrypto;

-- 1) Ampliar tipos soportados por la ficha maestra.
alter table public.tpl_propiedades
  drop constraint if exists tpl_propiedades_tipo_check;

alter table public.tpl_propiedades
  add constraint tpl_propiedades_tipo_check
  check (tipo in (
    'parcela',
    'campo',
    'casa',
    'casa_sola',
    'casa_con_terreno',
    'parcela_con_casa',
    'sitio_urbano',
    'proyecto_inmobiliario'
  ));

alter table public.tpl_propiedades
  add column if not exists clase_activo text not null default 'inmobiliario',
  add column if not exists subtipo text,
  add column if not exists nombre_comercial text,
  add column if not exists version_actual integer not null default 1,
  add column if not exists completitud_pct numeric(5,2) not null default 0,
  add column if not exists salud_anuncio_pct numeric(5,2) not null default 0,
  add column if not exists contacto_publico_modo text not null default 'tpl'
    check (contacto_publico_modo in ('tpl','propietario','corredor','mixto')),
  add column if not exists plan_codigo text not null default 'gratis',
  add column if not exists contacto_publico_actor_id uuid references public.tpl_actores(id) on delete set null;

create index if not exists tpl_propiedades_plan_idx
  on public.tpl_propiedades(plan_codigo, estado);

-- 2) Componente terreno: existe para parcela, campo, sitio y activos mixtos.
create table if not exists public.tpl_activo_terreno (
  propiedad_id uuid primary key references public.tpl_propiedades(id) on delete cascade,
  superficie_util_m2 numeric,
  superficie_construible_m2 numeric,
  frente_m numeric,
  fondo_m numeric,
  forma_terreno text,
  pendiente_pct numeric,
  orientacion text,
  uso_suelo text,
  subdivisible boolean,
  numero_lotes integer,
  rol_tipo text,
  rol_numero text,
  agua_tipo text,
  agua_distancia_m numeric,
  electricidad_tipo text,
  electricidad_distancia_m numeric,
  alcantarillado text,
  internet text,
  senal_movil text,
  acceso_invierno text,
  vehiculo_recomendado text,
  camino_ancho_m numeric,
  riesgo_inundacion text,
  riesgo_incendio text,
  restricciones jsonb not null default '[]'::jsonb,
  atributos jsonb not null default '{}'::jsonb,
  verificado jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_tpl_activo_terreno_updated_at on public.tpl_activo_terreno;
create trigger trg_tpl_activo_terreno_updated_at
before update on public.tpl_activo_terreno
for each row execute function public.tpl_set_updated_at();

-- 3) Componente vivienda: casa sola o vivienda sobre terreno.
create table if not exists public.tpl_activo_vivienda (
  propiedad_id uuid primary key references public.tpl_propiedades(id) on delete cascade,
  superficie_construida_m2 numeric,
  superficie_regularizada_m2 numeric,
  anio_construccion integer,
  estado_conservacion text,
  material_principal text,
  numero_pisos integer,
  dormitorios integer,
  banos numeric(4,1),
  estacionamientos integer,
  orientacion text,
  tipo_calefaccion text,
  eficiencia_energetica text,
  termopanel boolean,
  cocina_amoblada boolean,
  logia boolean,
  bodega boolean,
  terraza boolean,
  quincho boolean,
  piscina boolean,
  jardin boolean,
  ampliaciones jsonb not null default '[]'::jsonb,
  equipamiento jsonb not null default '{}'::jsonb,
  regularizacion jsonb not null default '{}'::jsonb,
  verificado jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_tpl_activo_vivienda_updated_at on public.tpl_activo_vivienda;
create trigger trg_tpl_activo_vivienda_updated_at
before update on public.tpl_activo_vivienda
for each row execute function public.tpl_set_updated_at();

-- 4) Componente comercial: reglas de contacto, urgencia y estrategia.
create table if not exists public.tpl_activo_comercial (
  propiedad_id uuid primary key references public.tpl_propiedades(id) on delete cascade,
  urgencia_venta text not null default 'normal'
    check (urgencia_venta in ('sin_apuro','normal','alta','urgente')),
  objetivo_propietario text,
  precio_minimo_aceptable bigint,
  acepta_ofertas boolean,
  acepta_facilidad_pago boolean,
  pie_minimo bigint,
  cuotas_maximas integer,
  comision_pct numeric(5,2),
  exclusividad boolean not null default false,
  exclusividad_hasta date,
  publico_objetivo jsonb not null default '[]'::jsonb,
  canales_activos jsonb not null default '[]'::jsonb,
  landing_url text,
  anuncio_url text,
  whatsapp_publico text,
  email_publico text,
  telefono_publico text,
  ultima_recomendacion text,
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_tpl_activo_comercial_updated_at on public.tpl_activo_comercial;
create trigger trg_tpl_activo_comercial_updated_at
before update on public.tpl_activo_comercial
for each row execute function public.tpl_set_updated_at();

-- 5) Puntajes actuales, separados del historial de tasaciones.
create table if not exists public.tpl_activo_scores (
  propiedad_id uuid primary key references public.tpl_propiedades(id) on delete cascade,
  nivel_informacion numeric(5,2),
  calidad_anuncio numeric(5,2),
  competitividad numeric(5,2),
  liquidez numeric(5,2),
  deseabilidad numeric(5,2),
  oportunidad numeric(5,2),
  confianza_tasacion numeric(5,2),
  estado_comercial text,
  explicacion jsonb not null default '{}'::jsonb,
  calculado_at timestamptz not null default now(),
  version_motor text
);

-- 6) Versiones inmutables para auditoría y aprendizaje.
create table if not exists public.tpl_activo_versiones (
  id uuid primary key default gen_random_uuid(),
  propiedad_id uuid not null references public.tpl_propiedades(id) on delete cascade,
  version integer not null,
  origen text not null default 'sistema',
  actor_id uuid references public.tpl_actores(id) on delete set null,
  motivo text,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  unique(propiedad_id, version)
);

create index if not exists tpl_activo_versiones_propiedad_idx
  on public.tpl_activo_versiones(propiedad_id, version desc);

-- 7) Ficha maestra de empresa Partner. La empresa es actor, no propiedad.
create table if not exists public.tpl_empresa_perfiles (
  actor_id uuid primary key references public.tpl_actores(id) on delete cascade,
  nombre_fantasia text,
  razon_social text,
  rut_empresa text,
  descripcion text,
  sitio_web text,
  whatsapp text,
  email_comercial text,
  anos_experiencia integer,
  equipo_tamano integer,
  verificacion_estado text not null default 'pendiente'
    check (verificacion_estado in ('pendiente','en_revision','verificada','rechazada','suspendida')),
  documentos jsonb not null default '[]'::jsonb,
  certificaciones jsonb not null default '[]'::jsonb,
  portafolio jsonb not null default '[]'::jsonb,
  rating numeric(3,2),
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_tpl_empresa_perfiles_updated_at on public.tpl_empresa_perfiles;
create trigger trg_tpl_empresa_perfiles_updated_at
before update on public.tpl_empresa_perfiles
for each row execute function public.tpl_set_updated_at();

-- 8) Snapshot automático antes de cambios relevantes.
create or replace function public.tpl_snapshot_activo_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next integer;
begin
  if to_jsonb(old) is distinct from to_jsonb(new) then
    v_next := coalesce(old.version_actual, 1);
    insert into public.tpl_activo_versiones(propiedad_id, version, origen, motivo, snapshot)
    values(old.id, v_next, 'trigger', 'Actualización de ficha maestra', to_jsonb(old))
    on conflict (propiedad_id, version) do nothing;
    new.version_actual := v_next + 1;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_tpl_propiedades_snapshot on public.tpl_propiedades;
create trigger trg_tpl_propiedades_snapshot
before update on public.tpl_propiedades
for each row execute function public.tpl_snapshot_activo_v1();

-- 9) RPC consolidada: una sola lectura para CRM, portal, informe y TPL Business.
create or replace function public.tpl_ficha_maestra_activo_v1(p_identificador text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_propiedad public.tpl_propiedades;
  v_terreno jsonb;
  v_vivienda jsonb;
  v_comercial jsonb;
  v_scores jsonb;
  v_imagenes jsonb;
  v_propietario jsonb;
  v_corredor jsonb;
begin
  select * into v_propiedad
  from public.tpl_propiedades p
  where p.id::text = p_identificador
     or p.codigo = p_identificador
     or p.metadata->>'source_legacy_id' = p_identificador
  order by case when p.id::text = p_identificador then 0 when p.codigo = p_identificador then 1 else 2 end
  limit 1;

  if v_propiedad.id is null then
    return jsonb_build_object('ok', false, 'error', 'ACTIVO_NO_ENCONTRADO');
  end if;

  select to_jsonb(t) - 'propiedad_id' into v_terreno
  from public.tpl_activo_terreno t where t.propiedad_id = v_propiedad.id;

  select to_jsonb(v) - 'propiedad_id' into v_vivienda
  from public.tpl_activo_vivienda v where v.propiedad_id = v_propiedad.id;

  select to_jsonb(c) - 'propiedad_id' into v_comercial
  from public.tpl_activo_comercial c where c.propiedad_id = v_propiedad.id;

  select to_jsonb(s) - 'propiedad_id' into v_scores
  from public.tpl_activo_scores s where s.propiedad_id = v_propiedad.id;

  select coalesce(jsonb_agg(to_jsonb(i) order by i.es_portada desc, i.orden asc), '[]'::jsonb)
  into v_imagenes
  from public.tpl_propiedad_imagenes i
  where i.propiedad_id = v_propiedad.id;

  select case when a.id is null then null else
    jsonb_build_object('id',a.id,'nombre',a.nombre,'tipo_actor',a.tipo_actor)
  end into v_propietario
  from public.tpl_actores a where a.id = v_propiedad.propietario_actor_id;

  select case when a.id is null then null else
    jsonb_build_object('id',a.id,'nombre',a.nombre,'tipo_actor',a.tipo_actor)
  end into v_corredor
  from public.tpl_actores a where a.id = v_propiedad.corredor_actor_id;

  return jsonb_build_object(
    'ok', true,
    'activo', to_jsonb(v_propiedad),
    'componentes', jsonb_build_object(
      'terreno', coalesce(v_terreno, '{}'::jsonb),
      'vivienda', coalesce(v_vivienda, '{}'::jsonb),
      'comercial', coalesce(v_comercial, '{}'::jsonb)
    ),
    'scores', coalesce(v_scores, '{}'::jsonb),
    'imagenes', v_imagenes,
    'relaciones', jsonb_build_object('propietario',v_propietario,'corredor',v_corredor),
    'contacto_publico', case
      when v_propiedad.contacto_publico_modo = 'tpl' or v_propiedad.plan_codigo = 'gratis' then
        jsonb_build_object('modo','tpl','whatsapp','+56988508361')
      else coalesce(v_comercial, '{}'::jsonb)
    end
  );
end;
$$;

-- 10) Inicialización automática de componentes según tipo.
create or replace function public.tpl_inicializar_componentes_activo_v1(p_propiedad_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tipo text;
begin
  select tipo into v_tipo from public.tpl_propiedades where id = p_propiedad_id;
  if v_tipo is null then raise exception 'Propiedad no encontrada'; end if;

  if v_tipo in ('parcela','campo','sitio_urbano','casa_con_terreno','parcela_con_casa','proyecto_inmobiliario') then
    insert into public.tpl_activo_terreno(propiedad_id) values(p_propiedad_id)
    on conflict (propiedad_id) do nothing;
  end if;

  if v_tipo in ('casa','casa_sola','casa_con_terreno','parcela_con_casa') then
    insert into public.tpl_activo_vivienda(propiedad_id) values(p_propiedad_id)
    on conflict (propiedad_id) do nothing;
  end if;

  insert into public.tpl_activo_comercial(propiedad_id, anuncio_url, whatsapp_publico)
  values(
    p_propiedad_id,
    '/parcela.html?id=' || coalesce((select codigo from public.tpl_propiedades where id=p_propiedad_id), p_propiedad_id::text),
    '+56988508361'
  ) on conflict (propiedad_id) do nothing;

  insert into public.tpl_activo_scores(propiedad_id, estado_comercial)
  values(p_propiedad_id, 'sin_calcular')
  on conflict (propiedad_id) do nothing;

  return jsonb_build_object('ok',true,'propiedad_id',p_propiedad_id,'tipo',v_tipo);
end;
$$;

-- Inicializar registros actuales sin borrar ni reemplazar datos.
do $$
declare r record;
begin
  for r in select id from public.tpl_propiedades loop
    perform public.tpl_inicializar_componentes_activo_v1(r.id);
  end loop;
end $$;

-- 11) Seguridad.
alter table public.tpl_activo_terreno enable row level security;
alter table public.tpl_activo_vivienda enable row level security;
alter table public.tpl_activo_comercial enable row level security;
alter table public.tpl_activo_scores enable row level security;
alter table public.tpl_activo_versiones enable row level security;
alter table public.tpl_empresa_perfiles enable row level security;

revoke all on function public.tpl_ficha_maestra_activo_v1(text) from public;
grant execute on function public.tpl_ficha_maestra_activo_v1(text) to anon, authenticated;

revoke all on function public.tpl_inicializar_componentes_activo_v1(uuid) from public;
grant execute on function public.tpl_inicializar_componentes_activo_v1(uuid) to authenticated;

comment on table public.tpl_propiedades is 'Ficha maestra canónica de activos inmobiliarios TPL.';
comment on table public.tpl_empresa_perfiles is 'Ficha maestra empresarial para actores Partner; no representa una propiedad.';
