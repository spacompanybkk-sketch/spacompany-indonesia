# Admin Auth — Role-Based OTP Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the shared admin passcode in spa-attendance with per-user email OTP login, role-based permissions, and device-remember sessions. Then create a PR for spa-company with the same auth pattern.

**Architecture:** New lib modules for OTP (in-memory store), email (Microsoft Graph API), Notion Users DB, and auth guards. Login flow: email → OTP → JWT session cookie with role. All existing admin pages migrated from PasscodeGate to session-based auth with role checks. Supervisor attendance flow (`/attendance/<slug>`) is untouched.

**Tech Stack:** Existing Astro v6 SSR + `jose` (JWT). New: Microsoft Graph API for email (native `fetch`, no new deps). Notion Users DB for user/role storage.

**Spec:** `docs/superpowers/specs/2026-04-19-admin-auth-design.md` (in spa-company repo)

**Project location:** `/Users/michaglio/Projects/spa-attendance/` (primary), `/Users/michaglio/Projects/spa-company/` (PR)

---

## File Map

```
src/
├── env.d.ts                                    # MODIFY: add MS_*, NOTION_DB_USERS; remove ADMIN_PASSCODE
├── lib/
│   ├── otp.ts                                  # CREATE: OTP generate/store/verify (in-memory)
│   ├── otp.test.ts                             # CREATE: OTP tests
│   ├── email.ts                                # CREATE: Microsoft Graph email sender
│   ├── email.test.ts                           # CREATE: email tests (mocked fetch)
│   ├── notion-users.ts                         # CREATE: Notion Users DB repo
│   ├── notion-users.test.ts                    # CREATE: users repo tests
│   ├── auth.ts                                 # CREATE: getAdminSession + hasRole helpers
│   ├── auth.test.ts                            # CREATE: auth tests
│   ├── session.ts                              # NO CHANGE (reuse signSession/verifySession as-is)
│   └── rateLimit.ts                            # NO CHANGE (reuse existing rate limiter)
├── pages/
│   ├── admin/
│   │   ├── login.astro                         # CREATE: email + OTP login page
│   │   ├── users.astro                         # CREATE: user management page
│   │   ├── upload.astro                        # MODIFY: remove PasscodeGate, add auth guard
│   │   └── payslips.astro                      # MODIFY: remove PasscodeGate, add auth guard
│   ├── admin.astro                             # MODIFY: remove PasscodeGate, add auth guard
│   └── api/admin/
│       ├── send-code.ts                        # CREATE: POST — validate email, send OTP
│       ├── verify-code.ts                      # CREATE: POST — verify OTP, set JWT cookie
│       ├── users.ts                            # CREATE: GET/POST/DELETE — CRUD users
│       ├── verify.ts                           # DELETE (replaced by verify-code.ts)
│       ├── report.ts                           # MODIFY: replace admin cookie check with auth guard
│       ├── attendance-status.ts                # MODIFY: replace admin cookie check with auth guard
│       ├── upload-attendance.ts                # MODIFY: replace admin cookie check with auth guard
│       ├── generate-payslips.ts                # MODIFY: replace admin cookie check with auth guard
│       ├── payslips.ts                         # MODIFY: replace admin cookie check with auth guard
│       └── locations.ts                        # MODIFY: replace admin cookie check with auth guard
├── components/
│   └── PasscodeGate.astro                      # KEEP (still used by supervisor /attendance/[slug])
├── layouts/
│   └── BaseLayout.astro                        # MODIFY: show user name + sign out when admin session
apphosting.yaml                                  # MODIFY: add 5 new secrets, remove ADMIN_PASSCODE
.env.example                                     # MODIFY: add MS_*, NOTION_DB_USERS; remove ADMIN_PASSCODE
```

---

### Task 1: Config & Environment Variables

**Files:**
- Modify: `/Users/michaglio/Projects/spa-attendance/src/env.d.ts`
- Modify: `/Users/michaglio/Projects/spa-attendance/apphosting.yaml`
- Modify: `/Users/michaglio/Projects/spa-attendance/.env.example`

- [ ] **Step 1: Update `src/env.d.ts`**

Replace the full file:

```ts
/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  readonly NOTION_TOKEN: string;
  readonly NOTION_DB_LOCATIONS: string;
  readonly NOTION_DB_EMPLOYEES: string;
  readonly NOTION_DB_ATTENDANCE: string;
  readonly NOTION_DB_SALARY_CONFIG: string;
  readonly NOTION_DB_PAYSLIPS: string;
  readonly NOTION_DB_USERS: string;
  readonly MS_TENANT_ID: string;
  readonly MS_CLIENT_ID: string;
  readonly MS_CLIENT_SECRET: string;
  readonly MS_SENDER_EMAIL: string;
  readonly SESSION_SECRET: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

Note: `ADMIN_PASSCODE` is removed.

- [ ] **Step 2: Update `apphosting.yaml`**

Remove the `ADMIN_PASSCODE` entry. Add 5 new secrets at the end of the `env:` list:

```yaml
  - variable: NOTION_DB_USERS
    secret: NOTION_DB_USERS
  - variable: MS_TENANT_ID
    secret: MS_TENANT_ID
  - variable: MS_CLIENT_ID
    secret: MS_CLIENT_ID
  - variable: MS_CLIENT_SECRET
    secret: MS_CLIENT_SECRET
  - variable: MS_SENDER_EMAIL
    secret: MS_SENDER_EMAIL
```

- [ ] **Step 3: Update `.env.example`**

Remove the `ADMIN_PASSCODE` line. Add:

```
# Users DB
NOTION_DB_USERS=00000000000000000000000000000000

