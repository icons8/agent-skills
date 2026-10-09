# Scene format

`styles/<style>/scenes/<name>.json`. Coordinates are in 1200×1200 space (as printed by `engine/bin/els.js`). Element indices come from `els.js`.

```json
{
  "name": "<name>",
  "svg": "../svg/<name>.svg",
  "fr": 30,
  "op": 105,
  "start": 0,
  "parts": [
    { "name": "BODY", "els": [1, 2], "pivot": "bottom" },
    { "name": "ARM", "els": [3], "pivot": [600, 498], "parent": "BODY",
      "bones": { "joints": [[600, 498], [780, 498], [960, 498]] } },
    { "name": "HEAD", "els": [4], "pivot": [600, 450], "parent": "BODY" },
    { "name": "BALL", "els": [5], "pivot": [990, 498], "attach": { "part": "ARM", "bone": 1 } },
    { "name": "ICON", "els": [6], "pivot": "center" },
    { "name": "LID", "els": [7], "pivot": "bottom" },
    { "name": "HEART", "els": [8], "pivot": "center" },
    { "name": "PANEL", "els": [9], "pivot": "center" },
    { "name": "CURSOR", "els": [10], "pivot": [520, 810], "canLeave": true }
  ],
  "joints": [{ "a": "HEAD", "b": "BODY", "at": [600, 450] }],
  "tracks": [
    { "part": "ARM", "t": "bend", "at": 6, "from": [0, 0], "to": [-20, -45], "dur": 10, "role": "action", "beat": 1 },
    { "part": "ICON", "t": "pop", "at": 16, "role": "reaction", "beat": 1 },
    { "part": "LID", "keys": { "r": [[20, 0, "out"], [30, 5, "inOut"], [40, 0]] }, "role": "action", "beat": 2 },
    { "part": "HEART", "t": "appear", "at": 50, "role": "reaction", "jump": true },
    { "part": "PANEL", "t": "float", "at": 0, "dur": 105, "period": 105, "amp": 8, "role": "ambient" }
  ]
}
```

## Fields

- `fr`, `op` — fps and loop length in frames per the style profile.
- `start` — the frame of the authored loop at which the output loop starts. Authored frame 0 is the key pose (= SVG).
- `parts` — meaningful parts. An element belongs to at most one part. Everything not in parts stays static.
  - `pivot` — `[x, y]` or `center|bottom|top|left|right` by the part's bbox.
  - `parent` — the part moves together with its parent.
  - `bones.joints` — a chain of joints from root to tip for a bendable part (shoulder, elbow, wrist). The bend is set by a `bend` track.
  - `attach` — the part follows the bone `bone` of the rig part: it has no position of its own, its own rotation is added to the bone's angle.
  - `canLeave` — the part may go off the canvas.
  - `touch` — names of parts this one may overlap (an intended touch: a cursor on a button, a palm on a palm). Without it, parts that are apart in the key pose must not overlap each other by more than 15 % (the `overlap` check; parent–child, `attach`, `joints` and an action → reaction pair are not checked).
  - `maskBy` — a dynamic mask: the part is hidden (`out: true`) or visible only (without `out`) inside the silhouette of another part, and the mask follows that part (its position and rotation; the mask part is rigid, without `bones`). The silhouette is the convex hull of the points of the `hull` elements plus the `extra` points, or a traced outline `poly` (where a convex hull would swallow a neighbor: a boot with an ankle). One mask per part. This is how the far leg hides behind the near one, and a line is cut off at the waist: `{ "part": "LEG_A", "hull": [38, 39], "out": true }`, `{ "part": "LEG_A", "poly": [[405, 1016], [522, 1031], …], "out": true }`, `{ "part": "BODY", "extra": [[300, 684], [900, 684], [900, 1300], [300, 1300]] }`. A sawn-off part (a mask by itself, `part` is its own name) gets round stroke ends where the cut crosses a line (like pen ends, no stubs; `caps: false` — turn off; `capSkip: [[x, y, r]]` — no end at these places: a T-junction, where the cut line butts into another line of the same part); make the cut across the lines, not along them — along them you get splinters. The `overlap` check doesn't know about masks — give the masked part `touch` on the mask parts. The reference is the hiker (`examples/rough-sketch/scenes/rough-sketch-hiker-walking…`).
  - `maskBy.lines` — a tight mask along the part's own lines (as in Figma): `{ "part": "ARM_L", "lines": [{ "from": [395, 650], "to": [560, 682], "via": [450, 800] }], "fill": true }`. The engine finds the center of the stroke from the point near `from` to the point near `to` (by the route that passes near `via`), takes its thickness and draws a matte with a pen of that thickness and round ends. `fill: true` — plus the interior closed by a chord between the ends (variant A: the limb covers what is behind it); without `fill` — lines only (variant B). `out: true` — cut these lines out (a torso without the sawn-off arm). `pad` — margin added to the thickness in px (default 3; for `out` take 6–8, otherwise crumbs are left in the hollows). `trim: [{ "s": [[frame, %]…], "e": […] }]` — the ends move along the line (in AE this is Trim Paths on the matte layer). Round ends come from the pen itself — `caps` are not needed. The `from`/`to`/`via` points are on the line itself, in render px of 1200. `add: [[[x, y], …]]` — filled polygons in the same matte for solid blobs on the line that the pen does not cover (a filled shoe); draw them with a 20–30 px margin. Several `lines` sections are fine: a limb line that runs over two contours of a compound path is found on one contour only — split it into two sections and close the interior with an `add` polygon. Take `from`/`to`/`via` from `els.js` and the line's center, not by eye from a grid.
  - `clipBy` — a part name: this part is visible only inside that part's elements (a mask by the strokes themselves; for a silhouette use `maskBy`).
  - `backfill` — `[{ poly, color? }]`: a white underlay under the part's lines. Not recommended: the owner banned the underlay (visible on a colored background, breaks the strokes) — hide lines via `maskBy`.
