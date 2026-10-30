# AND SO source

The modular source of AND SO. `build.py` inlines `src/` into one self-contained page.

    python3 build.py        # writes and-so.html (artifact body), dist/and-so.html (full page), check.js

Ship `dist/and-so.html` as `/and-so/index.html` here and as `worlds/and-so.html` in the Field.
Before replacing a shipped version, freeze it: `python3 _tools/sae-kirby.py --name and-so --version <v> --src and-so/index.html --play "#enter"`.
Frozen versions live in `/ong.bak/` and keep a friendly route such as `/and-so/v7/`. The current build is AND SO 8.
