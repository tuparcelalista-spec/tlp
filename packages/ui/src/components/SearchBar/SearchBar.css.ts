import { breakpoints } from "../../tokens";

export const searchBarCss = `
.tpl-search-bar {
  display: flex;
  gap: var(--tpl-space-2);
  align-items: stretch;
  width: 100%;
}
.tpl-search-bar .tpl-input { flex: 1; }
@media (max-width: ${breakpoints.mobile}px) {
  .tpl-search-bar { flex-direction: column; }
}
`;
