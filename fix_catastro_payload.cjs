const fs = require('fs');
const path = 'frontend-v2/plataforma/crm-tpl-v1/modules/catastro/index.js';
let js = fs.readFileSync(path, 'utf8');

const targetPayload = `const finalPayload = {
                                        titulo: tituloVal,
                                        precio_clp: clpVal,
                                        precio_uf: ufVal,
                                        superficie_m2: supVal,
                                        comuna: comunaVal,
                                        localidad: locVal,
                                        lat: latVal,
                                        lng: lngVal,
                                        contacto_nombre: nomVal,
                                        contacto_telefono: telVal,
                                        contacto_email: emailVal,
                                        antiguedad: antiVal,
                                        tipo_propiedad: tipoVal,
                                        url: payload.url,
                                        fuente: payload.fuente,
                                        capture_id: payload.capture_id,
                                        captured_at: payload.captured_at,
                                        captured_by: userId,
                                        atributos: atributosVal,
                                        texto_original: payload.texto_original
                                    };`;

const replacementPayload = `const finalPayload = {
                                        titulo: tituloVal,
                                        precio_clp: clpVal,
                                        precio_uf: ufVal,
                                        superficie_m2: supVal,
                                        comuna: comunaVal,
                                        localidad: locVal,
                                        lat: latVal,
                                        lng: lngVal,
                                        contacto_nombre: nomVal,
                                        contacto_telefono: telVal,
                                        contacto_email: emailVal,
                                        antiguedad: antiVal,
                                        tipo_propiedad: tipoVal,
                                        url: payload.url,
                                        fuente: payload.fuente,
                                        capture_id: payload.capture_id,
                                        captured_at: payload.captured_at,
                                        captured_by: userId,
                                        atributos: atributosVal,
                                        texto_original: payload.texto_original,
                                        metadata: {
                                            superficie_construida: payload.superficie_construida,
                                            dormitorios: payload.dormitorios,
                                            banos: payload.banos,
                                            material: payload.material,
                                            estado: payload.estado
                                        }
                                    };`;

js = js.replace(targetPayload, replacementPayload);

fs.writeFileSync(path, js);
console.log('Fixed catastro index.js to save house data into metadata');
