# Landing Page Redesign — Design Spec

## Context

The current VERA landing page in `docs/concepts/vera-premium-prototype.html` has strong individual pieces (hero, showcase carousel, features, stats) but feels assembled from components rather than art-directed as one cohesive experience. This redesign reworks the landing page into a unified, premium SaaS homepage that feels commercially credible for demos, stakeholders, and first impressions.

## Design Decisions

### Hero Composition: Copy-Led with Logo

- **Approach:** Option B — copy-led hero with product showcase pulled up as proof moment
- **Logo:** Smaller VERA logo (approx 56–64px) above the eyebrow pill, NOT in the hero centerpiece position. Logo stays visible as brand anchor but does not compete with headline
- **Remove:** The large 180px `landing-logo-img` from hero center
- **Headline:** Remains primary visual weight — `clamp(48px, 6vw, 68px)`, strong typographic hierarchy
- **CTA block:** Two buttons side-by-side (not stacked in a card container), cleaner presentation
- **Showcase carousel:** Pulled up directly below CTAs as the "proof" moment, visible above or near the fold

### Page Flow: Narrative Arc (Option C)

Section order, top to bottom:

```text
1. Hero         — Logo (small) + eyebrow + headline + description + CTAs + showcase carousel
2. Trust Band   — Social proof + stats (merged into one compact section)
3. How it Works — 3-step horizontal flow with animated icons
4. Features     — 3-card grid with section pill label
5. CTA Reprise  — Second conversion point with headline + CTA pair
6. Footer       — Minimal copyright line
```

### Trust Band (New Section)

Merge the current separate "Social Proof" and "Stats" sections into one compact trust band:

- Top: "Trusted by departments across Turkey" + university names (single line)
- Subtle divider
- Bottom: 4-stat strip in a single glass card (departments, evaluations, jurors, projects)
- Tighter vertical spacing — this is a confidence signal, not a hero-sized section

### CTA Reprise (New Section)

- Appears before the footer as a second conversion point
- Contained card with headline ("Ready to evaluate smarter?"), brief copy, and CTA pair
- Lighter treatment than the hero — reinforcement, not repetition

## Detailed Changes

### 1. Navigation

**Current:** Logo + "Sign In" button only.
**New:** Logo + anchor links ("Features", "How it works") + "Sign In" button. Anchor links are decorative in prototype (no scroll targets needed), but establish SaaS nav credibility.

### 2. Hero Section

**Structure change:**

```text
CURRENT:                          NEW:
┌──────────────────────┐          ┌──────────────────────┐
│    [BIG LOGO 180px]  │          │    [Logo ~60px]      │
│    [Acronym pill]    │          │    [Eyebrow pill]    │
│    [Headline]        │          │    [Headline]        │
│    [Description]     │          │    [Description]     │
│  ┌────────────────┐  │          │  [CTA1]    [CTA2]   │
│  │ [CTA card]     │  │          │    [Hint text]       │
│  │ [Primary btn]  │  │          │  ┌────────────────┐  │
│  │ [Secondary btn]│  │          │  │ [Showcase      │  │
│  └────────────────┘  │          │  │  carousel]     │  │
│    [Hint text]       │          │  └────────────────┘  │
│  ┌────────────────┐  │          │    [Carousel dots]   │
│  │ [Showcase      │  │          └──────────────────────┘
│  │  carousel]     │  │
│  └────────────────┘  │
└──────────────────────┘
```

**Key differences:**

- Logo shrinks from 180px image to ~60px mark (use existing favicon/logo asset at smaller size, or a styled text mark)
- CTA buttons become side-by-side (not stacked in a glass card container)
- The glass CTA card wrapper is removed — buttons sit directly in the flow
- Hero padding tightened: less vertical space between elements
- Showcase moves closer to CTAs with reduced margin

### 3. Showcase Carousel

- Structurally unchanged — same 6 slides, same JS carousel logic
- Visual refinement: slightly reduced max-width for tighter fit, ensure border/shadow consistency with new hero context
- Carousel footer (arrows, dots, counter) remains

### 4. Trust Band

**Replaces:** Separate social proof section + separate stats section.
**New structure:** Single section with:

- Social proof text (centered, single line)
- Thin gradient divider
- Stats in a compact glass card (4-column grid)

### 5. How it Works

- Structurally same as current — 3 steps with icons, numbers, arrows
- Keep existing scroll-triggered animations
- Tighten vertical padding slightly for better rhythm

### 6. Features

- Same 3-feature grid
- Add a section pill label above ("Built for evaluation day" or similar)
- Cards get subtle background + border treatment matching the overall glass system
- Hover states remain

### 7. CTA Reprise (New)

- Glass-bordered card, centered
- Headline: "Ready to evaluate smarter?"
- Subtext: "Start with a free demo. No sign-up required."
- Two buttons: primary "Try Demo" + secondary "Sign In"

### 8. Footer

- Simplified: remove the full footer with columns/links (prototype doesn't need it)
- Keep the single copyright line

## Typography and Spacing

- **No changes to font family** — Plus Jakarta Sans + JetBrains Mono stay
- **Hero padding:** Reduce from `96px 24px 64px` to approximately `72px 24px 48px`
- **Section gaps:** Consistent ~56–64px vertical padding per section
- **Element gaps within hero:** Tighter — logo-to-eyebrow 16px, eyebrow-to-headline 20px, headline-to-desc 16px, desc-to-CTAs 28px, CTAs-to-showcase 40px

## Responsive Behavior

- **Tablet (900px):** CTA buttons stack vertically, showcase scales down, trust band stats become 2x2 grid
- **Mobile (600px):** Full vertical stack, stats become single column with row layout, nav links hide (only Sign In remains), hero padding further reduced
- These follow existing responsive patterns — no new breakpoints needed

## Visual System

- All existing CSS variables, glass tokens, and dark mode system stay unchanged
- No new color tokens needed
- Gradient backgrounds, blur effects, and shadow system remain as-is
- The changes are compositional (layout, spacing, element order) not tonal

## What Does NOT Change

- Product showcase carousel (slides, JS, animations, visuals)
- How it Works step animations (scroll-triggered)
- Counter animations on stats
- Dark mode color system and tokens
- All non-landing-page screens (login, admin, jury, etc.)
- Any JavaScript functionality beyond minor DOM changes

## Files Modified

- `docs/concepts/vera-premium-prototype.html` — the only file touched

## Verification

1. Open the prototype in browser, dark mode should be default
2. Scroll through the full landing page — verify narrative flow
3. Check hero composition: small logo → eyebrow → headline → CTAs → showcase
4. Verify trust band: social proof + stats in one section
5. Verify CTA reprise appears before footer
6. Test carousel still functions (arrows, dots, autoplay, swipe)
7. Resize to tablet (900px) and mobile (600px) — verify responsive behavior
8. Click "Experience Demo" and "Explore Admin Panel" — verify navigation still works
