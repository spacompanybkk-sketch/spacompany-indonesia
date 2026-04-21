import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getNotionClient, CANDIDATES_DB_ID, DOCUMENTS_DB_ID } from "./lib/notionClient.js";
import { parseCandidateNumber } from "./lib/candidateIdGenerator.js";
import { parseJsonArray } from "./lib/notionTransforms.js";

export const importFromNotion = onCall(
  { timeoutSeconds: 540 },
  async (request) => {
    const { callerEmail } = request.data;
    const db = getFirestore();

    // Check caller against config/approvers
    const approversDoc = await db.doc("config/approvers").get();
    const approvers = approversDoc.exists
      ? approversDoc.data().approverEmails || approversDoc.data().emails || []
      : [];

    if (!callerEmail || !approvers.includes(callerEmail.toLowerCase())) {
      throw new HttpsError("permission-denied", "Only approvers can run bulk import.");
    }

    const notion = getNotionClient();

    // Query Notion Candidates DB for Candidate Status = "Waiting Room"
    let pages = [];
    let cursor = undefined;

    do {
      const response = await notion.databases.query({
        database_id: CANDIDATES_DB_ID,
        filter: {
          property: "Candidate Status",
          status: { equals: "Waiting Room" },
        },
        start_cursor: cursor,
        page_size: 100,
      });
      pages = pages.concat(response.results);
      cursor = response.has_more ? response.next_cursor : undefined;
    } while (cursor);

    const results = { imported: 0, skipped: 0, errors: [] };

    for (const page of pages) {
      try {
        const outcome = await importSingleCandidate(notion, db, page);
        if (outcome === "skipped") {
          results.skipped++;
        } else {
          results.imported++;
        }
      } catch (err) {
        const nameProp = page.properties?.Name;
        const label = getTextProp(nameProp) || page.id;
        results.errors.push({ page: label, error: err.message });
      }
    }

    return results;
  }
);

// ─── Helpers ───────────────────────────────────────────────────────────────

function getTextProp(prop) {
  if (!prop) return "";
  if (prop.type === "title" && Array.isArray(prop.title)) {
    return prop.title.map((t) => t.plain_text).join("") || "";
  }
  if (prop.type === "rich_text" && Array.isArray(prop.rich_text)) {
    return prop.rich_text.map((t) => t.plain_text).join("") || "";
  }
  return "";
}

function getDateProp(prop) {
  if (!prop) return null;
  if (prop.type === "date" && prop.date) return prop.date.start || null;
  return null;
}

function getSelectProp(prop) {
  if (!prop) return null;
  if (prop.type === "select" && prop.select) return prop.select.name || null;
  return null;
}

function getMultiSelectProp(prop) {
  if (!prop) return [];
  if (prop.type === "multi_select" && Array.isArray(prop.multi_select)) {
    return prop.multi_select.map((o) => o.name);
  }
  // Handle JSON-encoded strings like '["Thailand"]'
  if (prop.type === "rich_text") {
    const raw = getTextProp(prop);
    return parseJsonArray(raw);
  }
  return [];
}

function getStatusProp(prop) {
  if (!prop) return null;
  if (prop.type === "status" && prop.status) return prop.status.name || null;
  return null;
}

function getCheckboxProp(prop) {
  if (!prop) return false;
  return prop.type === "checkbox" ? !!prop.checkbox : false;
}

/**
 * Split a full name (removing prefixes like "Miss", "Mr", "Ms", "Mrs") into
 * firstName and lastName.
 */
function splitName(fullName) {
  if (!fullName) return { firstName: "", lastName: "" };
  const prefixes = /^(miss|mr\.?|ms\.?|mrs\.?)\s+/i;
  const cleaned = fullName.replace(prefixes, "").trim();
  const parts = cleaned.split(/\s+/);
  const firstName = parts[0] || "";
  const lastName = parts.slice(1).join(" ") || "";
  return { firstName, lastName };
}

// ─── Core import logic ─────────────────────────────────────────────────────