# Microsoft Graph (email OTP)
MS_TENANT_ID=your-azure-tenant-id
MS_CLIENT_ID=your-azure-client-id
MS_CLIENT_SECRET=your-azure-client-secret
MS_SENDER_EMAIL=michal@spa-company.com
```

- [ ] **Step 4: Add real values to local `.env`**

```bash
cd /Users/michaglio/Projects/spa-attendance
# Add to .env (values from spa-company/functions/.env)
echo "" >> .env
echo "NOTION_DB_USERS=PLACEHOLDER_UNTIL_USER_PROVIDES" >> .env
echo "MS_TENANT_ID=aee01914-3a8b-43da-8b29-5bfc1b2a8787" >> .env
echo "MS_CLIENT_ID=1a36560d-5a25-49e5-99b2-852eda176682" >> .env
echo "MS_CLIENT_SECRET=REDACTED" >> .env
echo "MS_SENDER_EMAIL=michal@spa-company.com" >> .env
```

Note: `NOTION_DB_USERS` is a placeholder — the user will provide the real ID after creating the Notion Users DB. The MS_* values are copied from the existing `spa-company/functions/.env`.

- [ ] **Step 5: Build + commit + push**

```bash
cd /Users/michaglio/Projects/spa-attendance
npm run build
git add src/env.d.ts apphosting.yaml .env.example
git commit -m "chore: add auth env vars (MS Graph, Users DB), remove ADMIN_PASSCODE"
git push origin main
```

---

### Task 2: OTP Module (TDD)

In-memory OTP generation, storage, and verification.

**Files:**
- Create: `/Users/michaglio/Projects/spa-attendance/src/lib/otp.ts`
- Create: `/Users/michaglio/Projects/spa-attendance/src/lib/otp.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateOtp, verifyOtp, OTP_EXPIRY_MS } from "./otp";

describe("otp", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("generateOtp returns a 6-digit string", () => {
    const code = generateOtp("test@spa-company.com");
    expect(code).toMatch(/^\d{6}$/);
  });

  it("verifyOtp succeeds with correct code within expiry", () => {
    const code = generateOtp("test@spa-company.com");
    expect(verifyOtp("test@spa-company.com", code)).toBe(true);
  });

  it("verifyOtp fails with wrong code", () => {
    generateOtp("test@spa-company.com");
    expect(verifyOtp("test@spa-company.com", "000000")).toBe(false);
  });

  it("verifyOtp fails after code expires", () => {
    const code = generateOtp("test@spa-company.com");
    vi.advanceTimersByTime(OTP_EXPIRY_MS + 1);
    expect(verifyOtp("test@spa-company.com", code)).toBe(false);
  });

  it("verifyOtp fails after 3 wrong attempts", () => {
    const code = generateOtp("test@spa-company.com");
    verifyOtp("test@spa-company.com", "111111");
    verifyOtp("test@spa-company.com", "222222");
    verifyOtp("test@spa-company.com", "333333");
    // 4th attempt with correct code should still fail (locked out)
    expect(verifyOtp("test@spa-company.com", code)).toBe(false);
  });

  it("generateOtp overwrites previous code for same email", () => {
    const code1 = generateOtp("test@spa-company.com");
    const code2 = generateOtp("test@spa-company.com");
    expect(verifyOtp("test@spa-company.com", code1)).toBe(false);
    expect(verifyOtp("test@spa-company.com", code2)).toBe(true);
  });

  it("verifyOtp is case-insensitive on email", () => {
    const code = generateOtp("Test@Spa-Company.com");
    expect(verifyOtp("test@spa-company.com", code)).toBe(true);
  });

  it("verifyOtp consumes the code (single use)", () => {
    const code = generateOtp("test@spa-company.com");
    expect(verifyOtp("test@spa-company.com", code)).toBe(true);
    expect(verifyOtp("test@spa-company.com", code)).toBe(false);
  });
});
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Write `otp.ts`**

```ts
import { randomInt } from "crypto";

export const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 3;

interface OtpEntry {
  code: string;
  email: string;
  attempts: number;
  expiresAt: number;
}

const store = new Map<string, OtpEntry>();

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function generateOtp(email: string): string {
  const key = normalizeEmail(email);
  const code = String(randomInt(100000, 999999));
  store.set(key, {
    code,
    email: key,
    attempts: 0,
    expiresAt: Date.now() + OTP_EXPIRY_MS,
  });
  return code;
}

export function verifyOtp(email: string, code: string): boolean {
  const key = normalizeEmail(email);
  const entry = store.get(key);
  if (!entry) return false;

  if (Date.now() >= entry.expiresAt) {
    store.delete(key);
    return false;
  }

  if (entry.attempts >= MAX_ATTEMPTS) {
    store.delete(key);
    return false;
  }

  if (entry.code !== code) {
    entry.attempts += 1;
    return false;
  }

  // Success — consume the code
  store.delete(key);
  return true;
}
```

- [ ] **Step 4: Run — PASS (8 tests)**

- [ ] **Step 5: Commit + push**

```bash
cd /Users/michaglio/Projects/spa-attendance
git add src/lib/otp.ts src/lib/otp.test.ts
git commit -m "feat: add OTP generation, storage, and verification with tests"
git push origin main
```

---

### Task 3: Email Module (TDD)

Microsoft Graph email sender — ported from `spa-company/functions/src/sendLoginCode.js`.

