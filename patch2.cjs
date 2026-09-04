const fs = require('fs');
const path = 'd:/BIOTV MARKETING/NUEVO BIOTV/PÁGINAS WEB/TPL PAGINA MALA/TPL PRUEBA NUEVA/frontend-v2/parcela.html';

let content = fs.readFileSync(path, 'utf8');

const jsTarget = `          if (btnAgendar && dialog) {
              btnAgendar.addEventListener('click', () => {
                  dialog.showModal();
              });
          }`;

const newJs = `          const btnCotizar = document.getElementById('btn-cotizar-casa');
          const btnOferta = document.getElementById('btn-hacer-oferta');

          if (btnCotizar) {
              btnCotizar.addEventListener('click', () => {
                  const parcelaId = new URLSearchParams(window.location.search).get('id') || document.title;
                  const msg = \`Hola, me interesa cotizar un proyecto de casa para la parcela \${parcelaId}.\`;
                  const encoded = encodeURIComponent(msg);
                  window.open(\`https://wa.me/56988508361?text=\${encoded}\`, '_blank');
              });
          }

          if (btnOferta) {
              btnOferta.addEventListener('click', () => {
                  const parcelaId = new URLSearchParams(window.location.search).get('id') || document.title;
                  const msg = \`Hola, quiero hacer una oferta por la parcela \${parcelaId}.\`;
                  const encoded = encodeURIComponent(msg);
                  window.open(\`https://wa.me/56988508361?text=\${encoded}\`, '_blank');
              });
          }

          if (btnAgendar && dialog) {
              btnAgendar.addEventListener('click', () => {
                  dialog.showModal();
              });
          }`;

if (content.indexOf(jsTarget) !== -1) {
    fs.writeFileSync(path, content.replace(jsTarget, newJs), 'utf8');
    console.log('JS Patch successful');
} else {
    console.log('Could not find JS target to patch');
}
