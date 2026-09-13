import { redirect } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "../supabase/server";

/**
 * Puerta de acceso al CRM — puerto 1:1 de `verifyStaffAccess()`
 * (`frontend-v2/plataforma/crm-tpl-v1/core/auth.js`): sesión de Supabase
 * Auth existente Y la RPC `tpl_es_staff()` debe responder `true`. La RPC ya
 * existe en producción (`202607300002_tpl_security_rpc_v1.sql`) y está
 * `grant`eada solo a `authenticated` — sin sesión, ni siquiera se puede
 * llamar con éxito.
 */
export interface StaffContext {
  session: Session;
  isStaff: true;
}

export type StaffCheckResult = { status: "sin-sesion" } | { status: "sin-permiso"; session: Session } | ({ status: "ok" } & StaffContext);

export async function checkStaffAccess(): Promise<StaffCheckResult> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { status: "sin-sesion" };
  }

  const { data: isStaff, error } = await supabase.rpc("tpl_es_staff");
  if (error || !isStaff) {
    return { status: "sin-permiso", session };
  }

  return { status: "ok", session, isStaff: true };
}

/**
 * Para usar al principio de un Server Component protegido: redirige a
 * `/login` (sin sesión) o `/acceso-denegado` (con sesión pero sin
 * privilegios de staff) y, si todo está en orden, devuelve el contexto para
 * seguir usándolo (ej. para mostrar el nombre del staff).
 */
export async function requireStaffOrRedirect(): Promise<StaffContext> {
  const result = await checkStaffAccess();

  if (result.status === "sin-sesion") {
    redirect("/login");
  }
  if (result.status === "sin-permiso") {
    redirect("/acceso-denegado");
  }

  return result;
}
