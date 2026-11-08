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

## Cycle 3 — Tablet cards stretched into empty boxes

- **Area**: Responsive layout / readability at the 641-900px two-column control
  grid. Grid rows stretched every card to the tallest neighbour, so Palette
  carried 118px of dead space, Seed 160px and Export 146px at 768x900; the cards
  looked unfinished and their borders framed empty panels.
- **Evidence before**: `cycle3-before-768-full.png` plus the `cycle3-layout.mjs`
  sweep. At 768x900 the measured slack was Palette 118.1px, Seed 159.5px,
  Export 146.3px, every other width <=1px. No horizontal overflow.
- **Fix**: `.controls { align-items: start; }` lets each card stay content-sized
  in the two-column grid. The single-column desktop and phone layouts are
  unaffected because there is only one item per row.
- **Evidence after**: `cycle3-after-768-full.png` at the same 768x900 viewport
  and default state: all seven cards now report <=1px slack, no horizontal
  overflow at 320/390/768/1024/1440/1920, and 1440/390 default captures remain
  byte-identical to baseline.
- **Played run**: `cycle3-layout.mjs` sweeps six widths, scrolls each layout,
  then at 768x900 clicks Save look with a real CDP mouse event. Before and after
  the save still creates `Aegean Wave · seed 7 · r6 w3 v42`; the layout metrics
  are the change under test.
- **Tests**: failing-first static guard `control cards size to their content in the two-column layout`;
  suite 109/109.
- **Release**: v0.5.3.

## Cycle 4 — The gallery never showed which saved look was live

- **Area**: Progression and saves. After saving three looks and restoring one,
  every gallery entry looked identical; there was no marker tying the stage
  back to the saved entry it came from.
- **Evidence before**: old-build worktree `e624d13` served on port 4392,
  `cycle4-before-gallery-1440.png`: three deterministic saves (Kilim Comb,
  Kilim Wave, Aegean Wave), then restoring the oldest leaves all three entries
  unmarked (`markedCount: 0`, no `aria-current`) even though the stage is
  Aegean Wave.
- **Fix**: `activeEntryId(record, state)` in `src/studio/gallery.js` reuses the
  visual signature (toggles ignored). `renderGallery` and every state update
  call `syncGallerySelection()`, which adds `.is-active` and
  `aria-current="true"` to exactly the matching entry. The active entry gets
  the same ink border and cyan glow as the selected motif/palette.
- **Evidence after**: `cycle4-after-gallery-1440.png` at the same 1440x900
  viewport and same three saves: the restored oldest entry is outlined and
  carries `aria-current="true"`; the other two stay plain. Saving the newest
  look also marks it immediately.
- **Played run**: `cycle4-play.mjs` saves three looks with real CDP clicks,
  restores the oldest by clicking its entry, and reads the marker state. Before:
  `oneActiveMarker: false`; after: `oneActiveMarker: true`, active name
  `Aegean Wave · seed 7 · r6 w3 v42`, ARIA current true.
- **Tests**: failing-first `activeEntryId names the saved look currently on stage`;
  static guard `the gallery marks the saved look currently on stage`; suite
  111/111.
- **Release**: v0.5.4.

## Cycle 5 — Microcopy sat below AA contrast

