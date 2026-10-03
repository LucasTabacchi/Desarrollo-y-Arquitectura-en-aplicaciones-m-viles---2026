---
name: Field Telecom Diagnostics
colors:
  surface: '#071425'
  surface-dim: '#071425'
  surface-bright: '#2e3a4d'
  surface-container-lowest: '#030e20'
  surface-container-low: '#101c2e'
  surface-container: '#142032'
  surface-container-high: '#1f2a3d'
  surface-container-highest: '#2a3548'
  on-surface: '#d7e3fc'
  on-surface-variant: '#c1c7d3'
  inverse-surface: '#d7e3fc'
  inverse-on-surface: '#253144'
  outline: '#8b919d'
  outline-variant: '#414751'
  surface-tint: '#a4c9ff'
  primary: '#a4c9ff'
  on-primary: '#00315d'
  primary-container: '#4d93e5'
  on-primary-container: '#002a51'
  inverse-primary: '#0060ac'
  secondary: '#a0c9ff'
  on-secondary: '#00325a'
  secondary-container: '#0063aa'
  on-secondary-container: '#c7deff'
  tertiary: '#42e09a'
  on-tertiary: '#003822'
  tertiary-container: '#00a56c'
  on-tertiary-container: '#00311d'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d4e3ff'
  primary-fixed-dim: '#a4c9ff'
  on-primary-fixed: '#001c39'
  on-primary-fixed-variant: '#004883'
  secondary-fixed: '#d2e4ff'
  secondary-fixed-dim: '#a0c9ff'
  on-secondary-fixed: '#001c37'
  on-secondary-fixed-variant: '#00497f'
  tertiary-fixed: '#65fdb5'
  tertiary-fixed-dim: '#42e09a'
  on-tertiary-fixed: '#002112'
  on-tertiary-fixed-variant: '#005233'
  background: '#071425'
  on-background: '#d7e3fc'
  surface-variant: '#2a3548'
typography:
  headline-xl:
    fontFamily: Manrope
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Manrope
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: 0em
  body-lg:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0.01em
  body-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-lg:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-md:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.04em
  label-sm:
    fontFamily: Geist
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.06em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 0.75rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system delivers an elevated telemetry instrument aesthetic engineered for mission-critical telecom field operations. It balances utilitarian durability with developer-grade technical rigor, evoking the dependability of calibrated physical test equipment alongside modern software precision.

The visual style is modern industrial high-contrast dark:
- **Atmosphere:** Deep cockpit navy layers paired with luminescent telemetry blue accents, calibrated for high-glare direct sunlight readability and harsh outdoor field conditions.
- **Physical Usability:** Built around rugged mobile constraints with strict gloved operation accommodations (minimum 48dp touch bounding boxes, prominent edge boundaries, and tactile surface separation).
- **Tone:** Methodical, unyielding, diagnostic, and trustworthy. Interfaces minimize decorative ambiguity, prioritizing real-time operational status, signal integrity, and offline queue visibility.

## Colors

The palette leverages a dark-adapted chromatic hierarchy engineered for field telemetry, high ambient contrast, and battery efficiency on OLED displays.

### Core Canvas & Surfaces
- **Canvas Base:** `#0F1B2D` (Deep oceanic navy grounding all background views).
- **Surface Elevation 01 (Cards/Panels):** `#16263D` (Provides distinct separation against the canvas).
- **Surface Elevation 02 (Modals/Overlays):** `#1E3350` (Raised context surfaces).
- **Surface Stroke / Outlines:** `#223854` (Structural edge definition to maintain form boundaries under sun glare).

### Interactive & Status Accents
- **Primary Telemetry / Focus:** `#4A90E2` (High-visibility active focus, state indicators, interactive selection).
- **Secondary Interactive:** `#2F7BC4` (Primary actions, physical button fills, verified pathways).
- **Success / Sync OK:** `#3DDC97` (Online status, signal locked, successful DB write/sync).
- **Warning / Degraded / Offline:** `#F5A524` (Amber alert, packet jitter, pending offline queue).
- **Critical / Drop:** `#FF5C5C` (Packet loss, link severed, interface timeout).

### Typography Contrasts
- **Primary Data & Headings:** `#FFFFFF` (High contrast, zero glare bleed).
- **Secondary UI & Metrics Labels:** `#A0B2C6` (Crisp reading contrast without eye fatigue).
- **Muted Metadata & Grid Lines:** `#6C829D` (Secondary telemetry timestamps, hardware serial tags).

## Typography

The typographic system pairs the geometric, structural authority of **Manrope** for primary navigation landmarks, status headers, and dashboard metrics with the dense, developer-grade legibility of **Geist** for technical telemetry, configuration forms, and operational workflows.

### Principles & Telemetry Display
- **Telemetry Numbers & Code:** For IP addresses (IPv4/IPv6), BSSID/MAC blocks, optical decibel readouts, and terminal output, apply an auxiliary monospace configuration (`font-family: monospace`) while retaining standard sizing to guarantee tabular alignment across high-frequency refreshes.
- **Visual Cadence:** Technical labels across diagnostic gauges use uppercase tracking with `label-sm` or `label-md` to avoid visual clutter during rapid scanning.
- **Language Alignment:** All UI copy is in Spanish (e.g., *Diagnóstico de Red*, *Potencia Óptica*, *Cola de Sincronización*), utilizing strict vertical line-height tolerances to accommodate multiline string expansion without clipping.

