# Little mode acceptance (2026-11)

Screenshots at ~390px width: `docs/screenshots/little/`.

| Screen | File |
|--------|------|
| Home | `little-home-390.png` |
| Wonder empty | `little-wonder-empty-390.png` |
| Wonder answering | `little-wonder-answering-390.png` |
| School path | `little-school-path-390.png` |
| Treasure hunt | `little-treasure-hunt-390.png` |
| Parent reading level | `little-parent-settings-390.png` |

Wonder error (owl shrug + Retry) is implemented in `extra/page.tsx` for offline / 5xx; not captured in this pass.

## Checks

1. **30s start**: Home → School (path stop) or Wonder (mic/topic) — no reading required for primary action.
2. **One primary action** per Little screen (path next stop / mic / answer tiles).
3. **Text-hidden**: `html.wx-little-hide-text` keeps picture + voice targets; choices remain large taps.
4. **No tech loading** in Little: `VoiceLoadingBubble` off; SpeakButton `quiet`; silent device TTS fallback.
5. Parent **Reading level**: Not reading yet / Reading with help / Reads alone → `little` / `explorer` / `teen`.

## Tap counts (main flows)

| Flow | Before | After (Little) |
|------|--------|----------------|
| Home → start School work | Door → School → pick among 4 doors / radar banner (~3–5) | School door → glowing path stop (**2**) |
| Home → ask Wonder | Door → topic or mic (~2–3) | Wonder door → mic or topic (**2**) |
| Open Parent | Bottom nav Parent → PIN (**2**) | Hold corner 3s → PIN (**1 hold + PIN**) |
