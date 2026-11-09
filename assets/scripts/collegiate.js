(() => {
  'use strict';

  const focusDestination = target => {
    const destination = target.matches('section')
      ? target.querySelector('h1, h2') || target
      : target;
    if (!destination.hasAttribute('tabindex') && !destination.matches('a[href], button, input, select, textarea')) {
      destination.setAttribute('tabindex', '-1');
    }
    destination.focus({preventScroll:true});
  };

  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const control = event.target instanceof Element
      ? event.target.closest('a[href^="#"], button.back-to-top')
      : null;
    if (!control) return;

    const fragment = control.getAttribute('href') || (control.matches('.back-to-top') ? '#top' : '');
    if (!fragment || fragment === '#') return;
    let id;
    try { id = decodeURIComponent(fragment.slice(1)); } catch { return; }
    const target = document.getElementById(id);
    if (!target) return;

    const mobileMenu = control.closest('details.mobile-navigation');
    if (mobileMenu) mobileMenu.open = false;

    // Let the browser set the fragment and history, then align keyboard focus.
    requestAnimationFrame(() => {
      if (id === 'top') {
        focusDestination(document.querySelector('.wordmark') || target);
        window.scrollTo({
          top:0,
          behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
        });
      } else {
        focusDestination(target);
      }
    });
  });
})();
