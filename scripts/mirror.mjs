import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const origin = 'https://www.bhojanic.com';
const siteHosts = new Set(['www.bhojanic.com', 'bhojanic.com', 'archna-becker.squarespace.com']);
const routeOrigins = new Map();
const out = path.resolve('reference-site');
await fs.mkdir(path.join(out, 'assets'), { recursive: true });
const savedPages = process.argv.includes('--rebuild') ? JSON.parse(await fs.readFile(path.join(out, 'pages-source.json'), 'utf8')) : {};
const pages = new Map(Object.entries(savedPages));
const queue = process.argv.includes('--rebuild') ? [] : ['/home-page', '/'];
const failures = [];
const decode = s => s.replace(/&amp;/g, '&');
async function download(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
      if (!response.ok && !(response.status === 401 && url.endsWith('/class-recipes'))) throw new Error(`${response.status} ${url}`);
      return { bytes: Buffer.from(await response.arrayBuffer()), type: response.headers.get('content-type') || '' };
    } catch (error) { if (attempt === 2) throw error; }
  }
}
while (queue.length) {
  const batch = queue.splice(0, 6).filter(p => !pages.has(p));
  await Promise.all(batch.map(async route => {
    pages.set(route, null);
    try {
      const { bytes, type } = await download((routeOrigins.get(route) || origin) + route);
      if (!type.includes('text/html')) { pages.delete(route); return; }
      const html = bytes.toString('utf8');
      pages.set(route, html);
      for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi)) {
        const url = new URL(decode(match[1]), origin + route);
        if (!siteHosts.has(url.hostname) || url.search || /\.(pdf|jpg|png|zip|docx?)$/i.test(url.pathname)) continue;
        if (/^\/(?:s\/|api\/|universal\/|config|cart|account|search)/.test(url.pathname)) continue;
        const next = url.pathname.replace(/\/$/, '') || '/';
        if (!pages.has(next) && !queue.includes(next) && pages.size + queue.length < 90) { queue.push(next); routeOrigins.set(next, url.origin); }
      }
      console.log(`PAGE ${route} (${bytes.length})`);
    } catch (error) { failures.push({ url: origin + route, error: error.message }); console.log(`FAILED ${route}: ${error.message}`); }
  }));
}
await fs.writeFile(path.join(out, 'pages-source.json'), JSON.stringify(Object.fromEntries(pages), null, 2));
console.log(`Found ${pages.size} pages`);
if (process.argv.includes('--pages-only')) process.exit(0);

