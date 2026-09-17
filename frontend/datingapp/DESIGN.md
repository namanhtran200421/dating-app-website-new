---
version: alpha
name: 'Rosemarry'
description: 'A playful, interaction-first dating brand built from editorial scrapbooks, candid photos, and tactile paper objects.'
colors:
  primary: '#ED77A8'
  ink: '#202131'
  ink-deep: '#1C1418'
  paper: '#FBF8EF'
  white: '#FFFFFF'
  rose: '#D81E4A'
  yellow: '#FFC53D'
  mint: '#47D8AD'
  purple: '#8D6CFF'
  mist: '#F0F1F6'
typography:
  display:
    fontFamily: 'DynaPuff, system-ui, sans-serif'
    lineHeight: '1'
  body:
    fontFamily: 'Playpen Sans, system-ui, sans-serif'
    lineHeight: '1.65'
rounded:
  label: '0.125rem'
  control: '999px'
  field: '1.1rem'
  card: '1.5rem'
  feature: '2rem'
spacing:
  card-gap: '1.5rem'
  page-gutter: '4rem'
  section-gap: '6rem'
  page-max: '80rem'
components:
  navigation:
    backgroundColor: '{colors.white}'
    textColor: '{colors.ink}'
    typography: '{typography.body}'
    rounded: '{rounded.feature}'
  card-paper:
    backgroundColor: '{colors.paper}'
    textColor: '{colors.ink}'
    rounded: '{rounded.card}'
    padding: '{spacing.card-gap}'
  card-dark:
    backgroundColor: '{colors.ink-deep}'
    textColor: '{colors.white}'
    rounded: '{rounded.card}'
  button-primary:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.ink}'
    rounded: '{rounded.control}'
  input:
    backgroundColor: '{colors.mist}'
    textColor: '{colors.ink}'
    typography: '{typography.body}'
    rounded: '{rounded.field}'
  dialog:
    backgroundColor: '{colors.paper}'
    textColor: '{colors.rose}'
    rounded: '{rounded.feature}'
  label-yellow:
    backgroundColor: '{colors.yellow}'
    textColor: '{colors.ink}'
    typography: '{typography.body}'
    rounded: '{rounded.label}'
  badge-mint:
    backgroundColor: '{colors.mint}'
    textColor: '{colors.ink}'
    rounded: '{rounded.control}'
  accent-purple:
    backgroundColor: '{colors.purple}'
---

# Rosemarry Design System

## Overview

### Creative North Star

Rosemarry should feel like a dating scrapbook edited by a small independent magazine: candid photographs, taped notes, imperfect alignment, handwritten labels, and dark ink used as a confident grounding surface. It is expressive without becoming childish or chaotic.

### Product context and register

- **Audience and primary job:** Adults tired of swipe-first dating who need to understand Rosemarry's weekly Circle model and decide whether to join early access.
- **Target market and evidence:** The public repository describes a global English-language dating product; no narrower market contract is documented.
- **Locale and language policy:** English is the current owned interface and content language.
- **Usage scene:** Public marketing and editorial pages viewed primarily in a browser on phone and desktop, with low urgency and room for exploration.
- **Register:** Brand-led marketing across all public routes; forms, policy copy, and long-form articles use a quieter version of the same identity.
- **Memorable signature:** Asymmetric paper-card compositions that lift like pinned notes, with one accent-colour shadow per object.
- **Restraint:** Long-form reading, legal information, forms, and navigation remain orderly, high-contrast, and easy to scan. Rotation stays under one degree for content cards.
- **Anti-references:** No generic three-identical-card SaaS grids, glassmorphism, soft gradient blobs, dashboard chrome, or decorative dot textures.
- **Token ownership/runtime mapping:** Existing runtime CSS remains canonical. Shared values live in `src/styles.css`; `tailwind.config.js` mirrors the same accepted palette for utility classes. This file documents the system and is checked against both during site-wide design changes.

## Colors

`ink` is the primary outline and dark-section colour. `paper` and `white` are readable surfaces. `primary` maps to the runtime pink accent, `rose` is reserved for emphasis and links, while `yellow`, `mint`, and `purple` rotate through card shadows and small labels. `mist` separates quiet editorial sections. Accents do not replace text labels or state semantics.

## Typography

`DynaPuff` is the display voice for page titles, card titles, and short statements. `Playpen Sans` carries body text, labels, controls, and long-form reading. Display type should be used in short, shaped lines; paragraphs keep a comfortable measure and use sentence case. Utility labels may use uppercase with generous tracking.

## Layout

Desktop compositions use a 1280px maximum canvas with 64px gutters when space allows. Hero and section headings anchor to strong left edges, while feature cards use twelve-column asymmetric spans, occasional vertical offsets, and deliberate negative space. Mobile collapses to one readable column without rotation or horizontal overflow. Navigation shares the same canvas as page content.

## Elevation & Depth

Depth comes from solid offset shadows, never diffuse glass panels. Default cards use a restrained ink shadow; hover lifts the whole paper object and swaps to a rotating accent shadow. Large reading containers and legal sections move less than promotional cards. Static text never receives elevation.

## Shapes

Cards use 1.5–2rem rounded corners and 1.5–2px ink borders. Primary actions stay pill-shaped. Small editorial labels are near-square and may rotate slightly. Circles are reserved for avatars, status marks, and intentionally circular badges.

## Components

### Foundational visual states

Cards lift 5–6px on fine-pointer hover and focus-within, settle to 2px when pressed, and retain visible keyboard focus. Disabled and busy controls do not move. Reduced-motion mode removes translation and rotation while retaining colour, border, and shadow feedback.

### Buttons and actions

Primary actions use pink or ink with a dark outline and compact offset shadow. Secondary actions use white or paper. Hover increases the offset and introduces a small lift; active returns the control toward the page. Link wording remains explicit.

### Navigation and data display

The navigation is a bordered paper strip with a pink offset shadow, aligned to the page canvas. Links are individual tactile objects rather than a pill nested inside another pill. Editorial lists and fact sheets use rules and labels before adding containers.

### Forms and overlays

Inputs use paper surfaces, strong labels, and rose focus rings. The contact subject control intentionally uses the native Select/Listbox owner; platform popup geometry and keyboard behaviour are accepted while the closed control keeps Rosemarry styling. Form and dialog containers use the same bordered-card construction with lower movement than promotional cards. Errors remain inline and textual.

### Iconography

Font Awesome icons are used at small sizes as supporting marks. Important actions keep text labels; icons never carry the only meaning.

### Motion

Motion should feel like lifting or sliding paper: 180–260ms for direct feedback with an ease-out curve. Scroll reveals remain subtle. Decorative looping motion is avoided, and reduced-motion preferences remove transforms.

### Content and data visualization

Copy is conversational, specific, and direct. Headings make one clear claim; body copy explains it without startup or corporate language. Rosemarry's recurring vocabulary is “Circle,” “get to know,” “match,” and “early access.”

## Do's and Don'ts

- **Do:** Build varied editorial rhythm with one dominant card and smaller supporting notes.
- **Do:** Reuse the shared palette, border weight, paper lift, and focus treatment on every route.
- **Don't:** default to three or four equal cards with identical height and spacing.
- **Don't:** add gradients, glass blur, dotted textures, or decorative motion that competes with the candid-photo collage.
