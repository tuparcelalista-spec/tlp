import { Header, Footer, InfraestructuraPlaceholder } from "@tpl/ui";

const navLinks = [
  { href: "#buscador", label: "Buscar parcelas" },
  { href: "#como-comprar", label: "Cómo comprar" },
  { href: "#cotizador", label: "Cotizador de Casa" },
  { href: "#red-partner", label: "Red Partner" },
  { href: "#tpl-business", label: "TPL Business" },
];

const footerLinks = [
  { href: "#buscador", label: "Buscar parcelas" },
  { href: "#como-comprar", label: "Cómo comprar" },
  { href: "#cotizador", label: "Cotizador de Casa" },
  { href: "#red-partner", label: "Red Partner" },
  { href: "#terminos", label: "Términos" },
  { href: "#privacidad", label: "Privacidad" },
];

export default function Home() {
  return (
    <>
      <Header
        logoSrc="/brand/tpl-wordmark.svg"
        navLinks={navLinks}
        publishHref="#publicar"
        mobileQuickLink={{ href: "#resultados", label: "Parcelas" }}
        currentPath="/"
      />
      <main style={{ fontFamily: "system-ui, sans-serif", padding: "40px clamp(16px, 4vw, 40px)", maxWidth: 780, marginInline: "auto" }}>
        <h1>apps/publico</h1>
        <p>
          Infraestructura de la <strong>Fase 2</strong> del Plan Maestro de Migración: base del design system
          (<code>@tpl/ui</code>) sobre la que se construirá la próxima homepage. Ninguna página real de{" "}
          <code>frontend-v2/</code> fue migrada todavía, y esta app no está conectada a Supabase.
        </p>
        <InfraestructuraPlaceholder app="publico" />
        <p style={{ fontFamily: "monospace", color: "#5a6b7d", fontSize: 13 }}>
          Header y Footer de arriba/abajo son <code>@tpl/ui</code> real (mismo contenido y comportamiento que
          frontend-v2, sobre la nueva arquitectura de tokens). Los enlaces son de demostración (anclas), todavía
          no apuntan a rutas reales de Next.js.
        </p>
      </main>
      <Footer
        logoSrc="/brand/tpl-wordmark-light.svg"
        navLinks={footerLinks}
        internalAccessHref="#crm"
      />
    </>
  );
}
