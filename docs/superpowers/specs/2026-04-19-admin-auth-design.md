# Admin Auth — Role-Based OTP Login Design Spec

**Date:** 2026-04-19
**Status:** Brainstorm complete, awaiting user review
**Applies to:** Both `spa-attendance` (primary) and `spa-company` (PR)

## Overview

Replace the shared admin passcode with a role-based OTP login system. Admin users log in with their `@spa-company.com` or `@dmjeurope.com` email, receive a 6-digit code sent from `michal@spa-company.com` via Microsoft Graph API, and enter it to start a session. Roles control what each user can access. Devices can be remembered for 30-day sessions.

**What changes:**
- Admin pages get real per-user auth with roles.
- `ADMIN_PASSCODE` env var is removed.
- `PasscodeGate` component is removed from all admin pages.

**What stays unchanged:**
- Supervisor attendance flow (`/attendance/<slug>` + per-location passcode) — untouched.
- All existing attendance, upload, and payslips functionality — untouched.

## Auth Flow

### Login

1. User navigates to any admin page → redirected to `/admin/login` if no valid session cookie.
2. User enters their email address.
3. Server validates:
   - Email domain is `@spa-company.com` or `@dmjeurope.com`.
   - Email exists in the Notion **Users DB** with `Active = true`.
4. Server generates a 6-digit OTP (cryptographically random), stores it in an in-memory map with 10-minute TTL and max 3 verification attempts.
5. Server sends the code via **Microsoft Graph API** from `michal@spa-company.com`.
6. User enters the 6-digit code.
7. Server verifies → sets a signed JWT cookie (`admin_session`).

### Session

- **Standard session:** 24h TTL. After expiry, user must re-enter a new OTP.
- **Remembered device:** user ticks "Remember this device" at login. A `deviceId` (random UUID) is generated and stored in the browser's `localStorage`. The JWT includes this `deviceId` and gets a 30-day TTL. On subsequent visits, if the cookie's `deviceId` matches `localStorage`, the long session is trusted.
- **JWT payload:** `{ email, name, role, deviceId?, exp }`
- **Cookie:** `admin_session`, httpOnly, Secure, SameSite=Lax, Path=/admin.

### Logout

Clears the `admin_session` cookie. The `/admin/login` page has a visible "Sign out" link in the header when logged in.

## Roles & Permissions

### Notion Users DB (new — one row per authorized admin user)

| Property | Type | Notes |
|---|---|---|
| Name | Title | Display name |
| Email | Email | Must be @spa-company.com or @dmjeurope.com |
| Role | Select | Options: super-admin, admin, hr-payroll, coordinator |
| Active | Checkbox | Inactive users cannot log in |

### Permission Matrix

| Permission | super-admin | admin | hr-payroll | coordinator |
|---|---|---|---|---|
| View attendance report | ✅ | ✅ | ✅ | ✅ |
| Approve/reject attendance | ✅ | ✅ | ❌ | ❌ |
| Upload Excel | ✅ | ✅ | ✅ | ❌ |
| Generate payslips | ✅ | ✅ | ✅ | ❌ |
| Download payslip PDF | ✅ | ✅ | ✅ | ❌ |
| Manage users | ✅ | ✅ (limited) | ❌ | ❌ |

**Admin user management limitation:** admins can add/remove users with roles `hr-payroll` and `coordinator` only. They cannot create/modify `super-admin` or `admin` users. Only super-admins can promote to admin or super-admin.

## Page Structure

### Single login gate

`/admin/login` — the only page with a login form. All other admin pages check the session cookie server-side (or client-side redirect).

### Admin hub: `/admin`

After login, users land on `/admin` which serves as the hub with navigation:
- **Attendance** (current page — report + approve)
- **Upload Excel** → `/admin/upload`
- **Payslips** → `/admin/payslips`
- **Users** → `/admin/users` (visible only to super-admin and admin roles)

### Auth check on sub-pages

`/admin/upload`, `/admin/payslips`, `/admin/users` — no login gate of their own. They check the `admin_session` cookie:
- Missing or invalid → redirect to `/admin/login`
- Valid but wrong role for the page → show "Access denied" message
- Valid + correct role → render the page

### API endpoint auth

