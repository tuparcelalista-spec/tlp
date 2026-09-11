import type { Metadata } from "next";
import { Container, Section, Stack, Card, Button, Badge } from "@tpl/ui";
import { SITE_URL, SITE_NAME } from "../../lib/seo/site";

const TITLE = "Cómo comprar una parcela en Chile | Guía paso a paso";
const DESCRIPTION =
  "Conoce el proceso para buscar, evaluar y comprar una parcela o campo en Chile con seguridad jurídica, técnica y financiera.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/como-comprar` },
  openGraph: {
    title: `${TITLE} | ${SITE_NAME}`,
    description: DESCRIPTION,
    url: `${SITE_URL}/como-comprar`,
    type: "article",
  },
  twitter: {
    card: "summary",
    title: `${TITLE} | ${SITE_NAME}`,
    description: DESCRIPTION,
  },
};

const STEPS = [
  {
    step: "1",
    title: "Explora y compara alternativas",
    description:
      "Revisa ubicación, superficie, precio, accesos viales, factibilidad de agua y luz, y las características naturales del entorno. Compara opciones en la misma comuna para entender las diferencias de valor.",
    keyCheck: "Superficie útil, topografía y caminos de acceso.",
  },
  {
    step: "2",
    title: "Solicita información y resuelve dudas",
    description:
      "Consulta detalles técnicos específicos y agenda una visita en terreno cuando una propiedad coincida con lo que buscas. En TPL te facilitamos antecedentes preliminares y contacto directo.",
    keyCheck: "Rol propio individual (evita derechos o cesiones irregulares).",
  },
  {
    step: "3",
    title: "Visita el lugar en terreno",
    description:
      "Comprueba en persona el estado de los caminos en diferentes épocas del año, la pendiente del terreno, la exposición solar, el viento, la vegetación nativa y las distancias reales a centros urbanos y servicios básicos.",
    keyCheck: "Cobertura celular, accesos vehiculares y entorno vecinal.",
  },
  {
    step: "4",
    title: "Verifica los antecedentes legales y técnicos",
    description:
      "Solicita copia del Rol de avalúo, certificado de dominio vigente ante el Conservador de Bienes Raíces (CBR), certificado de hipotecas y gravámenes (GP), plano de subdivisión aprobado por el SAG y certificado del SII.",
    keyCheck: "Subdivisión SAG certificada y libre de litigios o prohibiciones.",
  },
  {
    step: "5",
    title: "Evalúa la inversión total de tu proyecto",
    description:
      "El valor del terreno es solo el punto de partida. Estima con claridad los costos complementarios: pozo profundo o agua de vertiente, empalme eléctrico a red o sistema solar, fosa séptica certificada, cierre perimetral y la vivienda que deseas construir.",
    keyCheck: "Presupuesto consolidado: Parcela + Obras + Vivienda.",
  },
  {
    step: "6",
    title: "Formaliza la compra con asesoría independiente",
    description:
      "Antes de realizar cualquier pago o firmar promesa de compraventa, valida todos los títulos mediante un abogado especialista en derecho inmobiliario rural. La firma definitiva debe realizarse ante Notario Público e inscribirse en el CBR.",
    keyCheck: "Escritura pública e inscripción de dominio a tu nombre.",
  },
];

const JSON_LD_HOWTO = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "Cómo comprar una parcela en Chile con seguridad",
  description: DESCRIPTION,
  step: STEPS.map((s, idx) => ({
    "@type": "HowToStep",
    position: idx + 1,
    name: s.title,
    text: s.description,
  })),
};

export default function ComoComprarPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD_HOWTO) }}
      />

      <Section tone="canvas">
        <Container>
          <Stack direction="column" gap={3} style={{ maxWidth: 840, marginInline: "auto", textAlign: "center" }}>
            <Badge variant="info">ORIENTACIÓN PARA COMPRADORES</Badge>
            <h1 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", lineHeight: 1.15, margin: 0 }}>
              Compra con más información y menos incertidumbre.
            </h1>
            <p style={{ fontSize: "1.15rem", color: "#4a5d6e", lineHeight: 1.6, margin: 0 }}>
              Tu Parcela Lista te acompaña para buscar, comparar y entender cada propiedad antes de tomar una decisión.
              Conoce los 6 pasos fundamentales para una compra rural informada y segura.
            </p>
          </Stack>
        </Container>
      </Section>

      <Section tone="raised">
        <Container>
          <div style={{ maxWidth: 840, marginInline: "auto" }}>
            <Stack direction="column" gap={4}>
              {STEPS.map((item) => (
                <Card key={item.step}>
                  <Card.Body padding="md">
                    <Stack direction="column" gap={2}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "36px",
                            height: "36px",
                            borderRadius: "50%",
                            backgroundColor: "#003f7a",
                            color: "#fff",
                            fontWeight: 700,
                            fontSize: "1rem",
                          }}
                        >
                          {item.step}
                        </span>
                        <h2 style={{ fontSize: "1.35rem", margin: 0 }}>{item.title}</h2>
                      </div>
                      <p style={{ color: "#3a4a58", lineHeight: 1.6, margin: "8px 0 0 0" }}>{item.description}</p>
                      <div
                        style={{
                          marginTop: "10px",
                          padding: "10px 14px",
                          backgroundColor: "rgba(0, 63, 122, 0.05)",
                          borderRadius: "8px",
                          fontSize: "0.9rem",
                          color: "#003f7a",
                          fontWeight: 500,
                        }}
                      >
                        <strong>Punto clave:</strong> {item.keyCheck}
                      </div>
                    </Stack>
                  </Card.Body>
                </Card>
              ))}

              <Card style={{ borderLeft: "4px solid #d9aa34" }}>
                <Card.Body padding="md">
                  <Stack direction="column" gap={2}>
                    <strong style={{ fontSize: "1.05rem", color: "#132437" }}>
                      Nota Institucional de Transparencia:
                    </strong>
                    <p style={{ margin: 0, color: "#4a5d6e", lineHeight: 1.6, fontSize: "0.95rem" }}>
                      Tu Parcela Lista facilita información técnica, herramientas de comparación y canales de contacto,
                      pero no reemplaza la revisión legal, técnica ni financiera que debe realizar cada comprador de
                      manera independiente previo al cierre del negocio.
                    </p>
                  </Stack>
                </Card.Body>
              </Card>

              <div style={{ textAlign: "center", paddingTop: "20px" }}>
                <Stack direction="row" gap={3} justify="center" wrap>
                  <Button href="/propiedades" variant="navy">
                    Explorar parcelas disponibles
                  </Button>
                  <Button href="/" variant="secondary">
                    Volver al inicio
                  </Button>
                </Stack>
              </div>
            </Stack>
          </div>
        </Container>
      </Section>
    </>
  );
}
