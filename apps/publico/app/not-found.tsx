import type { Metadata } from "next";
import { Container, Section, Button, Stack, EmptyState } from "@tpl/ui";

export const metadata: Metadata = {
  title: "Página no encontrada | Tu Parcela Lista",
  description: "La parcela o sección que buscas no existe o ya no está disponible.",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <Section tone="canvas">
      <Container>
        <div style={{ maxWidth: 640, margin: "4rem auto", textAlign: "center" }}>
          <EmptyState
            title="Página o propiedad no encontrada"
            description="La parcela o sección que buscas no existe, cambió de dirección o ya no está disponible en el catálogo activo."
            action={
              <Stack direction="row" gap={3} justify="center" style={{ marginTop: "1.5rem" }} wrap>
                <Button href="/propiedades" variant="navy">
                  Ver catálogo de parcelas
                </Button>
                <Button href="/" variant="secondary">
                  Ir al inicio
                </Button>
                <Button href="/cotizador" variant="ghost">
                  Cotizador de casas
                </Button>
              </Stack>
            }
          />
        </div>
      </Container>
    </Section>
  );
}
