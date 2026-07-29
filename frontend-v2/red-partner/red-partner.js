(() => {
  const toggle = document.getElementById('rp-menu-toggle');
  const menu = document.getElementById('rp-mobile-menu');
  if (!toggle || !menu) return;
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    menu.hidden = open;
  });
  menu.addEventListener('click', event => {
    if (event.target.closest('a')) {
      menu.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
})();
