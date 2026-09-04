const fs = require('fs');
const path = 'd:/BIOTV MARKETING/NUEVO BIOTV/PÁGINAS WEB/TPL PAGINA MALA/TPL PRUEBA NUEVA/frontend-v2/plataforma/crm-tpl-v1/modules/parcelas/index.js';
let content = fs.readFileSync(path, 'utf8');

const oldLogic = `                if (error && error.code === '23503') { // Foreign Key Violation
                    const softDelete = confirm('No se puede borrar definitivamente porque tiene historial (cotizaciones o tasaciones) asociadas en la base de datos.\\n\\n¿Deseas MOVERLA A LA PAPELERA (estado: "eliminada") en su lugar para ocultarla?');
                    if (softDelete) {
                        const { error: updateError } = await client.from('tpl_propiedades').update({ estado: 'eliminada' }).eq('id', id);
                        if (updateError) throw updateError;
                        alert('Parcela archivada en papelera exitosamente.');
                        window.location.reload();
                        return;
                    } else {
                        throw new Error('Borrado cancelado.');
                    }
                } else if (error) {`;

const newLogic = `                if (error && error.code === '23503') { // Foreign Key Violation
                    const hardDelete = confirm('Esta parcela tiene un historial de tasaciones, fotos o cotizaciones asociadas.\\n\\nComo me indicaste que son parcelas de prueba/falsas: ¿Deseas FORZAR EL BORRADO DEFINITIVO DE RAÍZ destruyendo todo su historial?');
                    if (hardDelete) {
                        console.log("Iniciando protocolo de destrucción en cascada...");
                        
                        // 1. Destruir historial conocido (ignora errores si la tabla no existe)
                        await client.from('tpl_tasaciones').delete().eq('propiedad_id', id).catch(()=>{});
                        await client.from('tpl_ordenes_informe').delete().eq('propiedad_id', id).catch(()=>{});
                        await client.from('tpl_cola_tasador').delete().eq('propiedad_id', id).catch(()=>{});
                        await client.from('tpl_suscripciones').delete().eq('propiedad_id', id).catch(()=>{});
                        await client.from('tpl_comunicaciones').delete().eq('propiedad_id', id).catch(()=>{});
                        await client.from('crm_cotizaciones').delete().eq('propiedad_id', id).catch(()=>{});
                        
                        // En caso de que se llame parcela_id en otras tablas:
                        await client.from('tpl_tasaciones').delete().eq('parcela_id', id).catch(()=>{});
                        
                        // 2. Re-intentar borrar la parcela matriz
                        const { error: finalError } = await client.from('tpl_propiedades').delete().eq('id', id);
                        if (finalError) throw new Error('Todavía hay dependencias bloqueando el borrado: ' + finalError.message);
                        
                        alert('Parcela y todo su historial de prueba fueron eliminados DEFINITIVAMENTE.');
                        window.location.reload();
                        return;
                    } else {
                        throw new Error('Borrado forzado cancelado.');
                    }
                } else if (error) {`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync(path, content, 'utf8');
console.log('Delete logic upgraded to support forced cascading deletes');
