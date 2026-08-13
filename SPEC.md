# Sanctum Furni Pack — Pack-Opening Experience Spec

A complete, self-contained spec for reproducing the Sanctum TCG pack-opening flow
(Pokémon TCG Pocket-style). A working reference implementation exists as a single
HTML file — treat it as the source of truth for feel and timing:

- Live demo: https://sanctum-pack-opening.vercel.app
- Source: https://github.com/shizudio/sanctum-pack-opening (single `index.html`, all assets embedded as data URIs)

Everything below was tuned against that build. Port the numbers, not approximations.

---

## 1. Flow overview

Four screens, in order:

1. **Pack screen** — sealed foil pack floats center. User swipes horizontally across
   the top of the pack to "cut" it open.
2. **Reveal screen** — 5 cards appear face-up as a 3D stack. Swipe up (or tap) throws
   the top card away and reveals the next. Best card is always last.
3. **Legendary celebration** — only if a Legendary is revealed: gold flash + sparkles
   + banner.
4. **"Your pull" screen** — the 5 cards in a fan-style carousel. Tap a card to open a
   full-size inspector (tilt with pointer/gyro, tap to flip to card back). Buttons:
   "📸 Save my pull" (share-image composer) and "Open another pack".

Stage background: pure white `#FFFFFF` (matches sanctum.so). End-screen and modal
buttons stack vertically, full width (`min(86vw, 320px)`), pill radius. Primary
buttons are brand blue `#30AAFF` with white 800-weight text (active `#1E96EB`);
secondary buttons white with 1.5px `rgba(0,0,0,.14)` border and black text.
Previously `#e9eef9`. No gradients or decoration — the pack and
cards carry the detail. Text on the background is **black** (18:1 contrast); white
text is reserved for dark surfaces like the inspector backdrop and the pack.
(Brand blue `#30AAFF` was tried and reverted — if reintroduced, note white text on
it fails WCAG at 2.5:1; black passes at 8.3:1.) Dots black; buttons white with black text
and a 3px black `:focus-visible` outline. Celebration pill text darkened for AA:
legendary `#6b4a00`, epic `#5b21b6`. Rarity tag has `role="status" aria-live="polite"`;
progress dots are `aria-hidden`. The anticipation veil is a radial bloom
(white core, scale 1.12→1 over 300ms with `cubic-bezier(.3,0,.6,1)`, out 650ms) —
never a flat opacity pop — and the dismissal hides under it at +260ms.

---

## 2. Assets

| Asset | Source | Prep |
|---|---|---|
| Pack front | `Packaging_final.png` (transparent bg) | crop to alpha bbox, ~640px wide, WebP q82. **Un-premultiply semi-transparent edge pixels** (source rendered on black; skipping this leaves a gray fringe) and zero alpha < 24. |
| Card fronts | v4 set, 100 cards, PDFs at 1393×1953 with bleed | see cutting rule below |
| Card back | `Back design.png` 646×908 | resize 600w, JPEG q84 |

### Card cutting rule (important)

The card designs have a crest ornament that pokes **above** the card outline. Never
cut at the outline — it decapitates the crest. Instead:

1. Detect design bounds: flood from corners; content = pixels differing from the corner
   bleed color (Σ|Δrgb| > 30). Bbox of content = outline + protruding crest.
2. Pad the bbox by **3% of its width** on all sides (slim frame of the bleed color
   remains — it reads as a rarity-colored border and is intentional).
3. Normalize every card to aspect ratio **0.7177** (v2 set) by growing the crop into the bleed,
   centered.
4. Export 600px wide, JPEG q80 (~45–55KB each).

Filename convention `Name - Rarity PNG.pdf` → parse name + rarity from it.

---

## 3. Pack screen

- Pack element: width `min(76vw, 320px, (100dvh − 150px) × 0.629)`, aspect = pack image.
- Idle animation: bob ±10px translate, ±1.2° rotate, 3.2s ease-in-out loop.
- Shadow: **never** a drop-shadow on the pack image (see Gotchas). Use a ground
  ellipse under the pack: blurred 7px, `rgba(20,25,60,.30)` radial, ~82% width.

