import {
  signIn, pedirRecuperacion, esRetornoDeRecuperacion,
  abrirSesionDeRecuperacion, cambiarPassword, fuerzaPassword,
} from '../../core/auth.js';

const REGLAS = [
  ['largo',   '8 caracteres como mínimo', (v) => v.length >= 8],
  ['minus',   'Una letra minúscula',      (v) => /[a-z]/.test(v)],
  ['mayus',   'Una letra mayúscula',      (v) => /[A-Z]/.test(v)],
  ['numero',  'Un número',                (v) => /\d/.test(v)],
  ['simbolo', 'Un símbolo',               (v) => /[^A-Za-z0-9]/.test(v)],
];

const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

let paso = 'login'; // login | recuperar | enviado | nueva | lista

function caja(titulo, sub, cuerpo) {
  return `<div class="acceso"><div class="acceso__caja">
    <h1>${esc(titulo)}</h1>
    <p class="acceso__sub">${esc(sub)}</p>
    <p class="acceso__aviso" id="acceso-aviso" hidden></p>
    ${cuerpo}
  </div></div>`;
}

export function render() {
  if (esRetornoDeRecuperacion()) paso = 'nueva';

  const correo = new URLSearchParams((location.hash.split('?')[1] || '')).get('correo') || '';

  if (paso === 'recuperar') {
    return caja('Recuperar tu acceso', 'Te enviamos un enlace para crear una contraseña nueva.', `
      <form id="form-recuperar">
        <label for="rec-email">Correo de tu cuenta</label>
        <input type="email" id="rec-email" autocomplete="email" required value="${esc(correo)}">
        <button type="submit" id="rec-submit">Enviar el enlace</button>
      </form>
      <button type="button" class="acceso__link" id="volver-login">Volver a entrar</button>`);
  }

  if (paso === 'enviado') {
    return caja('Revisa tu correo', 'Si ese correo tiene cuenta en TPL, el enlace ya va en camino. Mira también la carpeta de spam.', `
      <button type="button" class="acceso__btn-sec" id="volver-login">Volver a entrar</button>`);
  }

  if (paso === 'nueva') {
    return caja('Crea tu contraseña nueva', 'Elige una que no hayas usado antes.', `
      <form id="form-nueva">
        <label for="np-1">Contraseña nueva</label>
        <input type="password" id="np-1" autocomplete="new-password" required minlength="8">
        <div class="fuerza"><div class="fuerza__barra"><span id="fuerza-barra"></span></div><small id="fuerza-txt">Escribe una contraseña</small></div>
        <ul class="reglas" id="reglas">
          ${REGLAS.map(([k, t]) => `<li data-regla="${k}">${esc(t)}</li>`).join('')}
        </ul>
        <label for="np-2">Repite la contraseña</label>
        <input type="password" id="np-2" autocomplete="new-password" required minlength="8">
        <button type="submit" id="np-submit">Guardar contraseña</button>
      </form>`);
  }

  if (paso === 'lista') {
    return caja('Contraseña actualizada', 'Por seguridad, entra otra vez con tu contraseña nueva.', `
      <button type="button" class="acceso__btn-sec" id="volver-login">Ir a entrar</button>`);
  }

  return caja('Entra a TPL Business', 'Tu informe, tu plan de venta y tus campañas, en un solo lugar.', `
    <form id="form-acceso">
      <label for="ac-email">Correo electrónico</label>
      <input type="email" id="ac-email" autocomplete="email" required value="${esc(correo)}">
      <label for="ac-pass">Contraseña</label>
      <input type="password" id="ac-pass" autocomplete="current-password" required>
      <button type="submit" id="ac-submit">Entrar</button>
    </form>
    <button type="button" class="acceso__link" id="ir-recuperar">¿Olvidaste tu contraseña?</button>
    <p class="acceso__pie">¿Todavía no tienes cuenta? Se crea desde el enlace del informe de valor que te enviamos.</p>`);
}

