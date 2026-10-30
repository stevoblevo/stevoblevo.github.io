// Command mode shares the existing browser recognition route, but never feeds hearText/guardians.
// Only one input mode at a time; an ended recognition session is never restarted automatically.
let commandSession = null;
function voiceCommandsStop(message) {
  if (commandSession && commandSession.active()) commandSession.stop(message);
}
function commandNarrating() {
  const r = window.Storeybrook && Storeybrook.read, s = window.speechSynthesis;
  return !!(elPending || elAudio || (s && (s.speaking || s.pending)) || (r && r.state === 'speaking'));
}
function applyVoiceCommand(command) {
  if (!entered) return 'Enter AND SO first.';
  if (command === 'sound:off') {
    muteAllHere();
    return 'All sound here muted. Voice commands are still listening.';
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
function muteAllHere() {
  // Replay bypasses the music bus; narration and paper sounds have their own outputs.
  for (const w of MIR.wins) if (w.sound) mirSound(w, false);
  muted = true; audio.applyMix(); capture.stopReplay();
  try { if (window.Storeybrook) { Storeybrook.read.stop(true); Storeybrook.sound.enable(false); if (Storeybrook.sound.ctx) Storeybrook.sound.ctx.suspend(); } } catch (_) {}
  stopEleven();
  try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (_) {}
  syncUI();
}
function commandBoot() {
  const panel = $('voiceCommands'), start = $('vcStart'), stop = $('vcStop'), badge = $('vcBadge'), status = $('vcStatus');
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  function available() {
    const ok = !!SR && window.isSecureContext && navigator.onLine !== false && MIR.depth === 0;
    start.disabled = !ok;
    if (!commandSession.active()) {
      const message = !SR ? 'Voice commands unavailable in this browser. Use the sound controls.'
        : !window.isSecureContext ? 'Voice commands need HTTPS. Use the sound controls.'
        : MIR.depth > 0 ? 'Use voice commands in the outer AND SO window.'
        : navigator.onLine === false ? 'Offline. Use the sound controls.' : 'Voice commands off.';
      status.textContent = message;
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
      stop.disabled = !active; status.textContent = message;
    }
  });
  start.addEventListener('click', () => {
    if (!entered || !available()) return;
    if (LS.pending) { status.textContent = 'Finish the singing microphone request first.'; return; }
    if (commandNarrating()) { status.textContent = 'Stop narration before starting voice commands.'; return; }
    earsOn(false);
    if (LS.src === 'mic') listenStop(true);
    commandSession.start();
    if (commandSession.active()) { $('vcHelp').open = false; stop.focus(); }
  });
  stop.addEventListener('click', () => voiceCommandsStop());
  $('vcMute').addEventListener('click', muteAllHere);
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
