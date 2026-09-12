/**
 * Contrato PROVISIONAL de infraestructura — Fase 1 (Deprecado).
 *
 * El cliente único de Supabase ya se encuentra implementado en `@tpl/core`:
 * - `createSupabasePublicClient` para el frontend y Server Actions públicas.
 * - `createSupabaseAdminClient` para operaciones privilegiadas del backend.
 *
 * @deprecated Utilizar `createSupabasePublicClient` o `createSupabaseAdminClient` desde `@tpl/core`.
 */
export interface TplSupabaseClientPlaceholder {
  readonly __infraestructuraSolo: true;
}

