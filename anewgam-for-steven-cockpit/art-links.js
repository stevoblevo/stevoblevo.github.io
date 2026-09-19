/* Address projection over the EXISTING gallery. No network, new catalog or authority. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.SaeArtLinks = api; api.mount(root); }
})(typeof window === 'object' ? window : globalThis, function () {
  'use strict';
  const HASH = /^[0-9a-f]{64}$/;
  const ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,159}$/;
  const HOME = '/anewgam-for-steven-cockpit/';
  const RELAY = 'https://relay.saelion.co';
  function routes(item) {
    if (!item || !ID.test(item.id || '') || !HASH.test(item.art?.originalSha256 || ''))
      throw new Error('This plate has no admitted art address.');
    const fragment = '#view=' + encodeURIComponent(item.id);
    return Object.freeze({id: item.id, sha256: item.art.originalSha256,
      native: 'sae://art/sha256/' + item.art.originalSha256,
      gallery: HOME + fragment, relay: RELAY + HOME + fragment,
      authorityEffect: 'none'});
  }
  function resolve(input, items) {
    if (typeof input !== 'string' || input.length > 2048 || /[\u0000-\u001f\\]/.test(input))
      throw new Error('Use a complete, unmodified art address.');
    const value = input.trim();
    const known = (Array.isArray(items) ? items : []).filter(x => HASH.test(x?.art?.originalSha256 || ''));
    const found = known.filter(x => { const r = routes(x); return value === r.native || value === r.relay || value === r.gallery; });
    if (found.length !== 1) {
      if (found.length > 1) throw new Error('Ambiguous gallery identity; nothing opened.');
      if (known.some(x => (x.art.sourceLinks || []).some(s => s.url === value)))
        throw new Error('That source is associated, but its bytes are not verified. Open the separately labeled uploaded-image arrival instead.');
      throw new Error('No matching art plate. No network request or action was made.');
    }
    return routes(found[0]);
  }
  function related(item, items) {
    return (item.art?.relations || []).map(relation => ({...relation,
      target: items.find(x => x.id === relation.targetId)})).filter(x => x.target);
  }
  async function verifyBytes(item, bytes, subtle) {
    if (!(bytes instanceof ArrayBuffer) || bytes.byteLength !== item.art.originalBytes || bytes.byteLength > 8 * 1024 * 1024)
      throw new Error('Wrong original size. Existing image was not changed.');
    const digest = Array.from(new Uint8Array(await subtle.digest('SHA-256', bytes)), x => x.toString(16).padStart(2, '0')).join('');
    if (digest !== routes(item).sha256) throw new Error('Original fingerprint mismatch. Existing image was not changed.');
    return digest;
  }
  function mount(win) {
    const doc = win.document;
    const library = doc.getElementById('library');
    if (!library || doc.getElementById('art-airport')) return;
    const el = (tag, text) => { const n = doc.createElement(tag); if (text) n.textContent = text; return n; };
    const items = () => win.__libraryItems || [];
    const panel = el('details'); panel.id = 'art-airport'; panel.className = 'boundary'; panel.open = true;
    panel.append(el('summary', 'Art Airport · land a picture, follow its thread'));
    panel.append(el('p', 'Open a known sae:// address in this gallery. A route names an artwork; it does not grant access or start work.'));
    const form = el('form'); form.className = 'library-search';
    const input = el('input'); input.type = 'text'; input.maxLength = 2048; input.placeholder = 'sae://art/sha256/…'; input.setAttribute('aria-label', 'Art address'); input.style.minWidth = '0'; input.style.width = '100%';
    const go = el('button', 'Open art'); go.type = 'submit'; form.append(input, go);
    const status = el('p'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    form.addEventListener('submit', e => { e.preventDefault(); try { const r = resolve(input.value, items()); win.__openGallery(r.id); status.textContent = 'Opened the existing gallery plate. Nothing sent.'; } catch (err) { status.textContent = err.message; } });
    panel.append(form, status);
    for (const item of items().filter(x => x.art)) {
      const button = el('button', 'Open arrival · ' + item.title); button.type = 'button';
      button.addEventListener('click', () => win.__openGallery(item.id)); panel.append(button);
    }
    library.insertBefore(panel, library.querySelector('.library-search'));
    const info = el('div'); info.id = 'art-route-info'; info.className = 'ya-ui'; info.hidden = true;
    Object.assign(info.style, {display:'block', top:'auto', bottom:'84px', left:'12px', right:'12px', maxHeight:'32vh', overflow:'auto', padding:'12px', background:'rgba(5,15,13,.94)', color:'#fff', overflowWrap:'anywhere', pointerEvents:'auto'});
    doc.getElementById('ya-stage')?.append(info);
    let objectURL = null;
    function show(id) {
      info.replaceChildren(); const item = items().find(x => x.id === id); info.hidden = !item?.art;
      if (!item?.art) return;
      const r = routes(item);
      info.append(el('p', item.art.originalLoaded ? 'Exact uploaded original verified in this tab. Not uploaded anywhere.' : 'Thumbnail of the uploaded image. The full original is not published here.'));
      const addr = el('code', r.native); info.append(addr);
      const copy = el('button', 'Copy sae://'); copy.type = 'button';
      copy.addEventListener('click', async () => { try { await win.navigator.clipboard.writeText(r.native); message.textContent = 'Art address copied. Native OS handler is not installed by this page.'; } catch { message.textContent = 'Clipboard unavailable. Select the visible address to copy it.'; } });
      info.append(copy);
      const relay = el('p', 'HTTPS route prepared, not activated: ' + r.relay); info.append(relay);
      for (const link of item.art.sourceLinks || []) {
        info.append(el('p', 'Associated Grok source: HTTP 403 observed; byte identity with this upload is unverified.'));
        if (typeof link.url === 'string' && link.url.startsWith('https://assets.grok.com/users/')) {
          const source = el('a', 'Open associated source separately'); source.href = link.url;
          source.target = '_blank'; source.rel = 'noopener noreferrer'; source.referrerPolicy = 'no-referrer'; info.append(source);
        }
      }
      for (const relation of related(item, items())) {
        const b = el('button', 'Follow thread · ' + relation.target.title); b.type = 'button';
        b.title = relation.basis; b.addEventListener('click', () => win.__openGallery(relation.targetId)); info.append(b);
        info.append(el('small', 'Proposed association: ' + relation.basis));
      }
      const choose = el('button', 'Use exact original from this device'); choose.type = 'button';
      const file = el('input'); file.type = 'file'; file.accept = 'image/png'; file.hidden = true;
      choose.addEventListener('click', () => file.click());
      file.addEventListener('change', async () => {
        const original = file.files?.[0]; if (!original) return;
        try {
          if (original.size > 8 * 1024 * 1024 || original.size !== item.art.originalBytes) throw new Error('Wrong original size. Nothing changed.');
          const bytes = await original.arrayBuffer(); await verifyBytes(item, bytes, win.crypto.subtle);
          if (objectURL) win.URL.revokeObjectURL(objectURL);
          objectURL = win.URL.createObjectURL(new Blob([bytes], {type: item.art.mime}));
          item.image = objectURL; item.art.originalLoaded = true;
          win.__openGallery(item.id);
        } catch (err) { message.textContent = err.message; }
      });
      const message = el('p'); message.setAttribute('role','status');
      info.append(choose, file, message);
    }
    win.addEventListener('sae:art-open', e => show(e.detail.id));
    win.addEventListener('pagehide', e => { if (!e.persisted && objectURL) win.URL.revokeObjectURL(objectURL); });
    // This page intentionally never calls registerProtocolHandler, fetch, or a work API.
  }
  return Object.freeze({routes, resolve, related, verifyBytes, mount});
});
