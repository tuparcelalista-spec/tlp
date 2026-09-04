const fs = require('fs');
let code = fs.readFileSync('frontend-v2/plataforma/publicar-v2/js/main.js', 'utf8');

const anchor = /ubicacion: payload\.coordenadas\s*\};/g;

const newLandInput = `ubicacion: payload.coordenadas,
            superficie_construida: payload.supCasa,
            materialidad: payload.matCasa,
            antiguedad_anios: payload.antCasa,
            metadata: {
              regularizada: payload.regCasa,
              piscina: payload.piscinaCasa,
              piscina_mat: payload.piscinaMat,
              piscina_m2: payload.piscinaM2,
              quincho: payload.quinchoCasa,
              cabana: payload.cabanaCasa,
              riego: payload.riegoCasa
            }
          };`;

if (!code.includes('superficie_construida: payload.supCasa')) {
    code = code.replace(anchor, newLandInput);
    fs.writeFileSync('frontend-v2/plataforma/publicar-v2/js/main.js', code);
    console.log('Injected house inputs into publicador engine call');
} else {
    console.log('Already injected in main.js');
}
