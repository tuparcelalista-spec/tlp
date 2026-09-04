(()=>{
  'use strict';
  
  const $=id=>document.getElementById(id);
  const params=new URLSearchParams(location.search);
  const format=n=>new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(Number(n)||0);
  const number=v=>Number(String(v??'').replace(/[^0-9.-]/g,''))||0;
  
  // TPLProjectContextManager (FASE 1)
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

  // Dependencias Estáticas (Fallback / Canónicas de casas y extras)
  const lexicalParcels=(()=>{try{return typeof parcelas!=='undefined'&&Array.isArray(parcelas)?parcelas:[]}catch{return[]}})();
  const fallbackParcels=Array.isArray(window.parcelas)?window.parcelas:(lexicalParcels.length?lexicalParcels:(Array.isArray(window.parcelasPortal)?window.parcelasPortal:[]));
  const houses=Array.isArray(window.casas)?window.casas:[];
  
  const fundaciones = Array.isArray(window.fundaciones) ? window.fundaciones : [];
  const extrasOpcionales = Array.isArray(window.extrasOpcionales) ? window.extrasOpcionales : [];

  // FASE 2: RESOLUCIÓN DE INTENCIÓN Y PARCELA
  const urlParcelId = params.get('parcela') || params.get('parcelaId');
  const urlHouseId = params.get('casa') || params.get('casaId');
  
  if (urlParcelId && ctx.parcel.id !== urlParcelId) {
    // Intención de nueva parcela por URL -> Destruir contexto y crear uno nuevo
    TPLProjectContextManager.clear();
    ctx = TPLProjectContextManager.createEmpty();
    ctx.parcel.id = urlParcelId;
    if (urlHouseId) {
      ctx.housing.mode = 'prefab';
      ctx.housing.houseId = urlHouseId;
    }
    TPLProjectContextManager.save(ctx);
  } else if (!urlParcelId && !ctx.parcel.id) {
    // Fallback si no hay parcela en URL ni en Contexto, buscar en localStorage antiguo (solo por compatibilidad inicial)
    const oldParcelId = localStorage.getItem('selectedParcelaId');
    if (oldParcelId) {
       ctx.parcel.id = oldParcelId;
       TPLProjectContextManager.save(ctx);
    }
  }

  // Si hay housing request en URL que sea diseño propio (legacy param)
  if (params.get('tipo') === 'diseno-propio') {
      ctx.housing.mode = 'custom';
      ctx.housing.customConfig = { m2: 72, rooms: 3, material: null };
      ctx.housing.houseId = null;
      ctx.housing.snapshot = null;
      TPLProjectContextManager.save(ctx);
  }

  // Precios centralizados (FASE 7 - Motor unificado)
  function calculateQuote() {
    ctx.pricing.parcel = ctx.parcel.snapshot ? number(ctx.parcel.snapshot.precioPublicado) : 0;
    
    ctx.pricing.house = 0;
    if (ctx.housing.mode === 'prefab' && ctx.housing.snapshot) {
       ctx.pricing.house = number(ctx.housing.snapshot.precio);
    } else if (ctx.housing.mode === 'custom' && ctx.housing.customConfig && ctx.housing.customConfig.material) {
       ctx.pricing.house = number(ctx.housing.customConfig.m2) * number(ctx.housing.customConfig.material.priceM2);
    }

    ctx.pricing.foundation = ctx.foundation.snapshot ? number(ctx.foundation.snapshot.priceCalculated || 0) : 0;
    
    ctx.pricing.extras = ctx.extras.reduce((acc, ext) => acc + number(ext.snapshot?.calculatedPrice || 0), 0);
    
    ctx.pricing.total = ctx.pricing.parcel + ctx.pricing.house + ctx.pricing.foundation + ctx.pricing.extras;
    
    TPLProjectContextManager.save(ctx);
  }

  // Renderizado UI (FASE 3 - Acordeón / Vista compacta)
  function renderUI() {
    renderParcelUI();
    // Pronto implementaremos renderHousingUI()
    updateSummaryUI();
  }

  function renderParcelUI() {
    if (!ctx.parcel.snapshot) {
      $('parcel-name').textContent = 'Cargando datos reales de parcela...';
      return;
    }
    const snap = ctx.parcel.snapshot;
    $('parcel-image').src = snap.imagen || './assets/logo-tu-parcela-lista.png';
    $('parcel-name').textContent = snap.nombre || 'Parcela seleccionada';
    $('parcel-meta').textContent = `${snap.comuna || 'Comuna'} · ${snap.superficieM2 ? snap.superficieM2.toLocaleString('es-CL')+' m²' : ''} · ${format(snap.precioPublicado)}`;
    
    // Tarjeta "Terreno ✓"
    const step1 = document.getElementById('step1-compact') || document.createElement('div');
    if (!document.getElementById('step1-compact')) {
        step1.id = 'step1-compact';
        step1.className = 'project-snapshot-card';
        // Inyectamos antes del housing grid si existe
        const housingStep = $('housing-step');
        if (housingStep) housingStep.parentNode.insertBefore(step1, housingStep);
    }
    step1.innerHTML = `<div class="snapshot-check">✓</div><div class="snapshot-info"><span>TERRENO</span><strong>${snap.nombre || 'Parcela'}</strong></div><div class="snapshot-price">${format(snap.precioPublicado)}</div>`;
  }

  function updateSummaryUI() {
    $('sum-parcel').textContent = format(ctx.pricing.parcel);
    $('sum-house').textContent = ctx.pricing.house ? format(ctx.pricing.house) : 'Por definir';
    $('sum-total').textContent = format(ctx.pricing.total);
  }

  async function init() {
    if (ctx.parcel.id && !ctx.parcel.snapshot) {
      // Rehidratar desde Supabase
      try {
        if (window.TPLDataService && window.TPLDataService.getPublishedPropertyById) {
          const remoteParcel = await window.TPLDataService.getPublishedPropertyById(ctx.parcel.id);
          if (remoteParcel) {
            ctx.parcel.snapshot = {
              nombre: remoteParcel.titulo || remoteParcel.nombre || remoteParcel.codigo,
              precioPublicado: number(remoteParcel.precio_publicado || remoteParcel.precio || remoteParcel.valor),
              superficieM2: number(remoteParcel.superficie_m2 || remoteParcel.tamano || remoteParcel.m2),
              imagen: remoteParcel.imagen || (remoteParcel.imagenes && remoteParcel.imagenes[0]) || '',
              comuna: remoteParcel.comuna
            };
          }
        }
      } catch (e) {
        console.warn('No se pudo obtener la parcela desde Supabase, usando fallback', e);
      }

      if (!ctx.parcel.snapshot) {
        // Fallback local
        const p = fallbackParcels.find(x => String(x.id) === String(ctx.parcel.id));
        if (p) {
          ctx.parcel.snapshot = {
              nombre: p.nombre,
              precioPublicado: number(p.precio || p.valor || p.price),
              superficieM2: number(p.tamano || p.superficie || p.m2),
              imagen: p.imagen || (p.imagenes && p.imagenes[0]) || '',
              comuna: p.comuna
          };
        } else {
          // Último recurso: localStorage
          const localStr = localStorage.getItem('selectedParcelaData');
          if (localStr) {
             const localObj = JSON.parse(localStr);
             if (String(localObj.id) === String(ctx.parcel.id)) {
                 ctx.parcel.snapshot = {
                    nombre: localObj.nombre,
                    precioPublicado: number(localObj.precio || localObj.valor),
                    superficieM2: number(localObj.tamano || localObj.m2),
                    imagen: localObj.imagen || '',
                    comuna: localObj.comuna
                 };
             }
          }
        }
      }
      
      TPLProjectContextManager.save(ctx);
    }
    
    // Rehidratar casa si viene en URL o estaba en context
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
  }

  // Añadir un pequeño CSS para el snapshot card (FASE 3)
  const style = document.createElement('style');
  style.textContent = `
    .project-snapshot-card { display: flex; align-items: center; background: var(--bg-surface-2, #fff); padding: 1rem; border-radius: 12px; margin-bottom: 1rem; box-shadow: 0 2px 8px rgba(0,0,0,0.05); gap: 1rem; border: 1px solid var(--border-color, #eee); }
    .snapshot-check { background: var(--tpl-primary, #4caf50); color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; }
    .snapshot-info { flex: 1; display: flex; flex-direction: column; }
    .snapshot-info span { font-size: 0.75rem; color: #666; font-weight: 700; letter-spacing: 0.05em; }
    .snapshot-info strong { font-size: 1.1rem; color: var(--text-main, #222); }
    .snapshot-price { font-weight: 800; font-size: 1.1rem; color: var(--tpl-primary, #4caf50); }
  `;
  document.head.appendChild(style);

  init();
})();
