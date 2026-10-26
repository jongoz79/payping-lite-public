# AGY TASK: UX revision v2 (PLAN.md row 1c, revised)

Work in your worktree `/home/afo/dev/payping-lite-wt/ux` (branch `design/ux-v1`). First run `git merge main` to get the revised `PLAN.md`, then re-read **Platforms and capture**, **Parsers: user-owned data** and **UI (v1 screens)**. The product direction changed after your v1.

## User feedback on v1
1. **The visual style reads as AI-generated.** The specific complaint is the coloured side bars: the 3–5px coloured `border-left` accents on cards (`mockups.html` lines ~183, ~487, ~636). Drop them and the whole "AI dashboard" look that goes with them:
   - accent stripes
   - status colour on every card
   - gradients, glows and heavy shadows
   - emoji used as icons
   - a pill badge on everything
2. **No hard-coded banks.** The user picks apps manually from a list of the apps installed on their phone. Remove the bank presets, the bank brand palette (§4.3) and the bank colour chips. An app is shown with **its own launcher icon and label** from the phone.
3. **Parsers belong to the user.** The app ships with no app-specific parsers. Users import them (paste JSON or open a `.json` file, later downloaded from our parser website), edit them, test them and share them. We help, but the user is responsible for their parsers.

## Visual direction
- **Native and plain:** Material 3 conventions on Android, standard iOS conventions on iOS. Neutral surfaces, one restrained accent colour, and hierarchy through type and spacing, not colour.
- **Money in or out** is shown with a sign and text (`+RM 12.50`, "Received"). Use colour on the **amount text only**, never as card decoration.
- **References that feel right:** `~/dev/payping-ref/actua` (Material 3, Compose) and `~/dev/payping-ref/actuali` (native SwiftUI), or a well-made banking or calculator app. They should look like a tool, not a landing page.
- **Icons:** use a real icon set (Material Symbols or SF Symbols), never emoji.

## Screens to add or change
1. **Installed-apps picker** (Android onboarding step and Settings → Apps):
   - a searchable list of installed apps with icon, label and a toggle
   - a "Selected" section on top
   - a hint that you can pick any app that shows payment notifications
2. **Parsers tab** (new, first-class; it replaces bank presets):
   - **List:** name, which apps it covers, enabled toggle, "last matched 2h ago", or a warning that it's never matched or is too slow.
   - **Empty state:** explain what a parser is in one sentence, then offer "Paste parser", "Open file" and "Create from a notification". Mention that ready-made parsers will be on our website.
   - **Import flow:** paste or file → validate → show readable errors (e.g. "Rule 2: the amount pattern has no `(?<amount>…)` group") → preview which recent captures it would match → save.
   - **Editor:** a simple form (name, apps, rules with match / direction / extract) **plus** a raw JSON tab. A live **test panel** shows recent captures from the selected apps, and what this parser makes of each one.
   - **"Create parser from this notification"**, from a History or Review row. The user taps or highlights the amount and the counterparty in the raw text, and we generate the regexes. Design this carefully: it's the main way non-technical users will get a parser.
   - **Export / share** as `.json`. **Re-parse history** after a change, with a confirmation screen.
   - **Generic parser:** an editor for the keyword lists and amount patterns, with "Reset to default".
3. **Review and History:** a row without a parser shows the raw text prominently, with "Create parser from this".
4. **Today:** keep the big glanceable total. Show listener health as plain text and an icon, not a coloured banner card.
5. **Onboarding (Android):** privacy → Notification Access → pick apps → "Add parsers (optional)" → TTS test. **(iOS):** unchanged in content; restyle only.

The user is still deciding on your three open questions (TTS ducking, review-queue cleanup, the restricted-settings tip). Leave each as an explicit option in the spec.

## Deliverables
- Update `design/UX_SPEC.md`: remove §4.3, and add the new screens and states.
- Redo the mockups (`mockups.html` and the SVGs) in the new visual style. The mockup viewer page itself can be plain.
- Commit on `design/ux-v1` and push.
- Reply with a short summary and any new questions.
