const fs = require('fs');
let js = fs.readFileSync('chrome-extension-catastro/popup.js', 'utf8');

const scrapeAddition = `
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
        const yapoDateMatch = pageText.match(/(?:Publicado|Fecha).*?(\\d{1,2})\\s*(?:de)?\\s*(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i);
        if (yapoDateMatch) {
            const day = yapoDateMatch[1].padStart(2, '0');
            const mStr = yapoDateMatch[2].toLowerCase().substring(0,3);
            const months = {ene:'01',feb:'02',mar:'03',abr:'04',may:'05',jun:'06',jul:'07',ago:'08',sep:'09',oct:'10',nov:'11',dic:'12'};
            const month = months[mStr] || '01';
            fecha = \`2024-\${month}-\${day}\`; // assuming current year if not found
        }
    }

    return { titulo, rawPrecio, rawSup, comuna, fecha };
`;

js = js.replace(/return \{ titulo, rawPrecio, rawSup, comuna \};/, scrapeAddition);

const parseAddition = `
    if (data.fecha) {
        const fEl = document.getElementById('fecha_pub');
        if (fEl) fEl.value = data.fecha;
    }
`;
js = js.replace(/document.getElementById\('tipo'\)\.value = tipo;/, "document.getElementById('tipo').value = tipo;\n" + parseAddition);

const saveAddition1 = `
        const fecha_pub = document.getElementById('fecha_pub')?.value || null;
`;
js = js.replace(/const tipo = document.getElementById\('tipo'\)\.value;/, "const tipo = document.getElementById('tipo').value;\n" + saveAddition1);

const saveAddition2 = `
            url: currentUrl,
            fecha_publicacion: fecha_pub,
            fuente: currentFuente,
            metadata: { virtudes, sector: direccion, fecha_publicacion: fecha_pub }
`;
js = js.replace(/url: currentUrl,\s*fuente: currentFuente,\s*metadata: \{ virtudes, sector: direccion \}/, saveAddition2);

fs.writeFileSync('chrome-extension-catastro/popup.js', js, 'utf8');
