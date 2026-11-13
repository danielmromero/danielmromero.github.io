import {readFile, writeFile, mkdir, cp, readdir, stat, lstat, mkdtemp, rename, rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import path from 'node:path';
import {loadContent, publicationData} from './content.mjs';
import {escapeHTML, renderInline} from './content-utils.mjs';
import {renderProfile} from './render-profile.mjs';
import {renderPeople, renderService, renderTeaching} from './render-sections.mjs';

export const projectDirectory = fileURLToPath(new URL('../', import.meta.url));
const {renderResults} = createRequire(import.meta.url)('../assets/scripts/publication-renderer.js');

/** Check image references before replacing a working build with a new release. */
export async function validateImageAssets(data, publicDirectory) {
  for (const [index, paper] of data.publications.entries()) {
    if (!paper.image) continue;
    for (const key of ['src', 'thumbnail']) {
      const filename = paper.image[key];
      try {
        const info = await stat(path.join(publicDirectory, filename));
        if (!info.isFile() || info.size === 0) throw new Error('not a nonempty file');
      } catch (error) {
        throw new Error(`publications.json[${index}].image.${key}: image is missing or empty: public/${filename}`);
      }
    }
  }
}

export async function build({output = path.join(projectDirectory, 'dist'), stamp = false} = {}) {
  const out = path.resolve(output);
  const protectedDirectories = ['content', 'templates', 'scripts', 'assets', 'public', '.git', '.openai'].map(name => path.join(projectDirectory, name));
  if (out === projectDirectory || projectDirectory.startsWith(`${out}${path.sep}`) || protectedDirectories.some(dir => out === dir || out.startsWith(`${dir}${path.sep}`))) {
    throw new Error('Choose an output folder separate from the source files.');
  }
  let existingOutput = false;
  try {
    const info = await lstat(out);
    if (!info.isDirectory() || info.isSymbolicLink()) throw new Error('The output must be a regular folder, not a file or symbolic link.');
    const names = await readdir(out);
    if (names.some(name => ['.git', 'content', 'package.json', 'templates', 'scripts'].includes(name))) throw new Error('The output folder contains source files; choose a generated website folder instead.');
    if (names.some(name => name !== '.DS_Store')) {
      const previousHTML = await readFile(path.join(out, 'index.html'), 'utf8').catch(() => '');
      if (!previousHTML.includes('data-content="publications"') || !previousHTML.includes('class="back-to-top"')) throw new Error('The output folder is not a generated copy of this website. Choose a new or empty folder.');
    }
    existingOutput = true;
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const data = await loadContent(path.join(projectDirectory, 'content'));
  if (stamp) data['site-meta'].lastUpdatedISO = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const iso = data['site-meta'].lastUpdatedISO;
  const label = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Detroit', year: 'numeric', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
  }).format(new Date(iso));
  const runtime = publicationData(data);
  const resultsId = 'publication-results-1';
  const replacements = {
    NAME: escapeHTML(data.profile.name), INSTITUTION: escapeHTML(data.profile.institution),
    DESCRIPTION: escapeHTML(data.profile.description), CV_URL: escapeHTML(data.profile.links.cv.url), SCHOLAR_URL: escapeHTML(data.profile.links.scholar.url),
    PROFILE_IMAGE_URL: escapeHTML(new URL(data.profile.photo.src, 'https://dromero.org/').href), PROFILE_IMAGE_ALT: escapeHTML(data.profile.photo.alt),
    PROFILE: renderProfile(data.profile), ABOUT: data.about.map(para => `<p>${renderInline(para)}</p>`).join('\n'),
    PUBLICATIONS: `<p class="pub-count">Newest first</p><div class="pub-results" id="${resultsId}" data-view="year">${renderResults(runtime.publications, {view: 'year', topics: runtime.topics, resultsId})}</div>`,
    STUDENTS: renderPeople(data.people), PROFESSIONAL_SERVICE: renderService(data.service), TEACHING: renderTeaching(data.teaching),
    LAST_UPDATED_ISO: escapeHTML(iso), LAST_UPDATED_LABEL: escapeHTML(label)
  };
  const template = await readFile(path.join(projectDirectory, 'templates/index.html'), 'utf8');
  const html = template.replace(/\{\{([A-Z_]+)\}\}/g, (_, token) => {
    if (!Object.hasOwn(replacements, token)) throw new Error(`Unknown template token: ${token}`);
    return replacements[token];
  });
  for (const token of Object.keys(replacements)) if (!template.includes(`{{${token}}}`)) throw new Error(`Missing template token: ${token}`);
  const scripts = await Promise.all(['publication-renderer.js', 'publications-enhance.js', 'publication-images.js', 'collegiate.js'].map(name => readFile(path.join(projectDirectory, 'assets/scripts', name), 'utf8')));
  // Escape '<' in serialized data, so a title containing '</script>' is safe even if bundled inline later.
  const app = [`window.ACADEMIC_CONTENT = ${JSON.stringify(runtime).replace(/</g, '\\u003c')};`, ...scripts].join('\n;\n');
  const publicDirectory = path.join(projectDirectory, 'public');
  const reserved = new Set(['index.html', 'styles.css', 'app.js', data.profile.photo.src]);
  async function inspectPublic(directory, prefix = '') {
    for (const entry of await readdir(directory, {withFileTypes: true})) {
      if (entry.name === '.DS_Store' || entry.name === '.gitkeep') continue;
      const name = `${prefix}${entry.name}`;
      if (entry.isSymbolicLink()) throw new Error(`public/${name}: symbolic links are not supported`);
      if (reserved.has(name) || [...reserved].some(file => file.startsWith(`${name}/`) && !entry.isDirectory())) throw new Error(`public/${name}: conflicts with a generated website file`);
      if (entry.isDirectory()) await inspectPublic(path.join(directory, entry.name), `${name}/`);
    }
  }
  await inspectPublic(publicDirectory);
  await validateImageAssets(data, publicDirectory);
  const photoSource = path.join(projectDirectory, 'assets', data.profile.photo.src);
  if (!(await stat(photoSource)).isFile()) throw new Error(`Photo is missing: assets/${data.profile.photo.src}`);
  // Prepare a fresh output first. Removed source assets cannot linger in a later release.
  await mkdir(path.dirname(out), {recursive: true});
  const staging = await mkdtemp(path.join(path.dirname(out), '.website-build-'));
  const backup = `${staging}-previous`;
  try {
    await mkdir(path.join(staging, path.dirname(data.profile.photo.src)), {recursive: true});
    await cp(publicDirectory, staging, {recursive: true, filter: source => !['.DS_Store', '.gitkeep'].includes(path.basename(source))});
    await Promise.all([
      writeFile(path.join(staging, 'index.html'), html), writeFile(path.join(staging, 'app.js'), app),
      cp(path.join(projectDirectory, 'assets/styles.css'), path.join(staging, 'styles.css')),
      cp(photoSource, path.join(staging, data.profile.photo.src))
    ]);
    if (existingOutput) await rename(out, backup);
    try { await rename(staging, out); }
    catch (error) { if (existingOutput) await rename(backup, out); throw error; }
    if (existingOutput) await rm(backup, {recursive: true});
  } finally { await rm(staging, {recursive: true, force: true}); }
  if (stamp) await writeFile(path.join(projectDirectory, 'content/site-meta.json'), `${JSON.stringify(data['site-meta'], null, 2)}\n`);
  return {output: out, publications: runtime.publications.length, lastUpdated: label};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    let output;
    let stamp = false;
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--stamp') stamp = true;
      else if (args[i] === '--out' && args[i + 1]) output = path.resolve(args[++i]);
      else throw new Error('Usage: node scripts/build.mjs [--stamp] [--out folder]');
    }
    const result = await build({output, stamp});
    console.log(`Built ${result.publications} publications and all sections in ${result.output}.`);
    console.log(`Last updated: ${result.lastUpdated}.`);
  } catch (error) { console.error(`Build failed: ${error.message}`); process.exitCode = 1; }
}
