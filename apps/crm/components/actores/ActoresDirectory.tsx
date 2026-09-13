"use client";

import { useState, useTransition } from "react";
import type { ActorCrudo, OportunidadDeActor, ParcelaDeActor } from "../../lib/actores/data";
import { splitActivosArchivados, oportunidadesDeActor, parcelasDeActor } from "../../lib/actores/data";
import { archivarActorAction } from "../../lib/actores/actions";
import { ActorDetailModal } from "./ActorDetailModal";

/**
 * Puerto de `modules/actores/index.js` a React: misma tabla, mismo toggle
 * "Ver/Ocultar N archivados", mismo botón Archivar/Reactivar por fila, y el
 * mismo perfil en modal en vez de navegar a otra página (el original tampoco
 * navega — usa `showModal`).
 */
export function ActoresDirectory({ actores, oportunidades, parcelas }: { actores: ActorCrudo[]; oportunidades: OportunidadDeActor[]; parcelas: ParcelaDeActor[] }) {
  const [verArchivados, setVerArchivados] = useState(false);
  const [actorSeleccionado, setActorSeleccionado] = useState<ActorCrudo | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const { activos, archivados } = splitActivosArchivados(actores);
  const filas = verArchivados ? actores : activos;

  function handleArchivar(actor: ActorCrudo) {
    const estaArchivado = actor.estado === "archivado";
    const nombre = actor.nombre || "este actor";

    const confirmado = estaArchivado ? confirm(`¿Reactivar a ${nombre}? Vuelve a aparecer en el directorio.`) : confirm(`¿Archivar a ${nombre}?\n\nNo se borra nada: su historial comercial se conserva intacto y sale del listado. Puedes reactivarlo cuando quieras.`);
    if (!confirmado) return;

    setPendingId(actor.id);
    startTransition(async () => {
      const resultado = await archivarActorAction(actor.id, !estaArchivado);
      setPendingId(null);
      if (!resultado.ok) {
        alert(resultado.motivo);
      }
    });
  }

  return (
    <div className="actores-list">
      <div className="crm-list-head">
        <h2>Directorio de Actores</h2>
        <div className="crm-list-head__actions">
          {archivados.length > 0 ? (
            <button type="button" className="crm-btn-chip" onClick={() => setVerArchivados((v) => !v)}>
              {verArchivados ? "Ocultar" : "Ver"} {archivados.length} archivado{archivados.length === 1 ? "" : "s"}
            </button>
          ) : null}
          <span className="crm-list-head__hint">Se crean solos desde el cotizador, el publicador y las reservas pagadas.</span>
        </div>
      </div>

      <div className="crm-table-card">
        <table className="crm-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>RUT</th>
              <th>Contacto</th>
              <th>Roles</th>
              <th style={{ textAlign: "center" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 ? (
              <tr>
                <td colSpan={5} className="crm-table__empty">
                  {actores.length ? "Todos los actores están archivados." : "No se encontraron actores en el sistema."}
                </td>
              </tr>
            ) : (
              filas.map((a) => (
                <tr key={a.id} className={a.estado === "archivado" ? "crm-table__row--muted" : undefined} onClick={() => setActorSeleccionado(a)} style={{ cursor: "pointer" }}>
                  <td>
                    {a.nombre || "-"}
                    {a.estado === "archivado" ? <span className="crm-chip crm-chip--muted">Archivado</span> : null}
                  </td>
                  <td className="crm-table__mono">{a.rut || "-"}</td>
                  <td>
                    <div className="crm-table__stack">
                      {a.email ? <span>{a.email}</span> : null}
                      {a.telefono ? <span>{a.telefono}</span> : null}
                      {!a.email && !a.telefono ? <span>-</span> : null}
                    </div>
                  </td>
                  <td>
                    <div className="crm-table__chips">{(a.roles || []).length ? (a.roles || []).map((r) => <span className="crm-chip" key={r}>{r}</span>) : <span>-</span>}</div>
                  </td>
                  <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                    <button type="button" className="crm-link-btn" onClick={() => setActorSeleccionado(a)}>
                      Ver perfil
                    </button>
                    <button type="button" className="crm-link-btn crm-link-btn--muted" disabled={pendingId === a.id} onClick={() => handleArchivar(a)}>
                      {a.estado === "archivado" ? "Reactivar" : "Archivar"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {actorSeleccionado ? (
        <ActorDetailModal actor={actorSeleccionado} oportunidades={oportunidadesDeActor(oportunidades, actorSeleccionado.id)} parcelas={parcelasDeActor(parcelas, actorSeleccionado.id)} onClose={() => setActorSeleccionado(null)} />
      ) : null}
    </div>
  );
}
