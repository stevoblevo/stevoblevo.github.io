(() => {
  const game = window.game, journey = window.__saeJourney;
  if (!game || !journey) return;
  let before = null, interval = null, paused = false;
  const order = ['weave','light','gift','handoff','cross','share','rest'];
  const clear = () => {clearInterval(interval); interval = null;};
  journey.register({
    watch() {
      before = game.getEvents(); game.restore([]); paused = false;
      interval = setInterval(() => {
        if (paused) return;
        const state = game.getState();
        if (state.ended) return clear();
        const legal = AnewgamNougat.allowed(state);
        game.act(order.find(action => legal.includes(action)));
      }, 1800);
    },
    stop() {clear(); if (before) game.restore(before); before = null;},
    takeOver() {clear(); before = null;},
    pause(value) {paused = value;},
    ended: () => game.getState().ended
  });
  document.getElementById('scene').addEventListener('click', event => {
    if (journey.getMode() !== 'idle' && event.composedPath().some(el => el?.matches?.('button'))) journey.takeOver();
  }, true);
})();
