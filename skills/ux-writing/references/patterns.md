# Text patterns by surface

Before/after pairs for the surfaces where copy most often goes wrong. Every "after" follows the rules in SKILL.md: front-loaded, sentence case, no filler, no em dashes.

## Errors

Anatomy: what happened + what to do + what the user kept. Own the failure when it is yours.

| Before | After |
|---|---|
| "Oops! Something went wrong." | "We couldn't load your boards. It's on our side. Refresh in a minute; nothing was lost." |
| "Payment error." | "Your card wasn't charged. The payment didn't go through: check the card number or try another card." |
| "Invalid input." | "Use only letters and numbers in the project name." |
| "Export failed. Error 500." | "Export broke on our server. Your file is safe. Try again; if it repeats, write to support." |

Rules of thumb: the user's data survives by default, say so. Error codes go at the end in parentheses, if anywhere. No exclamation marks in errors.

## Empty states

Anatomy: what this space is for + the first action. Never a destructive imperative, never a lonely "No data".

| Before | After |
|---|---|
| "No projects found." | "Projects you create will live here. Start with one from a template." |
| "Your trash is empty. Remove anything you don't want to keep." | "Deleted files stay here for 30 days before they're gone for good." |
| "Nothing to show." | "Invite a teammate to see their changes appear here." |

An empty state usually needs an illustration: fetch one through the Icons8 MCP in the project's single style, don't leave a gray box.

## Confirmations

Anatomy: the consequence in the title, the action in the button. Buttons readable without the title.

| Before | After |
|---|---|
| Title "Are you sure?" · buttons "Yes / No" | Title "Delete 3 files? This can't be undone." · buttons "Delete files / Keep files" |
| Title "Warning" · buttons "OK / Cancel" | Title "Leave without saving? Edits from the last 4 minutes will be lost." · buttons "Leave / Keep editing" |

Whether the dialog should exist at all is `ux-check`: on an undoable action it asks for undo instead, and then there is no dialog left to write. Write the ones that survive; do not file your own finding arguing for undo.

## Buttons and links

| Before | After |
|---|---|
| "Click here to learn more" | "How billing works" |
| "Submit" | "Send request" |
| "GET STARTED NOW!" | "Create account" |
| "Yes" (after "Cancel subscription?") | "Cancel subscription" |

If two buttons could both be "the main one", the copy has not decided what the screen is for: name the outcomes so one reads as the point and the other as the alternative. How many primary actions a view may carry is `ux-check`; how loud they look is `ui-polish`.

## Forms and placeholders

- Label text names the thing asked for, in the user's words: "Full name", not "Name (first, last)". Whether a real label exists, and where the error is shown, is `ux-check`; you write what both say.
- Placeholder shows format, not instruction: `name@company.com`, not "Enter your email address here".
- Validation messages follow error anatomy: what happened, what to do, what survived.
- The word marking an optional field is "Optional", never "(not required)" or an asterisk legend.

| Before | After |
|---|---|
| Placeholder "Enter your full name" as the only label | Label "Full name", placeholder empty |
| "This field is required." | "Add an email so we can send the receipt." |

## Notifications and toasts

- Past tense for done: "Saved", "Invite sent", "Board deleted".
- No "successfully": success is the message existing.
- Where a destructive action has an undo affordance (`ux-check` decides that), the toast names it in place: "Board deleted · Undo".
- Progress states name the work: "Exporting 12 icons..." rather than "Please wait...".

## Tooltips

- Tooltip text is extra help. If the screen only works when the tooltip is read, that is a `ux-check` finding about the screen, not a rewrite.
- One sentence, no period needed for fragments: "Duplicates the frame with its contents".
- Never restate the label ("Save" with tooltip "Saves the file" is noise; say what is non-obvious: "Saves a copy; the original stays shared").

## Onboarding

- Each step: one capability, phrased as the user's gain, with the concrete verb to try. "Drag any icon onto the canvas" beats "Welcome to a world of creativity".
- The skip label is plain and neutral: "Skip", never "No thanks, I don't like saving money". Guilt-trip copy is a dark pattern; whether skip is visible at all is `ux-check`.

## Localized products

- Every user-facing string goes through the catalog: a hardcoded string surfaces in the wrong language. Grep `aria-label`, `alt`, and `title` values too; they leak first.
- Links carry the locale: "Privacy" on an English page opens the English page.
- Check what every placeholder resolves to in real data: "Upload your {utility} bill" with `utility: "Serbia"` ships "Upload your Serbia bill".

## Multi-step flows

- All step titles share one voice and person: "Do you own the home?" and "Where is the roof?", never a mix of address forms.
- The result screen reuses the words of the questions: a user who answered about a "roof" should not read about a "site".
