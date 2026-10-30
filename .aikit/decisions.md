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
