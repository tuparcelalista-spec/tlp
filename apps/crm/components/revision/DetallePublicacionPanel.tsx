"use client";

import { useState } from "react";
import type { DetallePublicacion } from "../../lib/revision/data";
import { camposFaltantes, montoOGuion } from "../../lib/revision/data";
import type { DecisionRevisionResult } from "../../lib/revision/actions";

function Dato({ etiqueta, valor }: { etiqueta: string; valor: unknown }) {
  const texto = valor === null || valor === undefined || valor === "" ? "—" : String(valor);
  return (
    <div className="rev-dato">
      <span>{etiqueta}</span>
      <strong>{texto}</strong>
    </div>
  );
}

function parseObjeto(v: unknown): Record<string, unknown> {
  if (!v) return {};
  if (typeof v === "string") {
    try {
      return JSON.parse(v) || {};
    } catch {
      return {};
    }
  }
  if (typeof v === "object") return v as Record<string, unknown>;
  return {};
}

/**
 * Puerto 1:1 de `pintarDetalle()` + `conectarDecision()` en
 * `modules/revision/index.js` — misma ficha (esencial / antecedentes del
 * terreno / vivienda declarada si corresponde / descripción / fotos /
 * contacto) y misma decisión (motivo obligatorio solo al rechazar, aviso de
 * que se envía un correo automático).
 */
