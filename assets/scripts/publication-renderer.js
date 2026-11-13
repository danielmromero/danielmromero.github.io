(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AcademicPublications = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));

  const renderLink = link => `<a href="${escapeHTML(link.url)}" target="_blank" rel="noopener">${escapeHTML(link.label)}</a>`;

  function renderEntry(paper, view) {
    const links = Array.isArray(paper.links) ? paper.links : [];
    const resources = links.filter(link => link.kind !== 'press');
    const press = links.filter(link => link.kind === 'press');
    const titleTag = view === 'topic' ? 'h4' : 'h3';
    const yearLabel = view === 'topic' ? `<span class="pub-year-label">${escapeHTML(paper.year)}</span>` : '';
    const resourceLinks = resources.length ? `<div class="pub-links">${resources.map(renderLink).join('')}</div>` : '';
    const pressLinks = press.length ? `<div class="pub-press"><span class="pub-press-label">Press coverage:</span><span class="pub-press-links"> ${press.map(renderLink).join(' ')}</span></div>` : '';
    const image = paper.image;
    const thumbnail = image ? `<a class="paper-thumbnail" href="${escapeHTML(image.src)}" target="_blank" rel="noopener" data-publication-image="${escapeHTML(paper.url)}" aria-label="${escapeHTML(`Enlarge image for ${paper.title}`)}"><img src="${escapeHTML(image.thumbnail)}" alt="${escapeHTML(image.alt)}" width="${escapeHTML(image.width)}" height="${escapeHTML(image.height)}" loading="lazy" decoding="async"></a>` : '';
    return `<li class="pub-entry${image ? ' has-paper-image' : ''}">${thumbnail}<div class="pub-detail">${yearLabel}<${titleTag} class="pub-title"><a href="${escapeHTML(paper.url)}" target="_blank" rel="noopener">${escapeHTML(paper.title)}</a></${titleTag}><p class="pub-authors">${escapeHTML(paper.authors)}</p><p class="pub-venue">${escapeHTML(paper.venue)}</p>${resourceLinks}${pressLinks}</div></li>`;
  }

  function yearValue(paper) {
    const year = Number(paper.year);
    return Number.isFinite(year) && year > 0 ? year : -Infinity;
  }

  /** Render publication results without reading or changing browser state. */
  function renderResults(papers, options = {}) {
    const view = options.view === 'topic' ? 'topic' : 'year';
    const topics = options.topics || {};
    const resultsId = options.resultsId || 'publication-results-1';
    const sorted = papers.map((paper, index) => ({paper, index})).sort((a, b) => {
      const aYear = yearValue(a.paper);
      const bYear = yearValue(b.paper);
      return aYear === bYear ? a.index - b.index : bYear > aYear ? 1 : -1;
    }).map(item => item.paper);

    if (view === 'year') {
      return `<ol class="pub-list pub-list-chronological">${sorted.map(paper => renderEntry(paper, view)).join('')}</ol>`;
    }

    const groups = new Map(Object.entries(topics).map(([key, label]) => [key, {label, items: []}]));
    for (const paper of sorted) {
      const key = Object.prototype.hasOwnProperty.call(topics, paper.topic) ? paper.topic : 'other';
      if (!groups.has(key)) groups.set(key, {label: 'Other research', items: []});
      groups.get(key).items.push(paper);
    }
    return [...groups].filter(([, group]) => group.items.length).map(([key, group]) => {
      const groupId = `${resultsId}-topic-${key}`;
      return `<section class="pub-group" data-group="${escapeHTML(key)}" aria-labelledby="${escapeHTML(groupId)}"><h3 class="pub-group-heading" id="${escapeHTML(groupId)}">${escapeHTML(group.label)}</h3><ol class="pub-list">${group.items.map(paper => renderEntry(paper, view)).join('')}</ol></section>`;
    }).join('');
  }

  return Object.freeze({renderResults});
}));
