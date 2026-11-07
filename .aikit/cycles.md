# Tessera Improvement Cycles

Evidence run from `scratch/tessera-cycles/` with headless Edge CDP at
1440x900, fresh profile per run, deterministic reseed (`Math.random = () => 0.417`)
so before and after land on seed 4170. Screenshots are local-only evidence
(not committed, per the no-binaries rule); the hashes and play logs below are
the committed proof.

## Cycle 1 — Motif picker previews were stale

- **Area**: UI readability / visual truthfulness. The motif picker re-rendered
  thumbnails only when the palette changed, so a New seed, weight, warp, rotate
  or flip left every thumbnail showing the old geometry while the stage showed
  the new one.
- **Evidence before**: `cycle1-before-after-seed-1440.png` and
  `cycle1-before-motifs.png` (seed 4170, weight 6): the stage thickened and
  reseeded, the picker stayed at seed 7 / weight 3. Thumbnail hashes were
  unchanged (`wave c65b572c` before and after); only palette changes refreshed
  them.
- **Fix**: `thumbKey(state)` in `src/studio/state.js` names the fields a
  thumbnail actually renders (palette, seed, weight, warp, rotate, flip).
  `src/ui/app.js` compares it in `update()` and coalesces one
  `requestAnimationFrame` refresh, so sliders do not rebuild eight SVGs per
  input event. `repeat`, `motif`, guides and motion stay out of the key.
- **Evidence after**: `cycle1-after-after-seed-1440.png` and
  `cycle1-after-motifs.png` at the identical seed 4170 / weight 6: stage hash
  `dfae932e` (same as before), all eight thumbnail hashes changed, and the
  picker now mirrors the thicker reseeded tiles. Default-state hashes at
  1440x900 and 390x844 are byte-identical to baseline, so the change is
  scoped to moved controls.
- **Played run**: `cycle1-play.mjs` loads a fresh profile, scrolls to New seed,
  clicks it with a real CDP mouse event, sets weight 6, scrolls back, and reads
  the stage plus picker. Before fix: `thumbnailsChanged: false`; after fix:
  `thumbnailsChanged: true`, `stageChanged: true`, seed 7 -> 4170.
- **Tests**: failing-first `thumbKey changes with every field a motif picker previews`;
  static guard `the motif picker previews every visual change`; suite 108/108.
- **Release**: v0.5.1.

## Cycle 2 — Studio shortcuts died after any button click

- **Area**: Interaction / keyboard accessibility. `bindKeyboard` ignored key events
  whose target was a `BUTTON`, and a real mouse click leaves focus on the clicked
  button. After choosing a motif, a palette or a preset, `R`, `S`, `C`, `E`, `P`
  and `L` silently stopped working until the user clicked empty page space.
- **Evidence before**: old-build worktree `a45f63f` served on port 4391,
  `cycle2-before-gallery-1440.png`: clicked Ridge (focus stayed on the button),
  then pressed `S`; the gallery stayed empty, no toast, stage hash `29e96fd1`.
  `R` was also ignored (`afterRandomizeKey` unchanged).
- **Fix**: protect only text-editing controls (`INPUT`, `TEXTAREA`, `SELECT`) and
  contenteditable from shortcuts; buttons no longer swallow them. Buttons still
  receive Space/Enter normally, and the shortcut letters do not activate them.
- **Evidence after**: `cycle2-after-gallery-1440.png` at the same default state
  and same 1440x900 viewport: click Ridge, press `S`, and the gallery shows
  `Aegean Ridge · seed 7 · r6 w3 v42` with the saved toast. `R` then randomizes
  from the still-focused motif button (pinwheel, seed 4170). Focusing the PNG
  size `<select>` and pressing `R` leaves the stage hash unchanged.
- **Played run**: `cycle2-play.mjs` (fresh profile, real CDP mouse click on the
  Ridge tile, real keyDown/keyUp for S then R). Before: no save, no randomize.
  After: one saved look, then a random pattern; `<select>` guard still holds.
- **Tests**: failing-first static guard now requires the protected list to be
  exactly `INPUT`, `TEXTAREA`, `SELECT` and asserts `BUTTON` is absent; suite
  108/108.
- **Release**: v0.5.2.
