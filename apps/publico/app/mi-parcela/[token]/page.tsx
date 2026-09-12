import type { Metadata } from "next";
import { Container, Section, Button, Stack, Card, Grid } from "@tpl/ui";
import { getOwnerPortalViewModel } from "../../../lib/propietario/actions";
import { OwnerEditForm } from "../../../components/propietario/OwnerEditForm";

export const metadata: Metadata = {
  title: "Mi Propiedad",
  description: "Portal privado para propietarios de parcelas registradas en Tu Parcela Lista.",
  robots: { index: false, follow: false },
};

import { WHATSAPP_PHONE } from "../../../lib/contact";

interface MiParcelaPageProps {
  params: Promise<{ token: string }>;
}

export default async function MiParcelaPage({ params }: MiParcelaPageProps) {
  const { token } = await params;
  const viewModel = await getOwnerPortalViewModel(token);

  if (!viewModel) {
    return (
      <Section tone="canvas">
        <Container>
          <div style={{ maxWidth: 560, margin: "4rem auto", textAlign: "center" }}>
            <Card style={{ padding: "2.5rem", borderRadius: "20px" }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  margin: "0 auto 1.25rem",
                  borderRadius: "50%",
                  background: "#fef2f2",
                  color: "#ef4444",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 28,
                }}
                aria-hidden="true"
              >
                ✕
              </div>
              <h1 style={{ fontSize: "1.6rem", color: "#132437", margin: "0 0 0.75rem" }}>
                Enlace no disponible o vencido
              </h1>
              <p style={{ color: "#64748b", lineHeight: 1.6, margin: "0 0 1.75rem" }}>
                El enlace privado para gestionar tu propiedad ya no está activo o caducó. Puedes solicitar uno nuevo con tu asesor.
              </p>
              <Stack direction="row" gap={3} justify="center" wrap>
                <Button
                  href={`https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(
                    "Hola, mi enlace de propietario de Tu Parcela Lista aparece vencido o no disponible. ¿Me pueden enviar uno nuevo?",
                  )}`}
                  variant="whatsapp"
                >
                  Solicitar nuevo enlace por WhatsApp
                </Button>
                <Button href="/" variant="secondary">
                  Ir al portal
                </Button>
              </Stack>
            </Card>
          </div>
        </Container>
      </Section>
    );
  }

  const { propiedad, valuation } = viewModel;
  const valorTplLabel = valuation?.valorFinalLabel || "En análisis técnico";
  const valorApuroLabel = valuation?.ventaApuroLabel || "Por calcular";

  const saludo = propiedad.contactoNombre ? `¡Hola, ${propiedad.contactoNombre}!` : "¡Hola!";
  const waParams = encodeURIComponent(
    `Hola, estoy revisando mi propiedad "${propiedad.titulo}" (código ${propiedad.codigo}) en el portal de propietarios y quiero coordinar con un asesor.`,
  );

  return (
    <>
      {/* Cabecera Propietario */}
      <section
        style={{
          background: "linear-gradient(135deg, #0f2942 0%, #1e3a8a 100%)",
          color: "#fff",
          padding: "3.5rem 1.5rem 3rem",
        }}
      >
        <Container>
          <div style={{ maxWidth: 880, margin: "0 auto" }}>
            <span
              style={{
                display: "inline-block",
                fontSize: "0.8rem",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "#60a5fa",
                fontWeight: 700,
                marginBottom: "0.5rem",
              }}
            >
              Portal Privado del Propietario · Tu Parcela Lista
            </span>
            <h1
              style={{
                fontSize: "clamp(1.8rem, 4vw, 2.5rem)",
                fontFamily: "serif",
                margin: "0 0 0.5rem",
                lineHeight: 1.2,
              }}
            >
              {saludo} Gestiona tu parcela
            </h1>
            <p style={{ fontSize: "1.05rem", color: "#cbd5e1", margin: "0 0 1.25rem" }}>
              <strong>{propiedad.titulo}</strong> (código: {propiedad.codigo}) · {propiedad.comuna || "Comuna registrada"},{" "}
              {propiedad.region || "Chile"} ·{" "}
              {propiedad.superficieM2
                ? `${new Intl.NumberFormat("es-CL").format(propiedad.superficieM2)} m²`
                : "Superficie en revisión"}
            </p>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <Button href={`https://wa.me/${WHATSAPP_PHONE}?text=${waParams}`} variant="whatsapp">
                Contactar a mi asesor TPL
              </Button>
              <Button href={`/propiedades/${propiedad.codigo}`} variant="ghost">
                Ver ficha pública
              </Button>
            </div>
          </div>
        </Container>
      </section>

      {/* Resultados de Tasación Inteligente */}
      <Section tone="canvas">
        <Container>
          <div style={{ maxWidth: 880, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "2rem" }}>
              <span
                style={{
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  fontSize: "0.75rem",
                  color: "#0b7d79",
                  fontWeight: 700,
                }}
              >
                Inteligencia de Mercado TPL
              </span>
              <h2 style={{ fontSize: "1.85rem", color: "#132437", margin: "0.25rem 0" }}>
                Diagnóstico de Valor para tu Parcela
              </h2>
              <p style={{ color: "#64748b", margin: 0, fontSize: "0.95rem" }}>
                Calculado según el atlas de transacciones reales, tasación técnica y comparables de tu zona.
              </p>
            </div>

            <Grid columns={{ mobile: 1, tablet: 2, desktop: 2 }}>
              {/* Valor TPL Recomendado */}
              <Card
                style={{
                  padding: "2rem",
                  borderRadius: "16px",
                  border: "2px solid #3b82f6",
                  background: "#fff",
                  textAlign: "center",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "#2563eb",
                    marginBottom: "0.5rem",
                  }}
                >
                  Valor TPL Tasación (Recomendado)
                </span>
                <strong
                  style={{
                    display: "block",
                    fontSize: "2.4rem",
                    color: "#1e3a8a",
                    fontFamily: "serif",
                    margin: "0.25rem 0",
                  }}
                >
                  {valorTplLabel}
                </strong>
                <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                  Precio de venta óptimo de mercado
                </span>
              </Card>

              {/* Valor Venta Ágil (Apuro) */}
              <Card
                style={{
                  padding: "2rem",
                  borderRadius: "16px",
                  border: "2px solid #ef4444",
                  background: "#fff",
                  textAlign: "center",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "#dc2626",
                    marginBottom: "0.5rem",
                  }}
                >
                  Valor Venta Rápida (Apuro)
                </span>
                <strong
                  style={{
                    display: "block",
                    fontSize: "2.4rem",
                    color: "#b91c1c",
                    fontFamily: "serif",
                    margin: "0.25rem 0",
                  }}
                >
                  {valorApuroLabel}
                </strong>
                <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                  Para acelerar la venta frente a la competencia
                </span>
              </Card>
            </Grid>

            {/* Clasificación de mercado */}
            {valuation?.clasificacion ? (
              <div
                style={{
                  marginTop: "1.5rem",
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: "12px",
                  padding: "1.25rem 1.5rem",
                }}
              >
                <strong style={{ color: "#1e40af", display: "block", marginBottom: "0.25rem" }}>
                  Clasificación de mercado:
                </strong>
                <p style={{ margin: 0, color: "#1e3a8a", fontSize: "0.95rem", lineHeight: 1.6 }}>
                  Tu propiedad califica como <strong>{valuation.clasificacion}</strong> dentro del catastro de su zona.
                </p>
              </div>
            ) : null}
          </div>
        </Container>
      </Section>

      {/* Planes de Publicación y Comercialización */}
      <Section tone="raised">
        <Container>
          <div style={{ maxWidth: 880, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "2rem" }}>
              <span
                style={{
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  fontSize: "0.75rem",
                  color: "#0b7d79",
                  fontWeight: 700,
                }}
              >
                Acelera tu venta
              </span>
              <h2 style={{ fontSize: "1.85rem", color: "#132437", margin: "0.25rem 0" }}>
                Planes de Promoción para tu Parcela
              </h2>
            </div>

            <Grid columns={{ mobile: 1, tablet: 3, desktop: 3 }}>
              {/* Plan Básico */}
              <Card style={{ padding: "1.75rem", borderRadius: "14px", background: "#fff" }}>
                <h3 style={{ margin: "0 0 0.5rem", color: "#334155", fontSize: "1.2rem" }}>Plan Básico</h3>
                <strong style={{ display: "block", fontSize: "1.6rem", color: "#0f172a", marginBottom: "1rem" }}>
                  $50.000
                </strong>
                <ul style={{ paddingLeft: "1.25rem", color: "#64748b", fontSize: "0.88rem", lineHeight: 1.6, margin: "0 0 1.5rem" }}>
                  <li>Publicación en portales inmobiliarios líderes</li>
                  <li>Ficha activa en Tu Parcela Lista</li>
                  <li>Reenvío de interesados directo a tu WhatsApp</li>
                </ul>
                <Button
                  href={`https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(
                    `Hola, quiero activar el Plan Básico ($50.000) para mi parcela "${propiedad.titulo}".`,
                  )}`}
                  variant="secondary"
                  block
                >
                  Elegir Básico
                </Button>
              </Card>

              {/* Plan Destacado */}
              <Card
                style={{
                  padding: "1.75rem",
                  borderRadius: "14px",
                  background: "#fff",
                  border: "2px solid #2563eb",
                  position: "relative",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: -12,
                    right: 20,
                    background: "#2563eb",
                    color: "#fff",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "999px",
                    textTransform: "uppercase",
                  }}
                >
                  Más popular
                </span>
                <h3 style={{ margin: "0 0 0.5rem", color: "#1e3a8a", fontSize: "1.2rem" }}>Plan Destacado</h3>
                <strong style={{ display: "block", fontSize: "1.6rem", color: "#0f172a", marginBottom: "1rem" }}>
                  $120.000
                </strong>
                <ul style={{ paddingLeft: "1.25rem", color: "#475569", fontSize: "0.88rem", lineHeight: 1.6, margin: "0 0 1.5rem" }}>
                  <li>Posicionamiento destacado en portada</li>
                  <li>Campaña segmentada en Meta (Facebook / Instagram)</li>
                  <li>Filtro previo de compradores con financiamiento</li>
                </ul>
                <Button
                  href={`https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(
                    `Hola, quiero activar el Plan Destacado ($120.000) para mi parcela "${propiedad.titulo}".`,
                  )}`}
                  variant="navy"
                  block
                >
                  Elegir Destacado
                </Button>
              </Card>

              {/* Plan Full Exclusivo */}
              <Card style={{ padding: "1.75rem", borderRadius: "14px", background: "#fff" }}>
                <h3 style={{ margin: "0 0 0.5rem", color: "#334155", fontSize: "1.2rem" }}>Comisión de Éxito</h3>
                <strong style={{ display: "block", fontSize: "1.6rem", color: "#0f172a", marginBottom: "1rem" }}>
                  2% al cerrar
                </strong>
                <ul style={{ paddingLeft: "1.25rem", color: "#64748b", fontSize: "0.88rem", lineHeight: 1.6, margin: "0 0 1.5rem" }}>
                  <li>Acompañamiento legal completo (promesa y escritura)</li>
                  <li>Visitas guiadas por asesor local en terreno</li>
                  <li>Solo pagas cuando se firma en notaría</li>
                </ul>
                <Button
                  href={`https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(
                    `Hola, me interesa el servicio con Comisión de Éxito para vender mi parcela "${propiedad.titulo}".`,
                  )}`}
                  variant="gold"
                  block
                >
                  Conversar con asesor
                </Button>
              </Card>
            </Grid>
          </div>
        </Container>
      </Section>

      {/* Resumen del Anuncio */}
      <Section tone="canvas">
        <Container>
          <div style={{ maxWidth: 880, margin: "0 auto" }}>
            <h3 style={{ fontSize: "1.4rem", color: "#132437", marginBottom: "1rem" }}>
              Datos del Anuncio Actual
            </h3>
            <div
              style={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: "14px",
                overflow: "hidden",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.92rem" }}>
                <tbody>
                  {[
                    ["Precio publicado actual", propiedad.precioPublicadoLabel || "No especificado"],
                    ["Comuna", propiedad.comuna || "No especificada"],
                    ["Región", propiedad.region || "No especificada"],
                    ["Sector", propiedad.sector || "General"],
                    [
                      "Superficie",
                      propiedad.superficieM2
                        ? `${new Intl.NumberFormat("es-CL").format(propiedad.superficieM2)} m²`
                        : "En revisión",
                    ],
                    ["Estado del anuncio", propiedad.estado || "Activo"],
                  ].map(([label, val], idx) => (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        background: idx % 2 === 0 ? "#fafafa" : "#fff",
                      }}
                    >
                      <td style={{ padding: "12px 20px", color: "#64748b", fontWeight: 600 }}>{label}</td>
                      <td style={{ padding: "12px 20px", color: "#1e293b", textAlign: "right" }}>{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: "2.5rem" }}>
              <OwnerEditForm token={token} propiedad={propiedad} />
            </div>

            <div style={{ textAlign: "center", marginTop: "2.5rem" }}>
              <p style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: "1rem" }}>
                ¿Deseas agregar fotografías o solicitar una nueva tasación de tu parcela?
              </p>
              <Button
                href={`https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(
                  `Hola, quiero actualizar datos o solicitar un re-cálculo de mi parcela "${propiedad.titulo}" (código ${propiedad.codigo}).`,
                )}`}
                variant="whatsapp"
              >
                Actualizar con mi asesor por WhatsApp
              </Button>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
