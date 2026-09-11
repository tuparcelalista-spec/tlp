import { Container, Section } from "@tpl/ui";
import { SearchWidgetServer } from "../../components/search";

/**
 * Ruta interna de demostración — Bloque 2.4, mismo patrón que
 * `app/design-system/` (Fase 2): no es la homepage, `noindex`, existe
 * únicamente para verificar el `SearchWidget` en un navegador real antes
 * de integrarlo a cualquier página pública. Server Component (sin "use
 * client") porque renderiza `SearchWidgetServer`, que es async.
 */
export default function SearchDemoPage() {
  return (
    <Section tone="canvas">
      <Container>
        <h1>SearchWidget — demo interna (Bloque 2.4)</h1>
        <p>Herramienta de verificación, no forma parte de la homepage pública.</p>
        <SearchWidgetServer />
      </Container>
    </Section>
  );
}
