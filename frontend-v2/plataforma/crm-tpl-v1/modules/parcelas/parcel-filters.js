/**
 * Modulo de Filtros y Completitud para Parcelas
 */

function propertyHasValuation(record) {
    // Assuming this utility exists or inline the logic
    // We check if the record has tasaciones
    return record?.tasaciones?.length > 0 || record?.valor_tpl_recomendado;
}

export function calculateCompletionScore(record) {
    // Logic from crm-v2.js parcelCompletion
    const p = record; // Assuming record is already hydrated or we just check properties directly
    
    const checks = [
      Boolean(record?.imagen_principal || (Array.isArray(record?.imagenes) && record.imagenes.length)),
      Boolean(p.titulo || record?.titulo),
      Boolean(p.descripcion || record?.descripcion),
      Number(p.superficie_m2 || 0) > 0,
      Number(p.precio_publicado || 0) > 0,
      Boolean(p.region),
      Boolean(p.comuna),
      Boolean(p.rol_situacion || p.rol),
      Boolean(p.agua || p.agua_tipo),
      Boolean(p.electricidad || p.electricidad_tipo),
      Boolean(p.acceso),
      Boolean(p.topografia),
      Boolean(p.suelo),
      Boolean(p.exposicion),
      Boolean(p.vista_principal),
      Boolean(p.vegetacion),
      Boolean(p.cierre_perimetral),
      Boolean(p.porton),
      p.condominio !== undefined && p.condominio !== null,
      Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng)),
      propertyHasValuation(record)
    ];
    
    const completed = checks.filter(Boolean).length;
    return {
      score: Math.round((completed / checks.length) * 100),
      missing: checks.length - completed
    };
}

export function renderQuickFilters(containerId, onFilterChange) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = `
        <div class="parcel-quick-filters" style="display:flex; gap:8px; flex-wrap:wrap; margin-top:16px;">
            <button type="button" class="badge" data-parcel-quick="published">Publicadas</button>
            <button type="button" class="badge" data-parcel-quick="without-valuation">Sin tasación</button>
            <button type="button" class="badge" data-parcel-quick="pending">Datos pendientes</button>
            <button type="button" class="badge" data-parcel-quick="eliminada" style="background-color: #fee2e2; color: #991b1b; border-color: #f87171;">🗑️ Papelera</button>
            <button type="button" class="badge" data-parcel-clear style="background-color: transparent;">Limpiar filtros</button>
        </div>
    `;
    
    container.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-parcel-quick]');
        const clearBtn = e.target.closest('button[data-parcel-clear]');
        
        if (btn) {
            const filterType = btn.dataset.parcelQuick;
            if (typeof onFilterChange === 'function') {
                onFilterChange(filterType);
            }
        }
        
        if (clearBtn) {
            if (typeof onFilterChange === 'function') {
                onFilterChange(null);
            }
        }
    });
}
