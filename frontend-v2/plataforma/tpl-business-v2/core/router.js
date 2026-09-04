const VISTAS = new Set(['acceso', 'registro', 'informe', 'studio', 'landing', 'campanas']);

export class Router {
  constructor(appElementId = 'app-content') {
    this.appElementId = appElementId;
    window.addEventListener('hashchange', () => this.handleRoute());
  }

  get container() { return document.getElementById(this.appElementId); }

  async handleRoute() {
    const hash = window.location.hash.slice(1) || 'informe';
    const vista = hash.split('?')[0];
    const contenedor = this.container;
    if (!contenedor) return;

    // Solo se importan vistas conocidas: el hash lo escribe el usuario en la
    // barra de direcciones y no debe poder pedir una ruta arbitraria.
    if (!VISTAS.has(vista)) {
      contenedor.innerHTML = `<div class="vacio"><h2>Esa página no existe</h2>
        <p>Vuelve a <a href="#informe">tu informe de valor</a>.</p></div>`;
      return;
    }

    try {
      const modulo = await import(`../modules/${vista}/index.js?v=20260902`);
      if (typeof modulo.render === 'function') contenedor.innerHTML = modulo.render();
      if (typeof modulo.init === 'function') await modulo.init();
      contenedor.scrollTop = 0;
    } catch (error) {
      console.error(`No se pudo cargar la vista "${vista}"`, error);
      contenedor.innerHTML = `<div class="vacio"><h2>No pudimos abrir esta sección</h2>
        <p>Recarga la página. Si sigue igual, escríbenos y lo revisamos.</p></div>`;
    }
  }

  init() { this.handleRoute(); }
}

export const router = new Router('app-content');
