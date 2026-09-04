// Helpers compartidos.
//
// Van FUERA del IIFE a proposito: al final del archivo hay un bloque de nivel
// superior ("INYECCION TPL V4 ENGINE") que tambien los necesita y que no ve el
// ambito del IIFE. Antes cada bloque redefinia 'money' por su cuenta; al
// declararlos aqui existen una sola vez y ambos los alcanzan.
const money = (val) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(val);
// Acepta 12000000 o "$12.000.000" y devuelve siempre un número.
const toNumber = (val) => typeof val === 'number' ? val : Number(String(val || '').replace(/[^0-9]/g, '')) || 0;
const escape = (str) => String(str||"").replace(/[&<>'"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));

// Lee la tasacion CANONICA que ya viene calculada y guardada en la ficha.
// Devuelve null si la propiedad no tiene tasacion guardada: sin dato real esta
// pagina no muestra un numero, lo declara.
//
// POR QUE EXISTE: los tres bloques de valor de esta pagina llamaban a
// TPLLandEngine.calculate() pasandole el registro crudo del catalogo. El
// catalogo habla otro vocabulario que el motor -- trae tamano/luz/agua/
// naturaleza/rol donde el motor espera area/electricity/water/nature/tourism --
// asi que solo la superficie sobrevivia y el motor no reconocia NINGUN ajuste:
// devolvia la base pelada de superficie. La parcela de Caburgua salia en
// $8.800.000 (5.000 m2 x $2.000 x indice territorial) en vez de los $98.500.000
// que tiene guardados, porque se perdian el +300% de zona turistica, el +30% de
// rio, el +30% de termas, el +20% de empalme y el +15% de rol propio.
//
// Y aunque se le pasara la entrada correcta, recalcular aqui tampoco serviria:
// esta pagina es anonima y no puede leer tpl_geoint_propiedad_contexto, asi que
// el motor caeria al tramo de distancia mas desfavorable. El portal del
// propietario y el informe premium ya leen este mismo guardado; la ficha
// publica ahora tambien.
function valoracionGuardada(parcel) {
  if (!parcel) return null;

  let meta = parcel.metadata;
  if (typeof meta === 'string') {
    try { meta = JSON.parse(meta); } catch { meta = null; }
  }
  const guardado = meta || {};

  // metadata manda sobre la raiz del registro: el objeto de la ficha mezcla el
  // catalogo local con Supabase, y el catalogo puede traer cifras de un motor
  // anterior en esas mismas claves.
  const num = (...claves) => {
    for (const clave of claves) {
      const valor = Number(guardado[clave] ?? parcel[clave]);
      if (Number.isFinite(valor) && valor > 0) return valor;
    }
    return 0;
  };

  const recomendado = num('valor_tpl_recomendado', 'valor_tpl_tasador_ajustado', 'valor_tpl_tasador');
  if (!recomendado) return null;

  return {
    valorRecomendado: recomendado,
    valorComunalBase: num('valor_comunal', 'valor_promedio_comunal'),
    valorTecnico: num('valor_tpl_tecnico'),
    valorVentaApuro: num('valor_venta_apuro'),
    valorM2: num('valor_tpl_m2'),
    referenciaComunalM2: num('referencia_comunal_m2'),
    composicion: guardado.tasacion_composicion || null
  };
}

// Ciudades y comunas de referencia para estimar distancias cuando la ficha no
// las trae. Antes se reconstruian dentro de init() en cada carga.
const CIUDADES_REFERENCIA = [
  { name: 'Concepción', lat: -36.8201, lng: -73.0444 },
  { name: 'Chillán', lat: -36.6066, lng: -72.1034 },
  { name: 'Los Ángeles', lat: -37.4697, lng: -72.3536 },
  { name: 'Temuco', lat: -38.7397, lng: -72.5901 },
  { name: 'Valdivia', lat: -39.8142, lng: -73.2459 },
  { name: 'Puerto Montt', lat: -41.4693, lng: -72.9424 },
  { name: 'Santiago', lat: -33.4489, lng: -70.6693 }
];

const COMUNAS_REFERENCIA = {
  'yumbel': { lat: -37.0945, lng: -72.5604 },
  'quillon': { lat: -36.7423, lng: -72.4722 },
  'quillón': { lat: -36.7423, lng: -72.4722 },
  'nacimiento': { lat: -37.5028, lng: -72.6749 },
  'florida': { lat: -36.8142, lng: -72.6739 },
  'pemuco': { lat: -36.9749, lng: -72.0988 },
  'pucon': { lat: -39.2764, lng: -71.9774 },
  'pucón': { lat: -39.2764, lng: -71.9774 },
  'caburgua': { lat: -39.2764, lng: -71.9774 },
  'negrete': { lat: -37.5910, lng: -72.5283 },
  'bulnes': { lat: -36.7423, lng: -72.2982 },
  'san carlos': { lat: -36.4239, lng: -71.9587 },
  'puerto varas': { lat: -41.3195, lng: -72.9854 },
  'frutillar': { lat: -41.1278, lng: -73.0289 },
  'villarrica': { lat: -39.2818, lng: -72.2274 },
  'rio claro': { lat: -35.25, lng: -71.2833 }
};

/** Distancia aproximada por carretera: Haversine con un factor 1.3 por curvas. */
function distanciaAproxKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1.3);
}

/**
 * Normaliza "Sí"/"si"/"SI" y variantes a booleano.
 *
 * El `includes('si')` que habia aqui daba positivo en cualquier texto con esas
 * dos letras seguidas: "Sin agua" y "Sin factibilidad" se leian como un SI y
 * la ficha anunciaba "Con afluente" en una parcela sin agua. Ahora la negacion
 * se descarta primero y solo se aceptan afirmaciones reconocibles.
 */
/** Primera letra en mayuscula, para textos que la base guarda en minuscula. */
function mayuscula(texto) {
  const v = String(texto || '').trim();
  return v ? v.charAt(0).toUpperCase() + v.slice(1) : '';
}

function esSi(valor) {
  const v = String(valor || '').trim().toLowerCase();
  if (!v || v === 'null' || v === 'false') return false;
  if (/^(no|sin|nunca)\b/.test(v)) return false;
  return v === 'si' || v === 'sí' || v === 'true' || v === '1' || /\b(si|sí)\b/.test(v);
}

