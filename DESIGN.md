---
name: YouTrend
description: A private night desk for hunting small YouTube channels that farm real views, dressed in the CutLab obsidian language.
colors:
  amber-signal: "#fbbf24"
  amber-hover: "#fcd34d"
  amber-press: "#f59e0b"
  amber-ink: "#1a1205"
  farm-jade: "#4fc1a8"
  jade-text: "#74d6bf"
  jade-pale: "#a3e8d6"
  seal-jade-light: "#5fd3b8"
  seal-jade-deep: "#2f9e86"
  seal-ink: "#04201a"
  age-purple: "#a855f7"
  purple-text: "#d8b4fe"
  info-sky: "#8ec2da"
  sky-mist: "#d6ebf3"
  sky-wash: "#14232b"
  positive-leaf: "#8fc699"
  amber-cream: "#fef3c7"
  amber-wash: "#451a03"
  crimson-error: "#cb465c"
  crimson-text: "#ee8b98"
  crimson-blush: "#fad6da"
  crimson-wash: "#290d13"
  jade-tint: "rgba(79, 193, 168, 0.15)"
  amber-tint: "rgba(251, 191, 36, 0.12)"
  sky-tint: "rgba(110, 171, 201, 0.12)"
  purple-tint: "rgba(168, 85, 247, 0.15)"
  neutral-tint: "rgba(255, 255, 255, 0.05)"
  obsidian-ground: "#0b0c10"
  obsidian-card: "rgba(20, 22, 32, 0.94)"
  card-solid: "#141620"
  card-hover: "#191c28"
  well: "#101219"
  cell-wash: "rgba(255, 255, 255, 0.045)"
  hairline: "rgba(255, 255, 255, 0.08)"
  hairline-strong: "rgba(255, 255, 255, 0.16)"
  text-white: "#ffffff"
  text-soft: "#f1f3f7"
  text-quiet: "#d5dae3"
  text-secondary: "#b4bccb"
  text-muted: "#9ba3b4"
  text-faint: "#808a9c"
  rule-slate: "#2e3240"
  rank-slate: "#22252f"
  glow-amber: "rgba(255, 160, 40, 0.16)"
  glow-purple: "rgba(168, 85, 247, 0.18)"
  glow-indigo: "rgba(79, 70, 229, 0.12)"
typography:
  display:
    fontFamily: "Space Grotesk, Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 700
    lineHeight: "36px"
    letterSpacing: "-0.025em"
  wordmark:
    fontFamily: "Space Grotesk, Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "21px"
    fontWeight: 700
    letterSpacing: "-0.06em"
  figure:
    fontFamily: "Space Grotesk, Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 700
    lineHeight: "32px"
    letterSpacing: "-0.025em"
    fontFeature: "tnum"
  seal-figure:
    fontFamily: "Space Grotesk, Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    letterSpacing: "-0.03em"
    fontFeature: "tnum"
  title:
    fontFamily: "Be Vietnam Pro, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.4
  section-title:
    fontFamily: "Be Vietnam Pro, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Be Vietnam Pro, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.55
  nav:
    fontFamily: "Be Vietnam Pro, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "13.5px"
    fontWeight: 500
  control:
    fontFamily: "Be Vietnam Pro, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "13px"
    fontWeight: 500
  label:
    fontFamily: "Be Vietnam Pro, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "12px"
    fontWeight: 500
  caption:
    fontFamily: "Be Vietnam Pro, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    fontFeature: "tnum"
rounded:
  sm: "6px"
  md: "8px"
  cell: "10px"
  lg: "12px"
  seal: "14px"
  xl: "16px"
  pill: "9999px"
spacing:
  hair: "4px"
  tight: "6px"
  base: "8px"
  snug: "12px"
  card: "16px"
  column: "20px"
  page: "32px"
