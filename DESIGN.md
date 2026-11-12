---
name: design_it
description: Practise turning an unclear client problem into well-reasoned engineering decisions.
colors:
  page-white: "#ffffff"
  soft-panel: "#f6f5f4"
  ink: "#191919"
  ink-soft: "#37352f"
  muted-graphite: "#6b6b6b"
  hairline: "rgba(0, 0, 0, 0.09)"
  frame-border: "rgba(0, 0, 0, 0.12)"
  connector-grey: "#c9c9c7"
  action-blue: "#0075de"
  action-blue-deep: "#005bab"
  action-blue-wash: "#e6f2fd"
  marker-red: "#eb5757"
  marker-yellow: "#f2c94c"
  marker-blue: "#2f80ed"
  marker-green: "#27ae60"
  marker-purple: "#9b51e0"
  marker-orange: "#f2994a"
  tag-gray-bg: "#f1f1ef"
  tag-gray: "#6d6c6a"
  tag-yellow-bg: "#fbf3db"
  tag-yellow: "#8e6521"
  tag-green-bg: "#edf3ec"
  tag-green: "#3e7758"
  tag-blue-bg: "#e7f3f8"
  tag-blue: "#2e739a"
  tag-purple-bg: "#f6f3f9"
  tag-purple: "#865ea4"
  tag-red-bg: "#fdebec"
  tag-red: "#b8423e"
typography:
  display:
    fontFamily: "Inter, -apple-system, Segoe UI, system-ui, sans-serif"
    fontSize: "clamp(44px, 6vw, 80px)"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Inter, -apple-system, Segoe UI, system-ui, sans-serif"
    fontSize: "clamp(34px, 4.2vw, 54px)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Inter, -apple-system, Segoe UI, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 650
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Inter, -apple-system, Segoe UI, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.6
  lead:
    fontFamily: "Inter, -apple-system, Segoe UI, system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Inter, -apple-system, Segoe UI, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.3
  caption:
    fontFamily: "Inter, -apple-system, Segoe UI, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
  kicker:
    fontFamily: "Inter, -apple-system, Segoe UI, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
rounded:
  tag: "4px"
  button: "8px"
  card: "12px"
spacing:
  gutter: "40px"
  split-gap: "64px"
  section: "112px"
  header: "64px"
  container: "1200px"
components:
  button-primary:
    backgroundColor: "{colors.action-blue}"
    textColor: "{colors.page-white}"
    rounded: "{rounded.button}"
    padding: "10px 18px"
    height: "44px"
    typography: "{typography.label}"
  button-primary-hover:
    backgroundColor: "{colors.action-blue-deep}"
  button-secondary:
    backgroundColor: "{colors.action-blue-wash}"
    textColor: "{colors.action-blue-deep}"
    rounded: "{rounded.button}"
    padding: "10px 18px"
    height: "44px"
    typography: "{typography.label}"
  button-small:
    rounded: "{rounded.button}"
    padding: "6px 14px"
    height: "36px"
  status-tag:
    backgroundColor: "{colors.tag-red-bg}"
    textColor: "{colors.tag-red}"
    rounded: "{rounded.tag}"
    padding: "1px 8px"
  card:
    backgroundColor: "{colors.page-white}"
    rounded: "{rounded.card}"
    padding: "16px"
  soft-panel:
    backgroundColor: "{colors.soft-panel}"
    rounded: "{rounded.card}"
  window:
    backgroundColor: "{colors.page-white}"
    rounded: "{rounded.card}"
  feedback-card-blue:
    backgroundColor: "{colors.action-blue}"
    textColor: "{colors.page-white}"
    rounded: "{rounded.card}"
  feedback-card-yellow:
    backgroundColor: "{colors.marker-yellow}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
  feedback-card-purple:
    backgroundColor: "{colors.marker-purple}"
    textColor: "{colors.page-white}"
    rounded: "{rounded.card}"
  feedback-card-green:
    backgroundColor: "{colors.marker-green}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
---

# Design System: design_it

## Overview

**Creative North Star: "The Engineer's Sketchbook"**

design_it is a well-kept engineering notebook that other people can read. Pages are clean white. Ideas are drawn as black-outlined stickers filled with bold marker colour, and every piece of reasoning is joined to the next by a visible line: what the client said, the requirement it became, the decision behind it, the box it landed in on the diagram. The visual job is to make those connections legible at a glance.

The feel is crisp and playful. Hard outlines and confident colour carry a sticker-like wit, but the system is never cute and never corporate. Density is generous: big bold headlines, short copy, and diagrams that explain instead of paragraphs. Layout leans on Notion's marketing grammar: a white page, soft grey panels without borders, and one row of full-colour blocks for emphasis.

The look deliberately rejects the warm cream, peach and terracotta palette, brown-tinted shadows, serif display type and macOS window chrome that earlier iterations used. Those read as another product's identity.

