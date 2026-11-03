(async () => {
  const passed = [], observations = {}, $ = id => document.getElementById(id), wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const check = (name, condition) => { if (!condition) throw Error(name); passed.push(name); };
  const status = () => $('vcStatus').textContent;
  const pending = () => status().startsWith('Muting');
  const begin = () => { $('vcHelp').open = true; $('vcStart').click(); return qa.recognizers.at(-1); };
  async function until(predicate, label) {
    for (let i = 0; i < 190; i++) { if (predicate()) return; await wait(25); }
    throw Error('Timed out: ' + label);
  }
  try {
    $('enter').click();
    const mirror = __andso.mirOpen('self', 'phone');
    await until(() => mirror.ready, 'owned mirror ready');
    await qaAsk(mirror.frame.contentWindow, 'enter');
    await qaAsk(mirror.frame.contentWindow, 'block', { on: true });
    let seen = 0;
    async function held(action = () => $('vcMute').click()) {
      action();
      for (let i = 0; i < 80; i++) {
        const state = await qaAsk(mirror.frame.contentWindow, 'state');
        const ids = [...new Set(state.protocol.filter(p => p.type === 'mute-all').map(p => p.id))];
        if (ids.length > seen) { seen = ids.length; return ids.at(-1); }
        await wait(25);
      }
      throw Error('No owned-frame mute request');
    }
    async function release(id) {
      await qaAsk(mirror.frame.contentWindow, 'release', { id });
      await until(() => qa.protocol.some(p => p.type === 'muted-all' && p.id === id && p.ok), 'successful child acknowledgement');
      await wait(50);
    }

    const first = await held(), second = await held();
    check('overlapping button invocations have distinct mirror requests', first !== second && pending());
    await release(first);
    observations.olderSuccess = status();
    check('older success cannot finish the newer pending status', pending());
    await until(() => !pending(), 'newer timeout');
    observations.newerTimeout = status();
    check('newer timeout is shown after an earlier success', status().includes('could not be confirmed'));

    const third = await held(), fourth = await held();
    await release(fourth);
    await until(() => !pending(), 'newer success');
    const latestSuccess = status();
    check('newer success is shown before the older timeout', latestSuccess === 'Sound here and 1 current mirror muted.');
    await wait(4200);
    observations.reverseCompletion = status();
    check('older timeout cannot overwrite newer success', status() === latestSuccess);

    begin();
    const stopped = await held(); $('vcStop').click(); const stoppedStatus = status();
    await release(stopped);
    check('Stop invalidates a pending button completion', status() === stoppedStatus && status() === 'Voice commands off.' && $('voiceCommands').dataset.listening === 'false');

    const navigation = await held(); window.dispatchEvent(new Event('pagehide')); const navigationStatus = status();
    await release(navigation);
    check('pagehide invalidates pending status even when recognition was already off', status() === navigationStatus && status() === 'Voice commands off.');

    const hidden = await held();
    Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange'));
    const hiddenStatus = status(); await release(hidden);
    check('hidden page invalidates the pending button status', status() === hiddenStatus && status().includes('hidden'));
    Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange'));

    let recognizer = begin();
    const earlierVoice = await held(() => recognizer.result('mute all'));
    const laterButton = await held(); await release(earlierVoice);
    check('older voice completion cannot overwrite a later button request', pending());
    await release(laterButton); await until(() => !pending(), 'later button success');
    check('button owns its final status after voice-to-button overlap', status() === 'Sound here and 1 current mirror muted.');
    $('vcStop').click();

    recognizer = begin();
    const earlierButton = await held();
    const laterVoice = await held(() => recognizer.result('mute all')); await release(laterVoice);
    await until(() => !pending(), 'later voice success'); const voiceStatus = status();
    await release(earlierButton);
    check('older button completion cannot overwrite a newer voice result', status() === voiceStatus && status().includes('Voice commands are still listening.'));
    $('vcStop').click();
    check('status regression uses no microphone or provider generation', qa.micCalls === 0 && qa.audioPlays === 0 && !qa.pendingFetch);
    check('status regression has no page errors', qa.errors.length === 0);
    $('voiceCommands').dataset.testStatus = 'complete';
    document.body.innerHTML = '<pre id="qa-result"></pre>';
    $('qa-result').textContent = JSON.stringify({ ok: true, passed, observations });
  } catch (error) {
    const failureStatus = status();
    document.body.innerHTML = '<pre id="qa-result"></pre>';
    $('qa-result').textContent = JSON.stringify({ ok: false, passed, observations, error: String(error), status: failureStatus, errors: qa.errors });
  }
})();
