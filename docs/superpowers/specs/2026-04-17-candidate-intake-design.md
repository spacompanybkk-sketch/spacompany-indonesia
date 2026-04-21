# Candidate Intake System — Design Spec

**Date:** 2026-04-17
**Status:** Draft
**Related files:**
- `docs/superpowers/specs/notion-candidates-mapping.json`
- `docs/superpowers/specs/notion-documents-mapping.json`
- `docs/superpowers/specs/notion-users-mapping.json`

---

## 1. Overview

A recruiter-facing intake tool that allows Spa Company employees to upload candidate documents (passport, CV, photos), extract data via Claude Vision OCR, review/edit auto-filled fields, and submit. On submission the system:

1. Creates a **draft candidate profile** in Firestore (for the public website)
2. Creates a **Candidates DB entry** in Notion (for internal workflow)
3. Creates **Documents DB entries** in Notion (one per uploaded file, linked to the candidate)

The public website gains a `/candidates` listing page filtered by job position (Massage, Chef, Housekeeping, Factory, etc.) and a `/candidate?id=SC-XXXX` profile page. Draft candidates are invisible until approved by a designated approver.

---

## 2. Architecture

```
+-------------------------------------+
|  FRONTEND (Astro static pages)      |
|  /intake        - recruiter form    |
|  /intake/review - approver queue    |
|  /candidates    - public listing    |
|  /candidate     - public profile    |
+-------------------------------------+
           |
           v
+-------------------------------------+
|  FIREBASE CLOUD FUNCTIONS           |
|  sendLoginCode    - email auth      |
|  verifyLoginCode  - session mgmt    |
|  processDocuments - Claude Vision   |
|  submitToNotion   - Notion API      |
+-------------------------------------+
           |
           v
+-------------------------------------+
|  DATA STORES                        |
|  Firebase Storage - file uploads    |
|  Firestore        - candidates,     |
|                     sessions,       |
|                     config          |
|  Notion           - Candidates DB,  |
|                     Documents DB    |
+-------------------------------------+
```

### Data flow

1. Recruiter authenticates via email code (see Section 3)
2. Recruiter uploads passport (PDF), CV (PDF), profile photos (JPG)
3. Files upload to Firebase Storage
4. Browser calls `processDocuments` Cloud Function with file URLs
5. Cloud Function sends passport + CV to Claude Vision, returns extracted fields
6. Browser auto-fills the form; recruiter reviews and edits all fields
7. On submit:
   - Browser writes candidate record to Firestore (`candidates` collection, `status: "draft"`)
   - Browser calls `submitToNotion` Cloud Function which:
     a. Creates Notion Candidates DB entry
     b. Gets the new Notion page URL
     c. Creates Notion Documents DB entries (one per file), each linked to the candidate via relation
     d. Returns Notion URLs
   - Browser updates the Firestore record with `notionCandidateUrl`
8. Approver reviews draft, sets `status: "published"` to make it visible on `/candidates`

### Secrets (Firebase Cloud Functions config)

- `ANTHROPIC_API_KEY` — Claude Vision API
- `NOTION_API_KEY` — Notion integration token

---

## 3. Authentication

### Allowed email domains

- `@spa-company.com`
- `@dmjeurope.com`

### Flow

1. Recruiter visits `/intake` and sees a login screen (email input only)
2. Enters their company email
3. System validates the domain, generates a 6-digit code, stores it in Firestore (`loginCodes` collection) with a 10-minute expiry, and emails the code to the recruiter
4. Recruiter enters the code
5. System creates a session record in Firestore (`sessions` collection):
   - `email`: the recruiter's email
   - `ip`: the recruiter's IP address
   - `expiresAt`: 48 hours from now
   - `sessionToken`: a generated token stored in browser localStorage
6. For 48 hours on that IP, the recruiter can access `/intake` without re-authenticating
7. On page load, the frontend checks for a valid session (matching token + IP + not expired)

### Email sending

Use Firebase Cloud Functions to send the code email. Implementation options (decide during build): Firebase Extensions (Trigger Email), SendGrid, or a simple SMTP relay.

---

## 4. Approval Flow

### Designated approvers

Stored in Firestore at `config/approvers`:

```js
{
  approverEmails: [
    "michal@spa-company.com",
    "jakub@dmjeurope.com",
    "denis@spa-company.com",
    "lubo@spa-company.com",
    "natalia@spa-company.com"
  ]
}
```

### How it works