### Tear gesture

- The pack is two stacked copies of the same image: top piece `clip-path inset(0 0 88% 0)`,
  bottom `inset(12% 0 0 0)`. Tear line at **12%** height.
- `pointerdown` on pack starts the tear; horizontal drag distance ÷ (0.7 × pack width)
  = progress 0..1 (clamped). Release below 1 springs back to 0.
- Progress drives (CSS var `--tear`): a glowing white cut line growing left→right at
  the 12% line, a spark dot at its tip, and the top strip shifting
  `translateX(progress × 10px) rotate(progress × 3°)`.
- **Gyro permission request must be called inside this pointerdown** (iOS gesture rule).

### Open sequence (progress reaches 1)

| t | event |
|---|---|
| 0 | top strip flies off (`translate(70%, −90%) rotate(28°)`, 0.5s), full-screen white flash pops, haptic 30ms |
| 0 → 0.6s | **white core** flares first at the cut (radial ellipse, blur 4px, opacity 1 by 14%), **rainbow rays** bloom behind it from 22% (pastel conic fan: hues 345/45/95/185/230/290 at ~80% lightness, blur 12px, elliptical shape — **no CSS masks**, see Gotchas). Both fade to 0 by 0.6s |
| 0.62s | pack body drops (`translateY(80%) scale(.92)`, 0.55s) — burst is already gone |
| 1.25s | reveal screen; stack rises in (staggered 60ms, spring `cubic-bezier(.3,.7,.3,1.15)`) |

Rays must appear **only after** the tear completes — nothing leaks during the swipe.

---

## 4. Random pull

- Pool: all 100 cards (32 C / 26 U / 22 R / 12 E / 8 L). No duplicates within a pack.
- Slots: `[Common, Common, Uncommon, U60%/R40%, R50%/E32%/L18%]`.
- Sort ascending by rarity so the best card is revealed last.

Rarity config:

| Rarity | holo | burst color |
|---|---|---|
| Common / Uncommon | 0 | — |
| Rare | 0 | `rgba(140,190,255,.85)` (blue) |
| Epic | 0.9 | `rgba(190,140,255,.9)` (purple) |
| Legendary | 1.0 | `rgba(255,210,110,.95)` (gold) |

Holo is **exclusive to Epic + Legendary**. Everyone gets the glare (tilt feedback).

---

## 5. Reveal stack (3D)

- Table: width `min(78vw, 320px, (100dvh − 190px) × 0.695)`, aspect 0.695,
  `perspective: 650px`.
- **The whole pile tilts as one object**: a `.stack` wrapper with
  `transform-style: preserve-3d` gets `rotateX/rotateY`; each card slot sits at
  `translateY(i × −5px) translateZ(i × −9px)` so tilting reveals the layered edges
  of the remaining cards from the side. Re-seat depths after each card leaves.
- Tilt: max **±24°**, driven by pointer position over the table (desktop) or gyroscope
  (mobile). Smoothed via lerp factor 0.22 per frame in a rAF loop.
- Gyro: capture **relative zero at reveal** (never absolute orientation), divide deltas
  by 22 and clamp ±1; slowly re-center zero (`zero += (raw − zero) × 0.004` per event).
  Light highlight moves **opposite** the tilt (fixed overhead light illusion).
- Swipe up ≥70px throws the card (`translateY(−150%) rotate(6°)`, 0.38s); a plain tap
  (<6px movement) also advances. While dragging, the card follows the finger:
  `translateY(dy)` + `rotate(dy/40 × −1°)` (compute the degree value in JS — see Gotchas).
- Each reveal: rarity tag text (`RARITY · Name`), burst flash behind card for R/E/L,
  haptic 15ms (or pattern `[50,60,50,60,80]` for Legendary).

### Holo layer recipe (per card face, stacked over the art, all `pointer-events:none`)

Driven by CSS vars: `--holo` (rarity), `--px/--py` (highlight position %), `--d`
(pointer distance from center 0..1), `--rx/--ry` (tilt).

