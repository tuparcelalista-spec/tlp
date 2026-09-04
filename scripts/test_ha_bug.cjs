const text = "10 ha totales. Casa de 55 habitaciones. hace 55 horas.";
const supRegex = /([0-9]+(?:[.,][0-9]+)?)\\s*(?:m2|m²|mts2?|metros|hect[aá]reas|has?)/gi;

const matches = [...text.matchAll(supRegex)];
console.log(matches.map(m => m[0]));
