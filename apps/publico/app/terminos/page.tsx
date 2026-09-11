import type { Metadata } from "next";
import { Container, Section, Stack, Card, Button, Badge } from "@tpl/ui";
import { SITE_URL, SITE_NAME } from "../../lib/seo/site";

const TITLE = "Términos y Condiciones de Uso | Tu Parcela Lista";
const DESCRIPTION =
  "Condiciones generales de uso de la plataforma Tu Parcela Lista, publicaciones, tasaciones e informes.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/terminos` },
  openGraph: {
    title: `${TITLE} | ${SITE_NAME}`,
    description: DESCRIPTION,
    url: `${SITE_URL}/terminos`,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: `${TITLE} | ${SITE_NAME}`,
    description: DESCRIPTION,
  },
};

export default function TerminosPage() {
  return (
    <>
      <Section tone="canvas">
        <Container>
          <Stack direction="column" gap={3} style={{ maxWidth: 840, marginInline: "auto", textAlign: "center" }}>
            <Badge variant="info">MARCO DE USO TPL</Badge>
            <h1 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", lineHeight: 1.15, margin: 0 }}>
              Términos claros para una plataforma confiable.
            </h1>
            <p style={{ fontSize: "1.15rem", color: "#4a5d6e", lineHeight: 1.6, margin: 0 }}>
              Estas condiciones explican el alcance de la información, herramientas y servicios disponibles dentro del
              ecosistema Tu Parcela Lista en Chile.
            </p>
          </Stack>
        </Container>
      </Section>

      <Section tone="raised">
        <Container>
          <div style={{ maxWidth: 840, marginInline: "auto" }}>
            <Card>
              <Card.Body padding="md">
                <Stack direction="column" gap={4}>
                <div>
                  <h2 style={{ fontSize: "1.3rem", color: "#003f7a", marginTop: 0 }}>1. Alcance de la plataforma</h2>
                  <p style={{ color: "#3a4a58", lineHeight: 1.6, margin: "8px 0 0 0" }}>
                    Tu Parcela Lista facilita la publicación, búsqueda, evaluación, cotización referencial, contacto y
                    gestión de propiedades y servicios asociados al desarrollo de proyectos rurales.
                  </p>
                </div>

                <div>
                  <h2 style={{ fontSize: "1.3rem", color: "#003f7a", marginTop: 0 }}>2. Información publicada</h2>
                  <p style={{ color: "#3a4a58", lineHeight: 1.6, margin: "8px 0 0 0" }}>
                    La información de las propiedades puede ser provista directamente por propietarios particulares,
                    corredores asociados, empresas loteadoras o terceros. Cada usuario interesado debe verificar de
                    forma independiente los antecedentes legales, técnicos, comerciales y de dominio vigente antes de
                    tomar decisiones de compra o realizar pagos.
                  </p>
                </div>

                <div>
                  <h2 style={{ fontSize: "1.3rem", color: "#003f7a", marginTop: 0 }}>3. Tasaciones e indicadores referenciales</h2>
                  <p style={{ color: "#3a4a58", lineHeight: 1.6, margin: "8px 0 0 0" }}>
                    Las tasaciones paramétricas, estimaciones de valor por metro cuadrado, proyecciones de plusvalía y
                    cotizaciones de obras son estrictamente orientativas. No constituyen promesa vinculante de venta,
                    garantía de financiamiento bancario ni avalúo fiscal oficial.
                  </p>
                </div>

                <div>
                  <h2 style={{ fontSize: "1.3rem", color: "#003f7a", marginTop: 0 }}>4. Uso responsable</h2>
                  <p style={{ color: "#3a4a58", lineHeight: 1.6, margin: "8px 0 0 0" }}>
                    Los usuarios deben actuar de buena fe en todas sus interacciones y se comprometen a no utilizar la
                    plataforma para actividades ilícitas, suplantación de identidad, extracción automatizada no
                    autorizada (scraping), publicación de información deliberadamente falsa o conductas contrarias a la
                    legislación chilena.
                  </p>
                </div>

                <div>
                  <h2 style={{ fontSize: "1.3rem", color: "#003f7a", marginTop: 0 }}>5. Modificaciones y actualizaciones</h2>
                  <p style={{ color: "#3a4a58", lineHeight: 1.6, margin: "8px 0 0 0" }}>
                    Tu Parcela Lista se reserva el derecho de actualizar estos términos periódicamente para reflejar
                    mejoras en el servicio, evolución tecnológica o adecuaciones normativas vigentes.
                  </p>
                </div>

                <div
                  style={{
                    padding: "14px 18px",
                    backgroundColor: "rgba(0, 63, 122, 0.05)",
                    borderRadius: "8px",
                    fontSize: "0.95rem",
                    color: "#003f7a",
                    fontWeight: 500,
                  }}
                >
                  Al utilizar Tu Parcela Lista, el usuario reconoce que la decisión final de adquisición es de su
                  exclusiva responsabilidad y que debe contar con asesoría profesional independiente.
                </div>

                <div style={{ textAlign: "center", paddingTop: "12px" }}>
                  <Button href="/" variant="secondary">
                    Volver al inicio
                  </Button>
                </div>
              </Stack>
            </Card.Body>
          </Card>
          </div>
        </Container>
      </Section>
    </>
  );
}
