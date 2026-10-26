# AGY TASK: UX spec + mockups for PayPing Lite v1 (PLAN.md row 1c)

Read `PLAN.md` first, especially **Scope**, **Platforms and capture** and **UI (v1 screens)**.

## Context
PayPing Lite is used mostly by **small Malaysian merchants and families**: a hawker or shop owner who wants to *hear* "Received RM 12.50 from Ali" the moment a DuitNow, TNG or MAE payment lands, and later check what came in today. It's free, has no login, and nothing leaves the phone. It runs on Android now and iOS 27 later (through a Shortcuts automation the user sets up).

For what the old app looked like and did, see `~/dev/payping/app/(tabs)/*.tsx` and `~/dev/payping/components/`. This is a **fresh design**; we're not copying it.

## Deliverables
`design/UX_SPEC.md`, plus mockups in `design/`. Use whatever format you work best in (HTML/PNG/Figma export). They need to be reviewable without special tools.

1. **Information architecture:** the tab and stack structure for the 5 screens (Onboarding, Today/Live, History, Review, Settings).
2. **Per screen:** layout, every state (empty, loading, permission revoked, listener disconnected, no apps enabled, many rows), and the actions available.
3. **Onboarding flows**:
   - **Android:** privacy promise → Notification Access (deep link to system settings, with clear instructions because Android shows a scary warning) → pick apps (Malaysian bank presets first, then "Other apps we've seen") → TTS test → done.
   - **iOS:** privacy promise → "Add our shortcut" → step-by-step guide to create one automation per bank app in Shortcuts ("When I receive a notification from TNG", Run Immediately) → test → done. Assume the user isn't technical.
4. **Today/Live:** big, glanceable totals for money in today, plus the latest payment, readable from a distance (merchant use case). Show listener health clearly.
5. **Review queue:** quick confirm, edit or ignore for low-confidence rows.
6. **Visual direction:**
   - colour tokens for light and dark, type scale, spacing
   - money-in and money-out colours that work for colour-blind users
   - Malay and English text lengths
   - bank logos or colour chips
7. **Accessibility:** large text, TalkBack/VoiceOver labels for amounts, touch targets of at least 48dp.

## Constraints
- React Native and Expo Router. Stick to standard components; no web-only effects.
- No account, no paywall, no upsell anywhere.
- Copy in English, with Malay alternatives for the key strings (onboarding, totals, permission prompts).

## Out of scope
Writing app code (Kimi builds from your spec), and the backend or forwarding.

## Done when
`design/` is committed on branch `design/ux-v1` and pushed. Reply with a summary and any open questions for the user.
