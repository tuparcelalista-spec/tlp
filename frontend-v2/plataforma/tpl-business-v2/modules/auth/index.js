import { signIn } from '../../core/auth.js';

export function render() {
    return `
        <div class="auth-container" style="display: flex; height: 100vh; align-items: center; justify-content: center; background-color: var(--color-background-alt, #f9fafb); font-family: var(--font-primary, system-ui, sans-serif);">
            <div class="auth-card" style="background: white; padding: 3rem; border-radius: var(--radius-lg, 12px); box-shadow: var(--shadow-lg, 0 10px 25px rgba(0,0,0,0.05)); width: 100%; max-width: 400px;">
                <div class="auth-header" style="text-align: center; margin-bottom: 2.5rem;">
                    <h1 style="margin: 0; font-size: 1.75rem; color: var(--color-text-main, #111827); font-weight: 700;">Welcome to TPL Business</h1>
                    <p style="margin: 0.5rem 0 0; color: var(--color-text-muted, #6b7280); font-size: 0.95rem;">Sign in to access your dashboard</p>
                </div>
                <form id="auth-login-form" style="display: flex; flex-direction: column; gap: 1.25rem;">
                    <div class="form-group" style="display: flex; flex-direction: column; gap: 0.5rem;">
                        <label for="email" style="font-size: 0.875rem; font-weight: 600; color: var(--color-text-main, #374151);">Email Address</label>
                        <input type="email" id="email" name="email" required placeholder="you@example.com" style="padding: 0.75rem; border: 1px solid var(--color-border, #d1d5db); border-radius: var(--radius-md, 8px); outline: none; transition: border-color 0.2s;" onfocus="this.style.borderColor='var(--color-primary, #2563eb)'" onblur="this.style.borderColor='var(--color-border, #d1d5db)'">
                    </div>
                    <div class="form-group" style="display: flex; flex-direction: column; gap: 0.5rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <label for="password" style="font-size: 0.875rem; font-weight: 600; color: var(--color-text-main, #374151);">Password</label>
                            <a href="#" style="font-size: 0.8rem; color: var(--color-primary, #2563eb); text-decoration: none;">Forgot password?</a>
                        </div>
                        <input type="password" id="password" name="password" required placeholder="••••••••" style="padding: 0.75rem; border: 1px solid var(--color-border, #d1d5db); border-radius: var(--radius-md, 8px); outline: none; transition: border-color 0.2s;" onfocus="this.style.borderColor='var(--color-primary, #2563eb)'" onblur="this.style.borderColor='var(--color-border, #d1d5db)'">
                    </div>
                    <button type="submit" style="margin-top: 0.5rem; padding: 0.875rem; background-color: var(--color-primary, #2563eb); color: white; border: none; border-radius: var(--radius-md, 8px); font-weight: 600; cursor: pointer; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='var(--color-primary-dark, #1d4ed8)'" onmouseout="this.style.backgroundColor='var(--color-primary, #2563eb)'">Sign In</button>
                </form>
            </div>
        </div>
    `;
}

export function init() {
    const form = document.getElementById('auth-login-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            try {
                if (window.auth && typeof window.auth.signIn === 'function') {
                    await window.auth.signIn(email, password);
                } else if (typeof signIn === 'function') {
                    await signIn(email, password);
                } else {
                    console.error('Auth signIn method not found');
                }
            } catch (error) {
                console.error('Login failed', error);
                alert('Login failed. Please check your credentials.');
            }
        });
    }
}