- `joints` — attachment points of parts to each other: `a`, `b` — names of existing parts, `at` — `[x, y]`. The check makes sure they don't drift apart by more than 2 px.
- A fused element is split by outlines right in `els`: `"17.0"` — outline 0 of element 17 (outline numbers come from `node engine/bin/els.js <svg> --sub 17`). For example, a note `[14, 15, 16, "17.0", "17.1"]`, while the "T" (`"17.2"`, `"17.3"`) goes nowhere and stays static. One element can't be listed both whole and by outlines.
- Cut pieces — `"4:arm"` (piece `arm` of element 4) and `"4:rest"` (what is left of the element). A cut element can't be listed whole. Cuts — in "Cut and pinned seam" below.
  - `pin` — a pinned seam: `{ "line": [[x, y], …], "zone": [[x, y], …], "feather": 150 }`. `line` — the polyline the part stands on (the cut line); `zone` — a polygon inside which everything stands still (feet on the floor, a palm on the counter); at least one is needed. From them the part's motion grows smoothly and reaches full strength after `feather` px (100–250). A part with `pin` and everything attached to it (`parent`, `attach`) is baked into the paths.

## Constraints (the engine checks them and answers with an error)

- A part's elements may be out of a row: then the engine makes several layers with one motion (`ARM`, `ARM·2`), the draw order is kept. Exception: a part with `maskBy` or `clipBy` keeps its elements in a row.
- A template has only its own parameters (table below); a typo in a parameter name is an error.
- A bendable part has at least 2 joints; `bend` has as many angles as there are bones (joints − 1).
- `attach` and `parent` can't be used together.
- `start` — an integer frame from 0 to `op − 1`.
- Key frames are integers and strictly increasing; an easing curve is 4 numbers, x1 and x2 from 0 to 1.
- Every track has a role; the scene has at least one action and one reaction; reactions of different parts are no closer than 3 frames.
- `tracks` — motion tracks. Values are relative to rest: `p` offset `[dx, dy]`, `s` scale `[sx, sy]` in %, `r` degrees (clockwise is plus), `o` %, `bend` bone angles.
  - Template: `"t"` + parameters. Or custom keys: `"keys": { "<property>": [[frame, value, easing], …] }`.
  - `role` — `action`, `reaction`, `ambient` (background, only on top of the story). Required.
  - `beat` — the story beat number.
  - `jump: true` — a jump at the start of the track is allowed (appearing after disappearing).
  - `constant: true` — linear easing is allowed (constant rotation).
  - Tracks of the same part and the same property don't overlap in time.
  - By the end of the loop every property returns to rest (otherwise — a seam). The next track of the same part and property starts with the value where the previous one ended (otherwise — a jump; `jump: true` allows it).

## Cut and pinned seam

