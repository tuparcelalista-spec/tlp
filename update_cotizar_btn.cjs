const fs = require('fs');

const path = 'd:/BIOTV MARKETING/NUEVO BIOTV/PÁGINAS WEB/TPL PAGINA MALA/TPL PRUEBA NUEVA/frontend-v2/parcela.html';
let content = fs.readFileSync(path, 'utf8');

const oldLogic = `          if (btnCotizar) {
              btnCotizar.addEventListener('click', () => {
                  const parcelaId = new URLSearchParams(window.location.search).get('id') || document.title;
                  const msg = \`Hola, me interesa cotizar un proyecto de casa para la parcela \${parcelaId}.\`;
                  const encoded = encodeURIComponent(msg);
                  window.open(\`https://wa.me/56988508361?text=\${encoded}\`, '_blank');
              });
          }`;

const newLogic = `          if (btnCotizar) {
              btnCotizar.addEventListener('click', () => {
                  const parcelaId = new URLSearchParams(window.location.search).get('id');
                  if (parcelaId) {
                      window.location.href = \`cotizador.html?parcelaId=\${parcelaId}\`;
                  } else {
                      window.location.href = 'cotizador.html';
                  }
              });
          }`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync(path, content, 'utf8');
console.log('Button logic updated to redirect to cotizador.html');
