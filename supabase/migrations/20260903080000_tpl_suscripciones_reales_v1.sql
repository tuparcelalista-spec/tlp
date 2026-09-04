-- Tu Parcela Lista
-- Suscripciones reales: tabla de órdenes + precio del plan Profesional
-- Fecha: 2026-09-03
--
-- QUÉ HACE
--   crear-pago-suscripcion escribía en tpl_ordenes_suscripcion, una tabla que
--   nunca se creó en ninguna migración, con plan_solicitado='pro', un código
--   que no existe en tpl_planes_comerciales (los reales son gratis, basico,
--   profesional, premium). Ese botón no podía completar una venta.
--
--   Esta migración crea la tabla real (misma forma que tpl_ordenes_informe,
--   que ya funciona) y le pone precio al plan "profesional" para que haya
--   algo que de verdad se pueda comprar.
--
-- SOBRE EL PLAN "premium" (Administración TPL)
--   A propósito NO se le pone precio_mensual_clp aquí. Su propia descripción
--   dice "Intermediación según contrato": es el plan de TPL Asesores
--   vendiendo por comisión (2% del valor de venta), no una suscripción
--   mensual fija. Ponerle un precio mensual además de la comisión duplicaría
--   el cobro. Si más adelante se decide cobrarlo como suscripción además de
--   la comisión, se agrega en una migración aparte con esa decisión explícita.
--
-- TABLAS AFECTADAS
--   Crea tpl_ordenes_suscripcion. Actualiza tpl_planes_comerciales.precio_
--   mensual_clp solo para 'profesional'.

create table if not exists public.tpl_ordenes_suscripcion (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,
  actor_id uuid not null references public.tpl_actores(id) on delete cascade,
  plan_id uuid not null references public.tpl_planes_comerciales(id) on delete restrict,
  monto_clp bigint not null check (monto_clp >= 0),
  estado text not null default 'pendiente_pago'
    check (estado in ('pendiente_pago','pago_iniciado','pagado','rechazado','cancelado','error')),
  proveedor_pago text,
  referencia_pago text,
  metadata jsonb not null default '{}'::jsonb,
  pagado_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tpl_ordenes_suscripcion_actor_idx on public.tpl_ordenes_suscripcion(actor_id, estado);
create index if not exists tpl_ordenes_suscripcion_estado_idx on public.tpl_ordenes_suscripcion(estado, created_at desc);

alter table public.tpl_ordenes_suscripcion enable row level security;
revoke all on public.tpl_ordenes_suscripcion from anon, authenticated;
-- Sin policies: se administra por Edge Functions con service role, igual que
-- tpl_ordenes_informe.

-- Precio real del plan Profesional. $39.900/mes es un valor de partida
-- razonable frente al Plan Impulso ($55.000 pago único) y debe confirmarse
-- o ajustarse por el equipo comercial de TPL.
update public.tpl_planes_comerciales
   set precio_mensual_clp = 39900, updated_at = now()
 where codigo = 'profesional';
