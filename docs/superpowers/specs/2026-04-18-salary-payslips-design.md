# Salary & Payslips — Phase 1 Design Spec

**Date:** 2026-04-18
**Status:** Brainstorm complete, awaiting user review
**Project:** Extends `spa-attendance` (same repo, same deploy)

## Overview

Replace the manual Excel-based payslip workflow with an integrated system that combines supervisor-submitted attendance, HR-uploaded data for remaining employees, and auto-calculated payslips stored in Notion. Phase 1 covers data entry through PDF export. Employee self-service portal is Phase 3 (out of scope).

## Updated Workflow

1. **Supervisor submits attendance** via existing `/attendance/<slug>` → row lands in Attendance DB (already built).
2. **Admin reviews + approves** all attendance submissions in the admin dashboard.
3. **HR Payroll uploads Excel** on the site for remaining employees (in-house staff, office workers, anyone without supervisor-submitted hours) → parsed and written to Attendance DB.
4. **Admin clicks "Generate payslips"** for a month → app reads Attendance DB + Salary Config DB → creates Payslip rows with hours pre-filled and salary auto-calculated.
5. **Admin reviews in Notion** → adjusts one-off items (expenses, repayments, deductions) directly in Notion → marks status "Approved".
6. **Batch PDF export** from the admin dashboard (matching the current payslip data structure, cleaner layout).

## Notion Data Model

### Salary Config DB (new — one row per employee, rarely changes)

Stores per-employee salary parameters set by contract. Maintained by HR in Notion directly.

| Property | Type | Notes |
|---|---|---|
| Name | Title | Auto: employee's Name Surname |
| Employee | Relation → Candidates | One-to-one |
| Location | Relation → Locations | Denormalized for convenience |
| Employer | Text | Legal entity name (e.g. "SPA Company s.r.o.") |
| Base salary (€) | Number | Monthly fixed base |
| Commission rate (€/hr) | Number | Per commissionable (massage) hour |
| Overtime rate (€/hr) | Number | Per overtime hour |
| Meals allowance (€) | Number | Monthly fixed |
| Hours per month | Number | Contracted monthly hours (e.g. 160) |
| Bank account 1 (IBAN) | Text | "Stravne" account |
| Bank account 2 (IBAN) | Text | "VP" account |
| Bank 1 fixed amount (€) | Number | Fixed monthly transfer to bank 1 |
| Bank 2 fixed amount (€) | Number | Fixed monthly transfer to bank 2 |
| Active | Checkbox | Only active configs are used for payslip generation |

### Payslips DB (new — one row per employee per month, generated)

Created by the "Generate payslips" action. HR adjusts one-off fields directly in Notion before approval.

| Property | Type | Populated by |
|---|---|---|
| Name | Title | Auto: `"2026-03 — Kusuma Hohumruedi"` |
| Employee | Relation → Candidates | |
| Location | Relation → Locations | From attendance |
| Employer | Text | From Salary Config |
| Month | Date (1st of month) | |
| **Hours (from Attendance)** | | |
| Total hours | Number | ← Attendance DB |
| Commissionable hours | Number | ← Attendance DB |
| Overtime hours | Number | ← Attendance DB |
| Hours per month | Number | ← Salary Config (contracted) |
| Annual leave (days) | Number | ← Attendance DB |
| Sick leave (days) | Number | ← Attendance DB |
| **Salary items (auto-calculated + manual)** | | |
| Base salary (€) | Number | ← Salary Config |
| Commission rate (€/hr) | Number | ← Salary Config (for display on payslip) |
| Commission (€) | Number | = commissionable hrs × commission rate |
| Overtime (€) | Number | = overtime hrs × overtime rate |
| Meals (€) | Number | ← Salary Config |
| Expenses (€) | Number | Manual — HR enters in Notion |
| Repayments (€) | Number | Manual — HR enters in Notion |
| Other deductions label | Text | Manual — e.g. "Accommodation" |
| Other deductions (€) | Number | Manual — HR enters in Notion |
| Total salary (€) | Number | = base + commission + OT + meals + expenses - repayments - deductions |
| **Payments** | | |
| Bank 1 amount (€) | Number | ← Salary Config fixed amount |
| Bank 2 amount (€) | Number | ← Salary Config fixed amount |
| Additional payment (€) | Number | = total - bank1 - bank2 |
| Payment date 1 | Date | Admin sets (defaults to 1st of next month) |
| Payment date 2 | Date | Admin sets (defaults to 15th of next month) |
| Payment date 3 | Date | Admin sets (defaults to 16th of next month) |
| **Status** | | |
| Status | Select | Draft / Approved |
| Generated at | Created time | |

### Existing DBs (no schema changes)

- **Attendance DB** — already tracks per-employee per-month hours. No changes needed. HR Excel upload creates rows in the same format as supervisor submissions.
- **Candidates DB** — unchanged. Both Salary Config and Payslips link to it via relation.
- **Locations DB** — unchanged.

## New Features in spa-attendance

### 1. Attendance approval status

