import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getNotionClient, CANDIDATES_DB_ID, DOCUMENTS_DB_ID } from "./lib/notionClient.js";
import * as t from "./lib/notionTransforms.js";

/**
 * Search Notion Candidates DB by name.
 * Returns matching candidates for the recruiter to pick from.
 */
export const searchNotionCandidates = onCall(
  { timeoutSeconds: 15 },
  async (request) => {
    const { query } = request.data;
    if (!query || query.length < 2) {
      return { results: [] };
    }

    const notion = getNotionClient();

    const response = await notion.databases.query({
      database_id: CANDIDATES_DB_ID,
      filter: {
        property: "Name",
        title: { contains: query },
      },
      page_size: 10,
    });

    const results = response.results.map((page) => {
      const props = page.properties || {};
      const name = (props.Name?.title || []).map((t) => t.plain_text).join("");
      const nameSurname = (props["Name Surname"]?.rich_text || []).map((t) => t.plain_text).join("");
      const status = props["Candidate Status"]?.status?.name || "";
      return {
        id: page.id,
        name,
        nameSurname,
        status,
      };
    });

    return { results };
  }
);

/**
 * Sync therapist data to Notion.
 * Mode "create": creates a new Candidates DB entry
 * Mode "attach": attaches documents + profile link to an existing candidate
 *
 * In both modes, documents (passport, ID card, certificate) are created
 * as entries in the Documents DB linked to the candidate.
 */
export const syncToNotion = onCall(
  { timeoutSeconds: 60 },
  async (request) => {
    const { mode, therapist, notionPageId, scNumber, documents, recruiterEmail } = request.data;

    if (!mode || !scNumber) {
      throw new HttpsError("invalid-argument", "mode and scNumber are required.");
    }

    const notion = getNotionClient();
    let candidatePageId = notionPageId;

    // Match recruiter email to Notion user ID
    let recruiterUserId = null;
    if (recruiterEmail) {
      try {
        const usersResponse = await notion.users.list({ page_size: 100 });
        const match = usersResponse.results.find(
          (u) => u.type === "person" && u.person?.email?.toLowerCase() === recruiterEmail.toLowerCase()
        );
        if (match) recruiterUserId = match.id;
      } catch (_) {}
    }

    const profileUrl = `https://spacompany-indonesia.com/therapist?id=SC-${scNumber}`;

    // Build candidate properties from therapist data
    function buildCandidateProps() {
      const props = {};
      if (therapist.name) props["Name Surname"] = t.richText(therapist.name);
      if (therapist.phone) props["Phone Number"] = t.phoneNumber(therapist.phone);
      if (therapist.email) props["Email"] = t.email(therapist.email);
      if (therapist.location) props["Origin Address"] = t.richText(therapist.location);
      if (therapist.desiredWorkLocation) props["Would like to go"] = t.multiSelect([therapist.desiredWorkLocation]);
      if (therapist.experience) props["Experience"] = t.richText(`${therapist.experience} years`);
      if (therapist.dateOfBirth) props["Date of Birth"] = t.dateOnly(therapist.dateOfBirth);
      if (therapist.placeOfBirth) props["Place of Birth"] = t.richText(therapist.placeOfBirth);
      if (therapist.nationality) {
        props["Nationality"] = t.multiSelect([therapist.nationality]);
        props["Origin Country"] = t.multiSelect([therapist.nationality]);
      }
      if (therapist.skills?.length) props["Skills"] = t.multiSelect(therapist.skills);
      if (therapist.youtubeUrl) props["YouTube URL"] = { url: therapist.youtubeUrl };
      if (therapist.address) props["Origin Address"] = t.richText(therapist.address);
      if (therapist.addressLocal) props["Origin Address (Local Language)"] = t.richText(therapist.addressLocal);
      props["Spa Company Profile"] = { url: profileUrl };
      if (recruiterUserId) props["Recruiter"] = t.people([recruiterUserId]);
      return props;
    }

    if (mode === "create") {
      const candidateProps = {
        Name: t.title(`${scNumber} - ${therapist.name}`),
        "Candidate Status": t.status("WAITING FOR APPROVAL"),
        "Job Title / Position": t.select("MASSAGE"),
        ...buildCandidateProps(),
      };

      const page = await notion.pages.create({
        parent: { database_id: CANDIDATES_DB_ID },
        properties: candidateProps,
      });

      candidatePageId = page.id;
    } else if (mode === "attach") {
      if (!candidatePageId) {
        throw new HttpsError("invalid-argument", "notionPageId is required for attach mode.");
      }

      // Overwrite existing candidate fields with OCR/form data
      await notion.pages.update({
        page_id: candidatePageId,
        properties: buildCandidateProps(),
      });
    }

    // Create document entries in Documents DB (linked to candidate)
    const docResults = [];
    if (documents && candidatePageId) {
      const docTypes = [
        { key: "passport", notionType: "Passport" },
        { key: "idCard", notionType: "Country ID Card" },
        { key: "certificate", notionType: "Profession Certificate" },
        { key: "cv", notionType: "CV / Resume" },
      ];

      for (const { key, notionType } of docTypes) {
        const docUrl = documents[key];
        if (!docUrl) continue;

        try {
          const docProps = {
            Name: t.title(`${notionType} - SC-${scNumber}`),
            Type: t.select(notionType),
            Candidate: t.relation([candidatePageId]),
            Attachment: {
              files: [
                {
                  type: "external",
                  name: `${notionType}.pdf`,
                  external: { url: docUrl },
                },
              ],
            },
            Status: t.status("Completed"),
          };

          // Add passport-specific fields from OCR
          if (key === "passport" && therapist.passportNumber) {
            docProps["Document ID / PIN"] = t.richText(therapist.passportNumber);
          }
          if (key === "idCard" && therapist.idCardNumber) {
            docProps["Document ID / PIN"] = t.richText(therapist.idCardNumber);
          }

          const docPage = await notion.pages.create({
            parent: { database_id: DOCUMENTS_DB_ID },
            properties: docProps,
          });
          docResults.push({ type: notionType, pageId: docPage.id, success: true });
        } catch (err) {
          docResults.push({ type: notionType, error: err.message, success: false });
        }
      }
    }

    return {
      success: true,
      candidatePageId,
      profileUrl,
      documentsCreated: docResults,
    };
  }
);
