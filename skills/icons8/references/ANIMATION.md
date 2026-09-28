# Animated icons

About one icon in fifty also moves. It is still an icon from the project's
pack, so everything in `SKILL.md` applies. This file covers only what motion
adds. The timing is baked into the file (28 frames at 24 fps, about 1.2 s) and
is not adjustable; every other motion rule and value belongs to `motion`,
including reduced motion and hover gating, which the snippet below implements.

Measured 2026-09-25/28; the snippet was run in Chrome.

## 1. Decide whether the icon earns motion

**Motion answers the user, it never starts on its own.** It plays once, in
response to something the user did, and stops. Swapping static icons for their
animated twins makes the interface flicker: that is the failure this file
prevents.

| Trigger | Plays | Example |
| --- | --- | --- |
| Click or tap that changes state | once per click | like, bookmark, save, send, add to cart |
| Hover or keyboard focus on a standalone element | once on enter | an icon button |
| A process the user started and is waiting for | while it runs, then gone | loading, syncing, uploading |

**Never loop on hover or click.** Only the third row repeats, because there
the motion itself means "still working".

**Static, always:** navigation, sidebars, tabs, menus, list and table rows
(high-frequency hover, see `motion`); anything moving at rest, landing grids
that play on scroll included; a second icon moving at the same time; empty and
error states.

**Motion is never the only signal.** The state change (filled heart, "Copied",
the counter) happens without it too.

## 2. Find the animated ones

- `search_icons(query, platform=<the lock's pack>, animated=True)`. No animated
  version in the pack means the icon stays static. Never switch packs for motion.
- Animated icons are separate ids with a `--vN` suffix (`like--v2`,
  `home--v4`). For them the `--vN` rejection rule in `SKILL.md` does not apply,
  but look at the still: it can be a different drawing from the plain icon.
- Use the animated id for both states. Its frame 0 is pixel-identical to its
  own SVG and PNG, so rest on `get_icon_svg(<animated id>)` and nothing jumps
  when it starts.
- A plain search ranks animated variants high (`home` in `ios7`: three of the
  top five). Pass `animated=False` when they crowd out the plain icon.

## 3. Check that the motion says what the action says

A fitting picture can still move the wrong way. In `m_outlined` the only
animated link (`link--v2`, Lottie name `broken-link`) comes apart and rejoins:
right for Unlink, wrong for Copy link, where it tells the user something broke.

| Action | Motion that fits | Motion that contradicts it |
| --- | --- | --- |
| Positive, adds or keeps: like, save, bookmark, copy, add, send, follow | fills in, draws on, joins up, pops, a check appears | breaks apart, empties, shakes, gets crossed out |
| Negative, takes away: delete, remove, unlink, unfollow, mute, cancel | empties, breaks apart, gets crossed out, drops away | fills in, joins up, pops, celebrates |
| Neutral, opens or moves: comment, expand, share, refresh | opens, unfolds, slides, turns | anything that reads as success or failure |

Read the story before you take the icon:

- **Names.** The Lottie's top-level `nm` and its layer `nm` fields say what was
  drawn (`broken-link`, `Heart fill`, `running-circle-2`). A name that states
  the opposite of the action is a no.
- **Frames.** Put the gif next to the still on the contact sheet. With nobody
  watching, render the Lottie at frames 7, 14 and 21 in a headless browser if
  you have one, and look.
- **The negative side too.** A trash can that pops like a celebration is as
  wrong on Delete as a breaking link is on Copy.
- **Doubt means static**, and name the doubt in the report. A static icon is
  never wrong; a motion that says the opposite is.

## 4. Pick the format

| Format | Loops | Background | Size | Recolor | Cost |
| --- | --- | --- | --- | --- | --- |
| `lottie` | as the player says | transparent | any, vector | yes, with CSS | paid: sign-in or personal key |
| `apng` | forever, in the file | transparent | the pack's own only | no | free |
| `gif` | forever, in the file | **always opaque white** | the pack's own only | no | free |

- **Hover and click take Lottie, nothing else.** gif and apng loop forever by
  construction (GIF loop count 0, APNG `num_plays` 0) and cannot play once.
- **A loading indicator** is the one place for them, and then apng.
- **A gif always has a white background**, on purpose, not a bug to report. It
  works only on a pure white surface; on off-white cards, grey panels, brand
  colors and dark themes it is a white square, so take apng or Lottie there.
  Unknown final background: assume it is not white.
