"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState, useTransition } from "react";
import type { ParcelaDetalle, ParcelaImagen, ParcelaResumen, ParcelaAnalyticsRow } from "../../lib/parcelas/data";
import { cargarParcelaParaEditorAction, cargarAnalyticsAction, recargarFotosAction, guardarParcelaAction, subirFotoAction, eliminarFotoAction, marcarPortadaAction, type GuardarParcelaInput } from "../../lib/parcelas/actions";
import { urlTplStudio, urlInformeValores } from "../../lib/legacySite";

type TabId = "ei-tab-comercial" | "ei-tab-tecnico" | "ei-tab-natural" | "ei-tab-ubicacion" | "ei-tab-owner" | "ei-tab-casa" | "ei-tab-analytics";

const TABS: { id: TabId; label: string }[] = [
  { id: "ei-tab-comercial", label: "Comercial" },
  { id: "ei-tab-tecnico", label: "Técnico" },
  { id: "ei-tab-natural", label: "Natural & Topografía" },
  { id: "ei-tab-ubicacion", label: "Ubicación" },
  { id: "ei-tab-owner", label: "Propietario" },
  { id: "ei-tab-casa", label: "Casa y extras" },
  { id: "ei-tab-analytics", label: "🕵️ Asesor Espía" },
];

function parseMetadata(metadata: unknown): Record<string, unknown> {
  if (!metadata) return {};
  if (typeof metadata === "string") {
    try {
      return JSON.parse(metadata) || {};
    } catch {
      return {};
    }
  }
  if (typeof metadata === "object") return metadata as Record<string, unknown>;
  return {};
}

function texto(v: unknown): string {
  return v === null || v === undefined ? "" : String(v);
}

const fmtMoney = (val: number) => (val > 0 ? new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(val) : "—");

interface FormState extends GuardarParcelaInput {}

function estadoInicial(record: ParcelaDetalle): FormState {
  const meta = parseMetadata(record.metadata);
  return {
    id: record.id,
    titulo: texto(record.titulo || record.nombre),
    estado: texto(record.estado || "borrador"),
    tipo: texto(record.tipo || "parcela"),
    descripcion: texto(record.descripcion),
    superficie_m2: texto(record.superficie_m2 ?? ""),
    precio_publicado: texto(record.precio_publicado ?? record.precio_base ?? ""),
    rol_situacion: texto(record.rol_situacion),
    region: texto(record.region),
    comuna: texto(record.comuna),
    sector: texto(record.sector),
    distancia_ruta_principal_km: texto(record.distancia_ruta_principal_km ?? ""),
    lat: texto(record.lat ?? ""),
    lng: texto(record.lng ?? ""),
    electricidad: texto(record.electricidad),
    agua: texto(record.agua),
    acceso: texto(record.acceso),
    topografia: texto(record.topografia),
    suelo: texto(record.suelo),
    cierre_perimetral: texto(record.cierre_perimetral),
    porton: texto(record.porton),
    atributos_naturales: Array.isArray(record.atributos_naturales) ? record.atributos_naturales.join(", ") : texto(record.atributos_naturales),
    corredor_asignado: texto(record.corredor_asignado || record.corredor),
    video_url: texto((meta.videoUrl as string) || (record as Record<string, unknown>).video || ""),
    imagenes: Array.isArray(meta.imagenes) ? (meta.imagenes as string[]).join("\n") : "",
    dueno_nombre: texto(meta.contacto_nombre || record.contacto_nombre || record.dueno_nombre),
    dueno_telefono: texto(meta.contacto_telefono || record.contacto_telefono || record.dueno_telefono),
    dueno_email: texto(meta.contacto_email || record.contacto_email || record.dueno_email),
    encargado_proyecto: texto(meta.encargado_proyecto || record.encargado_proyecto || record.encargado),
    mat_casa: texto(meta.materialidad || "estandar"),
    sup_casa: texto(meta.superficie_construida ?? ""),
    dorm_casa: texto(meta.dormitorios ?? ""),
    banos_casa: texto(meta.banos ?? ""),
    casa_reg: texto(meta.regularizada),
    casa_ant: texto(meta.antiguedad_anios ?? ""),
    extra_piscina: texto(meta.piscina),
    extra_piscmat: texto(meta.piscina_mat || "fibra"),
    extra_piscm2: texto(meta.piscina_m2 ?? ""),
    extra_quincho: texto(meta.quincho),
    extra_cabana: texto(meta.cabana),
    extra_riego: texto(meta.riego),
  };
}

