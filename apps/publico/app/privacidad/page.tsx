import type { Metadata } from "next";
import { Container, Section, Stack, Card, Button, Badge } from "@tpl/ui";
import { SITE_URL, SITE_NAME } from "../../lib/seo/site";

const TITLE = "Política de Privacidad y Tratamiento de Datos | Tu Parcela Lista";
const DESCRIPTION =
  "Conoce cómo Tu Parcela Lista protege, administra y resguarda los datos de propietarios, compradores y usuarios.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/privacidad` },
  openGraph: {
    title: `${TITLE} | ${SITE_NAME}`,
    description: DESCRIPTION,
    url: `${SITE_URL}/privacidad`,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: `${TITLE} | ${SITE_NAME}`,
    description: DESCRIPTION,
  },
};

export default function PrivacidadPage() {
  return (
    <>
      <Section tone="canvas">
        <Container>
          <Stack direction="column" gap={3} style={{ maxWidth: 840, marginInline: "auto", textAlign: "center" }}>
            <Badge variant="info">PRIVACIDAD Y PROTECCIÓN DE DATOS</Badge>
            <h1 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", lineHeight: 1.15, margin: 0 }}>
              Tus datos deben ayudarte, no exponerte.
            </h1>
            <p style={{ fontSize: "1.15rem", color: "#4a5d6e", lineHeight: 1.6, margin: 0 }}>
              Tu Parcela Lista trata la información bajo estrictos criterios de seguridad, manteniendo separados los datos
              privados de contacto de la información pública del inmueble.
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
                  <h2 style={{ fontSize: "1.3rem", color: "#003f7a", marginTop: 0 }}>1. Finalidad del tratamiento</h2>
                  <p style={{ color: "#3a4a58", lineHeight: 1.6, margin: "8px 0 0 0" }}>
                    Tu Parcela Lista recopila y procesa datos personales exclusivamente para gestionar solicitudes de
                    información, coordinar visitas a propiedades, generar estimaciones presupuestarias en el cotizador y
                    facilitar la comunicación entre interesados y asesores inmobiliarios.
                  </p>
                </div>

                <div>
                  <h2 style={{ fontSize: "1.3rem", color: "#003f7a", marginTop: 0 }}>2. Separación entre datos privados y públicos</h2>
                  <p style={{ color: "#3a4a58", lineHeight: 1.6, margin: "8px 0 0 0" }}>
                    Los datos de contacto de propietarios o solicitantes (tales como números telefónicos, correos
                    electrónicos o nombres completos) no se exponen de forma indiscriminada. Solo se comparten con la
                    autorización expresa del titular para la intermediación comercial correspondiente.
                  </p>
                </div>

                <div>
                  <h2 style={{ fontSize: "1.3rem", color: "#003f7a", marginTop: 0 }}>3. Métricas y analítica agregada</h2>
                  <p style={{ color: "#3a4a58", lineHeight: 1.6, margin: "8px 0 0 0" }}>
                    Utilizamos herramientas de telemetría y analítica anonimizada (incluyendo identificadores de sesión
                    y eventos de interacción) con el propósito exclusivo de optimizar la velocidad del sitio, mejorar
                    la experiencia de búsqueda y calibrar modelos estadísticos de precios comunales.
                  </p>
                </div>

                <div>
                  <h2 style={{ fontSize: "1.3rem", color: "#003f7a", marginTop: 0 }}>4. Derechos del titular (ARCO)</h2>
                  <p style={{ color: "#3a4a58", lineHeight: 1.6, margin: "8px 0 0 0" }}>
                    Conforme a la Ley N° 19.628 sobre Protección de la Vida Privada en Chile, todo usuario tiene derecho
                    a solicitar acceso, rectificación, cancelación u oposición respecto a sus datos personales
                    registrados en nuestros sistemas.
                  </p>
                </div>

                <div>
                  <h2 style={{ fontSize: "1.3rem", color: "#003f7a", marginTop: 0 }}>5. Resguardo de documentos sensibles</h2>
                  <p style={{ color: "#3a4a58", lineHeight: 1.6, margin: "8px 0 0 0" }}>
                    Recomendamos encarecidamente a los usuarios no transmitir información financiera reservada, claves
                    ni documentos de identidad fuera de los canales oficiales y protegidos dispuestos por la plataforma.
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
                  Para ejercer tus derechos de privacidad o realizar consultas sobre el tratamiento de tus datos, puedes
                  contactarnos a través de los canales oficiales de Tu Parcela Lista.
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
