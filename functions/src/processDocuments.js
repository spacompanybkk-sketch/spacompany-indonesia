import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getStorage } from "firebase-admin/storage";
import Anthropic from "@anthropic-ai/sdk";
import { defineString } from "firebase-functions/params";
import { PASSPORT_PROMPT, CV_PROMPT, ID_CARD_PROMPT } from "./lib/ocrPrompts.js";

const anthropicKey = defineString("ANTHROPIC_API_KEY");

/**
 * Process a single document via OCR.
 * Accepts: { docType: "passport" | "idCard" | "cv", fileUrl: string }
 * Returns: extracted JSON fields
 */
export const processDocuments = onCall(
  { timeoutSeconds: 120 },
  async (request) => {
    const { docType, fileUrl, passportUrl, cvUrl } = request.data;

    const client = new Anthropic({ apiKey: anthropicKey.value() });

    // New single-document mode
    if (docType && fileUrl) {
      const prompt = docType === "passport" ? PASSPORT_PROMPT
        : docType === "idCard" ? ID_CARD_PROMPT
        : docType === "cv" ? CV_PROMPT
        : null;

      if (!prompt) {
        throw new HttpsError("invalid-argument", `Unknown docType: ${docType}`);
      }

      const buffer = await downloadFromStorage(fileUrl);
      const base64 = buffer.toString("base64");
      // Detect PDF by magic bytes (%PDF) or URL
      const isPdf = buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
      const mediaType = isPdf ? "application/pdf" : "image/jpeg";
      console.log(`OCR: docType=${docType}, isPdf=${isPdf}, bufferSize=${buffer.length}, firstBytes=${buffer.slice(0,4).toString('hex')}`);

      const response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: [
              {
                type: mediaType === "application/pdf" ? "document" : "image",
                source: { type: "base64", media_type: mediaType, data: base64 },
              },
              { type: "text", text: prompt },
            ],
          },
        ],
      });

      try {
        const text = response.content[0].text;
        console.log("OCR raw response:", text.slice(0, 500));
        // Try to extract JSON from response (may be wrapped in markdown code blocks)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          return { success: false, error: "No JSON found in OCR response", raw: text.slice(0, 300) };
        }
        return { success: true, data: JSON.parse(jsonMatch[0]) };
      } catch (e) {
        return { success: false, error: "Failed to parse OCR response", raw: response.content[0]?.text?.slice(0, 300) };
      }
    }

    // Legacy mode: passport + CV (for intake page compatibility)
    if (!passportUrl) {
      throw new HttpsError("invalid-argument", "Either docType+fileUrl or passportUrl is required.");
    }

    const results = { passport: null, cv: null, detectedCountry: null };

    const passportBuffer = await downloadFromStorage(passportUrl);
    const passportBase64 = passportBuffer.toString("base64");
    const passportMediaType = passportUrl.split("?")[0].toLowerCase().includes(".pdf") ? "application/pdf" : "image/jpeg";

    const passportResponse = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: passportMediaType === "application/pdf" ? "document" : "image",
              source: { type: "base64", media_type: passportMediaType, data: passportBase64 },
            },
            { type: "text", text: PASSPORT_PROMPT },
          ],
        },
      ],
    });

    try {
      results.passport = JSON.parse(passportResponse.content[0].text);
      results.detectedCountry = results.passport.issuingCountry || null;
    } catch (e) {
      results.passport = { error: "Failed to parse passport OCR response" };
    }

    if (cvUrl) {
      const cvBuffer = await downloadFromStorage(cvUrl);
      const cvBase64 = cvBuffer.toString("base64");
      const cvMediaType = cvUrl.split("?")[0].toLowerCase().includes(".pdf") ? "application/pdf" : "image/jpeg";

      const cvResponse = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: [
              {
                type: cvMediaType === "application/pdf" ? "document" : "image",
                source: { type: "base64", media_type: cvMediaType, data: cvBase64 },
              },
              { type: "text", text: CV_PROMPT },
            ],
          },
        ],
      });

      try {
        results.cv = JSON.parse(cvResponse.content[0].text);
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
