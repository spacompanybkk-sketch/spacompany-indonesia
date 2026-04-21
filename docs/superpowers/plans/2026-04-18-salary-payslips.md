# Salary & Payslips Phase 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the spa-attendance app with HR Excel upload for remaining employees, attendance approval workflow, auto-generated payslips from Attendance + Salary Config, and batch PDF export.

**Architecture:** Adds a second Notion repo module (`notion-salary.ts`) for Salary Config + Payslips CRUD, an Excel parser (`excel.ts`) for HR upload, and three new admin pages (upload, payslips, payslip PDF preview). Reuses the existing admin passcode auth, session system, and deploy pipeline. Client-side PDF generation using `html2pdf.js` via CDN (same pattern as the user's existing payslip HTML tool).

**Tech Stack:** Existing Astro v6 SSR + Tailwind v4 + `@notionhq/client` + `jose` + Vitest. New: `xlsx` (SheetJS, server-side Excel parsing), `html2pdf.js` (client-side CDN for PDF export).

**Spec:** `docs/superpowers/specs/2026-04-18-salary-payslips-design.md` (in spa-company repo)

**Project location:** `/Users/michaglio/Projects/spa-attendance/` (extends existing repo)

---

## File Map

```
src/
├── env.d.ts                                    # MODIFY: add NOTION_DB_SALARY_CONFIG, NOTION_DB_PAYSLIPS
├── i18n/labels.ts                              # MODIFY: add salary-related labels
├── lib/
│   ├── notion.ts                               # MODIFY: add status to AttendanceRow, updateAttendanceStatus()
│   ├── notion.test.ts                          # MODIFY: add tests for status update
│   ├── notion-salary.ts                        # CREATE: salary config + payslips Notion repo
│   ├── notion-salary.test.ts                   # CREATE: tests for salary repo
│   ├── excel.ts                                # CREATE: Excel parser for HR attendance upload
│   ├── excel.test.ts                           # CREATE: tests for Excel parser
│   └── payslip-calc.ts                         # CREATE: pure payslip calculation logic
│   └── payslip-calc.test.ts                    # CREATE: tests for calculation
├── components/
│   └── PayslipCard.astro                       # CREATE: payslip HTML template for PDF rendering
├── pages/
│   ├── admin.astro                             # MODIFY: add approve/reject buttons + nav links
│   ├── admin/
│   │   ├── upload.astro                        # CREATE: HR Excel upload page
│   │   └── payslips.astro                      # CREATE: payslips management + PDF export page
│   └── api/
│       └── admin/
│           ├── attendance-status.ts            # CREATE: POST — bulk approve/reject attendance
│           ├── upload-attendance.ts            # CREATE: POST — Excel upload → Attendance DB
│           ├── generate-payslips.ts            # CREATE: POST — generate payslips for month
│           └── payslips.ts                     # CREATE: GET — list payslips for month
apphosting.yaml                                 # MODIFY: add 2 new secret references
.env.example                                    # MODIFY: add 2 new env var placeholders
```

---

### Task 1: Config & Dependencies

**Files:**
- Modify: `/Users/michaglio/Projects/spa-attendance/src/env.d.ts`
- Modify: `/Users/michaglio/Projects/spa-attendance/apphosting.yaml`
- Modify: `/Users/michaglio/Projects/spa-attendance/.env.example`

- [ ] **Step 1: Install xlsx (SheetJS)**

```bash
cd /Users/michaglio/Projects/spa-attendance
npm install xlsx@^0.20
```

- [ ] **Step 2: Update `src/env.d.ts`**

Add the two new env vars to `ImportMetaEnv`:

```ts
/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  readonly NOTION_TOKEN: string;
  readonly NOTION_DB_LOCATIONS: string;
  readonly NOTION_DB_EMPLOYEES: string;
  readonly NOTION_DB_ATTENDANCE: string;
  readonly NOTION_DB_SALARY_CONFIG: string;
  readonly NOTION_DB_PAYSLIPS: string;
  readonly ADMIN_PASSCODE: string;
  readonly SESSION_SECRET: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

- [ ] **Step 3: Update `apphosting.yaml`**

Add after the SESSION_SECRET entry:

```yaml
  - variable: NOTION_DB_SALARY_CONFIG
    secret: NOTION_DB_SALARY_CONFIG
  - variable: NOTION_DB_PAYSLIPS
    secret: NOTION_DB_PAYSLIPS
```

- [ ] **Step 4: Update `.env.example`**

Add after NOTION_DB_ATTENDANCE line:

```
NOTION_DB_SALARY_CONFIG=00000000000000000000000000000000
NOTION_DB_PAYSLIPS=00000000000000000000000000000000
```

- [ ] **Step 5: Create local `.env` entries**

```bash
cd /Users/michaglio/Projects/spa-attendance
# Add to .env (don't overwrite existing values)
echo "" >> .env
echo "NOTION_DB_SALARY_CONFIG=b9202e8d666146119781842b4f13262c" >> .env
echo "NOTION_DB_PAYSLIPS=21495e38b69b4ff0a639d244992ea00b" >> .env
```

- [ ] **Step 6: Verify build**

```bash
cd /Users/michaglio/Projects/spa-attendance
npm run build
```

- [ ] **Step 7: Commit + push**

```bash
cd /Users/michaglio/Projects/spa-attendance
git add package.json package-lock.json src/env.d.ts apphosting.yaml .env.example
git commit -m "chore: add xlsx dependency and salary config + payslips env vars"
git push origin main
```

---

### Task 2: Bilingual Labels for Salary

**Files:**
- Modify: `/Users/michaglio/Projects/spa-attendance/src/i18n/labels.ts`

- [ ] **Step 1: Add salary-related labels**

Add these entries to the `L` object in `src/i18n/labels.ts`, after the existing `submittedAt` entry:

```ts
  // Salary & Payslips
  baseSalary:          { en: "Base salary",          sk: "Základný plat" },
  commissionRate:      { en: "Commission rate",      sk: "Sadzba provízie" },
  commission:          { en: "Commission",           sk: "Provízia" },
  overtime:            { en: "Overtime",              sk: "Nadčasy" },
  meals:               { en: "Meals",                sk: "Stravné" },
  expenses:            { en: "Expenses",             sk: "Výdavky" },
  repayments:          { en: "Repayments",           sk: "Splátky" },
  otherDeductions:     { en: "Other deductions",     sk: "Iné zrážky" },
  totalSalary:         { en: "Total salary",         sk: "Celkový plat" },
  bankAccount1:        { en: "Bank account 1",       sk: "Bankový účet 1" },
  bankAccount2:        { en: "Bank account 2",       sk: "Bankový účet 2" },
  additionalPayment:   { en: "Additional payment",   sk: "Ďalšia platba" },
  employer:            { en: "Employer",             sk: "Zamestnávateľ" },
  hoursPerMonth:       { en: "Hours per month",      sk: "Hodiny za mesiac" },
  status:              { en: "Status",               sk: "Stav" },
  payslips:            { en: "Payslips",             sk: "Výplatné pásky" },
  uploadExcel:         { en: "Upload Excel",         sk: "Nahrať Excel" },
  generatePayslips:    { en: "Generate payslips",    sk: "Generovať výplatné pásky" },
```

- [ ] **Step 2: Commit + push**

```bash
cd /Users/michaglio/Projects/spa-attendance
git add src/i18n/labels.ts
git commit -m "feat: add bilingual salary and payslip labels"
git push origin main
```

---

### Task 3: Payslip Calculation Logic (TDD)

Pure functions — no Notion dependency. Takes attendance data + salary config → produces payslip numbers.

**Files:**
- Create: `/Users/michaglio/Projects/spa-attendance/src/lib/payslip-calc.ts`
- Create: `/Users/michaglio/Projects/spa-attendance/src/lib/payslip-calc.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from "vitest";
import { calculatePayslip, type PayslipInput } from "./payslip-calc";

describe("calculatePayslip", () => {
  const base: PayslipInput = {
    totalHours: 160,
    commissionableHours: 80,
    overtimeHours: 4,
    annualLeaveDays: 2,
    sickLeaveDays: 0,
    baseSalary: 800,
    commissionRate: 3.5,
    overtimeRate: 8,
    mealsAllowance: 120,
    bank1FixedAmount: 200,
    bank2FixedAmount: 300,
    expenses: 0,
    repayments: 0,
    otherDeductions: 0,
  };

  it("calculates commission as commissionableHours × rate", () => {
    const r = calculatePayslip(base);
    expect(r.commission).toBe(280); // 80 × 3.5
  });

  it("calculates overtime as overtimeHours × rate", () => {
    const r = calculatePayslip(base);
    expect(r.overtime).toBe(32); // 4 × 8
  });

  it("calculates total salary correctly", () => {
    const r = calculatePayslip(base);
    // 800 + 280 + 32 + 120 + 0 - 0 - 0 = 1232
    expect(r.totalSalary).toBe(1232);
  });

  it("subtracts repayments and deductions from total", () => {
    const r = calculatePayslip({ ...base, repayments: 50, otherDeductions: 30 });
    // 800 + 280 + 32 + 120 + 0 - 50 - 30 = 1152
    expect(r.totalSalary).toBe(1152);
  });

  it("adds expenses to total", () => {
    const r = calculatePayslip({ ...base, expenses: 45 });
    // 800 + 280 + 32 + 120 + 45 - 0 - 0 = 1277
    expect(r.totalSalary).toBe(1277);
  });

  it("calculates additional payment as total - bank1 - bank2", () => {
    const r = calculatePayslip(base);
    // 1232 - 200 - 300 = 732
    expect(r.additionalPayment).toBe(732);
  });

  it("handles zero commission rate gracefully", () => {
    const r = calculatePayslip({ ...base, commissionRate: 0 });
    expect(r.commission).toBe(0);
  });

  it("rounds all amounts to 2 decimal places", () => {
    const r = calculatePayslip({ ...base, commissionRate: 3.333 });
    expect(r.commission).toBe(266.64); // 80 × 3.333 = 266.64
  });
});
```

- [ ] **Step 2: Run — FAIL**

```bash
cd /Users/michaglio/Projects/spa-attendance
npm test -- src/lib/payslip-calc.test.ts
```

- [ ] **Step 3: Write implementation**

```ts
export interface PayslipInput {
  totalHours: number;
  commissionableHours: number;
  overtimeHours: number;
  annualLeaveDays: number;
  sickLeaveDays: number;
  baseSalary: number;
  commissionRate: number;
  overtimeRate: number;
  mealsAllowance: number;
  bank1FixedAmount: number;
  bank2FixedAmount: number;
  expenses: number;
  repayments: number;
  otherDeductions: number;
}

export interface PayslipResult {
  commission: number;
  overtime: number;
  totalSalary: number;
  additionalPayment: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calculatePayslip(input: PayslipInput): PayslipResult {
  const commission = round2(input.commissionableHours * input.commissionRate);
  const overtime = round2(input.overtimeHours * input.overtimeRate);

  const totalSalary = round2(
    input.baseSalary +
    commission +
    overtime +
    input.mealsAllowance +
    input.expenses -
    input.repayments -
    input.otherDeductions
  );

  const additionalPayment = round2(
    totalSalary - input.bank1FixedAmount - input.bank2FixedAmount
  );

  return { commission, overtime, totalSalary, additionalPayment };
}
```

- [ ] **Step 4: Run — PASS (8 tests)**

- [ ] **Step 5: Commit + push**

```bash
cd /Users/michaglio/Projects/spa-attendance
git add src/lib/payslip-calc.ts src/lib/payslip-calc.test.ts
git commit -m "feat: add pure payslip calculation logic with tests"
git push origin main
```

---

### Task 4: Notion Salary Repo (TDD)

Separate module for Salary Config and Payslips Notion operations — keeps `notion.ts` focused on attendance.

**Files:**
- Create: `/Users/michaglio/Projects/spa-attendance/src/lib/notion-salary.ts`
- Create: `/Users/michaglio/Projects/spa-attendance/src/lib/notion-salary.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect, vi } from "vitest";
import { createSalaryRepo, type SalaryDbIds } from "./notion-salary";
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

const DBS: SalaryDbIds = { salaryConfig: "SC", payslips: "PS", attendance: "AT" };

describe("salary repo", () => {
  it("listActiveSalaryConfigs returns active configs", async () => {
    const c = fakeClient();
    c.query.mockResolvedValue({
      results: [{
        id: "sc1",
        properties: {
          Name: { title: [{ plain_text: "John Doe" }] },
          Employee: { relation: [{ id: "e1" }] },
          Location: { relation: [{ id: "loc1" }] },
          Employer: { rich_text: [{ plain_text: "SPA Company s.r.o." }] },
          "Base salary (€)": { number: 800 },
          "Commission rate (€/hr)": { number: 3.5 },
          "Overtime rate (€/hr)": { number: 8 },
          "Meals allowance (€)": { number: 120 },
          "Hours per month": { number: 160 },
          "Bank account 1 (IBAN)": { rich_text: [{ plain_text: "SK12345" }] },
          "Bank account 2 (IBAN)": { rich_text: [{ plain_text: "SK67890" }] },
          "Bank 1 fixed amount (€)": { number: 200 },
          "Bank 2 fixed amount (€)": { number: 300 },
          Active: { checkbox: true },
        },
      }],
    });
    const repo = createSalaryRepo(c, DBS);
    const configs = await repo.listActiveSalaryConfigs();
    expect(configs).toEqual([{
      id: "sc1",
      name: "John Doe",
      employeeId: "e1",
      locationId: "loc1",
      employer: "SPA Company s.r.o.",
      baseSalary: 800,
      commissionRate: 3.5,
      overtimeRate: 8,
      mealsAllowance: 120,
      hoursPerMonth: 160,
      bank1Iban: "SK12345",
      bank2Iban: "SK67890",
      bank1FixedAmount: 200,
      bank2FixedAmount: 300,
    }]);
  });

  it("upsertPayslip creates when no existing row", async () => {
    const c = fakeClient();
    c.query.mockResolvedValue({ results: [] });
    c.create.mockResolvedValue({ id: "new" });
    const repo = createSalaryRepo(c, DBS);
    const result = await repo.upsertPayslip({
      employeeName: "John Doe",
      employeeId: "e1",
      locationId: "loc1",
      employer: "SPA Company s.r.o.",
      month: "2026-03",
      totalHours: 160,
      commissionableHours: 80,
      overtimeHours: 4,
      hoursPerMonth: 160,
      annualLeaveDays: 2,
      sickLeaveDays: 0,
      baseSalary: 800,
      commissionRate: 3.5,
      commission: 280,
      overtime: 32,
      meals: 120,
      expenses: 0,
      repayments: 0,
      otherDeductionsLabel: "",
      otherDeductions: 0,
      totalSalary: 1232,
      bank1Amount: 200,
      bank2Amount: 300,
      additionalPayment: 732,
      paymentDate1: "2026-04-01",
      paymentDate2: "2026-04-15",
      paymentDate3: "2026-04-16",
    });
    expect(result).toBe("created");
    expect(c.create).toHaveBeenCalledOnce();
  });

  it("upsertPayslip updates when existing row found", async () => {
    const c = fakeClient();
    c.query.mockResolvedValue({ results: [{ id: "existing" }] });
    c.update.mockResolvedValue({ id: "existing" });
    const repo = createSalaryRepo(c, DBS);
    const result = await repo.upsertPayslip({
      employeeName: "John Doe",
      employeeId: "e1",
      locationId: "loc1",
      employer: "SPA Company s.r.o.",
      month: "2026-03",
      totalHours: 160,
      commissionableHours: 80,
      overtimeHours: 4,
      hoursPerMonth: 160,
      annualLeaveDays: 2,
      sickLeaveDays: 0,
      baseSalary: 800,
      commissionRate: 3.5,
      commission: 280,
      overtime: 32,
      meals: 120,
      expenses: 0,
      repayments: 0,
      otherDeductionsLabel: "",
      otherDeductions: 0,
      totalSalary: 1232,
      bank1Amount: 200,
      bank2Amount: 300,
      additionalPayment: 732,
      paymentDate1: "2026-04-01",
      paymentDate2: "2026-04-15",
      paymentDate3: "2026-04-16",
    });
    expect(result).toBe("updated");
    expect(c.update).toHaveBeenCalledWith(expect.objectContaining({ page_id: "existing" }));
  });

  it("listPayslipsForMonth returns flattened rows", async () => {
    const c = fakeClient();
    c.query.mockResolvedValue({
      results: [{
        id: "p1",
        created_time: "2026-04-10T10:00:00Z",
        properties: {
          Employee: { relation: [{ id: "e1" }] },
          Location: { relation: [{ id: "loc1" }] },
          Employer: { rich_text: [{ plain_text: "SPA Company s.r.o." }] },
          "Total hours": { number: 160 },
          "Commissionable hours": { number: 80 },
          "Overtime hours": { number: 4 },
          "Hours per month": { number: 160 },
          "Annual leave (days)": { number: 2 },
          "Sick leave (days)": { number: 0 },
          "Base salary (€)": { number: 800 },
          "Commission rate (€/hr)": { number: 3.5 },
          "Commission (€)": { number: 280 },
          "Overtime (€)": { number: 32 },
          "Meals (€)": { number: 120 },
          "Expenses (€)": { number: 0 },
          "Repayments (€)": { number: 0 },
          "Other deductions label": { rich_text: [] },
          "Other deductions (€)": { number: 0 },
          "Total salary (€)": { number: 1232 },
          "Bank 1 amount (€)": { number: 200 },
          "Bank 2 amount (€)": { number: 300 },
          "Additional payment (€)": { number: 732 },
          "Payment date 1": { date: { start: "2026-04-01" } },
          "Payment date 2": { date: { start: "2026-04-15" } },
          "Payment date 3": { date: { start: "2026-04-16" } },
          Status: { select: { name: "Draft" } },
        },
      }],
    });
    const repo = createSalaryRepo(c, DBS);
    const rows = await repo.listPayslipsForMonth("2026-03");
    expect(rows).toHaveLength(1);
    expect(rows[0].employeeId).toBe("e1");
    expect(rows[0].totalSalary).toBe(1232);
    expect(rows[0].status).toBe("Draft");
  });

  it("listApprovedAttendanceForMonth filters by Approved status", async () => {
    const c = fakeClient();
    c.query.mockResolvedValue({
      results: [{
        id: "a1",
        created_time: "2026-04-10T10:00:00Z",
        properties: {
          Employee: { relation: [{ id: "e1" }] },
          Location: { relation: [{ id: "loc1" }] },
          "Total hours": { number: 160 },
          "Commissionable hours": { number: 80 },
          "Overtime hours": { number: 4 },
          "Annual leave (days)": { number: 2 },
          "Sick leave (days)": { number: 0 },
          Notes: { rich_text: [{ plain_text: "ok" }] },
          "Submitted by": { rich_text: [{ plain_text: "Anna" }] },
          Status: { status: { name: "Approved" } },
        },
      }],
    });
    const repo = createSalaryRepo(c, DBS);
    const rows = await repo.listApprovedAttendanceForMonth("2026-03");
    expect(rows).toHaveLength(1);
    // Verify filter includes Status = Approved
    const filter = c.query.mock.calls[0][0].filter;
    expect(JSON.stringify(filter)).toContain("Approved");
  });
});
```

- [ ] **Step 2: Run — FAIL**

```bash
cd /Users/michaglio/Projects/spa-attendance
npm test -- src/lib/notion-salary.test.ts
```

- [ ] **Step 3: Write `notion-salary.ts`**

```ts
import type { NotionLike } from "./notion";

// ------- helpers (same as notion.ts) -------
const text = (p: any): string =>
  (p?.rich_text?.[0]?.plain_text ?? p?.title?.[0]?.plain_text ?? "") as string;
const num = (p: any): number => (typeof p?.number === "number" ? p.number : 0);
const rel = (p: any): string[] => (p?.relation ?? []).map((r: any) => r.id);
const dateVal = (p: any): string => p?.date?.start ?? "";
const selVal = (p: any): string => p?.select?.name ?? p?.status?.name ?? "";

export interface SalaryDbIds {
  salaryConfig: string;
  payslips: string;
  attendance: string;
}

export interface SalaryConfig {
  id: string;
  name: string;
  employeeId: string;
  locationId: string;
  employer: string;
  baseSalary: number;
  commissionRate: number;
  overtimeRate: number;
  mealsAllowance: number;
  hoursPerMonth: number;
  bank1Iban: string;
  bank2Iban: string;
  bank1FixedAmount: number;
  bank2FixedAmount: number;
}

export interface PayslipEntry {
  employeeName: string;
  employeeId: string;
  locationId: string;
  employer: string;
  month: string;
  totalHours: number;
  commissionableHours: number;
  overtimeHours: number;
  hoursPerMonth: number;
  annualLeaveDays: number;
  sickLeaveDays: number;
  baseSalary: number;
  commissionRate: number;
  commission: number;
  overtime: number;
  meals: number;
  expenses: number;
  repayments: number;
  otherDeductionsLabel: string;
  otherDeductions: number;
  totalSalary: number;
  bank1Amount: number;
  bank2Amount: number;
  additionalPayment: number;
  paymentDate1: string;
  paymentDate2: string;
  paymentDate3: string;
}

export interface PayslipRow {
  id: string;
  employeeId: string;
  locationId: string;
  employer: string;
  totalHours: number;
  commissionableHours: number;
  overtimeHours: number;
  hoursPerMonth: number;
  annualLeaveDays: number;
  sickLeaveDays: number;
  baseSalary: number;
  commissionRate: number;
  commission: number;
  overtime: number;
  meals: number;
  expenses: number;
  repayments: number;
  otherDeductionsLabel: string;
  otherDeductions: number;
  totalSalary: number;
  bank1Amount: number;
  bank2Amount: number;
  additionalPayment: number;
  paymentDate1: string;
  paymentDate2: string;
  paymentDate3: string;
  status: string;
  generatedAt: string;
}

export interface ApprovedAttendanceRow {
  employeeId: string;
  locationId: string;
  totalHours: number;
  commissionableHours: number;
  overtimeHours: number;
  annualLeaveDays: number;
  sickLeaveDays: number;
}

export function createSalaryRepo(client: NotionLike, dbs: SalaryDbIds) {

  async function listActiveSalaryConfigs(): Promise<SalaryConfig[]> {
    const { results } = await client.databases.query({
      database_id: dbs.salaryConfig,
      filter: { property: "Active", checkbox: { equals: true } },
      sorts: [{ property: "Name", direction: "ascending" }],
      page_size: 100,
    });
    return results.map((r: any) => ({
      id: r.id,
      name: text(r.properties.Name),
      employeeId: rel(r.properties.Employee)[0] ?? "",
      locationId: rel(r.properties.Location)[0] ?? "",
      employer: text(r.properties.Employer),
      baseSalary: num(r.properties["Base salary (€)"]),
      commissionRate: num(r.properties["Commission rate (€/hr)"]),
      overtimeRate: num(r.properties["Overtime rate (€/hr)"]),
      mealsAllowance: num(r.properties["Meals allowance (€)"]),
      hoursPerMonth: num(r.properties["Hours per month"]),
      bank1Iban: text(r.properties["Bank account 1 (IBAN)"]),
      bank2Iban: text(r.properties["Bank account 2 (IBAN)"]),
      bank1FixedAmount: num(r.properties["Bank 1 fixed amount (€)"]),
      bank2FixedAmount: num(r.properties["Bank 2 fixed amount (€)"]),
    }));
  }

  async function findPayslipPage(employeeId: string, month: string): Promise<string | null> {
    const { results } = await client.databases.query({
      database_id: dbs.payslips,
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

  function buildPayslipProps(e: PayslipEntry) {
    return {
      Name: { title: [{ text: { content: `${e.month} — ${e.employeeName}` } }] },
      Employee: { relation: [{ id: e.employeeId }] },
      Location: { relation: [{ id: e.locationId }] },
      Employer: { rich_text: [{ text: { content: e.employer } }] },
      Month: { date: { start: `${e.month}-01` } },
      "Total hours": { number: e.totalHours },
      "Commissionable hours": { number: e.commissionableHours },
      "Overtime hours": { number: e.overtimeHours },
      "Hours per month": { number: e.hoursPerMonth },
      "Annual leave (days)": { number: e.annualLeaveDays },
      "Sick leave (days)": { number: e.sickLeaveDays },
      "Base salary (€)": { number: e.baseSalary },
      "Commission rate (€/hr)": { number: e.commissionRate },
      "Commission (€)": { number: e.commission },
      "Overtime (€)": { number: e.overtime },
      "Meals (€)": { number: e.meals },
      "Expenses (€)": { number: e.expenses },
      "Repayments (€)": { number: e.repayments },
      "Other deductions label": { rich_text: [{ text: { content: e.otherDeductionsLabel } }] },
      "Other deductions (€)": { number: e.otherDeductions },
      "Total salary (€)": { number: e.totalSalary },
      "Bank 1 amount (€)": { number: e.bank1Amount },
      "Bank 2 amount (€)": { number: e.bank2Amount },
      "Additional payment (€)": { number: e.additionalPayment },
      "Payment date 1": { date: e.paymentDate1 ? { start: e.paymentDate1 } : null },
      "Payment date 2": { date: e.paymentDate2 ? { start: e.paymentDate2 } : null },
      "Payment date 3": { date: e.paymentDate3 ? { start: e.paymentDate3 } : null },
      Status: { select: { name: "Draft" } },
    };
  }

  async function upsertPayslip(e: PayslipEntry): Promise<"created" | "updated"> {
    const existing = await findPayslipPage(e.employeeId, e.month);
    const properties = buildPayslipProps(e);
    if (existing) {
      await client.pages.update({ page_id: existing, properties });
      return "updated";
    }
    await client.pages.create({ parent: { database_id: dbs.payslips }, properties });
    return "created";
  }

  async function listPayslipsForMonth(month: string): Promise<PayslipRow[]> {
    const { results } = await client.databases.query({
      database_id: dbs.payslips,
      filter: { property: "Month", date: { equals: `${month}-01` } },
      sorts: [{ property: "Name", direction: "ascending" }],
      page_size: 100,
    });
    return results.map((r: any) => ({
      id: r.id,
      employeeId: rel(r.properties.Employee)[0] ?? "",
      locationId: rel(r.properties.Location)[0] ?? "",
      employer: text(r.properties.Employer),
      totalHours: num(r.properties["Total hours"]),
      commissionableHours: num(r.properties["Commissionable hours"]),
      overtimeHours: num(r.properties["Overtime hours"]),
      hoursPerMonth: num(r.properties["Hours per month"]),
      annualLeaveDays: num(r.properties["Annual leave (days)"]),
      sickLeaveDays: num(r.properties["Sick leave (days)"]),
      baseSalary: num(r.properties["Base salary (€)"]),
      commissionRate: num(r.properties["Commission rate (€/hr)"]),
      commission: num(r.properties["Commission (€)"]),
      overtime: num(r.properties["Overtime (€)"]),
      meals: num(r.properties["Meals (€)"]),
      expenses: num(r.properties["Expenses (€)"]),
      repayments: num(r.properties["Repayments (€)"]),
      otherDeductionsLabel: text(r.properties["Other deductions label"]),
      otherDeductions: num(r.properties["Other deductions (€)"]),
      totalSalary: num(r.properties["Total salary (€)"]),
      bank1Amount: num(r.properties["Bank 1 amount (€)"]),
      bank2Amount: num(r.properties["Bank 2 amount (€)"]),
      additionalPayment: num(r.properties["Additional payment (€)"]),
      paymentDate1: dateVal(r.properties["Payment date 1"]),
      paymentDate2: dateVal(r.properties["Payment date 2"]),
      paymentDate3: dateVal(r.properties["Payment date 3"]),
      status: selVal(r.properties.Status),
      generatedAt: r.created_time,
    }));
  }

  async function listApprovedAttendanceForMonth(month: string): Promise<ApprovedAttendanceRow[]> {
    const { results } = await client.databases.query({
      database_id: dbs.attendance,
      filter: {
        and: [
          { property: "Month", date: { equals: `${month}-01` } },
          { property: "Status", status: { equals: "Approved" } },
        ],
      },
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
    }));
  }

  return {
    listActiveSalaryConfigs,
    upsertPayslip,
    listPayslipsForMonth,
    listApprovedAttendanceForMonth,
  };
}

export type SalaryRepo = ReturnType<typeof createSalaryRepo>;
```

- [ ] **Step 4: Run — PASS (5 tests)**

```bash
cd /Users/michaglio/Projects/spa-attendance
npm test -- src/lib/notion-salary.test.ts
```

- [ ] **Step 5: Commit + push**

```bash
cd /Users/michaglio/Projects/spa-attendance
git add src/lib/notion-salary.ts src/lib/notion-salary.test.ts
git commit -m "feat: add Notion salary repo for Salary Config + Payslips CRUD with tests"
git push origin main
```

---

### Task 5: Attendance Status Update in Notion Repo (TDD)

**Files:**
- Modify: `/Users/michaglio/Projects/spa-attendance/src/lib/notion.ts`
- Modify: `/Users/michaglio/Projects/spa-attendance/src/lib/notion.test.ts`

- [ ] **Step 1: Add `status` field to `AttendanceRow` in `notion.ts`**

In `notion.ts`, add `status: string;` to the `AttendanceRow` interface (after `submittedAt`):

```ts
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
  status: string;
}
```

- [ ] **Step 2: Update `listAttendanceForMonth` to include status**

In the `results.map(...)` at the end of `listAttendanceForMonth`, add after the `submittedAt` line:

```ts
      status: r.properties.Status?.status?.name ?? r.properties.Status?.select?.name ?? "",
```

- [ ] **Step 3: Add `updateAttendanceStatus` method**

Add this function inside `createNotionRepo`, before the `return` statement:

```ts
  async function updateAttendanceStatus(
    pageId: string,
    status: "Submitted" | "Approved" | "Rejected",
  ): Promise<void> {
    await client.pages.update({
      page_id: pageId,
      properties: {
        Status: { status: { name: status } },
      },
    });
  }
```

And add `updateAttendanceStatus` to the returned object.

- [ ] **Step 4: Update `listAttendanceForMonth` to also return the page ID**

Add `id: string;` to the `AttendanceRow` interface and `id: r.id,` to the mapping.

- [ ] **Step 5: Add test for `updateAttendanceStatus` in `notion.test.ts`**

Add at the end of the `describe("notion repo", ...)` block:

```ts
  it("updateAttendanceStatus calls pages.update with status", async () => {
    const c = fakeClient();
    c.update.mockResolvedValue({ id: "a1" });
    const repo = createNotionRepo(c, DBS);
    await repo.updateAttendanceStatus("a1", "Approved");
    expect(c.update).toHaveBeenCalledWith({
      page_id: "a1",
      properties: { Status: { status: { name: "Approved" } } },
    });
  });
```

- [ ] **Step 6: Update the `listAttendanceForMonth` test mock to include Status and id**

In the existing `listAttendanceForMonth` test, add to the mock result object:
- `id: "a1"` at the top level (it's already there)
- `Status: { status: { name: "Submitted" } }` in properties

And update the expect to include `id: "a1"` and `status: "Submitted"`.

- [ ] **Step 7: Run tests — PASS**

```bash
cd /Users/michaglio/Projects/spa-attendance
npm test -- src/lib/notion.test.ts
```

- [ ] **Step 8: Commit + push**

```bash
cd /Users/michaglio/Projects/spa-attendance
git add src/lib/notion.ts src/lib/notion.test.ts
git commit -m "feat: add attendance status field and updateAttendanceStatus method"
git push origin main
```

---

### Task 6: Excel Parser (TDD)

**Files:**
- Create: `/Users/michaglio/Projects/spa-attendance/src/lib/excel.ts`
- Create: `/Users/michaglio/Projects/spa-attendance/src/lib/excel.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from "vitest";
import { parseAttendanceExcel, type ParsedAttendanceRow } from "./excel";
import * as XLSX from "xlsx";

function createTestXlsx(rows: Record<string, unknown>[]): ArrayBuffer {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}

describe("parseAttendanceExcel", () => {
  it("parses a valid Excel with expected columns", () => {
    const buf = createTestXlsx([
      { "First Name": "John", Surname: "Doe", Hours_monthly: 160, Massage_hours: 80, OVT_total: 4 },
      { "First Name": "Jane", Surname: "Smith", Hours_monthly: 140, Massage_hours: 60, OVT_total: 0 },
    ]);
    const rows = parseAttendanceExcel(buf);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      firstName: "John",
      surname: "Doe",
      totalHours: 160,
      commissionableHours: 80,
      overtimeHours: 4,
      annualLeaveDays: 0,
      sickLeaveDays: 0,
    });
  });

  it("handles missing optional columns gracefully", () => {
    const buf = createTestXlsx([
      { "First Name": "John", Surname: "Doe", Hours_monthly: 160 },
    ]);
    const rows = parseAttendanceExcel(buf);
    expect(rows[0].commissionableHours).toBe(0);
    expect(rows[0].overtimeHours).toBe(0);
  });

  it("handles alternative column names", () => {
    const buf = createTestXlsx([
      { "First name": "John", Surname: "Doe", "Hours per month": 160, Massage_hours: 80, OVT_total: 4 },
    ]);
    const rows = parseAttendanceExcel(buf);
    expect(rows[0].firstName).toBe("John");
    expect(rows[0].totalHours).toBe(160);
  });

  it("skips rows with empty names", () => {
    const buf = createTestXlsx([
      { "First Name": "John", Surname: "Doe", Hours_monthly: 160 },
      { "First Name": "", Surname: "", Hours_monthly: 0 },
    ]);
    const rows = parseAttendanceExcel(buf);
    expect(rows).toHaveLength(1);
  });

  it("coerces string numbers to numbers", () => {
    const buf = createTestXlsx([
      { "First Name": "John", Surname: "Doe", Hours_monthly: "160", Massage_hours: "80.5" },
    ]);
    const rows = parseAttendanceExcel(buf);
    expect(rows[0].totalHours).toBe(160);
    expect(rows[0].commissionableHours).toBe(80.5);
  });
});
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Write `excel.ts`**