- **Area**: UI readability / accessibility. `--muted-dim` (#5f7189) is used for
  9-11px control indexes, preset notes, export notes and gallery notes; against
  the darkest panel (#0d1422) it measured only **3.69:1**, below the 4.5:1 AA
  threshold for small text.
- **Evidence before**: `cycle5-before-notes-1440.png` (gallery/export/preset
  notes at 1440x900) and the computed-style probe: `.control-note`,
  `.preset-note`, `.control-index` and `.gallery-empty` all report 3.69:1.
- **Fix**: brighten the single token to `#7b8da6`, keeping the muted hierarchy
  without introducing a raw color outside `theme.css`.
- **Evidence after**: `cycle5-after-notes-1440.png` at the same viewport and
  state; the same four selectors and the token now measure **5.44:1**. The
  full-page 1440 capture shows the brighter notes in context; layout metrics
  and scroll heights are unchanged.
- **Played run**: `cycle5-contrast.mjs` loads the studio, reads computed colors
  from the live DOM, and computes WCAG contrast against `--bg-control`; before
  `allMicrocopyAtLeastAA: false`, after `true`. No interaction state is needed,
  so the before/after pair uses the same default state.
- **Tests**: failing-first `muted microcopy meets AA contrast on the darkest panel`;
  suite 112/112.
- **Release**: v0.5.5.

## Cycle 6 — Deleting a saved look dropped keyboard focus

- **Area**: Gallery progression / keyboard accessibility. Activating a delete
  button removes that row from the DOM; focus fell back to `<body>`, so a
  keyboard user lost their place and had to tab back into the gallery.
- **Evidence before**: old-build worktree `01f13ae` served on port 4394,
  `cycle6-before-after-delete-1440.png`: three saves, focus the first delete
  button, press Enter. The row is removed and `activeElement` becomes `BODY`
  (`focusMovedToNextEntry: false`).
- **Fix**: `neighborEntryId(record, removedId)` chooses the row that takes the
  deleted row's position (the previous row when deleting the last one, null
  when the gallery empties). `deleteLook` focuses that row's open button, or
  Save look when nothing remains.
- **Evidence after**: `cycle6-after-after-delete-1440.png` at the same state and
  viewport: deleting the first of three leaves the Kilim Wave row focused with
  a visible focus ring (`focusVisible: true`); the toast still names the removed
  look. The pure test covers first/middle/last/single/missing cases.
- **Played run**: `cycle6-play.mjs` saves three looks, scrolls to the gallery,
  focuses the first delete button, presses real Enter, and reads the active
  element. Before: `BODY`. After: `gallery-open`, label
  `Load Kilim Wave · seed 7 · r6 w3 v42`.
- **Tests**: failing-first `neighborEntryId keeps keyboard focus near the deleted row`;
  static guard `deleting a saved look keeps keyboard focus in the gallery`;
  suite 114/114.
- **Release**: v0.5.6.

## Cycle 7 — Phone controls were smaller than a fingertip

- **Area**: Mobile / coarse-pointer usability. On a 390x844 touch viewport the
  secondary buttons were 36px tall, the PNG selector 38px, range inputs 28px and
  the gallery delete target only 24x24, all below the 44px touch target used by
  the primary controls.
- **Evidence before**: `cycle7-before-mobile-gallery.png` and
  `cycle7-before-mobile-full.png`; live metrics at 390x844 with
  `pointer: coarse` measured New seed 79x36, Save look 156x36, Download PNG
  320x36, PNG size 320x38, Repeat 320x28 and gallery delete 24x24.
- **Fix**: one `@media (pointer: coarse)` block raises `.btn-small`, `select`,
  range inputs and `.gallery-delete` to 44px, and widens the gallery-open
  padding so the larger delete target never overlaps the look name. Desktop
  pointer layouts keep their existing density.
- **Evidence after**: `cycle7-after-mobile-gallery.png` and
  `cycle7-after-mobile-full.png` at the same viewport/state: every measured
  target is 44px tall, delete is 44x44, no horizontal overflow, and the gallery
  row still shows the active outline and full look name.
- **Played run**: `cycle7-touch.mjs` emulates a coarse pointer at 390x844,
  saves a look with a real click, measures six targets, then taps delete. Before
  `allTargetsAtLeast44: false`; after `true`; the delete tap still empties the
  gallery and announces the removal.
- **Tests**: failing-first `coarse pointers get 44px targets`; suite 115/115.
- **Release**: v0.5.7.

## Cycle 8 — Sliders and switches still swallowed shortcuts

- **Area**: Keyboard interaction, second pass. The cycle-2 guard protected every
  `INPUT`, but the studio has no text inputs: its controls are ranges and
  checkboxes. After dragging Repeat or toggling Tile guides, `R`, `S`, `E`, `P`,
  `C` and `L` were ignored even though those controls do not consume letters.
- **Evidence before**: old-build worktree `bb7e0f0` served on port 4396,
  `cycle8-before-gallery-1440.png`: focus Tile guides, press `S`; gallery stays
  empty and no toast. Focus Repeat, press `R`; motif, seed and stage hash stay
  `wave / 7 / c20dc69c`.
- **Fix**: `isTextEntry` now protects only text-editing inputs, textareas,
  selects and contenteditable; range, checkbox, radio and button inputs no
  longer block shortcuts. The PNG-size select keeps its own type-ahead keys.
- **Evidence after**: `cycle8-after-gallery-1440.png` at the same viewport and
  state: with Tile guides still focused, `S` saves `Aegean Wave · seed 7 ·
  r6 w3 v42` and shows the saved toast. With Repeat focused, `R` randomizes to
  Pinwheel / seed 4170. Focusing the PNG-size select and pressing `R` leaves
  the stage hash unchanged.
- **Played run**: `cycle8-play.mjs` uses real CDP key events on the focused
  checkbox and range. Before: save false, randomize false. After: both true;
  select guard still true.
- **Tests**: failing-first static guard now requires `isTextEntry` and its
  input-type branch; suite 115/115.
- **Release**: v0.5.8.

## Cycle 9 — Three motifs had no preset

- **Area**: Catalogue / discovery. The preset rail covered Wave, Ridge, Comb,
  Pinwheel and Mosaic only; Arcade, Loom and Drift — including both motifs added
  in v0.5.0 — could not be reached in one click.
- **Evidence before**: old-build worktree `d877263` served on port 4397,
  `cycle9-before-presets-1440.png`: five preset rows, no `ember-arcade`,
  `terra-loom` or `iris-drift` nodes; clicking those ids was a no-op and the
  stage stayed Wave/Aegean.
- **Fix**: add three frozen presets with distinct seeds and geometry:
  Ember arcade (arcade/ember, seed 17), Terra loom (loom/terra, seed 19) and
  Iris drift (drift/iris, seed 23). Presets remain pure state records, so the
  existing URL, gallery, transform and export paths pick them up unchanged.
- **Evidence after**: `cycle9-after-presets-1440.png` at the same viewport and
  default state shows eight preset rows covering all eight motifs;
  `cycle9-after-drift-stage-1440.png` shows the new Iris drift look after a real
  click. Each new preset loads its exact motif, palette, seed and repeat.
- **Played run**: `cycle9-play.mjs` clicks all three new presets. Before:
  `presetCount: 5`, all clicks false. After: `presetCount: 8`, Arcade/Ember
  seed 17, Loom/Terra seed 19, Drift/Iris seed 23, each with its loaded toast.
- **Tests**: failing-first `every motif has a curated preset`; suite 116/116.
- **Release**: v0.5.9.

## Cycle 10 — Presets were text-only

- **Area**: Catalogue recognition. Eight presets were plain name/note rows, so
  choosing a look required reading every pairing; the motif and palette pickers
  already show visual previews.
- **Evidence before**: old-build worktree `cf200a3` served on port 4398,
  `cycle10-before-presets-1440.png`: eight text rows, `thumbnailCount: 0`,
  every measured hash `811c9dc5` (empty string).
- **Fix**: each preset button now includes a 52px decorative SVG rendered from
  `presetState(preset.id)` at repeat 2, so the preview shows the exact motif,
  palette, seed and geometry that the click loads. The row becomes a
  three-column grid (preview, name, pairing note); names truncate safely.
- **Evidence after**: `cycle10-after-presets-1440.png` at the same viewport and
  default state: eight thumbnails, all eight hashes distinct, preset names keep
  at least 116px of width. Clicking Iris drift still loads Drift/Iris seed 23
  and shows the loaded toast.
- **Played run**: `cycle10-play.mjs` counts and hashes the previews, then clicks
  Iris drift. Before: zero previews. After: 8/8 previews, all distinct; the
  preset click is unchanged. The 768px full-page capture confirms the wider
  preset rail remains within the viewport.
- **Tests**: failing-first `preset buttons show a visual preview`; suite 117/117.
- **Release**: v0.6.0.

## Cycle 11 — The preset rail never showed which look was active

- **Area**: Catalogue orientation. After clicking a preset, every row looked the
  same; the stage changed but the rail gave no confirmation of which curated
  look was loaded, and editing a value gave no cue that the look had diverged.
- **Evidence before**: old-build worktree `ca23bc0` served on port 4399,
  `cycle11-before-presets-after-click-1440.png`: clicking Iris drift loads
  Drift/Iris seed 23, but `activeCount: 0` and no `aria-current`.
- **Fix**: `activePresetId(state)` compares the six visual look fields
  (motif, palette, repeat, weight, warp, seed) and ignores personal transforms
  and toggles, matching `applyPreset`. `syncSelection` sets `.is-active` and
  `aria-current="true"` on that row, so any later edit clears the marker.
- **Evidence after**: `cycle11-after-presets-after-click-1440.png` at the same
  viewport and loaded state: Iris drift is outlined and carries
  `aria-current="true"`. Clicking New seed clears the outline while the stage
  keeps the edited seed.
- **Played run**: `cycle11-play.mjs` clicks Iris drift, then New seed. Before:
  no marker ever. After: exactly one marker (`iris-drift`), then zero after the
  seed edit.
- **Tests**: failing-first `activePresetId names the preset matching the visual state`;
  static guard `the preset rail marks the active preset`; suite 119/119.
- **Release**: v0.6.1.

## Cycle 12 — The stage badge hid the active transform

- **Area**: Stage feedback / readability. Rotate and Flip visibly change the
  pattern and travel into SVG/PNG filenames, links, presets and the gallery,
  but the stage badge still read only `6 × 7`; after a quarter turn + mirror
  there was no on-stage confirmation of the active transform.
- **Evidence before**: old-build worktree `ec16e5c` served on port 4401,
  `cycle12-before-transform-1440.png`: keyboard-changing Rotate to 90 and Flip
  to Horizontal rotates/mirrors the SVG (`rotate(90)`, `scale(-1 1)`) while the
  badge remains `6 × 7` and no `#stage-transform` exists. Same result at 390px.
- **Fix**: `transformLabel(state)` returns `90°`, `Flip X`, `Flip Y` or a
  `·`-joined pair; the stage badge gains a hidden transform slot and divider,
  and `syncInputs` fills or hides them. Default 0/none stays hidden so the
  baseline stage is unchanged.
- **Evidence after**: `cycle12-after-transform-1440.png` and
  `cycle12-after-transform-390.png` at the identical load + transform state:
  the badge reads `6 × 7 · 90° · FLIP X`, fits within the stage frame at both
  viewports, and disappears again when Rotate returns to 0 and Flip to None.
- **Played run**: `cycle12-play.mjs` focuses the real Rotate/Flip selects and
  sends ArrowDown twice, reads values, badge text, hidden state and SVG
  transforms, then ArrowUp twice to clear. Before: `badgeShowsTransform: false`;
  after: true at 1440 and 390, with `clearsOnReset: true`.
- **Tests**: failing-first `transformLabel names only the active rotation and flip`;
  markup guard `the stage badge shows the active transform`; suite 121/121.
- **Release**: v0.6.2.

## Cycle 13 — The gallery silently evicted the oldest look

- **Area**: Progression and saves. At the 12-look cap, saving a new pattern
  drops the oldest entry, but the toast only said `Saved …`; the user was never
  told which look disappeared.
- **Evidence before**: old-build worktree `0a8dc02` served on port 4403,
  `cycle13-before-eviction-toast-1440.png`: preload 12 looks, save Kilim Wave,
  and the toast is `Saved Kilim Wave …` while Aegean Wave seed 12 has vanished
  from the list.
- **Fix**: `evictionCandidate(record, state)` returns the oldest id only when
  the gallery is full and the incoming look is new. `saveLook` appends
  `. Removed the oldest look, <name>.` to the toast. The toast gains
  `max-width: min(92vw, 540px)` and centred wrapping so the longer message fits.
- **Evidence after**: `cycle13-after-eviction-toast-1440.png` at the same 1440
  state and 12-look seed: toast reads `Saved Kilim Wave … Removed the oldest
  look, Aegean Wave · seed 12 …`, wraps to two lines, stays inside the viewport,
  and the gallery still holds 12 looks with Kilim Wave first.
- **Played run**: `cycle13-play.mjs` seeds a versioned 12-look gallery, reloads,
  clicks Kilim and Save look with real CDP clicks. Before: warning false.
  After: `warnsAboutEviction: true`, oldest id removed, toast visible and
  `toastFits: true`.
- **Tests**: failing-first `evictionCandidate names the oldest look only when a new save overflows`;
  static guard `gallery save warns when the oldest look is evicted`; suite 123/123.
- **Release**: v0.6.3.

## Cycle 14 — Storage failures were reported as successful saves

- **Area**: Progression and saves / robustness. When `localStorage.setItem`
  throws (quota, private mode, hostile store), `saveGallery` returns false but
  `saveLook`/`deleteLook` ignored it and still announced a normal save/removal;
  the look vanished on reload while the toast claimed success.
- **Evidence before**: old-build worktree `d94639c` served on port 4405,
  `cycle14-before-storage-warning-1440.png`: after overriding
  `localStorage.setItem` to throw, the toast still reads
  `Saved Kilim Wave …`; delete likewise reads `Removed …`.
- **Fix**: both gallery actions keep `const persisted = saveGallery(...)` and
  route the message through `persistedNotice`. On failure the toast appends
  `Browser storage is unavailable, so this lasts for this session only.` The
  in-memory gallery still updates, so the session remains usable.
- **Evidence after**: `cycle14-after-storage-warning-1440.png` at the same state
  and viewport: the toast carries the warning, wraps within 540px, and the
  look remains listed for the session. Delete shows the same warning.
- **Played run**: `cycle14-play.mjs` saves one look normally, overrides
  `localStorage.setItem` with a throwing function, then clicks Kilim + Save and
  Delete. Before: `failedSaveWarns: false`, `failedDeleteWarns: false`. After:
  both true, `toastFits: true`, and the in-memory list still updates.
- **Tests**: failing-first static guard `gallery persistence failures are reported`;
  suite 124/124.
- **Release**: v0.6.4.

## Cycle 15 — The clipboard fallback dropped keyboard focus

- **Area**: Copy-link / clipboard feedback and keyboard continuity. When the
  async Clipboard API is unavailable or rejects, `copyText` creates a hidden
  textarea, selects it and runs `execCommand("copy")`; removing the textarea
  left focus on `<body>`, so a keyboard user lost their place after copying.
- **Evidence before**: old-build worktree `5ab88f3` served on port 4406,
  `cycle15-before-copy-focus-1440.png`: focus Copy link, press `L` with the
  fallback forced; toast says `Share link copied…` but `activeElement` becomes
  `BODY` and no focus ring remains.
- **Fix**: capture `document.activeElement` before the fallback, and after
  removing the textarea restore it with `focus({ preventScroll: true })` when it
  is still connected. Clipboard API success is untouched.
- **Evidence after**: `cycle15-after-copy-focus-1440.png` at the same state and
  viewport: the toast still succeeds and the Copy link button regains its
  visible focus ring. `focusRestored: true`, `focusVisible: true`.
- **Played run**: `cycle15-play.mjs` forces `writeText` to reject, stubs
  `execCommand` to count calls, focuses Copy link and presses real `L`. Before:
  fallback ran once but focus moved to `BODY`. After: fallback ran once, focus
  returned to `copy-link`, and the toast fit.
- **Tests**: failing-first static guard `clipboard fallback restores keyboard focus`;
  suite 125/125.
- **Release**: v0.6.5.

## Cycle 16 — The gallery had no clear-all action

- **Area**: Progression and saves / collection management. Removing the whole
  gallery meant clicking up to twelve separate × buttons; there was no way to
  clear the collection deliberately, and no safe confirmation path.
- **Evidence before**: old-build worktree `e18b503` served on port 4407,
  `cycle16-before-gallery-1440.png`: three saved looks, no clear control
  (`clearExists: false`) and no way to empty the collection in one action.
- **Fix**: add a `Clear all` control in the gallery foot. The first click arms
  it for four seconds (`Confirm clear all`, pink border, toast prompt); a second
  click clears the record through `clearGallery`, restores focus to Save look,
  and disables the control when empty. Blur or timeout disarms it. The control
  is 44px tall under a coarse pointer.
- **Evidence after**: `cycle16-after-gallery-1440.png` shows the new Clear all
  control at the same three-look state; `cycle16-after-armed-1440.png` shows the
  confirmation state; `cycle16-after-cleared-1440.png` shows the empty gallery,
  disabled control and `Cleared 3 saved looks.` toast. `cycle16-after-gallery-390.png`
  confirms the foot fits at 390px with no horizontal overflow.
- **Played run**: `cycle16-play.mjs` saves three looks, clicks Clear all once
  (count stays 3, label becomes Confirm clear all), blurs to prove it disarms,
  then clicks twice. Result: count 0, storage key removed, focus on Save look,
  `clearedToast: "Cleared 3 saved looks."`.
- **Tests**: failing-first `the gallery offers a confirmed clear-all action`;
  markup inventory now includes `#clear-gallery`; suite 126/126.
- **Release**: v0.6.6.

## Cycle 17 — Active stage effects had no on-stage cue

- **Area**: Stage effects / feedback and reduced-motion accessibility. Tile
  guides and Glow drift changed the stage, but nothing on the stage named the
  active effects. With `prefers-reduced-motion: reduce`, Glow drift is
  deliberately static (`animation: none`), so a checked toggle had no visible
  result at all on the stage.
- **Evidence before**: old-build worktree `6fb7ecb` served on port 4408,
  `cycle17-before-effects-1440.png`: both toggles on, 9 guide lines drawn and
  `animationName: tessera-drift`, but no effect cue exists
  (`effectsExists: false`); same at 390 and under reduced motion.
- **Fix**: add a hidden `#stage-effects` chip row at the stage's lower left.
  `syncInputs` exposes `data-guides`/`data-motion` on the stage and shows
  `Guides` and/or `Glow` chips only while those effects are active. The chips
  sit above the badge on narrow screens and are labelled with coloured dots.
- **Evidence after**: `cycle17-after-effects-1440.png` and
  `cycle17-after-effects-390.png` at the same on-state: Guides + Glow chips
  appear, fit inside the stage frame, and vanish when both toggles are turned
  off. Under reduced motion the animation is `none` but the Glow chip remains,
  so the toggle still has an on-stage explanation.
- **Played run**: `cycle17-play.mjs` clicks both switch labels, checks guide
  lines, animation name, stage datasets, chip labels and fit at 1440/390, then
  emulates reduced motion and toggles both off. Before: no chips. After:
  `effectsVisible: true`, `reducedMotionKeepsCue: true`, `clearsWhenOff: true`.
- **Tests**: failing-first `the stage surfaces active tile guides and glow drift`;
  markup inventory includes `#stage-effects`; suite 127/127.
- **Release**: v0.6.7.

## Cycle 18 — Reset overclaimed what it reset

- **Area**: Reset action clarity and persistence feedback. The button said
  `Reset studio`, but it resets only the live pattern state; the 12-look gallery
  and PNG size stay untouched. It also ignored a failed `clearState`, so the
  toast claimed a reset while a reload could restore the old state.
- **Evidence before**: old-build worktree `3a14f38` served on port 4409,
  `cycle18-before-reset-1440.png` / `-390.png`: with Comb/Kilim/weight 6/guides
  on and one saved look, the button reads `Reset studio`. After resetting the
  gallery stays at one look and the toast says `Reset to the studio defaults.`
  even when `removeItem`/`setItem` throw.
- **Fix**: rename the control to `Reset pattern`; capture
  `const persisted = clearState(storage())` and route the message through
  `persistedNotice` so a storage failure appends the session-only warning.
  State reset behavior and gallery preservation are unchanged.
- **Evidence after**: `cycle18-after-reset-1440.png` / `-390.png` at the same
  Comb/Kilim/weight-6/guides-on state show `Reset pattern`;
  `cycle18-after-reset-warning-1440.png` shows the reset toast with
  `Browser storage is unavailable…` while the saved look remains.
- **Played run**: `cycle18-play.mjs` changes motif/palette/weight/guides, saves a
  look, clicks Reset pattern, then breaks `removeItem`/`setItem` and resets
  again. Before: label `Reset studio`, no warning. After: label
  `Reset pattern`, defaults restored, gallery still 1, warning visible and
  fitting at 1440/390.
- **Tests**: failing-first `reset names the pattern and reports storage failures`;
  suite 128/128.
- **Release**: v0.6.8.

## Cycle 19 — Copy link did not say what the link restored

- **Area**: Share-link round-trip feedback. Copy link confirmed only
  `Share link copied to the clipboard.`; after changing motif, palette, repeats,
  weight, seed and transform, the toast gave no indication that the link
  contained the look on stage.
- **Evidence before**: old-build worktree `5b72fc9` served on port 4410,
  `cycle19-before-share-1440.png`: comb/kilim, 8 repeats, weight 6, 90° + Flip X,
  guides + glow; the copied URL fully restores the state, but the toast is
  generic. Same at 390.
- **Fix**: `shareSummary(state)` names the palette, motif, seed, repeats and any
  transform; `copyLink` uses it in the toast. The URL codec itself is untouched.
- **Evidence after**: `cycle19-after-share-1440.png` and
  `cycle19-after-share-390.png` at the identical state show
  `Share link copied: Kilim Comb · seed 7 · 8 repeats · 90° · Flip X.` and fit
  without overflow. `cycle19-after-reopened-1440.png` shows the link opened
  after a conflicting localStorage record was planted; the stage hash and every
  state field match the source (`73dd09fd`).
- **Played run**: `cycle19-play.mjs` stubs clipboard `writeText`, changes six
  fields plus both effects, copies at 1440 and 390, plants a conflicting saved
  state, navigates to the copied URL, and compares motif/palette/repeat/weight/
  seed/rotate/flip/guides/motion plus the rendered stage hash.
  `roundTripState: true`, `roundTripStage: true`.
- **Tests**: failing-first `shareSummary names the look a copied link restores`;
  static guard `copy link names the state it shares`; suite 130/130.
- **Release**: v0.6.9.

## Cycle 20 — The skip link scrolled but did not focus the studio

- **Area**: Keyboard tab order / skip-link accessibility. Activating
  `Skip to the studio` scrolled to `#studio` but left focus on `<body>`; there
  was no focus indicator and the skip link's promise was only half kept.
- **Evidence before**: old-build worktree `5f6f236` served on port 4411,
  `cycle20-before-skip-landing-1440.png` / `-390.png`: after Tab + Enter the
  active element is `BODY`, `mainOutlineStyle: none`, and no stage ring.
- **Fix**: give `<main id="studio">` `tabindex="-1"` so anchor navigation can
  focus it, and add a focus-visible treatment: a 2px main outline plus a cyan
  inset ring and glow around the stage frame. The next Tab moves on to the first
  motif button.
- **Evidence after**: `cycle20-after-skip-landing-1440.png` / `-390.png` at the
  same default state show `activeElement` as `MAIN#studio`, a visible cyan ring
  around the stage, and the subsequent Tab focuses Wave.
- **Played run**: `cycle20-play.mjs` presses Tab, Enter and Tab at 1440 and after
  a 390 reload. Before: `desktopLandsOnMain: false`, no outline. After:
  `desktopLandsOnMain: true`, `desktopStageRing: true`,
  `desktopNextIsMotif: true`; the same holds at 390.
- **Tests**: failing-first `the skip link lands keyboard focus in the studio`;
  suite 131/131.
- **Release**: v0.6.10.

## Cycle 21 — PNG export feedback vanished with the toast

- **Area**: PNG export feedback. A successful export announced the filename in a
  transient toast, then left no record of what was saved; a failed export also
  cleared out of sight once the toast timed out.
- **Evidence before**: old-build worktree `d3a7079` served on port 4412,
  `cycle21-before-export-1440.png` / `-390.png`: a 1080×1080 PNG downloads, the
  toast names it, but the export block has no `#export-status` and nothing
  persists after the toast.
- **Fix**: add a hidden export status line. Export shows `Rendering … PNG…`,
  success keeps `Last export: <filename>`, and failure keeps
  `Last export failed. PNG export is unavailable in this browser.` The line is
  monospace, wraps with `overflow-wrap: anywhere`, and stays hidden before the
  first export.
- **Evidence after**: `cycle21-after-export-1440.png` and `-390.png` show the
  persistent `Last export: tessera-wave-aegean-7-r6w3v42-1080x1080.png` after
  the toast has gone; `cycle21-after-export-failed-1440.png` shows the
  persistent failure line while the gallery remains intact.
- **Played run**: `cycle21-play.mjs` selects Square with the keyboard, downloads
  a real 1080×1080 PNG (112442 bytes), waits past the toast, rechecks at 390,
  then stubs `canvas.toBlob` to force a failure. Before: no status element.
  After: success and failure status both persist, fit at 1440/390.
- **Tests**: failing-first `PNG export keeps a last-export status`; suite
  132/132.
- **Release**: v0.6.11.

## Cycle 22 — Picker grids ignored arrow keys

- **Area**: Keyboard navigation. Motif and palette pickers behaved like plain
  tab lists: all eight buttons were tab stops, and arrow keys did nothing. A
  visual grid should support directional movement without tabbing through every
  thumbnail.
- **Evidence before**: old-build worktree `ac5f39f` served on port 4413,
  `cycle22-before-motif-right-1440.png` / `-390.png`: focusing Wave and pressing
  ArrowRight leaves focus on Wave; all eight motif and palette buttons have
  `tabIndex 0`.
- **Fix**: add a pure `gridTargetIndex` helper and roving tabindex in both
  pickers. Only the selected button is tabbable initially; ArrowLeft/Right move
  within a row, ArrowUp/Down move by the grid's `data-columns` (3 motif, 2
  palette), and Home/End jump to the ends. Arrow keys move focus only; Enter or
  Space applies the focused choice.