/**
 * Puerto a React de `openIntegralEditor()`/`renderEditorHTML()`/
 * `attachEditorEvents()` en `modules/parcelas/editor-integral.js`. Carga la
 * fila completa + fotos vía Server Action (equivalente a los dos `client.from(...)`
 * del original), arma el mismo formulario multi-tab, y guarda con el mismo
 * payload — ver el comentario extenso en `guardarParcelaAction` sobre por
 * qué el recálculo de tasación con `window.TPLLandEngine` no se porta.
 */
export function ParcelaEditorModal({
  parcelaId,
  onClose,
  onCompartir,
  onGuardado,
}: {
  parcelaId: string;
  onClose: () => void;
  onCompartir: (parcela: ParcelaResumen) => void;
  onGuardado: () => void;
}) {
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [record, setRecord] = useState<ParcelaDetalle | null>(null);
  const [fotos, setFotos] = useState<ParcelaImagen[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("ei-tab-comercial");
  const [guardando, startGuardar] = useTransition();
  const [guardadoOk, setGuardadoOk] = useState(false);

  useEffect(() => {
    let cancelado = false;
    cargarParcelaParaEditorAction(parcelaId).then((res) => {
      if (cancelado) return;
      if (!res.ok) {
        setErrorCarga(res.motivo);
        setCargando(false);
        return;
      }
      setRecord(res.record);
      setFotos(res.fotos);
      setForm(estadoInicial(res.record));
      setCargando(false);
    });
    return () => {
      cancelado = true;
    };
  }, [parcelaId]);

  function actualizar<K extends keyof FormState>(campo: K, valor: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [campo]: valor } : prev));
  }

  async function handleGuardar() {
    if (!form) return;
    setGuardadoOk(false);
    startGuardar(async () => {
      const resultado = await guardarParcelaAction(form);
      if (resultado.ok) {
        setGuardadoOk(true);
        onGuardado();
        setTimeout(() => onClose(), 700);
      } else {
        alert("Error al guardar: " + resultado.motivo);
      }
    });
  }

  async function recargarFotos() {
    const nuevas = await recargarFotosAction(parcelaId);
    setFotos(nuevas);
  }

  if (cargando) {
    return (
      <div className="crm-modal-overlay">
        <div className="crm-modal-panel" style={{ maxWidth: 900 }}>
          <div className="crm-modal-panel__body" style={{ textAlign: "center", padding: "3rem" }}>
            Cargando parcela…
          </div>
        </div>
      </div>
    );
  }

  if (errorCarga || !record || !form) {
    return (
      <div className="crm-modal-overlay" onClick={onClose}>
        <div className="crm-modal-panel" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
          <div className="crm-modal-panel__head">
            <h2>Editor Integral</h2>
            <button type="button" className="crm-modal-panel__close" onClick={onClose}>
              ×
            </button>
          </div>
          <div className="crm-modal-panel__body">{errorCarga || "No pudimos recuperar la parcela."}</div>
        </div>
      </div>
    );
  }

  const meta = parseMetadata(record.metadata);
  const initTecnico = Number(record.valor_tpl_tasador) || Number((record as Record<string, unknown>).valor_tpl_tasador_ajustado) || Number(meta.valor_tpl_tecnico) || Number(meta.valor_tpl_tasador_ajustado) || 0;
  const initComunal = Number((record as Record<string, unknown>).valor_comunal) || Number(meta.valor_comunal) || 0;
  const initRecomendado = Number((record as Record<string, unknown>).valor_tpl_recomendado) || Number((record as Record<string, unknown>).valor_tpl) || Number(meta.valor_tpl_recomendado) || 0;
  const initApuro = Number((record as Record<string, unknown>).valor_venta_apuro) || Number(meta.valor_venta_apuro) || 0;
  const pPub = Number(record.precio_publicado) || 0;
  let brecha = "—";
  let brechaColor: string | undefined;
  if (pPub > 0 && initRecomendado > 0) {
    const diff = Math.round(((pPub - initRecomendado) / initRecomendado) * 100);
    brecha = `${diff > 0 ? "+" : ""}${diff}%`;
    brechaColor = diff > 0 ? "#e63946" : "#2a9d8f";
  }
  const score = meta.score || record.score;

  return (
    <div className="crm-modal-overlay">
      <div className="crm-modal-panel" style={{ maxWidth: 980 }} onClick={(e) => e.stopPropagation()}>
        <div className="crm-modal-panel__head">
          <h2>Editor Integral - {record.codigo || "Propiedad"}</h2>
          <button type="button" className="crm-modal-panel__close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>
        <div className="crm-modal-panel__body">
          <div className="ei-wrapper">
            <div className="ei-tabs">
              {TABS.map((t) => (
                <button key={t.id} type="button" className={`ei-tab-btn${activeTab === t.id ? " active" : ""}`} onClick={() => setActiveTab(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>

            <div id="ei-tab-comercial" className={`ei-panel${activeTab === "ei-tab-comercial" ? " active" : ""}`}>
              <div className="ei-form-grid">
                <div className="ei-form-group full-width">
                  <label>Título Público</label>
                  <input type="text" value={form.titulo} onChange={(e) => actualizar("titulo", e.target.value)} placeholder="Ej: Parcela 5000m2 con bosque" />
                </div>
                <div className="ei-form-group">
                  <label>Estado de Publicación</label>
                  <select value={form.estado} onChange={(e) => actualizar("estado", e.target.value)}>
                    <option value="borrador">Borrador (Oculta al público)</option>
                    <option value="publicada">Publicada (Activa)</option>
                    <option value="archivada">Archivada (Pausada)</option>
                    <option value="eliminada">🗑️ Eliminar (Mover a Papelera)</option>
                  </select>
                </div>
                <div className="ei-form-group">
                  <label>Tipo de Propiedad</label>
                  <input type="text" value={form.tipo} onChange={(e) => actualizar("tipo", e.target.value)} />
                </div>
                <div className="ei-form-group">
                  <label>Precio Publicado (CLP)</label>
                  <input type="number" value={form.precio_publicado} onChange={(e) => actualizar("precio_publicado", e.target.value)} />
                </div>
                <div className="ei-form-group">
                  <label>Superficie Terreno (m²)</label>
                  <input type="number" value={form.superficie_m2} onChange={(e) => actualizar("superficie_m2", e.target.value)} />
                </div>
                <div
                  className="ei-form-group full-width"
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.2)", padding: "10px 14px", borderRadius: 8 }}
                >
                  <div>
                    <strong style={{ color: "#0284c7", fontSize: 13 }}>🎬 Generación Audiovisual con Google Veo</strong>
                    <p style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Crea clips 16:9 y 9:16 asistidos por IA con las fotos reales de esta parcela.</p>
                  </div>
                  <a href={urlTplStudio(record.id)} target="_blank" rel="noreferrer" className="ei-btn" style={{ background: "#0284c7", color: "white", fontSize: 12, fontWeight: 600, textDecoration: "none", padding: "6px 12px", borderRadius: 6 }}>
                    Abrir TPL Studio →
                  </a>
                </div>
                <div className="ei-form-group full-width">
                  <label>URL Video YouTube (Opcional)</label>
                  <input type="text" value={form.video_url} onChange={(e) => actualizar("video_url", e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
                </div>
                <div className="ei-form-group full-width">
                  <label>Descripción Destacada</label>
                  <textarea value={form.descripcion} onChange={(e) => actualizar("descripcion", e.target.value)} placeholder="Describe los mejores atributos de la propiedad..." />
                </div>
                <div className="ei-form-group full-width">
                  <label>
                    Fotos guardadas <span className="ei-fotos-contador">{fotos.length ? `(${fotos.length})` : ""}</span>
                  </label>
                  <FotosGrid propiedadId={record.id} fotos={fotos} onCambio={recargarFotos} />
                  <p className="ei-fotos-nota">JPG, PNG o WEBP, hasta 8MB cada una. ★ marca la portada (la que se ve en la grilla del CRM); 🗑 elimina la foto.</p>
                </div>
                <div className="ei-form-group full-width">
                  <label>Imágenes por URL (opcional / avanzado)</label>
                  <textarea value={form.imagenes} onChange={(e) => actualizar("imagenes", e.target.value)} placeholder="https://..." />
                </div>
              </div>
            </div>

            <div id="ei-tab-tecnico" className={`ei-panel${activeTab === "ei-tab-tecnico" ? " active" : ""}`}>
              <div className="ei-form-grid">
                <div className="ei-form-group">
                  <label>Rol de Avalúo / Situación</label>
                  <input type="text" value={form.rol_situacion} onChange={(e) => actualizar("rol_situacion", e.target.value)} placeholder="Ej: 1234-56" />
                </div>
                <div className="ei-form-group">
                  <label>Electricidad</label>
                  <select value={form.electricidad} onChange={(e) => actualizar("electricidad", e.target.value)}>
                    <option value="">Seleccionar...</option>
                    <option value="empalme_listo">Empalme Listo</option>
                    <option value="factibilidad">Factibilidad (Poste Cerca)</option>
                    <option value="paneles_solares">Paneles Solares/Generador</option>
                    <option value="sin_factibilidad">Sin Factibilidad</option>
                  </select>
                </div>
                <div className="ei-form-group">
                  <label>Agua Potable</label>
                  <select value={form.agua} onChange={(e) => actualizar("agua", e.target.value)}>
                    <option value="">Seleccionar...</option>
                    <option value="apr_conectado">Conectado a Red/APR</option>
                    <option value="pozo_profundo_listo">Pozo profundo listo</option>
                    <option value="puntera">Puntera</option>
                    <option value="factibilidad_pozo">Factibilidad de pozo</option>
                    <option value="camion_aljibe">Solo camión aljibe</option>
                  </select>
                </div>
                <div className="ei-form-group">
                  <label>Nivel de Acceso</label>
                  <select value={form.acceso} onChange={(e) => actualizar("acceso", e.target.value)}>
                    <option value="">Seleccionar...</option>
                    <option value="pavimentado_a_la_puerta">Pavimentado a la puerta</option>
                    <option value="ripio_buen_estado">Ripio buen estado (todo vehículo)</option>
                    <option value="tierra_transitable">Tierra transitable en verano</option>
                    <option value="solo_4x4">Solo 4x4</option>
                    <option value="dificil">Difícil acceso</option>
                  </select>
                </div>
                <div className="ei-form-group">
                  <label>Cierre Perimetral</label>
                  <input type="text" value={form.cierre_perimetral} onChange={(e) => actualizar("cierre_perimetral", e.target.value)} placeholder="Ej: Cerco vivo, Malla Acuenta" />
                </div>
                <div className="ei-form-group">
                  <label>Portón / Seguridad</label>
                  <input type="text" value={form.porton} onChange={(e) => actualizar("porton", e.target.value)} placeholder="Ej: Portón eléctrico" />
                </div>
              </div>
            </div>

            <div id="ei-tab-natural" className={`ei-panel${activeTab === "ei-tab-natural" ? " active" : ""}`}>
              <div className="ei-form-grid">
                <div className="ei-form-group full-width">
                  <label>Atributos Naturales Exclusivos (separados por coma)</label>
                  <input type="text" value={form.atributos_naturales} onChange={(e) => actualizar("atributos_naturales", e.target.value)} placeholder="Ej: Bosque nativo, Río, Vista a volcanes" />
                </div>
                <div className="ei-form-group">
                  <label>Topografía Principal</label>
                  <select value={form.topografia} onChange={(e) => actualizar("topografia", e.target.value)}>
                    <option value="">Seleccionar...</option>
                    <option value="plano_100">Plano 100%</option>
                    <option value="plano_mayoria">Mayoría plano, leve pendiente</option>
                    <option value="suave_lomaje">Suave lomaje</option>
                    <option value="ladera_usable">Ladera usable/Terrazas</option>
                    <option value="ladera_fuerte">Ladera de fuerte pendiente</option>
                    <option value="quebrada">Quebrada/Poco usable</option>
                  </select>
                </div>
                <div className="ei-form-group">
                  <label>Tipo de Suelo</label>
                  <input type="text" value={form.suelo} onChange={(e) => actualizar("suelo", e.target.value)} placeholder="Ej: Trumao, Arcilloso" />
                </div>
              </div>
            </div>

            <div id="ei-tab-ubicacion" className={`ei-panel${activeTab === "ei-tab-ubicacion" ? " active" : ""}`}>
              <div className="ei-form-grid">
                <div className="ei-form-group">
                  <label>Región Geográfica</label>
                  <input type="text" value={form.region} onChange={(e) => actualizar("region", e.target.value)} />
                </div>
                <div className="ei-form-group">
                  <label>Comuna</label>
                  <input type="text" value={form.comuna} onChange={(e) => actualizar("comuna", e.target.value)} />
                </div>
                <div className="ei-form-group">
                  <label>Sector Específico</label>
                  <input type="text" value={form.sector} onChange={(e) => actualizar("sector", e.target.value)} placeholder="Ej: Sector Los Maquis" />
                </div>
                <div className="ei-form-group">
                  <label>Distancia a Ruta Principal (km)</label>
                  <input type="number" step="0.1" value={form.distancia_ruta_principal_km} onChange={(e) => actualizar("distancia_ruta_principal_km", e.target.value)} />
                </div>
                <div className="ei-form-group">
                  <label>Latitud GPS</label>
                  <input type="number" step="any" value={form.lat} onChange={(e) => actualizar("lat", e.target.value)} />
                </div>
                <div className="ei-form-group">
                  <label>Longitud GPS</label>
                  <input type="number" step="any" value={form.lng} onChange={(e) => actualizar("lng", e.target.value)} />
                </div>
              </div>
              <div style={{ marginTop: "1.5rem" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#475569", textTransform: "uppercase" }}>Ajuste en Mapa</label>
                <EditorMapa
                  active={activeTab === "ei-tab-ubicacion"}
                  lat={form.lat ? Number(form.lat) : null}
                  lng={form.lng ? Number(form.lng) : null}
                  onCambio={(lat, lng) => {
                    actualizar("lat", lat.toFixed(6));
                    actualizar("lng", lng.toFixed(6));
                  }}
                />
              </div>
            </div>

            <div id="ei-tab-owner" className={`ei-panel${activeTab === "ei-tab-owner" ? " active" : ""}`}>
              <div className="ei-form-grid">
                <div className="ei-form-group">
                  <label>Nombre del Propietario</label>
                  <input type="text" value={form.dueno_nombre} onChange={(e) => actualizar("dueno_nombre", e.target.value)} />
                </div>
                <div className="ei-form-group">
                  <label>Teléfono Propietario</label>
                  <input type="text" value={form.dueno_telefono} onChange={(e) => actualizar("dueno_telefono", e.target.value)} />
                </div>
                <div className="ei-form-group full-width">
                  <label>Email Propietario</label>
                  <input type="email" value={form.dueno_email} onChange={(e) => actualizar("dueno_email", e.target.value)} />
                </div>
                <div className="ei-form-group">
                  <label>Corredor/Captador Asignado</label>
                  <input type="text" value={form.corredor_asignado} onChange={(e) => actualizar("corredor_asignado", e.target.value)} placeholder="Staff TPL o Partner" />
                </div>
                <div className="ei-form-group">
                  <label>Email Encargado de Venta</label>
                  <input type="text" value={form.encargado_proyecto} onChange={(e) => actualizar("encargado_proyecto", e.target.value)} />
                </div>
              </div>
            </div>

            <div id="ei-tab-casa" className={`ei-panel${activeTab === "ei-tab-casa" ? " active" : ""}`}>
              <div className="ei-form-grid">
                <div className="ei-form-group full-width">
                  <label>Propiedad con construcciones</label>
                  <p style={{ fontSize: "0.85rem", color: "#64748b", marginTop: 2, marginBottom: 8 }}>
                    Si la parcela incluye una casa, ingresa la cantidad de dormitorios y su materialidad. El motor TPL sumará el valor de la construcción basado en la plusvalía de la zona.
                  </p>
                </div>
                <div className="ei-form-group">
                  <label>Materialidad / Calidad</label>
                  <select value={form.mat_casa} onChange={(e) => actualizar("mat_casa", e.target.value)}>
                    <option value="ligera">Ligera / Básica (Madera simple)</option>
                    <option value="estandar">Estándar / Mixta</option>
                    <option value="solida">Sólida (Albañilería / Hormigón)</option>
                    <option value="premium">Premium (Terminaciones Lujo)</option>
                  </select>
                </div>
                <div className="ei-form-group">
                  <label>Superficie Construida (m2) - Opcional</label>
                  <input type="number" value={form.sup_casa} onChange={(e) => actualizar("sup_casa", e.target.value)} placeholder="Ej. 120" />
                </div>
                <div className="ei-form-group">
                  <label>Dormitorios</label>
                  <input type="number" value={form.dorm_casa} onChange={(e) => actualizar("dorm_casa", e.target.value)} placeholder="Ej. 3" />
                </div>
                <div className="ei-form-group">
                  <label>Baños</label>
                  <input type="number" step="0.5" value={form.banos_casa} onChange={(e) => actualizar("banos_casa", e.target.value)} placeholder="Ej. 2" />
                </div>
                <div className="ei-form-group">
                  <label>Recepción municipal</label>
                  <select value={form.casa_reg} onChange={(e) => actualizar("casa_reg", e.target.value)}>
                    <option value="">Sin declarar</option>
                    <option value="si">Regularizada</option>
                    <option value="no">No regularizada</option>
                    <option value="en_tramite">En trámite</option>
                  </select>
                </div>
                <div className="ei-form-group">
                  <label>Antigüedad (años)</label>
                  <input type="number" value={form.casa_ant} onChange={(e) => actualizar("casa_ant", e.target.value)} placeholder="Ej. 8" />
                </div>
                <div className="ei-form-group full-width">
                  <label style={{ marginTop: "0.5rem" }}>Extras del terreno</label>
                </div>
                <div className="ei-form-group">
                  <label>Piscina</label>
                  <select value={form.extra_piscina} onChange={(e) => actualizar("extra_piscina", e.target.value)}>
                    <option value="">No</option>
                    <option value="si">Sí</option>
                  </select>
                </div>
                <div className="ei-form-group">
                  <label>Material de la piscina</label>
                  <select value={form.extra_piscmat} onChange={(e) => actualizar("extra_piscmat", e.target.value)}>
                    <option value="fibra">Fibra</option>
                    <option value="hormigon">Hormigón</option>
                    <option value="desmontable">Desmontable</option>
                  </select>
                </div>
                <div className="ei-form-group">
                  <label>Superficie piscina (m²)</label>
                  <input type="number" value={form.extra_piscm2} onChange={(e) => actualizar("extra_piscm2", e.target.value)} placeholder="Ej. 32" />
                </div>
                <div className="ei-form-group">
                  <label>Quincho</label>
                  <select value={form.extra_quincho} onChange={(e) => actualizar("extra_quincho", e.target.value)}>
                    <option value="">No</option>
                    <option value="si">Sí</option>
                  </select>
                </div>
                <div className="ei-form-group">
                  <label>Cabaña adicional</label>
                  <select value={form.extra_cabana} onChange={(e) => actualizar("extra_cabana", e.target.value)}>
                    <option value="">No</option>
                    <option value="si">Sí</option>
                  </select>
                </div>
                <div className="ei-form-group">
                  <label>Riego automático</label>
                  <select value={form.extra_riego} onChange={(e) => actualizar("extra_riego", e.target.value)}>
                    <option value="">No</option>
                    <option value="si">Sí</option>
                  </select>
                </div>
              </div>
            </div>

            <div id="ei-tab-analytics" className={`ei-panel${activeTab === "ei-tab-analytics" ? " active" : ""}`}>
              <AnalyticsPanel parcelaId={record.id} active={activeTab === "ei-tab-analytics"} />
            </div>

            <div className="ei-footer">
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <div className="ei-tasacion-box">
                  <div className="ei-tasacion-item">
                    <span className="ei-tasacion-label" style={{ color: "#0284c7" }}>
                      Técnico
                    </span>
                    <span className="ei-tasacion-value" style={{ color: "#0284c7" }}>
                      {fmtMoney(initTecnico)}
                    </span>
                  </div>
                  <div className="ei-tasacion-item">
                    <span className="ei-tasacion-label" style={{ color: "#d97706" }}>
                      Comunal
                    </span>
                    <span className="ei-tasacion-value" style={{ color: "#d97706" }}>
                      {initComunal > 0 ? fmtMoney(initComunal) : "Sin datos"}
                    </span>
                  </div>
                  <div className="ei-tasacion-item">
                    <span className="ei-tasacion-label" style={{ color: "#059669" }}>
                      Recomendado
                    </span>
                    <span className="ei-tasacion-value" style={{ color: "#059669" }}>
                      {fmtMoney(initRecomendado)}
                    </span>
                  </div>
                  <div className="ei-tasacion-item">
                    <span className="ei-tasacion-label" style={{ color: "#dc2626" }}>
                      Apuro
                    </span>
                    <span className="ei-tasacion-value" style={{ color: "#dc2626" }}>
                      {fmtMoney(initApuro)}
                    </span>
                  </div>
                  <div className="ei-tasacion-item">
                    <span className="ei-tasacion-label">Score</span>
                    <span className="ei-tasacion-value">{score ? `${String(score)}/100` : "—"}</span>
                  </div>
                  <div className="ei-tasacion-item">
                    <span className="ei-tasacion-label">Brecha Publicada</span>
                    <span className="ei-tasacion-value" style={{ color: brechaColor }}>
                      {brecha}
                    </span>
                  </div>
                  <button
                    type="button"
                    id="ei-btn-simular"
                    className="ei-btn ei-btn-secondary"
                    style={{ alignSelf: "flex-start", fontSize: "0.85rem", padding: "0.4rem 0.75rem" }}
                    onClick={() => {
                      // Puerto fiel de `btnSimular` en editor-integral.js: el
                      // original llama a `window.TPLLandEngine.calculate(...)`
                      // dentro de un try/catch y, si el motor no está cargado
                      // (no lo está aquí: ver el comentario de
                      // `guardarParcelaAction`), cae exactamente en este
                      // mensaje — no es una regresión, es el mismo camino que
                      // ya tomaba el CRM legacy cuando el script global
                      // `valuation-engine.js` fallaba en cargar.
                      alert("Motor TPL no disponible localmente en el Editor.");
                    }}
                  >
                    Recalcular Motor Tasador
                  </button>
                </div>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <a
                    href={urlInformeValores(record.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="ei-btn"
                    style={{ background: "#111827", color: "#D4AF37", border: "none", padding: "0.5rem 1rem", borderRadius: 4, fontWeight: 600, fontFamily: "'Playfair Display', serif", textDecoration: "none" }}
                  >
                    📜 Informe Premium TPL
                  </a>
                  <button type="button" className="ei-btn ei-btn-secondary" title="Compartir Enlaces Comprador / Propietario" onClick={() => onCompartir(record as unknown as ParcelaResumen)}>
                    🔗 Compartir
                  </button>
                  <button type="button" className="ei-btn ei-btn-primary" onClick={handleGuardar} disabled={guardando}>
                    {guardando ? "Guardando..." : guardadoOk ? "✔ Guardado" : "Guardar Propiedad"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalyticsPanel({ parcelaId, active }: { parcelaId: string; active: boolean }) {
  const [cargado, setCargado] = useState(false);
  const [filas, setFilas] = useState<ParcelaAnalyticsRow[]>([]);

  useEffect(() => {
    if (!active || cargado) return;
    let cancelado = false;
    cargarAnalyticsAction(parcelaId).then((data) => {
      if (!cancelado) {
        setFilas(data);
        setCargado(true);
      }
    });
    return () => {
      cancelado = true;
    };
  }, [active, cargado, parcelaId]);

  return (
    <div className="ei-analytics-box">
      <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🕵️</div>
      <h3 style={{ margin: "0 0 0.5rem 0", color: "#0f172a", fontSize: "1.25rem" }}>Actividad en Tiempo Real</h3>
      <p style={{ color: "#64748b", fontSize: "0.95rem", marginBottom: "1.5rem", maxWidth: 400, marginLeft: "auto", marginRight: "auto" }}>
        El Asesor Espía registra cada visita y evento importante ocurrido en esta propiedad, detectando patrones de interés térmico.
      </p>
      <div style={{ maxHeight: 400, overflowY: "auto", border: "1px solid #cbd5e1", borderRadius: 8, background: "white", textAlign: "left" }}>
        {!cargado ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>Sincronizando radares...</div>
        ) : filas.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>Aún no hay actividad registrada por el Asesor Espía.</div>
        ) : (
          <table className="ei-analytics-table">
            <thead>
              <tr>
                <th>Fecha/Hora</th>
                <th>Evento</th>
                <th>Tiempo (s)</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((row) => {
                const icon = row.action_type === "whatsapp_click" ? "🟢" : row.action_type === "bot_trigger" ? "🤖" : "👁️";
                return (
                  <tr key={row.id}>
                    <td style={{ color: "#475569" }}>{new Date(row.created_at).toLocaleString("es-CL")}</td>
                    <td style={{ fontWeight: "bold" }}>
                      {icon} {row.action_type}
                    </td>
                    <td>{row.time_spent_seconds} s</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function FotosGrid({ propiedadId, fotos, onCambio }: { propiedadId: string; fotos: ParcelaImagen[]; onCambio: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || !files.length) return;
    setSubiendo(true);
    let ok = 0;
    let fallidas = 0;
    for (const file of Array.from(files)) {
      const resultado = await subirFotoAction(propiedadId, file);
      if (resultado.ok) ok++;
      else fallidas++;
    }
    setSubiendo(false);
    if (inputRef.current) inputRef.current.value = "";
    await onCambio();
    if (fallidas === 0) alert(ok === 1 ? "1 foto subida" : `${ok} fotos subidas`);
    else if (ok === 0) alert("No se pudo subir ninguna foto. Revisa el formato/tamaño (máx. 8MB, jpg/png/webp).");
    else alert(`${ok} foto(s) subidas, ${fallidas} fallaron.`);
  }

  async function handlePortada(imagenId: string) {
    setPendingId(imagenId);
    const resultado = await marcarPortadaAction(imagenId);
    setPendingId(null);
    if (resultado.ok) {
      await onCambio();
    } else {
      alert(resultado.motivo || "No se pudo completar la acción sobre la foto.");
    }
  }

  async function handleEliminar(imagenId: string) {
    if (!confirm("¿Eliminar esta foto? No se puede deshacer.")) return;
    setPendingId(imagenId);
    const resultado = await eliminarFotoAction(imagenId);
    setPendingId(null);
    if (resultado.ok) {
      await onCambio();
    } else {
      alert(resultado.motivo || "No se pudo completar la acción sobre la foto.");
    }
  }

  return (
    <>
      <div className="ei-fotos-grid">
        {fotos.length === 0 ? (
          <p className="ei-fotos-vacio">Todavía no hay fotos guardadas para esta parcela.</p>
        ) : (
          fotos.map((f) => (
            <div key={f.id} className={`ei-fotos-item${f.es_portada ? " es-portada" : ""}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- fotos vienen de Supabase Storage */}
              <img src={f.url || ""} alt="Foto de la parcela" loading="lazy" />
              <div className="ei-fotos-actions">
                <button type="button" className={`ei-fotos-btn${f.es_portada ? " activo" : ""}`} title="Marcar como portada" disabled={pendingId === f.id} onClick={() => handlePortada(f.id)}>
                  ★
                </button>
                <button type="button" className="ei-fotos-btn" title="Eliminar foto" disabled={pendingId === f.id} onClick={() => handleEliminar(f.id)}>
                  🗑
                </button>
              </div>
              {f.es_portada ? <span className="ei-fotos-portada-tag">Portada</span> : null}
            </div>
          ))
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => handleFiles(e.target.files)} />
      <button type="button" className="ei-btn ei-btn-secondary" style={{ alignSelf: "flex-start" }} disabled={subiendo} onClick={() => inputRef.current?.click()}>
        {subiendo ? "Subiendo..." : "📤 Subir fotos"}
      </button>
    </>
  );
}

/**
 * Puerto de `initEIMap()` en `editor-integral.js` a un componente React.
 * Usa Leaflet (misma librería, antes cargada como script global `L` — aquí
 * es una dependencia npm de `apps/crm` importada dinámicamente solo en el
 * cliente, ya que Leaflet toca `document`/`window` al cargar).
 */
function EditorMapa({ active, lat, lng, onCambio }: { active: boolean; lat: number | null; lng: number | null; onCambio: (lat: number, lng: number) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").Marker | null>(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;
    let cancelado = false;

    import("leaflet").then((L) => {
      if (cancelado || !containerRef.current) return;
      const defaultLat = -33.4489;
      const defaultLng = -70.6693;
      const targetLat = lat ?? defaultLat;
      const targetLng = lng ?? defaultLng;

      if (!mapRef.current) {
        const map = L.map(containerRef.current).setView([targetLat, targetLng], lat ? 13 : 5);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap" }).addTo(map);
        const marker = L.marker([targetLat, targetLng], { draggable: true }).addTo(map);

        marker.on("dragend", () => {
          const coords = marker.getLatLng();
          onCambio(coords.lat, coords.lng);
        });
        map.on("click", (e: import("leaflet").LeafletMouseEvent) => {
          marker.setLatLng(e.latlng);
          onCambio(e.latlng.lat, e.latlng.lng);
        });

        mapRef.current = map;
        markerRef.current = marker;
      } else {
        mapRef.current.setView([targetLat, targetLng], lat ? 13 : 5);
        markerRef.current?.setLatLng([targetLat, targetLng]);
        setTimeout(() => mapRef.current?.invalidateSize(), 100);
      }
    });

    return () => {
      cancelado = true;
    };
    // Solo se reinicializa cuando el tab se vuelve a activar; lat/lng se
    // aplican al mapa ya creado sin recrearlo (igual que el original, que
    // reusa `eiMap`/`eiMarker` entre aperturas de la pestaña).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="ei-mapa" />;
}
