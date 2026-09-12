"use client";

import { useState, useRef, type FormEvent, type MouseEvent } from "react";
import type { Property } from "@tpl/core";
import {
  calculateProjectBudget,
  HOUSE_MODELS,
  FOUNDATION_OPTIONS,
  ADDITIONAL_WORKS,
  CONSTRUCTION_SYSTEM_RATES,
  type ConstructionMaterial,
} from "@tpl/core";
import { Card, Button, Badge, Stack, Grid, Input } from "@tpl/ui";
import { registrarCotizacionAction } from "../../lib/cotizador/actions";
import { scheduleVisitDialogCss } from "../property/scheduleVisitDialog.css";
import { WHATSAPP_PHONE as TPL_WHATSAPP_PHONE } from "../../lib/contact";

function fmt(n: number): string {
  return new Intl.NumberFormat("es-CL").format(Math.max(0, Math.round(n)));
}

function resolveLegacyAssetUrl(path: string): string {
  const clean = path.replace(/^\/+/, "").replace(/^image\//i, "");
  return `/legacy-image/${clean}`;
}

export interface CotizadorWizardProps {
  initialProperties: Property[];
  preselectedParcelCode?: string;
}

export function CotizadorWizard({ initialProperties, preselectedParcelCode }: CotizadorWizardProps) {
  const [currentStep, setCurrentStep] = useState<number>(preselectedParcelCode ? 2 : 1);
  const [selectedParcelCode, setSelectedParcelCode] = useState<string>(
    preselectedParcelCode || (initialProperties[0]?.code ?? "own_parcel")
  );
  const [housingMode, setHousingMode] = useState<"prefab" | "custom">("prefab");
  const [selectedPrefabId, setSelectedPrefabId] = useState<string>("aura36");
  const [customSystem, setCustomSystem] = useState<ConstructionMaterial>("madera");
  const [customSurfaceM2, setCustomSurfaceM2] = useState<number>(72);
  const [customRooms, setCustomRooms] = useState<number>(3);
  const [selectedFoundationId, setSelectedFoundationId] = useState<string>("radier_hormigon");
  const [selectedExtras, setSelectedExtras] = useState<Record<string, number>>({
    pozo_profundo: 30,
    fosa_septica: 1,
    empalme_electrico: 1,
    cierre_perimetral: 0,
    porton_acceso: 0,
  });

  const selectedParcel = initialProperties.find((p) => p.code === selectedParcelCode);
  const parcelPrice = selectedParcelCode === "own_parcel" ? 0 : (selectedParcel?.price ?? 0);

  const estimate = calculateProjectBudget({
    parcelPriceClp: parcelPrice,
    housing:
      housingMode === "prefab"
        ? { mode: "prefab", houseModelId: selectedPrefabId }
        : { mode: "custom", system: customSystem, surfaceM2: customSurfaceM2, rooms: customRooms },
    foundationId: selectedFoundationId,
    selectedExtras: Object.entries(selectedExtras)
      .filter(([_, qty]) => qty > 0)
      .map(([workId, quantity]) => ({ workId, quantity })),
  });

  function toggleExtra(workId: string, defaultQty: number) {
    setSelectedExtras((prev) => ({
      ...prev,
      [workId]: prev[workId] > 0 ? 0 : defaultQty,
    }));
  }

  function updateExtraQty(workId: string, delta: number, min: number, max: number) {
    setSelectedExtras((prev) => {
      const current = prev[workId] || 0;
      const next = Math.min(max, Math.max(min, current + delta));
      return { ...prev, [workId]: next };
    });
  }

  const dialogRef = useRef<HTMLDialogElement>(null);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function openDialog() {
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    dialogRef.current?.close();
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) closeDialog();
  }

  async function handleContactSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = clientName.trim();
    const trimmedPhone = clientPhone.trim();
    const trimmedEmail = clientEmail.trim();
    if (!trimmedName || (!trimmedPhone && !trimmedEmail) || isSubmitting) return;

    const contactStr = trimmedPhone ? `${trimmedName} (${trimmedPhone})` : trimmedName;
    const whatsappMessage = encodeURIComponent(
      `Hola Tu Parcela Lista! Soy ${contactStr}. Armé mi proyecto en el Cotizador web:\n\n` +
        `📍 Parcela: ${selectedParcel ? `${selectedParcel.title} ($${fmt(parcelPrice)} CLP)` : "Ya cuento con terreno propio"}\n` +
        `🏡 Vivienda: ${estimate.details.houseName} ($${fmt(estimate.housePrice)} CLP)\n` +
        `🏗️ Fundación: ${estimate.details.foundationName ?? "Sin fundación seleccionada"} ($${fmt(estimate.foundationPrice)} CLP)\n` +
        `⚡ Obras adc.: ${
          estimate.details.extrasBreakdown.map((e) => `${e.name} ($${fmt(e.subtotal)})`).join(", ") || "Ninguna"
        }\n\n` +
        `💰 Total Estimado Consolidado: $${fmt(estimate.totalProjectPrice)} CLP\n\n` +
        `Quiero coordinar asesoría con un especialista TPL para evaluar mi proyecto.`
    );
    const whatsappUrl = `https://wa.me/${TPL_WHATSAPP_PHONE}?text=${whatsappMessage}`;

    // Apertura dentro del gesto del usuario para evitar bloqueo de popups
    const ventanaWhatsApp = window.open("", "_blank");
    setIsSubmitting(true);

    try {
      await Promise.race([
        registrarCotizacionAction({
          nombre: trimmedName,
          telefono: trimmedPhone,
          email: trimmedEmail || undefined,
          parcelCode: selectedParcel?.code ?? "terreno_propio",
          parcelTitle: selectedParcel?.title ?? "Terreno propio",
          houseModelName: estimate.details.houseName,
          houseSurfaceM2: estimate.houseSurfaceM2,
          housePrice: estimate.housePrice,
          foundationName: estimate.details.foundationName ?? undefined,
          foundationPrice: estimate.foundationPrice,
          extrasBreakdown: estimate.details.extrasBreakdown.map((e) => ({
            name: e.name,
            subtotal: e.subtotal,
          })),
          totalProjectPrice: estimate.totalProjectPrice,
        }),
        new Promise((resolve) => setTimeout(resolve, 2500)),
      ]);
    } catch {
      // Persistencia no bloquea WhatsApp
    } finally {
      setIsSubmitting(false);
      if (ventanaWhatsApp && !ventanaWhatsApp.closed) {
        try {
          ventanaWhatsApp.opener = null;
        } catch {}
        ventanaWhatsApp.location.href = whatsappUrl;
      } else {
        window.location.href = whatsappUrl;
      }
      closeDialog();
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "32px", alignItems: "start" }}>
      {/* Pasos / Navegación del Wizard */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", borderBottom: "1px solid #e2e8f0", paddingBottom: "16px" }}>
        {[
          { num: 1, label: "1. Terreno / Parcela" },
          { num: 2, label: "2. Vivienda" },
          { num: 3, label: "3. Fundación" },
          { num: 4, label: "4. Obras Adicionales" },
        ].map((s) => (
          <button
            key={s.num}
            type="button"
            onClick={() => setCurrentStep(s.num)}
            style={{
              padding: "10px 18px",
              borderRadius: "24px",
              border: "none",
              fontSize: "0.95rem",
              fontWeight: 600,
              cursor: "pointer",
              backgroundColor: currentStep === s.num ? "#003f7a" : "rgba(0, 63, 122, 0.08)",
              color: currentStep === s.num ? "#fff" : "#003f7a",
              transition: "all 0.2s ease",
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "32px" }}>
        {/* Columna Principal: Contenido del Paso Activo */}
        <div>
          {/* PASO 1: TERRENO */}
          {currentStep === 1 && (
            <Card>
              <Card.Body padding="md">
                <Stack direction="column" gap={3}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h2 style={{ fontSize: "1.4rem", margin: 0, color: "#132437" }}>Paso 1: Elige tu parcela</h2>
                    <Badge variant="info">Terreno base</Badge>
                  </div>
                  <p style={{ color: "#4a5d6e", margin: 0, lineHeight: 1.5 }}>
                    Selecciona una parcela del catálogo TPL o indica si ya dispones de terreno propio.
                  </p>

                  <div
                    onClick={() => setSelectedParcelCode("own_parcel")}
                    style={{
                      padding: "16px",
                      borderRadius: "12px",
                      border: selectedParcelCode === "own_parcel" ? "2px solid #003f7a" : "1px solid #cbd5e1",
                      backgroundColor: selectedParcelCode === "own_parcel" ? "rgba(0, 63, 122, 0.04)" : "#fff",
                      cursor: "pointer",
                    }}
                  >
                    <strong style={{ display: "block", fontSize: "1.05rem", color: "#132437" }}>
                      Ya tengo mi propio terreno / parcela
                    </strong>
                    <small style={{ color: "#64748b" }}>
                      Cotizaremos solo la vivienda, fundación y obras complementarias ($0 en parcela).
                    </small>
                  </div>

                  <h3 style={{ fontSize: "1.1rem", margin: "16px 0 0 0", color: "#132437" }}>
                    O elige una parcela de nuestro catálogo:
                  </h3>

                  <div style={{ display: "grid", gap: "12px", maxHeight: "420px", overflowY: "auto", paddingRight: "4px" }}>
                    {initialProperties.map((p) => {
                      const isSelected = selectedParcelCode === p.code;
                      return (
                        <div
                          key={p.id}
                          onClick={() => setSelectedParcelCode(p.code)}
                          style={{
                            padding: "12px 16px",
                            borderRadius: "10px",
                            border: isSelected ? "2px solid #003f7a" : "1px solid #e2e8f0",
                            backgroundColor: isSelected ? "rgba(0, 63, 122, 0.05)" : "#fff",
                            cursor: "pointer",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <div>
                            <strong style={{ display: "block", color: "#132437", fontSize: "0.95rem" }}>{p.title}</strong>
                            <small style={{ color: "#64748b" }}>
                              {p.commune} • {p.landAreaM2 ? `${fmt(p.landAreaM2)} m²` : "Consulte superficie"}
                            </small>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <strong style={{ display: "block", color: "#003f7a", fontSize: "1rem" }}>
                              ${fmt(p.price || 0)}
                            </strong>
                            <span style={{ fontSize: "0.75rem", color: isSelected ? "#003f7a" : "#94a3b8", fontWeight: 600 }}>
                              {isSelected ? "Seleccionada ✓" : "Seleccionar"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <Button variant="navy" onClick={() => setCurrentStep(2)} style={{ marginTop: "12px" }}>
                    Continuar al Paso 2: Vivienda →
                  </Button>
                </Stack>
              </Card.Body>
            </Card>
          )}

          {/* PASO 2: VIVIENDA */}
          {currentStep === 2 && (
            <Card>
              <Card.Body padding="md">
                <Stack direction="column" gap={3}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h2 style={{ fontSize: "1.4rem", margin: 0, color: "#132437" }}>Paso 2: Define la vivienda</h2>
                    <Badge variant="accent">Vivienda</Badge>
                  </div>

                  {/* Selector de modo: Prefabricada vs Diseño Propio */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <button
                      type="button"
                      onClick={() => setHousingMode("prefab")}
                      style={{
                        padding: "14px",
                        borderRadius: "10px",
                        border: housingMode === "prefab" ? "2px solid #003f7a" : "1px solid #cbd5e1",
                        backgroundColor: housingMode === "prefab" ? "rgba(0, 63, 122, 0.05)" : "#fff",
                        cursor: "pointer",
                        textAlign: "center",
                      }}
                    >
                      <strong style={{ display: "block", color: "#003f7a", fontSize: "1rem" }}>
                        Casa Prefabricada
                      </strong>
                      <small style={{ color: "#64748b" }}>Modelos probados, entrega rápida y precio fijo</small>
                    </button>

                    <button
                      type="button"
                      onClick={() => setHousingMode("custom")}
                      style={{
                        padding: "14px",
                        borderRadius: "10px",
                        border: housingMode === "custom" ? "2px solid #003f7a" : "1px solid #cbd5e1",
                        backgroundColor: housingMode === "custom" ? "rgba(0, 63, 122, 0.05)" : "#fff",
                        cursor: "pointer",
                        textAlign: "center",
                      }}
                    >
                      <strong style={{ display: "block", color: "#003f7a", fontSize: "1rem" }}>Diseño a Medida</strong>
                      <small style={{ color: "#64748b" }}>Cálculo por metro cuadrado según material</small>
                    </button>
                  </div>

                  {/* Catálogo de Casas Prefabricadas */}
                  {housingMode === "prefab" ? (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "16px", marginTop: "8px" }}>
                      {HOUSE_MODELS.map((model) => {
                        const isSelected = selectedPrefabId === model.id;
                        return (
                          <div
                            key={model.id}
                            onClick={() => setSelectedPrefabId(model.id)}
                            style={{
                              borderRadius: "12px",
                              overflow: "hidden",
                              border: isSelected ? "2px solid #003f7a" : "1px solid #e2e8f0",
                              boxShadow: isSelected ? "0 4px 12px rgba(0,63,122,0.15)" : "none",
                              cursor: "pointer",
                              backgroundColor: "#fff",
                              display: "flex",
                              flexDirection: "column",
                            }}
                          >
                            <div style={{ position: "relative", height: "140px", backgroundColor: "#f1f5f9" }}>
                              <img
                                src={resolveLegacyAssetUrl(model.foto)}
                                alt={model.nombre}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                onError={(e) => {
                                  // Fallback limpio
                                  (e.target as HTMLImageElement).src = "/brand/tpl-mark.svg";
                                }}
                              />
                              <span
                                style={{
                                  position: "absolute",
                                  top: "8px",
                                  right: "8px",
                                  backgroundColor: "rgba(19, 36, 55, 0.8)",
                                  color: "#fff",
                                  padding: "2px 8px",
                                  borderRadius: "6px",
                                  fontSize: "0.75rem",
                                  fontWeight: 600,
                                }}
                              >
                                {model.metros} m²
                              </span>
                            </div>
                            <div style={{ padding: "12px", flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                              <div>
                                <strong style={{ display: "block", fontSize: "0.95rem", color: "#132437" }}>
                                  {model.nombre}
                                </strong>
                                <small style={{ color: "#64748b" }}>
                                  {model.habitaciones} hab • {model.banos} baño • {model.empresa}
                                </small>
                              </div>
                              <div style={{ marginTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <strong style={{ color: "#003f7a", fontSize: "1.05rem" }}>${fmt(model.valorCasa)}</strong>
                                <span style={{ fontSize: "0.8rem", color: isSelected ? "#003f7a" : "#94a3b8", fontWeight: 700 }}>
                                  {isSelected ? "Elegida ✓" : "Elegir"}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Configuración de Diseño a Medida */
                    <Stack direction="column" gap={3}>
                      <div>
                        <label style={{ display: "block", fontWeight: 600, color: "#132437", marginBottom: "8px" }}>
                          Sistema constructivo:
                        </label>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                          {Object.values(CONSTRUCTION_SYSTEM_RATES).map((sys) => {
                            const isSelected = customSystem === sys.id;
                            return (
                              <div
                                key={sys.id}
                                onClick={() => setCustomSystem(sys.id as ConstructionMaterial)}
                                style={{
                                  padding: "12px",
                                  borderRadius: "10px",
                                  border: isSelected ? "2px solid #003f7a" : "1px solid #cbd5e1",
                                  backgroundColor: isSelected ? "rgba(0, 63, 122, 0.05)" : "#fff",
                                  cursor: "pointer",
                                }}
                              >
                                <strong style={{ display: "block", color: "#132437" }}>{sys.nombre}</strong>
                                <span style={{ color: "#003f7a", fontWeight: 700, fontSize: "0.95rem" }}>
                                  ${fmt(sys.valorM2)} / m²
                                </span>
                                <p style={{ fontSize: "0.8rem", color: "#64748b", margin: "4px 0 0 0" }}>{sys.descripcion}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                        <div>
                          <label style={{ display: "block", fontWeight: 600, color: "#132437", marginBottom: "6px" }}>
                            Superficie a construir: <strong>{customSurfaceM2} m²</strong>
                          </label>
                          <input
                            type="range"
                            min="24"
                            max="250"
                            step="2"
                            value={customSurfaceM2}
                            onChange={(e) => setCustomSurfaceM2(Number(e.target.value))}
                            style={{ width: "100%", accentColor: "#003f7a" }}
                          />
                        </div>

                        <div>
                          <label style={{ display: "block", fontWeight: 600, color: "#132437", marginBottom: "6px" }}>
                            Habitaciones estimadas: <strong>{customRooms}</strong>
                          </label>
                          <input
                            type="range"
                            min="1"
                            max="6"
                            value={customRooms}
                            onChange={(e) => setCustomRooms(Number(e.target.value))}
                            style={{ width: "100%", accentColor: "#003f7a" }}
                          />
                        </div>
                      </div>
                    </Stack>
                  )}

                  <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
                    <Button variant="secondary" onClick={() => setCurrentStep(1)}>
                      ← Volver a Terreno
                    </Button>
                    <Button variant="navy" onClick={() => setCurrentStep(3)}>
                      Continuar a Fundación →
                    </Button>
                  </div>
                </Stack>
              </Card.Body>
            </Card>
          )}

          {/* PASO 3: FUNDACIÓN */}
          {currentStep === 3 && (
            <Card>
              <Card.Body padding="md">
                <Stack direction="column" gap={3}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h2 style={{ fontSize: "1.4rem", margin: 0, color: "#132437" }}>Paso 3: Elige la base / fundación</h2>
                    <Badge variant="info">Estructura</Badge>
                  </div>
                  <p style={{ color: "#4a5d6e", margin: 0, lineHeight: 1.5 }}>
                    La fundación adecuada depende de la pendiente de tu terreno y de las especificaciones de la vivienda.
                  </p>

                  <div style={{ display: "grid", gap: "12px" }}>
                    {FOUNDATION_OPTIONS.map((f) => {
                      const isSelected = selectedFoundationId === f.id;
                      const foundationSubtotal = f.valorPorM2 * estimate.houseSurfaceM2;
                      return (
                        <div
                          key={f.id}
                          onClick={() => setSelectedFoundationId(f.id)}
                          style={{
                            padding: "14px 16px",
                            borderRadius: "10px",
                            border: isSelected ? "2px solid #003f7a" : "1px solid #cbd5e1",
                            backgroundColor: isSelected ? "rgba(0, 63, 122, 0.05)" : "#fff",
                            cursor: "pointer",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <div>
                            <strong style={{ display: "block", color: "#132437" }}>{f.nombre}</strong>
                            <small style={{ color: "#64748b" }}>
                              ${fmt(f.valorPorM2)} / m² de vivienda • {f.empresa}
                            </small>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <strong style={{ display: "block", color: "#003f7a", fontSize: "1.05rem" }}>
                              ${fmt(foundationSubtotal)}
                            </strong>
                            <span style={{ fontSize: "0.75rem", color: isSelected ? "#003f7a" : "#94a3b8", fontWeight: 700 }}>
                              {isSelected ? "Seleccionada ✓" : "Elegir"}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    <div
                      onClick={() => setSelectedFoundationId("")}
                      style={{
                        padding: "12px 16px",
                        borderRadius: "10px",
                        border: !selectedFoundationId ? "2px solid #003f7a" : "1px dashed #cbd5e1",
                        backgroundColor: !selectedFoundationId ? "rgba(0, 63, 122, 0.04)" : "#fff",
                        cursor: "pointer",
                      }}
                    >
                      <strong style={{ display: "block", color: "#132437", fontSize: "0.95rem" }}>
                        Sin fundación por ahora / La construiré por mi cuenta
                      </strong>
                      <small style={{ color: "#64748b" }}>No sumar costos de fundación al presupuesto ($0).</small>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
                    <Button variant="secondary" onClick={() => setCurrentStep(2)}>
                      ← Volver a Vivienda
                    </Button>
                    <Button variant="navy" onClick={() => setCurrentStep(4)}>
                      Continuar a Obras Adicionales →
                    </Button>
                  </div>
                </Stack>
              </Card.Body>
            </Card>
          )}

          {/* PASO 4: OBRAS ADICIONALES */}
          {currentStep === 4 && (
            <Card>
              <Card.Body padding="md">
                <Stack direction="column" gap={3}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h2 style={{ fontSize: "1.4rem", margin: 0, color: "#132437" }}>Paso 4: Obras complementarias</h2>
                    <Badge variant="accent">Llave en Mano</Badge>
                  </div>
                  <p style={{ color: "#4a5d6e", margin: 0, lineHeight: 1.5 }}>
                    Agrega los servicios indispensables para habilitar y habitar tu parcela de campo desde el primer día.
                  </p>

                  <div style={{ display: "grid", gap: "14px" }}>
                    {ADDITIONAL_WORKS.map((work) => {
                      const qty = selectedExtras[work.id] || 0;
                      const isActive = qty > 0;
                      const subtotal = work.valorUnitario * qty;

                      return (
                        <div
                          key={work.id}
                          style={{
                            padding: "14px 16px",
                            borderRadius: "10px",
                            border: isActive ? "2px solid #003f7a" : "1px solid #e2e8f0",
                            backgroundColor: isActive ? "rgba(0, 63, 122, 0.03)" : "#fff",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                            <div style={{ display: "flex", gap: "12px", alignItems: "start" }}>
                              <input
                                type="checkbox"
                                checked={isActive}
                                onChange={() => toggleExtra(work.id, work.defaultQty)}
                                style={{ width: "18px", height: "18px", marginTop: "3px", accentColor: "#003f7a" }}
                              />
                              <div>
                                <strong style={{ display: "block", color: "#132437" }}>{work.nombre}</strong>
                                <p style={{ fontSize: "0.85rem", color: "#64748b", margin: "2px 0 0 0" }}>{work.descripcion}</p>
                              </div>
                            </div>

                            <div style={{ textAlign: "right" }}>
                              <strong style={{ display: "block", color: "#003f7a", fontSize: "1.05rem" }}>
                                ${fmt(subtotal)}
                              </strong>
                              <small style={{ color: "#64748b" }}>
                                ${fmt(work.valorUnitario)} / {work.tipoCalculo}
                              </small>
                            </div>
                          </div>

                          {isActive && work.maxQty > 1 && (
                            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "12px", paddingLeft: "30px" }}>
                              <span style={{ fontSize: "0.85rem", color: "#475569" }}>Cantidad ({work.tipoCalculo}s):</span>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <button
                                  type="button"
                                  onClick={() => updateExtraQty(work.id, -10, work.minQty, work.maxQty)}
                                  style={{ width: "28px", height: "28px", borderRadius: "4px", border: "1px solid #cbd5e1" }}
                                >
                                  -
                                </button>
                                <strong style={{ minWidth: "30px", textAlign: "center" }}>{qty}</strong>
                                <button
                                  type="button"
                                  onClick={() => updateExtraQty(work.id, 10, work.minQty, work.maxQty)}
                                  style={{ width: "28px", height: "28px", borderRadius: "4px", border: "1px solid #cbd5e1" }}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
                    <Button variant="secondary" onClick={() => setCurrentStep(3)}>
                      ← Volver a Fundación
                    </Button>
                  </div>
                </Stack>
              </Card.Body>
            </Card>
          )}
        </div>

        {/* Columna Lateral: Resumen del Proyecto en Tiempo Real */}
        <div style={{ position: "sticky", top: "24px" }}>
          <Card style={{ border: "2px solid #003f7a", boxShadow: "0 8px 24px rgba(0,63,122,0.08)" }}>
            <Card.Body padding="md">
              <Stack direction="column" gap={3}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#003f7a", fontWeight: 700 }}>
                    PRESUPUESTO EN VIVO
                  </span>
                  <Badge variant="success">Llave en Mano</Badge>
                </div>

                <h3 style={{ fontSize: "1.25rem", margin: 0, color: "#132437" }}>Tu Proyecto Rural TPL</h3>

                <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "12px", display: "grid", gap: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.95rem" }}>
                    <span style={{ color: "#64748b" }}>1. Parcela / Terreno:</span>
                    <strong style={{ color: "#132437" }}>${fmt(estimate.parcelPrice)}</strong>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.95rem" }}>
                    <span style={{ color: "#64748b" }}>2. Vivienda ({estimate.houseSurfaceM2} m²):</span>
                    <strong style={{ color: "#132437" }}>${fmt(estimate.housePrice)}</strong>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.95rem" }}>
                    <span style={{ color: "#64748b" }}>3. Fundación:</span>
                    <strong style={{ color: "#132437" }}>${fmt(estimate.foundationPrice)}</strong>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.95rem" }}>
                    <span style={{ color: "#64748b" }}>4. Obras adicionales:</span>
                    <strong style={{ color: "#132437" }}>${fmt(estimate.extrasPrice)}</strong>
                  </div>
                </div>

                <div
                  style={{
                    borderTop: "2px solid #003f7a",
                    paddingTop: "14px",
                    marginTop: "6px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                  }}
                >
                  <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "#132437" }}>Total Estimado:</span>
                  <strong style={{ fontSize: "1.45rem", color: "#003f7a", fontWeight: 800 }}>
                    ${fmt(estimate.totalProjectPrice)} CLP
                  </strong>
                </div>

                <p style={{ fontSize: "0.8rem", color: "#64748b", margin: 0, lineHeight: 1.4 }}>
                  *Valores referenciales. Los costos finales de traslado, movimiento de tierra y permisos municipales
                  se validan en la visita técnica en terreno.
                </p>

                <button
                  type="button"
                  onClick={openDialog}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    backgroundColor: "#25d366",
                    color: "#fff",
                    padding: "14px",
                    borderRadius: "10px",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: "1rem",
                    boxShadow: "0 4px 12px rgba(37,211,102,0.3)",
                    marginTop: "8px",
                    width: "100%",
                  }}
                >
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.031 0C5.385 0 0 5.385 0 12.031c0 2.133.553 4.214 1.603 6.06L.266 23.514l5.578-1.464a12.016 12.016 0 006.187 1.696c6.646 0 12.031-5.385 12.031-12.031C24.062 5.385 18.677 0 12.031 0zm3.626 17.15c-.152.427-.887.844-1.228.877-.32.031-.767.124-2.528-.567-2.115-.83-3.468-2.984-3.573-3.125-.105-.141-.853-1.137-.853-2.17 0-1.033.538-1.541.728-1.737.19-.196.411-.245.549-.245.138 0 .276 0 .393.006.122.006.286-.046.438.318.157.377.538 1.314.585 1.408.047.094.078.204.016.332-.062.128-.094.208-.188.318-.094.11-.196.241-.281.332-.094.102-.194.212-.081.408.113.196.583 1.203.541.482.879.621 1.077.728.198.107.315.094.433-.031.118-.125.508-.592.645-.796.137-.204.275-.17.455-.104.18.066 1.139.537 1.334.635.195.098.325.147.372.228.047.081.047.469-.105.896z" />
                  </svg>
                  Consultar Proyecto por WhatsApp
                </button>
              </Stack>
            </Card.Body>
          </Card>
        </div>
      </div>

      <style>{scheduleVisitDialogCss}</style>
      <dialog
        ref={dialogRef}
        className="tpl-visit-dialog"
        aria-labelledby="cotizador-dialog-title"
        onClick={handleBackdropClick}
      >
        <form className="tpl-visit-dialog__form" onSubmit={handleContactSubmit}>
          <h3 id="cotizador-dialog-title" className="tpl-visit-dialog__title">
            Consultar Proyecto Rural
          </h3>
          <p className="tpl-visit-dialog__intro">
            Ingresa tu nombre y teléfono para respaldar tu cotización (${fmt(estimate.totalProjectPrice)} CLP) y abrir el chat de WhatsApp con un asesor.
          </p>
          <div className="tpl-visit-dialog__field">
            <label htmlFor="cotizador-name">Nombre completo</label>
            <Input
              id="cotizador-name"
              name="name"
              required
              autoComplete="name"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Tu nombre"
            />
          </div>
          <div className="tpl-visit-dialog__field">
            <label htmlFor="cotizador-phone">Teléfono / WhatsApp</label>
            <Input
              id="cotizador-phone"
              name="phone"
              type="tel"
              required
              autoComplete="tel"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="+56 9 1234 5678"
            />
          </div>
          <div className="tpl-visit-dialog__field">
            <label htmlFor="cotizador-email">Correo electrónico (opcional)</label>
            <Input
              id="cotizador-email"
              name="email"
              type="email"
              autoComplete="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="tu@correo.cl"
            />
          </div>
          <div className="tpl-visit-dialog__actions">
            <Button type="button" variant="ghost" onClick={closeDialog} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" variant="whatsapp" disabled={isSubmitting}>
              {isSubmitting ? "Guardando…" : "Continuar por WhatsApp"}
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
