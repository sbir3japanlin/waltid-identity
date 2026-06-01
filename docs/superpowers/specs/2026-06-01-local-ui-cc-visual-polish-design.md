# local-ui-cc Visual Polish — Design Spec

**Date**: 2026-06-01
**Audience**: Business/sales demos

## Goal

Elevate the three local-ui-cc apps (wallet-ui, issuer-ui, verifier-ui) from functional developer tools into polished demo-ready applications suitable for business and sales presentations.

## Approach

Design Tokens + Tailwind CSS. Shared design foundation with per-app accent colors. No new component library dependency — custom components built from Tailwind utility classes, importable from a shared `packages/shared-ui/` directory.

---

## Design Tokens

### Color Palette

```
Primary:        #1E293B  (slate-800, dark navy)
Primary-light:  #334155  (slate-700)
Surface:        #FFFFFF
Surface-alt:    #F8FAFC  (slate-50)
Border:         #E2E8F0  (slate-200)
Text:           #0F172A  (slate-900)
Text-muted:     #64748B  (slate-500)
Accent-wallet:  #3B82F6  (blue-500)
Accent-issuer:  #8B5CF6  (violet-500)
Accent-verifier:#F59E0B  (amber-500)
Success:        #10B981  (emerald-500)
Error:          #EF4444  (red-500)
```

Accent colors are set as CSS custom properties so each app overrides the single variable.

### Typography

- Font: Inter (Google Fonts), weights 400/500/600/700
- Scale: 12/14/16/18/24/32px
- Headings: 600 weight, body: 400

### Spacing & Radius

- 4px grid: 4/8/12/16/24/32/48px
- Cards: 8px radius
- Buttons: 6px radius
- Inputs: 4px radius

### Shadows

- Card: `0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)`
- Card hover (interactive): `0 4px 12px rgba(0,0,0,0.1)`
- Toast: `0 4px 16px rgba(0,0,0,0.12)`

### Focus States

- Colored ring (2px) using per-app accent, not default browser outline

### Icons

- Lucide React (tree-shakeable, MIT license)

---

## Component System

All components live in `packages/shared-ui/` and are imported by each app via workspace dependency.

### Shared Components

**Button**
- Variants: `primary` (filled accent), `secondary` (slate-100 bg), `outline` (border-only), `ghost` (transparent)
- Sizes: `sm` (28px), `md` (36px), `lg` (44px)
- States: default, hover, active, focus-visible, disabled, loading (spinner + dimmed text)
- Accent color via CSS variable

**Card**
- White surface, border, subtle shadow
- Optional `header` (title + optional action) and `footer` slots
- Interactive variant gets hover shadow lift

**Badge**
- Format badges: mDoc (blue bg), SD-JWT (green bg), JWT VC (orange bg)
- Status badges: success (green), error (red), pending (slate)

**Input / Textarea**
- Consistent 8px padding, 1px border, 4px radius
- Focus: colored ring (accent) — not outline
- Label above, helper text below (muted)
- Error state: red border + red helper text

**EmptyState**
- Centered icon (Lucide), heading, muted description, optional CTA button
- Replaces all plain-text "No X found" messages

**Spinner**
- Animated SVG circle spinner
- Sizes: sm (16px), md (24px), lg (36px)
- Color: currentColor (inherits from context)

**Toast**
- Slide-in animation from top-right
- Icon: check (success), x (error), info (info)
- Auto-dismiss with visual progress bar (5s)
- Click to dismiss
- Stacks vertically with 8px gap

**Tabs**
- Underline-style (not pill-style)
- Active tab: accent text + accent bottom border
- Inactive tab: muted text, no border
- Replaces `.format-tab` across all apps

### Per-App Components

**Wallet UI**
- CredentialCard: icon, type label, issuer name, issuance date — visual layout, not JSON dump
- ClaimFlow: step indicator (paste offer → claim → done)
- PresentationFlow: step indicator (paste request → review → approve → done)

**Issuer UI**
- OnboardingStatus: visual checklist (IACA ✓, DS ✓, Issuer DID ✓)
- OfferCard: expandable details with copy-to-clipboard button

