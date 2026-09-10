/**
 * Primitivas de fundación: reset mínimo + foco + accesibilidad de
 * movimiento. Deliberadamente NO incluye reset de tipografía de body/h1-h6
 * ni de formularios/tablas — eso pertenece a los componentes que los usen
 * (Section, Input...), todavía no construidos. Esto es solo lo que Header,
 * Footer y MobileMenu necesitan para verse correctos sin heredar nada del
 * documento que los contiene.
 */
export const tplFoundationCss = `
*, *::before, *::after { box-sizing: border-box; }

/* Sin esto, un body sin fondo propio queda transparente y en un sistema con
   tema oscuro el texto (negro por defecto del navegador) se vuelve
   ilegible sobre el fondo oscuro del host. Detectado en la verificación
   visual de Fase 2 en tpl-publico-preview. */
body {
  background: var(--tpl-surface-canvas);
  color: var(--tpl-content-primary);
  font-family: var(--tpl-font-sans);
}

:where(a, button, input, select, textarea, summary, [tabindex]):focus-visible {
  outline: 2px solid var(--tpl-navy-700);
  outline-offset: 2px;
  border-radius: var(--tpl-radius-xs);
}
/* Sobre superficies oscuras (footer) el anillo azul desaparece: se usa el dorado. */
:where(.tpl-footer) :where(a, button, input, select, textarea):focus-visible {
  outline-color: var(--tpl-gold-400);
}

@media (prefers-reduced-motion: reduce) {
  .tpl-header, .tpl-footer, .tpl-mobile-menu, .tpl-btn {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
`;
