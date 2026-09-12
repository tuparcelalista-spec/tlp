"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Container, Section, Card, Stack, Button, Badge, Input, Select } from "@tpl/ui";
import { REGIONS, COMMUNES } from "../../lib/publicar/territoryCatalog";
import { getComunaPriceReference, type ComunaPriceReference } from "../../lib/publicar/actions";
import {
  INITIAL_PUBLISH_WIZARD_STATE,
  ROL_PROPIO_OPTIONS,
  AGUA_OPTIONS,
  LUZ_OPTIONS,
  PUBLISH_PLANS,
  validatePublishStep,
  buildPublishWhatsAppMessage,
  type PublishWizardFormState,
  type PublishPlan,
} from "../../lib/publicar/wizardState";

import { WHATSAPP_PHONE } from "../../lib/contact";

const TOTAL_STEPS = 4;

const STEP_LABELS = [
  { titulo: "Ubicación", subtitulo: "Dónde está tu propiedad" },
  { titulo: "Características", subtitulo: "Terreno y servicios" },
  { titulo: "Precio & Tasación", subtitulo: "Cuánto esperas obtener" },
  { titulo: "Planes & Salida", subtitulo: "Cómo quieres venderla" },
];

/**
 * Leaflet toca `window`/`document` directamente — nunca debe evaluarse en
 * el servidor. `ssr:false` solo es válido dentro de un Client Component,
 * por eso vive acá y no en `app/publicar/page.tsx` (Server Component).
 */
const ParcelMapPicker = dynamic(() => import("./ParcelMapPicker").then((m) => m.ParcelMapPicker), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: 360,
        borderRadius: "var(--tpl-radius-lg)",
        background: "var(--tpl-surface-sunken)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--tpl-content-muted)",
      }}
    >
      Cargando mapa…
    </div>
  ),
});

/**
 * Wizard de publicación — versión acotada y autorizada explícitamente
 * (ver auditoría de `publicar-v2`, que tiene ~40 campos, multimedia, IA y
 * pago real vía Flow). Este bloque cubre 4 pasos: Ubicación, Características,
 * Precio & Tasación, Planes & Salida. El cierre es un mensaje de WhatsApp
 * con el resumen de la parcela — NO llama a `tpl_publicar_propiedad_v3`
 * (esa RPC exige nombre + contacto, que este paso no recolecta todavía) ni
 * escribe nada en Supabase. Es intencional, no un olvido: el siguiente
 * bloque puede agregar la publicación real cuando se decida qué datos de
 * contacto capturar.
 */
