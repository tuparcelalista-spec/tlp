(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const state = {
    method: "nearby",
    priority: "distance",
    coords: null,
    commune: "",
    visible: 9,
    active: false,
    map: null,
    mapReady: false
  };

  const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const money = (value) => {
    if (typeof value === "number") return value;
    return Number(String(value || "").replace(/[^0-9]/g, "")) || 0;
  };
  const catalog = () => {
    try { return Array.isArray(parcelas) ? parcelas.filter(Boolean) : []; }
    catch { return []; }
  };
  const houseCatalog = () => {
    try { return Array.isArray(casas) ? casas.filter(Boolean) : []; }
    catch { return []; }
  };
  const CLP = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
  const housePrice = (house) => money(house.valorCasa || house.precio || house.valor || house.precioBase || house.precio_base);
  const houseSize = (house) => Number(house.metros || house.m2 || house.superficie || 0);
  const houseRooms = (house) => Number(house.habitaciones || house.dormitorios || house.piezas || 0);
  const sizeOf = (p) => Number(p.tamano || p.metros || p.superficie || 0);
  const latOf = (p) => Number(p.lat || p.latitude || p.latitud || 0);
  const lngOf = (p) => Number(p.lng || p.lon || p.longitude || p.longitud || 0);
  const positive = (value) => {
    const text = normalize(value);
    return ["si", "true", "1", "disponible", "incluido", "con"].some((item) => text === item || text.includes(item));
  };
  const textOf = (p) => normalize([p.nombre, p.comuna, p.sector, p.descripcion, p.detalle, p.entorno, p.servicios].join(" "));
  const imageOf = (p) => p.imagen || p.foto || (Array.isArray(p.imagenes) ? p.imagenes[0] : "") || "./assets/logo-tu-parcela-lista.png";
  const absoluteAsset = (path) => {
    const value = String(path || "");
    if (/^(https?:)?\/\//i.test(value) || value.startsWith("data:")) return value;
    return `../${value.replace(/^\.?\//, "")}`;
  };
  const hasPayment = (p) => positive(p.facilidadPago) || positive(p.facilidad_pago) || positive(p.facilidad) || positive(p.pagoCuotas) || /cuotas|facilidad de pago|pie/i.test(textOf(p));
  const hasNature = (p) => positive(p.naturaleza) || /bosque|nativo|araucaria|naturaleza|rio|río|estero|laguna|lago|campo/i.test(textOf(p));
  const hasServices = (p) => positive(p.servicios_cerca) || positive(p.cercania_servicios) || /colegio|hospital|supermercado|comercio|centro|servicios|ruta|pueblo|minutos/i.test(textOf(p));
  const soilOf = (p) => p.tipoSuelo || p.tipo_suelo || p.suelo || p.topografia || p.terreno || "Información por confirmar";

  function distanceKm(lat1, lon1, lat2, lon2) {
    const toRad = (n) => n * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 6371 * 2 * Math.asin(Math.sqrt(a));
  }

  function distanceOf(p) {
    const lat = latOf(p), lng = lngOf(p);
    if (!state.coords || !lat || !lng) return Infinity;
    return distanceKm(state.coords.lat, state.coords.lng, lat, lng);
  }

  function populateCommunes() {
    const communes = [...new Set(catalog().map((p) => String(p.comuna || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
    $("commune-select").insertAdjacentHTML("beforeend", communes.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join(""));
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
  }

  function setMethod(method) {
    state.method = method;
    document.querySelectorAll("[data-method]").forEach((button) => button.classList.toggle("is-active", button.dataset.method === method));
    $("nearby-panel").hidden = method !== "nearby";
    $("commune-panel").hidden = method !== "commune";
    state.priority = method === "nearby" ? "distance" : "economic";
    syncPriorityButtons();
  }

  function syncPriorityButtons() {
    document.querySelectorAll("[data-priority]").forEach((button) => button.classList.toggle("is-active", button.dataset.priority === state.priority));
  }

  function getResults() {
    let list = [...catalog()];
    if (!state.active) return [];
    if (state.method === "commune") {
      list = list.filter((p) => normalize(p.comuna) === normalize(state.commune));
    } else {
      list = list.filter((p) => Number.isFinite(distanceOf(p)));
    }

    if (state.priority === "payment") list.sort((a, b) => Number(hasPayment(b)) - Number(hasPayment(a)) || fallbackOrder(a, b));
    else if (state.priority === "nature") list.sort((a, b) => Number(hasNature(b)) - Number(hasNature(a)) || fallbackOrder(a, b));
    else if (state.priority === "services") list.sort((a, b) => Number(hasServices(b)) - Number(hasServices(a)) || fallbackOrder(a, b));
    else if (state.priority === "economic") list.sort((a, b) => money(a.precio) - money(b.precio));
    else if (state.priority === "large") list.sort((a, b) => Number(sizeOf(b) >= 10000) - Number(sizeOf(a) >= 10000) || sizeOf(b) - sizeOf(a));
    else list.sort((a, b) => distanceOf(a) - distanceOf(b));

    return list;
  }

  function fallbackOrder(a, b) {
    if (state.method === "nearby") return distanceOf(a) - distanceOf(b);
    return money(a.precio) - money(b.precio);
  }

  function tagsOf(p) {
    const tags = [];
    if (hasPayment(p)) tags.push("Facilidad de pago");
    if (hasNature(p)) tags.push("Entorno natural");
    if (hasServices(p)) tags.push("Servicios cerca");
    if (positive(p.agua)) tags.push("Con agua");
    if (positive(p.luz) || positive(p.electricidad)) tags.push("Electricidad");
    if (sizeOf(p) >= 10000) tags.push("1 hectárea o más");
    return tags.slice(0, 4);
  }

  function contextFor(p) {
    const context = {
      method: state.method,
      priority: state.priority,
      commune: state.method === "commune" ? state.commune : String(p.comuna || ""),
      distance: Number.isFinite(distanceOf(p)) ? Math.round(distanceOf(p)) : null,
      lat: state.coords?.lat || null,
      lng: state.coords?.lng || null,
      parcelId: p.id || null,
      timestamp: Date.now()
    };
    return context;
  }

  function parcelUrl(p) {
    const context = contextFor(p);
    const params = new URLSearchParams({ id: String(p.id || "") });
    params.set("origen", context.method);
    params.set("prioridad", context.priority);
    if (context.commune) params.set("comuna", context.commune);
    if (context.distance !== null) params.set("distancia", String(context.distance));
    return `./parcela.html?${params.toString()}`;
  }

  function parcelCard(p, index) {
    const distance = distanceOf(p);
    const size = sizeOf(p);
    const type = size >= 10000 ? "Campo" : "Parcela";
    const tags = tagsOf(p);
    const distanceBadge = Number.isFinite(distance) ? `<span class="parcel-distance">A ${Math.round(distance)} km de ti</span>` : "";
    const fetch = index === 0 ? 'fetchpriority="high"' : 'loading="lazy" fetchpriority="low"';
    return `<article class="parcel-card">
      <div class="parcel-image">
        <img src="${escapeHtml(absoluteAsset(imageOf(p)))}" alt="${escapeHtml(p.nombre || `${type} en ${p.comuna || "Chile"}`)}" width="640" height="480" decoding="async" ${fetch}>
        ${distanceBadge}
        <span class="parcel-price">${escapeHtml(p.precio || "Consultar precio")}</span>
      </div>
      <div class="parcel-body">
        <h3>${escapeHtml(p.nombre || `${type} en ${p.comuna || "Chile"}`)}</h3>
        <div class="parcel-facts">
          <span>${escapeHtml(p.comuna || "Comuna por confirmar")}</span>
          <span>${size ? `${size.toLocaleString("es-CL")} m²` : "Superficie por confirmar"}</span>
          <span>${escapeHtml(type)}</span>
          <span>${escapeHtml(soilOf(p))}</span>
        </div>
        <div class="parcel-tags">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
        <a class="parcel-link" data-open-parcel="${escapeHtml(p.id || "")}" href="${escapeHtml(parcelUrl(p))}">Ver esta parcela</a>
      </div>
    </article>`;
  }

  function render({ scroll = false } = {}) {
    const list = getResults();
    const visible = list.slice(0, state.visible);
    $("parcel-grid").innerHTML = visible.length ? visible.map(parcelCard).join("") : `<div class="empty-state">${state.active ? "No encontramos parcelas para esta búsqueda." : "Elige Cercanas a mí o selecciona una comuna para comenzar."}</div>`;
    $("results-count").textContent = state.active ? `${list.length} ${list.length === 1 ? "parcela encontrada" : "parcelas encontradas"}` : "Selecciona una búsqueda para ver resultados";
    $("load-more").hidden = visible.length >= list.length;
    $("map-button").disabled = !list.some((p) => latOf(p) && lngOf(p));
    if (state.method === "nearby" && state.active) $("search-context").textContent = "Ordenadas desde tu ubicación actual";
    else if (state.method === "commune" && state.active) $("search-context").textContent = `Resultados en ${state.commune}`;
    else $("search-context").textContent = "Selecciona cómo quieres buscar";
    if (state.mapReady && !$("map-panel").hidden) paintMap(list);
    if (scroll) scrollToResults();
  }

  function scrollToResults() {
    requestAnimationFrame(() => {
      const target = $("scroll-anchor");
      const top = target.getBoundingClientRect().top + window.scrollY - 92;
      window.scrollTo({ top, behavior: "smooth" });
    });
  }

  function locate() {
    if (!navigator.geolocation) {
      $("location-status").textContent = "Tu navegador no permite obtener ubicación.";
      return;
    }
    $("location-status").textContent = "Calculando tu ubicación…";
    $("locate-button").disabled = true;
    navigator.geolocation.getCurrentPosition((position) => {
      state.coords = { lat: position.coords.latitude, lng: position.coords.longitude };
      state.active = true;
      state.visible = 9;
      state.priority = "distance";
      syncPriorityButtons();
      $("location-status").textContent = "Ubicación lista. Mostrando las parcelas más cercanas.";
      $("locate-button").disabled = false;
      render({ scroll: true });
    }, (error) => {
      const messages = {1:"No autorizaste la ubicación.",2:"No pudimos obtener tu ubicación.",3:"La búsqueda de ubicación tardó demasiado."};
      $("location-status").textContent = messages[error.code] || "No fue posible usar tu ubicación.";
      $("locate-button").disabled = false;
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
  }

  function searchCommune() {
    const commune = $("commune-select").value;
    if (!commune) { $("commune-select").focus(); return; }
    state.commune = commune;
    state.active = true;
    state.visible = 9;
    state.priority = "economic";
    syncPriorityButtons();
    render({ scroll: true });
  }

  function saveContext(id) {
    const parcel = catalog().find((p) => String(p.id) === String(id));
    if (!parcel) return;
    sessionStorage.setItem("tpl_search_context", JSON.stringify(contextFor(parcel)));
  }

  function loadLeaflet() {
    if (window.L) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(css);
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async function openMap() {
    $("map-panel").hidden = false;
    try {
      await loadLeaflet();
      if (!state.map) state.map = L.map("map", { scrollWheelZoom: false });
      state.mapReady = true;
      paintMap(getResults());
      setTimeout(() => state.map.invalidateSize(), 50);
    } catch {
      $("map").innerHTML = '<div class="empty-state">No fue posible cargar el mapa.</div>';
    }
  }

  function paintMap(list) {
    if (!state.map || !window.L) return;
    state.map.eachLayer((layer) => state.map.removeLayer(layer));
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(state.map);
    const bounds = [];
    list.forEach((p) => {
      const lat = latOf(p), lng = lngOf(p);
      if (!lat || !lng) return;
      const marker = L.marker([lat, lng]).addTo(state.map);
      marker.bindPopup(`<strong>${escapeHtml(p.nombre || "Parcela")}</strong><br>${escapeHtml(p.comuna || "")}<br><a href="${escapeHtml(parcelUrl(p))}" data-map-parcel="${escapeHtml(p.id || "")}">Ver parcela</a>`);
      bounds.push([lat, lng]);
    });
    if (state.coords) {
      L.circleMarker([state.coords.lat, state.coords.lng], { radius: 8 }).addTo(state.map).bindPopup("Tu ubicación");
      bounds.push([state.coords.lat, state.coords.lng]);
    }
    if (bounds.length) state.map.fitBounds(bounds, { padding: [35, 35], maxZoom: 12 });
    else state.map.setView([-36.8, -73.05], 7);
  }


  function shuffle(list) {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function comboCandidates(budget) {
    const parcelsAvailable = catalog().filter((parcel) => money(parcel.precio) > 0);
    const housesAvailable = houseCatalog().filter((house) => housePrice(house) > 0);
    const combinations = [];

    parcelsAvailable.forEach((parcel) => {
      housesAvailable.forEach((house) => {
        const parcelValue = money(parcel.precio);
        const houseValue = housePrice(house);
        const total = parcelValue + houseValue;
        const difference = total - budget;
        const ratio = budget ? total / budget : 0;
        combinations.push({ parcel, house, parcelValue, houseValue, total, difference, ratio, score: Math.abs(difference) });
      });
    });

    const compatible = combinations
      .filter((item) => item.ratio >= .72 && item.ratio <= 1.08)
      .sort((a, b) => a.score - b.score);
    const source = compatible.length >= 6 ? compatible : combinations.sort((a, b) => a.score - b.score);
    const pool = source.slice(0, Math.min(36, source.length));
    const randomized = shuffle(pool);
    const selected = [];
    const used = new Set();

    randomized.forEach((item) => {
      if (selected.length >= 6) return;
      const key = `${item.parcel.id || item.parcel.nombre}-${item.house.id || item.house.nombre}`;
      if (used.has(key)) return;
      used.add(key);
      selected.push(item);
    });

    return selected.sort((a, b) => a.score - b.score);
  }

  function comboCard(item, index, budget) {
    const parcel = item.parcel;
    const house = item.house;
    const size = sizeOf(parcel);
    const parcelId = String(parcel.id || "");
    const houseId = String(house.id || "");
    const parcelParams = new URLSearchParams({ id: parcelId, origen: "presupuesto-combo", prioridad: "precio-total" });
    const quoteParams = new URLSearchParams({ parcela: parcelId, casa: houseId, tipo: "prefabricada", presupuesto: String(budget), origen: "frontend-v2" });
    const difference = budget - item.total;
    const differenceLabel = difference >= 0 ? `Te quedan ${CLP.format(difference)}` : `Supera por ${CLP.format(Math.abs(difference))}`;
    const rank = index === 0 ? "Más cercana a tu presupuesto" : `Alternativa ${index + 1}`;
    return `<article class="combo-card">
      <div class="combo-visual">
        <span class="combo-rank">${escapeHtml(rank)}</span>
        <figure><img src="${escapeHtml(absoluteAsset(imageOf(parcel)))}" alt="${escapeHtml(parcel.nombre || "Parcela")}" width="640" height="480" decoding="async" ${index === 0 ? 'fetchpriority="high"' : 'loading="lazy"'}><figcaption>Parcela</figcaption></figure>
        <figure><img src="${escapeHtml(absoluteAsset(imageOf(house)))}" alt="${escapeHtml(house.nombre || "Casa prefabricada")}" width="440" height="480" loading="lazy" decoding="async"><figcaption>Casa</figcaption></figure>
      </div>
      <div class="combo-card-body">
        <h3>${escapeHtml(parcel.nombre || "Parcela")} + ${escapeHtml(house.nombre || "Casa prefabricada")}</h3>
        <p class="combo-location">${escapeHtml(parcel.comuna || "Comuna por confirmar")}</p>
        <div class="combo-specs">
          <span>${size ? `${size.toLocaleString("es-CL")} m² de terreno` : "Superficie por confirmar"}</span>
          <span>${houseSize(house) ? `${houseSize(house)} m² de casa` : "Casa prefabricada"}</span>
          <span>${houseRooms(house) ? `${houseRooms(house)} dormitorios` : "Dormitorios por confirmar"}</span>
          <span>Instalación según modelo y zona</span>
        </div>
        <div class="combo-total">
          <div><small>Proyecto referencial</small><strong>${CLP.format(item.total)}</strong></div>
          <span class="combo-difference ${difference >= 0 ? "is-under" : "is-over"}">${escapeHtml(differenceLabel)}</span>
        </div>
        <div class="combo-actions">
          <a class="combo-secondary" href="./parcela.html?${parcelParams.toString()}">Ver parcela</a>
          <a class="combo-primary" href="./cotizador.html?${quoteParams.toString()}">Cotizar proyecto</a>
        </div>
      </div>
    </article>`;
  }

  function renderComboResults(budget, { scroll = true } = {}) {
    const wrap = $("combo-results-wrap");
    const grid = $("combo-grid");
    const housesAvailable = houseCatalog().filter((house) => housePrice(house) > 0);
    if (!housesAvailable.length) {
      wrap.hidden = false;
      grid.innerHTML = '<div class="combo-empty">No encontramos casas con precio en <strong>casas.js</strong>. Revisa que ese archivo esté en la raíz del proyecto y cargue antes de index.js.</div>';
      $("combo-results-summary").textContent = "No fue posible crear combinaciones todavía.";
      return;
    }
    const results = comboCandidates(budget);
    wrap.hidden = false;
    grid.innerHTML = results.length ? results.map((item, index) => comboCard(item, index, budget)).join("") : '<div class="combo-empty">No encontramos combinaciones con precios válidos para este presupuesto.</div>';
    $("combo-results-summary").textContent = results.length ? `${results.length} combinaciones seleccionadas cerca de ${CLP.format(budget)}.` : "Prueba con otro presupuesto.";
    state.comboBudget = budget;
    if (scroll) requestAnimationFrame(() => {
      const top = wrap.getBoundingClientRect().top + window.scrollY - 92;
      window.scrollTo({ top, behavior: "smooth" });
    });
  }

  function searchComboBudget(event) {
    event?.preventDefault();
    const budget = money($("combo-budget-input").value);
    if (!budget) { $("combo-budget-input").focus(); return; }
    renderComboResults(budget);
  }

  document.addEventListener("DOMContentLoaded", () => {
    populateCommunes();
    render();

    $("combo-budget-input").addEventListener("input", (event) => {
      const value = money(event.target.value);
      event.target.value = value ? value.toLocaleString("es-CL") : "";
    });
    $("combo-budget-form").addEventListener("submit", searchComboBudget);
    document.querySelectorAll("[data-combo-budget]").forEach((button) => button.addEventListener("click", () => {
      const value = Number(button.dataset.comboBudget || 0);
      $("combo-budget-input").value = value.toLocaleString("es-CL");
      renderComboResults(value);
    }));
    $("combo-refresh").addEventListener("click", () => { if (state.comboBudget) renderComboResults(state.comboBudget, { scroll: false }); });

    document.querySelectorAll("[data-method]").forEach((button) => button.addEventListener("click", () => setMethod(button.dataset.method)));
    document.querySelectorAll("[data-priority]").forEach((button) => button.addEventListener("click", () => {
      state.priority = button.dataset.priority;
      state.visible = 9;
      syncPriorityButtons();
      render({ scroll: state.active });
    }));

    $("locate-button").addEventListener("click", locate);
    $("commune-search-button").addEventListener("click", searchCommune);
    $("commune-select").addEventListener("change", () => { if ($("commune-select").value) searchCommune(); });
    $("load-more").addEventListener("click", () => { state.visible += 9; render(); });
    $("map-button").addEventListener("click", openMap);
    $("map-close").addEventListener("click", () => { $("map-panel").hidden = true; });
    $("menu-toggle").addEventListener("click", () => {
      const open = $("mobile-menu").hidden;
      $("mobile-menu").hidden = !open;
      $("menu-toggle").setAttribute("aria-expanded", String(open));
    });

    document.addEventListener("click", (event) => {
      const link = event.target.closest("[data-open-parcel], [data-map-parcel]");
      if (link) saveContext(link.dataset.openParcel || link.dataset.mapParcel);
    });
  });
})();
