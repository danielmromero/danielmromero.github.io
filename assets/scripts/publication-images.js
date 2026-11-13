(() => {
  'use strict';
  const papers = window.ACADEMIC_CONTENT?.publications;
  // Static image links keep working without scripts or native dialog support.
  if (!Array.isArray(papers) || typeof HTMLDialogElement === 'undefined' || typeof HTMLDialogElement.prototype.showModal !== 'function') return;
  const dialog = document.createElement('dialog');
  dialog.className = 'paper-image-dialog';
  dialog.setAttribute('aria-labelledby', 'paper-image-dialog-title');
  dialog.innerHTML = '<button type="button" class="paper-dialog-close" autofocus>Close ×</button><h2 id="paper-image-dialog-title"></h2><img class="paper-dialog-image" alt=""><p class="paper-dialog-caption"></p><p class="paper-dialog-credit"></p><a class="paper-dialog-source" target="_blank" rel="noopener noreferrer">View source ↗</a>';
  document.body.append(dialog);
  const image = dialog.querySelector('.paper-dialog-image');
  let opener;
  dialog.querySelector('.paper-dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('paper-image-open');
    image.removeAttribute('src');
    if (opener?.isConnected) opener.focus({preventScroll: true});
    opener = null;
  });
  // Delegation covers the initial HTML and every search/filter/topic rerender.
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const control = event.target instanceof Element ? event.target.closest('a[data-publication-image]') : null;
    if (!control) return;
    const paper = papers.find(item => item.url === control.dataset.publicationImage && item.image?.src === control.getAttribute('href'));
    if (!paper?.image) return;
    event.preventDefault();
    opener = control;
    const record = paper.image;
    dialog.querySelector('h2').textContent = paper.title;
    image.src = record.src;
    image.alt = record.alt;
    image.width = record.width;
    image.height = record.height;
    dialog.querySelector('.paper-dialog-caption').textContent = record.caption;
    dialog.querySelector('.paper-dialog-credit').textContent = record.credit;
    dialog.querySelector('.paper-dialog-source').href = record.source;
    dialog.showModal();
    document.body.classList.add('paper-image-open');
  });
})();
