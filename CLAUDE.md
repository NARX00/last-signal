# Last Signal: notes for working in this repository

- The game is JavaScript in `src/js/`, joined in file-name order into ONE script inside one IIFE
  (00-prelude opens it, 27-loop closes it). All files share one scope; order matters for `const` use at load.
- `src/js/00-prelude.js` contains `/*@@BUILD_DATA@@*/`; `tools/build.py` replaces it with
  `const BUILD = {data, assets}`. Tables like WDEF, EDEF, CODEX are read from `BUILD.data[...]` (data/*.json).
- Never edit `index.html` by hand: edit src/, data/ or assets/, then `python tools/build.py`.
- Verify changes: `python tools/check.py`, `node --check` on the built script, and `python tools/sim.py`
  (balance bot; deaths vary a lot run to run, so compare 6+ runs).
- Hosting: GitHub Pages (Actions workflow in .github/workflows/pages.yml) and a Telegram Mini App;
  the Telegram layer is inert outside Telegram. `dist/claude-artifact.html` is the Claude artifact build.
- Content must stay original: no characters, creatures or iconic names from The Matrix films or the Animatrix.
- Balance targets and design history: keep difficulty changes small and measured with tools/sim.py.
