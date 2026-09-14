import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { getVisitasPageData } from "../../../lib/visitas/data";
import { VisitasAgenda } from "../../../components/visitas/VisitasAgenda";
import { Topbar } from "../../../components/nav/Topbar";

export const metadata = { title: "Visitas · CRM TPL" };

// Agenda en vivo — nunca servir una versión cacheada por build.
export const dynamic = "force-dynamic";

/** Puerto de `modules/visitas/index.js` a Server Component + client component para la agenda/cancelar/agendar. */
export default async function VisitasPage() {
  const supabase = await createSupabaseServerClient();
  const { visitas, oportunidades, staff } = await getVisitasPageData(supabase);

  return (
    <>
      <Topbar title="Visitas" />
      <div className="crm-content">
        <VisitasAgenda initialVisitas={visitas} oportunidades={oportunidades} staff={staff} />
      </div>
    </>
  );
}
