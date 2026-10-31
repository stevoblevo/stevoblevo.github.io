// Bounded voice commands. No transcripts, audio, credentials or listening preference are stored.
const ANDSO_COMMANDS = (() => {
  function parse(text) {
    if (typeof text !== 'string' || text.length > 80) return null;
    const s = text.toLowerCase().trim().replace(/[.,!?]+$/, '').replace(/\s+/g, ' ')
      .replace(/^please /, '').replace(/ please$/, '');
    if (/^(stop listening|voice commands off)$/.test(s)) return 'listen:off';
    if (/^(mute all|mute all audio|stop all|stop all audio|sound off)$/.test(s)) return 'sound:off';
    const mode = /^(?:(?:switch to|set|use) (notes|drones?)|(?:notes|drones?) mode|(?:notes|drones?) on)$/.exec(s);
    if (mode) return /notes/.test(s) ? 'mode:pluck' : 'mode:drone';
    const layer = /^(?:(?:turn|switch) )?(?:(on|off) (?:the )?(demo hummer|hummer|hum her|rain|reign)|(?:the )?(demo hummer|hummer|hum her|rain|reign) (on|off))$/.exec(s);
    if (!layer) return null;
    return `${/^(rain|reign)$/.test(layer[2] || layer[3]) ? 'rain' : 'hummer'}:${layer[1] || layer[4]}`;
  }

  function createSession({ createRecognition, apply, report, blocked = () => false,
    now = () => performance.now(), later = setTimeout, cancel = clearTimeout }) {
    let current = null, timer = null, state = 'off', last = '', lastAt = -Infinity, revision = 0;
    const publish = message => report({ state, message });
    function stop(message = 'Voice commands off.') {
      const r = current;
      current = null; state = 'off'; revision++; cancel(timer); timer = null;
      // Invalidate first: abort may synchronously dispatch end/result in an adapter.
      if (r) { try { r.abort(); } catch (_) { /* browser has already ended */ } }
      publish(message);
    }
    function start() {
      if (current) return;
      if (blocked()) { publish('Stop narration before starting voice commands.'); return; }
      let r;
      try { r = createRecognition(); } catch (_) { publish('Voice commands unavailable. Use the sound controls.'); return; }
      current = r; state = 'starting'; last = ''; lastAt = -Infinity;
      r.continuous = true; r.interimResults = false; r.maxAlternatives = 1; r.lang = 'en-US';
      const seen = new Set();
      r.onstart = () => {
        if (current !== r) { try { r.abort(); } catch (_) {} return; }
        state = 'listening'; cancel(timer);
        timer = later(() => stop('Voice commands off after 45 seconds. Start again when ready.'), 45000);
        publish('Listening for a command.');
      };
      r.onresult = event => {
        if (current !== r || state !== 'listening') return;
        if (blocked()) { stop('Voice commands off while narration plays.'); return; }
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (current !== r) return;
          const result = event.results[i];
          if (!result.isFinal || seen.has(i)) continue;
          seen.add(i);
          const best = result[0], confidence = best && best.confidence;
          const command = Number.isFinite(confidence) && confidence >= 0.75 && confidence <= 1 ? parse(best.transcript) : null;
          if (!command) { publish('No clear command. Use an example below or the sound controls.'); continue; }
          if (command === last && now() - lastAt < 1200) continue;
          last = command; lastAt = now();
          if (command === 'listen:off') { stop(); return; }
          const actionRevision = ++revision;
          try {
            const outcome = apply(command);
            if (outcome && typeof outcome.then === 'function') {
              publish('Muting sound here and current mirrors…');
              outcome.then(message => { if (current === r && revision === actionRevision) publish(message); })
                .catch(() => { if (current === r && revision === actionRevision) stop('Command unavailable. Use the sound controls.'); });
            } else publish(outcome);
          } catch (_) { stop('Command unavailable. Use the sound controls.'); return; }
        }
      };
      r.onnomatch = () => { if (current === r) publish('No clear command. Use the sound controls.'); };
      r.onerror = event => {
        if (current !== r) return;
        const messages = {
          'not-allowed': 'Microphone permission denied or removed. Use the sound controls.',
          'service-not-allowed': 'Speech recognition is blocked. Use the sound controls.',
          'audio-capture': 'Microphone unavailable. Use the sound controls.',
          network: 'Speech service unavailable or offline. Use the sound controls.',
          'no-speech': 'No speech heard. Voice commands off.',
          aborted: 'Voice commands off.'
        };
        stop(messages[event.error] || 'Speech recognition ended. Use the sound controls.');
      };
      r.onend = () => { if (current === r) stop('Voice commands off. Start again when ready.'); };
      timer = later(() => stop('Microphone did not start. Use the sound controls.'), 8000);
      publish('Starting microphone…');
      try { r.start(); } catch (_) { stop('Microphone could not start. Use the sound controls.'); }
    }
    return { start, stop, active: () => current !== null };
  }
  return { parse, createSession };
})();
