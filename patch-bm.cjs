const fs = require('fs');
let js = fs.readFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/bookmarklet.js', 'utf8');

const tipoLogic = `
        let tipo_propiedad = 'Parcela';
        if (/parcela con casa|casa en parcela/i.test(texto_seguro) || /parcela con casa|casa en parcela/i.test(titulo)) tipo_propiedad = 'Parcela + Casa';
        else if (/\\bdepartamento|depto\\b/i.test(texto_seguro) || /\\bdepartamento|depto\\b/i.test(titulo)) tipo_propiedad = 'Departamento';
        else if (/\\bcasa\\b/i.test(texto_seguro) && !/parcela/i.test(texto_seguro)) tipo_propiedad = 'Casa Urbana';
        else if (/terreno urbano|\\bsitio\\b/i.test(texto_seguro)) tipo_propiedad = 'Terreno Urbano';
`;

const houseLogic = `
        // Extraccion de vivienda
        let superficie_construida = null;
        let dormitorios = null;
        let banos = null;
        let material = '';
        let estado = '';

        const constMatch = texto_seguro.match(/(?:superficie [uú]til|m2 construidos|metros construidos|sup\\.? construida|construidos)\\s*[:=-]?\\s*(\\d+(?:[.,]\\d+)?)/i) || 
                           titulo.match(/(?:superficie [uú]til|m2 construidos|metros construidos|sup\\.? construida|construidos)\\s*[:=-]?\\s*(\\d+(?:[.,]\\d+)?)/i);
        if (constMatch) superficie_construida = parseFloat(constMatch[1].replace(',','.'));

        const dorMatch = texto_seguro.match(/(\\d+)\\s*(?:dormitorios|habitaciones|piezas)/i) || titulo.match(/(\\d+)\\s*(?:dorm|dormitorios|habitaciones|piezas)/i);
        if (dorMatch) dormitorios = parseInt(dorMatch[1]);

        const bMatch = texto_seguro.match(/(\\d+)\\s*(?:ba[nñ]os?)/i) || titulo.match(/(\\d+)\\s*(?:ba[nñ]os?)/i);
        if (bMatch) banos = parseInt(bMatch[1]);

        const matMatch = texto_seguro.match(/(alba[nñ]iler[ií]a|ladrillo|hormig[oó]n|concreto|madera|metalcom|vulcometal|prefabricada)/i);
        if (matMatch) material = matMatch[1] ? matMatch[1].toLowerCase() : '';

        const estMatch = texto_seguro.match(/(nueva|estrenar|usada|remodelada|a reparar|para demoler)/i);
        if (estMatch) estado = estMatch[1] ? estMatch[1].toLowerCase() : '';
`;

js = js.replace('// --- 6. EXTRAS ---', '// --- TIPO Y VIVIENDA ---\n' + tipoLogic + '\n' + houseLogic + '\n\n// --- 6. EXTRAS ---');
js = js.replace('tipo_propiedad: "Parcela",', 'tipo_propiedad: tipo_propiedad,\n            superficie_construida: superficie_construida,\n            dormitorios: dormitorios,\n            banos: banos,\n            material: material,\n            estado: estado,');

fs.writeFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/bookmarklet.js', js);

// Also generate a minified version
let minified = 'javascript:' + js.replace(/\/\/.*$/gm, '').replace(/\s+/g, ' ');
fs.writeFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/bookmarklet_min_v9.txt', minified);

console.log('Bookmarklet updated and minified');
