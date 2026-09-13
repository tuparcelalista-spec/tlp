import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { getActoresSnapshot } from "../../../lib/actores/data";
import { ActoresDirectory } from "../../../components/actores/ActoresDirectory";
import { Topbar } from "../../../components/nav/Topbar";

export const metadata = { title: "Clientes, leads y partners · CRM TPL" };

// Directorio de clientes reales — nunca servir una versión cacheada por build.
export const dynamic = "force-dynamic";

/** Puerto de `modules/actores/index.js` a Server Component + client component para la interacción (tabla, modal, archivar). */
export default async function ActoresPage() {
  const supabase = await createSupabaseServerClient();
  const { actores, oportunidades, parcelas } = await getActoresSnapshot(supabase);

  return (
    <>
      <Topbar title="Clientes, leads y partners" />
      <div className="crm-content">
        <ActoresDirectory actores={actores} oportunidades={oportunidades} parcelas={parcelas} />
      </div>
    </>
  );
}