(function() {
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const pid = params.get('id');

  /**
   * Catálogo remoto (Supabase) para el buscador IA del final de la ficha.
   *
   * POR QUE EXISTE: filtrarCatalogo() (mas abajo) solo conocia window.parcelas,
   * el catalogo estatico de 32 parcelas sembradas. Una propiedad publicada
   * despues -- por el CRM o el portal del propietario, ej. una parcela nueva
   * en Los Angeles -- nunca esta en ese archivo, asi que el buscador jamas
   * podia encontrarla por palabras clave aunque la propiedad exista y este
   * publicada: "No encontramos parcelas publicadas con esos criterios" para
   * cualquier busqueda que calzara solo con ella. El catalogo principal de
   * index.html no tiene este problema porque mezcla ambas fuentes (ver
   * hydrateRemoteCatalog()/catalog() en js/index.js); se replica el mismo
   * patron aqui para que el buscador conozca TODO lo publicado.
   */
  let remoteCatalog = [];
  let remoteCatalogPromise = null;
  function hydrateRemoteCatalog() {
    if (remoteCatalogPromise) return remoteCatalogPromise;
    remoteCatalogPromise = (async () => {
      if (!window.TPLDataService?.listPublishedProperties) return;
      try {
        const rows = await window.TPLDataService.listPublishedProperties();
        remoteCatalog = (rows || [])
          .map((row) => window.TPLPropertyView?.normalizarPropiedad
            ? window.TPLPropertyView.normalizarPropiedad(row, {
                catalogoLocal: Array.isArray(window.parcelas) ? window.parcelas : [],
              })
            : null)
          .filter((item) => item && item.id);
      } catch (e) {
        console.warn('TPL Parcela: catálogo remoto no disponible para el buscador; se usa solo el catálogo local.', e);
      }
    })();
    return remoteCatalogPromise;
  }

  /** Catálogo local + remoto, sin duplicados (el remoto manda si coinciden). */
  function catalogoCompleto() {
    const local = Array.isArray(window.parcelas) ? window.parcelas.filter(Boolean) : [];
    if (!remoteCatalog.length) return local;
    const normId = (v) => String(v || '').trim().toLowerCase();
    const vistos = new Set(remoteCatalog.map((item) => normId(item.id || item.codigo)));
    return [...remoteCatalog, ...local.filter((item) => !vistos.has(normId(item.id || item.codigo)))];
  }

  /**
   * Obtiene la parcela combinando Supabase (fuente autoritativa) con el
   * catalogo local, que aporta los campos que la base aun no tiene.
   * Devuelve null si no se encuentra por ninguna via.
   */
  async function cargarParcela() {
    let parcel = null;
    try {
      if (window.TPLDataService && window.TPLDataService.getPublishedPropertyById) {
        const remote = await window.TPLDataService.getPublishedPropertyById(pid);
        // La normalización de una fila remota a objeto "parcela" vive ahora
        // en un único lugar: js/core/tpl-property-view.js
        // (TPLPropertyView.normalizarPropiedad), compartido con js/index.js.
        // Antes esta funcion tenia su propia copia -- que ademas ignoraba
        // remote.imagenes y volvia a calcular las fotos solo desde
        // metadata.imagenes, por eso una parcela con fotos reales (ej.
        // Virquenco) se veia sin fotos en su propia ficha.
        if (remote && window.TPLPropertyView?.normalizarPropiedad) {
          parcel = window.TPLPropertyView.normalizarPropiedad(remote, {
            catalogoLocal: Array.isArray(window.parcelas) ? window.parcelas : [],
          });
        } else if (remote) {
          console.warn('TPL Parcela: TPLPropertyView no está cargado; usando normalización mínima de respaldo.');
          const meta = (typeof remote.metadata === 'string' ? JSON.parse(remote.metadata) : remote.metadata) || {};
          const local = window.parcelas.find(p => String(p.id) === pid || p.codigo === pid) || {};
          const precioValue = Number(remote.precio_publicado) || toNumber(meta.precio) || toNumber(local.precio) || 0;
          parcel = {
            ...local,
            ...remote,
            id: remote.codigo || remote.id,
            canonicalId: remote.id,
            precioNumero: precioValue,
            precio: precioValue ? money(precioValue) : 'Consultar',
            imagenes: Array.isArray(remote.imagenes) ? remote.imagenes.filter(Boolean) : [],
            imagen: (remote.imagenes || [])[0] || local.imagen || '',
            metadata: meta,
            fuenteDatos: 'supabase',
          };
        }
      }
    } catch(e) { console.warn("Error hidratando parcela desde Supabase", e); }

    if (!parcel) {
      parcel = window.parcelas.find(p => String(p.id) === pid || p.codigo === pid) || null;
    }
    return parcel;
  }

  /** Encabezado, precio, superficie y el ribbon de caracteristicas. */
  function pintarDatosBasicos(parcel) {
    if ($("v3-title")) $("v3-title").textContent = parcel.titulo || parcel.nombre || "Parcela en Venta";
    if ($("v3-region")) $("v3-region").textContent = parcel.region || "Región no especificada";
    if ($("v3-comuna")) {
      $("v3-comuna").textContent = parcel.comuna || "Comuna no especificada";
      if ($("v3-crm-comuna")) $("v3-crm-comuna").textContent = parcel.comuna || "la zona";
    }
    if ($("v3-price")) {
      const precioNum = parcel.precioNumero || toNumber(parcel.precio);
      $("v3-price").textContent = precioNum > 0 ? money(precioNum) : "Consultar precio";
    }

    const size = parcel.superficie_m2 || parcel.superficie || parcel.tamano;
    if ($("v3-superficie")) $("v3-superficie").textContent = size ? `${Number(size).toLocaleString('es-CL')} m²` : "Por confirmar";
    if ($("v3-topografia")) $("v3-topografia").textContent = parcel.topografia || "Pendiente mixta";

    if ($("v3-agua")) {
      const original = String(parcel.agua || "").trim();
      const v = original.toLowerCase();
      if (esSi(v)) $("v3-agua").textContent = "Con afluente";
      else if (v === "no" || !v || v === "null") $("v3-agua").textContent = "Factibilidad";
      else $("v3-agua").textContent = original;
    }
    if ($("v3-luz")) {
      // Se imprimia la version en minusculas de la ficha ("empalme instalado").
      const original = String(parcel.luz || parcel.electricidad || "").trim();
      const v = original.toLowerCase();
      $("v3-luz").textContent = esSi(v) ? "Conectada" : (v === "no" ? "No disponible" : (mayuscula(original) || "No informada"));
    }
    if ($("v3-rol")) {
      // El CRM guarda "Rol Propio", no "si". Sin reconocer ese texto la ficha
      // decia "Por confirmar" justo al lado de una descripcion que anuncia rol
      // propio: la contradiccion mas cara de la pagina.
      const v = String(parcel.rol || parcel.rol_situacion || parcel.rol_propio || "").toLowerCase();
      const enTramite = v === "no" || v.includes("tramite") || v.includes("trámite");
      const tieneRol = esSi(v) || /\bpropio\b|inscrito|vigente|individualizado/.test(v);
      $("v3-rol").textContent = enTramite ? "En trámite" : (tieneRol ? "Sí tiene rol" : "Por confirmar");
    }
    if ($("v3-naturaleza")) {
      const v = String(parcel.naturaleza || parcel.entorno || parcel.atributos_naturales || "").toLowerCase();
      const destacada = esSi(v) || v.includes("impactante") ||
        (Array.isArray(parcel.atributos_naturales) && parcel.atributos_naturales.length > 0);
      $("v3-naturaleza").textContent = destacada ? "Naturaleza impactante" : "Convencional";
    }
  }

  /** Distancias a ciudad/comuna y a servicios. */
  function pintarDistancias(parcel) {
      // Populate Distances (Cities & Services) Dynamically
      if ($("v3-distance-cities")) {
        const c = parcel.cercanias || {};
        let distCiudad = parcel.distancia_ciudad_km ?? c.distancia_ciudad_km;
        let distComuna = parcel.distancia_comuna_km ?? c.distancia_comuna_km;
        let cityName = parcel.ciudad || c.ciudad;
        const comunaName = parcel.comuna || "Comuna";
  
        // Dynamic calculation if missing
        if (distCiudad == null || distComuna == null) {
            const lat = parcel.lat;
            const lng = parcel.lng;
            
            if (lat && lng) {
                if (distCiudad == null) {
                    let minD = 9999;
                    let cName = 'Concepción';
                    for (const city of CIUDADES_REFERENCIA) {
                        const d = distanciaAproxKm(lat, lng, city.lat, city.lng);
                        if (d !== null && d < minD) { minD = d; cName = city.name; }
                    }
                    distCiudad = minD;
                    if (!cityName) cityName = cName;
                }
                if (distComuna == null) {
                    const cNorm = String(parcel.comuna || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
                    const ref = COMUNAS_REFERENCIA[cNorm];
                    if (ref) {
                        distComuna = distanciaAproxKm(lat, lng, ref.lat, ref.lng);
                    }
                    if (!distComuna) distComuna = Math.max(2, Math.round(distCiudad * 0.4));
                }
            }
        }
        
        cityName = cityName || "Ciudad Principal";
        const txtCiudad = distCiudad != null ? `A ${distCiudad} km` : 'Por evaluar';
        const txtComuna = distComuna != null ? `A ${distComuna} km` : 'Por evaluar';
        
        const distancias = [
          { texto: txtCiudad, lugar: cityName,
            icono: '<path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1v2H9V7zm0 4h1v2H9v-2zm0 4h1v2H9v-2zm4-8h1v2h-1V7zm0 4h1v2h-1v-2zm0 4h1v2h-1v-2z"></path>' },
          { texto: txtComuna, lugar: comunaName,
            icono: '<path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>' },
        ];
        $("v3-distance-cities").innerHTML = distancias.map((d) => `
          <div class="v3-distance">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">${d.icono}</svg>
            <strong>${escape(d.texto)}</strong> de ${escape(d.lugar)}
          </div>`).join('');
        parcel._computedDistComuna = distComuna;
      }
  
      if ($("v3-distance-services")) {
        const c = parcel.cercanias || {};
        let distRoute = parcel.distancia_ruta_principal_km ?? c.distancia_ruta_principal_km;
        let distHealth = parcel.distancia_salud_km ?? c.distancia_salud_km;
        let distCommerce = parcel.distancia_comercio_km ?? c.distancia_comercio_km;
        const distComuna = parcel._computedDistComuna || 10;
        
        if (distHealth == null) distHealth = Math.max(1, Math.round(distComuna * 0.8));
        if (distCommerce == null) distCommerce = Math.max(1, Math.round(distComuna * 0.6));
        if (distRoute == null) distRoute = Math.floor(Math.random() * 5) + 1;
        
        const txtRoute = distRoute != null ? `A ${distRoute} km` : 'No informada';
        const txtHealth = distHealth != null ? `A ${distHealth} km` : 'No informada';
        const txtCommerce = distCommerce != null ? `A ${distCommerce} km` : 'No informada';
        
        // Las tres tarjetas solo cambian icono, color, etiqueta y valor:
        // se describen como datos y se pintan con una sola plantilla.
        const servicios = [
          { variante: 'ruta',     etiqueta: 'Ruta / Carretera', valor: txtRoute,
            icono: '<path stroke-linecap="round" stroke-linejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"></path><path stroke-linecap="round" stroke-linejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"></path>' },
          { variante: 'salud',    etiqueta: 'Centro de Salud', valor: txtHealth,
            icono: '<path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>' },
          { variante: 'comercio', etiqueta: 'Comercio / Serv.', valor: txtCommerce,
            icono: '<path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>' },
        ];

        $("v3-distance-services").style.display = "flex";
        $("v3-distance-services").innerHTML = servicios.map((s) => `
          <div class="v3-service">
            <div class="v3-service__icon v3-service__icon--${s.variante}">
              <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">${s.icono}</svg>
            </div>
            <div>
              <span class="v3-service__label">${escape(s.etiqueta)}</span>
              <span class="v3-service__value">${escape(s.valor)}</span>
            </div>
          </div>`).join('');
      }
  }

  /** Galeria bento + modal a pantalla completa con teclado y gestos. */
  function pintarGaleria(parcel) {
    const images = [];
    if (parcel.imagenes && Array.isArray(parcel.imagenes)) {
      images.push(...parcel.imagenes);
    } else if (parcel.imagen) {
      images.push(parcel.imagen);
    }
    
    if (images.length > 0) {
      if ($("v3-img-1")) { $("v3-img-1").src = images[0]; $("v3-img-1").style.opacity = "1"; }
      if ($("v3-img-2") && images.length > 1) { $("v3-img-2").src = images[1]; $("v3-img-2").style.opacity = "1"; }
      if ($("v3-img-3") && images.length > 2) { $("v3-img-3").src = images[2]; $("v3-img-3").style.opacity = "1"; }
      if ($("v3-img-4") && images.length > 3) { $("v3-img-4").src = images[3]; $("v3-img-4").style.opacity = "1"; }
      if ($("v3-img-5") && images.length > 4) { $("v3-img-5").src = images[4]; $("v3-img-5").style.opacity = "1"; }
      
      const btnGallery = document.querySelector('.v3-gallery-btn');
      if (btnGallery) {
        btnGallery.addEventListener('click', () => {
          const dialog = document.getElementById('gallery-dialog');
          const mainImg = document.getElementById('gallery-main-img');
          if (!dialog || !mainImg) return;
          
          let currentIndex = 0;
          const showImage = (index) => {
            if (images.length === 0) return;
            if (index < 0) index = images.length - 1;
            if (index >= images.length) index = 0;
            currentIndex = index;
            mainImg.src = images[currentIndex];
          };
          
          showImage(0);
          
          document.getElementById('gallery-prev').onclick = () => showImage(currentIndex - 1);
          document.getElementById('gallery-next').onclick = () => showImage(currentIndex + 1);
          document.getElementById('close-gallery-dialog').onclick = () => dialog.close();
          
          // Swipe Support
          let touchstartX = 0;
          let touchendX = 0;
          
          const handleGesture = () => {
            const threshold = 50; // minimum distance to be considered a swipe
            if (touchendX < touchstartX - threshold) showImage(currentIndex + 1); // Swipe left
            if (touchendX > touchstartX + threshold) showImage(currentIndex - 1); // Swipe right
          };

          dialog.addEventListener('touchstart', e => {
            touchstartX = e.changedTouches[0].screenX;
          }, {passive: true});

          dialog.addEventListener('touchend', e => {
            touchendX = e.changedTouches[0].screenX;
            handleGesture();
          }, {passive: true});
          
          dialog.showModal();
        });
      }
    }
  }

  /** Muestra el recorrido virtual si la ficha trae un video. */
  function pintarVideo(parcel) {
    const videoUrl = parcel.video_url || parcel.youtube || parcel.video;
    if (!videoUrl) return;

    let embedUrl = videoUrl;
    if (videoUrl.includes("youtube.com/watch?v=")) {
      embedUrl = videoUrl.replace("watch?v=", "embed/");
    } else if (videoUrl.includes("youtu.be/")) {
      embedUrl = videoUrl.replace("youtu.be/", "youtube.com/embed/");
    }

    if (embedUrl && $("v3-video-section") && $("v3-video-iframe")) {
      $("v3-video-iframe").src = embedUrl;
      $("v3-video-section").style.display = "block";
    }
  }

  /** Etiquetas derivadas del contenido de la ficha. */
  function tagsOf(p) {
    if (p.tags && Array.isArray(p.tags)) return p.tags;
    const t = [];
    const text = JSON.stringify(p).toLowerCase();
    if (/credito|crádito|facilidad|cuotas/.test(text)) t.push("Facilidad de pago");
    if (/bosque|río|rio|arroyo|naturaleza|árboles|arboles/.test(text)) t.push("Entorno natural");
    if (/cerca|minutos|colegio|supermercado|pavimento/.test(text)) t.push("Servicios cerca");
    if (/agua|pozo|apr/.test(text)) t.push("Con agua");
    if (/luz|eláctrica|electrica/.test(text)) t.push("Electricidad");
    const s = p.superficie_m2 || p.superficie || p.tamano;
    if (s >= 10000) t.push("1 hectárea o más");
    return t;
  }

  function pintarVirtudes(parcel) {
    if (!$("v3-virtudes")) return;
    const virtudes = tagsOf(parcel).slice(0, 5);
    $("v3-virtudes").innerHTML = virtudes.map(v => `<span class="v3-virtud">${escape(v)}</span>`).join('');
  }

  /**
   * Caja "Inteligencia de Mercado TPL" de la barra lateral.
   *
   * Antes dependia de window.analyzeProperty, que NO se carga en esta pagina
   * (solo la define js/index.js), y ademas escribia en '#v3-eval-tpl', un
   * elemento que no existe en parcela.html. Resultado: la caja mostraba "--"
   * de forma permanente. Ahora lee la tasacion guardada en la ficha, que es la
   * misma que ve el CRM, y comprueba cada elemento antes de escribirlo.
   */
  function pintarEvaluacionPrecio(parcel) {
    const caja = $("v3-price-evaluation");
    if (!caja) return;

    // Sin tasacion guardada la caja se oculta. Antes se recalculaba en vivo con
    // el registro crudo y salia una cifra que no era la tasacion de nadie.
    const datos = valoracionGuardada(parcel);
    if (!datos) {
      caja.hidden = true;
      return;
    }
    caja.hidden = false;

    const valorZona = datos.valorComunalBase || 0;
    if ($("v3-eval-zona")) {
      $("v3-eval-zona").textContent = valorZona ? money(valorZona) : "No disponible";
    }

    const precio = parcel.precioNumero || toNumber(parcel.precio);
    const badge = $("v3-eval-badge");
    if (!badge || !precio) return;

    let texto = "Alineado al mercado";
    let variante = "neutro";
    if (precio <= datos.valorRecomendado * 0.9) {
      texto = "Oportunidad TPL";
      variante = "oportunidad";
    } else if (precio > datos.valorRecomendado * 1.15) {
      texto = "Sobre mercado";
      variante = "sobre";
    }

    badge.textContent = texto;
    badge.className = `v3-eval-badge v3-eval-badge--${variante}`;
    badge.hidden = false;
    badge.style.display = "";
  }

  async function init() {
    if (!window.parcelas) {
      console.error("No se encontró el catálogo de parcelas.");
      return;
    }

    // Esta ficha ya no calcula: lee la tasacion guardada, que trae su propio
    // valor comunal. Antes habia que esperar aqui a que tpl-data-service cargara
    // las medianas en el motor o el valor comunal salia "$0 / m2"; ahora esa
    // espera solo retrasaba el primer pintado.

    const parcel = await cargarParcela();
    if (!parcel) {
      if ($("v3-title")) $("v3-title").textContent = "Parcela no encontrada";
      document.body.classList.add("tpl-ready");
      return;
    }

    // El bloque "INYECCION TPL V4 ENGINE" del final del archivo vive fuera de
    // este IIFE y antes se buscaba la parcela por su cuenta en window.parcelas,
    // el catalogo local: se quedaba con el registro CRUDO, sin la hidratacion
    // de Supabase y sin metadata, que es justo donde vive la tasacion.
    window.__TPL_PARCELA_ACTUAL = parcel;

    pintarDatosBasicos(parcel);
    pintarDistancias(parcel);
    if ($("v3-description")) {
      $("v3-description").textContent = parcel.descripcion || "Sin descripción detallada.";
    }
    pintarGaleria(parcel);
    pintarVideo(parcel);
    pintarVirtudes(parcel);
    pintarEvaluacionPrecio(parcel);
    initCRMMap(parcel);

    setTimeout(() => document.body.classList.add("tpl-ready"), 100);
  }

  async function initCRMMap(parcel) {
    if (!$("v3-crm-map")) return;
    
    const comuna = parcel.comuna || "Concepción";
    if ($("v3-analysis-comuna")) $("v3-analysis-comuna").textContent = comuna;

    const lat = parseFloat(parcel.lat || parcel.latitud || -36.82);
    const lng = parseFloat(parcel.lng || parcel.longitud || -73.04);
    
    // Configuración base del mapa regional
    const map = L.map('v3-crm-map', { zoomControl: false, dragging: !L.Browser.mobile, tap: !L.Browser.mobile, scrollWheelZoom: false }).setView([lat, lng], 9);
    // CARTO empezo a exigir API key y estampa "API KEY REQUIRED" sobre cada
    // tile, que era lo que se veia en produccion. Se usa OpenStreetMap, que ya
    // es el proveedor del resto del sitio.
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(map);
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Marker para la parcela específica
    L.marker([lat, lng]).addTo(map).bindPopup("Ubicación de la Parcela");

    // Referencias que necesita el cálculo de ruta desde la ubicación del usuario
    mapaFicha = map;
    coordsParcela = { lat, lng };
    initRutaUsuario();

    // Fetch GeoJSON de la comuna vía Nominatim
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(comuna)},+Chile&polygon_geojson=1&format=json`);
      const data = await response.json();
      
      if (data && data.length > 0) {
        // Encontrar el resultado que tiene un geojson de tipo Polygon o MultiPolygon
        const geoResult = data.find(d => d.geojson && (d.geojson.type === 'Polygon' || d.geojson.type === 'MultiPolygon'));
        
        if (geoResult) {
          const communeLayer = L.geoJSON(geoResult.geojson, {
            style: {
              color: '#8b5cf6',
              weight: 3,
              fillColor: '#8b5cf6',
              fillOpacity: 0.15
            }
          }).addTo(map);
          
          // Ajustar el zoom al polígono de la comuna
          map.fitBounds(communeLayer.getBounds(), { padding: [20, 20] });
        }
      }
    } catch (e) {
      console.warn("No se pudo cargar el polígono de la comuna", e);
    }

    // Dibujar Gráfico de Tendencia (Chart.js)
    renderMarketChart(parcel, comuna);
  }

  /* ==========================================================================
     Ruta desde la ubicación del usuario hasta la parcela
     ========================================================================== */

  let mapaFicha = null;
  let coordsParcela = null;
  let capaRuta = null;
  let marcadorUsuario = null;
  let rutaYaInicializada = false;

  // Distancia en línea recta (Haversine). Sirve de respaldo si el servicio de
  // rutas no responde, para no dejar al usuario sin ninguna referencia.
  function distanciaLineaRecta(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const rad = (d) => d * Math.PI / 180;
    const dLat = rad(lat2 - lat1);
    const dLng = rad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function posicionActual() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("SIN_SOPORTE"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(err),
        { timeout: 10000, maximumAge: 60000, enableHighAccuracy: false }
      );
    });
  }

  // Ruta real por carretera vía OSRM. Devuelve null si el servicio falla,
  // para que el llamador pueda caer al cálculo aproximado.
  async function rutaPorCarretera(origen, destino) {
    const url = `https://router.project-osrm.org/route/v1/driving/` +
                `${origen.lng},${origen.lat};${destino.lng},${destino.lat}` +
                `?overview=full&geometries=geojson`;
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 12000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timeout);
      if (!res.ok) return null;
      const data = await res.json();
      if (data.code !== "Ok" || !data.routes || !data.routes.length) return null;
      const ruta = data.routes[0];
      return {
        km: ruta.distance / 1000,
        minutos: Math.round(ruta.duration / 60),
        // GeoJSON entrega [lng,lat]; Leaflet espera [lat,lng]
        trazado: (ruta.geometry?.coordinates || []).map(([lng, lat]) => [lat, lng]),
        aproximada: false
      };
    } catch (e) {
      console.warn("Servicio de rutas no disponible, se usará estimación", e);
      return null;
    }
  }

  function mensajeErrorUbicacion(err) {
    if (err && err.message === "SIN_SOPORTE") {
      return "Tu navegador no permite obtener la ubicación.";
    }
    switch (err && err.code) {
      case 1: return "Necesitamos tu permiso de ubicación para calcular la distancia.";
      case 2: return "No pudimos determinar tu ubicación. Revisa tu GPS o conexión.";
      case 3: return "La búsqueda de tu ubicación tardó demasiado. Intenta de nuevo.";
      default: return "No pudimos calcular la distancia. Intenta nuevamente.";
    }
  }

  function initRutaUsuario() {
    if (rutaYaInicializada) return;
    const boton = $("btn-route-driving");
    const caja = $("route-result-box");
    if (!boton || !caja) return;
    rutaYaInicializada = true;

    const elTiempo = $("route-time");
    const elDistancia = $("route-dist");
    const enlaceGps = $("route-gmaps");
    const textoOriginal = boton.textContent.trim();

    const mostrarError = (texto) => {
      caja.hidden = false;
      caja.classList.add("is-error");
      if (elTiempo) elTiempo.textContent = "No disponible";
      if (elDistancia) elDistancia.textContent = texto;
      if (enlaceGps) enlaceGps.hidden = true;
    };

    boton.addEventListener("click", async () => {
      if (!coordsParcela) return;

      boton.disabled = true;
      boton.setAttribute("aria-busy", "true");
      boton.textContent = "Buscando tu ubicación...";
      caja.classList.remove("is-error");

      let origen;
      try {
        origen = await posicionActual();
      } catch (err) {
        mostrarError(mensajeErrorUbicacion(err));
        boton.disabled = false;
        boton.removeAttribute("aria-busy");
        boton.textContent = textoOriginal;
        return;
      }

      boton.textContent = "Calculando ruta...";

      let resultado = await rutaPorCarretera(origen, coordsParcela);
      if (!resultado) {
        // Respaldo: línea recta con velocidad promedio de carretera rural.
        const km = distanciaLineaRecta(origen.lat, origen.lng, coordsParcela.lat, coordsParcela.lng);
        resultado = {
          km,
          minutos: Math.max(1, Math.round((km / 55) * 60)),
          trazado: [[origen.lat, origen.lng], [coordsParcela.lat, coordsParcela.lng]],
          aproximada: true
        };
      }

      const kmTexto = resultado.km.toLocaleString("es-CL", { maximumFractionDigits: 1 });
      if (elTiempo) {
        elTiempo.textContent = resultado.minutos >= 60
          ? `${Math.floor(resultado.minutos / 60)} h ${resultado.minutos % 60} min`
          : `${resultado.minutos} min`;
      }
      if (elDistancia) {
        elDistancia.textContent = resultado.aproximada
          ? `${kmTexto} km en línea recta (estimado)`
          : `${kmTexto} km por carretera hasta el terreno`;
      }
      if (enlaceGps) {
        enlaceGps.hidden = false;
        enlaceGps.href = `https://www.google.com/maps/dir/?api=1&origin=${origen.lat},${origen.lng}` +
                         `&destination=${coordsParcela.lat},${coordsParcela.lng}&travelmode=driving`;
      }
      caja.hidden = false;

      // Dibujar en el mapa
      if (mapaFicha) {
        if (capaRuta) mapaFicha.removeLayer(capaRuta);
        if (marcadorUsuario) mapaFicha.removeLayer(marcadorUsuario);

        capaRuta = L.polyline(resultado.trazado, {
          color: "#005aa0",
          weight: 4,
          opacity: 0.8,
          dashArray: resultado.aproximada ? "8 8" : null
        }).addTo(mapaFicha);

        marcadorUsuario = L.circleMarker([origen.lat, origen.lng], {
          radius: 8, color: "#fff", weight: 3, fillColor: "#10b981", fillOpacity: 1
        }).addTo(mapaFicha).bindPopup("Tu ubicación");

        mapaFicha.fitBounds(capaRuta.getBounds(), { padding: [40, 40] });
      }

      boton.disabled = false;
      boton.removeAttribute("aria-busy");
      boton.textContent = "Recalcular distancia";
    });
  }

  /* ==========================================================================
     Buscador IA: interpreta lenguaje natural y filtra el catálogo TPL
     ========================================================================== */

  const ERRORES_BUSCADOR = {
    TEXTO_MUY_CORTO: "Cuéntanos un poco más: comuna, presupuesto o tamaño.",
    TEXTO_MUY_LARGO: "La descripción es muy larga. Resúmela en pocas frases.",
    DEMASIADAS_SOLICITUDES: "Hiciste varias búsquedas seguidas. Espera un momento e intenta de nuevo.",
    IA_NO_DISPONIBLE: "El asesor IA no está disponible ahora. Intenta en unos minutos.",
    RESPUESTA_IA_INVALIDA: "No pudimos interpretar tu búsqueda. Intenta describirla de otra forma.",
    CONFIGURACION_INCOMPLETA: "El asesor IA no está configurado. Escríbenos por WhatsApp y te ayudamos.",
  };

  const esAfirmativo = (valor) => {
    const v = String(valor || "").trim().toLowerCase();
    return v === "si" || v === "sí" || v === "true" || v === "1";
  };

  /** Aplica los criterios devueltos por la IA sobre el catálogo local. */
  function filtrarCatalogo(criterios) {
    const catalogo = catalogoCompleto();
    return catalogo.filter((p) => {
      if (criterios.comunas.length) {
        const comuna = String(p.comuna || "").toLowerCase();
        if (!criterios.comunas.some((c) => c.toLowerCase() === comuna)) return false;
      }
      const precio = toNumber(p.precio);
      if (criterios.precio_max && precio && precio > criterios.precio_max) return false;
      if (criterios.precio_min && precio && precio < criterios.precio_min) return false;

      const superficie = Number(p.tamano || p.superficie_m2 || p.superficie) || 0;
      if (criterios.superficie_min && superficie && superficie < criterios.superficie_min) return false;
      if (criterios.superficie_max && superficie && superficie > criterios.superficie_max) return false;

      if (criterios.requiere_agua && !esAfirmativo(p.agua)) return false;
      if (criterios.requiere_luz && !esAfirmativo(p.luz)) return false;
      if (criterios.requiere_rol && !esAfirmativo(p.rol)) return false;
      if (criterios.requiere_naturaleza && !esAfirmativo(p.naturaleza)) return false;
      if (criterios.requiere_facilidad_pago && !esAfirmativo(p.facilidad)) return false;

      return true;
    });
  }

  /** Descripción legible de los filtros aplicados, para que el usuario los verifique. */
  function describirCriterios(c) {
    const partes = [];
    if (c.comunas.length) partes.push(c.comunas.join(" o "));
    if (c.precio_min && c.precio_max) partes.push(`entre ${money(c.precio_min)} y ${money(c.precio_max)}`);
    else if (c.precio_max) partes.push(`hasta ${money(c.precio_max)}`);
    else if (c.precio_min) partes.push(`desde ${money(c.precio_min)}`);
    if (c.superficie_min) partes.push(`desde ${c.superficie_min.toLocaleString("es-CL")} m²`);
    if (c.superficie_max) partes.push(`hasta ${c.superficie_max.toLocaleString("es-CL")} m²`);
    if (c.requiere_agua) partes.push("con agua");
    if (c.requiere_luz) partes.push("con electricidad");
    if (c.requiere_rol) partes.push("con rol propio");
    if (c.requiere_naturaleza) partes.push("con entorno natural");
    if (c.requiere_facilidad_pago) partes.push("con facilidad de pago");
    return partes;
  }

  function tarjetaResultado(p) {
    const precio = toNumber(p.precio);
    const superficie = Number(p.tamano || p.superficie_m2 || p.superficie) || 0;
    const img = p.imagen || (Array.isArray(p.imagenes) && p.imagenes[0]) || "";
    return `
      <a class="v3-finder-card" href="parcela.html?id=${encodeURIComponent(p.id)}">
        <span class="v3-finder-card__media">
          ${img ? `<img src="${escape(img)}" alt="" loading="lazy" width="120" height="90">` : ""}
        </span>
        <span class="v3-finder-card__body">
          <strong>${escape(p.nombre || "Parcela")}</strong>
          <span class="v3-finder-card__meta">
            ${escape(p.comuna || "Comuna por confirmar")}
            ${superficie ? ` · ${superficie.toLocaleString("es-CL")} m²` : ""}
          </span>
          <span class="v3-finder-card__price">${precio ? money(precio) : "Consultar precio"}</span>
        </span>
      </a>`;
  }

  function initBuscadorIA() {
    const boton = $("ai-finder-btn");
    const campo = $("ai-finder-input");
    const salida = $("ai-finder-results");
    if (!boton || !campo || !salida) return;

    const textoOriginal = boton.textContent.trim();

    const mostrar = (html, esError = false) => {
      salida.hidden = false;
      salida.classList.toggle("is-error", esError);
      salida.innerHTML = html;
    };

    const buscar = async () => {
      const consulta = campo.value.trim();
      if (consulta.length < 8) {
        mostrar(`<p class="v3-finder-msg">${ERRORES_BUSCADOR.TEXTO_MUY_CORTO}</p>`, true);
        campo.focus();
        return;
      }

      boton.disabled = true;
      boton.setAttribute("aria-busy", "true");
      boton.textContent = "Interpretando tu búsqueda...";
      mostrar(`<p class="v3-finder-msg v3-finder-msg--loading">Analizando lo que necesitas...</p>`);

      try {
        const cfg = window.TPLDataService?.config;
        if (!cfg?.url) throw new Error("CONFIGURACION_INCOMPLETA");

        const res = await fetch(`${cfg.url}/functions/v1/gemini-buscador-parcelas`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": cfg.publishableKey,
            "Authorization": `Bearer ${cfg.publishableKey}`,
          },
          body: JSON.stringify({ consulta }),
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "RESPUESTA_IA_INVALIDA");

        // Se espera aquí (no solo al arrancar la página) para que una
        // búsqueda que llegue antes de que termine de cargar el catálogo
        // remoto igual vea las propiedades publicadas dinámicamente, en vez
        // de quedarse solo con las 32 sembradas.
        await hydrateRemoteCatalog();

        const criterios = data.criterios;
        const encontradas = filtrarCatalogo(criterios);
        const filtros = describirCriterios(criterios);

        let html = "";
        if (criterios.resumen) {
          html += `<p class="v3-finder-summary">${escape(criterios.resumen)}</p>`;
        }
        if (filtros.length) {
          html += `<ul class="v3-finder-chips">${filtros.map((f) => `<li>${escape(f)}</li>`).join("")}</ul>`;
        }

        if (encontradas.length) {
          html += `<p class="v3-finder-count">${encontradas.length} ${encontradas.length === 1 ? "parcela coincide" : "parcelas coinciden"} en el catálogo TPL</p>`;
          html += `<div class="v3-finder-grid">${encontradas.slice(0, 6).map(tarjetaResultado).join("")}</div>`;
          if (encontradas.length > 6) {
            html += `<p class="v3-finder-msg"><a href="index.html#resultados">Ver las ${encontradas.length} coincidencias en el catálogo completo</a></p>`;
          }
        } else {
          html += `<p class="v3-finder-msg">No encontramos parcelas publicadas con esos criterios.
                   <a href="https://wa.me/56988508361?text=${encodeURIComponent(`Hola, busco: ${consulta}`)}" target="_blank" rel="noopener">Cuéntanos por WhatsApp</a>
                   y te avisamos cuando ingrese algo así.</p>`;
        }

        if (criterios.otros_criterios) {
          html += `<p class="v3-finder-note">Anotamos además: ${escape(criterios.otros_criterios)}. Esos detalles los revisa un asesor contigo.</p>`;
        }

        mostrar(html);
      } catch (err) {
        const codigo = String(err.message || "");
        mostrar(`<p class="v3-finder-msg">${ERRORES_BUSCADOR[codigo] || "No pudimos completar la búsqueda. Intenta nuevamente."}</p>`, true);
      } finally {
        boton.disabled = false;
        boton.removeAttribute("aria-busy");
        boton.textContent = textoOriginal;
      }
    };

    boton.addEventListener("click", buscar);
    // Enter envía; Shift+Enter permite salto de línea.
    campo.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        buscar();
      }
    });
  }

  function renderMarketChart(parcel, comuna) {
    const ctx = document.getElementById('market-trend-chart');
    if (!ctx || !window.Chart) return;
    
    // Tasacion guardada, no recalculada: ver valoracionGuardada().
    const vData = valoracionGuardada(parcel);
    if (!vData) return;

    let pubPrice = toNumber(parcel.precio);
    if (!pubPrice) pubPrice = vData.valorRecomendado;

    // Fix context if there's an existing chart to prevent overlaps
    if (window.marketChartInstance) {
        window.marketChartInstance.destroy();
    }

    window.marketChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Mediana comunal', 'Tasación TPL', 'Precio Publicado'],
            datasets: [{
                label: 'Valor',
                data: [vData.valorComunalBase, vData.valorRecomendado, pubPrice],
                backgroundColor: [
                    '#94a3b8', 
                    '#005aa0', 
                    pubPrice <= vData.valorRecomendado ? '#10b981' : '#f43f5e'
                ],
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) { return money(context.raw); }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) { return money(value); }
                    }
                }
            }
        }
    });

    // La referencia por m2 viene guardada; el divisor era un respaldo con un
    // 5000 fijo que mentia el $/m2 en cualquier parcela de otra superficie.
    if($("stat-val-m2")) {
      const superficie = Number(parcel.superficie_m2 || parcel.tamano) || 0;
      const m2 = vData.referenciaComunalM2 || (superficie ? vData.valorComunalBase / superficie : 0);
      $("stat-val-m2").textContent = m2 ? money(m2) + " / m²" : "No disponible";
    }
    // Cuanto por debajo de la tasacion TPL esta el precio publicado. NO es una
    // proyeccion de plusvalia: aqui no se proyecta nada a futuro.
    //
    // El divisor es la tasacion, no el precio publicado. Dividiendo por el
    // precio publicado esta parcela daba "149%", un descuento imposible: lo que
    // esa cuenta mide es cuanto hay que SUBIR desde el precio publicado, no
    // cuanto esta por debajo de la tasacion.
    if($("stat-val-growth")) {
        const tasacion = vData.valorRecomendado || 0;
        const diff = (pubPrice && pubPrice <= tasacion) ? (tasacion - pubPrice) : 0;
        const pct = tasacion ? Math.round((diff / tasacion) * 100) : 0;
        // "En línea" se mostraba tambien cuando el precio estaba MUY por encima
        // de la tasacion, en verde, justo bajo un grafico que mostraba lo
        // contrario. Si no hay diferencia bajo la tasacion, se dice.
        const sobre = tasacion && pubPrice > tasacion
          ? Math.round(((pubPrice - tasacion) / tasacion) * 100)
          : 0;
        $("stat-val-growth").textContent = pct > 0 ? "-" + pct + "%" : (sobre > 0 ? "+" + sobre + "% sobre" : "En línea");
        $("stat-val-growth").style.color = sobre > 0 ? "#f43f5e" : "#10b981";
    }

    const chartContainer = ctx.closest('.commune-stats-grid')?.parentElement || ctx.parentElement;
    
    // El texto de "sobre tasación" decia siempre "ligeramente superior" y
    // atribuia la diferencia a "descuentos por distancia a servicios", una
    // explicacion que nadie calculo. En esta parcela el precio esta 76% sobre
    // la tasacion: llamarlo "ligeramente" es decirle al visitante algo que
    // desmiente el grafico que tiene encima. Ahora se dice la cifra.
    const sobrePct = vData.valorRecomendado
      ? Math.round(((pubPrice - vData.valorRecomendado) / vData.valorRecomendado) * 100)
      : 0;
    // comuna sale de parcel.comuna (editable por el propietario vía el portal, o
    // por el publicador/CRM) — nunca insertarla cruda en HTML: se escapa acá,
    // en el punto exacto donde entra al markup del veredicto.
    const comunaSegura = escape(comuna);
    let expertText = "";
    if (pubPrice <= vData.valorRecomendado * 0.90) {
        expertText = `Esta propiedad representa una <strong>excelente oportunidad de inversión</strong>. Se encuentra tasada en ${money(vData.valorRecomendado)}, pero está publicada en ${money(pubPrice)}. La estarías adquiriendo con una ganancia patrimonial instantánea de ${money(vData.valorRecomendado - pubPrice)} respecto al mercado comunal de ${comunaSegura}.`;
    } else if (pubPrice <= vData.valorRecomendado * 1.05) {
        expertText = `El precio publicado está <strong>acorde al valor de mercado TPL</strong> (${money(vData.valorRecomendado)}). Es una transacción justa basada en sus características técnicas (conectividad, rol, topografía) dentro de la comuna de ${comunaSegura}.`;
    } else {
        expertText = `El precio publicado está <strong>un ${sobrePct}% sobre la tasación técnica TPL</strong>, que para esta propiedad es de ${money(vData.valorRecomendado)}. La diferencia puede responder a atributos que el propietario valora y que aún no están declarados en la ficha; conviene revisarlos con un asesor antes de ofertar.`;
    }

    // Remove existing expert if any
    const existingExpert = document.getElementById("v3-expert-verdict");
    if (existingExpert) existingExpert.remove();

    const expertHTML = `
    <div id="v3-expert-verdict" class="v3-expert">
        <img src="./image/juan_fco_asesor.webp" class="v3-expert__foto" width="64" height="64" loading="lazy" alt="Asesor experto TPL">
        <div>
            <h4 class="v3-expert__titulo">
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                Veredicto del Experto TPL
            </h4>
            <p class="v3-expert__texto">${expertText}</p>
        </div>
    </div>
    `;

    // El veredicto cierra el analisis y los botones de accion van justo debajo.
    // Antes caia entre el grafico y las cifras de la comuna, partiendo el
    // bloque en dos; ahora se ancla al bloque de acciones cuando existe.
    const acciones = document.getElementById("v3-cta-actions");
    if (acciones) acciones.insertAdjacentHTML('beforebegin', expertHTML);
    else chartContainer.insertAdjacentHTML('afterend', expertHTML);
}

  // El buscador IA no depende de los datos de la parcela, así que se conecta
  // aparte: sigue funcionando aunque la ficha no cargue.
  function arrancar() {
    init();
    hydrateRemoteCatalog(); // se precalienta ahora; buscar() igual la espera.
    initBuscadorIA();
  }

  // Load when ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arrancar);
  } else {
    arrancar();
  }

})();