- **Evidence after**: `cycle22-after-motif-right-1440.png` and
  `cycle22-after-motif-right-390.png` at the same default state show the focus
  ring on Ridge while Wave remains selected. Down reaches Arcade, End reaches
  Drift, Enter selects Drift, and the palette moves Kilim → Nocturne.
- **Played run**: `cycle22-play.mjs` focuses each selected picker, uses real
  arrow keys, then Enter at 1440 and repeats at 390 after clearing storage.
  Before: all keys no-op. After: one tab stop per grid, Ridge/Arcade/Drift,
  palette Kilim/Nocturne, Enter selects Drift, mobile ArrowRight reaches Ridge.
- **Tests**: failing-first `navigation.test.js` for directional/Home/End/invalid
  cases; static guard `picker grids support roving arrow navigation`; suite
  136/136.
- **Gate follow-up**: the post-commit guideline gate flagged the new
  `navigation.js` and `navigation.test.js` as missing from the README tree;
  both were added and the full 4/4 gate set re-ran green.
- **Release**: v0.6.12.

## Cycle 23 — The preset rail ignored arrow keys

- **Area**: Keyboard navigation. The eight preset buttons were all tab stops and
  ArrowUp/Down/Home/End did nothing, unlike the motif and palette pickers after
  cycle 22.
