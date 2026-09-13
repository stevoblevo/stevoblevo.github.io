// Enhance the existing world; do not replace its React state or browser records.
const BASE = '/goober/';
const PEACH = '/peachfall/';
const PEACH_EMBED = PEACH + '?embedded=goober';
const POSTER_ID = 'peachfall-09';
const POSTER = BASE + 'assets/rediscovered/peachfall-09.webp';

function card(id, title, subtitle, image, href = BASE + 'gallery/#' + id) {
  const link = document.createElement('a');
  link.href = href;
  link.className = 'world-window';
  const img = document.createElement('img');
  img.src = BASE + 'assets/rediscovered/' + image;
  img.alt = title;
  img.loading = 'lazy';
  const copy = document.createElement('span');
  const heading = document.createElement('b');
  const detail = document.createElement('small');
  heading.textContent = title;
  detail.textContent = subtitle;
  copy.append(heading, detail);
  link.append(img, copy);
  return link;
}

function wirePeach(frame) {
  try {
    const doc = frame.contentDocument;
    if (!doc) return;
    const control = doc.getElementById(frame.dataset.mode === 'play' ? 'play-dream' : 'watch-dream');
    control?.click();
  } catch (_error) {
    // The explicit public link remains available if iframe access is unavailable.
  }
}

function startPeach(panel, mode) {
  const stage = panel.querySelector('.peach-stage');
  let frame = panel.querySelector('#peachfall-frame');
  panel.querySelectorAll('[data-mode]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
  });
  if (!frame) {
    frame = document.createElement('iframe');
    frame.id = 'peachfall-frame';
    frame.title = mode === 'play' ? 'Play the Peachfall' : 'Watch the Peachfall dream';
    frame.allow = 'autoplay';
    frame.dataset.mode = mode;
    frame.addEventListener('load', () => {
      frame.dataset.loaded = 'true';
      wirePeach(frame);
    });
    stage.prepend(frame);
    frame.src = PEACH_EMBED;
  } else {
    frame.dataset.mode = mode;
    frame.title = mode === 'play' ? 'Play the Peachfall' : 'Watch the Peachfall dream';
    try {
      frame.contentDocument?.getElementById('btn-reset')?.click();
    } catch (_error) {}
    wirePeach(frame);
  }
  panel.querySelector('.peach-stub').hidden = true;
  panel.querySelector('.peach-status').textContent =
    mode === 'play' ? 'Opening Play after your choice.' : 'Opening Watch after your choice.';
}

function towerPanel(collection) {
  let panel = document.getElementById('tower');
  if (panel) return panel;
  panel = document.createElement('section');
  panel.id = 'tower';
  panel.className = 'tower-thread';
  panel.dataset.enrichmentOwned = 'true';
  panel.setAttribute('aria-labelledby', 'tower-title');
  panel.innerHTML = `
    <div class="tower-story">
      <a class="tower-poster" href="${BASE}gallery/#${POSTER_ID}" aria-label="Open Play creates the world in the Atlas">
        <img src="${POSTER}" alt="Illustrated Anewgam concept showing a princess weaving a world with golden thread while a later knight follows the traces" loading="lazy">
      </a>
      <div class="tower-copy">
        <span class="eyebrow">STORYMODE · TOWER THREAD 01</span>
        <h2 id="tower-title" tabindex="-1">The princess wakes.<br>What does she leave behind?</h2>
        <p>The world is not fully prebuilt. A choice becomes a trace. Someone arriving later can read it, inherit its consequences, and continue.</p>
        <form id="tower-choice">
          <fieldset>
            <legend>Choose one thread</legend>
            <label><input type="radio" name="thread" value="path"><span><b>Leave a path</b><small>Mark a route the next player can recognize.</small></span></label>
            <label><input type="radio" name="thread" value="seam"><span><b>Mend a seam</b><small>Repair one connection and name what changed.</small></span></label>
            <label><input type="radio" name="thread" value="tool"><span><b>Shape a tool</b><small>Make one thing the next player can use.</small></span></label>
          </fieldset>
          <button type="submit">Carry this choice to the field log →</button>
          <p class="tower-status" role="status">Choose a thread. Nothing is saved yet.</p>
        </form>
        <p class="tower-boundary">This prepares a device-local candidate in the existing Goober field log. You review it before choosing “Keep with this project.” Nothing is sent or accepted automatically.</p>
        <div class="tower-links">
          <a href="${BASE}gallery/#${POSTER_ID}">See the whole picture ↗</a>
          <a href="${BASE}source/anewgam-world-thread.v1.json">Read the world-thread contract ◇</a>
        </div>
      </div>
    </div>
    <div class="peach-top">
      <span class="eyebrow">PEACHFALL · ANOTHER DOOR IN THE SAME WORLD</span>
      <h2>Watch the dream. Or play it.</h2>
      <p>Peachfall opens only after you choose. Watch performs the living film; Play hands you the controls.</p>
      <div class="peach-actions">
        <button type="button" data-mode="watch" aria-pressed="false">Watch</button>
        <button type="button" data-mode="play" aria-pressed="false">Play</button>
        <a href="${PEACH}">Open Peachfall ↗</a>
      </div>
      <p class="peach-status" role="status">Waiting for your choice. No game frame has loaded.</p>
    </div>
    <div class="peach-stage">
      <aside class="peach-stub">
        <b>Door at rest</b>
        <p>The embedded game is not loaded until you choose Watch or Play. The public Peachfall link works without this frame.</p>
      </aside>
    </div>`;

  panel.querySelector('#tower-choice').addEventListener('submit', event => {
    event.preventDefault();
    const choice = new FormData(event.currentTarget).get('thread');
    const status = panel.querySelector('.tower-status');
    if (!choice) {
      status.textContent = 'Choose one thread before carrying it forward.';
      panel.querySelector('input[name="thread"]')?.focus();
      return;
    }
    status.textContent = 'Opening the existing field log. Your choice is still only a draft.';
    const query = new URLSearchParams({project: 'goober', picture: POSTER_ID, thread: String(choice)});
    window.location.href = BASE + 'project$/?' + query + '#cockpit';
  });
  panel.querySelectorAll('[data-mode]').forEach(button => {
    button.addEventListener('click', () => startPeach(panel, button.dataset.mode));
  });
  collection.after(panel);
  return panel;
}

