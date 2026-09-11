"use client";

import { useState } from "react";
import Image from "next/image";
import type { PropertyGalleryImageViewModel } from "../../lib/search/presentation";
import { propertyGalleryCss } from "./propertyGallery.css";

export interface PropertyGalleryProps {
  images: PropertyGalleryImageViewModel[];
  title: string;
}

const PLACEHOLDER_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
    <path d="M3 10.5 12 4l9 6.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5 9.5V20h14V9.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * Galería reutilizable — Fase 3.3. Usa el resolver de imágenes (Bloque
 * 2.6) vía `PropertyGalleryImageViewModel` (`presentation.ts`) — no
 * decide por su cuenta si una URL es de Storage o legacy. Usa
 * `next/image` (no `@tpl/ui` `PropertyImage`, que renderiza un `<img>`
 * plano): la galería es el punto de la página con más imágenes por
 * renderizar, así que es donde más rinde la optimización automática de
 * Next. El `onError` de cada `<Image>` es el ÚLTIMO nivel de seguridad
 * (una URL que resuelve pero falla al cargar) — la arquitectura real
 * (qué origen tiene cada URL) ya la resolvió `resolvePropertyImageUrl()`
 * antes de llegar aquí.
 */
export function PropertyGallery({ images, title }: PropertyGalleryProps) {
  const usable = images.filter((image): image is PropertyGalleryImageViewModel & { url: string } => image.url !== null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [brokenUrls, setBrokenUrls] = useState<ReadonlySet<string>>(new Set());

  if (usable.length === 0) {
    return (
      <div className="tpl-gallery tpl-gallery--empty">
        <style>{propertyGalleryCss}</style>
        {PLACEHOLDER_ICON}
        <span>Sin imágenes disponibles</span>
      </div>
    );
  }

  const active = usable[Math.min(activeIndex, usable.length - 1)]!;
  const activeIsBroken = brokenUrls.has(active.url);

  function markBroken(url: string) {
    setBrokenUrls((prev) => new Set(prev).add(url));
  }

  return (
    <div className="tpl-gallery">
      <style>{propertyGalleryCss}</style>
      <div className="tpl-gallery__main">
        {activeIsBroken ? (
          <div className="tpl-gallery__placeholder">{PLACEHOLDER_ICON}</div>
        ) : (
          <Image
            key={active.url}
            src={active.url}
            alt={active.alt ?? title}
            fill
            sizes="(max-width: 820px) 100vw, 800px"
            priority={activeIndex === 0}
            style={{ objectFit: "cover" }}
            onError={() => markBroken(active.url)}
          />
        )}
      </div>
      {usable.length > 1 ? (
        // Fase 3.15 — auditoría QA: antes usaba role="tablist"/"tab", que en
        // ARIA implica navegación por flechas y un "tabpanel" asociado
        // (`aria-controls`) — ninguno de los dos existe acá. "group" +
        // `aria-pressed` describe con precisión el comportamiento real: un
        // grupo de botones toggle, navegables con Tab normal (ya
        // funcionaba, son <button> nativos).
        <div className="tpl-gallery__thumbs" role="group" aria-label="Miniaturas de la galería">
          {usable.map((image, index) => (
            <button
              key={image.url}
              type="button"
              aria-pressed={index === activeIndex}
              aria-label={`Ver foto ${index + 1} de ${usable.length}`}
              className={`tpl-gallery__thumb${index === activeIndex ? " tpl-gallery__thumb--active" : ""}`}
              onClick={() => setActiveIndex(index)}
            >
              {brokenUrls.has(image.url) ? (
                <span className="tpl-gallery__thumb-placeholder">{PLACEHOLDER_ICON}</span>
              ) : (
                <Image src={image.url} alt="" fill sizes="80px" style={{ objectFit: "cover" }} onError={() => markBroken(image.url)} />
              )}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
