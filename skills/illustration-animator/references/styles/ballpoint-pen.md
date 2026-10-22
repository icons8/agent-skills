# Ballpoint Pen

The style has no rules of its own yet: work by common.md, keep the character of motion the same across the whole batch. fr 30, loop 3–5 s.

## Lessons

- Don't make gestures small (torso tilt 3–5°, head turn about 6°, cat jump of a few px) → tilt 9–15°, head turn 12°, hop 20–40 px, so the peak is visible in at least 2 frames out of 16 (the judge saw no action in 6 scenes out of 6).
- Don't claim a step or a run without giving the legs their own motion → swing the legs or boots as separate parts (or as `N.k` contours) in antiphase from the hip 15–25°, the body bounces twice per step; if the legs are fused with the body - bend the bones like "scissors" to −8…+15° (otherwise the figure just bounces).
- Don't cover a dead pause with continuous swaying of the character → fill it with the next story beat (a nod, a flash of symbols), holds short and still.
- Don't spin the "ground" under a runner at its own tempo → one step = one ring tile (16 tiles - 16 steps per revolution, revolution 240 frames, step 15), the foot lands on a tile, the tile springs down by scale from the outer edge (each tile is its own part, moving around the circle with `p`+`r`).
- Don't leave the short crotch seam on one of the cut-off parts → remove it from all masks (otherwise it sticks out like a hook during the step).
- Don't move cut-off legs like scissors (both converge and diverge at once) - it reads as a side-step → run: the legs swap places, the leading leg forward in the swing rises (shift up 50+ px, the top goes under the torso), the support leg stays on the tile; the torso is lowest on the support, higher in flight.
- Don't put the right (forward-extended) leg of the loader runner in the foreground → the near one is the left, the right goes under it.
- Don't leave line ends cut by a mask flat or splintered → round ends (engine, `maskBy` by itself), the cut across the line.
- Don't decide the layer order of a cut-off arm by eye → by the T-junction: the lower line of the arm butts into the shirt's side line - the arm is under the torso. Run the cut right against the side line (the whole arm line leaves with the arm, the side stays intact); otherwise a stub of the arm line with its tip hangs on the torso and the arm seems to be in front.
- Don't leave details of a cut-off limb (sleeve stripes, cuff) in their place in the SVG order if the limb itself went under the torso → move them to `svg-extra` together with a copy of the limb under the torso (otherwise they are drawn over the body and the limb looks like it is in front).

## User bans
