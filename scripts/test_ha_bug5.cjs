const text = "10 ha totales. Casa de 55 habitaciones. hace 55 horas. 5000 m²";
const regexNew = /([0-9]+(?:[.,][0-9]+)?)\s*(?:\b(?:ha|has|hect[aá]reas|metros)\b|m2|m²|mts2?(?:\b|$))/gi;
console.log(text.match(regexNew));
