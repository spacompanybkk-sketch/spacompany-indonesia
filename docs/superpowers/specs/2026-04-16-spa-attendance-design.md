# SPA Attendance — Design Spec

**Date:** 2026-04-16
**Status:** Brainstorm complete, awaiting user review
**Project location:** `/Users/michaglio/Projects/spa-attendance/` (to be created — separate from this repo)

## Overview

A standalone internal web app for monthly attendance reporting of leased workers placed at hotel / spa locations. Each location's on-site supervisor uses a shareable link + passcode to submit totals once a month. The submitted data is written back to Notion (the source of truth). An admin page lets the company pull aggregated or per-location views and export CSVs without opening Notion.

**Audiences:**

1. **On-site supervisors** (hotel / spa managers) — submit monthly attendance for their workers.
2. **Internal admin** (company office) — review submissions and export CSVs.

**Non-goals:** payroll calculation, worker self-service, invoicing, scheduling, shift-level tracking. This is a monthly roll-up only.

## Tech Stack

- **Astro v6** — hybrid output (static by default, server endpoints where needed)
- **Firebase adapter** (`@astrojs/firebase` or equivalent) → Firebase Hosting + a single Firebase Function
- **Tailwind CSS v4** via `@tailwindcss/vite`
- **`@notionhq/client`** — official Notion SDK, server-side only
- **No database of our own** — Notion is the only persistent store
- **Node >= 22.12.0** (matches existing sites)

## Architecture

### Project shape

```
spa-attendance/
├── src/
│   ├── pages/
│   │   ├── index.astro               # Landing (brief instructions, link to /admin)
│   │   ├── attendance/[slug].astro   # Supervisor form (per location)
│   │   ├── admin.astro               # Admin report UI (passcode-gated)
│   │   └── api/
│   │       ├── location/verify.ts    # POST: passcode check + employee list
│   │       ├── attendance.ts         # POST: upsert monthly attendance → Notion
│   │       ├── admin/verify.ts       # POST: admin passcode check
│   │       ├── admin/report.ts       # GET:  aggregated / by-location month data
│   │       └── admin/locations.ts    # GET:  active locations for filter dropdown
│   ├── lib/
│   │   ├── notion.ts                 # Typed Notion client + query helpers
│   │   ├── csv.ts                    # CSV serializer (UTF-8 BOM)
│   │   ├── session.ts                # Sign/verify JWT session cookies
│   │   └── rateLimit.ts              # In-memory per-IP rate limiter
│   ├── components/
│   │   ├── BilingualLabel.astro
│   │   ├── SupervisorForm.astro
│   │   ├── AdminTable.astro
│   │   └── MissingSubmissionsBanner.astro
│   └── i18n/
│       └── labels.ts                 # EN + SK label dictionary
├── firebase.json
├── .env.example
└── package.json
```

### Runtime flow

- Static pages are served from Firebase Hosting.
- API routes + any SSR rendering run inside a single Firebase Function.
- Every Notion call happens server-side. The Notion token never reaches the browser.

## Data Model (Notion)

Three Notion databases. All three live at the top of a Teamspace and must be shared with the integration created at `notion.so/my-integrations`.

### Locations (existing)

| Property | Type | Notes |
|---|---|---|
| `Name` | Title | |
| `Slug` | Text | URL-safe, lowercase, hyphenated (e.g. `hotel-grand-prague`) |
| `Passcode` | Text | Shareable code given to the supervisor; rotatable in Notion |
| `Active` | Checkbox | Inactive locations hidden from admin dropdown |

### Employees / Candidates (existing)

| Property | Type | Notes |
|---|---|---|
| `Name` | Title | |
| `Location` | Relation → Locations | Two-way; drives which employees a supervisor sees |
| `Active` | Checkbox | Only active employees appear on forms |
| `External ID` | Text | Optional payroll/HR identifier |

### Attendance (new)

One row per (Employee, Month). Re-submission **upserts** — never duplicates.

| Property | Type | Notes |
|---|---|---|
| `Name` | Title | Auto-set to `"YYYY-MM — <employee name>"` |
| `Employee` | Relation → Employees | Two-way |
| `Location` | Relation → Locations | Two-way; denormalized for fast month+location queries |
| `Month` | Date | Day-precision, always 1st of month (e.g. `2026-04-01`) |
| `Total hours` | Number | |
| `Commissionable hours` | Number | e.g. massage hours used for commission |
| `Overtime hours` | Number | |
| `Annual leave (days)` | Number | |
| `Sick leave (days)` | Number | |
| `Notes` | Text | Optional free-form |
| `Submitted at` | Created time | Auto |
| `Submitted by` | Text | Free-form supervisor name entered on the form |

