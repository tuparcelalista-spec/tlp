(() => {
  "use strict";

  const BASE = "https://www.parcelalista.cl";
  const defaults = {
    siteName: "Tu Parcela Lista",
    suffix: "Ecosistema para tu proyecto de vida rural",
    description: "Encuentra parcelas y campos, compara alternativas, proyecta tu casa y conecta con servicios para desarrollar tu proyecto rural en Chile."
  };

  const normalize = (value) => String(value ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const truthy = (value) => value === true || ["si", "sí", "true", "1"].includes(normalize(value));
  const getParcelas = () => {
    try {
      if (Array.isArray(window.SERVER_PARCELAS)) return window.SERVER_PARCELAS;
      if (typeof parcelas !== "undefined" && Array.isArray(parcelas)) return parcelas;
    } catch (_) {}
    return Array.isArray(window.parcelas) ? window.parcelas : [];
  };
  const getCasas = () => {
    try { if (typeof casas !== "undefined" && Array.isArray(casas)) return casas; } catch (_) {}
    return Array.isArray(window.casas) ? window.casas : [];
  };
  const parcelImage = (p) => (Array.isArray(p?.imagenes) && p.imagenes.find(Boolean)) || p?.imagen || "";
  const houseImage = (h) => h?.foto || (Array.isArray(h?.imagenes) && h.imagenes.find(src => src && !normalize(src).includes("plano"))) || h?.imagen || "";
  const clp = (value) => {
    const n = typeof value === "number" ? value : Number(String(value || "").replace(/[^0-9]/g, ""));
    return n ? new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n) : "Consultar";
  };

  const upsertMeta = (attr, key, value) => {
    if (!value) return;
    let el = document.head.querySelector(`meta[${attr}="${key}"]`);
    if (!el) { el = document.createElement("meta"); el.setAttribute(attr, key); document.head.appendChild(el); }
    el.setAttribute("content", value);
  };
  const upsertLink = (rel, href) => {
    let el = document.head.querySelector(`link[rel="${rel}"]`);
    if (!el) { el = document.createElement("link"); el.rel = rel; document.head.appendChild(el); }
    el.href = href;
  };

  window.TPLSEO = {
    apply(opts = {}) {
      const title = opts.title || `${defaults.siteName} | ${defaults.suffix}`;
      const description = opts.description || defaults.description;
      const canonical = opts.canonical || `${BASE}${location.pathname === "/frontend-v2/index.html" ? "/" : location.pathname.replace("/frontend-v2", "")}`;
      const image = opts.image || `${BASE}/image/logo-tu-parcela-lista.png`;
      document.title = title;
      upsertMeta("name", "description", description);
      upsertMeta("name", "robots", opts.robots || "index,follow,max-image-preview:large");
      upsertMeta("property", "og:type", opts.type || "website");
      upsertMeta("property", "og:site_name", defaults.siteName);
      upsertMeta("property", "og:title", title);
      upsertMeta("property", "og:description", description);
      upsertMeta("property", "og:url", canonical);
      upsertMeta("property", "og:image", image);
      upsertMeta("name", "twitter:card", "summary_large_image");
      upsertMeta("name", "twitter:title", title);
      upsertMeta("name", "twitter:description", description);
      upsertMeta("name", "twitter:image", image);
      upsertLink("canonical", canonical);
      if (opts.schema) {
        let s = document.getElementById("tpl-seo-schema");
        if (!s) { s = document.createElement("script"); s.type = "application/ld+json"; s.id = "tpl-seo-schema"; document.head.appendChild(s); }
        s.textContent = JSON.stringify(opts.schema);
      }
    }
  };

  function saveParcelInterest(id) {
    if (!id) return;
    const p = getParcelas().find(item => String(item.id) === String(id));
    localStorage.setItem("selectedParcelaId", String(id));
    sessionStorage.setItem("tplLastParcelInterestId", String(id));
    if (p) {
      try {
        localStorage.setItem("selectedParcelaData", JSON.stringify(p));
        sessionStorage.setItem("tplLastParcelInterest", JSON.stringify(p));
      } catch (_) {}
    }
  }

  function saveHouseInterest(id) {
    if (!id) return;
    const h = getCasas().find(item => String(item.id) === String(id));
    localStorage.setItem("selectedCasaId", String(id));
    if (h) localStorage.setItem("selectedCasaData", JSON.stringify(h));
  }

  function findParcelFromPage() {
    const id = new URLSearchParams(location.search).get("id") || localStorage.getItem("selectedParcelaId");
    let p = getParcelas().find(item => String(item.id) === String(id));
    if (!p) {
      try {
        const stored = JSON.parse(localStorage.getItem("selectedParcelaData") || "null");
        if (stored && (!id || String(stored.id) === String(id))) p = stored;
      } catch (_) {}
    }
    return p || null;
  }

  function renderParcelInterestHero() {
    if (!/parcela\.html$/i.test(location.pathname)) return;
    const p = findParcelFromPage();
    if (!p) return;
    saveParcelInterest(p.id);

    const old = document.getElementById("tpl-parcel-interest");
    if (old) old.remove();

    const chips = [];
    if (truthy(p.facilidad)) chips.push("💰 Facilidad de pago");
    if (truthy(p.agua)) chips.push("💧 Agua / río / cuerpo de agua");
    if (truthy(p.luz)) chips.push("⚡ Electricidad / factibilidad");
    if (truthy(p.naturaleza)) chips.push("🌿 Naturaleza / nativas");
    if (truthy(p.rol)) chips.push("📄 Rol informado");
    if (truthy(p.servicios)) chips.push("📍 Servicios cercanos");

    const hero = document.createElement("section");
    hero.id = "tpl-parcel-interest";
    hero.className = "tpl-parcel-interest";
    const img = parcelImage(p);
    if (img) hero.style.setProperty("--tpl-selected-parcel-image", `url(${JSON.stringify(img)})`);
    hero.innerHTML = `
      <div class="tpl-parcel-interest__veil"></div>
      <div class="tpl-parcel-interest__inner">
        <div class="tpl-parcel-interest__copy">
          <span class="tpl-parcel-interest__eyebrow">LA PARCELA QUE TE INTERESÓ</span>
          <h1>${p.nombre || "Parcela seleccionada"}</h1>
          <p class="tpl-parcel-interest__meta"><strong>${p.precio || "Consultar"}</strong> · ${Number(p.tamano || 0).toLocaleString("es-CL")} m² · ${p.comuna || p.localidad || "Chile"}</p>
          <p class="tpl-parcel-interest__description">${p.descripcion || "Revisa sus principales atributos antes de continuar con tu proyecto."}</p>
          <div class="tpl-parcel-interest__chips">${chips.map(c => `<span>${c}</span>`).join("")}</div>
          <div class="tpl-parcel-interest__actions">
            <button type="button" data-tpl-scroll-detail>Ver toda la información</button>
            <button type="button" data-tpl-prefab>Sumar casa prefabricada</button>
            <button type="button" data-tpl-own-house>Ya tengo casa / diseño propio</button>
          </div>
        </div>
      </div>`;

    const header = document.querySelector("header");
    if (header?.parentNode) header.insertAdjacentElement("afterend", hero);
    else document.body.insertAdjacentElement("afterbegin", hero);

    hero.querySelector("[data-tpl-scroll-detail]")?.addEventListener("click", () => {
      const target = document.querySelector(".listing-layout, .listing-main, main, #property-detail, #detalle-parcela");
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    hero.querySelector("[data-tpl-prefab]")?.addEventListener("click", () => {
      localStorage.removeItem("tplOwnHouseMode");
      localStorage.setItem("tplReturnToCotizador", "casa");
      location.href = "index.html#casas-section";
    });
    hero.querySelector("[data-tpl-own-house]")?.addEventListener("click", () => {
      localStorage.setItem("tplOwnHouseMode", "si");
      localStorage.removeItem("selectedCasaId");
      localStorage.removeItem("selectedCasaData");
      location.href = "cotizador.html?mode=propia";
    });

    window.TPLSEO.apply({
      title: `${p.nombre || "Parcela"} | Tu Parcela Lista`,
      description: (p.descripcion || `Parcela de ${Number(p.tamano || 0).toLocaleString("es-CL")} m² en ${p.comuna || "Chile"}.`).replace(/<[^>]+>/g, " ").slice(0, 158),
      image: img ? `${BASE}/${img.replace(/^\//, "")}` : undefined
    });
  }

  function decorateIndexHero() {
    if (!/(^|\/)index\.html$/i.test(location.pathname) && !/frontend-v2\/?$/i.test(location.pathname)) return;
    const hero = document.querySelector(".tpl-emotional-hero");
    if (!hero) return;
    hero.classList.add("tpl-emotional-hero--story");
    hero.style.setProperty("--tpl-hero-photo-a", 'url("../image/publicar-parcela-fotografo-campo-v2.png")');
    hero.style.setProperty("--tpl-hero-photo-b", 'url("../image/hero-partners-construction.jpg")');
  }

  function preserveInterestClicks() {
    document.addEventListener("click", (event) => {
      const link = event.target.closest('a[href*="parcela.html?id="]');
      if (link) {
        try {
          const url = new URL(link.getAttribute("href"), location.href);
          saveParcelInterest(url.searchParams.get("id"));
        } catch (_) {}
      }
      const combo = event.target.closest(".combo-proposal-card");
      if (combo && event.target.closest(".combo-proposal-select")) {
        requestAnimationFrame(() => setTimeout(activateCompactSelectedProject, 80));
      }
    }, true);
  }

  function featureCount(type) {
    const list = getParcelas();
    const fn = {
      payment: p => truthy(p.facilidad),
      water: p => truthy(p.agua),
      native: p => truthy(p.naturaleza),
      light: p => truthy(p.luz)
    }[type];
    return fn ? list.filter(fn).length : 0;
  }

  function enhanceFilters() {
    if (!document.getElementById("parcelas-filters")) return;
    const configs = [
      ["filter-payment", "payment", "Facilidad de pago", "Parcelas cuyo propietario informa facilidad de pago"],
      ["filter-water", "water", "Agua / río", "Parcelas marcadas con agua: río, estero, laguna u otro cuerpo de agua informado"],
      ["filter-river", "light", "Con luz", "Parcelas con electricidad o factibilidad eléctrica informada"],
      ["filter-native", "native", "Naturaleza", "Parcelas marcadas con naturaleza, bosque o especies nativas"]
    ];
    configs.forEach(([id, type, label, title]) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.title = title;
      const icon = btn.querySelector("i")?.outerHTML || "";
      const count = featureCount(type);
      btn.innerHTML = `${icon}<span class="tpl-filter-copy">${label}</span><small class="tpl-filter-count">${count}</small>`;
      btn.dataset.tplFilterType = type;
      btn.addEventListener("click", () => {
        setTimeout(() => {
          const active = btn.classList.contains("active");
          const resultCount = document.getElementById("results-count")?.textContent || "";
          const subtitle = document.getElementById("search-subtitle");
          if (active && subtitle) subtitle.textContent = `${title}. ${resultCount}`;
        }, 120);
      });
    });

    const gps = document.getElementById("filter-gps");
    gps?.addEventListener("click", () => {
      let tries = 0;
      const timer = setInterval(() => {
        tries += 1;
        const st = window.state;
        if (st?.activeFilters?.gps && st?.userCoords) {
          clearInterval(timer);
          const mapBtn = document.getElementById("btn-map-view");
          const layout = document.getElementById("map-layout");
          if (mapBtn && layout?.classList.contains("map-hidden")) mapBtn.click();
        } else if (tries > 40) clearInterval(timer);
      }, 250);
    });
  }

  function addOwnHouseChoice() {
    const proposals = document.getElementById("combo-proposals-section");
    if (!proposals || document.getElementById("tpl-own-house-choice")) return;
    const head = proposals.querySelector(".combo-proposals-head") || proposals.firstElementChild;
    if (!head) return;
    const row = document.createElement("div");
    row.id = "tpl-own-house-choice";
    row.className = "tpl-own-house-choice";
    row.innerHTML = `
      <span>¿Ya tienes una casa o quieres un diseño propio?</span>
      <button type="button">Buscar solo la parcela</button>`;
    head.appendChild(row);
    row.querySelector("button")?.addEventListener("click", () => {
      localStorage.setItem("tplOwnHouseMode", "si");
      localStorage.removeItem("selectedCasaId");
      localStorage.removeItem("selectedCasaData");
      proposals.hidden = true;
      const title = document.getElementById("search-title");
      const sub = document.getElementById("search-subtitle");
      if (title) title.textContent = "Elige una parcela para tu casa propia";
      if (sub) sub.textContent = "Primero selecciona el lugar. Luego podrás cotizar diseño propio sin elegir una casa del catálogo.";
      document.getElementById("parcelas-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function activateCompactSelectedProject() {
    const parcel = window.state?.selectedParcela || (() => { try { return JSON.parse(localStorage.getItem("selectedParcelaData") || "null"); } catch (_) { return null; } })();
    const house = window.state?.selectedCasa || (() => { try { return JSON.parse(localStorage.getItem("selectedCasaData") || "null"); } catch (_) { return null; } })();
    if (!parcel || !house || localStorage.getItem("tplComboAutoInstallation") !== "si") return;

    const casasSection = document.getElementById("casas-section");
    if (!casasSection) return;
    casasSection.classList.add("tpl-combo-locked");

    let summary = document.getElementById("tpl-selected-combo-summary");
    if (!summary) {
      summary = document.createElement("section");
      summary.id = "tpl-selected-combo-summary";
      summary.className = "tpl-selected-combo-summary";
      const grid = document.getElementById("casas-container");
      grid?.parentNode?.insertBefore(summary, grid);
    }
    summary.innerHTML = `
      <div class="tpl-selected-combo-summary__media">
        <img src="${parcelImage(parcel)}" alt="${parcel.nombre || "Parcela"}">
        <img src="${houseImage(house)}" alt="${house.nombre || "Casa"}">
      </div>
      <div class="tpl-selected-combo-summary__body">
        <span>PROYECTO QUE ELEGISTE</span>
        <h3>${parcel.nombre || "Parcela"} + ${house.nombre || "Casa"}</h3>
        <p>${Number(parcel.tamano || 0).toLocaleString("es-CL")} m² de terreno · ${Number(house.metros || house.m2 || 0).toLocaleString("es-CL")} m² de casa · ${house.habitaciones || house.dormitorios || "—"} habitaciones</p>
        <div class="tpl-selected-combo-summary__actions">
          <button type="button" data-change-house>Quiero cambiar la casa</button>
          <button type="button" data-own-design>Prefiero diseño propio</button>
          <button type="button" data-go-quote>Continuar cotización</button>
        </div>
      </div>`;

    summary.querySelector("[data-change-house]")?.addEventListener("click", () => casasSection.classList.remove("tpl-combo-locked"));
    summary.querySelector("[data-own-design]")?.addEventListener("click", () => {
      localStorage.setItem("tplOwnHouseMode", "si");
      localStorage.removeItem("selectedCasaId");
      localStorage.removeItem("selectedCasaData");
      location.href = "cotizador.html?mode=propia";
    });
    summary.querySelector("[data-go-quote]")?.addEventListener("click", () => document.getElementById("cotizador-section")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function watchComboState() {
    if (!document.getElementById("casas-section")) return;
    addOwnHouseChoice();
    const observer = new MutationObserver(() => {
      addOwnHouseChoice();
      activateCompactSelectedProject();
    });
    observer.observe(document.getElementById("casas-section"), { subtree: true, childList: true, attributes: true, attributeFilter: ["hidden", "class"] });
    activateCompactSelectedProject();
  }

  function addMapQualityLabels() {
    const map = document.getElementById("map-layout");
    if (!map) return;
    map.classList.add("tpl-modern-map");
    const title = map.querySelector(".map-header, .map-title, .map-results-header");
    if (title && !title.querySelector(".tpl-map-kicker")) title.insertAdjacentHTML("afterbegin", '<span class="tpl-map-kicker">EXPLORA VISUALMENTE</span>');
  }

  function init() {
    decorateIndexHero();
    preserveInterestClicks();
    enhanceFilters();
    addOwnHouseChoice();
    watchComboState();
    addMapQualityLabels();
    renderParcelInterestHero();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
