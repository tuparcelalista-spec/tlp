import type { Metadata } from "next";
import { Container, Section, Grid, Card, Stack, Button, Badge } from "@tpl/ui";
import { PartnerApplicationDialog } from "../../components/red-partner/PartnerApplicationDialog";
import { SITE_URL, SITE_NAME } from "../../lib/seo/site";

const WHATSAPP_PHONE = "56988508361";

const TITLE = "Red Partner — Trabajos y servicios para proyectos de campo";
const DESCRIPTION =
  "Únete a la Red Partner de Tu Parcela Lista: conectamos a maestros, constructores y contratistas rurales con quienes ya compraron su parcela y necesitan pozos, cercos, fosas sépticas, movimiento de tierra o paneles solares.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/red-partner` },
  openGraph: {
    title: `${TITLE} | ${SITE_NAME}`,
    description: DESCRIPTION,
    url: `${SITE_URL}/red-partner`,
    type: "website",
  },
  twitter: { card: "summary", title: `${TITLE} | ${SITE_NAME}`, description: DESCRIPTION },
};

/**
 * Migrado desde `frontend-v2/red-partner-v2/index.html` — a propósito
 * SOLO el contenido (propuesta de valor, rubros, cómo funciona) y un CTA
 * de postulación directa por WhatsApp. El legacy real es un formulario de
 * 40+ campos (identidad, especialidades, método de trabajo por etapas,
 * condiciones de pago, borrador guardable con backend propio
 * `postular.js`) para un producto de perfil profesional ("TPL Studio")
 * que no forma parte de esta misión — eso queda documentado como posible
 * bloque futuro, no se porta acá.
 */
const RUBROS = [
  { title: "Pozos profundos", description: "Perforación y habilitación de agua para parcelas sin conexión a red." },
  { title: "Cercos y perimetrales", description: "Cierre de deslindes, mallas y cercos vivos para delimitar el terreno." },
  { title: "Fosas sépticas", description: "Instalación y certificación de sistemas de tratamiento de aguas servidas." },
  { title: "Movimiento de tierra", description: "Nivelación, accesos y habilitación de terreno para construcción." },
  { title: "Paneles solares", description: "Sistemas fotovoltaicos para parcelas fuera del alcance de la red eléctrica." },
];

const PASOS = [
  { step: "1", title: "Postula", description: "Cuéntanos tu oficio y las comunas donde trabajas." },
  { step: "2", title: "Te contactamos", description: "Revisamos tu postulación y te escribimos por WhatsApp." },
  { step: "3", title: "Recibes oportunidades", description: "Te avisamos cuando alguien en tu zona necesite tu servicio." },
  { step: "4", title: "Coordinas directo", description: "Acuerdas precio, alcance y fecha directamente con el cliente." },
];

export default function RedPartnerPage() {
  return (
    <>
      <Section tone="canvas">
        <Container>
          <Stack direction="column" gap={3} style={{ maxWidth: 760 }}>
            <Badge variant="info">RED PARTNER TPL</Badge>
            <h1>Tu trabajo puede ser lo que le falta a un proyecto de campo.</h1>
            <p>
              Conectamos a maestros, constructores y contratistas rurales con personas que ya compraron su parcela en Tu
              Parcela Lista y necesitan pozos, cercos, fosas sépticas, movimiento de tierra o paneles solares.
            </p>
            <div>
              <PartnerApplicationDialog whatsappPhone={WHATSAPP_PHONE} />
            </div>
          </Stack>
        </Container>
      </Section>

      <Section tone="raised">
        <Container>
          <h2>Rubros que conectamos</h2>
          <Grid columns={{ mobile: 1, tablet: 2, desktop: 3 }}>
            {RUBROS.map((rubro) => (
              <Card key={rubro.title}>
                <Card.Body>
                  <Stack direction="column" gap={2}>
                    <h3 style={{ margin: 0 }}>{rubro.title}</h3>
                    <p style={{ margin: 0 }}>{rubro.description}</p>
                  </Stack>
                </Card.Body>
              </Card>
            ))}
          </Grid>
        </Container>
      </Section>

      <Section tone="canvas">
        <Container>
          <h2>¿Cómo funciona?</h2>
          <Grid columns={{ mobile: 1, tablet: 2, desktop: 4 }}>
            {PASOS.map((paso) => (
              <Card key={paso.step}>
                <Card.Body>
                  <Stack direction="column" gap={2}>
                    <Badge variant="neutral">{paso.step}</Badge>
                    <h3 style={{ margin: 0 }}>{paso.title}</h3>
                    <p style={{ margin: 0 }}>{paso.description}</p>
                  </Stack>
                </Card.Body>
              </Card>
            ))}
          </Grid>
        </Container>
      </Section>

      <Section tone="inverse">
        <Container>
          <Stack direction="column" gap={3} style={{ textAlign: "center", alignItems: "center" }}>
            <h2>¿Listo para recibir nuevas oportunidades?</h2>
            <Stack direction="row" gap={3} wrap justify="center">
              <PartnerApplicationDialog whatsappPhone={WHATSAPP_PHONE} />
              <Button href="/" variant="secondary">
                Volver al inicio
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Section>
    </>
  );
}
