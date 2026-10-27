# Reader

The read-aloud bar: a play button, the chapter's title, the voice in use and a meter, bound to the text it reads. Irish English first, word by word.

**Provide**
```html
<div class="sb-reader" data-sb-read="#story">
  <button class="sb-btn sb-btn--primary sb-btn--icon sb-reader__play" aria-label="Read it to me"></button>
  <div class="sb-reader__info">
    <span class="sb-reader__title">The octopus who learned to be a bunny</span>
    <span class="sb-reader__voice"></span>
    <span class="sb-reader__meter"><i></i></span>
  </div>
  <select data-sb-voice aria-label="Voice"></select> <!-- optional -->
</div>
```
Add `sb-reader--fixed` to pin it to the bottom-left corner above the page (`z-reader`, safe areas respected). `Storeybrook.init()` binds every reader; `Storeybrook.read.bind(bar, target)` binds one by hand.

- The play button's icon and name follow the state: "Read it to me", "Pause reading", "Keep reading".
- The voice line says "Irish English voice", or which voice is used when there is no Irish one. With no voices at all the button is disabled and the line says the words are all on the page.
- The word being spoken gets `cue-soft` with a `cue` edge; the meter fills in `cue`.
- `<select data-sb-voice>` and `<select data-sb-rate>` are filled and remembered (`sb:voice`, `sb:rate`).

**Do / Don't**
- Do give the bar a chapter title; the voice reads the text, the title says what it is.
- Don't autoplay. Reading starts from a press.
