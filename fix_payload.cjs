const fs = require('fs');
let code = fs.readFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/index.js', 'utf8');

code = code.replace(/texto_original:\s*payload\.texto_original\s*\}/g, `texto_original: payload.texto_original,
                                        metadata: {
                                            superficie_construida: typeof supConstVal !== 'undefined' ? supConstVal : null,
                                            dormitorios: typeof dormVal !== 'undefined' ? dormVal : null,
                                            banos: typeof banosVal !== 'undefined' ? banosVal : null,
                                            material: typeof matVal !== 'undefined' ? matVal : '',
                                            estado: payload.estado || ''
                                        }
                                    }`);

fs.writeFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/index.js', code);
console.log('Fixed payload');