## Passcode & Access Flow

### Supervisor

1. Opens `https://attendance.<company-domain>/attendance/<slug>`.
2. Page is a static shell with a single passcode input and **Continue** button.
3. Continue → `POST /api/location/verify` with `{ slug, passcode }`. Server:
   - Finds Location by `Slug` + `Active = true`.
   - Constant-time-compares submitted passcode vs `Passcode`.
   - On success: queries active Employees with `Location = <id>`; returns `{ location, employees }` and sets an httpOnly signed-JWT cookie `loc_<slug>` (24h TTL, `{ locationId, slug, exp }`).
   - On failure: 401. In-memory rate limiter caps at 5 failures / minute / IP.
4. The form renders one row per employee, defaulting **month** to the previous month.
5. Submit → `POST /api/attendance` with the cookie; server upserts one Attendance row per employee.

### Admin

- `/admin` prompts for a single passcode (`ADMIN_PASSCODE` env var), `POST /api/admin/verify` sets an `admin` cookie (12h TTL). No per-user accounts — rotate the passcode via env var when needed.

### Rationale

- Passcodes live in Notion so they can be rotated without a deploy.
- httpOnly cookies keep passcodes out of URLs and localStorage and avoid re-prompting supervisors on every submit.
- 24h TTL matches how non-technical supervisors actually use the tool: start typing, get distracted, come back later the same day.

## API Endpoints

All under `src/pages/api/`, JSON in / JSON out, executed server-side in the Firebase Function.

### `POST /api/location/verify`

- **Body:** `{ slug: string, passcode: string }`
- **Logic:** Lookup by `Slug`, constant-time compare, fetch active employees. Rate-limited.
- **Returns (200):** `{ location: { id, name, slug }, employees: [{ id, name, externalId }] }` + sets `loc_<slug>` cookie.
- **Errors:** `401 invalid_passcode`, `404 unknown_slug`, `429 rate_limited`.

### `POST /api/attendance`

- **Requires:** valid `loc_<slug>` cookie matching `body.slug`.
- **Body:**
  ```ts
  {
    slug: string,
    month: "YYYY-MM",
    submittedBy: string,
    entries: Array<{
      employeeId: string,
      totalHours: number,
      commissionableHours: number,
      overtimeHours: number,
      annualLeaveDays: number,
      sickLeaveDays: number,
      notes?: string,
    }>
  }
  ```
- **Logic (per entry):** query Attendance for existing row with `Employee = employeeId` AND `Month = <YYYY-MM-01>`. If found → `pages.update`; else → `pages.create`. Sets title `"YYYY-MM — <employee name>"`, `Location`, `Submitted by`.
- **Validation:** non-negative numbers; additional business rules TBD (to be pinned down during implementation after seeing real data).
- **Returns:** `{ created: number, updated: number, failed: Array<{ employeeId, error }> }`. Partial failures do **not** roll back — UI surfaces failed rows for retry.

### `POST /api/admin/verify`

- **Body:** `{ passcode: string }` → compares to `ADMIN_PASSCODE` → sets `admin` cookie (12h).

### `GET /api/admin/report?month=YYYY-MM&location=<id|all>`

- **Requires:** valid `admin` cookie.
- **Returns:** flattened rows ready for table rendering or CSV export:
  ```ts
  {
    month: "YYYY-MM",
    rows: Array<{
      locationId, locationName,
      employeeId, employeeName,
      totalHours, commissionableHours, overtimeHours,
      annualLeaveDays, sickLeaveDays,
      notes, submittedBy, submittedAt,
    }>,
    missingLocations: Array<{ id, name }>  // active locations with zero rows this month
  }
  ```

### `GET /api/admin/locations`

- Returns `[{ id, name, slug }]` for active locations, used by the admin filter dropdown.

## Admin Report & CSV Export

- `/admin` screen controls: **Month** (picker, defaults to previous month), **Location** (All / active locations), **View** (toggle: *Aggregated* / *By location*).
- **Aggregated view:** flat table, one row per employee.
- **By-location view:** grouped with a sub-header per location and a per-location subtotal row (sum of numeric columns).
- **Missing submissions banner** at the top listing active locations with zero Attendance rows for the chosen month.
- **Download CSV** button generates client-side from the JSON on screen.
  - Filename: `attendance-<YYYY-MM>-<location-slug-or-all>.csv`.
  - UTF-8 with BOM (Excel opens Slovak characters correctly).
  - Headers English only; Slovak translations remain in the UI, not in the file.

