# Auditoría CRM: Error al Guardar y Eliminar Parcelas

## 1. El Diagnóstico Exacto
Al auditar el código fuente del CRM y compararlo con las políticas de seguridad de la base de datos (Supabase), he encontrado la raíz matemática del problema: **Faltan las Políticas de Seguridad a Nivel de Fila (RLS) para el equipo de TPL.**

El problema ocurre por una inconsistencia arquitectónica:
- Cuando editas una **Casa**, el CRM usa un "Procedimiento Almacenado" (RPC llamado `tpl_crm_guardar_casa_v1`) que salta las reglas estándar y guarda bien.
- Cuando editas o eliminas una **Parcela**, el CRM intenta modificar la tabla `tpl_propiedades` directamente. Sin embargo, en el archivo de migración `202607300000_tpl_nucleo_v1.sql`, la tabla `tpl_propiedades` tiene la seguridad estricta activada (`enable row level security`) **pero solo tiene permiso de LECTURA (Select)**. 

Al no existir reglas de `UPDATE` (Actualizar) ni `DELETE` (Eliminar) explícitas para tu cuenta de administrador en esa tabla, el motor de PostgreSQL rebota silenciosamente todas tus acciones por seguridad.

## 2. La Solución Inmediata
He programado el script SQL exacto que debes ejecutar en el "SQL Editor" de tu panel de Supabase para abrir los permisos al equipo de trabajo (Staff) sin comprometer la seguridad pública.

Copia y pega este código en tu Supabase:

```sql
-- Políticas RLS para CRM Staff en tpl_propiedades
-- Permite al equipo de TPL (operadores, administradores) modificar y borrar el catálogo de parcelas

-- 1. Eliminar políticas previas si existieran para evitar conflictos
drop policy if exists tpl_propiedades_staff_update on public.tpl_propiedades;
drop policy if exists tpl_propiedades_staff_delete on public.tpl_propiedades;
drop policy if exists tpl_propiedades_staff_insert on public.tpl_propiedades;

-- 2. Crear política para INSERTAR nuevas parcelas
create policy tpl_propiedades_staff_insert
on public.tpl_propiedades
for insert
to authenticated
with check (public.tpl_es_staff() = true);

-- 3. Crear política para ACTUALIZAR parcelas (El error de edición)
create policy tpl_propiedades_staff_update
on public.tpl_propiedades
for update
to authenticated
using (public.tpl_es_staff() = true)
with check (public.tpl_es_staff() = true);

-- 4. Crear política para ELIMINAR parcelas (El error de borrado)
create policy tpl_propiedades_staff_delete
on public.tpl_propiedades
for delete
to authenticated
using (public.tpl_es_staff() = true);
```

### ¿Qué hace este código?
Verifica mediante la función `public.tpl_es_staff()` si tu usuario logueado en el CRM pertenece a la tabla oficial de `tpl_staff`. Si es así, te otorga poderes de Dios sobre la tabla de parcelas, permitiendo que los botones "Guardar Cambios" y "Eliminar" del CRM por fin envíen los datos y Supabase los acepte en lugar de rebotarlos.
