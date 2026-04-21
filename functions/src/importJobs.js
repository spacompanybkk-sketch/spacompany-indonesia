import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getNotionClient, JOBS_DB_ID } from "./lib/notionClient.js";

export const importJobs = onCall(
  { timeoutSeconds: 120 },
  async (request) => {
    const { callerEmail } = request.data;
    const db = getFirestore();

    // Check caller against config/approvers
    const approversDoc = await db.doc("config/approvers").get();
    const approvers = approversDoc.exists
      ? approversDoc.data().approverEmails || approversDoc.data().emails || []
      : [];

    if (!callerEmail || !approvers.includes(callerEmail.toLowerCase())) {
      throw new HttpsError("permission-denied", "Only approvers can sync jobs.");
    }

    const notion = getNotionClient();

    let pages = [];
    let cursor = undefined;

    do {
      const response = await notion.databases.query({
        database_id: JOBS_DB_ID,
        start_cursor: cursor,
        page_size: 100,
      });
      pages = pages.concat(response.results);
      cursor = response.has_more ? response.next_cursor : undefined;
    } while (cursor);

    const results = { synced: 0, errors: [] };

    for (const page of pages) {
      try {
        const props = page.properties || {};

        const name = getTextProp(props.Name);
        if (!name) continue;

        const jobDoc = {
          notionPageId: page.id,
          name,
          companyName: getTextProp(props["Company name"]),
          location: getSelectProp(props["Location"]),
          jobType: getSelectProp(props["Job Type"]),
          salary: props["Salary"]?.number || null,
          status: getSelectProp(props["Status"]),
          originCountry: getMultiSelectProp(props["Origin Country "]),
          summaryBahasa: getTextProp(props["Notion AI Summary Bahasa"]),
          summaryEnglish: getTextProp(props["Notion AI Summary English"]),
          summaryThai: getTextProp(props["Notion AI Summary Thai"]),
          jobInfoUrl: props["Job Information"]?.url || null,
          jobApplyUrl: props["Job Link Apply"]?.url || null,
          websiteUrl: props["Website"]?.url || null,
          email: props["Email"]?.email || null,
          updatedAt: Timestamp.now(),
        };

        // Use notionPageId as Firestore doc ID for idempotent upserts
        const docRef = db.collection("jobs").doc(page.id);
        const existing = await docRef.get();

        if (existing.exists) {
          // Preserve isLive and summary if already set
          await docRef.update(jobDoc);
        } else {
          await docRef.set({
            ...jobDoc,
            isLive: false,
            summary: "",
            createdAt: Timestamp.now(),
          });
        }

        results.synced++;
      } catch (err) {
        const label = getTextProp(page.properties?.Name) || page.id;
        results.errors.push({ page: label, error: err.message });
      }
    }

    return results;
  }
);

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
  return [];
}
