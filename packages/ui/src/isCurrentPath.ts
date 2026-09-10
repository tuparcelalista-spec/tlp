/**
 * Equivalente sin DOM de `markCurrentPage()` en frontend-v2/js/tpl-shell.js.
 * A diferencia del original, no lee `window.location` — recibe `currentPath`
 * como prop desde el consumidor (ej. `usePathname()` de Next.js), así el
 * componente es seguro en SSR y no depende de un global del navegador.
 */
export function isCurrentPath(href: string, currentPath?: string): boolean {
  if (!currentPath || !href) return false;
  if (href.startsWith("#") || /^[a-z]+:/i.test(href)) return false;

  const normalize = (value: string) =>
    value.split("#")[0]!.split("?")[0]!.replace(/\/index\.html$/, "/").replace(/\/+$/, "/") || "/";

  return normalize(href) === normalize(currentPath);
}
