# Candidate Intake System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a recruiter-facing intake tool with Claude Vision OCR that creates candidate profiles on the website and in Notion, plus public candidate listing/profile pages with job position filtering.

**Architecture:** Static Astro frontend with 5 Firebase Cloud Functions handling auth, OCR, Notion integration, and bulk import. Data flows to both Firestore (public website) and Notion (internal workflow). Email-code authentication with IP-bound 48h sessions.

**Tech Stack:** Astro v6, Tailwind CSS v4, Firebase (Firestore, Storage, Cloud Functions), Claude Vision API, Notion API

**Spec:** `docs/superpowers/specs/2026-04-17-candidate-intake-design.md`
**Notion mappings:** `docs/superpowers/specs/notion-candidates-mapping.json`, `docs/superpowers/specs/notion-documents-mapping.json`, `docs/superpowers/specs/notion-users-mapping.json`

---

## File Structure

### New files — Firebase Cloud Functions

```
functions/
  package.json                    — Cloud Functions dependencies
  .eslintrc.js                    — Linting config
  index.js                        — Function exports
  src/
    sendLoginCode.js              — Email auth: validate domain, generate code, send email
    verifyLoginCode.js            — Session creation: verify code, create IP-bound session
    processDocuments.js           — Claude Vision OCR: extract passport + CV fields
    submitToNotion.js             — Create Notion Candidates + Documents entries
    importFromNotion.js           — Bulk import Waiting Room candidates → Firestore
    lib/
      notionClient.js             — Notion API client wrapper
      notionUserMapping.js        — Email → Notion user ID lookup
      notionTransforms.js         — Field transforms (dates, selects, multi-selects)
      candidateIdGenerator.js     — SC-XXXX and external ID generation
      ocrPrompts.js               — Claude Vision prompt templates
```

### New files — Frontend pages

```
src/pages/
  intake.astro                    — Recruiter intake form (upload + auto-fill + submit)
  intake/
    review.astro                  — Approver review queue
  candidates.astro                — Public candidate listing with job position tabs
  candidate.astro                 — Public candidate profile page
```

### New files — Frontend components

```
src/components/
  LoginGate.astro                 — Email code authentication UI
  UploadZone.astro                — Drag-and-drop file upload with format guidance
  CandidateForm.astro             — Full candidate form (all Notion fields, collapsible sections)
  CandidateCard.astro             — Card component for candidate listing
  JobPositionTabs.astro           — Tab navigation for job position filtering
```

### Modified files

```
firebase.json                     — Add functions config
src/lib/firebase.js               — Add Cloud Functions import
```

---

## Task 1: Initialize Firebase Cloud Functions

**Files:**
- Create: `functions/package.json`
- Create: `functions/.eslintrc.js`
- Create: `functions/index.js`
- Modify: `firebase.json`

- [ ] **Step 1: Create functions directory and package.json**

```bash
mkdir -p functions/src/lib
```

Create `functions/package.json`:
```json
{
  "name": "spa-company-functions",
  "description": "Firebase Cloud Functions for Spa Company",
  "type": "module",
  "engines": { "node": "22" },
  "main": "index.js",
  "scripts": {
    "serve": "firebase emulators:start --only functions",
    "shell": "firebase functions:shell",
    "deploy": "firebase deploy --only functions"
  },
  "dependencies": {
    "firebase-admin": "^13.0.0",
    "firebase-functions": "^6.3.0",
    "@anthropic-ai/sdk": "^0.39.0",
    "@notionhq/client": "^2.3.0",
    "nodemailer": "^6.10.0"
  }
}
```

- [ ] **Step 2: Create index.js with placeholder exports**

Create `functions/index.js`:
```js
export { sendLoginCode } from "./src/sendLoginCode.js";
export { verifyLoginCode } from "./src/verifyLoginCode.js";
export { processDocuments } from "./src/processDocuments.js";
export { submitToNotion } from "./src/submitToNotion.js";
export { importFromNotion } from "./src/importFromNotion.js";
```

- [ ] **Step 3: Update firebase.json to include functions**

Add the `"functions"` key to `firebase.json`:
```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "cleanUrls": true,
    "trailingSlash": false
  },
  "functions": {
    "source": "functions",
    "runtime": "nodejs22"
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "storage": {
    "rules": "storage.rules"
  }
}
```

- [ ] **Step 4: Install dependencies**

```bash
cd functions && npm install
```

Expected: `node_modules` created, `package-lock.json` generated, no errors.

- [ ] **Step 5: Commit**

```bash
git add functions/package.json functions/package-lock.json functions/index.js firebase.json
git commit -m "feat: initialize Firebase Cloud Functions scaffold"
```

---

## Task 2: Candidate ID Generator

**Files:**
- Create: `functions/src/lib/candidateIdGenerator.js`

- [ ] **Step 1: Implement ID generation utilities**

Create `functions/src/lib/candidateIdGenerator.js`:
```js
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const ORIGIN_CODES = {
  Thailand: "TH",
  Philippines: "PH",
  Indonesia: "ID",
};

const TARGET_CODES = {
  Slovakia: "SK",
  Germany: "DE",
  Austria: "AT",
  "Czech Republic": "CZ",
};

/**
 * Generate the next SC-XXXX candidate ID.
 * Uses Firestore config/idCounters document with atomic increment.
 */
export async function generateCandidateId() {
  const db = getFirestore();
  const counterRef = db.doc("config/idCounters");

  const result = await db.runTransaction(async (tx) => {
    const doc = await tx.get(counterRef);
    const data = doc.exists ? doc.data() : {};
    const next = (data.candidateSeq || 2000) + 1;
    tx.set(counterRef, { candidateSeq: next }, { merge: true });
    return next;
  });

  return `SC-${result}`;
}

/**
 * Generate external ID for Notion: {targetCountry}-{originCountry}-SPA-{seq}
 * e.g. SK-PH-SPA-001
 */
export async function generateExternalId(originCountry, targetCountry) {
  const originCode = ORIGIN_CODES[originCountry] || "XX";
  const targetCode = TARGET_CODES[targetCountry] || "XX";

  const db = getFirestore();
  const counterRef = db.doc("config/idCounters");

  const result = await db.runTransaction(async (tx) => {
    const doc = await tx.get(counterRef);
    const data = doc.exists ? doc.data() : {};
    const key = `ext_${originCode}`;
    const next = (data[key] || 0) + 1;
    tx.set(counterRef, { [key]: next }, { merge: true });
    return next;
  });

  return `${targetCode}-${originCode}-SPA-${String(result).padStart(3, "0")}`;
}

/**
 * Parse candidate number from Notion Name field.
 * e.g. "2509 -Phattharapha Misap// 25,000-50,000" → "SC-2509"
 */
export function parseCandidateNumber(notionName) {
  const match = notionName.match(/^(\d+)/);
  return match ? `SC-${match[1]}` : null;
}
```

- [ ] **Step 2: Commit**

```bash
git add functions/src/lib/candidateIdGenerator.js
git commit -m "feat: add candidate ID generator with SC-XXXX and external ID formats"
```

---

## Task 3: Notion Client and Transforms

**Files:**
- Create: `functions/src/lib/notionClient.js`
- Create: `functions/src/lib/notionUserMapping.js`
- Create: `functions/src/lib/notionTransforms.js`

- [ ] **Step 1: Create Notion client wrapper**

Create `functions/src/lib/notionClient.js`:
```js
import { Client } from "@notionhq/client";
import { defineString } from "firebase-functions/params";

const notionKey = defineString("NOTION_API_KEY");

let client = null;

export function getNotionClient() {
  if (!client) {
    client = new Client({ auth: notionKey.value() });
  }
  return client;
}

// Candidates DB
export const CANDIDATES_DB_ID = "54319f2e7f104dcf948026a862f24d53";

// Documents DB
export const DOCUMENTS_DB_ID = "300792677686803ba3b6e466a750b828";
```

- [ ] **Step 2: Create user mapping**

Create `functions/src/lib/notionUserMapping.js`:
```js
const USER_MAP = {
  "natalia@spa-company.com": "user-504",
  "denis@spa-company.com": "user-505",
  "nuttha@spa-company.com": "user-506",
  "nonthawat@spa-company.com": "user-507",
  "lubo@spa-company.com": "user-508",
  "radka@spa-company.com": "user-509",
  "lucy@spa-company.com": "user-510",
  "anisha@spa-company.com": "user-511",
  "sitanan@spa-company.com": "user-512",
  "bow@spa-company.com": "user-513",
  "dadda@spa-company.com": "user-514",
  "dagmar@spa-company.com": "user-515",
  "lanicha@spa-company.com": "user-516",
  "michal@spa-company.com": "user-345",
  "coordinator@spa-company.com": "user-517",
  "phung@spa-company.com": "user-518",
  "andreag@spa-company.com": "user-519",
  "payroll@spa-company.com": "user-520",
  "daniela@spa-company.com": "user-521",
  "alzbeta@spa-company.com": "user-522",
  "andrea@spa-company.com": "user-523",
  "petr@spa-company.com": "user-524",
  "jakub@dmjeurope.com": "user-529",
  "anna@dmjeurope.com": "user-530",
};

/**
 * Look up Notion user ID from email address.
 * Returns the user ID string or null if not found.
 */
export function getNotionUserId(email) {
  return USER_MAP[email?.toLowerCase()] || null;
}
```

- [ ] **Step 3: Create field transforms**

Create `functions/src/lib/notionTransforms.js`:
```js
/**
 * Transforms for converting form data into Notion API property formats.
 * Follows the transform kinds defined in notion-candidates-mapping.json.
 */

/** Title property */
export function title(value) {
  return { title: [{ text: { content: value || "" } }] };
}

/** Rich text property */
export function richText(value) {
  if (!value) return { rich_text: [] };
  return { rich_text: [{ text: { content: String(value) } }] };
}

/** Email property */
export function email(value) {
  return { email: value || null };
}

/** Phone number property */
export function phoneNumber(value) {
  return { phone_number: value || null };
}

/** Select property */
export function select(value) {
  if (!value) return { select: null };
  return { select: { name: value } };
}

/** Status property */
export function status(value) {
  if (!value) return { status: null };
  return { status: { name: value } };
}

/** Multi-select property */
export function multiSelect(values) {
  if (!values || !Array.isArray(values) || values.length === 0) {
    return { multi_select: [] };
  }
  return { multi_select: values.map((v) => ({ name: v })) };
}

/** Checkbox property */
export function checkbox(value) {
  return { checkbox: !!value };
}

/** Date property (date only, no time) */
export function dateOnly(startDate) {
  if (!startDate) return { date: null };
  return { date: { start: startDate } };
}

/** Date property (with datetime ISO) */
export function dateTime(startDatetime) {
  if (!startDatetime) return { date: null };
  return { date: { start: startDatetime } };
}

/** Person property (array of user objects) */
export function people(userIds) {
  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return { people: [] };
  }
  return { people: userIds.map((id) => ({ object: "user", id })) };
}

/** Relation property (array of page references) */
export function relation(pageIds) {
  if (!pageIds || !Array.isArray(pageIds) || pageIds.length === 0) {
    return { relation: [] };
  }
  return { relation: pageIds.map((id) => ({ id })) };
}

/**
 * Parse a Notion page URL to extract the page ID.
 * e.g. "https://www.notion.so/9f3637df42b9497b98066d9e5c336e88" → "9f3637df-42b9-497b-9806-6d9e5c336e88"
 */
export function parseNotionPageId(url) {
  if (!url) return null;
  const match = url.match(/([a-f0-9]{32})$/);
  if (!match) return null;
  const raw = match[1];
  return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`;
}

/**
 * Parse JSON-encoded multi-select strings from Notion export.
 * e.g. "[\"Thailand\"]" → ["Thailand"]
 */
