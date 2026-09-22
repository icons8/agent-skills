# Animated illustrations

Part of Ouch is animated. An animated illustration is the same artwork with
motion, so everything in `SKILL.md` still applies: one style per project, one
picture per slot, the subject is about the product, the file has to be
shippable. This file covers only what motion adds.

No duration, curve, spring or stagger value appears here. The timing lives
inside the asset and is not adjustable.

Measured 2026-09-21/22 against the live server.

## 1. Decide whether the slot earns motion

**One moving thing per screen.** Motion is attention, and a page with four
looping pictures spends it everywhere and buys nothing. Pick the single slot
that earns it, normally the hero, and try an animated candidate there. Every
other slot on that screen stays static.

**Subject still wins.** If the animated candidate is a worse picture for the
slot than a static one, take the static one. Animated coverage is thin and
skewed, so forcing it costs subject fit. Tested: an invoicing brief had 56
animated hits for `invoice payment` and none in a style carrying Lottie, and
the product had to move to another domain before the set worked.

**Empty states stay static, always.** Across the whole catalog
`empty nothing here yet` with `animated: true` returns about 20 works, and the
top hit is an empty browser window, the failure `SKILL.md` names first. Inside
a single style there is usually nothing.

Docs pages and slide decks: static. A loop next to a code block or on a
projector is noise.

## 2. Find the animated ones

- An illustration is animated when `media_types` includes `"animated"`.
  That is the only reliable signal.
- **The `animated` flag on a style means nothing useful.** It says the style
  has animated formats somewhere, not that its illustrations move, and nothing
  in the API counts how many of them do: `search_illustrations` needs a query,
  so every number you can get is per subject, not per style. Filter with
  `search_illustrations(animated=True)` for the subject you need instead.
- Style size does not predict animated coverage: `3d-casual-life` has 2653
  works and 2 animated for `work`; `juicy` has 1043 and 19.
- `animation.lottie` in the search result is a boolean and it is honest. Read it
  rather than calling and catching the error.
- A few animated illustrations carry no `animation` block, and some carry only
  `poster`. Read the block, do not assume its shape.

## 3. Never ship a preview

The `animation.webm` and `animation.mov` links in a search result are a 368px
preview with **no transparency** (opaque `#F7F7F7`), watermarked unless the
account has a plan. They are for choosing. This is failure mode 2 from
`SKILL.md`, unchanged.

`animation.poster` is the exception: 1200×1200, transparent, clean, permanent.
It ships, and it is the right still for a reduced-motion or no-video fallback.

What ships comes from `get_illustration_animation`. Its URLs are presigned and
die in an hour, so download at once.

| Format | What it is | Ship it? |
| --- | --- | --- |
| `webm` | VP9, `alpha_mode=1`, transparent | yes, Chrome and Firefox |
| `mp4-hevc` | HEVC `hvc1` with an `almo` alpha layer | yes, Safari |
| `prores` | ProRes 4444, ~55 MB | no, editing master |
| `lottie` | vector JSON, transparent everywhere | yes, when it exists |
| `gif-low` | small GIF, opaque white, the only format needing no account | last resort |
| `gif` | full-size GIF | rarely |
| `aep` | After Effects project | no |

Do not trust `ffprobe` on the HEVC file: it reports `pix_fmt=yuv420p` and no
alpha because it does not decode the auxiliary layer. The alpha is there.

## 4. Video: the source order is load-bearing

```html
<video autoplay loop muted playsinline poster="poster.png" width="380" height="380">
  <source src="asset.mp4"  type="video/mp4; codecs=hvc1">
  <source src="asset.webm" type="video/webm">
</video>
```

`mp4-hevc` goes **first**. Safari answers `canPlayType` with `probably` for webm
too, takes whichever source comes first, and cannot show VP9 alpha: put webm
first and Safari paints a black rectangle where the picture should be. Chrome
cannot play HEVC, skips it and takes webm. Both end up transparent.

`poster` is not decoration. It is the first frame (measured difference 0.31, so
no jump on start) and it is what shows before the video loads and under reduced
motion.

## 5. Lottie, when the illustration has it

Lottie is the only format that is transparent in every browser, and it is
vector, so it scales. Files are self-contained pure vector, 150 to 600 KB, 2 to
7 seconds.

**It gzips about ten times** (three animations: 951 KB raw, 90 KB over the
wire). Video does not compress at all. That drives the budget below.

**Inline the JSON.** `lottie-web` fetches a path over XHR, and from `file://`
CORS blocks it silently: no error, just empty boxes. Load with `animationData`
and put the JSON in the page, or serve over HTTP.

Availability is per illustration, not per style. Eight styles measured uniform,
but `flexy` has it on 3 of its 15 animated works, so do not generalise. Read
`animation.lottie`.

## 6. Budget

Measured on a built landing page, one hero video plus three Lottie features:
806 KB per visitor in Chrome, 1217 KB in Safari, of which the single hero video
is 69 to 79 per cent.

**Video for the one hero at most. Everything repeated goes to Lottie**, or
stays static. A row of three looping videos is both wrong (rule 1) and heavy.

## 7. Playback

- The hero may loop, because under rule 1 it is alone on that screen. The loops
  are seamless (first against last frame 0.57, against a mid frame 9.18), so a
  held last frame reads as deliberate stillness.
- Anything below the fold plays **once when it scrolls into view**, then holds
  its last frame. Not a loop.
- `prefers-reduced-motion`: pause the video, drop the `loop` attribute, leave
  the poster showing, and freeze Lottie on frame 0. A decorative loop is exactly
  the motion that should stop completely, which is narrower than the general
  rule for interface transitions.
- Verify by state, not by pixels: read `video.paused` and the `loop` attribute.
  A seamless loop makes two screenshots look identical whether or not it plays.

## 8. Fitting it in the layout

`SKILL.md` step 5 applies, with two changes.

- **Read sizes from the `animation` block.** The video is square 368×368 while
  the static preview is not square for 36 per cent of illustrations, so the
  preview tells you nothing about how the animation is cropped. Lottie keeps the
  true ratio (800×600, 800×800, 1600×1200); video is padded into a square.
- **`scripts/measure.py` does not take Lottie or video.** It rasterises SVG and
  PNG. For animation, render the page, crop the slot box from the screenshot and
  measure that. Three Lottie files in one 240px box filled 60, 84 and 91 per cent
  of it with bottoms 24px apart until each was scaled and nudged on its own.
