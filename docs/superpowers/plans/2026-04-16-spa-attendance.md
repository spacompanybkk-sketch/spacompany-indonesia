# SPA Attendance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an internal Astro + Firebase web app that lets on-site supervisors submit monthly attendance for leased workers (read from Notion), upserts the data back into a Notion Attendance database, and gives company admins an aggregated / per-location report with CSV export.

**Architecture:** Standalone Astro v6 project in SSR mode (`output: "server"`), deployed to **Firebase App Hosting** (supports Astro SSR natively) on a subdomain of the existing WordPress site. Server endpoints (`src/pages/api/…`) are the only code that talks to the Notion API — the token never reaches the browser. Passcode stored per location in Notion; httpOnly signed-JWT cookies keep supervisors "logged in" for 24h. No database of our own.

**Tech Stack:** Astro v6, TypeScript, Tailwind CSS v4, `@notionhq/client`, `jose` (JWT), Vitest, Firebase App Hosting.

**Spec:** `docs/superpowers/specs/2026-04-16-spa-attendance-design.md` (in the `spa-company` repo)

**Project location:** `/Users/michaglio/Projects/spa-attendance/` — a **new standalone repo**, separate from `spa-company`.

---

## File Map

```
/Users/michaglio/Projects/spa-attendance/
├── astro.config.mjs                          # output: "server", node adapter, tailwind vite plugin
├── package.json                              # deps below
├── tsconfig.json                             # strict Astro TS
├── vitest.config.ts                          # vitest with jsdom (only needed for a couple of lib tests)
├── firebase.json                             # hosting config (minimal)
├── apphosting.yaml                           # App Hosting runtime config
├── .firebaserc                               # Firebase project alias
├── .env.example                              # All required env vars, placeholder values
├── .gitignore                                # node_modules, dist, .env, .firebase, .astro
├── README.md                                 # Getting-started + deploy docs
├── docs/
│   └── smoke.md                              # Manual smoke checklist
├── public/
│   └── favicon.svg
├── src/
│   ├── env.d.ts                              # Astro-injected type for import.meta.env
│   ├── styles/global.css                     # @import "tailwindcss";
│   ├── layouts/BaseLayout.astro              # HTML shell + Tailwind + small header
│   ├── i18n/labels.ts                        # EN/SK label dictionary
│   ├── components/
│   │   ├── BilingualLabel.astro              # Renders EN/SK
│   │   ├── PasscodeGate.astro                # Shared passcode form (supervisor + admin)
│   │   ├── SupervisorForm.astro              # Attendance data entry grid
│   │   ├── AdminControls.astro               # Month/location/view filters + CSV button
│   │   ├── AdminTable.astro                  # Aggregated / by-location table
│   │   └── MissingSubmissionsBanner.astro
│   ├── lib/
│   │   ├── notion.ts                         # Typed Notion client + query/upsert helpers
│   │   ├── notion.test.ts                    # Unit tests (mocked SDK)
│   │   ├── session.ts                        # JWT sign/verify + cookie helpers
│   │   ├── session.test.ts
│   │   ├── rateLimit.ts                      # In-memory per-IP limiter
│   │   ├── rateLimit.test.ts
│   │   ├── csv.ts                            # CSV serializer (UTF-8 BOM)
│   │   ├── csv.test.ts
│   │   └── month.ts                          # "YYYY-MM" helpers, previous month, days-in-month
│   └── pages/
│       ├── index.astro                       # Landing page
│       ├── attendance/[slug].astro           # Supervisor form
│       ├── admin.astro                       # Admin report UI
│       └── api/
│           ├── location/verify.ts            # POST
│           ├── attendance.ts                 # POST
│           ├── admin/verify.ts               # POST
│           ├── admin/locations.ts            # GET
│           └── admin/report.ts               # GET
├── .github/
│   └── workflows/
│       └── deploy.yml                        # Firebase App Hosting auto-deploy on push to main
```

---

### Task 1: Project Scaffold

**Files:**
- Create: `/Users/michaglio/Projects/spa-attendance/package.json`
- Create: `/Users/michaglio/Projects/spa-attendance/astro.config.mjs`
- Create: `/Users/michaglio/Projects/spa-attendance/tsconfig.json`
- Create: `/Users/michaglio/Projects/spa-attendance/.gitignore`
- Create: `/Users/michaglio/Projects/spa-attendance/.env.example`
- Create: `/Users/michaglio/Projects/spa-attendance/src/env.d.ts`
- Create: `/Users/michaglio/Projects/spa-attendance/src/styles/global.css`
- Create: `/Users/michaglio/Projects/spa-attendance/public/favicon.svg`

- [ ] **Step 1: Create project directory and initialize git + npm**

```bash
mkdir -p /Users/michaglio/Projects/spa-attendance
cd /Users/michaglio/Projects/spa-attendance
git init
npm init -y
```

- [ ] **Step 2: Replace the generated `package.json` with our base**

Overwrite `package.json` with exactly this (deps come in Step 3 via `npm install`):

```json
{
  "name": "spa-attendance",
  "type": "module",
  "version": "0.0.1",
  "private": true,
  "engines": { "node": ">=22.12.0" },
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "start": "node ./dist/server/entry.mjs",
    "astro": "astro",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 3: Install dependencies**

```bash
cd /Users/michaglio/Projects/spa-attendance
npm install astro@^6 @astrojs/node@^9 @notionhq/client@^3 jose@^5
npm install -D typescript@^5 @types/node@^22 tailwindcss@^4 @tailwindcss/vite@^4 vitest@^2 @vitest/ui@^2
```

Expected: `package.json` now has both the scripts block from Step 2 and a `dependencies` + `devDependencies` block added by npm.

- [ ] **Step 4: Write `astro.config.mjs`**

```js
// @ts-check
import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  vite: { plugins: [tailwindcss()] },
});
```

- [ ] **Step 5: Write `tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"]
}
```

- [ ] **Step 6: Write `src/env.d.ts`**

```ts
/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  readonly NOTION_TOKEN: string;
  readonly NOTION_DB_LOCATIONS: string;
  readonly NOTION_DB_EMPLOYEES: string;
  readonly NOTION_DB_ATTENDANCE: string;
  readonly ADMIN_PASSCODE: string;
  readonly SESSION_SECRET: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

- [ ] **Step 7: Write `src/styles/global.css`**

```css
@import "tailwindcss";
```

- [ ] **Step 8: Write `public/favicon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#0f766e"/><text x="32" y="42" font-family="system-ui" font-size="32" font-weight="700" fill="#fff" text-anchor="middle">A</text></svg>
```

- [ ] **Step 9: Write `.gitignore`**

```
node_modules/
dist/
.astro/
.env
.env.local
.firebase/
.DS_Store
*.log
```

- [ ] **Step 10: Write `.env.example`**

```
# Notion
NOTION_TOKEN=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_DB_LOCATIONS=00000000000000000000000000000000
NOTION_DB_EMPLOYEES=00000000000000000000000000000000
NOTION_DB_ATTENDANCE=00000000000000000000000000000000

# Admin access
ADMIN_PASSCODE=change-me

# Signs session JWTs (run: openssl rand -hex 32)
SESSION_SECRET=00000000000000000000000000000000000000000000000000000000000000
```

- [ ] **Step 11: Verify it builds**

