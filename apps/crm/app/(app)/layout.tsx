import type { ReactNode } from "react";
import { requireStaffOrRedirect } from "../../lib/auth/staff";
import { Sidebar } from "../../components/nav/Sidebar";

/**
 * Shell protegido — puerto de la parte de `boot()` (`core/boot.js`) que
 * corre DESPUÉS de validar sesión + `tpl_es_staff()`: pinta sidebar/topbar y
 * deja el contenido a cada página. `requireStaffOrRedirect()` ya resuelve
 * el redirect a `/login` o `/acceso-denegado` — si este layout llega a
 * renderizar `children`, es porque hay una sesión de staff válida.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const { session } = await requireStaffOrRedirect();

  return (
    <div className="crm-app">
      <Sidebar staffEmail={session.user.email ?? "Staff TPL"} />
      <main className="crm-main">{children}</main>
    </div>
  );
}
