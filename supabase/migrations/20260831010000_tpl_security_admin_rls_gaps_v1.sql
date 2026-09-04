-- Fase 3 (auditoría de seguridad): cierra 2 brechas encontradas.
-- 1) tpl_es_admin() otorgaba privilegios de administrador a CUALQUIER fila de
--    tpl_staff, sin revisar su columna rol ni activo. Un asesor o un staff
--    desactivado quedaba con el mismo poder que un administrador real.
-- 2) 10 tablas quedaron sin RLS habilitado desde su creación (verificado por
--    ausencia de "enable row level security" en todas las migraciones que las
--    tocan). No se eliminan datos ni políticas existentes: solo se habilita
--    RLS y se agregan políticas, siguiendo el mismo patrón usado en
--    202608230000_tpl_crm_staff_policies.sql. Reversible con
--    "alter table ... disable row level security" + "drop policy" si hiciera falta.

begin;

-- 1) tpl_es_admin(): ahora exige rol='administrador' y activo=true.
create or replace function public.tpl_es_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tpl_staff s
    where s.user_id = auth.uid()
      and s.activo = true
      and s.rol = 'administrador'
  );
$$;

-- 2a) Tablas de inteligencia de mercado: ya tenían GRANT SELECT a
-- "authenticated" en su migración de origen; se preserva exactamente ese
-- mismo alcance de acceso, ahora aplicado a través de una política RLS en
-- vez de depender solo del GRANT (que no filtra fila por fila).
alter table public.tpl_market_match_feedback enable row level security;
drop policy if exists tpl_market_match_feedback_authenticated_read on public.tpl_market_match_feedback;
create policy tpl_market_match_feedback_authenticated_read
on public.tpl_market_match_feedback
for select to authenticated using (true);

alter table public.tpl_market_grupos_canonicos enable row level security;
drop policy if exists tpl_market_grupos_canonicos_authenticated_read on public.tpl_market_grupos_canonicos;
create policy tpl_market_grupos_canonicos_authenticated_read
on public.tpl_market_grupos_canonicos
for select to authenticated using (true);

alter table public.tpl_market_grupo_publicaciones enable row level security;
drop policy if exists tpl_market_grupo_publicaciones_authenticated_read on public.tpl_market_grupo_publicaciones;
create policy tpl_market_grupo_publicaciones_authenticated_read
on public.tpl_market_grupo_publicaciones
for select to authenticated using (true);

alter table public.tpl_market_historial_multifuente enable row level security;
drop policy if exists tpl_market_historial_multifuente_authenticated_read on public.tpl_market_historial_multifuente;
create policy tpl_market_historial_multifuente_authenticated_read
on public.tpl_market_historial_multifuente
for select to authenticated using (true);

-- 2b) Esquema "v3" (tpl_propiedad_core/comercial/entorno, expedientes y
-- mercado_referencia): nada en el frontend los consulta hoy (solo los
-- pobla supabase/scripts/migrate_v3.js con la service_role key, que
-- ignora RLS). Se restringe a staff por defecto -- la opción segura
-- mientras no exista un consumidor público definido -- en vez de dejarlas
-- abiertas por ausencia de RLS.
alter table public.tpl_propiedad_core enable row level security;
drop policy if exists tpl_propiedad_core_staff_all on public.tpl_propiedad_core;
create policy tpl_propiedad_core_staff_all
on public.tpl_propiedad_core
for all to authenticated using (public.tpl_es_staff()) with check (public.tpl_es_staff());

alter table public.tpl_propiedad_comercial enable row level security;
drop policy if exists tpl_propiedad_comercial_staff_all on public.tpl_propiedad_comercial;
create policy tpl_propiedad_comercial_staff_all
on public.tpl_propiedad_comercial
for all to authenticated using (public.tpl_es_staff()) with check (public.tpl_es_staff());

alter table public.tpl_expediente_terreno enable row level security;
drop policy if exists tpl_expediente_terreno_staff_all on public.tpl_expediente_terreno;
create policy tpl_expediente_terreno_staff_all
on public.tpl_expediente_terreno
for all to authenticated using (public.tpl_es_staff()) with check (public.tpl_es_staff());

alter table public.tpl_expediente_construccion enable row level security;
drop policy if exists tpl_expediente_construccion_staff_all on public.tpl_expediente_construccion;
create policy tpl_expediente_construccion_staff_all
on public.tpl_expediente_construccion
for all to authenticated using (public.tpl_es_staff()) with check (public.tpl_es_staff());

alter table public.tpl_propiedad_entorno enable row level security;
drop policy if exists tpl_propiedad_entorno_staff_all on public.tpl_propiedad_entorno;
create policy tpl_propiedad_entorno_staff_all
on public.tpl_propiedad_entorno
for all to authenticated using (public.tpl_es_staff()) with check (public.tpl_es_staff());

alter table public.tpl_mercado_referencia enable row level security;
drop policy if exists tpl_mercado_referencia_staff_all on public.tpl_mercado_referencia;
create policy tpl_mercado_referencia_staff_all
on public.tpl_mercado_referencia
for all to authenticated using (public.tpl_es_staff()) with check (public.tpl_es_staff());

-- 2c) tpl_mensajes_salida: cola de mensajes salientes (contiene
-- destinatarios). Sin RLS, cualquier usuario autenticado con GRANT por
-- defecto podría leer la bandeja de salida completa. Se restringe a staff.
alter table public.tpl_mensajes_salida enable row level security;
drop policy if exists tpl_mensajes_salida_staff_all on public.tpl_mensajes_salida;
create policy tpl_mensajes_salida_staff_all
on public.tpl_mensajes_salida
for all to authenticated using (public.tpl_es_staff()) with check (public.tpl_es_staff());

commit;