Run:
```bash
cd /Users/michaglio/Projects/spa-attendance
npx astro check || true
npm run build
```
Expected: Build succeeds and prints `✓ built in …`. (No pages yet, so the build output will be tiny — that's fine.)

- [ ] **Step 12: Commit**

```bash
cd /Users/michaglio/Projects/spa-attendance
git add .
git commit -m "chore: scaffold Astro + Firebase attendance project"
```

---

### Task 2: Base Layout

**Files:**
- Create: `/Users/michaglio/Projects/spa-attendance/src/layouts/BaseLayout.astro`

- [ ] **Step 1: Write `BaseLayout.astro`**

```astro
---
import "../styles/global.css";

interface Props {
  title: string;
}
const { title } = Astro.props;
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <title>{title}</title>
  </head>
  <body class="min-h-screen bg-slate-50 text-slate-900 antialiased">
    <header class="border-b border-slate-200 bg-white">
      <div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <a href="/" class="text-sm font-semibold text-teal-700">SPA Attendance</a>
        <span class="text-xs text-slate-500">Internal tool</span>
      </div>
    </header>
    <main class="mx-auto max-w-5xl px-4 py-8"><slot /></main>
  </body>
</html>
```

- [ ] **Step 2: Commit**

```bash
cd /Users/michaglio/Projects/spa-attendance
git add src/layouts/BaseLayout.astro
git commit -m "feat: add base layout"
```

---

### Task 3: Bilingual Labels Dictionary + Component

**Files:**
- Create: `/Users/michaglio/Projects/spa-attendance/src/i18n/labels.ts`
- Create: `/Users/michaglio/Projects/spa-attendance/src/components/BilingualLabel.astro`

- [ ] **Step 1: Write `src/i18n/labels.ts`**

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

export type LabelKey = keyof typeof L;
```

- [ ] **Step 2: Write `src/components/BilingualLabel.astro`**

```astro
---
import { L, type LabelKey } from "../i18n/labels";

interface Props {
  labelKey: LabelKey;
  inline?: boolean;
  class?: string;
}
const { labelKey, inline = false, class: className = "" } = Astro.props;
const { en, sk } = L[labelKey];
---
{inline ? (
  <span class={className}>{en} <span class="text-slate-400">/ {sk}</span></span>
) : (
  <span class={`flex flex-col leading-tight ${className}`}>
    <span class="font-medium">{en}</span>
    <span class="text-xs text-slate-500">{sk}</span>
  </span>
)}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/michaglio/Projects/spa-attendance
git add src/i18n src/components/BilingualLabel.astro
git commit -m "feat: add bilingual EN/SK label dictionary and component"
```

---

### Task 4: Month helpers (TDD)

Tiny, pure utility module. Worth unit-testing because the whole app pivots on month math.

**Files:**
- Create: `/Users/michaglio/Projects/spa-attendance/vitest.config.ts`
- Create: `/Users/michaglio/Projects/spa-attendance/src/lib/month.ts`
- Create: `/Users/michaglio/Projects/spa-attendance/src/lib/month.test.ts`

- [ ] **Step 1: Write `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 2: Write the failing tests in `src/lib/month.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { toMonthKey, previousMonth, monthStartIso, isValidMonthKey } from "./month";

describe("month helpers", () => {
  it("toMonthKey formats a Date as YYYY-MM (UTC)", () => {
    expect(toMonthKey(new Date("2026-04-16T12:00:00Z"))).toBe("2026-04");
    expect(toMonthKey(new Date("2026-01-01T00:00:00Z"))).toBe("2026-01");
  });

  it("previousMonth returns the prior month key", () => {
    expect(previousMonth("2026-04")).toBe("2026-03");
    expect(previousMonth("2026-01")).toBe("2025-12");
  });

  it("monthStartIso returns YYYY-MM-01", () => {
    expect(monthStartIso("2026-04")).toBe("2026-04-01");
  });

  it("isValidMonthKey validates format and range", () => {
    expect(isValidMonthKey("2026-04")).toBe(true);
    expect(isValidMonthKey("2026-13")).toBe(false);
    expect(isValidMonthKey("2026-00")).toBe(false);
    expect(isValidMonthKey("26-04")).toBe(false);
    expect(isValidMonthKey("2026-4")).toBe(false);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd /Users/michaglio/Projects/spa-attendance
npm test -- src/lib/month.test.ts
```
Expected: FAIL — `Failed to resolve import "./month"`.

- [ ] **Step 4: Write `src/lib/month.ts`**

```ts
export type MonthKey = string; // "YYYY-MM"

export function toMonthKey(d: Date): MonthKey {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function previousMonth(mk: MonthKey): MonthKey {
  const [y, m] = mk.split("-").map(Number);
  const prevM = m === 1 ? 12 : m - 1;
  const prevY = m === 1 ? y - 1 : y;
  return `${prevY}-${String(prevM).padStart(2, "0")}`;
}

export function monthStartIso(mk: MonthKey): string {
  return `${mk}-01`;
}

export function isValidMonthKey(s: string): s is MonthKey {
  if (!/^\d{4}-\d{2}$/.test(s)) return false;
  const m = Number(s.slice(5));
  return m >= 1 && m <= 12;
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd /Users/michaglio/Projects/spa-attendance
npm test -- src/lib/month.test.ts
```
Expected: PASS (4 passed).

- [ ] **Step 6: Commit**

```bash
cd /Users/michaglio/Projects/spa-attendance
git add vitest.config.ts src/lib/month.ts src/lib/month.test.ts
git commit -m "feat: add month key helpers with tests"
```

---

### Task 5: Session JWT + Cookie helpers (TDD)

**Files:**
- Create: `/Users/michaglio/Projects/spa-attendance/src/lib/session.ts`
- Create: `/Users/michaglio/Projects/spa-attendance/src/lib/session.test.ts`

- [ ] **Step 1: Write failing tests in `src/lib/session.test.ts`**

```ts
import { describe, it, expect, beforeAll } from "vitest";
import { signSession, verifySession, buildCookie, readCookie } from "./session";

const SECRET = "0".repeat(64);

describe("session", () => {
  it("sign and verify a valid payload round-trips", async () => {
    const token = await signSession({ kind: "loc", slug: "hotel-xyz", locationId: "abc" }, SECRET, 60);
    const payload = await verifySession<{ kind: "loc"; slug: string; locationId: string }>(token, SECRET);
    expect(payload.kind).toBe("loc");
    expect(payload.slug).toBe("hotel-xyz");
    expect(payload.locationId).toBe("abc");
  });

  it("rejects a token with a bad signature", async () => {
    const token = await signSession({ kind: "admin" }, SECRET, 60);
    await expect(verifySession(token, "ff".repeat(32))).rejects.toThrow();
  });

  it("rejects an expired token", async () => {
    const token = await signSession({ kind: "admin" }, SECRET, -1);
    await expect(verifySession(token, SECRET)).rejects.toThrow();
  });

  it("buildCookie produces an httpOnly secure cookie string", () => {
    const cookie = buildCookie("loc_hotel-xyz", "abc.def.ghi", 3600);
    expect(cookie).toContain("loc_hotel-xyz=abc.def.ghi");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Path=/");
    expect(cookie).toMatch(/Max-Age=3600/);
  });

  it("readCookie extracts a value by name", () => {
    expect(readCookie("a=1; loc_xyz=abc.def; other=2", "loc_xyz")).toBe("abc.def");
    expect(readCookie("", "loc_xyz")).toBeNull();
    expect(readCookie("loc_xyz=abc.def", "missing")).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
cd /Users/michaglio/Projects/spa-attendance
npm test -- src/lib/session.test.ts
```
Expected: FAIL — missing module.

- [ ] **Step 3: Write `src/lib/session.ts`**

```ts
import { SignJWT, jwtVerify } from "jose";

function secretKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function signSession(
  payload: Record<string, unknown>,
  secret: string,
  ttlSeconds: number,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + ttlSeconds)
    .sign(secretKey(secret));
}

export async function verifySession<T extends Record<string, unknown>>(
  token: string,
  secret: string,
): Promise<T> {
  const { payload } = await jwtVerify(token, secretKey(secret), { algorithms: ["HS256"] });
  return payload as T;
}

export function buildCookie(name: string, value: string, maxAgeSeconds: number): string {
  return [
    `${name}=${value}`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${maxAgeSeconds}`,
  ].join("; ");
}

export function expiredCookie(name: string): string {
  return `${name}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

export function readCookie(header: string, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return null;
}
```

- [ ] **Step 4: Run tests to verify PASS**

```bash
cd /Users/michaglio/Projects/spa-attendance
npm test -- src/lib/session.test.ts
```
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
cd /Users/michaglio/Projects/spa-attendance
git add src/lib/session.ts src/lib/session.test.ts
git commit -m "feat: add JWT session and cookie helpers with tests"
```

---

### Task 6: Rate Limiter (TDD)

**Files:**
- Create: `/Users/michaglio/Projects/spa-attendance/src/lib/rateLimit.ts`
- Create: `/Users/michaglio/Projects/spa-attendance/src/lib/rateLimit.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRateLimiter } from "./rateLimit";

