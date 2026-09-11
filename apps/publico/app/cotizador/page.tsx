import type { Metadata } from "next";
import { Container, Section, Stack, Badge } from "@tpl/ui";
import { createDefaultRepository } from "../../lib/search/supabaseSearchRepository";
import { CotizadorWizard } from "../../components/cotizador/CotizadorWizard";
import { SITE_URL, SITE_NAME } from "../../lib/seo/site";

const TITLE = "Cotizador de Casa y Proyecto Rural | Tu Parcela Lista";
const DESCRIPTION =
  "Diseña y cotiza tu proyecto integral de parcela y vivienda llave en mano. Terreno + Casa prefabricada o a medida + Fundación + Obras adicionales.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/cotizador` },
  openGraph: {
    title: `${TITLE} | ${SITE_NAME}`,
    description: DESCRIPTION,
    url: `${SITE_URL}/cotizador`,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: `${TITLE} | ${SITE_NAME}`,
    description: DESCRIPTION,
  },
};

interface CotizadorPageProps {
  searchParams?: Promise<{ parcelaId?: string }>;
}

export default async function CotizadorPage({ searchParams }: CotizadorPageProps) {
  const resolvedParams = searchParams ? await searchParams : undefined;
  const repository = createDefaultRepository();
  const properties = await repository.list();

  return (
    <>
      <Section tone="canvas">
        <Container>
          <Stack direction="column" gap={2} style={{ maxWidth: 840, marginInline: "auto", textAlign: "center" }}>
            <Badge variant="accent">PROYECTO INTEGRAL LLAVE EN MANO</Badge>
            <h1 style={{ fontSize: "clamp(2rem, 4vw, 3.2rem)", lineHeight: 1.15, margin: "8px 0 0 0" }}>
              Ahora imagina lo que puedes construir aquí.
            </h1>
            <p style={{ fontSize: "1.15rem", color: "#4a5d6e", lineHeight: 1.6, margin: "6px 0 0 0" }}>
              Compara casas prefabricadas o diseña a tu medida. Avanza por etapas, calcula costos de obras y mantén tu
              presupuesto bajo control con acompañamiento TPL.
            </p>
          </Stack>
        </Container>
      </Section>

      <Section tone="raised">
        <Container>
          <CotizadorWizard
            initialProperties={properties}
            preselectedParcelCode={resolvedParams?.parcelaId}
          />
        </Container>
      </Section>
    </>
  );
}