export function parseJsonArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [value];
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add functions/src/lib/notionClient.js functions/src/lib/notionUserMapping.js functions/src/lib/notionTransforms.js
git commit -m "feat: add Notion client, user mapping, and field transforms"
```

---

## Task 4: Authentication — sendLoginCode Cloud Function

**Files:**
- Create: `functions/src/sendLoginCode.js`

- [ ] **Step 1: Implement sendLoginCode**

Create `functions/src/sendLoginCode.js`:
```js
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { createTransport } from "nodemailer";
import { defineString } from "firebase-functions/params";

const smtpHost = defineString("SMTP_HOST");
const smtpPort = defineString("SMTP_PORT");
const smtpUser = defineString("SMTP_USER");
const smtpPass = defineString("SMTP_PASS");

const ALLOWED_DOMAINS = ["spa-company.com", "dmjeurope.com"];
const CODE_EXPIRY_MINUTES = 10;

export const sendLoginCode = onCall(async (request) => {
  const { email } = request.data;

  if (!email || typeof email !== "string") {
    throw new HttpsError("invalid-argument", "Email is required.");
  }

  const domain = email.split("@")[1]?.toLowerCase();
  if (!ALLOWED_DOMAINS.includes(domain)) {
    throw new HttpsError(
      "permission-denied",
      "Only @spa-company.com and @dmjeurope.com emails are allowed."
    );
  }

  // Generate 6-digit code
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = Timestamp.fromMillis(
    Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000
  );

  // Store in Firestore
  const db = getFirestore();
  await db.collection("loginCodes").add({
    email: email.toLowerCase(),
    code,
    expiresAt,
    used: false,
    createdAt: Timestamp.now(),
  });

  // Send email
  const transporter = createTransport({
    host: smtpHost.value(),
    port: parseInt(smtpPort.value()),
    secure: true,
    auth: { user: smtpUser.value(), pass: smtpPass.value() },
  });

  await transporter.sendMail({
    from: `"Spa Company" <${smtpUser.value()}>`,
    to: email,
    subject: "Your login code for Spa Company Intake",
    html: `
      <h2>Your login code</h2>
      <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px;">${code}</p>
      <p>This code expires in ${CODE_EXPIRY_MINUTES} minutes.</p>
      <p>If you didn't request this code, you can safely ignore this email.</p>
    `,
  });

  return { success: true };
});
```

- [ ] **Step 2: Commit**

```bash
git add functions/src/sendLoginCode.js
git commit -m "feat: add sendLoginCode Cloud Function with email domain validation"
```

---

## Task 5: Authentication — verifyLoginCode Cloud Function

**Files:**
- Create: `functions/src/verifyLoginCode.js`

- [ ] **Step 1: Implement verifyLoginCode**

Create `functions/src/verifyLoginCode.js`:
```js
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { randomUUID } from "crypto";

const SESSION_EXPIRY_HOURS = 48;

export const verifyLoginCode = onCall(async (request) => {
  const { email, code } = request.data;

  if (!email || !code) {
    throw new HttpsError("invalid-argument", "Email and code are required.");
  }

  const db = getFirestore();
  const now = Timestamp.now();

  // Find matching, unused, non-expired code
  const codesSnap = await db
    .collection("loginCodes")
    .where("email", "==", email.toLowerCase())
    .where("code", "==", code)
    .where("used", "==", false)
    .limit(1)
    .get();

  if (codesSnap.empty) {
    throw new HttpsError("not-found", "Invalid or expired code.");
  }

  const codeDoc = codesSnap.docs[0];
  const codeData = codeDoc.data();

  if (codeData.expiresAt.toMillis() < now.toMillis()) {
    throw new HttpsError("deadline-exceeded", "Code has expired.");
  }

  // Mark code as used
  await codeDoc.ref.update({ used: true });

  // Get caller IP from request headers
  const ip = request.rawRequest?.ip || request.rawRequest?.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() || "unknown";

  // Create session
  const sessionToken = randomUUID();
  const expiresAt = Timestamp.fromMillis(
    Date.now() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000
  );

  await db.collection("sessions").add({
    email: email.toLowerCase(),
    ip,
    sessionToken,
    expiresAt,
    createdAt: Timestamp.now(),
  });

  return {
    sessionToken,
    email: email.toLowerCase(),
    expiresAt: expiresAt.toMillis(),
  };
});
```

- [ ] **Step 2: Commit**

```bash
git add functions/src/verifyLoginCode.js
git commit -m "feat: add verifyLoginCode Cloud Function with IP-bound sessions"
```

---

## Task 6: OCR — processDocuments Cloud Function

**Files:**
- Create: `functions/src/lib/ocrPrompts.js`
- Create: `functions/src/processDocuments.js`

- [ ] **Step 1: Create OCR prompt templates**

Create `functions/src/lib/ocrPrompts.js`:
```js
export const PASSPORT_PROMPT = `You are analyzing a passport document image/PDF. Extract the following fields and return them as JSON.

Return ONLY valid JSON with these exact keys:
{
  "fullName": "string — full name as printed on passport",
  "firstName": "string — given name(s)",
  "lastName": "string — surname/family name",
  "dateOfBirth": "YYYY-MM-DD or null",
  "placeOfBirth": "string or null",
  "nationality": "string — country name (e.g. 'Thailand', 'Philippines', 'Indonesia')",
  "gender": "Male or Female or null",
  "passportNumber": "string",
  "dateOfIssue": "YYYY-MM-DD or null",
  "dateOfExpiry": "YYYY-MM-DD or null",
  "issuingCountry": "string — country name"
}

Rules:
- For Thai passports, the name may appear in both Thai and English — use the English version.
- For Filipino passports, combine given name + middle name + surname for fullName.
- For Indonesian passports, the name field may be a single field — use it as fullName.
- Dates must be in YYYY-MM-DD format. If only partial date visible, return null.
- If a field is not visible or unreadable, return null for that field.
- Do not guess — only extract what is clearly readable.`;

export const CV_PROMPT = `You are analyzing a CV/Resume document. Extract the following fields and return them as JSON.

Return ONLY valid JSON with these exact keys:
{
  "education": "string — highest education level (e.g. 'High School', 'Bachelor Degree', 'Vocational Certificate') or null",
  "experience": "string — total years of experience summary (e.g. '5 years') or null",
  "skills": ["array of skill strings mentioned in the CV"],
  "workHistory": [
    {
      "role": "string — job title",
      "location": "string — company/place",
      "duration": "string — e.g. '2020-2025' or '3 years'",
      "duties": ["array of duty/responsibility strings"]
    }
  ],
  "email": "string or null — if contact email is visible",
  "phone": "string or null — if contact phone is visible"
}

Rules:
- Extract work history entries in reverse chronological order (most recent first).
- For skills, include both technical skills (e.g. "Thai Massage", "Western Cuisine") and soft skills.
- If the CV is in Thai or another language, translate key information to English.
- If a field is not present, return null or empty array as appropriate.
- Do not invent information — only extract what is clearly stated.`;
```

- [ ] **Step 2: Implement processDocuments**

Create `functions/src/processDocuments.js`:
```js
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getStorage } from "firebase-admin/storage";
import Anthropic from "@anthropic-ai/sdk";
import { defineString } from "firebase-functions/params";
import { PASSPORT_PROMPT, CV_PROMPT } from "./lib/ocrPrompts.js";

const anthropicKey = defineString("ANTHROPIC_API_KEY");

export const processDocuments = onCall(
  { timeoutSeconds: 120 },
  async (request) => {
    const { passportUrl, cvUrl } = request.data;

    if (!passportUrl) {
      throw new HttpsError("invalid-argument", "Passport URL is required.");
    }

    const client = new Anthropic({ apiKey: anthropicKey.value() });
    const results = { passport: null, cv: null, detectedCountry: null };

    // Process passport
    const passportBuffer = await downloadFromStorage(passportUrl);
    const passportBase64 = passportBuffer.toString("base64");
    const passportMediaType = passportUrl.endsWith(".pdf")
      ? "application/pdf"
      : "image/jpeg";

    const passportResponse = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: passportMediaType === "application/pdf" ? "document" : "image",
              source: {
                type: "base64",
                media_type: passportMediaType,
                data: passportBase64,
              },
            },
            { type: "text", text: PASSPORT_PROMPT },
          ],
        },
      ],
    });

    try {
      const passportText = passportResponse.content[0].text;
      results.passport = JSON.parse(passportText);
      results.detectedCountry = results.passport.issuingCountry || null;
    } catch (e) {
      results.passport = { error: "Failed to parse passport OCR response" };
    }

    // Process CV (if provided)
    if (cvUrl) {
      const cvBuffer = await downloadFromStorage(cvUrl);
      const cvBase64 = cvBuffer.toString("base64");
      const cvMediaType = cvUrl.endsWith(".pdf")
        ? "application/pdf"
        : "image/jpeg";

      const cvResponse = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: [
              {
                type: cvMediaType === "application/pdf" ? "document" : "image",
                source: {
                  type: "base64",
                  media_type: cvMediaType,
                  data: cvBase64,
                },
              },
              { type: "text", text: CV_PROMPT },
            ],
          },
        ],
      });

      try {
        const cvText = cvResponse.content[0].text;
        results.cv = JSON.parse(cvText);
      } catch (e) {
        results.cv = { error: "Failed to parse CV OCR response" };
      }
    }

    return results;
  }
);

/**
 * Download a file from Firebase Storage given its download URL.
 * Returns a Buffer of the file contents.
 */
async function downloadFromStorage(downloadUrl) {
  const bucket = getStorage().bucket();

  // Extract the storage path from the download URL
  // URLs look like: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encodedPath}?...
  const url = new URL(downloadUrl);
  const pathMatch = url.pathname.match(/\/o\/(.+)$/);
  if (!pathMatch) {
    throw new HttpsError("invalid-argument", `Invalid storage URL: ${downloadUrl}`);
  }
  const storagePath = decodeURIComponent(pathMatch[1]);
  const file = bucket.file(storagePath);
  const [buffer] = await file.download();
  return buffer;
}
```

- [ ] **Step 3: Commit**

```bash
git add functions/src/lib/ocrPrompts.js functions/src/processDocuments.js
git commit -m "feat: add processDocuments Cloud Function with Claude Vision OCR"
```

---

## Task 7: Notion Integration — submitToNotion Cloud Function

**Files:**
- Create: `functions/src/submitToNotion.js`

- [ ] **Step 1: Implement submitToNotion**

Create `functions/src/submitToNotion.js`:
```js
import { onCall, HttpsError } from "firebase-functions/v2/https";
import {
  getNotionClient,
  CANDIDATES_DB_ID,
  DOCUMENTS_DB_ID,
} from "./lib/notionClient.js";
import { getNotionUserId } from "./lib/notionUserMapping.js";
import * as t from "./lib/notionTransforms.js";