- **Evidence before**: old-build worktree `de2e076` served on port 4414,
  `cycle23-before-preset-down-1440.png` / `-390.png`: focus Aegean tide, press
  ArrowDown; focus stays put and all eight presets report `tabIndex 0`.
- **Fix**: reuse `gridTargetIndex` with `data-columns="1"` and roving tabindex on
  the preset rail; only the active preset (or first when none is active) is
  tabbable, ArrowUp/Down step rows, Home/End jump, and Enter/Space loads.
- **Evidence after**: `cycle23-after-preset-down-1440.png` and
  `cycle23-after-preset-down-390.png` at the same default state show the focus
  ring on Kilim ridge while no preset is selected. Down again reaches Riso comb,
  End reaches Iris drift, Enter loads Aegean tide.
- **Played run**: `cycle23-play.mjs` focuses the first preset, uses real arrow
  keys and Enter at 1440, then clears storage and repeats at 390. Before: all
  arrows no-op. After: Kilim ridge → Riso comb → Iris drift, Enter marks Aegean
  tide current, one tab stop per rail.
- **Tests**: failing-first one-column `gridTargetIndex` cases; static guard
  `the preset rail supports vertical arrow navigation`; suite 138/138.
- **Release**: v0.6.13.

## Cycle 24 — Gallery rows ignored arrow keys

- **Area**: Keyboard navigation in saved looks. Every gallery open/delete button
  was a tab stop (up to 24 stops at the cap), and ArrowUp/Down/Home/End did
  nothing.
- **Evidence before**: old-build worktree `c812a39` served on port 4415,
  `cycle24-before-gallery-down-1440.png` / `-390.png`: three saved looks, focus
  the first row, press ArrowDown; focus stays on the first row and all six
  buttons report `tabIndex 0`.
- **Fix**: add gallery row roving state. Only the current row’s open and delete
  buttons are tabbable; ArrowUp/Down move rows, Home/End jump, and Enter opens
  the focused look. The current row keeps its delete button reachable by Tab.
  Save, delete, clear and restore all update the roving row.
- **Evidence after**: `cycle24-after-gallery-down-1440.png` and
  `-390.png` at the same three-look state show the focus ring on Kilim Wave
  while Kilim Comb remains the active outline. Down again reaches Aegean Wave,
  Home/End jump correctly, Enter loads Kilim Comb.
- **Played run**: `cycle24-play.mjs` saves three looks, focuses the first row,
  then uses real ArrowDown/Home/End/Enter keys. Before: all arrows no-op.
  After: second row → third row, Home/End correct, Enter loads the first row,
  one row of tab stops, mobile ArrowDown reaches row two.
