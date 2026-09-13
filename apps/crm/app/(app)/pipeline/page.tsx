import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { getPipelineSnapshot } from "../../../lib/pipeline/data";
import { COLUMNAS } from "../../../lib/pipeline/columns";
import { KanbanBoard } from "../../../components/pipeline/KanbanBoard";
import { Topbar } from "../../../components/nav/Topbar";

export const metadata = { title: "Pipeline comercial · CRM TPL" };

// Datos reales de negocio (oportunidades en curso) — nunca se debe servir
// una versión cacheada por build; cada carga de la vista refleja el
// pipeline en el momento en que el staff la abre.
export const dynamic = "force-dynamic";

/**
 * Puerto 1:1 de `modules/pipeline/index.js` (`render()` + la parte de
 * `init()` que arma `cards`) a un Server Component: el fetch del snapshot
 * pasa de correr en el navegador (`boot.js`) a correr en el servidor, con
 * la sesión de staff ya resuelta por `app/(app)/layout.tsx`.
 */
export default async function PipelinePage() {
  const supabase = await createSupabaseServerClient();
  const { cards, total } = await getPipelineSnapshot(supabase);

  return (
    <>
      <Topbar title="Pipeline comercial" />
      <div className="crm-content">
        <div className="pipeline-module">
          <div className="pipeline-module__head">
            <div>
              <h2>Pipeline de ventas</h2>
              <p>{total ? `${total} ${total === 1 ? "oportunidad activa" : "oportunidades activas"}` : "Todavía no hay oportunidades registradas. Las que entren por el sitio aparecerán aquí."}</p>
            </div>
            <span className="pipeline-module__ayuda">Arrastra una tarjeta para cambiarla de estado · pasa el mouse sobre una tarjeta y usa la × para descartarla</span>
          </div>
          <div className="pipeline-module__board">
            <KanbanBoard columns={COLUMNAS} initialCards={cards} />
          </div>
        </div>
      </div>
    </>
  );
}
