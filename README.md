# Maintaining the website

Edit the files in `content/` to update the website. The build turns them into the finished page, including the publication search and year/topic views. You do not need to edit `index.html`, CSS, or JavaScript for routine content changes.

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

To set the footer's “Last updated” timestamp when preparing a publication, use:

```sh
npm run build:publish
npm test
```

The timestamp is fixed when the site is built for publication and displayed in Michigan's time zone. Ordinary builds preserve it, so opening the site does not change the date.

For a manual upload, upload the **contents** of `dist/` to the website repository's publishing location. The generated site consists of `index.html`, `styles.css`, `app.js`, and `images/daniel.jpg`, plus any files you have placed in `public/`. These generated files are also what belongs in the clean `current-website` export folder; make your future edits in this source project.

An optional output location can be used to refresh that export directly:

```sh
node scripts/build.mjs --out ../current-website
```

Use `--stamp` as well when preparing a newly dated release. The build replaces the generated output folder, removing obsolete files. Keep your editable files in this source project and any downloads in `public/`, rather than adding them directly to an output folder.

## Set up automatic publishing on GitHub once

The workflow in `.github/workflows/pages.yml` is prepared locally for [danielmromero/danielmromero.github.io](https://github.com/danielmromero/danielmromero.github.io). Its current default branch is `master`. It becomes active after this source project is added to that repository and GitHub Pages is set to use it.

1. The existing PDF and both `robots.txt` files have already been preserved in `public/`. Keep them there. If you add other downloadable files or a `CNAME` later, put them in `public/`, keeping their names and subfolders. The build copies these into the finished site's root, preserving their URLs. Keep any existing custom-domain setting when changing the publishing method.
2. Add the **contents of this source project** to the root of the website repository. Include `content/`, `templates/`, `assets/`, `scripts/`, `public/` when it contains files, `package.json`, and the hidden `.github/` folder containing the workflow. Include `.gitignore` too. Do not upload a surrounding `website-source/` folder or copy local `.git/` metadata into GitHub.
3. In the repository, open **Settings → Pages** and select **GitHub Actions** as the source. Keep the existing custom-domain setting if you have one.
4. Save the source files to the repository's default branch. In **Actions**, check that “Build and publish website” succeeds. If needed, select that workflow and use **Run workflow** on the default branch for the first publication.

After setup, routine updates can be made directly on GitHub: open the appropriate JSON file, click the edit pencil, make the change, and commit it. GitHub builds and checks the site before publishing it. A failed check leaves the previously published site in place. Pull requests and other branches are checked, but only the default branch is published.

Automatic publishing uses GitHub's built-in workflow credentials; it does not require a personal access token. The workflow sets the footer timestamp for each publication. The build's timestamp change stays in that workflow run; it does not create an extra commit.

The existing repository contains `links/Participation_After_Shocks_on_Wikipedia.pdf` (407,418 bytes), `links/robots.txt`, and the root `robots.txt`; preserve these files at the same website paths. Its `images/daniel.jpg` is the same portrait already included in this source project. No root `CNAME` file was present when the repository was inspected.

GitHub documents the setup in [Using custom workflows with GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

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