```ts
import * as XLSX from "xlsx";

export interface ParsedAttendanceRow {
  firstName: string;
  surname: string;
  totalHours: number;
  commissionableHours: number;
  overtimeHours: number;
  annualLeaveDays: number;
  sickLeaveDays: number;
}

function toNum(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") return parseFloat(v) || 0;
  return 0;
}

function pick(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && row[k] !== "") return row[k];
  }
  return undefined;
}

export function parseAttendanceExcel(data: ArrayBuffer): ParsedAttendanceRow[] {
  const workbook = XLSX.read(data, { type: "array", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  return rawRows
    .map((row) => ({
      firstName: String(pick(row, "First Name", "First name") ?? "").trim(),
      surname: String(pick(row, "Surname", "Last Name", "Last name") ?? "").trim(),
      totalHours: toNum(pick(row, "Hours_monthly", "Hours per month", "Total hours")),
      commissionableHours: toNum(pick(row, "Massage_hours", "Commissionable hours")),
      overtimeHours: toNum(pick(row, "OVT_total", "Overtime hours", "Overtime")),
      annualLeaveDays: toNum(pick(row, "Annual_leave", "Annual leave (days)", "Annual leave")),
      sickLeaveDays: toNum(pick(row, "Sick_leave", "Sick leave (days)", "Sick leave")),
    }))
    .filter((r) => r.firstName || r.surname);
}
```

