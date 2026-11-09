# Maintaining the website

The website is live at [danielmromero.github.io](https://danielmromero.github.io/), with automatic publishing enabled from the repository's `master` branch.

For routine updates:

1. Open the appropriate file in [the repository's `content/` folder](https://github.com/danielmromero/danielmromero.github.io/tree/master/content).
2. Click the edit pencil and change the JSON content.
3. Commit the change to `master`.
4. Check [Actions](https://github.com/danielmromero/danielmromero.github.io/actions) for a successful **Build and publish website** run. The website updates after that run completes.

GitHub builds and checks the website before publishing it. The footer's **Last updated** date and time refresh automatically in Michigan's time zone; you do not need to edit the timestamp. A failed check leaves the previously published site in place.

The files in `content/` are the editable source. The build turns them into the finished page, including publication search and year/topic views. You do not need to edit HTML, CSS, or JavaScript for routine content changes.

| What you want to change | File to edit |
| --- | --- |
| Add or update a paper, resource, or press link | `content/publications.json` |
| Rename or add a research topic | `content/topics.json` |
| Change the three biography paragraphs | `content/about.json` |
| Change your name, affiliations, contact details, or profile links | `content/profile.json` |
| Update current students or alumni | `content/people.json` |
| Update editorial roles or program committees | `content/service.json` |
| Update courses | `content/teaching.json` |

The order of records controls the order within a section. Papers are automatically sorted newest first; papers from the same year keep their order in the file. Topic headings follow the order in `topics.json`.

## Add a paper

Open `content/publications.json` and copy an existing paper as a starting point. A complete example looks like this; replace the example content with your paper's details:

```json
{
  "title": "Your paper title",
  "url": "https://example.org/paper",
  "authors": "A. Author, B. Author, and D.M. Romero.",
  "venue": "Journal or conference name, volume and pages, 2027.",
  "year": 2027,
  "type": "journal",
  "topic": "online_platforms",
  "resources": [
    {"label": "PDF", "url": "https://example.org/paper.pdf"},
    {"label": "Data", "url": "https://example.org/data"}
  ],
  "pressCoverage": [
    {"label": "News outlet", "url": "https://example.org/news"}
  ]
}
```

- Use `journal` or `conference` for `type`.
- Choose a topic key from the left side of `topics.json`, such as `online_platforms`.
- Keep the publication year in both `year` and the displayed citation in `venue`.
- Use `[]` for `resources` or `pressCoverage` when there are no links. Press links receive the visible label “Press coverage.”
- You can add `"keywords": ["additional search term"]` when a useful term does not already appear in the title, authors, citation, or link labels. Search text is generated automatically.
- Put a comma between paper records. JSON uses double quotes and has no comma after the final item.

For a paper without extra links, the last two fields are simply:

```json
"resources": [],
"pressCoverage": []
```

## Update the other sections

The JSON files contain the existing content as examples. Add, remove, or edit records using the same structure.

- In `people.json`, each person has a `name`, a `status` such as `PhD Candidate`, and an optional `url`. The website adds parentheses around the status. Move the person's record from `current` to the appropriate alumni group when needed.
- In `teaching.json`, each group has a heading and a list of courses. Each course has a title, an offering description, and an optional URL.
- In `service.json`, edit editorial roles and the list of program committees.
- In `about.json`, each string is one paragraph. Keep them in the order you want them to appear. Add a link with `[linked words](https://example.org)`.
- Biography text and teaching headings support this simple link format. HTML tags are unnecessary.
- To replace the portrait, replace `assets/images/daniel.jpg` with the new image using the same filename. If you change its path or dimensions, update the corresponding portrait fields in `profile.json` too.

## Build and check on your computer

Use Node.js 24. This project has no external packages to install.

Open a terminal in this folder and run:

```sh
npm run build
npm test
```

The first command creates `dist/`. The checks validate the content and the generated website. If a check fails, its message identifies the file or field to fix; correct it and run the commands again.

GitHub handles the publication build and timestamp automatically. For a manually prepared release to another host, use:

```sh
npm run build:publish
npm test
```

The timestamp is fixed when the site is built for publication and displayed in Michigan's time zone. Ordinary builds preserve it, so opening the site does not change the date.

Use `dist/` for a local preview or for a manual upload to another host. It contains `index.html`, `styles.css`, `app.js`, and `images/daniel.jpg`, plus files copied from `public/`. Do not upload generated files to GitHub's `master` branch: the active workflow builds and publishes them from the source files.

The clean `current-website` folder is also a generated export for local preview or manual use elsewhere. Make content changes in this source project or directly in GitHub's `content/` files, then rebuild the export when you need it.

An optional output location can be used to refresh that export directly:

```sh
node scripts/build.mjs --out ../current-website
```

Use `--stamp` as well when preparing a newly dated release. The build replaces the generated output folder, removing obsolete files. Keep your editable files in this source project and any downloads in `public/`, rather than adding them directly to an output folder.

## Automatic publishing and downloadable files

GitHub Pages is configured to use **GitHub Actions**. The active workflow is `.github/workflows/pages.yml` in [danielmromero/danielmromero.github.io](https://github.com/danielmromero/danielmromero.github.io). Pull requests and other branches are checked, while only `master` is published. No one-time setup is needed for routine updates.

Automatic publishing uses GitHub's built-in workflow credentials; it does not require a personal access token. Each publication build sets the footer timestamp. That generated timestamp change stays in the workflow run and does not create an extra commit. Opening the website does not change the date.

Keep downloads and crawler settings in `public/`. The build copies that folder into the finished site's root, preserving public URLs. The existing paper and crawler files are already preserved here:

- `public/links/Participation_After_Shocks_on_Wikipedia.pdf` is published at `/links/Participation_After_Shocks_on_Wikipedia.pdf`.
- `public/robots.txt` and `public/links/robots.txt` retain their corresponding website paths.

Put any new downloadable files in `public/` too, keeping the subfolders you want in their URLs. The portrait's source is `assets/images/daniel.jpg`; the build publishes it at `/images/daniel.jpg`.

## Project structure

```text
content/          Your editable website content
assets/           The portrait, styles, and interactive behavior
templates/        Page layout
scripts/          Builder and checks
public/           Existing downloads and other files copied unchanged
.github/workflows/pages.yml   Automatic GitHub build and publication
dist/             Generated website, recreated by the build
```

The design lives in `templates/` and `assets/`. The content files are the single source for the static page and the interactive publication list, so a paper only needs to be entered once.
