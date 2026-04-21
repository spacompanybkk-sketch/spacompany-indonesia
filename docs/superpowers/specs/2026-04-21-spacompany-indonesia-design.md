# Spa Company Indonesia — Site Design Spec

## Overview

A new recruitment website at `spacompany-indonesia.com` for Spa Company's Indonesia branch. The site recruits **Indonesian therapists for overseas spas** — the same business model as spa-company.com (Bangkok) but with Indonesian talent. It serves a **dual audience**: job seekers (Indonesian candidates) and employers (overseas spa owners).

**Firebase project:** `spa-indonesia`
**Approach:** Fork spa-company.com repo, strip Bangkok-specific content, adapt for Indonesia.

---

## Tech Stack

- **Astro 6** — static site generator
- **Tailwind CSS 4** — styling
- **Firebase** — Hosting, Cloud Functions (Node 22), Firestore, Storage
- **Notion** — Jobs database (separate workspace from Bangkok)
- **Domain:** `spacompany-indonesia.com`

---

## Pages

### Public Pages (dual language: `/en/` and `/id/`)

| Page | Route | Description |
|------|-------|-------------|
| Home | `/id/`, `/en/` (root `/` redirects to `/id/`) | Hero with Indonesia logo, value props for Indonesian talent, how-it-works steps, testimonials, WhatsApp CTA |
| Service | `/id/service`, `/en/service` | Service listing: Headhunting, Screening, Document Processing, Flight Arrangements, After-recruitment Services |
| Job Board | `/id/jobs`, `/en/jobs` | Searchable jobs from Notion DB (filtered by dropdown), mobile CV upload button |
| About / Trust | `/id/about`, `/en/about` | Company permits (placeholder), team photos (blank templates), office address |
| Contact | `/id/contact`, `/en/contact` | Contact form + WhatsApp link (+62 821 151 9986) |
| Get a Quote | `/id/get-a-quote`, `/en/get-a-quote` | Employer inquiry form |
| Blog | `/id/blog`, `/en/blog` | Blog posts (copied from Bangkok site, adapted) |

### Internal Pages (English only, behind auth)

| Page | Route | Description |
|------|-------|-------------|
| Recruiter | `/recruiter` | Recruiter dashboard (forked from Bangkok) |
| Admin | `/admin` | Admin panel (forked from Bangkok) |
| Checkout | `/checkout` | Payment flow (forked from Bangkok) |
| Booking | `/book` | Booking flow (forked from Bangkok) |

---

## i18n Architecture

Astro's built-in i18n routing with URL-based language prefixes:

```
src/pages/
  en/
    index.astro
    service.astro
    jobs.astro
    about.astro
    contact.astro
    get-a-quote.astro
    blog.astro
  id/
    index.astro
    service.astro
    jobs.astro
    about.astro
    contact.astro
    get-a-quote.astro
    blog.astro
```

- Root `/` redirects to `/id/` (primary audience is Indonesian)
- Language toggle in header switches between `/en/...` and `/id/...`
- Shared translation strings in `src/i18n/` folder
- Internal pages (recruiter, admin, checkout, booking) are English only, no i18n prefix

---

## New Features (not in Bangkok)

### Job Board
- Pulls from a Notion Jobs database (separate workspace)
- Jobs filtered by a "show on site" dropdown field in Notion
- Searchable/filterable by candidates
- Mobile-friendly CV upload button (simple file upload)
- Cloud Function to sync jobs from Notion

### WhatsApp Integration
- Floating WhatsApp button site-wide, linking to `https://wa.me/628211519986`
- WhatsApp number: +62 821 151 9986
- Also displayed in Contact page and header

### Trust & Legal Section (About page)
- Company name and office address
- Recruitment permits/licenses (placeholder sections for now)
- Team photos with recruiter profiles (blank templates initially)
- Testimonials from placed candidates (photos, quotes, videos)

### Social Proof
- Photos and videos on the site showing real placements
- Candidate testimonials with pictures
- Employers can see proof of successful placements

---

## Content Changes from Bangkok

- "Thai therapists" → "Indonesian therapists" throughout
- "Bangkok" → "Indonesia" throughout
- Logo: green "Spa Company Indonesia" lotus/droplet mark
- Industry focus: Spa Therapist, Hospitality & General Worker
- Services: Headhunting, Screening, Document Processing, Flight Arrangements, After-recruitment Services
- Hero images: Indonesia-appropriate (placeholders initially)
- Blog posts: copied from Bangkok, adapted for Indonesia context

---

## Removed from Bangkok Fork

- Therapist database pages (listing + individual profiles) — Indonesia DB needs to be built first
- Candidate intake / OCR upload system
- Thai language page (`home-th`)
- Salary & Benefits Guide

---

## Kept from Bangkok (adapted)

- Layout, Header, Footer components (rebranded)
- Recruiter dashboard
- Admin panel
- Checkout flow
- Booking flow
- Blog structure

---

## Notion Integration

- **Separate Notion workspace** from Bangkok
- **Jobs database** with a dropdown field to control which jobs appear on the site
- Cloud Function to fetch and cache jobs data

---

## Branding

- Logo: Green lotus/droplet mark with "SPA COMPANY" and "Indonesia" in cursive beneath
- Logo file: `Spa Company Indonesia LOGO GREEN.jpeg` (provided by user)
- Color scheme: Green-based (matching logo), can adapt Bangkok's existing Tailwind theme

---

## Deployment

- Separate GitHub repo
- Firebase project: `spa-indonesia`
- Firebase Hosting for static site
- Firebase Cloud Functions for Notion sync + business logic
- Domain: `spacompany-indonesia.com` (configured in Firebase Hosting)
