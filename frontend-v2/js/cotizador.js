(()=>{
  'use strict';
  
  const $=id=>document.getElementById(id);
  const params=new URLSearchParams(location.search);
  const format=n=>new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(Number(n)||0);
  // Los nombres de extras y casas se interpolan en innerHTML; escapamos por si
  // el catalogo llega a contener comillas o signos de HTML.
  const escapeHtml = (v) => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  // Convierte a numero admitiendo el formato chileno ("." miles, "," decimales).
  // La version anterior conservaba los puntos, asi que "$9.578.000" quedaba como
  // "9.578.000" -> NaN -> 0: los precios del catalogo se leian como cero.
  const number = (v) => {
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    const s = String(v ?? '').trim();
    if (!s) return 0;
    const limpio = s.replace(/[^\d.,-]/g, '');
    const normalizado = limpio.includes(',')
      // "1.234,5" -> "1234.5"
      ? limpio.replace(/\./g, '').replace(',', '.')
      // Quita el punto solo cuando separa miles (3 digitos detras);
      // asi "72.5" conserva su decimal y "9.578.000" pasa a "9578000".
      : limpio.replace(/\.(?=\d{3}(\D|$))/g, '');
    return Number(normalizado) || 0;
  };
  
  // FASE 1: TPLProjectContextManager
  const TPLProjectContextManager = {
    key: 'tpl_project_context_v1',
    get() {
      try {
        const stored = sessionStorage.getItem(this.key);
        if (stored) return JSON.parse(stored);
      } catch(e) {}
      return this.createEmpty();
    },
    save(context) {
      context.metadata.updatedAt = new Date().toISOString();
      sessionStorage.setItem(this.key, JSON.stringify(context));
    },
    createEmpty() {
      return {
        version: 1,
        sessionId: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        parcel: { id: null, snapshot: null },
        housing: { mode: null, houseId: null, snapshot: null, customConfig: null },
        foundation: { id: null, snapshot: null },
        extras: [],
        pricing: { parcel: 0, house: 0, foundation: 0, extras: 0, total: 0 },
        metadata: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      };
    },
    clear() {
      sessionStorage.removeItem(this.key);
    }
  };

  let ctx = TPLProjectContextManager.get();

  // Dependencias Estáticas
  const lexicalParcels=(()=>{try{return typeof parcelas!=='undefined'&&Array.isArray(parcelas)?parcelas:[]}catch{return[]}})();
  const fallbackParcels=Array.isArray(window.parcelas)?window.parcelas:(lexicalParcels.length?lexicalParcels:(Array.isArray(window.parcelasPortal)?window.parcelasPortal:[]));
  const houses=Array.isArray(window.casas)?window.casas:[];
  
  // Custom design reference materials
  const customMaterials = [
      { id: "madera", name: "Madera Impregnada", priceM2: 250000 },
      { id: "metalcon", name: "Metalcon / SIP", priceM2: 320000 },
      { id: "hormigon", name: "Albañilería / Hormigón", priceM2: 450000 }
  ];

  // FASE 2: RESOLUCIÓN DE INTENCIÓN Y PARCELA
  const urlParcelId = params.get('parcela') || params.get('parcelaId');
  const urlHouseId = params.get('casa') || params.get('casaId');
  
  // 3. Regla de Prioridad URL vs Store
  if (urlParcelId && ctx.parcel.id !== urlParcelId) {
    TPLProjectContextManager.clear();
    ctx = TPLProjectContextManager.createEmpty();
    ctx.parcel.id = urlParcelId;
    if (urlHouseId) {
      ctx.housing.mode = 'prefab';
      ctx.housing.houseId = urlHouseId;
    }
    TPLProjectContextManager.save(ctx);
  } else if (!urlParcelId && !ctx.parcel.id) {
    const oldParcelId = localStorage.getItem('selectedParcelaId');
    if (oldParcelId) {
       ctx.parcel.id = oldParcelId;
       TPLProjectContextManager.save(ctx);
    }
  }

  if (params.get('tipo') === 'diseno-propio') {
      ctx.housing.mode = 'custom';
      ctx.housing.customConfig = { m2: 72, rooms: 3, material: customMaterials[0], confirmed: false };
      ctx.housing.houseId = null;
      ctx.housing.snapshot = null;
      TPLProjectContextManager.save(ctx);
  }

  // 11. MOTOR DE PRECIOS CENTRALIZADO
  function getHousingM2() {
      if (ctx.housing.mode === 'prefab' && ctx.housing.snapshot) return number(ctx.housing.snapshot.metros);
      if (ctx.housing.mode === 'custom' && ctx.housing.customConfig) return number(ctx.housing.customConfig.m2);
      return 0;
  }

  function superficieParcelaM2() {
      return ctx.parcel.snapshot ? number(ctx.parcel.snapshot.superficieM2) : 0;
  }

  /**
   * Perímetro estimado de la parcela a partir de su superficie.
   *
   * No conocemos la forma real del terreno, así que se asume un cuadrado:
   * para un área A, el lado es √A y el perímetro 4√A. Es la estimación más
   * conservadora posible (el cuadrado es la figura de menor perímetro para un
   * área dada, salvo el círculo), de modo que un terreno alargado necesitará
   * MÁS cerco, nunca menos. Por eso la UI lo muestra como estimación.
   */
  function perimetroEstimadoM() {
      const area = superficieParcelaM2();
      if (!area || area <= 0) return 0;
      return Math.round(4 * Math.sqrt(area));
  }

  /**
   * Una fundación se construye bajo la casa: sus metros cuadrados SON los de la
   * casa elegida, nunca una cantidad que el usuario escribe.
   *
   * Las fundaciones de extras.js vienen con tipoCalculo 'mt2' pero sin el campo
   * `base`, así que cantidadAutomatica() devolvía null, la cantidad caía en el
   * 1 fijo con que se las llamaba y un radier de $95.000/m² se cobraba
   * $95.000 en total, no $5.700.000 para una casa de 60 m². Se normaliza aquí
   * en vez de en los datos para que una fundación nueva quede bien aunque
   * nadie se acuerde de escribir el campo.
   */
  function normalizarFundacion(f) {
      if (!f) return f;
      const porMetro = ['mt2', 'metro'].includes(String(f.tipoCalculo || '').toLowerCase());
      return { ...f, base: f.base || (porMetro ? 'casa_m2' : null) };
  }

  /**
   * Cantidad que se calcula sola a partir del proyecto.
   * Devuelve null cuando la cantidad la define el usuario.
   */
  function cantidadAutomatica(item) {
      switch (item?.base) {
          case 'casa_m2': return getHousingM2();
          case 'parcela_m2': return superficieParcelaM2();
          case 'parcela_perimetro': return perimetroEstimadoM();
          default: return null;
      }
  }

  /** Etiqueta legible de la magnitud usada, para mostrarla junto al precio. */
  function detalleCantidad(item, cantidad) {
      if (!cantidad) return '';
      switch (item?.base) {
          case 'casa_m2': return `${cantidad} m² de casa`;
          case 'parcela_m2': return `${cantidad.toLocaleString('es-CL')} m² de parcela`;
          case 'parcela_perimetro': return `≈ ${cantidad} m de perímetro`;
          default: break;
      }
      const unidades = { metro: 'm', hora: 'h', unidad: 'un', mt2: 'm²' };
      return `${cantidad} ${unidades[item?.tipoCalculo] || ''}`.trim();
  }

  /**
   * Cantidad final de un ítem: la del proyecto, salvo que el usuario la haya
   * ajustado a mano.
   *
   * El cerámico se cotiza por los m² de la casa, pero nadie enceramica el 100%
   * de la superficie (baños, logia, terraza quedan fuera), así que la cifra
   * automática es un punto de partida, no una imposición: `manual` deja que el
   * usuario escriba los metros reales y el precio sigue ese número.
   */
  function cantidadFinal(snapshot, qty, manual = false) {
      const auto = manual ? null : cantidadAutomatica(snapshot);
      return auto !== null ? auto : number(qty);
  }

  function calculateExtraPrice(snapshot, qty, manual = false) {
      if (!snapshot) return 0;
      const val = number(snapshot.valor || snapshot.priceRef);
      // Si el ítem declara una base, la cantidad sale del proyecto y no del
      // usuario: el cerco se multiplica por el perímetro de la parcela y las
      // partidas de vivienda por los m² de la casa elegida.
      const cantidad = cantidadFinal(snapshot, qty, manual);

      switch (snapshot.tipoCalculo) {
          case 'mt2':
          case 'metro':
          case 'unidad':
          case 'hora':
              return val * cantidad;
          case 'parcela':
              return val * superficieParcelaM2();
          case 'fijo':
          default:
              return val;
      }
  }

  function calculateQuote() {
    ctx.pricing.parcel = ctx.parcel.snapshot ? number(ctx.parcel.snapshot.precioPublicado) : 0;
    
    ctx.pricing.house = 0;
    if (ctx.housing.mode === 'prefab' && ctx.housing.snapshot) {
       ctx.pricing.house = number(ctx.housing.snapshot.precio);
    } else if (ctx.housing.mode === 'custom' && ctx.housing.customConfig && ctx.housing.customConfig.material) {
       ctx.pricing.house = number(ctx.housing.customConfig.m2) * number(ctx.housing.customConfig.material.priceM2);
    }

    if (ctx.foundation.snapshot) {
        ctx.foundation.snapshot.calculatedPrice = calculateExtraPrice(ctx.foundation.snapshot, 1);
        ctx.pricing.foundation = ctx.foundation.snapshot.calculatedPrice;
    } else {
        ctx.pricing.foundation = 0;
    }
    
    ctx.pricing.extras = 0;
    ctx.extras.forEach(ext => {
        if(ext.snapshot) {
            // Si el usuario no tocó la cantidad, se mantiene pegada al proyecto:
            // cambiar la casa de 36 a 72 m² arrastra el cerámico y la pintura.
            if (!ext.qtyManual) {
                const auto = cantidadAutomatica(ext.snapshot);
                if (auto !== null) ext.quantity = auto;
            }
            ext.calculatedPrice = calculateExtraPrice(ext.snapshot, ext.quantity, ext.qtyManual);
            ctx.pricing.extras += ext.calculatedPrice;
        }
    });
    
    ctx.pricing.total = ctx.pricing.parcel + ctx.pricing.house + ctx.pricing.foundation + ctx.pricing.extras;
    
    TPLProjectContextManager.save(ctx);
  }

  // Renderizado UI
  
  function selectFoundation(id) {
      if(ctx.foundation.id === id) {
          ctx.foundation = { id: null, snapshot: null }; // Deselect
      } else {
          const f = normalizarFundacion((window.fundaciones || []).find(x => String(x.id) === String(id)));
          if (f) {
              ctx.foundation.id = id;
              ctx.foundation.snapshot = {
                  id: f.id,
                  name: f.nombre,
                  valor: f.valor,
                  tipoCalculo: f.tipoCalculo,
                  // Sin `base` en el snapshot la fundación se cobraba por 1 m².
                  base: f.base
              };
          }
      }
      TPLProjectContextManager.save(ctx);
      calculateQuote();
      renderUI();
  }

  function toggleExtra(id, add) {
      if (add) {
          if(!ctx.extras.find(e => e.id === id)) {
              const ext = (window.extrasOpcionales || []).find(x => String(x.id) === String(id));
              if (ext) {
                  // Un ítem por m² de casa entra con los metros de la casa ya
                  // puestos, para que el usuario los ajuste en vez de tener que
                  // adivinarlos desde cero.
                  const autoQty = cantidadAutomatica(ext);
                  ctx.extras.push({
                      id: id,
                      quantity: autoQty !== null && autoQty > 0 ? autoQty : (ext.defaultQty || 1),
                      // Mientras sea false la cantidad sigue sola a la casa o a
                      // la parcela; pasa a true en cuanto el usuario la edita.
                      qtyManual: false,
                      snapshot: {
                          id: ext.id,
                          name: ext.nombre,
                          valor: ext.valor,
                          tipoCalculo: ext.tipoCalculo,
                          // 'base' viaja en el snapshot para que el precio se
                          // recalcule solo si cambia la casa o la parcela.
                          base: ext.base || null
                      }
                  });
              }
          }
      } else {
          ctx.extras = ctx.extras.filter(e => e.id !== id);
      }
      TPLProjectContextManager.save(ctx);
      calculateQuote();
      renderUI();
  }

  function updateExtraQty(id, qty) {
      const e = ctx.extras.find(x => x.id === id);
      if (e) {
          e.quantity = qty;
          // A partir de aquí manda el usuario: aunque después cambie la casa,
          // estos metros no se sobrescriben solos.
          e.qtyManual = true;
          TPLProjectContextManager.save(ctx);
          calculateQuote();
          // No se redibuja la grilla entera: reescribir el <input> mientras se
          // escribe le mueve el cursor al usuario. Solo se actualizan el precio
          // de esa tarjeta y los totales.
          repintarPrecioExtra(id);
          updateSummaryUI();
      }
  }

  /** Vuelve a dejar la cantidad atada a los m² de la casa o de la parcela. */
  function resetExtraQty(id) {
      const e = ctx.extras.find(x => x.id === id);
      if (!e) return;
      e.qtyManual = false;
      e.quantity = cantidadAutomatica(e.snapshot) ?? e.quantity;
      TPLProjectContextManager.save(ctx);
      calculateQuote();
      renderUI();
  }

  function repintarPrecioExtra(id) {
      const e = ctx.extras.find(x => x.id === id);
      const tarjeta = $('extras-grid')?.querySelector(`[data-extra-id="${CSS.escape(String(id))}"]`);
      if (!e || !tarjeta) return;
      const precio = tarjeta.querySelector('.extra-price');
      if (precio) precio.textContent = e.calculatedPrice > 0 ? format(e.calculatedPrice) : 'Por calcular';
      // Al ajustar los metros a mano, la nota "= 36 m² de casa" da paso al
      // atajo para volver a ese valor.
      const hint = tarjeta.querySelector('.extra-auto-hint');
      const reset = tarjeta.querySelector('.extra-reset');
      if (hint) hint.hidden = Boolean(e.qtyManual);
      if (reset) reset.hidden = !e.qtyManual;
  }

  function renderFoundationUI() {
      const step = $('foundation-step');
      if(!step) return;
      if(!ctx.housing.mode) {
          step.hidden = true;
          return;
      }
      step.hidden = false;
      const grid = $('foundation-grid');
      if(!grid) return;
      grid.innerHTML = '';
      const m2Casa = getHousingM2();
      (window.fundaciones || []).forEach(raw => {
          const f = normalizarFundacion(raw);
          const isSelected = ctx.foundation.id === f.id;
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'extra-card' + (isSelected ? ' selected' : '');
          // La tarjeta mostraba el precio unitario como si fuera el total.
          const calculated = calculateExtraPrice(f, 1);
          const unitario = f.base === 'casa_m2'
              ? `${format(f.valor)} / m²${m2Casa ? ` × ${m2Casa} m² de casa` : ''}`
              : (f.tipoCalculo === 'mt2' ? `${format(f.valor)} / m²` : '');
          btn.innerHTML = `<div class="extra-check">${isSelected ? '✓' : ''}</div><div class="extra-info"><strong>${f.nombre}</strong><small>${unitario}</small></div><div class="extra-price">${calculated > 0 ? format(calculated) : 'Elige la casa primero'}</div>`;
          btn.onclick = () => selectFoundation(f.id);
          grid.appendChild(btn);
      });
  }

  function renderExtrasUI() {
      const step = $('extras-step');
      if(!step) return;
      if(!ctx.housing.mode) {
          step.hidden = true;
          return;
      }
      step.hidden = false;
      const grid = $('extras-grid');
      if(!grid) return;
      grid.innerHTML = '';
      (window.extrasOpcionales || []).forEach(ext => {
          const selected = ctx.extras.find(e => e.id === ext.id);
          const isSelected = !!selected;
          
          const div = document.createElement('div');
          div.className = 'extra-card' + (isSelected ? ' selected' : '');
          
          div.dataset.extraId = ext.id;

          const auto = cantidadAutomatica(ext);
          const esAutomatico = auto !== null;
          const manual = Boolean(selected?.qtyManual);

          // Cantidad que se muestra: la ajustada por el usuario si la hay, si no
          // la que sale del proyecto.
          const qty = isSelected
              ? number(selected.quantity)
              : (esAutomatico && auto > 0 ? auto : (ext.defaultQty || 1));
          const calculated = calculateExtraPrice(ext, qty, manual);

          // Un extra automatico sin su magnitud aun definida no puede cotizarse.
          const faltaBase = esAutomatico && !auto && !manual;
          const textoPrecio = faltaBase
              ? (ext.base === 'casa_m2' ? 'Elige tu vivienda' : 'Falta superficie')
              : (calculated > 0 ? format(calculated) : 'Por calcular');

          // Los items por m2 de casa AHORA son editables. Antes solo se mostraba
          // el texto "72 m2 de casa" sin forma de cambiarlo, y no todos se
          // ejecutan sobre el 100% de la superficie: el ceramico no va en toda
          // la casa. Se parte de los m2 de la casa y el usuario los corrige.
          const unidad = ext.base === 'casa_m2' || ext.tipoCalculo === 'mt2' ? 'm²' : '';
          let qtyHTML = '';
          if (!isSelected) {
              qtyHTML = esAutomatico
                  ? `<span class="extra-auto">${escapeHtml(detalleCantidad(ext, auto))}</span>`
                  : '';
          } else {
              // Se pintan los dos y se alterna con una clase: al escribir en el
              // input no se puede rehacer el HTML de la tarjeta, porque eso le
              // movería el cursor al usuario a mitad de un número.
              const referencia = esAutomatico && auto > 0
                  ? `<span class="extra-auto-hint" ${manual ? 'hidden' : ''}>= ${escapeHtml(detalleCantidad(ext, auto))}</span>
                     <button type="button" class="extra-reset" ${manual ? '' : 'hidden'}>volver a ${auto} ${unidad}</button>`
                  : '';
              qtyHTML = `<input type="number" class="extra-qty-input" value="${qty}" min="${ext.minQty || 1}" max="${ext.maxQty || 10000}" step="1" aria-label="Cantidad en ${unidad || 'unidades'} para ${escapeHtml(ext.nombre)}">
                 <span class="extra-unit">${unidad}</span>
                 ${referencia}`;
          }

          div.innerHTML = `<div class="extra-check">${isSelected ? '✓' : ''}</div>
          <div class="extra-info">
             <strong>${escapeHtml(ext.nombre)}</strong>
             <small>${escapeHtml(ext.descripcion || '')}</small>
             ${ext.valor ? `<small class="extra-unit-price">${format(ext.valor)} / ${unidad || 'un'}</small>` : ''}
          </div>
          <div class="extra-qty">${qtyHTML}</div>
          <div class="extra-price">${escapeHtml(textoPrecio)}</div>`;

          div.onclick = (e) => {
              // No alternar el item si el click fue en el input o en el boton de
              // volver a los metros de la casa.
              if (e.target.closest('input, .extra-reset')) return;
              toggleExtra(ext.id, !isSelected);
          };

          const input = div.querySelector('input');
          if (input) {
              input.oninput = (e) => {
                  updateExtraQty(ext.id, number(e.target.value));
              };
          }

          const reset = div.querySelector('.extra-reset');
          if (reset) reset.onclick = () => resetExtraQty(ext.id);

          grid.appendChild(div);
      });
  }


  function renderUI() {
    renderParcelUI();
    renderHousingUI();
    renderFoundationUI();
    renderExtrasUI();
    updateSummaryUI();
  }

  function renderParcelUI() {
    if (!ctx.parcel.snapshot) {
      if($('parcel-name')) $('parcel-name').textContent = 'Cargando datos reales de parcela...';
      return;
    }
    const snap = ctx.parcel.snapshot;
    if($('parcel-image')) $('parcel-image').src = snap.imagen || './assets/logo-tu-parcela-lista.png';
    if($('parcel-name')) $('parcel-name').textContent = snap.nombre || 'Parcela seleccionada';
    if($('parcel-meta')) $('parcel-meta').textContent = `${snap.comuna || 'Comuna'} · ${snap.superficieM2 ? snap.superficieM2.toLocaleString('es-CL')+' m²' : ''} · ${format(snap.precioPublicado)}`;
    
    const step1 = document.getElementById('step1-compact') || document.createElement('div');
    if (!document.getElementById('step1-compact')) {
        step1.id = 'step1-compact';
        step1.className = 'project-snapshot-card';
        const housingStep = $('housing-step');
        if (housingStep) housingStep.parentNode.insertBefore(step1, housingStep);
    }
    step1.innerHTML = `<div class="snapshot-check">✓</div><div class="snapshot-info"><span>TERRENO</span><strong>${snap.nombre || 'Parcela'}</strong></div><div class="snapshot-price">${format(snap.precioPublicado)}</div>`;
  }

  function setHousingMode(mode) {
      ctx.housing.mode = mode;
      if (mode === 'custom' && !ctx.housing.customConfig) {
          ctx.housing.customConfig = { m2: 72, rooms: 3, material: customMaterials[0], confirmed: false };
      } else if (mode === 'custom' && ctx.housing.customConfig) {
          ctx.housing.customConfig.confirmed = false;
      }
      TPLProjectContextManager.save(ctx);
      renderHousingUI();
  }

  function selectHouse(id) {
      const h = houses.find(x => String(x.id) === String(id));
      if (!h) return;
      ctx.housing.mode = 'prefab';
      ctx.housing.houseId = id;
      ctx.housing.snapshot = {
          nombre: h.nombre,
          precio: number(h.valorCasa || h.precio || h.valor),
          metros: number(h.metros || h.mt2 || h.superficie),
          habitaciones: number(h.habitaciones || h.dormitorios)
      };
      TPLProjectContextManager.save(ctx);
      calculateQuote();
      renderUI();
  }

  function bindHousingEvents() {
      // Step buttons
      const btnPrefab = document.querySelector('[data-housing="prefabricada"]');
      const btnCustom = document.querySelector('[data-housing="diseno-propio"]');
      
      if(btnPrefab) btnPrefab.onclick = () => setHousingMode('prefab');
      if(btnCustom) btnCustom.onclick = () => setHousingMode('custom');

      // Custom Inputs
      const customM2 = $('custom-m2');
      const customRooms = $('custom-rooms');
      
      const updateCustom = () => {
          if(ctx.housing.mode !== 'custom') return;
          ctx.housing.customConfig.m2 = number(customM2.value);
          ctx.housing.customConfig.rooms = number(customRooms.value);
          TPLProjectContextManager.save(ctx);
          calculateQuote();
          updateSummaryUI();
          // La fundacion y varias obras se cobran por m2 de casa: si no se
          // redibujan, sus tarjetas siguen mostrando los metros anteriores
          // mientras el resumen ya cobra los nuevos. No se llama a renderUI()
          // entero para no reescribir el input mientras el usuario escribe.
          renderFoundationUI();
          renderExtrasUI();
      };
      if(customM2) customM2.oninput = updateCustom;
      if(customRooms) customRooms.oninput = updateCustom;
      
      const sizeBtns = document.querySelectorAll('.size-grid button');
      sizeBtns.forEach(btn => {
          btn.onclick = () => {
              if(ctx.housing.mode !== 'custom') return;
              const sq = number(btn.dataset.size);
              if (sq) {
                  ctx.housing.customConfig.m2 = sq;
                  if (customM2) customM2.value = sq;
                  TPLProjectContextManager.save(ctx);
                  calculateQuote();
                  updateSummaryUI();
                  renderFoundationUI();
                  renderExtrasUI();
              }
          };
      });

      const confirmBtn = $('confirm-custom-design');
      if (confirmBtn) {
          confirmBtn.onclick = () => {
              if(ctx.housing.mode === 'custom') {
                  ctx.housing.customConfig.confirmed = true;
                  TPLProjectContextManager.save(ctx);
                  renderUI();
              }
          };
      }
  }

  function renderPrefabCatalog() {
      const grid = $('prefab-grid');
      if(!grid) return;
      grid.innerHTML = '';
      houses.forEach(h => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'house-card';
          if(String(ctx.housing.houseId) === String(h.id)) btn.classList.add('selected');
          
          btn.innerHTML = `
              <img src="${h.foto || h.imagenes?.[0] || ''}" alt="${h.nombre}">
              <div class="house-card-content">
                  <strong>${h.nombre}</strong>
                  <small>${h.metros} m² · ${h.habitaciones} dorm.</small>
                  <span class="price">${format(h.valorCasa || h.precio)}</span>
              </div>
          `;
          btn.onclick = () => selectHouse(h.id);
          grid.appendChild(btn);
      });
  }

  function renderCustomMaterials() {
      const grid = $('material-grid');
      if(!grid) return;
      grid.innerHTML = '';
      customMaterials.forEach(m => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'material-card';
          if(ctx.housing.mode === 'custom' && ctx.housing.customConfig?.material?.id === m.id) btn.classList.add('selected');
          btn.innerHTML = `<strong>${m.name}</strong><small>${format(m.priceM2)} / m²</small>`;
          btn.onclick = () => {
              if(ctx.housing.mode === 'custom') {
                  ctx.housing.customConfig.material = m;
                  TPLProjectContextManager.save(ctx);
                  calculateQuote();
                  renderUI();
              }
          };
          grid.appendChild(btn);
      });
  }

  function renderHousingUI() {
    const stepChoice = $('housing-step');
    const panelPrefab = $('prefab-panel');
    const panelCustom = $('custom-panel');
    let step2Compact = $('step2-compact');

    // Hide all first
    if(stepChoice) stepChoice.hidden = true;
    if(panelPrefab) panelPrefab.hidden = true;
    if(panelCustom) panelCustom.hidden = true;
    if(step2Compact) step2Compact.hidden = true;

    if (ctx.housing.mode === 'prefab' && ctx.housing.snapshot) {
        if (!step2Compact) {
            step2Compact = document.createElement('div');
            step2Compact.id = 'step2-compact';
            step2Compact.className = 'project-snapshot-card';
            if (stepChoice) stepChoice.parentNode.insertBefore(step2Compact, stepChoice.nextSibling);
        }
        step2Compact.hidden = false;
        step2Compact.innerHTML = `<div class="snapshot-check">✓</div><div class="snapshot-info"><span>VIVIENDA</span><strong>${ctx.housing.snapshot.nombre}</strong><small>${ctx.housing.snapshot.metros} m² · ${ctx.housing.snapshot.habitaciones} dorm.</small></div><div class="snapshot-price">${format(ctx.housing.snapshot.precio)}</div><button id="btn-change-house" class="btn btn-glass" style="margin-left:auto;">Cambiar vivienda</button>`;
        
        const btnChange = $('btn-change-house');
        if(btnChange) {
            btnChange.onclick = () => {
                ctx.housing.houseId = null;
                ctx.housing.snapshot = null;
                ctx.housing.mode = null;
                TPLProjectContextManager.save(ctx);
                calculateQuote();
                renderUI();
            };
        }
    } else if (ctx.housing.mode === 'custom' && ctx.housing.customConfig?.confirmed) {
        if (!step2Compact) {
            step2Compact = document.createElement('div');
            step2Compact.id = 'step2-compact';
            step2Compact.className = 'project-snapshot-card';
            if (stepChoice) stepChoice.parentNode.insertBefore(step2Compact, stepChoice.nextSibling);
        }
        step2Compact.hidden = false;
        
        const materialName = ctx.housing.customConfig?.material?.name || 'Por definir';
        const customPrice = ctx.pricing.house;
        
        step2Compact.innerHTML = `<div class="snapshot-check">✓</div><div class="snapshot-info"><span>VIVIENDA</span><strong>Diseño Propio</strong><small>${ctx.housing.customConfig.m2} m² · ${materialName}</small></div><div class="snapshot-price">${format(customPrice)}</div><button id="btn-change-house" class="btn btn-glass" style="margin-left:auto;">Modificar diseño</button>`;
        
        const btnChange = $('btn-change-house');
        if(btnChange) {
            btnChange.onclick = () => {
                ctx.housing.customConfig.confirmed = false;
                TPLProjectContextManager.save(ctx);
                calculateQuote();
                renderUI();
            };
        }
    } else if (ctx.housing.mode === 'prefab' && !ctx.housing.snapshot) {
        if(panelPrefab) panelPrefab.hidden = false;
        renderPrefabCatalog();
    } else if (ctx.housing.mode === 'custom' && !ctx.housing.customConfig?.confirmed) {
        if(panelCustom) panelCustom.hidden = false;
        renderCustomMaterials();
        
        if($('custom-m2') && ctx.housing.customConfig) $('custom-m2').value = ctx.housing.customConfig.m2;
        if($('custom-rooms') && ctx.housing.customConfig) $('custom-rooms').value = ctx.housing.customConfig.rooms;
    } else {
        if(stepChoice) stepChoice.hidden = false;
    }
  }

  function updateSummaryUI() {
    if($('sum-parcel')) $('sum-parcel').textContent = format(ctx.pricing.parcel);
    if($('sum-house')) $('sum-house').textContent = ctx.pricing.house ? format(ctx.pricing.house) : 'Por definir';
    if($('sum-foundation')) $('sum-foundation').textContent = ctx.pricing.foundation ? format(ctx.pricing.foundation) : 'Por definir';
    if($('sum-extras')) $('sum-extras').textContent = ctx.pricing.extras ? format(ctx.pricing.extras) : '$0';
    if($('sum-total')) $('sum-total').textContent = format(ctx.pricing.total);
    if($('sum-size')) $('sum-size').textContent = getHousingM2() + ' m²';
  }

  // Final Action to Save and navigate
  // 'tipo' esta limitado por un CHECK en tpl_oportunidades; 'cotizacion' es el
  // valor valido. Para distinguir estas solicitudes de otras cotizaciones se usa
  // 'origen', que es texto libre y ademas participa en el antiduplicado del RPC.
  const ORIGEN_COTIZADOR = 'cotizador_proyecto';

  /** Valida el formulario de cierre. Devuelve el primer problema o null. */
  function validarDatosCliente() {
      const nombre = ($('client-name')?.value || '').trim();
      const email = ($('client-email')?.value || '').trim();
      const telefono = ($('client-phone')?.value || '').trim();

      if (nombre.length < 2) return 'Escribe tu nombre para continuar.';
      // Correo o WhatsApp: basta con uno de los dos.
      if (!email && !telefono) return 'Déjanos tu correo o tu WhatsApp para poder contactarte.';
      if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return 'Revisa tu correo: no parece válido.';
      if (telefono && telefono.replace(/\D/g, '').length < 8) return 'Revisa tu WhatsApp: faltan dígitos.';
      if (!$('client-consent')?.checked) return 'Necesitamos tu autorización para contactarte.';
      return null;
  }

  /** Arma el resumen legible del proyecto y lo manda por correo al cliente. */
  async function enviarResumenPorCorreo(token) {
      const cfg = window.TPLDataService?.config;
      if (!cfg?.url) return;

      const catalogoExtras = window.extrasOpcionales || [];
      const proyecto = {
          parcela: ctx.parcel.snapshot,
          vivienda: {
              nombre: ctx.housing.snapshot?.nombre ||
                      (ctx.housing.mode === 'custom' ? 'Diseño propio' : ''),
              m2: getHousingM2()
          },
          fundacion: ctx.foundation.snapshot,
          extras: ctx.extras.map((e) => {
              const def = catalogoExtras.find((x) => String(x.id) === String(e.id));
              return {
                  nombre: e.snapshot?.name || e.id,
                  detalle: detalleCantidad(def || e.snapshot, cantidadAutomatica(def || e.snapshot) ?? e.quantity),
                  precio: e.calculatedPrice || 0
              };
          }),
          precios: ctx.pricing
      };

      await fetch(`${cfg.url}/functions/v1/enviar-resumen-cotizacion`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'apikey': cfg.publishableKey,
              'Authorization': `Bearer ${cfg.publishableKey}`
          },
          body: JSON.stringify({
              nombre: ctx.metadata.client.name,
              email: ctx.metadata.client.email,
              token,
              proyecto
          })
      });
  }

  function bindActions() {
      const btnSave = $('open-project');
      if (btnSave) {
          btnSave.onclick = async () => {
              const problema = validarDatosCliente();
              const estado = $('save-status');
              if (problema) {
                  if (estado) estado.textContent = problema;
                  else alert(problema);
                  return;
              }
              if (estado) estado.textContent = '';

              btnSave.disabled = true;
              btnSave.textContent = 'Guardando...';

              ctx.metadata.client = {
                  name: ($('client-name').value || '').trim(),
                  phone: ($('client-phone')?.value || '').trim(),
                  email: ($('client-email')?.value || '').trim(),
                  commune: ($('client-commune')?.value || '').trim()
              };
              TPLProjectContextManager.save(ctx);

              try {
                  if (window.TPLDataService && window.TPLDataService.createPublicOpportunity) {
                      const registro = await window.TPLDataService.createPublicOpportunity({
                          tipo: 'cotizacion',
                          origen: ORIGEN_COTIZADOR,
                          nombre_contacto: ctx.metadata.client.name,
                          email: ctx.metadata.client.email,
                          telefono: ctx.metadata.client.phone,
                          propiedad_id: ctx.parcel.id,
                          // Solo el proyecto: los datos de contacto ya van como
                          // campos propios, repetirlos aqui era redundante.
                          metadata: {
                              parcela_codigo: ctx.parcel.id,
                              parcela: ctx.parcel.snapshot,
                              vivienda: { modo: ctx.housing.mode, snapshot: ctx.housing.snapshot, custom: ctx.housing.customConfig },
                              fundacion: ctx.foundation.snapshot,
                              extras: ctx.extras.map(e => ({ id: e.id, cantidad: e.quantity, precio: e.calculatedPrice })),
                              precios: ctx.pricing,
                              comuna_cliente: ctx.metadata.client.commune
                          }
                      });

                      // El correo es un paso aparte: si falla, la oportunidad
                      // ya quedó registrada y el asesor igual puede contactar.
                      if (registro?.comienzo_token && ctx.metadata.client.email) {
                          enviarResumenPorCorreo(registro.comienzo_token).catch((err) =>
                              console.error('La cotización quedó guardada, pero el correo no salió', err));
                      }
                  }
              } catch (e) {
                  // El visitante no pierde su cotizacion aunque el backend falle,
                  // pero antes esto era invisible: ahora queda registrado.
                  console.error('No se pudo registrar la cotización en el backend', e);
                  if (estado) estado.textContent = 'Guardamos tu proyecto en este dispositivo. Si no te contactamos pronto, escríbenos por WhatsApp.';
              }

              // proyecto.html lee el mismo contexto desde sessionStorage.
              window.location.href = './proyecto.html';
          };
      }
  }

  /**
   * Mantiene alineados los dos almacenes que conviven en el sitio.
   *
   * El cotizador guarda su estado en sessionStorage (tpl_project_context_v1),
   * pero tpl-seo.js y parcela.html leen localStorage (selectedParcelaId /
   * selectedParcelaData). Sin sincronizar:
   *   - la parcela se pierde al cerrar la pestana (sessionStorage no persiste);
   *   - si el visitante ya habia visto otra parcela, el resumen "proyecto que
   *     elegiste" seguia mostrando ESA, no la que trae la URL.
   */
  function sincronizarParcelaElegida(contexto) {
    const id = contexto?.parcel?.id;
    if (!id) return;
    try {
      localStorage.setItem('selectedParcelaId', String(id));
      const idStr = String(id);
      const completa = fallbackParcels.find(x =>
        String(x.id) === idStr || String(x.codigo) === idStr || String(x.canonicalId) === idStr);
      const snap = contexto.parcel.snapshot;
      // tpl-seo.js espera la forma del catalogo (nombre, tamano, imagen...).
      const datos = completa || (snap ? {
        id,
        nombre: snap.nombre,
        precio: snap.precioPublicado,
        tamano: snap.superficieM2,
        comuna: snap.comuna,
        imagen: snap.imagen,
        imagenes: snap.imagenes
      } : null);
      if (datos) localStorage.setItem('selectedParcelaData', JSON.stringify(datos));
    } catch (e) {
      // Modo privado o almacenamiento lleno: el cotizador sigue funcionando
      // con sessionStorage, solo se pierde la continuidad entre paginas.
      console.warn('No se pudo sincronizar la parcela elegida', e);
    }
  }

  // FASE 2: Hidratación Canónica
  async function init() {
    bindHousingEvents();
    bindActions();

    if (ctx.parcel.id && !ctx.parcel.snapshot) {
      const idStr = String(ctx.parcel.id);
      // El catalogo local se resuelve SIEMPRE, no solo como plan B: Supabase
      // suele traer precio_publicado en 0 y aqui esta el valor real.
      const local = fallbackParcels.find(x =>
        String(x.id) === idStr || String(x.codigo) === idStr || String(x.canonicalId) === idStr) || null;

      let remoteParcel = null;
      try {
        if (window.TPLDataService && window.TPLDataService.getPublishedPropertyById) {
          remoteParcel = await window.TPLDataService.getPublishedPropertyById(ctx.parcel.id);
        }
      } catch (e) {
        console.warn('No se pudo obtener la parcela desde Supabase, usando catálogo local', e);
      }

      if (remoteParcel || local) {
        const r = remoteParcel || {};
        const l = local || {};
        const imagenes = (Array.isArray(r.imagenes) && r.imagenes.length ? r.imagenes : l.imagenes) || [];
        ctx.parcel.snapshot = {
          nombre: r.titulo || r.nombre || l.nombre || r.codigo,
          // Mismo respaldo que en js/index.js y js/parcela.js.
          precioPublicado: number(r.precio_publicado) || number(l.precio || l.valor || l.price),
          superficieM2: number(r.superficie_m2 || l.tamano || l.superficie || l.m2),
          imagen: r.imagen || imagenes[0] || l.imagen || '',
          imagenes,
          comuna: r.comuna || l.comuna
        };
      }
      TPLProjectContextManager.save(ctx);
    }

    // Publicar la parcela en el almacen que lee el resto del sitio
    // (tpl-seo.js, parcela.html). Sin esto la eleccion se pierde al cerrar la
    // pestana y, peor, queda visible una parcela antigua de otra visita.
    sincronizarParcelaElegida(ctx);
    
    if (ctx.housing.mode === 'prefab' && ctx.housing.houseId && !ctx.housing.snapshot) {
        const h = houses.find(x => String(x.id) === String(ctx.housing.houseId));
        if (h) {
            ctx.housing.snapshot = {
                nombre: h.nombre,
                precio: number(h.valorCasa || h.precio || h.valor),
                metros: number(h.metros || h.mt2 || h.superficie),
                habitaciones: number(h.habitaciones || h.dormitorios)
            };
            TPLProjectContextManager.save(ctx);
        }
    }

    calculateQuote();
    renderUI();
    updateHeroGallery();
  }

  function updateHeroGallery() {
    const overlay = $('hero-gallery-overlay');
    if (!overlay) return;
    overlay.innerHTML = '';
    
    if (ctx.parcel.snapshot) {
        let imgs = Array.isArray(ctx.parcel.snapshot.imagenes) ? ctx.parcel.snapshot.imagenes : [];
        if (imgs.length === 0 && ctx.parcel.snapshot.imagen) imgs = [ctx.parcel.snapshot.imagen];
        
        imgs = imgs.filter(Boolean);
        
        if (imgs.length > 0) {
            overlay.classList.add('has-images');
            
            // Si hay 4 o más imágenes, hacemos una grilla premium
            if (imgs.length >= 4) {
                overlay.classList.add('gallery-grid');
                imgs.slice(0, 4).forEach(src => {
                    const img = document.createElement('img');
                    img.src = src;
                    overlay.appendChild(img);
                });
            } else {
                // Si hay menos, usamos solo la primera de fondo
                overlay.classList.remove('gallery-grid');
                const img = document.createElement('img');
                img.src = imgs[0];
                overlay.appendChild(img);
            }
        }
    }
  }

  // Estilos UI Fase 3 y 4 (Acordeón, Catálogo visual)
  const style = document.createElement('style');
  style.textContent = `
    .project-snapshot-card { display: flex; align-items: center; background: var(--bg-surface-2, #fff); padding: 1rem; border-radius: 12px; margin-bottom: 1rem; box-shadow: 0 2px 8px rgba(0,0,0,0.05); gap: 1rem; border: 1px solid var(--border-color, #eee); }
    .snapshot-check { background: var(--tpl-primary, #4caf50); color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0; }
    .snapshot-info { flex: 1; display: flex; flex-direction: column; }
    .snapshot-info span { font-size: 0.75rem; color: #666; font-weight: 700; letter-spacing: 0.05em; }
    .snapshot-info strong { font-size: 1.1rem; color: var(--text-main, #222); line-height: 1.2; }
    .snapshot-info small { color: #888; font-size: 0.85rem; }
    .snapshot-price { font-weight: 800; font-size: 1.1rem; color: var(--tpl-primary, #4caf50); }
    
    /* Prefab Grid */
    .prefab-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; margin-top: 1.5rem; }
    .house-card { background: white; border: 1px solid #ddd; border-radius: 12px; overflow: hidden; text-align: left; cursor: pointer; transition: all 0.2s; display:flex; flex-direction:column; padding:0; }
    .house-card:hover { border-color: var(--tpl-primary, #4caf50); transform: translateY(-2px); }
    .house-card img { width: 100%; height: 160px; object-fit: cover; }
    .house-card-content { padding: 1rem; display:flex; flex-direction:column; gap:0.25rem; }
    .house-card-content strong { font-size: 1rem; color:#222; }
    .house-card-content small { color: #666; font-size: 0.85rem; }
    .house-card-content .price { font-weight: 700; color: var(--tpl-primary, #4caf50); font-size: 1.1rem; margin-top:0.5rem; }
    
    /* Material Grid */
    .material-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; margin-top: 1rem; }
    .material-card { background: #f9f9f9; border: 1px solid #e0e0e0; padding: 1rem; border-radius: 8px; text-align: left; cursor: pointer; display: flex; flex-direction: column; }
    .material-card.selected { border-color: var(--tpl-primary, #4caf50); background: #f0fdf4; }
    .material-card strong { font-size: 1rem; color: #333; }
    .material-card small { font-size: 0.85rem; color: #666; margin-top: 0.25rem; }
    
    .extra-card { display: flex; align-items: center; background: white; border: 1px solid #ddd; padding: 1rem; border-radius: 12px; cursor: pointer; transition: 0.2s; gap: 1rem; text-align: left; margin-bottom: 0.5rem; }
    .extra-card.selected { border-color: var(--tpl-primary, #4caf50); background: #f0fdf4; }
    .extra-check { width: 24px; height: 24px; border: 2px solid #ccc; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: transparent; font-weight: bold; flex-shrink: 0; }
    .extra-card.selected .extra-check { background: var(--tpl-primary, #4caf50); border-color: var(--tpl-primary, #4caf50); color: white; }
    .extra-info { flex: 1; display: flex; flex-direction: column; }
    .extra-info strong { font-size: 1rem; color: #333; }
    .extra-info small { color: #666; font-size: 0.85rem; }
    .extra-qty { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; justify-content: flex-end; max-width: 150px; }
    .extra-qty-input { width: 64px; padding: 0.3rem; border: 1px solid #ccc; border-radius: 6px; text-align: center; font-weight: 700; }
    .extra-qty-input:focus { outline: 2px solid var(--tpl-primary, #4caf50); outline-offset: 1px; }
    .extra-unit { color: #666; font-size: 0.85rem; font-weight: 700; }
    .extra-unit-price { color: #0a5ca6 !important; font-weight: 700; margin-top: 2px; }
    .extra-auto, .extra-auto-hint { color: #687789; font-size: 0.78rem; }
    /* Aparece solo cuando el usuario cambió los metros sugeridos. */
    .extra-reset { width: 100%; background: none; border: 0; padding: 2px 0 0; color: #0a5ca6; font-size: 0.72rem; font-weight: 700; text-decoration: underline; cursor: pointer; text-align: right; }
    .extra-price { font-weight: 700; color: #444; white-space: nowrap; }
    .foundation-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; margin-top: 1rem; }
    .extras-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; margin-top: 1rem; }
  `;
  document.head.appendChild(style);

  // Inicialización
  init();
})();