- After submission, the candidate's Firestore record has `status: "draft"`
- Approvers (authenticated users whose email is in the approvers list) see a review queue on `/intake/review` showing all pending drafts
- Each draft shows a summary of the candidate data + uploaded documents
- Approver can:
  - **Approve** — sets `status: "published"`, candidate appears on `/candidates`
  - **Reject** — sets `status: "rejected"`
- The approver list is editable directly in Firestore without redeployment

---

## 5. The `/intake` Page — Recruiter Form

### Password-free access

No password overlay. Access is controlled by the email authentication flow (Section 3).

### Step 1 — Upload Zone

- Drag-and-drop or click-to-upload area
- Three labeled upload slots with format guidance:
  - **Passport** (PDF) — required
  - **CV / Resume** (PDF) — required
  - **Profile Photos** (JPG, multiple) — required
- File previews shown after selection (PDF filename + photo thumbnails)
- "Process Documents" button sends passport + CV to the `processDocuments` Cloud Function

### Step 2 — Auto-filled Form

OCR results populate the form. Fields auto-filled by OCR get a visual indicator (e.g. green border or label) so the recruiter knows what was extracted vs. what needs manual input.

All Notion Candidates DB fields are present and editable, organized in collapsible sections:

**Section A: Identity**
- Name Surname (text) — OCR from passport
- Date of Birth (date) — OCR from passport
- Place of Birth (text) — OCR from passport
- Nationality (multi-select) — OCR from passport
- Origin Country (multi-select) — OCR from passport
- Marital Status (select: Single, Married, Divorced, Widowed, Separated)
- Gender (not in Notion but needed for website profile)

**Section B: Contact**
- Email (email)
- Phone Number (phone)
- Alternate Phone Number (phone)
- WhatsApp (phone)
- LINE / Facebook (text)

**Section C: Address**
- Origin Address (text)
- Origin Address - Local Language (text)

**Section D: Professional**
- Job Title / Position (select: Massage, Chef, Housekeeping, Factory, Portier, License Holder, Agency Employee, Hybrid, Other)
- Experience (text) — OCR from CV
- Education (select) — OCR from CV
- English Level (select)
- Skills (tags — for website profile)
- Bio (textarea — for website profile)
- Work History (structured entries — for website profile)

**Section E: Recruitment**
- Recruiting Source (select)
- Target Country (multi-select)
- Would like to go (multi-select)
- 5-Star hotel/Spa (checkbox)

**Section F: Employment**
- Candidate Status (status)
- Employment Status (select)
- Employment Type (select)
- Leasing Number (text)
- Leasing Company (select: TBD, Spa Company Slovakia, Prachuap Khiri Khan, Borisad Farang, Sabai Bratislava)
- Contract Under (select: TBD, Prachuap Khiri Khan, Spa Company Slovakia s.ro., DMJ Europe, RM2 Ventures, Borisad, Saithong, Portinter, 7Leelawadee)

**Section G: Dates**
- Date Applied (date) — auto-set to today
- Interview Date (date)
- Client Approval (date)
- Date of Embassy (date)
- Start Date by Social Insurance (date)
- OCP date (datetime)

