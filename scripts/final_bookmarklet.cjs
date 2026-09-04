const fs = require('fs');

let js = `javascript:(async function(){
    try {
        const crmDomain = 'https://www.parcelalista.cl';
        const crmReviewUrl = \`\${crmDomain}/plataforma/crm-tpl-v1/index.html#catastro\`;

        let titulo = document.title || '';
        let clp = null;
        let uf = null;
        let sup = null;
        let comuna = "";
        let texto_original = document.body.innerText;
        
        const clpRegex = /\\$\\s*([0-9]{1,3}(?:\\.[0-9]{3}){1,3})/g;
        const clpMatches = [...texto_original.matchAll(clpRegex)];
        if (clpMatches.length > 0) {
            const sortedCLP = clpMatches.map(m => parseInt(m[1].replace(/\\./g, ''))).sort((a, b) => b - a);
            clp = sortedCLP[0];
        }

        const ufRegex = /UF\\s*([0-9]{1,3}(?:\\.[0-9]{3})*(?:,[0-9]+)?)/gi;
        const ufMatches = [...texto_original.matchAll(ufRegex)];
        if (ufMatches.length > 0) {
            const sortedUF = ufMatches.map(m => parseFloat(m[1].replace(/\\./g, '').replace(',', '.'))).sort((a, b) => b - a);
            uf = sortedUF[0];
        }

        const supRegex = /([0-9]+(?:[.,][0-9]+)?)\\s*(?:m2|m²|mts2?|metros|hect[aá]reas|has?)/gi;
        const supMatches = [...texto_original.matchAll(supRegex)];
        if (supMatches.length > 0) {
            let maxS = 0;
            for(let m of supMatches) {
                let matchText = m[1];
                let isHa = m[0].toLowerCase().includes('ha') || m[0].toLowerCase().includes('hect');
                let s;
                if (matchText.includes('.') || matchText.includes(',')) {
                    let normalized = matchText.replace(',', '.');
                    if (!isHa && /\\.[0-9]{3}$/.test(normalized)) {
                        s = parseFloat(normalized.replace('.', ''));
                    } else {
                        s = parseFloat(normalized);
                    }
                } else {
                    s = parseFloat(matchText);
                }
                if (isHa) s = s * 10000;
                if (s > maxS) maxS = s;
            }
            sup = maxS;
        }

        const comunasComunes = ['Villarrica', 'Pucón', 'Loncoche', 'Temuco', 'Valdivia', 'Puerto Varas', 'Frutillar', 'Cobquecura', 'Coelemu', 'Ninhue', 'Portezuelo', 'Quirihue', 'Ránquil', 'Treguaco', 'Bulnes', 'Chillán', 'Chillán Viejo', 'El Carmen', 'Pemuco', 'Pinto', 'Quillón', 'San Ignacio', 'Yungay', 'Coihueco', 'Ñiquén', 'San Carlos', 'San Fabián', 'San Nicolás', 'Concepción', 'Coronel', 'Chiguayante', 'Florida', 'Hualqui', 'Lota', 'Penco', 'San Pedro de la Paz', 'Santa Juana', 'Talcahuano', 'Tomé', 'Hualpén', 'Lebu', 'Arauco', 'Cañete', 'Contulmo', 'Curanilahue', 'Los Álamos', 'Tirúa', 'Los Ángeles', 'Antuco', 'Cabrero', 'Laja', 'Mulchén', 'Nacimiento', 'Negrete', 'Quilaco', 'Quilleco', 'San Rosendo', 'Santa Bárbara', 'Tucapel', 'Yumbel', 'Alto Biobío'];
        
        let localidad = "";
        
        // Nueva logica de Ubicacion
        const ubiRegex = /Ubicaci[oó]n\\s+([^,\\n]+)\\s*,\\s*([^,\\n]+)(?:\\s*,\\s*([^,\\n]+))?/i;
        const ubiMatch = texto_original.match(ubiRegex);
        if (ubiMatch) {
            const part1 = ubiMatch[1].trim();
            const part2 = ubiMatch[2].trim();
            const part3 = ubiMatch[3] ? ubiMatch[3].trim() : "";
            
            const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "");
            const comunasNorm = comunasComunes.map(norm);
            
            if (part3) {
                if (comunasNorm.includes(norm(part2))) {
                    comuna = part2;
                    localidad = part1;
                } else if (comunasNorm.includes(norm(part1))) {
                    comuna = part1;
                }
            } else {
                if (comunasNorm.includes(norm(part1))) {
                    comuna = part1;
                } else if (comunasNorm.includes(norm(part2))) {
                    comuna = part2;
                    localidad = part1;
                }
            }
        }
        
        // Fallback comuna original
        if (!comuna) {
            const foundComuna = comunasComunes.find(c => new RegExp(c, 'i').test(texto_original));
            if (foundComuna) comuna = foundComuna;
        }

        // Fallback localidad original
        if (!localidad) {
            const locRegex = /(?:sector|localidad|cerca de|cercano a|cercana a|camino a)\\s+([a-zñáéíóúü]+(?:\\s+[a-zñáéíóúü]+){0,2})/i;
            const locMatch = texto_original.match(locRegex);
            if (locMatch && locMatch[1]) {
                localidad = locMatch[1].trim();
                if (['la', 'el', 'los', 'las', 'un', 'una'].includes(localidad.toLowerCase())) localidad = '';
            }
        }

        const keywordMap = {
            'orilla lago': /orilla(\\s+de)?\\s+lago/i,
            'orilla río': /orilla(\\s+de)?\\s+r[íi]o/i,
            'río': /\\br[íi]o\\b/i,
            'vertiente': /vertiente/i,
            'derechos de agua': /derecho[s]?\\s+de\\s+agua/i,
            'plano': /\\bplano[s]?\\b/i,
            'bosque nativo': /\\bnativo\\b|bosque/i,
            'empalme / luz': /empalme/i,
            'termas': /termal|termas/i,
            'turístico': /tur[íi]stico/i,
            'cercada': /cerca\\b|cercad[oa]|cerco/i,
            'portón': /port[oó]n/i,
            'condominio': /condominio/i,
            'acceso restringido': /acceso\\s+restringido|solo\\s+residentes|control\\s+de\\s+acceso/i
        };

        const atributosDetectados = [];
        for (const [attr, regex] of Object.entries(keywordMap)) {
            if (regex.test(texto_original)) {
                if (attr === 'río' && atributosDetectados.includes('orilla río')) continue;
                atributosDetectados.push(attr);
            }
        }

        let lat = null;
        let lng = null;
        const html = document.documentElement.innerHTML;
        const latMatch = html.match(/(?:"?lat(?:itude)?"?\\s*[:=]\\s*)(-?\\d{1,2}\\.\\d{4,})/i);
        const lngMatch = html.match(/(?:"?lon(?:gitude)?"?|"?lng"?)\\s*[:=]\\s*(-?\\d{1,3}\\.\\d{4,})/i);
        if (latMatch && latMatch[1]) lat = parseFloat(latMatch[1]);
        if (lngMatch && lngMatch[1]) lng = parseFloat(lngMatch[1]);

        let antiguedad = "";
        const antiMatch = texto_original.match(/hace\\s+(\\d+)\\s+(d[ií]as?|semanas?|mes(?:es)?|a[ñn]os?)/i);
        if (antiMatch) antiguedad = antiMatch[0];

        let telefonos = [];
        const telRegex = /(?:\\+?56\\s*9|0?9)\\s*-?\\s*\\d{3,4}\\s*-?\\s*\\d{4}/g;
        const telMatches = texto_original.match(telRegex);
        if (telMatches) telefonos = [...new Set(telMatches)];

        let emails = [];
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}/g;
        const emailMatches = texto_original.match(emailRegex);
        if (emailMatches) emails = [...new Set(emailMatches)];

        let nombreContacto = "";
        const nomMatch = texto_original.match(/(?:publicado por|corredora?:)\\s+([A-ZÁÉÍÓÚÑ][a-zñáéíóúü]+(?:\\s+[A-ZÁÉÍÓÚÑ][a-zñáéíóúü]+){0,2})/i);
        if (nomMatch && nomMatch[1]) nombreContacto = nomMatch[1].trim();

        const capture_id = 'TPL-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
        const url_actual = window.location.href;
        
        let fuente = 'desconocida';
        if (url_actual.includes('portalinmobiliario.com')) fuente = 'portalinmobiliario';
        if (url_actual.includes('yapo.cl')) fuente = 'yapo';

        const payload = {
            prueba: false,
            capture_id: capture_id,
            captured_at: new Date().toISOString(),
            url: url_actual,
            fuente: fuente,
            titulo: titulo,
            precio_clp: clp,
            precio_uf: uf,
            superficie_m2: sup,
            comuna: comuna,
            localidad: localidad,
            lat: lat,
            lng: lng,
            antiguedad: antiguedad,
            contacto_nombre: nombreContacto,
            contacto_telefono: telefonos.join(', '),
            contacto_email: emails.join(', '),
            tipo_propiedad: "Parcela",
            atributos: atributosDetectados.join(', '),
            texto_original: texto_original
        };

        console.log("[TPL-CATASTRO] Bookmarklet iniciado");

        let crmReady = false;
        let crmWin = null;

        const onMessage = function(e) {
            if (e.origin !== crmDomain) return;
            if (crmWin && e.source !== crmWin) return;

            if (e.data && e.data.type === 'TPL_CATASTRO_READY') {
                console.log("[TPL-CATASTRO] READY recibido");
                crmReady = true;
                
                console.log("[TPL-CATASTRO] DATA enviada");
                crmWin.postMessage({
                    type: 'TPL_CATASTRO_DATA',
                    payload: payload
                }, crmDomain);
            }

            if (e.data && e.data.type === 'TPL_CATASTRO_RECEIVED') {
                console.log("[TPL-CATASTRO] RECEIVED recibido");
                window.removeEventListener('message', onMessage);
                alert("✅ Handshake completado! Revisa la pestaña del CRM.");
            }
        };

        window.addEventListener('message', onMessage);
        console.log("[TPL-CATASTRO] Listener registrado");

        crmWin = window.open(crmReviewUrl, '_blank');

        if (!crmWin) {
            alert("⚠️ El navegador bloqueó la ventana emergente. Por favor permite los pop-ups.");
            return;
        }
        console.log("[TPL-CATASTRO] CRM abierto");

        let attempts = 0;
        const pingInterval = setInterval(() => {
            if (crmReady || crmWin.closed) {
                clearInterval(pingInterval);
                return;
            }
            attempts++;
            if (attempts > 15) {
                clearInterval(pingInterval);
                window.removeEventListener('message', onMessage);
                alert("❌ El CRM tardó demasiado en responder o la pestaña se cerró.");
            }
        }, 500);

    } catch (e) {
        alert("❌ Error general:\\n" + e.message);
    }
})();\`;

// minify code for copy-pasting
const minified = js.replace(/\\n\\s*/g, ' ').replace(/;\\s+/g, ';').replace(/{\\s+/g, '{').replace(/}\\s+/g, '}');

fs.writeFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/bookmarklet.js', js, 'utf8');
fs.writeFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/bookmarklet_min.txt', minified, 'utf8');
console.log('Bookmarklet updated with Ubicacion feature');