- **Tests**: failing-first static guard `gallery rows support roving arrow navigation`;
  suite 139/139.
- **Release**: v0.6.14.

## Cycle 25 — The 320px layout clipped preset and gallery names

- **Area**: 320px mobile layout, including the new preset previews, effect
  chips, export status and gallery footer.
- **Evidence before**: old-build worktree `bfa0191` served on port 4416,
  `cycle25-before-default-320-full.png`: `Nocturne pinwheel` and `Ember arcade`
  preset names overflow their title boxes, the topbar `Export SVG` wraps to two
  lines, and a saved gallery name truncates (`Aegean Wave · seed 7 · r6…`).
  No document-level horizontal overflow existed.
- **Fix**: add a `max-width: 360px` layout block: tighter topbar buttons, 44px
  preset previews with wrapping names, smaller pairing notes, and 48px gallery
  thumbnails with wrapping saved-look names.
- **Evidence after**: `cycle25-after-default-320-full.png` shows all eight preset
  names and the gallery name in full, and the topbar on one line. Effect chips
  fit above the badge without overlap, the gallery footer stays side by side,
  and the PNG status line fits at 320.
- **Played run**: `cycle25-play.mjs` loads at 1440 and 320, toggles Guides +
  Glow, saves a look, selects Square and downloads a real 1080×1080 PNG, then
  measures overflow/truncation/fit. Before: 2 preset overflows, 2 topbar lines,
  1 gallery overflow. After: all fit, `overflowX: 0`, status and chips fit.
  The 1440 captures are byte-identical (`40BBFC20…`) because the block only
  targets narrow screens.
- **Tests**: failing-first `320px layout keeps preset names and topbar actions readable`;
  suite 140/140.
- **Release**: v0.6.15.

## Cycle 26 — Large PNG exports reported only a filename

- **Area**: 4K and wallpaper PNG export feedback. The file was correct, but the
  persistent status line named only the filename, so the output dimensions and
  actual payload were not visible after a large export.
- **Evidence before**: old-build worktree `1c5929a` served on port 4417,
  `cycle26-before-4k-1440.png` / `-wallpaper-320.png`: real 3840×2160 and
  2560×1440 downloads succeed, but the status reads only
  `Last export: tessera-…-3840x2160.png`.
- **Fix**: add `formatExportResult(size, byteLength)` and include the pixel size
  and real PNG payload in the success status, e.g.
  `Last export: 3840 × 2160 · 397 KB · tessera-…png`. The downloaded files and
  raster path are unchanged.
- **Evidence after**: `cycle26-after-4k-1440.png` and
  `cycle26-after-wallpaper-320.png` at the same states show the richer status;
  the 320 line wraps within three lines and stays inside the viewport.
- **Played run**: `cycle26-play.mjs` selects 4K (real keyboard Home + Down twice)
  and Wallpaper, downloads both real PNGs, waits past the toast, and reads the
  status. 4K: 3840×2160, 397 KB; wallpaper: 2560×1440, 608 KB; both fit.
- **Tests**: failing-first `formatExportResult names the size and payload of the last PNG`;
  suite 141/141.
- **Release**: v0.6.16.

## Cycle 27 — Corrupt saved-look storage looked like an empty gallery

- **Area**: saved-look gallery recovery. A corrupt or unsupported
  `tessera.gallery.v1` record was silently discarded, so the Gallery block
  showed the fresh-install message “No saved looks yet” even though saved looks
  had existed and could not be read.
- **Evidence before**: old-build worktree `065fa77` served on port 4418,
  `cycle27-before-corrupt-gallery-1440.png` / `-320.png`: a planted corrupt
  record yields the generic empty text, no warning styling and no live-region
  role; saving still works and shows one entry.
- **Fix**: `readGallery(storage)` now returns `{ gallery, issue }` with
  `null`, `unreadable` or `unavailable`; `loadGallery` stays as a thin wrapper.
  The UI stores `galleryIssue`, renders
  `Saved looks could not be read. Save a new look to start a fresh collection.`
  with `.gallery-empty.is-warning` and `role="status"`, and shows a session-only
  warning when storage is unavailable. Saving a look clears the issue and
  starts a fresh collection.
- **Evidence after**: `cycle27-after-corrupt-gallery-1440.png` / `-320.png`
  at the same state show the warning with a left accent bar and `role="status"`;
  the 320 capture fits without horizontal overflow.
- **Played run**: `cycle27-play.mjs` plants the corrupt record, reloads, and
  inspects both widths. Before: generic text, no warning class or role. After:
  warning text, `is-warning`, role `status`, no overflow; clicking Save look
  recovers to 1 entry and toast `Saved Aegean Wave · seed 7 · r6 w3 v42.`
- **Tests**: failing-first `readGallery distinguishes empty, corrupt and unavailable stores`
  plus a corrupt-gallery static guard; suite 143/143.
- **Release**: v0.6.17.

## Cycle 28 — Pattern edits pretended to persist when storage rejected writes

- **Area**: studio settings persistence. `update()` discarded the boolean from
  `saveState()`, so quota or private-mode failures changed the stage and URL
  silently; a reload reverted the look. Gallery writes already warned, so the
  studio settings record was the last silent persistence path.
- **Evidence before**: old-build worktree `cb99845` served on port 4419,
  `cycle28-before-refused-save-1440.png` / `-320.png`: with `setItem` rejecting
  only `tessera.studio.v1`, clicking Ridge produces the new pattern with no
  note or toast; the key stays absent and a reload returns to Wave.
- **Fix**: track the `saveState` result, show a persistent `#storage-note` at
  the top of the Controls column on the first rejected write, announce it once
  through the existing toast, suppress repeats, and hide the note if a later
  write succeeds. The note uses the pink warning accent and theme tokens.
- **Evidence after**: `cycle28-after-refused-save-1440.png` / `-320.png` at the
  same state show the note above Motif and the toast; the 320 capture wraps
  within the column with `overflowX: 0`.
- **Played run**: `cycle28-play.mjs` injects a scoped `Storage.prototype.setItem`
  failure before load, clicks Ridge, then Nocturne. Before: no note, no toast,
  `studioKey: null`; after: note visible, exact toast, repeat change not
  re-announced; 320 fits. Dropping the URL state and reloading returns both
  builds to Wave, proving the warning was truthful.
- **Tests**: failing-first `pattern changes warn when the browser rejects storage writes`;
  suite 144/144.
- **Release**: v0.6.18.

## Cycle 29 — Pattern edits had no undo or redo

- **Area**: progression/history. Every motif, palette, preset, randomize,
  reseed, gallery load or slider change overwrote the previous state, and
  Ctrl/Cmd+Z did nothing; the only recovery was a saved look, reset, reload or
  a copied URL. No history module or test existed.
- **Evidence before**: old-build worktree `d7e7861` served on port 4420,
  `cycle29-before-changed-1440.png` / `-after-undo-1440.png`: pressing Ctrl+Z
  after choosing Ridge leaves Ridge in place, and a full Repeat drag stays at 9;
  no Undo/Redo controls exist in the Presets block.
- **Fix**: add pure stack helpers in `src/studio/history.js` (limit 30) and
  record one snapshot when a discrete action completes or a slider `change`
  ends, ignoring no-op edits and clearing redo on a new edit. Undo/Redo buttons
  in the Presets block carry `aria-keyshortcuts` and disabled states;
  Ctrl/Cmd+Z and Shift+Ctrl/Cmd+Z use the same helpers. Restored states go
  through `update()`, so storage and the URL stay in sync. ADR-013 records the
  session-only scope.
- **Evidence after**: same-build pairs `cycle29-after-changed-1440.png` (Ridge)
  vs `cycle29-after-after-undo-1440.png` (Wave), and
  `cycle29-after-after-drag-1440.png` (Repeat 9) vs
  `cycle29-after-after-drag-undo-1440.png` (Repeat 6). At 320,
  `cycle29-after-history-320.png` shows Undo/Redo above Reset with
  `historyWidth: 250` and `overflowX: 0`.
- **Played run**: `cycle29-play.mjs` uses a real pointer click, real range drag
  and CDP keyboard chords. Before: no buttons, Ctrl+Z no-op, Ridge/Repeat 9
  remain. After: undo returns Wave, redo returns Ridge, one Ctrl+Z returns the
  dragged Repeat from 9 to 6, the URL mirrors both states, and both buttons
  disable at the right ends of the stack.
- **Tests**: failing-first history stack cases plus the static
  `pattern changes can be undone and redone` guard; suite 151/151.
