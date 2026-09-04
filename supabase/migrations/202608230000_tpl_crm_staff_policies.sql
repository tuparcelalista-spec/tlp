-- Políticas RLS para CRM Staff en tpl_propiedades
-- Permite al equipo de TPL (operadores, administradores, etc) modificar el catálogo de parcelas

-- 1. Aseguramos que la tabla tenga RLS habilitado (por si acaso)
alter table public.tpl_propiedades enable row level security;

-- 2. Eliminar política previa si existiera para evitar conflictos
drop policy if exists tpl_propiedades_staff_all on public.tpl_propiedades;
drop policy if exists tpl_propiedades_staff_update on public.tpl_propiedades;
drop policy if exists tpl_propiedades_staff_delete on public.tpl_propiedades;
drop policy if exists tpl_propiedades_staff_insert on public.tpl_propiedades;

-- 3. Crear política para INSERT
create policy tpl_propiedades_staff_insert
on public.tpl_propiedades
for insert
to authenticated
with check (public.tpl_es_staff() = true);

-- 4. Crear política para UPDATE
create policy tpl_propiedades_staff_update
on public.tpl_propiedades
for update
to authenticated
using (public.tpl_es_staff() = true)
with check (public.tpl_es_staff() = true);

-- 5. Crear política para DELETE
create policy tpl_propiedades_staff_delete
on public.tpl_propiedades
for delete
to authenticated
using (public.tpl_es_staff() = true);
