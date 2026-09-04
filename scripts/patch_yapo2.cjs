const fs = require('fs');
let js = fs.readFileSync('chrome-extension-catastro/popup.js', 'utf8');

// The block we want to replace starts at `// Yapo fallback` and goes until `return { titulo, rawPrecio, rawSup, comuna, fecha };`
const regexToReplace = /\/\/ Yapo fallback[\s\S]*?return \{ titulo, rawPrecio, rawSup, comuna, fecha \};/;

const newLogic = `
    // Yapo fallback
    if (!fecha) {
        const pageText = document.body.innerText;
        
        // Formato 1: Publicado 09/08/2026
        const numericDateMatch = pageText.match(/Publicado[\\s\\S]{0,30}?(\\d{2})\\/(\\d{2})\\/(\\d{4})/i);
        if (numericDateMatch) {
            fecha = \`\${numericDateMatch[3]}-\${numericDateMatch[2]}-\${numericDateMatch[1]}\`;
        } else {
            // Formato 2: 12 de agosto
            const textDateMatch = pageText.match(/(?:Publicado|Fecha).*?(\\d{1,2})\\s*(?:de)?\\s*(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i);
            if (textDateMatch) {
                const day = textDateMatch[1].padStart(2, '0');
                const mStr = textDateMatch[2].toLowerCase().substring(0,3);
                const months = {ene:'01',feb:'02',mar:'03',abr:'04',may:'05',jun:'06',jul:'07',ago:'08',sep:'09',oct:'10',nov:'11',dic:'12'};
                const month = months[mStr] || '01';
                fecha = \`2026-\${month}-\${day}\`;
            }
        }
    }

    return { titulo, rawPrecio, rawSup, comuna, fecha };
`;

js = js.replace(regexToReplace, newLogic);
fs.writeFileSync('chrome-extension-catastro/popup.js', js, 'utf8');
