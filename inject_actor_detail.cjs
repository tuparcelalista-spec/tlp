const fs = require('fs');
let js = fs.readFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/actores/detail.js', 'utf8');

const regex = /const opps = arr\('oportunidades'\)\.filter\(op => op\.actor_cliente_id === id\);/;
const replacement = `const opps = arr('oportunidades').filter(op => op.actor_cliente_id === id);
    const parcelas = (window.state?.data?.parcelas || window.state?.snapshot?.parcelas || []).filter(p => p.propietario_id === id);`;

js = js.replace(regex, replacement);

const oppsSectionRegex = /Oportunidades Asociadas \(\$\{opps\.length\}\)[\s\S]*?<\/div>\s*<\/div>\s*`/

const newHTML = `Oportunidades Asociadas (\${opps.length})
                </h3>
                
                \${opps.length > 0 ? \`
                    <div class="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden mb-8">
                        <ul class="divide-y divide-gray-200">
                            \${opps.map(op => \`
                                <li class="p-3 hover:bg-white transition flex justify-between items-center">
                                    <div>
                                        <div class="flex items-center gap-2 mb-1">
                                            <span class="font-mono text-xs font-semibold text-gray-500">\${escapeHtml(op.codigo)}</span>
                                            <span class="font-medium text-gray-900">\${escapeHtml(op.nombre || op.etapa || 'Lead')}</span>
                                        </div>
                                    </div>
                                </li>
                            \`).join('')}
                        </ul>
                    </div>
                \` : \`
                    <div class="text-center p-6 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-gray-500 mb-8">
                        Este actor no tiene oportunidades de negocio asociadas actualmente.
                    </div>
                \`}

                <h3 class="font-bold text-lg mb-4 text-gray-800 border-b border-gray-200 pb-2 flex items-center gap-2">
                    <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                    Inventario de Propiedades (\${parcelas.length})
                </h3>

                \${parcelas.length > 0 ? \`
                    <div class="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                        <ul class="divide-y divide-gray-200">
                            \${parcelas.map(p => \`
                                <li class="p-3 hover:bg-white transition flex justify-between items-center">
                                    <div class="flex items-center gap-3">
                                        <div class="w-12 h-12 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                                            <img src="\${p.foto_principal || p.imagen || ''}" onerror="this.src='../../assets/placeholder.png'" class="w-full h-full object-cover">
                                        </div>
                                        <div>
                                            <div class="flex items-center gap-2 mb-1">
                                                <span class="font-mono text-xs font-semibold text-gray-500">\${escapeHtml(p.codigo)}</span>
                                                <span class="font-medium text-gray-900">\${escapeHtml(p.titulo || 'Parcela')}</span>
                                            </div>
                                            <div class="text-xs text-gray-500">
                                                \${escapeHtml(p.comuna || 'Comuna N/D')} • \${new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(p.precio_publicado || 0)}
                                            </div>
                                        </div>
                                    </div>
                                    <a href="../../parcela.html?id=\${p.id}" target="_blank" class="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold hover:bg-blue-200 transition">Ver Web</a>
                                </li>
                            \`).join('')}
                        </ul>
                    </div>
                \` : \`
                    <div class="text-center p-6 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-gray-500">
                        Este corredor no ha publicado parcelas en el sistema.
                    </div>
                \`}

            </div>
        </div>
        \``;

js = js.replace(oppsSectionRegex, newHTML);

fs.writeFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/actores/detail.js', js);
console.log('detail.js injected with parcelas');
