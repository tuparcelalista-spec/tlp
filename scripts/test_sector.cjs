const textos = [
    "Ubicado en el sector de Quinchamalí, comuna de Chillán",
    "Parcela en sector Quinchamalí",
    "camino a Quinchamalí",
    "cerca de Quinchamalí",
    "Ubicación\n Sector Quinchamalí, Chillán"
];

const locRegexOld = /(?:sector|localidad|cerca de|cercano a|cercana a|camino a)\s+([a-zñáéíóúüA-ZÑÁÉÍÓÚÜ]+(?:\s+[a-zñáéíóúüA-ZÑÁÉÍÓÚÜ]+){0,2})/i;
const locRegexNew = /(?:sector|localidad|cerca|cercano|camino)\s+(?:de\s+|a\s+|al\s+)?([a-zñáéíóúüA-ZÑÁÉÍÓÚÜ]+(?:\s+[a-zñáéíóúüA-ZÑÁÉÍÓÚÜ]+){0,2})/i;

for (let t of textos) {
    let match1 = t.match(locRegexOld);
    let match2 = t.match(locRegexNew);
    console.log("TEXTO:", t);
    console.log("  OLD:", match1 ? match1[1] : null);
    console.log("  NEW:", match2 ? match2[1] : null);
}
