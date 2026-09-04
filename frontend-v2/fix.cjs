const fs = require('fs');
const file = 'd:/BIOTV MARKETING/NUEVO BIOTV/PÁGINAS WEB/TPL PAGINA MALA/TPL PRUEBA NUEVA/frontend-v2/js/index.js';
let content = fs.readFileSync(file, 'utf8');

const startStr = '    const houseKey = String(';
const endStr = '  document.addEventListener("DOMContentLoaded", async () => {';

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
    const replacement = `    const houseKey = String(
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
    const parcel = item.parcel;
    const house = item.house;
    const size = sizeOf(parcel);
    const parcelId = String(parcel.id || "");
    const houseId = String(house.id || "");
    const parcelParams = new URLSearchParams({ id: parcelId, origen: "presupuesto-combo", prioridad: "precio-total" });
    const quoteParams = new URLSearchParams({ parcela: parcelId, casa: houseId, tipo: "prefabricada", presupuesto: String(budget), origen: "frontend-v2" });
    const difference = budget - item.total;
    const differenceLabel = difference >= 0 ? \`Te quedan \${CLP.format(difference)}\` : \`Supera por \${CLP.format(Math.abs(difference))}\`;
    const rank = index === 0 ? "Más cercana a tu presupuesto" : \`Alternativa \${index + 1}\`;
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
          <span>\${size ? \`\${size.toLocaleString("es-CL")} m² de terreno\` : "Superficie por confirmar"} • \${CLP.format(item.parcelValue)}</span>
          <span>\${houseSize(house) ? \`\${houseSize(house)} m² de casa\` : "Casa prefabricada"} • \${CLP.format(item.houseValue)}</span>
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
    $("combo-results-summary").textContent = results.length ? \`\${results.length} combinaciones seleccionadas cerca de \${CLP.format(budget)}.\` : "Prueba con otro presupuesto.";
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

`;

    content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed successfully');
} else {
    console.log('Strings not found', startIndex, endIndex);
}
