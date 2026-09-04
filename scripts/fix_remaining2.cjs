const fs = require('fs');
const glob = require('fs').readdirSync('frontend-v2', {recursive: true});

const words = {
  'f\uFFFDrtil': 'fértil', 'Panor\uFFFDmica': 'Panorámica', 'automt\uFFFDico': 'automático',
  'S\uFFFD': 'Sí', 'R\uFFFDo': 'Río', 'cerca\uFFFDas': 'cercanías', 'm\uFFFD': 'm²',
  'Alba\uFFFDiler\uFFFDa': 'Albañilería', 'Hormig\uFFFDn': 'Hormigón', 'A\uFFFDo': 'Año',
  'volc\uFFFDn': 'volcán', 'Descr\uFFFDbela': 'Descríbela', 'Quedar\uFFFD': 'Quedará',
  't\uFFFDcnico': 'técnico', 'seg\uFFFDn': 'según', 'v\uFFFDlida': 'válida',
  'r\uFFFDpida': 'rápida', '\uFFFDCómo': '¿Cómo', 'incorpor\uFFFD': 'incorporó',
  'Qu\uFFFDieres': '¿Quieres', '\uFFFDndices': 'Índices', '\uFFFDndice': 'Índice',
  'hist\uFFFDricos': 'históricos', 'm\uFFFDnimo': 'mínimo', 'aqu\uFFFD': 'aquí',
  'Tecnolog\uFFFDa': 'Tecnología', 'tecnol\uFFFDgicas': 'tecnológicas', 'podrs\uFFFD': 'podrás',
  'Campa\uFFFDas': 'Campañas', 'campa\uFFFDa': 'campaña', 'c\uFFFDdigo': 'código',
  'Im\uFFFDgenes': 'Imágenes', 'l\uFFFDnea': 'línea', 'p\uFFFDblica': 'pública',
  'Art\uFFFDculo': 'Artículo', 'plusval\uFFFDa': 'plusvalía', 'T\uFFFDcnico': 'Técnico',
  'aparecer\uFFFD': 'aparecerá', 'An\uFFFDlisis': 'Análisis', '\uFFFDltima': 'última',
  'a\uFFFDn': 'aún', 'A\uFFFDn': 'Aún', 'estads\uFFFDticas': 'estadísticas',
  'acompa\uFFFDamos': 'acompañamos', 'Mt\uFFFDricas': 'Métricas', 'com\uFFFDn': 'común',
  'port\uFFFDn': 'portón', 'autom\uFFFDtico': 'automático', 'r\uFFFDo': 'río', 'v\uFFFDlida': 'válida',
  'estads\uFFFDticas': 'estadísticas', 'dise\uFFFDo': 'diseño', 'ubicaci\uFFFDn': 'ubicación',
  ' \uFFFD ': ' - ' // just in case
};

glob.filter(f => f.endsWith('.html')).forEach(f => {
  const p = 'frontend-v2/' + f;
  let c = fs.readFileSync(p, 'utf8');
  if(!c.includes('\uFFFD')) return;
  
  Object.keys(words).forEach(badStr => {
    c = c.split(badStr).join(words[badStr]);
  });
  
  // Replace remaining single \uFFFD if they look like an accent before n (already handled mostly)
  // Let's replace any \uFFFD before 'n' with 'ó'
  c = c.replace(/\uFFFDn\b/g, 'ón');
  c = c.replace(/\uFFFDo\b/g, 'ño');
  
  fs.writeFileSync(p, c, 'utf8');
});
