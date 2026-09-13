import type { ReactNode } from "react";
import type { Metadata } from "next";
import Script from "next/script";
import { TplDesignSystemStyles } from "@tpl/ui";
import { SiteChrome } from "../components/layout/SiteChrome";
import { SITE_URL, SITE_NAME } from "../lib/seo/site";

/**
 * Bloque 3.16 — mismo contenedor GTM que ya usa `frontend-v2` en
 * producción hoy (verificado real: `frontend-v2/index.html`), no uno
 * nuevo. Se usa `next/script` con `strategy="afterInteractive"` (patrón
 * oficial de Next.js para GTM) en vez de un `<script>` crudo — Next.js
 * desaconseja explícitamente scripts de terceros sin `next/script`.
 */
const GTM_CONTAINER_ID = "GTM-WK4M33H4";

/**
 * Fase 3.15 — auditoría QA: la Home no tenía `canonical`/Open Graph/
 * Twitter propios (a diferencia de `/propiedades` y el detalle, que sí los
 * definen vía `generateMetadata`/`metadata`) porque no exporta su propio
 * `metadata` — heredaba solo title+description del layout raíz. Se agregan
 * acá esos campos base (misma `SITE_URL`/`SITE_NAME` ya establecidas, sin
 * datos inventados) para que la Home los tenga por defecto; una página que
 * sí exporte su propio `metadata`/`generateMetadata` sigue pisando estos
 * valores igual que antes. Sin imagen OG: no existe todavía un asset
 * raster (1200×630) para eso — los wordmark SVG no son compatibles con la
 * mayoría de previews sociales — queda como recomendación de diseño, no
 * como algo que se pueda resolver con código.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description: "Parcelas y campos en venta en Chile — busca, compara y encuentra tu proyecto de campo con Tu Parcela Lista.",
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: SITE_NAME,
    description: "Parcelas y campos en venta en Chile — busca, compara y encuentra tu proyecto de campo con Tu Parcela Lista.",
    url: SITE_URL,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: SITE_NAME,
    description: "Parcelas y campos en venta en Chile — busca, compara y encuentra tu proyecto de campo con Tu Parcela Lista.",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" type="image/png" href="/image/favicon.png" />
        <link rel="apple-touch-icon" href="/image/favicon-512.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Lora:ital,wght@0,400;0,500;0,600;1,400&display=swap"
        />
        <TplDesignSystemStyles />
        <Script id="gtm-script" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_CONTAINER_ID}');`}
        </Script>
      </head>
      <body>
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_CONTAINER_ID}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
