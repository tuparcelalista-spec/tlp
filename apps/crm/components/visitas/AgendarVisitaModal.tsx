"use client";

import { useState, type FormEvent } from "react";
import type { OportunidadAgendable, StaffAsignable } from "../../lib/visitas/data";
import { agendarVisitaAction } from "../../lib/visitas/actions";
import { Modal } from "../ui/Modal";

/**
 * Formulario nuevo para `tpl_crm_agendar_visita_v1` — no existe un
 * equivalente 1:1 en el CRM legacy (ver el comentario de
 * `agendarVisitaAction` en `lib/visitas/actions.ts`: el botón "Agendar
 * Visita" original no tenía handler). El único comportamiento que SÍ viene
 * directo de la RPC es el chequeo de colisión de horario del ejecutivo
 * (±2 horas) — el mensaje de error que se muestra es el mismo que la base
 * ya calcula, no una validación inventada aquí.
 */
export function AgendarVisitaModal({
  oportunidades,
  staff,
  onClose,
  onAgendada,
}: {
  oportunidades: OportunidadAgendable[];
  staff: StaffAsignable[];
  onClose: () => void;
  onAgendada: () => void;
}) {
  const [oportunidadId, setOportunidadId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [fechaHora, setFechaHora] = useState("");
  const [notas, setNotas] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!oportunidadId || !staffId || !fechaHora || enviando) return;

    const fechaHoraIso = new Date(fechaHora).toISOString();

    setEnviando(true);
    setError(null);
    const res = await agendarVisitaAction({ oportunidadId, staffId, fechaHoraIso, notas });
    setEnviando(false);
    if (res.ok) {
      onAgendada();
    } else {
      setError(res.motivo);
    }
  }

  return (
    <Modal title="Agendar Visita" onClose={onClose}>
      <form className="agendar-visita-form" onSubmit={handleSubmit}>
        {oportunidades.length === 0 ? <p className="agendar-visita-aviso">No hay oportunidades activas del embudo comercial para agendar una visita.</p> : null}

        <div className="agendar-visita-field">
          <label htmlFor="av-oportunidad">Oportunidad</label>
          <select id="av-oportunidad" value={oportunidadId} onChange={(e) => setOportunidadId(e.target.value)} required>
            <option value="">Selecciona una oportunidad…</option>
            {oportunidades.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="agendar-visita-field">
          <label htmlFor="av-staff">Ejecutivo asignado</label>
          <select id="av-staff" value={staffId} onChange={(e) => setStaffId(e.target.value)} required>
            <option value="">Selecciona un ejecutivo…</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="agendar-visita-field">
          <label htmlFor="av-fecha">Fecha y hora</label>
          <input id="av-fecha" type="datetime-local" value={fechaHora} onChange={(e) => setFechaHora(e.target.value)} required />
        </div>

        <div className="agendar-visita-field">
          <label htmlFor="av-notas">Notas (opcional)</label>
          <textarea id="av-notas" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Ej: cliente pidió confirmar el día antes" />
        </div>

        {error ? <p className="agendar-visita-error">⚠️ {error}</p> : null}

        <div className="agendar-visita-actions">
          <button type="button" className="visitas-btn-secundario" onClick={onClose} disabled={enviando}>
            Cancelar
          </button>
          <button type="submit" className="visitas-btn-agendar" disabled={enviando}>
            {enviando ? "Agendando…" : "Agendar Visita"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
