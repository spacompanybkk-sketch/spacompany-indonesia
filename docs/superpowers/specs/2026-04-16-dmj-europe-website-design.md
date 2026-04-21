# DMJ Europe Website — Design Spec

## Overview

A separate Astro v6 static site for **DMJ Europe s.r.o.** (dmjeurope.com), a Slovak company that recruits qualified workers from Southeast Asia (Philippines, Indonesia, Thailand) for European companies, primarily in the automotive and manufacturing sectors. DMJ Europe is a sister company to SPA Company, which handles factory recruiting on its behalf.

The site serves two audiences:
1. **European employers** looking for qualified workforce from Asia (Slovak + English)
2. **Asian workers** already deployed in Central Europe looking for new opportunities (English only, geo-restricted)

## Tech Stack

- **Astro v6** — static site generator
- **Tailwind CSS v4** — utility-first styling via `@tailwindcss/vite` plugin
- **No UI framework** — pure Astro components
- **No Firebase initially** — forms via FormSubmit.co (can add Firebase later)
- **Node >= 22.12.0**

Create as a separate project at `/Users/michaglio/Projects/dmj-europe/`.

## i18n Strategy

Folder-based routing with `/sk/` and `/en/` prefixes:

```
src/
  pages/
    index.astro          → redirects to /sk/
    sk/
      index.astro        → /sk/
      o-nas.astro        → /sk/o-nas
      personalny-lizing.astro → /sk/personalny-lizing
      proces.astro       → /sk/proces
      kontakt.astro      → /sk/kontakt
    en/
      index.astro        → /en/
      about.astro        → /en/about
      staff-leasing.astro → /en/staff-leasing
      process.astro      → /en/process
      contact.astro      → /en/contact
      jobs.astro         → /en/jobs (English only, geo-restricted)
```

Shared content lives in translation dictionaries:

```
src/
  i18n/
    sk.json              → Slovak strings
    en.json              → English strings
    utils.ts             → helper to get current lang from URL, load strings
```

Pages import the dictionary for their language and pass strings to shared components. Components are language-agnostic — they receive text via props.

## Pages

### 1. Home (`/sk/`, `/en/`)

- **Hero section**: Full-width industrial background image, bold headline: "Qualified Personnel from Southeast Asia for Your Company" (localized), CTA button to Contact
- **Value propositions**: 3-4 cards — e.g. "17+ years experience", "250+ employees", "35+ partners", "Legal compliance guaranteed"
- **Industries served**: Grid of sectors (automotive, manufacturing, welding, logistics, hospitality)
- **SPA Company connection**: Section mentioning SPA Company as sister company handling factory recruiting, linking to spa-company.com
- **CTA banner**: "Get a quote" or "Contact us" call to action

### 2. About (`/sk/o-nas`, `/en/about`)

- **Company story**: Founded 2025, born from demand for Asian workforce in industrial sectors. Sister companies SPA Company and SPA Company Slovakia provide personnel in gastro/wellness for 3+ years; DMJ expanded into automotive — Slovakia's largest segment.
- **Mission**: Stability, managed services, professional approach, customer satisfaction.
- **Stats**: 250+ employees (SK, PH, ID, TH), 35+ business partners across Slovakia
- **Team section**: Placeholder for founder/management info

### 3. Staff Leasing (`/sk/personalny-lizing`, `/en/staff-leasing`)

- **What is staff leasing**: Worker is employed by DMJ Europe, deployed to client's operation
- **Benefits for client**: No recruitment burden, no visa/admin hassle, flexible scaling, legal employment guaranteed
- **Industries**: Automotive, manufacturing, welding, logistics, warehousing, housekeeping
- **How cooperation works**: Brief numbered steps (detailed version on Process page)
- **CTA**: Link to Process page + Contact

### 4. Process (`/sk/proces`, `/en/process`)

Step-by-step visual flow:
1. **Requirement gathering** — Client defines positions, quantities, qualifications
2. **Candidate selection** — DMJ selects candidates in Asia, conducts interviews
3. **Client approval** — Client reviews and approves candidates
4. **Visa & work permits** — DMJ handles all documentation and legal process
5. **Travel & onboarding** — Workers arrive, DMJ provides orientation and support
6. **Ongoing support** — Continuous HR management and worker welfare

Each step gets an icon/number, short description, and optional image.

### 5. Contact (`/sk/kontakt`, `/en/contact`)

- **Contact info**: Email (jakub@dmjeurope.com), phone (+421 911 152 766), address (Priemyselna 650/12, 965 63 Ziar nad Hronom, Slovakia)
- **Simple contact form**: Name, email, company, phone, message. Submit via FormSubmit.co.
- **Map embed**: Optional Google Maps embed of office location

