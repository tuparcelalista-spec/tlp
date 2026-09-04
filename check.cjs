
const fs = require('fs');
const html = fs.readFileSync('frontend-v2/parcela.html', 'utf8');
const badChars = ['Ã', 'Â'];
badChars.forEach(char => {
    const idx = html.indexOf(char);
    if (idx !== -1) {
        console.log('Found', char, 'in HTML at', idx, 'context:', html.substring(Math.max(0, idx - 20), idx + 20));
    }
});

const js = fs.readFileSync('frontend-v2/js/parcela.js', 'utf8');
badChars.forEach(char => {
    const idx = js.indexOf(char);
    if (idx !== -1) {
        console.log('Found', char, 'in JS at', idx, 'context:', js.substring(Math.max(0, idx - 20), idx + 20));
    }
});

