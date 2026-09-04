// boot.js
import { getClient, getSession, signIn, signOut, cargarReferenciasComunales } from './supabase.js';
import { verifyStaffAccess, setCurrentStaff } from './auth.js';
import state from './state.js';
import { initRouter, groups } from './router.js';
import { initRealtime } from './realtime.js';
import { initSearch } from '../components/search.js';

function updateStatus(message) {
    const el = document.getElementById('bootStatus');
    if (el) el.textContent = message;
}

function showError(msg, detail = '') {
    const errorEl = document.getElementById('bootError');
    const msgEl = document.getElementById('bootErrorMsg');
    const detailEl = document.getElementById('bootErrorDetail');
    
    if (msgEl) msgEl.textContent = msg;
    if (detailEl) detailEl.textContent = detail;
    if (errorEl) errorEl.classList.remove('hidden');
    
    document.getElementById('bootStatus')?.classList.add('hidden');
}

async function loadSupabaseSDK() {
    return new Promise((resolve, reject) => {
        if (window.supabase) return resolve();
        
        updateStatus('Cargando dependencias...');
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/@supabase/supabase-js@2';
        script.onload = resolve;
        script.onerror = () => reject(new Error('Fallo al cargar el SDK de Supabase'));
        document.head.appendChild(script);
    });
}

function renderLoginForm() {
    const content = document.getElementById('content');
    if (!content) return;
    
    // Se usan los componentes propios (.login-wrap, .login-card, .form-*, .btn),
    // que ya existian en components.css y nadie estaba usando.
    content.innerHTML = `
        <div class="login-wrap">
            <div class="login-card">
                <div class="login-card__head">
                    <h2>CRM TPL</h2>
                    <p>Centro de operaciones · acceso exclusivo del equipo</p>
                </div>
                <form id="loginForm" novalidate>
                    <div class="form-group">
                        <label class="form-label" for="loginEmail">Correo electrónico</label>
                        <input type="email" id="loginEmail" class="form-input" required autocomplete="username" autofocus>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="loginPassword">Contraseña</label>
                        <input type="password" id="loginPassword" class="form-input" required autocomplete="current-password">
                    </div>
                    <button type="submit" class="btn btn--primary btn--full btn--lg">Iniciar sesión</button>
                    <div id="loginError" class="alert alert--danger hidden" role="alert"></div>
                </form>
            </div>
        </div>
    `;
    
    const form = document.getElementById('loginForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const pass = document.getElementById('loginPassword').value;
        const btn = form.querySelector('button');
        const errorEl = document.getElementById('loginError');
        
        try {
            btn.disabled = true;
            btn.textContent = 'Verificando...';
            btn.classList.add('opacity-75', 'cursor-not-allowed');
            errorEl.classList.add('hidden');
            
            await signIn(email, pass);
            window.location.reload();
        } catch (err) {
            errorEl.textContent = 'Credenciales inválidas o error de conexión.';
            errorEl.classList.remove('hidden');
            btn.disabled = false;
            btn.textContent = 'Iniciar Sesión';
            btn.classList.remove('opacity-75', 'cursor-not-allowed');
        }
    });
}

function renderSidebar() {
    const nav = document.getElementById('sidebarNav');
    if (!nav) return;
    
    let html = '';
    groups.forEach(group => {
        html += `<div class="mb-6">
            <h3 class="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">${group[0]}</h3>
            <ul class="space-y-1">`;
        group[1].forEach(item => {
            html += `<li>
                <a href="#${item[0]}" data-view="${item[0]}" class="sidebar-nav-link flex items-center px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg mx-2 transition-colors">
                    ${item[1]}
                </a>
            </li>`;
        });
        html += `</ul></div>`;
    });
    nav.innerHTML = html;
}

