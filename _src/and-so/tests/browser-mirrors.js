(async () => {
  if (location.search.includes('qa-unrelated')) return;
  const passed = [], snapshots = {}, wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const check = (name, condition) => { if (!condition) throw Error(name); passed.push(name); };
  const settled = async () => { for (let i = 0; i < 100 && document.getElementById('vcStatus').textContent.startsWith('Muting'); i++) await wait(25); };
  let unrelated;
  try {
    document.getElementById('enter').click();
    const w = __andso.mirOpen('self', 'phone');
    for (let i = 0; i < 80 && !w.ready; i++) await wait(50);
    check('owned opaque mirror ready', w.ready && w.frame.sandbox.value === 'allow-scripts allow-pointer-lock');
    w.el.querySelector('[data-a="snd"]').click(); await wait(400);
    snapshots.before = await qaAsk(w.frame.contentWindow, 'prepare');
    check('real mirror replay and synthetic narration/paper output active', !snapshots.before.muted && snapshots.before.replayOutputs > 0 && snapshots.before.speaking && snapshots.before.paperContext === 'running');
    document.getElementById('vcMute').click(); await wait(250);
    snapshots.after = await qaAsk(w.frame.contentWindow, 'state');
    check('outer mute stops native child replay sources', snapshots.after.replayOutputs === 0 && snapshots.after.replays === 0);
    check('outer mute cancels child narration', !snapshots.after.speaking && snapshots.after.reader === 'idle');
    check('outer mute disables and suspends child paper audio', !snapshots.after.paper && snapshots.after.paperContext === 'suspended');
    check('outer mute zeros child music output', snapshots.after.muted && snapshots.after.masterGain === 0);
    check('no mirror page errors or microphone', snapshots.after.errors.length === 0 && snapshots.after.micCalls === 0);
    check('positive acknowledgement uses child opaque origin and request id', snapshots.after.protocol.some(p => p.type === 'mute-all' && p.origin === location.origin));
    await settled();
    check('UI confirms after complete mirror acknowledgement', document.getElementById('vcStatus').textContent === 'Sound here and 1 current mirror muted.');

    snapshots.spoofBefore = await qaAsk(w.frame.contentWindow, 'prepare');
    await qaAsk(w.frame.contentWindow, 'spoof', { wrongSource: true });
    snapshots.spoofAfter = await qaAsk(w.frame.contentWindow, 'spoof', { wrongSource: false });
    check('wrong-source and wrong-origin requests cannot mute a child', snapshots.spoofAfter.replayOutputs > 0 && snapshots.spoofAfter.speaking && snapshots.spoofAfter.paper);

    // A separate top-level test tab is deliberately outside MIR.wins.
    unrelated = window.open(location.pathname + '?debug&qa-unrelated', '_blank');
    check('unrelated owned test tab opened', !!unrelated);
    for (let i = 0; i < 80; i++) { try { if (unrelated.__andso) break; } catch (_) {} await wait(50); }
    snapshots.unrelatedBefore = await qaAsk(unrelated, 'prepare');
    check('unrelated tab has its own active outputs', snapshots.unrelatedBefore.replayOutputs > 0 && snapshots.unrelatedBefore.speaking && snapshots.unrelatedBefore.paper);
    document.getElementById('vcMute').click(); await wait(250);
    snapshots.unrelatedAfter = await qaAsk(unrelated, 'state');
    check('mute leaves unrelated tab replay/narration/paper untouched', snapshots.unrelatedAfter.replayOutputs > 0 && snapshots.unrelatedAfter.speaking && snapshots.unrelatedAfter.paperContext === 'running');
    unrelated.close(); unrelated = null;

    await qaAsk(w.frame.contentWindow, 'nested');
    snapshots.nestedBefore = await qaAsk(w.frame.contentWindow, 'prepare');
    check('nested current-version mirror has active outputs', snapshots.nestedBefore.nested.replayOutputs > 0 && snapshots.nestedBefore.nested.speaking && snapshots.nestedBefore.nested.paperContext === 'running');
    document.getElementById('vcHelp').open = true; document.getElementById('vcStart').click();
    const recognizer = qa.recognizers.at(-1); recognizer.result('mute all');
    check('voice command reports pending before descendants confirm', document.getElementById('vcStatus').textContent.startsWith('Muting'));
    await wait(350);
    snapshots.nestedAfter = await qaAsk(w.frame.contentWindow, 'state');
    check('recursive mute stops child and grandchild replay sources', snapshots.nestedAfter.replayOutputs === 0 && snapshots.nestedAfter.nested.replayOutputs === 0);
    check('recursive mute stops child and grandchild narration/paper', !snapshots.nestedAfter.speaking && !snapshots.nestedAfter.nested.speaking && !snapshots.nestedAfter.paper && !snapshots.nestedAfter.nested.paper && snapshots.nestedAfter.nested.paperContext === 'suspended');
    await settled();
    check('recursive acknowledgement counts descendants and keeps command input on', document.getElementById('vcStatus').textContent.includes('2 current mirrors muted') && document.getElementById('voiceCommands').dataset.listening === 'true');
    document.getElementById('vcStop').click();
    const messagesAfter = (await qaAsk(w.frame.contentWindow, 'state')).protocol.length;
    await wait(250);
    check('mute acknowledgement does not loop back into requests', (await qaAsk(w.frame.contentWindow, 'state')).protocol.length === messagesAfter);

    await qaAsk(w.frame.contentWindow, 'prepare'); await qaAsk(w.frame.contentWindow, 'block', { on: true });
    document.getElementById('vcMute').click(); await wait(100);
    const pendingState = await qaAsk(w.frame.contentWindow, 'state');
    const pendingId = pendingState.protocol.filter(p => p.type === 'mute-all').at(-1).id;
    window.dispatchEvent(new MessageEvent('message', { data: { andso: 'muted-all', id: pendingId, ok: true, count: 0 }, source: w.frame.contentWindow, origin: location.origin }));
    window.dispatchEvent(new MessageEvent('message', { data: { andso: 'muted-all', id: pendingId, ok: true, count: 0 }, source: window, origin: 'null' }));
    await qaAsk(w.frame.contentWindow, 'wrong-ack');
    check('spoofed source/origin/id acknowledgements cannot claim success', document.getElementById('vcStatus').textContent.startsWith('Muting'));
    await wait(4100);
    snapshots.unconfirmed = await qaAsk(w.frame.contentWindow, 'state');
    check('missing acknowledgement reports unconfirmed instead of all muted', document.getElementById('vcStatus').textContent.includes('could not be confirmed') && snapshots.unconfirmed.replayOutputs > 0 && snapshots.unconfirmed.speaking);
    await qaAsk(w.frame.contentWindow, 'block', { on: false });
    document.getElementById('vcMute').click(); await wait(350);
    await settled();
    snapshots.retry = await qaAsk(w.frame.contentWindow, 'state');
    check('explicit retry fully mutes the previously unconfirmed mirror', snapshots.retry.replayOutputs === 0 && !snapshots.retry.speaking && !snapshots.retry.paper && document.getElementById('vcStatus').textContent.includes('2 current mirrors muted'));
    check('recursive test performs no microphone or provider generation', snapshots.retry.micCalls === 0 && snapshots.retry.nested.micCalls === 0 && qa.micCalls === 0 && qa.audioPlays === 0);

    document.body.innerHTML = '<pre id="qa-result"></pre>';
    document.getElementById('qa-result').textContent = JSON.stringify({ ok: true, passed, snapshots });
  } catch (error) {
    if (unrelated) unrelated.close();
    const failureStatus = document.getElementById('vcStatus')?.textContent;
    document.body.innerHTML = '<pre id="qa-result"></pre>';
    document.getElementById('qa-result').textContent = JSON.stringify({ ok: false, passed, error: String(error), status: failureStatus, rootState: __andso.sound(), protocol: qa.protocol, snapshots, errors: qa.errors });
  }
})();
