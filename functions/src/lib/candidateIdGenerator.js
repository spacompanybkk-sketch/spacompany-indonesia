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
 */
export function parseCandidateNumber(notionName) {
  const match = notionName.match(/^(\d+)/);
  return match ? `SC-${match[1]}` : null;
}
