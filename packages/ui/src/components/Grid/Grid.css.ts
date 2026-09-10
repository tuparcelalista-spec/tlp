import { breakpoints } from "../../tokens";

/** Puntos de quiebre interpolados desde `tokens/layout.ts` — una sola fuente de verdad. */
export const gridCss = `
.tpl-grid {
  display: grid;
  gap: var(--tpl-grid-gap, 24px);
  grid-template-columns: repeat(var(--tpl-grid-cols-mobile, 1), minmax(0, 1fr));
}
@media (min-width: ${breakpoints.mobile + 1}px) {
  .tpl-grid { grid-template-columns: repeat(var(--tpl-grid-cols-tablet, 2), minmax(0, 1fr)); }
}
@media (min-width: ${breakpoints.navCondensed + 1}px) {
  .tpl-grid { grid-template-columns: repeat(var(--tpl-grid-cols-desktop, 3), minmax(0, 1fr)); }
}
`;
