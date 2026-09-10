"use client";

import { useEffect, useRef, useState } from "react";
import type { TplNavLink } from "../../types";
import { isCurrentPath } from "../../isCurrentPath";
import { breakpoints } from "../../tokens";
import { Button } from "../Button/Button";
import { MobileMenu } from "./MobileMenu";

export interface HeaderProps {
  homeHref?: string;
  logoSrc: string;
  logoAlt?: string;
  navLinks: TplNavLink[];
  publishHref: string;
  publishLabel?: string;
  publishMobileMenuLabel?: string;
  mobileQuickLink?: TplNavLink;
  currentPath?: string;
}

const MENU_ID = "tpl-mobile-menu";

/**
 * Header sticky con nav de escritorio + menú móvil propio. Reemplaza el
 * comportamiento de frontend-v2/js/tpl-shell.js (que leía el DOM a mano)
 * por estado de React; el resultado visible es el mismo: togglear,
 * cerrar al hacer click afuera, cerrar con Escape, cerrar al cruzar a
 * escritorio, marcar la página actual.
 */
export function Header({
  homeHref = "/",
  logoSrc,
  logoAlt = "Tu Parcela Lista",
  navLinks,
  publishHref,
  publishLabel = "Publicar",
  publishMobileMenuLabel = "Publicar parcela",
  mobileQuickLink,
  currentPath,
}: HeaderProps) {
  const [isMenuOpen, setMenuOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isMenuOpen) return;

    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node;
      const menu = document.getElementById(MENU_ID);
      if (menu?.contains(target) || toggleRef.current?.contains(target)) return;
      setMenuOpen(false);
    }

    function handleKeydown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      toggleRef.current?.focus();
    }

    function handleDesktopChange(event: MediaQueryListEvent) {
      if (event.matches) setMenuOpen(false);
    }

    const desktop = window.matchMedia(`(min-width: ${breakpoints.tablet + 1}px)`);
    document.addEventListener("click", handleOutsideClick);
    document.addEventListener("keydown", handleKeydown);
    desktop.addEventListener("change", handleDesktopChange);

    return () => {
      document.removeEventListener("click", handleOutsideClick);
      document.removeEventListener("keydown", handleKeydown);
      desktop.removeEventListener("change", handleDesktopChange);
    };
  }, [isMenuOpen]);

  return (
    <header className="tpl-header">
      <div className="tpl-header__inner tpl-container">
        <a className="tpl-brand" href={homeHref} aria-label="Tu Parcela Lista, inicio">
          <img src={logoSrc} width={330} height={72} alt={logoAlt} />
        </a>

        <nav className="tpl-nav" aria-label="Navegación principal">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              aria-current={isCurrentPath(link.href, currentPath) ? "page" : undefined}
            >
              {link.label}
            </a>
          ))}
          <Button href={publishHref} variant="navy" pill>
            {publishLabel}
          </Button>
        </nav>

        <div className="tpl-mobile-actions">
          {mobileQuickLink ? (
            <a href={mobileQuickLink.href} className="tpl-mobile-parcelas">
              {mobileQuickLink.label}
            </a>
          ) : null}
          <Button href={publishHref} variant="navy" pill>
            {publishLabel}
          </Button>
          <button
            ref={toggleRef}
            id="menu-toggle"
            className="tpl-menu-button"
            type="button"
            aria-expanded={isMenuOpen}
            aria-controls={MENU_ID}
            aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            &#9776;
          </button>
        </div>

        <MobileMenu
          id={MENU_ID}
          isOpen={isMenuOpen}
          links={navLinks}
          publishHref={publishHref}
          publishLabel={publishMobileMenuLabel}
          currentPath={currentPath}
          onNavigate={() => setMenuOpen(false)}
        />
      </div>
    </header>
  );
}