- **Release**: v0.6.19.

## Cycle 30 — Glow claimed an effect the system had paused

- **Area**: graphics/effects honesty under reduced motion. With
  `prefers-reduced-motion: reduce` and Glow on, the stage chip still said
  “Glow” and no note appeared, while the computed stage animation was `none`.
- **Evidence before**: old-build worktree `5eb5b5d` served on port 4421,
  `cycle30-before-reduced-stage-1440.png` / `-reduced-note-1440.png`: the Glow
  switch is on and the chip says “Glow”, but there is no note and
  `animationName: "none"`.
- **Fix**: when reduced motion is active and Glow is on, the stage chip reads
  “Glow paused”, a persistent `.motion-note` appears under the switches, and
  the checkbox gains `aria-describedby="motion-note"`. A media-query listener
  updates the label live; Glow state, gallery records and share links are
  unchanged.
- **Evidence after**: `cycle30-after-reduced-stage-1440.png` /
  `-reduced-note-1440.png` show “Glow paused” and the note. The same-build
  `cycle30-after-active-stage-1440.png` / `-active-note-1440.png` pair restores
  “Glow”, hides the note and runs `tessera-drift`. At 320,
  `cycle30-after-reduced-stage-320.png` wraps the chip inside the stage with
  `overflowX: 0`.
- **Played run**: `cycle30-play.mjs` emulates `reduce` before load, clicks the
  Glow switch, reads the chip/note/animation, then switches to `no-preference`.
  Before: chip “Glow”, no note, animation `none`. After: chip “Glow paused”,
  exact note, `aria-describedby`, animation `none` under `reduce`; then “Glow”,
  note hidden and `tessera-drift` under `no-preference`; note width 250 at 320.
- **Tests**: failing-first `reduced motion announces a paused glow`; suite 152/152.
- **Release**: v0.6.20.

## Cycle 31 — Shortcuts were documented but not discoverable in the studio

- **Area**: UI readability. The topbar showed R/C/E/P/S/L and Undo/Redo carried
  `aria-keyshortcuts`, but picker arrows, Home/End, Enter/Space, the history
  chords, `?` and Escape existed only in the README; pressing `?` did nothing.
- **Evidence before**: old-build worktree `252f9f7` served on port 4422,
  `cycle31-before-keys-open-1440.png`: after `?` the footer still has only the
  two status lines, and no `#shortcuts` element exists.
- **Fix**: add a native `<details id="shortcuts">` in the footer with 13 rows
  covering actions, history and grid navigation. `?` toggles it and moves focus
  to the summary; Escape closes it; pointer users operate the summary directly.
  The list uses two columns at 1440, one at 640, and a 96px key column at 320.
- **Evidence after**: same-build `cycle31-after-keys-closed-1440.png` (summary
  closed) vs `cycle31-after-keys-open-1440.png` (full 13-row reference);
  `cycle31-after-keys-open-320.png` stacks the rows and fits with
  `panelWidth: 288` and `overflowX: 0`.
- **Played run**: `cycle31-play.mjs` sends a real Shift+`?`, Escape, and a
  pointer click on the summary. Before: no panel and `?` is a no-op. After: the
  panel opens with 13 rows and the summary focused, Escape closes, the click
  reopens, and the 320 layout fits.
- **Tests**: failing-first `the studio exposes a complete keyboard reference`;
  suite 153/153.
- **Release**: v0.6.21.

## Cycle 32 — The catalogue stopped at eight motifs and eight palettes

- **Area**: graphics/content catalogue. The studio had 8 motifs × 8 palettes
  (64 pairings) since v0.5.0; the picker showed no rosette structure and no
  teal/coral palette.
- **Evidence before**: old-build worktree `39ee7f5` served on port 4423,
  `cycle32-before-catalogue-1440.png` and `cycle32-before-motif-320.png`: eight
  motif buttons (last row Loom/Drift) and eight palettes; no Bloom or Lagoon.
- **Fix**: add `buildBloom` (four contained rosettes, five or six seeded petals,
  ring/core/diamond accents, every circle inside the tile) to `motifs.js`,
  `lagoon` (teal/coral/sand) to `palettes.js`, and the `lagoon-bloom` preset.
  Update the motif/palette tables, counts, controls and screenshot URL in the
  README. The tile contract and save format are unchanged; the catalogue is now
  9 × 9 = 81 pairings.
- **Evidence after**: same-build `cycle32-after-wave-1440.png` (Wave/Aegean) vs
  `cycle32-after-bloom-1440.png` (Bloom/Lagoon); `cycle32-after-palette-1440.png`
  shows Lagoon selected; `cycle32-after-motif-320.png` shows the ninth Bloom
  button and Lagoon palette fitting with `bloomWidth: 78` and `overflowX: 0`.
  The 320 picker pair is 8 buttons before vs 9 after.
- **Played run**: `cycle32-play.mjs` clicks Bloom and Lagoon with real pointer
  events, saves the look (`Saved Lagoon Bloom · seed 7 · r6 w3 v42.`), resets to
  Wave/Aegean, restores the saved look, then applies the Lagoon bloom preset
  (`aria-current="true"`). Before: 8/8 catalogue, no Bloom/Lagoon/preset. After:
  9/9, selection, save/restore and preset all verified; 320 fits.
- **Tests**: failing-first `bloom is part of the catalogue and stays inside the
  tile`, `lagoon is part of the catalogue`, `bloom has a curated lagoon preset`;
  suite 156/156.
- **Release**: v0.7.0.

## Cycle 33 — A corrupt settings record silently reset the studio

- **Area**: saves/persistence, corrupt studio settings read path. Gallery reads
  and settings writes already warned, but a corrupt `tessera.studio.v1` was
  silently replaced by defaults.
- **Evidence before**: old-build worktree `dc25ceb` served on port 4424,
  `cycle33-before-corrupt-1440.png` / `-320.png`: after planting `{oops` and
  reloading, the stage shows Wave/Aegean, the storage note is hidden, no toast
  appears, and the key is still `{oops`.
- **Fix**: add `readState(storage)` returning `{ state, issue }` (`null`,
  `unreadable`, `unavailable`); `loadState` delegates to it. The UI stores
  `stateIssue`, shows “Saved settings could not be read. Starting from the
  defaults.” in the existing storage note, announces it once, and hides it after
  the first successful save writes a fresh record. The write-failure path keeps
  its own message.
- **Evidence after**: `cycle33-after-corrupt-1440.png` / `-320.png` show the
  note (360px at 1440, 288px at 320) and the exact toast;
  `cycle33-after-recovered-1440.png` (same build/session/viewport) shows the
  note hidden and Ridge after one click, with a valid version-1 record.
- **Played run**: `cycle33-play.mjs` plants the corrupt record, reloads, reads
  the note/toast, clicks Ridge, clears the URL and reloads. Before: no warning,
  defaults, key still corrupt; after: warning exact, click hides the note and
  writes `"motif":"ridge"`, reload keeps Ridge; 320 fits.
- **Tests**: failing-first `readState distinguishes empty, corrupt and
  unavailable stores` plus the `a refused settings record is surfaced` guard;
  suite 158/158.
- **Release**: v0.7.1.

## Cycle 34 — The keyboard reference was an 18px touch target

- **Area**: UI/accessibility, coarse-pointer target on the shortcut summary.
  Cycle 31 added an interactive `<summary>`; at 320 with `pointer: coarse` it
  measured 18px tall, below the studio's 44px touch-target rule.
- **Evidence before**: old-build worktree `fe7285c` served on port 4425,
  `cycle34-before-coarse-320.png`: touch-emulated 320 viewport, summary height
  18px, min-height 0.
- **Fix**: add a `@media (pointer: coarse)` rule for `.shortcuts summary` with
  `min-height: 44px`, padding, radius and panel background; the fine-pointer
  layout stays 18px.
- **Evidence after**: `cycle34-after-coarse-320.png` shows the 44px summary
  pill; `cycle34-after-fine-320.png` shows the 18px fine-pointer layout
  unchanged; `cycle34-after-open-320.png` shows the reference open after a real
  touch tap. All at 320x844 with the same state.
- **Played run**: `cycle34-play.mjs` enables touch emulation, taps the summary,
  and toggles it twice. Before: 18px, tap opens/closes. After: 44px, width 139,
  tap opens/closes with 13 rows and `overflowX: 0`; disabling touch restores
  18px.
- **Tests**: failing-first `the keyboard reference meets the coarse pointer
  target`; suite 159/159.
- **Release**: v0.7.2.

