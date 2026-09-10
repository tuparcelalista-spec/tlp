"use client";

import type { MouseEvent } from "react";
import type { TplNavLink } from "../../types";
import { isCurrentPath } from "../../isCurrentPath";

export interface MobileMenuProps {
  id?: string;
  links: TplNavLink[];
  publishHref: string;
  publishLabel?: string;
  isOpen: boolean;
  currentPath?: string;
  onNavigate?: () => void;
}

/**
 * Panel del menú móvil. Header lo compone internamente (así el toggle vive
 * en un solo lugar), pero se exporta también como componente propio para
 * quien necesite un menú móvil fuera del Header por defecto.
 */
export function MobileMenu({
  id = "tpl-mobile-menu",
  links,
  publishHref,
  publishLabel = "Publicar parcela",
  isOpen,
  currentPath,
  onNavigate,
}: MobileMenuProps) {
  function handleClick(event: MouseEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest("a")) onNavigate?.();
  }

  return (
    <nav id={id} className="tpl-mobile-menu" hidden={!isOpen} aria-label="Menú móvil" onClick={handleClick}>
      {links.map((link) => (
        <a key={link.href} href={link.href} aria-current={isCurrentPath(link.href, currentPath) ? "page" : undefined}>
          {link.label}
        </a>
      ))}
      <a href={publishHref}>{publishLabel}</a>
    </nav>
  );
}