## Bilingual Labels (EN / SK)

App chrome (buttons, nav, errors) stays English. Domain labels (field names, leave types, column headers) render bilingually on-page.

Single dictionary at `src/i18n/labels.ts`:

```ts
export const L = {
  totalHours:          { en: "Total hours",          sk: "Celkové hodiny" },
  commissionableHours: { en: "Commissionable hours", sk: "Hodiny na províziu" },
  overtimeHours:       { en: "Overtime hours",       sk: "Nadčasové hodiny" },
  annualLeaveDays:     { en: "Annual leave (days)",  sk: "Dovolenka (dni)" },
  sickLeaveDays:       { en: "Sick leave (days)",    sk: "PN (dni)" },
  notes:               { en: "Notes",                sk: "Poznámky" },
  employee:            { en: "Employee",             sk: "Zamestnanec" },
  location:            { en: "Location",             sk: "Lokalita" },
  month:               { en: "Month",                sk: "Mesiac" },
  submittedBy:         { en: "Submitted by",         sk: "Odoslal" },
  submittedAt:         { en: "Submitted at",         sk: "Odoslané" },
} as const;
```

A `<BilingualLabel>` component renders `EN` on top (normal weight) and `SK` below (lighter / smaller). In tight spots (e.g. table headers) it falls back to `EN / SK` inline.

## Config, Secrets & Deployment

### Environment variables (Firebase Functions secrets)

| Name | Purpose |
|---|---|
| `NOTION_TOKEN` | Internal integration secret (`secret_…`) |
| `NOTION_DB_LOCATIONS` | Locations database ID |
| `NOTION_DB_EMPLOYEES` | Employees / Candidates database ID |
| `NOTION_DB_ATTENDANCE` | Attendance database ID |
| `ADMIN_PASSCODE` | Single shared admin passcode |
| `SESSION_SECRET` | 32 random bytes; signs session JWTs |

Local dev uses `.env` (gitignored) with the same keys. `.env.example` is committed with placeholder values.

### Deployment

- `firebase deploy --only hosting,functions` deploys static assets + the single Function that backs API routes.
- GitHub Actions workflow mirrors the existing Firebase-deploy workflow in the main repo (Node 22, `npm ci`, `npm run build`, `firebase deploy`).
- **Hosting model:** subdomain of the company's existing WordPress site — e.g. `attendance.spa-company.sk` — via a single DNS record pointing at Firebase Hosting. WordPress is untouched. Firebase auto-provisions the TLS cert.
- Supervisor links use this subdomain: `https://attendance.<company-domain>/attendance/<slug>`.

## Error Handling

- All API endpoints return `{ error: "<code>", message: "<human>" }` on failure.
- Notion errors are caught at the route level, logged with context, and returned to the client as a generic `notion_unavailable`. Raw Notion errors and tokens never reach the browser.
- Supervisor form: on partial submit failure, the UI marks failed rows red and offers a **Retry failed** button so good rows don't have to be re-entered.
- Admin page: if Notion is unreachable, the page still renders controls and shows an inline error banner — no blank white screen.
- Rate-limit counters are per-IP, per-Function-instance, in-memory (sufficient for internal-tool volume). Upgrade path to Firestore-backed counters if we ever see abuse.

## Testing

- **Unit** (Vitest, mocked Notion client): `src/lib/notion.ts` (query builders, upsert logic, month formatting), `src/lib/csv.ts`, `src/lib/session.ts`.
- **Integration** (gated behind env flag, runs against a throwaway Notion test workspace): `verify → fetch employees → submit attendance → read back → admin report sees it`.
- **Manual smoke checklist** (in `docs/smoke.md` of the new repo):
  - Supervisor happy path (fresh submit, all fields).
  - Wrong passcode → clear 401, rate limit kicks in after 5 attempts.
  - Re-submit same month → existing rows updated (no duplicates in Notion).
  - Admin aggregated view with "All locations" + specific location filter.
  - By-location view shows subtotals.
  - CSV opens in Excel with Slovak characters intact.
  - Missing submissions banner lists locations with zero rows.

## Open Items (post-spec)

- **Validation rules** for numeric fields (e.g. `commissionable ≤ total`, leave-day upper bounds) — to be decided after seeing the first real submission.
- **DNS record** — the user will add the Firebase-provided record at the domain registrar when deployment is ready.
- **Notion DB IDs** — user to copy from each DB's `•••` → Copy link, extract the 32-char ID, and set as env vars.
- **GitHub Actions workflow** — cloned and adapted from the existing `spa-company` deploy workflow during implementation.