export const submitToNotion = onCall(
  { timeoutSeconds: 60 },
  async (request) => {
    const { candidateData, documents, recruiterEmail } = request.data;

    if (!candidateData) {
      throw new HttpsError("invalid-argument", "candidateData is required.");
    }

    const notion = getNotionClient();
    const recruiterId = getNotionUserId(recruiterEmail);

    // Build Candidate properties
    const candidateProps = {
      Name: t.title(candidateData.notionTitle),
      "Name Surname": t.richText(candidateData.fullName),
      "External ID": t.richText(candidateData.externalId),
      Email: t.email(candidateData.email),
      "Phone Number": t.phoneNumber(candidateData.phone),
      "Alternate Phone Number": t.phoneNumber(candidateData.alternatePhone),
      WhatsApp: t.phoneNumber(candidateData.whatsapp),
      "LINE / Facebook": t.richText(candidateData.lineFacebook),
      "Place of Birth": t.richText(candidateData.placeOfBirth),
      "Origin Address": t.richText(candidateData.originAddress),
      "Origin Address (Local Language)": t.richText(
        candidateData.originAddressLocal
      ),
      "Marital Status": t.select(candidateData.maritalStatus),
      Nationality: t.multiSelect(candidateData.nationality),
      "Origin Country": t.multiSelect(candidateData.originCountry),
      "Target Country": t.multiSelect(candidateData.targetCountry),
      "Would like to go": t.multiSelect(candidateData.wouldLikeToGo),
      Education: t.select(candidateData.education),
      "English Level": t.select(candidateData.englishLevel),
      Experience: t.richText(candidateData.experience),
      "Job Title / Position": t.select(candidateData.jobPosition),
      "Recruiting Source": t.select(candidateData.recruitingSource),
      "Candidate Status": t.status(candidateData.candidateStatus),
      "Employment Status": t.select(candidateData.employmentStatus),
      "Employment Type": t.select(candidateData.employmentType),
      "Leasing Number": t.richText(candidateData.leasingNumber),
      "Leasing Company": t.select(candidateData.leasingCompany),
      "Contract Under": t.select(candidateData.contractUnder),
      "5-Star hotel/Spa": t.checkbox(candidateData.fiveStarHotelSpa),
      Notes: t.richText(candidateData.notes),
      "Date of Birth": t.dateOnly(candidateData.dateOfBirth),
      "Date Applied": t.dateOnly(
        candidateData.dateApplied || new Date().toISOString().split("T")[0]
      ),
      "Interview Date": t.dateOnly(candidateData.interviewDate),
      "Client Approval": t.dateOnly(candidateData.clientApprovalDate),
      "Date of Embassy": t.dateOnly(candidateData.dateOfEmbassy),
      "Start Date by Social Insurance": t.dateOnly(
        candidateData.startDateBySocialInsurance
      ),
      "OCP date": t.dateTime(candidateData.ocpDate),
    };

    // Add recruiter if we can map the email
    if (recruiterId) {
      candidateProps.Recruiter = t.people([recruiterId]);
    }

    // Add assigned to if provided
    if (candidateData.assignedTo) {
      const assignedIds = candidateData.assignedTo
        .map((email) => getNotionUserId(email))
        .filter(Boolean);
      if (assignedIds.length > 0) {
        candidateProps["Assigned to"] = t.people(assignedIds);
      }
    }

    // Add relations if provided (these are Notion page URLs)
    if (candidateData.clientPageUrls) {
      const clientIds = candidateData.clientPageUrls
        .map(t.parseNotionPageId)
        .filter(Boolean);
      if (clientIds.length > 0) {
        candidateProps["Client ↕️"] = t.relation(clientIds);
      }
    }
    if (candidateData.locationPageUrls) {
      const locationIds = candidateData.locationPageUrls
        .map(t.parseNotionPageId)
        .filter(Boolean);
      if (locationIds.length > 0) {
        candidateProps.Location = t.relation(locationIds);
      }
    }

    // Remove properties with null/undefined values to avoid Notion API errors
    for (const [key, value] of Object.entries(candidateProps)) {
      if (value === undefined || value === null) {
        delete candidateProps[key];
      }
    }

    // Create candidate page in Notion
    const candidatePage = await notion.pages.create({
      parent: { database_id: CANDIDATES_DB_ID },
      properties: candidateProps,
    });

    const candidatePageId = candidatePage.id;
    const candidatePageUrl = candidatePage.url;

    // Create document entries
    const documentPageUrls = [];

    if (documents && Array.isArray(documents)) {
      for (const doc of documents) {
        const docProps = {
          Name: t.title(doc.name),
          Type: t.select(doc.type),
          Status: t.status(doc.status || "Completed"),
          "Document ID / PIN": t.richText(doc.documentIdPin),
          Candidate: t.relation([candidatePageId]),
          "Date of Issue": t.dateOnly(doc.dateOfIssue),
          "Date of Expiry": t.dateOnly(doc.dateOfExpiry),
        };

        // Remove null/undefined properties
        for (const [key, value] of Object.entries(docProps)) {
          if (value === undefined || value === null) {
            delete docProps[key];
          }
        }

        const docPage = await notion.pages.create({
          parent: { database_id: DOCUMENTS_DB_ID },
          properties: docProps,
        });

        documentPageUrls.push(docPage.url);
      }
    }

    return { candidatePageUrl, candidatePageId, documentPageUrls };
  }
);
```

- [ ] **Step 2: Commit**

```bash
git add functions/src/submitToNotion.js
git commit -m "feat: add submitToNotion Cloud Function for Candidates + Documents DB"
```

---

## Task 8: Bulk Import — importFromNotion Cloud Function

**Files:**
- Create: `functions/src/importFromNotion.js`

- [ ] **Step 1: Implement importFromNotion**

Create `functions/src/importFromNotion.js`:
```js
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import {
  getNotionClient,
  CANDIDATES_DB_ID,
  DOCUMENTS_DB_ID,
} from "./lib/notionClient.js";
import { parseCandidateNumber } from "./lib/candidateIdGenerator.js";
import { parseJsonArray } from "./lib/notionTransforms.js";

export const importFromNotion = onCall(
  { timeoutSeconds: 540 },
  async (request) => {
    // Admin-only: verify caller is an approver
    const { callerEmail } = request.data;
    const db = getFirestore();

    const approversDoc = await db.doc("config/approvers").get();
    const approvers = approversDoc.exists
      ? approversDoc.data().approverEmails || []
      : [];

    if (!approvers.includes(callerEmail)) {
      throw new HttpsError(
        "permission-denied",
        "Only approvers can run bulk import."
      );
    }

    const notion = getNotionClient();
    const results = { imported: 0, skipped: 0, errors: [] };

    // Query Notion for Waiting Room candidates
    let hasMore = true;
    let startCursor = undefined;

    while (hasMore) {
      const response = await notion.databases.query({
        database_id: CANDIDATES_DB_ID,
        filter: {
          property: "Candidate Status",
          status: { equals: "Waiting Room" },
        },
        start_cursor: startCursor,
        page_size: 50,
      });

      for (const page of response.results) {
        try {
          const imported = await importSingleCandidate(
            db,
            notion,
            page
          );
          if (imported) {
            results.imported++;
          } else {
            results.skipped++;
          }
        } catch (e) {
          results.errors.push({
            pageId: page.id,
            error: e.message,
          });
        }
      }

      hasMore = response.has_more;
      startCursor = response.next_cursor;
    }

    return results;
  }
);

async function importSingleCandidate(db, notion, page) {
  const props = page.properties;

  // Extract candidate number from Name
  const nameTitle = props.Name?.title?.[0]?.plain_text || "";
  const candidateId = parseCandidateNumber(nameTitle);

  if (!candidateId) return false;

  // Check if already imported
  const existing = await db
    .collection("candidates")
    .where("candidateId", "==", candidateId)
    .limit(1)
    .get();

  if (!existing.empty) return false; // Already exists, skip

  // Extract fields
  const fullName = getTextProp(props["Name Surname"]) || "";
  const nameParts = splitName(fullName);

  const nationality = parseJsonArray(
    getTextProp(props.Nationality) ||
      props.Nationality?.multi_select?.map((s) => s.name)
  );
  const originCountry = parseJsonArray(
    getTextProp(props["Origin Country"]) ||
      props["Origin Country"]?.multi_select?.map((s) => s.name)
  );
  const targetCountry = parseJsonArray(
    getTextProp(props["Target Country"]) ||
      props["Target Country"]?.multi_select?.map((s) => s.name)
  );

  const candidateDoc = {
    candidateId,
    externalId: getTextProp(props["External ID"]) || null,
    firstName: nameParts.firstName,
    lastName: nameParts.lastName,
    fullName: fullName.replace(/^(Miss|Mr|Mrs|Ms)\s+/i, ""),
    dateOfBirth: getDateProp(props["Date of Birth"]),
    placeOfBirth: getTextProp(props["Place of Birth"]),
    nationality: nationality[0] || null,
    originCountry: originCountry[0] || null,
    gender: null, // Not in Notion — could OCR passport later
    maritalStatus: props["Marital Status"]?.select?.name || null,

    jobPosition: props["Job Title / Position"]?.select?.name || null,
    experience: getTextProp(props.Experience),
    education: props.Education?.select?.name || null,
    englishLevel: props["English Level"]?.select?.name || null,
    skills: [],
    bio: "",
    workHistory: [],

    email: props.Email?.email || null,
    phone: props["Phone Number"]?.phone_number || null,
    alternatePhone:
      props["Alternate Phone Number"]?.phone_number || null,
    whatsapp: props.WhatsApp?.phone_number || null,
    lineFacebook: getTextProp(props["LINE / Facebook"]),

    originAddress: getTextProp(props["Origin Address"]),
    originAddressLocal: getTextProp(
      props["Origin Address (Local Language)"]
    ),

    photos: [],
    passportNumber: null,
    passportIssueDate: null,
    passportExpiryDate: null,
    passportUrl: null,
    cvUrl: null,

    status: "draft",
    createdBy: "import:notion",
    createdAt: Timestamp.now(),
    approvedBy: null,
    approvedAt: null,

    notionCandidateUrl: page.url,
    notionDocumentUrls: [],
  };

  // Fetch related documents from Notion
  const docsResponse = await notion.databases.query({
    database_id: DOCUMENTS_DB_ID,
    filter: {
      property: "Candidate",
      relation: { contains: page.id },
    },
  });

  // Extract passport info from documents
  for (const docPage of docsResponse.results) {
    const docProps = docPage.properties;
    const docType = docProps.Type?.select?.name;

    if (docType === "Passport") {
      candidateDoc.passportNumber =
        getTextProp(docProps["Document ID / PIN"]) || null;
      candidateDoc.passportIssueDate = getDateProp(
        docProps["Date of Issue"]
      );
      candidateDoc.passportExpiryDate = getDateProp(
        docProps["Date of Expiry"]
      );
    }

    candidateDoc.notionDocumentUrls.push(docPage.url);
  }

  // Save to Firestore
  await db.collection("candidates").add(candidateDoc);
  return true;
}

/** Extract plain text from a Notion rich_text property */
function getTextProp(prop) {
  if (!prop) return null;
  if (prop.rich_text) {
    return prop.rich_text.map((t) => t.plain_text).join("") || null;
  }
  if (prop.title) {
    return prop.title.map((t) => t.plain_text).join("") || null;
  }
  return null;
}

/** Extract date string from a Notion date property */
function getDateProp(prop) {
  return prop?.date?.start || null;
}

