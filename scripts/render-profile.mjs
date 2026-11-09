import {escapeHTML as esc, renderLink} from './content-utils.mjs';

export function renderProfile(profile) {
  const p = profile;
  const affiliations = p.affiliations.map(a => `${renderLink(a.label, a.url)}${a.note ? ` <span class="courtesy">${esc(a.note)}</span>` : ''}`);
  const desktopAffiliations = p.affiliations.map(a => renderLink(a.label, a.url)
    .replace('</a>', `${a.note ? ` <span class="courtesy">${esc(a.note)}</span>` : ''}</a>`));
  const email = `<a class="email" href="mailto:${esc(p.email)}">${esc(p.email)}</a>`;
  const address = `<address>${p.address.map(esc).join('<br>')}</address>`;
  const academicLinks = Object.values(p.links).map(link => renderLink(`${link.label} ↗`, link.url)).join('\n');
  return `<aside class="profile" aria-label="Profile and contact information" tabindex="0">
      <img class="portrait" src="${esc(p.photo.src)}" alt="${esc(p.photo.alt)}" width="${p.photo.width}" height="${p.photo.height}">
      <p class="profile-role">${esc(p.role)}<br><span>${esc(p.institution)}</span></p>
      <div class="profile-block"><h2>Affiliations</h2>${desktopAffiliations.join('\n')}</div>
      <div class="profile-block"><h2>Contact</h2>${email}${address}</div>
      <div class="profile-links">
        <a class="mobile-email" href="mailto:${esc(p.email)}">${esc(p.email)}</a>
        ${academicLinks}
      </div>
      <div class="mobile-quicklinks" aria-label="Contact and academic profiles">
        <a href="mailto:${esc(p.email)}">Email</a>
        ${renderLink('Google Scholar ↗', p.links.scholar.url)}
        ${renderLink('CV ↗', p.links.cv.url)}
      </div>
      <details class="mobile-profile-details">
        <summary>Affiliations &amp; contact</summary>
        <div class="mobile-profile-content"><p>${affiliations.join('<br>')}</p><p>${email}</p>${address}</div>
      </details>
    </aside>`;
}
