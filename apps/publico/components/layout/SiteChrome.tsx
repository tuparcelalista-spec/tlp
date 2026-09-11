"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Header, Footer } from "@tpl/ui";
import { primaryNavLinks, footerNavLinks } from "./siteNav";

/**
 * Header/Footer centralizados — Fase 3. Antes vivían duplicados dentro de
 * `app/page.tsx`; con más de una página pública (`/`, `/propiedades`,
 * `/propiedades/[codigo]`) repetirlos por página habría duplicado la
 * lista de navegación en cada una. `"use client"` solo por
 * `usePathname()` (resaltar el link activo) — el contenido de cada
 * página sigue siendo Server Component; esto es exclusivamente el marco
 * de navegación.
 */
export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <>
      <Header
        logoSrc="/brand/tpl-wordmark.svg"
        navLinks={primaryNavLinks}
        publishHref="#publicar"
        mobileQuickLink={{ href: "/propiedades", label: "Parcelas" }}
        currentPath={pathname}
      />
      {children}
      <Footer logoSrc="/brand/tpl-wordmark-light.svg" navLinks={footerNavLinks} internalAccessHref="#crm" />
    </>
  );
}