describe("rateLimiter", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("allows up to N requests in the window", () => {
    const rl = createRateLimiter({ max: 3, windowMs: 60_000 });
    expect(rl.hit("1.2.3.4")).toBe(true);
    expect(rl.hit("1.2.3.4")).toBe(true);
    expect(rl.hit("1.2.3.4")).toBe(true);
    expect(rl.hit("1.2.3.4")).toBe(false);
  });

  it("tracks different keys independently", () => {
    const rl = createRateLimiter({ max: 1, windowMs: 60_000 });
    expect(rl.hit("a")).toBe(true);
    expect(rl.hit("b")).toBe(true);
    expect(rl.hit("a")).toBe(false);
  });

  it("resets after the window passes", () => {
    const rl = createRateLimiter({ max: 1, windowMs: 60_000 });
    expect(rl.hit("a")).toBe(true);
    expect(rl.hit("a")).toBe(false);
    vi.advanceTimersByTime(60_001);
    expect(rl.hit("a")).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
cd /Users/michaglio/Projects/spa-attendance
npm test -- src/lib/rateLimit.test.ts
```
Expected: FAIL.

- [ ] **Step 3: Write `src/lib/rateLimit.ts`**

```ts
interface Bucket {
  count: number;
  resetAt: number;
}

export interface RateLimiter {
  hit(key: string): boolean; // true = allowed, false = blocked
}

export function createRateLimiter(opts: { max: number; windowMs: number }): RateLimiter {
  const buckets = new Map<string, Bucket>();
  return {
    hit(key) {
      const now = Date.now();
      const b = buckets.get(key);
      if (!b || now >= b.resetAt) {
        buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
        return true;
      }
      if (b.count >= opts.max) return false;
      b.count += 1;
      return true;
    },
  };
}

// Shared limiters for the app. 5 passcode attempts per IP per minute.
export const passcodeLimiter = createRateLimiter({ max: 5, windowMs: 60_000 });
```

- [ ] **Step 4: Run tests — PASS**

```bash
cd /Users/michaglio/Projects/spa-attendance
npm test -- src/lib/rateLimit.test.ts
```

- [ ] **Step 5: Commit**

```bash
cd /Users/michaglio/Projects/spa-attendance
git add src/lib/rateLimit.ts src/lib/rateLimit.test.ts
git commit -m "feat: add in-memory per-IP rate limiter with tests"
```

---

### Task 7: CSV Helper (TDD)

**Files:**
- Create: `/Users/michaglio/Projects/spa-attendance/src/lib/csv.ts`
- Create: `/Users/michaglio/Projects/spa-attendance/src/lib/csv.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  it("writes a UTF-8 BOM header", () => {
    const out = toCsv(["a"], [{ a: "1" }]);
    expect(out.charCodeAt(0)).toBe(0xfeff);
  });

  it("emits header row and data rows in column order", () => {
    const out = toCsv(["name", "hours"], [
      { name: "John", hours: 40 },
      { name: "Jane", hours: 36.5 },
    ]);
    const lines = out.slice(1).split("\n");
    expect(lines[0]).toBe("name,hours");
    expect(lines[1]).toBe("John,40");
    expect(lines[2]).toBe("Jane,36.5");
  });

  it("quotes values containing commas, quotes, or newlines", () => {
    const out = toCsv(["a"], [
      { a: "hello, world" },
      { a: 'she said "hi"' },
      { a: "line1\nline2" },
    ]);
    const lines = out.slice(1).split("\n");
    expect(lines[1]).toBe('"hello, world"');
    expect(lines[2]).toBe('"she said ""hi"""');
    expect(lines[3]).toBe('"line1\nline2"');
  });

  it("renders null/undefined as empty", () => {
    const out = toCsv(["a", "b"], [{ a: null, b: undefined }]);
    expect(out.slice(1).split("\n")[1]).toBe(",");
  });
});
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Write `src/lib/csv.ts`**

```ts
type Row = Record<string, unknown>;

function escape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(columns: string[], rows: Row[]): string {
  const header = columns.join(",");
  const body = rows.map((r) => columns.map((c) => escape(r[c])).join(",")).join("\n");
  return "\uFEFF" + header + "\n" + body;
}
```

- [ ] **Step 4: Run — PASS**

- [ ] **Step 5: Commit**

```bash
cd /Users/michaglio/Projects/spa-attendance
git add src/lib/csv.ts src/lib/csv.test.ts
git commit -m "feat: add CSV serializer with UTF-8 BOM and tests"
```

---

### Task 8: Notion Client Wrapper (TDD)

The trickiest library module — typed helpers around the Notion SDK. We inject a minimal client interface so tests can use a fake without depending on network.

**Files:**
- Create: `/Users/michaglio/Projects/spa-attendance/src/lib/notion.ts`
- Create: `/Users/michaglio/Projects/spa-attendance/src/lib/notion.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect, vi } from "vitest";
import { createNotionRepo, type NotionLike } from "./notion";

function fakeClient(): NotionLike & {
  query: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
} {
  const query = vi.fn();
  const create = vi.fn();
  const update = vi.fn();
  return {
    query,
    create,
    update,
    databases: { query: (args: unknown) => query(args) },
    pages: {
      create: (args: unknown) => create(args),
      update: (args: unknown) => update(args),
    },
  } as never;
}

const DBS = { locations: "L", employees: "E", attendance: "A" };

describe("notion repo", () => {
  it("findLocationBySlug returns null when no match", async () => {
    const c = fakeClient();
    c.query.mockResolvedValue({ results: [] });
    const repo = createNotionRepo(c, DBS);
    expect(await repo.findLocationBySlug("x")).toBeNull();
  });

  it("findLocationBySlug returns the first active match", async () => {
    const c = fakeClient();
    c.query.mockResolvedValue({
      results: [{
        id: "loc-1",
        properties: {
          Name: { title: [{ plain_text: "Hotel X" }] },
          Slug: { rich_text: [{ plain_text: "hotel-x" }] },
          Passcode: { rich_text: [{ plain_text: "ABC123" }] },
          Active: { checkbox: true },
        },
      }],
    });
    const repo = createNotionRepo(c, DBS);
    const loc = await repo.findLocationBySlug("hotel-x");
    expect(loc).toEqual({ id: "loc-1", name: "Hotel X", slug: "hotel-x", passcode: "ABC123" });
  });

  it("listEmployeesForLocation returns active employees only", async () => {
    const c = fakeClient();
    c.query.mockResolvedValue({
      results: [
        { id: "e1", properties: {
            Name: { title: [{ plain_text: "John Doe" }] },
            "External ID": { rich_text: [{ plain_text: "JD-01" }] },
        } },
      ],
    });
    const repo = createNotionRepo(c, DBS);
    const out = await repo.listEmployeesForLocation("loc-1");
    expect(out).toEqual([{ id: "e1", name: "John Doe", externalId: "JD-01" }]);
    // Verify we filtered by location + active
    const filter = c.query.mock.calls[0][0].filter;
    expect(JSON.stringify(filter)).toContain("loc-1");
  });

  it("upsertAttendance creates a new row when none exists", async () => {
    const c = fakeClient();
    c.query.mockResolvedValue({ results: [] });
    c.create.mockResolvedValue({ id: "new" });
    const repo = createNotionRepo(c, DBS);
    const res = await repo.upsertAttendance({
      employeeId: "e1", employeeName: "John Doe", locationId: "loc-1",
      month: "2026-04", submittedBy: "Anna",
      totalHours: 160, commissionableHours: 80,
      overtimeHours: 4, annualLeaveDays: 2, sickLeaveDays: 0,
      notes: "",
    });
    expect(res).toBe("created");
    expect(c.create).toHaveBeenCalledOnce();
    expect(c.update).not.toHaveBeenCalled();
  });

  it("upsertAttendance updates an existing row", async () => {
    const c = fakeClient();
    c.query.mockResolvedValue({ results: [{ id: "existing" }] });
    c.update.mockResolvedValue({ id: "existing" });
    const repo = createNotionRepo(c, DBS);
    const res = await repo.upsertAttendance({
      employeeId: "e1", employeeName: "John Doe", locationId: "loc-1",
      month: "2026-04", submittedBy: "Anna",
      totalHours: 160, commissionableHours: 80,
      overtimeHours: 4, annualLeaveDays: 2, sickLeaveDays: 0,
      notes: "",
    });
    expect(res).toBe("updated");
    expect(c.update).toHaveBeenCalledWith(expect.objectContaining({ page_id: "existing" }));
  });

  it("listAttendanceForMonth flattens rows", async () => {
    const c = fakeClient();
    c.query.mockResolvedValue({
      results: [{
        id: "a1",
        created_time: "2026-04-16T10:00:00Z",
        properties: {
          Employee: { relation: [{ id: "e1" }] },
          Location: { relation: [{ id: "loc-1" }] },
          "Total hours": { number: 160 },
          "Commissionable hours": { number: 80 },
          "Overtime hours": { number: 4 },
          "Annual leave (days)": { number: 2 },
          "Sick leave (days)": { number: 0 },
          Notes: { rich_text: [{ plain_text: "ok" }] },
          "Submitted by": { rich_text: [{ plain_text: "Anna" }] },
        },
      }],
    });
    const repo = createNotionRepo(c, DBS);
    const rows = await repo.listAttendanceForMonth("2026-04");
    expect(rows).toEqual([{
      employeeId: "e1", locationId: "loc-1",
      totalHours: 160, commissionableHours: 80, overtimeHours: 4,
      annualLeaveDays: 2, sickLeaveDays: 0,
      notes: "ok", submittedBy: "Anna", submittedAt: "2026-04-16T10:00:00Z",
    }]);
  });
});
```

- [ ] **Step 2: Run — FAIL**

```bash
cd /Users/michaglio/Projects/spa-attendance
npm test -- src/lib/notion.test.ts
```

- [ ] **Step 3: Write `src/lib/notion.ts`**

```ts
import { Client } from "@notionhq/client";

export interface Location {
  id: string;
  name: string;
  slug: string;
  passcode: string;
}

export interface Employee {
  id: string;
  name: string;
  externalId: string;
}

export interface AttendanceEntry {
  employeeId: string;
  employeeName: string;
  locationId: string;
  month: string;          // YYYY-MM
  submittedBy: string;
  totalHours: number;
  commissionableHours: number;
  overtimeHours: number;
  annualLeaveDays: number;
  sickLeaveDays: number;
  notes: string;
}

export interface AttendanceRow {
  employeeId: string;
  locationId: string;
  totalHours: number;
  commissionableHours: number;
  overtimeHours: number;
  annualLeaveDays: number;
  sickLeaveDays: number;
  notes: string;
  submittedBy: string;
  submittedAt: string;
}

export interface NotionLike {
  databases: { query: (args: unknown) => Promise<any> };
  pages: {
    create: (args: unknown) => Promise<any>;
    update: (args: unknown) => Promise<any>;
  };
}

export interface DbIds {
  locations: string;
  employees: string;
  attendance: string;
}

// ------- helpers -------
const text = (p: any): string =>
  (p?.rich_text?.[0]?.plain_text ?? p?.title?.[0]?.plain_text ?? "") as string;
const num = (p: any): number => (typeof p?.number === "number" ? p.number : 0);
const rel = (p: any): string[] => (p?.relation ?? []).map((r: any) => r.id);

export function createNotionClient(token: string): NotionLike {
  return new Client({ auth: token }) as unknown as NotionLike;
}

export function createNotionRepo(client: NotionLike, dbs: DbIds) {
  async function findLocationBySlug(slug: string): Promise<Location | null> {
    const { results } = await client.databases.query({
      database_id: dbs.locations,
      filter: {
        and: [
          { property: "Slug", rich_text: { equals: slug } },
          { property: "Active", checkbox: { equals: true } },
        ],
      },
      page_size: 1,
    });
    const r = results[0];
    if (!r) return null;
    return {
      id: r.id,
      name: text(r.properties.Name),
      slug: text(r.properties.Slug),
      passcode: text(r.properties.Passcode),
    };
  }

  async function listActiveLocations(): Promise<Array<Pick<Location, "id" | "name" | "slug">>> {
    const { results } = await client.databases.query({
      database_id: dbs.locations,
      filter: { property: "Active", checkbox: { equals: true } },
      sorts: [{ property: "Name", direction: "ascending" }],
      page_size: 100,
    });
    return results.map((r: any) => ({
      id: r.id,
      name: text(r.properties.Name),
      slug: text(r.properties.Slug),
    }));
  }

  async function listEmployeesForLocation(locationId: string): Promise<Employee[]> {
    const { results } = await client.databases.query({
      database_id: dbs.employees,
      filter: {
        and: [
          { property: "Location", relation: { contains: locationId } },
          { property: "Active", checkbox: { equals: true } },
        ],
      },
      sorts: [{ property: "Name", direction: "ascending" }],
      page_size: 100,
    });
    return results.map((r: any) => ({
      id: r.id,
      name: text(r.properties.Name),
      externalId: text(r.properties["External ID"]),
    }));
  }

  async function findAttendancePage(employeeId: string, month: string): Promise<string | null> {
    const { results } = await client.databases.query({
      database_id: dbs.attendance,
      filter: {
        and: [
          { property: "Employee", relation: { contains: employeeId } },
          { property: "Month", date: { equals: `${month}-01` } },
        ],
      },
      page_size: 1,
    });
    return results[0]?.id ?? null;
  }

  function buildAttendanceProps(e: AttendanceEntry) {
    return {
      Name: { title: [{ text: { content: `${e.month} — ${e.employeeName}` } }] },
      Employee: { relation: [{ id: e.employeeId }] },
      Location: { relation: [{ id: e.locationId }] },
      Month: { date: { start: `${e.month}-01` } },
      "Total hours": { number: e.totalHours },
      "Commissionable hours": { number: e.commissionableHours },
      "Overtime hours": { number: e.overtimeHours },
      "Annual leave (days)": { number: e.annualLeaveDays },
      "Sick leave (days)": { number: e.sickLeaveDays },
      Notes: { rich_text: [{ text: { content: e.notes } }] },
      "Submitted by": { rich_text: [{ text: { content: e.submittedBy } }] },
    };
  }

  async function upsertAttendance(e: AttendanceEntry): Promise<"created" | "updated"> {
    const existing = await findAttendancePage(e.employeeId, e.month);
    const properties = buildAttendanceProps(e);
    if (existing) {
      await client.pages.update({ page_id: existing, properties });
      return "updated";
    }
    await client.pages.create({ parent: { database_id: dbs.attendance }, properties });
    return "created";
  }

  async function listAttendanceForMonth(
    month: string,
    locationId?: string,
  ): Promise<AttendanceRow[]> {
    const filter: any = {
      and: [{ property: "Month", date: { equals: `${month}-01` } }],
    };
    if (locationId) {
      filter.and.push({ property: "Location", relation: { contains: locationId } });
    }
    const { results } = await client.databases.query({
      database_id: dbs.attendance,
      filter,
      page_size: 100,
    });
    return results.map((r: any) => ({
      employeeId: rel(r.properties.Employee)[0] ?? "",
      locationId: rel(r.properties.Location)[0] ?? "",
      totalHours: num(r.properties["Total hours"]),
      commissionableHours: num(r.properties["Commissionable hours"]),
      overtimeHours: num(r.properties["Overtime hours"]),
      annualLeaveDays: num(r.properties["Annual leave (days)"]),
      sickLeaveDays: num(r.properties["Sick leave (days)"]),
      notes: text(r.properties.Notes),
      submittedBy: text(r.properties["Submitted by"]),
      submittedAt: r.created_time,
    }));
  }

  return {
    findLocationBySlug,
    listActiveLocations,
    listEmployeesForLocation,
    upsertAttendance,
    listAttendanceForMonth,
  };
}

export type NotionRepo = ReturnType<typeof createNotionRepo>;
```

- [ ] **Step 4: Run — PASS (6 tests)**

```bash
cd /Users/michaglio/Projects/spa-attendance
npm test -- src/lib/notion.test.ts
```

- [ ] **Step 5: Commit**

```bash
cd /Users/michaglio/Projects/spa-attendance
git add src/lib/notion.ts src/lib/notion.test.ts
git commit -m "feat: add typed Notion repo with upsert and unit tests"
```

---

### Task 9: API — `POST /api/location/verify`

**Files:**
- Create: `/Users/michaglio/Projects/spa-attendance/src/pages/api/location/verify.ts`

- [ ] **Step 1: Write the endpoint**

```ts
import type { APIRoute } from "astro";
import { createNotionClient, createNotionRepo } from "../../../lib/notion";
import { buildCookie, signSession } from "../../../lib/session";
import { passcodeLimiter } from "../../../lib/rateLimit";

export const prerender = false;

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const ip = clientAddress || "unknown";
  if (!passcodeLimiter.hit(ip)) {
    return json(429, { error: "rate_limited", message: "Too many attempts. Try again in a minute." });
  }

  let body: { slug?: string; passcode?: string };
  try { body = await request.json(); } catch { return json(400, { error: "bad_request", message: "Invalid JSON" }); }
  const slug = (body.slug ?? "").trim();
  const passcode = (body.passcode ?? "").trim();
  if (!slug || !passcode) return json(400, { error: "bad_request", message: "Missing slug or passcode" });

  try {
    const repo = createNotionRepo(
      createNotionClient(import.meta.env.NOTION_TOKEN),
      {
        locations: import.meta.env.NOTION_DB_LOCATIONS,
        employees: import.meta.env.NOTION_DB_EMPLOYEES,
        attendance: import.meta.env.NOTION_DB_ATTENDANCE,
      },
    );
    const location = await repo.findLocationBySlug(slug);
    if (!location) return json(404, { error: "unknown_slug", message: "Location not found" });
    if (!timingSafeEqual(location.passcode, passcode)) {
      return json(401, { error: "invalid_passcode", message: "Wrong passcode" });
    }
    const employees = await repo.listEmployeesForLocation(location.id);
    const token = await signSession(
      { kind: "loc", locationId: location.id, slug: location.slug },
      import.meta.env.SESSION_SECRET,
      60 * 60 * 24, // 24h
    );
    return new Response(
      JSON.stringify({
        location: { id: location.id, name: location.name, slug: location.slug },
        employees,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": buildCookie(`loc_${location.slug}`, token, 60 * 60 * 24),
        },
      },
    );
  } catch (err) {
    console.error("verify failed", err);
    return json(502, { error: "notion_unavailable", message: "Notion is unreachable. Please try again." });
  }
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd /Users/michaglio/Projects/spa-attendance
npx astro check
```
Expected: 0 errors. (If astro check complains about missing types for a page, run `npx astro sync` first.)

- [ ] **Step 3: Commit**

```bash
cd /Users/michaglio/Projects/spa-attendance
git add src/pages/api/location/verify.ts
git commit -m "feat: add /api/location/verify endpoint with passcode gate + rate limit"
```

---

### Task 10: Supervisor page — `/attendance/[slug]`

Two stages on the same page: **passcode gate** and **attendance form**. The gate POSTs to `/api/location/verify`; on success the page replaces the gate with the form.

**Files:**
- Create: `/Users/michaglio/Projects/spa-attendance/src/components/PasscodeGate.astro`
- Create: `/Users/michaglio/Projects/spa-attendance/src/components/SupervisorForm.astro`
- Create: `/Users/michaglio/Projects/spa-attendance/src/pages/attendance/[slug].astro`

- [ ] **Step 1: Write `PasscodeGate.astro`**

```astro
---
interface Props {
  heading: string;
  action: string;      // POST endpoint
  extraField?: { name: string; value: string }; // e.g. slug
  formId: string;
}
const { heading, action, extraField, formId } = Astro.props;
---
<section class="mx-auto max-w-sm">
  <h1 class="mb-4 text-xl font-semibold">{heading}</h1>
  <form id={formId} data-action={action} class="space-y-3">
    {extraField && <input type="hidden" name={extraField.name} value={extraField.value} />}
    <label class="block text-sm font-medium">Passcode</label>
    <input name="passcode" type="password" autocomplete="off" required
           class="w-full rounded border border-slate-300 px-3 py-2 focus:border-teal-600 focus:outline-none" />
    <button type="submit"
      class="w-full rounded bg-teal-700 px-3 py-2 font-medium text-white hover:bg-teal-800">
      Continue
    </button>
    <p data-error class="hidden text-sm text-red-600"></p>
  </form>
</section>
```

- [ ] **Step 2: Write `SupervisorForm.astro`**

```astro
---
import BilingualLabel from "./BilingualLabel.astro";
---
<section>
  <div class="mb-6 flex flex-wrap items-end justify-between gap-3">
    <div>
      <h1 class="text-xl font-semibold" data-location-name></h1>
      <p class="text-sm text-slate-500">Monthly attendance</p>
    </div>
    <div class="flex items-end gap-3">
      <label class="flex flex-col text-sm">
        <BilingualLabel labelKey="submittedBy" inline />
        <input name="submittedBy" required
          class="rounded border border-slate-300 px-2 py-1 focus:border-teal-600 focus:outline-none" />
      </label>
      <label class="flex flex-col text-sm">
        <BilingualLabel labelKey="month" inline />
        <input name="month" type="month" required
          class="rounded border border-slate-300 px-2 py-1 focus:border-teal-600 focus:outline-none" />
      </label>
    </div>
  </div>

  <form id="attendance-form" class="overflow-x-auto">
    <table class="min-w-full border-separate border-spacing-0 text-sm">
      <thead class="bg-slate-100 text-left">
        <tr>
          <th class="sticky left-0 z-10 bg-slate-100 px-3 py-2"><BilingualLabel labelKey="employee" inline /></th>
          <th class="px-3 py-2"><BilingualLabel labelKey="totalHours" inline /></th>
          <th class="px-3 py-2"><BilingualLabel labelKey="commissionableHours" inline /></th>
          <th class="px-3 py-2"><BilingualLabel labelKey="overtimeHours" inline /></th>
          <th class="px-3 py-2"><BilingualLabel labelKey="annualLeaveDays" inline /></th>
          <th class="px-3 py-2"><BilingualLabel labelKey="sickLeaveDays" inline /></th>
          <th class="px-3 py-2"><BilingualLabel labelKey="notes" inline /></th>
          <th class="px-3 py-2 w-8"></th>
        </tr>
      </thead>
      <tbody id="rows"></tbody>
    </table>
    <div class="mt-6 flex items-center justify-between">
      <p id="submit-status" class="text-sm text-slate-500"></p>
      <button type="submit"
        class="rounded bg-teal-700 px-4 py-2 font-medium text-white hover:bg-teal-800">
        Submit
      </button>
    </div>
  </form>
</section>
```

- [ ] **Step 3: Write `src/pages/attendance/[slug].astro`**

```astro
---
import BaseLayout from "../../layouts/BaseLayout.astro";
import PasscodeGate from "../../components/PasscodeGate.astro";
import SupervisorForm from "../../components/SupervisorForm.astro";

export const prerender = false;
const { slug } = Astro.params;
---
<BaseLayout title={`Attendance — ${slug}`}>
  <div id="gate">
    <PasscodeGate
      heading="Attendance access"
      action="/api/location/verify"
      extraField={{ name: "slug", value: slug! }}
      formId="gate-form"
    />
  </div>
  <div id="form-view" class="hidden">
    <SupervisorForm />
  </div>
</BaseLayout>

<script is:inline define:vars={{ slug }}>
(() => {
  const gate = document.getElementById("gate");
  const formView = document.getElementById("form-view");
  const gateForm = document.getElementById("gate-form");
  const errorEl = gateForm.querySelector("[data-error]");
  const rowsEl = document.getElementById("rows");
  const nameEl = document.querySelector("[data-location-name]");
  const monthInput = document.querySelector('input[name="month"]');
  const submittedByInput = document.querySelector('input[name="submittedBy"]');
  const attForm = document.getElementById("attendance-form");
  const statusEl = document.getElementById("submit-status");

  // Default month = previous month (YYYY-MM)
  const now = new Date();
  const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  monthInput.value = `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, "0")}`;

  let employees = [];

  gateForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.classList.add("hidden");
    const passcode = gateForm.passcode.value;
    const res = await fetch("/api/location/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, passcode }),
    });
    if (!res.ok) {
      const { message } = await res.json().catch(() => ({ message: "Error" }));
      errorEl.textContent = message;
      errorEl.classList.remove("hidden");
      return;
    }
    const data = await res.json();
    employees = data.employees;
    nameEl.textContent = data.location.name;
    renderRows();
    gate.classList.add("hidden");
    formView.classList.remove("hidden");
  });

  function renderRows() {
    rowsEl.innerHTML = employees.map((e, i) => `
      <tr class="border-b border-slate-100" data-employee-id="${e.id}">
        <td class="sticky left-0 z-10 bg-white px-3 py-2 font-medium">${escapeHtml(e.name)}</td>
        ${numCell("totalHours", i)}
        ${numCell("commissionableHours", i)}
        ${numCell("overtimeHours", i)}
        ${numCell("annualLeaveDays", i)}
        ${numCell("sickLeaveDays", i)}
        <td class="px-3 py-2"><input name="notes-${i}" class="w-40 rounded border border-slate-300 px-2 py-1" /></td>
        <td class="px-3 py-2 text-xs" data-row-status></td>
      </tr>
    `).join("");
  }
  function numCell(field, i) {
    return `<td class="px-3 py-2"><input type="number" step="0.25" min="0" name="${field}-${i}" class="w-24 rounded border border-slate-300 px-2 py-1" /></td>`;
  }
  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  attForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    statusEl.textContent = "Submitting…";
    document.querySelectorAll("[data-row-status]").forEach(el => el.textContent = "");

    const entries = employees.map((emp, i) => ({
      employeeId: emp.id,
      totalHours: num(`totalHours-${i}`),
      commissionableHours: num(`commissionableHours-${i}`),
      overtimeHours: num(`overtimeHours-${i}`),
      annualLeaveDays: num(`annualLeaveDays-${i}`),
      sickLeaveDays: num(`sickLeaveDays-${i}`),
      notes: String(document.querySelector(`[name="notes-${i}"]`).value || ""),
    }));
    const payload = {
      slug,
      month: monthInput.value,
      submittedBy: submittedByInput.value,
      entries,
    };
    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      statusEl.textContent = data.message || "Submission failed.";
      statusEl.className = "text-sm text-red-600";
      return;
    }
    statusEl.className = "text-sm text-green-700";
    statusEl.textContent = `Saved. Created ${data.created}, updated ${data.updated}` +
      (data.failed?.length ? `, ${data.failed.length} failed` : ".");
    // Mark failed rows
    (data.failed || []).forEach(f => {
      const row = document.querySelector(`tr[data-employee-id="${f.employeeId}"]`);
      if (row) row.querySelector("[data-row-status]").textContent = "⚠ " + f.error;
    });
  });

  function num(name) {
    const v = document.querySelector(`[name="${name}"]`)?.value;
    const n = v === "" || v == null ? 0 : Number(v);
    return Number.isFinite(n) ? n : 0;
  }
})();
</script>
```

