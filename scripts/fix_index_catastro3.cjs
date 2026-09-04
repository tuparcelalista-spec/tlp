const fs = require('fs');
const path = 'frontend-v2/plataforma/crm-tpl-v1/modules/catastro/index.js';
let lines = fs.readFileSync(path, 'utf8').split('\n');

let initIdx = -1;
for (let i = 700; i < lines.length; i++) {
    if (lines[i].includes('isLoading = true;') && lines[i+1].includes('init();')) {
        initIdx = i + 1;
        break;
    }
}

if (initIdx !== -1) {
    let newLines = lines.slice(0, initIdx + 1);
    const suffix = `                                } catch (error) {
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
    
    fs.writeFileSync(path, newLines.join('\n') + '\n' + suffix, 'utf8');
    console.log('Fixed file.');
}
