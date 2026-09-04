const fs = require('fs');
const path = 'frontend-v2/plataforma/crm-tpl-v1/modules/catastro/index.js';
let content = fs.readFileSync(path, 'utf8');

let idx = content.lastIndexOf('// Recargar');
if (idx === -1) {
    console.log('Error: Could not find // Recargar');
    process.exit(1);
}

content = content.substring(0, idx);

content += `// Recargar
                                    isLoading = true;
                                    init();
                                } catch (error) {
                                    console.error(error);
                                    alert('❌ Error al guardar: ' + error.message);
                                    btn.disabled = false;
                                    btn.innerHTML = 'Aprobar y Guardar';
                                }
                            }
                        }
                    ]
                });
                console.log('[TPL-CATASTRO] Modal de revisión real mostrado');
            }
        });
    }

    // 4. Enviar TPL_CATASTRO_READY al opener para iniciar transferencia
    if (window.opener) {
        try {
            window.opener.postMessage({ type: 'TPL_CATASTRO_READY' }, '*');
            console.log('[TPL-CATASTRO] READY enviado con origin *');
        } catch(e) {
            console.error('[TPL-CATASTRO] Error enviando READY:', e);
        }
    }
}
`;

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully repaired index.js');
