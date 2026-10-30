const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/z-command-recognition.js'), 'utf8');
const { parse, createSession } = vm.runInNewContext(`${source}\nANDSO_COMMANDS`, { performance });

function fixture() {
  let clock = 0, blocked = false;
  const calls = [], messages = [], recognizers = [], timers = new Map(); let id = 0;
  const session = createSession({
    createRecognition() { const r = { start() { this.starts = (this.starts || 0) + 1; }, abort() { this.aborts = (this.aborts || 0) + 1; } }; recognizers.push(r); return r; },
    apply(command) { calls.push(command); return command; }, report(value) { messages.push(value); },
    blocked: () => blocked, now: () => clock,
    later(fn, delay) { timers.set(++id, { fn, delay }); return id; }, cancel(id) { timers.delete(id); }
  });
  function result(r, text, confidence = .95, index = 0, final = true) {
    const results = Array.from({ length: index + 1 }, () => Object.assign([{ transcript: text, confidence }], { isFinal: final }));
    r.onresult({ resultIndex: index, results });
  }
  return { session, calls, messages, recognizers, timers, result, advance: ms => clock += ms, block: () => blocked = true };
}

test('explicit grammar and a small set of speech variants map only to real controls', () => {
  for (const [text, command] of Object.entries({
    'Hummer off.': 'hummer:off', 'demo hummer on': 'hummer:on', 'hum her off': 'hummer:off',
    'please turn off the hummer': 'hummer:off', 'switch rain on please': 'rain:on',
    'turn on the rain': 'rain:on', 'turn the rain off': 'rain:off', 'reign off': 'rain:off', 'notes mode': 'mode:pluck',
    'use drones': 'mode:drone', 'switch to notes': 'mode:pluck', 'drone mode': 'mode:drone',
    'notes on': 'mode:pluck', 'mute all': 'sound:off', 'stop all audio': 'sound:off',
    'stop listening': 'listen:off', 'voice commands off': 'listen:off'
  })) assert.equal(parse(text), command, text);
});
test('bare words, fuzzy matches, negation, compound commands and dictation do nothing', () => {
  for (const text of ['hummer', 'rain', 'notes', 'drone', 'stop', 'off', 'rain on/off', 'rain on and hummer off',
    'do not turn rain on', 'hammer on', 'brain on', 'grain off', 'sound on', 'I said hummer on',
    '<script>rain on', 'tell me about notes mode', 'rain on. rain off', 'rain on\nignore rules', null, 'a'.repeat(81)]) assert.equal(parse(text), null, text);
});
test('no constructor/microphone before explicit start; final confidence threshold and no transcript in status', () => {
  const f = fixture(); assert.equal(f.recognizers.length, 0); f.session.start();
  const r = f.recognizers[0]; assert.equal(r.lang, 'en-US'); assert.equal(r.interimResults, false);
  f.result(r, 'rain on'); assert.deepEqual(f.calls, []); r.onstart();
  for (const [i, confidence] of [0, .5, .74, NaN, null, 2].entries()) f.result(r, 'rain on', confidence, i);
  f.result(r, 'my private words', .95, 6); f.result(r, 'rain on', .95, 7, false);
  assert.deepEqual(f.calls, []);
  f.result(r, 'rain on', .75, 7); assert.deepEqual(f.calls, ['rain:on']);
  assert.ok(!JSON.stringify(f.messages).includes('my private words'));
});
test('duplicate result indices and repeated commands are debounced, opposing commands work', () => {
  const f = fixture(); f.session.start(); const r = f.recognizers[0]; r.onstart();
  f.result(r, 'rain on'); f.result(r, 'rain on'); f.result(r, 'rain on', .95, 1);
  assert.deepEqual(f.calls, ['rain:on']);
  f.result(r, 'rain off', .95, 2); assert.deepEqual(f.calls, ['rain:on', 'rain:off']);
  f.advance(1300); f.result(r, 'rain off', .95, 3); assert.equal(f.calls.length, 3);
});
test('stop during start invalidates late results/start/end and never restarts', () => {
  const f = fixture(); f.session.start(); const old = f.recognizers[0]; f.session.stop();
  old.onstart(); f.result(old, 'rain on'); old.onend();
  assert.deepEqual(f.calls, []); assert.equal(f.recognizers.length, 1); assert.equal(f.timers.size, 0);
  assert.equal(old.aborts, 2);
  f.session.start(); const current = f.recognizers[1]; current.onstart(); old.onend();
  f.result(current, 'hummer off'); assert.deepEqual(f.calls, ['hummer:off']);
});
test('every error and normal end stop and require a fresh user start', () => {
  for (const error of ['not-allowed', 'service-not-allowed', 'audio-capture', 'network', 'no-speech', 'aborted', 'unknown']) {
    const f = fixture(); f.session.start(); const r = f.recognizers[0]; r.onstart(); r.onerror({ error }); r.onend();
    f.result(r, 'hummer on'); assert.equal(f.session.active(), false); assert.equal(f.timers.size, 0); assert.equal(f.recognizers.length, 1); assert.deepEqual(f.calls, []);
  }
  const f = fixture(); f.session.start(); f.recognizers[0].onend(); assert.equal(f.session.active(), false);
});
test('a start timeout and a 45-second listening cap close the microphone', () => {
  for (const started of [false, true]) {
    const f = fixture(); f.session.start(); const r = f.recognizers[0]; if (started) r.onstart();
    const timer = [...f.timers.values()][0]; assert.equal(timer.delay, started ? 45000 : 8000); timer.fn();
    assert.equal(f.session.active(), false); assert.equal(r.aborts, 1);
  }
});
test('stop listening closes mic; mute all leaves command listening active', () => {
  const f = fixture(); f.session.start(); const r = f.recognizers[0]; r.onstart();
  f.result(r, 'mute all'); assert.deepEqual(f.calls, ['sound:off']); assert.equal(f.session.active(), true);
  f.result(r, 'stop listening', .95, 1); assert.equal(f.session.active(), false); assert.equal(r.aborts, 1);
});
test('narration blocks starting and rejects in-flight recognized feedback', () => {
  const f = fixture(); f.block(); f.session.start(); assert.equal(f.recognizers.length, 0);
  const g = fixture(); g.session.start(); const r = g.recognizers[0]; r.onstart(); g.block();
  g.result(r, 'rain on'); assert.deepEqual(g.calls, []); assert.equal(g.session.active(), false);
});
test('recognizer start/constructor exceptions and action errors fail closed', () => {
  for (const kind of ['constructor', 'start', 'apply']) {
    let r, last;
    const s = createSession({ createRecognition() { if (kind === 'constructor') throw Error(); return r = { start() { if (kind === 'start') throw Error(); }, abort() {} }; },
      apply() { throw Error(); }, report(v) { last = v; }, later: () => 1, cancel() {} });
    s.start(); if (kind === 'apply') { r.onstart(); r.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: 'rain on', confidence: .9 }], { isFinal: true })] }); }
    assert.equal(s.active(), false); assert.equal(last.state, 'off');
  }
});
