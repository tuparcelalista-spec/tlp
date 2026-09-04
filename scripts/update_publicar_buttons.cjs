const fs = require('fs');

let html = fs.readFileSync('frontend-v2/plataforma/publicar/index.html', 'utf8');

const target = `<button class="submit-button" id="submitBtn" type="submit"><span>Publicar mi propiedad</span><small>Enviar a revisión TPL</small></button>`;
const replacement = `<div class="submit-actions" style="display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem;">
          <button class="submit-button premium-submit" id="submitPremiumBtn" type="button" style="background: linear-gradient(135deg, var(--primary), var(--secondary)); border: none; box-shadow: 0 4px 15px rgba(0,130,138,0.3);">
            <span>Publicar + Adquirir Informe Premium</span>
            <small>Obtén el análisis IA, catastro y ranking ($9.990)</small>
          </button>
          <button class="submit-button" id="submitBtn" type="submit" style="background: var(--bg-card); color: var(--text); border: 1px solid var(--border);">
            <span>Solo Publicar</span>
            <small>Enviar a revisión TPL (Gratis)</small>
          </button>
        </div>`;

// Note: Handle encoding differences if any
html = html.replace(/<button class="submit-button" id="submitBtn" type="submit">.*<\/button>/s, replacement);

fs.writeFileSync('frontend-v2/plataforma/publicar/index.html', html, 'utf8');
console.log('Modified index.html buttons');
