export * from "./colors";
export * from "./typography";
export * from "./layout";
export * from "./effects";

import { colorPrimitivesCssVars, colorSemanticCssVars } from "./colors";
import { typographyCssVars } from "./typography";
import { layoutCssVars } from "./layout";
import { effectsCssVars } from "./effects";

/**
 * Todas las capas de tokens combinadas en custom properties de CSS, para
 * inyectar una sola vez en el `:root` de cada app (ver `styles/GlobalStyles`).
 * Es la única fuente de verdad de diseño de `@tpl/ui` — un componente nuevo
 * nunca debe declarar un color/tamaño/sombra "a mano", siempre lee de aquí.
 */
export const tplTokensCss = `
:root {
  color-scheme: light;
${colorPrimitivesCssVars}${colorSemanticCssVars}${typographyCssVars}${layoutCssVars}${effectsCssVars}}
`;
