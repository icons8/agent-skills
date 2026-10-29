# Black Chalk

The style has no rules of its own yet: work by common.md, keep the character of motion the same across the whole batch. fr 30, loop length per common.md "Smoothness" (a simple scene - 2 s).

## Lessons

- Don't make a reaction and an action small and short (swell below ~115 %, shift under ~15 px, rotation under ~5°, peak shorter than ~6 frames) → make them bigger and longer, so the peak is visible in at least 2 frames out of 16 (otherwise the action doesn't read).
- Don't leave a full hold longer than ~15 frames → fill it with the next story beat or the life of the symbols (otherwise a dead pause).
- Don't remove several symbols at once or at the loop seam → one by one with a step of 4–8 frames, the last one leaves before the seam, taking start into account (otherwise they go as a "bunch" and there is a jump at the seam).
- Don't fade symbols out with opacity → collapse them by scale: swell to 118–124 %, then 0 over 4–6 frames (opacity is almost not used in our animations).
- Don't throw a rocket/object across other parts → check that during the motion it doesn't run into neighboring symbols; the symbols give way (otherwise an overlap).
- Don't build a "pose - hold - return" loop when the output loop starts from the middle of the pose (start) → a continuous wave without holds or start in the SVG pose (otherwise the return at the start of the loop reads as a sharp reset).
- Don't build a pulse or a squeeze as two quick snaps per stroke (a pump of fused hands that flicks twice on each stroke reads as a twitch) → one soft cycle per beat: ease in, a single smooth swing and ease out, squeeze or swell rising and falling inside that same cycle; keep the speed profile of a stroke to one hump, no spike pairs a few frames apart.
- Don't leave a rest inside the loop while one part works and the rest waits, and don't let a page, sheet or other backdrop piece run over the hand that holds the tool → keep the idle part of the loop as short as the story allows (the answer of the page follows the stroke at once, not after a pause), and a backdrop piece passes under the hand, never over its outline; a line that has to be cut at the hand is extended frame by frame to the outline.
- Don't shrink or pulse a disco ball as a whole (squash "on the beat") → the ball hangs and swings on its cord like a pendulum; the facets are not faked by scale, the flashes are the sparkles around it that pop in and out one after another.
- Don't let lines that cross or meet in the drawing (ribbon tails under a rosette, a ribbon over a ring) part in motion → the lines that meet at a junction keep meeting in every frame: move the pieces as one block or about one shared pivot, never swing them apart by different angles.

## User bans

- Don't make sharp movements of large parts (shield, head) → smoothness like Plain: head turn 8–12 frames, deceleration longer than acceleration, spring 13–38 frames.
- Don't let part lines intersect during motion (the password field runs onto the shield) → move so that the contours don't run onto each other.
- Don't build the collaboration on jumps in turn → the dotted line runs continuously around the circle, the figures move in time with it.
- Don't give the rocket a jerk with a return → a continuous looped flight (that is a story too).
- Don't drag out the tempo → shield faster, collaboration about twice as fast (shorter loop, shorter movements).
- Don't make a sharp head movement of the astronaut in the middle of the loop → the head moves only smoothly, without quick extra turns and jumps between poses.
- Don't have the astronaut's head look up, hold the pose and return (the return reads as a sharp reset, the loop is not felt) → the head sways continuously and slowly in a wave through the whole loop, without holds, the start and end of the loop in the same pose.
- Don't swell or pulse a still backdrop object (the moon) in answer to a glance → the character looks at it and the object stays calm; the answer comes from small ambient symbols (stars twinkling after the glance: role reaction, `at` = the frame the swell starts).
- Don't let bubbles or drops appear bottom-up or all at once → the direction of appearance follows the physics of the scene: bubbles in a neck or drops from a cloud show up top to bottom, one by one, 3–4 frames apart.
- Don't leave raindrops hanging in the air between falls or pop them back where they are drawn → every drop forms at the cloud's lower edge, slides down to its drawn place and falls to the shirt; the periods (15, 21, 35, 105) divide the loop, drops that gather slowly hang a few frames at their place, one after another, and the cloud only drifts (a squeeze with nothing pushed out reads as an idle pulse).
- Don't move a light source and leave its beam and light lines still, or animate them on their own beat → the beam and the light lines are attached to the source and move in sync with it (same pivot, same timing, at most a short lag); they slide along their own axis, never against the source's motion.
- Don't make the text lines and the photo on a document pop, highlight or jiggle without a reason in the story → a document's text and photo stay still; only what the light actually touches may answer, and only if the story says so.
- Don't pulse clasps, buttons or other hardware on an object without a reason in the story → fittings stay still and move only with the body they are attached to; a pop is allowed only when the story gives it a cause (something presses or opens it).
- Don't make the progress-bar ticks appear in the order that reads against the way the bar fills (ticks leaving from the right and returning from the left read as progress running backwards) → the ticks appear in the order of the filling, one by one, in the direction the bar is read as filling; check the direction against the drawing before choosing the order.
- Don't let a mark appear before the tool that makes it, or by itself, or grow from its own corner while the tool is elsewhere (cause and effect inverted) → the tool is the cause and the mark is the effect: the tick, line or stroke appears behind the tool tip after the tip has arrived at that spot, drawn along its own path in the tip's direction; the tool then leaves.
- Don't let an object that flies along a dashed path or line carry on past the end of it (out of the frame) → at the end of the path the object stops and shrinks to scale 0 right at the end of the line; the line is its route, so the object ends where the route ends.
- Don't cut a wheel out roughly, with a piece of the body or the neighbouring lines caught in the cut → cut each wheel exactly along its own outline (the cut line follows the tyre contour, with nothing of the body, the axle line or the road line inside it), so the wheel can turn or hop and leave the drawing whole.
- Don't trust the source SVG blindly: an Icons8 source can carry a stray black fill under the outline (a filled silhouette of the whole figure with a cut-out hole, under a contour drawing) → before analysis render frame 0 on a neutral grey and compare it with the intent of the drawing by eye (an outline-only drawing with a black silhouette under it is a source error, not a style); remove the stray fill from the SVG (find the path by area: it is much larger than any outline part) and keep only what the drawing means.
