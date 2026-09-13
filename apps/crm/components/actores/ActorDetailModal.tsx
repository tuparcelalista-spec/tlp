"use client";

import type { ActorCrudo, OportunidadDeActor, ParcelaDeActor } from "../../lib/actores/data";
import { Modal } from "../ui/Modal";

const formatCLP = (value: number | null | undefined) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(value || 0);

/** Puerto de `modules/actores/detail.js` — mismas tres secciones: contacto/identificación, oportunidades asociadas, inventario de propiedades. */
export function ActorDetailModal({ actor, oportunidades, parcelas, onClose }: { actor: ActorCrudo; oportunidades: OportunidadDeActor[]; parcelas: ParcelaDeActor[]; onClose: () => void }) {
  return (
    <Modal title="Perfil de Actor" onClose={onClose}>
      <div className="crm-actor-detail__head">
        <div className="crm-actor-detail__avatar">{(actor.nombre || "?").charAt(0).toUpperCase()}</div>
        <div>
          <h3>{actor.nombre || "Sin nombre"}</h3>
          <div className="crm-actor-detail__roles">
            {(actor.roles || []).map((r) => (
              <span key={r} className="crm-chip crm-chip--onbrand">
                {r}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="crm-actor-detail__grid">
        <div>
          <span className="crm-actor-detail__label">Contacto</span>
          <div className="crm-actor-detail__lines">
            <span>{actor.email || "No registrado"}</span>
            <span>{actor.telefono || "No registrado"}</span>
          </div>
        </div>
        <div>
          <span className="crm-actor-detail__label">Identificación y ubicación</span>
          <div className="crm-actor-detail__kv">
            <span>RUT:</span> <span>{actor.rut || "-"}</span>
            <span>Región:</span> <span>{actor.region || "-"}</span>
            <span>Comuna:</span> <span>{actor.comuna || "-"}</span>
          </div>
        </div>
      </div>

      <h4 className="crm-actor-detail__section-title">Oportunidades asociadas ({oportunidades.length})</h4>
      {oportunidades.length > 0 ? (
        <ul className="crm-actor-detail__list">
          {oportunidades.map((op) => (
            <li key={op.id}>
              <span className="crm-actor-detail__code">{op.codigo}</span>
              <span>{op.propiedad_titulo || op.estado || "Oportunidad"}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="crm-actor-detail__empty">Este actor no tiene oportunidades de negocio asociadas actualmente.</p>
      )}

      <h4 className="crm-actor-detail__section-title">Inventario de propiedades ({parcelas.length})</h4>
      {parcelas.length > 0 ? (
        <ul className="crm-actor-detail__list">
          {parcelas.map((p) => (
            <li key={p.id}>
              <div>
                <span className="crm-actor-detail__code">{p.codigo}</span>
                <span>{p.titulo || "Parcela"}</span>
                <div className="crm-actor-detail__meta">
                  {p.comuna || "Comuna N/D"} · {formatCLP(p.precio_publicado)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="crm-actor-detail__empty">Este actor no tiene parcelas publicadas en el sistema.</p>
      )}
    </Modal>
  );
}
