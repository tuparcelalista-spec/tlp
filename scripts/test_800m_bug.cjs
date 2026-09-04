const text = `Bulnes | Se Vende Parcela en Bulnes, Sector el Espinal
$50.000.000
Precio
$50.000.000
Área total del terreno (m²)
5000
LocalizaciónBulnes
Publicado05/05/2026
Precio/M² de terreno$10.000
Gastos comunes[¡Pregunta al anunciante!]
Titulación[¡Pregunta al anunciante!]
Descripción
Se vende parcela en Bulnes, sector el Espinal. La propiedad queda aproximadamente a 800 metros del camino principal. Cuenta con factibilidad de agua y luz.Dimensiones 70,24 m * 71,51 m.Lote 10, rol propio.`;

// Regex vieja
const supRegexOld = /([0-9]+(?:[.,][0-9]+)?)\s*(?:\b(?:ha|has|hect[aá]reas|metros)\b|m2|m²|mts2?(?:\b|$))/gi;
console.log("OLD:", [...text.matchAll(supRegexOld)].map(m => m[0]));

// Regex nueva que incluye los labels de los portales
// y restringe "metros" a no ir seguido de "de" o "del" o "al"?
// Mejor simplemente agregar las etiquetas de los portales:
const supRegexNew = /(?:(?:[AÁaá]rea total(?: del terreno)?\s*\(m²\)|\bSuperficie total\b)\s*\n*\s*([0-9]+(?:[.,][0-9]+)?))|([0-9]+(?:[.,][0-9]+)?)\s*(?:\b(?:ha|has|hect[aá]reas|metros(?!\s+(?:de|del|al|a\b)))\b|m2|m²|mts2?(?:\b|$))/gi;

console.log("NEW:");
for(let m of text.matchAll(supRegexNew)) {
    console.log("Match full:", m[0]);
    console.log("Group 1 (Portal label):", m[1]);
    console.log("Group 2 (Inline text):", m[2]);
}

