const fs = require('fs');
let js = fs.readFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/parcelas/editor-integral.js', 'utf8');

const regex = /<input type="number" id="ei-superficie" value="\$\{record\.superficie_m2 \|\| ''\}">\s*<\/div>/;

if (regex.test(js)) {
    js = js.replace(regex, `<input type="number" id="ei-superficie" value="\${record.superficie_m2 || ''}">
              </div>
              <div class="ei-form-group full-width">
                <label>URL Video YouTube (Opcional)</label>
                <input type="url" id="ei-video-url" value="\${escapeHTML((typeof record.metadata==='string'?JSON.parse(record.metadata):record.metadata)?.videoUrl || record.video || '')}" placeholder="https://www.youtube.com/watch?v=...">
              </div>`);
    fs.writeFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/parcelas/editor-integral.js', js, 'utf8');
    console.log('Fixed HTML properly');
} else {
    console.log('Regex not matched');
}
