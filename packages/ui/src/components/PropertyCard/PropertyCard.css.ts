/**
 * Patrón de "card completa clickeable" accesible: el título es el único
 * `<a>` real (lector de pantalla anuncia el nombre de la propiedad, no
 * "enlace"), estirado sobre toda la card con `::after`. El botón del
 * footer queda por encima (z-index) para seguir siendo clickeable aparte.
 */
export const propertyCardCss = `
.tpl-property-card__title {
  margin: 0;
  font-family: var(--tpl-font-display);
  font-size: var(--tpl-text-xl);
  font-weight: var(--tpl-weight-medium);
  line-height: var(--tpl-leading-snug);
  color: var(--tpl-content-primary);

  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.tpl-property-card__link {
  color: inherit;
  text-decoration: none;
}
.tpl-property-card__link::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 0;
}
.tpl-property-card__link:focus-visible {
  outline: none;
}
.tpl-property-card__link:focus-visible::after {
  outline: 2px solid var(--tpl-navy-700);
  outline-offset: 2px;
  border-radius: var(--tpl-radius-md);
}
.tpl-property-card__cta {
  position: relative;
  z-index: 1;
}
`;
