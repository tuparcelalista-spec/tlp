import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { getRevisionPageData } from "../../../lib/revision/data";
import { BandejaRevision } from "../../../components/revision/BandejaRevision";
import { Topbar } from "../../../components/nav/Topbar";

export const metadata = { title: "Bandeja de revisión · CRM TPL" };

// Bandeja en vivo — mientras una publicación espera revisión, no existe para
// el público: nunca servir una versión cacheada por build.
export const dynamic = "force-dynamic";

/** Puerto de `modules/revision/index.js` a Server Component + client component para la bandeja/ficha/decisión. */
export default async function RevisionPage() {
  const supabase = await createSupabaseServerClient();
  const publicaciones = await getRevisionPageData(supabase);

  return (
    <>
      <Topbar title="Bandeja de revisión" />
      <div className="crm-content">
        <BandejaRevision initialPublicaciones={publicaciones} />
      </div>
    </>
  );
}
