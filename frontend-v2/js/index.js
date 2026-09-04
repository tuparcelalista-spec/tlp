(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const state = {
    method: "nearby",
    priority: "economic",
    coords: null,
    commune: "",
    visible: 20,
    active: false,
    map: null,
    mapReady: false
  };

  const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const money = (value) => {
    if (typeof value === "number") return value;
    return Number(String(value || "").replace(/[^0-9]/g, "")) || 0;
  };
  /**
   * Tasacion canonica guardada, la misma que lee la ficha publica
   * (js/parcela.js -> valoracionGuardada). La portada NO calcula: el motor
   * espera su propio vocabulario (area, electricity, nature[], *DistanceKm) y
   * la fila del catalogo habla otro (tamano, luz, naturaleza), asi que
   * llamarlo con el registro crudo devuelve la base pelada de superficie sin
   * un solo ajuste reconocido y sin avisar.
   *
   * Devuelve null cuando no hay tasacion guardada: sin dato no se muestra
   * insignia ni porcentaje, se omiten.
   */
  function valoracionGuardada(parcel) {
    if (!parcel) return null;

    let meta = parcel.metadata;
    if (typeof meta === "string") {
      try { meta = JSON.parse(meta); } catch { meta = null; }
    }
    const guardado = meta || {};

    // metadata manda sobre la raiz: el registro de la tarjeta mezcla el
    // catalogo local con Supabase, y el catalogo puede traer cifras de un
    // motor anterior en esas mismas claves.
    const num = (...claves) => {
      for (const clave of claves) {
        const valor = Number(guardado[clave] ?? parcel[clave]);
        if (Number.isFinite(valor) && valor > 0) return valor;
      }
      return 0;
    };

    const recomendado = num("valor_tpl_recomendado", "valor_tpl_tasador_ajustado", "valor_tpl_tasador");
    if (!recomendado) return null;

    return {
      valorRecomendado: recomendado,
      valorComunalBase: num("valor_comunal", "valor_promedio_comunal"),
      valorTecnico: num("valor_tpl_tecnico"),
      valorVentaApuro: num("valor_venta_apuro"),
      valorM2: num("valor_tpl_m2"),
      referenciaComunalM2: num("referencia_comunal_m2")
    };
  }

  /**
   * La tasacion guardada con los nombres que espera el segundo parametro de
   * analyzeProperty(). Antes se le pasaba null, asi que el analizador se
   * quedaba sin precio de referencia: el factor "precio" (40% del puntaje)
   * caia siempre en su valor neutro de 60 y la insignia terminaba decidiendose
   * por texto de acceso y entorno.
   */
  function valoracionParaAnalizador(parcel) {
    const datos = valoracionGuardada(parcel);
    if (!datos) return null;
    return {
      precio_publicado: parcel.precioNumero || money(parcel.precio),
      valor_tpl_tasador: datos.valorRecomendado,
      valor_tpl_tasador_ajustado: datos.valorTecnico || datos.valorRecomendado,
      valor_comunal: datos.valorComunalBase,
      valor_venta_apuro: datos.valorVentaApuro
    };
  }

  let remoteCatalog = [];
  const catalog = () => {
    try {
      const local = (typeof parcelas !== "undefined" && Array.isArray(parcelas)) ? parcelas.filter(Boolean) : [];
      if (!remoteCatalog.length) return local;
      const seen = new Set(remoteCatalog.map((item) => normalize(item.id || item.codigo)));
      return [...remoteCatalog, ...local.filter((item) => !seen.has(normalize(item.id || item.codigo)))];
    } catch { return remoteCatalog; }
  };

  // La normalización de una fila remota (tpl_propiedades) a objeto "parcela"
  // vive ahora en un único lugar: js/core/tpl-property-view.js
  // (TPLPropertyView.normalizarPropiedad), compartido con js/parcela.js.
  // Antes cada pantalla tenia su propia copia de esta logica y divergian
  // (ver fix de fotos 2026-09-03). Se mantiene un respaldo minimo por si el
  // script no llegase a cargar, para no dejar la grilla en blanco.
  function mapRemoteProperty(row) {
    if (window.TPLPropertyView?.normalizarPropiedad) {
      return window.TPLPropertyView.normalizarPropiedad(row, {
        catalogoLocal: (typeof parcelas !== "undefined" && Array.isArray(parcelas)) ? parcelas : [],
      });
    }
    console.warn('TPL Index: TPLPropertyView no está cargado; usando normalización mínima de respaldo.');
    const precioValue = Number(row.precio_publicado) || 0;
    return {
      id: row.codigo || row.id,
      canonicalId: row.id,
      codigo: row.codigo || '',
      nombre: row.titulo || `Parcela en ${row.comuna || 'Chile'}`,
      comuna: row.comuna || '',
      region: row.region || '',
      tamano: row.superficie_m2,
      superficie: row.superficie_m2,
      precio: precioValue ? new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(precioValue) : 'Consultar',
      precioNumero: precioValue,
      imagenes: [],
      imagen: '',
      metadata: row.metadata || {},
      fuenteDatos: 'supabase',
    };
  }
  async function hydrateRemoteCatalog(){
    if(!window.TPLDataService?.listPublishedProperties)return;
    try{
      const rows=await window.TPLDataService.listPublishedProperties();
      remoteCatalog=(rows||[]).map(mapRemoteProperty).filter((item)=>item.id);
    }catch(error){console.warn('TPL Index: catálogo remoto no disponible; se mantiene respaldo local.',error)}
  }
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
    const value = String(path || '').trim();
    if (!value) return './assets/logo-tu-parcela-lista.png';
    if (/^(https?:)?\/\//i.test(value) || value.startsWith('data:') || value.startsWith('blob:')) return value;
    try { return new URL(value.replace(/^\.\//, ''), document.baseURI).href; }
    catch { return value; }
  };
  const hasPayment = (p) => positive(p.facilidadPago) || positive(p.facilidad_pago) || positive(p.facilidad) || positive(p.pagoCuotas) || /cuotas|facilidad de pago|pie/i.test(textOf(p));
  const hasNature = (p) => positive(p.naturaleza) || /bosque|nativo|araucaria|naturaleza|rio|río|estero|laguna|lago|campo/i.test(textOf(p));
  const hasServices = (p) => positive(p.servicios_cerca) || positive(p.cercania_servicios) || /colegio|hospital|supermercado|comercio|centro|servicios|ruta|pueblo|minutos/i.test(textOf(p));
  const soilOf = (p) => p.tipoSuelo || p.tipo_suelo || p.suelo || p.topografia || p.terreno || "Información por confirmar";
  const marketAnalysis = (p) => window.TPLMarketIntelligence?.analyze?.(p) || null;
  // Mismo criterio y misma fuente que la ficha publica (parcela.js ->
  // pintarEvaluacionPrecio): precio publicado 10% o mas por debajo del valor
  // TPL guardado. Sin tasacion guardada no es oportunidad: es un dato que
  // falta, y no se deduce de un calculo que no tiene los antecedentes.
  const isOpportunity = (p) => {
    const datos = valoracionGuardada(p);
    if (!datos) return false;
    const pubPrice = p.precioNumero || money(p.precio);
    return pubPrice > 0 && pubPrice <= datos.valorRecomendado * 0.9;
  };

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

  const communeRegionMap = {
    // Biobío
    "Yumbel":"Biobío","Nacimiento":"Biobío","Negrete":"Biobío","Florida":"Biobío",
    "Los Ángeles":"Biobío","Los Angeles":"Biobío","Cabrero":"Biobío","Laja":"Biobío","San Rosendo":"Biobío",
    "Mulchén":"Biobío","Quilaco":"Biobío","Quilleco":"Biobío","Santa Bárbara":"Biobío","Antuco":"Biobío",
    "Tucapel":"Biobío","Alto Biobío":"Biobío","Concepción":"Biobío","Coronel":"Biobío","Chiguayante":"Biobío",
    "Hualqui":"Biobío","Hualpén":"Biobío","Lota":"Biobío","Penco":"Biobío","San Pedro de la Paz":"Biobío",
    "Santa Juana":"Biobío","Talcahuano":"Biobío","Tomé":"Biobío","Arauco":"Biobío","Cañete":"Biobío",
    "Contulmo":"Biobío","Curanilahue":"Biobío","Lebu":"Biobío","Los Álamos":"Biobío","Tirúa":"Biobío",
    // Ñuble
    "Pemuco":"Ñuble","Quillón":"Ñuble","Ñipas":"Ñuble","Ránquil":"Ñuble","Coelemu":"Ñuble",
    "Cobquecura":"Ñuble","Chillán":"Ñuble","Chillán Viejo":"Ñuble","Bulnes":"Ñuble","San Nicolás":"Ñuble",
    "San Carlos":"Ñuble","San Fabián":"Ñuble","San Ignacio":"Ñuble","Ninhue":"Ñuble","Ñiquén":"Ñuble",
    "Portezuelo":"Ñuble","Quirihue":"Ñuble","Treguaco":"Ñuble","Trehuaco":"Ñuble","El Carmen":"Ñuble",
    "Coihueco":"Ñuble","Pinto":"Ñuble","Yungay":"Ñuble",
    // La Araucanía
    "Caburgua":"La Araucanía","Pucón":"La Araucanía","Villarrica":"La Araucanía","Loncoche":"La Araucanía",
    "Temuco":"La Araucanía","Vilcún":"La Araucanía","Curacautín":"La Araucanía","Los Sauces":"La Araucanía",
    "Malalcahuello":"La Araucanía",
    // Maule
    "Parral":"Maule","Cauquenes":"Maule"
  };

  // La base guarda "Desconocida" como marcador de posición en 32 de 33 fichas, y
  // como es un texto no vacío ganaba sobre el mapa de comunas: la cinta de arriba
  // mostraba un grupo "Desconocida" con casi todas las comunas dentro.
  const REGION_SIN_DATO = /^(desconocida|desconocido|sin region|sin región|n\/a|null|-)$/i;

  // La misma región aparece escrita de varias formas según quién cargó la ficha.
  function normalizarRegion(valor) {
    const texto = String(valor || "").trim().replace(/^regi[oó]n\s+(de\s+la\s+|del\s+|de\s+)?/i, "");
    if (!texto) return "";
    const canon = { "biobio":"Biobío", "biobío":"Biobío", "nuble":"Ñuble", "ñuble":"Ñuble",
                    "araucania":"La Araucanía", "araucanía":"La Araucanía", "la araucania":"La Araucanía", "la araucanía":"La Araucanía" };
    return canon[texto.toLowerCase()] || texto;
  }

  function regionOf(p) {
    const explicit = String(p.region || p.region_nombre || "").trim();
    // Sin región utilizable se resuelve por comuna, que es un dato que sí está.
    if (explicit && !REGION_SIN_DATO.test(explicit)) return normalizarRegion(explicit);
    return communeRegionMap[String(p.comuna || "").trim()] || "Otras zonas";
  }

  function populateCommunes() {
    const entries = catalog().map((p) => ({ commune: String(p.comuna || "").trim(), region: regionOf(p) })).filter((x) => x.commune);
    const communes = [...new Set(entries.map((x) => x.commune))].sort((a, b) => a.localeCompare(b, "es"));

    // populateCommunes() corre dos veces: una con el catálogo local y otra al
    // llegar el remoto. Con insertAdjacentHTML las opciones se acumulaban y el
    // selector mostraba cada comuna repetida. Se reconstruye conservando el
    // placeholder y la comuna que el usuario ya tuviera elegida.
    const select = $("commune-select");
    if (select) {
      const elegida = select.value;
      const placeholder = select.querySelector("option") ? select.querySelector("option").outerHTML : "";
      select.innerHTML = placeholder + communes.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
      if (elegida && communes.includes(elegida)) select.value = elegida;
    }

    const regionOrder = ["Biobío","Ñuble","La Araucanía","Maule","Otras zonas"];
    const grouped = new Map();
    entries.forEach(({ commune, region }) => {
      if (!grouped.has(region)) grouped.set(region, new Set());
      grouped.get(region).add(commune);
    });
    const ribbon = $("commune-ribbon-groups");
    if (ribbon) ribbon.innerHTML = [...grouped.entries()].sort((a,b) => {
      const ai = regionOrder.indexOf(a[0]), bi = regionOrder.indexOf(b[0]);
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi) || a[0].localeCompare(b[0], "es");
    }).map(([region, values]) => `<div class="commune-region"><strong>${escapeHtml(region)}</strong>${[...values].sort((a,b)=>a.localeCompare(b,"es")).map((c)=>`<button type="button" class="commune-chip" data-commune-shortcut="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join("")}</div>`).join("");
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

  function isHouse(p) {
    const type = String(p.tipo || "").toLowerCase();
    const name = String(p.nombre || p.titulo || "").toLowerCase();
    return type.includes('casa') || name.includes('casa de campo') || name.includes('parcela con casa');
  }

  function getResults() {
    let list = [...catalog()];
    if (!state.active) {
      list = list.filter((p) => money(p.precio) > 0);
      if (state.priority === "payment") list.sort((a, b) => Number(hasPayment(b)) - Number(hasPayment(a)) || money(a.precio) - money(b.precio));
      else if (state.priority === "nature") list.sort((a, b) => Number(hasNature(b)) - Number(hasNature(a)) || money(a.precio) - money(b.precio));
      else if (state.priority === "services") list.sort((a, b) => Number(hasServices(b)) - Number(hasServices(a)) || money(a.precio) - money(b.precio));
      else if (state.priority === "large") list.sort((a, b) => Number(sizeOf(b) >= 10000) - Number(sizeOf(a) >= 10000) || sizeOf(b) - sizeOf(a));
      else if (state.priority === "opportunity") list = list.filter(isOpportunity).sort((a,b) => money(a.precio) - money(b.precio));
      else list.sort((a, b) => money(a.precio) - money(b.precio));
      return list;
    }
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
    else if (state.priority === "opportunity") list = list.filter(isOpportunity).sort((a,b) => money(a.precio) - money(b.precio));
    else list.sort((a, b) => distanceOf(a) - distanceOf(b));

    return list;
  }

  function fallbackOrder(a, b) {
    if (state.method === "nearby") return distanceOf(a) - distanceOf(b);
    return money(a.precio) - money(b.precio);
  }

  function tagsOf(p) {
    if (window.analyzeProperty) {
      const result = window.analyzeProperty(p, valoracionParaAnalizador(p), marketAnalysis(p));
      const t = [...result.tags];
      if (sizeOf(p) >= 10000) t.push("1 hectárea o más");
      return t.slice(0, 4);
    }
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
    const analysis = marketAnalysis(p);
    // La insignia sale de la tasacion guardada, no del puntaje general: sin
    // tasacion el analizador no tiene precio de referencia y su puntaje se
    // arma con acceso, topografia y entorno, que no dicen nada sobre si la
    // parcela esta barata. Asi la portada y la ficha coinciden.
    const guardada = valoracionGuardada(p);
    const opp = isOpportunity(p);
    let diffTpl = null;
    if (guardada) {
      const publicado = p.precioNumero || money(p.precio);
      if (publicado > 0) diffTpl = ((guardada.valorRecomendado - publicado) / guardada.valorRecomendado) * 100;
    }
    const distanceBadge = Number.isFinite(distance) ? `<span class="parcel-distance">A ${Math.round(distance)} km de ti</span>` : "";
    const opportunityBadge = opp ? `<span class="parcel-opportunity">Oportunidad TPL</span>` : "";
    const valueNote = opp && diffTpl != null && diffTpl > 0 ? `<small class="parcel-value-note">${Math.round(diffTpl)}% bajo estimación TPL</small>` : "";
    const fetch = index === 0 ? 'fetchpriority="high"' : 'loading="lazy" fetchpriority="low"';
    return `<article class="parcel-card${opp ? ' is-opportunity' : ''}" onclick="window.location.href='${escapeHtml(parcelUrl(p))}'">
      <div class="parcel-image">
        <img src="${escapeHtml(absoluteAsset(imageOf(p)))}" alt="${escapeHtml(p.nombre || `${type} en ${p.comuna || "Chile"}`)}" width="640" height="480" decoding="async" ${fetch} onerror="this.closest('.parcel-image').classList.add('is-broken')">
        ${distanceBadge}
        ${opportunityBadge}
        <span class="parcel-price">${escapeHtml(p.precio || "Consultar precio")}</span>
      </div>
      <div class="parcel-body">
        <h3 class="parcel-title">${escapeHtml(p.nombre || `${type} en ${p.comuna || "Chile"}`)}</h3>
        <div class="parcel-facts">
          <span class="parcel-fact parcel-fact--comuna">${escapeHtml(p.comuna || "Comuna por confirmar")}</span>
          <span class="parcel-fact">${size ? `${size.toLocaleString("es-CL")} m²` : "Superficie por confirmar"}</span>
          <span class="parcel-fact">${escapeHtml(type)}</span>
          <span class="parcel-fact">${escapeHtml(soilOf(p))}</span>
        </div>
        <div class="parcel-tags">${tags.map((tag) => `<span class="parcel-tag">${escapeHtml(tag)}</span>`).join("")}</div>
        ${valueNote}
        <span class="parcel-cta">Ver parcela <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>
      </div>
    </article>`;
  }

  function render({ scroll = false } = {}) {
    const fullList = getResults();
    const housesList = fullList.filter(isHouse);
    const list = fullList.filter(p => !isHouse(p));

    const visible = list.slice(0, state.visible);
    
    $("parcel-grid").innerHTML = visible.length ? visible.map(parcelCard).join("") : `${state.active ? `<div class="empty-state market-radar-state" style="text-align: left; background: #fff; padding: 30px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.05); grid-column: 1 / -1;"><div style="display:flex; align-items:center; gap: 10px; margin-bottom: 20px;"><span style="background:#003f7a; color:white; padding: 4px 12px; border-radius:20px; font-weight:bold; font-size: 0.85rem;">RADAR DE MERCADO TPL</span></div><h3 style="margin-top:0; color:#0f172a; font-size:1.4rem;">No tenemos inventario directo, pero encontramos opciones en otros portales</h3><p style="color:#475569; font-size:1rem; margin-bottom: 20px;">Nuestro sistema ha detectado que existen propiedades con las caracter&iacute;sticas que buscas publicadas en el mercado abierto.</p><div style="background:#f8fafc; border: 1px solid #e2e8f0; border-radius:8px; padding: 15px; margin-bottom: 20px;"><strong style="color:#003f7a; display:block; margin-bottom:8px;">Resumen del mercado externo:</strong><ul style="margin:0; padding-left: 20px; color:#475569; line-height:1.6;"><li>Hay m&uacute;ltiples propiedades publicadas por terceros en esta zona.</li><li>No han pasado por nuestra evaluaci&oacute;n legal ni tasaci&oacute;n inteligente TPL.</li><li>Venta gestionada por corredores externos o due&ntilde;os directos.</li></ul></div><div style="background:#eff6ff; border-left: 4px solid #3b82f6; padding:20px; border-radius:4px;"><strong style="display:block; color:#1e3a8a; margin-bottom:8px; font-size:1.1rem;">&iquest;Quieres que gestionemos la compra por ti?</strong><p style="color:#1e3a8a; margin-top:0; margin-bottom:15px; font-size: 0.95rem; line-height:1.5;">Evita riesgos legales y sobreprecios. Tu Parcela Lista puede rastrear esas propiedades en los otros portales, contactar al vendedor, auditar los t&iacute;tulos, negociar el precio real y entregarte la propiedad de forma segura.</p><a href="https://wa.me/56988508361?text=Hola,%20busqu%C3%A9%20propiedades%20en%20el%20Buscador%20TPL%20y%20me%20ofreci%C3%B3%20el%20servicio%20de%20Radar%20para%20comprar%20una%20parcela%20externa.%20Quiero%20que%20me%20asesoren." target="_blank" style="display:inline-flex; align-items:center; gap:8px; background:#3b82f6; color:white; padding:10px 20px; border-radius:6px; font-weight:bold; text-decoration:none;">Solicitar asesor&iacute;a de compra externa</a></div></div>` : `<div class="empty-state">Elige Cercanas a mi o selecciona una comuna para comenzar.</div>`}`;

    $("results-count").textContent = state.priority === "opportunity" ? `${list.length} ${list.length === 1 ? "oportunidad TPL" : "oportunidades TPL"} según precio y atributos` : (state.active ? `${list.length} ${list.length === 1 ? "parcela encontrada" : "parcelas encontradas"}` : `${list.length} parcelas disponibles — mostrando las más económicas primero`);
    
    $("load-more").hidden = visible.length >= list.length;
    $("map-button").disabled = !fullList.some((p) => latOf(p) && lngOf(p));
    
    if (state.method === "nearby" && state.active) $("search-context").textContent = "Ordenadas desde tu ubicación actual";
    else if (state.method === "commune" && state.active) $("search-context").textContent = `Resultados en ${state.commune}`;
    else $("search-context").textContent = "Oportunidades disponibles — catálogo general";
    
    if (state.mapReady && !$("map-panel").hidden) paintMap(fullList);
    const inlineStatus = $("scroll-anchor")?.querySelector(".priority-inline-status");
    if (inlineStatus && state.coords && state.priority === "distance") inlineStatus.textContent = "Parcelas ordenadas por distancia desde tu ubicación.";
    
    if ($("houses-section") && $("houses-grid")) {
      if (housesList.length > 0) {
        $("houses-section").style.display = "block";
        $("houses-grid").innerHTML = housesList.map(parcelCard).join("");
      } else {
        $("houses-section").style.display = "none";
      }
    }

    if (scroll) scrollToResults();
  }

  function scrollToResults() {
    requestAnimationFrame(() => {
      const target = $("scroll-anchor");
      const top = target.getBoundingClientRect().top + window.scrollY - 92;
      window.scrollTo({ top, behavior: "smooth" });
    });
  }

  function locate({ scroll = true } = {}) {
    if (!navigator.geolocation) {
      $("location-status").textContent = "Tu navegador no permite obtener ubicación.";
      return;
    }
    $("location-status").textContent = "Calculando tu ubicación⬦";
    $("locate-button").disabled = true;
    navigator.geolocation.getCurrentPosition((position) => {
      state.coords = { lat: position.coords.latitude, lng: position.coords.longitude };
      state.active = true;
      state.visible = 20;
      state.priority = "distance";
      syncPriorityButtons();
      $("location-status").textContent = "Ubicación lista. Mostrando las parcelas más cercanas.";
      $("locate-button").disabled = false;
      render({ scroll });
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
      const priceText = p.precio ? '$' + Number(p.precio).toLocaleString('es-CL') : 'Consulte';
      const sizeStr = p.superficie || p.metros_cuadrados || p.tamano;
      const sizeText = sizeStr ? sizeStr + ' m²' : '';
      const imgUrl = p.imagen || (p.imagenes && p.imagenes[0]) || './assets/logo-tu-parcela-lista.png';
      const popupHtml = `
        <div style="min-width: 220px; font-family: 'Outfit', sans-serif;">
          <img src="${escapeHtml(imgUrl)}" style="width:100%; height:130px; object-fit:cover; border-radius:8px; margin-bottom:8px; display:block;">
          <strong style="display:block; font-size:1.1rem; color:#1e293b; margin-bottom:2px; line-height:1.2;">${escapeHtml(p.nombre || "Parcela")}</strong>
          <div style="font-size:0.85rem; color:#64748b; margin-bottom:8px; display:flex; gap:6px; align-items:center;">
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.242-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            ${escapeHtml(p.comuna || "Ubicación")}
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; font-weight:700;">
             <span style="color:#0f172a; font-size:1.1rem;">${priceText}</span>
             <span style="color:#0284c7; font-size:0.9rem;">${sizeText}</span>
          </div>
          <a href="${escapeHtml(parcelUrl(p))}" data-map-parcel="${escapeHtml(p.id || "")}" style="display:block; text-align:center; background:#0284c7; color:white; text-decoration:none; padding:8px; border-radius:6px; font-weight:600; transition:background 0.2s;">Ver detalles</a>
        </div>
      `;
      marker.bindPopup(popupHtml, { className: 'tpl-map-popup-clean' });
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
  const MAX_DIFFERENCE = 5000000;
  const MAX_RESULTS = 6;

  const parcelsAvailable = catalog()
    .filter((parcel) => money(parcel.precio) > 0);

  const housesAvailable = houseCatalog()
    .filter((house) => housePrice(house) > 0);

  const combinations = [];

  parcelsAvailable.forEach((parcel) => {
    housesAvailable.forEach((house) => {
      const parcelValue = money(parcel.precio);
      const houseValue = housePrice(house);
      const total = parcelValue + houseValue;
      const difference = total - budget;
      const absoluteDifference = Math.abs(difference);

      // Solo acepta proyectos dentro de ± $5.000.000.
      if (absoluteDifference > MAX_DIFFERENCE) return;

      combinations.push({
        parcel,
        house,
        parcelValue,
        houseValue,
        total,
        difference,
        score: absoluteDifference
      });
    });
  });

  // Primero siempre las combinaciones más cercanas al presupuesto.
  combinations.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;

    // Si dos combinaciones están igual de cerca,
    // prioriza la que no excede el presupuesto.
    const aOver = a.total > budget ? 1 : 0;
    const bOver = b.total > budget ? 1 : 0;

    return aOver - bOver;
  });

  const selected = [];
  const usedParcels = new Set();
  const usedHouses = new Set();

  for (const item of combinations) {
    if (selected.length >= MAX_RESULTS) break;

    const parcelKey = String(
      item.parcel.id ||
      item.parcel.codigo ||
      item.parcel.nombre ||
      ""
    );

    const houseKey = String(
      item.house.id ||
      item.house.codigo ||
      item.house.nombre ||
      ""
    );

    // Una parcela no puede repetirse.
    if (usedParcels.has(parcelKey)) continue;

    // Una casa tampoco puede repetirse.
    if (usedHouses.has(houseKey)) continue;

    usedParcels.add(parcelKey);
    usedHouses.add(houseKey);

    selected.push(item);
  }

  return selected;
}

  function comboCard(item, index, budget) {
    const { parcel, house } = item;
    const parcelId = parcel.id || parcel.codigo;
    const houseId = String(house.id || "");
    const parcelParams = new URLSearchParams({ id: parcelId, origen: "presupuesto-combo", prioridad: "precio-total" });
    const quoteParams = new URLSearchParams({ parcela: parcelId, casa: houseId, tipo: "prefabricada", presupuesto: String(budget), origen: "frontend-v2" });
    const difference = budget - item.total;
    const differenceLabel = difference >= 0 ? `Te quedan ${CLP.format(difference)}` : `Supera por ${CLP.format(Math.abs(difference))}`;
    const rank = index === 0 ? "Más cercana a tu presupuesto" : `Alternativa ${index + 1}`;
    
    if (item.isReadyMade) {
      return `<article class="combo-card">
        <div class="combo-visual">
          <span class="combo-rank" style="background:#10b981;">Lista para habitar</span>
          <figure style="grid-column: span 2;"><img src="${escapeHtml(absoluteAsset(imageOf(parcel)))}" alt="${escapeHtml(parcel.nombre || "Parcela con casa")}" style="width:100%; height:100%; object-fit:cover;" ${index === 0 ? 'fetchpriority="high"' : 'loading="lazy"'}><figcaption>${escapeHtml(parcel.nombre || "Parcela con casa")}</figcaption></figure>
        </div>
        <div class="combo-card-body">
          <h3>${escapeHtml(parcel.nombre || "Parcela con Casa")}</h3>
          <p class="combo-location">${escapeHtml(parcel.comuna || "Comuna por confirmar")}</p>
          <div class="combo-specs">
            <span>${sizeOf(parcel) ? `${sizeOf(parcel).toLocaleString("es-CL")} m² de terreno` : "Superficie por confirmar"}</span>
            <span style="color:#10b981; font-weight:bold;">¡Casa ya construida!</span>
          </div>
          <div class="combo-total">
            <div><small>Valor total</small><strong>${CLP.format(item.total)}</strong></div>
            <span class="combo-difference ${difference >= 0 ? "is-under" : "is-over"}">${escapeHtml(differenceLabel)}</span>
          </div>
          <div class="combo-actions">
            <a class="combo-primary" style="grid-column: span 2;" href="./parcela.html?${parcelParams.toString()}">Ver parcela con casa</a>
          </div>
        </div>
      </article>`;
    }

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
          <span>${sizeOf(parcel) ? `${sizeOf(parcel).toLocaleString("es-CL")} m² de terreno` : "Superficie por confirmar"} + ${CLP.format(item.parcelValue)}</span>
          <span>${houseSize(house) ? `${houseSize(house)} m² de casa` : "Casa prefabricada"} + ${CLP.format(item.houseValue)}</span>
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

  document.addEventListener("DOMContentLoaded", async () => {
    // 1. Render immediately with local data
    populateCommunes();
    render();

    // 2. Hydrate remote and re-render in background
    // Las referencias comunales van en el mismo viaje: el detector de
    // oportunidades compara contra valorComunalBase, y el motor ya no trae
    // medianas de respaldo escritas a mano. Sin esto ninguna parcela se marca.
    Promise.all([
      hydrateRemoteCatalog(),
      (window.TPLReferenciasComunales || window.TPLDataService?.cargarReferenciasEnMotor?.() || Promise.resolve()),
    ]).then(async () => {
      try {
        const mod = await import("./core/property-analyzer.js");
        window.analyzeProperty = mod.analyzeProperty;
      } catch(e) { console.warn("Could not load property-analyzer", e); }
      populateCommunes();
      render();
    }).catch(e => console.warn("Hydration failed:", e));

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
      if (button.dataset.priority === "distance" && !state.coords) {
        state.method = "nearby";
        state.priority = "distance";
        syncPriorityButtons();
        const toolbar = $("scroll-anchor");
        let status = toolbar.querySelector(".priority-inline-status");
        if (!status) {
          status = document.createElement("small");
          status.className = "priority-inline-status";
          toolbar.querySelector("div").appendChild(status);
        }
        status.textContent = "Calculando tu ubicación para ordenar esta misma grilla⬦";
        locate({ scroll: false });
        return;
      }
      state.priority = button.dataset.priority;
      state.visible = 20;
      syncPriorityButtons();
      render({ scroll: false });
    }));

    $("locate-button").addEventListener("click", () => locate({ scroll: true }));
    document.addEventListener("click", (event) => {
      const shortcut = event.target.closest("[data-commune-shortcut]");
      if (!shortcut) return;
      const commune = shortcut.dataset.communeShortcut;
      state.method = "commune";
      state.commune = commune;
      state.active = true;
      state.visible = 20;
      state.priority = "economic";
      $("commune-select").value = commune;
      document.querySelectorAll("[data-commune-shortcut]").forEach((item) => item.classList.toggle("is-active", item === shortcut));
      setMethod("commune");
      state.commune = commune;
      state.active = true;
      state.visible = 20;
      state.priority = "economic";
      syncPriorityButtons();
      render({ scroll: true });
    });
    $("commune-search-button").addEventListener("click", searchCommune);
    $("commune-select").addEventListener("change", () => { if ($("commune-select").value) searchCommune(); });
    $("load-more").addEventListener("click", () => { state.visible += 12; render(); });
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
