"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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

const CAMERA_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

const CHEVRON_LEFT = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m15 18-6-6 6-6" />
  </svg>
);

const CHEVRON_RIGHT = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m9 18 6-6-6-6" />
  </svg>
);

/**
 * Galería Bento Grid Premium con Visor Modal Fullscreen — Paridad y mejora
 * sobre `frontend-v2/parcela.html` (Fase 3.3).
 *
 * Características:
 * - Desktop: 1 foto principal grande a la izquierda + hasta 4 en cuadrante 2x2 a la derecha.
 * - Mobile: Foto hero a ancho completo.
 * - Botón flotante "Mostrar todas las fotos (N)".
 * - Visor modal accesible `<dialog>` a pantalla completa con navegación anterior/siguiente,
 *   atajos de teclado (Escape, Flechas) y gestos táctiles swipe.
 */
export function PropertyGallery({ images, title }: PropertyGalleryProps) {
  const usable = images.filter((image): image is PropertyGalleryImageViewModel & { url: string } => image.url !== null);
  const [modalIndex, setModalIndex] = useState<number | null>(null);
  const [brokenUrls, setBrokenUrls] = useState<ReadonlySet<string>>(new Set());
  const dialogRef = useRef<HTMLDialogElement>(null);
  const touchStartXRef = useRef<number | null>(null);

  const isModalOpen = modalIndex !== null;

  const openModal = useCallback((index: number) => {
    setModalIndex(Math.max(0, Math.min(index, usable.length - 1)));
    if (dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal();
    }
  }, [usable.length]);

  const closeModal = useCallback(() => {
    if (dialogRef.current && dialogRef.current.open) {
      dialogRef.current.close();
    }
    setModalIndex(null);
  }, []);

  const nextImage = useCallback(() => {
    setModalIndex((prev) => (prev === null ? 0 : (prev + 1) % usable.length));
  }, [usable.length]);

  const prevImage = useCallback(() => {
    setModalIndex((prev) => (prev === null ? 0 : (prev - 1 + usable.length) % usable.length));
  }, [usable.length]);

  // Manejador de teclado en modal
  useEffect(() => {
    if (!isModalOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        closeModal();
      } else if (e.key === "ArrowRight") {
        nextImage();
      } else if (e.key === "ArrowLeft") {
        prevImage();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, closeModal, nextImage, prevImage]);

  function markBroken(url: string) {
    setBrokenUrls((prev) => new Set(prev).add(url));
  }

  // Gestos táctiles
  function handleTouchStart(e: React.TouchEvent) {
    touchStartXRef.current = e.touches[0]?.clientX ?? null;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartXRef.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartXRef.current;
    const diff = endX - touchStartXRef.current;
    touchStartXRef.current = null;

    if (diff < -40) {
      nextImage(); // Swipe izquierda -> siguiente
    } else if (diff > 40) {
      prevImage(); // Swipe derecha -> anterior
    }
  }

  if (usable.length === 0) {
    return (
      <div className="tpl-bento-gallery">
        <style>{propertyGalleryCss}</style>
        <div className="tpl-bento-empty">
          {PLACEHOLDER_ICON}
          <span>Sin fotografías disponibles para esta parcela</span>
        </div>
      </div>
    );
  }

  const mainImage = usable[0]!;
  const subImages = usable.slice(1, 5);
  const activeModalImage = modalIndex !== null ? usable[modalIndex] : null;

  return (
    <div className="tpl-bento-gallery">
      <style>{propertyGalleryCss}</style>

      {/* Grid Bento Principal */}
      <div className="tpl-bento-grid">
        <div
          className="tpl-bento-main"
          role="button"
          tabIndex={0}
          aria-label={`Ver foto principal en grande: ${mainImage.alt ?? title}`}
          onClick={() => openModal(0)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") openModal(0); }}
        >
          {brokenUrls.has(mainImage.url) ? (
            <div className="tpl-bento-empty">{PLACEHOLDER_ICON}</div>
          ) : (
            <Image
              src={mainImage.url}
              alt={mainImage.alt ?? title}
              fill
              priority
              sizes="(max-width: 860px) 100vw, 60vw"
              className="tpl-bento-img"
              onError={() => markBroken(mainImage.url)}
            />
          )}
        </div>

        {subImages.length > 0 ? (
          <div className="tpl-bento-sub">
            {subImages.map((image, idx) => {
              const actualIndex = idx + 1;
              return (
                <div
                  key={image.url}
                  className="tpl-bento-sub-item"
                  role="button"
                  tabIndex={0}
                  aria-label={`Ver foto ${actualIndex + 1} de ${usable.length}`}
                  onClick={() => openModal(actualIndex)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") openModal(actualIndex); }}
                >
                  {brokenUrls.has(image.url) ? (
                    <div className="tpl-bento-empty" style={{ height: "100%" }}>{PLACEHOLDER_ICON}</div>
                  ) : (
                    <Image
                      src={image.url}
                      alt={image.alt ?? `${title} - Vista ${actualIndex + 1}`}
                      fill
                      sizes="(max-width: 860px) 0vw, 20vw"
                      className="tpl-bento-img"
                      onError={() => markBroken(image.url)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        ) : null}

        <button
          type="button"
          className="tpl-bento-btn-all"
          onClick={() => openModal(0)}
          aria-label={`Mostrar todas las fotos (${usable.length})`}
        >
          {CAMERA_ICON}
          <span>Mostrar todas las fotos ({usable.length})</span>
        </button>
      </div>

      {/* Modal Visor Pantalla Completa */}
      <dialog
        ref={dialogRef}
        className="tpl-modal-dialog"
        onClose={() => setModalIndex(null)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="tpl-modal-container">
          <div className="tpl-modal-topbar">
            <span className="tpl-modal-counter">
              Foto {(modalIndex ?? 0) + 1} de {usable.length}
            </span>
            <button
              type="button"
              className="tpl-modal-close-btn"
              onClick={closeModal}
              aria-label="Cerrar visor de fotos"
            >
              ✕
            </button>
          </div>

          <div className="tpl-modal-body">
            {usable.length > 1 ? (
              <button
                type="button"
                className="tpl-modal-nav-btn tpl-modal-nav-btn--prev"
                onClick={prevImage}
                aria-label="Foto anterior"
              >
                {CHEVRON_LEFT}
              </button>
            ) : null}

            <div className="tpl-modal-image-wrap">
              {activeModalImage && (
                <Image
                  key={activeModalImage.url}
                  src={activeModalImage.url}
                  alt={activeModalImage.alt ?? `${title} - Foto ${(modalIndex ?? 0) + 1}`}
                  fill
                  sizes="100vw"
                  className="tpl-modal-img"
                  style={{ objectFit: "contain" }}
                  priority
                />
              )}
            </div>

            {usable.length > 1 ? (
              <button
                type="button"
                className="tpl-modal-nav-btn tpl-modal-nav-btn--next"
                onClick={nextImage}
                aria-label="Siguiente foto"
              >
                {CHEVRON_RIGHT}
              </button>
            ) : null}
          </div>

          {usable.length > 1 ? (
            <div className="tpl-modal-thumbs-bar" role="group" aria-label="Miniaturas de navegación">
              {usable.map((img, i) => (
                <button
                  key={img.url}
                  type="button"
                  className={`tpl-modal-thumb-btn${i === modalIndex ? " tpl-modal-thumb-btn--active" : ""}`}
                  onClick={() => setModalIndex(i)}
                  aria-label={`Ver foto ${i + 1}`}
                >
                  <Image src={img.url} alt="" width={60} height={44} style={{ objectFit: "cover" }} />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </dialog>
    </div>
  );
}
