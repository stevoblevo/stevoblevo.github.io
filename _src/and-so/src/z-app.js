// ===== AND SO as an app: on stevoblevo.github.io it installs to a home screen or a dock and opens offline =====
// The manifest and the service worker sit next to the page (/and-so/manifest.webmanifest and /and-so/sw.js, from
// _src/and-so/pwa/). The worker goes to the network first and keeps a copy of whatever it fetched, so being online
// always brings the newest build and being offline brings the last one you had. Elsewhere (the artifact, a file on
// disk, a copy inside the mirror) none of this runs.
const APP = { prompt: null, standalone: (() => { try { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch (e) { return false; } })() };
function appNote() {
  const ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  $('gInstall').classList.toggle('hidden', !APP.prompt);
  $('gInstallNote').textContent = !VER_ON_PAGES ? 'at stevoblevo.github.io/and-so, AND SO installs like an app and opens without a connection.'
    : APP.standalone ? "you're in the app. it opens without a connection, and picks up the newest build whenever you're online."
    : APP.prompt ? 'installs like an app: its own window or home-screen icon, and it opens without a connection.'
    : ios ? 'on an iPhone or iPad: Share, then Add to Home Screen. it opens without a connection after that.'
    : 'once a page has loaded here, it opens without a connection too. your browser may offer to install it from the address bar.';
}
if (VER_ON_PAGES && MIR.depth === 0 && 'serviceWorker' in navigator) {
  const reg = () => navigator.serviceWorker.register('/and-so/sw.js', { scope: '/and-so/' }).catch(() => { /* private window or blocked: plays online as before */ });
  if (document.readyState === 'complete') reg(); else window.addEventListener('load', reg, { once: true });
}
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); APP.prompt = e; appNote(); });
window.addEventListener('appinstalled', () => { APP.prompt = null; APP.standalone = true; appNote(); jlog('installed AND SO as an app'); });
on('gInstall', async () => { const p = APP.prompt; if (!p) return; APP.prompt = null; p.prompt(); try { await p.userChoice; } catch (e) { /* closed */ } appNote(); });
if (MIR.depth > 0) { $('gInstall').closest('.btns').classList.add('hidden'); $('gInstallNote').classList.add('hidden'); }
appNote();