async function importSingleCandidate(notion, db, page) {
  const props = page.properties || {};

  // Parse candidate ID from Notion Name field (e.g. "2509 -Phattharapha Misap// ...")
  const notionName = getTextProp(props.Name);
  const candidateId = parseCandidateNumber(notionName);

  if (!candidateId) {
    throw new Error(`Could not parse candidate number from Name: "${notionName}"`);
  }

  // Skip if already in Firestore
  const candidateRef = db.collection("candidates").doc(candidateId);
  const existing = await candidateRef.get();
  if (existing.exists) {
    return "skipped";
  }

  // Extract fields from Notion properties
  const fullName = getTextProp(props["Name Surname"]) || notionName;
  const { firstName, lastName } = splitName(fullName);

  const nationality = getMultiSelectProp(props["Nationality"]);
  const originCountry = getMultiSelectProp(props["Origin Country"]);
  const targetCountry = getMultiSelectProp(props["Target Country"]);
  const wouldLikeToGo = getMultiSelectProp(props["Would like to go"]);

  // Fetch related Documents DB entries
  let documentPages = [];
  try {
    const docsResponse = await notion.databases.query({
      database_id: DOCUMENTS_DB_ID,
      filter: {
        property: "Candidate",
        relation: { contains: page.id },
      },
    });
    documentPages = docsResponse.results || [];
  } catch (err) {
    console.error(`Failed to fetch documents for ${candidateId}: ${err.message}`);
  }

  // Extract passport info from documents
  let passportNumber = null;
  let passportDateOfIssue = null;
  let passportDateOfExpiry = null;

  for (const docPage of documentPages) {
    const docProps = docPage.properties || {};
    const docType = getSelectProp(docProps["Type"]);
    if (docType && docType.toLowerCase().includes("passport")) {
      passportNumber = getTextProp(docProps["Document ID / PIN"]);
      passportDateOfIssue = getDateProp(docProps["Date of Issue"]);
      passportDateOfExpiry = getDateProp(docProps["Date of Expiry"]);
      break;
    }
  }

  // Build documents array
  const documents = documentPages.map((docPage) => {
    const dp = docPage.properties || {};
    return {
      notionPageId: docPage.id,
      name: getTextProp(dp["Name"]),
      type: getSelectProp(dp["Type"]),
      status: getStatusProp(dp["Status"]),
      documentIdPin: getTextProp(dp["Document ID / PIN"]),
      dateOfIssue: getDateProp(dp["Date of Issue"]),
      dateOfExpiry: getDateProp(dp["Date of Expiry"]),
    };
  });

  // Build Firestore document
  const candidateDoc = {
    // IDs
    candidateId,
    notionPageId: page.id,
    notionName,

    // Personal info
    fullName,
    firstName,
    lastName,
    email: props["Email"]?.email || null,
    phone: props["Phone Number"]?.phone_number || null,
    alternatePhone: props["Alternate Phone Number"]?.phone_number || null,
    whatsapp: props["WhatsApp"]?.phone_number || null,
    lineFacebook: getTextProp(props["LINE / Facebook"]),
    dateOfBirth: getDateProp(props["Date of Birth"]),
    placeOfBirth: getTextProp(props["Place of Birth"]),
    maritalStatus: getSelectProp(props["Marital Status"]),

    // Address
    originAddress: getTextProp(props["Origin Address"]),
    originAddressLocal: getTextProp(props["Origin Address (Local Language)"]),

    // Nationality / country
    nationality,
    originCountry,
    targetCountry,
    wouldLikeToGo,

    // Work / qualifications
    education: getSelectProp(props["Education"]),
    englishLevel: getSelectProp(props["English Level"]),
    experience: getTextProp(props["Experience"]),
    jobPosition: getSelectProp(props["Job Title / Position"]),
    fiveStarHotelSpa: getCheckboxProp(props["5-Star hotel/Spa"]),
    recruitingSource: getSelectProp(props["Recruiting Source"]),

    // Status / employment
    candidateStatus: getStatusProp(props["Candidate Status"]),
    employmentStatus: getSelectProp(props["Employment Status"]),
    employmentType: getSelectProp(props["Employment Type"]),
    leasingNumber: getTextProp(props["Leasing Number"]),
    leasingCompany: getSelectProp(props["Leasing Company"]),
    contractUnder: getSelectProp(props["Contract Under"]),

    // Dates
    dateApplied: getDateProp(props["Date Applied"]),
    interviewDate: getDateProp(props["Interview Date"]),
    clientApprovalDate: getDateProp(props["Client Approval"]),
    dateOfEmbassy: getDateProp(props["Date of Embassy"]),
    startDateBySocialInsurance: getDateProp(props["Start Date by Social Insurance"]),
    ocpDate: getDateProp(props["OCP date"]),

    // Notes
    notes: getTextProp(props["Notes"]),

    // Passport summary (extracted from documents)
    passportNumber,
    passportDateOfIssue,
    passportDateOfExpiry,

    // Documents
    documents,

    // Firestore meta
    status: "draft",
    importedFromNotion: true,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  await candidateRef.set(candidateDoc);
  return "imported";
}
