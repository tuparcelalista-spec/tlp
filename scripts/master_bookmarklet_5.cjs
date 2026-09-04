const fs = require('fs');

const js = `(async function(){
try {
const crmDomain = 'https://www.parcelalista.cl';
const crmReviewUrl = \`\${crmDomain}/plataforma/crm-tpl-v1/index.html#catastro\`;
let titulo = document.title || '';
let clp = null;
let uf = null;
let sup = null;
let comuna = "";
let texto_original = document.body.innerText;
let texto_seguro = texto_original;
const cutoffRegex = /\\n(?:Podr[íi]an interesarte|Propiedades similares|Otras propiedades|Sugerencias|Propiedades destacadas|Publicaciones promocionadas|Quienes vieron|Tambi[ée]n buscaron|Te puede interesar)(?:\\n|$)/i;
const cutoffMatch = texto_original.match(cutoffRegex);
if (cutoffMatch) {texto_seguro = texto_original.substring(0, cutoffMatch.index);}

const numRegexStr = "([0-9][0-9.,]*[0-9]|[0-9])";
function parseLatNum(str) {
    if (!str) return 0;
    // Si tiene coma y punto, asumimos formato chileno: 2.307,47
    if (str.includes('.') && str.includes(',')) {
        return parseFloat(str.replace(/\\./g, '').replace(',', '.'));
    }
    // Si solo tiene coma, asumimos decimal: 307,47
    if (str.includes(',') && !str.includes('.')) {
        return parseFloat(str.replace(',', '.'));
    }
    // Si solo tiene punto, veamos si es separador de miles o decimal.
    // Si termina en .XXX (3 digitos exactos) probablemente es miles, ej 120.000
    if (str.includes('.') && !str.includes(',')) {
        if (/\\.[0-9]{3}$/.test(str) && str.split('.').length === 2) {
            // 120.000 -> 120000
            return parseFloat(str.replace(/\\./g, ''));
        } else {
            // 2.5 (hectareas) -> 2.5
            return parseFloat(str);
        }
    }
    return parseFloat(str);
}

const clpRegex = new RegExp("\\\\$\\\\s*" + numRegexStr, "g");
const clpMatches = [...texto_seguro.matchAll(clpRegex)];
if (clpMatches.length > 0) {
    const explicitClpRegex = new RegExp("(?:Precio|Valor)[^$]{0,50}\\\\$" + "\\\\s*" + numRegexStr, "i");
    const explicitMatch = texto_seguro.match(explicitClpRegex);
    if (explicitMatch) {
        clp = parseInt(explicitMatch[1].replace(/[.,]/g, ''));
    } else {
        const sortedCLP = clpMatches.map(m => parseInt(m[1].replace(/[.,]/g, ''))).sort((a, b) => b - a);
        clp = sortedCLP[0];
    }
}

const ufRegex = new RegExp("UF\\\\s*" + numRegexStr, "gi");
const ufMatches = [...texto_seguro.matchAll(ufRegex)];
if (ufMatches.length > 0) {
    const explicitUfRegex = new RegExp("(?:Precio|Valor)[\\\\s\\\\S]{0,50}UF\\\\s*" + numRegexStr, "i");
    const explicitMatchUf = texto_seguro.match(explicitUfRegex);
    if (explicitMatchUf) {
        uf = parseLatNum(explicitMatchUf[1]);
    } else {
        const sortedUF = ufMatches.map(m => parseLatNum(m[1])).sort((a, b) => b - a);
        uf = sortedUF[0];
    }
}

const supRegex = new RegExp("(?:(?:[AÁaá]rea total(?: del terreno)?\\\\s*\\\\(m²\\\\)|\\\\bSuperficie total\\\\b|\\\\bSuperficie\\\\s*\\\\(m²\\\\))\\\\s*\\\\n*\\\\s*" + numRegexStr + ")|(" + numRegexStr + ")\\\\s*(?:\\\\b(?:ha|has|hect[aá]reas|metros(?!\\\\s+(?:de|del|al|a\\\\b)))\\\\b|m2|m²|mts2?(?:\\\\b|\\\\s|$))", "gi");
const supMatches = [...texto_seguro.matchAll(supRegex)];
if (supMatches.length > 0) {
    let maxS = 0;
    let explicitS = null;
    for(let m of supMatches) {
        let matchText = m[1] || m[2];
        let isHa = /\\\\b(?:ha|has|hect[aá]reas)\\\\b/i.test(m[0]);
        let s = parseLatNum(matchText);
        if (isHa) s = s * 10000;
        if (m[1]) {explicitS = s;break;}
        if (s > maxS) maxS = s;
    }
    sup = explicitS || maxS;
}

const comunasComunes = [ 'Villarrica', 'Pucón', 'Loncoche', 'Temuco', 'Valdivia', 'Puerto Varas', 'Frutillar', 'Osorno', 'Panguipulli', 'Cobquecura', 'Coelemu', 'Ninhue', 'Portezuelo', 'Quirihue', 'Ránquil', 'Treguaco', 'Bulnes', 'Chillán', 'Chillán Viejo', 'El Carmen', 'Pemuco', 'Pinto', 'Quillón', 'San Ignacio', 'Yungay', 'Coihueco', 'Ñiquén', 'San Carlos', 'San Fabián', 'San Nicolás', 'Concepción', 'Coronel', 'Chiguayante', 'Florida', 'Hualqui', 'Lota', 'Penco', 'San Pedro de la Paz', 'Santa Juana', 'Talcahuano', 'Tomé', 'Hualpén', 'Lebu', 'Arauco', 'Cañete', 'Contulmo', 'Curanilahue', 'Los Álamos', 'Tirúa', 'Los Ángeles', 'Antuco', 'Cabrero', 'Laja', 'Mulchén', 'Nacimiento', 'Negrete', 'Quilaco', 'Quilleco', 'San Rosendo', 'Santa Bárbara', 'Tucapel', 'Yumbel', 'Alto Biobío', 'Talca', 'Constitución', 'Curepto', 'Empedrado', 'Maule', 'Pelarco', 'Pencahue', 'Río Claro', 'San Clemente', 'San Rafael', 'Cauquenes', 'Chanco', 'Pelluhue', 'Curicó', 'Hualañé', 'Licantén', 'Molina', 'Rauco', 'Romeral', 'Sagrada Familia', 'Teno', 'Vichuquén', 'Linares', 'Colbún', 'Longaví', 'Parral', 'Retiro', 'San Javier', 'Villa Alegre', 'Yerbas Buenas', 'Rancagua', 'Machalí', 'Pichilemu', 'Litueche', 'Navidad', 'Paredones', 'Marchigüe', 'La Estrella', 'San Fernando', 'Santa Cruz', 'Santiago', 'Colina', 'Lampa', 'Melipilla', 'Curacaví', 'María Pinto', 'San Pedro', 'Alhué', 'Pirque', 'San José de Maipo', 'Buin', 'Paine', 'Valparaíso', 'Viña del Mar', 'Concón', 'Quintero', 'Puchuncaví', 'Casablanca', 'Algarrobo', 'El Quisco', 'El Tabo', 'Cartagena', 'San Antonio', 'Santo Domingo', 'La Serena', 'Coquimbo', 'Vicuña', 'Paihuano', 'Ovalle', 'Los Vilos', 'Illapel', 'Salamanca' ];
let localidad = "";
const ubiRegex = /Ubicaci[oó]n[\\s:\\-–]*([^\\n]+)/i;
const ubiMatch = texto_original.match(ubiRegex);
if (ubiMatch) {const parts = ubiMatch[1].split(',').map(s => s.trim());const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "");const comunasNorm = comunasComunes.map(norm);for (let i = parts.length - 1;i >= 0;i--) {let cleanPart = parts[i].replace(/^[^a-zñáéíóúüA-ZÑÁÉÍÓÚÜ]+/g, '').trim();if (comunasNorm.includes(norm(cleanPart))) {comuna = cleanPart;if (i > 0) {localidad = parts[i-1].replace(/^[^a-zñáéíóúüA-ZÑÁÉÍÓÚÜ]+/g, '').trim();}break;}const words = cleanPart.split(' ');for (let word of words) {if (comunasNorm.includes(norm(word))) {comuna = word;break;}}if (comuna) break;}}
if (!comuna) {const foundComuna = comunasComunes.find(c => new RegExp('(^|[^a-zñáéíóúüA-ZÑÁÉÍÓÚÜ])' + c + '([^a-zñáéíóúüA-ZÑÁÉÍÓÚÜ]|$)', 'i').test(texto_original));if (foundComuna) comuna = foundComuna;}
if (!localidad) {const locRegex = /(?:sector|localidad|cerca|cercano|camino)\\s+(?:de\\s+|a\\s+|al\\s+)?([a-zñáéíóúüA-ZÑÁÉÍÓÚÜ]+(?:\\s+[a-zñáéíóúüA-ZÑÁÉÍÓÚÜ]+){0,2})/i;const locMatch = texto_original.match(locRegex);if (locMatch && locMatch[1]) {localidad = locMatch[1].trim();if (['la', 'el', 'los', 'las', 'un', 'una'].includes(localidad.toLowerCase())) localidad = '';}}
if (localidad) {localidad = localidad.replace(/^(?:sector|localidad|camino|cerca|cercano)\\s+(?:de\\s+|a\\s+|al\\s+)?/i, '').trim();}

const keywordMap = {
    'orilla lago': /orilla(\\s+de)?\\s+lago/i, 
    'orilla río': /orilla(\\s+de)?\\s+r[íi]o/i, 
    'río': /\\br[íi]o\\b/i, 
    'vertiente': /vertiente/i, 
    'derechos de agua': /derecho[s]?\\s+de\\s+agua/i, 
    'plano': /\\bplano[s]?\\b/i, 
    'bosque nativo': /\\bnativo\\b|bosque/i, 
    'empalme / luz': /empalme|factibilidad\\s+el[eé]ctrica|luz\\s+(?:el[eé]ctrica|subterr[aá]nea)|energ[ií]a\\s+el[eé]ctrica|postaci[oó]n/i, 
    'agua / pozo / apr': /(?:factibilidad\\s+de\\s+)?agua(?: potable)?\\b|\\bapr\\b|pozo\\b/i,
    'termas': /termal|termas/i, 
    'turístico': /tur[íi]stico/i, 
    'cercada': /cerca\\b|cercad[oa]|cerco/i, 
    'portón': /port[oó]n/i, 
    'condominio': /condominio/i, 
    'acceso restringido': /acceso\\s+restringido|solo\\s+residentes|control\\s+de\\s+acceso/i 
};
const atributosDetectados = [];
for (const [attr, regex] of Object.entries(keywordMap)) {if (regex.test(texto_seguro)) {if (attr === 'río' && atributosDetectados.includes('orilla río')) continue;atributosDetectados.push(attr);}}

let lat = null;
let lng = null;
const html = document.documentElement.innerHTML;
const latMatch = html.match(/(?:"?lat(?:itude)?"?\\s*[:=]\\s*)(-?\\d{1,2}\\.\\d{4,})/i);
const lngMatch = html.match(/(?:"?lon(?:gitude)?"?|"?lng"?)\\s*[:=]\\s*(-?\\d{1,3}\\.\\d{4,})/i);
if (latMatch && latMatch[1]) lat = parseFloat(latMatch[1]);
if (lngMatch && lngMatch[1]) lng = parseFloat(lngMatch[1]);
// Filtrar coordenadas genéricas por defecto de portales
const bannedCoords = [
    {lat: -35.675148, lng: -71.54297}, // Centro Maule
    {lat: -33.4489, lng: -70.6693}, // Centro Santiago
    {lat: -36.8201, lng: -73.0444} // Centro Concepción
];
if (lat && lng) {
    for (let c of bannedCoords) {
        if (Math.abs(lat - c.lat) < 0.001 && Math.abs(lng - c.lng) < 0.001) {
            lat = null;
            lng = null;
            break;
        }
    }
}

let antiguedad = "";
const antiMatch = texto_seguro.match(/hace\\s+(\\d+)\\s+(d[ií]as?|semanas?|mes(?:es)?|a[ñn]os?)/i);
if (antiMatch) antiguedad = antiMatch[0];
let telefonos = [];
const telRegex = /(?:\\+?56\\s*9|0?9)\\s*-?\\s*\\d{3,4}\\s*-?\\s*\\d{4}/g;
const telMatches = texto_seguro.match(telRegex);
if (telMatches) telefonos = [...new Set(telMatches)];
let emails = [];
const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}/g;
const emailMatches = texto_seguro.match(emailRegex);
if (emailMatches) emails = [...new Set(emailMatches)];
let nombreContacto = "";
const nomMatch = texto_seguro.match(/(?:publicado por|corredora?:)\\s+([A-ZÁÉÍÓÚÑ][a-zñáéíóúü]+(?:\\s+[A-ZÁÉÍÓÚÑ][a-zñáéíóúü]+){0,2})/i);
if (nomMatch && nomMatch[1]) nombreContacto = nomMatch[1].trim();

const capture_id = 'TPL-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
const url_actual = window.location.href;
let fuente = 'desconocida';
if (url_actual.includes('portalinmobiliario.com')) fuente = 'portalinmobiliario';
if (url_actual.includes('yapo.cl')) fuente = 'yapo';
if (url_actual.includes('portalterreno.cl')) fuente = 'portalterreno';

const payload = {prueba: false, capture_id: capture_id, captured_at: new Date().toISOString(), url: url_actual, fuente: fuente, titulo: titulo, precio_clp: clp, precio_uf: uf, superficie_m2: sup, comuna: comuna, localidad: localidad, lat: lat, lng: lng, antiguedad: antiguedad, contacto_nombre: nombreContacto, contacto_telefono: telefonos.join(', '), contacto_email: emails.join(', '), tipo_propiedad: "Parcela", atributos: atributosDetectados.join(', '), texto_original: texto_original };
console.log("[TPL-CATASTRO] Bookmarklet iniciado");
let crmReady = false;
let crmWin = null;
const onMessage = function(e) {if (e.origin !== crmDomain) return;if (crmWin && e.source !== crmWin) return;if (e.data && e.data.type === 'TPL_CATASTRO_READY') {console.log("[TPL-CATASTRO] READY recibido");crmReady = true;console.log("[TPL-CATASTRO] DATA enviada");crmWin.postMessage({type: 'TPL_CATASTRO_DATA', payload: payload }, crmDomain);}if (e.data && e.data.type === 'TPL_CATASTRO_RECEIVED') {console.log("[TPL-CATASTRO] RECEIVED recibido");window.removeEventListener('message', onMessage);alert("✅ Handshake completado! Revisa la pestaña del CRM.");}};
window.addEventListener('message', onMessage);
console.log("[TPL-CATASTRO] Listener registrado");
crmWin = window.open(crmReviewUrl, '_blank');
if (!crmWin) {alert("⚠️ El navegador bloqueó la ventana emergente. Por favor permite los pop-ups.");return;}
console.log("[TPL-CATASTRO] CRM abierto");
let attempts = 0;
const pingInterval = setInterval(() => {if (crmReady || crmWin.closed) {clearInterval(pingInterval);return;}attempts++;if (attempts > 15) {clearInterval(pingInterval);window.removeEventListener('message', onMessage);alert("❌ El CRM tardó demasiado en responder o la pestaña se cerró.");}}, 500);
}catch (e) {alert("❌ Error general:\\n" + e.message);}
})();`;

const minified = "javascript:" + js.replace(/\n/g, '');
fs.writeFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/bookmarklet_min_v4.txt', minified, 'utf8');
console.log(minified);
