"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  type VisitaRow,
  type OportunidadAgendable,
  type StaffAsignable,
  ordenarPorFecha,
  filtrarVisibles,
  contarCanceladas,
  esCancelable,
  infoEstado,
  transicionesDisponibles,
} from "../../lib/visitas/data";
import { cancelarVisitaAction, actualizarEstadoVisitaAction } from "../../lib/visitas/actions";
import { AgendarVisitaModal } from "./AgendarVisitaModal";

interface Toast {
  id: number;
  type: "success" | "error";
  message: string;
}

const ETIQUETA_TRANSICION: Record<string, string> = {
  confirmada: "Confirmar",
  realizada: "Marcar realizada",
  no_asistio: "Marcar no asistió",
};

/**
 * Puerto de `render()`/`init()` en `modules/visitas/index.js`, con dos
 * capacidades nuevas que el original no tenía (ver `agendarVisitaAction`/
 * `actualizarEstadoVisitaAction` en `lib/visitas/actions.ts` para el porqué):
 * un botón real "Agendar Visita" (antes un link muerto a `#pipeline`) y un
 * control para confirmar/marcar realizada/no asistió (antes solo se podía
 * cancelar). Cancelar sigue siendo update directo sobre la tabla, igual que
 * el original; lo nuevo pasa por las RPC `tpl_crm_agendar_visita_v1` /
 * `tpl_crm_actualizar_visita_v1`, que ya existían sin usar.
 */