**Verifier UI**
- SessionRow: status dot (green pulsing for pending, solid green for verified, red for failed)
- FieldCheckboxGroup: better grid layout for checkbox fields

### What Does Not Change

- All component logic, data flow, API calls
- Screen count and navigation structure
- `useToast` hook interface
- `utils.ts` and `types.ts` files
- Each app's `package.json` name and build configuration

---

## Layout & Navigation

### Sidebar

Replace horizontal nav bar with a sidebar:

- Width: 240px expanded, 56px collapsed
- Items: icon + label (collapsed: icon only, tooltip on hover)
- Active state: accent left-border (3px) + highlighted background (slate-100)
- Sections: Nav items at top, logout/actions at bottom
- Responsive: below 768px, sidebar hides behind hamburger menu

### App Headers

Each app gets a branded masthead:

- **Wallet UI**: "Identity Wallet" + optional walt.id mark
- **Issuer UI**: "Issuer Portal" + optional walt.id mark
- **Verifier UI**: "Verifier Portal" + optional walt.id mark

### Content Area

- Max-width 960px, centered
- Page header row: title (left) + optional action button (right)
- Cards stack vertically with 16px gap
- Full-height layout: sidebar + main fill viewport

### Responsive

- Sidebar: full → icon-only → hamburger as viewport shrinks
- Content: full-width on small screens (padding: 16px)
- Tables: horizontal scroll on mobile

---

## Per-App Accent Summary

| App | Accent | Nav Highlight | Button Color | Focus Ring |
|-----|--------|--------------|--------------|------------|
| Wallet UI | Blue #3B82F6 | Blue | Blue | Blue |
| Issuer UI | Violet #8B5CF6 | Violet | Violet | Violet |
| Verifier UI | Amber #F59E0B | Amber | Amber | Amber |

All three share the same navy (#1E293B) sidebar, typography, spacing, and component structure.

---

## File Structure

```
local-ui-cc/
├── packages/
│   └── shared-ui/
│       ├── package.json
│       ├── tailwind.config.ts
│       ├── src/
│       │   ├── styles/
│       │   │   ├── tokens.css        # CSS custom properties
│       │   │   └── global.css        # Tailwind directives + base styles
│       │   ├── components/
│       │   │   ├── Button.tsx
│       │   │   ├── Card.tsx
│       │   │   ├── Badge.tsx
│       │   │   ├── Input.tsx
│       │   │   ├── Textarea.tsx
│       │   │   ├── EmptyState.tsx
│       │   │   ├── Spinner.tsx
│       │   │   ├── Toast.tsx
│       │   │   └── Tabs.tsx
│       │   └── index.ts              # barrel export
│       └── tsconfig.json
├── wallet-ui/
│   ├── ...existing files...
│   ├── tailwind.config.ts            # extends shared, sets accent var
│   ├── src/
│   │   ├── styles/global.css
│   │   ├── components/
│   │   │   ├── Layout.tsx            # sidebar nav
│   │   │   ├── CredentialCard.tsx
│   │   │   ├── ClaimFlow.tsx
│   │   │   └── PresentationFlow.tsx
│   │   ├── screens/                  # updated styles only
│   │   └── ...existing files...
│   └── index.html
├── issuer-ui/                        # same structure
├── verifier-ui/                      # same structure
└── start-all.sh / stop-all.sh
```

---

## Implementation Order

1. **Foundation**: Create `packages/shared-ui/` with Tailwind config, CSS tokens, global styles
2. **Primitives**: Build Button, Card, Badge, Input, Textarea, Spinner, EmptyState, Toast, Tabs
3. **Wallet UI first**: Wire up shared components, build sidebar layout, convert screens
4. **Issuer UI second**: Same treatment
5. **Verifier UI third**: Same treatment
6. **Polish pass**: Transitions, hover states, responsive testing, consistent micro-copy

---

## What We Are NOT Doing

- No backend changes
- No API changes
- No new features or screens
- No changes to the web-portal or web-wallet apps (they're separate projects)
- No authentication/authorization changes
- No shadcn/ui or Radix dependency
