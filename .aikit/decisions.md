# Decisions

Why this project is built the way it is, oldest first. One entry per decision that changes a
contract, a dependency, a data format or the architecture; IDs are consecutive and never reused.

<!-- Entry format:
### ADR-NNN: <decision in one line>
- **Date**: YYYY-MM-DD
- **Status**: Accepted
- **Context**: <what forced the decision>
- **Decision**: <what was decided>
- **Consequences**: <what follows, including what it costs>
-->

### ADR-001: A pure generator drives a static SVG studio
- **Date**: 2026-10-29
- **Status**: Accepted
- **Context**: The demonstration must sit on the AegeanWorks site like Prism-Relay does, but it is a design tool rather than a game. A backend or a build step would exclude it from the static Play-style hosting the site already uses.
- **Decision**: Keep all pattern logic in `src/studio/` with no DOM, clock or storage dependency, and let `src/ui/app.js` translate controls into state and SVG. Ship `index.html` and `src/` as the complete runtime, with no build step and no dependencies.
- **Consequences**: The same modules power the browser, the tests and the static contract check. The site can copy and serve the folder verbatim. There is no server-side rendering or shared gallery; output is local by design.

### ADR-002: Seamless patterns come from a single tile, not from repeating geometry
- **Date**: 2026-10-29
- **Status**: Accepted
- **Context**: A pattern is only seamless if its edges match. Building a large canvas of shapes and trying to align the borders is fragile and hard to test.
- **Decision**: Every motif draws inside one `100 × 100` tile and repeats through an SVG `<pattern>`. Each builder returns primitives only; it never sees the output size.
- **Consequences**: Seamlessness is structural, and the exported SVG stays tiny because the tile is defined once. A motif that needs to cross a tile edge must wrap its geometry inside the builder, which is the deliberate cost of the guarantee.

### ADR-003: Palettes are color roles, resolved at serialization
- **Date**: 2026-10-29
- **Status**: Accepted
- **Context**: Hard-coding colors inside six motif builders would make palette swaps leak raw values and would multiply the test matrix.
- **Decision**: Motif elements name roles (`ink`, `accent`, `highlight`, `paper`, `bg`) and `svg.js` resolves them against the active palette when it serializes. `src/theme.css` remains the only place with raw values for the page chrome.
- **Consequences**: A palette swap is a pure data change, and a single test can prove that no role ever reaches the DOM as a literal. Adding a palette costs one frozen record.

### ADR-004: One versioned state record, clamped on every read
- **Date**: 2026-10-29
- **Status**: Accepted
- **Context**: Settings arrive from three untrusted sources: a shareable URL, an old localStorage record and a hand-edited value.
- **Decision**: `normalizeState` clamps every number, rejects unknown motifs and palettes, and accepts boolean spellings. Storage keeps one record under `tessera.studio.v1` with an explicit version, and the URL carries the same normalized state.
- **Consequences**: A corrupt save or malformed query resets to defaults instead of breaking the studio. The state schema can add optional fields without invalidating old records, but a breaking change needs a new storage version.

### ADR-005: The static embed contract is executable
- **Date**: 2026-10-29
- **Status**: Accepted
- **Context**: The website copy refuses builds that fetch from the network, escape their frame or reference files that were not copied. That contract previously lived only in the website's Python sync tool.
- **Decision**: Mirror the contract in `scripts/verify-static.mjs`, expose it as `npm run verify:static`, and test it against fixture trees so the rules themselves are covered.
- **Consequences**: The project can fail fast before a website sync runs, and the rules are documented where the studio lives. The two copies must stay aligned; a drift is a test failure on the website side.