All `/api/admin/*` endpoints check the `admin_session` cookie (replacing the old `admin` cookie from the passcode system). Each endpoint specifies which roles are allowed. Unauthorized requests return 403 with `{ error: "forbidden", message: "Insufficient permissions" }`.

## Email Sending

Reuse the existing Microsoft Graph API setup from `spa-company/functions/src/sendLoginCode.js`:

1. Request OAuth token from `https://login.microsoftonline.com/{MS_TENANT_ID}/oauth2/v2.0/token` using client credentials.
2. Send email via `https://graph.microsoft.com/v1.0/users/{MS_SENDER_EMAIL}/sendMail`.
3. All OTP emails sent FROM `michal@spa-company.com` TO the user's email.
4. HTML email body with the 6-digit code + "Spa Company Attendance" branding.

### OTP Storage

In-memory `Map<string, { code: string, email: string, attempts: number, expiresAt: number }>` keyed by email. Each code:
- Expires after 10 minutes.
- Allows max 3 verification attempts (then must request a new code).
- Old codes for the same email are overwritten when a new code is requested.
- Rate limit: max 3 code requests per email per 10 minutes.

## Environment Variables

### New (both apps)

| Name | Purpose |
|---|---|
| `MS_TENANT_ID` | Azure AD tenant ID |
| `MS_CLIENT_ID` | Azure app registration client ID |
| `MS_CLIENT_SECRET` | Azure app registration secret |
| `MS_SENDER_EMAIL` | `michal@spa-company.com` |
| `NOTION_DB_USERS` | Users DB ID |

### Removed

| Name | Reason |
|---|---|
| `ADMIN_PASSCODE` | Replaced by OTP login |

## New Files (spa-attendance)

| File | Purpose |
|---|---|
| `src/lib/email.ts` | Microsoft Graph OTP sender (port from spa-company functions) |
| `src/lib/email.test.ts` | Tests for email module (mocked Graph API) |
| `src/lib/auth.ts` | Role checking helper: `requireRole(cookie, ...roles)` |
| `src/lib/auth.test.ts` | Tests for auth module |
| `src/lib/otp.ts` | OTP generation, storage, verification (in-memory) |
| `src/lib/otp.test.ts` | Tests for OTP module |
| `src/pages/admin/login.astro` | Email + OTP login page |
| `src/pages/admin/users.astro` | User management page |
| `src/pages/api/admin/send-code.ts` | POST: validate email → send OTP |
| `src/pages/api/admin/verify-code.ts` | POST: verify OTP → set session cookie |
| `src/pages/api/admin/users.ts` | GET/POST/DELETE: CRUD users in Notion |

## Modified Files (spa-attendance)

| File | Change |
|---|---|
| `src/lib/session.ts` | Extend JWT payload with email, name, role, deviceId |
| `src/env.d.ts` | Add MS_* and NOTION_DB_USERS env vars, remove ADMIN_PASSCODE |
| `apphosting.yaml` | Add 5 new secrets, remove ADMIN_PASSCODE |
| `src/pages/admin.astro` | Remove PasscodeGate, add session check + redirect to login |
| `src/pages/admin/upload.astro` | Remove PasscodeGate, add session check |
| `src/pages/admin/payslips.astro` | Remove PasscodeGate, add session check |
| `src/pages/api/admin/verify.ts` | Remove (replaced by verify-code.ts) |
| All admin API endpoints | Replace old admin cookie check with new `requireRole()` |
| `src/layouts/BaseLayout.astro` | Show logged-in user name + Sign Out link when admin session active |

## spa-company PR

Port the same auth pattern to the spa-company project:
- Add `auth.ts`, `otp.ts` (same modules)
- Replace existing `sendLoginCode` / `verifyLoginCode` Cloud Functions with the new role-based flow
- Share the same Notion Users DB
- PR to `main` branch of `spacompanybkk-sketch/spa-company`

## Initial Seed

Super-admin user: `michal@spa-company.com` — created in the Users DB during setup.

## Out of Scope

- Two-factor authentication beyond OTP email.
- Password-based login.
- OAuth/SSO with Google or Microsoft identity.
- Supervisor-side auth changes (they keep using location passcodes).
- Audit logging of who did what (deferred to a future phase).