- [ ] **Step 4: Run — PASS (5 tests)**

- [ ] **Step 5: Commit + push**

```bash
cd /Users/michaglio/Projects/spa-attendance
git add src/lib/excel.ts src/lib/excel.test.ts
git commit -m "feat: add Excel parser for HR attendance upload with tests"
git push origin main
```

---

### Task 7: API — Attendance Status Update

**Files:**
- Create: `/Users/michaglio/Projects/spa-attendance/src/pages/api/admin/attendance-status.ts`

- [ ] **Step 1: Write the endpoint**

```ts
import type { APIRoute } from "astro";
import { createNotionClient, createNotionRepo } from "../../../lib/notion";
import { readCookie, verifySession } from "../../../lib/session";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const token = readCookie(request.headers.get("cookie") ?? "", "admin");
  if (!token) return j(401, { error: "unauthorized", message: "Not logged in" });
  try { await verifySession(token, import.meta.env.SESSION_SECRET); }
  catch { return j(401, { error: "unauthorized", message: "Session invalid" }); }

  let body: { pageIds?: string[]; status?: string };
  try { body = await request.json(); } catch { return j(400, { error: "bad_request", message: "Invalid JSON" }); }

  const { pageIds, status } = body;
  if (!Array.isArray(pageIds) || pageIds.length === 0) return j(400, { error: "bad_request", message: "No pageIds" });
  if (status !== "Approved" && status !== "Rejected") return j(400, { error: "bad_request", message: "Status must be Approved or Rejected" });

  try {
    const repo = createNotionRepo(
      createNotionClient(import.meta.env.NOTION_TOKEN),
      {
        locations: import.meta.env.NOTION_DB_LOCATIONS,
        employees: import.meta.env.NOTION_DB_EMPLOYEES,
        attendance: import.meta.env.NOTION_DB_ATTENDANCE,
      },
    );
    let updated = 0;
    const failed: Array<{ pageId: string; error: string }> = [];
    for (const pageId of pageIds) {
      try {
        await repo.updateAttendanceStatus(pageId, status);
        updated++;
      } catch (err) {
        console.error("status update failed", err);
        failed.push({ pageId, error: "Notion update failed" });
      }
    }
    return j(200, { updated, failed });
  } catch (err) {
    console.error("attendance status update failed", err);
    return j(502, { error: "notion_unavailable", message: "Notion is unreachable" });
  }
};

function j(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
```

