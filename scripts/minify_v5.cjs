const fs = require('fs');
let c = fs.readFileSync('scripts/master_bookmarklet_5.cjs', 'utf8');
let m = c.match(/const js = `([\s\S]*?)`;/);
if (m) {
    fs.writeFileSync('bookmarklet_v5.txt', 'javascript:' + m[1].replace(/\n/g, ''), 'utf8');
}
