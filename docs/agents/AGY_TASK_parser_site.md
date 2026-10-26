# AGY TASK: parser library website (static) + "write your own parser" guide

The user wants a website where people can **download, or copy and paste, parsers** for PayPing Lite. Build a first version as a **static site** in `site/` on your branch (`design/ux-v1`; run `git merge main` first). No backend and no build step that needs network at runtime: plain HTML/CSS/JS, or a tiny generator script that runs at build time.

1. **Library pages:** generated from `parser-library/parsers/*.json`. For each parser, show its name, which apps it covers (Android packages, iOS app names), its version and author, how many rules it has, and an example notification it handles (from `parser-library/fixtures*`; use the anonymised ones). Add **Copy JSON** and **Download .json** buttons. Mark the parsers built from real notifications as "Tested on real notifications"; the cimb/rhb/mypb/qrpaybiz ones are synthetic and should say "Untested — help us with real samples".
2. **Generator:** `site/build.mjs` (Node, no dependencies) reads `parser-library/` and writes `site/dist/`. It's committed with its output, so the user can host it anywhere: GitHub Pages, or a Caddy on bigga.
3. **Guide (en + ms):** "How to make PayPing understand your bank". Cover the in-app "Create parser from this notification" flow first, then the JSON format for advanced users: match / extract / named groups / direction / priority / currency, and the rules for safe regexes (no lookbehind, no nested repeats). Include worked examples taken from the real fixtures.
4. **Contribute:** how to send a new parser or real samples: a GitHub issue template in `.github/ISSUE_TEMPLATE/parser.md`, with a reminder to remove names and card numbers first.
5. **Visual style:** plain, readable and fast, matching the app (the brand green `#059669` sparingly, system fonts). No card side-borders, no gradients, no emoji icons.

**Done when:** committed and pushed, with a screenshot of the index and one parser page (`google-chrome --headless` or similar) in `site/screenshots/`. Reply with a summary.
