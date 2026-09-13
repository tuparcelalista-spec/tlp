"use client";

import { useMemo, useState, useTransition } from "react";
import type { ParcelaResumen } from "../../lib/parcelas/data";
import { calcularCompletionScore, calcularExpiracion, filtrarParcelas, regionesDisponibles, comunasDisponibles } from "../../lib/parcelas/data";
import { eliminarParcelaAction, archivarComoEliminadaAction, sincronizarTasacionesAction } from "../../lib/parcelas/actions";
import { formatCLP } from "../../lib/utils/format";
import { urlFichaPublica, urlTplStudio } from "../../lib/legacySite";
import { ParcelaEditorModal } from "./ParcelaEditorModal";
import { ShareParcelaModal } from "./ShareParcelaModal";
import { HerramientasModal } from "../tasaciones/HerramientasModal";

interface Toast {
  id: number;
  type: "success" | "error";
  message: string;
}

function numero(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Puerto a React de `render()`/`init()` en `modules/parcelas/index.js`. El
 * filtro "ocultar parcelas de corredores" del original (que leía
 * `state.snapshot?.actores`, del snapshot COMPLETO) se deja fuera de este
 * piloto — ver el comentario en `lib/parcelas/data.ts` sobre por qué el
 * listado usa la vista ligera `crm_parcelas_resumen` en vez del snapshot.
 */
export function ParcelasGrid({ initialParcelas }: { initialParcelas: ParcelaResumen[] }) {
  const [parcelas, setParcelas] = useState(initialParcelas);
  const [queryDraft, setQueryDraft] = useState("");
  const [regionDraft, setRegionDraft] = useState("");
  const [comunaDraft, setComunaDraft] = useState("");
  const [filtros, setFiltros] = useState({ query: "", region: "", comuna: "" });
  const [editorParcelaId, setEditorParcelaId] = useState<string | null>(null);
  const [shareParcela, setShareParcela] = useState<ParcelaResumen | null>(null);
  const [herramientasParcela, setHerramientasParcela] = useState<ParcelaResumen | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [sincronizando, setSincronizando] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [, startTransition] = useTransition();

  function pushToast(type: Toast["type"], message: string) {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }

  const regiones = useMemo(() => regionesDisponibles(parcelas), [parcelas]);
  const comunas = useMemo(() => comunasDisponibles(parcelas), [parcelas]);
  const filtradas = useMemo(() => filtrarParcelas(parcelas, filtros), [parcelas, filtros]);

  function aplicarFiltros() {
    setFiltros({ query: queryDraft, region: regionDraft, comuna: comunaDraft });
  }

  async function handleEliminar(p: ParcelaResumen) {
    if (!confirm("¿Seguro que deseas eliminar esta parcela de forma permanente? Esta acción no se puede deshacer.")) return;
    setPendingId(p.id);
    const primero = await eliminarParcelaAction(p.id);
    if (primero.ok) {
      setParcelas((prev) => prev.filter((x) => x.id !== p.id));
      pushToast("success", "Parcela eliminada correctamente.");
      setPendingId(null);
      return;
    }
    if (primero.requiereConfirmacionPapelera) {
      const quiere = confirm("No se puede borrar definitivamente porque tiene historial (cotizaciones o tasaciones) asociadas en la base de datos.\n\n¿Deseas MOVERLA A LA PAPELERA (estado: \"eliminada\") en su lugar para ocultarla?");
      if (quiere) {
        const segundo = await archivarComoEliminadaAction(p.id);
        if (segundo.ok) {
          setParcelas((prev) => prev.filter((x) => x.id !== p.id));
          pushToast("success", "Parcela archivada en papelera exitosamente.");
        } else {
          pushToast("error", "Ocurrió un error al intentar eliminar la parcela: " + segundo.motivo);
        }
      }
      setPendingId(null);
      return;
    }
    pushToast("error", "Ocurrió un error al intentar eliminar la parcela: " + primero.motivo);
    setPendingId(null);
  }

  function handleHerramientas(p: ParcelaResumen) {
    // Puerto de `openPremiumReport(id, {record})` en `modules/parcelas/index.js`
    // (botón "Herramientas" de cada tarjeta) — ahora que el módulo de
    // Tasaciones existe, `HerramientasModal` es el puerto de
    // `modules/tasaciones/premium-report.js`.
    setHerramientasParcela(p);
  }

  function handleSincronizar() {
    if (!confirm("¿Seguro que deseas recalcular la tasación de TODAS las parcelas? Esto tomará unos segundos.")) return;
    setSincronizando(true);
    startTransition(async () => {
      const resultado = await sincronizarTasacionesAction();
      setSincronizando(false);
      if (!resultado.ok) alert(resultado.motivo);
    });
  }

  if (editorParcelaId) {
    return (
      <ParcelaEditorModal
        parcelaId={editorParcelaId}
        onClose={() => setEditorParcelaId(null)}
        onCompartir={(p) => setShareParcela(p)}
        onGuardado={() => pushToast("success", "Propiedad guardada correctamente")}
      />
    );
  }

  return (
    <div className="parcelas-view">
      <div className="parcelas-header-bar">
        <h1>Inventario Resumido</h1>
        <div className="parcelas-search-group">
          <input
            type="text"
            value={queryDraft}
            onChange={(e) => setQueryDraft(e.target.value)}
            placeholder="Buscar código o título..."
            className="parcelas-search-input"
          />
          <select value={regionDraft} onChange={(e) => setRegionDraft(e.target.value)} className="parcelas-search-input" style={{ width: "auto" }}>
            <option value="">Todas las Regiones</option>
            {regiones.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select value={comunaDraft} onChange={(e) => setComunaDraft(e.target.value)} className="parcelas-search-input" style={{ width: "auto" }}>
            <option value="">Todas las Comunas</option>
            {comunas.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button type="button" className="parcelas-search-btn" onClick={aplicarFiltros}>
            Filtrar
          </button>
          <button type="button" className="parcelas-search-btn" style={{ background: "var(--c-primary)", marginLeft: "auto" }} onClick={handleSincronizar} disabled={sincronizando}>
            {sincronizando ? "⏳ Sincronizando..." : "⚡ Sincronizar Tasaciones"}
          </button>
        </div>
      </div>

      {filtradas.length > 0 ? (
        <div className="parcelas-grid">
          {filtradas.map((p) => (
            <ParcelaCard
              key={p.id}
              p={p}
              pending={pendingId === p.id}
              onEditar={() => setEditorParcelaId(p.id)}
              onHerramientas={() => handleHerramientas(p)}
              onCompartir={() => setShareParcela(p)}
              onEliminar={() => handleEliminar(p)}
            />
          ))}
        </div>
      ) : (
        <div className="parcelas-empty-state">
          <p>No se encontraron parcelas.</p>
        </div>
      )}

      {shareParcela ? <ShareParcelaModal parcela={shareParcela} onClose={() => setShareParcela(null)} /> : null}

      {herramientasParcela ? (
        <HerramientasModal
          parcela={herramientasParcela}
          onClose={() => setHerramientasParcela(null)}
          onAbrirTasador={(id) => {
            setHerramientasParcela(null);
            setEditorParcelaId(id);
          }}
        />
      ) : null}

      <div style={{ position: "fixed", bottom: 16, right: 16, display: "flex", flexDirection: "column", gap: 8, zIndex: 300 }}>
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
              maxWidth: 360,
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}

function ParcelaCard({
  p,
  pending,
  onEditar,
  onHerramientas,
  onCompartir,
  onEliminar,
}: {
  p: ParcelaResumen;
  pending: boolean;
  onEditar: () => void;
  onHerramientas: () => void;
  onCompartir: () => void;
  onEliminar: () => void;
}) {
  const { score, color } = calcularCompletionScore(p);
  const expInfo = calcularExpiracion(p.expiracion_plan);

  const tasadorValue = numero(p.valor_tpl_tasador) || numero(p.valor_tpl_tasador_ajustado) || 0;
  const comunalValue = numero(p.valor_comunal) || numero(p.valor_tpl_promedio_comunal) || 0;
  const recValue = numero(p.valor_tpl_recomendado) || numero(p.valor_tpl) || 0;
  const apuroValue = numero(p.valor_venta_apuro) || 0;

  const tasadorStr = tasadorValue > 0 ? formatCLP(tasadorValue) : "En análisis";
  const comunalStr = comunalValue > 0 ? formatCLP(comunalValue) : "Sin datos";
  const recStr = recValue > 0 ? formatCLP(recValue) : "No calculado";
  const apuroStr = apuroValue > 0 ? formatCLP(apuroValue) : "—";

  const totalFotos = numero(p.total_fotos);
  const foto = p.foto_principal || "https://via.placeholder.com/400x300?text=Sin+Foto";

  return (
    <div className="parcela-card">
      <div className="parcela-card__image-wrap">
        {/* eslint-disable-next-line @next/next/no-img-element -- fotos vienen de Supabase Storage, dominio variable */}
        <img src={foto} alt={p.titulo || ""} className="parcela-card__image" />
        <div className="parcela-card__badges">
          <span className="parcela-badge">{p.estado || "Desconocido"}</span>
          <span className="parcela-badge parcela-badge--primary">{p.dias_publicada || 0} días</span>
          <span className="parcela-badge" style={{ background: `${color}22`, color, border: `1px solid ${color}55` }}>
            Info: {score}%
          </span>
        </div>
      </div>

      <div className="parcela-card__body">
        <div>
          <div className="parcela-card__meta-row">
            <span className="parcela-meta-tag parcela-meta-tag--mono">{p.codigo || "S/N"}</span>
            <span className="parcela-meta-tag">{p.superficie_m2 || "0"} m²</span>
          </div>
          <h3 className="parcela-card__title" title={p.titulo || ""}>
            {p.titulo || "Sin título"}
          </h3>
          <p className="parcela-card__location">📍 {p.comuna || "Sin comuna"}</p>
        </div>

        <div className="parcela-fin-block">
          <div className="parcela-fin-row">
            <span className="parcela-fin-label">Precio Publicado</span>
            <span className="parcela-fin-value parcela-fin-value--primary">{formatCLP(p.precio_publicado || 0)}</span>
          </div>
          <div className="parcela-fin-row" style={{ marginTop: 4 }}>
            <span className="parcela-fin-label">Tasador Técnico</span>
            <span className="parcela-fin-value">{tasadorStr}</span>
          </div>
          <div className="parcela-fin-row">
            <span className="parcela-fin-label">Promedio Comunal</span>
            <span className="parcela-fin-value">{comunalStr}</span>
          </div>
          <div className="parcela-fin-row parcela-fin-row--divider">
            <span className="parcela-fin-label" style={{ color: "#2a9d8f" }}>
              Recomendado
            </span>
            <span className="parcela-fin-value" style={{ color: "#2a9d8f" }}>
              {recStr}
            </span>
          </div>
          <div className="parcela-fin-row">
            <span className="parcela-fin-label" style={{ color: "#e63946" }}>
              Venta Apuro
            </span>
            <span className="parcela-fin-value" style={{ color: "#e63946" }}>
              {apuroStr}
            </span>
          </div>
        </div>

        <div className="parcela-commercial-info">
          <div className="parcela-plan-name">💎 {p.plan_nombre || "Sin Plan"}</div>
          <div className={`parcela-${expInfo.colorClass}`}>{expInfo.text}</div>
          {totalFotos < 5 ? <div className="parcela-alert-box">⚠️ Faltan fotos ({totalFotos}/5)</div> : null}
        </div>

        <div className="parcela-card__actions">
          <button type="button" className="parcela-btn-action parcela-btn-action--edit" onClick={onEditar} disabled={pending}>
            Editar
          </button>
          <button type="button" className="parcela-btn-action parcela-btn-action--tools" onClick={onHerramientas} disabled={pending}>
            Herramientas
          </button>
          <a href={urlFichaPublica(p.id)} target="_blank" rel="noreferrer" className="parcela-btn-action parcela-btn-action--view">
            Ver Web
          </a>
          <button type="button" className="parcela-btn-action parcela-btn-action--share" onClick={onCompartir} title="Compartir Enlaces Comprador / Propietario" disabled={pending}>
            🔗 Compartir
          </button>
          <a href={urlTplStudio(p.id)} target="_blank" rel="noreferrer" className="parcela-btn-action parcela-btn-action--studio parcela-btn-action--full">
            🎬 TPL Studio &amp; Video Veo
          </a>
          <button type="button" className="parcela-btn-action parcela-btn-action--delete parcela-btn-action--full" onClick={onEliminar} disabled={pending}>
            {pending ? "Borrando..." : "🗑️ Eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}
