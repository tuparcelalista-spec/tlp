const fs = require('fs');
let js = fs.readFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/index.js', 'utf8');

// 1. Add Tabs state
js = js.replace('let isLoading = true;', 'let isLoading = true;\nlet currentTab = "todas"; // todas, parcelas, casas, urbano');

// 2. Add Tabs UI in render()
const tabsHTML = `
            <div class="tabs-container" style="display:flex; gap:10px; margin-bottom: 20px;">
                <button class="tab-btn \${currentTab==='todas'?'active':''}" onclick="window.setCatastroTab('todas')" style="padding:8px 16px; border:1px solid #cbd5e1; border-radius:6px; background:\${currentTab==='todas'?'#005aa0':'#fff'}; color:\${currentTab==='todas'?'#fff':'#475569'}; cursor:pointer;">🏠 Todas</button>
                <button class="tab-btn \${currentTab==='parcelas'?'active':''}" onclick="window.setCatastroTab('parcelas')" style="padding:8px 16px; border:1px solid #cbd5e1; border-radius:6px; background:\${currentTab==='parcelas'?'#005aa0':'#fff'}; color:\${currentTab==='parcelas'?'#fff':'#475569'}; cursor:pointer;">🌲 Solo Parcelas</button>
                <button class="tab-btn \${currentTab==='casas'?'active':''}" onclick="window.setCatastroTab('casas')" style="padding:8px 16px; border:1px solid #cbd5e1; border-radius:6px; background:\${currentTab==='casas'?'#005aa0':'#fff'}; color:\${currentTab==='casas'?'#fff':'#475569'}; cursor:pointer;">🏡 Parcelas + Casas</button>
                <button class="tab-btn \${currentTab==='urbano'?'active':''}" onclick="window.setCatastroTab('urbano')" style="padding:8px 16px; border:1px solid #cbd5e1; border-radius:6px; background:\${currentTab==='urbano'?'#005aa0':'#fff'}; color:\${currentTab==='urbano'?'#fff':'#475569'}; cursor:pointer;">🏙️ Urbano</button>
            </div>
`;
js = js.replace(/<div class="header-actions">/g, tabsHTML + '\n            <div class="header-actions">');

// 3. Update table headers based on tab
const headersLogic = `
                                <th>Título</th>
                                <th>Tipo</th>
                                <th>Comuna</th>
                                \${currentTab === 'casas' || currentTab === 'urbano' ? '<th>M² Casa</th><th>Hab/Baños</th>' : ''}
                                \${currentTab !== 'urbano' ? '<th>M² Terreno</th>' : ''}
                                <th>Precio CLP</th>
                                \${currentTab === 'parcelas' || currentTab === 'todas' ? '<th>Atributos</th>' : '<th>Detalles</th>'}
                                <th>Acciones</th>
`;
js = js.replace(/<th>Título<\/th>[\s\S]*?<th>Acciones<\/th>/, headersLogic);

// 4. Update renderRow to use the logic
const renderRowReplacement = `
function renderRow(item) {
    const d = new Date(item.created_at);
    const dateStr = d.toLocaleDateString('es-CL');
    const money = (v) => v ? '$' + v.toLocaleString('es-CL') : '-';
    
    // Fallback variables
    const tipo = item.tipo_propiedad || 'Parcela';
    const m2Construidos = item.superficie_construida ? item.superficie_construida.toLocaleString('es-CL') + ' m²' : '-';
    const habBanos = (item.dormitorios || '-') + 'D / ' + (item.banos || '-') + 'B';
    const m2Terreno = item.superficie_m2 ? item.superficie_m2.toLocaleString('es-CL') + ' m²' : '-';
    const detallesConst = [item.material, item.estado].filter(Boolean).join(', ') || '-';
    
    return \`
        <tr>
            <td>
                <div style="font-weight:600; color:#0f172a; max-width:250px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="\${item.titulo}">\${item.titulo || 'Sin título'}</div>
                <div style="font-size:0.8rem; color:#64748b;">\${dateStr} &middot; \${item.fuente || 'web'}</div>
            </td>
            <td><span style="background:#f1f5f9; padding:2px 8px; border-radius:12px; font-size:0.8rem; font-weight:600;">\${tipo}</span></td>
            <td>\${item.comuna || item.localidad || '-'}</td>
            \${currentTab === 'casas' || currentTab === 'urbano' ? \`<td>\${m2Construidos}</td><td>\${habBanos}</td>\` : ''}
            \${currentTab !== 'urbano' ? \`<td>\${m2Terreno}</td>\` : ''}
            <td style="font-weight:700; color:#005aa0;">\${money(item.precio_clp)}</td>
            \${currentTab === 'parcelas' || currentTab === 'todas' ? \`<td style="max-width:200px; font-size:0.85rem;">\${item.atributos || '-'}</td>\` : \`<td style="max-width:200px; font-size:0.85rem;">\${detallesConst}</td>\`}
            <td>
                <a href="\${item.url}" target="_blank" style="color:#3b82f6; font-size:0.9rem; text-decoration:none;">🔗 Ver URL</a>
            </td>
        </tr>
    \`;
}
`;
js = js.replace(/function renderRow\(item\) \{[\s\S]*?return `[\s\S]*?`;\n}/, renderRowReplacement);

// 5. Add filtering logic in getFilteredData
const filterLogic = `
    let data = catastroData || [];
    
    // Tab filter
    if (currentTab === 'parcelas') {
        data = data.filter(d => (d.tipo_propiedad || 'Parcela') === 'Parcela');
    } else if (currentTab === 'casas') {
        data = data.filter(d => (d.tipo_propiedad) === 'Parcela + Casa');
    } else if (currentTab === 'urbano') {
        data = data.filter(d => (d.tipo_propiedad) === 'Casa Urbana' || (d.tipo_propiedad) === 'Departamento' || (d.tipo_propiedad) === 'Terreno Urbano');
    }
`;
js = js.replace('let data = catastroData || [];', filterLogic);

// 6. Add window global function to switch tab
const globalFunc = `
window.setCatastroTab = function(tab) {
    currentTab = tab;
    const mainView = document.getElementById('content');
    if (mainView) {
        mainView.innerHTML = render();
        // rebind events if needed, but the basic html is rendered
    }
};
`;
js += '\n' + globalFunc;

fs.writeFileSync('frontend-v2/plataforma/crm-tpl-v1/modules/catastro/index.js', js);
console.log('Catastro UI updated');
