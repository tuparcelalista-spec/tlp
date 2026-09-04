const fs = require('fs');
const glob = require('fs').readdirSync('frontend-v2', {recursive: true});

const files = [
  'plataforma/publicar/tasador.html',
  'plataforma/tasador/index.html',
  'plataforma/tpl-business/index.html',
  'plataforma/tpl-business/modalidad.html',
  'archive/legacy/studio/index.html'
];

const words = {
  'An\uFFFDlisis': 'Análisis',
  '\uFFFDltima': 'última',
  'a\uFFFDn': 'aún',
  'A\uFFFDn': 'Aún',
  'aqu\uFFFD': 'aquí',
  'Tecnolog\uFFFDa': 'Tecnología',
  'tecnol\uFFFDgicas': 'tecnológicas',
  'estads\uFFFDticas': 'estadísticas',
  'acompa\uFFFDamos': 'acompañamos',
  'podrs\uFFFD': 'podrás',
  'campa\uFFFDas': 'campañas',
  'campa\uFFFDa': 'campaña',
  'c\uFFFDdigo': 'código',
  'Art\uFFFDculo': 'Artículo',
  'plusval\uFFFDa': 'plusvalía',
  'T\uFFFDcnico': 'Técnico',
  'aparecer\uFFFD': 'aparecerá',
  'Mt\uFFFDricas': 'Métricas',
  'com\uFFFDn': 'común',
  '>\uFFFD<': '>\u00D7<' // multiply sign for close button
};

files.forEach(f => {
  const p = 'frontend-v2/' + f;
  if (!fs.existsSync(p)) return;
  let c = fs.readFileSync(p, 'utf8');
  
  Object.keys(words).forEach(badStr => {
    c = c.split(badStr).join(words[badStr]);
  });
  
  fs.writeFileSync(p, c, 'utf8');
  console.log('Fixed:', p);
});
