const fs = require('fs');

let content = fs.readFileSync('frontend-v2/js/informe-tasacion.js', 'utf-8');

const prosConsLogic = `
  function extractProsAndCons(c) {
    const virtudes = [];
    const debilidades = [];
    const norm = v => String(v || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().trim();
    
    const water = norm(c.agua || c.water);
    const luz = norm(c.electricidad || c.luz || c.electricity);
    const topo = norm(c.topografia || c.topography);
    
    if (/(pozo|apr|red|potable)/.test(water)) virtudes.push('Agua');
    else if (/(sin agua|no tiene|aljibe)/.test(water)) debilidades.push('Sin agua');
    
    if (/(empalme|conectada|postacion|medidor)/.test(luz)) virtudes.push('Luz');
    else if (/(sin|no tiene)/.test(luz) && !/(factibilidad)/.test(luz)) debilidades.push('Sin luz');
    
    if (/(plano|100% plano|suave)/.test(topo)) virtudes.push('Topografía plana');
    else if (/(quebrada|fuerte|cerro|abrupta)/.test(topo)) debilidades.push('Topografía compleja');
    
    return { virtudes, debilidades };
  }
`;

const originalCatastroMap = `    const catastro = Array.isArray(d.catastro) ? d.catastro : [];
    const comparables = catastro.map(c => ({
      title: c.titulo || c.title || 'Propiedad de mercado',
      price: Number(c.precio || c.price || 0),
      area: c.superficie_m2 || c.area,
      isCurrent: false
    })).filter(c => c.price > 0);`;

const newCatastroMap = `    const catastro = Array.isArray(d.catastro) ? d.catastro : [];
    const comparables = catastro.map(c => {
      const pc = extractProsAndCons(c);
      return {
        title: c.titulo || c.title || 'Propiedad de mercado',
        price: Number(c.precio || c.price || 0),
        area: c.superficie_m2 || c.area,
        virtudes: pc.virtudes,
        debilidades: pc.debilidades,
        isCurrent: false
      };
    }).filter(c => c.price > 0);`;

const originalHtmlItem = `<small style="color:var(--text-muted, #666);">\${c.area ? Number(c.area).toLocaleString('es-CL') + ' m²' : 'Superficie no informada'}</small>`;

const newHtmlItem = `<small style="color:var(--text-muted, #666);">\${c.area ? Number(c.area).toLocaleString('es-CL') + ' m²' : 'Superficie no informada'}</small>
                    \${c.virtudes && c.virtudes.length ? \`<div style="color:var(--positive, #10b981); font-size:0.75rem; margin-top:4px;">+ \${esc(c.virtudes.join(', '))}</div>\` : ''}
                    \${c.debilidades && c.debilidades.length ? \`<div style="color:var(--negative, #ef4444); font-size:0.75rem; margin-top:2px;">- \${esc(c.debilidades.join(', '))}</div>\` : ''}`;

if (!content.includes('extractProsAndCons')) {
  // Inject function before render
  content = content.replace('function render(d) {', prosConsLogic + '\n  function render(d) {');
  content = content.replace(originalCatastroMap, newCatastroMap);
  content = content.replace(originalHtmlItem, newHtmlItem);
  fs.writeFileSync('frontend-v2/js/informe-tasacion.js', content, 'utf-8');
  console.log('informe-tasacion.js updated successfully');
} else {
  console.log('Already updated.');
}