- [ ] **Step 2: Build + verify**

```bash
cd /Users/michaglio/Projects/spa-attendance
npm run build
```

- [ ] **Step 3: Commit + push**

```bash
cd /Users/michaglio/Projects/spa-attendance
git add src/pages/api/admin/attendance-status.ts
git commit -m "feat: add attendance status update endpoint (approve/reject)"
git push origin main
```

---

### Task 8: API — Excel Upload

**Files:**
- Create: `/Users/michaglio/Projects/spa-attendance/src/pages/api/admin/upload-attendance.ts`

- [ ] **Step 1: Write the endpoint**

```ts
import type { APIRoute } from "astro";
import { createNotionClient, createNotionRepo } from "../../../lib/notion";
import { readCookie, verifySession } from "../../../lib/session";
import { isValidMonthKey } from "../../../lib/month";
import { parseAttendanceExcel } from "../../../lib/excel";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const token = readCookie(request.headers.get("cookie") ?? "", "admin");
  if (!token) return j(401, { error: "unauthorized", message: "Not logged in" });
  try { await verifySession(token, import.meta.env.SESSION_SECRET); }
  catch { return j(401, { error: "unauthorized", message: "Session invalid" }); }

  let formData: FormData;
  try { formData = await request.formData(); } catch { return j(400, { error: "bad_request", message: "Invalid form data" }); }

  const file = formData.get("file") as File | null;
  const month = formData.get("month") as string | null;
  if (!file) return j(400, { error: "bad_request", message: "No file" });
  if (!month || !isValidMonthKey(month)) return j(400, { error: "bad_request", message: "Invalid month" });

  try {
    const buffer = await file.arrayBuffer();
    const parsed = parseAttendanceExcel(buffer);

    const repo = createNotionRepo(
      createNotionClient(import.meta.env.NOTION_TOKEN),
      {
        locations: import.meta.env.NOTION_DB_LOCATIONS,
        employees: import.meta.env.NOTION_DB_EMPLOYEES,
        attendance: import.meta.env.NOTION_DB_ATTENDANCE,
      },
    );

    // Get ALL Operational Leasing employees to match by name
    const locations = await repo.listActiveLocations();
    const allEmployees: Array<{ id: string; name: string; locationId: string }> = [];
    for (const loc of locations) {
      const emps = await repo.listEmployeesForLocation(loc.id);
      for (const e of emps) allEmployees.push({ id: e.id, name: e.name, locationId: loc.id });
    }

    // Build name → employee lookup (case-insensitive)
    const byName = new Map<string, typeof allEmployees[0]>();
    for (const e of allEmployees) byName.set(e.name.toLowerCase(), e);

    let created = 0, updated = 0;
    const unmatched: string[] = [];
    const failed: Array<{ name: string; error: string }> = [];

    for (const row of parsed) {
      const fullName = `${row.firstName} ${row.surname}`.trim().toLowerCase();
      const emp = byName.get(fullName);
      if (!emp) {
        unmatched.push(`${row.firstName} ${row.surname}`);
        continue;
      }
      try {
        const result = await repo.upsertAttendance({
          employeeId: emp.id,
          employeeName: emp.name,
          locationId: emp.locationId,
          month,
          submittedBy: "HR Excel Upload",
          totalHours: row.totalHours,
          commissionableHours: row.commissionableHours,
          overtimeHours: row.overtimeHours,
          annualLeaveDays: row.annualLeaveDays,
          sickLeaveDays: row.sickLeaveDays,
          notes: "",
        });
        if (result === "created") created++; else updated++;
      } catch (err) {
        console.error("upsert failed for", fullName, err);
        failed.push({ name: `${row.firstName} ${row.surname}`, error: "Notion write failed" });
      }
    }

    return j(200, { parsed: parsed.length, created, updated, unmatched, failed });
  } catch (err) {
    console.error("upload-attendance failed", err);
    return j(502, { error: "notion_unavailable", message: "Failed to process upload" });
  }
};

function j(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
```

