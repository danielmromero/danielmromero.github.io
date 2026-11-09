import {escapeHTML, renderInline, renderLink} from './content-utils.mjs';

function renderPerson(person) {
  const name = person.url ? renderLink(person.name, person.url) : escapeHTML(person.name);
  return `${name} (${escapeHTML(person.status)})<br/>`;
}

export function renderPeople(people) {
  const alumni = people.alumni.map(group => `<div class="alumni-card" role="listitem">
<div class="alumni-head"><h3>${escapeHTML(group.heading)}</h3></div>
<div class="alumni-list">${group.people.map(renderPerson).join('\n')}</div>
</div>`).join('\n');
  return `<div class="people-group">
<h3>Current students</h3>
${people.current.map(renderPerson).join('\n')}
</div>
<div class="people-group">
<h3>Alumni</h3>
<div class="alumni-groups" role="list">${alumni}</div>
</div>`;
}

export function renderService(service) {
  const editorial = service.editorial.map(item => `<li class="service-item service-editorial">
<div class="service-top">
<div class="service-venue">${renderLink(item.venue, item.url)}</div>
<span class="service-years">${escapeHTML(item.years)}</span>
</div>
<div class="service-role-line"><span class="service-role">${escapeHTML(item.role)}</span></div>
</li>`).join('\n');
  const committees = service.committees.items.map(title => `<li class="service-item"><span class="service-title">${escapeHTML(title)}</span></li>`).join('\n');
  return `<div class="service-grid" role="list">
<div class="service-card" role="listitem">
<div class="service-head"><h3>Editorial roles</h3></div>
<ul class="service-list">${editorial}</ul>
</div>
<div class="service-card" role="listitem">
<div class="service-head"><h3>Program committees</h3><span class="service-meta">${escapeHTML(service.committees.note)}</span></div>
<ul class="service-list service-compact">${committees}</ul>
</div>
</div>`;
}

export function renderTeaching(teaching) {
  const groups = teaching.map(group => {
    const courses = group.courses.map(course => {
      const title = course.url ? renderLink(course.title, course.url) : `<span class="teach-title">${escapeHTML(course.title)}</span>`;
      return `<li class="teach-item">${title}<span class="teach-meta">${escapeHTML(course.offering)}</span></li>`;
    }).join('\n');
    return `<div class="teach-card" role="listitem">
<div class="teach-head"><h3>${renderInline(group.heading)}</h3></div>
<ul class="teach-list">${courses}</ul>
</div>`;
  }).join('\n');
  return `<div class="teaching-grid" role="list">${groups}</div>`;
}
