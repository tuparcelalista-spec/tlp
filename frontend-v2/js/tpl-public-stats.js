(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const fmt = (n) =>
    new Intl.NumberFormat("es-CL").format(Math.max(0, Number(n || 0)));

  function readArray(candidates) {
    for (const key of candidates) {
      const value = window[key];
      if (Array.isArray(value)) return value;
    }
    return [];
  }

  function getParcelCatalog() {
    if (typeof parcelas !== "undefined" && Array.isArray(parcelas)) return parcelas;

    const unified = readArray(["parcelas"]);
    if (unified.length) return unified;

    const portal = readArray(["parcelasPortal"]);
    const duenos = readArray(["parcelasDuenos"]);
    return [...portal, ...duenos];
  }

  function getHouseCatalog() {
    if (typeof casas !== "undefined" && Array.isArray(casas)) return casas;
    return readArray(["casas"]);
  }

  function countCompanies(houses) {
    const companies = new Set();

    houses.forEach((house) => {
      const raw =
        house?.empresa ??
        house?.proveedor ??
        house?.marca ??
        house?.fabricante ??
        "";

      const value = String(raw).trim().toLowerCase();
      if (value) companies.add(value);
    });

    return companies.size;
  }

  function currentCounts() {
    const parcels = getParcelCatalog();
    const houses = getHouseCatalog();

    return {
      parcelas: parcels.length,
      casas: houses.length,
      empresas: countCompanies(houses),
      proyectos: null,
      visitas: null
    };
  }

  function animateNumber(valueEl, target) {
    const reduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    if (reduced || target < 2) {
      valueEl.textContent = fmt(target);
      return;
    }

    const duration = 650;
    const start = performance.now();

    const animate = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      valueEl.textContent = fmt(Math.round(target * eased));

      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }

  function render(data) {
    document.querySelectorAll("[data-tpl-stat]").forEach((el) => {
      const key = el.dataset.tplStat;
      const valueEl = el.querySelector(".tpl-public-stat__value");
      if (!valueEl) return;

      if (data[key] == null) {
        valueEl.textContent = "--";
        el.classList.add("is-pending");
        return;
      }

      el.classList.remove("is-pending");
      animateNumber(valueEl, Number(data[key] || 0));
    });
  }

  function init() {
    render(currentCounts());

    const note = $("[data-tpl-stats-note]");
    if (note) {
      note.textContent =
        "Catálogo actual. Proyectos y visitas mostrarán datos reales al conectar Analytics y el nuevo Supabase.";
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