- [ ] **Step 2: Build + verify**

- [ ] **Step 3: Commit + push**

```bash
cd /Users/michaglio/Projects/spa-attendance
git add src/pages/api/admin/upload-attendance.ts
git commit -m "feat: add HR Excel upload endpoint for bulk attendance import"
git push origin main
```

---

### Task 9: API — Generate Payslips

**Files:**
- Create: `/Users/michaglio/Projects/spa-attendance/src/pages/api/admin/generate-payslips.ts`

- [ ] **Step 1: Write the endpoint**

```ts
import type { APIRoute } from "astro";
import { createNotionClient } from "../../../lib/notion";
import { createSalaryRepo } from "../../../lib/notion-salary";
import { readCookie, verifySession } from "../../../lib/session";
import { isValidMonthKey, previousMonth } from "../../../lib/month";
import { calculatePayslip } from "../../../lib/payslip-calc";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const token = readCookie(request.headers.get("cookie") ?? "", "admin");
  if (!token) return j(401, { error: "unauthorized", message: "Not logged in" });
  try { await verifySession(token, import.meta.env.SESSION_SECRET); }
  catch { return j(401, { error: "unauthorized", message: "Session invalid" }); }

  let body: { month?: string };
  try { body = await request.json(); } catch { return j(400, { error: "bad_request", message: "Invalid JSON" }); }
  const month = body.month;
  if (!month || !isValidMonthKey(month)) return j(400, { error: "bad_request", message: "Invalid month" });

  try {
    const client = createNotionClient(import.meta.env.NOTION_TOKEN);
    const repo = createSalaryRepo(client, {
      salaryConfig: import.meta.env.NOTION_DB_SALARY_CONFIG,
      payslips: import.meta.env.NOTION_DB_PAYSLIPS,
      attendance: import.meta.env.NOTION_DB_ATTENDANCE,
    });

    const [configs, attendance] = await Promise.all([
      repo.listActiveSalaryConfigs(),
      repo.listApprovedAttendanceForMonth(month),
    ]);

    // Build lookup: employeeId → attendance
    const attendanceByEmployee = new Map(attendance.map(a => [a.employeeId, a]));
    // Build lookup: employeeId → salary config
    const configByEmployee = new Map(configs.map(c => [c.employeeId, c]));

    // Default payment dates: 1st, 15th, 16th of the NEXT month
    const [y, m] = month.split("-").map(Number);
    const nextMonth = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
    const defaultDate1 = `${nextMonth}-01`;
    const defaultDate2 = `${nextMonth}-15`;
    const defaultDate3 = `${nextMonth}-16`;

    let created = 0, updated = 0;
    const missingConfig: string[] = [];
    const missingAttendance: string[] = [];
    const failed: Array<{ name: string; error: string }> = [];

    // Generate payslip for each employee that has BOTH attendance + config
    for (const [empId, att] of attendanceByEmployee) {
      const config = configByEmployee.get(empId);
      if (!config) {
        missingConfig.push(empId);
        continue;
      }

      const calc = calculatePayslip({
        totalHours: att.totalHours,
        commissionableHours: att.commissionableHours,
        overtimeHours: att.overtimeHours,
        annualLeaveDays: att.annualLeaveDays,
        sickLeaveDays: att.sickLeaveDays,
        baseSalary: config.baseSalary,
        commissionRate: config.commissionRate,
        overtimeRate: config.overtimeRate,
        mealsAllowance: config.mealsAllowance,
        bank1FixedAmount: config.bank1FixedAmount,
        bank2FixedAmount: config.bank2FixedAmount,
        expenses: 0,
        repayments: 0,
        otherDeductions: 0,
      });

      try {
        const result = await repo.upsertPayslip({
          employeeName: config.name,
          employeeId: empId,
          locationId: att.locationId || config.locationId,
          employer: config.employer,
          month,
          totalHours: att.totalHours,
          commissionableHours: att.commissionableHours,
          overtimeHours: att.overtimeHours,
          hoursPerMonth: config.hoursPerMonth,
          annualLeaveDays: att.annualLeaveDays,
          sickLeaveDays: att.sickLeaveDays,
          baseSalary: config.baseSalary,
          commissionRate: config.commissionRate,
          commission: calc.commission,
          overtime: calc.overtime,
          meals: config.mealsAllowance,
          expenses: 0,
          repayments: 0,
          otherDeductionsLabel: "",
          otherDeductions: 0,
          totalSalary: calc.totalSalary,
          bank1Amount: config.bank1FixedAmount,
          bank2Amount: config.bank2FixedAmount,
          additionalPayment: calc.additionalPayment,
          paymentDate1: defaultDate1,
          paymentDate2: defaultDate2,
          paymentDate3: defaultDate3,
        });
        if (result === "created") created++; else updated++;
      } catch (err) {
        console.error("payslip generation failed for", config.name, err);
        failed.push({ name: config.name, error: "Notion write failed" });
      }
    }

    // Report employees with config but no approved attendance
    for (const [empId, config] of configByEmployee) {
      if (!attendanceByEmployee.has(empId)) {
        missingAttendance.push(config.name);
      }
    }

    return j(200, { month, created, updated, missingConfig, missingAttendance, failed });
  } catch (err) {
    console.error("generate-payslips failed", err);
    return j(502, { error: "notion_unavailable", message: "Notion is unreachable" });
  }
};

function j(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
```