- [ ] **Step 4: Commit**

```bash
cd /Users/michaglio/Projects/spa-attendance
git add src/components/PasscodeGate.astro src/components/SupervisorForm.astro src/pages/attendance/[slug].astro
git commit -m "feat: add supervisor passcode gate and monthly attendance form"
```

---

### Task 11: API — `POST /api/attendance`

**Files:**
- Create: `/Users/michaglio/Projects/spa-attendance/src/pages/api/attendance.ts`

- [ ] **Step 1: Write the endpoint**

```ts
import type { APIRoute } from "astro";
import { createNotionClient, createNotionRepo } from "../../lib/notion";
import { readCookie, verifySession } from "../../lib/session";
import { isValidMonthKey } from "../../lib/month";

export const prerender = false;

interface Entry {
  employeeId: string;
  totalHours: number;
  commissionableHours: number;
  overtimeHours: number;
  annualLeaveDays: number;
  sickLeaveDays: number;
  notes?: string;
}

export const POST: APIRoute = async ({ request }) => {
  let body: any;
  try { body = await request.json(); } catch { return j(400, { error: "bad_request", message: "Invalid JSON" }); }
  const { slug, month, submittedBy, entries } = body ?? {};

  if (typeof slug !== "string" || !slug) return j(400, { error: "bad_request", message: "Missing slug" });
  if (typeof month !== "string" || !isValidMonthKey(month)) return j(400, { error: "bad_request", message: "Invalid month" });
  if (typeof submittedBy !== "string" || !submittedBy.trim()) return j(400, { error: "bad_request", message: "Missing submittedBy" });
  if (!Array.isArray(entries) || entries.length === 0) return j(400, { error: "bad_request", message: "No entries" });

  // Session check
  const cookieHeader = request.headers.get("cookie") ?? "";
  const token = readCookie(cookieHeader, `loc_${slug}`);
  if (!token) return j(401, { error: "unauthorized", message: "Session missing or expired" });
  let session: { locationId: string; slug: string };
  try {
    session = await verifySession<{ locationId: string; slug: string }>(token, import.meta.env.SESSION_SECRET);
  } catch {
    return j(401, { error: "unauthorized", message: "Session invalid" });
  }
  if (session.slug !== slug) return j(401, { error: "unauthorized", message: "Session mismatch" });

  try {
    const repo = createNotionRepo(
      createNotionClient(import.meta.env.NOTION_TOKEN),
      {
        locations: import.meta.env.NOTION_DB_LOCATIONS,
        employees: import.meta.env.NOTION_DB_EMPLOYEES,
        attendance: import.meta.env.NOTION_DB_ATTENDANCE,
      },
    );
    // We need employee names for the title. Fetch active employees for the location once.
    const employees = await repo.listEmployeesForLocation(session.locationId);
    const nameById = new Map(employees.map((e) => [e.id, e.name]));

    let created = 0, updated = 0;
    const failed: Array<{ employeeId: string; error: string }> = [];

    for (const e of entries as Entry[]) {
      const name = nameById.get(e.employeeId);
      if (!name) {
        failed.push({ employeeId: e.employeeId, error: "Employee not in this location" });
        continue;
      }
      if (!nonNegNumber(e.totalHours) || !nonNegNumber(e.commissionableHours) ||
          !nonNegNumber(e.overtimeHours) || !nonNegNumber(e.annualLeaveDays) ||
          !nonNegNumber(e.sickLeaveDays)) {
        failed.push({ employeeId: e.employeeId, error: "Numbers must be >= 0" });
        continue;
      }
      try {
        const res = await repo.upsertAttendance({
          employeeId: e.employeeId,
          employeeName: name,
          locationId: session.locationId,
          month,
          submittedBy: submittedBy.trim(),
          totalHours: e.totalHours,
          commissionableHours: e.commissionableHours,
          overtimeHours: e.overtimeHours,
          annualLeaveDays: e.annualLeaveDays,
          sickLeaveDays: e.sickLeaveDays,
          notes: String(e.notes ?? ""),
        });
        if (res === "created") created++; else updated++;
      } catch (err) {
        console.error("upsert failed", err);
        failed.push({ employeeId: e.employeeId, error: "Notion write failed" });
      }
    }

    return j(200, { created, updated, failed });
  } catch (err) {
    console.error("attendance submit failed", err);
    return j(502, { error: "notion_unavailable", message: "Notion is unreachable. Please try again." });
  }
};

function nonNegNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n >= 0;
}
function j(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd /Users/michaglio/Projects/spa-attendance
npx astro check
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/michaglio/Projects/spa-attendance
git add src/pages/api/attendance.ts
git commit -m "feat: add /api/attendance upsert endpoint"
```

