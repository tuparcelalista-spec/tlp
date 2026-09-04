import { store } from '../../core/store.js';

export function render() {
    return `
        <div class="partner-ejecucion-module">
            <header class="module-header">
                <div class="header-content">
                    <h2>Ejecución de Proyectos</h2>
                    <p>Gestiona tus proyectos activos, actualiza su estado y registra los hitos alcanzados.</p>
                </div>
                <div class="header-actions">
                    <button class="btn btn-outline" id="btn-refresh">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path><path d="M3 22v-6h6"></path><path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path></svg>
                        Actualizar
                    </button>
                </div>
            </header>
            
            <div class="kanban-board">
                <!-- Columna: Por Iniciar -->
                <div class="kanban-column">
                    <div class="column-header">
                        <h3 class="column-title">Por Iniciar</h3>
                        <span class="badge count-badge" id="count-por-iniciar">0</span>
                    </div>
                    <div class="kanban-list" id="col-por-iniciar" data-status="por_iniciar">
                        <!-- Cards injected here -->
                    </div>
                </div>

                <!-- Columna: En Progreso -->
                <div class="kanban-column">
                    <div class="column-header">
                        <h3 class="column-title">En Progreso</h3>
                        <span class="badge count-badge" id="count-en-progreso">0</span>
                    </div>
                    <div class="kanban-list" id="col-en-progreso" data-status="en_progreso">
                        <!-- Cards injected here -->
                    </div>
                </div>

                <!-- Columna: Completados -->
                <div class="kanban-column">
                    <div class="column-header">
                        <h3 class="column-title">Completados</h3>
                        <span class="badge count-badge" id="count-completados">0</span>
                    </div>
                    <div class="kanban-list" id="col-completados" data-status="completados">
                        <!-- Cards injected here -->
                    </div>
                </div>
            </div>
            
            <!-- Modal para registrar hito -->
            <div id="hito-modal" class="modal-overlay hidden">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Registrar Nuevo Hito</h3>
                        <button class="btn-close" id="btn-close-modal-icon">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="hito-form">
                            <input type="hidden" id="proyecto-id">
                            <div class="form-group">
                                <label for="hito-desc">Descripción del Hito</label>
                                <textarea id="hito-desc" required placeholder="Describe brevemente el hito alcanzado..." rows="3"></textarea>
                            </div>
                            <div class="form-group">
                                <label for="hito-evidencia">Enlace de Evidencia (Opcional)</label>
                                <input type="url" id="hito-evidencia" placeholder="https://ejemplo.com/fotos-reporte">
                                <small class="form-text">Adjunta un link a Google Drive, Dropbox, o un reporte PDF.</small>
                            </div>
                            <div class="form-group">
                                <label for="hito-progreso">Actualizar Progreso Global (%)</label>
                                <input type="number" id="hito-progreso" min="0" max="100" placeholder="Ej: 50">
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" id="btn-close-modal">Cancelar</button>
                        <button type="submit" form="hito-form" class="btn btn-primary">Guardar Hito</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export function init() {
    const proyectos = store.proyectos_activos || [];

    const renderProjects = () => {
        const statuses = [
            { id: 'por_iniciar', el: 'col-por-iniciar', countEl: 'count-por-iniciar' },
            { id: 'en_progreso', el: 'col-en-progreso', countEl: 'count-en-progreso' },
            { id: 'completados', el: 'col-completados', countEl: 'count-completados' }
        ];

        statuses.forEach(status => {
            const col = document.getElementById(status.el);
            const countBadge = document.getElementById(status.countEl);
            if (!col || !countBadge) return;
            
            const filtered = proyectos.filter(p => p.estado === status.id);
            countBadge.textContent = filtered.length;

            if (filtered.length === 0) {
                col.innerHTML = `<div class="kanban-empty">Sin proyectos</div>`;
                return;
            }

            col.innerHTML = filtered.map(p => `
                <div class="kanban-card" data-id="${escapeHTML(p.id.toString())}">
                    <div class="card-header">
                        <span class="project-id">#${escapeHTML(p.codigo || p.id)}</span>
                        <span class="project-date">${escapeHTML(p.fecha_inicio)}</span>
                    </div>
                    <h4 class="project-title">${escapeHTML(p.nombre)}</h4>
                    <p class="project-client">Cliente: ${escapeHTML(p.cliente)}</p>
                    
                    <div class="progress-section">
                        <div class="progress-header">
                            <span class="progress-label">Progreso</span>
                            <span class="progress-value">${p.progreso || 0}%</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${p.progreso || 0}%"></div>
                        </div>
                    </div>
                    
                    <div class="card-actions">
                        <button class="btn btn-sm btn-outline btn-hito" data-id="${escapeHTML(p.id.toString())}">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            Registrar Hito
                        </button>
                    </div>
                </div>
            `).join('');
        });
    };

    renderProjects();

    // Modal logic
    const modal = document.getElementById('hito-modal');
    const form = document.getElementById('hito-form');
    
    const closeModal = () => {
        modal.classList.add('hidden');
        form.reset();
    };

    document.querySelector('.kanban-board')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-hito');
        if (btn) {
            const pid = btn.getAttribute('data-id');
            document.getElementById('proyecto-id').value = pid;
            modal.classList.remove('hidden');
        }
    });

    document.getElementById('btn-close-modal')?.addEventListener('click', closeModal);
    document.getElementById('btn-close-modal-icon')?.addEventListener('click', closeModal);

    form?.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const btnSubmit = form.querySelector('button[type="submit"]');
        const originalText = btnSubmit.innerHTML;
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = 'Guardando...';

        // Simulating an API call
        setTimeout(() => {
            alert('Hito guardado exitosamente.');
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = originalText;
            closeModal();
            // Optionally refresh UI or store here
        }, 800);
    });

    document.getElementById('btn-refresh')?.addEventListener('click', () => {
        // Implement refresh logic here
        renderProjects();
    });
}

function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
