/**
 * Color primitivos de marca TPL, tal como existen hoy en
 * frontend-v2/css/tpl-foundation.css. Los valores NO se inventan de nuevo —
 * son la fuente de verdad heredada, incluyendo los dos colores fijados por
 * contraste AA que el Plan Maestro prohíbe "mejorar a ojo":
 *   - naranjo CTA:  #a8410f (6.1:1 con texto blanco)
 *   - whatsapp:     #0f7a4f (5.4:1 con texto blanco)
 */
export const colorPrimitives = {
  navy: {
    950: "#011a34",
    900: "#002b54",
    800: "#003f7a",
    700: "#005089",
    600: "#0d6193",
    500: "#2a7fb0",
    400: "#5ea3cb",
    300: "#97c5e0",
    200: "#c6dff0",
    100: "#e2eef8",
    50: "#f1f7fc",
  },
  orange: {
    700: "#8d3409",
    600: "#a8410f", // fijado por contraste — no sustituir
    500: "#bd5522",
    100: "#fbe9df",
    50: "#fdf5f0",
  },
  gold: {
    600: "#b8912a",
    500: "#d4af37",
    400: "#f2cf4a",
    100: "#fdf3d2",
  },
  teal: {
    700: "#14595b",
    600: "#1a6e70",
    500: "#218e91",
    100: "#e4f2f2",
  },
  whatsapp: {
    base: "#0f7a4f", // fijado por contraste — no sustituir
    hover: "#0b6340",
  },
  ink: {
    900: "#0f1c28",
    base: "#14212e",
    2: "#33465a",
    3: "#5a6b7d",
  },
  neutral: {
    muted: "#5f7183",
    line: "#dfe6ee",
    line2: "#ccd7e2",
    surface: "#ffffff",
    surface2: "#f6f9fc",
    surface3: "#eef3f8",
    surfaceWarm: "#faf7f0",
  },
  semantic: {
    success: "#1d7a4c",
    successBg: "#e6f4ec",
    warning: "#96610f",
    warningBg: "#fdf1dc",
    danger: "#a5322b",
    dangerBg: "#fbeae9",
  },
} as const;

/**
 * Capa semántica: nombra ROL, no valor. Header/Footer y los futuros
 * componentes (Card, Button, Alert...) deben consumir esta capa, nunca los
 * primitivos directamente — así un cambio de marca futuro se hace en un solo
 * lugar sin tocar cada componente.
 */
export const colorSemanticCssVars = `
  --tpl-color-brand: ${colorPrimitives.navy[900]};
  --tpl-color-brand-strong: ${colorPrimitives.navy[950]};
  --tpl-color-brand-soft: ${colorPrimitives.navy[100]};
  --tpl-color-accent-gold: ${colorPrimitives.gold[500]};
  --tpl-color-accent-gold-strong: ${colorPrimitives.gold[400]};
  --tpl-color-cta: ${colorPrimitives.orange[600]};
  --tpl-color-cta-hover: ${colorPrimitives.orange[700]};
  --tpl-color-whatsapp: ${colorPrimitives.whatsapp.base};
  --tpl-color-whatsapp-hover: ${colorPrimitives.whatsapp.hover};

  --tpl-surface-canvas: ${colorPrimitives.neutral.surface2};
  --tpl-surface-raised: ${colorPrimitives.neutral.surface};
  --tpl-surface-sunken: ${colorPrimitives.neutral.surface3};
  --tpl-surface-inverse: ${colorPrimitives.navy[950]};

  --tpl-content-primary: ${colorPrimitives.ink.base};
  --tpl-content-secondary: ${colorPrimitives.ink[3]};
  --tpl-content-muted: ${colorPrimitives.neutral.muted};
  --tpl-content-inverse: #ffffff;
  --tpl-content-inverse-muted: rgba(255, 255, 255, 0.72);

  --tpl-border-default: ${colorPrimitives.neutral.line};
  --tpl-border-strong: ${colorPrimitives.neutral.line2};
  --tpl-border-inverse: rgba(255, 255, 255, 0.14);

  --tpl-state-success: ${colorPrimitives.semantic.success};
  --tpl-state-success-bg: ${colorPrimitives.semantic.successBg};
  --tpl-state-warning: ${colorPrimitives.semantic.warning};
  --tpl-state-warning-bg: ${colorPrimitives.semantic.warningBg};
  --tpl-state-danger: ${colorPrimitives.semantic.danger};
  --tpl-state-danger-bg: ${colorPrimitives.semantic.dangerBg};
  --tpl-state-info: ${colorPrimitives.navy[800]};
  --tpl-state-info-bg: ${colorPrimitives.navy[100]};
`;

export const colorPrimitivesCssVars = `
  --tpl-navy-950: ${colorPrimitives.navy[950]};
  --tpl-navy-900: ${colorPrimitives.navy[900]};
  --tpl-navy-800: ${colorPrimitives.navy[800]};
  --tpl-navy-700: ${colorPrimitives.navy[700]};
  --tpl-navy-600: ${colorPrimitives.navy[600]};
  --tpl-navy-500: ${colorPrimitives.navy[500]};
  --tpl-navy-400: ${colorPrimitives.navy[400]};
  --tpl-navy-300: ${colorPrimitives.navy[300]};
  --tpl-navy-200: ${colorPrimitives.navy[200]};
  --tpl-navy-100: ${colorPrimitives.navy[100]};
  --tpl-navy-050: ${colorPrimitives.navy[50]};

  --tpl-orange-700: ${colorPrimitives.orange[700]};
  --tpl-orange-600: ${colorPrimitives.orange[600]};
  --tpl-orange-500: ${colorPrimitives.orange[500]};
  --tpl-orange-100: ${colorPrimitives.orange[100]};
  --tpl-orange-050: ${colorPrimitives.orange[50]};

  --tpl-gold-600: ${colorPrimitives.gold[600]};
  --tpl-gold-500: ${colorPrimitives.gold[500]};
  --tpl-gold-400: ${colorPrimitives.gold[400]};
  --tpl-gold-100: ${colorPrimitives.gold[100]};

  --tpl-teal-700: ${colorPrimitives.teal[700]};
  --tpl-teal-600: ${colorPrimitives.teal[600]};
  --tpl-teal-500: ${colorPrimitives.teal[500]};
  --tpl-teal-100: ${colorPrimitives.teal[100]};

  --tpl-ink-900: ${colorPrimitives.ink[900]};
  --tpl-ink: ${colorPrimitives.ink.base};
  --tpl-ink-2: ${colorPrimitives.ink[2]};
  --tpl-ink-3: ${colorPrimitives.ink[3]};
  --tpl-muted: ${colorPrimitives.neutral.muted};
  --tpl-line: ${colorPrimitives.neutral.line};
  --tpl-line-2: ${colorPrimitives.neutral.line2};
  --tpl-surface: ${colorPrimitives.neutral.surface};
  --tpl-surface-2: ${colorPrimitives.neutral.surface2};
  --tpl-surface-3: ${colorPrimitives.neutral.surface3};
  --tpl-surface-warm: ${colorPrimitives.neutral.surfaceWarm};
`;
