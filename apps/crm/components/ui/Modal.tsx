"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

/**
 * Reemplazo minimalista de `components/modal.js` (`showModal({title, body,
 * size})`) para React: overlay + panel centrado, cierre con Escape o click
 * fuera. No es un puerto 1:1 pixel a pixel del original (ese usa un
 * `<dialog>` con HTML armado a mano) — se prioriza el comportamiento
 * (mismo título, mismo contenido, mismo cierre) sobre la implementación.
 */
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="crm-modal-overlay" onClick={onClose}>
      <div className="crm-modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="crm-modal-panel__head">
          <h2>{title}</h2>
          <button type="button" className="crm-modal-panel__close" aria-label="Cerrar" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="crm-modal-panel__body">{children}</div>
      </div>
    </div>
  );
}
