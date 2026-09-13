import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { getTasacionesHistorial } from "../../../lib/tasaciones/data";
import { TasacionesHistorial } from "../../../components/tasaciones/TasacionesHistorial";
import { Topbar } from "../../../components/nav/Topbar";

export const metadata = { title: "Tasaciones · CRM TPL" };

// Historial en vivo — nunca servir una versión cacheada por build.
export const dynamic = "force-dynamic";

/** Puerto de `modules/tasaciones/index.js` a Server Component. */
export default async function TasacionesPage() {
  const supabase = await createSupabaseServerClient();
  const tasaciones = await getTasacionesHistorial(supabase);

  return (
    <>
      <Topbar title="Tasaciones" />
      <div className="crm-content">
        <TasacionesHistorial tasaciones={tasaciones} />
      </div>
    </>
  );
}
