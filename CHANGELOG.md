# Changelog

All notable changes to the **icons8** plugin are documented here.
Format: [Keep a Changelog](https://keepachangelog.com); versioning: [SemVer](https://semver.org).
The plugin version lives in four manifests that have to agree: `plugin.json`,
`.claude-plugin/plugin.json`, `.codex-plugin/plugin.json` and `.cursor-plugin/plugin.json`.

## [0.6.0] — 2026-10-08

When the project's icon pack has no icon for a concept, the agent now draws one in that pack's
style instead of borrowing it from another pack or putting an emoji in its place.

### Added

- **The `icon-generate` skill.** It runs after one filtered search and one reworded search come up
  empty, or when the user asks for an icon drawn in the Icons8 style. It downloads four or five
  icons of the locked pack as free PNG references, the nearest in meaning plus plain anchors such
  as home and user, and draws one SVG on the pack's canvas: the same stroke weight, padding,
  corners, level of detail and palette, `currentColor` only in a monochrome pack. Where
  `rsvg-convert` or ImageMagick is installed it renders the drawing next to the references and
  corrects it once. The drawing is written to `assets/icons/` and recorded in `icons8.json` with
  `"generated": true`, its file and its pack, and without an id. The report names every drawn
  icon and offers to swap it for the catalogue one once the pack has it. Brand logos, trademarks
  and characters from films, games and anime are refused, with where to get them instead.

### Changed

- **`icons8` hands a missing concept to `icon-generate`.** The skill and its vocabulary map used
  to end at "tell the user the concept is missing". They now send it to `icon-generate` and never
  to a second pack, and the hand-back says which icons in the lock were drawn rather than picked.

- **`asset-check` and `icons8-design` allow that one drawn icon.** Both forbade any drawn SVG.
  They still do, except for a concept the locked pack lacks, drawn by `icon-generate` and marked
  in the lock.

## [0.5.2] — 2026-10-05

A Cursor marketplace can now list the plugin, and Cursor installs it from there with its skills and
the Icons8 server.

### Added

- **A Cursor manifest.** `.cursor-plugin/plugin.json` names the plugin, its display name, version,
  author, license and keywords, and gives the listing the Icons8 logo. Cursor finds the nine
  skills in `skills/` and the Icons8 server in the two server files without extra configuration.

- **A Cursor marketplace.** `.cursor-plugin/marketplace.json` lists the plugin from the repository
  root, so a team can import this repository as a marketplace in Cursor.

- **Install steps for GitHub Copilot CLI.** The README shows how to add this repository as a
  marketplace in Copilot CLI and install the plugin from it. Copilot CLI reads the existing Claude
  marketplace file, so no new file was needed.

### Fixed

- **`measure.py` runs after a bare-skill install in Claude Code.** The `ouch` skill located the
  script through `${CLAUDE_PLUGIN_ROOT}`, which Claude Code fills in only for a plugin, so a bare
  skill could not run the command. The skill now uses `${CLAUDE_SKILL_DIR}`, which Claude Code fills
  in for a plugin and a bare skill alike. Cursor, Codex and GitHub Copilot fill in neither variable,
  and the skill now tells them to replace it with the folder that holds the skill instead of leaving
  the path to a guess. Windows uses the same path, so the separate PowerShell and cmd lines are
  gone.

## [0.5.1] — 2026-10-01

The plugin is ready for Anthropic's plugin directory. The Icons8 server is now declared with the
`http` type, the one that claude.ai chat and Cowork load, as well as Claude Code.

### Added

- **A listing for the Claude directory.** `.claude-plugin/plugin.json` carries a display name, the
  Icons8 logo as its icon, and links to the
  [privacy policy](https://intercom.help/icons8-7fb7577e8170/en/articles/7228039-privacy-policy),
  the [terms and conditions](https://icons8.com/terms-and-conditions), the
  [contact page](https://icons8.com/contact) for support and the README as documentation. Without
  the icon the directory would show the publisher's GitHub avatar.

- **The README says what the plugin connects to.** A new section lists every host the skills reach,
  what each request carries, what the skills write into a project, and what runs on the user's
  machine. The README also gains example prompts and a support section.

### Changed

- **`.mcp.json` is a regular file with `"type": "http"`.** Since 0.2.0 it was a symlink to
  `mcp.json`. The directory refuses a symlink where the plugin loader reads, and it accepts a remote
  server only as `http`, `sse` or `ws`. Chat and Cowork load only `http` and `sse`, so they skipped
  the server that Claude Code accepted under the `streamable-http` alias. `mcp.json` stays as it
  was, in the Agent Plugins v1 format that Codex and v1 clients read. The server is now declared in
  two files, one per format, and CI fails if the two URLs differ.

- **The Claude manifest no longer names an MCP file.** Claude Code loads `.mcp.json` by itself and
  then loads whatever `mcpServers` names on top of it. Pointing `mcpServers` at `mcp.json` would
  replace the `http` entry with the `streamable-http` one again.

- **`measure.py` takes `--chrome PATH` instead of `$CHROME`.** The script now reads no
  environment variables. It looks for Chrome and Edge in their standard install locations, on
  Windows `C:\Program Files`, `C:\Program Files (x86)` and the user's `AppData\Local`, and then on
  `PATH`. A browser installed anywhere else is named with `--chrome`. The Claude directory holds
  for manual review every version of a plugin that reads environment variables and also sends data
  to a server, and that hold would stop automatic publishing.

## [0.5.0] — 2026-09-30

Icons that move, without an interface that flickers.

### Added

- **Animated icons in `icons8`.** The server now finds icons that move (`search_icons(animated=True)`)
  and serves them as Lottie, gif or apng (`get_icon_animation`). The skill's rule is that motion
  answers the user and never starts on its own: an icon plays one cycle on a click that changes
  state or on a mouse hover over a standalone element, half a cycle each way on a toggle, or for
  as long as a loading process runs, then stops on its rest frame. Navigation, lists, empty and error states stay
  static, and nothing loops on hover or click. Hover and click take Lottie only, because gif and
  apng loop forever by construction, cannot be recolored and exist in one size per pack; gif is
  also opaque white. `references/ANIMATION.md` carries the formats, a play-once snippet run in
  Chrome, CSS tinting that follows the icon's `color`, and two new lock fields (`motion`, `format`).
  The motion also has to say what the action says: positive actions take motion that fills or
  joins, negative ones motion that empties or breaks, checked by the Lottie's layer names and by
  looking at frames. Found in a test build where the only animated link in `m_outlined` breaks
  apart, which suits Unlink and contradicts Copy link. Toggles (like, bookmark) play half a cycle
  on and half off, reverse from wherever they are on a quick second click, and load in the right
  state. Keyboard focus never starts motion. The loader loops only between start and stop. Each
  Lottie is fetched once and saved to the file the lock names, so later screens do not pay for it
  again. The icon keeps the animator's timing; `motion` now says its durations do not apply to
  authored animation inside Icons8 assets.
- The main search loop passes `animated=False`, so animated variants stay out of static screens.

### Changed

- `icons8` no longer says the MCP has no animated icons.
- `motion` names an animated icon played once as the alternative to cross-fading paired variants.

## [0.4.1] — 2026-09-24

The `ouch` frontmatter was not valid YAML. A tool that parses frontmatter strictly skipped the skill.

### Fixed

- **`ouch` loads in every tool that reads skill frontmatter as strict YAML.** Since 0.4.0 its
  description contained `(video and Lottie): use it`. A colon followed by a space is not allowed in
  an unquoted YAML value. A strict parser rejects the frontmatter, and the tool drops the skill
  without an error in the agent. One confirmed case is the `skills` installer from npm: it printed `YAML parse error`
  and listed eight skills instead of nine. Claude Code reads frontmatter less strictly and still
  showed the skill. The sentence now ends with a full stop, and the description text is otherwise
  the same. CI now rejects `: ` and ` #` in an unquoted `name` or `description`, so the same mistake
  fails the build.

## [0.4.0] — 2026-09-22

The plugin stops at fetching assets and starts checking what the agent did with them: seven new
skills. Plus Ouch illustrations that move, and one lock file for the whole project instead of two.

### Added

- **A design pass over the finished screen, seven skills.** `asset-check` runs on its own once a UI
  is built or changed and answers four mechanical questions: is an emoji standing in for an icon, is
  there a section that should carry a picture and carries none, is an image URL dead, does an icon
  import name still exist in the library. That last check works on projects that use no Icons8 asset
  at all.

  Five more go deeper, one territory each: `ux-check` (behaviour, the six states, flows, and the
  accessibility floor of semantics, keyboard reach, labels and alt text), `ux-writing` (every string
  a user reads), `ui-polish` (alignment, radii, icons, contrast, focus and state styling), `motion`
  (whether a thing should animate at all, then every timing value) and `design-tokens` (bootstrap a
  token system, then catch drift in counts rather than in adjectives). `icons8-design` is the front
  door that routes a request to the one that owns it.

  Two properties keep them from becoming noise. Every rule that two skills could raise has exactly
  one named owner, so one defect yields one finding. And when several run on the same screen the
  reports merge into a single table with a single verdict, instead of five stacked lists nobody
  reads. Where a finding is about an icon or an illustration, the fix arrives already in place,
  taken from the catalogue.

  `icons8` and `ouch` do not reference any of this: asking for an icon stays a one-skill job.

- **Animated illustrations in `ouch`** — the skill now handles artwork that has motion, not just
  stills: when a slot earns movement it finds the animated versions, ships the formats in the order
  that actually plays (the `mp4-hevc` source goes first, because Safari answers "probably" to webm
  too, takes whichever it sees first and then cannot show the transparency), and falls back to the
  still when motion is not wanted. The preview links that come back from search are watermarked and
  368 px wide; they are for choosing, never for shipping. The rules live in
  `skills/ouch/references/ANIMATION.md`, with the budget, the playback and the layout math.

### Changed

- **One lock file per project.** `icons8.json` now holds everything the next screen needs to match
  this one: the icon pack, the sizes the project actually uses, the illustration style with its
  slots, and the names of the CSS variables assets should be wired to. Illustrations used to live in
  a separate `ouch.json`, which meant two files, two sources of truth and an agent that read one and
  forgot the other.

  Nothing breaks. A lock in the old shape is read as before, a separate `ouch.json` is picked up and
  folded in on the next write, and neither file is deleted: the skills say the old one is superseded
  and leave it on disk for you to remove.

- **Third-party notices.** Parts of two design skills are derived from MIT-licensed material and
  stay under their authors' copyright. `THIRD_PARTY_NOTICES.md` carries the full permission notices
  (Emil Kowalski, Jakub Krehel) and the links that the adapted CC BY 4.0 and Open Government Licence
  sources require. The repository itself stays Apache-2.0.

- **`icons8` says what to do when nobody is watching.** Two steps assumed a human at the other end:
  opening the contact sheet, and waiting for a prototype to be approved before fetching SVG. In a
  subagent or a batch run there is nobody to open the sheet for and nobody to approve anything, so
  the skill now reads the sheet itself and names the picks it was unsure about, and treats "approved"
  as "the set that survived to the end of the layout" instead of shipping PNG where the project wants
  vectors.

## Earlier releases

Release notes for 0.1.0 to 0.3.0 are on
[GitHub Releases](https://github.com/icons8/agent-skills/releases).
