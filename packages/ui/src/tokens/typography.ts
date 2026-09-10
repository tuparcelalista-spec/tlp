/**
 * Jerarquía tipográfica con ROLES, no solo tamaños.
 *
 * Se conserva el par tipográfico actual de TPL (Lora para titulares
 * editoriales, Inter para todo lo demás) porque ya transmite la sensación
 * "inmobiliaria premium, no startup genérica" que pide el Plan Maestro — el
 * salto de calidad no viene de cambiar la fuente, sino de tener roles
 * explícitos (display/headline/title/price/technical/label...) en vez de
 * "h1, h2, h3" sueltos sin jerarquía documentada.
 */
export const fontFamilies = {
  sans: "'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
  display: "'Lora', Georgia, 'Times New Roman', serif",
  /** Cifras técnicas (superficie, UF, m²) con espaciado tabular para alinear en columnas/tarjetas. */
  numeric: "'Inter', ui-sans-serif, system-ui, sans-serif",
} as const;

/** Escala fluida (clamp): el mismo salto se ve bien de 360px a 1440px sin media queries. */
export const fontSizes = {
  xs: "0.75rem",
  sm: "0.8125rem",
  base: "0.9375rem",
  md: "1rem",
  lg: "clamp(1.05rem, 0.98rem + 0.35vw, 1.2rem)",
  xl: "clamp(1.25rem, 1.12rem + 0.6vw, 1.5rem)",
  "2xl": "clamp(1.5rem, 1.28rem + 1.05vw, 2.05rem)",
  "3xl": "clamp(1.9rem, 1.5rem + 1.9vw, 2.9rem)",
  "4xl": "clamp(2.35rem, 1.6rem + 3.4vw, 4.2rem)",
  /** Precio destacado en PropertyCard/ficha — mayor que 4xl pero solo para cifras, nunca para prosa. */
  price: "clamp(1.6rem, 1.3rem + 1.5vw, 2.15rem)",
} as const;

export const lineHeights = {
  tight: "1.12",
  snug: "1.3",
  normal: "1.6",
  relaxed: "1.7",
} as const;

export const letterSpacing = {
  tight: "-0.03em",
  normal: "0",
  wide: "0.08em",
  caps: "0.16em",
} as const;

export const fontWeights = {
  regular: 400,
  medium: 600,
  bold: 700,
  black: 800,
} as const;

/**
 * Roles semánticos de texto. Cada componente futuro (Card, Price, Stat,
 * SectionTitle...) debe pedir un ROL de `typographyRoles`, no ensamblar
 * font-family/size/weight sueltos por su cuenta.
 */
export const typographyRoles = {
  display: { family: "display", size: "4xl", weight: "medium", leading: "tight", tracking: "tight" },
  headline: { family: "display", size: "3xl", weight: "medium", leading: "tight", tracking: "tight" },
  title: { family: "display", size: "xl", weight: "medium", leading: "snug", tracking: "normal" },
  subtitle: { family: "sans", size: "lg", weight: "regular", leading: "relaxed", tracking: "normal" },
  body: { family: "sans", size: "md", weight: "regular", leading: "normal", tracking: "normal" },
  bodySmall: { family: "sans", size: "base", weight: "regular", leading: "normal", tracking: "normal" },
  label: { family: "sans", size: "xs", weight: "black", leading: "normal", tracking: "caps" },
  eyebrow: { family: "sans", size: "xs", weight: "black", leading: "normal", tracking: "caps" },
  price: { family: "numeric", size: "price", weight: "bold", leading: "tight", tracking: "tight" },
  technical: { family: "numeric", size: "sm", weight: "medium", leading: "normal", tracking: "normal" },
  caption: { family: "sans", size: "sm", weight: "regular", leading: "normal", tracking: "normal" },
} as const;

export type TypographyRole = keyof typeof typographyRoles;

export const typographyCssVars = `
  --tpl-font-sans: ${fontFamilies.sans};
  --tpl-font-display: ${fontFamilies.display};
  --tpl-font-numeric: ${fontFamilies.numeric};

  --tpl-text-xs: ${fontSizes.xs};
  --tpl-text-sm: ${fontSizes.sm};
  --tpl-text-base: ${fontSizes.base};
  --tpl-text-md: ${fontSizes.md};
  --tpl-text-lg: ${fontSizes.lg};
  --tpl-text-xl: ${fontSizes.xl};
  --tpl-text-2xl: ${fontSizes["2xl"]};
  --tpl-text-3xl: ${fontSizes["3xl"]};
  --tpl-text-4xl: ${fontSizes["4xl"]};
  --tpl-text-price: ${fontSizes.price};

  --tpl-leading-tight: ${lineHeights.tight};
  --tpl-leading-snug: ${lineHeights.snug};
  --tpl-leading-normal: ${lineHeights.normal};
  --tpl-leading-relaxed: ${lineHeights.relaxed};

  --tpl-tracking-tight: ${letterSpacing.tight};
  --tpl-tracking-normal: ${letterSpacing.normal};
  --tpl-tracking-wide: ${letterSpacing.wide};
  --tpl-tracking-caps: ${letterSpacing.caps};

  --tpl-weight-regular: ${fontWeights.regular};
  --tpl-weight-medium: ${fontWeights.medium};
  --tpl-weight-bold: ${fontWeights.bold};
  --tpl-weight-black: ${fontWeights.black};
`;
