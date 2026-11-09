import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {isSafeURL, inlineParts} from './content-utils.mjs';

const filenames = ['profile', 'about', 'publications', 'topics', 'people', 'service', 'teaching', 'site-meta'];
const fail = (field, reason) => { throw new Error(`${field}: ${reason}`); };
const object = (value, field, allowed) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(field, 'must be an object');
  for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(`${field}.${key}`, 'unknown field (check the spelling)');
};
const text = (value, field) => {
  if (typeof value !== 'string' || !value.trim()) fail(field, 'must be nonempty text');
};
const array = (value, field) => { if (!Array.isArray(value)) fail(field, 'must be a list'); };
const url = (value, field) => { if (!isSafeURL(value)) fail(field, 'must be an http(s) link or a relative file path'); };
const link = (value, field) => {
  object(value, field, ['label', 'url']); text(value.label, `${field}.label`); url(value.url, `${field}.url`);
};
const richText = (value, field) => {
  text(value, field);
  try { inlineParts(value); } catch (error) { fail(field, error.message); }
};

export function validateContent(data) {
  const p = data.profile;
  object(p, 'profile.json', ['name', 'role', 'institution', 'description', 'photo', 'affiliations', 'email', 'address', 'links']);
  for (const key of ['name', 'role', 'institution', 'description', 'email']) text(p[key], `profile.json.${key}`);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) fail('profile.json.email', 'must be an email address');
  object(p.photo, 'profile.json.photo', ['src', 'alt', 'width', 'height']);
  text(p.photo.alt, 'profile.json.photo.alt');
  if (!/^images\/[a-z\d_./-]+$/i.test(p.photo.src) || p.photo.src.split('/').includes('..')) fail('profile.json.photo.src', 'must be a path inside assets/images');
  for (const key of ['width', 'height']) if (!Number.isInteger(p.photo[key]) || p.photo[key] < 1) fail(`profile.json.photo.${key}`, 'must be a positive integer');
  array(p.affiliations, 'profile.json.affiliations');
  p.affiliations.forEach((a, i) => {
    const field = `profile.json.affiliations[${i}]`;
    object(a, field, ['label', 'url', 'note']); text(a.label, `${field}.label`); url(a.url, `${field}.url`);
    if (a.note !== undefined) text(a.note, `${field}.note`);
  });
  array(p.address, 'profile.json.address'); p.address.forEach((line, i) => text(line, `profile.json.address[${i}]`));
  object(p.links, 'profile.json.links', ['scholar', 'cv', 'social']);
  for (const key of ['scholar', 'cv']) link(p.links[key], `profile.json.links.${key}`);
  if (p.links.social !== undefined) link(p.links.social, 'profile.json.links.social');

  array(data.about, 'about.json'); data.about.forEach((para, i) => richText(para, `about.json[${i}]`));
  if (!data.topics || typeof data.topics !== 'object' || Array.isArray(data.topics)) fail('topics.json', 'must be an object of topic codes and labels');
  for (const [key, label] of Object.entries(data.topics)) {
    if (!/^[a-z][a-z0-9_]*$/.test(key)) fail(`topics.json.${key}`, 'use lowercase letters, numbers, and underscores');
    text(label, `topics.json.${key}`);
  }
  array(data.publications, 'publications.json');
  const seen = new Set();
  data.publications.forEach((paper, i) => {
    const field = `publications.json[${i}]`;
    object(paper, field, ['title', 'url', 'authors', 'venue', 'year', 'type', 'topic', 'resources', 'pressCoverage', 'keywords']);
    for (const key of ['title', 'authors', 'venue']) text(paper[key], `${field}.${key}`);
    url(paper.url, `${field}.url`);
    if (!Number.isInteger(paper.year) || paper.year < 1800 || paper.year > 2200) fail(`${field}.year`, 'must be a four-digit year entered as a number');
    if (!['journal', 'conference'].includes(paper.type)) fail(`${field}.type`, 'use "journal" or "conference"');
    if (!Object.hasOwn(data.topics, paper.topic)) fail(`${field}.topic`, 'must match a code in topics.json');
    for (const key of ['resources', 'pressCoverage']) {
      array(paper[key], `${field}.${key}`); paper[key].forEach((item, j) => link(item, `${field}.${key}[${j}]`));
    }
    if (paper.keywords !== undefined) {
      array(paper.keywords, `${field}.keywords`); paper.keywords.forEach((word, j) => text(word, `${field}.keywords[${j}]`));
    }
    const identity = `${paper.year}:${paper.title.trim().toLocaleLowerCase()}`;
    if (seen.has(identity)) fail(field, 'duplicate paper title and year');
    seen.add(identity);
  });

  const person = (value, field) => {
    object(value, field, ['name', 'url', 'status']); text(value.name, `${field}.name`); text(value.status, `${field}.status`);
    if (value.url !== undefined) url(value.url, `${field}.url`);
  };
  object(data.people, 'people.json', ['current', 'alumni']);
  array(data.people.current, 'people.json.current'); data.people.current.forEach((value, i) => person(value, `people.json.current[${i}]`));
  array(data.people.alumni, 'people.json.alumni'); data.people.alumni.forEach((group, i) => {
    const field = `people.json.alumni[${i}]`;
    object(group, field, ['heading', 'people']); text(group.heading, `${field}.heading`); array(group.people, `${field}.people`);
    group.people.forEach((value, j) => person(value, `${field}.people[${j}]`));
  });
  object(data.service, 'service.json', ['editorial', 'committees']);
  array(data.service.editorial, 'service.json.editorial'); data.service.editorial.forEach((item, i) => {
    const field = `service.json.editorial[${i}]`;
    object(item, field, ['venue', 'url', 'years', 'role']);
    for (const key of ['venue', 'years', 'role']) text(item[key], `${field}.${key}`);
    url(item.url, `${field}.url`);
  });
  object(data.service.committees, 'service.json.committees', ['note', 'items']);
  text(data.service.committees.note, 'service.json.committees.note'); array(data.service.committees.items, 'service.json.committees.items');
  data.service.committees.items.forEach((item, i) => text(item, `service.json.committees.items[${i}]`));
  array(data.teaching, 'teaching.json'); data.teaching.forEach((group, i) => {
    const field = `teaching.json[${i}]`;
    object(group, field, ['heading', 'courses']); richText(group.heading, `${field}.heading`); array(group.courses, `${field}.courses`);
    group.courses.forEach((course, j) => {
      const field = `teaching.json[${i}].courses[${j}]`;
      object(course, field, ['title', 'url', 'offering']); text(course.title, `${field}.title`); text(course.offering, `${field}.offering`);
      if (course.url !== undefined) url(course.url, `${field}.url`);
    });
  });
  object(data['site-meta'], 'site-meta.json', ['lastUpdatedISO']);
  const date = data['site-meta'].lastUpdatedISO;
  if (typeof date !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(date) || Number.isNaN(new Date(date).getTime())) fail('site-meta.json.lastUpdatedISO', 'must be a UTC date, such as 2026-11-09T01:08:36Z');
  return data;
}

export async function loadContent(directory) {
  const values = await Promise.all(filenames.map(async name => {
    try { return [name, JSON.parse(await readFile(path.join(directory, `${name}.json`), 'utf8'))]; }
    catch (error) { throw new Error(`${name}.json: ${error.message}`); }
  }));
  return validateContent(Object.fromEntries(values));
}

export function publicationData(data) {
  return {
    publications: data.publications.map(paper => {
      const links = [...paper.resources.map(item => ({...item, kind: 'resource'})), ...paper.pressCoverage.map(item => ({...item, kind: 'press'}))];
      return {
        title: paper.title, url: paper.url, authors: paper.authors, venue: paper.venue,
        year: String(paper.year), type: paper.type, topic: paper.topic, links,
        search: [paper.title, paper.authors, paper.venue, paper.year, data.topics[paper.topic], ...links.map(item => item.label), ...(paper.keywords || [])].join(' ')
      };
    }),
    topics: {...data.topics}
  };
}
