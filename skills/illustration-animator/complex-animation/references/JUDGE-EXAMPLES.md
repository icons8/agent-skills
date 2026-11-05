# Judge examples

Read before a verdict: each entry is a defect a reviewer caught after the judge passed the scene. A scene that repeats one fails that check. This file ships with the skill and is never edited: the user's own cases go to `<style folder>/judge-examples.md` in the same format, newest first.

Entry format - two lines:

```
## <scene> · judge: <verdict> · user: <ok / not ok>
Why: <reason>
```

## comic-woman-cycling-and-singing (pair verdict: the blind judge preferred the other build) · judge: the neater build · user: not ok
Why: the user asked for wheels that turn and pedals that go round with the legs. The 16-frame sheet showed the wheel spokes of the spinning build as smeared fragments, and the judge took the smear for a defect and the calm drawing with a bounce for the better one. Fast rotation looks smeared in sampled frames; the motion sheet (heat map, trail) shows whether the wheels turn. The mechanism the brief names counts before neatness.

## phone-ringing-in-pulses (pair verdict: the blind judge preferred the other build) · judge: the build that shakes more · user: not ok
Why: the user asked for ringing by pulses with full decay and a tilt of about 5°. The judge liked the build with a wide, never-resting shake as "a real ring". A bigger swing is not better by itself; the build that pulses and dies out to rest is the one the brief describes (energy strip: separate pulses with near-zero at the loop end).

## rough-sketch-brain-character-dancing-with-robotic-legs-and-happy-facial-expression (variant B, the skill's own brief) · judge: pass · user: not ok
Why: the user: "thoughtlessly twitches and flails" - an anti-example. The offshoots of the brain were read as robotic legs (the verb came from the file name); the build hops and swings them as pendulums instead of growing circuit lines to the dots (`trim`). The meaning must be read from the picture.

## comic-happy-woman-riding-bicycle-and-singing (blind comparison, A the user's brief, B the skill's) · judge: B better · user: A better
Why: the user: in A the wheels turn and the foot goes round with the pedal; in B the wheels and pedals stand and the whole bicycle only rocks. The judge preferred B for its neat drawing. The main mechanism outranks neatness: a scene whose wheels and pedals stand is a fail, however clean.

## plain-young-woman-with-flag · judge: pass · user: not ok
Why: the user: she must wave continuously, not in wave-like twitches; the second arm, legs, torso and waist stand still - "don't be lazy".

## plain-man-with-grocery-basket · judge: pass · user: not ok
Why: the user: the trousers broke off the waistband while walking; legs should bend; groceries popping out of the cart are chopped by the mask.

## plain-hand-holding-smartphone-with-check-mark-mobile-app-confirmation-and-approval · judge: pass · user: not ok
Why: the user: the hand should bend (fingers, wrist), not only the phone tipping.

## neat-successful-corporate-team-achieving-goals · judge: pass · user: not ok
Why: the user: a hand separates from the arm when scaled; motions are meaningless (hands should come together and stack); the trophy and the road stand still; the loop has a jump. Only the checklist was "super".

## neat-paper-airplane-2 · judge: pass · user: not ok
Why: the user: the plane's tip is clipped by the frame edge; it should fly and rock with lines spreading behind it.

## neat-enhancing-vision-with-binoculars · judge: pass · user: not ok
Why: the user: a spinning focus knob and swelling lenses mean nothing - "looks like nothing".

## comic-man-sending-message-with-paper-airplane · judge: pass · user: not ok
Why: the user: he should run; the plane vanishes cut off when launched; the black speed lines must appear and disappear as he runs.

## comic-man-in-vr-glasses · judge: pass · user: not ok
Why: the user: the arm with the controller should be cut off and bent at the elbow, the head should move more; the torso is dead.

## comic-hand-holding-first-place-trophy · judge: pass · user: not ok
Why: the user: boring - the trophy barely moves in the hand.

## comic-getting-idea-with-hand-holding-light-bulb · judge: pass · user: not ok
Why: the user: a gap opens in the arm, and the arm doesn't bend though it should.

## little-lack-of-time-a-man-caught-in-the-hands-of-a-clock · judge: pass · user: not ok
Why: the user: the clock hands must be separated and move independently, the man pushes the hour hand straining; the motion is jerky.

## little-hand-carefully-holding-a-green-heart · judge: pass · user: not ok
Why: the user: a crease where the fingers are cut; the motion starts sharp and strong, not smooth and rubbery.

## little-delivery-man-on-scooter-1 · judge: pass · user: not ok
Why: the user: the ride idea is right, but it shakes "as on potholes" - wanted a smooth rubbery up-and-down rocking.

## little-kpi-optimization-with-magnifying-glass-and-gears · judge: fail · user: ok
Why: approved by a reviewer; the judge failed it for the handle turning apart from the lens.

## little-using-artificial-intelligence-in-computer-work · judge: fail · user: ok
Why: a reviewer said "ok"; the judge failed it for a thin line under the lifted robot arm.

## rough-sketch-space-explorer-wearing-helmet-visor-and-backpack-under-crescent-moon · judge: fail · user: ok
Why: approved by a reviewer; the judge failed it for a still body and head with only the arm waving.

## little-a-flying-gift-box-tied-to-balloons · judge: pass · user: not ok
Why: the user: balloons with a gift should float smoothly, but the bundle hopped (a jerk up and a spring back).

## little-man-waving-his-hand · judge: pass · user: not ok
Why: the user: almost ok, but he sways "a bit like a drunk" - the legs rotated and bobbed, so the whole figure tilted from the feet.

## little-man-walking · judge: fail · user: not ok
Why: the user: "walks like a cripple" - one rigid leg was jerked up high while the other scissored, an uneven limping step. Note: in Little the colour fill is drawn offset from the outline on purpose; a fill sticking past the sleeve outline as in the SVG is the style, not a defect.

## little-lettering-contact-us-hand-holding-text · judge: pass · user: not ok
Why: the user: "too jerky" - the hand jerked the card and the letters bounced one by one; a card is one rigid object, a small turn of it in the hand was enough.

## ballpoint-pen-witch-walking-happily-with-broomstick-and-playful-black-cat-companion · judge: fail · user: ok
Why: known judge noise (the old and the new judge fail it alike, 2 runs each): rigid straight legs with no knee bend, a small body bob, a still cat tail and head, "no_tears" at the boots. The user approved the scene, so these items are the judge being stricter than the user, not a defect to fix; the hard rejects (direction, anatomy, intact) pass.

## ballpoint-pen-loading-progress-bar-circle-with-running-character-indicating-waiting-time · judge: fail · user: ok
Why: known judge noise (the old and the new judge fail it alike, 2 runs each): the runner flips between two poses without a run cycle, a faint gap at the waistband, a double spike when a plate changes state. The user approved the scene; the hard rejects pass.

## rough-sketch-hiker-walking-with-backpack-and-trekking-poles-among-pine-trees · judge: pass · user: ok
Why: a step-and-close cycle (the same foot leads, the feet never pass, no knee bend) is a weak stride, not a walk backwards: it passes the hard rejects and the user approved it. One judge run took it for `direction: false` and the rule now asks for positive evidence of the reversal.
