const fs = require('fs');
let js = fs.readFileSync('chrome-extension-catastro/popup.js', 'utf8');

// 1. Añadir scraping de descripción
const scrapeAddition = `
    let descripcion = '';
    const descEl = document.querySelector('.ui-pdp-description__content, .description, [data-testid="description"], .ad-description, .andes-text');
    if (descEl && descEl.innerText.length > 20) {
        descripcion = descEl.innerText.trim();
    } else {
        const metaDesc = document.querySelector('meta[property="og:description"]');
        if (metaDesc) descripcion = metaDesc.content;
    }

    return { titulo, rawPrecio, rawSup, comuna, fecha, descripcion };
`;
js = js.replace(/return \{ titulo, rawPrecio, rawSup, comuna, fecha \};/, scrapeAddition);

// 2. Rellenar el textarea
const parseAddition = `
    if (data.descripcion) {
        const descEl = document.getElementById('descripcion');
        if (descEl) descEl.value = data.descripcion;
    }
`;
js = js.replace(/document.getElementById\('tipo'\)\.value = tipo;/, "document.getElementById('tipo').value = tipo;\n" + parseAddition);

// 3. Obtener el valor al guardar
const saveAddition = `
        const fecha_pub = document.getElementById('fecha_pub')?.value || null;
        const desc = document.getElementById('descripcion')?.value || '';
`;
js = js.replace(/const fecha_pub = document.getElementById\('fecha_pub'\)\?\.value \|\| null;/, saveAddition);

// 4. Agregar al payload (metadata y root)
const payloadAddition = `
            url: currentUrl,
            descripcion: desc,
            fecha_publicacion: fecha_pub,
            fuente: currentFuente,
            metadata: { virtudes, sector: direccion, fecha_publicacion: fecha_pub, descripcion_completa: desc }
`;
js = js.replace(/url: currentUrl,\s*fecha_publicacion: fecha_pub,\s*fuente: currentFuente,\s*metadata: \{ virtudes, sector: direccion, fecha_publicacion: fecha_pub \}/, payloadAddition);

fs.writeFileSync('chrome-extension-catastro/popup.js', js, 'utf8');