1. **idle-shine** (z2, `color-dodge`): diagonal 115° pastel band gradient
   (283/180/50/330 hues), `background-size 300%`, **no-repeat**, self-animating sweep
   85%→15% over 4.5s. Opacity `holo × 0.5`. Makes holo visible without interaction.
2. **shine** (z3, `color-dodge`): repeating 115° rainbow gradient (period 42%),
   `background-size 400%`, **no-repeat**, position = `--px/--py`.
   Opacity `holo × (0.28 + d×0.35)`. Filter `brightness(.55) contrast(1.5) saturate(1.1)`.
3. **sparkle** (z4, `overlay`): fine noise texture (SVG feTurbulence or glitter photo),
   tile 180px, position shifts with `--px/--py`. Opacity `holo × (0.15 + d×0.45)`.
4. **glare** (z5, `overlay`): radial white hotspot at `--px/--py`
   (`white .75 → .22 @25% → black .4 @90%`). Opacity `(0.25 + d×0.45) × (0.45 + holo×0.55)`
   — non-holo cards keep reduced glare as tilt feedback.

Card corners: radius 16px via container clip. iOS-style shadows everywhere:
`0 1px 4px rgba(0,0,0,.05), 0 12px 32px rgba(0,0,0,.13)`.

---

## 5b. Anticipation white-out (Epic + Legendary reveals)

When the NEXT card in the stack is Epic or Legendary, the reveal gets a rarity tell:

1. The veil fades in FIRST (150ms ease-in), and the current card's dismissal is
   **delayed 170ms so it happens hidden under the white** — the stack is face-up,
   so any other ordering leaks the next card's face early.
2. White hold: **Epic 400ms** (clean white) / **Legendary 850ms** with a breathing
   warm-gold radial pulse (`rgba(255,224,150,.55)`, scale 1→1.06, 1s loop) so the
   hold never reads as frozen.
3. Veil fades out (450ms) while the card fades in **already zoomed** — Epic 1.07,
   Legendary 1.14 — settling to 1.0 over 550ms (`cubic-bezier(.25,.6,.3,1)`).
4. The celebration (§6) + heavy haptic fire **on landing**, not during the white.
   A light 20ms haptic tick fires when the veil hits.

Commons/Rares keep instant reveals — the contrast is what makes the tell precious.
`prefers-reduced-motion`: skip the veil entirely (plain reveal).
QA hooks: `window.__rigLast = 'Legendary'` forces the next pull's last slot;
`window.__celebrate(rarity)` previews celebrations.

Mobile notes: the page needs `<meta name="viewport" content="width=device-width,
initial-scale=1, viewport-fit=cover">` and `overscroll-behavior: none`. iOS motion
permission silently auto-denies if ever declined — show an explicit "Enable tilt"
button on the reveal screen whenever no orientation events have arrived within
~1.2s on a coarse-pointer device; a denied re-request should point to
Settings > Safari. Size the inspector card in JS from `innerWidth/innerHeight`
with the ratio locked to 0.695 — CSS `min()`+`aspect-ratio`+`dvh` combos are
fragile on iOS Safari.

## 6. Celebrations (Epic + Legendary)

Overlay (z60, non-interactive), parametrized per rarity. Shared pieces: radial flash
tint at 50%/45% (1.6s fade), banner pill springing down at 13% height, particle burst
from card center (mix of glow dots and 8-point stars, random angle, y x0.8 biased
upward -50px, rotation +/-150 deg, staggered 0-450ms, 1.7s flight).

| | Epic | Legendary |
|---|---|---|
| Banner | "EPIC PULL!" | "LEGENDARY PULL!" |
| Pill | `#f8f0ff - #ecd9ff`, border `#c9a2ff`, text `#7c3aed` | `#fff8e2 - #ffe9a8`, border `#f4c95d`, text `#b8860b` |
| Flash tint | `rgba(190,140,255,.5)` | `rgba(255,214,110,.55)` |
| Sparks | 20, purples + white | 44, gold/white/pink/mint/blue/lilac |
| Spark distance | 90-290px | 90-390px |
| Rainbow bg | none | full-screen pastel conic wash (6 hues @ ~78% L, .5 alpha), rotates 55 deg over 2.8s, opacity 0 - .5 - 0 |
| Lifetime | 2.4s | 3.0s |
| Haptic | [35,50,35] | [50,60,50,60,80] |