The Attendance DB already has a `Status` property (type: status) with options: Draft, Submitted, Approved, Rejected. No schema change needed.

**Workflow:**
- Supervisor submits → Status = `Submitted`
- HR Excel upload → Status = `Submitted` (or `Approved` directly since HR data is pre-verified)
- Admin reviews and sets → `Approved` or `Rejected`
- Only `Approved` attendance rows feed into payslip generation

**Admin dashboard change:** The existing report page gets an "Approve" / "Reject" button per row (or bulk "Approve all for this month"). Non-approved rows are visually distinct (amber background). The Notion API for status-type properties uses: `{ property: "Status", status: { equals: "Approved" } }` for filtering and `{ Status: { status: { name: "Approved" } } }` for updates.

### 2. HR Excel upload page (`/admin/upload`)

Accessible from the admin dashboard (same admin passcode). Accepts the same `.xlsx` format HR currently uses.

**Upload flow:**
1. HR picks a month and uploads an Excel file.
2. Server parses with `xlsx` (SheetJS) on the backend.
3. For each row, match employee by `First Name + Surname` against Candidates DB (`Name Surname` property).
4. Create or update Attendance rows for matched employees (same upsert logic as supervisor submissions).
5. Auto-set Status = Approved (HR-entered data doesn't need supervisor approval).
6. Return summary: `Created N, Updated M, Unmatched K` (with names of unmatched for HR to fix).

**Excel column mapping** (from the user's existing format):
- `First Name` + `Surname` → employee lookup
- `Hours_monthly` → Total hours
- `Massage_hours` → Commissionable hours
- `OVT_total` → converted to overtime hours (if it's a euro amount, divide by overtime rate; if it's hours, use directly — **needs user clarification during implementation**)
- Period → Month

Salary columns in the Excel (Base_salary, Commission_total, Meals, Expenses, etc.) are **ignored** during attendance upload — they come from Salary Config DB instead. This is the key workflow change: salary params live in Notion permanently, not re-entered monthly via Excel.

### 3. Generate payslips action (`/admin/payslips`)

New admin page (or section of existing admin page).

**Generate flow:**
1. Admin selects a month and clicks "Generate payslips".
2. Server queries:
   - All Approved Attendance rows for that month.
   - All active Salary Config rows.
3. For each employee with attendance:
   - Look up their Salary Config.
   - Calculate: commission = commissionable_hrs × rate, overtime = OT_hrs × OT_rate, total = base + commission + OT + meals - repayments - deductions.
   - Expenses, repayments, deductions default to 0 (HR fills in Notion later).
   - Upsert a Payslip row (Status = Draft).
4. Return summary: `Generated N payslips. M employees missing Salary Config (list names).`

**After generation:** Admin opens Notion Payslips DB, fills in expenses/repayments/deductions for each employee, then sets Status = Approved.

### 4. Batch PDF export

Admin page has a "Download PDF" button that:
1. Queries all Approved Payslip rows for the chosen month.
2. Renders each payslip as a page in a single PDF.
3. Layout: clean two-column design matching the data structure (Salary Items left, Payments right), with company branding (SPA Company Slovakia logo). Cleaner than the current HTML version but same data fields.
4. PDF generated server-side using a rendering library (e.g. `@react-pdf/renderer` or `puppeteer` — decide during planning).
5. Downloads as `payslips-2026-03.pdf`.

## Tech Stack Additions

- `xlsx` (SheetJS) — server-side Excel parsing for HR upload. Already used in the current HTML payslip tool.
- PDF rendering library — TBD during planning (options: `@react-pdf/renderer`, `pdf-lib`, or server-side Puppeteer rendering the payslip HTML).

## New Environment Variables

| Name | Purpose |
|---|---|
| `NOTION_DB_SALARY_CONFIG` | Salary Config database ID |
| `NOTION_DB_PAYSLIPS` | Payslips database ID |

Added to `apphosting.yaml` as Secret Manager references (same pattern as existing secrets).

## Security

- All new pages/endpoints are behind the existing admin passcode (same `admin` cookie).
- Salary data is sensitive (bank accounts, amounts). The admin passcode + httpOnly cookie + Notion's internal workspace permissions are sufficient for Phase 1 (internal tool, small admin team).
- No salary data is exposed to supervisors or employees in Phase 1.

## Out of Scope (Phase 1)

- Employee self-service portal (Phase 3).
- Per-employee authentication.
- Automated email/notification of payslips.
- Overtime euro-amount auto-calculation from the Excel (may need clarification on whether Excel OVT_total is hours or euros).
- Payslip history / versioning (re-generating overwrites Draft payslips).
- Multi-currency support (everything in EUR).

## Open Items

- **OVT_total column interpretation:** Is the Excel's `OVT_total` in hours or in euros? If euros, we can't reverse-calculate hours without knowing the rate. Needs user input during implementation.
- **PDF library choice:** Decided during implementation planning based on what integrates best with the existing Astro SSR setup.
- **Attendance Status property:** Already exists (type: status, options: Draft / Submitted / Approved / Rejected). No Notion changes needed. The redundant "Approval Status" select property should be deleted.
