const fs = require('fs');
let js = fs.readFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/parcelas/editor-integral.js', 'utf8');

// 1. Add input field to the HTML template
const htmlTarget = `<div class="ei-form-group full-width">
                <label>Descripcin Destacada</label>`;

// Parse existing metadata to populate the input field
const metadataParseCode = `const metaObj = (typeof record.metadata === 'string') ? JSON.parse(record.metadata) : (record.metadata || {});`;

const htmlReplacement = `${metadataParseCode}
              <div class="ei-form-group full-width">
                <label>URL Video YouTube</label>
                <input type="url" id="ei-video-url" value="\${escapeHTML(metaObj.videoUrl || record.video || '')}" placeholder="https://www.youtube.com/watch?v=...">
              </div>
              <div class="ei-form-group full-width">
                <label>Descripcin Destacada</label>`;

js = js.replace(htmlTarget, htmlReplacement);

// 2. Read the value in the save function
const savePayloadTarget = `updated_at: new Date().toISOString()
        };`;

const savePayloadReplacement = `updated_at: new Date().toISOString()
        };
        
        let oldMeta = typeof record.metadata === 'string' ? JSON.parse(record.metadata) : (record.metadata || {});
        oldMeta.videoUrl = document.getElementById('ei-video-url').value;
        payload.metadata = oldMeta;
        if (oldMeta.videoUrl) payload.video = oldMeta.videoUrl;`;

js = js.replace(savePayloadTarget, savePayloadReplacement);

// 3. Fix metadata overwrite during valuation calculation
const metaOverwriteTarget = `payload.metadata = {
                tasador_entrada: engineInput,
                engineVersion: 'v2.4'
              };`;

const metaOverwriteReplacement = `payload.metadata = {
                ...(payload.metadata || {}),
                tasador_entrada: engineInput,
                engineVersion: 'v2.4'
              };`;

js = js.replace(metaOverwriteTarget, metaOverwriteReplacement);

fs.writeFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/parcelas/editor-integral.js', js, 'utf8');
console.log('Modified editor-integral.js to add video URL field');
