const fs = require('fs');
const path = 'd:/BIOTV MARKETING/NUEVO BIOTV/PÁGINAS WEB/TPL PAGINA MALA/TPL PRUEBA NUEVA/frontend-v2/plataforma/crm-tpl-v1/modules/parcelas/index.js';
let content = fs.readFileSync(path, 'utf8');

const oldLogic = `                const client = getClient();
                const { error } = await client.from('tpl_propiedades').delete().eq('id', id);
                if (error) throw error;
                
                alert('Parcela eliminada correctamente.');
                window.location.reload();
            } catch (err) {
                console.error('Error al eliminar parcela', err);
                alert('Ocurrió un error al intentar eliminar la parcela: ' + err.message);`;

const newLogic = `                const client = getClient();
                const { error } = await client.from('tpl_propiedades').delete().eq('id', id);
                
                if (error && error.code === '23503') { // Foreign Key Violation
                    const softDelete = confirm('No se puede borrar definitivamente porque tiene tasaciones, solicitudes o informes asociados.\\n\\n¿Deseas ARCHIVARLA / OCULTARLA (estado: "eliminada") en su lugar?');
                    if (softDelete) {
                        const { error: updateError } = await client.from('tpl_propiedades').update({ estado: 'eliminada' }).eq('id', id);
                        if (updateError) throw updateError;
                        alert('Parcela archivada exitosamente.');
                        window.location.reload();
                        return;
                    } else {
                        throw new Error('Eliminación cancelada por el usuario.');
                    }
                } else if (error) {
                    throw error;
                }
                
                alert('Parcela eliminada correctamente.');
                window.location.reload();
            } catch (err) {
                console.error('Error al eliminar parcela', err);
                alert('Error al procesar: ' + err.message);`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync(path, content, 'utf8');
console.log('Delete logic patched to handle foreign key constraints');
