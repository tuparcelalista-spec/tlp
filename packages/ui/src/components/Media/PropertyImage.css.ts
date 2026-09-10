export const propertyImageCss = `
.tpl-property-image {
  position: relative;
  overflow: hidden;
  background: var(--tpl-surface-sunken);
}
.tpl-property-image[data-ratio="landscape"] { aspect-ratio: 4 / 3; }
.tpl-property-image[data-ratio="wide"] { aspect-ratio: 16 / 9; }
.tpl-property-image[data-ratio="square"] { aspect-ratio: 1 / 1; }
.tpl-property-image[data-ratio="portrait"] { aspect-ratio: 3 / 4; }

.tpl-property-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.tpl-property-image__placeholder {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--tpl-surface-sunken), var(--tpl-surface-2));
  color: var(--tpl-border-strong);
}
.tpl-property-image__placeholder svg { width: 15%; min-width: 32px; max-width: 64px; height: auto; }

.tpl-property-image__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(1, 26, 52, 0) 45%, rgba(1, 26, 52, 0.55) 100%);
  pointer-events: none;
}

.tpl-property-image__badge-slot {
  position: absolute;
  top: var(--tpl-space-3);
  left: var(--tpl-space-3);
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  gap: var(--tpl-space-1);
}
`;
