export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[character]));

export function isSafeURL(value) {
  if (typeof value !== 'string' || !value.trim() || /[\s<>"'\\]/.test(value)) return false;
  if (/^https?:\/\//i.test(value)) {
    try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
  }
  // Support files kept with the website, such as links/paper.pdf.
  return !/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(value) && !value.split(/[/?#]/).includes('..');
}

export function renderLink(label, url) {
  if (!isSafeURL(url)) throw new Error(`Invalid link: ${url}`);
  const external = /^https?:\/\//i.test(url) ? ' target="_blank" rel="noopener"' : '';
  return `<a href="${escapeHTML(url)}"${external}>${escapeHTML(label)}</a>`;
}

// Only ordinary text and [label](URL) links are supported; HTML is always escaped.
// Balanced parentheses allow links to academic URLs containing parentheses.
export function inlineParts(value) {
  const source = String(value);
  const parts = [];
  let cursor = 0;
  let scan = 0;
  for (let start = source.indexOf('[', scan); start !== -1; start = source.indexOf('[', scan)) {
    const close = source.indexOf(']', start + 1);
    if (close === -1) break;
    if (source[close + 1] !== '(' || source.slice(start + 1, close).includes('[')) {
      scan = start + 1;
      continue;
    }
    const middle = close;
    let end = middle + 2;
    let depth = 1;
    for (; end < source.length && depth; end++) {
      if (source[end] === '(') depth++;
      else if (source[end] === ')') depth--;
    }
    if (depth) throw new Error(`Unclosed link in: ${source}`);
    parts.push({text: source.slice(cursor, start)});
    const label = source.slice(start + 1, middle);
    const url = source.slice(middle + 2, end - 1);
    if (!label || !isSafeURL(url)) throw new Error(`Invalid link in: ${source}`);
    parts.push({text: label, url});
    cursor = end;
    scan = end;
  }
  parts.push({text: source.slice(cursor)});
  return parts;
}

export const renderInline = value => inlineParts(value).map(part => part.url
  ? renderLink(part.text, part.url) : escapeHTML(part.text)).join('');
