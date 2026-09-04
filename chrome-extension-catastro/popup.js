document.getElementById('goOptions').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
});

let currentUrl = '';
let currentFuente = '';

// El script que se inyecta en la página del portal
function scrapePageData() {
    let titulo = document.querySelector('title')?.innerText || '';
    if (document.querySelector('meta[property="og:title"]')) {
        titulo = document.querySelector('meta[property="og:title"]').content;
    }
    
    let rawPrecio = '';
    const priceEl = document.querySelector('.ui-pdp-price__second-line .andes-money-amount__fraction, .price-info .price, [data-testid="price"]');
    if (priceEl) {
        rawPrecio = priceEl.innerText;
    } else {
        const bodyText = document.body.innerText;
        const priceMatch = bodyText.match(/(?:UF|\$)\s*([\d\.\,]+)/i);
        if (priceMatch) rawPrecio = priceMatch[0];
    }
    
    let rawSup = '';
    const specsEls = document.querySelectorAll('.ui-pdp-specs__table tr, .andes-table__row');
    specsEls.forEach(tr => {
        if (tr.innerText.toLowerCase().includes('superficie')) {
            rawSup = tr.innerText;
        }
    });
    if (!rawSup) {
        const supMatch = document.body.innerText.match(/([\d\.\,]+)\s*(?:m2|m²|mts2)/i);
        if (supMatch) rawSup = supMatch[1];
    }

    let comuna = '';
    const breadcrumbs = document.querySelectorAll('.andes-breadcrumb__link, [data-testid="breadcrumb"]');
    if (breadcrumbs.length > 0) {
        comuna = breadcrumbs[breadcrumbs.length - 1].innerText;
    }

    
    let fecha = '';
    const timeEl = document.querySelector('time');
    if (timeEl && timeEl.getAttribute('datetime')) {
        fecha = timeEl.getAttribute('datetime').split('T')[0];
    } else {
        const metaPub = document.querySelector('meta[property="article:published_time"]');
        if (metaPub) fecha = metaPub.content.split('T')[0];
    }
    
    
    // Yapo fallback
    if (!fecha) {
        const pageText = document.body.innerText;
        
        // Formato 1: Publicado 09/08/2026
        const numericDateMatch = pageText.match(/Publicado[\s\S]{0,30}?(\d{2})\/(\d{2})\/(\d{4})/i);
        if (numericDateMatch) {
            fecha = `${numericDateMatch[3]}-${numericDateMatch[2]}-${numericDateMatch[1]}`;
        } else {
            // Formato 2: 12 de agosto
            const textDateMatch = pageText.match(/(?:Publicado|Fecha).*?(\d{1,2})\s*(?:de)?\s*(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i);
            if (textDateMatch) {
                const day = textDateMatch[1].padStart(2, '0');
                const mStr = textDateMatch[2].toLowerCase().substring(0,3);
                const months = {ene:'01',feb:'02',mar:'03',abr:'04',may:'05',jun:'06',jul:'07',ago:'08',sep:'09',oct:'10',nov:'11',dic:'12'};
                const month = months[mStr] || '01';
                fecha = `2026-${month}-${day}`;
            }
        }
    }

    
    let descripcion = '';
    const descEl = document.querySelector('.ui-pdp-description__content, .description, [data-testid="description"], .ad-description, .andes-text');
    if (descEl && descEl.innerText.length > 20) {
        descripcion = descEl.innerText.trim();
    } else {
        const metaDesc = document.querySelector('meta[property="og:description"]');
        if (metaDesc) descripcion = metaDesc.content;
    }

    return { titulo, rawPrecio, rawSup, comuna, fecha, descripcion };



}

function parseAndFill(data, url) {
    currentUrl = url;
    currentFuente = url.includes('yapo') ? 'yapo' : (url.includes('portalinmobiliario') ? 'portalinmobiliario' : 'desconocida');

    document.getElementById('titulo').value = data.titulo || '';
    document.getElementById('comuna').value = (data.comuna || '').trim();

    let supNumber = parseFloat(data.rawSup.replace(/\./g, '').replace(/[^0-9,]/g, '').replace(',', '.'));
    if (!isNaN(supNumber) && supNumber > 0) {
        document.getElementById('superficie').value = supNumber;
    }

    let pNum = parseFloat((data.rawPrecio || '').replace(/\./g, '').replace(/[^0-9,]/g, '').replace(',', '.'));
    let isUf = /uf|unidades de fomento/i.test(data.rawPrecio);
    
    // Asumir valor UF actual ~38000 si no tenemos el servicio (idealmente el user puede corregir)
    const VALOR_UF_APROX = 38000;
    
    if (!isNaN(pNum) && pNum > 0) {
        if (isUf || pNum < 100000) {
            document.getElementById('precio_uf').value = pNum;
            document.getElementById('precio_clp').value = Math.round(pNum * VALOR_UF_APROX);
        } else {
            document.getElementById('precio_clp').value = pNum;
            document.getElementById('precio_uf').value = (pNum / VALOR_UF_APROX).toFixed(2);
        }
    }

    let tipo = /dormitorio|baño|habitaci|casa/i.test(data.titulo) ? 'Parcela con casa' : 'Parcela';
    document.getElementById('tipo').value = tipo;

    if (data.descripcion) {
        const descEl = document.getElementById('descripcion');
        if (descEl) descEl.value = data.descripcion;
    }


    if (data.fecha) {
        const fEl = document.getElementById('fecha_pub');
        if (fEl) fEl.value = data.fecha;
    }


    document.getElementById('loading').style.display = 'none';
    document.getElementById('data-form').style.display = 'block';
}

function showStatus(msg, type) {
    const box = document.getElementById('statusBox');
    box.textContent = msg;
    box.className = 'status ' + type;
    box.style.display = 'block';
}


const COMUNAS_VALIDAS = [
  'Cauquenes', 'Chanco', 'Pelluhue', 'Curicó', 'Hualañé', 'Licantén', 'Molina', 'Rauco', 'Romeral', 'Sagrada Familia', 'Teno', 'Vichuquén', 'Colbún', 'Linares', 'Longaví', 'Parral', 'Retiro', 'San Javier', 'Villa Alegre', 'Yerbas Buenas', 'Constitución', 'Curepto', 'Empedrado', 'Maule', 'Pelarco', 'Pencahue', 'Río Claro', 'San Clemente', 'San Rafael', 'Talca',
  'Bulnes', 'Chillán', 'Chillán Viejo', 'El Carmen', 'Pemuco', 'Pinto', 'Quillón', 'San Ignacio', 'Yungay', 'Cobquecura', 'Coelemu', 'Ninhue', 'Portezuelo', 'Quirihue', 'Ránquil', 'Treguaco', 'Coihueco', 'Ñiquén', 'San Carlos', 'San Fabián', 'San Nicolás',
  'Concepción', 'Coronel', 'Chiguayante', 'Florida', 'Hualqui', 'Lota', 'Penco', 'San Pedro de la Paz', 'Santa Juana', 'Talcahuano', 'Tomé', 'Hualpén', 'Lebu', 'Arauco', 'Cañete', 'Contulmo', 'Curanilahue', 'Los Álamos', 'Tirúa', 'Los Ángeles', 'Antuco', 'Cabrero', 'Laja', 'Mulchén', 'Nacimiento', 'Negrete', 'Quilaco', 'Quilleco', 'San Rosendo', 'Santa Bárbara', 'Tucapel', 'Yumbel', 'Alto Biobío',
  'Temuco', 'Carahue', 'Cunco', 'Curarrehue', 'Freire', 'Galvarino', 'Gorbea', 'Lautaro', 'Loncoche', 'Melipeuco', 'Nueva Imperial', 'Padre Las Casas', 'Perquenco', 'Pitrufquén', 'Pucón', 'Saavedra', 'Teodoro Schmidt', 'Toltén', 'Vilcún', 'Villarrica', 'Cholchol', 'Angol', 'Collipulli', 'Curacautín', 'Ercilla', 'Lonquimay', 'Los Sauces', 'Lumaco', 'Purén', 'Renaico', 'Traiguén', 'Victoria',
  'Valdivia', 'Corral', 'Lanco', 'Los Lagos', 'Máfil', 'Mariquina', 'Paillaco', 'Panguipulli', 'La Unión', 'Futrono', 'Lago Ranco', 'Río Bueno',
  'Puerto Montt', 'Calbuco', 'Cochamó', 'Fresia', 'Frutillar', 'Los Muermos', 'Llanquihue', 'Maullín', 'Puerto Varas', 'Castro', 'Ancud', 'Chonchi', 'Curaco de Vélez', 'Dalcahue', 'Puqueldón', 'Queilén', 'Quellón', 'Quemchi', 'Quinchao', 'Osorno', 'Puerto Octay', 'Purranque', 'Puyehue', 'Río Negro', 'San Juan de la Costa', 'San Pablo', 'Chaitén', 'Futaleufú', 'Hualaihué', 'Palena'
];

document.addEventListener('DOMContentLoaded', () => {
    const dataList = document.getElementById('comunasList');
    if (dataList) {
        COMUNAS_VALIDAS.forEach(c => {
            let opt = document.createElement('option');
            opt.value = c;
            dataList.appendChild(opt);
        });
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Obtener tab actual
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url.includes('yapo') && !tab.url.includes('portalinmobiliario') && !tab.url.includes('mercadolibre')) {
        showStatus('Abre una publicación de PortalInmobiliario o Yapo para extraer.', 'warning');
        document.getElementById('loading').style.display = 'none';
        return;
    }

    // 2. Inyectar script de scrapeo
    try {
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: scrapePageData,
        });
        
        if (results && results[0]) {
            parseAndFill(results[0].result, tab.url);
        }
    } catch (e) {
        showStatus('Error leyendo la página.', 'error');
        document.getElementById('loading').style.display = 'none';
    }
});