export function DetallePublicacionPanel({
  detalle,
  onCerrar,
  onDecidir,
}: {
  detalle: DetallePublicacion;
  onCerrar: () => void;
  onDecidir: (decision: "aprobar" | "rechazar", motivo: string) => Promise<DecisionRevisionResult>;
}) {
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [estado, setEstado] = useState<{ texto: string; ok: boolean } | null>(null);

  const p = detalle.propiedad;
  const pub = detalle.publicacion;
  const meta = parseObjeto(p.metadata);
  const casa = parseObjeto(p.casa_datos);
  const t = detalle.tasacion || {};
  const fotos = detalle.fotos || [];
  const naturales = Array.isArray(p.atributos_naturales) ? p.atributos_naturales : [];
  const faltantes = camposFaltantes(p, fotos);
  const superficieConstruida = Number(casa.superficieConstruida) || 0;

  async function decidir(decision: "aprobar" | "rechazar") {
    const motivoTrim = motivo.trim();
    if (decision === "rechazar" && !motivoTrim) {
      setEstado({ texto: "Escribe el motivo del rechazo: es lo que le vamos a explicar a la persona.", ok: false });
      return;
    }

    setEnviando(true);
    setEstado(null);
    const res = await onDecidir(decision, motivoTrim);
    setEnviando(false);
    if (!res.ok) {
      setEstado({ texto: res.motivo, ok: false });
    }
    // Si res.ok === true, el padre cierra el panel y muestra el toast — no hay nada más que pintar aquí.
  }

  return (
    <div className="rev-panel">
      <div className="rev-panel__head">
        <div>
          <span className="rev-kicker">
            {pub.codigo || ""} · {p.tipo || ""}
          </span>
          <h2>{p.titulo || "Sin título"}</h2>
          <p className="rev-sub">{[p.comuna, p.region].filter(Boolean).join(", ") || "Sin ubicación"}</p>
        </div>
        <button type="button" className="rev-btn-cerrar" onClick={onCerrar}>
          Cerrar
        </button>
      </div>

      {faltantes.length ? (
        <div className="rev-seccion rev-seccion--alerta">
          <h3>
            ⚠️ Faltan {faltantes.length} {faltantes.length === 1 ? "campo" : "campos"} por completar
          </h3>
          <p className="rev-alerta">Esta publicación llegó sin estos datos que el sistema muestra automáticamente en el resto de las parcelas. Revísalos antes de aprobar; si hace falta, complétalos a mano en el editor de la parcela.</p>
          <ul className="rev-faltantes">
            {faltantes.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="rev-seccion">
        <h3>Lo esencial</h3>
        <div className="rev-datos">
          <Dato etiqueta="Superficie" valor={p.superficie_m2 ? `${Number(p.superficie_m2).toLocaleString("es-CL")} m²` : null} />
          <Dato etiqueta="Precio pedido" valor={montoOGuion(p.precio_publicado)} />
          <Dato etiqueta="Valor TPL" valor={t.valor_tpl_total ? montoOGuion(t.valor_tpl_total) : "Sin tasación"} />
          <Dato etiqueta="$/m² pedido" valor={p.precio_publicado && p.superficie_m2 ? montoOGuion(Math.round(Number(p.precio_publicado) / Number(p.superficie_m2))) : null} />
          <Dato etiqueta="Sector" valor={p.sector} />
          <Dato etiqueta="Coordenadas" valor={p.lat && p.lng ? `${p.lat}, ${p.lng}` : "Sin marcar"} />
        </div>
      </div>

      <div className="rev-seccion">
        <h3>Antecedentes del terreno</h3>
        <div className="rev-datos">
          <Dato etiqueta="Rol" valor={p.rol_situacion} />
          <Dato etiqueta="Agua" valor={p.agua} />
          <Dato etiqueta="Electricidad" valor={p.electricidad} />
          <Dato etiqueta="Acceso" valor={p.acceso} />
          <Dato etiqueta="Topografía" valor={p.topografia} />
          <Dato etiqueta="Suelo" valor={p.suelo} />
          <Dato etiqueta="Cierre perimetral" valor={p.cierre_perimetral} />
          <Dato etiqueta="Portón" valor={p.porton} />
          <Dato etiqueta="Atributos naturales" valor={naturales.length ? naturales.join(", ") : null} />
        </div>
      </div>

      {superficieConstruida > 0 ? (
        <div className="rev-seccion">
          <h3>Vivienda declarada</h3>
          <div className="rev-datos">
            <Dato etiqueta="Superficie construida" valor={`${superficieConstruida} m²`} />
            <Dato etiqueta="Materialidad" valor={casa.materialidad} />
            <Dato etiqueta="Antigüedad" valor={casa.antiguedadAnios != null ? `${casa.antiguedadAnios} años` : null} />
            <Dato etiqueta="Recepción municipal" valor={casa.regularizada} />
            <Dato etiqueta="Piscina" valor={casa.piscina === "si" ? `${casa.piscinaM2 || "?"} m² de ${casa.piscinaMaterial || "material sin declarar"}` : "No"} />
            <Dato etiqueta="Quincho" valor={casa.quincho === "si" ? `${casa.quinchoM2 || "?"} m²` : "No"} />
            <Dato etiqueta="Cabaña" valor={casa.cabana === "si" ? `${casa.cabanaM2 || "?"} m²` : "No"} />
            <Dato etiqueta="Riego automático" valor={casa.riego === "si" ? "Sí" : "No"} />
          </div>
        </div>
      ) : null}

      <div className="rev-seccion">
        <h3>Descripción</h3>
        <p className="rev-descripcion">{p.descripcion || "Sin descripción."}</p>
      </div>

      <div className="rev-seccion">
        <h3>
          Fotos <span className="rev-cuenta">{fotos.length}</span>
        </h3>
        {fotos.length ? (
          <div className="rev-fotos-grid">
            {fotos.map((f) => {
              const nombreMeta = (f.metadata as { nombre_original?: string } | null) || {};
              const nombre = nombreMeta.nombre_original || f.storage_path || "Foto";
              return f.url ? (
                <a key={f.id} className="rev-fotos-item" href={f.url} target="_blank" rel="noopener noreferrer" title={nombre}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.url} alt={nombre} loading="lazy" />
                </a>
              ) : (
                <div key={f.id} className="rev-fotos-item rev-fotos-item--rota" title={nombre}>
                  <span>Sin URL</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="rev-alerta">Esta publicación no trae fotos. Sin imágenes casi no recibe consultas.</p>
        )}
      </div>

      <div className="rev-seccion">
        <h3>Contacto</h3>
        <div className="rev-datos">
          <Dato etiqueta="Nombre" valor={meta.contacto_nombre} />
          <Dato etiqueta="Correo" valor={meta.contacto_email} />
          <Dato etiqueta="Teléfono" valor={meta.contacto_telefono} />
        </div>
        {!meta.contacto_email ? <p className="rev-alerta">Sin correo registrado: no podremos avisarle la decisión.</p> : null}
      </div>

      <div className="rev-decision">
        <label htmlFor="rev-motivo">Motivo (obligatorio si rechazas, opcional si apruebas)</label>
        <textarea
          id="rev-motivo"
          rows={3}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ej: Faltan fotos del acceso y el precio está muy sobre la tasación de la zona."
        />
        {estado ? <p className={`rev-estado${estado.ok ? " rev-estado--ok" : ""}`}>{estado.texto}</p> : null}
        <div className="rev-botones">
          <button type="button" className="rev-btn-rechazar" disabled={enviando} onClick={() => decidir("rechazar")}>
            Rechazar
          </button>
          <button type="button" className="rev-btn-aprobar" disabled={enviando} onClick={() => decidir("aprobar")}>
            Aprobar y publicar
          </button>
        </div>
        <p className="rev-nota">Al decidir se envía un correo automático a {(meta.contacto_email as string) || "quien publicó"}. Si apruebas, se le invita a crear su acceso a TPL Business.</p>
      </div>
    </div>
  );
}
