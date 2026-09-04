-- TPL Studio: tabla de borradores y conexión con la propiedad
--
-- QUÉ PASABA
--   frontend-v2/js/core/tpl-data-service.js escribe y lee tpl_studio_drafts en
--   tres funciones (saveStudioDraft, updateStudioDraftStatus,
--   getStudioDraftsByActor), pero esa tabla NUNCA existió en la base. Cada
--   guardado fallaba, caía al catch y terminaba en localStorage. Es decir: todo
--   el contenido que un partner producía en Studio vivía solo en su navegador y
--   desaparecía al cambiar de equipo. Las tablas studio_campaigns,
--   studio_outputs y studio_events sí existen pero están vacías: nadie las usa.
--
-- QUÉ HACE ESTA MIGRACIÓN
--   Crea tpl_studio_drafts con la forma exacta que el frontend ya escribe, la
--   enlaza a la propiedad para que Studio pueda partir de la ficha real y de su
--   tasación canónica, y expone una vista que junta borrador + valor TPL +
--   nivel de marketing que corresponde. Esa vista es el puente con el CRM y el
--   informe premium: los tres leen el mismo valor.
--
-- TABLAS AFECTADAS
--   Crea tpl_studio_drafts y la vista tpl_studio_contexto_v1. No modifica nada
--   existente.
--
-- REVERSIÓN
--   drop view tpl_studio_contexto_v1; drop table tpl_studio_drafts;

create table if not exists public.tpl_studio_drafts (
  id uuid primary key default gen_random_uuid(),
  -- El frontend manda 'actorId' en camelCase; se respeta el nombre para no
  -- romper el codigo que ya existe.
  "actorId" text,
  parcela_id uuid references public.tpl_propiedades(id) on delete set null,
  tipo_contenido text not null default 'indefinido',
  canal text,
  titulo text not null default 'Sin título',
  contenido text,
  estado text not null default 'borrador'
    check (estado in ('borrador','pendiente_aprobacion','aprobado','rechazado','publicado','archivado')),
  prompt_utilizado text,
  datos_base jsonb not null default '{}'::jsonb,
  historial_cambios jsonb not null default '[]'::jsonb,
  revisor_id text,
  fecha_aprobacion timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tpl_studio_drafts_actor_idx
  on public.tpl_studio_drafts("actorId", created_at desc);
create index if not exists tpl_studio_drafts_parcela_idx
  on public.tpl_studio_drafts(parcela_id, created_at desc);
create index if not exists tpl_studio_drafts_estado_idx
  on public.tpl_studio_drafts(estado, created_at desc);

drop trigger if exists trg_tpl_studio_drafts_updated_at on public.tpl_studio_drafts;
create trigger trg_tpl_studio_drafts_updated_at
before update on public.tpl_studio_drafts
for each row execute function public.tpl_set_updated_at();

alter table public.tpl_studio_drafts enable row level security;

-- Studio es una herramienta interna y de partners autenticados. Nada de esto
-- se abre a anonimos: son textos comerciales sin publicar.
drop policy if exists tpl_studio_drafts_staff_all on public.tpl_studio_drafts;
create policy tpl_studio_drafts_staff_all on public.tpl_studio_drafts
  for all to authenticated
  using (coalesce(public.tpl_es_staff(), false))
  with check (coalesce(public.tpl_es_staff(), false));

revoke all on public.tpl_studio_drafts from anon;
grant select, insert, update on public.tpl_studio_drafts to authenticated;


-- Puente entre Studio, el CRM y el informe premium: el mismo valor TPL y el
-- mismo nivel de marketing que muestra el informe, para que el contenido que se
-- produzca en Studio parta de la realidad comercial de la propiedad y no de un
-- formulario aparte.
create or replace view public.tpl_studio_contexto_v1 as
select
  p.id                                as propiedad_id,
  p.codigo,
  p.titulo,
  p.comuna,
  p.region,
  p.superficie_m2,
  p.precio_publicado,
  p.descripcion,
  p.atributos_naturales,
  coalesce(jsonb_array_length(coalesce(p.metadata->'imagenes','[]'::jsonb)), 0) as total_fotos,
  (p.metadata->>'valor_tpl_recomendado')::bigint  as valor_tpl,
  (p.metadata->>'valor_venta_apuro')::bigint      as valor_venta_apuro,
  (p.metadata->>'valor_comunal')::bigint          as valor_comunal,
  (p.metadata->>'valor_tpl_m2')::bigint           as valor_tpl_m2,
  p.metadata->>'tasacion_version_motor'           as version_motor,
  -- Mismos tramos que la seccion VI del informe premium.
  case
    when (p.metadata->>'valor_tpl_recomendado')::bigint >= 150000000 then 'Premium'
    when (p.metadata->>'valor_tpl_recomendado')::bigint >=  80000000 then 'Alto'
    when (p.metadata->>'valor_tpl_recomendado')::bigint >=  35000000 then 'Medio'
    else 'Base'
  end                                             as nivel_marketing,
  (select count(*) from public.tpl_studio_drafts d where d.parcela_id = p.id)                          as borradores,
  (select count(*) from public.tpl_studio_drafts d where d.parcela_id = p.id and d.estado = 'aprobado') as borradores_aprobados
from public.tpl_propiedades p
where p.estado in ('publicada','activa','disponible','revision');

revoke all on public.tpl_studio_contexto_v1 from anon;
grant select on public.tpl_studio_contexto_v1 to authenticated;