/** Split a full name into first and last name */
function splitName(fullName) {
  const cleaned = fullName.replace(/^(Miss|Mr|Mrs|Ms)\s+/i, "").trim();
  const parts = cleaned.split(/\s+/);
  if (parts.length <= 1) return { firstName: cleaned, lastName: "" };
  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add functions/src/importFromNotion.js
git commit -m "feat: add importFromNotion Cloud Function for Waiting Room bulk import"
```

---

## Task 9: Firebase Admin Init

**Files:**
- Modify: `functions/index.js`

The Firebase Admin SDK needs to be initialized before any function runs.

- [ ] **Step 1: Add admin init to index.js**

Update `functions/index.js`:
```js
import { initializeApp } from "firebase-admin/app";

initializeApp();

export { sendLoginCode } from "./src/sendLoginCode.js";
export { verifyLoginCode } from "./src/verifyLoginCode.js";
export { processDocuments } from "./src/processDocuments.js";
export { submitToNotion } from "./src/submitToNotion.js";
export { importFromNotion } from "./src/importFromNotion.js";
```

- [ ] **Step 2: Commit**

```bash
git add functions/index.js
git commit -m "feat: add Firebase Admin SDK initialization"
```

---

## Task 10: Update Firebase client SDK with Functions support

**Files:**
- Modify: `src/lib/firebase.js`

- [ ] **Step 1: Add Cloud Functions import to firebase.js**

Add the Functions SDK to the existing `src/lib/firebase.js`. Keep existing `db` and `storage` exports, add `functions`:

After the existing `storage` export, add:
```js
import { getFunctions, httpsCallable, connectFunctionsEmulator } from "firebase/functions";

export const functions = getApps().length
  ? getFunctions(getApps()[0])
  : getFunctions(app);

// Uncomment for local development:
// connectFunctionsEmulator(functions, "localhost", 5001);
```

Also export a helper to call functions:
```js
export function callFunction(name, data) {
  return httpsCallable(functions, name)(data);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/firebase.js
git commit -m "feat: add Cloud Functions SDK to firebase client"
```

---

## Task 11: LoginGate Component

**Files:**
- Create: `src/components/LoginGate.astro`

- [ ] **Step 1: Create the LoginGate component**

Create `src/components/LoginGate.astro`:
```astro
---
// LoginGate — email code authentication for /intake pages
// Shows login form if no valid session, otherwise renders slot content
---

<div id="login-gate">
  <!-- Login Screen -->
  <div id="login-screen" class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full mx-4">
      <div class="text-center mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Spa Company Intake</h1>
        <p class="text-gray-500 mt-2">Sign in with your company email</p>
      </div>

      <!-- Step 1: Email input -->
      <div id="email-step">
        <label for="login-email" class="block text-sm font-medium text-gray-700 mb-1">
          Email address
        </label>
        <input
          type="email"
          id="login-email"
          placeholder="you@spa-company.com"
          class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a9cf54] focus:border-transparent outline-none"
        />
        <button
          id="send-code-btn"
          class="w-full mt-4 bg-[#a9cf54] hover:bg-[#588f27] text-white font-semibold py-3 rounded-lg transition-colors"
        >
          Send login code
        </button>
        <p id="email-error" class="text-red-500 text-sm mt-2 hidden"></p>
      </div>

      <!-- Step 2: Code input -->
      <div id="code-step" class="hidden">
        <p class="text-sm text-gray-600 mb-3">
          We sent a 6-digit code to <span id="sent-to-email" class="font-semibold"></span>
        </p>
        <label for="login-code" class="block text-sm font-medium text-gray-700 mb-1">
          Enter code
        </label>
        <input
          type="text"
          id="login-code"
          maxlength="6"
          placeholder="000000"
          class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a9cf54] focus:border-transparent outline-none text-center text-2xl tracking-[0.5em] font-mono"
        />
        <button
          id="verify-code-btn"
          class="w-full mt-4 bg-[#a9cf54] hover:bg-[#588f27] text-white font-semibold py-3 rounded-lg transition-colors"
        >
          Verify
        </button>
        <p id="code-error" class="text-red-500 text-sm mt-2 hidden"></p>
        <button
          id="back-to-email"
          class="w-full mt-2 text-gray-500 text-sm hover:text-gray-700"
        >
          Use a different email
        </button>
      </div>
    </div>
  </div>

  <!-- Protected Content (hidden until authenticated) -->
  <div id="protected-content" class="hidden">
    <slot />
  </div>
</div>

<script>
  import { callFunction } from "../lib/firebase.js";

  const SESSION_KEY = "spa_intake_session";

  const loginScreen = document.getElementById("login-screen");
  const protectedContent = document.getElementById("protected-content");
  const emailStep = document.getElementById("email-step");
  const codeStep = document.getElementById("code-step");
  const emailInput = document.getElementById("login-email");
  const codeInput = document.getElementById("login-code");
  const sendCodeBtn = document.getElementById("send-code-btn");
  const verifyCodeBtn = document.getElementById("verify-code-btn");
  const backToEmailBtn = document.getElementById("back-to-email");
  const emailError = document.getElementById("email-error");
  const codeError = document.getElementById("code-error");
  const sentToEmail = document.getElementById("sent-to-email");

  let currentEmail = "";

  // Check existing session on load
  checkSession();

  async function checkSession() {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    if (session && session.expiresAt > Date.now()) {
      showProtectedContent(session.email);
      return;
    }
    localStorage.removeItem(SESSION_KEY);
  }

  function showProtectedContent(email) {
    loginScreen.classList.add("hidden");
    protectedContent.classList.remove("hidden");
    // Make email available to the intake form
    window.__intakeUserEmail = email;
    window.dispatchEvent(new CustomEvent("intake-authenticated", { detail: { email } }));
  }

  function showError(el, message) {
    el.textContent = message;
    el.classList.remove("hidden");
  }

  function hideError(el) {
    el.classList.add("hidden");
  }

  function setLoading(btn, loading) {
    btn.disabled = loading;
    btn.textContent = loading
      ? "Please wait..."
      : btn.id === "send-code-btn"
        ? "Send login code"
        : "Verify";
  }

  // Send code
  sendCodeBtn.addEventListener("click", async () => {
    hideError(emailError);
    currentEmail = emailInput.value.trim().toLowerCase();

    if (!currentEmail) {
      showError(emailError, "Please enter your email address.");
      return;
    }

    setLoading(sendCodeBtn, true);
    try {
      await callFunction("sendLoginCode", { email: currentEmail });
      sentToEmail.textContent = currentEmail;
      emailStep.classList.add("hidden");
      codeStep.classList.remove("hidden");
      codeInput.focus();
    } catch (e) {
      showError(emailError, e.message || "Failed to send code. Check your email domain.");
    } finally {
      setLoading(sendCodeBtn, false);
    }
  });

  // Enter key on email input
  emailInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendCodeBtn.click();
  });

  // Verify code
  verifyCodeBtn.addEventListener("click", async () => {
    hideError(codeError);
    const code = codeInput.value.trim();

    if (!code || code.length !== 6) {
      showError(codeError, "Please enter the 6-digit code.");
      return;
    }

    setLoading(verifyCodeBtn, true);
    try {
      const result = await callFunction("verifyLoginCode", {
        email: currentEmail,
        code,
      });
      const session = result.data;
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      showProtectedContent(session.email);
    } catch (e) {
      showError(codeError, e.message || "Invalid or expired code.");
    } finally {
      setLoading(verifyCodeBtn, false);
    }
  });

  // Enter key on code input
  codeInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") verifyCodeBtn.click();
  });

  // Back to email
  backToEmailBtn.addEventListener("click", () => {
    codeStep.classList.add("hidden");
    emailStep.classList.remove("hidden");
    codeInput.value = "";
    hideError(codeError);
  });
</script>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/LoginGate.astro
git commit -m "feat: add LoginGate component with email code authentication"
```

---

## Task 12: UploadZone Component

**Files:**
- Create: `src/components/UploadZone.astro`

- [ ] **Step 1: Create the UploadZone component**

Create `src/components/UploadZone.astro`:
```astro
---
// UploadZone — drag-and-drop file upload with three labeled slots
---

<div id="upload-zone" class="space-y-6">
  <h2 class="text-xl font-bold text-gray-900">Upload Documents</h2>
  <p class="text-gray-500 text-sm">Upload the candidate's passport, CV, and profile photos. We'll extract information automatically.</p>

  <div class="grid md:grid-cols-3 gap-4">
    <!-- Passport -->
    <div class="upload-slot border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-[#a9cf54] transition-colors cursor-pointer"
         data-slot="passport" data-accept=".pdf" data-max="1">
      <div class="upload-slot-content">
        <svg class="w-10 h-10 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p class="font-semibold text-gray-700">Passport</p>
        <p class="text-xs text-gray-400 mt-1">PDF format, max 10 MB</p>
        <p class="text-xs text-[#a9cf54] font-medium mt-1">Required</p>
      </div>
      <div class="upload-slot-preview hidden mt-3"></div>
      <input type="file" class="hidden" accept=".pdf" />
    </div>

    <!-- CV -->
    <div class="upload-slot border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-[#a9cf54] transition-colors cursor-pointer"
         data-slot="cv" data-accept=".pdf" data-max="1">
      <div class="upload-slot-content">
        <svg class="w-10 h-10 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p class="font-semibold text-gray-700">CV / Resume</p>
        <p class="text-xs text-gray-400 mt-1">PDF format, max 10 MB</p>
        <p class="text-xs text-[#a9cf54] font-medium mt-1">Required</p>
      </div>
      <div class="upload-slot-preview hidden mt-3"></div>
      <input type="file" class="hidden" accept=".pdf" />
    </div>

    <!-- Photos -->
    <div class="upload-slot border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-[#a9cf54] transition-colors cursor-pointer"
         data-slot="photos" data-accept="image/jpeg,image/png,.jpg,.jpeg,.png" data-max="10">
      <div class="upload-slot-content">
        <svg class="w-10 h-10 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p class="font-semibold text-gray-700">Profile Photos</p>
        <p class="text-xs text-gray-400 mt-1">JPG/PNG, max 5 MB each, up to 10</p>
        <p class="text-xs text-[#a9cf54] font-medium mt-1">Required (at least 1)</p>
      </div>
      <div class="upload-slot-preview hidden mt-3 flex flex-wrap gap-2 justify-center"></div>
      <input type="file" class="hidden" accept="image/jpeg,image/png,.jpg,.jpeg,.png" multiple />
    </div>
  </div>

  <!-- Process button -->
  <div class="text-center">
    <button
      id="process-docs-btn"
      disabled
      class="bg-[#a9cf54] hover:bg-[#588f27] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-8 rounded-lg transition-colors"
    >
      Process Documents with AI
    </button>
    <p id="process-status" class="text-sm text-gray-500 mt-2 hidden"></p>
  </div>
</div>