---

### Task 12: API — Admin verify + locations

**Files:**
- Create: `/Users/michaglio/Projects/spa-attendance/src/pages/api/admin/verify.ts`
- Create: `/Users/michaglio/Projects/spa-attendance/src/pages/api/admin/locations.ts`

- [ ] **Step 1: Write `admin/verify.ts`**

```ts
import type { APIRoute } from "astro";
import { buildCookie, signSession } from "../../../lib/session";
import { passcodeLimiter } from "../../../lib/rateLimit";

export const prerender = false;

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (!passcodeLimiter.hit(clientAddress || "unknown")) {
    return j(429, { error: "rate_limited", message: "Too many attempts" });
  }
  let body: { passcode?: string };
  try { body = await request.json(); } catch { return j(400, { error: "bad_request", message: "Invalid JSON" }); }
  const pass = (body.passcode ?? "").trim();
  if (!pass) return j(400, { error: "bad_request", message: "Missing passcode" });

  if (pass !== import.meta.env.ADMIN_PASSCODE) {
    return j(401, { error: "invalid_passcode", message: "Wrong passcode" });
  }
  const token = await signSession({ kind: "admin" }, import.meta.env.SESSION_SECRET, 60 * 60 * 12);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": buildCookie("admin", token, 60 * 60 * 12),
    },
  });
};

function j(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
```

