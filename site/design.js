// Motion is always enabled for this design; no visitor-facing motion controls.
// Ignore preferences stored by earlier versions of the preview.
const motionIsReduced = () => false;
document.documentElement.classList.remove('reduce-motion');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const header = document.querySelector('.site-header');
const mobileToggle = document.querySelector('.mobile-toggle');
const mobileNav = document.querySelector('.mobile-nav');

// Navigation works with keyboard, touch, and pointer input.
function setMobileNav(open) {
  document.body.classList.toggle('nav-open', open);
  mobileToggle.setAttribute('aria-expanded', String(open));
  mobileToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  mobileNav.inert = !open;
  if (open) mobileNav.style.top = `${header.getBoundingClientRect().bottom}px`;
  document.querySelector('main').inert = open;
  document.querySelector('.closing-cta').inert = open;
  document.querySelector('.site-footer').inert = open;
  if (open) mobileNav.querySelector('a').focus({ preventScroll: true });
}
mobileToggle.addEventListener('click', () => setMobileNav(!document.body.classList.contains('nav-open')));
mobileNav.addEventListener('click', event => { if (event.target.closest('a')) setMobileNav(false); });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    if (document.body.classList.contains('nav-open')) { setMobileNav(false); mobileToggle.focus(); }
    document.querySelectorAll('.nav-dropdown.is-open').forEach(el => closeDropdown(el));
  }
  if (event.key === 'Tab' && document.body.classList.contains('nav-open')) {
    const focusables = [mobileToggle, ...mobileNav.querySelectorAll('a')];
    const first = focusables[0], last = focusables.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});
matchMedia('(min-width: 961px)').addEventListener('change', event => { if (event.matches) setMobileNav(false); });
function closeDropdown(el) { el.classList.remove('is-open'); el.querySelector('button').setAttribute('aria-expanded', 'false'); }
document.querySelectorAll('.nav-dropdown').forEach(el => {
  const button = el.querySelector('button');
  const open = () => { el.classList.add('is-open'); button.setAttribute('aria-expanded', 'true'); };
  button.addEventListener('click', () => el.classList.contains('is-open') ? closeDropdown(el) : open());
  button.addEventListener('keydown', event => { if (event.key === 'ArrowDown') { event.preventDefault(); open(); el.querySelector('.dropdown-panel a').focus(); } });
  el.addEventListener('mouseenter', () => { if (finePointer.matches) open(); });
  el.addEventListener('mouseleave', () => { if (!el.contains(document.activeElement)) closeDropdown(el); });
  el.addEventListener('focusout', () => requestAnimationFrame(() => { if (!el.contains(document.activeElement)) closeDropdown(el); }));
});
document.addEventListener('click', event => { if (!event.target.closest('.nav-dropdown')) document.querySelectorAll('.nav-dropdown').forEach(closeDropdown); });

// One lightweight scroll pass updates the sticky header and optional parallax.
let scrollQueued = false;
const journeyPhoto = document.querySelector('.journey-bg img');
function updateScroll() {
  scrollQueued = false;
  const y = window.scrollY;
  header.classList.toggle('scrolled', y > 40);
  if (!motionIsReduced() && finePointer.matches && innerWidth > 960) {
    if (journeyPhoto) {
      const rect = journeyPhoto.parentElement.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < innerHeight) journeyPhoto.style.transform = `scale(1.12) translateY(${(innerHeight / 2 - rect.top - rect.height / 2) * .045}px)`;
    }
  }
}
addEventListener('scroll', () => { if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(updateScroll); } }, { passive: true });
updateScroll();

// Reveal only once; the fallback is always fully readable.
if ('IntersectionObserver' in window && !motionIsReduced()) {
  document.documentElement.classList.add('motion-ready');
  const revealObserver = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) { entry.target.classList.add('is-visible'); revealObserver.unobserve(entry.target); }
  }, { threshold: .08, rootMargin: '0px 0px -25px 0px' });
  document.querySelectorAll('[data-reveal]').forEach(el => revealObserver.observe(el));
}

// Menu search filters the actual preserved menu text.
const search = document.querySelector('#menu-search');
if (search) {
  const sections = [...document.querySelectorAll('.menu-section')];
  const counter = document.querySelector('.menu-item-count');
  counter.hidden = !sections.some(section => section.querySelector('li'));
  const filter = () => {
    const query = search.value.trim().toLowerCase();
    let count = 0;
    for (const section of sections) {
      const items = [...section.querySelectorAll('li')];
      if (!items.length) { section.hidden = query && !section.textContent.toLowerCase().includes(query); continue; }
      for (const item of items) { item.hidden = !item.textContent.toLowerCase().includes(query); if (!item.hidden) count++; }
      section.hidden = items.every(item => item.hidden);
    }
    counter.textContent = `${count} ${count === 1 ? 'dish' : 'dishes'}`;
    document.querySelector('.no-results').hidden = sections.some(section => !section.hidden);
  };
  search.addEventListener('input', filter);
  filter();
  const sectionObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => { if (entry.isIntersecting) document.querySelectorAll('.menu-sidebar nav a').forEach(a => a.classList.toggle('active', a.hash === '#' + entry.target.id)); });
  }, { rootMargin: '-120px 0px -55% 0px', threshold: 0 });
  sections.forEach(section => sectionObserver.observe(section));
}

