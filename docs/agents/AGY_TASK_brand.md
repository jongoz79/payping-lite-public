# AGY TASK: app icon, splash, store graphics (needed for the first test builds)

Work in `/home/afo/dev/payping-lite-wt/ux` (branch `design/ux-v1`). Run `git merge main` first.

The app still ships Expo's default icon and splash. The old PayPing icon (`~/dev/payping/assets/icon.png`) has to go: it's an AI-generated raster with a **"$"** (Malaysia uses RM) and a paper plane (forwarding, which Lite doesn't have).

## Concept
- **What the app does:** it hears a payment and says it out loud.
- **A simple, flat, geometric mark** that still reads at 48px. For example, a speech or sound-wave shape combined with a ringgit cue ("RM", or a coin) — pick whatever is clearest.
- **Colours:** one strong colour on a plain background. It must work as an Android themed (monochrome) icon too.
- **Avoid:** gradients, glows, 3D, glossy effects, mascots, text smaller than the mark.
- Same spirit as the v2 UI: a tool, not a toy.

## Deliverables
Make **SVG sources** in `design/brand/`, and render PNGs with `rsvg-convert` (it's installed) into `assets/images/` in this worktree:

1. `icon.png`: 1024×1024 for iOS and the general icon. Opaque, no transparency, no rounded corners (iOS rounds it).
2. Android adaptive icon:
   - `android-icon-foreground.png` (1024, transparent, mark inside the 66% safe zone)
   - `android-icon-background.png` (1024, flat colour)
   - `android-icon-monochrome.png` (1024, white mark on transparent)
3. `splash-icon.png`: the mark alone at 512–1024 px, transparent.
4. `notification-icon.png`: 96×96, white silhouette on transparent, for Android status-bar notifications.
5. Update `app.json`:
   - `icon`, `android.adaptiveIcon` (including `backgroundColor`), the `expo-splash-screen` plugin's `backgroundColor`/`image`
   - `ios.icon` → `./assets/images/icon.png`, replacing the Expo `expo.icon` folder; delete that folder
   - remove the unused template images (`expo-*`, `react-logo*`, `tutorial-web`, `logo-glow`) **only if** nothing in `src/` imports them. Check with grep.
6. `design/brand/play-feature-graphic.png`: 1024×500 for the Play listing. Mark plus the words "PayPing Lite" and the tagline "Hear every payment. Nothing leaves your phone." No device frames.
7. `design/brand/README.md`: colours, usage and the rendering commands.

## Done when
Commit and push the PNGs and SVGs, then reply with a short summary. Claude will review them at 48px and 192px before merging.
