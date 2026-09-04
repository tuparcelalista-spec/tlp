const fs = require('fs');
let code = fs.readFileSync('frontend-v2/plataforma/publicar-v2/js/modules/wizard.js', 'utf8');

const anchor = /condominio: val\('condominio'\),/g;

const newPayloadFields = `condominio: val('condominio'),
        // House fields
        supCasa: Number(val('supCasa')) || 0,
        matCasa: val('matCasa'),
        regCasa: val('regCasa'),
        antCasa: Number(val('antCasa')) || 0,
        piscinaCasa: val('piscinaCasa'),
        piscinaMat: val('piscinaMat'),
        piscinaM2: Number(val('piscinaM2')) || 0,
        quinchoCasa: val('quinchoCasa'),
        cabanaCasa: val('cabanaCasa'),
        riegoCasa: val('riegoCasa'),`;

if (!code.includes('supCasa: Number(val(\'supCasa\'))')) {
    code = code.replace(anchor, newPayloadFields);
    fs.writeFileSync('frontend-v2/plataforma/publicar-v2/js/modules/wizard.js', code);
    console.log('Injected payload fields into wizard.js');
} else {
    console.log('Already injected payload in wizard.js');
}
