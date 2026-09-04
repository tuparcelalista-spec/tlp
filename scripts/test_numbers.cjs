const text = `UF3.021
$123.427.911
Superficie: 1 lote de 2.307,47 m²
Valor de venta 3.021 UF
Superficie (m²)
550000`;

const clpRegex = /\$\s*([0-9][0-9.,]*[0-9]|[0-9])/g;
const ufRegex = /UF\s*([0-9][0-9.,]*[0-9]|[0-9])/gi;
const supRegex = /(?:(?:[AÁaá]rea total(?: del terreno)?\s*\(m²\)|\bSuperficie total\b|\bSuperficie\s*\(m²\))\s*\n*\s*([0-9][0-9.,]*[0-9]|[0-9]))|([0-9][0-9.,]*[0-9]|[0-9])\s*(?:\b(?:ha|has|hect[aá]reas|metros(?!\s+(?:de|del|al|a\b)))\b|m2|m²|mts2?(?:\b|\s|$))/gi;

console.log('CLP:', [...text.matchAll(clpRegex)].map(m => m[1]));
console.log('UF:', [...text.matchAll(ufRegex)].map(m => m[1]));
console.log('SUP:', [...text.matchAll(supRegex)].map(m => m[1] || m[2]));
