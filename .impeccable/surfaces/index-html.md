---
version: 1
slug: "index-html"
primary_target: "index.html"
related_targets: ["main.js","app.js","top_ngach_v3.js"]
---

# YouTrend app shell (all six sections)

Scope: whole admin app (index.html shell + shared components + six sections). Mode: Operate. Priority surface: Top Ngách.
Audience/job: one Vietnamese creator at a wide PC screen, long daily sessions, scanning hundreds of small channels and videos, then moving material into Claude projects.
Constraints: keep channel/video lists as cards; keep the radar 4K photo (`bg_4k.jpg`) behind everything; legacy embedded modules restyled through the palette remap and `.mono` overrides, not rewritten.
History: degraded roll chose Đông Hồ (seed below); the user then pinned colours (pale jade / yellow, then "not all green, mix colours, white tabs"), and finally pinned the design language of their own CutLab site (github.com/nambg015/CutLab, "VNG Obsidian" theme). The user pin beats the roll; the seal survives as the farm badge.

## Direction contract

THESIS: YouTrend wears the user's CutLab "obsidian" language: a blurred artwork ground with soft colour glows, near-black cards, white type, pill controls, and colour used generously but with jobs, refusing the flat grey dashboard default.

OWN-WORLD: Radar photo blurred 8px under a dark veil with amber, purple and indigo radial glows at the top. Cards rgba(20,22,32,.94), 1px rgba(255,255,255,.08) borders, 16px radius, deep soft shadows. Text pure white, muted #9ba3b4. Amber #fbbf24 = primary action and brand mark; white = active tab, selected filter, selected mode; jade = farm verdict, seal, positive figures; amber/yellow = top ranks, rising, warnings; purple = channel age tag, account; sky = info; crimson = error. Tinted chips (15% fill, 30% border). Body Be Vietnam Pro; numbers, scores, wordmark and page titles Space Grotesk.

STORY: The visitor scans, sees at a glance which channels are worth cloning (jade seal), opens or follows them in one click, and always knows what a number means.

FIRST VIEWPORT: Translucent blurred top bar: amber YT tile + Space Grotesk wordmark, six pill nav items (active = white-tinted pill), quota pill and account circle right. Top Ngách: left sticky scrollable filter card (mode cards, white selected pills, amber Quét nhanh), right: 30px Space Grotesk title, six-cell KPI strip with one hue per figure, white-pill tabs, filter bar, auto-fill card grid with jade seals on farm channels.

FORM: User-pinned direction (CutLab obsidian) over grounded candidate 6 of 7 (Đông Hồ) from seed:f1d005544c4bc723

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
