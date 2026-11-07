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
- **Release**: v0.6.12.
