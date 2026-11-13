import assert from 'node:assert/strict';
import {readFile, writeFile, mkdtemp, rm, readdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import os from 'node:os';
import {loadContent, validateContent, publicationData} from './content.mjs';
import {build, validateImageAssets} from './build.mjs';
import {escapeHTML, renderInline, isSafeURL} from './content-utils.mjs';

const project = fileURLToPath(new URL('../', import.meta.url));
const contentDirectory = path.join(project, 'content');
const {renderResults} = createRequire(import.meta.url)('../assets/scripts/publication-renderer.js');
const data = await loadContent(contentDirectory);
const before = structuredClone(data);
const runtime = publicationData(data);
const papers = runtime.publications;
const render = (items = papers, view = 'year', topics = data.topics) => renderResults(items, {view, topics, resultsId: 'test-results'});
const countClass = (html, name) => [...html.matchAll(/\bclass="([^"]*)"/g)]
  .filter(match => match[1].split(/\s+/).includes(name)).length;
const countTag = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b`, 'g'))].length;
const countResourceLinks = (html, wrapper) => [...html.matchAll(new RegExp(`<div\\b[^>]*class="[^"]*\\b${wrapper}\\b[^"]*"[^>]*>([\\s\\S]*?)<\\/div>`, 'g'))]
  .reduce((count, match) => count + countTag(match[1], 'a'), 0);
const expectedPress = data.publications.reduce((sum, paper) => sum + paper.pressCoverage.length, 0);
const expectedResources = data.publications.reduce((sum, paper) => sum + paper.resources.length, 0);
const chronological = render();

assert.equal(countClass(chronological, 'pub-entry'), papers.length, 'Every source paper is rendered');
assert.equal(countTag(chronological, 'ol'), 1, 'Year view is one continuous list');
assert.equal(countClass(chronological, 'pub-group'), 0, 'Year view has no year or topic group headings');
assert.equal(countClass(chronological, 'pub-group-heading'), 0);
assert.equal(countClass(chronological, 'pub-year-label'), 0, 'Year view does not repeat years beside titles');
assert.equal(countTag(chronological, 'h3'), papers.length);
assert.equal(countResourceLinks(chronological, 'pub-press'), expectedPress, 'Press links retain their classification');
assert.equal(countResourceLinks(chronological, 'pub-links'), expectedResources, 'Resource links remain separate from press coverage');
assert.equal(countClass(chronological, 'pub-press-label'), data.publications.filter(paper => paper.pressCoverage.length).length);
assert.ok(!expectedPress || chronological.includes('Press coverage:'), 'News links have an explicit label');

const topicHTML = render(papers, 'topic');
const populatedTopics = Object.keys(data.topics).filter(topic => papers.some(paper => paper.topic === topic));
const groups = [...topicHTML.matchAll(/<section\b[^>]*data-group="([^"]*)"[^>]*>([\s\S]*?)<\/section>/g)];
assert.deepEqual(groups.map(match => match[1]), populatedTopics, 'Only populated topics appear, in the configured order');
assert.equal(countClass(topicHTML, 'pub-entry'), papers.length);
assert.equal(countTag(topicHTML, 'h4'), papers.length, 'Topic view nests paper headings under topic headings');
assert.equal(countResourceLinks(topicHTML, 'pub-press'), expectedPress);
assert.equal(countResourceLinks(topicHTML, 'pub-links'), expectedResources);
for (const [, topic, groupHTML] of groups) {
  assert.ok(groupHTML.includes(escapeHTML(data.topics[topic])));
  assert.equal(countClass(groupHTML, 'pub-entry'), papers.filter(paper => paper.topic === topic).length);
}

// Use independent fixtures: these checks keep working as real papers are added or removed.
const seed = {title: 'Seed', url: 'https://example.test/paper', authors: 'A. Author', venue: 'Example Journal, 2090.', year: '2090', type: 'journal', topic: 'example', links: []};
const unordered = [
  {...seed, title: 'Earlier', year: '2020'},
  {...seed, title: 'Same year first', year: '2028'},
  {...seed, title: 'Newest', year: '2030'},
  {...seed, title: 'Same year second', year: '2028'}
];
const beforeSort = structuredClone(unordered);
for (const view of ['year', 'topic']) {
  const html = render(unordered, view, {example: 'Example topic', empty: 'Empty topic'});
  const positions = ['Newest', 'Same year first', 'Same year second', 'Earlier'].map(title => html.indexOf(`>${title}</a>`));
  assert.ok(positions.every((position, index) => position >= 0 && (!index || position > positions[index - 1])), `${view}: sort is newest first and stable for the same year`);
  assert.ok(!html.includes('Empty topic'), 'Empty topic groups are omitted');
}
assert.deepEqual(unordered, beforeSort, 'Rendering never rearranges the original source');
assert.equal(countClass(render([], 'year'), 'pub-entry'), 0);
assert.equal(countClass(render([], 'topic'), 'pub-group'), 0);
assert.ok(render([{...seed, topic: 'unknown'}], 'topic', {}).includes('Other research'), 'Renderer has a readable fallback for unknown topics');

const futureData = structuredClone(data);
const topicCode = Object.keys(futureData.topics)[0] || 'new_topic';
futureData.topics[topicCode] ||= 'New topic';
futureData.publications.push({
  title: 'Future paper <draft> & "quoted"', url: 'https://example.test/future?x=1&y=2',
  authors: 'A. Author', venue: 'Future Journal, 2099.', year: 2099, type: 'journal', topic: topicCode,
  resources: [], pressCoverage: [], keywords: ['quasarmodel']
});
validateContent(futureData);
const futureRuntime = publicationData(futureData);
const future = futureRuntime.publications.at(-1);
assert.equal(future.year, '2099', 'Numeric JSON years become strings for browser filters');
assert.equal(futureRuntime.publications.filter(paper => paper.year === '2099' && paper.search.toLowerCase().includes('quasarmodel')).length, 1, 'A new paper works with year and keyword filtering without code changes');
assert.ok(future.search.includes(futureData.topics[topicCode]), 'Topic labels are included in generated search text');
assert.equal(countClass(render(futureRuntime.publications), 'pub-entry'), papers.length + 1);
assert.ok(render([future]).includes('Future paper &lt;draft&gt; &amp; &quot;quoted&quot;'), 'Special characters remain text');

const payload = '</script><script>alert("x")</script> & \'quoted\'';
const hostile = render([{...seed, title: payload, authors: payload, venue: payload,
  links: [{label: payload, url: 'https://example.test/?a=1&b=2', kind: 'press'}]}]);
assert.ok(!hostile.includes('<script>'), 'Publication text cannot create script elements');
assert.ok(hostile.includes(escapeHTML(payload)));
assert.ok(hostile.includes('href="https://example.test/?a=1&amp;b=2"'), 'URL attributes are escaped');
assert.equal(renderInline(`Text ${payload}`), escapeHTML(`Text ${payload}`), 'Biography text cannot inject HTML');
assert.ok(renderInline('[Academic link](https://example.test/path_(academic))').includes('href="https://example.test/path_(academic)"'), 'Inline academic links allow balanced URL parentheses');
assert.equal(renderInline('Text [brackets] then [Profile](https://example.test)'), 'Text [brackets] then <a href="https://example.test" target="_blank" rel="noopener">Profile</a>', 'Literal brackets do not become part of a later link');
assert.throws(() => renderInline('[Unsafe](javascript:alert(1))'), /Invalid link/);
assert.throws(() => renderInline('[Incomplete](https://example.test'), /Unclosed link/);

const imageFixture = {
  src: 'images/papers/fixture.webp', thumbnail: 'images/papers/fixture-thumb.webp',
  alt: 'A network linking three groups', caption: 'The paper’s three-group network diagram.',
  credit: 'Author et al., Figure 1.', source: 'https://example.test/paper', width: 640, height: 480
};
for (const view of ['year', 'topic']) {
  const html = render([{...seed, image: {...imageFixture, alt: payload}}], view, {example: 'Example'});
  assert.equal(countClass(html, 'paper-thumbnail'), 1, `${view}: the initial and filtered renderer includes the image`);
  assert.equal(countClass(html, 'has-paper-image'), 1);
  assert.ok(html.includes('href="images/papers/fixture.webp"'), 'The image link works without JavaScript');
  assert.ok(html.includes('src="images/papers/fixture-thumb.webp"'), 'The full image is not loaded for a thumbnail');
  assert.ok(html.includes('loading="lazy"') && html.includes('decoding="async"'));
  assert.ok(html.includes(`alt="${escapeHTML(payload)}"`), 'Alt text is escaped');
  assert.ok(!html.includes('<script>'));
  if (view === 'topic') assert.ok(html.indexOf('class="pub-detail"') < html.indexOf('class="pub-year-label"'), 'The year stays with the paper text beside the image');
}
assert.equal(countClass(render([seed]), 'paper-thumbnail'), 0, 'A future paper can be published before an image is ready');

const rejects = (mutate, pattern) => {
  const invalid = structuredClone(data);
  // Avoid relying on whether the author's live publication list happens to be empty.
  invalid.publications = [{title: 'Validation fixture', url: 'https://example.test/paper', authors: 'A. Author', venue: 'Example Journal, 2090.', year: 2090, type: 'journal', topic: Object.keys(invalid.topics)[0] || 'fixture', resources: [], pressCoverage: []}];
  invalid.topics.fixture ||= 'Fixture';
  mutate(invalid);
  assert.throws(() => validateContent(invalid), pattern);
};
rejects(value => delete value.publications[0].title, /publications\.json\[0\]\.title/);
rejects(value => value.publications[0].titel = 'Misspelled field', /unknown field/);
rejects(value => value.publications[0].topic = 'misspelled_topic', /must match a code/);
rejects(value => value.publications[0].year = '2090', /year.*number/);
rejects(value => value.publications[0].type = 'article', /type.*journal.*conference/);
rejects(value => value.publications[0].pressCoverage = [{label: 'News'}], /pressCoverage\[0\]\.url/);
rejects(value => value.publications.push(structuredClone(value.publications[0])), /duplicate paper/);
rejects(value => value.profile.email = 'not an address', /profile\.json\.email/);
rejects(value => value.profile.photo.src = 'images/../private.jpg', /photo\.src/);
rejects(value => value['site-meta'].lastUpdatedISO = 'tomorrow', /lastUpdatedISO/);
const rejectsImage = (mutate, pattern) => rejects(value => {value.publications[0].image = structuredClone(imageFixture); mutate(value.publications[0].image);}, pattern);
rejectsImage(image => image.src = '../private.jpg', /image\.src/);
rejectsImage(image => image.thumbnail = 'https://example.test/tracking.jpg', /image\.thumbnail/);
rejectsImage(image => image.src = 'images/papers/../private.jpg', /image\.src/);
rejectsImage(image => image.src = 'images/papers/file.svg', /image\.src/);
rejectsImage(image => delete image.caption, /image\.caption/);
rejectsImage(image => image.width = 0, /image\.width/);
rejectsImage(image => image.height = '480', /image\.height/);
rejectsImage(image => image.source = 'javascript:alert(1)', /image\.source/);
rejectsImage(image => image.source = 'links/source.pdf', /image\.source/);
rejectsImage(image => image.credit = 'Created for this review', /draft review wording/);
rejectsImage(image => image.caption = 'Local preview only', /draft review wording/);
rejectsImage(image => image.notes = 'Internal curator notes', /unknown field/);
for (const unsafe of ['javascript:alert(1)', 'data:text/html,hello', '//evil.test/', '../secret.pdf', 'https://example.test/a b', 'https://example.test/"quote"', 'links\\paper.pdf']) {
  assert.equal(isSafeURL(unsafe), false, `${unsafe} must not be accepted as a link`);
  rejects(value => value.publications[0].url = unsafe, /\.url/);
}
assert.ok(isSafeURL('links/paper.pdf'), 'Existing local publication resources remain supported');
assert.deepEqual(data, before, 'Validation and normalization do not mutate content');

const temporary = await mkdtemp(path.join(os.tmpdir(), 'romero-website-test-'));
try {
  const fixtureDirectory = path.join(temporary, 'image-fixtures');
  await assert.rejects(validateImageAssets({publications: [{image: imageFixture}]}, fixtureDirectory), /image\.src.*missing or empty/, 'A missing full image is caught before build replacement');
  // Existing files are copied byte-for-byte by the normal build; this isolated
  // fixture checks the references without touching a maintained image.
  const {mkdir} = await import('node:fs/promises');
  await mkdir(path.join(fixtureDirectory, 'images/papers'), {recursive: true});
  await writeFile(path.join(fixtureDirectory, imageFixture.src), 'source-image-fixture');
  await assert.rejects(validateImageAssets({publications: [{image: imageFixture}]}, fixtureDirectory), /image\.thumbnail.*missing or empty/, 'A missing thumbnail is caught');
  await writeFile(path.join(fixtureDirectory, imageFixture.thumbnail), '');
  await assert.rejects(validateImageAssets({publications: [{image: imageFixture}]}, fixtureDirectory), /image\.thumbnail.*missing or empty/, 'An empty image file is caught');
  await writeFile(path.join(fixtureDirectory, imageFixture.thumbnail), 'thumbnail-fixture');
  await validateImageAssets({publications: [{image: imageFixture}, {}]}, fixtureDirectory);
  await rm(fixtureDirectory, {recursive: true});
  const metadataBefore = await readFile(path.join(contentDirectory, 'site-meta.json'), 'utf8');
  const result = await build({output: temporary});
  const html = await readFile(path.join(temporary, 'index.html'), 'utf8');
  const app = await readFile(path.join(temporary, 'app.js'), 'utf8');
  const withoutScripts = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  assert.equal(result.publications, papers.length);
  assert.ok(!/\{\{[A-Z_]+\}\}/.test(html), 'Every template placeholder is resolved');
  assert.equal(countClass(withoutScripts, 'pub-entry'), papers.length, 'All papers are present without running JavaScript');
  assert.equal(countClass(withoutScripts, 'paper-thumbnail'), papers.filter(paper => paper.image).length, 'Every configured image appears without JavaScript');
  assert.equal(countResourceLinks(withoutScripts, 'pub-press'), expectedPress);
  for (const paper of papers) {
    assert.ok(withoutScripts.includes(escapeHTML(paper.title)), `Static HTML includes ${paper.title}`);
    assert.ok(withoutScripts.includes(escapeHTML(paper.authors)));
    assert.ok(withoutScripts.includes(escapeHTML(paper.venue)));
    assert.ok(withoutScripts.includes(`href="${escapeHTML(paper.url)}"`));
  }
  for (const person of [...data.people.current, ...data.people.alumni.flatMap(group => group.people)]) {
    assert.ok(withoutScripts.includes(escapeHTML(person.name)), `Static HTML includes ${person.name}`);
    assert.ok(withoutScripts.includes(escapeHTML(person.status)));
  }
  for (const group of data.teaching) for (const course of group.courses) {
    assert.ok(withoutScripts.includes(escapeHTML(course.title)));
    assert.ok(withoutScripts.includes(escapeHTML(course.offering)));
  }
  for (const item of data.service.editorial) for (const field of ['venue', 'years', 'role']) assert.ok(withoutScripts.includes(escapeHTML(item[field])));
  for (const committee of data.service.committees.items) assert.ok(withoutScripts.includes(escapeHTML(committee)));
  const namePosition = html.indexOf('id="name-heading"');
  const profilePosition = html.indexOf('<aside class="profile"');
  const biographyPosition = html.indexOf('<section class="biography bio"');
  assert.ok(namePosition >= 0 && profilePosition > namePosition && biographyPosition > profilePosition, 'Mobile reading order places the profile after the name and before the biography');
  let previousParagraph = biographyPosition;
  for (const paragraph of data.about) {
    const position = html.indexOf(`<p>${renderInline(paragraph)}</p>`);
    assert.ok(position > previousParagraph, 'Biography paragraphs retain their source order');
    previousParagraph = position;
  }
  assert.ok(html.includes(`datetime="${data['site-meta'].lastUpdatedISO}"`));
  assert.ok(!app.includes('new Date()'), 'The visible update timestamp is not based on a visitor clock');
  assert.equal(await readFile(path.join(contentDirectory, 'site-meta.json'), 'utf8'), metadataBefore, 'A regular build preserves the content timestamp');
  const assignment = app.match(/^window\.ACADEMIC_CONTENT = (.*);$/m);
  assert.ok(assignment, 'The browser bundle contains its generated content');
  assert.deepEqual(JSON.parse(assignment[1]), runtime, 'Static and interactive publication views share exactly the same generated data');
  assert.ok(!app.includes('fetch('), 'Opening the exported HTML does not depend on fetching JSON files');
  const roots = await readdir(temporary);
  assert.ok(['index.html', 'styles.css', 'app.js', 'images'].every(name => roots.includes(name)), 'The output contains the required standalone website assets');
  assert.ok((await readFile(path.join(temporary, data.profile.photo.src))).length > 0);
  const checkPublicFiles = async (directory, prefix = '') => {
    for (const entry of await readdir(directory, {withFileTypes: true})) {
      if (['.DS_Store', '.gitkeep'].includes(entry.name)) continue;
      const filename = `${prefix}${entry.name}`;
      if (entry.isDirectory()) await checkPublicFiles(path.join(directory, entry.name), `${filename}/`);
      else assert.deepEqual(await readFile(path.join(temporary, filename)), await readFile(path.join(directory, entry.name)), `public/${filename} is copied without changes`);
    }
  };
  await checkPublicFiles(path.join(project, 'public'));
  await writeFile(path.join(temporary, 'obsolete-generated-file.txt'), 'old output');
  await build({output: temporary});
  await assert.rejects(readFile(path.join(temporary, 'obsolete-generated-file.txt')), {code: 'ENOENT'}, 'A rebuild removes obsolete generated files');
  await assert.rejects(build({output: contentDirectory}), /separate from the source/, 'A mistaken output path cannot overwrite source content');
  await assert.rejects(build({output: project}), /separate from the source/);
} finally {
  await rm(temporary, {recursive: true, force: true});
}

console.log(`Passed content validation, future-paper maintenance, safe rendering, and standalone build checks for ${papers.length} current publications.`);