components:
  button-primary:
    backgroundColor: "{colors.amber-signal}"
    textColor: "{colors.amber-ink}"
    typography: "{typography.control}"
    rounded: "{rounded.lg}"
    padding: "0 16px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "{colors.amber-hover}"
    textColor: "{colors.amber-ink}"
  button-primary-active:
    backgroundColor: "{colors.amber-press}"
    textColor: "{colors.amber-ink}"
  button-secondary:
    backgroundColor: "rgba(255, 255, 255, 0.04)"
    textColor: "{colors.text-soft}"
    typography: "{typography.control}"
    rounded: "{rounded.lg}"
    padding: "0 14px"
    height: "36px"
  button-secondary-hover:
    backgroundColor: "rgba(255, 255, 255, 0.08)"
    textColor: "{colors.text-white}"
  button-pill:
    backgroundColor: "rgba(255, 255, 255, 0.04)"
    textColor: "{colors.text-quiet}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 10px"
    height: "28px"
  button-pill-on:
    backgroundColor: "{colors.jade-tint}"
    textColor: "{colors.jade-pale}"
    rounded: "{rounded.pill}"
  tab:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    typography: "{typography.nav}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "36px"
  tab-active:
    backgroundColor: "{colors.text-white}"
    textColor: "{colors.well}"
    rounded: "{rounded.pill}"
  tab-track:
    backgroundColor: "{colors.well}"
    rounded: "{rounded.pill}"
    padding: "4px"
  filter-pill:
    backgroundColor: "rgba(255, 255, 255, 0.03)"
    textColor: "{colors.text-quiet}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 8px"
    height: "32px"
  filter-pill-selected:
    backgroundColor: "{colors.text-white}"
    textColor: "{colors.well}"
    rounded: "{rounded.pill}"
  mode-card:
    backgroundColor: "rgba(255, 255, 255, 0.03)"
    textColor: "{colors.text-soft}"
    rounded: "{rounded.lg}"
    padding: "12px 14px"
  mode-card-selected:
    backgroundColor: "{colors.text-white}"
    textColor: "{colors.well}"
    rounded: "{rounded.lg}"
  nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.text-muted}"
    typography: "{typography.nav}"
    rounded: "{rounded.pill}"
    padding: "0 14px"
    height: "36px"
  nav-item-hover:
    textColor: "{colors.amber-hover}"
  nav-item-active:
    backgroundColor: "rgba(255, 255, 255, 0.10)"
    textColor: "{colors.text-white}"
    rounded: "{rounded.pill}"
  input:
    backgroundColor: "{colors.well}"
    textColor: "{colors.text-white}"
    typography: "{typography.control}"
    rounded: "{rounded.lg}"
    padding: "0 14px"
    height: "40px"
  card:
    backgroundColor: "{colors.obsidian-card}"
    textColor: "{colors.text-white}"
    rounded: "{rounded.xl}"
    padding: "{spacing.card}"
  stat-cell:
    backgroundColor: "{colors.cell-wash}"
    textColor: "{colors.text-white}"
    rounded: "{rounded.cell}"
    padding: "8px 10px"
  kpi-cell:
    backgroundColor: "{colors.obsidian-card}"
    textColor: "{colors.text-white}"
    typography: "{typography.figure}"
    padding: "12px 16px"
  chip-farm:
    backgroundColor: "{colors.jade-tint}"
    textColor: "{colors.jade-pale}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: "0 8px"
    height: "24px"
  chip-rise:
    backgroundColor: "{colors.amber-tint}"
    textColor: "{colors.amber-hover}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: "0 8px"
    height: "24px"
  chip-info:
    backgroundColor: "{colors.sky-tint}"
    textColor: "{colors.info-sky}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: "0 8px"
    height: "24px"
  chip-age:
    backgroundColor: "{colors.purple-tint}"
    textColor: "{colors.purple-text}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: "0 8px"
    height: "24px"
  chip-neutral:
    backgroundColor: "{colors.neutral-tint}"
    textColor: "{colors.text-secondary}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: "0 8px"
    height: "24px"
  seal:
    backgroundColor: "{colors.seal-jade-light}"
    textColor: "{colors.seal-ink}"
    typography: "{typography.seal-figure}"
    rounded: "{rounded.seal}"
    size: "54px"
  rank-tile-top:
    backgroundColor: "{colors.amber-signal}"
    textColor: "{colors.amber-wash}"
    rounded: "{rounded.sm}"
    height: "28px"
  rank-tile:
    backgroundColor: "{colors.rank-slate}"
    textColor: "{colors.text-quiet}"
    rounded: "{rounded.sm}"
    height: "28px"
  brand-mark:
    backgroundColor: "{colors.amber-signal}"
    textColor: "{colors.amber-ink}"
    size: "32px"
  quota-chip:
    backgroundColor: "{colors.jade-tint}"
    textColor: "{colors.jade-pale}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 14px"
    height: "36px"
  account-avatar:
    backgroundColor: "rgba(168, 85, 247, 0.20)"
    textColor: "{colors.purple-text}"
    rounded: "{rounded.pill}"
    size: "36px"
  note-info:
    backgroundColor: "{colors.sky-wash}"
    textColor: "{colors.sky-mist}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
  note-warning:
    backgroundColor: "{colors.amber-wash}"
    textColor: "{colors.amber-cream}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
  note-error:
    backgroundColor: "{colors.crimson-wash}"
    textColor: "{colors.crimson-blush}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
