import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { renderHome, renderFooter } from './editorial-home.mjs';

const root = path.resolve('site');
const assetVersions = await Promise.all(['fonts.css','design.css','brand.css','editorial.css','design.js'].map(async file => [file,createHash('sha256').update(await fs.readFile(path.join(root,file))).digest('hex').slice(0,12)]));
const manifest = JSON.parse(await fs.readFile(path.join(root, 'manifest.json'), 'utf8'));
const arrow = '<span aria-hidden="true">↗</span>';
const star = '<svg class="flower" viewBox="0 0 80 80" fill="none" aria-hidden="true"><path d="M40 5c4 21 7 24 21 10-9 19-8 23 14 25-22 4-25 7-10 22-20-9-23-8-25 13-4-22-7-25-22-10 9-20 8-23-13-25 21-4 24-7 10-22 19 9 23 8 25-13Z" stroke="currentColor" stroke-width="2"/></svg>';
const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const decode = s => s.replace(/&quot;/g,'"').replace(/&#123;/g,'{').replace(/&#125;/g,'}').replace(/&amp;/g,'&').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&mdash;/g,'—').replace(/&ndash;/g,'–').replace(/&nbsp;/g,' ').replace(/&hellip;/g,'…').replace(/&rsquo;/g,'’').replace(/&lsquo;/g,'‘').replace(/&ldquo;/g,'“').replace(/&rdquo;/g,'”');
const text = s => decode(s.replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();
const slug = s => text(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const asset = name => {
  const normalized = name.replace(/\+/g,' ');
  const entry = Object.entries(manifest.assets).find(([url])=>decodeURIComponent(url).replace(/\+/g,' ').includes(normalized) && !url.includes('?'));
  if (!entry) throw new Error(`Missing image asset: ${name}`);
  return '/' + entry[1].file;
};
const image = { food:asset('BhojanicCatering_Image2.webp'), plated:asset('elegant-appetizers'), meal:asset('iStock-874481424.webp'), close:asset('indian+food.webp'), chef:asset('Bhojanic_Archna_Headshot.jpg'), oldChef:asset('image-asset.png'), india:asset('India+Photo+(1).jpg'), logo:'/assets/256845759e07b559909d.png' };
function localUrl(raw) {
  raw=decode(raw);
  if (/^(#|mailto:|tel:|data:)/.test(raw)) return raw;
  try {
    const u=new URL(raw,'https://www.bhojanic.com'); const hash=u.hash;u.hash='';
    const a=manifest.assets[u.href]; if(a && !a.failed)return '/'+a.file+hash;
    if(['www.bhojanic.com','bhojanic.com','archna-becker.squarespace.com'].includes(u.hostname))return u.pathname+u.search+hash;
  }catch{}
  return raw;
}
function divAt(html, start) {
  const tags=/<\/?div\b[^>]*>/gi;tags.lastIndex=start;let depth=0,m;
  while((m=tags.exec(html))) {depth+=/^<\//.test(m[0])?-1:1;if(depth===0)return html.slice(start,tags.lastIndex);}
  return '';
}
function clean(html) {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/\s(?:style|class|id|data-[\w-]+)=("[^"]*"|'[^']*')/g,'').replace(/\shref=("([^"]*)"|'([^']*)')/g,(_,q,a,b)=>` href="${esc(localUrl(a||b))}"`).replace(/<p>\s*(?:<br\s*\/?>|&nbsp;|\s)*<\/p>/g,'').trim();
}
let content;
try { content=JSON.parse(await fs.readFile('content/pages.json','utf8')); }
catch {
  const source=JSON.parse(await fs.readFile(path.join(root,'pages-source.json'),'utf8'));content={};
  for(const [route,html] of Object.entries(source)) {
    if(!html)continue;
    const at=html.indexOf('id="page-');const main=at<0?'':divAt(html,html.lastIndexOf('<div',at));
    const blocks=[]; const matcher=/<div\b[^>]*class="[^"]*\bsqs-html-content\b[^"]*"[^>]*>/g;let m;
    while((m=matcher.exec(main))) {const block=divAt(main,m.index);blocks.push(clean(block.replace(/^<div[^>]*>|<\/div>$/g,'')));matcher.lastIndex=m.index+block.length;}
    const images=[];const seen=new Set();
    for(const tag of main.matchAll(/<img\b[^>]*>/g)) {
      const raw=tag[0].match(/(?:data-src|src)="([^"]+)"/)?.[1];if(!raw)continue;
      const url=new URL(decode(raw),'https://www.bhojanic.com');url.search='';
      if(seen.has(url.href))continue;seen.add(url.href);
      images.push({src:localUrl(url.href),alt:decode(tag[0].match(/alt="([^"]*)"/)?.[1]||'Bhojanic food and experiences')});
    }
    const forms=[...main.matchAll(/<script[^>]*class="sqs-form-block-context"[^>]*>([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]).formFields);
    const videos=[];
    for(const m of main.matchAll(/<iframe\b[^>]*src="([^"]+)"/g)) videos.push(m[1].replace('www.youtube.com/embed/','www.youtube-nocookie.com/embed/'));
    for(const tag of main.matchAll(/data-(?:html|block-json)="([^"]+)"/g)) {
      const value=decode(tag[1]); const v=value.match(/(?:youtube\.com\/embed\/|youtu\.be\/)([\w-]+)/)?.[1];if(v)videos.push('https://www.youtube-nocookie.com/embed/'+v);
      const vm=value.match(/player\.vimeo\.com\/video\/(\d+)/)?.[1];if(vm)videos.push('https://player.vimeo.com/video/'+vm);
    }
    content[route]={title:text(html.match(/<title>([\s\S]*?)<\/title>/)?.[1]||'Bhojanic').replace(/\s*[—–]\s*bhojanic$/i,''),blocks,images,forms,videos:[...new Set(videos)]};
  }
  const faces=[...source['/home-page'].matchAll(/@font-face\s*\{[^}]+\}/g)].map(m=>m[0].replace(/url\(['"]?([^)'"\s]+)['"]?\)/g,(_,u)=>`url("${localUrl(u)}")`)).join('\n');
  await fs.writeFile(path.join(root,'fonts.css'),faces);
  await fs.mkdir('content',{recursive:true}); await fs.writeFile('content/pages.json',JSON.stringify(content,null,2));
}

const cuisines=[['Indian','/full-catering-menu'],['Mediterranean','/mediterranean-menu'],['Brunch','/american-menu'],['Thai','/appetizers-bites'],['Mexican','/mexican-meniu'],['Corporate packages','/new-page-3']];
const isMenu=route=>cuisines.some(([,p])=>p===route);
const img=(src,alt,cls='',eager=false)=>{
 const entry=Object.entries(manifest.assets).find(([,a])=>'/'+a.file===src);
 const base=entry?.[0].split('?')[0];
 const variants=base?Object.entries(manifest.assets).filter(([u])=>u.split('?')[0]===base&&/[?&]format=\d+w/.test(u)).map(([u,a])=>`/${a.file} ${u.match(/format=(\d+)w/)[1]}w`):[];
 const responsive=variants.length?` srcset="${variants.join(', ')}" sizes="(max-width: 640px) calc(100vw - 46px), (max-width: 960px) 50vw, 650px"`:'';
 return `<img src="${src}"${responsive} alt="${esc(alt)}" class="${cls}" ${eager?'fetchpriority="high"':'loading="lazy"'} decoding="async">`;
};
const button=(href,label,cls='button')=>`<a class="${cls}" href="${href}"><span>${label}</span>${arrow}</a>`;
function header(route) {
  const active=(p)=>route===p?' aria-current="page"':'';
  return `<a class="skip-link" href="#main">Skip to content</a><header class="site-header"><div class="header-inner"><a class="brand" href="/home-page" aria-label="Bhojanic home">${img(image.logo,'Bhojanic','',true)}</a><nav class="desktop-nav" aria-label="Main navigation"><div class="nav-dropdown"><button class="nav-link" aria-expanded="false" aria-controls="cuisine-menu">Our menus <span class="chevron" aria-hidden="true">⌄</span></button><div class="dropdown-panel" id="cuisine-menu"><span class="eyebrow">A world of flavor</span>${cuisines.map(([name,p])=>`<a href="${p}"${active(p)}>${name}${arrow}</a>`).join('')}<a class="all-menus" href="/menus">Explore all menus ${arrow}</a></div></div><a href="/venuesandpartners"${active('/venuesandpartners')}>Catering & events</a><a href="/our-story"${active('/our-story')}>Our story</a><a href="/india-food-tour"${active('/india-food-tour')}>Culinary journeys</a></nav><div class="header-actions">${button('/catering-contact','Plan an event','button button-small')}<button class="mobile-toggle" aria-label="Open navigation" aria-expanded="false" aria-controls="mobile-navigation"><span></span><span></span></button></div></div></header><nav class="mobile-nav" id="mobile-navigation" aria-label="Mobile navigation" inert><span class="eyebrow">Bhojanic · Atlanta</span>${[['Explore our menus','/menus'],['Catering & events','/venuesandpartners'],['Our story','/our-story'],['Culinary journeys','/india-food-tour'],['Get in touch','/catering-contact']].map(([t,p],i)=>`<a href="${p}" style="--i:${i}"><span><small>0${i+1}</small>${t}</span>${arrow}</a>`).join('')}<div class="mobile-nav-bottom"><a href="tel:+14047937243">(404) 793-7243</a><a href="mailto:catering@bhojanic.com">catering@bhojanic.com</a></div></nav>`;
}
function footer() { return renderFooter({ image, img, button }); }
function menuCards() {
 return cuisines.map(([name,p],i)=>`<a class="cuisine-card" href="${p}" data-reveal><span class="cuisine-number">0${i+1}</span><h3>${name}</h3><span class="cuisine-description">${['Samosas, curries & tandoori cooking','Mezze, shawarma & fresh salads','Indian and American brunch stations','Thai catering favorites','Mexican catering for your gathering','Indian lunch packages for your team'][i]}</span><span class="round-arrow" aria-hidden="true">↗</span></a>`).join('');
}
function home() { return renderHome({ image, img, button, arrow, cuisines }); }
function pageIntro(eyebrow,title,description='',src='') {
 return `<section class="page-intro wrap ${src?'with-photo':''}"><div><a class="back-link" href="/home-page">← Back to the table</a><span class="eyebrow">${eyebrow}</span><h1>${title}</h1>${description?`<p>${description}</p>`:''}</div>${src?`<div class="page-intro-image">${img(src,text(title),'',true)}${star}</div>`:''}</section>`;
}
function menus() {return `<main id="main">${pageIntro('Bhojanic catering','The menus.','Indian at heart, with a world of cuisines to choose from. Explore the dishes, then talk to us about the menu for your event.',image.close)}<section class="wrap section menu-hub"><div class="cuisine-grid">${menuCards()}</div><div class="menu-help" data-reveal><h2>Not sure<br>where to start?</h2><p>Tell us your occasion and guest count. We’ll help you choose a menu and make room for dietary needs.</p>${button('/catering-contact','Ask about your menu')}</div></section></main>`;}
function menuPage(route,page) {
  let html=page.blocks.join('\n').replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi,'');
  // Some original menus use h3 stations instead of h2 categories. Keep the
  // introduction separate so the whole menu is not duplicated in the note.
  const allHeadings=[...html.matchAll(/<h[23]\b[^>]*>[\s\S]*?<\/h[23]>/gi)].filter(m=>!/^Minimum Guest Count/i.test(text(m[0])));
  // Mediterranean has h3 categories before an h2 sample-menu divider.
  const useSubheadings=allHeadings[0]?.[0].startsWith('<h3');
  const headings=useSubheadings?allHeadings:allHeadings.filter(m=>/^<h2\b/i.test(m[0]));
  const intro=headings.length?html.slice(0,headings[0].index):html;
  const parts=headings.map((heading,i)=>html.slice(heading.index,headings[i+1]?.index??html.length));
  const sectionIds=new Map();
  const sections=parts.map((part,i)=>{
    const heading=part.match(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/i);let title=text(heading?.[1]||`The menu ${i+1}`).replace(/:$/,'');if(title===title.toUpperCase())title=title[0]+title.slice(1).toLowerCase();
    if(/Accomplainments/i.test(title))title='Accompaniments';
    let body=heading?part.replace(heading[0],''):part;
    // Turn pasted bullet paragraphs into real, searchable dish lists.
    body=body.replace(/(?:<p\b[^>]*>\s*•[\s\S]*?<\/p>\s*)+/gi,group=>{
      const dishes=[...group.matchAll(/<p\b[^>]*>\s*•\s*([\s\S]*?)<\/p>/gi)].map(([,dish])=>{
        const divider=dish.search(/\s[–—]\s/);
        const name=divider<0?dish:dish.slice(0,divider);
        const description=divider<0?'':dish.slice(divider+3);
        return `<li><p><strong>${name.trim()}</strong></p>${description?`<p>${description.trim()}</p>`:''}</li>`;
      });
      return `<ul>${dishes.join('')}</ul>`;
    });
    body=body.replace(/<li>([\s\S]*?)<\/li>/gi,(_,item)=>{
      const first=item.match(/^\s*<p>\s*<strong>([\s\S]*?)<\/strong>([\s\S]*?)<\/p>/i);
      if(!first)return `<li>${item}</li>`;
      let name=first[1], description=first[2].trim();
      const divider=name.search(/\s[–—]\s/);
      if(divider>=0){description=name.slice(divider+3)+' '+description;name=name.slice(0,divider);}
      description=description.replace(/^\s*[–—]\s*/, '');
      return `<li><p><strong>${name}</strong></p>${description?`<p>${description}</p>`:''}${item.slice(first[0].length)}</li>`;
    });
    const baseId='menu-'+slug(title);
    const occurrence=(sectionIds.get(baseId)||0)+1;sectionIds.set(baseId,occurrence);
    return {id:baseId+(occurrence>1?'-'+occurrence:''),title,html:body};
  });
  const title=cuisines.find(([,p])=>p===route)[0];
  const menuDescriptions={Indian:'Home-style North Indian cooking: street-food favorites, tandoori dishes, and curries made for sharing.',Mediterranean:'Mezze, fresh salads, grilled proteins, and traditional sweets. Browse the full selection and sample menu.',Brunch:'Indian and American flavors, served as self-serve brunch stations.',Thai:'Browse our Thai catering menu and talk to us about your event.',Mexican:'Explore our Mexican catering selection for your next gathering.','Corporate packages':'Indian lunch packages, with meat and vegetarian entrées, rice, naan, and raita.'};
  return `<main id="main">${pageIntro('Catering menus',title==='Corporate packages'?'Office catering.':`${title} catering.`,menuDescriptions[title])}<div class="cuisine-tabs wrap" aria-label="Choose a cuisine">${cuisines.map(([t,p])=>`<a href="${p}"${p===route?' aria-current="page"':''}>${t}</a>`).join('')}</div><div class="menu-layout wrap section"><aside class="menu-sidebar"><span class="eyebrow">On the menu</span><nav aria-label="Menu sections">${sections.map(s=>`<a href="#${s.id}">${esc(s.title)}</a>`).join('')}</nav>${button('/catering-contact','Plan your menu','button button-small')}<p>Made fresh. Made for you.<br>Let us know about dietary needs.</p></aside><div class="menu-main"><div class="menu-tools"><label class="search-field"><span class="sr-only">Search this menu</span><span aria-hidden="true">⌕</span><input type="search" placeholder="Something you’re craving?" id="menu-search"></label><span class="menu-item-count" aria-live="polite"></span></div>${intro?`<div class="menu-note">${intro}</div>`:''}<p class="no-results" hidden>No dishes found. Try another search.</p>${sections.map((s,i)=>`<section class="menu-section" id="${s.id}" data-reveal><div class="menu-section-heading"><span>0${i+1}</span><h2>${esc(s.title)}</h2>${star}</div>${s.html}</section>`).join('')}</div></div></main>`;
}
function nativeForm(fields) {
 let serial=0;
 const field=(label,type='text',required=false,autocomplete='',span=false)=>{const id='field-'+(++serial);return `<label class="field ${span?'field-wide':''}" for="${id}"><span>${esc(label)} ${required?'<small>*</small>':''}</span><input id="${id}" name="${esc(label)}" type="${type}" ${required?'required':''} ${autocomplete?`autocomplete="${autocomplete}"`:''}></label>`;};
 const render=f=>{
   if(f.type==='name')return field('First name','text',f.required,'given-name')+field('Last name','text',f.required,'family-name');
   if(f.type==='address')return `<fieldset class="field-wide field-group"><legend>${esc(f.title)}</legend><div class="form-grid">${field('Address line 1','text',false,'address-line1',true)}${field('Address line 2','text',false,'address-line2',true)}${field('City','text',false,'address-level2')}${field('State / region','text',false,'address-level1')}${field('ZIP / postal code','text',false,'postal-code')}${field('Country','text',false,'country-name')}</div></fieldset>`;
   if(['radio','checkbox'].includes(f.type))return `<fieldset class="field-wide field-group"><legend>${esc(f.title)} ${f.required?'<small>*</small>':''}</legend>${f.description?`<p class="field-hint">${esc(f.description)}</p>`:''}<div class="choice-grid">${(f.options||[]).map((opt,i)=>{const label=typeof opt==='string'?opt:opt.label||opt.value;return `<label class="choice"><input type="${f.type}" name="${esc(f.title)}" value="${esc(label)}" ${f.required&&f.type==='radio'?'required':''}><span>${esc(label)}</span></label>`;}).join('')}</div></fieldset>`;
   if(f.type==='select')return `<label class="field field-wide"><span>${esc(f.title)}</span><select name="${esc(f.title)}" ${f.required?'required':''}><option value="">Please select</option>${(f.options||[]).map(o=>`<option>${esc(typeof o==='string'?o:o.label)}</option>`).join('')}</select></label>`;
   if(['textarea','text-area'].includes(f.type))return `<label class="field field-wide"><span>${esc(f.title)} ${f.required?'<small>*</small>':''}</span><textarea name="${esc(f.title)}" rows="4" ${f.required?'required':''}></textarea></label>`;
   if(['line','section','likert','hidden'].includes(f.type))return '';
   return field(f.title,({email:'email',phone:'tel',date:'date',time:'time',number:'number'})[f.type]||'text',f.required,({email:'email',phone:'tel'})[f.type]||'',!['date','time','phone'].includes(f.type));
 };
 return `<form class="inquiry-form" data-inquiry><div class="form-heading"><span class="eyebrow">Tell us a little about it</span><h2>Let’s get <em>started.</em></h2><p>Fields marked <span aria-hidden="true">*</span><span class="sr-only">with an asterisk</span> are required.</p></div><div class="form-grid">${fields.map(render).join('')}</div><div class="form-submit">${button('#','Send your inquiry','unused').replace(/<a[^>]+>/,'<button class="button" type="submit">').replace('</a>','</button>')}<p>Good food starts with a conversation.</p></div><p class="form-status" role="status" tabindex="-1" hidden></p></form>`;
}
function contact(route,page) {const travel=route==='/india-food-tour-form';return `<main id="main"><section class="contact-layout wrap section"><div class="contact-intro"><span class="eyebrow">${travel?'Spice Route · Winter 2028':'Bhojanic catering'}</span><h1>${travel?'Travel with<br>Archna.':'Tell us about<br>your event.'}</h1><p>${travel?'Tell us a little about yourself and your interest in Chef Archna’s culinary journey through India.':'A wedding, a working lunch, or a just-because celebration. Tell us what you have in mind. We’ll bring it to the table.'}</p><div class="contact-info"><a href="mailto:catering@bhojanic.com">catering@bhojanic.com ↗</a><a href="tel:+14047937243">(404) 793-7243 ↗</a><span>Atlanta · The Southeast · The Caribbean</span></div><div class="contact-photo">${img(travel?image.india:image.plated,travel?'A culinary journey through India':'Beautifully prepared catering for your celebration')}</div></div>${nativeForm(page.forms[0]||[{type:'name',required:true},{type:'email',title:'Email',required:true},{type:'textarea',title:'Tell us about your gathering',required:true}])}</section></main>`;}
function gallery(images,wide=false) {return images.length?`<section class="photo-journal wrap section ${wide?'wide-gallery':''}" data-gallery><div class="section-heading" data-reveal><div><span class="eyebrow">A closer look</span><h2>From the photo album.</h2></div><div class="gallery-controls"><button class="round-arrow" data-gallery-prev aria-label="Previous photos">←</button><button class="round-arrow" data-gallery-next aria-label="Next photos">→</button></div></div><div class="gallery-track" tabindex="0" aria-label="Photo gallery; scroll to explore">${images.map((item,i)=>`<button class="gallery-item" data-lightbox data-caption="${esc(item.alt)}" aria-label="Enlarge photo ${i+1}: ${esc(item.alt)}">${img(item.src,item.alt)}<span aria-hidden="true">↗</span></button>`).join('')}</div><p class="gallery-hint">Swipe or use the arrows to explore the photographs.</p></section>`:'';}
function generic(route,page) {
 const travel=route==='/india-food-tour'; const itinerary=route==='/india-food-tour-itinerary'; const story=route==='/our-story';
 const title=story?'Archna’s story.':travel?'India, with Archna.':itinerary?'The Spice Route itinerary.':route==='/venuesandpartners'?'Catering &amp; celebrations.':route==='/press-and-testimonials'?'In the press.':`${esc(page.title)}<span class="title-dot">.</span>`;
 const photo=story?image.chef:travel||itinerary?image.india:route.includes('curry-jam')?page.images[0]?.src||image.plated:image.plated;
 const eyebrow=travel?'Spice Route · Winter 2028':story?'Meet Chef Archna Becker':route.includes('curry-jam')?'Food. Music. A shared table.':'The Bhojanic way';
 let blocks=page.blocks.filter(b=>text(b));
 if(story)blocks=content['/home-page'].blocks.filter(b=>/Archna Malhotra|visionary|Building on that|Beyond her/.test(b));
 else blocks=blocks.map(b=>b.replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/g,'')).filter(b=>text(b));
 let body=blocks.map((b,i)=>`<section class="prose-section" data-reveal>${b}</section>`).join('');
 if(itinerary)body+=`<div class="itinerary-pages">${page.images.map(i=>img(i.src,i.alt)).join('')}</div>`;
 return `<main id="main">${pageIntro(eyebrow,title,travel?'15 days of remarkable food, shared stories, and unforgettable places. Discover North and South India with Chef Archna Becker.':story?'From her grandmother’s kitchen in India to celebrations around the world. Food has always been the way Archna brings people together.':'',photo)}${travel?`<div class="journey-facts wrap"><span><strong>15 days</strong>A world of discovery</span><span><strong>Winter 2028</strong>Your next chapter</span><span><strong>North & South India</strong>One delicious journey</span>${button('/india-food-tour-form','Request your spot')}</div>`:''}<article class="editorial-content wrap section ${itinerary?'itinerary-content':''}">${body}</article>${page.videos.map(v=>`<div class="video-frame wrap"><iframe src="${v}" title="${esc(page.title)} video" loading="lazy" allow="fullscreen; picture-in-picture" allowfullscreen></iframe></div>`).join('')}${!itinerary&&!story?gallery(page.images.filter(i=>i.src!==photo)):''}${travel?`<div class="wrap journey-actions">${button('/india-food-tour-itinerary','Explore the itinerary')}${button('/india-food-tour-form','Join the journey','text-link')}</div>`:''}</main>`;
}
function protectedPage() {return `<main id="main"><section class="protected-page wrap section"><span class="eyebrow">A little something from our kitchen</span>${star}<h1>Keep the flavor<br><em>going at home.</em></h1><p>Our cooking-class recipes are available to class participants on the original Bhojanic website.</p>${button('https://www.bhojanic.com/class-recipes','Open the recipe collection')}<a class="text-link" href="/catering-contact">Ask about cooking classes ${arrow}</a></section></main>`;}

for(const page of Object.values(content)) page.title=text(page.title).replace(/\s*[—–]\s*bhojanic$/i,'');
content['/menus']={title:'Our menus'};content['/our-story']={...content['/home-page'],title:'Our story'};
for(const [route,page] of Object.entries(content)) {
 let main;
 if(route==='/'||route==='/home-page') {
   main=home();

 }
 else if(route==='/menus')main=menus();
 else if(isMenu(route))main=menuPage(route,page);
 else if(['/catering-contact','/india-food-tour-form'].includes(route))main=contact(route,page);
 else if(route==='/class-recipes')main=protectedPage();
 else main=generic(route,page);
 const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#f7f2e9"><meta name="description" content="Regional Indian soul. A world of flavor. Explore Bhojanic’s catering menus, celebrations, and culinary journeys with Chef Archna Becker."><title>${esc(route==='/'||route==='/home-page'?'Bhojanic — Indian & global catering':page.title+' — Bhojanic')}</title><link rel="icon" href="/assets/256845759e07b559909d.png"><link rel="stylesheet" href="/fonts.css"><link rel="stylesheet" href="/design.css"><script src="/design.js" defer></script></head><body data-page="${slug(route)||'home'}">${header(route)}${main}${footer()}<dialog class="lightbox" aria-label="Photo viewer"><button class="lightbox-close" aria-label="Close photo viewer">×</button><button class="lightbox-prev" aria-label="Previous photo">←</button><figure><img alt=""><figcaption></figcaption></figure><button class="lightbox-next" aria-label="Next photo">→</button></dialog><div class="page-wipe" aria-hidden="true"></div></body></html>`;
 let outputHtml=html.replaceAll('<br>','<br> ').replace('content="#f7f2e9"','content="#ffffff"').replace('<link rel="stylesheet" href="/design.css">','<link rel="stylesheet" href="/design.css"><link rel="stylesheet" href="/brand.css"><link rel="stylesheet" href="/editorial.css">');
 for(const [file,version] of assetVersions)outputHtml=outputHtml.replaceAll('/'+file+'"','/'+file+'?v='+version+'"');
 const dest=path.join(root,route==='/'?'index.html':route.slice(1)+'/index.html');await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,outputHtml);
}
manifest.pages=Object.keys(content);manifest.design='Bhojanic — Indian & global catering';await fs.writeFile(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2));
console.log(`Built ${Object.keys(content).length} redesigned pages.`);