## 7. "Your pull" fan carousel

- 5 absolutely-positioned cards, width `min(34vw, 168px)`, all at the same anchor
  point, fanned **by rotation only** around a deep pivot:
  `transform-origin: 50% 235%`, rotation `(i − 2) × 11°` (9° under 500px viewport).
  Do **not** add per-card translateX — the pivot arm does the spreading.
- Entrance: stagger 90ms, spring from center (`rotate(0) scale(.8)`) to fanned pose,
  `forwards` fill. Hover: inner card lifts `translateY(−14px) scale(1.05)`
  (transform on a **child** so it never fights the fan transform).
- Tap a card → **inspector**: dimmed blurred backdrop (`rgba(40,50,100,.30)` +
  `backdrop-filter: blur(6px)`), card at `min(82vw, 330px)`, perspective 700px.
  - Pointer moves anywhere on the overlay tilt the card (±24°); **clamp the
    normalized input to ±1** (see Gotchas).
  - Tap the card: flip `rotateY` +180° each tap (0.6s spring), back face = card-back
    asset with satin holo (`--holo: 0.4`), `backface-visibility: hidden` both faces.
  - Tap outside: close.

---

## 8. Share screenshot ("📸 Save my pull")

Canvas-composed 1080×1350 PNG (no screen capture, no libraries):

- Background `#e9eef9`; title "My Sanctum pull ✨" (`#5a6ece`, 700 64px, center, y150);
  best-card callout `RARITY · Name` (`#4f63b8`, 700 40px, y226).
- Fan: cards 320×460 r24, rotated `(i−2) × 11°` around pivot (540, 1560), card centers
  830px up the arm. This keeps every card fully inside the canvas — verify no crop.
  White rounded base + shadow (`rgba(20,30,70,.26)`, blur 30, offsetY 12) under each.
- Opened pack in **front**, rising from the bottom edge: draw the pack image with its
  top 12% cropped off (the torn strip), 520px wide, centered, top at y830 (bottom
  overflows the canvas). Shadow blur 40.
- `sanctum.so/app` in white 600 32px at y1308 (over the pack).
- Delivery: show a **preview overlay** (image + buttons) rather than auto-download:
  Share… (Web Share API w/ file, only if `canShare`), Download (`<a download>`), Close,
  plus "long-press / right-click to save" hint. The fresh button tap preserves the
  user-gesture requirement for iOS share, and the overlay works inside sandboxed
  iframes where silent downloads are blocked.

---

## 8b. Keep-your-collection bridge (web -> app)

