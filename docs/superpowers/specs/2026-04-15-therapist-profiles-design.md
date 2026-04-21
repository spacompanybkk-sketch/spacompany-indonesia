# Therapist Profile System — Design Spec
**Date:** 2026-04-15  
**Status:** Approved

---

## Overview

Add a therapist profile system to the existing Astro + Firebase Hosting site. Three new pages: a public search/browse page, a password-protected recruiter entry form, and a password-protected admin status management page. Profile data is stored in Firestore; photos in Firebase Storage.

---

## Architecture

### New files

```
src/
  lib/
    firebase.js          ← Firebase app init (Firestore + Storage)
  pages/
    therapists.astro     ← Public search page
    therapists/
      [id].astro         ← Individual profile page
    recruiter.astro      ← Password-protected profile entry form
    admin.astro          ← Password-protected status management
```

### Firebase services used

- **Firestore** — therapist profile documents
- **Firebase Storage** — photo uploads (`therapists/{id}/{filename}`)
- **Firebase Hosting** — already in place (no change)

### Authentication

A single shared password stored as a hardcoded constant in a `src/lib/auth.js` file (not committed — added to `.gitignore`). The password is checked client-side in the browser before rendering recruiter and admin page content. Both pages use the same password.

---

## Data Model

**Firestore collection: `therapists`**

| Field | Type | Notes |
|---|---|---|
| `name` | string | Full name |
| `age` | number | Age in years |
| `gender` | string | `"Female"` / `"Male"` |
| `location` | string | Thai city (e.g. "Khon Kaen") |
| `experience` | number | Years of experience |
| `skills` | string[] | From fixed list (see below) |
| `bio` | string | Free-text biography |
| `desiredWorkLocation` | string | Country/region |
| `photos` | string[] | Firebase Storage download URLs |
| `workHistory` | object[] | `{ role, location, duration, duties[] }` |
| `ratings` | object | `{ communication, appearance, proactivity, experience, massageSkills }` — each 0–20, total /100 |
| `status` | string | `"active"` or `"placed"` |
| `createdAt` | timestamp | Set on document creation |

**Fixed skills list** (checkboxes on recruiter form):  
Aroma Massage, Body Massage, Foot Massage, Foot Reflexology, Foot Spa, Herbal Massage, Oil Massage, Thai Foot Spa and Massage, Traditional Thai Massage

---

## Pages

### `/therapists` — Public Search

- Loads all Firestore documents where `status === "active"` on page load (client-side JS)
- Displays a responsive grid of profile cards
- Each card: main photo, name, age, experience (years), location, top 3 skills, "View Profile" button
- Filter controls above the grid:
  - Age: min/max number inputs
  - Experience: min/max number inputs
- Filtering is client-side (no additional Firestore queries)
- Empty state shown if no profiles match filters

### `/therapists/[id]` — Individual Profile

- Loads single Firestore document by ID
- Sections (mirrors old site):
  - Photo gallery (thumbnails + large view)
  - Basic info: name, age, gender, location, desired work location
  - Skills list
  - Biography paragraph
  - Ratings bar (5 categories, total /100)
  - Work history (role, location, duration, bullet duties)
- Not linked from nav — accessed via card links on `/therapists`

### `/recruiter` — Recruiter Form (password-protected)

- On load: centered password prompt overlay
- On correct password: full form revealed
- Form fields:
  - Name (text)
  - Age (number)
  - Gender (select: Female / Male)
  - Thai city (text)
  - Experience in years (number)
  - Skills (checkbox list)
  - Bio (textarea)
  - Desired work location (text)
  - Work history (repeatable section: role, location, duration, duties textarea)
  - Ratings (5 sliders, 0–20 each)
  - Photo upload (multi-file, images only)
- On submit:
  1. Upload photos to Firebase Storage under `therapists/{autoId}/`
  2. Save document to Firestore with `status: "active"` and `createdAt: now`
  3. Show success message and reset form
- Not linked from public nav

### `/admin` — Status Management (password-protected)

- Same password as `/recruiter`
- On load: password prompt overlay
- On correct password: table of ALL therapists (active and placed)
- Table columns: name, age, location, status badge, date added, toggle button
- Toggle button: switches `status` between `"active"` and `"placed"` with immediate Firestore write
- Sorted by `createdAt` descending (newest first)
- Not linked from public nav

---

## Security Notes

- Password is client-side only — this is intentional for internal tooling simplicity. The Firestore security rules should restrict writes to known origins or require the password hash as a field check if stricter security is needed later.
- `src/lib/auth.js` is gitignored to avoid committing the password.
- Firebase Storage rules should allow public reads (for profile photos) and authenticated/origin-restricted writes.

---

## Out of Scope

- Email notifications on new profile submission
- Recruiter user accounts / per-user audit trail
- Profile editing after creation (admin can toggle status only)
- Pagination on the search page (can be added when profile count warrants it)