---

# Design System: YouTrend

## Overview

**Creative North Star: "The Obsidian Radar Desk"**

YouTrend is a private night desk for one creator who scans hundreds of small channels a session and decides, by eye, which ones are worth cloning. The system wears the user's own CutLab "obsidian" language: the radar 4K photograph sits blurred behind everything under a dark veil, with soft amber, purple and indigo light pooling at the top of the screen. On that ground float near-black cards with hairline borders and deep soft shadows, carrying pure white type. It reads like a quiet control room where the screens glow and the instruments are labelled.

Density is high but legible. Cards hold a lot (verdict chip, six stat cells, three thumbnails, three actions), so the system leans on strict roles rather than decoration: white means "selected", amber means "act" or "rising", jade means "this channel farms money", and every number is set in Space Grotesk with tabular figures so columns of figures can be scanned without reading. Colour is used generously, as the user asked ("not all one colour, mix colours"), but every hue has a job.

The user rejected flat grey dashboards, washed-out light text, cards that melt into the background, and vermilion or indigo as the working accent (they preferred pale jade and yellow). The radar photo and card-based lists are confirmed brand commitments and are not optional.

**Key Characteristics:**
- Blurred radar photograph + three radial glows + dark veil as a fixed ground on every screen.
- Near-black translucent cards (16px corners, 1px white-8% border, 0 12px 36px shadow) that clearly lift off the ground.
- Pure white text; muted cool grey for meta; nothing lighter than the muted step on dark cards.
- Pill controls for every choice; solid white pill = selected.
- Amber is the one action colour and the brand tile; jade is reserved for the farm verdict.
- Space Grotesk for numbers, scores, page titles and the wordmark; Be Vietnam Pro for everything else.

## Colors

A cool obsidian neutral ramp carrying five working hues, each mapped to a single meaning.

### Primary
- **Amber Signal** (amber-signal): the only call-to-action fill (Quét nhanh, Đăng nhập với Google, Phân tích N kênh), the YT brand tile, the focus ring, text caret and selection highlight, the top-3 rank tiles, and view÷sub chips at 2× or more. Lightens to **Amber Hover** on hover, deepens to **Amber Press** on press. Text on amber is always **Amber Ink**, never white.
- **Amber Hover** also doubles as the text colour for "rising" figures (kênh đang lên, View/giờ, So với ngách ≥ 1.5×) and the hover colour of inactive nav items.

### Secondary
- **Farm Jade** (farm-jade): the farm verdict. It fills the seal (as a gradient from **Seal Jade Light** to **Seal Jade Deep**, inked in **Seal Ink**), tints the "Farm tiền" chip, outlines farm channel and video cards at 60% strength, colours the healthy quota chip, the "Đã lưu" state and progress bars. **Jade Text** carries farm counts in the KPI strip; **Jade Pale** is chip and link-hover text.

### Tertiary
- **Age Purple** (age-purple): the "N ngày tuổi" channel-age tag, the account avatar and the "ngách" KPI. **Purple Text** is its readable tint on dark.
- **Info Sky** (info-sky): information. "video nổ" KPI, help links ("Xem hướng dẫn mục này"), the Help card border and step numbers, info notes (**Sky Wash** fill, **Sky Mist** text), channel-name hover.
- **Positive Leaf** (positive-leaf): good-result figures inside stat cells (Video đạt ≥ 50%, View trung vị ≥ sub, revenue estimate) and the AI verdict "Nên làm".
- **Amber Wash / Amber Cream**: the warning band (busy state, "N kênh chưa được so", missing API key) with an amber-600 border at 50%.
- **Crimson Error** (crimson-error): errors only. Error notes use **Crimson Wash** fill, Crimson Error border at 50%, **Crimson Blush** text; destructive text links and "Hết quota" use **Crimson Text**.

