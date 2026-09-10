export const cardCss = `
.tpl-card {
  position: relative;
  display: flex;
  flex-direction: column;
  background: var(--tpl-surface-raised);
  border: 1px solid var(--tpl-border-default);
  border-radius: var(--tpl-radius-md);
  box-shadow: var(--tpl-shadow-sm);
  overflow: hidden;
  transition: box-shadow var(--tpl-duration) var(--tpl-ease-out),
              transform var(--tpl-duration) var(--tpl-ease-out),
              border-color var(--tpl-duration) var(--tpl-ease-out);
}
.tpl-card:hover {
  box-shadow: var(--tpl-shadow-md);
  transform: translateY(-2px);
  border-color: var(--tpl-border-strong);
}
.tpl-card--featured {
  border-color: var(--tpl-color-accent-gold);
  box-shadow: 0 0 0 1px var(--tpl-color-accent-gold) inset, var(--tpl-shadow-md);
}

.tpl-card__media { position: relative; }

.tpl-card__body {
  display: flex;
  flex-direction: column;
  gap: var(--tpl-space-2);
  flex: 1;
  padding: var(--tpl-space-5);
}
.tpl-card__body--padding-sm { padding: var(--tpl-space-3); }
.tpl-card__body--padding-none { padding: 0; }

.tpl-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--tpl-space-3);
  padding: var(--tpl-space-4) var(--tpl-space-5);
  border-top: 1px solid var(--tpl-border-default);
}
`;
