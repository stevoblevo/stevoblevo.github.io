// Runs only in the generated test fixture, before the unmodified built app.
window.qa = { recognizers: [], errors: [], micCalls: 0, audioPlays: 0, starts: 0, pendingFetch: null };
window.addEventListener('error', e => qa.errors.push(e.message + ' at ' + e.lineno));
window.addEventListener('unhandledrejection', e => qa.errors.push(String(e.reason)));
localStorage.clear();
class FakeRecognition {
  constructor() { qa.recognizers.push(this); this.index = 0; this.aborts = 0; }
  start() { qa.starts++; if (!qa.delayStart) this.onstart?.(); }
  abort() { this.aborts++; this.onend?.(); }
  result(text, confidence = .96, final = true) {
    const results = Array.from({ length: this.index + 1 }, () => Object.assign([{ transcript: text, confidence }], { isFinal: final }));
    this.onresult?.({ resultIndex: this.index, results }); if (final) this.index++;
  }
}
const unsupported = location.search.includes('unsupported');
Object.defineProperty(window, 'SpeechRecognition', { value: unsupported ? undefined : FakeRecognition, configurable: true });
Object.defineProperty(window, 'webkitSpeechRecognition', { value: undefined, configurable: true });
Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: () => { qa.micCalls++; return Promise.reject(Error('Physical microphone forbidden in tests')); } });
Object.defineProperty(window, 'speechSynthesis', { value: {
  speaking: false, pending: false, getVoices: () => [{ name: 'Synthetic QA voice', lang: 'en-GB', localService: true }],
  addEventListener() {}, cancel() { this.speaking = false; this.pending = false; },
  speak(u) { this.speaking = true; u.onstart?.(); }, resume() {}, pause() {}
} });
window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
window.Audio = class { play() { qa.audioPlays++; return Promise.resolve(); } pause() {} };
window.fetch = url => {
  if (String(url).startsWith('https://api.elevenlabs.io/')) return new Promise(resolve => { qa.pendingFetch = resolve; });
  return Promise.reject(Error('Network disabled in command QA'));
};