### Neutral
- **Obsidian Ground** (obsidian-ground): the page colour under the photo, browser theme colour.
- **Obsidian Card** (obsidian-card): every card, the KPI strip cells, the sticky sidebar. 94% opaque so the radar barely ghosts through. **Card Solid** is the same value fully opaque (select menus); **Card Hover** is the raised state.
- **Well** (well): inputs, selects, tab tracks and segmented controls, which sit darker than the card they live in. Also the ink colour on white selected pills.
- **Cell Wash** (cell-wash): the stat cells inside cards, a faint lift with a 5% white border.
- **Hairline / Hairline Strong**: 8% white is every card, input and divider border; 16% to 25% white is the hover border.
- **Text White** (text-white): titles, values, active labels. **Text Soft** for button text, **Text Quiet** for small pill text, **Text Secondary** for sub-lines, inactive tabs and channel meta, **Text Muted** for field labels, stat labels and inactive nav, **Text Faint** only for placeholders and tab counts.
- **Rule Slate / Rank Slate**: table header rules and dashed empty-state borders; the background of non-top rank tiles.

### Atmosphere
- **Glow Amber** (top-left, 440px), **Glow Purple** (top-right, 420px) and **Glow Indigo** (top-centre, 520 × 380px) are radial gradients fading to transparent at 70%, layered over the blurred photo, under a veil running from rgba(12,13,20,.55) at the top to rgba(12,13,20,.78) at the bottom.

### Named Rules
**The Every Hue Has A Job Rule.** Amber acts and rises, jade farms, purple marks age and identity, sky informs, leaf confirms, crimson errs. A hue never appears without its meaning, and a meaning never borrows another hue.

**The White Means Selected Rule.** The selected tab, filter pill, segmented option and mode card are solid white with Well-coloured ink. Amber never marks selection; it marks action.

**The Jade Seal Rule.** The jade seal appears only on a channel whose verdict is "Farm tiền" (or a video at 5× view÷sub or more). It is the payoff of the scan; spending it elsewhere cheapens it.

## Typography

**Display Font:** Space Grotesk (with Be Vietnam Pro, system-ui)
**Body Font:** Be Vietnam Pro (with system-ui, -apple-system, Segoe UI)

**Character:** Be Vietnam Pro handles Vietnamese diacritics cleanly at small sizes and carries all reading text; Space Grotesk's squared, technical figures turn every count and score into an instrument reading. The pairing keeps prose friendly and numbers authoritative.

### Hierarchy
- **Display** (700, 30px, 36px line, -0.025em): page titles only (Top Ngách, Khám phá, Kênh, Tạo tài nguyên, Thư viện, Cài đặt).
- **Wordmark** (700, 21px, -0.06em; 28px on login): "YouTrend" beside the amber YT tile.
- **Figure** (700, 26px, 32px line, tabular): KPI strip values, niche "điểm cơ hội", channel "điểm farm".
- **Seal Figure** (700, 20px, tabular): the score inside the seal.
- **Title** (600, 15px): card titles (niche name, channel name).
- **Section Title** (600, 14px): Section and Help headings; modal titles step up to 16px.
- **Body** (400, 14px, 1.55): base text. Explanatory notes cap at 110ch.
- **Nav** (500, 13.5px): header nav, tabs, video card titles.
- **Control** (500, 13px; 600 on primary): buttons, inputs, selects, notes.
- **Label** (500, 12px): field labels, stat labels, small pills, meta lines.
- **Caption** (600, 11px, tabular): chips, thumbnail overlays, stat-cell labels. This is the floor for reusable text.

### Named Rules
**The Numbers Speak Grotesk Rule.** Space Grotesk is for figures, scores, page titles and the wordmark, nothing else. Body copy, labels and buttons stay in Be Vietnam Pro.

**The Tabular Figure Rule.** Every number that can sit next to another number (views, subs, quota, counts in tabs, ratios) uses tabular figures so columns align across cards.

## Layout

A single centred container (max 1680px) with 16px side padding on mobile and 32px from 640px up; pages start 32px below a 64px sticky header and end with 96px of bottom space. Spacing follows a 4px base: 4 / 6 / 8 / 12 / 16 / 20 / 32px, with 6px and 8px between controls, 12px inside card stacks, 16px between cards and around card content, 20px between the sidebar and the main column.

Top Ngách, the priority surface, is a two-column workbench from 1024px: a 280px sticky filter card (top offset 80px, scrolls internally to the viewport height) and a fluid results column. Below 1024px the sidebar collapses behind a "Bộ lọc & quét" toggle and mode cards sit two-up. The results column stacks title, KPI strip, pill tabs, filter bar, a one-paragraph method note, then the card grid.

Card grids use auto-fill: niche and channel cards at a 380px minimum, video cards at 270px, all with 16px gaps. The KPI strip is 2 columns on mobile, 3 from 640px and 6 from 1280px, its cells separated by 1px hairline gaps inside one rounded container. Help steps lay out in up to four columns from 768px.