function rediscoveredWorlds(hero) {
  let collection = document.getElementById('rediscovered-worlds');
  if (collection) return collection;
  collection = document.createElement('section');
  collection.id = 'rediscovered-worlds';
  collection.className = 'rediscovered-worlds';
  collection.dataset.enrichmentOwned = 'true';
  const top = document.createElement('div');
  top.className = 'rediscovered-top';
  const text = document.createElement('div');
  const kicker = document.createElement('span');
  const heading = document.createElement('h2');
  const atlas = document.createElement('a');
  kicker.textContent = 'THE WORLD IS GETTING BIGGER';
  kicker.className = 'eyebrow';
  heading.textContent = 'A few more doors just opened.';
  text.append(kicker, heading);
  atlas.href = BASE + 'gallery/';
  atlas.textContent = 'Explore the public Atlas ↗';
  top.append(text, atlas);
  const row = document.createElement('div');
  row.className = 'world-windows';
  row.append(
    card('peachfall-02', 'A constellation to collect', 'Astral assembly', 'peachfall-02.webp'),
    card('peachfall-06', 'Someone at the threshold', 'Sae and Knight', 'peachfall-06.webp'),
    card(POSTER_ID, 'Play makes a place', 'Enter Tower storymode', 'peachfall-09.webp', BASE + '#tower')
  );
  const last = document.createElement('p');
  last.className = 'rediscovered-last';
  last.append('Recovered from the earlier Anewgam story. ');
  const play = document.createElement('a');
  play.href = PEACH;
  play.textContent = 'Visit the playable Peachfall doorway →';
  last.append(play);
  collection.append(top, row, last);
  hero.after(collection);
  return collection;
}

function addGuideDoors(collection) {
  if (!collection.querySelector('[data-obs-guide]')) {
    const guide = document.createElement('a');
    guide.dataset.obsGuide = 'true';
    guide.href = BASE + 'learn/obs-windows-11/';
    guide.className = 'recording-guide-door';
    guide.innerHTML = '<span class="guide-rec-icon">●</span><span><small>NEW FIELD GUIDE / WINDOWS 11</small><b>Keep the good play. Find the recording.</b></span><span>OBS setup →</span>';
    collection.append(guide);
  }
  if (!collection.querySelector('[data-with-him]')) {
    const door = document.createElement('a');
    door.dataset.withHim = 'true';
    door.href = BASE + 'with-him/';
    door.className = 'recording-guide-door';
    door.innerHTML = '<span class="guide-rec-icon">★</span><span><small>PHONE FIRST / WINDOWS STAYS</small><b>Aiden’s world goes with him.</b></span><span>Continue →</span>';
    collection.append(door);
  }
}

let towerFocused = false;
function focusTower() {
  if (window.location.hash !== '#tower') {
    towerFocused = false;
    return;
  }
  const panel = document.getElementById('tower');
  const title = document.getElementById('tower-title');
  if (!panel || !title || towerFocused) return;
  towerFocused = true;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  title.focus({preventScroll: true});
  panel.scrollIntoView({block: 'start', behavior: reduce ? 'auto' : 'smooth'});
}

function removeOwnedPanels() {
  document.querySelectorAll('[data-enrichment-owned]').forEach(node => node.remove());
}

function enhance() {
  const hero = document.querySelector('.hero');
  if (!hero) {
    removeOwnedPanels();
    return;
  }
  const approaches = document.querySelector('.approaches');
  if (approaches && !approaches.id) approaches.id = 'approach';
  if (!hero.dataset.enriched) {
    const image = hero.querySelector('.hero-art');
    if (image) {
      image.src = BASE + 'assets/rediscovered/world-hero.webp';
      image.alt = 'Recovered concept: a traveler overlooking a luminous landscape in the earlier Anewgam world';
    }
    const credit = hero.querySelector('.art-credit');
    if (credit) {
      credit.href = BASE + 'gallery/#peachfall-03';
      credit.textContent = 'Recovered world art · Open the original ↗';
    }
    hero.dataset.enriched = 'true';
  }
  const collection = rediscoveredWorlds(hero);
  addGuideDoors(collection);
  towerPanel(collection);
  const footer = document.querySelector('main footer');
  if (footer && !footer.querySelector('[data-lattice]')) {
    const link = document.createElement('a');
    link.dataset.lattice = 'true';
    link.href = BASE + 'lattice/';
    link.textContent = 'One world · named doorways ◇';
    footer.append(link);
  }
  focusTower();
}

let queued = false;
const app = document.getElementById('app');
new MutationObserver(() => {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    enhance();
  });
}).observe(app, {childList: true, subtree: true});
window.addEventListener('hashchange', () => {
  towerFocused = false;
  enhance();
});
enhance();
