import type { Metadata } from "next";
import { PublishWizard } from "../../components/publicar/PublishWizard";
import { SITE_URL, SITE_NAME } from "../../lib/seo/site";

const TITLE = "Publica tu propiedad";
const DESCRIPTION = "Publica tu parcela o campo en Tu Parcela Lista: cuéntanos la ubicación, características y precio esperado.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/publicar` },
  openGraph: { title: `${TITLE} | ${SITE_NAME}`, description: DESCRIPTION, url: `${SITE_URL}/publicar`, type: "website" },
  twitter: { card: "summary", title: `${TITLE} | ${SITE_NAME}`, description: DESCRIPTION },
};

/**
 * Server Component delgado — toda la interactividad (pasos, mapa Leaflet,
 * estado del formulario) vive en `PublishWizard.tsx` (Client Component,
 * autorizado explícitamente con `leaflet`/`@types/leaflet` como
 * dependencias nuevas — primera vez en este proyecto que se agrega una
 * dependencia externa real).
 */
export default function PublicarPage() {
  return <PublishWizard />;
}
