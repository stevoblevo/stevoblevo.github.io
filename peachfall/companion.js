/* Keep play connected to the same home. No remote dispatch or fake assistant replies. */
(() => {
  'use strict';
  const controls = document.querySelector('.controls');
  if (!controls) return;
  const home = document.createElement('a');
  home.className = 'sae-home-link'; home.href = '../anewgam-for-steven-cockpit/'; home.textContent = 'Sae · home'; controls.prepend(home);
  const button = (label, id) => { const b = document.createElement('button'); b.type = 'button'; b.id = id; b.textContent = label; controls.append(b); return b; };
  const thought = button('Hold a thought', 'sae-thought');
  const install = button('Keep this dream', 'sae-install');
  const dialog = document.createElement('dialog'); dialog.className = 'sae-panel'; dialog.id = 'sae-thought-dialog';
  dialog.innerHTML = '<form id="sae-thought-form"><h2>A thread from Peachfall</h2><p>Stay playful. Leave the words as they came.</p><label for="sae-thought-input">Your thought</label><textarea id="sae-thought-input" placeholder="Sae, when I return…"></textarea><p><small>Saved in the same device-local Thread Loom as your cockpit. Not sent to Sae or Saedo. No worker starts here.</small></p><div class="sae-actions"><button type="submit">Hold in my loom</button><button type="button" id="sae-thought-close">Back to play</button><a href="../anewgam-for-steven-cockpit/#loom">Open my loom</a></div><p role="status" id="sae-thought-status"></p></form>';
  document.body.append(dialog);
  const input = dialog.querySelector('textarea'), status = dialog.querySelector('[role=status]');
  thought.addEventListener('click', () => { dialog.showModal(); input.focus(); });
  dialog.querySelector('#sae-thought-close').addEventListener('click', () => dialog.close());
  // Existing game's keyboard handler is global: typing a thought must not move the player.
  dialog.addEventListener('keydown', e => e.stopPropagation());
  // Let keyup reach the game so a key held before opening does not get stuck.
  let id = crypto.randomUUID();
  input.addEventListener('input', () => { id = crypto.randomUUID(); status.textContent = ''; });
  dialog.querySelector('form').addEventListener('submit', e => {
    e.preventDefault();
    try {
      window.__saeIngress.append(localStorage, input.value, {world: 'peachfall', id});
      input.value = ''; status.className = ''; status.textContent = 'Held in your local loom. Your exact words are waiting at home. Nothing sent.';
    } catch (error) { status.className = 'sae-error'; status.textContent = error.message || 'Could not save. Your words remain here.'; }
  });
  const info = document.createElement('dialog'); info.className = 'sae-panel'; info.id = 'sae-install-dialog';
  info.innerHTML = '<h2>Keep this dream</h2><p id="sae-offline-status" role="status">Checking offline readiness…</p><p>Use your browser’s Install app option. On iPhone or iPad, use Share → Add to Home Screen.</p><p><small>Only this published game and its public assets are cached. Saves remain on this browser and origin; this is not cross-device sync.</small></p><div class="sae-actions"><button type="button" id="sae-install-close">Back to play</button></div>';
  document.body.append(info);
  info.querySelector('button').addEventListener('click', () => info.close());
  let installPrompt = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; });
  install.addEventListener('click', async () => {
    if (!installPrompt) return info.showModal();
    try { await installPrompt.prompt(); await installPrompt.userChoice; } catch { info.showModal(); }
    installPrompt = null;
  });
  window.addEventListener('appinstalled', () => { install.textContent = 'Dream installed'; });
  const offline = info.querySelector('[role=status]');
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js', {scope: './', updateViaCache: 'none'}).then(async registration => {
      const ready = await navigator.serviceWorker.ready;
      offline.textContent = ready.active ? 'Offline game ready on this browser after this successful download.' : 'Offline download not yet complete.';
      registration.update().catch(() => {});
    }).catch(() => { offline.textContent = 'Offline download unavailable. The online game still works; try again with a connection.'; });
  } else offline.textContent = 'This browser cannot install the offline game. Online play is available.';
})();