function wireEvents() {
    const handleSignOut = async () => {
        try {
            await signOut();
            window.location.reload();
        } catch (err) {
            console.error('Error al cerrar sesión', err);
        }
    };

    document.getElementById('btnSignOut')?.addEventListener('click', handleSignOut);
    document.getElementById('bootLogout')?.addEventListener('click', handleSignOut);

    document.getElementById('bootRetry')?.addEventListener('click', () => {
        window.location.reload();
    });

    const menuBtn = document.getElementById('menuBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (menuBtn && sidebar && overlay) {
        const toggleMenu = () => {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('open');
        };
        menuBtn.addEventListener('click', toggleMenu);
        overlay.addEventListener('click', toggleMenu);
        
        document.getElementById('sidebarNav')?.addEventListener('click', (e) => {
            if (e.target.closest('a') && window.innerWidth < 1024) {
                toggleMenu();
            }
        });
    }
    
    const todayEl = document.getElementById('todayDate');
    if (todayEl) {
        const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        let dateStr = new Date().toLocaleDateString('es-CL', dateOptions);
        dateStr = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
        todayEl.textContent = dateStr;
    }
}

async function boot() {
    try {
        await loadSupabaseSDK();
        
        updateStatus('Verificando sesión...');
        const session = await getSession();
        
        const bootScreen = document.getElementById('bootScreen');
        const app = document.getElementById('app');
        
        if (!session) {
            if (bootScreen) {
                bootScreen.classList.add('hidden');
                bootScreen.style.display = 'none';
            }
            if (app) {
                app.classList.remove('hidden');
                app.hidden = false;
                app.removeAttribute('hidden');
            }
            document.body.classList.add('is-login');
            renderLoginForm();
            return;
        }

        document.body.classList.remove('is-login');
        updateStatus('Validando permisos de Staff...');
        const isStaff = await verifyStaffAccess();
        if (!isStaff) {
            showError('Acceso denegado', 'Esta cuenta no tiene privilegios de Staff. Su cuenta no está autorizada para ingresar a esta plataforma.');
            return;
        }

        updateStatus('Cargando datos del CRM (esto puede tomar unos segundos)...');
        const client = getClient();
        
        const [snapshotRes, commandRes] = await Promise.all([
            client.rpc('tpl_crm_snapshot_v1'),
            client.rpc('tpl_crm_command_center_v1'),
            // El editor de parcelas recalcula la tasacion al guardar. Sin las
            // referencias comunales cargadas guardaria un valor solo tecnico y
            // pisaria la cifra correcta de la ficha.
            cargarReferenciasComunales(window.TPLLandEngine)
        ]);
        
        if (snapshotRes.error) throw snapshotRes.error;
        if (commandRes.error) throw commandRes.error;
        
        state.snapshot = snapshotRes.data || {};
        state.command = commandRes.data || {};
        
        if (state.command.staff) {
            setCurrentStaff(state.command.staff);
            const staffInfoEl = document.getElementById('staffInfo');
            if (staffInfoEl) {
                const nombre = state.command.staff.nombre || state.command.staff.email || 'Staff TPL';
                const rol = state.command.staff.rol || 'Administrador';
                // Sin clases de utilidad: el pie de la barra lateral va sobre fondo
                // navy, y text-gray-900 dejaba el nombre casi invisible.
                staffInfoEl.innerHTML = `<div class="sidebar__staff-name">${nombre}</div><div class="sidebar__staff-role">${rol}</div>`;
            }
        }
        
        if (bootScreen) {
            bootScreen.classList.add('hidden');
            bootScreen.style.display = 'none';
        }
        if (app) {
            app.classList.remove('hidden');
            app.hidden = false;
            app.removeAttribute('hidden');
        }
        
        renderSidebar();
        wireEvents();
        // El buscador del topbar existia como componente pero nadie lo
        // inicializaba: escribir en el no hacia nada.
        initSearch();
        initRouter();
        if (isStaff) {
            initRealtime().catch(e => console.error('Realtime error:', e));
        }
        
    } catch (err) {
        console.error('Error de inicialización CRM:', err);
        showError('No se pudo inicializar la plataforma', err.message);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
} else {
    boot();
}
