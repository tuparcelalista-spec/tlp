import { signIn } from '../core/supabase.js';
import { escapeHtml } from '../core/utils.js';

export function renderLogin() {
  return `
    <div class="login-wrapper">
      <div class="login-card">
        <div class="login-card__header">
          <img src="/assets/logo.png" alt="TPL Logo" class="login-card__logo" />
          <h2 class="login-card__title">Iniciar Sesión</h2>
          <p class="login-card__subtitle">Ingresa tus credenciales para continuar</p>
        </div>
        <form id="loginForm" class="login-card__form">
          <div class="form-group">
            <label for="email" class="form-label">Correo electrónico</label>
            <input type="email" id="email" name="email" class="form-input" required placeholder="ejemplo@tuparcelalista.cl">
          </div>
          <div class="form-group">
            <label for="password" class="form-label">Contraseña</label>
            <input type="password" id="password" name="password" class="form-input" required placeholder="********">
          </div>
          <div id="loginError" class="login-card__error"></div>
          <button type="submit" class="btn btn--primary btn--full">Ingresar</button>
        </form>
      </div>
    </div>
  `;
}

export function initLogin(onSuccess) {
  const form = document.getElementById('loginForm');
  const errorDiv = document.getElementById('loginError');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorDiv.textContent = '';
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
      const { data, error } = await signIn(email, password);
      if (error) {
        errorDiv.textContent = error.message || 'Error al iniciar sesión. Verifica tus credenciales.';
      } else {
        if (onSuccess) onSuccess(data);
      }
    } catch (err) {
      errorDiv.textContent = 'Error de conexión. Inténtalo más tarde.';
    }
  });
}
