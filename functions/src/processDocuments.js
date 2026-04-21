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

async function downloadFromStorage(downloadUrl) {
  const bucket = getStorage().bucket();
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
