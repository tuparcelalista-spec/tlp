import { redirect } from "next/navigation";

/**
 * Reemplaza el placeholder de Fase 1 ("apps/crm — infraestructura, sin
 * módulos migrados, no conectado a Supabase"). Nota técnica: no vive dentro
 * de `app/(app)/` (que sí exige sesión de staff) porque este archivo
 * necesita seguir resolviendo la ruta "/" tal cual — el grupo de rutas
 * `(app)` no agrega segmento a la URL, así que un `page.tsx` ahí adentro
 * chocaría con este mismo archivo. La redirección es segura igual: el
 * destino (`/pipeline`) vive dentro de `app/(app)/layout.tsx`, que sí exige
 * `requireStaffOrRedirect()` antes de renderizar nada.
 *
 * El piloto (2026-09-13) solo migró un módulo real ("Pipeline comercial");
 * hasta que exista un dashboard ("Resumen ejecutivo"), entrar al CRM lleva
 * directo al único módulo que funciona de verdad.
 */
export default function CrmRootPage() {
  redirect("/pipeline");
}