**Section H: Relations & Assignments**
- Assigned to (person — Notion user picker or dropdown from user mapping)
- Recruiter (person — auto-set to the logged-in recruiter's Notion user ID)
- Client (relation — Notion page URL input)
- Location (relation — Notion page URL input)

**Section I: Notes**
- Notes (textarea)

### Step 3 — Review & Submit

- Summary view of all entered data
- "Submit" button triggers the full submission flow (Firestore + Notion)
- Success screen with:
  - Link to the draft candidate profile on spa-company.com
  - Link to the Notion candidate page
  - Status indicator: "Awaiting approval"

### Auto-generated fields

- **Candidate ID** (`candidateId`): Auto-incremented website ID in format `SC-XXXX` (e.g. `SC-2001`). Used in URLs: `/candidate?id=SC-2001`
- **External ID** (`externalId`): Notion-facing ID in format `{targetCountry}-{originCountryCode}-SPA-{sequence}` (e.g. `SK-PH-SPA-001`). Used in Notion title.
- **Notion Name (title)**: Generated as `{externalId} - {FULL NAME} ({JOB POSITION})`
- **Date Applied**: Auto-set to submission date
- **Recruiter**: Auto-set to the logged-in recruiter's Notion user ID

---

## 6. Claude Vision OCR — What Gets Extracted

### From Passport (PDF)

| Extracted Field | Maps to |
|---|---|
| Full name | Name Surname |
| Date of birth | Date of Birth |
| Place of birth | Place of Birth |
| Nationality | Nationality, Origin Country |
| Passport number | Document ID / PIN (Documents DB) |
| Date of issue | Date of Issue (Documents DB) |
| Date of expiry | Date of Expiry (Documents DB) |
| Issuing country | Auto-detects Indonesia / Thailand / Philippines |
| Gender | Gender (Firestore profile) |

### From CV (PDF)

| Extracted Field | Maps to |
|---|---|
| Education level | Education |
| Work experience summary | Experience |
| Work history entries | Work History (Firestore profile) |
| Skills mentioned | Skills (Firestore profile) |
| Email (if present) | Email |
| Phone (if present) | Phone Number |

### OCR prompt strategy

The Cloud Function sends both documents to Claude Vision with a structured prompt that:
1. Identifies the document type and issuing country
2. Extracts all available fields into a JSON schema matching the form fields
3. Returns confidence indicators so the frontend can flag low-confidence extractions

---

## 7. Notion Integration — What Gets Created

### Candidates DB — 1 entry

All writable fields from `notion-candidates-mapping.json` are populated. Key mappings:

- **Name** (title): `"{externalId} - {FULL NAME} ({JOB POSITION})"`
- **Name Surname**: full name from passport
- **External ID**: auto-generated
- **Nationality / Origin Country**: from passport OCR
- **Date of Birth**: from passport OCR
- **Date Applied**: submission date
- **Recruiter**: auto-mapped from logged-in email → Notion user ID (via `notion-users-mapping.json`)
- All other fields: as entered by recruiter on the form
- Downstream fields (employment status, leasing, contract dates): left empty if not filled — to be managed in Notion

### Documents DB — 1 entry per uploaded file

For each uploaded document:

| Field | Passport | CV | Photos |
|---|---|---|---|
| **Name** | `"Passport - {fullName}"` | `"CV / Resume - {fullName}"` | `"Profile Picture - {fullName}"` |
| **Type** | `"Passport"` | `"CV / Resume"` | `"Profile Picture"` |
| **Status** | `"Completed"` | `"Completed"` | `"Completed"` |
| **Document ID / PIN** | passport number (OCR) | — | — |
| **Candidate** | relation → candidate page | relation → candidate page | relation → candidate page |
| **Date of Issue** | from OCR | — | — |
| **Date of Expiry** | from OCR | — | — |
| **Attachment** | uploaded PDF | uploaded PDF | uploaded JPGs |

### Notion user mapping

Stored in `notion-users-mapping.json` (24 users across `@spa-company.com` and `@dmjeurope.com`). Used at submission time to map the recruiter's email to their Notion user ID for the Recruiter person field.

---

## 8. Firestore Data Model

### `candidates` collection (new)

```js
{
  // Identity
  candidateId: "SC-2001",
  externalId: "SK-PH-SPA-001",
  firstName: "Arvin John",
  lastName: "Francisco",
  fullName: "Arvin John Arcega Francisco",
  dateOfBirth: "1995-11-17",
  placeOfBirth: "Calumpit, Bulacan",
  nationality: "Philippines",
  originCountry: "Philippines",
  gender: "Male",
  maritalStatus: "Married",

  // Professional
  jobPosition: "Chef",
  experience: "5 years",
  education: "Bachelor Degree",
  englishLevel: "Intermediate (B1)",
  skills: ["Thai Cuisine", "Western Cuisine"],
  bio: "",
  workHistory: [
    {
      role: "Head Chef",
      location: "Bangkok, Thailand",
      duration: "2020-2025",
      duties: ["Menu planning", "Kitchen management"]
    }
  ],

  // Contact
  email: "arvin@gmail.com",
  phone: "09283216042",
  alternatePhone: "+63 912 345 6789",
  whatsapp: "+63 912 345 6789",
  lineFacebook: "",

  // Address
  originAddress: "CALUMPIT BULACAN",
  originAddressLocal: "CALUMPIT BULACAN",

  // Photos (Firebase Storage URLs)
  photos: ["https://storage.googleapis.com/..."],

  // Passport metadata
  passportNumber: "P1234567A",
  passportIssueDate: "2020-03-15",
  passportExpiryDate: "2030-03-15",

  // Document URLs (Firebase Storage)
  passportUrl: "https://storage.googleapis.com/.../passport.pdf",
  cvUrl: "https://storage.googleapis.com/.../cv.pdf",

  // Status & Audit
  status: "draft",                    // draft | published | rejected
  createdBy: "michal@spa-company.com",
  createdAt: serverTimestamp(),
  approvedBy: null,                   // set on approval
  approvedAt: null,

  // Notion cross-reference
  notionCandidateUrl: "https://notion.so/...",
  notionDocumentUrls: []
}
```

### `sessions` collection (new)

```js
{
  email: "michal@spa-company.com",
  ip: "203.0.113.42",
  sessionToken: "random-uuid-token",
  expiresAt: Timestamp,  // 48 hours from creation
  createdAt: serverTimestamp()
}
```

### `loginCodes` collection (new)

```js
{
  email: "michal@spa-company.com",
  code: "482913",
  expiresAt: Timestamp,  // 10 minutes from creation
  used: false
}
```

### `config/approvers` document (new)

```js
{
  approverEmails: [
    "michal@spa-company.com",
    "jakub@dmjeurope.com",
    "denis@spa-company.com",
    "lubo@spa-company.com",
    "natalia@spa-company.com"
  ]
}
```

---

## 9. Public Pages

### `/candidates` — Listing page

- Prominent category tabs at top: **Massage | Chef | Housekeeping | Factory | Portier | Other**
- Active tab filters candidates by `jobPosition` from Firestore
- Only shows candidates with `status: "published"`
- Card grid per candidate: profile photo, name, nationality flag, experience, age
- Shareable URLs: `/candidates?position=Chef`
- Nationality flags for quick visual distinction: Thailand, Philippines, Indonesia

### `/candidate?id=SC-2001` — Profile page

- Same layout style as existing `/therapist` page
- Sections: photos gallery, identity info, professional details, skills, bio, work history
- Contact/enquiry form at bottom (same pattern as existing therapist enquiry)
- Only accessible if `status: "published"`

### Existing pages

- `/therapist` and `/therapists` remain unchanged
- No redirects for now — new candidates use the `/candidate(s)` routes

---

## 10. Cloud Functions Detail

### `sendLoginCode`

- **Trigger:** HTTPS callable
- **Input:** `{ email: string }`
- **Logic:**
  1. Validate email domain is `@spa-company.com` or `@dmjeurope.com`
  2. Generate 6-digit random code
  3. Store in Firestore `loginCodes` collection (email, code, expiresAt: now + 10min, used: false)
  4. Send email with the code
  5. Return `{ success: true }`
- **Error cases:** Invalid domain → reject with error message

### `verifyLoginCode`

- **Trigger:** HTTPS callable
- **Input:** `{ email: string, code: string }`
- **Logic:**
  1. Look up the code in `loginCodes` where email matches, code matches, not expired, not used
  2. Mark code as used
  3. Get the caller's IP from the request headers
  4. Create session in `sessions` collection (email, ip, sessionToken, expiresAt: now + 48h)
  5. Return `{ sessionToken, email, expiresAt }`
- **Error cases:** Wrong code, expired code, no matching code → reject

### `processDocuments`

- **Trigger:** HTTPS callable
- **Input:** `{ passportUrl: string, cvUrl: string }` (Firebase Storage download URLs)
- **Logic:**
  1. Download both files from Firebase Storage
  2. Send passport to Claude Vision with extraction prompt:
     - Extract: full name, date of birth, place of birth, nationality, gender, passport number, date of issue, date of expiry, issuing country
     - Return as structured JSON
  3. Send CV to Claude Vision with extraction prompt:
     - Extract: education level, work experience summary, work history entries, skills, contact info if present
     - Return as structured JSON
  4. Merge results and return to browser
- **Output:** `{ passport: {...}, cv: {...}, detectedCountry: "Philippines" }`
- **Secrets:** `ANTHROPIC_API_KEY`

### `submitToNotion`

- **Trigger:** HTTPS callable
- **Input:** `{ candidateData: object, documents: array, recruiterEmail: string }`
- **Logic:**
  1. Map `recruiterEmail` to Notion user ID using the user mapping
  2. Build Notion Candidates DB payload from `candidateData` following `notion-candidates-mapping.json` transforms
  3. Create page in Candidates DB via Notion API
  4. Get the new page URL
  5. For each document in `documents` array:
     a. Build Notion Documents DB payload following `notion-documents-mapping.json` transforms
     b. Set the `Candidate` relation to the newly created candidate page URL
     c. Create page in Documents DB via Notion API
     d. Upload file attachment if available
  6. Return `{ candidatePageUrl, documentPageUrls: [] }`
- **Secrets:** `NOTION_API_KEY`

---

## 11. File Upload Specs

### Accepted formats

| Upload slot | Accepted formats | Max size | Required |
|---|---|---|---|
| Passport | PDF | 10 MB | Yes |
| CV / Resume | PDF | 10 MB | Yes |
| Profile Photos | JPG, JPEG, PNG | 5 MB each, up to 10 files | Yes (at least 1) |

### Storage path

Files upload to Firebase Storage at:
```
candidates/{candidateId}/passport.pdf
candidates/{candidateId}/cv.pdf
candidates/{candidateId}/photos/{filename}.jpg
```

### Upload guidance on page

The upload zone displays clear instructions for the recruiter:
- "Passport: Upload as PDF"
- "CV / Resume: Upload as PDF"
- "Profile Photos: Upload as JPG (at least 1 photo required)"

---

## 12. External ID Generation

Format: `{targetCountryCode}-{originCountryCode}-SPA-{sequence}`

| Origin Country | Code |
|---|---|
| Thailand | TH |
| Philippines | PH |
| Indonesia | ID |

| Target Country | Code |
|---|---|
| Slovakia | SK |
| Germany | DE |
| Austria | AT |
| Czech Republic | CZ |

Example: `SK-PH-SPA-001`

The sequence number increments per origin country. Stored in Firestore `config/idCounters` document:
```js
{
  "TH": 150,
  "PH": 42,
  "ID": 8
}
```

---

## 13. Bulk Import from Notion (Waiting Room)

### Purpose

Import existing "Waiting Room" candidates from Notion into Firestore as draft public profiles. This is a one-time (or periodic) operation to backfill candidates that were entered into Notion before the intake system existed.

### Source data characteristics

Based on sample data from 10 Waiting Room candidates:
- Candidate numbers are embedded in the Notion Name field (e.g. "2509 - Phattharapha Misap// ...")
- Most candidates are Thai (Massage) or Filipino (Chef, Factory)
- Many fields are sparse — contact info, education, English level often null
- Multi-select/person/relation values are JSON-encoded strings (e.g. `"[\"Thailand\"]"`)
- Document attachments expose file IDs only — need Notion API page reads for download URLs
- Most candidates lack profile photos in Notion

### Import flow

A Firebase Cloud Function `importFromNotion` that:

1. Queries Notion Candidates DB for all records where Candidate Status = "Waiting Room"
2. For each candidate:
   a. Parses the candidate number from the Name field (e.g. "2509" → `SC-2509`)
   b. Parses JSON-encoded multi-select fields
   c. Fetches related Documents DB entries via the Candidate relation
   d. For documents with attachments: retrieves download URLs via Notion API
   e. Downloads passport/CV attachments → uploads to Firebase Storage
   f. If passport attachment exists: optionally runs Claude Vision OCR to extract missing fields (gender, etc.)
   g. Creates Firestore candidate record with `status: "draft"`
3. Returns a summary of imported candidates

### Data mapping (Notion → Firestore)

| Notion Field | Firestore Field | Transform |
|---|---|---|
| Name (parse number) | candidateId | Extract number, format as `SC-XXXX` |
| Name Surname | fullName, firstName, lastName | Split on last space |
| Date of Birth | dateOfBirth | Direct |
| Place of Birth | placeOfBirth | Direct |
| Nationality (JSON string) | nationality | Parse JSON, take first |
| Origin Country (JSON string) | originCountry | Parse JSON, take first |
| Target Country (JSON string) | targetCountry | Parse JSON |
| Job Title / Position | jobPosition | Direct |
| Marital Status | maritalStatus | Direct |
| Email | email | Direct |
| Phone Number | phone | Direct |
| Origin Address | originAddress | Direct |
| Origin Address (Local Language) | originAddressLocal | Direct |
| Education | education | Direct |
| English Level | englishLevel | Direct |
| Experience | experience | Direct |
| candidateUrl | notionCandidateUrl | Direct |
| 5-Star hotel/Spa | fiveStarHotelSpa | `"__NO__"` → false |

### Handling missing data

- Candidates without profile photos get a placeholder on the public profile
- Missing contact info stays null — can be updated later via `/intake` edit flow or Notion
- Gender is not stored in Notion — if passport is available, OCR can extract it; otherwise null

### Trigger

- HTTPS callable Cloud Function (admin-only, not exposed to public)
- Can be triggered from an admin page or via `firebase functions:shell`

---

## 14. Technology Summary

| Component | Technology |
|---|---|
| Frontend | Astro v6 (static) |
| Styling | Tailwind CSS v4 |
| File storage | Firebase Storage |
| Database (website) | Firestore |
| Database (internal) | Notion (Candidates + Documents DBs) |
| OCR | Claude Vision API (via Cloud Function) |
| Backend functions | Firebase Cloud Functions |
| Authentication | Email code + IP-bound sessions |
| Hosting | Firebase Hosting (static) |
