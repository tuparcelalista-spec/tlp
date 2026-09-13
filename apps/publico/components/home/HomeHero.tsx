"use client";

import { useState, useRef, type FormEvent } from "react";
import { runPropertySearch } from "../../lib/search/actions";
import type { SearchViewModel } from "../../lib/search/presentation";
import { SearchResultCard, SearchProjectCombinationCard } from "../search/SearchResultCard";
import { homeHeroCss } from "./homeHero.css";
import { Container, Grid, Badge, Button } from "@tpl/ui";

function formatCLP(n: number): string {
  return new Intl.NumberFormat("es-CL").format(Math.max(0, Math.round(n)));
}

function parseMoney(raw: string): number {
  const digits = raw.replace(/\D/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

export interface HomeHeroProps {
  initialCommunes: string[];
}

export function HomeHero({ initialCommunes }: HomeHeroProps) {
  const [method, setMethod] = useState<"nearby" | "commune">("nearby");
  const [commune, setCommune] = useState<string>("");
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);

  const [budgetText, setBudgetText] = useState<string>("");
  const [activeQuickBudget, setActiveQuickBudget] = useState<number | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [viewModel, setViewModel] = useState<SearchViewModel | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  const resultsRef = useRef<HTMLDivElement>(null);

  function scrollToResults() {
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  // --- Búsqueda Paso 1: Cercanía GPS ---
  function handleNearbySearch() {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setLocationStatus("Tu navegador no soporta geolocalización.");
      return;
    }
    setIsLocating(true);
    setLocationStatus("Obteniendo tu ubicación GPS...");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsLocating(false);
        setLocationStatus("Ubicación obtenida. Buscando parcelas cercanas...");
        setIsLoading(true);
        try {
          const origin = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          const vm = await runPropertySearch({
            filters: { intent: "property" },
            ranking: { criterion: "distance", origin },
            origin,
          });
          setViewModel(vm);
          setHasSearched(true);
          scrollToResults();
        } catch (err) {
          setLocationStatus("Ocurrió un error al buscar por cercanía.");
        } finally {
          setIsLoading(false);
        }
      },
      (geoErr) => {
        setIsLocating(false);
        const msgs: Record<number, string> = {
          1: "No autorizaste el acceso a tu ubicación GPS.",
          2: "No fue posible determinar tu ubicación actual.",
          3: "La solicitud de ubicación tardó demasiado.",
        };
        setLocationStatus(msgs[geoErr.code] || "Error al obtener ubicación.");
      },
      { timeout: 10000, maximumAge: 300000 }
    );
  }

  // --- Búsqueda Paso 1: Por Comuna ---
  async function handleCommuneSearch() {
    setIsLoading(true);
    try {
      const vm = await runPropertySearch({
        filters: { intent: "property", commune: commune || undefined },
        ranking: { criterion: "economic" },
      });
      setViewModel(vm);
      setHasSearched(true);
      scrollToResults();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  // --- Búsqueda Paso 2: Presupuesto Combo (Parcela + Casa) ---
  async function executeComboSearch(budgetNumber: number) {
    if (budgetNumber <= 0) return;
    setIsLoading(true);
    try {
      const vm = await runPropertySearch({
        filters: { intent: "project", totalBudget: budgetNumber, commune: commune || undefined },
      });
      setViewModel(vm);
      setHasSearched(true);
      scrollToResults();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  function handleQuickBudgetClick(amount: number) {
    setActiveQuickBudget(amount);
    setBudgetText(formatCLP(amount));
    void executeComboSearch(amount);
  }

  function handleBudgetFormSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const amount = parseMoney(budgetText);
    if (amount > 0) {
      void executeComboSearch(amount);
    }
  }

  function handleBudgetInputChange(raw: string) {
    const val = parseMoney(raw);
    setBudgetText(val > 0 ? formatCLP(val) : "");
    setActiveQuickBudget(val);
  }

  function handleClearResults() {
    setViewModel(null);
    setHasSearched(false);
    setLocationStatus(null);
  }

  return (
    <>
      <style>{homeHeroCss}</style>

      {/* Hero Fotográfico con Consola de Doble Panel */}
      <section className="tpl-home-hero" aria-label="Buscador principal Tu Parcela Lista">
        <img
          src="/assets/hero-familia-casa-campo-premium.webp"
          alt="Familia en parcela de campo en Chile"
          className="tpl-home-hero__bg"
          loading="eager"
        />
        <div className="tpl-home-hero__shade" aria-hidden="true" />

        <div className="tpl-home-hero__inner">
          <h1 className="tpl-home-hero__h1-seo">Parcelas y campos en venta en Chile | Tu Parcela Lista</h1>

          <div className="tpl-home-search-widget">
            {/* PANEL 1: ¿Dónde buscas tu parcela? */}
            <div className="tpl-home-widget-panel">
              <h3>
                <span className="tpl-home-widget-step" aria-hidden="true">1</span>
                <span>¿Dónde buscas tu parcela?</span>
              </h3>

              <div className="tpl-home-search-methods" role="group" aria-label="Método de búsqueda de parcela">
                <button
                  type="button"
                  className={`tpl-home-search-method ${method === "nearby" ? "is-active" : ""}`}
                  onClick={() => setMethod("nearby")}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z" />
                    <circle cx="12" cy="10" r="2.5" />
                  </svg>
                  <strong>Cerca de ti</strong>
                </button>

                <button
                  type="button"
                  className={`tpl-home-search-method ${method === "commune" ? "is-active" : ""}`}
                  onClick={() => setMethod("commune")}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 3.5-5.5 2.6v14L9 17.4l6 3.1 5.5-2.6v-14L15 6.6Z" />
                    <path d="M9 3.5v13.9M15 6.6v13.9" />
                  </svg>
                  <strong>Por Comuna</strong>
                </button>
              </div>

              {method === "nearby" ? (
                <div>
                  <p className="tpl-home-method-hint">
                    Activa tu ubicación GPS y ordenamos el catálogo por distancia y cercanía real.
                  </p>
                  <button
                    type="button"
                    className="tpl-home-primary-btn"
                    onClick={handleNearbySearch}
                    disabled={isLocating || isLoading}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3.5" />
                      <circle cx="12" cy="12" r="8" />
                      <path d="M12 2v2.5M12 19.5V22M22 12h-2.5M4.5 12H2" />
                    </svg>
                    <span>{isLocating ? "Obteniendo ubicación..." : "Mostrar parcelas cercanas"}</span>
                  </button>
                  {locationStatus && (
                    <small style={{ display: "block", marginTop: "10px", color: "rgba(255,255,255,0.8)", fontSize: "0.85rem" }}>
                      {locationStatus}
                    </small>
                  )}
                </div>
              ) : (
                <div>
                  <p className="tpl-home-method-hint">
                    Elige la comuna de Chile donde te imaginas viviendo o invirtiendo.
                  </p>
                  <div className="tpl-home-field-shell">
                    <select
                      className="tpl-home-select"
                      aria-label="Seleccionar comuna"
                      value={commune}
                      onChange={(e) => setCommune(e.target.value)}
                    >
                      <option value="">Todas las comunas disponibles</option>
                      {initialCommunes.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    className="tpl-home-primary-btn"
                    onClick={handleCommuneSearch}
                    disabled={isLoading}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="6.5" />
                      <path d="m16 16 4.5 4.5" />
                    </svg>
                    <span>Ver parcelas disponibles</span>
                  </button>
                </div>
              )}
            </div>

            {/* DIVISOR DE CONSOLA */}
            <hr className="tpl-home-widget-divider" aria-hidden="true" />

            {/* PANEL 2: ¿Buscas proyecto de vivienda? (Presupuesto combo) */}
            <div className="tpl-home-widget-panel">
              <h3>
                <span className="tpl-home-widget-step" aria-hidden="true">2</span>
                <span>¿Buscas proyecto de vivienda?</span>
                <small>Opcional</small>
              </h3>

              <form onSubmit={handleBudgetFormSubmit}>
                <div className="tpl-home-field-shell tpl-home-budget-input-wrap">
                  <b>$</b>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Presupuesto total (Terreno + Casa)"
                    aria-label="Presupuesto total en pesos chilenos"
                    value={budgetText}
                    onChange={(e) => handleBudgetInputChange(e.target.value)}
                  />
                  <span className="tpl-home-budget-unit">CLP</span>
                </div>

                <div className="tpl-home-budget-quick" aria-label="Presupuestos rápidos sugeridos">
                  {[10000000, 25000000, 35000000, 50000000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      className={activeQuickBudget === val ? "is-active" : ""}
                      onClick={() => handleQuickBudgetClick(val)}
                    >
                      ${val / 1000000}M
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  className="tpl-home-combo-search-btn"
                  disabled={isLoading}
                >
                  <span>Ver proyectos compatibles</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* RESULTADOS EN VIVO DE LA CONSOLA HERO (SE DESPLIEGA AL BUSCAR) */}
      <div ref={resultsRef}>
        {hasSearched && viewModel && (
          <section style={{ padding: "48px 0", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
            <Container>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
                <div>
                  <Badge variant="accent">
                    {viewModel.mode === "project" ? "PROYECTOS COMPATIBLES" : "RESULTADOS DE BÚSQUEDA"}
                  </Badge>
                  <h2 style={{ fontSize: "1.8rem", margin: "8px 0 4px", color: "#132437" }}>
                    {viewModel.mode === "project"
                      ? `${viewModel.totalCount} alternativas para imaginar tu proyecto`
                      : `${viewModel.totalCount} parcelas encontradas`}
                  </h2>
                  <p style={{ color: "#64748b", margin: 0, fontSize: "0.95rem" }}>
                    {viewModel.mode === "project"
                      ? `Combinaciones de terreno + vivienda calculadas cerca de tu presupuesto.`
                      : `Ordenadas según tus criterios de búsqueda.`}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <Button variant="secondary" onClick={handleClearResults}>
                    Cerrar resultados
                  </Button>
                  <Button href="/propiedades" variant="navy">
                    Explorar catálogo completo →
                  </Button>
                </div>
              </div>

              {viewModel.mode === "project" ? (
                <Grid columns={{ mobile: 1, tablet: 1, desktop: 2 }}>
                  {viewModel.items.map((comb) => (
                    <SearchProjectCombinationCard key={`${comb.property.id}-${comb.houseName}`} combination={comb} />
                  ))}
                </Grid>
              ) : (
                <Grid columns={{ mobile: 1, tablet: 2, desktop: 3 }}>
                  {viewModel.items.map((card) => (
                    <SearchResultCard key={card.id} card={card} />
                  ))}
                </Grid>
              )}
            </Container>
          </section>
        )}
      </div>

      {/* VIDEO CORPORATIVO TPL */}
      <section className="tpl-home-video-section" aria-labelledby="tpl-video-title">
        <div className="tpl-home-video-grid">
          <div className="tpl-home-video-copy">
            <span style={{ fontSize: "0.8rem", fontWeight: 800, letterSpacing: "0.1em", color: "#f97316", textTransform: "uppercase" }}>
              ASÍ SOMOS
            </span>
            <h2 id="tpl-video-title">Conoce Tu Parcela Lista</h2>
            <p>
              Conectamos personas con su parcela ideal, y acompañamos el proyecto completo:
              terreno, vivienda prefabricada o a medida y servicios en un solo lugar.
            </p>
            <a href="/cotizador" className="tpl-home-video-link">
              Diseña tu proyecto en el Cotizador &rarr;
            </a>
          </div>

          <div className="tpl-home-video-player-wrap">
            <iframe
              src="https://www.youtube.com/embed/G_t1VvNcNv8?modestbranding=1&rel=0"
              title="Tu Parcela Lista Video Oficial"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </div>
      </section>
    </>
  );
}
