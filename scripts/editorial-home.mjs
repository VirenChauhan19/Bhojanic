// The home page follows the rhythm of a hospitality publication, not a card grid.
export function renderHome({ image, img, button, arrow, cuisines }) {
  const menuDetails = [
    'Samosas, slow-simmered curries & the tandoor',
    'Mezze, shawarma & food for sharing',
    'Indian and American brunch stations',
    'Thai favorites for your next gathering',
    'Mexican catering, prepared for your crowd',
    'Indian lunch packages for the whole office',
  ];
  const ribbonGroup = '<span>Regional Indian soul</span><span class="ribbon-dot">•</span><span>Global flavors</span><span class="ribbon-dot">•</span><span>Unforgettable gatherings</span><span class="ribbon-dot">•</span>';
  return `<main id="main">
    <section class="opening wrap" aria-labelledby="opening-title">
      <div class="opening-topline"><span>Regional Indian &amp; global catering</span><span>Atlanta · The Southeast · The Caribbean</span></div>
      <div class="opening-heading">
        <h1 id="opening-title">An Indian<br><em>welcome.</em></h1>
        <div class="opening-copy"><p>Home-style cooking from Chef Archna Becker’s kitchen. A wedding feast, an office lunch, a table full of your favorite people.</p><p>We’ll take care of the food.</p>${button('/menus','Explore the menus')}${button('/catering-contact','Tell us about your event','text-link')}</div>
      </div>
      <figure class="opening-image">${img(image.meal,'A generous spread of North Indian curries, rice, flatbreads, and chutneys','',true)}<figcaption><span>The Bhojanic table</span><span>North Indian roots. A wider world of flavor.</span></figcaption></figure>
    </section>
    <div class="flavor-ribbon" aria-label="Regional Indian cooking, global flavors, unforgettable gatherings"><div class="ribbon-track" aria-hidden="true"><div class="ribbon-group">${ribbonGroup}${ribbonGroup}</div><div class="ribbon-group">${ribbonGroup}${ribbonGroup}</div></div></div>
    <section class="occasion-section wrap" id="gatherings">
      <div class="occasion-intro" data-reveal><span class="eyebrow">Catering, with care</span><h2>A little more<br>personal.</h2><p>Recipes passed down through family. Menus made for the people at your table. The details that make a gathering feel like yours.</p></div>
      <div class="occasion-photo" data-reveal>${img(image.plated,'Plated appetizers being prepared for a catered celebration')}</div>
      <div class="occasion-list">
        ${[
          ['Weddings & celebrations','From the first small bite to the last plate. Explore our venues and partners.','/venuesandpartners'],
          ['At the office','A proper lunch for your team. Choose from our Indian catering packages.','/new-page-3'],
          ['Your next gathering','Tell us the occasion, the guest count, and what you love to eat. We’ll help with the menu.','/catering-contact'],
        ].map(([title,description,url],i)=>`<a class="occasion-row" href="${url}" data-reveal><span class="occasion-number">0${i+1}</span><div><h3>${title}</h3><p>${description}</p></div>${arrow}</a>`).join('')}
      </div>
    </section>
    <section class="kitchen-section" id="menus"><div class="wrap">
      <div class="kitchen-heading" data-reveal><span class="eyebrow">From the kitchen</span><h2>The menus.</h2><p>Start with a cuisine.<br>We’ll make it your own.</p></div>
      <div class="kitchen-layout"><figure class="kitchen-photo" data-reveal>${img(image.close,'Indian curries and warm naan served family-style')}<figcaption><span>Our roots</span><span>Indian, always at heart.</span></figcaption></figure><div class="kitchen-index">${cuisines.map(([name,url],i)=>`<a href="${url}" data-reveal><span class="kitchen-number">0${i+1}</span><div><h3>${name}</h3><p>${menuDetails[i]}</p></div>${arrow}</a>`).join('')}</div></div>
    </div></section>
    <section class="archna-section wrap" id="story">
      <figure class="archna-photo" data-reveal>${img(image.chef,'Chef Archna Becker, founder of Bhojanic')}<figcaption>Archna Malhotra Becker · Chef &amp; founder</figcaption></figure>
      <div class="archna-copy" data-reveal><span class="eyebrow">The person behind the kitchen</span><h2>It began with<br>her grandmother.</h2><p>Before Bhojanic, there was a family kitchen in India. That’s where Archna learned to cook—and where her love of feeding people began.</p><p>More than 25 years in Atlanta’s food community later, those home-style traditions still shape the way we cook. Now they travel a little further: to weddings, workplaces, music cruises, and kitchens around the world.</p>${button('/our-story','Meet Archna','text-link')}<div class="recognition"><span>Recognized by</span><p>Atlanta Magazine <i>·</i> Creative Loafing <i>·</i> AJC</p></div></div>
    </section>
    <section class="field-notes wrap">
      <div class="field-notes-heading" data-reveal><span class="eyebrow">Beyond the kitchen</span><h2>Food takes us places.</h2></div>
      <a class="travel-story" href="/india-food-tour" data-reveal><figure>${img(image.india,'Jal Mahal palace in Rajasthan, a destination on Chef Archna’s India journey')}</figure><div><span class="eyebrow">Spice Route · Winter 2028</span><h3>India, with Archna.</h3><p>15 days through North and South India. Markets, family kitchens, and the places behind the flavors.</p><span class="story-link">Explore the journey ${arrow}</span></div></a>
      <a class="curry-note" href="/jam-cruise-curry-jam-00" data-reveal><div>${img('/assets/51e967150926923b0fd7.jpg','A moment from Bhojanic’s Curry Jam on Jam Cruise')}</div><span><small>From the Bhojanic archive</small><strong>A little music with your curry.</strong><span>Discover Indian 101 Curry Jam ${arrow}</span></span></a>
    </section>
  </main>`;
}

