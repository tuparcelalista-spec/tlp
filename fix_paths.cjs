const fs = require('fs');
let html = fs.readFileSync('frontend-v2/plataforma/propietario/index.html', 'utf8');

// Fix Logo path
html = html.replace('./assets/logo-tu-parcela-lista.png', '../../assets/logo-tu-parcela-lista.png');

// Fix Menu links paths
html = html.replace('href="./index.html"', 'href="../../index.html"');
html = html.replace('href="./como-comprar.html"', 'href="../../como-comprar.html"');
html = html.replace('href="./red-partner-v2/index.html"', 'href="../../red-partner-v2/index.html"');
html = html.replace('href="./plataforma/tpl-business/index.html"', 'href="../tpl-business/index.html"');
html = html.replace('href="./plataforma/publicar/index.html"', 'href="../publicar/index.html"');
html = html.replace('href="./plataforma/publicar/index.html"', 'href="../publicar/index.html"');

fs.writeFileSync('frontend-v2/plataforma/propietario/index.html', html);
console.log('Fixed paths');
