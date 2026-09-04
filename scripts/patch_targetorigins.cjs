const fs = require('fs');

let js = fs.readFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/index.js', 'utf8');

const oldBlock = /const targetOrigins = \[\s*'https:\/\/www\.portalinmobiliario\.com',\s*'https:\/\/portalinmobiliario\.com',\s*'https:\/\/www\.yapo\.cl',\s*'https:\/\/yapo\.cl'\s*\];/;

const newBlock = `const targetOrigins = [
            'https://www.portalinmobiliario.com',
            'https://portalinmobiliario.com',
            'https://www.yapo.cl',
            'https://yapo.cl',
            'https://www.portalterreno.cl',
            'https://portalterreno.cl'
        ];`;

js = js.replace(oldBlock, newBlock);

fs.writeFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/index.js', js, 'utf8');
console.log("Updated targetOrigins in index.js");
