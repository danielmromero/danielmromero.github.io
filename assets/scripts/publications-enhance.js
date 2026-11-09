(() => {
  'use strict';
  if (new URLSearchParams(location.search).has('preview')) document.documentElement.classList.add('concept-preview');
  const data = window.ACADEMIC_CONTENT;
  const renderer = window.AcademicPublications;
  // The complete academic content is already in the HTML. Missing scripts leave it readable.
  if (!data || !Array.isArray(data.publications) || typeof renderer?.renderResults !== 'function') return;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  document.querySelectorAll('[data-content="publications"]').forEach((mount, index) => {
    const results = mount.querySelector('.pub-results');
    const count = mount.querySelector('.pub-count');
    if (!results || !count) return;
    const resultsId = results.id || `publication-results-${index + 1}`;
    const years = [...new Set(data.publications.map(p => p.year))].sort((a,b) => b-a);
    const controls = document.createElement('div');
    controls.className = 'pub-enhancement';
    controls.hidden = true;
    controls.innerHTML = `<label class="pub-search-label">Search publications<input class="pub-search" type="search" placeholder="Title, author, venue, or keyword" autocomplete="off"></label>
      <div class="pub-view-controls"><span class="pub-view-label">List publications</span><div class="pub-view-buttons" role="group" aria-label="Organize publications"><button type="button" class="pub-view-button" data-view="year" aria-pressed="true" aria-controls="${esc(resultsId)}">By year</button><button type="button" class="pub-view-button" data-view="topic" aria-pressed="false" aria-controls="${esc(resultsId)}">By topic</button></div></div>
      <details class="pub-filters"><summary>Filters <span class="pub-filter-count" hidden></span></summary><div class="pub-filter-fields">
        <label>Year<select class="pub-year"><option value="">All years</option>${years.map(y=>`<option>${esc(y)}</option>`).join('')}</select></label>
        <label>Research topic<select class="pub-topic"><option value="">All topics</option>${Object.entries(data.topics).map(([key,label])=>`<option value="${esc(key)}">${esc(label)}</option>`).join('')}</select></label>
        <label>Publication type<select class="pub-type"><option value="">All types</option><option value="journal">Journal</option><option value="conference">Conference</option></select></label>
      </div></details>
      <div class="pub-filter-state" hidden><span class="pub-filter-description"></span><button type="button" class="pub-clear-filters">Clear filters</button></div>`;
    mount.insertBefore(controls, count);
    const empty = document.createElement('p');
    empty.className = 'pub-empty';
    empty.hidden = true;
    empty.innerHTML = 'No publications match these filters. Try another search or <button class="pub-reset" type="button">clear all filters</button>.';
    mount.append(empty);
    const search = controls.querySelector('.pub-search');
    const year = controls.querySelector('.pub-year');
    const topic = controls.querySelector('.pub-topic');
    const type = controls.querySelector('.pub-type');
    const filters = controls.querySelector('.pub-filters');
    const filterCount = controls.querySelector('.pub-filter-count');
    const filterState = controls.querySelector('.pub-filter-state');
    const filterDescription = controls.querySelector('.pub-filter-description');
    const viewButtons = [...controls.querySelectorAll('.pub-view-button')];
    const mobile = window.matchMedia('(max-width: 700px)');
    let view = 'year';
    filters.open = !mobile.matches;
    const syncDisclosure = event => { filters.open = !event.matches; };
    if (mobile.addEventListener) mobile.addEventListener('change', syncDisclosure);
    else mobile.addListener(syncDisclosure);
    const initialTopic = new URLSearchParams(location.search).get('topic');
    if (Object.prototype.hasOwnProperty.call(data.topics, initialTopic)) topic.value = initialTopic;
    count.setAttribute('role','status');
    count.setAttribute('aria-live','polite');

    const render = () => {
      const words = search.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
      const filtered = data.publications.filter(p => (!year.value || p.year === year.value) && (!topic.value || p.topic === topic.value) && (!type.value || p.type === type.value) && words.every(word => p.search.toLocaleLowerCase().includes(word)));
      const html = renderer.renderResults(filtered,{view,topics:data.topics,resultsId});
      results.innerHTML = html;
      results.dataset.view = view;
      viewButtons.forEach(button => button.setAttribute('aria-pressed',String(button.dataset.view === view)));
      const active = [year.value,topic.value,type.value].filter(Boolean).length;
      filterCount.hidden = active === 0;
      filterCount.textContent = active ? `${active} active` : '';
      filterState.hidden = active === 0;
      filterDescription.textContent = [year.value && `Year: ${year.value}`,topic.value && `Topic: ${data.topics[topic.value]}`,type.value && `Type: ${type.options[type.selectedIndex].text}`].filter(Boolean).join(' · ');
      const arrangement = view === 'topic' ? 'Grouped by topic · Newest first within each topic' : 'Newest first';
      count.textContent = (words.length || active ? `${filtered.length} ${filtered.length === 1 ? 'publication' : 'publications'} found · ` : '') + arrangement;
      empty.hidden = filtered.length !== 0;
    };
    search.addEventListener('input', render);
    [year,topic,type].forEach(select => select.addEventListener('change', render));
    viewButtons.forEach(button => button.addEventListener('click', () => { view = button.dataset.view; render(); }));
    controls.querySelector('.pub-clear-filters').addEventListener('click', () => { year.value = topic.value = type.value = ''; render(); });
    empty.querySelector('.pub-reset').addEventListener('click', () => { search.value = year.value = topic.value = type.value = ''; render(); search.focus(); });
    render();
    controls.hidden = false;
  });
})();