document.getElementById('saveBtn').addEventListener('click', async () => {
    const btn = document.getElementById('saveBtn');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
        const titulo = document.getElementById('titulo').value;
        const pClp = parseFloat(document.getElementById('precio_clp').value) || null;
        const pUf = parseFloat(document.getElementById('precio_uf').value) || null;
        const sup = parseFloat(document.getElementById('superficie').value) || null;
        let comuna = document.getElementById('comuna').value;
        let finalComuna = comuna ? comuna.trim() : '';
        if (finalComuna) {
            let exactMatch = COMUNAS_VALIDAS.find(c => c.toLowerCase() === finalComuna.toLowerCase());
            if (!exactMatch) {
                // Try substring match (e.g. "Las Hortensias, Cunco, Chile" -> "Cunco")
                let subMatch = COMUNAS_VALIDAS.find(c => finalComuna.toLowerCase().includes(c.toLowerCase()));
                if (subMatch) {
                    finalComuna = subMatch;
                } else {
                    showStatus('Error: No reconocemos esta comuna ("' + finalComuna + '"). Asegúrate de escribir solo el nombre de la comuna o que pertenezca al sur de Chile.', 'error');
                    btn.disabled = false;
                    btn.textContent = 'Guardar en CRM';
                    return;
                }
            } else {
                finalComuna = exactMatch;
            }
        } else {
            showStatus('Error: La comuna es obligatoria.', 'error');
            btn.disabled = false;
            btn.textContent = 'Guardar en CRM';
            return;
        }

        const direccion = document.getElementById('direccion')?.value || '';
        const tipo = document.getElementById('tipo').value;

        
        const fecha_pub = document.getElementById('fecha_pub')?.value || null;
        const desc = document.getElementById('descripcion')?.value || '';



        // Geocoding automático
        let lat = null;
        let lng = null;
        const queryTarget = direccion ? `${direccion}, ${comuna}, Chile` : `${comuna}, Chile`;
        
        try {
            showStatus('Mapeando ubicación...', 'warning');
            const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(queryTarget)}&format=json&limit=1`);
            const geoData = await geoRes.json();
            
            if (geoData && geoData.length > 0) {
                lat = parseFloat(geoData[0].lat);
                lng = parseFloat(geoData[0].lon);
            } else if (direccion) {
                // Fallback a solo comuna si la dirección específica no se encuentra
                const fallbackRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(comuna + ", Chile")}&format=json&limit=1`);
                const fallbackData = await fallbackRes.json();
                if (fallbackData && fallbackData.length > 0) {
                    lat = parseFloat(fallbackData[0].lat);
                    lng = parseFloat(fallbackData[0].lon);
                }
            }
        } catch (e) {
            console.warn("Geocoding failed", e);
        }

        // NLP Virtudes simple
        const virtudes = [];
        const keywords = ['río', 'rio', 'plana', 'cercada', 'empalme', 'cercana', 'luz', 'agua', 'rol', 'orilla'];
        keywords.forEach(k => {
            if (new RegExp('\\b'+k+'\\b', 'i').test(titulo)) virtudes.push(k);
        });

        const payload = {
            capture_id: 'TPL-EXT-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
            captured_at: new Date().toISOString(),
            titulo: titulo,
            precio_clp: pClp,
            precio_uf: pUf,
            superficie_m2: sup,
            comuna: finalComuna,
            tipo_propiedad: tipo,
            lat: lat,
            lng: lng,
            url: currentUrl,
            descripcion: desc,
            fecha_publicacion: fecha_pub,
            fuente: currentFuente,
            metadata: { virtudes, sector: direccion, fecha_publicacion: fecha_pub, descripcion_completa: desc }
        };

        // La extensión ya NO escribe directo en Supabase con la anon key.
        // Abre el CRM y le entrega los datos por un puente controlado
        // (crm-bridge.js) para que un asesor logueado revise, complete y
        // apruebe la captura -- el mismo flujo que ya usa el bookmarklet.
        showStatus('Abriendo el CRM…', 'warning');
        const crmUrl = 'https://www.parcelalista.cl/plataforma/crm-tpl-v1/index.html#catastro';
        const tab = await chrome.tabs.create({ url: crmUrl });

        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('El CRM tardó demasiado en cargar.')), 15000);
            function onUpdated(tabId, info) {
                if (tabId === tab.id && info.status === 'complete') {
                    chrome.tabs.onUpdated.removeListener(onUpdated);
                    clearTimeout(timeout);
                    resolve();
                }
            }
            chrome.tabs.onUpdated.addListener(onUpdated);
        });

        // Pequeño margen para que el módulo de catastro del CRM termine de
        // inicializar y adjuntar sus listeners tras el evento "complete".
        await new Promise((resolve) => setTimeout(resolve, 600));

        await chrome.tabs.sendMessage(tab.id, { type: 'TPL_EXTENSION_CATASTRO_DATA', payload });

        showStatus('Datos enviados al CRM. Revísalos y confirma ahí para guardarlos.', 'success');
        setTimeout(() => window.close(), 2500);

    } catch (e) {
        showStatus(e.message, 'error');
        btn.disabled = false;
        btn.textContent = 'Guardar en CRM';
    }
});