export function VisitasAgenda({ initialVisitas, oportunidades, staff }: { initialVisitas: VisitaRow[]; oportunidades: OportunidadAgendable[]; staff: StaffAsignable[] }) {
  const [visitas, setVisitas] = useState(initialVisitas);
  const [verCanceladas, setVerCanceladas] = useState(false);
  const [agendarAbierto, setAgendarAbierto] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const router = useRouter();

  function pushToast(type: Toast["type"], message: string) {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }

  const ordenadas = useMemo(() => ordenarPorFecha(visitas), [visitas]);
  const canceladas = useMemo(() => contarCanceladas(ordenadas), [ordenadas]);
  const visibles = useMemo(() => filtrarVisibles(ordenadas, verCanceladas), [ordenadas, verCanceladas]);

  async function handleCancelar(v: VisitaRow) {
    const motivo = prompt("¿Por qué se cancela la visita? (queda en la nota de la visita)");
    if (motivo === null) return;
    setPendingId(v.id);
    const res = await cancelarVisitaAction(v.id, motivo);
    setPendingId(null);
    if (res.ok) {
      setVisitas((prev) => prev.map((x) => (x.id === v.id ? { ...x, estado: "cancelada", notas: motivo.trim() || null } : x)));
      pushToast("success", "Visita cancelada.");
    } else {
      pushToast("error", "No se pudo cancelar: " + res.motivo);
    }
  }

  async function handleTransicion(v: VisitaRow, nuevoEstado: string) {
    let resultado: string | undefined;
    if (nuevoEstado === "realizada" || nuevoEstado === "no_asistio") {
      const respuesta = prompt(`Resultado de la visita (opcional):`, v.resultado || "");
      if (respuesta === null) return; // se arrepintió del diálogo
      resultado = respuesta;
    }
    setPendingId(v.id);
    const res = await actualizarEstadoVisitaAction({ visitaId: v.id, estado: nuevoEstado, resultado });
    setPendingId(null);
    if (res.ok) {
      setVisitas((prev) => prev.map((x) => (x.id === v.id ? { ...x, estado: nuevoEstado, resultado: resultado ?? x.resultado } : x)));
      pushToast("success", `Visita actualizada a "${infoEstado(nuevoEstado).etiqueta}".`);
    } else {
      pushToast("error", res.motivo);
    }
  }

  function handleAgendada() {
    setAgendarAbierto(false);
    pushToast("success", "Visita agendada correctamente.");
    router.refresh();
  }

  return (
    <div className="visitas-module">
      <div className="visitas-header-bar">
        <div>
          <h1 className="visitas-title">Agenda de Visitas</h1>
          <p className="visitas-subtitle">Visitas a terreno coordinadas por el equipo TPL.</p>
        </div>
        <div className="visitas-header-actions">
          {canceladas > 0 ? (
            <button type="button" className={`visitas-btn-ver-canceladas${verCanceladas ? " is-active" : ""}`} onClick={() => setVerCanceladas((v) => !v)}>
              {verCanceladas ? "Ocultar" : "Ver"} {canceladas} cancelada{canceladas === 1 ? "" : "s"}
            </button>
          ) : null}
          <button type="button" className="visitas-btn-agendar" onClick={() => setAgendarAbierto(true)}>
            + Agendar Visita
          </button>
        </div>
      </div>

      <div className="visitas-table-card">
        <div className="visitas-table-scroll">
          <table className="visitas-table">
            <thead>
              <tr>
                <th>Fecha y Hora</th>
                <th>Estado</th>
                <th>Cliente</th>
                <th>Propiedad</th>
                <th>Oportunidad</th>
                <th>Staff Asignado</th>
                <th className="visitas-th-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {visibles.length > 0 ? (
                visibles.map((v) => {
                  const fecha = new Date(v.fecha_hora);
                  const fStr = fecha.toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" });
                  const hStr = fecha.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
                  const cancelable = esCancelable(v.estado);
                  const pasada = fecha.getTime() < Date.now();
                  const transiciones = transicionesDisponibles(v.estado);
                  const info = infoEstado(v.estado);
                  const pending = pendingId === v.id;

                  return (
                    <tr key={v.id} className={v.estado === "cancelada" ? "visitas-row--cancelada" : ""}>
                      <td>
                        <div className="visitas-fecha-cell">
                          <span className="visitas-fecha-dia">{fStr}</span>
                          <span className="visitas-fecha-hora">
                            {hStr}
                            {pasada && cancelable ? " · ya pasó" : ""}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`visita-badge ${info.clase}`}>{info.etiqueta}</span>
                      </td>
                      <td className="visitas-td-cliente">{v.actor_nombre || "-"}</td>
                      <td className="visitas-td-propiedad" title={v.propiedad_titulo || ""}>
                        {v.propiedad_titulo || "-"}
                      </td>
                      <td className="visitas-td-mono">{v.oportunidad_codigo || "-"}</td>
                      <td>
                        <div className="visitas-staff-cell">
                          <span className="visitas-staff-avatar">{v.staff_nombre ? v.staff_nombre.charAt(0) : "?"}</span>
                          {v.staff_nombre || "Sin asignar"}
                        </div>
                      </td>
                      <td className="visitas-th-right">
                        <div className="visitas-acciones">
                          {transiciones.length > 0 ? (
                            <select
                              className="visitas-select-transicion"
                              value=""
                              disabled={pending}
                              onChange={(e) => {
                                const nuevo = e.target.value;
                                e.target.value = "";
                                if (nuevo) handleTransicion(v, nuevo);
                              }}
                            >
                              <option value="">Cambiar estado…</option>
                              {transiciones.map((t) => (
                                <option key={t} value={t}>
                                  {ETIQUETA_TRANSICION[t] || t}
                                </option>
                              ))}
                            </select>
                          ) : null}
                          {cancelable ? (
                            <button type="button" className="visitas-btn-cancelar" disabled={pending} onClick={() => handleCancelar(v)}>
                              Cancelar
                            </button>
                          ) : transiciones.length === 0 ? (
                            <span className="visitas-sin-accion">—</span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="visitas-empty">
                    {ordenadas.length ? "Todas las visitas están canceladas." : "No hay visitas agendadas en el sistema."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {agendarAbierto ? <AgendarVisitaModal oportunidades={oportunidades} staff={staff} onClose={() => setAgendarAbierto(false)} onAgendada={handleAgendada} /> : null}

      <div className="visitas-toasts">
        {toasts.map((t) => (
          <div key={t.id} className={`visitas-toast visitas-toast--${t.type}`}>
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