**Files:**
- Create: `/Users/michaglio/Projects/spa-attendance/src/lib/email.ts`
- Create: `/Users/michaglio/Projects/spa-attendance/src/lib/email.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendOtpEmail, type EmailConfig } from "./email";

const config: EmailConfig = {
  tenantId: "test-tenant",
  clientId: "test-client",
  clientSecret: "test-secret",
  senderEmail: "sender@test.com",
};

describe("sendOtpEmail", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calls Microsoft Graph token endpoint then sendMail endpoint", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "mock-token" }),
      })
      .mockResolvedValueOnce({ ok: true });

    vi.stubGlobal("fetch", fetchMock);

    await sendOtpEmail(config, "user@spa-company.com", "123456");

    // First call: token request
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const tokenCall = fetchMock.mock.calls[0];
    expect(tokenCall[0]).toContain("login.microsoftonline.com/test-tenant");

    // Second call: sendMail
    const mailCall = fetchMock.mock.calls[1];
    expect(mailCall[0]).toContain("graph.microsoft.com");
    expect(mailCall[0]).toContain("sender@test.com");

    const mailBody = JSON.parse(mailCall[1].body);
    expect(mailBody.message.toRecipients[0].emailAddress.address).toBe("user@spa-company.com");
    expect(mailBody.message.body.content).toContain("123456");

    vi.unstubAllGlobals();
  });

  it("throws on token fetch failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({
      ok: false,
      text: async () => "auth error",
    }));

    await expect(sendOtpEmail(config, "user@spa-company.com", "123456"))
      .rejects.toThrow("Failed to get MS Graph token");

    vi.unstubAllGlobals();
  });

  it("throws on sendMail failure", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "mock-token" }),
      })
      .mockResolvedValueOnce({
        ok: false,
        text: async () => "send error",
      }));

    await expect(sendOtpEmail(config, "user@spa-company.com", "123456"))
      .rejects.toThrow("Failed to send email");

    vi.unstubAllGlobals();
  });
});
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Write `email.ts`**

```ts
export interface EmailConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  senderEmail: string;
}

async function getMsGraphToken(config: EmailConfig): Promise<string> {
  const tokenUrl = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`;
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get MS Graph token: ${errorText}`);
  }
  const data = await response.json();
  return data.access_token;
}

