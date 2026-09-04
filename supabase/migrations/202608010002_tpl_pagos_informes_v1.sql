-- TPL: soporte operativo para pagos e informes premium
-- Ejecutar después de 202608010001_tpl_productos_planes_informes_v1.sql

alter table public.tpl_ordenes_informe
  add column if not exists intento_pago_count integer not null default 0,
  add column if not exists ultimo_error text,
  add column if not exists pago_confirmado_payload jsonb not null default '{}'::jsonb;

create index if not exists tpl_ordenes_informe_codigo_estado_idx
  on public.tpl_ordenes_informe(codigo, estado);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('informes-tasacion','informes-tasacion',false,10485760,array['application/pdf'])
on conflict (id) do update set public=false, file_size_limit=10485760, allowed_mime_types=array['application/pdf'];

comment on table public.tpl_informes_tasacion is
'PDF premium inmutable asociado a una orden pagada. El acceso debe entregarse mediante URL firmada.';
