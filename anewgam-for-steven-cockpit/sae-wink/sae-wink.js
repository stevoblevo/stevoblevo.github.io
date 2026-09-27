/* Sae-wink v1: local UI, not a camera event or an agent/transport receipt. */
const assets = new URL('.', import.meta.url);

export class SaeWink extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = `
      <link rel="stylesheet">
      <button class="bubble" type="button" aria-label="Open Sae" aria-haspopup="dialog" aria-expanded="false">
        <span class="art" aria-hidden="true"><img alt="" width="96" height="192" draggable="false"></span>
        <span class="fallback">Sae</span>
      </button>
      <dialog aria-label="Sae local draft">
        <form method="dialog"><button class="close" aria-label="Close Sae" value="close">×</button></form>
        <p class="name">Sae <span aria-hidden="true">♡</span></p>
        <p class="status" role="status">Local draft · not sent.</p>
        <label for="thought">A thought for Sae</label>
        <textarea id="thought" rows="4" maxlength="8000" placeholder="Sae-hmm…"></textarea>
        <div class="actions"><button class="copy" type="button">Grok ask ↗</button><button class="rest" type="button" aria-pressed="false" title="Pause decoration only; not a camera control">hold</button></div>
        <p class="detail">Copy a handoff. No camera, microphone, or message is sent by this bubble.</p>
      </dialog>`;
    const link = root.querySelector('link');
    link.href = new URL('sae-wink.css', assets).href;
    const image = root.querySelector('img');
    image.addEventListener('load', () => root.querySelector('.bubble').classList.add('has-art'));
    image.addEventListener('error', () => root.querySelector('.bubble').classList.remove('has-art'));
    image.src = new URL('sae-wink-sprite.webp', assets).href;
    const button = root.querySelector('.bubble');
    const dialog = root.querySelector('dialog');
    const input = root.querySelector('textarea');
    const status = root.querySelector('.status');
    // Keep the host world's global gestures, including its camera-bound sae-wink,
    // from seeing interactions inside this control. Do not cancel normal editing.
    for (const name of ['wheel', 'touchmove', 'keydown', 'pointerdown', 'click']) {
      root.addEventListener(name, (event) => event.stopPropagation());
    }
    button.addEventListener('click', () => this.open());
    dialog.addEventListener('close', () => {
      button.setAttribute('aria-expanded', 'false');
      button.focus();
    });
    root.querySelector('.rest').addEventListener('click', (event) => {
      const resting = this.toggleAttribute('resting');
      event.currentTarget.setAttribute('aria-pressed', String(resting));
      event.currentTarget.textContent = resting ? 'wake' : 'hold';
    });
    root.querySelector('.copy').addEventListener('click', async () => {
      const draft = input.value.trim();
      if (!draft) { status.textContent = 'Write a thought first.'; input.focus(); return; }
      const context = this.context();
      const text = [
        '/anew · Grok ask',
        'Continue the existing world; do not scaffold another app.',
        `World: ${context.world}. Route: ${context.route}. Local marks: ${context.marks}.`,
        'Keep the current art, scene, return path and privacy boundary.',
        'This is a user-copied draft, not a Saedo submission or camera consent.',
        '', draft,
      ].join('\n');
      try {
        await navigator.clipboard.writeText(text);
        status.textContent = 'Copied · not sent. Paste into the existing Grok project.';
      } catch {
        // No clipboard claim on failure. The text remains in a selectable field.
        input.value = text; input.focus(); input.select();
        status.textContent = 'Clipboard unavailable. Select and copy this handoff.';
      }
    });
  }

  context() {
    const bounded = (value, fallback) => (value || fallback).replace(/[\r\n]/g, ' ').slice(0, 160);
    const count = Number(this.getAttribute('mark-count') || 0);
    return {
      world: bounded(this.getAttribute('world'), 'anewgam'),
      // Never include query strings, URL fragments, camera bytes or browser storage.
      route: window.location.pathname.slice(0, 256),
      marks: Number.isSafeInteger(count) && count >= 0 ? Math.min(count, 24) : 0,
    };
  }

  open() {
    const root = this.shadowRoot;
    if (!root) return;
    // A host may explicitly intercept this to open its EXISTING chat composer.
    // Preventing default means UI handled only; it is NOT a work acceptance receipt.
    const request = new CustomEvent('sae:chat-request', {
      bubbles: true, composed: true, cancelable: true,
      detail: { version: 1, context: this.context() },
    });
    if (!this.dispatchEvent(request)) return;
    const dialog = root.querySelector('dialog');
    if (dialog.open) return;
    dialog.showModal();
    root.querySelector('.bubble').setAttribute('aria-expanded', 'true');
    root.querySelector('textarea').focus();
  }
}

if (!customElements.get('sae-wink')) customElements.define('sae-wink', SaeWink);
