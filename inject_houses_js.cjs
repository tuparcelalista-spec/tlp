const fs = require('fs');
let js = fs.readFileSync('frontend-v2/js/index.js', 'utf8');

// 1. Add isHouse helper
if (!js.includes('function isHouse(')) {
  js = js.replace('function getResults() {', `function isHouse(p) {
    const type = String(p.tipo || "").toLowerCase();
    const name = String(p.nombre || p.titulo || "").toLowerCase();
    return type.includes('casa') || name.includes('casa de campo') || name.includes('parcela con casa');
  }

  function getResults() {`);
}

// 2. Rewrite render function to split grids
const renderRegex = /function render\(\{\s*scroll\s*=\s*false\s*\}\s*=\s*\{\}\)\s*\{[\s\S]*?if\s*\(scroll\)\s*scrollToResults\(\);\s*\}/;

const newRender = `function render({ scroll = false } = {}) {
    const fullList = getResults();
    const housesList = fullList.filter(isHouse);
    const list = fullList.filter(p => !isHouse(p));

    const visible = list.slice(0, state.visible);
    
    $("parcel-grid").innerHTML = visible.length ? visible.map(parcelCard).join("") : \`\${state.active ? \`<div class="empty-state market-radar-state" style="text-align: left; background: #fff; padding: 30px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.05); grid-column: 1 / -1;"><div style="display:flex; align-items:center; gap: 10px; margin-bottom: 20px;"><span style="background:#003f7a; color:white; padding: 4px 12px; border-radius:20px; font-weight:bold; font-size: 0.85rem;">RADAR DE MERCADO TPL</span></div><h3 style="margin-top:0; color:#0f172a; font-size:1.4rem;">No tenemos inventario directo, pero encontramos opciones en otros portales</h3><p style="color:#475569; font-size:1rem; margin-bottom: 20px;">Nuestro sistema ha detectado que existen propiedades con las caracter&iacute;sticas que buscas publicadas en el mercado abierto.</p><div style="background:#f8fafc; border: 1px solid #e2e8f0; border-radius:8px; padding: 15px; margin-bottom: 20px;"><strong style="color:#003f7a; display:block; margin-bottom:8px;">Resumen del mercado externo:</strong><ul style="margin:0; padding-left: 20px; color:#475569; line-height:1.6;"><li>Hay m&uacute;ltiples propiedades publicadas por terceros en esta zona.</li><li>No han pasado por nuestra evaluaci&oacute;n legal ni tasaci&oacute;n inteligente TPL.</li><li>Venta gestionada por corredores externos o due&ntilde;os directos.</li></ul></div><div style="background:#eff6ff; border-left: 4px solid #3b82f6; padding:20px; border-radius:4px;"><strong style="display:block; color:#1e3a8a; margin-bottom:8px; font-size:1.1rem;">&iquest;Quieres que gestionemos la compra por ti?</strong><p style="color:#1e3a8a; margin-top:0; margin-bottom:15px; font-size: 0.95rem; line-height:1.5;">Evita riesgos legales y sobreprecios. Tu Parcela Lista puede rastrear esas propiedades en los otros portales, contactar al vendedor, auditar los t&iacute;tulos, negociar el precio real y entregarte la propiedad de forma segura.</p><a href="https://wa.me/56988508361?text=Hola,%20busqu%C3%A9%20propiedades%20en%20el%20Buscador%20TPL%20y%20me%20ofreci%C3%B3%20el%20servicio%20de%20Radar%20para%20comprar%20una%20parcela%20externa.%20Quiero%20que%20me%20asesoren." target="_blank" style="display:inline-flex; align-items:center; gap:8px; background:#3b82f6; color:white; padding:10px 20px; border-radius:6px; font-weight:bold; text-decoration:none;">Solicitar asesor&iacute;a de compra externa</a></div></div>\` : \`<div class="empty-state">Elige Cercanas a mi o selecciona una comuna para comenzar.</div>\`}\`;

    $("results-count").textContent = state.priority === "opportunity" ? \`\${list.length} \${list.length === 1 ? "oportunidad TPL" : "oportunidades TPL"} según precio y atributos\` : (state.active ? \`\${list.length} \${list.length === 1 ? "parcela encontrada" : "parcelas encontradas"}\` : \`\${list.length} parcelas disponibles — mostrando las más económicas primero\`);
    
    $("load-more").hidden = visible.length >= list.length;
    $("map-button").disabled = !fullList.some((p) => latOf(p) && lngOf(p));
    
    if (state.method === "nearby" && state.active) $("search-context").textContent = "Ordenadas desde tu ubicación actual";
    else if (state.method === "commune" && state.active) $("search-context").textContent = \`Resultados en \${state.commune}\`;
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
  }`;

