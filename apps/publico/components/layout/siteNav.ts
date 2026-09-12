/**
 * Navegación pública compartida — centralizada aquí (Fase 3) para que
 * `Header`/`Footer` (`@tpl/ui`) no se dupliquen por página. Antes vivía
 * repetida dentro de `app/page.tsx`.
 */
export const primaryNavLinks = [
  { href: "/propiedades", label: "Buscar parcelas" },
  { href: "/cotizador", label: "Cotizador de Casa" },
  { href: "/como-comprar", label: "Cómo comprar" },
  { href: "/campo-chileno", label: "El Campo Chileno" },
  { href: "/red-partner", label: "TPL Business" },
];

export const footerNavLinks = [
  { href: "/propiedades", label: "Buscar parcelas" },
  { href: "/cotizador", label: "Cotizador de Casa" },
  { href: "/como-comprar", label: "Cómo comprar" },
  { href: "/campo-chileno", label: "El Campo Chileno" },
  { href: "/red-partner", label: "TPL Business (Red Partner)" },
  { href: "/terminos", label: "Términos" },
  { href: "/privacidad", label: "Privacidad" },
];