- **Size.** gif and apng exist in one size per pack: 24 px for `m_outlined`,
  `m_two_tone`, `fluent-systems-regular`; 30 `ios11`; 32 `win10`; 40
  `office40`, `ultraviolet`; 48 `color`, `fluent`, `clr-gls`; 60 `stickers`;
  64 `dusk`; 80 `office80`; 128 `pastel_glyph`. Only `ios7`, `ios_filled` and
  `clouds` scale. `get_icon_animation` refuses a size the file does not have
  and names the real one; without `size` it returns it in `"size"`. Never
  stretch them; bigger is Lottie.
- **Color.** gif and apng cannot be recolored (`&color=` fails), and a
  monochrome one is black: on a dark theme or in a brand color take Lottie.

## 5. Fetch the Lottie

`get_icon_animation(icon_id, format="lottie")` returns the animation as a
**string** under `"lottie"`: save it as a `.json` file or `JSON.parse` it. It
is usually 10 to 30 thousand characters. A refusal (over 100,000 characters, no
credential, limit spent) means the icon stays static. Never fall back to a
looping gif on a hover or click state.

## 6. Wire it

The player rests on frame 0 (the static icon), plays on the trigger and stops.
Inline the JSON when the page may open from disk: the player loads files by
XHR and `file://` blocks it silently. If the project allows no external
scripts, inline `lottie_light.min.js` too (about 170 KB).

```html
<style>
  /* Monochrome packs: the Lottie follows `color`, like every other icon. */
  .i8-anim path[fill^="rgb"]   { fill: currentColor; }
  .i8-anim path[stroke^="rgb"] { stroke: currentColor; }
</style>

<button class="icon-btn" aria-label="Send">
  <span class="i8-anim" data-trigger="click" style="display:block;width:24px;height:24px"></span>
</button>

<script src="https://cdn.jsdelivr.net/npm/lottie-web@5/build/player/lottie_light.min.js"></script>
<script>
  const SEND = /* the string from get_icon_animation, parsed */ {};
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const canHover = matchMedia("(hover: hover) and (pointer: fine)");

  document.querySelectorAll(".i8-anim").forEach((el) => {
    const anim = lottie.loadAnimation({
      container: el, renderer: "svg", loop: false, autoplay: false, animationData: SEND,
    });
    anim.addEventListener("complete", () => anim.goToAndStop(0, true));
    const play = () => { if (!still.matches) anim.goToAndPlay(0, true); };
    const control = el.closest("button, a") || el;
    if (el.dataset.trigger === "click") control.addEventListener("click", play);
    else {
      control.addEventListener("focus", play);
      control.addEventListener("mouseenter", () => { if (canHover.matches) play(); });
    }
  });
</script>
```

- `loop: false` and `autoplay: false` are required: with either default the
  icon moves on its own. `goToAndStop(0)` on `complete` returns it to the exact
  still, so a held hover never replays.
- The CSS tint is for monochrome packs (`isColor: false`) only; color packs keep
  their palette. State colors (a red liked heart, an accent active item) then
  come from `color` for free. Look at the result: a black mask layer follows
  `currentColor` too. Outside the web (SwiftUI, Android, Rive) there is no CSS:
  repaint in the JSON instead, setting `c.k` to `[r, g, b, 1]` (0 to 1) on
  every `fl` and `st` shape whose `c.a` is 0.
- Load each JSON once and keep one player per icon; never refetch on hover.
- **A toggle is two half cycles.** Like and bookmark fill in and empty again
  within one cycle, so the snippet above would erase the liked state. Find the
  frame where "on" is complete (the `m_outlined` heart: 14 of 28), play
  `playSegments([0, 14], true)` on and hold, `playSegments([14, 28], true)` off.
  No `complete` handler on a toggle; under reduced motion jump to the half's
  end frame.

## 7. Record it in the lock

An animated icon is an ordinary `icons.items` entry with two more fields, so the
next screen reuses the same id and trigger:

```json
"like": { "id": "p7MI4JnqXYvv", "commonName": "like--v2", "motion": "click", "format": "lottie" }
```

`motion` is `click`, `hover` or `loading`. An item without it is static.