### 6. Looking for a Job (`/en/jobs` — English only)

**Geo-restriction**: Client-side IP check via free geolocation API (e.g. ip-api.com). If visitor IP is not from CZ, SK, PL, or HU, show a message: "This form is currently available only for workers in Central Europe (Czech Republic, Slovakia, Poland, Hungary)." Hide the form.

**Target audience**: Workers from Philippines, Indonesia, Thailand already deployed in Central Europe seeking new opportunities.

**Form fields**:

| Field | Type | Required |
|-------|------|----------|
| Full name | text | yes |
| Nationality | select: Filipino, Indonesian, Thai, Other | yes |
| Phone number (with country code) | tel | yes |
| Email | email | yes |
| Current country of deployment | select: Czech Republic, Slovakia, Poland, Hungary | yes |
| Current visa/permit status | select: Work permit, Blue card, Seasonal permit, Other | yes |
| Current deployment length (months) | number | yes |
| Current net monthly salary (EUR) | number | yes |
| Expected net monthly salary without accommodation (EUR) | number | yes |
| Industry/skills | select: Automotive, Manufacturing, Welding, Logistics, Warehousing, Housekeeping, Other | yes |
| Availability | select: Immediately, 1-3 months, 3+ months | yes |
| Message (optional) | textarea | no |

**Spam protection**: Math captcha or honeypot field (same pattern as spa-company).

## Design System

### Color Palette

- **Primary dark navy**: `#1a2744` — headers, hero overlays, footer background
- **Steel gray**: `#4a5568` — body text, secondary elements
- **Light gray**: `#f7f8fa` — alternating section backgrounds
- **White**: `#ffffff` — cards, content areas
- **Bold accent**: `#e8730c` (industrial orange) — CTAs, highlights, active states
- **Success green**: `#22c55e` — form success states

Exact values to be refined once we see the DMJ logo colors up close.

### Typography

- **Font**: Inter (Google Fonts) — clean industrial sans-serif
- **Weights**: 400 (body), 500 (subheadings), 700 (headings), 800 (hero titles)
- **Headings**: Uppercase or semi-bold for industrial feel

### Component Patterns

- **Sticky header**: Dark navy background, logo left, nav center/right, SK/EN language toggle
- **Hero sections**: Full-width background image with dark overlay, white text, CTA button
- **Section containers**: `max-w-6xl mx-auto px-4` for consistent width
- **Cards**: White background, rounded-lg, shadow-sm, hover:shadow-md transition
- **Buttons**: Rounded-full, orange accent bg, white text, hover darken
- **Footer**: Dark navy, 3-column: company info + quick links + contact, SPA Company mention at bottom
- **Process steps**: Numbered circles connected by lines, icon + title + description

### Responsive Breakpoints

Standard Tailwind: `sm:640px`, `md:768px`, `lg:1024px`, `xl:1280px`
- Mobile: single column, hamburger menu
- Tablet: 2-column grids
- Desktop: full nav, 3-4 column grids

## Project Structure

```
dmj-europe/
  astro.config.mjs
  package.json
  tsconfig.json
  tailwind.config.ts        (if needed beyond CSS)
  public/
    images/                  # Stock factory/industrial photos
    favicon.ico
  src/
    components/
      Header.astro           # Sticky nav with lang switcher
      Footer.astro           # Dark footer with SPA Company mention
      Hero.astro             # Reusable hero section
      StepCard.astro         # Process step component
      ContactForm.astro      # Reusable contact form
      JobForm.astro          # Geo-restricted job application form
      GeoGate.astro          # IP geolocation check wrapper
      LanguageSwitcher.astro # SK/EN toggle
    layouts/
      Layout.astro           # Main wrapper: head, header, slot, footer
    i18n/
      sk.json                # Slovak translation strings
      en.json                # English translation strings
      utils.ts               # getLang(), t() helper functions
    pages/
      index.astro            # Redirect to /sk/
      sk/                    # Slovak pages
      en/                    # English pages
    styles/
      global.css             # Tailwind imports + theme customization
```

## Images

Stock industrial/factory photos needed for:
- Hero backgrounds (factory floor, workers, manufacturing)
- Process step illustrations
- About page team/office
- Industry sector icons or photos

Source: User will provide, or we use placeholder images initially and replace later.

## Out of Scope (for now)

- Firebase backend
- CMS integration
- Blog/news section
- Admin dashboard
- Analytics
- SEO meta tags beyond basics (can add later)
- Cookie consent banner
