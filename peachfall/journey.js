/* Adapter for the preserved public engine. Never rewrites its minified source or saved copy. */
(() => {
  let attempts = 0;
  const attach = () => {
    const api = window.__PEACHFALL__, journey = window.__saeJourney;
    if (!api || !journey) {if (++attempts < 200) setTimeout(attach, 50); return;}
    let before = null;
    const clone = value => structuredClone(value);
    journey.register({
      watch() {
        before = clone(api.getState());
        const fresh = api.dispatch(before, {type: 'RESET'});
        api.dispatch(fresh, {type: 'WATCH'});
      },
      stop() {if (before) api.dispatch(api.getState(), {type: 'HYDRATE', state: before}); before = null;},
      takeOver() {api.dispatch(api.getState(), {type: 'HYDRATE', state: {...clone(api.getState()), mode: 'play'}}); before = null;},
      ended: () => api.getState().ending === 'to_be_continued'
    });
    // The native Watch button resets and saves. Use its real engine without replacing the player's stored save.
    document.getElementById('watch-dream')?.addEventListener('click', event => {event.preventDefault(); event.stopImmediatePropagation(); journey.start();}, true);
    // Native preference controls also save progress. Apply them against the player's
    // earlier scene, then carry only the preferences back into the watched scene.
    let watchedPreference = null;
    function preferenceBefore() {
      if (!before || journey.getMode() === 'idle') return;
      watchedPreference = clone(api.getState());
      api.dispatch(api.getState(), {type: 'HYDRATE', state: before});
    }
    function preferenceAfter() {
      if (!watchedPreference) return;
      const {muted, volume, reducedMotion} = api.getState();
      before = {...before, muted, volume, reducedMotion};
      api.dispatch(api.getState(), {type: 'HYDRATE', state: {...watchedPreference, muted, volume, reducedMotion}});
      watchedPreference = null;
    }
    for (const [id, type] of [['btn-mute','click'],['btn-motion','click'],['volume','input']]) {
      const control = document.getElementById(id);
      control?.addEventListener(type, preferenceBefore, true);
      // Registered after engine readiness, hence after its synchronous saver.
      control?.addEventListener(type, preferenceAfter);
    }
    document.querySelector('.controls')?.addEventListener('keydown', event => event.stopPropagation());
    // Explicit New/Reset/Gallery actions leave Watch before the native action runs.
    for (const id of ['play-dream', 'btn-reset', 'open-gallery']) document.getElementById(id)?.addEventListener('click', () => {
      if (journey.getMode() !== 'idle') journey.takeOver();
    }, true);
    const manual = event => {
      if (journey.getMode() === 'idle') return;
      if (event.target.closest?.('#sae-way, #sae-world-dialog')) return;
      if (event.type === 'keydown' && event.target.closest?.('button, input, textarea, select, a, dialog')) return;
      if (event.type === 'keydown' && !['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','Enter',' '].includes(event.key)) return;
      journey.takeOver();
    };
    document.getElementById('game')?.addEventListener('pointerdown', manual, true);
    document.getElementById('touch-pad')?.addEventListener('pointerdown', manual, true);
    document.addEventListener('keydown', manual, true);
  };
  attach();
})();
