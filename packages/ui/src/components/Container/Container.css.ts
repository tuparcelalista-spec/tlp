export const containerCss = `
.tpl-container {
  width: min(var(--tpl-container), 100% - (var(--tpl-gutter) * 2));
  margin-inline: auto;
}
.tpl-container--narrow {
  width: min(var(--tpl-container-narrow), 100% - (var(--tpl-gutter) * 2));
}
`;
