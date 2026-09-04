const fs = require('fs');
let html = fs.readFileSync('frontend-v2/index.html', 'utf8');

const regex = /<button id="load-more" class="load-more" type="button" hidden>Ver m&aacute;s parcelas<\/button>\s*<\/section>/;

const replacement = `<button id="load-more" class="load-more" type="button" hidden>Ver m&aacute;s parcelas</button>
      </section>

      <!-- SECCIÓN PARCELAS CON CASA -->
      <section id="houses-section" style="display:none; margin-top: 60px;">
        <h2 class="section-title">Parcelas con casa</h2>
        <p style="text-align:center; color:var(--c-text-muted); margin-bottom: 32px;">Propiedades listas para llegar y habitar.</p>
        <div class="parcel-grid" id="houses-grid">
          <!-- Rendered via JS -->
        </div>
      </section>`;

html = html.replace(regex, replacement);
fs.writeFileSync('frontend-v2/index.html', html);
console.log('Added houses-section to index.html');
