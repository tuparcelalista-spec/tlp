"use client";

import { useEffect, useRef, useState } from "react";
import type { ParcelaResumen } from "../../lib/parcelas/data";
import { generarLinkPropietarioAction } from "../../lib/parcelas/actions";
import { urlFichaPublica, urlPortalPropietario, urlInformeConToken } from "../../lib/legacySite";
import { formatCLP } from "../../lib/utils/format";

async function copiar(texto: string) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(texto);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = texto;
      textarea.style.position = "fixed";
      textarea.style.left = "-999999px";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Puerto a React de `openShareModal()` en `modules/parcelas/share-modal.js`.
 * La tarjeta del comprador se muestra de inmediato (no depende de ningún
 * token); las tarjetas de propietario e informe esperan el mismo token
 * generado por `tpl_crm_generar_link_propietario_v1` — ver el comentario en
 * `generarLinkPropietarioAction` sobre el requisito de `tpl_es_admin()`.
 */
export function ShareParcelaModal({ parcela, onClose }: { parcela: ParcelaResumen; onClose: () => void }) {
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [errorToken, setErrorToken] = useState<string | null>(null);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const solicitado = useRef(false);

  useEffect(() => {
    if (solicitado.current) return;
    solicitado.current = true;
    generarLinkPropietarioAction(parcela.id).then((res) => {
      if (res.ok) {
        setToken(res.token);
        setExpiresAt(res.expiresAt);
      } else {
        setErrorToken(res.motivo);
      }
    });
  }, [parcela.id]);

  async function handleCopiar(id: string, texto: string) {
    const ok = await copiar(texto);
    if (ok) {
      setCopiadoId(id);
      setTimeout(() => setCopiadoId((prev) => (prev === id ? null : prev)), 2000);
    }
  }

  const titulo = parcela.titulo || "Parcela TPL";
  const codigo = parcela.codigo || "";
  const comuna = parcela.comuna || "Chile";
  const precio = parcela.precio_publicado ? formatCLP(parcela.precio_publicado) : "";
  const webCompradorUrl = urlFichaPublica(parcela.id);

  const fechaVence = expiresAt ? new Date(expiresAt).toLocaleDateString("es-CL", { day: "numeric", month: "long" }) : "30 días";
  const baseUrlProp = token ? urlPortalPropietario(token) : null;
  const baseUrlReport = token ? urlInformeConToken(token) : null;

  return (
    <div className="crm-modal-overlay" onClick={onClose}>
      <div className="crm-modal-panel" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <div className="crm-modal-panel__head">
          <h2>🔗 Compartir Parcela</h2>
          <button type="button" className="crm-modal-panel__close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>
        <div className="crm-modal-panel__body" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "1rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>{[codigo, comuna].filter(Boolean).join(" · ")}</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a", marginTop: 2 }}>{titulo}</div>
            </div>
            {precio ? <div style={{ textAlign: "right", background: "white", padding: "6px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontWeight: 700, color: "#0369a1", fontSize: "1rem" }}>{precio}</div> : null}
          </div>

          {/* Tarjeta 1: Comprador Interesado */}
          <div style={{ border: "1.5px solid #bae6fd", background: "#f0f9ff", borderRadius: 10, padding: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, color: "#0369a1", fontSize: "0.95rem" }}>
                <span>🌐</span> Para Comprador Interesado
              </div>
              <span style={{ fontSize: "0.7rem", background: "#0284c7", color: "white", padding: "2px 8px", borderRadius: 12, fontWeight: 700, textTransform: "uppercase" }}>Público</span>
            </div>
            <p style={{ fontSize: "0.8rem", color: "#475569", margin: "0 0 0.75rem" }}>
              Ficha comercial pública con fotos, mapa, amenidades y clima. <strong>Seguro para compartir:</strong> no expone datos de tasación interna ni edición.
            </p>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <input type="text" readOnly value={webCompradorUrl} style={{ flex: 1, fontSize: "0.8rem", padding: "6px 10px", background: "white", border: "1px solid #cbd5e1", borderRadius: 6, color: "#334155", fontFamily: "monospace" }} />
            </div>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => handleCopiar("buyer", webCompradorUrl)}
                style={{ flex: 1, background: copiadoId === "buyer" ? "#10b981" : "white", border: "1px solid #0284c7", color: copiadoId === "buyer" ? "#fff" : "#0284c7", fontWeight: 600, borderRadius: 6, padding: "8px 0", cursor: "pointer" }}
              >
                {copiadoId === "buyer" ? "✓ ¡Copiado!" : "📋 Copiar Enlace"}
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`¡Hola! Te comparto la información y fotos de esta parcela en ${comuna}:\n${webCompradorUrl}`)}`}
                target="_blank"
                rel="noreferrer"
                style={{ flex: 1, background: "#25D366", border: "none", color: "white", fontWeight: 600, borderRadius: 6, padding: "8px 0", textAlign: "center", textDecoration: "none" }}
              >
                💬 WhatsApp Comprador
              </a>
              <a href={webCompradorUrl} target="_blank" rel="noreferrer" style={{ background: "white", border: "1px solid #cbd5e1", color: "#475569", borderRadius: 6, padding: "8px 10px", textDecoration: "none" }} title="Ver ficha en nueva pestaña">
                👁️
              </a>
            </div>
          </div>

          {/* Tarjeta 2: Propietario */}
          <div style={{ border: "1.5px solid #a7f3d0", background: "#ecfdf5", borderRadius: 10, padding: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, color: "#047857", fontSize: "0.95rem" }}>
                <span>👤</span> Para el Propietario (Completar Ficha)
              </div>
              <span style={{ fontSize: "0.7rem", background: "#059669", color: "white", padding: "2px 8px", borderRadius: 12, fontWeight: 700, textTransform: "uppercase" }}>Acceso Privado · 30 días</span>
            </div>
            <p style={{ fontSize: "0.8rem", color: "#475569", margin: "0 0 0.75rem" }}>
              Permite al dueño ingresar directamente sin contraseña para verificar rol, agua, luz y completar datos para calcular su tasación TPL.
            </p>
            <div style={{ marginBottom: "0.75rem" }}>
              <div style={{ fontSize: "0.75rem", color: errorToken ? "#ef4444" : "#047857", marginBottom: 4, fontWeight: 600 }}>
                {errorToken ? `⚠️ Error al generar enlace seguro: ${errorToken}` : baseUrlProp ? `✓ Enlace seguro activo · Vence el ${fechaVence}` : "⏳ Conectando enlace seguro..."}
              </div>
              <input type="text" readOnly value={errorToken ? "No disponible" : baseUrlProp || "Generando enlace seguro..."} style={{ width: "100%", boxSizing: "border-box", fontSize: "0.8rem", padding: "6px 10px", background: "white", border: "1px solid #cbd5e1", borderRadius: 6, color: baseUrlProp ? "#047857" : "#64748b", fontFamily: "monospace" }} />
            </div>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button
                type="button"
                disabled={!baseUrlProp}
                onClick={() => baseUrlProp && handleCopiar("owner", baseUrlProp)}
                style={{ flex: 1, background: copiadoId === "owner" ? "#10b981" : "white", border: "1px solid #059669", color: copiadoId === "owner" ? "#fff" : "#059669", fontWeight: 600, borderRadius: 6, padding: "8px 0", cursor: baseUrlProp ? "pointer" : "not-allowed", opacity: baseUrlProp ? 1 : 0.5 }}
              >
                {copiadoId === "owner" ? "✓ ¡Copiado!" : "📋 Copiar Acceso Propietario"}
              </button>
              {baseUrlProp ? (
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`¡Hola! Te comparto tu acceso privado para revisar y completar los antecedentes de tu parcela en ${comuna}:\n${baseUrlProp}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ flex: 1, background: "#25D366", border: "none", color: "white", fontWeight: 600, borderRadius: 6, padding: "8px 0", textAlign: "center", textDecoration: "none" }}
                >
                  💬 WhatsApp al Dueño
                </a>
              ) : (
                <span style={{ flex: 1, background: "#25D366", opacity: 0.5, color: "white", fontWeight: 600, borderRadius: 6, padding: "8px 0", textAlign: "center" }}>💬 WhatsApp al Dueño</span>
              )}
              {baseUrlProp ? (
                <a href={baseUrlProp} target="_blank" rel="noreferrer" style={{ background: "white", border: "1px solid #cbd5e1", color: "#475569", borderRadius: 6, padding: "8px 10px", textDecoration: "none" }} title="Probar portal en nueva pestaña">
                  👁️
                </a>
              ) : (
                <span style={{ background: "white", border: "1px solid #cbd5e1", color: "#475569", borderRadius: 6, padding: "8px 10px", opacity: 0.5 }}>👁️</span>
              )}
            </div>
          </div>

          {/* Tarjeta 3: Informe de Valoración */}
          <div style={{ border: "1.5px solid #ddd6fe", background: "#f5f3ff", borderRadius: 10, padding: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, color: "#6d28d9", fontSize: "0.95rem" }}>
                <span>📊</span> Informe de Valoración para Propietario
              </div>
              <span style={{ fontSize: "0.7rem", background: "#7c3aed", color: "white", padding: "2px 8px", borderRadius: 12, fontWeight: 700, textTransform: "uppercase" }}>Tasación</span>
            </div>
            <p style={{ fontSize: "0.8rem", color: "#475569", margin: "0 0 0.75rem" }}>
              Muestra el informe oficial con desglose técnico, precio de equilibrio de mercado y comparables. Comparte el mismo token seguro sin revocar accesos.
            </p>
            <div style={{ marginBottom: "0.75rem" }}>
              <input type="text" readOnly value={errorToken ? "No disponible" : baseUrlReport || "Generando enlace seguro..."} style={{ width: "100%", boxSizing: "border-box", fontSize: "0.8rem", padding: "6px 10px", background: "white", border: "1px solid #cbd5e1", borderRadius: 6, color: baseUrlReport ? "#6d28d9" : "#64748b", fontFamily: "monospace" }} />
            </div>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button
                type="button"
                disabled={!baseUrlReport}
                onClick={() => baseUrlReport && handleCopiar("report", baseUrlReport)}
                style={{ flex: 1, background: copiadoId === "report" ? "#10b981" : "white", border: "1px solid #7c3aed", color: copiadoId === "report" ? "#fff" : "#7c3aed", fontWeight: 600, borderRadius: 6, padding: "8px 0", cursor: baseUrlReport ? "pointer" : "not-allowed", opacity: baseUrlReport ? 1 : 0.5 }}
              >
                {copiadoId === "report" ? "✓ ¡Copiado!" : "📋 Copiar Informe"}
              </button>
              {baseUrlReport ? (
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`¡Hola! Aquí tienes el Informe de Valoración TPL de tu propiedad en ${comuna}:\n${baseUrlReport}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ flex: 1, background: "#25D366", border: "none", color: "white", fontWeight: 600, borderRadius: 6, padding: "8px 0", textAlign: "center", textDecoration: "none" }}
                >
                  💬 WhatsApp Informe
                </a>
              ) : (
                <span style={{ flex: 1, background: "#25D366", opacity: 0.5, color: "white", fontWeight: 600, borderRadius: 6, padding: "8px 0", textAlign: "center" }}>💬 WhatsApp Informe</span>
              )}
              {baseUrlReport ? (
                <a href={baseUrlReport} target="_blank" rel="noreferrer" style={{ background: "white", border: "1px solid #cbd5e1", color: "#475569", borderRadius: 6, padding: "8px 10px", textDecoration: "none" }} title="Ver informe en nueva pestaña">
                  👁️
                </a>
              ) : (
                <span style={{ background: "white", border: "1px solid #cbd5e1", color: "#475569", borderRadius: 6, padding: "8px 10px", opacity: 0.5 }}>👁️</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
