// Test-only inspection bridge, copied into the real sandboxed srcdoc mirrors by SELF_SRC.
// No native recognition, microphone, synthesis, or provider fetch is used.
qa.heldMutes = new Map(); qa.protocol = []; qa.replayNodes = []; qa.requests = new Map(); qa.sequence = 0;
const nativeBufferSource = AudioContext.prototype.createBufferSource;
AudioContext.prototype.createBufferSource = function (...args) {
  const node = nativeBufferSource.apply(this, args);
  if (qa.trackReplay) {
    const entry = { started: false, stopped: false, ended: false, disconnected: false };
    qa.replayNodes.push(entry);
    for (const method of ['start', 'stop', 'disconnect']) {
      const previous = node[method].bind(node);
      node[method] = (...values) => { const result = previous(...values); entry[{ start: 'started', stop: 'stopped', disconnect: 'disconnected' }[method]] = true; return result; };
    }
    node.addEventListener('ended', () => entry.ended = true);
  }
  return node;
};
window.qaAsk = (target, command, args = {}) => new Promise((resolve, reject) => {
  const id = ++qa.sequence, timer = setTimeout(() => { qa.requests.delete(id); reject(Error('Mirror test bridge timed out: ' + command)); }, 5000);
  qa.requests.set(id, { target, resolve, reject, timer });
  target.postMessage({ qaMirror: 'request', id, command, args }, '*');
});
window.qaSnapshot = async () => ({
  ...__andso.sound(), speaking: speechSynthesis.speaking, reader: Storeybrook.read.state,
  paper: Storeybrook.sound.on, paperContext: Storeybrook.sound.ctx?.state,
  replayOutputs: qa.replayNodes.filter(n => n.started && !n.stopped && !n.ended && !n.disconnected).length,
  protocol: qa.protocol.slice(), errors: qa.errors.slice(), micCalls: qa.micCalls,
  nested: qa.nested ? await qaAsk(qa.nested.frame.contentWindow, 'state') : null
});
window.addEventListener('message', async e => {
  const d = e.data;
  if (d?.andso === 'mute-all' || d?.andso === 'muted-all') {
    qa.protocol.push({ type: d.andso, id: d.id, origin: e.origin, ok: d.ok });
    if (qa.blockMute && d.andso === 'mute-all' && qa.releasing !== d.id) { qa.heldMutes.set(d.id, { data: d, source: e.source, origin: e.origin }); e.stopImmediatePropagation(); return; }
  }
  if (d?.qaMirror === 'reply') {
    const request = qa.requests.get(d.id);
    if (!request || request.target !== e.source) return;
    clearTimeout(request.timer); qa.requests.delete(d.id);
    if (d.error) request.reject(Error(d.error)); else request.resolve(d.result);
    return;
  }
  if (d?.qaMirror !== 'request') return;
  try {
    if (d.command === 'enter') document.getElementById('enter').click();
    if (d.command === 'prepare') {
      document.getElementById('enter').click();
      if (__andso.sound().muted) document.getElementById('bSnd').click();
      qa.trackReplay = true; document.getElementById('bRep').click(); qa.trackReplay = false;
      Storeybrook.read.speak('Synthetic mirror narration');
      Storeybrook.sound.enable(true); Storeybrook.sound.play('page');
      if (Storeybrook.sound.ctx) await Storeybrook.sound.ctx.resume();
    }
    if (d.command === 'nested') {
      qa.nested = __andso.mirOpen('self', 'phone');
      for (let i = 0; i < 60 && !qa.nested.ready; i++) await new Promise(resolve => setTimeout(resolve, 50));
      qa.nested.el.querySelector('[data-a="snd"]').click();
      await new Promise(resolve => setTimeout(resolve, 350));
      await qaAsk(qa.nested.frame.contentWindow, 'prepare');
    }
    if (d.command === 'block') qa.blockMute = d.args.on;
    if (d.command === 'release') {
      const held = qa.heldMutes.get(d.args.id);
      if (!held) throw Error('No held mute request: ' + d.args.id);
      qa.heldMutes.delete(d.args.id); qa.releasing = d.args.id;
      window.dispatchEvent(new MessageEvent('message', held)); qa.releasing = null;
    }
    if (d.command === 'spoof') window.dispatchEvent(new MessageEvent('message', {
      data: { andso: 'mute-all', id: '888888888' }, source: d.args.wrongSource ? window : window.parent,
      origin: d.args.wrongSource ? document.documentElement.getAttribute('data-andso-parent-origin') : 'https://unrelated.invalid'
    }));
    if (d.command === 'wrong-ack') window.parent.postMessage({ andso: 'muted-all', id: '999999999', ok: true, count: 0 }, '*');
    e.source.postMessage({ qaMirror: 'reply', id: d.id, result: await qaSnapshot() }, '*');
  } catch (error) { e.source.postMessage({ qaMirror: 'reply', id: d.id, error: String(error) }, '*'); }
});
