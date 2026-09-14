"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PublicacionRevision, DetallePublicacion } from "../../lib/revision/data";
import { previewDePublicacion } from "../../lib/revision/data";
import { relativeDate } from "../../lib/utils/format";
import { obtenerDetallePublicacionAction, revisarPublicacionAction } from "../../lib/revision/actions";
import { DetallePublicacionPanel } from "./DetallePublicacionPanel";

interface Toast {
  id: number;
  texto: string;
  tipo: "success" | "error";
}

let toastSeq = 0;

/**
 * Puerto de `render()` + `init()` de `modules/revision/index.js`: la bandeja
 * de publicaciones esperando revisión, con la ficha completa abriéndose
 * debajo al hacer clic en "Revisar" — sin cambios de comportamiento respecto
 * al legacy, esta pantalla ya tenía sus dos RPCs (`tpl_publicacion_detalle_v1`,
 * `tpl_revisar_publicacion_v1`) completamente conectadas y funcionando.
 */
export function BandejaRevision({ initialPublicaciones }: { initialPublicaciones: PublicacionRevision[] }) {
  const router = useRouter();
  const [publicaciones, setPublicaciones] = useState(initialPublicaciones);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<DetallePublicacion | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  function toast(texto: string, tipo: Toast["tipo"]) {
    const id = ++toastSeq;
    setToasts((prev) => [...prev, { id, texto, tipo }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }

  async function handleRevisar(id: string) {
    setSelectedId(id);
    setDetalle(null);
    setErrorDetalle(null);
    setCargandoDetalle(true);
    const res = await obtenerDetallePublicacionAction(id);
    setCargandoDetalle(false);
    if (res.ok) {
      setDetalle(res.detalle);
    } else {
      setErrorDetalle(res.motivo);
    }
  }

  function handleCerrar() {
    setSelectedId(null);
    setDetalle(null);
    setErrorDetalle(null);
  }

  async function handleDecidir(decision: "aprobar" | "rechazar", motivo: string) {
    if (!selectedId) return { ok: false as const, motivo: "No hay publicación seleccionada." };
    const res = await revisarPublicacionAction(selectedId, decision, motivo);
    if (res.ok) {
      toast(res.mensaje, "success");
      setPublicaciones((prev) => prev.filter((p) => p.id !== selectedId));
      handleCerrar();
      router.refresh();
    }
    return res;
  }

  return (
    <div className="revision-modulo">
      <div className="revision-cabecera">
        <h1 className="revision-titulo">Bandeja de revisión</h1>
        {publicaciones.length ? (
          <span className="revision-contador">
            {publicaciones.length} {publicaciones.length === 1 ? "pendiente" : "pendientes"}
          </span>
        ) : null}
      </div>

      {publicaciones.length === 0 ? (
        <div className="revision-tabla-card">
          <p className="revision-vacio">No hay publicaciones esperando revisión. Todo al día.</p>
        </div>
      ) : (
        <div className="revision-tabla-card">
          <div className="revision-tabla-scroll">
            <table className="revision-tabla">
              <thead>
                <tr>
                  <th>Publicación</th>
                  <th>Comuna</th>
                  <th>Superficie</th>
                  <th>Precio pedido</th>
                  <th>Enviada</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {publicaciones.map((r) => {
                  const preview = previewDePublicacion(r);
                  return (
                    <tr key={r.id}>
                      <td>
                        <strong>{preview.titulo}</strong>
                        <small>{preview.codigo}</small>
                      </td>
                      <td>{preview.comuna}</td>
                      <td>{preview.superficieLabel}</td>
                      <td>{preview.precioLabel}</td>
                      <td title={preview.fechaIso ? new Date(preview.fechaIso).toLocaleString("es-CL") : ""}>{relativeDate(preview.fechaIso)}</td>
                      <td>
                        <button type="button" className="revision-btn-revisar" onClick={() => handleRevisar(r.id)}>
                          Revisar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedId ? (
        <div className="rev-detalle">
          {cargandoDetalle ? (
            <div className="rev-panel">
              <p className="revision-vacio">Cargando la publicación…</p>
            </div>
          ) : errorDetalle ? (
            <div className="rev-panel">
              <p className="rev-alerta">No pudimos abrir esta publicación. {errorDetalle}</p>
              <button type="button" className="rev-btn-cerrar" onClick={handleCerrar}>
                Cerrar
              </button>
            </div>
          ) : detalle ? (
            <DetallePublicacionPanel detalle={detalle} onCerrar={handleCerrar} onDecidir={handleDecidir} />
          ) : null}
        </div>
      ) : null}

      <div className="revision-toasts">
        {toasts.map((t) => (
          <div key={t.id} className={`revision-toast revision-toast--${t.tipo}`}>
            {t.texto}
          </div>
        ))}
      </div>
    </div>
  );
}
