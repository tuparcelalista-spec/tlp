import { redirect } from "next/navigation";
import { checkStaffAccess } from "../../lib/auth/staff";
import { signOutAction } from "../../lib/auth/actions";

export const metadata = { title: "Acceso denegado · CRM TPL" };

export default async function AccesoDenegadoPage() {
  const access = await checkStaffAccess();
  if (access.status === "sin-sesion") redirect("/login");
  if (access.status === "ok") redirect("/");

  return (
    <div className="crm-auth">
      <div className="crm-auth__card">
        <h1>Acceso denegado</h1>
        <p>Esta cuenta no tiene privilegios de Staff. Tu cuenta no está autorizada para ingresar a esta plataforma.</p>
        <form action={signOutAction}>
          <button type="submit" className="crm-btn">
            Cerrar sesión
          </button>
        </form>
      </div>
    </div>
  );
}
