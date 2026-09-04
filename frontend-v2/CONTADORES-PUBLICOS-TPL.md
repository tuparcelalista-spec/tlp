# Contadores públicos — TPL en números

El index incluye un bloque sutil con:
- Parcelas y campos
- Casas
- Empresas
- Proyectos
- Visitas

## Fuente de datos
1. Si Supabase está disponible, intenta obtener conteos reales desde:
   `parcelas`, `casas`, `contratistas`, `proyectos`, `visitas`.
2. Sin Supabase, calcula parcelas/casas/empresas desde los catálogos locales.
3. Proyectos y visitas quedan en 0 hasta contar con una fuente real.

No se inventan cifras. Cuando Supabase se conecte, el componente se actualiza automáticamente.
