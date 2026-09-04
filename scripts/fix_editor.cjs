const fs = require('fs');
let code = fs.readFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/parcelas/editor-integral.js', 'utf8');

const replacement = `              <button type="button" id="ei-btn-simular" class="ei-btn ei-btn-secondary" style="align-self:flex-start; font-size: 0.85rem; padding: 0.4rem 0.75rem;">
                <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                Recalcular Motor Tasador
              </button>
          </div>
          <div style="display:flex; gap:0.75rem;">
            <button type="button" id="ei-btn-informe-premium" class="ei-btn" style="background:#b8860b; color:white; border:none; padding:0.5rem 1rem; border-radius:4px; font-weight:600; cursor:pointer;">👑 Informe Premium</button>
            <button type="button" id="ei-btn-link-propietario" class="ei-btn ei-btn-secondary">🔗 Link Propietario</button>
            <button type="submit" id="ei-btn-guardar" class="ei-btn ei-btn-primary">Guardar Propiedad</button>
          </div>
        </div>
      </form>
    </div>
  \`;
`;

// Find where we messed up
const damagedArea = /<\/div>\s*}\s*function initEIMap/;
if (damagedArea.test(code)) {
    code = code.replace(damagedArea, replacement + '\n}\n\nfunction initEIMap');
    fs.writeFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/parcelas/editor-integral.js', code, 'utf8');
    console.log('Fixed editor-integral.js successfully.');
} else {
    console.log('Could not find the damaged area pattern.');
}

