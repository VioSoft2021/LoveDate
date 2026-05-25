# Landing Animation — Options for the Next Iteration

**Date:** 2026-05-25 (late session, after Master flagged dissatisfaction with the "Meeting" variant)

## Context

The LoginScreen hero currently shows "The Meeting" — two gold orbs converging at center, soft bloom, continuing past each other (commit `46b7d46`). Master's read: not happy with this variant.

This doc enumerates four concrete alternative directions so you can pick a vocabulary on next session. Each comes with a 1-paragraph vision, an implementation sketch, and trade-offs.

---

## Option 1 — **"Silent Drift"** (one orb, no climax)

**Vision:** A single gold orb drifts very slowly along an elliptical path across the entire viewport. ~30-second cycle. No convergence, no bloom, no meeting moment. Just one quiet point of light, moving like a candle flame on a windless night. The luxury IS the restraint — refusing to entertain.

**Brand argument:** Privé takes its time. One light, one path, no urgency. Aligns with the "*slow conversation, patient matchmaking*" promise. Closest to Hermès's website aesthetic (one element, one motion).

**Implementation sketch:**
```css
.silent-drift-orb {
  position: absolute;
  width: 14px; height: 14px;
  border-radius: 999px;
  background: radial-gradient(circle, #fff8e7, #f4dca8, #cfad61, transparent);
  box-shadow: 0 0 40px rgba(244,220,168,0.45), 0 0 100px rgba(244,220,168,0.18);
  animation: drift 32s linear infinite;
}
@keyframes drift {
  0%   { transform: translate(15vw, 30vh); }
  25%  { transform: translate(70vw, 45vh); }
  50%  { transform: translate(60vw, 70vh); }
  75%  { transform: translate(20vw, 60vh); }
  100% { transform: translate(15vw, 30vh); }
}
```

**Pros:** Maximum restraint. Brand-aligned. Cheap to render. Universal browser support.
**Cons:** Tells less of a "two people" story. Could feel sparse on very wide monitors.

---

## Option 2 — **"Calligraphy"** (a gold thread draws itself)

**Vision:** A single gold hairline curve draws itself across the void over ~8 seconds, like a fountain pen writing a signature. Holds for 4 seconds while the ink "dries". Slowly fades. After a 2-second pause, redraws in a different direction. The motion is a *gesture* — handwritten, deliberate.

**Brand argument:** Privé is editorial. A handwritten signature is the most luxurious mark a brand can make. Reads as: "*we sign every match by hand*". Very Loro Piana / Aesop.

**Implementation sketch:**
```jsx
<svg className="calligraphy" viewBox="0 0 1200 800">
  <path
    d="M 100 600 Q 400 200, 800 400 T 1100 250"
    stroke="url(#gold)" strokeWidth="1.5" fill="none"
    strokeLinecap="round"
  />
</svg>
```
```css
.calligraphy path {
  stroke-dasharray: 1600;
  stroke-dashoffset: 1600;
  animation: write 14s ease-in-out infinite;
}
@keyframes write {
  0%   { stroke-dashoffset: 1600; opacity: 1; }
  55%  { stroke-dashoffset: 0;    opacity: 1; }   /* finished writing */
  85%  { stroke-dashoffset: 0;    opacity: 0.4; } /* drying */
  100% { stroke-dashoffset: 0;    opacity: 0; }   /* fades to silence */
}
```
For path variety, swap the `d` attribute on each cycle (would need a tiny JS effect, or 3-4 CSS classes randomly applied).

**Pros:** Most editorial. Most "hand-crafted brand". Unique — nobody else in dating does this.
**Cons:** SVG stroke-dasharray on long paths can stutter on slow phones. Repeated SAME path across cycles might bore. Path variety needs JS.

---

## Option 3 — **"Constellation"** (5–7 stars, ambient drift)

**Vision:** 5–7 tiny gold points scattered across the void, each drifting very slowly along its own micro-orbit (radius ~40–80px). No convergence. No climax. Just a starfield that breathes. Each star's brightness pulses on its own cycle (between 30% and 100%) so the composition feels alive without being busy.