<script>
  import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
  import { storage, callFunction } from "../lib/firebase.js";

  const slots = document.querySelectorAll(".upload-slot");
  const processBtn = document.getElementById("process-docs-btn");
  const processStatus = document.getElementById("process-status");

  // Store uploaded files and their Storage URLs
  window.__uploadedFiles = { passport: null, cv: null, photos: [] };
  window.__storageUrls = { passport: null, cv: null, photos: [] };

  const MAX_SIZES = { passport: 10 * 1024 * 1024, cv: 10 * 1024 * 1024, photos: 5 * 1024 * 1024 };

  slots.forEach((slot) => {
    const fileInput = slot.querySelector("input[type=file]");
    const slotName = slot.dataset.slot;
    const preview = slot.querySelector(".upload-slot-preview");
    const content = slot.querySelector(".upload-slot-content");

    // Click to select file
    slot.addEventListener("click", (e) => {
      if (e.target === fileInput) return;
      fileInput.click();
    });

    // Drag and drop
    slot.addEventListener("dragover", (e) => {
      e.preventDefault();
      slot.classList.add("border-[#a9cf54]", "bg-green-50");
    });
    slot.addEventListener("dragleave", () => {
      slot.classList.remove("border-[#a9cf54]", "bg-green-50");
    });
    slot.addEventListener("drop", (e) => {
      e.preventDefault();
      slot.classList.remove("border-[#a9cf54]", "bg-green-50");
      handleFiles(slotName, Array.from(e.dataTransfer.files), preview, content);
    });

    // File input change
    fileInput.addEventListener("change", () => {
      handleFiles(slotName, Array.from(fileInput.files), preview, content);
    });
  });

  function handleFiles(slotName, files, preview, content) {
    const maxSize = MAX_SIZES[slotName];

    if (slotName === "photos") {
      const validFiles = files.filter((f) => f.size <= maxSize);
      window.__uploadedFiles.photos = validFiles.slice(0, 10);

      // Show photo previews
      preview.innerHTML = "";
      preview.classList.remove("hidden");
      validFiles.forEach((f) => {
        const img = document.createElement("img");
        img.src = URL.createObjectURL(f);
        img.className = "w-16 h-16 object-cover rounded";
        preview.appendChild(img);
      });
    } else {
      const file = files[0];
      if (!file || file.size > maxSize) return;
      window.__uploadedFiles[slotName] = file;

      // Show filename
      preview.innerHTML = `<p class="text-sm text-green-600 font-medium">${file.name}</p>`;
      preview.classList.remove("hidden");
    }

    updateProcessButton();
  }

  function updateProcessButton() {
    const f = window.__uploadedFiles;
    const ready = f.passport && f.cv && f.photos.length > 0;
    processBtn.disabled = !ready;
  }

  // Process documents — upload to Storage, then call OCR
  processBtn.addEventListener("click", async () => {
    processBtn.disabled = true;
    processBtn.textContent = "Uploading files...";
    processStatus.classList.remove("hidden");
    processStatus.textContent = "Uploading documents to cloud storage...";

    const tempId = Date.now().toString();
    const basePath = `candidates/${tempId}`;

    try {
      // Upload passport
      const passportRef = ref(storage, `${basePath}/passport.pdf`);
      await uploadBytes(passportRef, window.__uploadedFiles.passport);
      window.__storageUrls.passport = await getDownloadURL(passportRef);

      // Upload CV
      const cvRef = ref(storage, `${basePath}/cv.pdf`);
      await uploadBytes(cvRef, window.__uploadedFiles.cv);
      window.__storageUrls.cv = await getDownloadURL(cvRef);

      // Upload photos
      for (const photo of window.__uploadedFiles.photos) {
        const photoRef = ref(storage, `${basePath}/photos/${photo.name}`);
        await uploadBytes(photoRef, photo);
        const url = await getDownloadURL(photoRef);
        window.__storageUrls.photos.push(url);
      }

      // Call OCR Cloud Function
      processStatus.textContent = "Analyzing documents with AI... This may take 30-60 seconds.";
      processBtn.textContent = "Processing...";

      const result = await callFunction("processDocuments", {
        passportUrl: window.__storageUrls.passport,
        cvUrl: window.__storageUrls.cv,
      });

      const ocrData = result.data;
      processStatus.textContent = "Documents processed successfully!";
      processStatus.classList.remove("text-gray-500");
      processStatus.classList.add("text-green-600");
      processBtn.textContent = "Done!";

      // Dispatch event with OCR results for the form to pick up
      window.dispatchEvent(
        new CustomEvent("ocr-complete", { detail: ocrData })
      );
    } catch (e) {
      processStatus.textContent = `Error: ${e.message}`;
      processStatus.classList.add("text-red-500");
      processBtn.textContent = "Retry";
      processBtn.disabled = false;
    }
  });
</script>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/UploadZone.astro
git commit -m "feat: add UploadZone component with drag-drop, previews, and OCR trigger"
```

---

## Task 13: CandidateForm Component

**Files:**
- Create: `src/components/CandidateForm.astro`

- [ ] **Step 1: Create the full candidate form**

Create `src/components/CandidateForm.astro`. This is a large component with collapsible sections for all Notion candidate fields.

```astro
---
// CandidateForm — full candidate intake form with all Notion fields
// Listens for 'ocr-complete' event to auto-fill fields from OCR results
---

<form id="candidate-form" class="space-y-6 hidden">
  <!-- Section A: Identity -->
  <details class="border rounded-xl overflow-hidden" open>
    <summary class="bg-gray-50 px-6 py-4 font-semibold text-gray-900 cursor-pointer">
      Identity
    </summary>
    <div class="p-6 grid md:grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
        <input type="text" name="fullName" required
          class="form-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a9cf54] outline-none" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
        <input type="date" name="dateOfBirth"
          class="form-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a9cf54] outline-none" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Place of Birth</label>
        <input type="text" name="placeOfBirth"
          class="form-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a9cf54] outline-none" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Nationality</label>
        <input type="text" name="nationality" placeholder="e.g. Thailand, Philippines"
          class="form-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a9cf54] outline-none" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Origin Country</label>
        <input type="text" name="originCountry" placeholder="e.g. Thailand"
          class="form-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a9cf54] outline-none" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Gender</label>
        <select name="gender" class="form-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a9cf54] outline-none">
          <option value="">—</option>
          <option>Male</option>
          <option>Female</option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Marital Status</label>
        <select name="maritalStatus" class="form-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a9cf54] outline-none">
          <option value="">—</option>
          <option>Single</option>
          <option>Married</option>
          <option>Divorced</option>
          <option>Widowed</option>
          <option>Separated</option>
        </select>
      </div>
    </div>
  </details>

  <!-- Section B: Contact -->
  <details class="border rounded-xl overflow-hidden">
    <summary class="bg-gray-50 px-6 py-4 font-semibold text-gray-900 cursor-pointer">
      Contact
    </summary>
    <div class="p-6 grid md:grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input type="email" name="email"
          class="form-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a9cf54] outline-none" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
        <input type="tel" name="phone"
          class="form-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a9cf54] outline-none" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Alternate Phone</label>
        <input type="tel" name="alternatePhone"
          class="form-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a9cf54] outline-none" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
        <input type="tel" name="whatsapp"
          class="form-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a9cf54] outline-none" />
      </div>
      <div class="md:col-span-2">
        <label class="block text-sm font-medium text-gray-700 mb-1">LINE / Facebook</label>
        <input type="text" name="lineFacebook"
          class="form-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a9cf54] outline-none" />
      </div>
    </div>
  </details>

  <!-- Section C: Address -->
  <details class="border rounded-xl overflow-hidden">
    <summary class="bg-gray-50 px-6 py-4 font-semibold text-gray-900 cursor-pointer">
      Address
    </summary>
    <div class="p-6 grid md:grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Origin Address</label>
        <textarea name="originAddress" rows="2"
          class="form-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a9cf54] outline-none"></textarea>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Origin Address (Local Language)</label>
        <textarea name="originAddressLocal" rows="2"
          class="form-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a9cf54] outline-none"></textarea>
      </div>
    </div>
  </details>

  <!-- Section D: Professional -->
  <details class="border rounded-xl overflow-hidden" open>
    <summary class="bg-gray-50 px-6 py-4 font-semibold text-gray-900 cursor-pointer">
      Professional
    </summary>
    <div class="p-6 grid md:grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Job Title / Position *</label>
        <select name="jobPosition" required class="form-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a9cf54] outline-none">
          <option value="">— Select —</option>
          <option>Massage</option>
          <option>Chef</option>
          <option>Housekeeping</option>
          <option>Factory</option>
          <option>Portier</option>
          <option>License Holder</option>
          <option>Agency Employee</option>
          <option>Hybrid</option>
          <option>Other</option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Experience</label>
        <input type="text" name="experience" placeholder="e.g. 5 years"
          class="form-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a9cf54] outline-none" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Education</label>
        <select name="education" class="form-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a9cf54] outline-none">
          <option value="">—</option>
          <option>Primary School</option>
          <option>High School</option>
          <option>Vocational Certificate</option>
          <option>High Vocational Certificate</option>
          <option>Bachelor Degree</option>
          <option>Master Degree</option>
          <option>Doctorate</option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">English Level</label>
        <select name="englishLevel" class="form-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a9cf54] outline-none">
          <option value="">—</option>
          <option>None</option>
          <option>Beginner (A1)</option>
          <option>Elementary (A2)</option>
          <option>Intermediate (B1)</option>
          <option>Upper Intermediate (B2)</option>
          <option>Advanced (C1)</option>
          <option>Proficient (C2)</option>
        </select>
      </div>
      <div class="md:col-span-2">
        <label class="block text-sm font-medium text-gray-700 mb-1">Skills (comma-separated)</label>
        <input type="text" name="skills" placeholder="e.g. Thai Massage, Oil Massage, Foot Reflexology"
          class="form-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a9cf54] outline-none" />
      </div>
      <div class="md:col-span-2">
        <label class="block text-sm font-medium text-gray-700 mb-1">Bio</label>
        <textarea name="bio" rows="3" placeholder="Short biography for the public profile"
          class="form-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a9cf54] outline-none"></textarea>
      </div>
    </div>
  </details>

  <!-- Section E: Recruitment -->
  <details class="border rounded-xl overflow-hidden">
    <summary class="bg-gray-50 px-6 py-4 font-semibold text-gray-900 cursor-pointer">
      Recruitment
    </summary>
    <div class="p-6 grid md:grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Recruiting Source</label>
        <select name="recruitingSource" class="form-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a9cf54] outline-none">
          <option value="">—</option>
          <option>Direct</option>
          <option>Referral</option>
          <option>Agency</option>
          <option>Social Media</option>
          <option>Website</option>
          <option>Other</option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Target Country</label>
        <input type="text" name="targetCountry" placeholder="e.g. Slovakia"
          class="form-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a9cf54] outline-none" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Would like to go</label>
        <input type="text" name="wouldLikeToGo" placeholder="e.g. Germany, Austria (comma-separated)"
          class="form-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a9cf54] outline-none" />
      </div>
      <div class="flex items-center gap-2 pt-6">
        <input type="checkbox" name="fiveStarHotelSpa" id="fiveStarCheck" class="rounded" />
        <label for="fiveStarCheck" class="text-sm text-gray-700">5-Star hotel/Spa</label>
      </div>
    </div>
  </details>

  <!-- Section F: Employment -->
  <details class="border rounded-xl overflow-hidden">
    <summary class="bg-gray-50 px-6 py-4 font-semibold text-gray-900 cursor-pointer">
      Employment
    </summary>
    <div class="p-6 grid md:grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Candidate Status</label>
        <input type="text" name="candidateStatus" placeholder="e.g. Waiting Room"
          class="form-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a9cf54] outline-none" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Employment Status</label>
        <input type="text" name="employmentStatus"
          class="form-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a9cf54] outline-none" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Employment Type</label>
        <input type="text" name="employmentType"
          class="form-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a9cf54] outline-none" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Leasing Number</label>
        <input type="text" name="leasingNumber"
          class="form-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a9cf54] outline-none" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Leasing Company</label>
        <select name="leasingCompany" class="form-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a9cf54] outline-none">
          <option value="">—</option>
          <option>TBD</option>
          <option>Spa Company Slovakia</option>
          <option>Prachuap Khiri Khan</option>
          <option>Borisad Farang</option>
          <option>Sabai Bratislava</option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Contract Under</label>
        <select name="contractUnder" class="form-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a9cf54] outline-none">
          <option value="">—</option>
          <option>TBD</option>
          <option>Prachuap Khiri Khan</option>
          <option value="Spa Company Slovakia s.ro.">Spa Company Slovakia s.ro.</option>
          <option>DMJ Europe</option>
          <option>RM2 Ventures</option>
          <option>Borisad</option>
          <option>Saithong</option>
          <option>Portinter</option>
          <option>7Leelawadee</option>
        </select>
      </div>
    </div>
  </details>

  <!-- Section G: Dates -->
  <details class="border rounded-xl overflow-hidden">
    <summary class="bg-gray-50 px-6 py-4 font-semibold text-gray-900 cursor-pointer">
      Dates
    </summary>
    <div class="p-6 grid md:grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Date Applied</label>
        <input type="date" name="dateApplied"
          class="form-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a9cf54] outline-none" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Interview Date</label>
        <input type="date" name="interviewDate"
          class="form-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a9cf54] outline-none" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Client Approval</label>
        <input type="date" name="clientApprovalDate"
          class="form-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a9cf54] outline-none" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Date of Embassy</label>
        <input type="date" name="dateOfEmbassy"
          class="form-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a9cf54] outline-none" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Start Date by Social Insurance</label>
        <input type="date" name="startDateBySocialInsurance"
          class="form-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a9cf54] outline-none" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">OCP Date</label>
        <input type="datetime-local" name="ocpDate"
          class="form-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a9cf54] outline-none" />
      </div>
    </div>
  </details>

  <!-- Section H: Relations & Assignments -->
  <details class="border rounded-xl overflow-hidden">
    <summary class="bg-gray-50 px-6 py-4 font-semibold text-gray-900 cursor-pointer">
      Relations & Assignments
    </summary>
    <div class="p-6 grid md:grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Assigned to (email)</label>
        <input type="text" name="assignedTo" placeholder="e.g. natalia@spa-company.com"
          class="form-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a9cf54] outline-none" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Recruiter</label>
        <input type="text" name="recruiterEmail" readonly
          class="form-input w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Client (Notion page URL)</label>
        <input type="url" name="clientPageUrl" placeholder="https://www.notion.so/..."
          class="form-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a9cf54] outline-none" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Location (Notion page URL)</label>
        <input type="url" name="locationPageUrl" placeholder="https://www.notion.so/..."
          class="form-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a9cf54] outline-none" />
      </div>
    </div>
  </details>

  <!-- Section I: Notes -->
  <details class="border rounded-xl overflow-hidden">
    <summary class="bg-gray-50 px-6 py-4 font-semibold text-gray-900 cursor-pointer">
      Notes
    </summary>
    <div class="p-6">
      <textarea name="notes" rows="4" placeholder="Internal notes..."
        class="form-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a9cf54] outline-none"></textarea>
    </div>
  </details>

  <!-- Submit -->
  <div class="text-center pt-4">
    <button
      type="submit"
      class="bg-[#588f27] hover:bg-[#3d6b17] text-white font-semibold py-3 px-12 rounded-lg transition-colors text-lg"
    >
      Submit Candidate
    </button>
    <p id="submit-status" class="text-sm mt-2 hidden"></p>
  </div>