- [ ] **Step 2: Write `admin/locations.ts`**

```ts
import type { APIRoute } from "astro";
import { createNotionClient, createNotionRepo } from "../../../lib/notion";
import { readCookie, verifySession } from "../../../lib/session";

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const token = readCookie(request.headers.get("cookie") ?? "", "admin");
  if (!token) return j(401, { error: "unauthorized", message: "Not logged in" });
  try { await verifySession<{ kind: "admin" }>(token, import.meta.env.SESSION_SECRET); }
  catch { return j(401, { error: "unauthorized", message: "Session invalid" }); }

  try {
    const repo = createNotionRepo(
      createNotionClient(import.meta.env.NOTION_TOKEN),
      {
        locations: import.meta.env.NOTION_DB_LOCATIONS,
        employees: import.meta.env.NOTION_DB_EMPLOYEES,
        attendance: import.meta.env.NOTION_DB_ATTENDANCE,
      },
    );
    const locations = await repo.listActiveLocations();
    return j(200, { locations });
  } catch (err) {
    console.error("locations fetch failed", err);
    return j(502, { error: "notion_unavailable", message: "Notion is unreachable" });
  }
};

function j(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/michaglio/Projects/spa-attendance
git add src/pages/api/admin/verify.ts src/pages/api/admin/locations.ts
git commit -m "feat: add admin verify and locations endpoints"
```

---

### Task 13: API — `GET /api/admin/report`

Returns flattened report rows joined with employee + location names, plus a list of locations with no submissions this month.

**Files:**
- Create: `/Users/michaglio/Projects/spa-attendance/src/pages/api/admin/report.ts`

- [ ] **Step 1: Write the endpoint**

```ts
import type { APIRoute } from "astro";
import { createNotionClient, createNotionRepo } from "../../../lib/notion";
import { readCookie, verifySession } from "../../../lib/session";
import { isValidMonthKey } from "../../../lib/month";

export const prerender = false;

export const GET: APIRoute = async ({ request, url }) => {
  const token = readCookie(request.headers.get("cookie") ?? "", "admin");
  if (!token) return j(401, { error: "unauthorized", message: "Not logged in" });
  try { await verifySession(token, import.meta.env.SESSION_SECRET); }
  catch { return j(401, { error: "unauthorized", message: "Session invalid" }); }

  const month = url.searchParams.get("month") ?? "";
  const locParam = url.searchParams.get("location") ?? "all";
  if (!isValidMonthKey(month)) return j(400, { error: "bad_request", message: "Invalid month" });

  try {
    const repo = createNotionRepo(
      createNotionClient(import.meta.env.NOTION_TOKEN),
      {
        locations: import.meta.env.NOTION_DB_LOCATIONS,
        employees: import.meta.env.NOTION_DB_EMPLOYEES,
        attendance: import.meta.env.NOTION_DB_ATTENDANCE,
      },
    );
    const [locations, attendance] = await Promise.all([
      repo.listActiveLocations(),
      repo.listAttendanceForMonth(month, locParam === "all" ? undefined : locParam),
    ]);
    const locNameById = new Map(locations.map((l) => [l.id, l.name]));

    // Employee names — fetch per location involved, deduped.
    const locsInPlay = Array.from(new Set(attendance.map(a => a.locationId)));
    const nameById = new Map<string, string>();
    for (const lid of locsInPlay) {
      const emps = await repo.listEmployeesForLocation(lid);
      for (const e of emps) nameById.set(e.id, e.name);
    }

    const rows = attendance.map(a => ({
      locationId: a.locationId,
      locationName: locNameById.get(a.locationId) ?? "(unknown)",
      employeeId: a.employeeId,
      employeeName: nameById.get(a.employeeId) ?? "(unknown)",
      totalHours: a.totalHours,
      commissionableHours: a.commissionableHours,
      overtimeHours: a.overtimeHours,
      annualLeaveDays: a.annualLeaveDays,
      sickLeaveDays: a.sickLeaveDays,
      notes: a.notes,
      submittedBy: a.submittedBy,
      submittedAt: a.submittedAt,
    }));

    const submittedLocIds = new Set(attendance.map(a => a.locationId));
    const missingLocations = locations
      .filter(l => !submittedLocIds.has(l.id) && (locParam === "all" || l.id === locParam))
      .map(l => ({ id: l.id, name: l.name }));

    return j(200, { month, rows, missingLocations });
  } catch (err) {
    console.error("report fetch failed", err);
    return j(502, { error: "notion_unavailable", message: "Notion is unreachable" });
  }
};

function j(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/michaglio/Projects/spa-attendance
git add src/pages/api/admin/report.ts
git commit -m "feat: add /api/admin/report endpoint with missing-locations"
```

---

### Task 14: Admin Page `/admin`

**Files:**
- Create: `/Users/michaglio/Projects/spa-attendance/src/components/AdminControls.astro`
- Create: `/Users/michaglio/Projects/spa-attendance/src/components/AdminTable.astro`
- Create: `/Users/michaglio/Projects/spa-attendance/src/components/MissingSubmissionsBanner.astro`
- Create: `/Users/michaglio/Projects/spa-attendance/src/pages/admin.astro`

- [ ] **Step 1: Write `AdminControls.astro`**

```astro
---
import BilingualLabel from "./BilingualLabel.astro";
---
<div class="mb-4 flex flex-wrap items-end gap-3">
  <label class="flex flex-col text-sm">
    <BilingualLabel labelKey="month" inline />
    <input id="ctl-month" type="month"
      class="rounded border border-slate-300 px-2 py-1 focus:border-teal-600 focus:outline-none" />
  </label>
  <label class="flex flex-col text-sm">
    <BilingualLabel labelKey="location" inline />
    <select id="ctl-location"
      class="rounded border border-slate-300 px-2 py-1 focus:border-teal-600 focus:outline-none">
      <option value="all">All locations</option>
    </select>
  </label>
  <div class="flex gap-2 self-end">
    <button id="btn-view-agg" class="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100">Aggregated</button>
    <button id="btn-view-loc" class="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100">By location</button>
  </div>
  <button id="btn-csv"
    class="ml-auto rounded bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800">
    Download CSV
  </button>
</div>
```

- [ ] **Step 2: Write `MissingSubmissionsBanner.astro`**

```astro
<div id="missing-banner" class="hidden mb-4 rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
  <strong>Missing submissions:</strong>
  <span id="missing-list"></span>
</div>
```

- [ ] **Step 3: Write `AdminTable.astro`**

