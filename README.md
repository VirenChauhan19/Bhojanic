# Bhojanic — Indian & global catering

A responsive, food-first redesign of Bhojanic with editorial typography, white, the original site's exact beige (`#FFF2E6`), orange accents, and neutral gray text. A single panoramic food photograph opens the home page, followed by a catering index, menu directory, founder story, travel feature, and Curry Jam archive. The original public menu content, chef biography, culinary journeys, and event pages are retained.

## Preview

Public website: https://VirenChauhan19.github.io/Bhojanic/

Deployment status: https://github.com/VirenChauhan19/Bhojanic/actions/workflows/deploy-pages.yml

GitHub Actions publishes `main` using `npm run build:pages`. This generates a separate `_site/` artifact with repository-prefixed links. GitHub Pages is a static preview: its forms do not send or store inquiries and display an explicit email-contact notice.

Requires Node.js 20 or newer. No dependency installation is needed.

```sh
npm start
```

In Windows PowerShell, use `npm.cmd start` if script execution policy blocks `npm`.

Open http://localhost:3000 or http://localhost:3000/home-page.

For a side-by-side phone, tablet, and desktop review, open http://localhost:3000/responsive-check.html. The phone preview can switch between 320, 390, and 430 pixels.

## Included

23 routes: the original 21 destinations plus a dedicated menu directory and chef story page. Both `/` and `/home-page` show the redesigned home page.

The layout reorganizes for phones, tablets, laptops, and larger desktops. Navigation changes to an animated, keyboard-accessible mobile menu. Menus have live dish search, section navigation, and horizontally scrollable cuisine tabs. Galleries support touch scrolling and a native lightbox with keyboard controls.

Motion includes restrained image and section reveals, a seamless scrolling flavor ribbon with pause/resume controls, animated navigation, subtle link feedback, and cross-page transitions. The opening photograph is stable, without floating or pointer movement. The system honors `prefers-reduced-motion` by default; the footer lets visitors explicitly enable animations or reduce motion, and remembers that choice. Photos use available local responsive variants; below-the-fold images load lazily. The redesigned pages do not depend on the Squarespace browser runtime.

## Editing and building

- `site/design.css`: design tokens, layouts, breakpoints, and motion.
- `site/brand.css`: the orange/white/beige styling and seamless scrolling ribbon.
- `site/editorial.css`: the current editorial layout, typography, and responsive refinements.
- `site/design.js`: navigation, reveals, gallery controls, menu search, and forms.
- `scripts/build-design.mjs`: shared layouts and page templates.
- `scripts/editorial-home.mjs`: current home page and shared footer templates.
- `content/pages.json`: extracted original content, images, and form definitions.
- `site/assets/`: original downloaded photography, fonts, and documents.

Rebuild generated HTML after changing a template or content:

```sh
npm run build
```

CSS and JavaScript edits only need a browser refresh. The pre-existing root `index.html` and `styles.css` remain available as earlier reference files; the server serves `site/`.

## Verification

With the preview running:

```sh
npm run check
```

This checks all 23 page routes, internal links, local asset references, and downloads. Browser checks also covered phone/tablet/desktop layouts, the 320-pixel compact layout, mobile navigation, menu search and empty results, gallery next/previous/Escape behavior, form validation, and a local sample submission.

## Service boundaries

- The external YouTube embed still requires internet access. Layout, fonts, photography, and interactions are served locally.
- Contact and culinary journey forms save inquiries to the local, git-ignored `data/inquiries.jsonl` file. They do not email Bhojanic or submit to its production account. The confirmation explains this.
- Cooking-class recipes remain password protected on the original site. The redesigned collection page links to the original for authorized access.
- Social links, partner sites, email links, and external videos retain their original destinations.

`npm run mirror` can capture a fresh copy of the original reference into `reference-site/` with network access. It does not overwrite the redesign. Content changes for the redesign belong in `content/pages.json` and its templates.
