export const radii = {
  xs: "6px",
  sm: "10px",
  md: "14px",
  lg: "20px",
  xl: "28px",
  pill: "999px",
} as const;

/** Sombras tintadas de azul de marca, no gris neutro — es lo que las hace leer "premium" y no "Bootstrap". */
export const shadows = {
  xs: "0 1px 2px rgba(0, 30, 60, 0.05)",
  sm: "0 1px 2px rgba(0, 30, 60, 0.04), 0 6px 16px rgba(0, 30, 60, 0.06)",
  md: "0 2px 4px rgba(0, 30, 60, 0.05), 0 14px 32px rgba(0, 30, 60, 0.09)",
  lg: "0 6px 12px rgba(0, 30, 60, 0.07), 0 28px 56px rgba(0, 30, 60, 0.13)",
  xl: "0 12px 24px rgba(0, 16, 32, 0.14), 0 40px 80px rgba(0, 16, 32, 0.24)",
} as const;

export const motion = {
  ease: "cubic-bezier(0.16, 1, 0.3, 1)",
  easeOut: "cubic-bezier(0.25, 1, 0.5, 1)",
  durationFast: "140ms",
  duration: "240ms",
  durationSlow: "420ms",
} as const;

/** Capas. z-modal/z-drawer se reservan ahora aunque esos componentes no existan todavía. */
export const zIndex = {
  ribbon: 150,
  header: 200,
  menu: 210,
  overlay: 300,
  modal: 400,
  toast: 500,
} as const;

export const focusRing = "0 0 0 3px rgba(0, 90, 160, 0.35)";

export const effectsCssVars = `
  --tpl-radius-xs: ${radii.xs};
  --tpl-radius-sm: ${radii.sm};
  --tpl-radius-md: ${radii.md};
  --tpl-radius-lg: ${radii.lg};
  --tpl-radius-xl: ${radii.xl};
  --tpl-radius-pill: ${radii.pill};

  --tpl-shadow-xs: ${shadows.xs};
  --tpl-shadow-sm: ${shadows.sm};
  --tpl-shadow-md: ${shadows.md};
  --tpl-shadow-lg: ${shadows.lg};
  --tpl-shadow-xl: ${shadows.xl};

  --tpl-ease: ${motion.ease};
  --tpl-ease-out: ${motion.easeOut};
  --tpl-duration-fast: ${motion.durationFast};
  --tpl-duration: ${motion.duration};
  --tpl-duration-slow: ${motion.durationSlow};

  --tpl-z-ribbon: ${zIndex.ribbon};
  --tpl-z-header: ${zIndex.header};
  --tpl-z-menu: ${zIndex.menu};
  --tpl-z-overlay: ${zIndex.overlay};
  --tpl-z-modal: ${zIndex.modal};
  --tpl-z-toast: ${zIndex.toast};

  --tpl-focus-ring: ${focusRing};
`;