export function renderFooter({ image, img, button }) {
  return `<section class="closing-cta"><div class="wrap"><span class="eyebrow">Let’s talk catering</span><div class="closing-row"><h2>What are<br>you planning?</h2><div><p>Tell us about your people, your place,<br>and what’s on your mind.</p>${button('/catering-contact','Start a conversation')}</div></div></div></section>
    <footer class="site-footer"><div class="wrap footer-top"><div class="footer-brand"><a href="/home-page">${img(image.logo,'Bhojanic')}</a><p>Home-style Indian cooking.<br>Catering near and far.</p></div><div><span class="eyebrow">Explore</span><a href="/menus">Our menus</a><a href="/venuesandpartners">Catering &amp; events</a><a href="/our-story">Meet Archna</a><a href="/india-food-tour">Culinary journeys</a></div><div><span class="eyebrow">More from Bhojanic</span><a href="/jam-cruise-curry-jam-00">Indian 101 Curry Jam</a><a href="/class-recipes">Cooking class recipes</a><a href="/press-and-testimonials">Press &amp; testimonials</a><a href="https://www.tandooripizzaandwingco.com/" target="_blank" rel="noopener noreferrer">Tandoori Pizza &amp; Wing Co. ↗</a></div><div><span class="eyebrow">Get in touch</span><a href="mailto:catering@bhojanic.com">catering@bhojanic.com</a><a href="tel:+14047937243">(404) 793-7243</a><p>1175 Peachtree St. NE, Suite #160<br>Atlanta, GA 30361</p></div></div><div class="wrap footer-bottom"><span>© ${new Date().getFullYear()} Bhojanic</span><span>Atlanta · The Southeast · The Caribbean</span><div><a href="https://www.instagram.com/bhojanic/" target="_blank" rel="noopener noreferrer">Instagram ↗</a><a href="https://www.facebook.com/BhojanicCatering" target="_blank" rel="noopener noreferrer">Facebook ↗</a></div></div></footer>`;
}