js = js.replace(renderRegex, newRender);

// 3. Rewrite comboCandidates to include built houses
const comboRegex = /function comboCandidates\(budget\)\s*\{[\s\S]*?return combinations[\s\S]*?\.slice\(0, MAX_RESULTS\);\s*\}/;

const newCombo = `function comboCandidates(budget) {
    const MAX_DIFFERENCE = 5000000;
    const MAX_RESULTS = 6;
  
    const fullCatalog = catalog();
    const parcelsAvailable = fullCatalog.filter((parcel) => money(parcel.precio) > 0 && !isHouse(parcel));
    const housesAvailable = houseCatalog().filter((house) => housePrice(house) > 0);
    const builtHouses = fullCatalog.filter((parcel) => money(parcel.precio) > 0 && isHouse(parcel));
  
    const combinations = [];
  
    // 1. Ready-made houses
    builtHouses.forEach((builtHouse) => {
      const total = money(builtHouse.precio);
      const difference = total - budget;
      const absoluteDifference = Math.abs(difference);
      if (absoluteDifference <= MAX_DIFFERENCE) {
        combinations.push({
          parcel: builtHouse,
          house: { nombre: 'Casa construida (lista)', valorCasa: 0, m2: builtHouse.tamano, tipo: 'construida' },
          parcelValue: total,
          houseValue: 0,
          total,
          absoluteDifference,
          isReadyMade: true
        });
      }
    });

    // 2. Combo projects (parcel + prefab)
    parcelsAvailable.forEach((parcel) => {
      housesAvailable.forEach((house) => {
        const parcelValue = money(parcel.precio);
        const houseValue = housePrice(house);
        const total = parcelValue + houseValue;
        const difference = total - budget;
        const absoluteDifference = Math.abs(difference);
  
        if (absoluteDifference > MAX_DIFFERENCE) return;
  
        combinations.push({
          parcel,
          house,
          parcelValue,
          houseValue,
          total,
          absoluteDifference,
          isReadyMade: false
        });
      });
    });
  
    return combinations
      .sort((a, b) => a.absoluteDifference - b.absoluteDifference)
      .slice(0, MAX_RESULTS);
  }`;

js = js.replace(comboRegex, newCombo);

