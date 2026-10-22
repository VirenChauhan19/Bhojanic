import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve('site');
const manifest = JSON.parse(await fs.readFile(path.join(root, 'manifest.json'), 'utf8'));
const failures = [];
let references = 0;
// Brunch uses h3 station headings and bullet paragraphs in the source.
// Its introduction must not swallow and duplicate the station content.
const brunch = await fs.readFile(path.join(root, 'american-menu/index.html'), 'utf8');
assert.equal((brunch.match(/class="menu-section"/g) || []).length, 6, 'Brunch has six stations');
assert.equal((brunch.match(/<li>/g) || []).length, 23, 'All 23 brunch selections are rendered as dishes');
assert.equal((brunch.match(/Minimum Guest Count - 50/g) || []).length, 1, 'Guest minimum appears once');
assert.equal((brunch.match(/Mini Aloo Tikki Benedict/g) || []).length, 1, 'Brunch dishes are not duplicated');
assert.ok(!brunch.includes('The menu 1'), 'No placeholder brunch section');
const mediterranean = await fs.readFile(path.join(root, 'mediterranean-menu/index.html'), 'utf8');
const mediterraneanNote = mediterranean.match(/<div class="menu-note">([\s\S]*?)<\/div>/)?.[1] || '';
assert.ok(!mediterraneanNote.includes('<li>'), 'Mediterranean dishes stay out of the intro note');
const mediterraneanIds = [...mediterranean.matchAll(/<section class="menu-section" id="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(mediterraneanIds).size, mediterraneanIds.length, 'Repeated sample-menu categories have unique anchors');
for (const route of manifest.pages) {
  const filename = path.join(root, route === '/' ? 'index.html' : route.slice(1) + '/index.html');
  const html = await fs.readFile(filename, 'utf8');
  assert.match(html, /<title>.+<\/title>/s, `${route} has a title`);
  for (const match of html.matchAll(/\b(?:src|href|data-src|xlink:href)=["'](\/[^"']*)["']/g)) {
    if (match[1].startsWith('//')) continue;
    const url = new URL(match[1].replace(/&amp;/g, '&'), 'http://localhost');
    let target = path.resolve(root, '.' + decodeURIComponent(url.pathname));
    try {
      const stat = await fs.stat(target);
      if (stat.isDirectory()) target = path.join(target, 'index.html');
      await fs.access(target);
      references++;
    } catch { failures.push(`${route}: ${match[1]}`); }
  }
}
for (const [url, asset] of Object.entries(manifest.assets)) {
  if (asset.failed) failures.push(`Download failed: ${url}`);
  else {
    const filename = path.join(root, asset.file);
    assert.ok((await fs.stat(filename)).size > 0, `${asset.file} is nonempty`);
    if (filename.endsWith('.css')) {
      const css = await fs.readFile(filename, 'utf8');
      for (const match of css.matchAll(/url\(["']?([^\s)'"<>]+)["']?\)/g)) {
        if (/^(?:data:|https?:|\/\/|#)/.test(match[1])) continue;
        try { await fs.access(path.resolve(path.dirname(filename), match[1].split(/[?#]/)[0])); references++; }
        catch { failures.push(`${asset.file}: ${match[1]}`); }
      }
    }
  }
}
assert.deepEqual(failures, [], 'Every internal page and asset reference must resolve');
assert.deepEqual(manifest.failures, [], 'No failed downloads');
console.log(`PASS: ${manifest.pages.length} pages, ${Object.keys(manifest.assets).length} assets, ${references} local references.`);

const base = process.env.CHECK_URL || 'http://localhost:3000';
const results = await Promise.all(manifest.pages.map(async route => {
  const response = await fetch(base + route);
  assert.equal(response.status, 200, `${route} HTTP status`);
  assert.match(response.headers.get('content-type'), /text\/html/);
}));
console.log(`PASS: all ${results.length} routes return HTML successfully.`);