const assets = new Map();
function assetUrl(raw, base = origin) {
  if (!raw || raw.startsWith('#') || /^(data:|mailto:|tel:|javascript:)/i.test(raw)) return null;
  try {
    const url = new URL(decode(raw), base);
    if (!['https:', 'http:'].includes(url.protocol)) return null;
    if (/googletagmanager|google-analytics|facebook\.net/.test(url.hostname)) return null;
    url.hash = '';
    return url.href;
  } catch { return null; }
}
function register(raw, base) {
  const url = assetUrl(raw, base);
  if (!url) return null;
  if (siteHosts.has(new URL(url).hostname) && pages.has(new URL(url).pathname)) return null;
  if (!assets.has(url)) {
    const u = new URL(url);
    let ext = path.extname(u.pathname).toLowerCase();
    if (!/^\.[a-z0-9]{1,5}$/.test(ext)) ext = /site\.js/.test(u.search) ? '.js' : '.bin';
    const file = 'assets/' + crypto.createHash('sha256').update(url).digest('hex').slice(0, 20) + ext;
    assets.set(url, { file, downloaded: false });
  }
  return assets.get(url).file;
}
for (const html of pages.values()) {
  if (!html) continue;
  for (const m of html.matchAll(/<(?:img|script|link|source|video|audio|use)\b[^>]*>/gi)) {
    const tag = m[0];
    if (/^<link/i.test(tag) && !/rel=["'](?:stylesheet|icon|shortcut icon)/i.test(tag)) continue;
    for (const a of tag.matchAll(/(?:src|data-src|href|xlink:href|poster)=["']([^"']+)["']/gi)) register(a[1]);
    for (const a of tag.matchAll(/srcset=["']([^"']+)["']/gi)) for (const item of a[1].split(',')) register(item.trim().split(/\s+/)[0]);
  }
  for (const m of html.matchAll(/url\(["']?([^\s)'"<>]+)["']?\)/g)) register(m[1]);
  // Squarespace's lazy loaded images and downloadable menus.
  for (const m of html.matchAll(/(?:data-image|data-image-focal-point-src)=["']([^"']+)["']/g)) register(m[1]);
  for (const m of html.matchAll(/href=["']([^"']+\.(?:pdf|docx?)(?:\?[^"']*)?)["']/gi)) register(m[1]);
}
let pass = 0;
while ([...assets.values()].some(a => !a.downloaded) && pass++ < 8) {
  const pending = [...assets].filter(([, a]) => !a.downloaded);
  for (let i = 0; i < pending.length; i += 10) {
    await Promise.all(pending.slice(i, i + 10).map(async ([url, asset]) => {
      asset.downloaded = true;
      try {
        const dest = path.join(out, asset.file);
        let bytes;
        const cacheFile = path.resolve('.mirror-cache', path.basename(asset.file));
        await fs.mkdir(path.dirname(cacheFile), { recursive: true });
        try { bytes = await fs.readFile(cacheFile); } catch {
          if (!asset.file.endsWith('.css')) { try { bytes = await fs.readFile(dest); } catch {} }
          if (!bytes) bytes = (await download(url)).bytes;
          await fs.writeFile(cacheFile, bytes);
        }
        if (asset.file.endsWith('.css')) {
          let css = bytes.toString('utf8');
          css = css.replace(/url\(\s*(["']?)([^)'"\s]+)\1\s*\)/gi, (full, q, raw) => {
            if (/^(data:|#)/.test(raw)) return full;
            const target = register(raw, url);
            return target ? `url("${path.posix.basename(target)}")` : full;
          });
          css = css.replace(/@import\s+["']([^"']+)["']/g, (full, raw) => {
            const target = register(raw, url);
            return target ? `@import "${path.posix.basename(target)}"` : full;
          });
          bytes = Buffer.from(css);
        }
        await fs.writeFile(dest, bytes);
      } catch (error) { asset.failed = true; failures.push({ url, error: error.message }); }
    }));
    console.log(`ASSETS pass ${pass}: ${Math.min(i + 10, pending.length)}/${pending.length}`);
  }
}
function localize(raw) {
  if (raw.startsWith('#')) return raw;
  const url = assetUrl(raw);
  const asset = assets.get(url);
  if (asset && !asset.failed) return '/' + asset.file + (raw.includes('#') ? '#' + raw.split('#')[1] : '');
  try {
    const u = new URL(decode(raw), origin);
    const route = u.pathname.replace(/\/$/, '') || '/';
    if (siteHosts.has(u.hostname) && pages.get(route)) return u.pathname + u.search + u.hash;
  } catch {}
  return raw;
}
for (const [route, original] of pages) {
  if (!original) continue;
  let html = original.replace(/<script\b[^>]*src=["'][^"']*(?:googletagmanager|google-analytics)[\s\S]*?<\/script>/gi, '');
  // Runtime module definitions must use the same URLs as the script tags, to
  // prevent Squarespace from loading a second copy of an already loaded module.
  for (const [url, asset] of [...assets].sort((a, b) => b[0].length - a[0].length)) {
    if (asset.failed) continue;
    const local = '/' + asset.file;
    html = html.split(url).join(local).split(url.replace(/^https?:/, '')).join(local);
  }
  html = html.replace(/((?:src|data-src|data-image|href|xlink:href|poster)=)(["'])([^"']+)\2/g, (full, attr, quote, raw) => attr + quote + localize(raw) + quote);
  html = html.replace(/(srcset=)(["'])([^"']+)\2/g, (full, attr, quote, raw) => attr + quote + raw.split(',').map(item => { const [url, size] = item.trim().split(/\s+/); return localize(url) + (size ? ' ' + size : ''); }).join(', ') + quote);
  html = html.replace(/url\(["']?([^\s)'"<>]+)["']?\)/g, (full, raw) => `url("${localize(raw)}")`);
  html = html.replace('</head>', '<link rel="stylesheet" href="/replica.css"></head>');
  html = html.replace('</body>', '<script src="/replica.js" defer></script></body>');
  const dest = path.join(out, route === '/' ? 'index.html' : route.slice(1) + '/index.html');
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, html);
}
await fs.writeFile(path.join(out, 'manifest.json'), JSON.stringify({ origin, captured: new Date().toISOString(), pages: [...pages].filter(([,h]) => h).map(([p]) => p), assets: Object.fromEntries(assets), failures }, null, 2));
console.log(`DONE: ${pages.size} pages, ${assets.size} assets, ${failures.length} failures`);
