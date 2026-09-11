"use client";

import { useEffect } from "react";
import { Container, Section, Button, Stack, ErrorState } from "@tpl/ui";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Next.js Client Error:", error);
  }, [error]);

  return (
    <Section tone="canvas">
      <Container>
        <div style={{ maxWidth: 640, margin: "4rem auto", textAlign: "center" }}>
          <ErrorState
            title="Ocurrió un inconveniente temporal"
            description="Tuvimos un problema al cargar esta sección. Puedes reintentar la operación o volver a la página de inicio."
            action={
              <Stack direction="row" gap={3} justify="center" style={{ marginTop: "1.5rem" }} wrap>
                <Button onClick={() => reset()} variant="navy">
                  Reintentar
                </Button>
                <Button href="/" variant="secondary">
                  Ir al inicio
                </Button>
              </Stack>
            }
          />
        </div>
      </Container>
    </Section>
  );
}
