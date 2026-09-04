const fs = require('fs');
const glob = require('fs').readdirSync('frontend-v2', {recursive: true});

const fixes = {
  'Ã¡': 'á',
  'Ã©': 'é',
  'Ã³': 'ó',
  'Ãº': 'ú',
  'Ã±': 'ñ',
  'Ã‘': 'Ñ',
  'Ãš': 'Ú',
  'Ã“': 'Ó',
  'Ã‰': 'É',
  'Ã ': 'Á',
  'Ã­': 'í',  // Ã followed by soft hyphen or similar? We can just replace 'Ã­'
  'ï¿½': '¿', // Wait, earlier ï¿½ was \uFFFD. If it's ï¿½ we should replace it.
  'Ãº': 'ú',
  // Specific words from output:
  'Imï¿½genes': 'Imágenes',
  'Mï¿½ximo': 'Máximo',
  'imï¿½genes': 'imágenes',
  'contiÃ±as': 'continúas',
  'despusÃ­': 'después',
  'debersÃ­': 'deberás',
  'ConstrucciÃ³n': 'Construcción',
  'BsÃ­icas': 'Básicas',
  'Ingenierï¿½a': 'Ingeniería',
  'Topografï¿½a': 'Topografía',
  'Diseï¿½o': 'Diseño',
  'Elï¿½ctrico': 'Eléctrico',
  'Gasfiterï¿½a': 'Gasfitería',
  'RegiÃ³n': 'Región',
  'regiÃ³n': 'región',
  'ValparasÃ­o': 'Valparaíso',
  'Ã‘uble': 'Ñuble',
  'Biobï¿½o': 'Biobío',
  'AraucaÃ±a': 'Araucanía',
  'Rï¿½os': 'Ríos',
  'ConcepciÃ³n': 'Concepción',
  'Aï¿½os': 'Años',
  'msÃ­': 'más',
  'MTÃºODO': 'MÉTODO',
  'ï¿½CÃ³mo': '¿Cómo',
  'Cuï¿½ntalo': 'Cuéntalo',
  'explicarï¿½as': 'explicarías',
  'serï¿½n': 'serán',
  'mtÃºodo': 'método',
  'Explï¿½canos': 'Explícanos',
  'ejecuciÃ³n': 'ejecución',
  'botï¿½n': 'botón',
  'ï¿½Ordenar': '«Ordenar',
  'informaciÃ³n': 'información',
  'revisiÃ³n': 'revisión',
  'Ãºltimo': 'último',
  'InstalaciÃ³n': 'Instalación',
  'DuraciÃ³n': 'Duración',
  'duraciÃ³n': 'duración',
  'dï¿½as': 'días',
  'Crï¿½dito': 'Crédito',
  'Garantï¿½a': 'Garantía',
  'garantï¿½a': 'garantía',
  'Tï¿½rminos': 'Términos',
  'PoltÃºica': 'Política',
  'postulaciÃ³n': 'postulación',
  'automtÃºico': 'automático',
  'contactarï¿½': 'contactará',
  'prï¿½ctico': 'práctico',
  'cÃ³mo': 'cómo',
  'situaciÃ³n': 'situación',
  'podrï¿½': 'podrá',
  'servicioï¿½': 'servicio...',
  'resolverï¿½as': 'resolverías',
  'quÃ©': 'qué',
  'preguntarï¿½as': 'preguntarías',
  'soluciÃ³n': 'solución',
  'propondrï¿½as': 'propondrías',
  'recibirsÃ­': 'recibirás',
  'tambiÃ³n': 'también',
  'construcciÃ³n': 'construcción',
  'mantenciÃ³n': 'mantención',
  'meÃ±': 'menú'
};

glob.filter(f => f.endsWith('.html')).forEach(f => {
  const p = 'frontend-v2/' + f;
  let c = fs.readFileSync(p, 'utf8');
  
  let changed = false;
  Object.keys(fixes).forEach(badStr => {
    if (c.includes(badStr)) {
      c = c.split(badStr).join(fixes[badStr]);
      changed = true;
    }
  });
  
  if (changed) {
    fs.writeFileSync(p, c, 'utf8');
    console.log('Fixed:', p);
  }
});
