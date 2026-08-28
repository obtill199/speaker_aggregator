# The Sound Room — Design System

## Thesis

The Sound Room should feel like a carefully kept 1970s hi-fi catalog sitting on a repair bench: warm paper, walnut, brushed brass, amplifier-black controls, squared corners, crisp rules, and useful annotations. The working surface stays modern and readable; vintage cues come from audio hardware and print-catalog details rather than fake wear, novelty fonts, or an unusable retro-web recreation.

The layout and information hierarchy are adapted from the Airtable design-language reference. The square frames, catalog ribbons, serif body voice, and hard-edged labels are adapted from the Dell 1996 reference. The result is original to this product and is not presented as either company’s official design.

## Tokens

| Role | Value | Use |
|---|---|---|
| Paper | `#f2ead8` | Page canvas |
| Card | `#fffaf0` | Listing and data surfaces |
| Ink | `#201d18` | Primary type and hard borders |
| Walnut | `#65412c` | Navigation and structural accents |
| Brass | `#c3923e` | Primary actions and active controls |
| Forest | `#31533b` | Great deal and healthy state |
| Mint | `#9bb894` | Good deal |
| Mustard | `#d5aa58` | Average deal |
| Oxide | `#a6533b` | No-deal warning |
| Deep red | `#702f2b` | Bad deal and destructive state |
| Hairline | `#b7aa91` | Dividers and secondary borders |

## Typography

- Display: Georgia Bold, used sparingly for the product name and section titles.
- Interface: Arial/Helvetica, used for filters, labels, prices, and dense data.
- Catalog body: Georgia/Times, used for listing descriptions and repair notes.
- Labels are uppercase with modest tracking; scores and prices use tabular numerals.

## Shape and depth

- Default radius is 2px. Circular shapes are reserved for the deal gauge and status lamps.
- Cards use 1px ink or hairline borders. No atmospheric gradients or soft floating shadows.
- Depth comes from offset hard shadows (`3px 3px 0`) and inset amplifier-panel lines.
- Focus rings are 3px brass and remain visible on every interactive control.

## Core components

- Receiver header: dark walnut/black fascia, brass wordmark, tuner-scale status line.
- Deal badge: label + number + color; color is never the only signal.
- Listing card: 4:3 image, catalog ribbon, price, distance, comp range, repair risks.
- Filter rail: square inputs and tactile toggle buttons.
- Detail sheet: right-side inspection panel with score explanation and original link.
- Garage board: repair stages presented as labeled catalog bins.
- Source lamps: green, mustard, or red status light plus text and last-run time.

## Responsive rules

- Desktop: fixed left navigation and dense two/three-column working surface.
- Tablet: compact horizontal navigation and two-column listings.
- Mobile: single column, 44px minimum controls, sticky filter button, full-width detail sheet.
- Do not hide grade, price, distance, or source on smaller screens.

## Guardrails

- Never use fake distressed textures that reduce legibility.
- Never present AI analysis without the numerical assumptions that produced it.
- Never use a score without a confidence label.
- Never use pill buttons as the default control shape.
- Never use color without a text label or icon.
