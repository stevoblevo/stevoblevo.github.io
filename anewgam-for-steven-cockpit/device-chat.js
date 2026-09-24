/* Generic device/chat boundary. Transport failures never imply device failure. */
(() => {
  'use strict';
  const KEY = 'anewgam.device-chat.v1';
  const $ = selector => document.querySelector(selector);
  const defaults = {device:'this device', chat:'unknown', bridge:'not-tested', pending:null, updatedAt:null};
  let state = {...defaults};
  try { state = {...defaults, ...JSON.parse(localStorage.getItem(KEY) || '{}')}; } catch {}

  function save() {
    state.updatedAt = new Date().toISOString();
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
    render();
    window.dispatchEvent(new CustomEvent('anewgam:device-chat-state', {detail:{...state}}));
  }
  function label() {
    if (state.chat === 'message-stream-error') return ['Message stream interrupted', 'warn'];
    if (state.chat === 'online' && state.bridge === 'verified') return ['Chat online · bridge verified', 'ok'];
    if (state.chat === 'online') return ['Chat online · bridge not tested', 'ok'];
    if (state.chat === 'reconnecting') return ['Chat reconnecting · device unchanged', 'warn'];
    return ['Chat state unknown · device unchanged', ''];
  }
  function render() {
    const out = $('#deviceChatState'), note = $('#deviceChatNote'), retry = $('#deviceChatRetry');
    if (!out || !note || !retry) return;
    const [text, tone] = label(); out.textContent = text; out.dataset.tone = tone;
    note.textContent = state.pending
      ? `Pending command held locally for ${state.device}. It has not been sent or completed.`
      : `Current doorway: ${state.device}. Chat transport and device reachability are tracked separately.`;
    retry.hidden = !state.pending;
  }
  function setChat(status) {
    if (!['unknown','online','reconnecting','message-stream-error'].includes(status)) throw new TypeError('invalid chat status');
    state.chat = status; save();
  }
  function setBridge(status) {
    if (!['not-tested','awaiting-approval','verified','failed'].includes(status)) throw new TypeError('invalid bridge status');
    state.bridge = status; save();
  }
  function hold(command, device='this device') {
    state.device = String(device).slice(0,80);
    state.pending = {text:String(command).slice(0,4000), heldAt:new Date().toISOString()};
    save();
  }
  function clearPending() { state.pending = null; save(); }

  window.__anewgamDeviceChat = {getState:()=>({...state}), setChat, setBridge, hold, clearPending};
  window.addEventListener('online', () => setChat('online'));
  window.addEventListener('offline', () => setChat('reconnecting'));
  window.addEventListener('anewgam:message-stream-error', event => {
    state.chat = 'message-stream-error';
    if (event.detail?.command) hold(event.detail.command, event.detail.device);
    else save();
  });
  $('#deviceChatRetry')?.addEventListener('click', () => {
    setChat(navigator.onLine ? 'online' : 'reconnecting');
    window.__anewgam?.toast('Chat retry requested. Pending work remains local until the bridge confirms receipt.');
  });
  $('#deviceChatClear')?.addEventListener('click', clearPending);
  if (state.chat === 'unknown' && navigator.onLine) state.chat = 'online';
  save();
})();
