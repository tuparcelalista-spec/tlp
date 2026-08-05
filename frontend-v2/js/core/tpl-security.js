(function () {
  'use strict';

  const ESCAPE_MAP = Object.freeze({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  });
  const SAFE_DATA_IMAGE = /^data:image\/(?:png|jpeg|jpg|webp|gif);base64,[a-z0-9+/=\s]+$/i;

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, char => ESCAPE_MAP[char]);
  }

  function safeUrl(value, options) {
    const opts = options || {};
    const allowedProtocols = opts.allowedProtocols || ['https:', 'http:'];
    const allowedHosts = Array.isArray(opts.allowedHosts) ? new Set(opts.allowedHosts) : null;
    const fallback = opts.fallback || '';
    try {
      const raw = String(value || '').trim();
      if (!raw || /[\u0000-\u001f\u007f]/.test(raw)) return fallback;
      const url = new URL(raw, window.location.origin);
      if (!allowedProtocols.includes(url.protocol)) return fallback;
      if (allowedHosts && !allowedHosts.has(url.hostname)) return fallback;
      if (url.username || url.password) return fallback;
      return url.href;
    } catch (_) {
      return fallback;
    }
  }

  function safeImageUrl(value, options) {
    const raw = String(value || '').trim();
    if (SAFE_DATA_IMAGE.test(raw)) return raw;
    if (/^data:/i.test(raw)) return '';
    return safeUrl(raw, {
      allowedProtocols: ['https:', 'http:', 'blob:'],
      allowedHosts: options && options.allowedHosts,
      fallback: ''
    });
  }

  function setText(element, value) {
    if (element) element.textContent = value == null ? '' : String(value);
    return element;
  }

  function setSafeHref(element, value, options) {
    if (!element) return '';
    const url = safeUrl(value, options);
    if (!url) element.removeAttribute('href');
    else element.setAttribute('href', url);
    return url;
  }

  function setSafeImage(element, value, options) {
    if (!element) return '';
    const url = safeImageUrl(value, options);
    if (!url) element.removeAttribute('src');
    else element.setAttribute('src', url);
    return url;
  }

  function clearSensitiveQueryParams(names) {
    const sensitive = new Set(names || ['t', 'token', 'draft', 'continuar', 'upload_token']);
    const url = new URL(window.location.href);
    let changed = false;
    for (const name of sensitive) {
      if (url.searchParams.has(name)) {
        url.searchParams.delete(name);
        changed = true;
      }
    }
    if (changed) history.replaceState(history.state, document.title, url.pathname + url.search + url.hash);
  }

  window.TPLSecurity = Object.freeze({
    escapeHtml,
    safeUrl,
    safeImageUrl,
    setText,
    setSafeHref,
    setSafeImage,
    clearSensitiveQueryParams
  });
})();