**The Cards Not Rows Rule.** Channel and video lists render as cards by default (a confirmed user commitment). A table view exists only behind the Thẻ / Bảng toggle.

## Elevation & Depth

Depth is layered and literal: a blurred, slightly scaled photograph (blur 8px, brightness 0.9) at the bottom, coloured light above it, a dark veil, then cards that float with a deep, soft shadow. Inside cards, depth reverses: stat cells and inputs are recessed (a faint white wash or the darker Well colour), never shadowed. The sticky header is translucent obsidian (86%) with a 14px backdrop blur and a hairline bottom border.

### Shadow Vocabulary
- **Card lift** (`box-shadow: 0 12px 36px rgba(0,0,0,.45)`): every card and the KPI strip.
- **Amber glow** (`box-shadow: 0 8px 22px -8px rgba(251,191,36,.6)`): primary buttons; the YT tile uses `0 6px 18px -6px rgba(251,191,36,.7)`.
- **Seal glow** (`box-shadow: 0 8px 22px -6px rgba(79,193,168,.55), inset 0 1px 0 rgba(255,255,255,.35)`): the farm seal.
- **Selected pill** (`box-shadow: 0 2px 8px -2px rgba(0,0,0,.6)`): the white active tab.
- **Active nav ring** (`box-shadow: inset 0 0 0 1px rgba(255,255,255,.12)`): the current header nav item.

### Named Rules
**The Lifted Obsidian Rule.** Every card visibly separates from the ground through its near-opaque fill, hairline border and card-lift shadow. A card that blends into the photo is a regression.

**The Two Glows Rule.** Coloured shadows belong only to the two signal objects: amber under the primary action and brand tile, jade under the seal. Everything else casts neutral black.

## Shapes

Three radii carry the form language. Choices are pills (full radius): nav items, tabs, tab tracks, filter pills, small actions, chips, the quota chip, the account avatar. Commands and fields are softly squared at 12px: buttons, inputs, selects, mode cards. Containers are 16px: cards, the KPI strip, the sidebar. Smaller pieces step down: stat cells 10px, notes and warning bands 8px, rank tiles and thumbnails 6px, the YT tile 9px, the seal 14px (8px when small). Borders are always 1px; dashed borders mark empty states only. Thumbnails are clipped to 16:9 with object-fit cover.

**The Pill For Choice Rule.** If it selects or filters, it is a pill; if it executes, it is a 12px rectangle; if it contains, it is a 16px card.

## Components

### Buttons
Confident and quiet: one bright command per area, everything else recessive.
- **Shape:** softly squared (12px), 36px tall; the sidebar scan button and empty-state call to action step up to 44px.
- **Primary:** Amber Signal fill, Amber Ink 13px semibold text, amber glow. One per panel: Quét nhanh, Đăng nhập với Google, Phân tích N kênh.
- **Hover / Focus:** primary lightens to Amber Hover and darkens to Amber Press on press; secondary lifts its fill from 4% to 8% white and its border from 10% to 20% white. All controls show a 2px Amber Signal focus outline at 3px offset with 10px corners. Disabled drops to 40% opacity.
- **Secondary:** 4% white fill, 10% white border, Text Soft label (Mở kênh, Theo dõi, Tương tự, Xem N kênh).
- **Small pill:** 28px (32px in Top Ngách) full-radius, Text Quiet label (Lưu, Tải CSV, Đã hiểu, ẩn đi). The "on" state (Đã lưu) turns jade-tinted.

### Chips
- **Style:** 24px pill, 15% (12% for amber and sky) hue fill, 30–35% hue border, pale hue text, 11px semibold.
- **State:** verdict chips map Farm tiền to jade, Đang lên to amber, Chưa phân tích to sky, and Ăn may / View thấp to neutral. Age ("N ngày tuổi") is purple; "Có mid-roll" is neutral. Thumbnail overlay chips are 6px rectangles on 85% obsidian, with view÷sub chips switching to solid amber at 2× and to solid pale jade at 5×.

