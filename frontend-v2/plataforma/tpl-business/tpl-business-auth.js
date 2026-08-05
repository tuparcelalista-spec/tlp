(function (window) {
  'use strict';

  const config = window.tplBusiness?.infrastructure;
  let client = null;

  function getClient() {
    if (client) return client;
    if (window.tplCoreSupabase?.auth && window.TPLDataService?.config?.url === config?.supabaseUrl) {
      client = window.tplCoreSupabase;
      return client;
    }
    if (!config?.supabaseUrl || !config?.supabaseAnonKey || !window.supabase?.createClient) {
      throw new Error('TPL Business no pudo inicializar la conexión segura.');
    }

    client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storageKey: config.storageKey
      },
      global: { headers: { 'X-Client-Info': config.clientInfo } }
    });
    return client;
  }

  const cleanEmail = value => String(value || '').trim().toLowerCase();

  function recoveryRedirectUrl() {
    const redirectTo = new URL(config.portalPath, window.location.origin);
    redirectTo.searchParams.set('mode', 'recovery');
    return redirectTo.toString();
  }

  function getUrlState() {
    const url = new URL(window.location.href);
    const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
    return {
      mode: url.searchParams.get('mode') || '',
      code: url.searchParams.get('code') || '',
      tokenHash: url.searchParams.get('token_hash') || '',
      type: url.searchParams.get('type') || hash.get('type') || '',
      accessToken: hash.get('access_token') || '',
      refreshToken: hash.get('refresh_token') || '',
      error: url.searchParams.get('error') || hash.get('error') || '',
      errorCode: url.searchParams.get('error_code') || hash.get('error_code') || '',
      errorDescription: url.searchParams.get('error_description') || hash.get('error_description') || ''
    };
  }

  function isRecoveryReturn() {
    const state = getUrlState();
    return state.mode === 'recovery' || state.type === 'recovery' || Boolean(state.code || state.tokenHash || state.accessToken);
  }

  function clearAuthUrl() {
    const clean = new URL(config.portalPath, window.location.origin);
    window.history.replaceState({}, document.title, clean.pathname);
  }

  async function establishRecoverySession() {
    const state = getUrlState();
    if (state.error || state.errorCode) {
      throw new Error(decodeURIComponent(String(state.errorDescription || 'El enlace de recuperación no es válido o ya venció.').replace(/\+/g, ' ')));
    }

    const supabase = getClient();
    if (state.accessToken && state.refreshToken) {
      const { data, error } = await supabase.auth.setSession({
        access_token: state.accessToken,
        refresh_token: state.refreshToken
      });
      if (error) throw error;
      return data.session || null;
    }

    if (state.tokenHash) {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: state.tokenHash,
        type: 'recovery'
      });
      if (error) throw error;
      return data.session || null;
    }

    if (state.code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(state.code);
      if (error && !/code verifier|already exchanged/i.test(error.message || '')) throw error;
      if (data?.session) return data.session;
    }

    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (!data.session) throw new Error('El enlace de recuperación no es válido o ya venció.');
    return data.session;
  }

  async function getSession() {
    const { data, error } = await getClient().auth.getSession();
    if (error) throw error;
    return data.session || null;
  }

  async function signIn(email, password) {
    const { data, error } = await getClient().auth.signInWithPassword({
      email: cleanEmail(email),
      password: String(password || '')
    });
    if (error) throw error;
    return data.session || null;
  }

  async function requestRecovery(email) {
    const normalized = cleanEmail(email);
    if (!normalized) throw new Error('Ingresa el correo asociado a tu cuenta.');
    const { error } = await getClient().auth.resetPasswordForEmail(normalized, {
      redirectTo: recoveryRedirectUrl()
    });
    if (error) throw error;
  }

  async function updatePassword(password) {
    const { data, error } = await getClient().auth.updateUser({
      password: String(password || '')
    });
    if (error) throw error;
    return data.user;
  }

  async function signOut(options) {
    const { error } = await getClient().auth.signOut(options || { scope: 'local' });
    if (error) throw error;
  }

  function onAuthStateChange(callback) {
    return getClient().auth.onAuthStateChange((event, session) => callback(event, session));
  }

  window.TPLBusinessAuth = Object.freeze({
    getClient,
    getSession,
    signIn,
    requestRecovery,
    updatePassword,
    signOut,
    onAuthStateChange,
    getUrlState,
    isRecoveryReturn,
    establishRecoverySession,
    clearAuthUrl,
    recoveryRedirectUrl
  });
})(window);
