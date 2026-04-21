import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import Anthropic from "@anthropic-ai/sdk";
import { defineString } from "firebase-functions/params";
import { getNotionClient, DOCUMENTS_DB_ID } from "./lib/notionClient.js";
import { PASSPORT_PROMPT, CV_PROMPT } from "./lib/ocrPrompts.js";

const anthropicKey = defineString("ANTHROPIC_API_KEY");

export const enrichFromNotion = onCall(
  { timeoutSeconds: 540, memory: "512MiB", invoker: "public" },
  async (request) => {
    const { callerEmail } = request.data;
    const db = getFirestore();

    // Check approver
    const approversDoc = await db.doc("config/approvers").get();
    const data = approversDoc.exists ? approversDoc.data() : {};
    const approvers = data.approverEmails || data.emails || [];
    if (!callerEmail || !approvers.includes(callerEmail)) {
      throw new HttpsError("permission-denied", "Only approvers can run enrichment.");
    }

    const notion = getNotionClient();
    const claude = new Anthropic({ apiKey: anthropicKey.value() });
    const results = { enriched: 0, skipped: 0, errors: [] };

    // Find candidates imported from Notion
    const candidatesSnap = await db.collection("candidates")
      .where("createdBy", "==", "import:notion")
      .get();

    console.log(`Found ${candidatesSnap.size} Notion-imported candidates to enrich`);

    for (const candidateDoc of candidatesSnap.docs) {
      try {
        const candidate = candidateDoc.data();

        // Skip if already enriched
        if (candidate.passportNumber || candidate.gender) {
          results.skipped++;
          continue;
        }

        const notionUrl = candidate.notionCandidateUrl;
        if (!notionUrl) {
          results.skipped++;
          continue;
        }

        const pageIdMatch = notionUrl.match(/([a-f0-9]{32})$/);
        if (!pageIdMatch) {
          results.skipped++;
          continue;
        }
        const raw = pageIdMatch[1];
        const pageId = `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`;

        // Find related documents in Notion
        const docsResponse = await notion.databases.query({
          database_id: DOCUMENTS_DB_ID,
          filter: {
            property: "Candidate",
            relation: { contains: pageId },
          },
        });

        console.log(`  ${candidate.candidateId}: ${docsResponse.results.length} documents`);

        let passportData = null;
        let cvData = null;
        const updates = {};

        for (const docPage of docsResponse.results) {
          const props = docPage.properties;
          const docType = props.Type?.select?.name;
          const files = props.Attachment?.files || [];
          if (files.length === 0) continue;

          const file = files[0];
          const fileUrl = file.file?.url || file.external?.url;
          if (!fileUrl) continue;

          if (docType === "Passport" && !passportData) {
            console.log(`  ${candidate.candidateId}: processing passport...`);
            try {
              const response = await fetch(fileUrl);
              const buffer = Buffer.from(await response.arrayBuffer());
              const base64 = buffer.toString("base64");
              const isImage = fileUrl.match(/\.(jpg|jpeg|png)/i);

              const ocrResponse = await claude.messages.create({
                model: "claude-sonnet-4-6",
                max_tokens: 1024,
                messages: [{
                  role: "user",
                  content: [
                    {
                      type: isImage ? "image" : "document",
                      source: { type: "base64", media_type: isImage ? "image/jpeg" : "application/pdf", data: base64 },
                    },
                    { type: "text", text: PASSPORT_PROMPT },
                  ],
                }],
              });

              const ocrText = ocrResponse.content[0].text;
              const jsonMatch = ocrText.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                passportData = JSON.parse(jsonMatch[0]);
                console.log(`  ${candidate.candidateId}: passport OCR OK - ${passportData.fullName}`);
              }
            } catch (e) {
              console.error(`  ${candidate.candidateId}: passport OCR failed - ${e.message}`);
            }

            // Also get doc metadata from Notion
            const docId = props["Document ID / PIN"]?.rich_text?.[0]?.plain_text;
            const issueDate = props["Date of Issue"]?.date?.start;
            const expiryDate = props["Date of Expiry"]?.date?.start;
            if (docId) updates.passportNumber = docId;
            if (issueDate) updates.passportIssueDate = issueDate;
            if (expiryDate) updates.passportExpiryDate = expiryDate;
          }

          if ((docType === "CV / Resume" || docType === "CV") && !cvData) {
            console.log(`  ${candidate.candidateId}: processing CV...`);
            try {
              const response = await fetch(fileUrl);
              const buffer = Buffer.from(await response.arrayBuffer());
              const base64 = buffer.toString("base64");
              const isImage = fileUrl.match(/\.(jpg|jpeg|png)/i);

              const ocrResponse = await claude.messages.create({
                model: "claude-sonnet-4-6",
                max_tokens: 2048,
                messages: [{
                  role: "user",
                  content: [
                    {
                      type: isImage ? "image" : "document",
                      source: { type: "base64", media_type: isImage ? "image/jpeg" : "application/pdf", data: base64 },
                    },
                    { type: "text", text: CV_PROMPT },
                  ],
                }],
              });

              const ocrText = ocrResponse.content[0].text;
              const jsonMatch = ocrText.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                cvData = JSON.parse(jsonMatch[0]);
                console.log(`  ${candidate.candidateId}: CV OCR OK`);
              }
            } catch (e) {
              console.error(`  ${candidate.candidateId}: CV OCR failed - ${e.message}`);
            }
          }
        }

        // Build updates from OCR
        if (passportData) {
          if (passportData.fullName) updates.fullName = passportData.fullName;
          if (passportData.firstName) updates.firstName = passportData.firstName;
          if (passportData.lastName) updates.lastName = passportData.lastName;
          if (passportData.dateOfBirth) updates.dateOfBirth = passportData.dateOfBirth;
          if (passportData.placeOfBirth) updates.placeOfBirth = passportData.placeOfBirth;
          if (passportData.nationality) updates.nationality = passportData.nationality;
          if (passportData.gender) updates.gender = passportData.gender;
          if (passportData.passportNumber) updates.passportNumber = passportData.passportNumber;
          if (passportData.dateOfIssue) updates.passportIssueDate = passportData.dateOfIssue;
          if (passportData.dateOfExpiry) updates.passportExpiryDate = passportData.dateOfExpiry;
          if (passportData.issuingCountry) updates.originCountry = passportData.issuingCountry;
        }

        if (cvData) {
          if (cvData.education && !candidate.education) updates.education = cvData.education;
          if (cvData.experience && !candidate.experience) updates.experience = cvData.experience;
          if (cvData.skills?.length && (!candidate.skills || candidate.skills.length === 0)) updates.skills = cvData.skills;
          if (cvData.workHistory?.length && (!candidate.workHistory || candidate.workHistory.length === 0)) updates.workHistory = cvData.workHistory;
          if (cvData.email && !candidate.email) updates.email = cvData.email;
          if (cvData.phone && !candidate.phone) updates.phone = cvData.phone;
        }

        if (Object.keys(updates).length > 0) {
          await candidateDoc.ref.update(updates);
          console.log(`  ${candidate.candidateId}: updated ${Object.keys(updates).length} fields`);
          results.enriched++;
        } else {
          results.skipped++;
        }
      } catch (e) {
        console.error(`  Error: ${e.message}`);
        results.errors.push({ id: candidateDoc.id, error: e.message });
      }
    }

    return results;
  }
);