</form>

<!-- Success screen -->
<div id="success-screen" class="hidden text-center py-16">
  <div class="text-6xl mb-4">&#10003;</div>
  <h2 class="text-2xl font-bold text-gray-900 mb-2">Candidate Submitted</h2>
  <p class="text-gray-500 mb-6">The candidate profile is now awaiting approval.</p>
  <div class="space-y-2">
    <a id="profile-link" href="#" class="block text-[#588f27] hover:underline font-medium">View draft profile</a>
    <a id="notion-link" href="#" target="_blank" class="block text-[#588f27] hover:underline font-medium">Open in Notion</a>
  </div>
  <button id="add-another" class="mt-8 bg-[#a9cf54] hover:bg-[#588f27] text-white font-semibold py-2 px-8 rounded-lg transition-colors">
    Add Another Candidate
  </button>
</div>

<script>
  import { collection, addDoc, serverTimestamp } from "firebase/firestore";
  import { db, callFunction } from "../lib/firebase.js";
  import { generateCandidateId, generateExternalId } from "../lib/idHelpers.js";

  const form = document.getElementById("candidate-form");
  const submitStatus = document.getElementById("submit-status");
  const successScreen = document.getElementById("success-screen");

  // Auto-fill from OCR results
  window.addEventListener("ocr-complete", (e) => {
    const { passport, cv } = e.detail;
    form.classList.remove("hidden");

    // Auto-set today's date for Date Applied
    const today = new Date().toISOString().split("T")[0];
    setField("dateApplied", today);

    if (passport && !passport.error) {
      setField("fullName", passport.fullName);
      setField("dateOfBirth", passport.dateOfBirth);
      setField("placeOfBirth", passport.placeOfBirth);
      setField("nationality", passport.nationality);
      setField("originCountry", passport.issuingCountry || passport.nationality);
      setField("gender", passport.gender);
      markOcrField("fullName");
      markOcrField("dateOfBirth");
      markOcrField("placeOfBirth");
      markOcrField("nationality");
      markOcrField("originCountry");
      markOcrField("gender");
    }

    if (cv && !cv.error) {
      setField("education", cv.education);
      setField("experience", cv.experience);
      if (cv.email) setField("email", cv.email);
      if (cv.phone) setField("phone", cv.phone);
      if (cv.skills) setField("skills", cv.skills.join(", "));
      markOcrField("education");
      markOcrField("experience");
    }

    // Store passport data for document creation
    window.__passportOcr = passport;
  });

  // Auto-fill recruiter email from auth
  window.addEventListener("intake-authenticated", (e) => {
    setField("recruiterEmail", e.detail.email);
  });

  function setField(name, value) {
    const el = form.querySelector(`[name="${name}"]`);
    if (el && value) el.value = value;
  }

  function markOcrField(name) {
    const el = form.querySelector(`[name="${name}"]`);
    if (el && el.value) {
      el.classList.add("border-green-400", "bg-green-50");
    }
  }

  // Form submission
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = "Submitting...";
    submitStatus.classList.remove("hidden");
    submitStatus.textContent = "Creating candidate record...";

    try {
      const fd = new FormData(form);
      const recruiterEmail = fd.get("recruiterEmail");

      // Parse comma-separated fields into arrays
      const nationality = fd.get("nationality")?.split(",").map(s => s.trim()).filter(Boolean) || [];
      const originCountry = fd.get("originCountry")?.split(",").map(s => s.trim()).filter(Boolean) || [];
      const targetCountry = fd.get("targetCountry")?.split(",").map(s => s.trim()).filter(Boolean) || [];
      const wouldLikeToGo = fd.get("wouldLikeToGo")?.split(",").map(s => s.trim()).filter(Boolean) || [];
      const skills = fd.get("skills")?.split(",").map(s => s.trim()).filter(Boolean) || [];

      // Split full name
      const fullName = fd.get("fullName") || "";
      const nameParts = fullName.trim().split(/\s+/);
      const lastName = nameParts.length > 1 ? nameParts.pop() : "";
      const firstName = nameParts.join(" ");

      const jobPosition = fd.get("jobPosition");

      // Build Firestore candidate data
      const candidateData = {
        firstName,
        lastName,
        fullName,
        dateOfBirth: fd.get("dateOfBirth") || null,
        placeOfBirth: fd.get("placeOfBirth") || null,
        nationality: nationality[0] || null,
        originCountry: originCountry[0] || null,
        gender: fd.get("gender") || null,
        maritalStatus: fd.get("maritalStatus") || null,
        jobPosition,
        experience: fd.get("experience") || null,
        education: fd.get("education") || null,
        englishLevel: fd.get("englishLevel") || null,
        skills,
        bio: fd.get("bio") || "",
        workHistory: [],
        email: fd.get("email") || null,
        phone: fd.get("phone") || null,
        alternatePhone: fd.get("alternatePhone") || null,
        whatsapp: fd.get("whatsapp") || null,
        lineFacebook: fd.get("lineFacebook") || null,
        originAddress: fd.get("originAddress") || null,
        originAddressLocal: fd.get("originAddressLocal") || null,
        photos: window.__storageUrls?.photos || [],
        passportNumber: window.__passportOcr?.passportNumber || null,
        passportIssueDate: window.__passportOcr?.dateOfIssue || null,
        passportExpiryDate: window.__passportOcr?.dateOfExpiry || null,
        passportUrl: window.__storageUrls?.passport || null,
        cvUrl: window.__storageUrls?.cv || null,
        status: "draft",
        createdBy: recruiterEmail,
        createdAt: serverTimestamp(),
        approvedBy: null,
        approvedAt: null,
      };

      // Write to Firestore
      submitStatus.textContent = "Saving to database...";
      const docRef = await addDoc(collection(db, "candidates"), candidateData);
      const candidateId = `SC-${2000 + Math.floor(Math.random() * 8000)}`; // Temporary — will be replaced by server-side generation
      await docRef.update({ candidateId });

      // Submit to Notion
      submitStatus.textContent = "Creating Notion records...";
      const notionTitle = `${candidateId} - ${fullName.toUpperCase()} (${jobPosition || "Unknown"})`;

      const notionPayload = {
        candidateData: {
          notionTitle,
          fullName,
          email: fd.get("email"),
          phone: fd.get("phone"),
          alternatePhone: fd.get("alternatePhone"),
          whatsapp: fd.get("whatsapp"),
          lineFacebook: fd.get("lineFacebook"),
          placeOfBirth: fd.get("placeOfBirth"),
          originAddress: fd.get("originAddress"),
          originAddressLocal: fd.get("originAddressLocal"),
          maritalStatus: fd.get("maritalStatus"),
          nationality,
          originCountry,
          targetCountry,
          wouldLikeToGo,
          education: fd.get("education"),
          englishLevel: fd.get("englishLevel"),
          experience: fd.get("experience"),
          jobPosition,
          recruitingSource: fd.get("recruitingSource"),
          candidateStatus: fd.get("candidateStatus"),
          employmentStatus: fd.get("employmentStatus"),
          employmentType: fd.get("employmentType"),
          leasingNumber: fd.get("leasingNumber"),
          leasingCompany: fd.get("leasingCompany"),
          contractUnder: fd.get("contractUnder"),
          fiveStarHotelSpa: fd.get("fiveStarHotelSpa") === "on",
          notes: fd.get("notes"),
          dateOfBirth: fd.get("dateOfBirth"),
          dateApplied: fd.get("dateApplied"),
          interviewDate: fd.get("interviewDate"),
          clientApprovalDate: fd.get("clientApprovalDate"),
          dateOfEmbassy: fd.get("dateOfEmbassy"),
          startDateBySocialInsurance: fd.get("startDateBySocialInsurance"),
          ocpDate: fd.get("ocpDate") ? new Date(fd.get("ocpDate")).toISOString() : null,
          assignedTo: fd.get("assignedTo") ? [fd.get("assignedTo")] : null,
          clientPageUrls: fd.get("clientPageUrl") ? [fd.get("clientPageUrl")] : null,
          locationPageUrls: fd.get("locationPageUrl") ? [fd.get("locationPageUrl")] : null,
        },
        documents: [
          {
            name: `Passport - ${fullName}`,
            type: "Passport",
            status: "Completed",
            documentIdPin: window.__passportOcr?.passportNumber || null,
            dateOfIssue: window.__passportOcr?.dateOfIssue || null,
            dateOfExpiry: window.__passportOcr?.dateOfExpiry || null,
          },
          {
            name: `CV / Resume - ${fullName}`,
            type: "CV / Resume",
            status: "Completed",
          },
          {
            name: `Profile Picture - ${fullName}`,
            type: "Profile Picture",
            status: "Completed",
          },
        ],
        recruiterEmail,
      };

      const notionResult = await callFunction("submitToNotion", notionPayload);
      const { candidatePageUrl, documentPageUrls } = notionResult.data;

      // Update Firestore with Notion URLs
      await docRef.update({
        notionCandidateUrl: candidatePageUrl,
        notionDocumentUrls: documentPageUrls,
      });

      // Show success
      form.classList.add("hidden");
      successScreen.classList.remove("hidden");
      document.getElementById("profile-link").href = `/candidate?id=${candidateId}`;
      document.getElementById("notion-link").href = candidatePageUrl;

    } catch (e) {
      submitStatus.textContent = `Error: ${e.message}`;
      submitStatus.classList.add("text-red-500");
      btn.disabled = false;
      btn.textContent = "Submit Candidate";
    }
  });

  // Add another candidate
  document.getElementById("add-another")?.addEventListener("click", () => {
    window.location.reload();
  });
</script>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/CandidateForm.astro
git commit -m "feat: add CandidateForm component with OCR auto-fill and Notion submission"
```

---

## Task 14: The `/intake` Page

**Files:**
- Create: `src/pages/intake.astro`

- [ ] **Step 1: Create the intake page**

Create `src/pages/intake.astro`:
```astro
---
import Layout from "../layouts/Layout.astro";
import LoginGate from "../components/LoginGate.astro";
import UploadZone from "../components/UploadZone.astro";
import CandidateForm from "../components/CandidateForm.astro";
---