### ADR-006: PNG export rasterizes the same SVG through a canvas
- **Date**: 2026-10-30
- **Status**: Accepted
- **Context**: SVG is the editable master, but wallpaper and phone use wants a raster file. A second renderer would duplicate motif logic and let the PNG drift from the stage.
- **Decision**: `src/studio/export.js` holds the frozen size table and filename, while `src/studio/raster.js` orchestrates Blob → image → canvas → PNG with `createCanvas` and `loadImage` injected by `src/ui/app.js`. Dimensions are validated against a 16.7 MP ceiling, and the PNG comes from the same `renderSvg` output at the selected width and height.
- **Consequences**: The raster path is testable in Node without a DOM, while the UI owns browser globals and the `createImageBitmap` → `<img>` fallback. Export sizes are data, not state; they do not enter the URL or localStorage record. Adding a size costs one frozen record and one test expectation.

### ADR-007: Saved looks are a bounded local record with signature ids
- **Date**: 2026-10-30
- **Status**: Accepted
- **Context**: The studio could keep only one state, so comparing candidates or returning to a look after a reload meant copying URLs by hand. The site must stay static, with no accounts and no network.
- **Decision**: Store up to 12 looks in `tessera.gallery.v1`; each entry keeps only the visual fields (motif, palette, repeat, weight, warp, seed), uses the visual signature as its id, and is normalized on every read. `gallery.js` is pure, `storage.js` owns the versioned record, and the UI restores an entry while preserving the current guides/motion toggles. Share links continue to encode the full studio state in the URL.
- **Consequences**: Duplicate saves collapse and the oldest look falls off at the cap. An unsupported or corrupt record is refused rather than migrated. The gallery adds one localStorage key and no dependency; its thumbnails use the same pure motif/SVG path as the stage.

### ADR-008: Tile transforms rotate and mirror inside the pattern
- **Date**: 2026-10-30
- **Status**: Accepted
- **Context**: Every motif always faced the same way. Transforming the stage or the exported canvas would crop the repeat, and a 90° turn of the rectangular Comb tile would break the pattern's dimensions.
- **Decision**: Add `rotate` (0/90/180/270) and `flip` (none/x/y) to the state record and apply them inside the SVG `<pattern>` as a nested group. A 90° or 270° turn swaps the tile width and height before the repeat scale. Flips mirror in the final tile bounds; presets preserve the user's transform; the gallery signature and entry state include both fields.
- **Consequences**: Every transform preserves seamlessness by construction, and rectangular motifs stay seamless after a quarter turn. Old records and URLs without the fields default to 0/none. Randomize can produce a transform, while seed and preset changes keep the current one.

### ADR-009: First screenshot keepers are default Wave and the Nocturne pinwheel preset
- **Date**: 2026-11-03
- **Status**: Accepted
- **Context**: Tessera had structural-only brand approval but `assets/screenshots/` did not exist and `media.json screenshots: []`; the README also rendered the social SVG twice (media block plus a stray inline image).
- **Decision**: Capture `npm start` at `http://127.0.0.1:4174`, viewport 1440x900, commit `2d822bb`: `2026-11-03-wave.png` (default Wave/Aegean studio) and `2026-11-03-pinwheel.png` (same build after the deterministic Nocturne pinwheel preset). Register both in `.aikit/media.json` and the README `aegean:screenshots` block; remove the duplicate inline preview line. Brand SVG reviews stay structural (the direct SVG URL did not render in the capture browser).
- **Consequences**: README proves the default studio and one preset click with share-link state. Reproduce with: `npm start`, open the URL, screenshot, click Nocturne pinwheel, screenshot.

### ADR-010: Seam wraps share decisions so coincident tile edges match
- **Date**: 2026-11-04
- **Status**: Accepted
- **Context**: Comb drew 5 hexes with sequential random fills, missing bottom coverage (tile needs 8) and letting x=0/x=90 and y=0/y=H halves diverge; arcade gave each corner its own inner radius so coincident quarters mismatched; drift placed dots at 0-100 so edge dots clipped with no counterpart.
- **Decision**: Comb builds 8 hexes with 4 distinct fill/dot decisions shared by wrap pairs (top/bottom/left/right); arcade shares one inner radius across all four corners with an independent center; drift keeps dots in 4-96 so the max 1.46px radius never crosses an edge. Added regression tests for 8-hex coverage, wrap sharing, corner sharing and dot margins.
- **Consequences**: All tiles stay seamless by construction per ADR-002 with no API change; patterns shift slightly where the old output was gapped or mismatched, which is the intended fix.

