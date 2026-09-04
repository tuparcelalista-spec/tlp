const fs = require('fs');
let code = fs.readFileSync('frontend-v2/plataforma/crm-tpl-v1/components/modal.js', 'utf8');

code = code.replace(
    /backdrop\.addEventListener\('click',\s*\(e\)\s*=>\s*\{\s*if\s*\(e\.target\s*===\s*backdrop\)\s*closeModal\(\);\s*\}\);/,
    `backdrop.addEventListener('click', (e) => {
    // if (e.target === backdrop) closeModal(); // REMOVED: Prevent accidental closing
  });`
);

fs.writeFileSync('frontend-v2/plataforma/crm-tpl-v1/components/modal.js', code);
console.log("Patched modal.js to prevent accidental closing");
