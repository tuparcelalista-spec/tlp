import type { Metadata } from "next";
import { Container, Section, Button, Stack, Card } from "@tpl/ui";
import { SITE_URL, SITE_NAME } from "../../lib/seo/site";

const TITLE = "Comenzar mi proyecto rural | Tu Parcela Lista";
const DESCRIPTION =
  "Confirma tu solicitud para iniciar tu proyecto de parcela y vivienda con el acompañamiento integral de Tu Parcela Lista.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/comenzar-proyecto` },
  robots: { index: false, follow: false },
};

import { WHATSAPP_PHONE } from "../../lib/contact";

interface ComenzarProyectoProps {
  searchParams?: Promise<{ parcela?: string; casa?: string }>;
}

export default async function ComenzarProyectoPage({ searchParams }: ComenzarProyectoProps) {
  const resolved = searchParams ? await searchParams : undefined;
  const parcela = resolved?.parcela ? decodeURIComponent(resolved.parcela) : "";
  const casa = resolved?.casa ? decodeURIComponent(resolved.casa) : "";

  let extraDetalle = "";
  if (parcela && casa) {
    extraDetalle = ` para la parcela "${parcela}" con casa modelo "${casa}"`;
  } else if (parcela) {
    extraDetalle = ` para la parcela "${parcela}"`;
  } else if (casa) {
    extraDetalle = ` con casa modelo "${casa}"`;
  }

  const whatsappMsg = encodeURIComponent(
    `Hola, confirmé en el portal que quiero comenzar mi proyecto TPL${extraDetalle}. Me gustaría coordinar los siguientes pasos con un asesor.`,
  );
  const waUrl = `https://wa.me/${WHATSAPP_PHONE}?text=${whatsappMsg}`;

  return (
    <Section tone="canvas">
      <Container>
        <div style={{ maxWidth: 640, margin: "2.5rem auto 4rem" }}>
          <Card style={{ textAlign: "center", borderRadius: "20px", padding: "2.5rem" }}>
            <div
              style={{
                width: 68,
                height: 68,
                margin: "0 auto 1.5rem",
                borderRadius: "50%",
                background: "#dff4eb",
                color: "#12624b",
                display: "grid",
                placeItems: "center",
                fontSize: 32,
              }}
              aria-hidden="true"
            >
              ✓
            </div>

            <h1 style={{ fontSize: "1.85rem", color: "#132437", margin: "0 0 0.75rem", lineHeight: 1.25 }}>
              ¡Tu proyecto rural está en marcha!
            </h1>
            <p style={{ color: "#475569", lineHeight: 1.6, margin: "0 0 1.5rem" }}>
              {extraDetalle
                ? `Hemos registrado tu interés${extraDetalle}.`
                : "Hemos registrado tu interés en desarrollar tu proyecto de vida e inversión en el campo."}
            </p>

            <div
              style={{
                textAlign: "left",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "14px",
                padding: "1.25rem 1.5rem",
                margin: "1.5rem 0 2rem",
              }}
            >
              <strong
                style={{
                  display: "block",
                  color: "#003f7a",
                  fontSize: "0.8rem",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: "0.75rem",
                }}
              >
                Qué viene ahora
              </strong>
              <ol style={{ margin: 0, paddingLeft: "1.25rem", color: "#475569", lineHeight: 1.8 }}>
                <li>Un asesor especializado TPL revisa la viabilidad de tu proyecto.</li>
                <li>Te contacta directamente para resolver dudas legales, técnicas y valores.</li>
                <li>Coordinan la visita presencial a la parcela elegida.</li>
              </ol>
            </div>

            <Stack direction="row" gap={3} justify="center" wrap>
              <Button href={waUrl} variant="whatsapp">
                Confirmar por WhatsApp directo
              </Button>
              <Button href="/propiedades" variant="secondary">
                Ver más parcelas
              </Button>
              <Button href="/cotizador" variant="ghost">
                Ajustar cotización
              </Button>
            </Stack>
          </Card>
        </div>
      </Container>
    </Section>
  );
}