End screen primary CTA "Keep this collection" opens a modal:
"Decorate your house" + "Download the Sanctum app to pull your first Furni Pack
and decorate your house in-app." with a primary "Download Sanctum App" button
(-> https://sanctum.so/app) and Close. No claim codes in the prototype -- the
production redeem/deep-link architecture (universal links, deferred deep linking,
claim codes reusing the physical cards' QR rail) remains the app team's roadmap.

## 8c. Post-celebration share modal (Epic + Legendary)

150ms after the celebration finishes, a share sheet modal appears over the reveal:
card thumbnail, "RARITY \u00b7 Name" title, subtitle ("A 1-in-12 pull. Show it off" for
Legendary), and three actions:
- **Post on X** \u2014 opens `https://twitter.com/intent/tweet?text=...&url=...`.
  Caption format: `I just pulled a LEGENDARY! <Card Name> from a @Sanctumapp
  Furni Pack \u2728  Try your luck:` (+ the URL appended by X). Web intents cannot
  attach images, so the shared URL is a **per-card share page**
  (`/s/<card-slug>.html`) whose Twitter Card meta points at a pregenerated
  1200\u00d7630 image of that exact card (`/share/<card-slug>.jpg`, white bg,
  rarity glow, "LEGENDARY PULL!" headline). The page instantly redirects
  human visitors to `/` (meta refresh + JS) while X's crawler reads the meta.
  Slug rule (must match in app + build): lowercase, non-alphanumerics \u2192 `-`,
  trimmed. 20 pages pregenerated (12 Epic + 8 Legendary).
- **Share image\u2026** \u2014 composes a single-card 1080\u00d71350 canvas (rarity-colored
  glow behind the card, title, footer), then the same preview-overlay delivery as
  \u00a78 (native share sheet on mobile \u2014 picking X there DOES attach the image \u2014
  download elsewhere).
- **Continue** \u2014 dismisses, flow resumes.

---

## 9. Gotchas (bugs we actually hit — do not repeat)

1. **Invalid CSS unit math kills the whole transform.** `calc(var(--drag) / 40 × −1deg)`
   is `px×deg` → the browser silently drops the entire transform (tilt appeared dead).
   Compute degree strings in JS into a separate var.
2. **Never attach a shadow to a clipped tear piece.** The clip slices the shadow in a
   straight line → hard rectangle artifact. Ground-ellipse shadow instead.
3. **Gradient sheets must never show their edges.** Oversize to 300–400%,
   `background-repeat: no-repeat`, and keep position within 0–100%. A diagonal
   gradient's tile boundary is a hard visible seam.
4. **Clamp pointer input** to the card range (±1) anywhere tilt is driven from a zone
   larger than the card — unclamped values slide the shine sheet off the card and its
   edge crosses the face as a vertical line.
5. **No CSS `mask-image` for decorative shapes** (rays, sheens). When the mask fails
   (some browsers/sandboxes), the raw rectangle shows. Build shapes from gradient alpha
   + `border-radius` instead. We removed the pack foil-sheen layer entirely for this.
6. **Additive light is invisible on light backgrounds.** `mix-blend-mode: screen`
   rays vanish on near-white; use normal alpha compositing for the burst.
7. **Chained `drop-shadow()` filters compound** (the second shadows the first's
   output) → gray band. One drop-shadow max, or none.
8. **Transparent PNGs rendered on black** need un-premultiplied edge colors before
   lossy WebP re-encode, or the fringe smears into a hard gray edge line.
9. **iOS share sheet requires a same-tick user gesture** — never call
   `navigator.share` from an async canvas callback; route through a button in a
   preview overlay.
10. `setPointerCapture` throws on synthetic pointers — wrap in try/catch.
11. `deviceorientation` on iOS needs `DeviceOrientationEvent.requestPermission()`
    called inside a user gesture (we use the tear's pointerdown).
12. `prefers-reduced-motion`: disable bob, idle shimmer, burst, and gyro; keep
    tap-to-advance and flip.
13. **Social crawlers cannot read huge pages.** X/Twitterbot times out on the
    multi-MB single-file app, so link cards silently fail even with correct meta.
    Serve crawlers a tiny meta-only page via user-agent rewrite (Vercel
    `vercel.json` rewrites: UA regex -> `/card.html`; humans -> `/app.html`).
    Note: Vercel serves a static `index.html` before rewrites run — exclude it
    with `.vercelignore` so the rewrite chain owns `/`. Deploy routine: copy the
    build to BOTH `index.html` (GitHub Pages) and `app.html` (Vercel).

---

## 10. Native port notes (SwiftUI / React Native)

- Blend modes: SwiftUI `.blendMode(.colorDodge/.overlay)` natively; RN needs
  `@shopify/react-native-skia` (plain RN views cannot color-dodge).
- Stack tilt = one rotation transform on the pile container with per-card Z offsets —
  same as the CSS structure, cheaper than five card transforms.
- Screenshot = render the fan+pack composition offscreen
  (`UIGraphicsImageRenderer` / Skia snapshot / RN `captureRef`) → system share sheet.
  Same layout constants as §8.
- Haptics: replace `navigator.vibrate` with UIImpactFeedbackGenerator
  (medium at flip/advance; heavy pattern on Legendary).
- Gyro: CoreMotion / react-native-sensors at ~60Hz, same relative-zero +
  slow-recenter + low-pass math as §5.
