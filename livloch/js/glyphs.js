/* LIVLOCH · glyphs: a small drawn sign for each ability, for the HUD lanterns (0.29 feel).

   DESIGN
   - Line drawings in the plate style: one stroke weight, round ends, the lantern's own colour (currentColor), a little
     solid fill where the thing is a light. 32 by 32 units, drawn to read at 26 px on a lit or a dark lantern.
   - One per ability, by hero and slot (GLYPH[id][i]); an ability without one gets its kind's sign (KIND), and a kind
     without one gets a plain diamond. The ability's name is still the button's title and its accessible name.
   - Presentation only; nothing here is read by the model. ui.js calls LL.glyphs.svg at its `0.29 feel` line. */
(function () {
'use strict';
const LL = window.LL = window.LL || {};
const F = 'fill="currentColor"', O = 'fill="currentColor" fill-opacity="0.35"';
const KIND = {
  orb: '<circle cx="16" cy="16" r="5.5" ' + O + '/><circle cx="16" cy="16" r="9.5"/><path d="M16 3v3M16 26v3M3 16h3M26 16h3"/>',
  line: '<path d="M5 22L24 9"/><path d="M18 8.5l6.5.5-.5 6.5"/><path d="M6 15l4-2.5M9 25l4-2.5" stroke-opacity="0.6"/>',
  nova: '<circle cx="16" cy="16" r="4" ' + O + '/><path d="M16 4v5M16 23v5M4 16h5M23 16h5M7.5 7.5l3.5 3.5M21 21l3.5 3.5M7.5 24.5l3.5-3.5M21 11l3.5-3.5"/>',
  dash: '<path d="M4 16h17"/><path d="M17 10l7 6-7 6"/><path d="M5 10h7M5 22h7" stroke-opacity="0.6"/>',
  blink: '<circle cx="9" cy="16" r="3.5" stroke-dasharray="2 2"/><circle cx="23" cy="16" r="3.5" ' + O + '/><path d="M13 16h6" stroke-dasharray="1.5 2"/>',
  zone: '<ellipse cx="16" cy="20" rx="12" ry="5"/><ellipse cx="16" cy="20" rx="6" ry="2.5" ' + O + '/><path d="M16 4v11M12 8l4-4 4 4"/>',
  turret: '<path d="M10 27h12M12 27l1.5-9h5L20 27"/><circle cx="16" cy="12" r="4.5" ' + O + '/><path d="M20.5 12H28"/>',
  lift: '<path d="M16 4v8M12 8l4-4 4 4"/><rect x="11" y="14" width="10" height="11" rx="3" ' + O + '/><path d="M13 14v-1.5h6V14M13 25v1.5h6V25"/>'
};
const GLYPH = {
  /* Dora: a small lantern thrown; a thread with a house at its end; the valley under a ring of light */
  dora: ['<path d="M16 3v4"/><path d="M12 9.5h8"/><rect x="10.5" y="9.5" width="11" height="13" rx="4" ' + O + '/><path d="M12 22.5h8M14 25.5h4"/><path d="M16 13.5c-1.6 2-1.6 3.6 0 5 1.6-1.4 1.6-3 0-5z" ' + F + '/>',
    '<path d="M3 25c6 0 8-12 14-12"/><path d="M19 17v-6l5-4 5 4v6z" ' + O + '/><path d="M23 17v-3h2v3"/><path d="M12 13l5 0-2.5-3" stroke-opacity="0.7"/>',
    '<path d="M3 26l7-9 5 5 5-8 9 12"/><circle cx="16" cy="9" r="3.5" ' + O + '/><path d="M16 2.5v1.5M9.5 9H8M24 9h-1.5M11.4 4.4l1 1M20.6 4.4l-1 1"/>'],
  /* Anna: a core of stone drawn out; a boulder rolling with its dust; a fawn's head and antlers, charging */
  anna: ['<rect x="12" y="4" width="8" height="18" rx="4" ' + O + '/><path d="M12 10h8M12 15h8"/><path d="M16 22v6M13 25l3 3 3-3"/>',
    '<circle cx="15" cy="16" r="8" ' + O + '/><path d="M11 13l4 2 3-4M13 20l3-1.5"/><path d="M25 10c2 2 2 10 0 12M28 8c3 3 3 13 0 16" stroke-opacity="0.6"/>',
    '<path d="M13 26c-1-4 0-8 3-10 3 2 4 6 3 10z" ' + O + '/><path d="M14 16c-3-2-6-6-6-10M10 8l-3 1M11 11l-4 2M18 16c3-2 6-6 6-10M22 8l3 1M21 11l4 2"/><path d="M3 22h5M2 18h4" stroke-opacity="0.6"/>'],
  /* Myra: shears; a needle and a mended stitch; a spool with its thread pulled out */
  myra: ['<circle cx="9" cy="23" r="4"/><circle cx="23" cy="23" r="4"/><path d="M11.5 20L24 5M20.5 20L8 5"/>',
    '<path d="M6 26L24 8"/><path d="M24 8l3-3" stroke-width="2.6"/><ellipse cx="25.3" cy="6.7" rx="0.9" ry="0.5" ' + F + '/><path d="M7 14c3 0 3 4 6 4s3-4 6-4 3 4 6 4" stroke-opacity="0.8"/>',
    '<rect x="6" y="9" width="12" height="15" rx="2" ' + O + '/><path d="M5 9h14M5 24h14"/><path d="M18 14c4 0 5 3 9 3s1 6 3 9" /><path d="M8 13h8M8 17h8M8 21h8" stroke-opacity="0.6"/>'],
  /* Skein Doll: a cross-stitch; yarn unravelling to a dot; a tied knot */
  skein: ['<path d="M8 8l16 16M24 8L8 24"/><circle cx="16" cy="16" r="3" ' + O + '/><path d="M5 16h3M24 16h3M16 5v3M16 24v3" stroke-opacity="0.6"/>',
    '<circle cx="11" cy="16" r="6" ' + O + '/><path d="M7 13c3 2 5 2 8 0M7 19c3-2 5-2 8 0"/><path d="M17 16c3 0 3-5 6-5s2 8 5 8" stroke-dasharray="2.2 1.8"/>',
    '<path d="M6 10c6 0 14 12 20 12M6 22c6 0 14-12 20-12"/><circle cx="16" cy="16" r="3.6" ' + O + '/><path d="M4 8v4M28 20v4M4 20v4M28 8v4" stroke-opacity="0.6"/>'],
  /* Rook Vale: a spark skipping; a lantern lifting; a hand bell */
  rook: ['<path d="M4 24c3-6 5-6 7 0 2-6 5-8 8-2 2-6 5-9 9-9"/><path d="M26 6c-1.6 2-1.6 3.6 0 5 1.6-1.4 1.6-3 0-5z" ' + F + '/>',
    '<path d="M16 3v6M12.5 6.5L16 3l3.5 3.5"/><path d="M12 12.5h8"/><rect x="11" y="12.5" width="10" height="11" rx="3.5" ' + O + '/><path d="M12.5 23.5h7M13 27h6" stroke-opacity="0.6"/>',
    '<path d="M16 4v3"/><path d="M9 22c0-8 2-14 7-14s7 6 7 14z" ' + O + '/><path d="M6 22h20"/><circle cx="16" cy="25.5" r="2" ' + F + '/>']
};
LL.glyphs = {
  GLYPH: GLYPH, KIND: KIND,
  svg: function (id, i, ab) {
    const body = (GLYPH[id] && GLYPH[id][i]) || KIND[ab && ab.kind] || '<path d="M16 5l8 11-8 11-8-11z" ' + O + '/>';
    return '<svg class="glyph" viewBox="0 0 32 32" width="28" height="28" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + body + '</svg>';
  }
};
})();