- [ ] **Step 2: Build + verify**

- [ ] **Step 3: Commit + push**

```bash
cd /Users/michaglio/Projects/spa-attendance
git add src/pages/api/admin/generate-payslips.ts
git commit -m "feat: add payslip generation endpoint combining attendance + salary config"
git push origin main
```

---

### Task 10: API — List Payslips

**Files:**
- Create: `/Users/michaglio/Projects/spa-attendance/src/pages/api/admin/payslips.ts`

- [ ] **Step 1: Write the endpoint**

```ts
import type { APIRoute } from "astro";
import { createNotionClient, createNotionRepo } from "../../../lib/notion";
import { createSalaryRepo } from "../../../lib/notion-salary";
import { readCookie, verifySession } from "../../../lib/session";
import { isValidMonthKey } from "../../../lib/month";

export const prerender = false;

export const GET: APIRoute = async ({ request, url }) => {
  const token = readCookie(request.headers.get("cookie") ?? "", "admin");
  if (!token) return j(401, { error: "unauthorized", message: "Not logged in" });
  try { await verifySession(token, import.meta.env.SESSION_SECRET); }
  catch { return j(401, { error: "unauthorized", message: "Session invalid" }); }

  const month = url.searchParams.get("month") ?? "";
  if (!isValidMonthKey(month)) return j(400, { error: "bad_request", message: "Invalid month" });

  try {
    const client = createNotionClient(import.meta.env.NOTION_TOKEN);
    const notionRepo = createNotionRepo(client, {
      locations: import.meta.env.NOTION_DB_LOCATIONS,
      employees: import.meta.env.NOTION_DB_EMPLOYEES,
      attendance: import.meta.env.NOTION_DB_ATTENDANCE,
    });
    const salaryRepo = createSalaryRepo(client, {
      salaryConfig: import.meta.env.NOTION_DB_SALARY_CONFIG,
      payslips: import.meta.env.NOTION_DB_PAYSLIPS,
      attendance: import.meta.env.NOTION_DB_ATTENDANCE,
    });

    const [payslips, locations] = await Promise.all([
      salaryRepo.listPayslipsForMonth(month),
      notionRepo.listActiveLocations(),
    ]);

    const locNameById = new Map(locations.map(l => [l.id, l.name]));

    // Fetch employee names for all employees in payslips
    const empIds = new Set(payslips.map(p => p.employeeId));
    const locsInPlay = new Set(payslips.map(p => p.locationId));
    const nameById = new Map<string, string>();
    for (const lid of locsInPlay) {
      const emps = await notionRepo.listEmployeesForLocation(lid);
      for (const e of emps) nameById.set(e.id, e.name);
    }

    const rows = payslips.map(p => ({
      ...p,
      employeeName: nameById.get(p.employeeId) ?? "(unknown)",
      locationName: locNameById.get(p.locationId) ?? "(unknown)",
    }));

    return j(200, { month, rows });
  } catch (err) {
    console.error("payslips list failed", err);
    return j(502, { error: "notion_unavailable", message: "Notion is unreachable" });
  }
};

function j(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
```