### Cards / Containers
- **Corner Style:** 16px.
- **Background:** Obsidian Card; farm channel and video cards carry a 60% jade border instead of the hairline.
- **Shadow Strategy:** card lift (see Elevation).
- **Border:** 1px Hairline; hover raises to a mid slate border (cham-600, #4b5263) or brighter jade on farm cards. Shared video cards also rise 2px on hover.
- **Internal Padding:** 16px; video cards put the full-bleed 16:9 thumbnail on top and 12px padding below.
- **Stat cells:** 10px-cornered recessed cells in a 3- or 4-column grid, 11px muted label over 13px semibold value, the value tinted leaf, amber or jade only when the figure is good.

### Inputs / Fields
- **Style:** 40px tall (32px inside filter bars), Well fill, 10% white border, 12px corners, white 13px text, Text Faint placeholder. Labels sit above in 12px muted medium.
- **Focus:** border switches to Amber Signal; the caret is amber.
- **Error / Disabled:** errors surface as an error note beneath, not as a red field.

### Navigation
- **Header:** sticky 64px translucent obsidian bar with backdrop blur. Left: the amber YT tile and Space Grotesk wordmark. Centre: six pill links (Khám phá, Top Ngách, Kênh, Tạo tài nguyên, Thư viện, Cài đặt) in 13.5px medium Text Muted, hovering to amber, the current one on a 10% white pill with a 12% white inset ring. Right: the quota chip (jade when healthy, crimson when exhausted, dashed when no key) and a purple-tinted account circle.
- **Tabs:** a Well-coloured pill track with 4px padding; the active tab is a solid white pill with near-black semibold text and a small dark shadow; counts trail in 12px tabular faint text.
- **Mobile:** the nav scrolls horizontally without a scrollbar; the quota chip shortens to the number only.

### The Seal (signature)
A 54px jade tile (14px corners) with a 145° gradient from Seal Jade Light to Seal Jade Deep, a jade glow and a 1px inner highlight. It holds the farm score in 20px Space Grotesk and a tiny uppercase tracked "FARM" label beneath. It stamps in (scale 1.3 to 1, 0.45s, cubic-bezier(.16,1,.3,1)) when motion is allowed. The small variant (26px, 8px corners) carries the view÷sub multiplier on hot video thumbnails. The FARM micro-label currently renders below the 11px caption floor; treat that as legibility debt, not a size to reuse.

### KPI Strip
Six obsidian cells joined by 1px hairline gaps in one 16px-cornered, shadowed container. Each cell is a 26px Space Grotesk figure over a 12px muted label, one hue per figure: white (kênh nhỏ qua lọc), jade (kênh farm tiền), amber (kênh đang lên), sky (video nổ), purple (ngách), quiet grey (quốc gia).

### Notes and Help
Notes are 8px-cornered bands at 13px: sky for information, amber for busy and warning (with an amber spinner), crimson for errors with role="alert". The Help card is a regular card with a sky border, numbered steps in 20px sky tiles, and a glossary whose terms are amber.

## Do's and Don'ts

### Do:
- **Do** keep the blurred radar photograph (`bg_4k.jpg`, blur 8px, brightness 0.9) with its three glows and veil behind every screen, including login.
- **Do** put every card on Obsidian Card with a 1px Hairline border, 16px corners and the 0 12px 36px card-lift shadow.
- **Do** mark selection with a solid white pill and Well-coloured text; reserve Amber Signal for the one primary action per panel.
- **Do** give each KPI or highlighted figure its hue by meaning (jade farm, amber rising, sky videos, purple niches), and leave neutral figures white.
- **Do** set every number in tabular figures, and every score, KPI and page title in Space Grotesk 700.
- **Do** use tinted chips (12–15% fill, 30–35% border, pale text) for status, and solid fills only for the rank tile and thumbnail ratio chips.
- **Do** gate the stamp and rise animations behind prefers-reduced-motion: no-preference.
- **Do** draw icons as inline 2px-stroke SVG at 13–14px.

### Don't:
- **Don't** make all surfaces one colour or let the page collapse into a grey dashboard; the user asked for mixed colours with clear jobs.
- **Don't** use vermilion or indigo for controls, text or chips; indigo lives only as the 12% atmosphere glow, and legacy indigo and blue classes resolve to sky.
- **Don't** put white text on amber, or use amber to show a selected state.
- **Don't** set meta or label text lighter than Text Muted on a card; Text Faint is for placeholders and tab counts only.
- **Don't** let cards blend into the background with low-opacity fills or missing borders.
- **Don't** replace card lists with tables by default or remove the radar background; both are confirmed commitments.
- **Don't** spend the jade seal on anything other than a farm verdict or a 5×-plus video.
- **Don't** add uppercase letter-spaced kicker labels above headings, or emoji as icons; the only tracked uppercase text in the system is inside the seal.