// 4. Update comboCard to handle ready-made houses
const comboCardRegex = /function comboCard\(item, index, budget\)\s*\{[\s\S]*?<\/article>\`;\s*\}/;

const newComboCard = `function comboCard(item, index, budget) {
    const { parcel, house } = item;
    const parcelId = parcel.id || parcel.codigo;
    const houseId = String(house.id || "");
    const parcelParams = new URLSearchParams({ id: parcelId, origen: "presupuesto-combo", prioridad: "precio-total" });
    const quoteParams = new URLSearchParams({ parcela: parcelId, casa: houseId, tipo: "prefabricada", presupuesto: String(budget), origen: "frontend-v2" });
    const difference = budget - item.total;
    const differenceLabel = difference >= 0 ? \`Te quedan \${CLP.format(difference)}\` : \`Supera por \${CLP.format(Math.abs(difference))}\`;
    const rank = index === 0 ? "Más cercana a tu presupuesto" : \`Alternativa \${index + 1}\`;
    
    if (item.isReadyMade) {
      return \`<article class="combo-card">
        <div class="combo-visual">
          <span class="combo-rank" style="background:#10b981;">Lista para habitar</span>
          <figure style="grid-column: span 2;"><img src="\${escapeHtml(absoluteAsset(imageOf(parcel)))}" alt="\${escapeHtml(parcel.nombre || "Parcela con casa")}" style="width:100%; height:100%; object-fit:cover;" \${index === 0 ? 'fetchpriority="high"' : 'loading="lazy"'}><figcaption>\${escapeHtml(parcel.nombre || "Parcela con casa")}</figcaption></figure>
        </div>
        <div class="combo-card-body">
          <h3>\${escapeHtml(parcel.nombre || "Parcela con Casa")}</h3>
          <p class="combo-location">\${escapeHtml(parcel.comuna || "Comuna por confirmar")}</p>
          <div class="combo-specs">
            <span>\${sizeOf(parcel) ? \`\${sizeOf(parcel).toLocaleString("es-CL")} m² de terreno\` : "Superficie por confirmar"}</span>
            <span style="color:#10b981; font-weight:bold;">¡Casa ya construida!</span>
          </div>
          <div class="combo-total">
            <div><small>Valor total</small><strong>\${CLP.format(item.total)}</strong></div>
            <span class="combo-difference \${difference >= 0 ? "is-under" : "is-over"}">\${escapeHtml(differenceLabel)}</span>
          </div>
          <div class="combo-actions">
            <a class="combo-primary" style="grid-column: span 2;" href="./parcela.html?\${parcelParams.toString()}">Ver parcela con casa</a>
          </div>
        </div>
      </article>\`;
    }

    return \`<article class="combo-card">
      <div class="combo-visual">
        <span class="combo-rank">\${escapeHtml(rank)}</span>
        <figure><img src="\${escapeHtml(absoluteAsset(imageOf(parcel)))}" alt="\${escapeHtml(parcel.nombre || "Parcela")}" width="640" height="480" decoding="async" \${index === 0 ? 'fetchpriority="high"' : 'loading="lazy"'}><figcaption>Parcela</figcaption></figure>
        <figure><img src="\${escapeHtml(absoluteAsset(imageOf(house)))}" alt="\${escapeHtml(house.nombre || "Casa prefabricada")}" width="440" height="480" loading="lazy" decoding="async"><figcaption>Casa</figcaption></figure>
      </div>
      <div class="combo-card-body">
        <h3>\${escapeHtml(parcel.nombre || "Parcela")} + \${escapeHtml(house.nombre || "Casa prefabricada")}</h3>
        <p class="combo-location">\${escapeHtml(parcel.comuna || "Comuna por confirmar")}</p>
        <div class="combo-specs">
          <span>\${sizeOf(parcel) ? \`\${sizeOf(parcel).toLocaleString("es-CL")} m² de terreno\` : "Superficie por confirmar"} + \${CLP.format(item.parcelValue)}</span>
          <span>\${houseSize(house) ? \`\${houseSize(house)} m² de casa\` : "Casa prefabricada"} + \${CLP.format(item.houseValue)}</span>
          <span>\${houseRooms(house) ? \`\${houseRooms(house)} dormitorios\` : "Dormitorios por confirmar"}</span>
          <span>Instalación según modelo y zona</span>
        </div>
        <div class="combo-total">
          <div><small>Proyecto referencial</small><strong>\${CLP.format(item.total)}</strong></div>
          <span class="combo-difference \${difference >= 0 ? "is-under" : "is-over"}">\${escapeHtml(differenceLabel)}</span>
        </div>
        <div class="combo-actions">
          <a class="combo-secondary" href="./parcela.html?\${parcelParams.toString()}">Ver parcela</a>
          <a class="combo-primary" href="./cotizador.html?\${quoteParams.toString()}">Cotizar proyecto</a>
        </div>
      </div>
    </article>\`;
  }`;

js = js.replace(comboCardRegex, newComboCard);
fs.writeFileSync('frontend-v2/js/index.js', js);
console.log('index.js updated');