## Cycle 35 — Open tabs never synchronized

- **Area**: progression/saves, cross-tab consistency. Tabs share
  `tessera.studio.v1` and `tessera.gallery.v1`, but a change or save in one tab
  left the other stale; there was no `storage` listener and no cross-tab test.
- **Evidence before**: old-build worktree `059b78b` served on port 4426,
  `cycle35-before-tab-b-synced-1440.png` and `-tab-b-gallery-1440.png`: after
  tab A selects Ridge and saves, tab B still shows Wave/Aegean, an empty gallery
  and no toast.
- **Fix**: listen for `storage` events on both keys, re-read through
  `readState`/`readGallery`, update the other tab without writing back, clear
  its undo/redo stacks on an external state change, refresh the gallery without
  touching the stage, and announce the sync. ADR-014 records the contract.
- **Evidence after**: same-build `cycle35-after-tab-b-initial-1440.png`
  (Wave/empty) vs `cycle35-after-tab-b-synced-1440.png` (Ridge with
  `Settings updated from another tab.`); `cycle35-after-tab-b-gallery-1440.png`
  shows the `Aegean Ridge` saved look and `Saved looks updated from another
  tab.` The before/after cross-build pair is stale vs synced at the same state.
- **Played run**: `cycle35-play.mjs` opens two tabs. Tab A clicks Ridge, saves,
  then deletes the look; tab B is measured after each. Before: B stays Wave,
  empty and quiet. After: B becomes Ridge, URL `motif=ridge`, toast exact,
  gallery gains `Aegean Ridge` and clears on delete with the gallery toast;
  undo is disabled by the reset history.
- **Tests**: failing-first `other tabs update this one through storage events`;
  suite 160/160.
- **Release**: v0.7.3.

## Cycle 36 — The stage badge read like grid dimensions

- **Area**: UI readability. The stage badge showed `6 × 7` for repeat and seed
  without labels; the `×` suggested grid dimensions, and the rest of the studio
  uses r/w/v shorthand in export and gallery names.
- **Evidence before**: old-build worktree `8b19399` served on port 4427,
  `cycle36-before-badge-close-1440.png`: the badge reads `6 × 7`.
- **Fix**: wrap repeat and seed in `.stage-badge-metric` pairs with `r`/`s`
  prefixes and a `·` divider, so the badge reads `R6 · S7` and still appends the
  transform; the value IDs keep updating. The README controls row documents it.
- **Evidence after**: same-build close-ups `cycle36-after-badge-close-1440.png`
  (`R6 · S7`), `-badge-changed-close-1440.png` (`R8 · S7`) and
  `-badge-seeded-close-1440.png` (`R8 · S9126`);
  `cycle36-after-badge-close-320.png` fits. The before/after cross-build pair is
  `6 × 7` vs `R6 · S7` at the same state and viewport.
- **Played run**: `cycle36-play.mjs` presses ArrowRight twice on Repeat and
  clicks New seed. Before: `6 × 7 → 8 × 7 → 8 × 4335`; after:
  `R6 · S7 → R8 · S7 → R8 · S9126`. The badge seed matches the seed output, and
  320 fits with badge right 287 and `overflowX: 0`.
- **Tests**: failing-first `the stage badge labels repeat and seed`; suite 161/161.
- **Release**: v0.7.4.

## Cycle 37 — External gallery updates dropped keyboard focus

- **Area**: accessibility/focus. Cycle 35’s cross-tab gallery refresh replaced
  the saved-look rows, so a tab focused on a gallery row lost focus to BODY even
  when the row survived.
- **Evidence before**: old-build worktree `84990fc` served on port 4428,
  `cycle37-before-tab-b-after-save-1440.png`: B’s focused Ridge row remains in
  the two-row gallery, but there is no focus ring and `activeTag: BODY`;
  `-after-delete-1440.png` is also BODY.
- **Fix**: before the external `renderGallery()`, capture the focused open or
  delete control’s id; after the render, restore the matching control, or focus
  Save look if that entry disappeared. Set `galleryRovingId` from the focused
  row and announce after restoration. Open buttons use `data-gallery-id`; delete
  buttons use `data-gallery-delete`.
- **Evidence after**: `cycle37-after-tab-b-focused-1440.png` (Ridge ring),
  `-after-save-1440.png` (same Ridge id focused after A saves Bloom), and
  `-after-delete-1440.png` (Save look focused after Ridge is deleted). Same
  viewport/state; gallery 2 → 1.
- **Played run**: `cycle37-play.mjs` opens two tabs, focuses B’s Ridge row, then
  A saves Bloom and deletes Ridge. Before: BODY after both events. After: the
  same gallery-open id after the save and `save-look` after the delete; counts
  2 and 1; the gallery sync toast shows.
- **Tests**: failing-first `external gallery sync keeps keyboard focus`;
  suite 162/162.
- **Release**: v0.7.5.

## Cycle 38 — The gallery had no backup or restore

- **Area**: progression/saves. The gallery is local-only and capped at 12;
  clearing site data or moving browsers lost every saved look, and there was no
  export/import path.
- **Evidence before**: old-build worktree `0564e9e` served on port 4429,
  `cycle38-before-gallery-1440.png`: two saved looks, no Backup or Restore
  controls; no test covered a backup.
- **Fix**: Backup downloads a versioned JSON envelope (`app`, `version`,
  `exported_at`, `entries`); Restore accepts only that envelope, normalizes
  entries through `normalizeGalleryRecord`, merges them through `addEntry` in
  reverse to preserve newest-first order, deduplicates by signature and respects
  the 12-look cap. Invalid files are refused, and Backup disables when empty.
  ADR-015 records the format.
- **Evidence after**: `cycle38-after-gallery-1440.png` (two looks plus
  Backup/Restore), `-empty-1440.png` (cleared, Backup disabled),
  `-restored-1440.png` (two looks restored with `Restored 2 saved looks.`), and
  `-gallery-320.png` (buttons 121px, `overflowX: 0`). The before/after
  cross-build pair shows the missing vs present controls at the same state.
- **Played run**: `cycle38-play.mjs` saved Ridge and Bloom/Lagoon, downloaded
  `tessera-looks.json` (822 bytes; `app: tessera`, `version: 1`, two entries),
  cleared the gallery to 0, set the file input to the backup and dispatched
  change, restoring both looks and the toast. The first attempt downloaded to
  the default Downloads folder; the script now sets `Page.setDownloadBehavior`
  on the page and falls back to the actual file, and the final run parsed the
  backup and restored it. Before build: no controls, no backup.
- **Tests**: failing-first `the gallery can be backed up and restored`;
  suite 163/163.
- **Release**: v0.7.6.

## Cycle 39 — Slider drags persisted on every input event

- **Area**: performance/resource optimization. `bindRange` called the full
  `update()` on every `input`, so a drag performed a synchronous localStorage
  write and `history.replaceState` per movement even though only the final value
  needs persisting.
- **Evidence before**: old-build worktree `da9f69e` served on port 4430,
  `cycle39-before-after-drag-1440.png`: a real Warp drag reached 82 and wrote
  storage 7 times and the URL 7 times.
- **Fix**: `input` now calls `update({ persist: false, url: false })` so the
  stage, badge and motif previews stay live; `change` calls
  `commitHistory(); update();`, committing one history step and writing storage
  and the URL once on release.
- **Evidence after**: `cycle39-after-after-drag-1440.png` shows the same Warp 82
  pattern; `-after-drag-320.png` fits. The final state is identical across
  builds (same stage hash `-581406591`, 9 previews, stored warp 82 and the same
  URL); the played counts differ 7/7 → 1/1. Same-build pair: before-drag vs
  after-drag at 1440.
- **Played run**: `cycle39-play.mjs` drags `#warp` with a real pointer and
  counts `Storage.prototype.setItem` and `history.replaceState`. Before: 7
  storage and 7 URL writes. After: 1 and 1; warp 82, stored 82, URL `warp=82`,
  stage hash changed, 9 previews, 320 `overflowX: 0`.
- **Tests**: failing-first `range drags persist once`; suite 164/164.
- **Release**: v0.7.7.

## Cycle 40 — Discrete look changes hard-swapped the stage

- **Area**: graphics/effects. Motif, palette, preset, randomize, load, undo and
  transform changes replaced the stage instantly; the studio already had Glow
  drift and reduced-motion handling, so a short settle could signal the change.
- **Evidence before**: old-build worktree `e5c1395` served on port 4431,
  `cycle40-before-settling-1440.png`: after choosing Ridge the stage has no
  `is-settling` class, `animationName: none`, opacity 1 and looks identical to
  the settled frame.
