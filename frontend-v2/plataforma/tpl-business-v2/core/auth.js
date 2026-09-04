import { getClient } from './supabase.js';

export async function signIn(email, password) {
  const supabase = await getClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const supabase = await getClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const supabase = await getClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session || null;
}

// ---------------------------------------------------------------------------
// RECUPERACIÓN DE CONTRASEÑA
// ---------------------------------------------------------------------------
// Portado desde la versión anterior de TPL Business, que era lo único que ahí
// estaba realmente terminado. Sin esto, quien olvidaba su clave se quedaba
// fuera sin ninguna salida.

function estadoDeUrl() {
  const url = new URL(window.location.href);
  const hash = new URLSearchParams(String(window.location.hash || '').replace(/^#/, ''));
  return {
    modo: url.searchParams.get('mode') || hash.get('mode') || '',
    tipo: url.searchParams.get('type') || hash.get('type') || '',
    code: url.searchParams.get('code') || '',
    tokenHash: url.searchParams.get('token_hash') || hash.get('token_hash') || '',
    accessToken: hash.get('access_token') || '',
    refreshToken: hash.get('refresh_token') || '',
    error: url.searchParams.get('error') || hash.get('error') || '',
    errorDescripcion: url.searchParams.get('error_description') || hash.get('error_description') || '',
  };
}

/** ¿La persona llegó aquí desde el correo de recuperación? */
export function esRetornoDeRecuperacion() {
  const e = estadoDeUrl();
  return e.modo === 'recovery' || e.tipo === 'recovery' || Boolean(e.code || e.tokenHash || e.accessToken);
}

/** Enlace al que vuelve el correo de recuperación. */
function urlDeRetorno() {
  const destino = new URL(window.location.pathname, window.location.origin);
  destino.searchParams.set('mode', 'recovery');
  return destino.toString();
}

export async function pedirRecuperacion(email) {
  const correo = String(email || '').trim().toLowerCase();
  if (!correo) throw new Error('Escribe el correo de tu cuenta.');
  const supabase = await getClient();
  const { error } = await supabase.auth.resetPasswordForEmail(correo, { redirectTo: urlDeRetorno() });
  if (error) throw error;
}

/** Canjea lo que traiga el enlace por una sesión válida para cambiar la clave. */
export async function abrirSesionDeRecuperacion() {
  const e = estadoDeUrl();
  if (e.error) {
    throw new Error(decodeURIComponent(String(e.errorDescripcion || 'El enlace venció o ya fue usado.').replace(/\+/g, ' ')));
  }
  const supabase = await getClient();

  if (e.accessToken && e.refreshToken) {
    const { data, error } = await supabase.auth.setSession({ access_token: e.accessToken, refresh_token: e.refreshToken });
    if (error) throw error;
    return data.session || null;
  }
  if (e.tokenHash) {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: e.tokenHash, type: 'recovery' });
    if (error) throw error;
    return data.session || null;
  }
  if (e.code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(e.code);
    // Un code verifier ya consumido no es un fallo: la sesión pudo quedar abierta.
    if (error && !/code verifier|already exchanged/i.test(error.message || '')) throw error;
    if (data?.session) return data.session;
  }

  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error('El enlace de recuperación venció o ya fue usado.');
  return data.session;
}

export async function cambiarPassword(password) {
  const supabase = await getClient();
  const { error } = await supabase.auth.updateUser({ password: String(password || '') });
  if (error) throw error;
}

/** Fuerza de la clave: 0 a 5. Mismos criterios que usaba la versión anterior. */
export function fuerzaPassword(valor) {
  const v = String(valor || '');
  return [v.length >= 8, /[a-z]/.test(v), /[A-Z]/.test(v), /\d/.test(v), /[^A-Za-z0-9]/.test(v)].filter(Boolean).length;
}

/**
 * Sin sesion se manda a #acceso, que es el modulo que existe. Antes esto
 * redirigia a #login y el router intentaba importar modules/login/index.js, un
 * directorio que nunca existio: la pantalla de acceso terminaba en "Error 404".
 */
export async function enforceActiveSession() {
  const session = await getSession();
  if (!session) {
    window.location.hash = '#acceso';
    return null;
  }
  return session;
}