When parts are fused into one outline (a bartender with the counter, an arm with the torso, a horse's leg with the body), they are cut and bent with bones. Rules — `common.md`, "Fused parts".

```json
"cuts": [
  { "name": "man", "els": [3, 4, 5], "poly": [[130, 0], [910, 0], [910, 800], [887, 800], [887, 898], [380, 898], [380, 600], [130, 600]] },
  { "name": "arm", "els": [3, 4, 5], "poly": [[130, 0], [480, 0], [480, 330], [600, 345], [512, 500], [495, 535], [130, 600]] }
],
"parts": [
  { "name": "MAN", "els": ["3:man", "4:man", "5:man"], "pivot": [640, 898],
    "pin": { "line": [[887, 800], [887, 898], [380, 898]], "feather": 250 } },
  { "name": "ARM", "els": ["3:arm", "4:arm"], "pivot": [545, 440], "parent": "MAN",
    "bones": { "joints": [[545, 440], [310, 420], [290, 140]] },
    "pin": { "line": [[600, 345], [512, 500], [495, 535]], "feather": 120 } }
]
```

- `cuts` go bottom-up: each cut takes its piece from what is left and is drawn on top (the one listed later is higher and wins where polygons overlap). The pieces of one cut are drawn as a stack right after their last element: the arm whole above the body, not between its fill and outline.
- **Polygon**: `{ "name", "els": [elements], "poly": [[x, y], …] }` — the cut takes all elements of that place in a row (fill, outline, details); there must be no uncut ones between them. If the cut missed an element, that element has no `N:name` piece.
- **By outline points**: `{ "name", "el": 7, "contour": 0, "from": 42, "to": 65, "with": [6] }` — outline `7.0` is split at its vertices 42 and 65: vertices from → to (along the outline) close into a piece, the curves stay exact. `with` — elements under the outline (the fill), cut by the same area. Vertex numbers: `node engine/bin/els.js <svg> --pts 7.0` or as a picture `node engine/bin/poses.js <svg> --pts 7.0 --box x,y,w,h --out <png>`. If the piece came out "inside out" — swap from and to.
- The cut line goes where the piece bends: through the shoulder, the hip, along the counter's edge. The polygon's other sides go over empty space, not through lines of the drawing: where a cut crosses the drawing it must be pinned (`pin.line` along that line), otherwise `tear`.
- At rest the picture matches the SVG pixel for pixel: pieces tuck under each other by 3 px, seams are invisible. If they show — `cut`.

Cut checks (`make.js`):
- `cut` — the seam shows at rest (a gap lighter than the SVG along the cut line). Usually a cut through a thin place where pieces don't overlap: move the line.
- `tear` — the cut tears the drawing in motion: pieces on both sides of the line part by more than 2 px. Pin the seam (`pin.line` along that line) or run the polygon's side over empty space.

To view the cut and the poses:
- `node engine/bin/poses.js <svg> --grid --out <png>` — the drawing with a coordinate grid: draw the polygon by it.
- `node engine/bin/poses.js <scene.json> --cuts --grid --out <png>` — each part in its own color: shows what moved where.
- `node engine/bin/poses.js <scene.json> --frames 0,12,24 --box x,y,w,h --cell 400 --out <png>` — frames side by side, the seam enlarged (shoulder, armpit, feet) in the strongest poses.

## Templates (default parameters are for 30 fps)

| Template | Parameters | What it does |
|---|---|---|
| `move` | `from` [0,0], `to`, `dur` 16, `ease` soft, `arc` 0 | movement; `arc` 0.1–0.2 — along an arc (fraction of the length at mid-path, > 0 — up when moving right) |
| `click` | `depth` 84, `down` 3, `up` 5 | a press by scale |
| `pop` | `peak` 118, `under` 96, `dur` 12 (from 4), `half`, `zeta` | reaction: smooth swelling and a spring; `under` — the first undershoot (sets the damping), `null` — damping from `zeta` |
| `slide` | `from`, `to`, `dur` 15, `overshoot` 0.03, `arc` 0, `half`, `zeta` 0.32 | a move from rest, overshoot by `overshoot` of the path and a spring |
| `bounce` | `height` 20, `dur` 15, `half`, `zeta` 0.32 | a hop: up, fall, landing with a dip of ~0.2 of the height and a spring |
| `swing` | `angle` 9, `dur` 50, `zeta` 0.16 | pendulum: a smooth push and a swing with damping |
| `spring` | `prop` (p, s, r, bend), `from`, `to` (rest), `v0` 0, `half` 6, `zeta` 0.32, `dur` (until damped) | settling by a spring from `from` to `to`; `v0` — the speed of the incoming motion per frame; each swing is 0.3–0.4 times smaller than the previous one |
| `turn` | `from` 0, `to`, `dur` 20, `ease` soft | rotation |
| `spin` | `dur`, `turns` 1, `from` 0, `ease` lin | rotation around the pivot by whole turns (loader, wheel, clock hand); `turns` may be a fraction (1/12 — a click), the loop is closed when the turns add up to whole ones; linearity is allowed by itself |
| `disappear` | `dur` 8 | scale and opacity to 0 |
| `appear` | `dur` 10 | from 0 with overshoot |
| `bend` | `from`, `to` (bone angles), `dur` 10, `ease` soft, `lag` 1 with 2+ bones (frames per bone: each next bone starts later; 0 — all at once) | bend by bones, with lag along the chain |
| `float` | `dur`, `period` (integer number of periods in `dur`), `amp` 8 | floating up and down |
| `sway` | `dur`, `period`, `angle` 4 | swaying around the pivot |

Key easing: `soft`, `inOut`, `out`, `in`, `back`, `sine`, `lin`, `hold` or a custom curve `[x1, y1, x2, y2]`. From rest — only with a flat start (`soft`, `inOut`, `sine`, a custom curve with y1 = 0); `out` and `back` — only as a continuation of ongoing motion, otherwise `make.js` rejects the scene (`speed`: a jerk from rest). Speeds on both sides of a key must match (a kink of more than 2× is also `speed`).

An arc with custom keys: the fourth element of a position key is `{"to": [dx, dy], "ti": [dx, dy]}`, path tangents to the next key (from this value and from the next one), as in After Effects.