- **Fix**: add `settleStage()` and a `settle` option to `update`; discrete look
  changes add `is-settling` to the stage for a 320ms opacity/scale animation on
  the stage SVG. Slider drags, switches, the initial mount and gallery-only
  updates do not settle. Slider input stays immediate. ADR-016 records the
  effect and scope.
- **Evidence after**: `cycle40-after-settling-1440.png` (class true,
  `animationName: tessera-settle`, 0.32s, opacity 0.905, scale 0.989) vs
  `-settled-1440.png` (class removed, opacity 1); `-reduced-1440.png` shows the
  reduced-motion duration collapsed to 1e-05s (the computed first frame is
  still visible, which cycle 41 tightens); `-settling-320.png` fits at 320. The
  before/after cross-build pair shows the instant vs settling stage.
- **Played run**: `cycle40-play.mjs` clicks Ridge, reads the class/computed
  animation at 50ms, waits 400ms, then emulates reduce and clicks Nocturne.
  Before: no class/animation at either point. After: `is-settling` with
  `tessera-settle` 0.32s and opacity 0.905, settled at opacity 1; reduced
  duration 1e-05s; state Ridge/Nocturne; 320 `overflowX: 0`.
- **Tests**: failing-first `discrete look changes settle the stage`; suite
  165/165.
- **Release**: v0.7.8.

## Cycle 41 — Reduced motion still got the settle’s first frame

- **Area**: accessibility/reduced motion. The cycle 40 settle still added
  `is-settling` under `prefers-reduced-motion: reduce`; the duration collapsed
  but the class/timer ran, and the cycle 40 capture showed the dim/scale first
  frame.
- **Evidence before**: old-build worktree `199e889` served on port 4432,
  `cycle41-before-reduced-ridge-1440.png`: `settling: true` with
  `animationName: tessera-settle` and duration `1e-05s`; the normal settle also
  ran at 0.32s.
- **Fix**: `settleStage()` returns early when `prefersReducedMotion()` is true,
  so no class or timer is added; the normal settle is unchanged. No state or
  save change.
- **Evidence after**: `cycle41-after-reduced-ridge-1440.png` (class false,
  animation none, opacity 1) vs `cycle41-after-normal-ridge-1440.png` (class
  true, `tessera-settle` 0.32s, opacity 0.871) at the same Ridge/Nocturne state
  and viewport; `cycle41-after-reduced-320.png` fits. The cross-build reduced
  pair is before class true vs after false.
- **Played run**: `cycle41-play.mjs` clicks Ridge, then Nocturne and Ridge under
  reduce, then toggles reduce off and clicks Ridge again. Before: the reduce
  clicks still added the class. After: reduce clicks have class false, animation
  none, opacity 1; the normal settle still runs at 0.32s; 320 `overflowX: 0`.
- **Tests**: failing-first `reduced motion skips the settle`; suite 166/166.
- **Release**: v0.7.9.

## Cycle 42 — Saved looks could not be named

- **Area**: progression/saves. Every saved look was auto-named from palette,
  motif, seed and geometry; there was no rename path. The backup envelope
  stores an entry `name`, but `restoreGallery` merged through `addEntry`, which
  recomputed the auto name and discarded the imported one.
- **Evidence before**: old-build worktree `be6b63e` served on port 4433,
  `cycle42-before-auto-1440.png`: a saved Ridge look shows only the auto name
  and no rename control; the restore loop used `addEntry(next, entry.state)`.
- **Fix**: add `renameEntry` (trim/limit to 80, ignore empty) and `mergeEntry`
  (preserve the imported name, dedupe by signature) in `gallery.js`; the gallery
  row gets a ✎ button and an inline form with Save/Cancel (Enter submits, Escape
  cancels); new saves keep auto names; the backup restore now uses `mergeEntry`.
  ADR-017 records the naming contract.
- **Evidence after**: `cycle42-after-auto-1440.png` (auto name plus ✎) vs
  `-renamed-1440.png` (`Studio Ridge`, toast `Renamed to Studio Ridge.`) at the
  same row/viewport; `-reloaded-1440.png` keeps the custom name;
  `-restored-1440.png` shows the custom name after backup, clear and file-input
  restore with `Restored 1 saved look.`; `-renamed-320.png` fits.
- **Played run**: `cycle42-play.mjs` saves Ridge, opens the ✎ form, inserts
  `Studio Ridge` with real text input and clicks the real Save button, reloads,
  backs up (the JSON entry name is `Studio Ridge`), clears, restores through the
  hidden file input, and reads `Studio Ridge` again; 320 `overflowX: 0`. The
  first attempt used a CDP Enter that did not submit the form; the final run
  clicks Save (the app form itself is unchanged).
- **Tests**: failing-first `renameEntry changes only the name and ignores an
  empty name`, `mergeEntry keeps a custom name through a backup restore`, and
  the `saved looks can be renamed` guard; suite 169/169.
- **Release**: v0.7.10.

## Cycle 43 — The studio gave no audible feedback

- **Area**: audio cues. The studio was silent; feedback was visual and
  toast-only. There was no sound preference, URL key or shared state.
- **Evidence before**: old-build worktree `5aa3854` served on port 4434,
  `cycle43-before-sound-off-1440.png`: the Seed block has only Glow drift and
  Tile guides, no Sound cues switch; the URL has no `sound`; a counting
  `AudioContext` stays at 0 cues for every interaction.
- **Fix**: add `sound` (off by default) to `DEFAULTS`/`STATE_KEYS` and
  `normalizeState`, preserve it through `applyPreset` and `restoreEntry`, and
  add a Sound cues switch. A lazy WebAudio `cue()` plays a short sine envelope
  on motif, palette, preset, randomize, reseed, load, save and export; the
  switch confirms once when turned on. Audio is best-effort and silent when
  WebAudio is unavailable. The gallery signature ignores sound. ADR-018
  records the contract.
- **Evidence after**: `cycle43-after-sound-off-1440.png` (switch row,
  unchecked) vs `-sound-on-1440.png` (checked, Ridge selected, cue counted) at
  the same state/viewport; `-sound-off-again-1440.png` shows the switch off
  and no cue on Wave; `-sound-reloaded-1440.png` keeps `sound=1` and the
  checked switch; `-sound-320.png` fits.
- **Played run**: `cycle43-play.mjs` injects a counting fake `AudioContext`,
  clicks the real switch, clicks Ridge (1 cue), turns sound off and clicks
  Wave (0 cues), turns it on, reloads, and reads the persisted preference;
  320 `overflowX: 0`. The before build has no control and 0 cues throughout.
- **Tests**: failing-first `sound is a normalized, shared preference`,
  `restoreEntry keeps the current sound preference`, and the `sound cues are
  optional and synthesized` guard; suite 172/172.
- **Release**: v0.7.11.

## Cycle 44 — Renaming a saved look dropped keyboard focus

- **Area**: progression/saves, keyboard focus. The inline rename form replaced
  the row, then rebuilt the gallery on submit, Escape and Cancel. The focused
  control was removed and focus fell to `BODY`; the ✎ control was also missing
  from the shared `:focus-visible` ring list.
- **Evidence before**: old-build worktree `c618485` served on port 4434,
  `cycle44-play.mjs`: after submit, Escape and Cancel the active element is
  `BODY` with `:focus-visible` false; `cycle44-before-renamed-1440.png` and
  `-cancelled-320.png` show no focus ring.
- **Fix**: add `focusGalleryRename(entryId)`, which finds the rebuilt row's ✎
  button by `data-gallery-rename` and focuses it with `preventScroll: true`;
  call it after submit, Cancel and Escape. Add
  `.gallery-rename:focus-visible` to the shared ring selector. No state,
  storage or save-format change.
- **Evidence after**: `cycle44-after-renamed-1440.png`,
  `-escaped-1440.png` and `-cancelled-1440.png` at the same state and viewport
  show the teal ring on ✎ where the before captures show none;
  `-cancelled-320.png` keeps the ring and fits.
- **Played run**: `cycle44-play.mjs` saves a look, opens rename, types
  `Focus proof`, submits with a real Enter on the focused Save button, then
  opens/Escape and opens/Cancel with real Enter. Before: all three end on
  `BODY`. After: all three land on the same row's rename button with
  `:focus-visible` true and the same `data-gallery-rename` id; the name
  persists, 320 `overflowX: 0`.
- **Tests**: failing-first `renaming a saved look returns focus to its row`;
  suite 173/173.
- **Release**: v0.7.12.