### ADR-011: Export filenames and labels carry the full visual geometry
- **Date**: 2026-11-05
- **Status**: Accepted
- **Context**: `exportName`/`pngName` omitted repeat, weight and warp, so two different renders (e.g. weight 2 vs 6) produced the same filename and overwrote each other; `entryName` and `describeState` also omitted them, showing duplicate gallery names and identical descriptions for different looks.
- **Decision**: Add `geometrySuffix` (`-r{repeat}w{weight}v{warp}`) to SVG/PNG filenames, include weight/warp in `describeState` and repeat/weight/warp in `entryName`. Updated the pinned expectations plus distinctness regression tests.
- **Consequences**: Every distinct visual maps to a distinct filename, gallery name and description; old filenames change, which is intended because the old ones collided.

### ADR-012: The preset rail marks a look by its base visual fields, not personal transforms
- **Date**: 2026-11-07
- **Status**: Accepted
- **Context**: Presets now show visual previews and can be marked active, but `applyPreset` deliberately preserves the user's rotate, flip, guides and motion toggles. Comparing the full state would clear the marker immediately after loading a preset on a transformed stage, which would make the confirmation useless.
- **Decision**: `activePresetId` compares the six base look fields (`motif`, `palette`, `repeat`, `weight`, `warp`, `seed`) and ignores transforms and toggles. Any edit to a base field clears the marker. Gallery signatures keep transforms because a saved look must restore its exact geometry.
- **Consequences**: The outlined preset means "this curated base look is loaded"; the stage may still be mirrored or rotated. The preset previews and the active comparison stay consistent because both use the canonical preset state.

### ADR-013: Pattern edits keep a session-only undo history
- **Date**: 2026-11-08
- **Status**: Accepted
- **Context**: The studio had no way to step back after an experiment; a motif, slider, preset, randomize or gallery load overwrote the previous state, and only saved looks or reloads could recover it. The site must stay dependency-free and static, and the stored and saved formats should not change.
- **Decision**: Add pure stack helpers in `src/studio/history.js` (`HISTORY_LIMIT` 30, push, stepBack, stepForward). The UI keeps the last committed normalized state as a baseline, records one snapshot when a discrete action completes and one per completed slider drag (`change`, not every `input`), clears redo on a new edit, and ignores no-op changes. Ctrl/Cmd+Z, Shift+Ctrl/Cmd+Z and the Undo/Redo buttons call the same helpers. Restored states go through the normal update path, so storage and the URL stay in sync. History is in memory only and is never written to localStorage.
- **Consequences**: Undo/redo works per session and across every visual field plus guides/motion, while reloads start a fresh history. Gallery storage operations stay outside the history; undo never deletes or restores gallery entries. No save-format or dependency change; the buttons disable when their stack is empty.

### ADR-014: Open tabs synchronize through storage events
- **Date**: 2026-11-08
- **Status**: Accepted
- **Context**: Tabs share `tessera.studio.v1` and `tessera.gallery.v1`, but each tab rendered only at load. Editing or saving in one tab left the others stale, including saved-look rows that could later be overwritten by stale saves.
- **Decision**: Listen to `storage` events for both keys. Re-read through `readState`/`readGallery`, update the other tab without writing back, clear its undo/redo stacks on an external state change, refresh the gallery without changing the stage, and announce the sync. The writing tab is unaffected because storage events do not fire there.
- **Consequences**: Open tabs converge on the last write, and stale gallery writes are avoided. Undo history is per-tab and resets on external edits; the URL follows the synchronized state. No save-format, dependency or sync-server change.