<Layout title="Candidate Intake — Spa Company" description="Internal candidate intake tool for Spa Company recruiters">
  <LoginGate>
    <div class="max-w-4xl mx-auto px-4 py-8">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">New Candidate Intake</h1>
        <p class="text-gray-500 mt-2">Upload documents, review extracted data, and submit to create the candidate profile.</p>
      </div>

      <UploadZone />

      <div class="mt-8">
        <CandidateForm />
      </div>
    </div>
  </LoginGate>
</Layout>
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/intake.astro
git commit -m "feat: add /intake page with auth, upload zone, and candidate form"
```

---

## Task 15: Approval Review Page

**Files:**
- Create: `src/pages/intake/review.astro`

- [ ] **Step 1: Create the review page**

Create `src/pages/intake/review.astro`:
```astro
---
import Layout from "../../layouts/Layout.astro";
import LoginGate from "../../components/LoginGate.astro";
---

<Layout title="Review Candidates — Spa Company" description="Review and approve candidate submissions">
  <LoginGate>
    <div class="max-w-6xl mx-auto px-4 py-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">Candidate Review Queue</h1>
      <p class="text-gray-500 mb-8">Review pending candidates and approve or reject them.</p>

      <div id="not-approver" class="hidden text-center py-16">
        <p class="text-gray-500 text-lg">You don't have permission to approve candidates.</p>
      </div>

      <div id="review-list" class="space-y-4"></div>
      <div id="empty-state" class="hidden text-center py-16">
        <p class="text-gray-500 text-lg">No pending candidates to review.</p>
      </div>
    </div>
  </LoginGate>
</Layout>

<script>
  import { collection, query, where, getDocs, doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
  import { db } from "../../lib/firebase.js";

  const reviewList = document.getElementById("review-list");
  const emptyState = document.getElementById("empty-state");
  const notApprover = document.getElementById("not-approver");

  window.addEventListener("intake-authenticated", async (e) => {
    const email = e.detail.email;

    // Check if user is an approver
    const approversDoc = await getDoc(doc(db, "config", "approvers"));
    const approvers = approversDoc.exists() ? approversDoc.data().approverEmails || [] : [];

    if (!approvers.includes(email)) {
      notApprover.classList.remove("hidden");
      return;
    }

    // Load draft candidates
    const q = query(collection(db, "candidates"), where("status", "==", "draft"));
    const snap = await getDocs(q);

    if (snap.empty) {
      emptyState.classList.remove("hidden");
      return;
    }

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const card = document.createElement("div");
      card.className = "border rounded-xl p-6 bg-white shadow-sm";
      card.innerHTML = `
        <div class="flex justify-between items-start">
          <div>
            <h3 class="text-lg font-bold text-gray-900">${data.fullName || "Unknown"}</h3>
            <p class="text-sm text-gray-500">${data.candidateId || ""} &middot; ${data.jobPosition || "Unknown position"} &middot; ${data.nationality || ""}</p>
            <p class="text-xs text-gray-400 mt-1">Submitted by ${data.createdBy || "unknown"}</p>
          </div>
          <div class="flex gap-2">
            <button data-action="approve" data-id="${docSnap.id}"
              class="bg-[#a9cf54] hover:bg-[#588f27] text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
              Approve
            </button>
            <button data-action="reject" data-id="${docSnap.id}"
              class="bg-red-100 hover:bg-red-200 text-red-700 font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
              Reject
            </button>
          </div>
        </div>
        ${data.photos?.length ? `<img src="${data.photos[0]}" class="w-20 h-20 object-cover rounded-lg mt-3" />` : ""}
      `;
      reviewList.appendChild(card);
    });

    // Handle approve/reject clicks
    reviewList.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;

      const action = btn.dataset.action;
      const id = btn.dataset.id;
      const card = btn.closest(".border");

      btn.disabled = true;
      btn.textContent = action === "approve" ? "Approving..." : "Rejecting...";

      const ref = doc(db, "candidates", id);
      await updateDoc(ref, {
        status: action === "approve" ? "published" : "rejected",
        approvedBy: email,
        approvedAt: serverTimestamp(),
      });

      card.classList.add("opacity-50");
      card.querySelector(".flex.gap-2").innerHTML = `
        <span class="text-sm font-medium ${action === "approve" ? "text-green-600" : "text-red-600"}">
          ${action === "approve" ? "Approved" : "Rejected"}
        </span>
      `;
    });
  });
</script>
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/intake/review.astro
git commit -m "feat: add /intake/review page for approver queue"
```

---

## Task 16: Public Candidate Listing Page

**Files:**
- Create: `src/components/JobPositionTabs.astro`
- Create: `src/components/CandidateCard.astro`
- Create: `src/pages/candidates.astro`

- [ ] **Step 1: Create JobPositionTabs component**

Create `src/components/JobPositionTabs.astro`:
```astro
---
const positions = ["All", "Massage", "Chef", "Housekeeping", "Factory", "Portier", "Other"];
---

<div id="position-tabs" class="flex flex-wrap gap-2 mb-8">
  {positions.map((pos) => (
    <button
      data-position={pos === "All" ? "" : pos}
      class="position-tab px-5 py-2 rounded-full text-sm font-medium border transition-colors"
    >
      {pos}
    </button>
  ))}
</div>
```

- [ ] **Step 2: Create CandidateCard component**

Create `src/components/CandidateCard.astro`:
```astro
---
// CandidateCard — rendered client-side from Firestore data
// This is a template that gets cloned via JavaScript
---

<template id="candidate-card-template">
  <a class="candidate-card block border rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
    <div class="aspect-[3/4] bg-gray-100 overflow-hidden">
      <img class="card-photo w-full h-full object-cover" src="" alt="" />
      <div class="card-placeholder hidden w-full h-full flex items-center justify-center text-6xl text-gray-300">&#128100;</div>
    </div>
    <div class="p-4">
      <div class="flex items-center gap-2">
        <span class="card-flag text-lg"></span>
        <h3 class="card-name font-semibold text-gray-900 truncate"></h3>
      </div>
      <p class="card-meta text-sm text-gray-500 mt-1"></p>
      <p class="card-position text-xs font-medium text-[#588f27] mt-2"></p>
    </div>
  </a>
</template>
```

- [ ] **Step 3: Create candidates listing page**

Create `src/pages/candidates.astro`:
```astro
---
import Layout from "../layouts/Layout.astro";
import JobPositionTabs from "../components/JobPositionTabs.astro";
import CandidateCard from "../components/CandidateCard.astro";
---

<Layout title="Candidates — Spa Company" description="Browse our available candidates by job position">
  <div class="max-w-7xl mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold text-gray-900 mb-2">Available Candidates</h1>
    <p class="text-gray-500 mb-6">Browse candidates by job position. Click on a candidate to view their full profile.</p>

    <JobPositionTabs />
    <CandidateCard />

    <div id="candidates-grid" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
    </div>

    <div id="no-candidates" class="hidden text-center py-16">
      <p class="text-gray-500 text-lg">No candidates found for this position.</p>
    </div>
  </div>
</Layout>

<script>
  import { collection, query, where, getDocs } from "firebase/firestore";
  import { db } from "../lib/firebase.js";

  const grid = document.getElementById("candidates-grid");
  const noResults = document.getElementById("no-candidates");
  const template = document.getElementById("candidate-card-template");
  const tabs = document.querySelectorAll(".position-tab");

  const FLAG_MAP = {
    Thailand: "\u{1F1F9}\u{1F1ED}",
    Philippines: "\u{1F1F5}\u{1F1ED}",
    Indonesia: "\u{1F1EE}\u{1F1E9}",
  };

  let allCandidates = [];

  // Get initial position from URL
  const urlParams = new URLSearchParams(window.location.search);
  let activePosition = urlParams.get("position") || "";

  // Load all published candidates once
  async function loadCandidates() {
    const q = query(collection(db, "candidates"), where("status", "==", "published"));
    const snap = await getDocs(q);
    allCandidates = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    filterAndRender();
  }

  function filterAndRender() {
    grid.innerHTML = "";
    const filtered = activePosition
      ? allCandidates.filter((c) => c.jobPosition === activePosition)
      : allCandidates;

    if (filtered.length === 0) {
      noResults.classList.remove("hidden");
      return;
    }
    noResults.classList.add("hidden");

    filtered.forEach((c) => {
      const clone = template.content.cloneNode(true);
      const card = clone.querySelector(".candidate-card");
      card.href = `/candidate?id=${c.candidateId}`;

      const photo = clone.querySelector(".card-photo");
      const placeholder = clone.querySelector(".card-placeholder");
      if (c.photos?.length > 0) {
        photo.src = c.photos[0];
        photo.alt = c.fullName;
      } else {
        photo.classList.add("hidden");
        placeholder.classList.remove("hidden");
      }

      clone.querySelector(".card-flag").textContent = FLAG_MAP[c.nationality] || "";
      clone.querySelector(".card-name").textContent = c.firstName || c.fullName;
      clone.querySelector(".card-position").textContent = c.jobPosition || "";

      const age = c.dateOfBirth ? calculateAge(c.dateOfBirth) : null;
      const meta = [age ? `${age}y` : null, c.experience].filter(Boolean).join(" · ");
      clone.querySelector(".card-meta").textContent = meta;

      grid.appendChild(clone);
    });

    // Update tab styles
    tabs.forEach((tab) => {
      const pos = tab.dataset.position;
      if (pos === activePosition) {
        tab.classList.add("bg-[#a9cf54]", "text-white", "border-[#a9cf54]");
        tab.classList.remove("text-gray-600", "border-gray-300");
      } else {
        tab.classList.remove("bg-[#a9cf54]", "text-white", "border-[#a9cf54]");
        tab.classList.add("text-gray-600", "border-gray-300");
      }
    });
  }

  function calculateAge(dob) {
    const diff = Date.now() - new Date(dob).getTime();
    return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  }

  // Tab click handlers
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      activePosition = tab.dataset.position;
      const url = new URL(window.location);
      if (activePosition) {
        url.searchParams.set("position", activePosition);
      } else {
        url.searchParams.delete("position");
      }
      window.history.replaceState({}, "", url);
      filterAndRender();
    });
  });

  loadCandidates();
</script>
```

- [ ] **Step 4: Commit**

```bash
git add src/components/JobPositionTabs.astro src/components/CandidateCard.astro src/pages/candidates.astro
git commit -m "feat: add /candidates listing page with job position tabs and nationality flags"
```

---

## Task 17: Public Candidate Profile Page

**Files:**
- Create: `src/pages/candidate.astro`

- [ ] **Step 1: Create the candidate profile page**

Create `src/pages/candidate.astro`. This follows the same pattern as the existing `src/pages/therapist.astro` but adapted for the new `candidates` Firestore collection and broader job positions.

```astro
---
import Layout from "../layouts/Layout.astro";
---