- [ ] **Step 2: Build + verify**

- [ ] **Step 3: Commit + push**

```bash
cd /Users/michaglio/Projects/spa-attendance
git add src/pages/api/admin/payslips.ts
git commit -m "feat: add list payslips endpoint"
git push origin main
```

---

### Task 11: Update Admin Page — Attendance Approval UI

Add approve/reject buttons and status indicators to the existing attendance admin page. Also add navigation links to the new upload and payslips pages.

**Files:**
- Modify: `/Users/michaglio/Projects/spa-attendance/src/pages/admin.astro`
- Modify: `/Users/michaglio/Projects/spa-attendance/src/pages/api/admin/report.ts`

- [ ] **Step 1: Update `/api/admin/report` to include attendance row IDs and status**

The `report.ts` endpoint currently doesn't return Notion page IDs or status for attendance rows. Update the response to include them. In the `rows` mapping, add `id` and `status` fields from the attendance data. This requires that `listAttendanceForMonth` returns `id` and `status` (added in Task 5).

After the `const rows = attendance.map(...)` block, add `id` and `status` to each row:

```ts
    // After the existing employee-name resolution, update row construction:
    const rows = attendance.map(a => ({
      id: a.id,
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
      status: a.status,
    }));
```

- [ ] **Step 2: Update `admin.astro` to show status + approve/reject buttons**

Add to the admin page's inline script:

1. **Nav links** — add a nav bar above the report heading with links to `/admin`, `/admin/upload`, `/admin/payslips`.

2. **Status column** — add a status column to the admin table header and each row, showing the attendance status with a colored badge (green=Approved, amber=Submitted, red=Rejected).

