-- ============================================================================
-- 20260906010000_tpl_contrataciones_servicio_v1
--
-- QUÉ RESUELVE
--   Al terminar de publicar, el publicador V2 mostraba un cartel de "Propiedad
--   Registrada" y ahí se acababa todo. La persona quedaba con la propiedad en
--   revisión y sin ninguna forma de contratar apoyo comercial, y TPL sin
--   ningún registro de intención de compra. Esta migración crea la base para
--   la pantalla de planes que aparece después de publicar.
--
-- POR QUÉ UNA TABLA NUEVA Y NO tpl_ordenes_informe
--   tpl_ordenes_informe ya se estiró para cubrir informes, reservas de parcela
--   y planes de TPL Studio (ver la bifurcación por tipo_informe dentro de
--   flow-webhook). Meterle un cuarto uso obligaría a tocar ese webhook, que
--   hoy es lo único que confirma las reservas pagadas: un error ahí rompe un
--   cobro que ya funciona. Además a esa tabla le faltan las dos columnas que
--   el panel administrativo pidió explícitamente — estado del SERVICIO
--   (distinto del estado del PAGO) y responsable asignado.
--
-- POR QUÉ LOS PRECIOS VIVEN EN LA BASE
--   El monto NUNCA se toma del navegador. tpl_crear_contratacion_servicio_v1
--   lo lee de tpl_planes_servicio, igual que tpl_crear_orden_reserva_v1 hace
--   con precio_publicado. Un precio enviado por el cliente se ignora.
--
-- SUPUESTO A CONFIRMAR (columna vigencia_dias)
--   Las duraciones de abajo (90 / 30 / 60 días y sin vencimiento para la
--   asesoría) NO vienen de una regla previa del proyecto: son un punto de
--   partida razonable para poder registrar "fecha de vencimiento del plan".
--   Se cambian con un update a tpl_planes_servicio, sin tocar código.
--
-- REVERSIÓN
--   drop function if exists public.tpl_crm_actualizar_contratacion_v1(uuid,text,uuid,text);
--   drop function if exists public.tpl_crm_contrataciones_v1(jsonb);
--   drop function if exists public.tpl_confirmar_contratacion_servicio_v1(uuid,jsonb);
--   drop function if exists public.tpl_crear_contratacion_servicio_v1(jsonb);
--   drop table if exists public.tpl_actor_etiquetas;
--   drop table if exists public.tpl_etiquetas;
--   drop table if exists public.tpl_contrataciones_servicio;
--   drop table if exists public.tpl_planes_servicio;
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. CATÁLOGO DE PLANES
--    Fuente de verdad del precio, el texto de la tarjeta y las automatizaciones
--    que dispara cada plan. La pantalla del publicador lo lee de aquí, así que
--    cambiar un precio o un beneficio no requiere tocar el frontend.
-- ---------------------------------------------------------------------------
create table if not exists public.tpl_planes_servicio (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,
  nombre text not null,
  descripcion text,
  precio_clp bigint not null default 0 check (precio_clp >= 0),
  precio_glosa text,                       -- "Sin costo inicial", cuando no hay monto
  condicion_glosa text,                    -- "2% + IVA solo si vendemos"
  comision_pct numeric(5,2),               -- comisión sobre la venta, si aplica
  badge text,                              -- "Más Popular" / "Servicio Integral"
  destacado boolean not null default false,
  boton_texto text not null default 'Elegir Plan',
  beneficios jsonb not null default '[]'::jsonb,
  etiqueta_crm text,                       -- etiqueta que se aplica al cliente
  vigencia_dias integer,                   -- null = sin vencimiento
  requiere_pago boolean not null default true,
  orden smallint not null default 0,
  activo boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_tpl_planes_servicio_updated_at on public.tpl_planes_servicio;
create trigger trg_tpl_planes_servicio_updated_at
before update on public.tpl_planes_servicio
for each row execute function public.tpl_set_updated_at();

insert into public.tpl_planes_servicio
  (codigo, nombre, descripcion, precio_clp, precio_glosa, condicion_glosa, comision_pct,
   badge, destacado, boton_texto, beneficios, etiqueta_crm, vigencia_dias, requiere_pago, orden)
values
  ('publicacion',
   'Solo Publicar',
   'Publica tu parcela y administra tú mismo las consultas.',
   2000, null, null, null,
   null, false, 'Elegir Plan',
   '["Publicación en TPL","Contacto directo con compradores","Edición del anuncio","Administración personal del proceso"]'::jsonb,
   'Plan Publicación', 90, true, 1),

  ('destacado',
   'Vender Más Rápido',
   'Obtén mayor exposición dentro de TPL para recibir más consultas.',
   19990, null, null, null,
   'Más Popular', true, 'Quiero Más Visibilidad',
   '["Todo lo del plan anterior","Publicación destacada","Prioridad en búsquedas","Aparición en portada","Difusión en redes sociales TPL","Mayor visibilidad"]'::jsonb,
   'Publicidad Destacada', 30, true, 2),

  ('marketing',
   'Marketing Inmobiliario',
   'Nos encargamos de crear una estrategia profesional de marketing para tu propiedad.',
   89990, null, null, null,
   null, false, 'Impulsar mi Propiedad',
   '["Landing Page exclusiva","Publicación en portales nacionales","Campañas Meta Ads","Video promocional","Diseño de piezas publicitarias","Informes semanales","Estadísticas","Optimización de campañas"]'::jsonb,
   'Marketing Inmobiliario', 60, true, 3),

  ('asesoria',
   'Asesoría TPL',
   'Nos convertimos en tu corredor y gestionamos toda la venta.',
   0, 'Sin costo inicial', '2% + IVA solo si vendemos', 2.00,
   'Servicio Integral', false, 'Quiero que TPL Venda por Mí',
   '["Todo el Marketing Inmobiliario","Corredor asignado","Atención de compradores","Coordinación de visitas","Negociación","Gestión documental","Acompañamiento completo","Cierre de la venta"]'::jsonb,
   'Corretaje', null, false, 4)
on conflict (codigo) do update set
  nombre = excluded.nombre,
  descripcion = excluded.descripcion,
  precio_clp = excluded.precio_clp,
  precio_glosa = excluded.precio_glosa,
  condicion_glosa = excluded.condicion_glosa,
  comision_pct = excluded.comision_pct,
  badge = excluded.badge,
  destacado = excluded.destacado,
  boton_texto = excluded.boton_texto,
  beneficios = excluded.beneficios,
  etiqueta_crm = excluded.etiqueta_crm,
  requiere_pago = excluded.requiere_pago,
  orden = excluded.orden,
  updated_at = now();

-- El catálogo es público a propósito: la pantalla de planes se muestra a quien
-- acaba de publicar, que no tiene sesión iniciada.
alter table public.tpl_planes_servicio enable row level security;
drop policy if exists tpl_planes_servicio_lectura_publica on public.tpl_planes_servicio;
create policy tpl_planes_servicio_lectura_publica
  on public.tpl_planes_servicio for select to anon, authenticated
  using (activo = true);
grant select on public.tpl_planes_servicio to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. ETIQUETAS DE CLIENTE
--    El CRM no tenía ninguna forma de etiquetar a una persona: el pedido
--    "agregar etiqueta Plan Publicación / Publicidad Destacada / Marketing
--    Inmobiliario / Corretaje" no tenía dónde escribirse. Se crea el mínimo:
--    catálogo de etiquetas + relación con el actor, sin duplicados.
-- ---------------------------------------------------------------------------
create table if not exists public.tpl_etiquetas (
  id uuid primary key default gen_random_uuid(),
  nombre text unique not null,
  color text not null default '#0b6ea8',
  categoria text not null default 'comercial',
  descripcion text,
  created_at timestamptz not null default now()
);

create table if not exists public.tpl_actor_etiquetas (
  actor_id uuid not null references public.tpl_actores(id) on delete cascade,
  etiqueta_id uuid not null references public.tpl_etiquetas(id) on delete cascade,
  origen text not null default 'manual',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (actor_id, etiqueta_id)
);

create index if not exists tpl_actor_etiquetas_etiqueta_idx
  on public.tpl_actor_etiquetas(etiqueta_id);

insert into public.tpl_etiquetas (nombre, color, categoria, descripcion) values
  ('Plan Publicación',       '#0b6ea8', 'comercial', 'Contrató el plan básico de publicación.'),
  ('Publicidad Destacada',   '#d97706', 'comercial', 'Contrató mayor exposición dentro de TPL.'),
  ('Marketing Inmobiliario', '#7c3aed', 'comercial', 'Contrató la estrategia de marketing profesional.'),
  ('Corretaje',              '#15803d', 'comercial', 'TPL gestiona la venta completa como corredor.'),
  ('Cliente Activo',         '#3eb8a0', 'estado',    'Tiene al menos un servicio contratado vigente.')
on conflict (nombre) do nothing;

alter table public.tpl_etiquetas enable row level security;
alter table public.tpl_actor_etiquetas enable row level security;
revoke all on public.tpl_etiquetas from anon, authenticated;
revoke all on public.tpl_actor_etiquetas from anon, authenticated;

drop policy if exists tpl_etiquetas_staff_lectura on public.tpl_etiquetas;
create policy tpl_etiquetas_staff_lectura
  on public.tpl_etiquetas for select to authenticated
  using (public.tpl_es_staff() = true);
grant select on public.tpl_etiquetas to authenticated;

drop policy if exists tpl_actor_etiquetas_staff_lectura on public.tpl_actor_etiquetas;
create policy tpl_actor_etiquetas_staff_lectura
  on public.tpl_actor_etiquetas for select to authenticated
  using (public.tpl_es_staff() = true);
grant select on public.tpl_actor_etiquetas to authenticated;

-- ---------------------------------------------------------------------------
-- 3. CONTRATACIONES
--    Estado del PAGO y estado del SERVICIO son columnas distintas a propósito:
--    un plan de marketing puede estar pagado y todavía sin ejecutar, y la
--    asesoría se activa sin haber cobrado nada.
-- ---------------------------------------------------------------------------
create table if not exists public.tpl_contrataciones_servicio (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null
    default ('CTR-' || to_char(now(),'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6))),

  actor_id uuid references public.tpl_actores(id) on delete set null,
  propiedad_id uuid references public.tpl_propiedades(id) on delete set null,
  publicacion_id uuid references public.tpl_publicaciones(id) on delete set null,
  plan_id uuid not null references public.tpl_planes_servicio(id) on delete restrict,
  plan_codigo text not null,
  plan_nombre text not null,

  monto_clp bigint not null default 0 check (monto_clp >= 0),
  moneda text not null default 'CLP',
  comision_pct numeric(5,2),

  estado_pago text not null default 'pendiente_pago'
    check (estado_pago in ('pendiente_pago','pago_iniciado','pagado','rechazado','cancelado','reembolsado','sin_costo')),
  estado_servicio text not null default 'pendiente_activacion'
    check (estado_servicio in ('pendiente_activacion','activo','en_ejecucion','completado','cancelado')),

  responsable_actor_id uuid references public.tpl_actores(id) on delete set null,
  oportunidad_id uuid references public.tpl_oportunidades(id) on delete set null,

  proveedor_pago text,
  medio_pago text,
  flow_order text,          -- "Flow ID" del panel administrativo
  flow_token text,
  referencia_pago text,

  contacto jsonb not null default '{}'::jsonb,
  propiedad_snapshot jsonb not null default '{}'::jsonb,

  pagado_at timestamptz,
  activado_at timestamptz,
  vence_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_tpl_contrataciones_servicio_updated_at on public.tpl_contrataciones_servicio;
create trigger trg_tpl_contrataciones_servicio_updated_at
before update on public.tpl_contrataciones_servicio
for each row execute function public.tpl_set_updated_at();

create index if not exists tpl_contrataciones_estado_idx
  on public.tpl_contrataciones_servicio(estado_pago, estado_servicio, created_at desc);
create index if not exists tpl_contrataciones_actor_idx
  on public.tpl_contrataciones_servicio(actor_id, created_at desc);
create index if not exists tpl_contrataciones_propiedad_idx
  on public.tpl_contrataciones_servicio(propiedad_id, created_at desc);
create index if not exists tpl_contrataciones_flow_idx
  on public.tpl_contrataciones_servicio(flow_order) where flow_order is not null;

-- Sin policies: se lee y escribe solo por RPC security definer. Igual que
-- tpl_actores, exponerla directo al navegador no aportaría nada y sí abriría
-- la puerta a que alguien liste los contactos de todos los clientes.
alter table public.tpl_contrataciones_servicio enable row level security;
revoke all on public.tpl_contrataciones_servicio from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. CREAR CONTRATACIÓN
--    La llama la edge function crear-pago-contratacion antes de mandar a Flow.
--    Se concede a anon porque quien acaba de publicar no tiene sesión.
-- ---------------------------------------------------------------------------
create or replace function public.tpl_crear_contratacion_servicio_v1(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_contacto jsonb := coalesce(v_payload->'contacto', '{}'::jsonb);
  v_plan public.tpl_planes_servicio;
  v_propiedad public.tpl_propiedades;
  v_actor_id uuid;
  v_email text;
  v_nombre text;
  v_telefono text;
  v_contratacion public.tpl_contrataciones_servicio;
  v_existente public.tpl_contrataciones_servicio;
begin
  select * into v_plan
  from public.tpl_planes_servicio
  where codigo = lower(trim(coalesce(v_payload->>'plan_codigo',''))) and activo = true;

  if v_plan.id is null then
    raise exception 'PLAN_INVALIDO';
  end if;

  v_email := lower(nullif(trim(coalesce(v_contacto->>'email', v_payload->>'email','')),''));
  v_nombre := nullif(left(trim(coalesce(v_contacto->>'nombre', v_payload->>'nombre','')),160),'');
  v_telefono := nullif(left(trim(coalesce(v_contacto->>'telefono', v_payload->>'telefono','')),40),'');

  if v_email is null or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'CORREO_INVALIDO';
  end if;

  -- La propiedad tiene que existir: es lo que amarra la contratación a algo
  -- real y lo que evita que alguien genere órdenes sueltas contra el catálogo.
  if nullif(trim(coalesce(v_payload->>'propiedad_id','')),'') is not null then
    select * into v_propiedad from public.tpl_propiedades
    where id = (v_payload->>'propiedad_id')::uuid;
  elsif nullif(trim(coalesce(v_payload->>'propiedad_codigo','')),'') is not null then
    select * into v_propiedad from public.tpl_propiedades
    where codigo = trim(v_payload->>'propiedad_codigo');
  end if;

  if v_propiedad.id is null then
    raise exception 'PROPIEDAD_NO_ENCONTRADA';
  end if;

  -- El actor sale de la propiedad recién publicada; si no viniera, se busca
  -- por correo. Nunca se crea uno nuevo aquí: publicar ya lo creó.
  v_actor_id := coalesce(
    v_propiedad.propietario_actor_id,
    v_propiedad.corredor_actor_id,
    (select a.id from public.tpl_actores a where lower(a.email) = v_email order by a.created_at limit 1)
  );

  -- Evita cobrar dos veces por doble clic: si ya hay una contratación viva de
  -- este mismo plan para esta propiedad, se devuelve esa.
  select * into v_existente
  from public.tpl_contrataciones_servicio
  where propiedad_id = v_propiedad.id
    and plan_codigo = v_plan.codigo
    and estado_pago in ('pendiente_pago','pago_iniciado','pagado','sin_costo')
    and created_at > now() - interval '2 hours'
  order by created_at desc
  limit 1;

  if v_existente.id is not null and v_existente.estado_pago in ('pendiente_pago','pago_iniciado') then
    return jsonb_build_object(
      'ok', true, 'reutilizada', true,
      'contratacion_id', v_existente.id, 'codigo', v_existente.codigo,
      'plan_codigo', v_existente.plan_codigo, 'plan_nombre', v_existente.plan_nombre,
      'monto_clp', v_existente.monto_clp, 'requiere_pago', v_plan.requiere_pago
    );
  end if;

  if v_existente.id is not null then
    raise exception 'PLAN_YA_CONTRATADO';
  end if;

  insert into public.tpl_contrataciones_servicio(
    actor_id, propiedad_id, publicacion_id, plan_id, plan_codigo, plan_nombre,
    monto_clp, comision_pct,
    estado_pago, estado_servicio,
    contacto, propiedad_snapshot,
    vence_at, metadata
  )
  values(
    v_actor_id, v_propiedad.id, v_propiedad.publicacion_id, v_plan.id, v_plan.codigo, v_plan.nombre,
    v_plan.precio_clp, v_plan.comision_pct,
    case when v_plan.requiere_pago then 'pendiente_pago' else 'sin_costo' end,
    'pendiente_activacion',
    jsonb_build_object('nombre', v_nombre, 'email', v_email, 'telefono', v_telefono),
    jsonb_build_object(
      'codigo', v_propiedad.codigo, 'titulo', v_propiedad.titulo,
      'comuna', v_propiedad.comuna, 'region', v_propiedad.region,
      'superficie_m2', v_propiedad.superficie_m2, 'precio_publicado', v_propiedad.precio_publicado
    ),
    case when v_plan.vigencia_dias is null then null
         else now() + (v_plan.vigencia_dias || ' days')::interval end,
    jsonb_build_object('origen', coalesce(v_payload->>'origen','publicador_v2'))
  )
  returning * into v_contratacion;

  insert into public.tpl_eventos(
    actor_id, propiedad_id, evento, categoria, origen, prioridad, descripcion, metadata
  )
  values(
    v_actor_id, v_propiedad.id, 'contratacion.creada', 'comercial', 'publicador', 'media',
    format('Contratación %s iniciada para el plan %s.', v_contratacion.codigo, v_plan.nombre),
    jsonb_build_object(
      'contratacion_id', v_contratacion.id, 'plan', v_plan.codigo,
      'monto_clp', v_plan.precio_clp, 'requiere_pago', v_plan.requiere_pago
    )
  );

  return jsonb_build_object(
    'ok', true,
    'contratacion_id', v_contratacion.id,
    'codigo', v_contratacion.codigo,
    'plan_codigo', v_plan.codigo,
    'plan_nombre', v_plan.nombre,
    'monto_clp', v_contratacion.monto_clp,
    'requiere_pago', v_plan.requiere_pago,
    'actor_id', v_actor_id,
    'email', v_email
  );
end;
$$;

revoke all on function public.tpl_crear_contratacion_servicio_v1(jsonb) from public;
grant execute on function public.tpl_crear_contratacion_servicio_v1(jsonb) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5. CONFIRMAR Y AUTOMATIZAR
--    Todo lo que pidió el flujo comercial ocurre AQUÍ DENTRO, en una sola
--    transacción: si algo falla, no queda un cliente etiquetado sin tareas ni
--    una oportunidad sin correo. El webhook de Flow solo la invoca.
--
--    Es idempotente: Flow reintenta la confirmación, y sin esta guarda cada
--    reintento duplicaría tareas y correos.
-- ---------------------------------------------------------------------------
create or replace function public.tpl_confirmar_contratacion_servicio_v1(
  p_contratacion_id uuid,
  p_pago jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_c public.tpl_contrataciones_servicio;
  v_plan public.tpl_planes_servicio;
  v_actor public.tpl_actores;
  v_etiqueta_id uuid;
  v_oportunidad_id uuid;
  v_email text;
  v_nombre text;
  v_tareas_creadas integer := 0;
  v_titulo text;
  v_url_anuncio text;
  v_estado_pago text;
begin
  select * into v_c from public.tpl_contrataciones_servicio
  where id = p_contratacion_id for update;

  if v_c.id is null then
    raise exception 'CONTRATACION_NO_ENCONTRADA';
  end if;

  -- Guarda de idempotencia. Un segundo aviso de Flow no vuelve a crear nada.
  if coalesce((v_c.metadata->>'automatizacion_aplicada')::boolean, false) then
    return jsonb_build_object('ok', true, 'sin_cambios', true, 'contratacion_id', v_c.id, 'codigo', v_c.codigo);
  end if;

  select * into v_plan from public.tpl_planes_servicio where id = v_c.plan_id;

  v_estado_pago := case when v_c.monto_clp > 0 then 'pagado' else 'sin_costo' end;
  v_email := nullif(trim(coalesce(v_c.contacto->>'email','')),'');
  v_nombre := coalesce(nullif(trim(coalesce(v_c.contacto->>'nombre','')),''), 'Propietario');
  v_titulo := coalesce(nullif(v_c.propiedad_snapshot->>'titulo',''), 'tu propiedad');
  v_url_anuncio := 'https://www.parcelalista.cl/parcela.html?codigo='
                   || coalesce(v_c.propiedad_snapshot->>'codigo','');

  update public.tpl_contrataciones_servicio
     set estado_pago = v_estado_pago,
         estado_servicio = 'activo',
         proveedor_pago = coalesce(nullif(p_pago->>'proveedor',''), case when v_c.monto_clp > 0 then 'flow' else 'sin_cobro' end),
         medio_pago = coalesce(nullif(p_pago->>'medio_pago',''), v_c.medio_pago),
         flow_order = coalesce(nullif(p_pago->>'flow_order',''), v_c.flow_order),
         referencia_pago = coalesce(nullif(p_pago->>'flow_order',''), v_c.referencia_pago),
         pagado_at = case when v_c.monto_clp > 0 then now() else null end,
         activado_at = now(),
         vence_at = case
           when v_plan.vigencia_dias is null then null
           else now() + (v_plan.vigencia_dias || ' days')::interval
         end,
         metadata = v_c.metadata
                    || jsonb_build_object('automatizacion_aplicada', true, 'confirmada_at', now())
                    || case when p_pago = '{}'::jsonb then '{}'::jsonb else jsonb_build_object('pago', p_pago) end
   where id = v_c.id
   returning * into v_c;

  -- ---- Cliente activo ----------------------------------------------------
  if v_c.actor_id is not null then
    select * into v_actor from public.tpl_actores where id = v_c.actor_id;

    update public.tpl_actores
       set estado = 'activo', updated_at = now()
     where id = v_c.actor_id and estado <> 'activo';

    -- Nada de insertar un rol 'cliente': tpl_actor_roles solo acepta los nueve
    -- roles del nucleo (comprador, propietario, corredor, partner, ...) y
    -- publicar ya dejo a esta persona como 'propietario'. "Cliente Activo" se
    -- expresa con la etiqueta, que es justo para lo que se creo la tabla.

    -- Etiqueta del plan + etiqueta transversal "Cliente Activo".
    for v_etiqueta_id in
      select e.id from public.tpl_etiquetas e
      where e.nombre in (v_plan.etiqueta_crm, 'Cliente Activo')
    loop
      insert into public.tpl_actor_etiquetas(actor_id, etiqueta_id, origen, metadata)
      values(v_c.actor_id, v_etiqueta_id, 'automatica',
             jsonb_build_object('contratacion_id', v_c.id, 'plan', v_c.plan_codigo))
      on conflict (actor_id, etiqueta_id) do nothing;
    end loop;
  end if;

  -- ---- Oportunidad comercial --------------------------------------------
  -- El pipeline del CRM solo conoce nueva/contactada/.../cancelada. El estado
  -- de negocio "Captación" que pidió la asesoría no es una de esas columnas:
  -- si se guardara en `estado`, la tarjeta caería en la columna equivocada y
  -- tpl_crm_actualizar_estado_oportunidad_v1 la rechazaría. Se guarda como
  -- fase_negocio en metadata y la tarjeta parte en "nueva", que es donde
  -- alguien tiene que tomarla.
  insert into public.tpl_oportunidades(
    codigo, actor_cliente_id, tipo, origen, estado, prioridad,
    nombre_contacto, email, telefono, mensaje, presupuesto,
    proxima_accion, proxima_accion_at, metadata
  )
  values(
    'OPS-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)),
    v_c.actor_id, 'servicio', 'contratacion_publicador', 'nueva',
    case when v_c.plan_codigo in ('marketing','asesoria') then 'alta' else 'media' end,
    v_nombre, v_email, nullif(v_c.contacto->>'telefono',''),
    format('Contrató el plan %s para %s.', v_c.plan_nombre, v_titulo),
    nullif(v_c.monto_clp, 0),
    case v_c.plan_codigo
      when 'asesoria' then 'Asignar corredor y hacer el contacto inicial'
      when 'marketing' then 'Arrancar la producción de marketing'
      when 'destacado' then 'Activar el destacado y la difusión en redes'
      else 'Confirmar la publicación con el propietario'
    end,
    now() + interval '1 day',
    jsonb_build_object(
      'contratacion_id', v_c.id,
      'contratacion_codigo', v_c.codigo,
      'plan', v_c.plan_codigo,
      'propiedad_id', v_c.propiedad_id,
      'monto_clp', v_c.monto_clp,
      'fase_negocio', case when v_c.plan_codigo = 'asesoria' then 'captacion' else 'servicio_contratado' end
    )
  )
  returning id into v_oportunidad_id;

  update public.tpl_contrataciones_servicio
     set oportunidad_id = v_oportunidad_id
   where id = v_c.id;

  -- ---- Tareas internas según el plan ------------------------------------
  if v_c.plan_codigo = 'marketing' then
    insert into public.tpl_tareas(actor_id, propiedad_id, titulo, detalle, tipo, prioridad, vence_at, metadata)
    select v_c.actor_id, v_c.propiedad_id, t.titulo,
           format('Plan Marketing Inmobiliario · %s · contratación %s', v_titulo, v_c.codigo),
           'marketing', t.prioridad, now() + (t.dias || ' days')::interval,
           jsonb_build_object('contratacion_id', v_c.id, 'plan', v_c.plan_codigo, 'automatica', true)
    from (values
      ('Crear Landing Page',              'alta',  3),
      ('Crear campaña Meta Ads',          'alta',  5),
      ('Crear video promocional',         'media', 7),
      ('Publicar en portales nacionales', 'alta',  4),
      ('Programar informe semanal',       'media', 7)
    ) as t(titulo, prioridad, dias);
    get diagnostics v_tareas_creadas = row_count;

  elsif v_c.plan_codigo = 'asesoria' then
    insert into public.tpl_tareas(actor_id, propiedad_id, titulo, detalle, tipo, prioridad, vence_at, metadata)
    select v_c.actor_id, v_c.propiedad_id, t.titulo,
           format('Asesoría TPL (corretaje) · %s · contratación %s', v_titulo, v_c.codigo),
           t.tipo, t.prioridad, now() + (t.dias || ' days')::interval,
           jsonb_build_object('contratacion_id', v_c.id, 'plan', v_c.plan_codigo, 'automatica', true)
    from (values
      ('Asignar corredor responsable',        'corretaje', 'urgente', 1),
      ('Contacto inicial con el propietario', 'corretaje', 'urgente', 1),
      ('Programar llamada de coordinación',   'corretaje', 'alta',    2),
      ('Solicitar el Informe de Propiedad',   'corretaje', 'alta',    3)
    ) as t(titulo, tipo, prioridad, dias);
    get diagnostics v_tareas_creadas = row_count;

  elsif v_c.plan_codigo = 'destacado' then
    insert into public.tpl_tareas(actor_id, propiedad_id, titulo, detalle, tipo, prioridad, vence_at, metadata)
    values(v_c.actor_id, v_c.propiedad_id, 'Activar publicación destacada',
           format('Destacar %s, priorizarla en búsquedas y difundirla en redes TPL · contratación %s', v_titulo, v_c.codigo),
           'publicacion', 'alta', now() + interval '1 day',
           jsonb_build_object('contratacion_id', v_c.id, 'plan', v_c.plan_codigo, 'automatica', true));
    v_tareas_creadas := 1;

  else
    insert into public.tpl_tareas(actor_id, propiedad_id, titulo, detalle, tipo, prioridad, vence_at, metadata)
    values(v_c.actor_id, v_c.propiedad_id, 'Confirmar publicación con el propietario',
           format('Plan Publicación · %s · contratación %s', v_titulo, v_c.codigo),
           'publicacion', 'media', now() + interval '2 days',
           jsonb_build_object('contratacion_id', v_c.id, 'plan', v_c.plan_codigo, 'automatica', true));
    v_tareas_creadas := 1;
  end if;

  -- ---- Correo al cliente -------------------------------------------------
  -- Va a la cola y lo despacha procesar-comunicaciones (plantilla
  -- contratacion_confirmada). La idempotency_key la aprovecha el índice único
  -- de tpl_comunicaciones_cola: aunque esta función se llamara dos veces, el
  -- cliente recibe un solo correo.
  if v_email is not null then
    insert into public.tpl_comunicaciones_cola(
      actor_id, canal, destinatario, plantilla, asunto, payload, estado, procesar_desde
    )
    values(
      v_c.actor_id, 'email', v_email, 'contratacion_confirmada',
      format('Contratación confirmada: %s', v_c.plan_nombre),
      jsonb_build_object(
        'idempotency_key', 'contratacion-' || v_c.id::text,
        'nombre', v_nombre,
        'plan', v_c.plan_nombre,
        'plan_codigo', v_c.plan_codigo,
        'codigo', v_c.codigo,
        'fecha', to_char(now() at time zone 'America/Santiago', 'DD/MM/YYYY HH24:MI'),
        'monto', v_c.monto_clp,
        'condicion', v_plan.condicion_glosa,
        'beneficios', v_plan.beneficios,
        'propiedad', v_titulo,
        'propiedad_codigo', v_c.propiedad_snapshot->>'codigo',
        'medio_pago', coalesce(v_c.medio_pago, case when v_c.monto_clp > 0 then 'Flow' else 'Sin cobro inicial' end),
        'vence_at', v_c.vence_at,
        'url', v_url_anuncio,
        'factura_url', v_c.metadata#>>'{pago,factura_url}'
      ),
      'pendiente', now()
    )
    on conflict do nothing;
  end if;

  insert into public.tpl_eventos(
    actor_id, propiedad_id, evento, categoria, origen, prioridad, descripcion, metadata
  )
  values(
    v_c.actor_id, v_c.propiedad_id, 'contratacion.confirmada', 'comercial',
    case when v_c.monto_clp > 0 then 'flow' else 'publicador' end, 'alta',
    format('%s confirmó el plan %s (%s).', v_nombre, v_c.plan_nombre, v_c.codigo),
    jsonb_build_object(
      'contratacion_id', v_c.id, 'plan', v_c.plan_codigo, 'monto_clp', v_c.monto_clp,
      'oportunidad_id', v_oportunidad_id, 'tareas_creadas', v_tareas_creadas,
      'flow_order', v_c.flow_order
    )
  );

  return jsonb_build_object(
    'ok', true,
    'contratacion_id', v_c.id,
    'codigo', v_c.codigo,
    'plan_codigo', v_c.plan_codigo,
    'plan_nombre', v_c.plan_nombre,
    'estado_pago', v_c.estado_pago,
    'estado_servicio', v_c.estado_servicio,
    'oportunidad_id', v_oportunidad_id,
    'tareas_creadas', v_tareas_creadas,
    'vence_at', v_c.vence_at,
    'monto_clp', v_c.monto_clp
  );
end;
$$;

-- Solo el webhook (service_role) confirma pagos. Si esto fuera invocable desde
-- el navegador, cualquiera activaría un plan de $89.990 sin pagarlo.
revoke all on function public.tpl_confirmar_contratacion_servicio_v1(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.tpl_confirmar_contratacion_servicio_v1(uuid, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- 6. MARCAR PAGO FALLIDO
--    Un pago rechazado o cancelado no puede dejar la contratación en
--    "pendiente" para siempre: el panel tiene que poder distinguirlos.
-- ---------------------------------------------------------------------------
create or replace function public.tpl_marcar_contratacion_fallida_v1(
  p_contratacion_id uuid,
  p_estado text,
  p_detalle jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_c public.tpl_contrataciones_servicio;
begin
  if p_estado not in ('rechazado','cancelado') then
    raise exception 'ESTADO_INVALIDO';
  end if;

  update public.tpl_contrataciones_servicio
     set estado_pago = p_estado,
         estado_servicio = 'cancelado',
         metadata = metadata || jsonb_build_object('pago_fallido', p_detalle, 'fallido_at', now())
   where id = p_contratacion_id
     and estado_pago in ('pendiente_pago','pago_iniciado')
   returning * into v_c;

  if v_c.id is null then
    return jsonb_build_object('ok', true, 'sin_cambios', true);
  end if;

  insert into public.tpl_eventos(
    actor_id, propiedad_id, evento, categoria, origen, prioridad, descripcion, metadata
  )
  values(
    v_c.actor_id, v_c.propiedad_id, 'contratacion.pago_fallido', 'comercial', 'flow', 'alta',
    format('El pago de la contratación %s quedó %s. El cliente no tiene el servicio activo.', v_c.codigo, p_estado),
    jsonb_build_object('contratacion_id', v_c.id, 'plan', v_c.plan_codigo, 'detalle', p_detalle)
  );

  return jsonb_build_object('ok', true, 'contratacion_id', v_c.id, 'estado_pago', p_estado);
end;
$$;

revoke all on function public.tpl_marcar_contratacion_fallida_v1(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.tpl_marcar_contratacion_fallida_v1(uuid, text, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- 7. LECTURA PARA EL CRM
--    Módulo "Contrataciones de servicios". No se agrega al snapshot general
--    porque ese payload ya viaja completo en cada arranque del CRM.
-- ---------------------------------------------------------------------------
create or replace function public.tpl_crm_contrataciones_v1(p_filtros jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_f jsonb := coalesce(p_filtros, '{}'::jsonb);
  v_limite integer := least(greatest(coalesce((v_f->>'limite')::integer, 200), 1), 500);
  v_filas jsonb;
  v_resumen jsonb;
begin
  if auth.uid() is null or not coalesce(public.tpl_es_staff(), false) then
    raise exception 'Acceso CRM no autorizado' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc), '[]'::jsonb)
    into v_filas
  from (
    select
      c.id, c.codigo, c.plan_codigo, c.plan_nombre,
      c.monto_clp, c.comision_pct, c.estado_pago, c.estado_servicio,
      c.flow_order, c.medio_pago, c.proveedor_pago,
      c.contacto, c.propiedad_snapshot,
      c.pagado_at, c.activado_at, c.vence_at, c.created_at,
      c.actor_id, c.propiedad_id, c.oportunidad_id, c.responsable_actor_id,
      cli.nombre as cliente_nombre, cli.email as cliente_email, cli.telefono as cliente_telefono,
      resp.nombre as responsable_nombre,
      op.estado as oportunidad_estado,
      (select count(*) from public.tpl_tareas t
        where t.metadata->>'contratacion_id' = c.id::text) as tareas_total,
      (select count(*) from public.tpl_tareas t
        where t.metadata->>'contratacion_id' = c.id::text and t.estado = 'completada') as tareas_completadas
    from public.tpl_contrataciones_servicio c
    left join public.tpl_actores cli on cli.id = c.actor_id
    left join public.tpl_actores resp on resp.id = c.responsable_actor_id
    left join public.tpl_oportunidades op on op.id = c.oportunidad_id
    where (nullif(v_f->>'plan','') is null or c.plan_codigo = v_f->>'plan')
      and (nullif(v_f->>'estado_pago','') is null or c.estado_pago = v_f->>'estado_pago')
      and (nullif(v_f->>'estado_servicio','') is null or c.estado_servicio = v_f->>'estado_servicio')
      and (nullif(v_f->>'responsable','') is null or c.responsable_actor_id = (v_f->>'responsable')::uuid)
      and (nullif(v_f->>'desde','') is null or c.created_at >= (v_f->>'desde')::timestamptz)
      and (nullif(v_f->>'hasta','') is null or c.created_at < ((v_f->>'hasta')::timestamptz + interval '1 day'))
    order by c.created_at desc
    limit v_limite
  ) x;

  select jsonb_build_object(
    'total', count(*),
    'pagadas', count(*) filter (where estado_pago = 'pagado'),
    'pendientes', count(*) filter (where estado_pago in ('pendiente_pago','pago_iniciado')),
    'fallidas', count(*) filter (where estado_pago in ('rechazado','cancelado')),
    'sin_costo', count(*) filter (where estado_pago = 'sin_costo'),
    'ingresos_clp', coalesce(sum(monto_clp) filter (where estado_pago = 'pagado'), 0),
    'servicios_por_ejecutar', count(*) filter (where estado_servicio in ('activo','en_ejecucion')),
    'sin_responsable', count(*) filter (where responsable_actor_id is null and estado_servicio in ('activo','en_ejecucion'))
  ) into v_resumen
  from public.tpl_contrataciones_servicio;

  return jsonb_build_object(
    'ok', true,
    'contrataciones', v_filas,
    'resumen', v_resumen,
    'planes', coalesce((
      select jsonb_agg(jsonb_build_object('codigo', p.codigo, 'nombre', p.nombre) order by p.orden)
      from public.tpl_planes_servicio p where p.activo
    ), '[]'::jsonb),
    'ejecutivos', coalesce((
      select jsonb_agg(distinct jsonb_build_object('id', a.id, 'nombre', a.nombre))
      from public.tpl_actores a
      join public.tpl_actor_roles r on r.actor_id = a.id
      where r.rol in ('asesor_tpl','administrador','corredor') and a.estado = 'activo'
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.tpl_crm_contrataciones_v1(jsonb) from public, anon;
grant execute on function public.tpl_crm_contrataciones_v1(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. ACCIONES DEL PANEL
--    Cambiar el estado del servicio y asignar responsable. El estado del PAGO
--    no se toca a mano: lo escribe Flow.
-- ---------------------------------------------------------------------------
create or replace function public.tpl_crm_actualizar_contratacion_v1(
  p_contratacion_id uuid,
  p_estado_servicio text default null,
  p_responsable_actor_id uuid default null,
  p_nota text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_c public.tpl_contrataciones_servicio;
  v_previo text;
begin
  if auth.uid() is null or not coalesce(public.tpl_es_staff(), false) then
    raise exception 'Acceso CRM no autorizado' using errcode = '42501';
  end if;

  if p_estado_servicio is not null
     and p_estado_servicio not in ('pendiente_activacion','activo','en_ejecucion','completado','cancelado') then
    raise exception 'ESTADO_SERVICIO_INVALIDO';
  end if;

  select estado_servicio into v_previo
  from public.tpl_contrataciones_servicio where id = p_contratacion_id for update;

  if v_previo is null then
    raise exception 'CONTRATACION_NO_ENCONTRADA';
  end if;

  update public.tpl_contrataciones_servicio
     set estado_servicio = coalesce(p_estado_servicio, estado_servicio),
         responsable_actor_id = coalesce(p_responsable_actor_id, responsable_actor_id),
         metadata = case when nullif(trim(coalesce(p_nota,'')),'') is null then metadata
                         else metadata || jsonb_build_object('ultima_nota', p_nota, 'ultima_nota_at', now()) end
   where id = p_contratacion_id
   returning * into v_c;

  insert into public.tpl_eventos(
    actor_id, propiedad_id, evento, categoria, origen, prioridad, descripcion, metadata
  )
  values(
    v_c.actor_id, v_c.propiedad_id, 'contratacion.actualizada', 'comercial', 'crm_staff', 'baja',
    coalesce(nullif(trim(coalesce(p_nota,'')),''),
             format('Servicio de %s: %s → %s', v_c.codigo, v_previo, v_c.estado_servicio)),
    jsonb_build_object(
      'contratacion_id', v_c.id, 'estado_anterior', v_previo,
      'estado_nuevo', v_c.estado_servicio, 'responsable', v_c.responsable_actor_id
    )
  );

  return jsonb_build_object(
    'ok', true, 'contratacion_id', v_c.id,
    'estado_servicio', v_c.estado_servicio,
    'responsable_actor_id', v_c.responsable_actor_id
  );
end;
$$;

revoke all on function public.tpl_crm_actualizar_contratacion_v1(uuid, text, uuid, text) from public, anon;
grant execute on function public.tpl_crm_actualizar_contratacion_v1(uuid, text, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 9. CONSULTA PÚBLICA DE UNA CONTRATACIÓN
--    La usa la pantalla de confirmación al volver de Flow. Devuelve lo justo
--    para mostrar el comprobante: nunca datos de otras personas ni del CRM.
-- ---------------------------------------------------------------------------
create or replace function public.tpl_contratacion_estado_v1(p_codigo text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_c public.tpl_contrataciones_servicio;
begin
  select * into v_c from public.tpl_contrataciones_servicio
  where codigo = upper(trim(coalesce(p_codigo,'')));

  if v_c.id is null then
    return jsonb_build_object('ok', false, 'error', 'CONTRATACION_NO_ENCONTRADA');
  end if;

  return jsonb_build_object(
    'ok', true,
    'codigo', v_c.codigo,
    'plan_nombre', v_c.plan_nombre,
    'plan_codigo', v_c.plan_codigo,
    'monto_clp', v_c.monto_clp,
    'estado_pago', v_c.estado_pago,
    'estado_servicio', v_c.estado_servicio,
    'creada_at', v_c.created_at,
    'pagado_at', v_c.pagado_at,
    'vence_at', v_c.vence_at,
    'propiedad', v_c.propiedad_snapshot,
    'nombre', v_c.contacto->>'nombre'
  );
end;
$$;

revoke all on function public.tpl_contratacion_estado_v1(text) from public;
grant execute on function public.tpl_contratacion_estado_v1(text) to anon, authenticated, service_role;