export async function init() {
  const aviso = document.getElementById('acceso-aviso');
  const decir = (texto, ok = false) => {
    aviso.textContent = texto;
    aviso.classList.toggle('acceso__aviso--ok', ok);
    aviso.hidden = false;
  };
  const repintar = () => {
    document.getElementById('app-content').innerHTML = render();
    init();
  };

  document.getElementById('ir-recuperar')?.addEventListener('click', () => { paso = 'recuperar'; repintar(); });
  document.getElementById('volver-login')?.addEventListener('click', () => {
    paso = 'login';
    // El enlace de recuperación deja basura en la dirección; se limpia para que
    // recargar no vuelva a abrir el paso de contraseña nueva.
    history.replaceState({}, document.title, location.pathname + '#acceso');
    repintar();
  });

  // --- Entrar ---------------------------------------------------------------
  document.getElementById('form-acceso')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    aviso.hidden = true;
    const boton = document.getElementById('ac-submit');
    const correo = document.getElementById('ac-email').value.trim().toLowerCase();
    const clave = document.getElementById('ac-pass').value;
    if (!correo || !clave) return decir('Escribe tu correo y tu contraseña.');

    boton.disabled = true; boton.textContent = 'Entrando…';
    try {
      await signIn(correo, clave);
      location.hash = '#informe';
      location.reload();
    } catch (error) {
      decir(/invalid login|invalid credentials/i.test(error?.message || '')
        ? 'Ese correo y esa contraseña no coinciden. Revísalos e inténtalo otra vez.'
        : 'No pudimos entrar ahora. Inténtalo en unos minutos.');
      boton.disabled = false; boton.textContent = 'Entrar';
    }
  });

  // --- Pedir recuperación ---------------------------------------------------
  document.getElementById('form-recuperar')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    aviso.hidden = true;
    const boton = document.getElementById('rec-submit');
    boton.disabled = true; boton.textContent = 'Enviando…';
    try {
      await pedirRecuperacion(document.getElementById('rec-email').value);
      paso = 'enviado';
      repintar();
    } catch (error) {
      decir(error?.message || 'No pudimos enviar el enlace ahora. Inténtalo en unos minutos.');
      boton.disabled = false; boton.textContent = 'Enviar el enlace';
    }
  });

  // --- Contraseña nueva -----------------------------------------------------
  const formNueva = document.getElementById('form-nueva');
  if (formNueva) {
    try {
      await abrirSesionDeRecuperacion();
    } catch (error) {
      decir(error?.message || 'El enlace venció o ya fue usado. Pide uno nuevo.');
      formNueva.hidden = true;
      return;
    }

    const campo = document.getElementById('np-1');
    const barra = document.getElementById('fuerza-barra');
    const txt = document.getElementById('fuerza-txt');
    const etiquetas = ['Muy débil', 'Débil', 'Aceptable', 'Buena', 'Fuerte', 'Excelente'];

    campo.addEventListener('input', () => {
      const v = campo.value;
      const n = fuerzaPassword(v);
      barra.style.width = `${(n / 5) * 100}%`;
      barra.dataset.nivel = String(n);
      txt.textContent = v ? etiquetas[n] : 'Escribe una contraseña';
      REGLAS.forEach(([k, , test]) => {
        document.querySelector(`[data-regla="${k}"]`)?.classList.toggle('is-ok', test(v));
      });
    });

    formNueva.addEventListener('submit', async (e) => {
      e.preventDefault();
      aviso.hidden = true;
      const clave = campo.value;
      const clave2 = document.getElementById('np-2').value;
      if (fuerzaPassword(clave) < 3) return decir('Esa contraseña es fácil de adivinar. Cumple al menos tres de las reglas.');
      if (clave !== clave2) return decir('Las dos contraseñas no son iguales.');

      const boton = document.getElementById('np-submit');
      boton.disabled = true; boton.textContent = 'Guardando…';
      try {
        await cambiarPassword(clave);
        paso = 'lista';
        history.replaceState({}, document.title, location.pathname + '#acceso');
        repintar();
      } catch (error) {
        decir(error?.message || 'No pudimos guardar la contraseña. Pide un enlace nuevo.');
        boton.disabled = false; boton.textContent = 'Guardar contraseña';
      }
    });
  }
}
