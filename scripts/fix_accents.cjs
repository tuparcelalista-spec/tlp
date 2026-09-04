const fs = require('fs');
const glob = require('fs').readdirSync('frontend-v2', {recursive: true});

const words = {
  'nete': 'Únete', 'diseo': 'diseño', 'construccin': 'construcción', 'Biobo': 'Biobío',
  'uble': 'Ñuble', 'Araucana': 'Araucanía', 'Valparaso': 'Valparaíso', 'Los Ros': 'Los Ríos',
  'estn': 'están', 'ms': 'más', 'aqu': 'aquí', 'tambin': 'también',
  'informacin': 'información', 'evaluacin': 'evaluación', 'ejecucin': 'ejecución',
  'postulacin': 'postulación', 'cotizacin': 'cotización', 'revisin': 'revisión',
  'condicin': 'condición', 'direccin': 'dirección', 'ubicacin': 'ubicación',
  'duracin': 'duración', 'instalacin': 'instalación', 'opcin': 'opción',
  'versin': 'versión', 'cmo': 'cómo', 'cundo': 'cuándo', 'dnde': 'dónde',
  'quin': 'quién', 'qu': 'qué', 'Trminos': 'Términos', 'Poltica': 'Política',
  'Pgina': 'Página', 'prctico': 'práctico', 'automtico': 'automático',
  'bsico': 'básico', 'ltimo': 'último', 'nica': 'única', 'garanta': 'garantía',
  'fotografa': 'fotografía', 'tecnologa': 'tecnología', 'asesora': 'asesoría',
  'categora': 'categoría', 'gasfitera': 'gasfitería', 'topografa': 'topografía',
  'Elctrico': 'Eléctrico', 'elctrico': 'eléctrico', 'Crdito': 'Crédito',
  'crdito': 'crédito', 'comunicacin': 'comunicación', 'visin': 'visión',
  'inversin': 'inversión', 'atencin': 'atención', 'decisin': 'decisión',
  'opinin': 'opinión', 'accin': 'acción', 'funcin': 'función', 'seccin': 'sección',
  'solucin': 'solución', 'reputacin': 'reputación', 'presentacin': 'presentación',
  'verificacin': 'verificación', 'calificacin': 'calificación', 'certificacin': 'certificación',
  'aprobacin': 'aprobación', 'adjudicacin': 'adjudicación', 'das': 'días',
  'araucana': 'araucanía', 'rea': 'área', 'reas': 'áreas', 'gil': 'ágil',
  'hbil': 'hábil', 'fcil': 'fácil', 'difcil': 'difícil', 'prximo': 'próximo',
  'mximo': 'máximo', 'mnimo': 'mínimo', 'ptimo': 'óptimo', 'nico': 'único',
  'Prez': 'Pérez', 'Concepcin': 'Concepción', 'campaas': 'campañas',
  'acompao': 'acompaño', 'compaa': 'compañía', 'nio': 'niño', 'ao': 'año',
  'aos': 'años', 'disear': 'diseñar', 'ensear': 'enseñar', 'seal': 'señal',
  'dueo': 'dueño', 'sueo': 'sueño', 'bao': 'baño', 'dao': 'daño',
  'pequeo': 'pequeño', 'tamao': 'tamaño', 'rbol': 'árbol', 'rpida': 'rápida',
  'rpido': 'rápido', 'msica': 'música', 'pblica': 'pública', 'pblico': 'público',
  'Cmo': 'Cómo', 'Qu': 'Qué', 'Quin': 'Quién', 'rboles': 'árboles',
  'pulgadas': 'pulgadas', 'T': 'Tú', 't': 'tú', 'l': 'él', 's': 'sí', 'Aos': 'Años', 'Mximo': 'Máximo'
};

const regexes = Object.keys(words).map(k => {
  const badWord = k.replace('', '\uFFFD');
  return {
    bad: new RegExp('\\\\b' + badWord + '\\\\b', 'g'),
    good: words[k]
  };
});

// also for things without word boundaries (like inside words)
const raw = [
  {bad: /\uFFFDn/g, good: 'ón'},
  {bad: /n\uFFFD/g, good: 'ñ'},
  {bad: /N\uFFFD/g, good: 'Ñ'},
  {bad: /\uFFFD/g, good: 'í'} // default to i if unknown but let s not be too aggressive
];

glob.filter(f => f.endsWith('.html') || f.endsWith('.md')).forEach(f => {
  const p = 'frontend-v2/' + f;
  let c = fs.readFileSync(p, 'utf8');
  if(!c.includes('\uFFFD')) return;
  
  Object.keys(words).forEach(k => {
    const badStr = k.replace('', '\uFFFD');
    c = c.split(badStr).join(words[k]);
  });
  
  // Some manual ones
  c = c.split('Qu\uFFFD').join('Qué');
  c = c.split('qu\uFFFD').join('qué');
  c = c.split('m\uFFFDs').join('más');
  c = c.split('C\uFFFDmo').join('Cómo');
  c = c.split('c\uFFFDmo').join('cómo');
  c = c.split('dise\uFFFD').join('diseñ');
  c = c.split('comunicaci\uFFFDn').join('comunicación');
  c = c.split('n\uFFFDn').join('nión');
  c = c.split('i\uFFFDn').join('ión');
  c = c.split('a\uFFFDos').join('años');
  c = c.split('a\uFFFDo').join('año');
  c = c.split('N\uFFFD').join('Ñ');
  c = c.split('n\uFFFD').join('ñ');
  
  // Remaining fffd that look like 'ion'
  c = c.replace(/ci\uFFFDn/g, 'ción');
  c = c.replace(/si\uFFFDn/g, 'sión');
  c = c.replace(/ti\uFFFDn/g, 'tión');
  
  // Leftovers might be e or i
  
  fs.writeFileSync(p, c, 'utf8');
  console.log('Fixed:', p);
});
