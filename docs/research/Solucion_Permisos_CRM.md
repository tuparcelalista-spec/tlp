# Corrección de Permisos: GRANT y RLS en Supabase

El error `permission denied for table tpl_propiedades` significa que el rol de base de datos (`authenticated`) literalmente no tiene el permiso fundacional de PostgreSQL para ejecutar un `UPDATE` en esa tabla. Esto sucede antes de que las políticas RLS siquiera se evalúen.

Para solucionarlo definitivamente, debemos otorgar los privilegios (GRANT) al rol y además mantener las políticas RLS. 

Copia y ejecuta este script en el SQL Editor de Supabase:

```sql
-- 1. Otorgar permisos fundacionales de PostgreSQL a los roles de la API
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tpl_propiedades TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tpl_propiedades TO anon;

-- 2. Asegurarse de que el usuario actual es Staff (Puedes correr esto para auto-asignarte si tu correo es el administrador)
-- Cambia 'tu@correo.com' por el correo con el que entras al CRM
-- select public.tpl_asignar_staff_por_email('tu@correo.com', 'administrador');

-- 3. Limpiar políticas defectuosas anteriores
drop policy if exists tpl_propiedades_staff_update on public.tpl_propiedades;
drop policy if exists tpl_propiedades_staff_delete on public.tpl_propiedades;
drop policy if exists tpl_propiedades_staff_insert on public.tpl_propiedades;

-- 4. Crear políticas RLS de seguridad (solo Staff puede editar/borrar)
create policy tpl_propiedades_staff_insert on public.tpl_propiedades
for insert to authenticated with check (public.tpl_es_staff() = true);

create policy tpl_propiedades_staff_update on public.tpl_propiedades
for update to authenticated using (public.tpl_es_staff() = true) with check (public.tpl_es_staff() = true);

create policy tpl_propiedades_staff_delete on public.tpl_propiedades
for delete to authenticated using (public.tpl_es_staff() = true);
```
