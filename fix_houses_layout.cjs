const fs = require('fs');
const path = 'frontend-v2/index.html';
let html = fs.readFileSync(path, 'utf8');

const targetStr = `<section id="houses-section" style="display:none; margin-top: 60px;">`;
const replacementStr = `<section id="houses-section" class="results-section" style="display:none; margin-top: 60px; padding-top: 0;">`;

html = html.replace(targetStr, replacementStr);
fs.writeFileSync(path, html);
console.log('Fixed houses-section alignment in index.html');