```astro
---
import BilingualLabel from "./BilingualLabel.astro";
---
<div class="overflow-x-auto">
  <table class="min-w-full border-separate border-spacing-0 text-sm">
    <thead class="bg-slate-100 text-left">
      <tr>
        <th class="px-3 py-2"><BilingualLabel labelKey="location" inline /></th>
        <th class="px-3 py-2"><BilingualLabel labelKey="employee" inline /></th>
        <th class="px-3 py-2"><BilingualLabel labelKey="totalHours" inline /></th>
        <th class="px-3 py-2"><BilingualLabel labelKey="commissionableHours" inline /></th>
        <th class="px-3 py-2"><BilingualLabel labelKey="overtimeHours" inline /></th>
        <th class="px-3 py-2"><BilingualLabel labelKey="annualLeaveDays" inline /></th>
        <th class="px-3 py-2"><BilingualLabel labelKey="sickLeaveDays" inline /></th>
        <th class="px-3 py-2"><BilingualLabel labelKey="submittedBy" inline /></th>
        <th class="px-3 py-2"><BilingualLabel labelKey="submittedAt" inline /></th>
        <th class="px-3 py-2"><BilingualLabel labelKey="notes" inline /></th>
      </tr>
    </thead>
    <tbody id="report-body"></tbody>
  </table>
</div>
```

- [ ] **Step 4: Write `src/pages/admin.astro`**

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
import PasscodeGate from "../components/PasscodeGate.astro";
import AdminControls from "../components/AdminControls.astro";
import AdminTable from "../components/AdminTable.astro";
import MissingSubmissionsBanner from "../components/MissingSubmissionsBanner.astro";

export const prerender = false;
---
<BaseLayout title="Admin — Attendance">
  <div id="gate">
    <PasscodeGate heading="Admin access" action="/api/admin/verify" formId="admin-gate" />
  </div>
  <div id="report-view" class="hidden">
    <h1 class="mb-4 text-xl font-semibold">Attendance report</h1>
    <AdminControls />
    <MissingSubmissionsBanner />
    <p id="report-status" class="mb-2 text-sm text-slate-500"></p>
    <AdminTable />
  </div>
</BaseLayout>

