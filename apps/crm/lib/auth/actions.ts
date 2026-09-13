"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../supabase/server";

export interface SignInResult {
  ok: boolean;
  error?: string;
}

/**
 * Puerto de `signIn()`/el submit de `boot.js`'s `renderLoginForm()`. A
 * diferencia del CRM legacy (que hace `window.location.reload()` tras
 * iniciar sesión), acá se redirige server-side a `/` — el layout protegido
 * hace el resto (valida `tpl_es_staff()` y decide a dónde va cada quien).
 */
export async function signInAction(_prev: SignInResult | null, formData: FormData): Promise<SignInResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { ok: false, error: "Ingresa tu correo y tu contraseña." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { ok: false, error: "Credenciales inválidas o error de conexión." };
  }

  redirect("/");
}

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
