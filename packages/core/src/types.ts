// Contrato PROVISIONAL de infraestructura — Fase 1.
//
// Esta interfaz representa la FORMA futura del cliente único de Supabase que
// reemplazará, en una fase posterior, los tres nombres globales de hoy
// (window.supabaseClient / window.tplCoreSupabase / window.tplSupabase,
// ver TPL-MASTER-MIGRATION-PLAN.md §1 y §3).
//
// NO se conecta a ninguna base de datos real. NO importa @supabase/supabase-js.
// NO reemplaza ni toca el cliente que hoy usa frontend-v2/. Supabase queda
// completamente fuera del alcance de la Fase 1 (ver §14 del Plan Maestro).
export interface TplSupabaseClientPlaceholder {
  readonly __infraestructuraSolo: true;
}
