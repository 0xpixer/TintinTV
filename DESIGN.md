---
name: TintinTV
description: Cinema-first interface for browsing and playing video
colors:
  night: '#101114'
  night-surface: '#1a1c20'
  night-raised: '#272a2f'
  night-text: '#f7f7f8'
  night-muted: '#b6b9bf'
  day: '#f6f7f8'
  day-surface: '#ffffff'
  day-text: '#191c20'
  warm-focus: '#f5b66d'
rounded:
  control: '6px'
  media: '16px'
  hero: '20px'
  player: '14px'
spacing:
  compact: '8px'
  standard: '16px'
  section: '38px'
---

# Design System: TintinTV

## Overview

The screen behaves like a quiet home cinema: artwork and the video player carry the visual impact, while navigation and tools stay restrained. The default is a near-black viewing environment; the existing light-mode control remains available. This is a TintinTV identity inspired by Apple TV's content-first approach, not a copy of Apple branding.

## Colors

Neutral charcoal and white provide the stable UI frame. The existing logo supplies a warm cue; warm focus is reserved for selection, focus, and a small number of active states. Poster art supplies the rest of the color.

## Typography

Inter serves both display and interface text. Large film titles belong only in the featured hero; page headings and panel labels are more compact. Long descriptions remain within a readable line length.

## Layout

Desktop uses a 76px top navigation and a centered content width up to 1740px. Mobile uses a 56px header and a fixed bottom navigation. The featured film has an edge-to-edge media field within the content width, with the title laid directly over it. Browse results use a poster grid; playback uses a 16:9 player beside a source panel on wide screens and stacks them on mobile.

## Elevation & Depth

Pages and controls are mostly flat. Tonal surface changes and thin separators provide hierarchy; only overlays and focused media use a soft offset shadow. Blur is limited to artwork backdrops and navigation surfaces where content scrolls beneath.

## Shapes

Control corners are modest. The featured artwork uses 20px corners, posters use 16px, and the player uses 14px. Avoid rounded page sections or nested cards.

## Components

- Top navigation: persistent product mark, six primary destinations including Favorites, theme and account controls.
- Featured title: dynamic poster, dark legibility scrim, metadata, and direct play/search actions.
- Poster: portrait image with title below, focus outline, and keyboard activation.
- Playback: fixed-aspect video, adjacent episode/source control, details below.
- Filters: unframed full-width bands with segmented options.

## Do's and Don'ts

- Do let real film imagery drive visual variety.
- Do keep loading, empty, error, and no-source states in the same visual language.
- Do preserve a visible focus indication and touch-friendly targets.
- Don't enlarge poster art inside the player or let it cover the description.
- Don't introduce Apple logos, proprietary images, decorative orbs, or glass cards as page scaffolding.
