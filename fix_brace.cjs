const fs = require('fs');
let content = fs.readFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/index.js', 'utf8');

const target = `                                } else {
                                    comuna = exactMatch;
                                }

                                    if (typeof showToast === 'function') showToast('El ttulo y la comuna son obligatorios', 'error');
                                    else alert('El ttulo y la comuna son obligatorios');
                                    return;
                                }`;

const replacement = `                                } else {
                                    comuna = exactMatch;
                                }`;

content = content.replace(target, replacement);
fs.writeFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/index.js', content);
console.log('Fixed unmatched brace');
