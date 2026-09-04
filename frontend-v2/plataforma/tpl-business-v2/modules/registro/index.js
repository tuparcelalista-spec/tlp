import { getClient } from '../../core/supabase.js';

const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** El correo llega en el enlace del correo de aprobación. */
function correoDelEnlace() {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  return String(params.get('correo') || '').trim().toLowerCase();
}

export function render() {
  const correo = correoDelEnlace();

  return `
    <div class="acceso">
      <div class="acceso__caja acceso__caja--ancha">
        <span class="registro__kicker">Tu propiedad ya está publicada</span>
        <h1>Crea tu acceso a TPL Business</h1>
        <p class="acceso__sub">Desde aquí sigues la venta: tu informe de valor, tu página de venta y tus campañas.</p>

        <p class="acceso__aviso" id="reg-aviso" hidden></p>

        <form id="form-registro-business" novalidate>
          <label for="rb-email">Tu correo</label>
          <input type="email" id="rb-email" autocomplete="email" required value="${esc(correo)}"${correo ? ' readonly' : ''}>
          ${correo
            ? '<small class="registro__ayuda">Es el correo con el que publicaste. Si prefieres otro, escríbenos y lo cambiamos.</small>'
            : '<small class="registro__ayuda">Usa el mismo correo con el que publicaste tu propiedad.</small>'}

          <label for="rb-pass">Crea una contraseña</label>
          <input type="password" id="rb-pass" autocomplete="new-password" required minlength="8" placeholder="mínimo 8 caracteres">

          <label for="rb-pass2">Repite la contraseña</label>
          <input type="password" id="rb-pass2" autocomplete="new-password" required minlength="8" placeholder="escríbela otra vez">

          <button type="submit" id="rb-submit">Crear mi cuenta y entrar</button>
        </form>

        <p class="acceso__pie">¿Ya tienes cuenta? <button type="button" class="acceso__link" id="rb-ir-acceso">Entra por aquí</button></p>
      </div>
    </div>`;
}

export function init() {
  const form = document.getElementById('form-registro-business');
  const aviso = document.getElementById('reg-aviso');
  const boton = document.getElementById('rb-submit');

  const decir = (texto, ok = false) => {
    aviso.textContent = texto;
    aviso.classList.toggle('acceso__aviso--ok', ok);
    aviso.hidden = false;
  };

  document.getElementById('rb-ir-acceso')?.addEventListener('click', () => {
    const correo = document.getElementById('rb-email').value.trim();
    location.hash = correo ? `#acceso?correo=${encodeURIComponent(correo)}` : '#acceso';
  });

  form?.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    aviso.hidden = true;

    const correo = document.getElementById('rb-email').value.trim().toLowerCase();
    const clave = document.getElementById('rb-pass').value;
    const clave2 = document.getElementById('rb-pass2').value;

    if (!correo) return decir('Escribe tu correo.');
    if (clave.length < 8) return decir('La contraseña necesita al menos 8 caracteres.');
    if (clave !== clave2) return decir('Las dos contraseñas no son iguales. Vuelve a escribirlas.');

    boton.disabled = true;
    const textoOriginal = boton.textContent;
    boton.textContent = 'Creando tu cuenta…';

    try {
      const client = await getClient();
      const { error } = await client.auth.signUp({
        email: correo,
        password: clave,
        options: { data: { rol: 'propietario', origen: 'publicacion_aprobada' } },
      });

      if (error) {
        // Ya tener cuenta no es un error de la persona: lo que necesita es entrar.
        if (/already registered|already been registered|user already/i.test(error.message || '')) {
          decir('Ya tienes una cuenta con este correo. Te llevamos a la entrada.', true);
          setTimeout(() => { location.hash = `#acceso?correo=${encodeURIComponent(correo)}`; location.reload(); }, 1600);
          return;
        }
        throw error;
      }

      decir('Cuenta creada. Entrando a TPL Business…', true);
      setTimeout(() => { location.hash = '#informe'; location.reload(); }, 1200);
    } catch (error) {
      console.error('No se pudo crear la cuenta', error);
      decir('No pudimos crear la cuenta ahora. Inténtalo en unos minutos o escríbenos.');
      boton.disabled = false;
      boton.textContent = textoOriginal;
    }
  });
}