// --- INYECCION TPL V4 ENGINE ---
//
// Espera a que init() publique la parcela YA hidratada desde Supabase. Antes
// buscaba el registro por su cuenta en window.parcelas (el catalogo local) y se
// lo pasaba al motor, que sin los atributos reconocibles devolvia la base pelada
// de superficie: $8.800.000 en Caburgua frente a los $98.500.000 guardados.
let v4Intentos = 0;
const v4Interval = setInterval(() => {
    const parcel = window.__TPL_PARCELA_ACTUAL;

    // ~10 s. Antes el intervalo giraba para siempre si la ficha no cargaba.
    if (!parcel && ++v4Intentos < 50) return;
    clearInterval(v4Interval);
    if (!parcel) return;

    // Sin tasacion guardada la seccion no se muestra, en vez de rellenarla con
    // una cifra calculada a ciegas.
    const vData = valoracionGuardada(parcel);

        if (vData && document.getElementById("v3-valuation-section")) {
            document.getElementById("v3-valuation-section").style.display = "block";
            
            const pubPrice = toNumber(parcel.precio);

            if (document.getElementById("v3-val-publicado") && pubPrice) {
                document.getElementById("v3-val-publicado").textContent = money(pubPrice);
            }
            // La tasacion guardada no incluye puntaje; sin dato real ocultamos la
            // tarjeta en vez de mostrar un "/ 100" vacío.
            const scoreEl = document.getElementById("v3-valuation-score");
            if (scoreEl) {
                const scoreCard = scoreEl.closest(".v3-metric-card");
                if (Number.isFinite(vData.puntaje)) {
                    scoreEl.textContent = vData.puntaje;
                    if (scoreCard) scoreCard.hidden = false;
                } else if (scoreCard) {
                    scoreCard.hidden = true;
                }
            }
            
            const compContainer = document.getElementById("v3-communal-comparison");
            if (compContainer) {
                const basePrice = vData.valorComunalBase;
                const recPrice = vData.valorRecomendado;
                const pubP = pubPrice || recPrice;
                
                const minVal = Math.min(basePrice, recPrice, pubP) * 0.8;
                const maxVal = Math.max(basePrice, recPrice, pubP) * 1.2;
                const range = maxVal - minVal;
                
                const getPos = (val) => {
                    if (range <= 0) return 50;
                    return Math.max(0, Math.min(100, ((val - minVal) / range) * 100));
                };
                
                const posBase = getPos(basePrice);
                const posRec = getPos(recPrice);
                const posPub = getPos(pubP);
                
                let pubColor = pubP <= recPrice ? '#10b981' : '#f43f5e';
                let diffText = "";
                if (pubP <= recPrice) {
                   const ahorro = recPrice - pubP;
                   diffText = `<span class="v3-veredicto v3-veredicto--oportunidad">¡Oportunidad! ${money(ahorro)} bajo mercado</span>`;
                } else {
                   diffText = `<span class="v3-veredicto v3-veredicto--sobre">Sobre valor mercado TPL</span>`;
                }
                
                // Cuando ambos marcadores caen casi en el mismo punto, sus etiquetas
                // se superponen; bajamos la del promedio comunal para separarlas.
                const etiquetasSeSolapan = Math.abs(posBase - posPub) < 22;

                compContainer.innerHTML = `
                    <h3>
                      <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"></path></svg>
                      Posicionamiento de Mercado
                    </h3>
                    <p class="v3-position-summary">${diffText}</p>
                    <div class="v3-position-track${etiquetasSeSolapan ? ' is-crowded' : ''}">
                        <div class="v3-position-rail"></div>
                        <span class="v3-position-dot v3-position-dot--base" style="left:${posBase}%"></span>
                        <span class="v3-position-label v3-position-label--base" style="left:${posBase}%">Mediana comunal<br><strong>${money(basePrice)}</strong></span>
                        <span class="v3-position-dot v3-position-dot--tpl" style="left:${posRec}%"></span>
                        <span class="v3-position-callout" style="left:${posRec}%">TPL: ${money(recPrice)}</span>
                        <span class="v3-position-dot v3-position-dot--pub" style="left:${posPub}%; background:${pubColor}"></span>
                        <span class="v3-position-label v3-position-label--pub" style="left:${posPub}%">Publicado<br><strong style="color:${pubColor}">${money(pubP)}</strong></span>
                    </div>
                `;
            }
        }
}, 200);


