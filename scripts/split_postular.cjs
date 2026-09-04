const fs = require('fs');

let indexHtml = fs.readFileSync('frontend-v2/red-partner-v2/index.html', 'utf8');

let formStartIdx = indexHtml.indexOf('<div class="section-container" id="postulacion">');
let scriptEndIdx = indexHtml.indexOf('</script>', indexHtml.indexOf('postular.js')) + 9;

if (formStartIdx === -1 || scriptEndIdx === -1) {
  console.log('Could not find form boundaries!');
  process.exit(1);
}

let formHtml = indexHtml.substring(formStartIdx, scriptEndIdx);

let heroStartIdx = indexHtml.indexOf('<section class="partner-premium-hero" id="tpl-studio"');
let headAndNav = indexHtml.substring(0, heroStartIdx);

let footerStartIdx = indexHtml.indexOf('<section aria-labelledby="tpl-partners-title"');
let footer = indexHtml.substring(footerStartIdx);

// Modify the canonical link in headAndNav
headAndNav = headAndNav.replace('<link href="https://www.parcelalista.cl/red-partner-v2/postular.html" rel="canonical"/>', '');

// Set title to Postular a Red Partner
headAndNav = headAndNav.replace('<title>Trabajos y servicios para proyectos de campo | Partners TPL</title>', '<title>Postular a la Red de Partners | Tu Parcela Lista</title>');

// We also need to update the navigation in headAndNav so the Red Partner link points to index.html and postular points to postular.html
// In index.html, `<a href="./index.html">Red Partner</a>` and `<a class="tpl-publish" href="../plataforma/publicar/index.html">Publicar</a>`. 
// Since we are in postular.html, the hrefs should remain the same because they are in the same folder.

let postularHtml = headAndNav + '\n<main style="padding-top: 100px; background: #f8fafc;">\n' + formHtml + '\n</main>\n' + footer;
fs.writeFileSync('frontend-v2/red-partner-v2/postular.html', postularHtml, 'utf8');

// Now remove the form from index.html
let newIndexHtml = indexHtml.substring(0, formStartIdx) + indexHtml.substring(scriptEndIdx);
// Fix the hrefs pointing to #postulacion
newIndexHtml = newIndexHtml.replace(/href="#postulacion"/g, 'href="postular.html"');
fs.writeFileSync('frontend-v2/red-partner-v2/index.html', newIndexHtml, 'utf8');

console.log('Successfully separated postular.html from index.html');
