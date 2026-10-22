import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

// Keep the local preview unchanged; prepare a separate Pages artifact.
const base = process.env.PAGES_BASE_PATH || '/Bhojanic';
assert.match(base, /^\/[A-Za-z0-9_-]+$/, 'Expected a single repository base path');
const output = path.resolve('_site');
await fs.mkdir(output, { recursive: true });
await fs.cp('site', output, { recursive: true });
const manifest = JSON.parse(await fs.readFile('site/manifest.json', 'utf8'));
const notice = 'This preview does not send inquiries. Please email catering@bhojanic.com to contact the Bhojanic team.';
for (const route of manifest.pages) {
  const filename = path.join(output, route === '/' ? 'index.html' : route.slice(1), route === '/' ? '' : 'index.html');
  let html = await fs.readFile(filename, 'utf8');
  html = html.replace(/\b(href|src|srcset|action)="\/(?!\/)/g, `$1="${base}/`)
    .replace(/(,\s*)\/assets\//g, `$1${base}/assets/`);
  html = html.replace('<head>', '<head><meta name="deployment" content="github-pages">')
    .replace('<form class="inquiry-form" data-inquiry>', `<form class="inquiry-form" data-inquiry><p class="menu-note">${notice}</p>`);
  await fs.writeFile(filename, html);
  assert.ok(!/\b(?:href|src)="\/(?!\/|Bhojanic\/)/.test(html), `${route}: unprefixed local URL`);
}
const fonts = await fs.readFile(path.join(output, 'fonts.css'), 'utf8');
await fs.writeFile(path.join(output, 'fonts.css'), fonts.replaceAll('"/assets/', `"${base}/assets/`));
await fs.writeFile(path.join(output, '.nojekyll'), '');
// Developer-only review surfaces are not part of the published site.
await fs.rm(path.join(output, 'responsive-check.html'), { force: true });
console.log(`Prepared ${manifest.pages.length} pages for ${base}/`);