<script is:inline>
(() => {
  const gate = document.getElementById("gate");
  const reportView = document.getElementById("report-view");
  const gateForm = document.getElementById("admin-gate");
  const errorEl = gateForm.querySelector("[data-error]");
  const monthCtl = document.getElementById("ctl-month");
  const locCtl = document.getElementById("ctl-location");
  const btnAgg = document.getElementById("btn-view-agg");
  const btnLoc = document.getElementById("btn-view-loc");
  const btnCsv = document.getElementById("btn-csv");
  const body = document.getElementById("report-body");
  const missingBanner = document.getElementById("missing-banner");
  const missingList = document.getElementById("missing-list");
  const statusEl = document.getElementById("report-status");

  // Default month = previous month
  const now = new Date();
  const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  monthCtl.value = `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, "0")}`;

  let viewMode = "aggregated"; // or "byLocation"
  let lastRows = [];

  gateForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.classList.add("hidden");
    const passcode = gateForm.passcode.value;
    const res = await fetch("/api/admin/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode }),
    });
    if (!res.ok) {
      const { message } = await res.json().catch(() => ({ message: "Error" }));
      errorEl.textContent = message;
      errorEl.classList.remove("hidden");
      return;
    }
    gate.classList.add("hidden");
    reportView.classList.remove("hidden");
    await loadLocations();
    await refresh();
  });

  async function loadLocations() {
    const res = await fetch("/api/admin/locations");
    if (!res.ok) return;
    const { locations } = await res.json();
    for (const l of locations) {
      const o = document.createElement("option");
      o.value = l.id; o.textContent = l.name;
      locCtl.appendChild(o);
    }
  }

  async function refresh() {
    statusEl.textContent = "Loading…";
    body.innerHTML = "";
    const res = await fetch(`/api/admin/report?month=${monthCtl.value}&location=${locCtl.value}`);
    if (!res.ok) {
      const { message } = await res.json().catch(() => ({ message: "Error" }));
      statusEl.textContent = message;
      return;
    }
    const { rows, missingLocations } = await res.json();
    lastRows = rows;
    statusEl.textContent = `${rows.length} row(s)`;
    if (missingLocations.length) {
      missingList.textContent = missingLocations.map(l => l.name).join(", ");
      missingBanner.classList.remove("hidden");
    } else {
      missingBanner.classList.add("hidden");
    }
    render();
  }

  function render() {
    if (viewMode === "aggregated") {
      body.innerHTML = lastRows.map(r => rowHtml(r)).join("");
      return;
    }
    // byLocation: group + subtotal
    const groups = new Map();
    for (const r of lastRows) {
      if (!groups.has(r.locationId)) groups.set(r.locationId, { name: r.locationName, items: [] });
      groups.get(r.locationId).items.push(r);
    }
    const parts = [];
    for (const g of groups.values()) {
      parts.push(`<tr class="bg-slate-200"><td colspan="10" class="px-3 py-1.5 font-semibold">${esc(g.name)}</td></tr>`);
      parts.push(g.items.map(rowHtml).join(""));
      const sub = subtotal(g.items);
      parts.push(`<tr class="border-b-2 border-slate-400 bg-slate-100 font-medium">
        <td class="px-3 py-1.5" colspan="2">Subtotal</td>
        <td class="px-3 py-1.5">${sub.totalHours}</td>
        <td class="px-3 py-1.5">${sub.commissionableHours}</td>
        <td class="px-3 py-1.5">${sub.overtimeHours}</td>
        <td class="px-3 py-1.5">${sub.annualLeaveDays}</td>
        <td class="px-3 py-1.5">${sub.sickLeaveDays}</td>
        <td colspan="3"></td>
      </tr>`);
    }
    body.innerHTML = parts.join("");
  }

  function subtotal(items) {
    const keys = ["totalHours","commissionableHours","overtimeHours","annualLeaveDays","sickLeaveDays"];
    const acc = Object.fromEntries(keys.map(k => [k, 0]));
    for (const i of items) for (const k of keys) acc[k] += Number(i[k] || 0);
    return acc;
  }

  function rowHtml(r) {
    return `<tr class="border-b border-slate-100">
      <td class="px-3 py-1.5">${esc(r.locationName)}</td>
      <td class="px-3 py-1.5">${esc(r.employeeName)}</td>
      <td class="px-3 py-1.5">${r.totalHours}</td>
      <td class="px-3 py-1.5">${r.commissionableHours}</td>
      <td class="px-3 py-1.5">${r.overtimeHours}</td>
      <td class="px-3 py-1.5">${r.annualLeaveDays}</td>
      <td class="px-3 py-1.5">${r.sickLeaveDays}</td>
      <td class="px-3 py-1.5">${esc(r.submittedBy)}</td>
      <td class="px-3 py-1.5">${esc(formatDate(r.submittedAt))}</td>
      <td class="px-3 py-1.5 text-slate-500">${esc(r.notes)}</td>
    </tr>`;
  }

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  }
  function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toISOString().slice(0, 16).replace("T", " ");
  }

  monthCtl.addEventListener("change", refresh);
  locCtl.addEventListener("change", refresh);
  btnAgg.addEventListener("click", () => { viewMode = "aggregated"; render(); });
  btnLoc.addEventListener("click", () => { viewMode = "byLocation"; render(); });

  btnCsv.addEventListener("click", () => {
    const cols = ["locationName","employeeName","totalHours","commissionableHours",
      "overtimeHours","annualLeaveDays","sickLeaveDays","submittedBy","submittedAt","notes"];
    const header = "Location,Employee,Total hours,Commissionable hours,Overtime hours," +
      "Annual leave (days),Sick leave (days),Submitted by,Submitted at,Notes";
    const bom = "\uFEFF";
    const esc = v => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [header, ...lastRows.map(r => cols.map(c => esc(r[c])).join(","))];
    const blob = new Blob([bom + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const locSlug = locCtl.value === "all" ? "all" : locCtl.selectedOptions[0].textContent.toLowerCase().replace(/\s+/g, "-");
    a.download = `attendance-${monthCtl.value}-${locSlug}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });
})();
</script>
```

- [ ] **Step 5: Commit**

```bash
cd /Users/michaglio/Projects/spa-attendance
git add src/components/AdminControls.astro src/components/AdminTable.astro src/components/MissingSubmissionsBanner.astro src/pages/admin.astro
git commit -m "feat: add admin report page with aggregated/by-location views and CSV export"
```

---

### Task 15: Landing Page + README

**Files:**
- Create: `/Users/michaglio/Projects/spa-attendance/src/pages/index.astro`
- Create: `/Users/michaglio/Projects/spa-attendance/README.md`

- [ ] **Step 1: Write `src/pages/index.astro`**

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
export const prerender = true;
---
<BaseLayout title="SPA Attendance">
  <section class="mx-auto max-w-xl space-y-4 text-center">
    <h1 class="text-2xl font-semibold">SPA Attendance</h1>
    <p class="text-slate-600">Internal monthly attendance reporting tool.</p>
    <div class="rounded-lg border border-slate-200 bg-white p-5 text-left">
      <h2 class="mb-2 font-semibold">Supervisors</h2>
      <p class="text-sm text-slate-600">
        Use the link we sent you for your location (e.g. <code class="rounded bg-slate-100 px-1">/attendance/&lt;your-location&gt;</code>).
      </p>
    </div>
    <div class="rounded-lg border border-slate-200 bg-white p-5 text-left">
      <h2 class="mb-2 font-semibold">Admin</h2>
      <p class="text-sm text-slate-600"><a href="/admin" class="text-teal-700 underline">Open admin report</a>.</p>
    </div>
  </section>
</BaseLayout>
```

- [ ] **Step 2: Write `README.md`**

```markdown
# SPA Attendance

Internal monthly attendance reporting. Supervisors submit per-worker totals for their location; data is upserted into a Notion database. Admins can review aggregated / per-location views and export CSV.

## Stack
Astro v6 (SSR, Node adapter) · Tailwind v4 · `@notionhq/client` · `jose` (JWT) · Firebase App Hosting

## Local development

```sh
cp .env.example .env       # fill in real values
npm install
npm run dev                # http://localhost:4321
npm test                   # unit tests
```

You will need:
- A Notion internal integration token (`secret_…`) from `notion.so/my-integrations`.
- Each of the 3 databases (Locations, Employees, Attendance) shared with that integration.
- The 32-char DB IDs extracted from each database's share URL.

## Deploy

See `docs/smoke.md` for the manual QA checklist before any deploy.

Firebase App Hosting builds on `git push` to `main`. Runtime secrets are set via:

```sh
firebase apphosting:secrets:set NOTION_TOKEN
firebase apphosting:secrets:set NOTION_DB_LOCATIONS
firebase apphosting:secrets:set NOTION_DB_EMPLOYEES
firebase apphosting:secrets:set NOTION_DB_ATTENDANCE
firebase apphosting:secrets:set ADMIN_PASSCODE
firebase apphosting:secrets:set SESSION_SECRET
```
```

- [ ] **Step 3: Commit**

```bash
cd /Users/michaglio/Projects/spa-attendance
git add src/pages/index.astro README.md
git commit -m "feat: add landing page and README"
```

---

### Task 16: Firebase App Hosting Config

App Hosting supports Astro SSR (Node adapter) out of the box. Two files — one tells the CLI which project + backend, one tells the runtime how to start.

**Files:**
- Create: `/Users/michaglio/Projects/spa-attendance/apphosting.yaml`
- Create: `/Users/michaglio/Projects/spa-attendance/firebase.json`
- Create: `/Users/michaglio/Projects/spa-attendance/.firebaserc`

- [ ] **Step 1: Write `apphosting.yaml`**

```yaml
# Firebase App Hosting runtime configuration
runConfig:
  cpu: 1
  memoryMiB: 512
  maxInstances: 2
  minInstances: 0
  concurrency: 80

env:
  # Public env vars (none). All Notion + secret config is injected as secrets below.

# Secrets are created once with `firebase apphosting:secrets:set <NAME>`.
# They are mounted as environment variables at runtime.
# See README for the full list of required secrets.
```

> **Note for implementer:** App Hosting secrets are declared under `env:` with `secret:` references. Once the user has run `firebase apphosting:secrets:set NOTION_TOKEN` etc., run `firebase apphosting:secrets:grantaccess <NAME> --backend <BACKEND_ID>`, then add each to the `env:` block like `- variable: NOTION_TOKEN; secret: NOTION_TOKEN`. Consult the `firebase-app-hosting-basics` skill for current syntax — App Hosting schema evolves.

- [ ] **Step 2: Write `firebase.json`**

```json
{
  "apphosting": {
    "source": "."
  }
}
```

- [ ] **Step 3: Write `.firebaserc`**

```json
{
  "projects": {
    "default": "REPLACE_WITH_FIREBASE_PROJECT_ID"
  }
}
```

> **Note:** The user will replace `REPLACE_WITH_FIREBASE_PROJECT_ID` with their actual Firebase project ID (from the Firebase Console) during deployment setup. This is the same project used by the main `spa-company` site, or a new one — the user decides.

- [ ] **Step 4: Verify build works locally**

```bash
cd /Users/michaglio/Projects/spa-attendance
npm run build
```
Expected: Astro builds `dist/` with a `server/` folder containing `entry.mjs`.

- [ ] **Step 5: Smoke-run the SSR server locally**

```bash
cd /Users/michaglio/Projects/spa-attendance
# Requires .env with real values — or stub values for this smoke check
HOST=0.0.0.0 PORT=4000 npm run start &
sleep 2
curl -sf http://localhost:4000/ -o /dev/null && echo "OK" || echo "FAIL"
kill %1 2>/dev/null || true
```
Expected: `OK`.

- [ ] **Step 6: Commit**

```bash
cd /Users/michaglio/Projects/spa-attendance
git add apphosting.yaml firebase.json .firebaserc
git commit -m "chore: add Firebase App Hosting config"
```

---

### Task 17: GitHub Actions Deploy Workflow

App Hosting has its own auto-deploy on push, but we also want a CI run that builds + tests so broken code never ships.

**Files:**
- Create: `/Users/michaglio/Projects/spa-attendance/.github/workflows/ci.yml`

- [ ] **Step 1: Write `.github/workflows/ci.yml`**

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
        env:
          # Build only needs placeholders — real secrets come from App Hosting at runtime.
          NOTION_TOKEN: build-placeholder
          NOTION_DB_LOCATIONS: build-placeholder
          NOTION_DB_EMPLOYEES: build-placeholder
          NOTION_DB_ATTENDANCE: build-placeholder
          ADMIN_PASSCODE: build-placeholder
          SESSION_SECRET: build-placeholder
```

- [ ] **Step 2: Commit**

```bash
cd /Users/michaglio/Projects/spa-attendance
git add .github/workflows/ci.yml
git commit -m "chore: add CI workflow"
```

---

### Task 18: Smoke Checklist Doc

**Files:**
- Create: `/Users/michaglio/Projects/spa-attendance/docs/smoke.md`

- [ ] **Step 1: Write `docs/smoke.md`**

```markdown
# Manual Smoke Checklist

Run before every deploy and after any schema change.

## Prerequisites
- `.env` populated with real Notion token and DB IDs.
- At least 1 active Location in Notion with a `Slug`, `Passcode`, and `Active = true`.
- At least 2 active Employees linked to that Location.

## Supervisor flow
- [ ] Open `/attendance/<slug>` → passcode gate appears.
- [ ] Submit wrong passcode 6 times → 6th returns "Too many attempts".
- [ ] Wait 60 seconds → submit correct passcode → form loads with all active employees.
- [ ] Month defaults to previous month.
- [ ] Fill all fields for every employee, click Submit.
- [ ] Verify the green status banner shows `Created N, updated 0`.
- [ ] Open Notion → Attendance DB → rows exist for each employee with correct values.
- [ ] Re-submit with different numbers → banner shows `Created 0, updated N`; Notion rows updated, **no duplicates**.

## Partial-failure simulation
- [ ] Manually edit one employee in Notion to move them to a different Location.
- [ ] Re-submit the form → that row fails with "Employee not in this location"; other rows update.

## Admin flow
- [ ] Open `/admin` → passcode gate.
- [ ] Correct admin passcode → report loads, month defaults to previous.
- [ ] Switch to an older month with no data → "Missing submissions" banner lists all active locations.
- [ ] Switch to the month you submitted → banner disappears (if all locations submitted) or lists laggards.
- [ ] Toggle "By location" → grouped with subtotals.
- [ ] Click "Download CSV" → file downloads. Open in Excel:
  - [ ] Slovak characters render correctly (ú, č, á, etc.).
  - [ ] Header row is English only.
  - [ ] Numbers are in numeric columns, not quoted strings.

## Security spot-checks
- [ ] Open DevTools → Network → inspect `/api/attendance` POST → no `NOTION_TOKEN` in request/response.
- [ ] `document.cookie` in console → `loc_<slug>` and `admin` cookies are **not visible** (httpOnly).
- [ ] Log out by clearing cookies → `/admin` and `/attendance/<slug>` both return to the passcode gate.
```

- [ ] **Step 2: Commit**

```bash
cd /Users/michaglio/Projects/spa-attendance
git add docs/smoke.md
git commit -m "docs: add manual smoke test checklist"
```

---

## Deployment (post-implementation)

After all 18 tasks are complete and the smoke checklist passes locally, the user will:

1. **Create the Notion integration** at `notion.so/my-integrations` and share all 3 databases with it.
2. **Copy the 3 database IDs** from each DB's share link (`https://www.notion.so/<workspace>/<32-char-id>?v=…`).
3. **Create a Firebase project** (or reuse `spa-company`'s) and enable App Hosting.
4. **Push the repo to GitHub** and link the App Hosting backend to it.
5. **Run `firebase apphosting:secrets:set`** for each of the 6 env vars.
6. **Add the DNS record** that Firebase provides to point `attendance.<company-domain>` at the App Hosting backend.
7. **Run the smoke checklist against production.**

Use the `firebase-app-hosting-basics` skill for the up-to-date CLI commands (App Hosting syntax evolves).

---

## Self-Review Notes

- Every spec section (`Overview`, `Tech Stack`, `Architecture`, `Data Model`, `Passcode flow`, `API endpoints`, `Admin report`, `Bilingual labels`, `Config & secrets`, `Error handling`, `Testing`) maps to at least one task.
- Validation rules are intentionally left as "non-negative numbers" per the spec's open-item note — business rules beyond that are deferred.
- Library function names are consistent between definition (`createNotionRepo`, `upsertAttendance`, `listAttendanceForMonth`) and every place they're imported.
- No TBDs or placeholder steps. All code blocks contain the full content an engineer would paste.
- DNS record and Firebase project ID are explicitly marked as user-provided at deploy time, not implementation gaps.