3. **Bulk approve button** — add a "Approve All Submitted" button that:
   - Collects all row IDs where status is "Submitted"
   - POSTs to `/api/admin/attendance-status` with `{ pageIds, status: "Approved" }`
   - Refreshes the report

4. **Per-row approve/reject** — each non-Approved row gets small Approve/Reject buttons.

This is a large UI change. The implementer should:
- Add a `<th>` for Status between Submitted At and Notes
- Add `<td>` with a status badge + action buttons in `rowHtml()`
- Add a "Approve All Submitted" button next to the Download CSV button in `AdminControls.astro`
- Add fetch handler for the approve action
- Add admin nav component

- [ ] **Step 3: Build + verify**

- [ ] **Step 4: Commit + push**

```bash
cd /Users/michaglio/Projects/spa-attendance
git add src/pages/admin.astro src/pages/api/admin/report.ts src/components/AdminControls.astro
git commit -m "feat: add attendance approval UI with status badges and bulk approve"
git push origin main
```

---

### Task 12: HR Upload Page — `/admin/upload`

**Files:**
- Create: `/Users/michaglio/Projects/spa-attendance/src/pages/admin/upload.astro`

- [ ] **Step 1: Write the page**

A passcode-gated page (reuses PasscodeGate with `/api/admin/verify`). After auth, shows:
- Month picker (default: previous month)
- File upload input (`.xlsx, .xls`)
- Upload button
- Results area showing: parsed count, created, updated, unmatched names list

The page POSTs the file + month as `FormData` to `/api/admin/upload-attendance`.

Layout: same BaseLayout, same admin nav as the updated admin page. `export const prerender = false`.

The implementer should follow the same gate-then-content pattern as `admin.astro`:
- PasscodeGate with `formId="upload-gate"`, `action="/api/admin/verify"`
- Hidden `#upload-view` that becomes visible after auth
- Inline script handling file upload via `fetch` with `FormData` body (NOT JSON — must use FormData for file upload)

- [ ] **Step 2: Build + verify**

- [ ] **Step 3: Commit + push**

```bash
cd /Users/michaglio/Projects/spa-attendance
git add src/pages/admin/upload.astro
git commit -m "feat: add HR Excel upload page for bulk attendance import"
git push origin main
```

---

### Task 13: Payslips Admin Page — `/admin/payslips`

**Files:**
- Create: `/Users/michaglio/Projects/spa-attendance/src/pages/admin/payslips.astro`

- [ ] **Step 1: Write the page**

A passcode-gated page with:
- Admin nav (same links: Attendance, Upload, Payslips)
- Month picker (default: previous month)
- "Generate Payslips" button → POSTs to `/api/admin/generate-payslips`
- Results table showing all payslips for the month (fetched from `GET /api/admin/payslips?month=...`)
- Table columns: Employee, Location, Employer, Base, Commission, Overtime, Meals, Expenses, Repayments, Deductions, Total, Bank1, Bank2, Additional, Status
- "Download PDF" button → client-side PDF generation using `html2pdf.js` (CDN)

**PDF generation approach:**
1. Include `<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>` in the page head.
2. When "Download PDF" is clicked, render a hidden `#pdf-area` div with one payslip card per employee.
3. Each payslip card is a two-column layout: "Salary Items" (left) and "Payments" (right), with the SPA Company logo, employee name, period, employer, all salary line items, payment table, and signature line.
4. Call `html2pdf().from(pdfArea).set(opts).save()` with A4 portrait, page breaks between cards.

The payslip card HTML should match the data structure from the user's existing payslip tool:
- **Header:** Employee name, period, employer, location, hours/month
- **Left card — Salary Items:** Base salary, Commission (with rate + hours), Overtime, spacer, Extras (Meals, Expenses), spacer, Deductions (Repayments, Other), spacer, TOTAL SALARY (bold)
- **Right card — Payments:** table with Date / Account / Amount columns (3 rows: bank1, bank2, additional)
- **Footer:** Signature line

- [ ] **Step 2: Build + verify**

- [ ] **Step 3: Test PDF generation manually** — open `/admin/payslips` in browser, pick a month, load data, click Download PDF. Verify multi-page A4 PDF opens.

- [ ] **Step 4: Commit + push**

```bash
cd /Users/michaglio/Projects/spa-attendance
git add src/pages/admin/payslips.astro
git commit -m "feat: add payslips admin page with generate + PDF export"
git push origin main
```

---

### Task 14: Update Landing Page + Navigation

**Files:**
- Modify: `/Users/michaglio/Projects/spa-attendance/src/pages/index.astro`

- [ ] **Step 1: Update landing page**

Add a third card for "HR / Payroll" linking to `/admin/upload` and `/admin/payslips`, alongside the existing Supervisors and Admin cards.

```astro
    <div class="rounded-lg border border-slate-200 bg-white p-5 text-left">
      <h2 class="mb-2 font-semibold">HR / Payroll</h2>
      <p class="text-sm text-slate-600">
        <a href="/admin/upload" class="text-teal-700 underline">Upload attendance Excel</a> ·
        <a href="/admin/payslips" class="text-teal-700 underline">Manage payslips</a>
      </p>
    </div>
```

- [ ] **Step 2: Commit + push**

```bash
cd /Users/michaglio/Projects/spa-attendance
git add src/pages/index.astro
git commit -m "feat: add HR/Payroll links to landing page"
git push origin main
```

---

## Deployment

After all 14 tasks, the two new secrets (`NOTION_DB_SALARY_CONFIG`, `NOTION_DB_PAYSLIPS`) are already set in Secret Manager (done in an earlier conversation step). The `apphosting.yaml` references are committed in Task 1. The next `git push` after Task 14 triggers a deploy that includes everything.

**Post-deploy smoke test:**
1. `/admin` → approve a few attendance rows → status badges turn green.
2. `/admin/upload` → upload an Excel file → rows imported, summary shown.
3. `/admin/payslips` → pick a month with approved attendance → "Generate Payslips" → payslips created in Notion.
4. Open Notion Payslips DB → verify rows exist with correct values.
5. In Notion, manually fill in expenses/repayments for one employee → save.
6. Back in the browser → refresh payslips → updated values appear.
7. Click "Download PDF" → A4 PDF with clean payslip layout.

---

## Self-Review

- **Spec coverage:** All spec sections are covered — attendance approval (Task 5+7+11), HR Excel upload (Task 6+8+12), payslip generation (Task 3+4+9), payslip list (Task 10), batch PDF (Task 13), config/env (Task 1), labels (Task 2), landing page (Task 14).
- **Placeholder scan:** No TBDs. PDF layout described in Task 13 with exact structure (two-column cards). All code blocks contain complete implementations.
- **Type consistency:** `SalaryConfig`, `PayslipEntry`, `PayslipRow`, `ApprovedAttendanceRow` — defined in Task 4 (`notion-salary.ts`), used in Tasks 9 (generate endpoint) and 10 (list endpoint). `PayslipInput`/`PayslipResult` defined in Task 3 (`payslip-calc.ts`), used in Task 9. `ParsedAttendanceRow` defined in Task 6 (`excel.ts`), used in Task 8. `AttendanceRow.status` and `updateAttendanceStatus` added in Task 5, used in Tasks 7 and 11.
- **Property name consistency:** All Notion property names match the spec's DB schema exactly (e.g. `"Base salary (€)"`, `"Commission rate (€/hr)"`, `"Total salary (€)"`, `"Payment date 1"`, etc.).
