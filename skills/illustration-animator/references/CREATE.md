# Create

`${CLAUDE_SKILL_DIR}` is the folder that holds this SKILL.md and `references/`; engine commands, document paths and clients that leave the variable as is: "Paths" in `SKILL.md`.

Input: a style folder with `scenes/*.json`. The `no-stop` mode is passed on to verify.

1. **Setup.** Always run `node "${CLAUDE_SKILL_DIR}/engine/bin/setup.js"` first - safe to re-run, it installs nothing by itself. Exit code 0, "Setup done" - go on. Code 2 - it printed a plan and changed nothing: show the plan to the user and, only once they agree, run it again with `--yes`. Code 3 - no ffmpeg with the needed encoders: give the user the install command it printed and stop (they install ffmpeg themselves). Any other failure - tell the user the reason in one line and stop.
2. **Building in portions.** Repeat `node "${CLAUDE_SKILL_DIR}/engine/bin/batch.js" <style folder> --limit 20 --jobs 3` until `remaining` in the final line is 0. Each call is up to 20 scenes, 3 at a time, and fits in a few minutes (20 scenes × ~18 s / 3 threads ≈ 2 minutes; a Bash call lives no longer than 10 minutes, so don't increase the portions). The result of each call is one line per scene and the JSON `{"done":…,"failed":…,"error":…,"skipped":…,"remaining":…,"tried":…}`. `tried` - scenes with status failed/error that were already tried and haven't changed since: they aren't rebuilt and aren't counted in `remaining`; verify will deal with them. Don't fix scenes with status failed/error - that is verify's job. A re-run continues from where it stopped: finished and unchanged scenes are skipped, a scene that another run is building right now waits. If `remaining` doesn't decrease for two calls in a row - the scenes are stuck in another run: wait 10 minutes and repeat.
3. **Mac.** If this is macOS - `node "${CLAUDE_SKILL_DIR}/engine/bin/mp4.js" <style folder>/out` finishes the MP4 for scenes built on Windows. If `mp4.js` fails - tell the user in one line on which scene, and continue to verify.
4. **Then without stopping** - run the verify step on this style folder (in the same mode).

Ask nothing. Don't edit scenes: fixing is verify's job.

Default output is Lottie JSON and MP4. The deadline for an animation is 7 minutes.
