const text = `
$
53.000.000
5000 m² totales
`;

// test parts
console.log("CLP tests:");
console.log(text.match(/\$/g));
console.log(text.match(/\$\s*/g));
console.log(text.match(/\$\s*53/g));
console.log(text.match(/\$\s*53\.000/g));
console.log(text.match(/\$\s*[0-9]{1,3}(?:\.[0-9]{3})+/g));

console.log("SUP tests:");
console.log(text.match(/5000/g));
console.log(text.match(/5000\s*/g));
console.log(text.match(/5000\s*m/g));
console.log(text.match(/5000\s*m\u00B2/g));
console.log(text.match(/5000\s*m²/gi));
