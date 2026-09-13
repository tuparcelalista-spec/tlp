"use client";

import { useState, useTransition, type DragEvent } from "react";
import type { PipelineColumn } from "../../lib/pipeline/columns";
import type { PipelineCard } from "../../lib/pipeline/data";
import { moverOportunidadAction, descartarOportunidadAction } from "../../lib/pipeline/actions";

/**
 * Puerto a React de `components/kanban.js` (`renderKanban`/`initKanban`) +
 * la parte de interacción de `modules/pipeline/index.js` — mismo modelo de
 * drag-and-drop nativo HTML5 (sin librería), mismo comportamiento: al
 * soltar una tarjeta en otra columna se mueve primero en pantalla
 * (optimista) y se persiste después; si falla, se avisa (no se revierte en
 * silencio, igual que el original avisaba con un toast de error).
 */

interface Toast {
  id: number;
  type: "success" | "error";
  message: string;
}

export function KanbanBoard({ columns, initialCards }: { columns: PipelineColumn[]; initialCards: PipelineCard[] }) {
  const [cards, setCards] = useState(initialCards);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [hoverColId, setHoverColId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [, startTransition] = useTransition();

  function pushToast(type: Toast["type"], message: string) {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }

  function handleDrop(targetColId: string) {
    setHoverColId(null);
    if (!draggedId) return;
    const card = cards.find((c) => c.id === draggedId);
    if (!card || card.columnId === targetColId) {
      setDraggedId(null);
      return;
    }

    const origenId = card.columnId;
    setCards((prev) => prev.map((c) => (c.id === draggedId ? { ...c, columnId: targetColId } : c)));
    setDraggedId(null);

    startTransition(async () => {
      const result = await moverOportunidadAction(card.id, origenId, targetColId);
      if (result.ok) {
        const destino = columns.find((c) => c.id === targetColId);
        pushToast("success", `Oportunidad movida a ${destino?.label ?? targetColId}`);
      } else {
        // No se revierte la tarjeta en pantalla a propósito, igual que el
        // original: hay que decirlo, porque si no el tablero muestra algo
        // que no está guardado.
        pushToast("error", "No se pudo guardar el cambio. Recarga la vista para ver el estado real.");
      }
    });
  }

  async function handleDismiss(cardId: string) {
    if (!confirm("¿Eliminar esta oportunidad del pipeline?\n\nSi tiene historial asociado te ofreceremos marcarla como cancelada en vez de borrarla.")) {
      return;
    }

    const primero = await descartarOportunidadAction(cardId);

    if (primero.ok) {
      setCards((prev) => prev.filter((c) => c.id !== cardId));
      pushToast("success", primero.modo === "cancelada" ? "Oportunidad marcada como cancelada." : "Oportunidad eliminada.");
      return;
    }

    if (primero.requiereConfirmarCancelacion) {
      if (!confirm(primero.motivo)) return;
      const segundo = await descartarOportunidadAction(cardId, true);
      if (segundo.ok) {
        setCards((prev) => prev.filter((c) => c.id !== cardId));
        pushToast("success", "Oportunidad marcada como cancelada.");
      } else {
        pushToast("error", "No se pudo eliminar: " + segundo.motivo);
      }
      return;
    }

    pushToast("error", "No se pudo eliminar: " + primero.motivo);
  }

  function onDragOver(e: DragEvent<HTMLDivElement>, colId: string) {
    e.preventDefault();
    setHoverColId(colId);
  }

  return (
    <div>
      <div className="kanban-board">
        {columns.map((col) => {
          const colCards = cards.filter((c) => c.columnId === col.id);
          return (
            <div className="kanban__column" key={col.id}>
              <div className="kanban__column-header" style={{ borderTopColor: col.color }}>
                <h3 className="kanban__column-title">{col.label}</h3>
                <span className="kanban__column-count">{colCards.length}</span>
              </div>
              <div
                className={`kanban__column-body${hoverColId === col.id ? " kanban__column-body--hover" : ""}`}
                onDragOver={(e) => onDragOver(e, col.id)}
                onDragLeave={() => setHoverColId((prev) => (prev === col.id ? null : prev))}
                onDrop={() => handleDrop(col.id)}
              >
                {colCards.map((card) => (
                  <div
                    key={card.id}
                    className={`kanban__card${draggedId === card.id ? " kanban__card--dragging" : ""}`}
                    draggable
                    onDragStart={() => setDraggedId(card.id)}
                    onDragEnd={() => setDraggedId(null)}
                  >
                    <button
                      type="button"
                      className="kanban__card-dismiss"
                      title="Descartar o eliminar esta oportunidad"
                      aria-label="Descartar oportunidad"
                      onClick={() => handleDismiss(card.id)}
                    >
                      ×
                    </button>
                    <h4 className="kanban__card-title">{card.title}</h4>
                    {card.subtitle ? <p className="kanban__card-subtitle">{card.subtitle}</p> : null}
                    <div className="kanban__card-footer">
                      {card.meta ? <span className="kanban__card-meta">{card.meta}</span> : null}
                      {card.badge ? <span className="kanban__card-badge">{card.badge}</span> : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ position: "fixed", bottom: 16, right: 16, display: "flex", flexDirection: "column", gap: 8, zIndex: 100 }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              fontSize: 14,
              color: "#fff",
              background: t.type === "success" ? "#16a34a" : "#dc2626",
              boxShadow: "0 4px 6px -1px rgba(0,0,0,.2)",
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
