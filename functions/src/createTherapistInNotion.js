import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getNotionClient, CANDIDATES_DB_ID } from "./lib/notionClient.js";
import * as t from "./lib/notionTransforms.js";

export const createTherapistInNotion = onCall(
  { timeoutSeconds: 30 },
  async (request) => {
    const { therapist } = request.data;

    if (!therapist || !therapist.name) {
      throw new HttpsError("invalid-argument", "therapist data with name is required.");
    }

    const notion = getNotionClient();

    const candidateProps = {
      Name: t.title(`${therapist.scNumber} - ${therapist.name}`),
      "Name Surname": t.richText(therapist.name),
      "Candidate Status": t.status("WAITING FOR APPROVAL"),
      "Job Title / Position": t.select("MASSAGE"),
      "Nationality": t.multiSelect(["Thailand"]),
      "Origin Country": t.multiSelect(["Thailand"]),
    };

    // Optional fields
    if (therapist.phone) candidateProps["Phone Number"] = t.phoneNumber(therapist.phone);
    if (therapist.email) candidateProps["Email"] = t.email(therapist.email);
    if (therapist.location) candidateProps["Origin Address"] = t.richText(therapist.location);
    if (therapist.desiredWorkLocation) candidateProps["Would like to go"] = t.multiSelect([therapist.desiredWorkLocation]);
    if (therapist.experience) candidateProps["Experience"] = t.richText(`${therapist.experience} years`);

    try {
      const page = await notion.pages.create({
        parent: { database_id: CANDIDATES_DB_ID },
        properties: candidateProps,
      });

      return { success: true, notionPageId: page.id };
    } catch (err) {
      console.error("Notion create error:", err);
      throw new HttpsError("internal", `Failed to create in Notion: ${err.message}`);
    }
  }
);
