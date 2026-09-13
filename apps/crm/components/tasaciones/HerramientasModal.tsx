"use client";

import { useEffect, useRef, useState } from "react";
import type { ParcelaResumen } from "../../lib/parcelas/data";
import { generarLinkPropietarioAction } from "../../lib/parcelas/actions";
import { generarAnalisisIaAction, obtenerAnalisisIaExistenteAction } from "../../lib/tasaciones/actions";
import { urlInformeValores, urlInformeConToken } from "../../lib/legacySite";
import { formatCLP } from "../../lib/utils/format";
import { Modal } from "../ui/Modal";

function numero(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function fmt(a: unknown, b?: unknown): string {
  const v = numero(a) || numero(b);
  return v > 0 ? formatCLP(v) : "—";
}

interface ShareUrl {
  url: string;
  expiresAt: string | null;
}

/**
 * Puerto de `openPremiumReport()`/`toolsDialogHtml()` en
 * `modules/tasaciones/premium-report.js`. Se invoca desde el botón
 * "Herramientas" de `ParcelasGrid` — antes diferido con un `alert()` mientras
 * este módulo (Tasaciones) no existía; ver el comentario que reemplaza en
 * `ParcelasGrid.tsx`.
 *
 * El enlace del propietario se genera una sola vez por apertura del modal
 * (mismo `sharePromise` cacheado del original vía `useRef`): pedir uno nuevo
 * por cada botón ("Link" y luego "WhatsApp") invalidaría el ya copiado,
 * porque `tpl_crm_generar_link_propietario_v1` revoca el token anterior de la
 * parcela cada vez que se llama.
 */
export function HerramientasModal({ parcela, onClose, onAbrirTasador }: { parcela: ParcelaResumen; onClose: () => void; onAbrirTasador: (id: string) => void }) {
  const [analisisIa, setAnalisisIa] = useState<string | null>(null);
  const [comparablesUsados, setComparablesUsados] = useState<number | null>(null);
  const [generandoIa, setGenerandoIa] = useState(false);
  const [busyReport, setBusyReport] = useState<"copy" | "whatsapp" | null>(null);
  const shareRef = useRef<Promise<ShareUrl> | null>(null);

  useEffect(() => {
    let activo = true;
    obtenerAnalisisIaExistenteAction(parcela.id).then((valor) => {
      if (activo) setAnalisisIa(valor);
    });
    return () => {
      activo = false;
    };
  }, [parcela.id]);

  function getShareUrl(): Promise<ShareUrl> {
    if (!shareRef.current) {
      shareRef.current = generarLinkPropietarioAction(parcela.id)
        .then((res) => {
          if (!res.ok) throw new Error(res.motivo);
          return { url: urlInformeConToken(res.token), expiresAt: res.expiresAt };
        })
        .catch((err) => {
          shareRef.current = null;
          throw err;
        });
    }
    return shareRef.current;
  }

  function expiryLabel(expiresAt: string | null) {
    if (!expiresAt) return "";
    const fecha = new Date(expiresAt).toLocaleDateString("es-CL", { day: "numeric", month: "long" });
    return ` Vence el ${fecha}.`;
  }

  async function handleCopyLink() {
    setBusyReport("copy");
    try {
      const { url, expiresAt } = await getShareUrl();
      await navigator.clipboard.writeText(url);
      alert(`Link público copiado.${expiryLabel(expiresAt)}`);
    } catch (err) {
      alert(`No se pudo generar el link: ${err instanceof Error ? err.message : err}`);
    } finally {
      setBusyReport(null);
    }
  }

  async function handleWhatsapp() {
    setBusyReport("whatsapp");
    try {
      const { url } = await getShareUrl();
      const msg = `¡Hola! Aquí tienes el Informe Premium de tu propiedad: ${url}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
    } catch (err) {
      alert(`No se pudo generar el link: ${err instanceof Error ? err.message : err}`);
    } finally {
      setBusyReport(null);
    }
  }

  function handleComparables() {
    // "Buscador de Comparables" vive en el grupo "Mercado" del sidebar sin
    // `href` — todavía no se migra a Next.js. Mensaje honesto en vez de un
    // enlace roto o un `window.location.hash` que no lleva a ningún lado.
    alert("El Buscador de Comparables todavía no se migró a Next.js. Es el siguiente módulo del grupo \"Mercado\" en la hoja de ruta.");
  }

  async function handleGenerarIa() {
    setGenerandoIa(true);
    try {
      const res = await generarAnalisisIaAction(parcela.id);
      if (res.ok) {
        setAnalisisIa(res.analisis);
        setComparablesUsados(res.comparablesUsados);
      } else {
        alert(res.motivo);
      }
    } finally {
      setGenerandoIa(false);
    }
  }

  const vTecnico = fmt(parcela.valor_tpl_tasador, parcela.valor_tpl_tasador_ajustado);
  const vComunal = fmt(parcela.valor_comunal, parcela.valor_tpl_promedio_comunal);
  const vRecomendado = fmt(parcela.valor_tpl_recomendado, parcela.valor_tpl);
  const vApuro = fmt(parcela.valor_venta_apuro);

  return (
    <Modal title="Herramientas TPL" onClose={onClose}>
      <div className="herr-head">
        <div className="herr-emoji">💎</div>
        <small className="herr-kicker">HERRAMIENTAS DE PROPIEDAD</small>
        <h2 className="herr-title">{parcela.titulo || "Parcela"}</h2>
        <p className="herr-subtitle">{[parcela.codigo, parcela.comuna].filter(Boolean).join(" · ")}</p>

        <div className="herr-valores-grid">
          <div className="herr-valor">
            <small>Técnico</small>
            <strong style={{ color: "#0284c7" }}>{vTecnico}</strong>
          </div>
          <div className="herr-valor">
            <small>Comunal</small>
            <strong style={{ color: "#f59e0b" }}>{vComunal}</strong>
          </div>
          <div className="herr-valor">
            <small>Recomendado</small>
            <strong style={{ color: "#10b981" }}>{vRecomendado}</strong>
          </div>
          <div className="herr-valor">
            <small>Apuro</small>
            <strong style={{ color: "#ef4444" }}>{vApuro}</strong>
          </div>
        </div>
      </div>

      <div className="herr-tools-grid">
        <div className="herr-tool-card">
          <h3>📑 Informe TPL Premium</h3>
          <p>
            <strong>Abrir Web</strong> muestra la versión interna (solo asesores). <strong>Link</strong> y <strong>WhatsApp</strong> generan un enlace público que se abre sin
            contraseña y vence en 30 días.
          </p>
          <div className="herr-tool-actions">
            <a href={urlInformeValores(parcela.id)} target="_blank" rel="noreferrer" className="ei-btn ei-btn-secondary herr-btn-sm">
              Abrir Web
            </a>
            <button type="button" className="ei-btn ei-btn-secondary herr-btn-sm" onClick={handleCopyLink} disabled={busyReport === "copy"}>
              {busyReport === "copy" ? "⏳ Generando…" : "📋 Link"}
            </button>
            <button type="button" className="ei-btn ei-btn-secondary herr-btn-sm herr-btn-whatsapp" onClick={handleWhatsapp} disabled={busyReport === "whatsapp"}>
              {busyReport === "whatsapp" ? "⏳ Generando…" : "💬 WhatsApp"}
            </button>
          </div>
        </div>

        <div className="herr-tool-card herr-tool-card--tasador">
          <h3>⚖️ Tasador TPL</h3>
          <p>Calcula el valor técnico y los atributos que justifican el precio recomendado.</p>
          <button type="button" className="ei-btn ei-btn-primary herr-btn-full" onClick={() => onAbrirTasador(parcela.id)}>
            Ir al Tasador Técnico
          </button>
        </div>

        <div className="herr-tool-card">
          <h3>📊 Comparables de Mercado</h3>
          <p>Busca parcelas similares en el mercado para ajustar el precio de publicación.</p>
          <button type="button" className="ei-btn ei-btn-secondary herr-btn-full" onClick={handleComparables}>
            Ir al Buscador de Comparables
          </button>
        </div>

        <div className="herr-tool-card herr-tool-card--ia">
          <h3>🤖 Análisis de Mercado IA</h3>
          <p>Genera un resumen comercial usando Inteligencia Artificial cruzando la data con el Catastro.</p>
          {analisisIa ? (
            <div className="herr-ia-status">
              ✓ Análisis ya generado (puedes regenerarlo){comparablesUsados != null ? ` — ${comparablesUsados} comparables usados` : ""}
              <p className="herr-ia-texto">{analisisIa}</p>
            </div>
          ) : null}
          <button type="button" className="ei-btn ei-btn-primary herr-btn-full herr-btn-ia" onClick={handleGenerarIa} disabled={generandoIa}>
            {generandoIa ? "⏳ Analizando mercado..." : "✨ Generar con Google Gemini"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
