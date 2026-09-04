/**
 * tpl-parcela-video.js
 * Módulo de video fallback para páginas de parcela.
 *
 * Comportamiento:
 * - Si la parcela tiene su propio videoUrl → lo maneja parcela.js (no interviene).
 * - Si la parcela NO tiene videoUrl → inyecta el video corporativo TPL como fallback.
 * - El video fallback solo se reproduce UNA VEZ por navegador (clave localStorage).
 *   La lógica de "una vez por IP" se implementa client-side via localStorage, que es
 *   la única forma de persistencia disponible sin un backend de tracking.
 *
 * Video fallback: https://youtu.be/D-AIAj-Uo68
 * ID YouTube: D-AIAj-Uo68
 *
 * Integración: cargar este script con defer DESPUÉS de parcela.js en la página
 * de parcela-v2.html:
 *   <script defer src="./js/tpl-parcela-video.js?v=20260820"></script>
 */

(function () {
  'use strict';

  const FALLBACK_VIDEO_ID  = 'D-AIAj-Uo68';
  const STORAGE_KEY        = 'tpl_video_corporativo_visto';
  const POLL_INTERVAL_MS   = 400;   // tiempo entre intentos de detectar la parcela
  const MAX_WAIT_MS        = 8000;  // máximo tiempo de espera antes de abandonar

  /**
   * Verifica si el video fallback ya fue mostrado en este navegador.
   */
  function yaVisto() {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch (e) {
      return false; // Si localStorage falla, no bloquear
    }
  }

  /**
   * Marca el video como visto para este navegador.
   */
  function marcarComoVisto() {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch (e) { /* silencioso */ }
  }

  /**
   * Intenta obtener la parcela activa desde el contexto de parcela.js.
   * parcela.js expone la parcela activa en window.currentParcel (si existe)
   * o podemos leerla de los params de URL y el catálogo global.
   */
  function obtenerParcelaActiva() {
    // Intento 1: window.currentParcel expuesto por parcela.js
    if (window.currentParcel) return window.currentParcel;

    // Intento 2: buscar por ID en el array global parcelas[]
    try {
      const params = new URLSearchParams(location.search);
      const id = params.get('id') || params.get('codigo') || params.get('parcela');
      if (id && Array.isArray(window.parcelas)) {
        const normalize = (v) =>
          String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
        return window.parcelas.find(
          (p) => normalize(p.id) === normalize(id) ||
                 normalize(p.codigo) === normalize(id) ||
                 normalize(p.slug) === normalize(id)
        ) || null;
      }
    } catch (e) { /* silencioso */ }

    return null;
  }

  /**
   * Determina si una parcela tiene su propio video de YouTube.
   * Replica la lógica de parcela.js (líneas 353-384).
   */
  function tieneVideoPropio(parcela) {
    if (!parcela) return false;
    try {
      let videoUrl = null;

      // Leer desde metadata (como hace parcela.js)
      const meta = typeof parcela.metadata === 'string'
        ? JSON.parse(parcela.metadata)
        : (parcela.metadata || {});
      videoUrl = meta.videoUrl || parcela.videoUrl || null;

      return !!(videoUrl && (
        videoUrl.includes('youtube.com') ||
        videoUrl.includes('youtu.be')
      ));
    } catch (e) {
      return false;
    }
  }

  /**
   * Inyecta el iframe del video corporativo en el contenedor de la galería.
   * Usa la misma estructura que espera el HTML de parcela-v2.html.
   */
  function inyectarVideoFallback() {
    // Contenedor principal del video
    const wrapper = document.querySelector('.video-wrapper.tpl-video-corporate');
    if (!wrapper) return;

    // Evitar doble inyección
    if (document.getElementById('tpl-fallback-iframe')) return;

    // El wrapper está dentro de #gallery (position: relative)
    // Creamos el iframe con autoplay muted para que la primera carga sea discreta
    const iframe = document.createElement('iframe');
    iframe.id = 'tpl-fallback-iframe';
    iframe.src = [
      `https://www.youtube.com/embed/${FALLBACK_VIDEO_ID}`,
      `?autoplay=1&mute=1&controls=1&rel=0&modestbranding=1`,
      `&loop=0&enablejsapi=1`
    ].join('');
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.style.cssText = [
      'position:absolute',
      'inset:0',
      'width:100%',
      'height:100%',
      'border:0',
      'z-index:2'
    ].join(';');
    iframe.setAttribute('title', 'Tu Parcela Lista — Video Corporativo');

    // Insertar en el wrapper
    wrapper.style.position = 'relative';
    wrapper.appendChild(iframe);

    // Mostrar el botón "Ver Video" si existe
    const btnVideo = document.getElementById('toggle-photo-btn');
    if (btnVideo) btnVideo.style.display = 'block';

    // Badge visual de que hay video disponible
    const gallery = document.getElementById('gallery');
    if (gallery && !gallery.querySelector('.tpl-video-badge')) {
      const badge = document.createElement('span');
      badge.className = 'tpl-video-badge';
      badge.textContent = '▶ Video TPL';
      badge.style.cssText = [
        'position:absolute',
        'bottom:48px',
        'right:10px',
        'z-index:3',
        'padding:4px 10px',
        'border-radius:4px',
        'background:rgba(0,43,84,0.82)',
        'color:#fff',
        'font-size:0.7rem',
        'font-weight:800',
        'pointer-events:none'
      ].join(';');
      gallery.appendChild(badge);
    }

    // Marcar como visto (una vez por navegador)
    marcarComoVisto();

    console.info('[TPL] Video corporativo fallback inyectado (primera vez).');
  }

  /**
   * Polling que espera a que la parcela esté disponible en el contexto.
   * Se detiene cuando encuentra la parcela o cuando supera MAX_WAIT_MS.
   */
  function iniciarPolling() {
    const inicio = Date.now();

    const intervalo = setInterval(() => {
      const parcela = obtenerParcelaActiva();

      if (parcela) {
        clearInterval(intervalo);

        if (tieneVideoPropio(parcela)) {
          // La parcela tiene su propio video → no intervenir
          console.info('[TPL] Parcela tiene video propio. Fallback no activado.');
          return;
        }

        if (yaVisto()) {
          // El video ya se mostró alguna vez → no mostrar de nuevo
          console.info('[TPL] Video corporativo ya fue visto en este navegador.');
          return;
        }

        // Condiciones cumplidas: inyectar el fallback
        inyectarVideoFallback();
        return;
      }

      if (Date.now() - inicio > MAX_WAIT_MS) {
        clearInterval(intervalo);
        console.warn('[TPL] tpl-parcela-video.js: No se encontró parcela activa. Tiempo agotado.');
      }
    }, POLL_INTERVAL_MS);
  }

  // Arrancar después de que el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciarPolling);
  } else {
    // DOMContentLoaded ya disparó (scripts sin defer o inline)
    iniciarPolling();
  }

})();
