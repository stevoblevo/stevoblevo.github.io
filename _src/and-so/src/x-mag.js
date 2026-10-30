// ===== Mag leads, and a small bunny follows. Painted art is not in yet: these are vector stand-ins.
// Drop finished paintings at assets/pet/mag.png and assets/pet/bunny.png and set ready:true in assets/pet/slots.json.
var MAG = { found: false, step: 0, pawUntil: 0, hintUntil: 0, look: false, looked: 0, notes: 0, waitFrom: 0, x: -200, y: -200, bx: -200, by: -200, petals: [], art: { mag: null, bunny: null } };
var PET_SLOTS = { mag: { src: 'assets/pet/mag.png', ready: false }, bunny: { src: 'assets/pet/bunny.png', ready: false } };

function petBase() {
  try {
    const p = location.pathname;
    if (/\/and-so\/[^/]+\/index\.html$/.test(p) || /\/and-so\/[^/]+\/$/.test(p)) return '../';
  } catch (e) {}
  return '';
}
function magBoot() {
  const base = petBase();
  fetch(base + 'assets/pet/slots.json').then(r => r.ok ? r.json() : null).then(slots => {
    if (!slots) return;
    if (slots.elphantea) PET_SLOTS.elphantea = slots.elphantea;
    ['mag', 'bunny'].forEach(k => {
      const s = slots[k];
      if (!s) return;
      PET_SLOTS[k] = s;
      if (s.ready && s.src) {
        const img = new Image();
        img.onload = () => { if (img.naturalWidth > 2) { MAG.art[k] = img; petSlotsPaint($('bookPets')); } };
        img.src = base + String(s.src).replace(/^\//, '');
      }
    });
  }).catch(() => {});
}
function petSvg(kind) {
  if (kind === 'mag') return '<svg class="vec" viewBox="0 0 80 56" aria-hidden="true"><ellipse cx="34" cy="34" rx="22" ry="13" fill="#f7f4ee" stroke="#2a211c" stroke-width="1.4"/><circle cx="54" cy="24" r="12" fill="#f7f4ee" stroke="#2a211c" stroke-width="1.4"/><path d="M46 16 l4-8 6 7 M58 14 l6-7 3 9" fill="#fff" stroke="#2a211c" stroke-width="1.2"/><circle cx="58" cy="23" r="1.3" fill="#241c16"/><circle cx="63" cy="26" r="1.6" fill="#241c16"/><path d="M14 36 q-8 2 -6 8 M18 40 q-6 6 0 8" fill="none" stroke="#2a211c" stroke-width="1.2"/><path d="M24 44 l-2 8 M32 46 l0 8 M40 45 l2 8 M48 42 l4 7" fill="none" stroke="#2a211c" stroke-width="1.3" stroke-linecap="round"/></svg>';
  return '<svg class="vec" viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="30" cy="40" rx="14" ry="11" fill="#f4efe6" stroke="#2a211c" stroke-width="1.3"/><circle cx="40" cy="30" r="9" fill="#f4efe6" stroke="#2a211c" stroke-width="1.3"/><ellipse cx="34" cy="12" rx="3.2" ry="10" fill="#f4efe6" stroke="#2a211c" stroke-width="1.2"/><ellipse cx="44" cy="12" rx="3.2" ry="10" fill="#f4efe6" stroke="#2a211c" stroke-width="1.2"/><circle cx="43" cy="29" r="1.1" fill="#241c16"/><circle cx="22" cy="42" r="3" fill="#fff" stroke="#2a211c" stroke-width="1"/></svg>';
}
function petSlotsPaint(host) {
  if (!host) return;
  host.innerHTML = '';
  ['bunny', 'mag'].forEach(kind => {
    const d = document.createElement('div');
    d.className = 'pet-slot slot-' + kind;
    d.dataset.sprite = PET_SLOTS[kind] && PET_SLOTS[kind].src || ('assets/pet/' + kind + '.png');
    if (MAG.art[kind]) { const img = document.createElement('img'); img.alt = ''; img.src = MAG.art[kind].src; d.appendChild(img); }
    else d.innerHTML = petSvg(kind);
    host.appendChild(d);
  });
}
function magHint() { MAG.hintUntil = t + 3.8; }
function magOnPhrase() { if (!MAG.found && MAG.step === 0 && UNL.rail) magShowPaw(); }
function magShowPaw() { MAG.step = 1; MAG.pawUntil = t + 3.6; caption("Somebody's been here.", 2800); }
function magCarrotTap() {
  if (MAG.step !== 1 || MAG.found) return;
  caption('Loose carrot. Someone always finds these.', 2800);
  MAG.step = 2; MAG.look = true; MAG.looked = 0; persistSoon();
}
function magExpect() {
  const root = BOOK.tune ? tonicPc() : 0;
  return [0, 4, 7, 0].map(d => (root + d) % 12);
}
function magBuildRead() {
  const el = $('magRead'); if (!el || el.dataset.built) return; el.dataset.built = '1';
  el.textContent = '';
  for (let i = 0; i < 4; i++) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'mag-note'; b.setAttribute('aria-label', 'note ' + (i + 1));
    b.addEventListener('click', () => magPress(i));
    el.appendChild(b);
  }
}
function magPress(i) {
  if (MAG.step !== 3) return;
  const pc = magExpect()[i];
  if (bookEnsure()) toneAt(A.ac.currentTime + 0.01, 60 + pc + (i === 3 ? 12 : 0), 0.45, 0.55, 'melody', true);
  if (i === MAG.notes) magAdvance();
  else { MAG.notes = 0; magPaintNotes(); }
}
function magHearSemi(pc) {
  if (MAG.step !== 3) return;
  const want = magExpect()[MAG.notes];
  if (pc === want) magAdvance();
  else { MAG.notes = 0; magPaintNotes(); }
}
function magAdvance() {
  MAG.notes++;
  if (bookEnsure()) { nz(A.ac.currentTime, 0.07, 'bandpass', 1600, 1.1, 0.04); nz(A.ac.currentTime + 0.05, 0.05, 'highpass', 2600, 0.7, 0.018); }
  if (MAG.notes >= 4) {
    MAG.step = 4; MAG.look = false; MAG.waitFrom = t; MAG.notes = 0;
    const el = $('magRead'); if (el) el.hidden = true;
    caption('she is coming to you.', 2000);
  }
  magPaintNotes();
}
function magPaintNotes() {
  const el = $('magRead'); if (!el) return;
  [...el.children].forEach((n, i) => n.classList.toggle('is-got', i < MAG.notes));
}
function magArrive() {
  if (MAG.found) return;
  MAG.found = true; MAG.step = 5; MAG.look = false;
  const px = (typeof pet !== 'undefined' && pet.placed) ? pet.x : W * 0.4;
  const py = (typeof pet !== 'undefined' && pet.placed) ? pet.y : H * 0.62;
  MAG.x = px - 70; MAG.y = py + 10; MAG.bx = MAG.x - 36; MAG.by = MAG.y + 8;
  for (let i = 0; i < 16; i++) MAG.petals.push({ x: MAG.x, y: MAG.y - 10, vx: rand(-40, 50), vy: rand(-80, -20), life: rand(1.2, 2.2) });
  document.body.classList.add('mag-home');
  const card = $('magCard');
  if (card) {
    card.hidden = false;
    const bunny = (typeof ART !== 'undefined' && ART.img && ART.img['pet-bunny'] && ART.img['pet-bunny'].naturalWidth) ? ART.img['pet-bunny'] : null;
    if (bunny) card.innerHTML = '<figure class="bunny-vignette"><img alt="" src="' + bunny.src + '"></figure><p>Mag found you. The bunny was asleep.</p>';
    else { card.innerHTML = '<div class="pair"></div><p>Mag found you. She does that.</p>'; petSlotsPaint(card.querySelector('.pair')); }
    setTimeout(() => { card.hidden = true; }, 4600);
  }
  caption('Mag found you. She does that.', 3600);
  if (typeof wingOnMag === 'function') wingOnMag();
  persistSoon();
}
function magTick(dt) {
  const paw = $('magPaw'); if (paw) paw.hidden = !(t < MAG.pawUntil || t < MAG.hintUntil);
  const carrot = $('magCarrot');
  if (!MAG.found && MAG.step === 0 && typeof WING !== 'undefined' && WING.step > 4 && UNL.rail) magShowPaw();
  if (carrot && !MAG.found) carrot.hidden = !(MAG.step === 1 && UNL.box);
  if (MAG.step === 2 && UNL.hole) {
    MAG.look = true;
    if (!MAG.looked) { MAG.looked = t; if (!hole.on && typeof setHole === 'function') setHole(true); }
    if (t - MAG.looked > 2.2) { MAG.step = 3; magBuildRead(); }
  }
  const read = $('magRead');
  if (read) {
    read.hidden = MAG.step !== 3;
    if (MAG.step === 3) {
      const x = hole.placed ? hole.x : W * 0.62, y = hole.placed ? hole.y : H * 0.48;
      read.style.left = clamp(x - 78, 8, Math.max(8, W - 170)) + 'px';
      read.style.top = clamp(y - 28, 56, Math.max(56, H - 90)) + 'px';
    }
  }
  if (MAG.step === 4 && MAG.waitFrom) {
    if (lastUserT > MAG.waitFrom + 0.35) MAG.waitFrom = t;
    if (t - MAG.waitFrom >= 5) magArrive();
  }
  if (!MAG.found) return;
  const px = (typeof pet !== 'undefined' && pet.x) ? pet.x + 48 * (S || 1) : W * 0.55;
  const py = (typeof pet !== 'undefined' && pet.y) ? pet.y + 16 * (S || 1) : H * 0.7;
  MAG.x += (px - MAG.x) * Math.min(1, dt * 1.6);
  MAG.y += (py - MAG.y) * Math.min(1, dt * 1.6);
  const ang = Math.atan2(py - MAG.y, px - MAG.x);
  const tx = MAG.x - Math.cos(ang) * 34 * (S || 1), ty = MAG.y - Math.sin(ang) * 18 * (S || 1) + 10;
  MAG.bx += (tx - MAG.bx) * Math.min(1, dt * 1.8);
  MAG.by += (ty - MAG.by) * Math.min(1, dt * 1.8);
  if (carrot) {
    carrot.hidden = false; carrot.classList.add('is-loose');
    carrot.style.left = (MAG.x - 6) + 'px'; carrot.style.top = (MAG.y - 30) + 'px';
  }
  for (let i = MAG.petals.length - 1; i >= 0; i--) {
    const p = MAG.petals[i]; p.life -= dt; if (p.life <= 0) { MAG.petals.splice(i, 1); continue; }
    p.vy += 40 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
  }
}
function drawMag(g) {
  if (!entered) return;
  const sc = (S || 1);
  if (MAG.found) {
    drawOnePet(g, MAG.bx, MAG.by, sc * 0.72, 'bunny');
    drawOnePet(g, MAG.x, MAG.y, sc * 0.92, 'mag');
  }
  MAG.petals.forEach(p => { g.fillStyle = 'rgba(244,168,140,' + Math.max(0, p.life) + ')'; g.beginPath(); g.ellipse(p.x, p.y, 4, 2.2, 0.4, 0, TAU); g.fill(); });
}
function drawOnePet(g, x, y, sc, kind) {
  const img = MAG.art[kind];
  g.save(); g.translate(x, y);
  if (img) { const w = (kind === 'mag' ? 70 : 48) * sc; g.drawImage(img, -w * 0.2, -w * 0.7, w, w * 0.75); g.restore(); return; }
  g.scale(sc, sc); g.lineJoin = 'round'; g.lineWidth = 1.4; g.strokeStyle = '#2a211c'; g.fillStyle = kind === 'mag' ? '#f7f4ee' : '#f4efe6';
  if (kind === 'mag') {
    g.beginPath(); g.ellipse(-6, 8, 22, 13, 0, 0, TAU); g.fill(); g.stroke();
    g.beginPath(); g.arc(16, -2, 12, 0, TAU); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(8, -10); g.lineTo(12, -20); g.lineTo(18, -10); g.moveTo(18, -12); g.lineTo(26, -20); g.lineTo(24, -8); g.fill(); g.stroke();
    g.fillStyle = '#241c16'; g.beginPath(); g.arc(20, -2, 1.3, 0, TAU); g.arc(25, 2, 1.5, 0, TAU); g.fill();
    g.strokeStyle = '#2a211c'; g.beginPath(); g.moveTo(-24, 8); g.quadraticCurveTo(-34, 10, -30, 16); g.moveTo(-16, 16); g.lineTo(-18, 26); g.moveTo(-6, 18); g.lineTo(-4, 28); g.moveTo(2, 18); g.lineTo(6, 28); g.stroke();
  } else {
    g.beginPath(); g.ellipse(-4, 8, 13, 10, 0, 0, TAU); g.fill(); g.stroke();
    g.beginPath(); g.arc(8, -2, 8, 0, TAU); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(2, -18, 3, 9, -0.1, 0, TAU); g.ellipse(12, -18, 3, 9, 0.15, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(-12, 8, 3, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#241c16'; g.beginPath(); g.arc(11, -2, 1.1, 0, TAU); g.fill();
  }
  g.restore();
}
magBoot();
on('magCarrot', magCarrotTap);
