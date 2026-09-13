import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { getParcelasResumen } from "../../../lib/parcelas/data";
import { ParcelasGrid } from "../../../components/parcelas/ParcelasGrid";
import { Topbar } from "../../../components/nav/Topbar";

export const metadata = { title: "Parcelas · CRM TPL" };

// Inventario real — nunca servir una versión cacheada por build.
export const dynamic = "force-dynamic";

/** Puerto de `modules/parcelas/index.js` a Server Component + client component para grilla/editor/compartir. */
export default async function ParcelasPage() {
  const supabase = await createSupabaseServerClient();
  const parcelas = await getParcelasResumen(supabase);

  return (
    <>
      <Topbar title="Parcelas" />
      <div className="crm-content">
        <ParcelasGrid initialParcelas={parcelas} />
      </div>
    </>
  );
}