This system is defined on the homepage (`src/pages/landing/`, scoped under `.lp`). It is the direction the whole product should move towards. The practice workspace still runs on the legacy MUI theme in `src/ui/theme.ts` (deep teal `#006f9a` on a blue-grey `#e6eef3` background); treat that as legacy and do not copy it into new surfaces.

**Key Characteristics:**
- White page, soft grey (`#f6f5f4`) panels, no section borders.
- Inter for everything; heavy, tightly tracked headlines.
- Black-outlined sticker icons with solid bold fills.
- One blue action colour; marker colours only for icons, tags and the full-colour feedback cards.
- Thin grey connectors that turn blue when traced and dashed red when something was dropped.
- Diagrams over prose: the product's reasoning chain is drawn, not described.

## Colors

A neutral white-and-graphite base with one decisive blue for action and a box of bold marker colours used sparingly.

### Primary
- **Action Blue** (`action-blue`): every primary button, the hot state of a traced connector, the first full-colour feedback card. **Action Blue Deep** is its hover and the text colour on light-blue washes and text links. **Action Blue Wash** is the secondary button background.

### Secondary
- **Marker Colours** (`marker-red`, `marker-yellow`, `marker-blue`, `marker-green`, `marker-purple`, `marker-orange`): fills inside sticker icons, the yellow sticky note and ambition disc, and the full-colour feedback cards. They are illustration colours, never text colours.

### Tertiary
- **Tag Pairs** (`tag-*-bg` with `tag-*`): Notion's pastel tag pairs for chips, status labels and soft tints. Every text colour is darkened from Notion's original so it passes AA (4.5:1 or better) on its own background. Red is reserved for problems: dropped facts, gaps, failing scenarios.

### Neutral
- **Page White** (`page-white`): page and card surface.
- **Soft Panel** (`soft-panel`): borderless grouping panels, the active step row, scene backdrops.
- **Ink** (`ink`): headlines, body on light surfaces, sticker outlines, text on yellow and green cards.
- **Ink Soft** (`ink-soft`): eyebrows and lead copy that should sit just below full ink.
- **Muted Graphite** (`muted-graphite`): supporting copy and captions (5.3:1 on white, 4.9:1 on the soft panel).
- **Hairline** and **Frame Border**: card and window edges, separators.
- **Connector Grey** (`connector-grey`): idle diagram lines.

### Named Rules
**The One Blue Rule.** Action Blue is the only colour that means "do something". Marker colours never appear on buttons or links.

**The Red Means Gap Rule.** Red (marker or tag) marks something heard but left out, dropped or failing. Never use it for decoration or emphasis.

**The Text Never Wears Marker Rule.** Marker fills are for shapes. Text on colour uses Ink or white, chosen for 4.5:1 contrast: Ink on yellow and green, white on blue and purple.

## Typography

**Display Font:** Inter (with -apple-system, Segoe UI, system-ui, sans-serif)
**Body Font:** Inter (same stack)

**Character:** One family, worked hard. Display weights (700–800) with tight negative tracking give the headlines Notion's punch; regular 400 body at 18px keeps reading easy. Inter is self-hosted as a latin-subset variable woff2 (`src/pages/landing/fonts/inter-latin-wght.woff2`, weights 400–800, `font-display: swap`).

### Hierarchy
- **Display** (800, clamp(44px, 6vw, 80px), 1.05): the hero headline only.
- **Headline** (700, clamp(34px, 4.2vw, 54px), 1.05): section headlines, balanced wrapping.
- **Title** (650, 20px, 1.3): card and step titles. Step titles in the How it works list run larger (21px/600).
- **Lead** (400, 19px, 1.6): the one-line intro under a headline, max 680px wide.
- **Body** (400, 18px, 1.6; 17px on mobile): paragraphs, max 680px wide.
- **Label** (600, 16px, 1.3): eyebrows, buttons, pane labels.
- **Caption** (400, 15px): supporting notes under figures.
- **Kicker** (600, 13px): small headings inside cards, such as "Opening brief".

### Named Rules
**The No Serif Rule.** Inter only. Serif display type reads as another product and was explicitly rejected.

**The Short Copy Rule.** A section gets a headline, at most one lead line, and a diagram. If it needs a second paragraph, draw it instead.

## Layout

A centred 1200px container with 40px gutters (16px on mobile) and generous 112px section padding. Sections alternate between two compositions: a centred intro over a full-width figure, and a two-column **split** (64px gap) with copy on one side and a diagram on the other. Splits flip sides from section to section (Example feedback is copy left, diagram right; Our ambition is diagram left, copy right) and stack with copy first below 1024px. The header is a 64px sticky white bar with a hairline.