export async function sendOtpEmail(
  config: EmailConfig,
  recipientEmail: string,
  code: string,
): Promise<void> {
  const accessToken = await getMsGraphToken(config);

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${config.senderEmail}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject: "Your login code — SPA Attendance",
          body: {
            contentType: "HTML",
            content: `
              <div style="font-family:Arial,sans-serif;max-width:400px;margin:0 auto;">
                <h2 style="color:#0f766e;">SPA Company Slovakia</h2>
                <p>Your login code for SPA Attendance:</p>
                <p style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#111827;margin:20px 0;">${code}</p>
                <p style="color:#6b7280;font-size:14px;">This code expires in 10 minutes.</p>
                <p style="color:#6b7280;font-size:14px;">If you didn't request this code, you can safely ignore this email.</p>
              </div>
            `,
          },
          toRecipients: [{ emailAddress: { address: recipientEmail } }],
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send email: ${errorText}`);
  }
}
```

- [ ] **Step 4: Run — PASS (3 tests)**

- [ ] **Step 5: Commit + push**

```bash
cd /Users/michaglio/Projects/spa-attendance
git add src/lib/email.ts src/lib/email.test.ts
git commit -m "feat: add Microsoft Graph OTP email sender with tests"
git push origin main
```

---

### Task 4: Notion Users Repo (TDD)

**Files:**
- Create: `/Users/michaglio/Projects/spa-attendance/src/lib/notion-users.ts`
- Create: `/Users/michaglio/Projects/spa-attendance/src/lib/notion-users.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect, vi } from "vitest";
import { createUsersRepo } from "./notion-users";
import type { NotionLike } from "./notion";

function fakeClient(): NotionLike & {
  query: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
} {
  const query = vi.fn();
  const create = vi.fn();
  const update = vi.fn();
  return {
    query, create, update,
    databases: { query: (args: unknown) => query(args) },
    pages: {
      create: (args: unknown) => create(args),
      update: (args: unknown) => update(args),
    },
  } as never;
}

describe("users repo", () => {
  it("findUserByEmail returns null when no match", async () => {
    const c = fakeClient();
    c.query.mockResolvedValue({ results: [] });
    const repo = createUsersRepo(c, "USERS_DB");
    expect(await repo.findUserByEmail("nobody@test.com")).toBeNull();
  });

  it("findUserByEmail returns the active user", async () => {
    const c = fakeClient();
    c.query.mockResolvedValue({
      results: [{
        id: "u1",
        properties: {
          Name: { title: [{ plain_text: "Michal" }] },
          Email: { email: "michal@spa-company.com" },
          Role: { select: { name: "super-admin" } },
          Active: { checkbox: true },
        },
      }],
    });
    const repo = createUsersRepo(c, "USERS_DB");
    const user = await repo.findUserByEmail("michal@spa-company.com");
    expect(user).toEqual({
      id: "u1",
      name: "Michal",
      email: "michal@spa-company.com",
      role: "super-admin",
    });
  });

  it("listUsers returns all active users", async () => {
    const c = fakeClient();
    c.query.mockResolvedValue({
      results: [{
        id: "u1",
        properties: {
          Name: { title: [{ plain_text: "Michal" }] },
          Email: { email: "michal@spa-company.com" },
          Role: { select: { name: "super-admin" } },
          Active: { checkbox: true },
        },
      }],
    });
    const repo = createUsersRepo(c, "USERS_DB");
    const users = await repo.listUsers();
    expect(users).toHaveLength(1);
    expect(users[0].role).toBe("super-admin");
  });

  it("createUser creates a page in the Users DB", async () => {
    const c = fakeClient();
    c.create.mockResolvedValue({ id: "new" });
    const repo = createUsersRepo(c, "USERS_DB");
    await repo.createUser("Denis", "denis@spa-company.com", "admin");
    expect(c.create).toHaveBeenCalledOnce();
    const props = c.create.mock.calls[0][0].properties;
    expect(props.Email.email).toBe("denis@spa-company.com");
    expect(props.Role.select.name).toBe("admin");
  });

  it("deleteUser sets Active to false (soft delete)", async () => {
    const c = fakeClient();
    c.update.mockResolvedValue({ id: "u1" });
    const repo = createUsersRepo(c, "USERS_DB");
    await repo.deleteUser("u1");
    expect(c.update).toHaveBeenCalledWith({
      page_id: "u1",
      properties: { Active: { checkbox: false } },
    });
  });
});
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Write `notion-users.ts`**

```ts
import type { NotionLike } from "./notion";

export type Role = "super-admin" | "admin" | "hr-payroll" | "coordinator";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

const text = (p: any): string =>
  (p?.rich_text?.[0]?.plain_text ?? p?.title?.[0]?.plain_text ?? "") as string;

export function createUsersRepo(client: NotionLike, dbId: string) {
  async function findUserByEmail(email: string): Promise<AppUser | null> {
    const { results } = await client.databases.query({
      database_id: dbId,
      filter: {
        and: [
          { property: "Email", email: { equals: email.toLowerCase() } },
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
      email: r.properties.Email?.email ?? "",
      role: r.properties.Role?.select?.name as Role ?? "coordinator",
    };
  }

  async function listUsers(): Promise<AppUser[]> {
    const { results } = await client.databases.query({
      database_id: dbId,
      filter: { property: "Active", checkbox: { equals: true } },
      sorts: [{ property: "Name", direction: "ascending" }],
      page_size: 100,
    });
    return results.map((r: any) => ({
      id: r.id,
      name: text(r.properties.Name),
      email: r.properties.Email?.email ?? "",
      role: (r.properties.Role?.select?.name ?? "coordinator") as Role,
    }));
  }

  async function createUser(name: string, email: string, role: Role): Promise<string> {
    const result = await client.pages.create({
      parent: { database_id: dbId },
      properties: {
        Name: { title: [{ text: { content: name } }] },
        Email: { email: email.toLowerCase() },
        Role: { select: { name: role } },
        Active: { checkbox: true },
      },
    });
    return result.id;
  }

  async function deleteUser(pageId: string): Promise<void> {
    await client.pages.update({
      page_id: pageId,
      properties: { Active: { checkbox: false } },
    });
  }

  return { findUserByEmail, listUsers, createUser, deleteUser };
}

export type UsersRepo = ReturnType<typeof createUsersRepo>;
```

- [ ] **Step 4: Run — PASS (5 tests)**

- [ ] **Step 5: Commit + push**

```bash
cd /Users/michaglio/Projects/spa-attendance
git add src/lib/notion-users.ts src/lib/notion-users.test.ts
git commit -m "feat: add Notion Users repo with CRUD and tests"
git push origin main
```

---

### Task 5: Auth Helper (TDD)

**Files:**
- Create: `/Users/michaglio/Projects/spa-attendance/src/lib/auth.ts`
- Create: `/Users/michaglio/Projects/spa-attendance/src/lib/auth.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from "vitest";
import { signSession } from "./session";
import { getAdminSession, hasRole, type AdminSession } from "./auth";

const SECRET = "0".repeat(64);

describe("auth", () => {
  it("getAdminSession returns session from valid cookie", async () => {
    const token = await signSession(
      { email: "test@spa-company.com", name: "Test", role: "admin" },
      SECRET, 3600,
    );
    const headers = new Headers({ cookie: `admin_session=${token}` });
    const request = new Request("http://localhost", { headers });
    const session = await getAdminSession(request, SECRET);
    expect(session).not.toBeNull();
    expect(session!.email).toBe("test@spa-company.com");
    expect(session!.role).toBe("admin");
  });

  it("getAdminSession returns null when no cookie", async () => {
    const request = new Request("http://localhost");
    const session = await getAdminSession(request, SECRET);
    expect(session).toBeNull();
  });

  it("getAdminSession returns null for expired token", async () => {
    const token = await signSession(
      { email: "test@spa-company.com", name: "Test", role: "admin" },
      SECRET, -1,
    );
    const headers = new Headers({ cookie: `admin_session=${token}` });
    const request = new Request("http://localhost", { headers });
    const session = await getAdminSession(request, SECRET);
    expect(session).toBeNull();
  });

  it("hasRole returns true for matching role", () => {
    const session: AdminSession = { email: "t@t.com", name: "T", role: "super-admin" };
    expect(hasRole(session, "super-admin", "admin")).toBe(true);
  });

  it("hasRole returns false for non-matching role", () => {
    const session: AdminSession = { email: "t@t.com", name: "T", role: "coordinator" };
    expect(hasRole(session, "super-admin", "admin")).toBe(false);
  });
});
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Write `auth.ts`**

```ts
import { readCookie, verifySession } from "./session";
import type { Role } from "./notion-users";

export interface AdminSession {
  email: string;
  name: string;
  role: Role;
  deviceId?: string;
}

export async function getAdminSession(
  request: Request,
  secret: string,
): Promise<AdminSession | null> {
  const cookie = request.headers.get("cookie") ?? "";
  const token = readCookie(cookie, "admin_session");
  if (!token) return null;
  try {
    return await verifySession<AdminSession>(token, secret);
  } catch {
    return null;
  }
}

export function hasRole(session: AdminSession, ...allowed: Role[]): boolean {
  return allowed.includes(session.role);
}

// TTL constants
export const SESSION_TTL_STANDARD = 60 * 60 * 24;       // 24 hours
export const SESSION_TTL_REMEMBERED = 60 * 60 * 24 * 30; // 30 days
```

- [ ] **Step 4: Run — PASS (5 tests)**

- [ ] **Step 5: Commit + push**

```bash
cd /Users/michaglio/Projects/spa-attendance
git add src/lib/auth.ts src/lib/auth.test.ts
git commit -m "feat: add auth helper with getAdminSession and hasRole"
git push origin main
```

---

### Task 6: API — Send Code Endpoint

**Files:**
- Create: `/Users/michaglio/Projects/spa-attendance/src/pages/api/admin/send-code.ts`

- [ ] **Step 1: Write the endpoint**

```ts
import type { APIRoute } from "astro";
import { createNotionClient } from "../../../lib/notion";
import { createUsersRepo } from "../../../lib/notion-users";
import { generateOtp } from "../../../lib/otp";
import { sendOtpEmail, type EmailConfig } from "../../../lib/email";
import { passcodeLimiter } from "../../../lib/rateLimit";

export const prerender = false;

const ALLOWED_DOMAINS = ["spa-company.com", "dmjeurope.com"];

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const ip = clientAddress || "unknown";
  if (!passcodeLimiter.hit(ip)) {
    return j(429, { error: "rate_limited", message: "Too many attempts. Try again in a minute." });
  }

  let body: { email?: string };
  try { body = await request.json(); } catch { return j(400, { error: "bad_request", message: "Invalid JSON" }); }
  const email = (body.email ?? "").trim().toLowerCase();
  if (!email) return j(400, { error: "bad_request", message: "Email is required" });

  const domain = email.split("@")[1];
  if (!domain || !ALLOWED_DOMAINS.includes(domain)) {
    return j(403, { error: "forbidden", message: "Only @spa-company.com and @dmjeurope.com emails are allowed." });
  }

  try {
    const repo = createUsersRepo(
      createNotionClient(import.meta.env.NOTION_TOKEN),
      import.meta.env.NOTION_DB_USERS,
    );
    const user = await repo.findUserByEmail(email);
    if (!user) {
      return j(403, { error: "forbidden", message: "No account found for this email. Contact your admin." });
    }

    const code = generateOtp(email);
    const emailConfig: EmailConfig = {
      tenantId: import.meta.env.MS_TENANT_ID,
      clientId: import.meta.env.MS_CLIENT_ID,
      clientSecret: import.meta.env.MS_CLIENT_SECRET,
      senderEmail: import.meta.env.MS_SENDER_EMAIL,
    };
    await sendOtpEmail(emailConfig, email, code);

    return j(200, { success: true, message: "Code sent to your email." });
  } catch (err) {
    console.error("send-code failed", err);
    return j(502, { error: "email_failed", message: "Failed to send code. Please try again." });
  }
};

function j(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
```

- [ ] **Step 2: Build + commit + push**

```bash
cd /Users/michaglio/Projects/spa-attendance
npm run build
git add src/pages/api/admin/send-code.ts
git commit -m "feat: add send-code endpoint for OTP email login"
git push origin main
```

---

### Task 7: API — Verify Code Endpoint

**Files:**
- Create: `/Users/michaglio/Projects/spa-attendance/src/pages/api/admin/verify-code.ts`

- [ ] **Step 1: Write the endpoint**

```ts
import type { APIRoute } from "astro";
import { createNotionClient } from "../../../lib/notion";
import { createUsersRepo } from "../../../lib/notion-users";
import { verifyOtp } from "../../../lib/otp";
import { signSession, buildCookie } from "../../../lib/session";
import { SESSION_TTL_STANDARD, SESSION_TTL_REMEMBERED } from "../../../lib/auth";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let body: { email?: string; code?: string; rememberDevice?: boolean; deviceId?: string };
  try { body = await request.json(); } catch { return j(400, { error: "bad_request", message: "Invalid JSON" }); }

  const email = (body.email ?? "").trim().toLowerCase();
  const code = (body.code ?? "").trim();
  if (!email || !code) return j(400, { error: "bad_request", message: "Email and code are required" });

  if (!verifyOtp(email, code)) {
    return j(401, { error: "invalid_code", message: "Invalid or expired code." });
  }

  try {
    const repo = createUsersRepo(
      createNotionClient(import.meta.env.NOTION_TOKEN),
      import.meta.env.NOTION_DB_USERS,
    );
    const user = await repo.findUserByEmail(email);
    if (!user) return j(403, { error: "forbidden", message: "Account not found." });

    const ttl = body.rememberDevice ? SESSION_TTL_REMEMBERED : SESSION_TTL_STANDARD;
    const payload: Record<string, unknown> = {
      email: user.email,
      name: user.name,
      role: user.role,
    };
    if (body.rememberDevice && body.deviceId) {
      payload.deviceId = body.deviceId;
    }

    const token = await signSession(payload, import.meta.env.SESSION_SECRET, ttl);

    return new Response(
      JSON.stringify({ success: true, name: user.name, role: user.role }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": buildCookie("admin_session", token, ttl),
        },
      },
    );
  } catch (err) {
    console.error("verify-code failed", err);
    return j(502, { error: "server_error", message: "Login failed. Please try again." });
  }
};

function j(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
```

- [ ] **Step 2: Build + commit + push**

```bash
cd /Users/michaglio/Projects/spa-attendance
npm run build
git add src/pages/api/admin/verify-code.ts
git commit -m "feat: add verify-code endpoint for OTP login with device remember"
git push origin main
```

---

### Task 8: API — Users CRUD Endpoint

**Files:**
- Create: `/Users/michaglio/Projects/spa-attendance/src/pages/api/admin/users.ts`

- [ ] **Step 1: Write the endpoint**

```ts
import type { APIRoute } from "astro";
import { createNotionClient } from "../../../lib/notion";
import { createUsersRepo, type Role } from "../../../lib/notion-users";
import { getAdminSession, hasRole } from "../../../lib/auth";

export const prerender = false;

const VALID_ROLES: Role[] = ["super-admin", "admin", "hr-payroll", "coordinator"];

export const GET: APIRoute = async ({ request }) => {
  const session = await getAdminSession(request, import.meta.env.SESSION_SECRET);
  if (!session) return j(401, { error: "unauthorized", message: "Not logged in" });
  if (!hasRole(session, "super-admin", "admin")) return j(403, { error: "forbidden", message: "Insufficient permissions" });

  try {
    const repo = createUsersRepo(
      createNotionClient(import.meta.env.NOTION_TOKEN),
      import.meta.env.NOTION_DB_USERS,
    );
    const users = await repo.listUsers();
    return j(200, { users });
  } catch (err) {
    console.error("list users failed", err);
    return j(502, { error: "notion_unavailable", message: "Notion is unreachable" });
  }
};

export const POST: APIRoute = async ({ request }) => {
  const session = await getAdminSession(request, import.meta.env.SESSION_SECRET);
  if (!session) return j(401, { error: "unauthorized", message: "Not logged in" });
  if (!hasRole(session, "super-admin", "admin")) return j(403, { error: "forbidden", message: "Insufficient permissions" });

  let body: { name?: string; email?: string; role?: string };
  try { body = await request.json(); } catch { return j(400, { error: "bad_request", message: "Invalid JSON" }); }

  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const role = body.role as Role;

  if (!name || !email || !role) return j(400, { error: "bad_request", message: "Name, email, and role are required" });
  if (!VALID_ROLES.includes(role)) return j(400, { error: "bad_request", message: "Invalid role" });

  const domain = email.split("@")[1];
  if (!domain || !["spa-company.com", "dmjeurope.com"].includes(domain)) {
    return j(400, { error: "bad_request", message: "Only @spa-company.com and @dmjeurope.com emails" });
  }

  // Admin users can only create hr-payroll and coordinator roles
  if (session.role === "admin" && (role === "super-admin" || role === "admin")) {
    return j(403, { error: "forbidden", message: "Admins cannot create admin or super-admin users" });
  }

  try {
    const repo = createUsersRepo(
      createNotionClient(import.meta.env.NOTION_TOKEN),
      import.meta.env.NOTION_DB_USERS,
    );
    const existing = await repo.findUserByEmail(email);
    if (existing) return j(409, { error: "conflict", message: "User with this email already exists" });

    const id = await repo.createUser(name, email, role);
    return j(201, { id, name, email, role });
  } catch (err) {
    console.error("create user failed", err);
    return j(502, { error: "notion_unavailable", message: "Notion is unreachable" });
  }
};

export const DELETE: APIRoute = async ({ request, url }) => {
  const session = await getAdminSession(request, import.meta.env.SESSION_SECRET);
  if (!session) return j(401, { error: "unauthorized", message: "Not logged in" });
  if (!hasRole(session, "super-admin", "admin")) return j(403, { error: "forbidden", message: "Insufficient permissions" });

  const userId = url.searchParams.get("id");
  if (!userId) return j(400, { error: "bad_request", message: "User ID required" });

  try {
    const repo = createUsersRepo(
      createNotionClient(import.meta.env.NOTION_TOKEN),
      import.meta.env.NOTION_DB_USERS,
    );
    await repo.deleteUser(userId);
    return j(200, { success: true });
  } catch (err) {
    console.error("delete user failed", err);
    return j(502, { error: "notion_unavailable", message: "Notion is unreachable" });
  }
};

function j(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
```

- [ ] **Step 2: Build + commit + push**

```bash
cd /Users/michaglio/Projects/spa-attendance
npm run build
git add src/pages/api/admin/users.ts
git commit -m "feat: add users CRUD endpoint with role-based access control"
git push origin main
```

---

### Task 9: Login Page — `/admin/login`

**Files:**
- Create: `/Users/michaglio/Projects/spa-attendance/src/pages/admin/login.astro`

- [ ] **Step 1: Write the login page**

A two-step form: enter email → enter code. No PasscodeGate — custom login UI.

The page should:
- Use `BaseLayout` with title "Login — SPA Attendance"
- Show the SPA Company logo at the top
- **Step 1 (email):** email input + "Send Code" button. Validates domain client-side. POSTs to `/api/admin/send-code`.
- **Step 2 (code):** 6-digit code input + "Remember this device" checkbox + "Verify" button. POSTs to `/api/admin/verify-code` with `{ email, code, rememberDevice, deviceId }`.
- On success → redirect to `/admin`.
- `deviceId` is read from `localStorage.getItem("spa_device_id")`. If missing, generate `crypto.randomUUID()` and store it.
- `export const prerender = false`
- Rate-limit feedback: if 429, show "Too many attempts" message.

Styling: same Tailwind patterns as existing pages. Centered card, teal-700 primary buttons, slate text.

- [ ] **Step 2: Build + commit + push**

```bash
cd /Users/michaglio/Projects/spa-attendance
npm run build
git add src/pages/admin/login.astro
git commit -m "feat: add email OTP login page with device remember"
git push origin main
```

---

### Task 10: Users Management Page — `/admin/users`

**Files:**
- Create: `/Users/michaglio/Projects/spa-attendance/src/pages/admin/users.astro`

- [ ] **Step 1: Write the users page**

The page should:
- Use `BaseLayout` with title "Users — SPA Attendance"
- **Auth guard in Astro frontmatter:** read `admin_session` cookie, verify, check role is super-admin or admin. If not → redirect to `/admin/login`.
- **Admin nav** (same as other admin pages: Attendance | Upload | Payslips | Users)
- **Users table:** fetched client-side from `GET /api/admin/users`. Columns: Name, Email, Role, Actions (Delete button).
- **Add user form:** Name, Email, Role dropdown (super-admin option only visible to super-admins), "Add User" button. POSTs to `POST /api/admin/users`.
- **Delete:** calls `DELETE /api/admin/users?id=<pageId>` → refreshes list.
- Show the current logged-in user in the list (but disable their own Delete button).

- [ ] **Step 2: Build + commit + push**

```bash
cd /Users/michaglio/Projects/spa-attendance
npm run build
git add src/pages/admin/users.astro
git commit -m "feat: add user management page for super-admin and admin"
git push origin main
```

---

### Task 11: Migrate Admin Pages — Remove PasscodeGate, Add Auth Guard

**Files:**
- Modify: `/Users/michaglio/Projects/spa-attendance/src/pages/admin.astro`
- Modify: `/Users/michaglio/Projects/spa-attendance/src/pages/admin/upload.astro`
- Modify: `/Users/michaglio/Projects/spa-attendance/src/pages/admin/payslips.astro`

For each page:

- [ ] **Step 1: Add auth guard in Astro frontmatter**

At the top of the frontmatter (after imports), add:

```ts
import { getAdminSession, hasRole } from "../lib/auth"; // or "../../lib/auth" for nested pages

const session = await getAdminSession(Astro.request, import.meta.env.SESSION_SECRET);
if (!session) return Astro.redirect("/admin/login");
```

For upload.astro, also add role check:
```ts
if (!hasRole(session, "super-admin", "admin", "hr-payroll")) return Astro.redirect("/admin/login");
```

For payslips.astro:
```ts
if (!hasRole(session, "super-admin", "admin", "hr-payroll")) return Astro.redirect("/admin/login");
```

For admin.astro (attendance report) — all roles can view:
```ts
// No role restriction — all logged-in users see attendance
```

- [ ] **Step 2: Remove PasscodeGate from each page**

Remove the `<div id="gate">` section with the `PasscodeGate` component. Remove the gate-related JavaScript (the `gateForm.addEventListener("submit", ...)` handler that POSTs to `/api/admin/verify`). Make the report/upload/payslips content visible by default (remove `class="hidden"` from the main content div).

**Important:** Do NOT delete `src/components/PasscodeGate.astro` — it's still used by `/attendance/[slug].astro` for supervisor login.

- [ ] **Step 3: Update admin nav to include Users link**

In all admin pages, add a "Users" link to the admin nav bar (visible only to super-admin and admin roles). Pass `session.role` to the nav rendering so it conditionally shows the Users link.

- [ ] **Step 4: Add sign-out link**

Add a "Sign out" link/button to the admin nav that:
- POSTs to a small inline handler or simply clears the `admin_session` cookie client-side:
  ```js
  document.cookie = "admin_session=; Max-Age=0; Path=/admin; SameSite=Lax; Secure";
  window.location.href = "/admin/login";
  ```

- [ ] **Step 5: Show logged-in user name**

In the header area, show `session.name` and role badge.

- [ ] **Step 6: Build + verify + commit + push**

```bash
cd /Users/michaglio/Projects/spa-attendance
npm run build
git add src/pages/admin.astro src/pages/admin/upload.astro src/pages/admin/payslips.astro
git commit -m "feat: migrate admin pages from passcode gate to session-based auth"
git push origin main
```

---

### Task 12: Migrate Admin API Endpoints — Replace Old Auth Check

**Files to modify (all in `src/pages/api/admin/`):**
- `report.ts`
- `locations.ts`
- `attendance-status.ts`
- `upload-attendance.ts`
- `generate-payslips.ts`
- `payslips.ts`

For each endpoint, replace the old admin cookie check pattern:

```ts
// OLD — remove this
const token = readCookie(request.headers.get("cookie") ?? "", "admin");
if (!token) return j(401, { error: "unauthorized", message: "Not logged in" });
try { await verifySession(token, import.meta.env.SESSION_SECRET); }
catch { return j(401, { error: "unauthorized", message: "Session invalid" }); }
```

With the new auth guard:

```ts
// NEW — add this
import { getAdminSession, hasRole } from "../../../lib/auth";

const session = await getAdminSession(request, import.meta.env.SESSION_SECRET);
if (!session) return j(401, { error: "unauthorized", message: "Not logged in" });
```

And add role checks where needed:

| Endpoint | Required roles |
|---|---|
| `report.ts` | all (any logged-in user) |
| `locations.ts` | all |
| `attendance-status.ts` | super-admin, admin |
| `upload-attendance.ts` | super-admin, admin, hr-payroll |
| `generate-payslips.ts` | super-admin, admin, hr-payroll |
| `payslips.ts` | super-admin, admin, hr-payroll |

For role-restricted endpoints, add after the session check:
```ts
if (!hasRole(session, "super-admin", "admin")) return j(403, { error: "forbidden", message: "Insufficient permissions" });
```

Also remove the old imports (`readCookie`, `verifySession` from session.ts) if no longer used in the file. Keep them if the file still uses them for other purposes.

- [ ] **Step 1: Update all 6 endpoints**

- [ ] **Step 2: Build + verify all tests still pass**

```bash
cd /Users/michaglio/Projects/spa-attendance
npm run build
npm test
```

- [ ] **Step 3: Commit + push**

```bash
cd /Users/michaglio/Projects/spa-attendance
git add src/pages/api/admin/report.ts src/pages/api/admin/locations.ts src/pages/api/admin/attendance-status.ts src/pages/api/admin/upload-attendance.ts src/pages/api/admin/generate-payslips.ts src/pages/api/admin/payslips.ts
git commit -m "feat: migrate admin API endpoints to role-based auth"
git push origin main
```

---

### Task 13: Cleanup — Remove Old Auth Artifacts

**Files:**
- Delete: `/Users/michaglio/Projects/spa-attendance/src/pages/api/admin/verify.ts`
- Modify: `/Users/michaglio/Projects/spa-attendance/.env.example` (confirm ADMIN_PASSCODE is removed — done in Task 1)

- [ ] **Step 1: Delete old verify endpoint**

```bash
cd /Users/michaglio/Projects/spa-attendance
rm src/pages/api/admin/verify.ts
```

- [ ] **Step 2: Verify build + tests**

```bash
npm run build
npm test
```

- [ ] **Step 3: Commit + push**

```bash
cd /Users/michaglio/Projects/spa-attendance
git add -A
git commit -m "chore: remove old passcode verify endpoint"
git push origin main
```

---

### Task 14: spa-company PR

Create a PR on `spacompanybkk-sketch/spa-company` that updates the existing Cloud Functions auth to use the shared Notion Users DB.

**Files in spa-company to modify:**
- `functions/src/sendLoginCode.js` — add Notion Users DB check (verify email is in Users DB before sending code)
- `functions/src/verifyLoginCode.js` — after verifying code, look up the user's role from Users DB and include it in the session response
- `functions/.env` — add `NOTION_DB_USERS` value

**What this PR does NOT do:**
- It does NOT replace the Cloud Functions architecture with Astro SSR endpoints (spa-company is a static site with Cloud Functions, different from spa-attendance's SSR setup).
- It does NOT change the Firestore-based code storage (the existing system stores OTP codes in Firestore, which works fine for spa-company).

**What it adds:**
- Before sending a code, check that the email exists in the Notion Users DB with `Active = true`. If not → reject.
- After verifying a code, fetch the user's role from the Users DB and include `{ role, name }` in the session response.
- The frontend can then use the role for UI-level access control.

- [ ] **Step 1: Create a branch**

```bash
cd /Users/michaglio/Projects/spa-company
git checkout main
git pull origin main
git checkout -b feat/role-based-auth
```

- [ ] **Step 2: Update sendLoginCode.js**

Add Notion Users DB check at the start of the function (after domain validation, before generating code). Use `fetch` to call Notion API directly (the Cloud Functions environment doesn't have `@notionhq/client` installed — use raw REST API).

```js
// After domain validation, before generating code:
const notionUsersDbId = process.env.NOTION_DB_USERS;
const notionToken = process.env.NOTION_TOKEN;

const userCheck = await fetch(`https://api.notion.com/v1/databases/${notionUsersDbId}/query`, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${notionToken}`,
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    filter: {
      and: [
        { property: "Email", email: { equals: email.toLowerCase() } },
        { property: "Active", checkbox: { equals: true } },
      ],
    },
    page_size: 1,
  }),
});
const userData = await userCheck.json();
if (!userData.results?.length) {
  throw new HttpsError("permission-denied", "No account found for this email.");
}
```

- [ ] **Step 3: Update verifyLoginCode.js**

After verifying the code (existing logic), fetch the user from Notion to get their role:

```js
// After successful code verification, before creating session:
const notionUsersDbId = process.env.NOTION_DB_USERS;
const notionToken = process.env.NOTION_TOKEN;

const userLookup = await fetch(`https://api.notion.com/v1/databases/${notionUsersDbId}/query`, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${notionToken}`,
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    filter: { property: "Email", email: { equals: email.toLowerCase() } },
    page_size: 1,
  }),
});
const userResult = await userLookup.json();
const userPage = userResult.results?.[0];
const userName = userPage?.properties?.Name?.title?.[0]?.plain_text ?? "";
const userRole = userPage?.properties?.Role?.select?.name ?? "coordinator";

// Include in the session response:
return {
  sessionToken,
  email: email.toLowerCase(),
  name: userName,
  role: userRole,
  expiresAt: expiresAt.toMillis(),
};
```

- [ ] **Step 4: Update functions/.env**

Add:
```
NOTION_DB_USERS=<same-id-as-spa-attendance>
NOTION_TOKEN=<same-notion-token>
```

- [ ] **Step 5: Commit + create PR**

```bash
cd /Users/michaglio/Projects/spa-company
git add functions/src/sendLoginCode.js functions/src/verifyLoginCode.js functions/.env
git commit -m "feat: add role-based auth via shared Notion Users DB"
git push -u origin feat/role-based-auth
gh pr create --title "Add role-based auth via Notion Users DB" --body "$(cat <<'PREOF'
## Summary
- sendLoginCode now checks the Notion Users DB before sending OTP (rejects unknown emails)
- verifyLoginCode now returns user name + role from the Users DB in the session response
- Shares the same Users DB as spa-attendance for unified user management

## Test plan
- [ ] Try logging in with an email NOT in the Users DB → should be rejected
- [ ] Try logging in with an email IN the Users DB → code sent, login works
- [ ] Verify session response includes `name` and `role` fields
PREOF
)"
```

---

## Deployment — spa-attendance

After all 13 spa-attendance tasks, set the new secrets in Firebase App Hosting:

```bash
# Set new secrets (user needs to provide NOTION_DB_USERS)
firebase apphosting:secrets:set NOTION_DB_USERS
firebase apphosting:secrets:set MS_TENANT_ID
firebase apphosting:secrets:set MS_CLIENT_ID
firebase apphosting:secrets:set MS_CLIENT_SECRET
firebase apphosting:secrets:set MS_SENDER_EMAIL

# ADMIN_PASSCODE can be left (won't hurt) or deleted:
# firebase apphosting:secrets:delete ADMIN_PASSCODE
```

Values for MS_* secrets come from `spa-company/functions/.env`:
- `MS_TENANT_ID` = `aee01914-3a8b-43da-8b29-5bfc1b2a8787`
- `MS_CLIENT_ID` = `1a36560d-5a25-49e5-99b2-852eda176682`
- `MS_CLIENT_SECRET` = `REDACTED`
- `MS_SENDER_EMAIL` = `michal@spa-company.com`

`NOTION_DB_USERS` = ID from the Users DB URL (user provides).

## Self-Review

- **Spec coverage:** Auth flow (Tasks 2,3,6,7,9), Users DB (Task 4,8,10), role permissions (Tasks 5,8,12), device remember (Task 7,9), page migration (Task 11), API migration (Task 12), cleanup (Task 13), spa-company PR (Task 14). All spec sections covered.
- **Placeholder scan:** No TBDs. NOTION_DB_USERS is explicitly noted as "user provides" — not a code placeholder.
- **Type consistency:** `AdminSession` defined in Task 5 (`auth.ts`), used in Tasks 8,11,12. `Role` defined in Task 4 (`notion-users.ts`), re-exported and used in Tasks 5,6,7,8. `AppUser` defined in Task 4, used in Tasks 6,7,8,10. `EmailConfig` defined in Task 3, used in Task 6. All consistent.
- **Cookie name:** `admin_session` used consistently across: `auth.ts` (Task 5), `verify-code.ts` (Task 7), login page (Task 9), admin pages (Task 11), API endpoints (Task 12). The old `admin` cookie from the passcode system is no longer read anywhere after migration.