## Layout & Spacing

The structural layout is designed around a single-column fluid mobile canvas targeting Android hand-held field devices (360x800 base portrait viewports).

### Grid & Ergonomics
- **Outer Bounds:** `margin: 1rem` (16px) keeps primary interactive components away from the physical device chassis and rugged casing bezels.
- **Telemetry Gutter:** `gutter: 0.75rem` (12px) provides compact, balanced separation between multi-card diagnostic grids and split data meters.
- **Thumb Zone Compliance:** Critical triggers and action sheets reside in the bottom two-thirds of the viewport. High-frequency inspection summaries sit comfortably above the fold.
- **Fixed Infrastructure:** The layout reserves 56px at the top for the pinned connectivity status bar and 64px at the bottom for the primary 5-tab navigation bar.

## Elevation & Depth

This system intentionally departs from diffuse soft-drop shadows, which degrade under intense sunlight. Depth is established through **tonal layering**, **illuminated hairline borders**, and **tactile structural inset rings**.

- **Level 0 (Canvas Base):** Flat `#0F1B2D`.
- **Level 1 (Telemetry Panels & Cards):** Surface `#16263D` with a crisp 1px perimeter border `#223854`. Under direct outdoor light, this stroke preserves container shape.
- **Level 2 (Active/Selected Instruments):** Surface `#1E3350`, 1px border `#4A90E2`, supplemented by an inner 1px glow or inset stroke of `rgba(74, 144, 226, 0.25)`.
- **Level 3 (Diagnostic Sheets & Modal Dialogs):** Surface `#16263D` raised over a semi-transparent scrim (`rgba(15, 27, 45, 0.85)`), framed by a sharp top-edge boundary stroke `#2F7BC4`.

## Shapes

The design uses tight, controlled roundedness (`0.25rem` / 4px base increment) to communicate precision instrumentation. 

- **Primary Cards & Instrument Panels:** Formed with `rounded-xl` (`0.75rem` / 12px) to match user hardware specifications, softening impact edges while maximizing interior screen real estate.
- **Telemetry Chips & Status Badges:** Use `rounded-lg` (`0.5rem` / 8px) for compact, dense enclosure of state tags.
- **Interactive Inputs & Action Buttons:** Use `rounded-xl` (`0.75rem` / 12px) with reinforced tap padding to present clear physical targets.
- **Status Indicators (Pings, LED simulation):** True circles (`border-radius: 9999px`) evoke physical equipment LEDs.

## Components

### 1. Persistent Top Header & Status Chip
- **Frame:** Height 56px, background `#0F1B2D`, bottom border 1px `#223854`.
- **Connectivity Status:** Pill badge with an 8px circular status LED.
  - *Online:* Border `rgba(61, 220, 151, 0.3)`, text `#3DDC97`, LED glowing `#3DDC97`.
  - *Sin Conexión:* Border `rgba(245, 165, 36, 0.3)`, text `#F5A524`, LED glowing `#F5A524`.
- **Sync Badge:** Surface `#16263D`, text `#A0B2C6`, presenting pending uploads (e.g., `4 pend.`) with an offline buffer indicator.

### 2. Primary Buttons (Field Triggers)
- **Dimensions:** Minimum height 48px (52px recommended for primary CTA), full width or paired in a grid.
- **Primary:** Background `#2F7BC4`, text `#FFFFFF`, font `Manrope` 600. Pressed state: `#4A90E2`. Focus ring: 2px `#FFFFFF`.
- **Secondary / Utilitarian:** Surface `#16263D`, border 1px `#223854`, text `#A0B2C6`. Active state shifts border to `#4A90E2`.

### 3. Diagnostic Cards & Telemetry Containers
- **Container:** Background `#16263D`, border 1px `#223854`, corner radius 12px, internal padding 12px to 16px.
- **Header:** Upper label in `label-sm` tracking with value in `headline-sm` `#FFFFFF`.
- **Metrics Split:** Multi-metric grids use 1px vertical `#223854` dividers between ping, jitter, and packet loss telemetry.

### 4. Input Fields & Search Bars
- **Container:** Height 48px, background `#0F1B2D`, border 1px `#223854`, radius 8px, text `#FFFFFF`.
- **State Changes:** On focus, border changes to `#4A90E2` with a subtle interior glow.
- **Labels:** Floating micro-labels in `#A0B2C6` to maintain persistent context.

### 5. Selection Controls (Checkboxes, Toggles & Radios)
- **Touch Target:** Strict 48x48dp bounding box wrapping a 20x20dp active indicator.
- **Toggle Switch:** Track `#223854` (inactive) to `#2F7BC4` (active); thumb solid `#FFFFFF`.

### 6. Bottom Navigation Bar
- **Frame:** Height 64px, surface `#16263D`, top border 1px `#223854`.
- **Tabs (5):** *Inicio*, *Escanear*, *Instalaciones*, *Historial*, *Ajustes*.
- **Item Styling:** 24px technical outline icons, 10px `Geist` label. Inactive items use `#6C829D`; active tab uses `#4A90E2` icon, text, and an illuminated 2px top indicator bar.