Breakpoints are 1199px (the ambition ring falls back to a vertical stage list), 1023px (splits and the hero's four-pane row stack to two columns, diagram arrows hide) and 767px (single column, smaller type and gutters).

## Elevation & Depth

Mostly flat. Depth comes from hairline borders and the soft grey panel, with shadows kept faint and neutral, never tinted. Only the hero window gets a real lift, to read as an app floating on the page.

### Shadow Vocabulary
- **Rest** (`box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04)`): cards and panes at rest.
- **Raised** (`box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04), 0 6px 18px rgba(0, 0, 0, 0.05)`): hover and selected cards.
- **Window** (`box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04), 0 28px 72px rgba(0, 0, 0, 0.1)`): the hero desktop window only.

### Named Rules
**The Neutral Shadow Rule.** Shadows are pure black at low alpha. Brown or warm-tinted shadows are banned; they were the core of the rejected look.

**The Hard Shadow Exception.** Sticker-like objects (the sticky note) may use an offset hard shadow in Ink, like a printed sticker. Nothing else does.

## Shapes

Gently rounded rectangles throughout: 4px for tags, 8px for buttons (Notion's rounded rectangles, not pills), 12px for cards, panels and windows. Borders are 1px hairlines; selected states add a 1.5px Ink outline or a blue ring. Sticker icons are the one place for expressive form: hand-drawn-feeling shapes with a 2.25px Ink outline, round caps and joins, and solid marker fills.

## Components

### Buttons
- **Shape:** rounded rectangle (8px), 44px tall.
- **Primary:** Action Blue with white text, 600 weight, a trailing arrow that nudges 2px right on hover.
- **Hover / Focus:** background deepens to Action Blue Deep over 160ms; focus uses the global visible focus ring.
- **Secondary:** Action Blue Wash with Action Blue Deep text. Hover mixes in 18% blue.
- **Small:** 36px tall, for the header CTA.

### Chips
- **Style:** tag pairs (pastel background, darkened text), 4px radius, 14px/600.
- **State:** status chips name a state in words ("Dropped", "Heard, not addressed", "From Mei", "Your reasoning"); colour is never the only signal.

### Cards / Containers
- **Corner Style:** 12px.
- **Background:** Page White, or Soft Panel for grouping without a border.
- **Shadow Strategy:** Rest at idle, Raised on hover/selection (see Elevation).
- **Border:** 1px hairline on white cards; none on soft panels.
- **Internal Padding:** 16px in dense panes, more in standalone cards.

### Navigation
- **Style:** sticky 64px white bar, hairline bottom border. Wordmark in Inter 800. Links in Ink Soft, the small primary button on the right. Collapses to a menu button on mobile.

### Sticker Icons
The signature mark. Fourteen inline SVGs on a 32px grid (chat, document, balance scale, connected nodes, flag, stairs, heart, spark, phone, swap, chain, gauge, pencil, bulb). Each is a 2.25px Ink outline with `vector-effect: non-scaling-stroke` over solid marker fills, with no tile behind it. Sizes: 18px in dense rows, 26–32px on labels and lists, 56px on hero-scale steps. Plain line glyphs remain only for arrow, menu and close.

### Desktop Window
A plain frame for product shots: white body, 1px Frame Border, 12px radius, Window shadow, a 36px bar with three `#e0e0e0` dots and a centred muted title. No coloured traffic lights. Used once, for the hero diagram.

### Full-Colour Feedback Cards
A row of saturated blocks (blue, yellow, purple, green) in a 2×2 grid, each with a sticker, a big 800-weight number and a mini diagram drawn in the card's ink. Selected cards get a white gap and an Ink ring. These are the page's one moment of full colour.

### Trace Diagrams
Nodes are white cards with a hairline; connectors are thin Connector Grey curves. Hover or selection turns a chain Action Blue; a dropped link is a dashed red stub ending in a crossed circle; a selected node gets a 1.5px Ink outline. Every interactive node is a keyboard-reachable button with `aria-pressed`.

## Do's and Don'ts

### Do:
- **Do** use Inter for all text, with headlines at 700–800 and -0.035em tracking.
- **Do** keep pages white with `#f6f5f4` borderless panels for grouping.
- **Do** draw icons as black-outlined stickers (2.25px Ink outline, solid marker fill).
- **Do** reserve Action Blue (`#0075de`) for actions and traced connectors.
- **Do** mark gaps and failures in red with a text label, never colour alone.
- **Do** explain with a diagram before adding a second paragraph.
- **Do** honour `prefers-reduced-motion`: traces draw instantly, no travelling dots.

### Don't:
- **Don't** use warm cream, peach, terracotta or brown-tinted shadows.
- **Don't** use serif display type.
- **Don't** wrap product shots in macOS chrome with red, yellow and green traffic lights; use the plain desktop window.
- **Don't** use pill-shaped buttons; buttons are 8px rounded rectangles.
- **Don't** put marker colours on text or buttons.
- **Don't** show the contact email address as visible text; contact actions are mailto buttons only.
- **Don't** copy the legacy MUI workspace palette (`#006f9a`, `#e6eef3`) into new surfaces.
