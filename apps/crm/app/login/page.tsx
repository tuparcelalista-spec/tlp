import { redirect } from "next/navigation";
import { checkStaffAccess } from "../../lib/auth/staff";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Iniciar sesión · CRM TPL" };

export default async function LoginPage() {
  // Alguien con sesión activa que visita /login directamente vuelve a
  // entrar (mismo criterio que el layout protegido: staff → /, sesión sin
  // permiso → /acceso-denegado).
  const access = await checkStaffAccess();
  if (access.status === "ok") redirect("/");
  if (access.status === "sin-permiso") redirect("/acceso-denegado");

  return (
    <div className="crm-auth">
      <div className="crm-auth__card">
        <h1>CRM TPL</h1>
        <p>Centro de operaciones · acceso exclusivo del equipo</p>
        <LoginForm />
      </div>
    </div>
  );
}