<Layout title="Candidate Profile — Spa Company" description="View candidate profile">
  <div id="loading" class="text-center py-16">
    <p class="text-gray-500">Loading candidate profile...</p>
  </div>
  <div id="not-found" class="hidden text-center py-16">
    <p class="text-gray-500 text-lg">Candidate not found.</p>
    <a href="/candidates" class="text-[#588f27] hover:underline mt-4 inline-block">Browse all candidates</a>
  </div>
  <div id="profile" class="hidden max-w-5xl mx-auto px-4 py-8">
    <!-- Photo gallery -->
    <div class="grid md:grid-cols-[300px_1fr] gap-8 mb-8">
      <div>
        <img id="main-photo" class="w-full aspect-[3/4] object-cover rounded-xl bg-gray-100" src="" alt="" />
        <div id="photo-thumbs" class="flex gap-2 mt-2 overflow-x-auto"></div>
      </div>

      <!-- Identity -->
      <div>
        <div class="flex items-center gap-3 mb-2">
          <span id="p-flag" class="text-3xl"></span>
          <h1 id="p-name" class="text-3xl font-bold text-gray-900"></h1>
        </div>
        <p id="p-id" class="text-sm text-gray-400 mb-4"></p>

        <div class="grid grid-cols-2 gap-y-3 gap-x-8 text-sm">
          <div><span class="text-gray-500">Position:</span> <span id="p-position" class="font-medium"></span></div>
          <div><span class="text-gray-500">Nationality:</span> <span id="p-nationality" class="font-medium"></span></div>
          <div><span class="text-gray-500">Age:</span> <span id="p-age" class="font-medium"></span></div>
          <div><span class="text-gray-500">Experience:</span> <span id="p-experience" class="font-medium"></span></div>
          <div><span class="text-gray-500">Education:</span> <span id="p-education" class="font-medium"></span></div>
          <div><span class="text-gray-500">English:</span> <span id="p-english" class="font-medium"></span></div>
        </div>

        <!-- Skills -->
        <div id="skills-section" class="mt-6 hidden">
          <h3 class="font-semibold text-gray-700 mb-2">Skills</h3>
          <div id="p-skills" class="flex flex-wrap gap-2"></div>
        </div>
      </div>
    </div>

    <!-- Bio -->
    <div id="bio-section" class="hidden mb-8">
      <h2 class="text-xl font-bold text-gray-900 mb-3">About</h2>
      <p id="p-bio" class="text-gray-600 leading-relaxed"></p>
    </div>

    <!-- Work History -->
    <div id="work-section" class="hidden mb-8">
      <h2 class="text-xl font-bold text-gray-900 mb-3">Work History</h2>
      <div id="p-work" class="space-y-4"></div>
    </div>

    <!-- Enquiry Form -->
    <div class="bg-gray-50 rounded-xl p-6 mt-8">
      <h2 class="text-xl font-bold text-gray-900 mb-4">Enquire About This Candidate</h2>
      <form id="enquiry-form" class="grid md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Your Name *</label>
          <input type="text" name="name" required
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a9cf54] outline-none" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Email *</label>
          <input type="email" name="email" required
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a9cf54] outline-none" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input type="tel" name="phone"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a9cf54] outline-none" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Message</label>
          <textarea name="message" rows="2"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a9cf54] outline-none"></textarea>
        </div>
        <div class="md:col-span-2">
          <button type="submit"
            class="bg-[#a9cf54] hover:bg-[#588f27] text-white font-semibold py-2 px-6 rounded-lg transition-colors">
            Send Enquiry
          </button>
          <p id="enquiry-status" class="text-sm mt-2 hidden"></p>
        </div>
      </form>
    </div>
  </div>
</Layout>

<script>
  import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
  import { db } from "../lib/firebase.js";

  const FLAG_MAP = {
    Thailand: "\u{1F1F9}\u{1F1ED}",
    Philippines: "\u{1F1F5}\u{1F1ED}",
    Indonesia: "\u{1F1EE}\u{1F1E9}",
  };

  const urlParams = new URLSearchParams(window.location.search);
  const candidateId = urlParams.get("id");

  if (!candidateId) {
    document.getElementById("loading").classList.add("hidden");
    document.getElementById("not-found").classList.remove("hidden");
  } else {
    loadCandidate(candidateId);
  }

  async function loadCandidate(id) {
    const q = query(
      collection(db, "candidates"),
      where("candidateId", "==", id),
      where("status", "==", "published")
    );
    const snap = await getDocs(q);

    document.getElementById("loading").classList.add("hidden");

    if (snap.empty) {
      document.getElementById("not-found").classList.remove("hidden");
      return;
    }

    const data = snap.docs[0].data();
    const profile = document.getElementById("profile");
    profile.classList.remove("hidden");

    // Update page title
    document.title = `${data.fullName || data.firstName} — Spa Company`;

    // Photos
    const mainPhoto = document.getElementById("main-photo");
    const thumbs = document.getElementById("photo-thumbs");
    if (data.photos?.length > 0) {
      mainPhoto.src = data.photos[0];
      mainPhoto.alt = data.fullName;
      data.photos.forEach((url, i) => {
        const img = document.createElement("img");
        img.src = url;
        img.className = `w-16 h-16 object-cover rounded cursor-pointer border-2 ${i === 0 ? "border-[#a9cf54]" : "border-transparent"}`;
        img.addEventListener("click", () => {
          mainPhoto.src = url;
          thumbs.querySelectorAll("img").forEach((t) => t.classList.replace("border-[#a9cf54]", "border-transparent"));
          img.classList.replace("border-transparent", "border-[#a9cf54]");
        });
        thumbs.appendChild(img);
      });
    }

    // Identity
    document.getElementById("p-flag").textContent = FLAG_MAP[data.nationality] || "";
    document.getElementById("p-name").textContent = data.fullName || data.firstName;
    document.getElementById("p-id").textContent = data.candidateId || "";
    document.getElementById("p-position").textContent = data.jobPosition || "";
    document.getElementById("p-nationality").textContent = data.nationality || "";
    document.getElementById("p-experience").textContent = data.experience || "—";
    document.getElementById("p-education").textContent = data.education || "—";
    document.getElementById("p-english").textContent = data.englishLevel || "—";

    const age = data.dateOfBirth
      ? Math.floor((Date.now() - new Date(data.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null;
    document.getElementById("p-age").textContent = age ? `${age} years` : "—";

    // Skills
    if (data.skills?.length > 0) {
      const skillsSection = document.getElementById("skills-section");
      const skillsEl = document.getElementById("p-skills");
      skillsSection.classList.remove("hidden");
      data.skills.forEach((skill) => {
        const tag = document.createElement("span");
        tag.className = "bg-green-100 text-green-800 text-xs font-medium px-3 py-1 rounded-full";
        tag.textContent = skill;
        skillsEl.appendChild(tag);
      });
    }

    // Bio
    if (data.bio) {
      document.getElementById("bio-section").classList.remove("hidden");
      document.getElementById("p-bio").textContent = data.bio;
    }

    // Work History
    if (data.workHistory?.length > 0) {
      const workSection = document.getElementById("work-section");
      const workEl = document.getElementById("p-work");
      workSection.classList.remove("hidden");
      data.workHistory.forEach((job) => {
        const entry = document.createElement("div");
        entry.className = "border-l-4 border-[#a9cf54] pl-4";
        entry.innerHTML = `
          <h4 class="font-semibold text-gray-900">${job.role || ""}</h4>
          <p class="text-sm text-gray-500">${job.location || ""} · ${job.duration || ""}</p>
          ${job.duties?.length ? `<ul class="text-sm text-gray-600 mt-1 list-disc list-inside">${job.duties.map((d) => `<li>${d}</li>`).join("")}</ul>` : ""}
        `;
        workEl.appendChild(entry);
      });
    }

    // Enquiry form
    const enquiryForm = document.getElementById("enquiry-form");
    const enquiryStatus = document.getElementById("enquiry-status");

    enquiryForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(enquiryForm);
      const btn = enquiryForm.querySelector("button[type=submit]");
      btn.disabled = true;
      btn.textContent = "Sending...";

      try {
        await addDoc(collection(db, "enquiries"), {
          candidateId: data.candidateId,
          candidateLabel: data.fullName,
          name: fd.get("name"),
          email: fd.get("email"),
          phone: fd.get("phone") || null,
          message: fd.get("message") || null,
          createdAt: serverTimestamp(),
        });
        enquiryStatus.textContent = "Enquiry sent successfully!";
        enquiryStatus.className = "text-sm mt-2 text-green-600";
        enquiryStatus.classList.remove("hidden");
        enquiryForm.reset();
      } catch (err) {
        enquiryStatus.textContent = "Failed to send. Please try again.";
        enquiryStatus.className = "text-sm mt-2 text-red-500";
        enquiryStatus.classList.remove("hidden");
      } finally {
        btn.disabled = false;
        btn.textContent = "Send Enquiry";
      }
    });
  }
</script>
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/candidate.astro
git commit -m "feat: add /candidate profile page with photo gallery, skills, work history, and enquiry form"
```

---

## Task 18: Deploy Cloud Functions and Set Secrets

- [ ] **Step 1: Set Firebase secrets**

```bash
cd functions
firebase functions:secrets:set ANTHROPIC_API_KEY
firebase functions:secrets:set NOTION_API_KEY
firebase functions:secrets:set SMTP_HOST
firebase functions:secrets:set SMTP_PORT
firebase functions:secrets:set SMTP_USER
firebase functions:secrets:set SMTP_PASS
```

Each command will prompt for the secret value interactively.

- [ ] **Step 2: Seed Firestore config documents**

Using the Firebase console or a script, create:

Document `config/approvers`:
```json
{
  "approverEmails": [
    "michal@spa-company.com",
    "jakub@dmjeurope.com",
    "denis@spa-company.com",
    "lubo@spa-company.com",
    "natalia@spa-company.com"
  ]
}
```

Document `config/idCounters`:
```json
{
  "candidateSeq": 2000,
  "ext_TH": 0,
  "ext_PH": 0,
  "ext_ID": 0
}
```

- [ ] **Step 3: Deploy functions**

```bash
firebase deploy --only functions
```

Expected: All 5 functions deployed successfully.

- [ ] **Step 4: Deploy frontend**

```bash
cd .. && npm run build && firebase deploy --only hosting
```

Expected: Site builds and deploys with new pages accessible.

- [ ] **Step 5: Commit any deploy-related config changes**

```bash
git add -A && git commit -m "chore: deployment config for Cloud Functions and hosting"
```

---

## Task 19: End-to-End Testing

- [ ] **Step 1: Test authentication flow**

1. Visit `/intake`
2. Enter a `@spa-company.com` email
3. Check email for 6-digit code
4. Enter code → should see upload zone
5. Refresh page → should still be authenticated (48h session)

- [ ] **Step 2: Test document upload and OCR**

1. Upload a passport PDF, CV PDF, and a profile photo JPG
2. Click "Process Documents with AI"
3. Wait 30-60 seconds for OCR
4. Verify form auto-fills with passport data (name, DOB, nationality, place of birth)
5. Verify CV data appears (education, experience, skills)
6. Verify OCR-filled fields have green border

- [ ] **Step 3: Test form submission**

1. Fill in remaining required fields (Job Position)
2. Click "Submit Candidate"
3. Verify success screen shows with profile and Notion links
4. Check Firestore `candidates` collection — new document with `status: "draft"`
5. Check Notion Candidates DB — new entry with correct data
6. Check Notion Documents DB — 3 new entries (passport, CV, photos) linked to candidate

- [ ] **Step 4: Test approval flow**

1. Visit `/intake/review` as an approver
2. See the draft candidate in the queue
3. Click "Approve"
4. Visit `/candidates` — candidate should now appear
5. Visit `/candidate?id=SC-XXXX` — full profile should load

- [ ] **Step 5: Test public pages**

1. Visit `/candidates` — verify job position tabs work
2. Filter by position (e.g. "Chef") — verify filtering
3. Click a candidate card → verify profile page loads
4. Submit an enquiry → verify it saves to Firestore

- [ ] **Step 6: Test bulk import**

1. Call `importFromNotion` function (via Firebase shell or admin UI)
2. Verify Waiting Room candidates appear in Firestore with `status: "draft"`
3. Approve one → verify it shows on `/candidates`

---

## Task 20: Final Commit and Cleanup

- [ ] **Step 1: Verify build**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 2: Final commit**

```bash
git add -A
git commit -m "feat: complete candidate intake system with OCR, Notion integration, and public profiles"
```