**Brand argument:** Suggests "the few", the curated. Each point is a different member of the rare community. Like a luxury watchmaker's celestial complication.

**Implementation sketch:**
```jsx
<div className="constellation">
  {[1,2,3,4,5,6].map(i => (
    <div key={i} className={`star star-${i}`} />
  ))}
</div>
```
```css
.star {
  position: absolute;
  width: 4px; height: 4px;
  border-radius: 999px;
  background: radial-gradient(circle, #f4dca8, #cfad61, transparent);
  box-shadow: 0 0 12px rgba(244,220,168,0.6);
}
.star-1 { top: 22vh; left: 38vw; animation: orbit-1 18s ease-in-out infinite, pulse-1 6s ease-in-out infinite; }
.star-2 { top: 65vh; left: 28vw; animation: orbit-2 22s ease-in-out infinite, pulse-2 5s ease-in-out infinite; }
.star-3 { top: 40vh; left: 65vw; animation: orbit-3 26s ease-in-out infinite, pulse-3 7s ease-in-out infinite; }
/* ... */
@keyframes orbit-1 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(40px,-30px); } }
@keyframes pulse-1 { 0%,100% { opacity: 0.3; } 50% { opacity: 1; } }
```

**Pros:** Beautiful at any viewport size. Calm but lively. Universal browser support. Easy to scale up/down.
**Cons:** Could feel "techy" / sci-fi if the stars are too uniform. Needs careful spatial composition (random looking but not random).

---

## Option 4 — **"Empty Void"** (kill the animation entirely)

**Vision:** No centerpiece at all. The center is just dignified empty navy gradient. The typography on the left + the corner marks (Édition, language picker) carry the entire composition. The luxury is *what we refuse to put on the page*.

**Brand argument:** Hermès. Aesop. Loro Piana. None of them animate their landing page. The most expensive thing a brand can do is leave space alone. Master told me earlier "delicate luxury" — there's a chance no motion is the most luxurious answer.

**Implementation sketch:**
```jsx
// Delete the entire <div className="login-hero-meeting"> block.
// Keep only:
//   - .login-hero (the typography composition)
//   - .login-hero-edition (Édition · 2026 mark, top-left)
//   - .login-hero-footer (language picker, top-right)
```
And add a very slow drifting ambient gradient (already half-present):
```css
.login-shell--hero {
  background:
    radial-gradient(ellipse 55% 45% at var(--bloom-x, 15%) 25%, rgba(244,220,168,0.10) 0%, transparent 60%),
    radial-gradient(ellipse 50% 40% at var(--bloom-y, 85%) 75%, rgba(216,184,109,0.08) 0%, transparent 55%),
    linear-gradient(165deg, #060a1f 0%, #0c1030 45%, #0a0d28 100%);
  animation: ambient-shift 40s ease-in-out infinite alternate;
}
@keyframes ambient-shift {
  to { --bloom-x: 25%; --bloom-y: 75%; }
}
```

**Pros:** Most luxurious by negation. Zero animation perf cost. Brand-deepest interpretation of "editorial silence". Lets the typography breathe.
**Cons:** Risks looking incomplete / "broken" to people who expect motion. Some visitors may not realize the page has finished loading. Could read as bug, not choice.

---

## My read (just my opinion — you decide)

If I had to rank:

1. **Option 4 (Empty Void)** — strongest brand alignment, lowest risk of "this is wrong". Master's brand voice IS editorial silence (the FilterScreen journal proves this).
2. **Option 2 (Calligraphy)** — most unique, most "hand-crafted brand". Higher risk of stutter on phones but biggest impact if executed well.
3. **Option 1 (Silent Drift)** — quiet, brand-aligned, lower stakes.
4. **Option 3 (Constellation)** — most "alive" but risks feeling techy rather than editorial.

I would not recommend going back to "Meeting" without a real change in concept — the dissatisfaction signal is clear.

---

## Next step

When you're back, just say "let's do Option N" or sketch a different concept. I'll implement in 30–60 minutes.

If you want me to combine concepts (e.g., the Empty Void backdrop + a single Silent Drift orb), that works too. Hybrid options are easy.