export function PublishWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState<PublishWizardFormState>(INITIAL_PUBLISH_WIZARD_STATE);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [priceReference, setPriceReference] = useState<ComunaPriceReference | null>(null);
  const [isLoadingReference, setIsLoadingReference] = useState(false);
  const [referenceFetchedFor, setReferenceFetchedFor] = useState<string | null>(null);

  const comunasDeLaRegion = useMemo(() => COMMUNES.filter((c) => c.regionCode === form.regionCode), [form.regionCode]);
  const regionLabel = useMemo(() => REGIONS.find((r) => r.code === form.regionCode)?.name ?? "", [form.regionCode]);

  function updateForm(patch: Partial<PublishWizardFormState>) {
    setForm((previous) => ({ ...previous, ...patch }));
  }

  function handleRegionChange(regionCode: string) {
    updateForm({ regionCode, comuna: "", lat: null, lng: null });
  }

  function handleComunaChange(comuna: string) {
    const datos = COMMUNES.find((c) => c.name === comuna && c.regionCode === form.regionCode);
    updateForm({ comuna, lat: datos?.lat ?? null, lng: datos?.lng ?? null });
  }

  async function ensurePriceReference() {
    if (!form.comuna || referenceFetchedFor === form.comuna) return;
    setIsLoadingReference(true);
    try {
      const referencia = await getComunaPriceReference(form.comuna);
      setPriceReference(referencia);
      setReferenceFetchedFor(form.comuna);
    } finally {
      setIsLoadingReference(false);
    }
  }

  async function handleNext() {
    const validacion = validatePublishStep(currentStep, form);
    if (!validacion.ok) {
      setErrorMessage(validacion.mensaje ?? "Completa los datos de este paso.");
      return;
    }
    setErrorMessage(null);
    const siguiente = Math.min(currentStep + 1, TOTAL_STEPS);
    setCurrentStep(siguiente);
    if (siguiente === 3) void ensurePriceReference();
  }

  function handlePrev() {
    setErrorMessage(null);
    setCurrentStep((step) => Math.max(1, step - 1));
  }

  function handleElegirPlan(plan: PublishPlan) {
    const mensaje = buildPublishWhatsAppMessage(form, form.comuna, regionLabel, plan);
    window.open(`https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(mensaje)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <Section tone="canvas">
      <Container>
        <Stack direction="column" gap={1} style={{ marginBottom: "1.5rem" }}>
          <h1>Publica tu propiedad</h1>
          <p>Cuéntanos dónde está y qué características tiene — un asesor TPL te contacta por WhatsApp para coordinar los siguientes pasos.</p>
        </Stack>

        <Stack direction="row" gap={2} wrap style={{ marginBottom: "2rem" }}>
          {STEP_LABELS.map((label, index) => {
            const step = index + 1;
            return (
              <Badge key={step} variant={step === currentStep ? "accent" : step < currentStep ? "success" : "neutral"}>
                {step}. {label.titulo}
              </Badge>
            );
          })}
        </Stack>

        <Card>
          <Card.Body>
            {currentStep === 1 ? (
              <Stack direction="column" gap={4}>
                <div>
                  <h2 style={{ margin: 0 }}>Ubicación de tu propiedad</h2>
                  <p style={{ margin: "4px 0 0" }}>Con la ubicación calculamos distancias reales a ciudades y servicios.</p>
                </div>

                <Stack direction="row" gap={4} wrap>
                  <div style={{ flex: "1 1 240px" }}>
                    <label htmlFor="publicar-region" style={{ display: "block", fontWeight: 600, marginBottom: "6px" }}>
                      Región
                    </label>
                    <Select id="publicar-region" value={form.regionCode} onChange={(event) => handleRegionChange(event.target.value)}>
                      <option value="">Selecciona una región</option>
                      {REGIONS.map((region) => (
                        <option key={region.code} value={region.code}>
                          {region.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div style={{ flex: "1 1 240px" }}>
                    <label htmlFor="publicar-comuna" style={{ display: "block", fontWeight: 600, marginBottom: "6px" }}>
                      Comuna
                    </label>
                    <Select
                      id="publicar-comuna"
                      value={form.comuna}
                      onChange={(event) => handleComunaChange(event.target.value)}
                      disabled={!form.regionCode}
                    >
                      <option value="">{form.regionCode ? "Selecciona una comuna" : "Primero selecciona región"}</option>
                      {comunasDeLaRegion.map((comuna) => (
                        <option key={comuna.name} value={comuna.name}>
                          {comuna.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                </Stack>

                <div>
                  <label htmlFor="publicar-sector" style={{ display: "block", fontWeight: 600, marginBottom: "6px" }}>
                    Sector o localidad (opcional)
                  </label>
                  <Input
                    id="publicar-sector"
                    value={form.sector}
                    onChange={(event) => updateForm({ sector: event.target.value })}
                    placeholder="Ej. Río Claro, camino interior"
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: "6px" }}>Ubicación en el mapa</label>
                  <p style={{ margin: "0 0 8px", fontSize: "0.9rem" }}>Arrastra el marcador o haz clic en el punto exacto de tu propiedad.</p>
                  <ParcelMapPicker lat={form.lat} lng={form.lng} onChange={(lat, lng) => updateForm({ lat, lng })} />
                </div>
              </Stack>
            ) : null}

            {currentStep === 2 ? (
              <Stack direction="column" gap={4}>
                <div>
                  <h2 style={{ margin: 0 }}>Características del terreno</h2>
                  <p style={{ margin: "4px 0 0" }}>Solo pedimos lo que aporta a una primera evaluación.</p>
                </div>

                <div>
                  <label htmlFor="publicar-superficie" style={{ display: "block", fontWeight: 600, marginBottom: "6px" }}>
                    Superficie del terreno (m²)
                  </label>
                  <Input
                    id="publicar-superficie"
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={form.superficieM2Text}
                    onChange={(event) => updateForm({ superficieM2Text: event.target.value })}
                    placeholder="Ej. 5000"
                  />
                </div>

                <div>
                  <label htmlFor="publicar-rol" style={{ display: "block", fontWeight: 600, marginBottom: "6px" }}>
                    Situación del rol
                  </label>
                  <Select
                    id="publicar-rol"
                    value={form.rolPropio}
                    onChange={(event) => updateForm({ rolPropio: event.target.value as PublishWizardFormState["rolPropio"] })}
                  >
                    <option value="">Selecciona</option>
                    {ROL_PROPIO_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </div>

                <Stack direction="row" gap={4} wrap>
                  <div style={{ flex: "1 1 240px" }}>
                    <label htmlFor="publicar-agua" style={{ display: "block", fontWeight: 600, marginBottom: "6px" }}>
                      Factibilidad de agua
                    </label>
                    <Select
                      id="publicar-agua"
                      value={form.agua}
                      onChange={(event) => updateForm({ agua: event.target.value as PublishWizardFormState["agua"] })}
                    >
                      <option value="">Selecciona</option>
                      {AGUA_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div style={{ flex: "1 1 240px" }}>
                    <label htmlFor="publicar-luz" style={{ display: "block", fontWeight: 600, marginBottom: "6px" }}>
                      Factibilidad eléctrica
                    </label>
                    <Select
                      id="publicar-luz"
                      value={form.luz}
                      onChange={(event) => updateForm({ luz: event.target.value as PublishWizardFormState["luz"] })}
                    >
                      <option value="">Selecciona</option>
                      {LUZ_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                </Stack>
              </Stack>
            ) : null}

            {currentStep === 3 ? (
              <Stack direction="column" gap={4}>
                <div>
                  <h2 style={{ margin: 0 }}>Precio y tasación orientativa</h2>
                  <p style={{ margin: "4px 0 0" }}>El valor técnico final lo calcula un asesor TPL al revisar tu propiedad.</p>
                </div>

                <div>
                  <label htmlFor="publicar-precio" style={{ display: "block", fontWeight: 600, marginBottom: "6px" }}>
                    Precio que esperas obtener (CLP)
                  </label>
                  <Input
                    id="publicar-precio"
                    type="text"
                    inputMode="numeric"
                    value={form.precioEsperadoText}
                    onChange={(event) => updateForm({ precioEsperadoText: event.target.value })}
                    placeholder="Ej. 45.000.000"
                  />
                </div>

                <Card>
                  <Card.Body>
                    <Stack direction="column" gap={2}>
                      <strong>Referencia de mercado en {form.comuna || "tu comuna"}</strong>
                      {isLoadingReference ? (
                        <p style={{ margin: 0 }}>Calculando…</p>
                      ) : priceReference ? (
                        <p style={{ margin: 0 }}>
                          El precio promedio de {priceReference.sampleSize}{" "}
                          {priceReference.sampleSize === 1 ? "propiedad publicada" : "propiedades publicadas"} en{" "}
                          {priceReference.comuna} es <strong>{priceReference.averagePriceLabel}</strong>.
                        </p>
                      ) : (
                        <p style={{ margin: 0 }}>
                          Todavía no tenemos suficientes propiedades publicadas en {form.comuna || "esta comuna"} para mostrar una
                          referencia de mercado. Un asesor TPL calculará tu Valor TPL técnico al revisar tu propiedad.
                        </p>
                      )}
                    </Stack>
                  </Card.Body>
                </Card>
              </Stack>
            ) : null}

            {currentStep === 4 ? (
              <Stack direction="column" gap={4}>
                <div>
                  <h2 style={{ margin: 0 }}>Elige cómo quieres venderla</h2>
                  <p style={{ margin: "4px 0 0" }}>
                    Selecciona un plan y te escribimos por WhatsApp con el resumen de tu propiedad para coordinar los siguientes pasos.
                  </p>
                </div>

                <Stack direction="row" gap={4} wrap>
                  {PUBLISH_PLANS.map((plan) => (
                    <Card key={plan.codigo} style={{ flex: "1 1 220px" }}>
                      <Card.Body>
                        <Stack direction="column" gap={3}>
                          <div>
                            <h3 style={{ margin: 0 }}>{plan.nombre}</h3>
                            <strong style={{ fontSize: "1.4rem" }}>{plan.precioLabel}</strong>
                          </div>
                          <Button type="button" variant="whatsapp" onClick={() => handleElegirPlan(plan)}>
                            Elegir {plan.nombre}
                          </Button>
                        </Stack>
                      </Card.Body>
                    </Card>
                  ))}
                </Stack>
              </Stack>
            ) : null}

            {errorMessage ? (
              <p role="alert" style={{ color: "#a33a3a", marginTop: "1rem" }}>
                {errorMessage}
              </p>
            ) : null}

            {currentStep < TOTAL_STEPS ? (
              <Stack direction="row" gap={3} style={{ marginTop: "2rem" }}>
                {currentStep > 1 ? (
                  <Button type="button" variant="secondary" onClick={handlePrev}>
                    Atrás
                  </Button>
                ) : null}
                <Button type="button" variant="navy" onClick={handleNext}>
                  Continuar
                </Button>
              </Stack>
            ) : (
              <Stack direction="row" gap={3} style={{ marginTop: "2rem" }}>
                <Button type="button" variant="secondary" onClick={handlePrev}>
                  Atrás
                </Button>
              </Stack>
            )}
          </Card.Body>
        </Card>
      </Container>
    </Section>
  );
}
