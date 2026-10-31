// Command mode shares the existing browser recognition route, but never feeds hearText/guardians.
// Only one input mode at a time; an ended recognition session is never restarted automatically.
let commandSession = null;
function voiceCommandsStop(message) {
  // Also invalidate pending manual-command status when input was already off.
  if (commandSession) commandSession.stop(message);
}
function commandNarrating() {
  const r = window.Storeybrook && Storeybrook.read, s = window.speechSynthesis;
  return !!(elPending || elAudio || (s && (s.speaking || s.pending)) || (r && r.state === 'speaking'));
}
function applyVoiceCommand(command) {
  if (!entered) return 'Enter AND SO first.';
  if (command === 'sound:off') {
    return muteAllHere().then(result => muteAllMessage(result) + ' Voice commands are still listening.');
  }
  // Take over from a tour just as an ordinary sound control does. Never restart playback/unmute.
  if (REEL.on) reelStop(false);
  if (DREAM.on) dreamFinish(false);
  lastUserT = t; userIdleUntil = t + 14;
  const [target, value] = command.split(':');
  if (target === 'hummer') {
    LS.used = true; LS.autoDone = true;
    if (value === 'off') { if (LS.src === 'demo') listenStop(true); }
    else if (LS.src !== 'demo') listenStart('demo');
    syncUI();
    return value === 'on' && LS.src !== 'demo' ? 'Hummer unavailable. Use the sound controls.' : `Hummer ${value}${muted ? ' · sound is muted' : ''}.`;
  }
  if (target === 'rain') {
    SET.rain = value === 'on'; rainOn(SET.rain); syncUI(); persistSoon();
    return `Rain ${value}${muted ? ' · sound is muted' : ''}.`;
  }
  if (target === 'mode') {
    if (SET.artic !== value) setArtic(value, true);
    return `${value === 'pluck' ? 'Notes' : 'Drones'} mode${muted ? ' · sound is muted' : ''}.`;
  }
  return 'No command applied.';
}
function localOutputsMuted() {
  const sb = window.Storeybrook, sy = window.speechSynthesis;
  return muted && (!A.vol || A.vol.gain.value === 0 || (A.ac && A.ac.state === 'suspended')) && capture.replays.size === 0 && !elAudio && !elPending &&
    !(sy && (sy.speaking || sy.pending)) && (!sb || ((!sb.read || sb.read.state === 'idle') &&
    !sb.sound.on && (!sb.sound.ctx || sb.sound.ctx.state !== 'running')));
}
function muteAllMessage(result) {
  return result.ok ? `Sound here${result.count ? ' and ' + result.count + ' current mirror' + (result.count === 1 ? '' : 's') : ''} muted.`
    : 'Mute requested; some sound could not be confirmed stopped. Close any unconfirmed mirrors.';
}
async function muteAllHere() {
  // Replay bypasses the music bus; narration and paper sounds have their own outputs.
  const mirrors = mirMuteAll();
  muted = true; audio.applyMix(); capture.stopReplay();
  if (A.ac && A.vol) { A.vol.gain.cancelScheduledValues(A.ac.currentTime); A.vol.gain.setValueAtTime(0, A.ac.currentTime); }
  let paperStopped = Promise.resolve();
  try {
    if (window.Storeybrook) {
      Storeybrook.read.stop(true); Storeybrook.sound.enable(false);
      const ctx = Storeybrook.sound.ctx;
      if (ctx && ctx.state !== 'closed') paperStopped = ctx.suspend();
    }
  } catch (_) { /* final output check prevents a false confirmation */ }
  stopEleven();
  try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (_) {}
  syncUI();
  // Never confirm the complete tree before descendants acknowledge and local outputs are actually quiet.
  Promise.resolve(paperStopped).catch(() => {}); // Don't let a stalled engine promise hold the status forever.
  const tree = await mirrors;
  // Engines may expose cancellation/gain changes on the next audio task rather than this microtask.
  for (let i = 0; i < 20 && !localOutputsMuted(); i++) await new Promise(resolve => setTimeout(resolve, 25));
  return { ok: tree.ok && localOutputsMuted(), count: tree.count };
}
function commandBoot() {
  const panel = $('voiceCommands'), start = $('vcStart'), stop = $('vcStop'), badge = $('vcBadge'), status = $('vcStatus');
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let statusRevision = 0;
  function setStatus(message) { status.textContent = message; return ++statusRevision; }
  function available() {
    const ok = !!SR && window.isSecureContext && navigator.onLine !== false && MIR.depth === 0;
    start.disabled = !ok;
    if (!commandSession.active()) {
      const message = !SR ? 'Voice commands unavailable in this browser. Use the sound controls.'
        : !window.isSecureContext ? 'Voice commands need HTTPS. Use the sound controls.'
        : MIR.depth > 0 ? 'Use voice commands in the outer AND SO window.'
        : navigator.onLine === false ? 'Offline. Use the sound controls.' : 'Voice commands off.';
      setStatus(message);
    }
    return ok;
  }
  commandSession = ANDSO_COMMANDS.createSession({
    createRecognition: () => new SR(), apply: applyVoiceCommand, blocked: commandNarrating,
    report: ({ state, message }) => {
      const active = state !== 'off';
      panel.dataset.listening = String(active);
      badge.textContent = state === 'starting' ? 'Starting…' : active ? '● Listening' : 'Off';
      start.disabled = active || !SR || !window.isSecureContext || navigator.onLine === false || MIR.depth > 0;
      stop.disabled = !active; setStatus(message);
    }
  });
  start.addEventListener('click', () => {
    if (!entered || !available()) return;
    if (LS.pending) { setStatus('Finish the singing microphone request first.'); return; }
    if (commandNarrating()) { setStatus('Stop narration before starting voice commands.'); return; }
    earsOn(false);
    if (LS.src === 'mic') listenStop(true);
    commandSession.start();
    if (commandSession.active()) { $('vcHelp').open = false; stop.focus(); }
  });
  stop.addEventListener('click', () => voiceCommandsStop());
  $('vcMute').addEventListener('click', () => {
    commandSession.invalidatePendingStatus();
    const requestRevision = setStatus('Muting sound here and current mirrors…');
    // Equal pending text does not imply the same request. Only its owner may finish it.
    muteAllHere().then(result => { if (statusRevision === requestRevision) setStatus(muteAllMessage(result)); })
      .catch(() => { if (statusRevision === requestRevision) setStatus('Mute could not be confirmed. Use the sound controls or close the mirrors.'); });
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) voiceCommandsStop('Voice commands off while this page is hidden.'); });
  window.addEventListener('pagehide', () => voiceCommandsStop());
  window.addEventListener('offline', () => { voiceCommandsStop('Offline. Use the sound controls.'); available(); });
  window.addEventListener('online', available); // Update the button only; never restart.
  // All existing read-aloud entry points go through these methods. Stop before producing speech.
  const r = window.Storeybrook && Storeybrook.read;
  if (r) for (const method of ['speak', 'resume']) {
    const previous = r[method].bind(r);
    r[method] = (...args) => { voiceCommandsStop('Voice commands off while narration plays.'); return previous(...args); };
  }
  panel.addEventListener('keydown', event => {
    // A keyboard interaction in this panel must not play a jam note or trigger a game shortcut.
    if (event.key === 'Escape') voiceCommandsStop();
    event.stopPropagation();
  });
  available();
}
commandBoot();
