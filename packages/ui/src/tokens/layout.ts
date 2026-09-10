/** Espaciado base 4px — igual que hoy, es una escala que ya funciona. */
export const space = {
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  8: "32px",
  10: "40px",
  12: "48px",
  16: "64px",
  20: "80px",
} as const;

/**
 * Breakpoints con nombre, en vez de números sueltos repetidos en cada media
 * query (hoy 900/820/480 aparecen "a mano" en tpl-foundation.css). Se
 * conservan los mismos puntos de quiebre reales del header porque son los
 * que ya se probaron con el nav/menú móvil actuales — "responsive real" es
 * nombrar y centralizar estos números, no inventar otros nuevos sin motivo.
 */
export const breakpoints = {
  mobile: 480,
  tablet: 820,
  navCondensed: 900,
  desktop: 1280,
} as const;

export const mediaQuery = {
  upFrom: (px: number) => `@media (min-width: ${px}px)`,
  downTo: (px: number) => `@media (max-width: ${px}px)`,
} as const;

/** Alturas de "cromo" fijo (header/ribbon) — se leen desde JS (ej. scroll-padding) y CSS por igual. */
export const chrome = {
  headerHeight: 72,
  headerHeightCondensed: 64,
  ribbonHeight: 46,
} as const;

export const container = {
  base: "1280px",
  narrow: "780px",
  gutter: "clamp(16px, 4vw, 40px)",
  sectionY: "clamp(48px, 6vw, 96px)",
} as const;

export const layoutCssVars = `
  --tpl-space-1: ${space[1]};
  --tpl-space-2: ${space[2]};
  --tpl-space-3: ${space[3]};
  --tpl-space-4: ${space[4]};
  --tpl-space-5: ${space[5]};
  --tpl-space-6: ${space[6]};
  --tpl-space-8: ${space[8]};
  --tpl-space-10: ${space[10]};
  --tpl-space-12: ${space[12]};
  --tpl-space-16: ${space[16]};
  --tpl-space-20: ${space[20]};

  --tpl-breakpoint-mobile: ${breakpoints.mobile}px;
  --tpl-breakpoint-tablet: ${breakpoints.tablet}px;
  --tpl-breakpoint-nav-condensed: ${breakpoints.navCondensed}px;
  --tpl-breakpoint-desktop: ${breakpoints.desktop}px;

  --tpl-header-h: ${chrome.headerHeight}px;
  --tpl-header-h-condensed: ${chrome.headerHeightCondensed}px;
  --tpl-ribbon-h: ${chrome.ribbonHeight}px;

  --tpl-container: ${container.base};
  --tpl-container-narrow: ${container.narrow};
  --tpl-gutter: ${container.gutter};
  --tpl-section-y: ${container.sectionY};
`;
