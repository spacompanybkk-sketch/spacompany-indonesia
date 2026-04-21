import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getNotionClient, CANDIDATES_DB_ID, DOCUMENTS_DB_ID } from "./lib/notionClient.js";
import { getNotionUserId } from "./lib/notionUserMapping.js";
import * as t from "./lib/notionTransforms.js";

export const submitToNotion = onCall(
  { timeoutSeconds: 60 },
  async (request) => {
    const { candidateData, documents = [], recruiterEmail } = request.data;

    if (!candidateData) {
      throw new HttpsError("invalid-argument", "candidateData is required.");
    }

    const notion = getNotionClient();

    // Build candidate properties
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
      "Origin Address (Local Language)": t.richText(candidateData.originAddressLocal),
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
      "Start Date by Social Insurance": t.dateOnly(candidateData.startDateBySocialInsurance),
      "OCP date": t.dateTime(candidateData.ocpDate),
    };

    // Recruiter person field
    const recruiterUserId = getNotionUserId(recruiterEmail);
    if (recruiterUserId) {
      candidateProps["Recruiter"] = t.people([recruiterUserId]);
    }

    // Assigned to person field
    const assignedUserId = getNotionUserId(candidateData.assignedToEmail);
    if (assignedUserId) {
      candidateProps["Assigned to"] = t.people([assignedUserId]);
    }

    // Client relation
    if (candidateData.clientPageId) {
      candidateProps["Client"] = t.relation([candidateData.clientPageId]);
    }

    // Location relation
    if (candidateData.locationPageId) {
      candidateProps["Location"] = t.relation([candidateData.locationPageId]);
    }

    // Remove null/undefined values to avoid Notion API errors
    const cleanProps = Object.fromEntries(
      Object.entries(candidateProps).filter(([, v]) => v !== null && v !== undefined)
    );

    // Create the candidate page in Notion
    let candidatePage;
    try {
      candidatePage = await notion.pages.create({
        parent: { database_id: CANDIDATES_DB_ID },
        properties: cleanProps,
      });
    } catch (err) {
      throw new HttpsError("internal", `Failed to create Notion candidate page: ${err.message}`);
    }

    const candidatePageId = candidatePage.id;
    const candidatePageUrl = candidatePage.url;

    // Create document entries in Documents DB
    const documentPageUrls = [];

    for (const doc of documents) {
      const docProps = {
        Name: t.title(doc.name || doc.type || "Document"),
        Type: t.select(doc.type),
        Status: t.status(doc.status),
        "Document ID / PIN": t.richText(doc.documentIdPin),
        Candidate: t.relation([candidatePageId]),
        "Date of Issue": t.dateOnly(doc.dateOfIssue),
        "Date of Expiry": t.dateOnly(doc.dateOfExpiry),
      };

      const cleanDocProps = Object.fromEntries(
        Object.entries(docProps).filter(([, v]) => v !== null && v !== undefined)
      );

      try {
        const docPage = await notion.pages.create({
          parent: { database_id: DOCUMENTS_DB_ID },
          properties: cleanDocProps,
        });
        documentPageUrls.push(docPage.url);
      } catch (err) {
        // Log but don't fail the whole operation for a single document
        console.error(`Failed to create document page for "${doc.name}": ${err.message}`);
        documentPageUrls.push(null);
      }
    }

    return { candidatePageUrl, candidatePageId, documentPageUrls };
  }
);
