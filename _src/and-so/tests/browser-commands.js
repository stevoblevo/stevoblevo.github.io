(async () => {
  const passed = [], $ = id => document.getElementById(id), wait = ms => new Promise(r => setTimeout(r, ms));
  function check(name, condition) { if (!condition) throw Error(name); passed.push(name); }
  function click(id) { $(id).click(); }
  function begin() { $('vcHelp').open = true; click('vcStart'); return qa.recognizers.at(-1); }
  function off() { return $('voiceCommands').dataset.listening === 'false'; }
  try {
    check('no recognition or getUserMedia on load', qa.starts === 0 && qa.micCalls === 0);
    click('enter'); await wait(100);
    $('vcHelp').open = true;
    if (location.search.includes('visual')) { await wait(1000); $('voiceCommands').dataset.visual = 'ready'; return; }
    check('provider disclosure precedes activation', $('vcPrivacy').textContent.includes('speech provider') && qa.starts === 0);
    check('controls visible after enter', $('voiceCommands').getBoundingClientRect().height > 0);
    const soundControl = $(__andso.geo().phone ? 'tSound' : 'bSnd'), soundBox = soundControl.getBoundingClientRect();
    check('voice panel does not cover ordinary sound button', document.elementFromPoint(soundBox.x + soundBox.width / 2, soundBox.y + soundBox.height / 2)?.closest('button') === soundControl);
    check('keyboard targets at least 44px', $('vcStop').getBoundingClientRect().height >= 44 && $('vcStart').getBoundingClientRect().height >= 44);
    if (location.search.includes('unsupported')) {
      check('unsupported start disabled with fallback explanation', $('vcStart').disabled && $('vcStatus').textContent.includes('unavailable'));
      click('lDemo'); check('ordinary hummer works without speech support', __andso.sound().hummer);
      click('lStop'); click('sRain'); check('ordinary rain works without speech support', __andso.sound().rain);
      document.querySelector('[data-artic="drone"]').click(); check('ordinary modes work without speech support', __andso.sound().artic === 'drone');
      click('vcMute'); check('ordinary mute works without speech support', __andso.sound().muted);
    } else {
      let r = begin(); check('visible listening and enabled stop', !off() && !$('vcStop').disabled && $('vcBadge').textContent.includes('Listening'));
      r.result('rain on'); check('rain on changes actual checkbox/state', $('sRain').checked && __andso.sound().rain);
      r.result('rain on'); check('repeat on stays on', __andso.sound().rain);
      r.result('rain off'); check('rain off changes actual state', !$('sRain').checked && !__andso.sound().rain);
      r.result('hummer on'); check('hummer on starts real demo', __andso.ls().src === 'demo');
      r.result('hummer on'); check('repeat hummer on keeps same mode', __andso.ls().src === 'demo');
      r.result('hummer off'); check('hummer off stops demo', __andso.ls().src === null);
      r.result('drone mode'); check('drone mode changes real articulation', __andso.sound().artic === 'drone');
      r.result('notes'); check('bare notes ignored', __andso.sound().artic === 'drone');
      r.result('notes mode'); check('notes mode changes real articulation', __andso.sound().artic === 'pluck');
      r.result('rain on', .2); r.result('rain on', .96, false); r.result('do not turn rain on');
      check('low confidence/interim/negation ignored', !__andso.sound().rain);
      r.result('private words that must not be saved'); await wait(350);
      check('raw words absent from page and storage', !document.body.innerText.includes('private words') && !JSON.stringify(localStorage).includes('private words'));
      click('bRep'); check('replay is playing through its existing output', __andso.sound().replays > 0);
      r.result('mute all'); await wait(150);
      check('mute all stops replay and mutes music without stopping mic', __andso.sound().muted && __andso.sound().replays === 0 && !off());
      r.result('rain on'); check('layer on preserves master mute', __andso.sound().rain && __andso.sound().muted);
      r.result('stop listening'); check('stop listening aborts without changing mute', off() && r.aborts > 0 && __andso.sound().muted);
      r.result('rain off'); check('late result after stop ignored', __andso.sound().rain);
      r = begin(); r.onerror({ error: 'not-allowed' }); check('denial stops with fallback', off() && $('vcStatus').textContent.includes('denied'));
      const deniedStarts = qa.starts; await wait(600); check('permission error never restarts', qa.starts === deniedStarts);
      r = begin(); r.onend(); const endStarts = qa.starts; await wait(600); check('browser end never restarts', off() && qa.starts === endStarts);
      qa.delayStart = true; r = begin(); click('vcStop'); r.onstart(); r.result('rain off'); qa.delayStart = false;
      check('stop while permission pending ignores late start/result', off() && __andso.sound().rain && r.aborts >= 2);
      r = begin(); Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange'));
      check('hidden page aborts microphone', off() && r.aborts > 0);
      Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange'));
      check('tab regain does not resume microphone', off());
      r = begin(); window.dispatchEvent(new Event('pagehide')); check('navigation aborts microphone', off() && r.aborts > 0);
      r = begin(); Object.defineProperty(navigator, 'onLine', { value: false, configurable: true }); window.dispatchEvent(new Event('offline'));
      check('offline stops microphone and leaves fallback controls', off() && $('vcStart').disabled && !$('vcMute').disabled);
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true }); window.dispatchEvent(new Event('online'));
      check('online enables Start without restarting', off() && !$('vcStart').disabled);
      r = begin(); click('sEars'); check('overhearing takes over microphone', off());
      const ears = qa.recognizers.at(-1); r = begin(); check('commands stop overhearing', !$('sEars').checked && ears.aborts > 0);
      ears.result('rain on'); check('old overhearing result not journaled', !document.body.innerText.includes('overheard: “rain on”'));
      Storeybrook.read.speak('Synthetic narration'); check('narration stops command mic before speech', off() && r.aborts > 0);
      const beforeNarration = qa.starts; click('vcStart'); check('narration blocks mic restart', qa.starts === beforeNarration);
      click('vcMute');
      r = begin(); $('sElOn').checked = true; $('sElOn').dispatchEvent(new Event('change'));
      for (const [id, value] of [['sElKey', 'synthetic-test-key'], ['sElId', 'synthetic-test-voice']]) { $(id).value = value; $(id).dispatchEvent(new Event('change')); }
      click('sVoiceTest'); check('pending synthesized speech stops command mic', off() && typeof qa.pendingFetch === 'function');
      const beforePending = qa.starts; click('vcStart'); check('pending speech also blocks restart', qa.starts === beforePending);
      click('vcMute'); qa.pendingFetch({ ok: true, blob: async () => new Blob(['synthetic']) }); await wait(100);
      check('mute prevents a late narration response and fallback from speaking', qa.audioPlays === 0 && !speechSynthesis.speaking);
      $('sElOn').checked = false; $('sElOn').dispatchEvent(new Event('change'));
      r = begin(); __andso.setQuiet(true); check('Quiet retains mic status and stop', $('voiceCommands').getBoundingClientRect().height > 0 && !$('vcStop').disabled);
      $('vcStop').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); check('Escape in command panel stops mic', off());
      const box = $('voiceCommands').getBoundingClientRect(); check('panel fits viewport', box.left >= 0 && box.right <= innerWidth && box.bottom <= innerHeight);
      click('pbStop'); await wait(50);
      $('vcStart').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      r = begin(); await wait(50);
      check('starting command input preserves stopped game audio', __andso.sound().audioState === 'suspended' && !off());
      click('vcStop');
      check('no physical microphone access', qa.micCalls === 0);
    }
    check('no page errors', qa.errors.length === 0);
    document.body.innerHTML = '<pre id="qa-result"></pre>'; $('qa-result').textContent = JSON.stringify({ ok: true, viewport: [innerWidth, innerHeight], passed });
  } catch (error) {
    document.body.innerHTML = '<pre id="qa-result"></pre>'; $('qa-result').textContent = JSON.stringify({ ok: false, passed, error: String(error), errors: qa.errors });
  }
})();
