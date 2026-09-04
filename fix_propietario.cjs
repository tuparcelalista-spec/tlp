const fs = require('fs');
let html = fs.readFileSync('frontend-v2/plataforma/propietario/index.html', 'utf8');

// Global replacement of relative paths
html = html.replace(/href="\.\/como-comprar\.html"/g, 'href="../../como-comprar.html"');
html = html.replace(/href="\.\/red-partner-v2\/index\.html"/g, 'href="../../red-partner-v2/index.html"');
html = html.replace(/href="\.\/plataforma\/tpl-business\/index\.html"/g, 'href="../tpl-business/index.html"');
html = html.replace(/href="\.\/plataforma\/publicar\/index\.html"/g, 'href="../publicar/index.html"');

// Fix the SVG logo which was recently updated in index.html!
// The real global header uses ./assets/brand/tpl-mark.svg
html = html.replace(/<img src="\.\.\/\.\.\/assets\/logo-tu-parcela-lista\.png" width="130" height="56" alt="Tu Parcela Lista">/g, '<img src="../../assets/brand/tpl-mark.svg" width="130" height="56" alt="Tu Parcela Lista">');

// Add Mobile Menu JS Toggle
const jsInjection = `
    <script>
        document.addEventListener("DOMContentLoaded", () => {
            const toggle = document.getElementById("menu-toggle");
            const menu = document.getElementById("mobile-menu");
            if (toggle && menu) {
                toggle.addEventListener("click", () => {
                    const isHidden = menu.hidden;
                    menu.hidden = !isHidden;
                    toggle.setAttribute("aria-expanded", String(isHidden));
                });
            }
        });
        
        function mostrarFase(idFase) {
            document.querySelectorAll('.fase-container').forEach(el => {
                el.classList.remove('fase-active');
            });
            
            document.getElementById(idFase).classList.add('fase-active');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    </script>
`;

html = html.replace(/<script>\s*function mostrarFase[\s\S]*?<\/script>/, jsInjection);

fs.writeFileSync('frontend-v2/plataforma/propietario/index.html', html);
console.log('Fixed owner html');