// Galleries support touch scrolling, arrows, and an accessible native dialog.
const dialog = document.querySelector('.lightbox');
let activeGalleryItems = [], activePhoto = 0, returnFocus;
function showPhoto(index) {
  activePhoto = (index + activeGalleryItems.length) % activeGalleryItems.length;
  const item = activeGalleryItems[activePhoto];
  const image = dialog.querySelector('figure img');
  image.src = item.querySelector('img').src;
  image.alt = item.dataset.caption;
  dialog.querySelector('figcaption').textContent = `${activePhoto + 1} / ${activeGalleryItems.length} · ${item.dataset.caption}`;
  if (!motionIsReduced()) image.animate([{ opacity: .2, transform: 'scale(.98)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 350, easing: 'ease-out' });
}
document.querySelectorAll('[data-gallery]').forEach(gallery => {
  const track = gallery.querySelector('.gallery-track');
  const move = direction => track.scrollBy({ left: direction * track.clientWidth * .8, behavior: motionIsReduced() ? 'instant' : 'smooth' });
  gallery.querySelector('[data-gallery-prev]').addEventListener('click', () => move(-1));
  gallery.querySelector('[data-gallery-next]').addEventListener('click', () => move(1));
  track.addEventListener('keydown', event => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1); } });
  const items = [...gallery.querySelectorAll('[data-lightbox]')];
  items.forEach((item, index) => item.addEventListener('click', () => { activeGalleryItems = items; returnFocus = item; showPhoto(index); dialog.showModal(); document.body.classList.add('lightbox-open'); }));
});
dialog.querySelector('.lightbox-prev').addEventListener('click', () => showPhoto(activePhoto - 1));
dialog.querySelector('.lightbox-next').addEventListener('click', () => showPhoto(activePhoto + 1));
dialog.querySelector('.lightbox-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
dialog.addEventListener('keydown', event => { if (event.key === 'ArrowLeft') showPhoto(activePhoto - 1); if (event.key === 'ArrowRight') showPhoto(activePhoto + 1); });
dialog.addEventListener('close', () => { document.body.classList.remove('lightbox-open'); returnFocus?.focus({ preventScroll: true }); });

// Keep the local inquiry workflow, with native validation and a clear result.
document.querySelectorAll('[data-inquiry]').forEach(form => form.addEventListener('submit', async event => {
  event.preventDefault();
  if (document.querySelector('meta[name="deployment"][content="github-pages"]')) {
    const status = form.querySelector('.form-status');
    status.textContent = 'This preview does not send inquiries. Please email catering@bhojanic.com or call (404) 793-7243.';
    status.hidden = false;
    status.focus({ preventScroll: true });
    status.scrollIntoView({ behavior: motionIsReduced() ? 'instant' : 'smooth', block: 'nearest' });
    return;
  }
  if (!form.reportValidity()) return;
  const button = form.querySelector('[type=submit]');
  const status = form.querySelector('.form-status');
  const fields = [...new FormData(form)].filter(([,value]) => String(value).trim()).map(([label, value]) => ({ label, value: String(value) }));
  const label = button.querySelector('span:first-child');
  const original = label.textContent;
  button.disabled = true; label.textContent = 'Sending…';
  status.hidden = true;
  try {
    const response = await fetch('/api/inquiries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ page: location.pathname, fields }) });
    if (!response.ok) throw new Error('Unable to save');
    status.textContent = 'Thank you! Your inquiry has been saved locally. To reach the Bhojanic team, email catering@bhojanic.com or call (404) 793-7243.';
    form.reset();
  } catch {
    status.textContent = 'Your inquiry could not be saved. Your details are still here—please try again, or email catering@bhojanic.com.';
  } finally {
    status.hidden = false; status.focus({ preventScroll: true });
    status.scrollIntoView({ behavior: motionIsReduced() ? 'instant' : 'smooth', block: 'nearest' });
    button.disabled = false; label.textContent = original;
  }
}));

// A quick exit curtain where cross-document view transitions are unavailable.
if (!('startViewTransition' in document)) {
  document.addEventListener('click', event => {
    const a = event.target.closest('a');
    if (!a || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || a.target || a.download || motionIsReduced()) return;
    const next = new URL(a.href, location.href);
    if (next.origin !== location.origin || next.pathname === location.pathname || /\.(pdf|jpe?g|png|webp)$/i.test(next.pathname)) return;
    event.preventDefault();document.body.classList.add('is-leaving');
    setTimeout(() => location.assign(next.href), 230);
  });
}
addEventListener('pageshow', () => document.body.classList.remove('is-leaving'));
