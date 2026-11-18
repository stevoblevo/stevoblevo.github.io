import { mount } from './four-styles.js';
const root = document.querySelector('[data-four-styles]');
const controller = mount(root, {assets:window.FOUR_STYLES_DEMO_ASSETS, storeybrook:window.Storeybrook});
const keep = root.querySelector('[data-bookmark]');
keep.addEventListener('click', () => {
  const value = keep.getAttribute('aria-pressed') !== 'true';
  keep.setAttribute('aria-pressed', String(value));
  keep.setAttribute('aria-label', value ? 'Release this story' : 'Keep this story');
});
// A host may mount the exported controller around its existing semantic content.
// No page reload, routing, note replacement or remote write occurs on a style change.
window.addEventListener('pagehide', event => { if (!event.persisted) controller.destroy(); });
