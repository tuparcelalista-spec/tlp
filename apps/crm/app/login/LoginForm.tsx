"use client";

import { useActionState } from "react";
import { signInAction, type SignInResult } from "../../lib/auth/actions";

const INITIAL_STATE: SignInResult | null = null;

/** Puerto de `renderLoginForm()`/`initLogin()` (`boot.js`/`components/login.js`) a un Server Action con `useActionState`. */
export function LoginForm() {
  const [state, formAction, isPending] = useActionState(signInAction, INITIAL_STATE);

  return (
    <form action={formAction}>
      <div className="crm-field">
        <label htmlFor="email">Correo electrónico</label>
        <input type="email" id="email" name="email" required autoComplete="username" autoFocus />
      </div>
      <div className="crm-field">
        <label htmlFor="password">Contraseña</label>
        <input type="password" id="password" name="password" required autoComplete="current-password" />
      </div>
      <button type="submit" className="crm-btn" disabled={isPending}>
        {isPending ? "Verificando..." : "Iniciar sesión"}
      </button>
      {state && !state.ok ? (
        <div className="crm-alert" role="alert">
          {state.error}
        </div>
      ) : null}
    </form>
  );
}
