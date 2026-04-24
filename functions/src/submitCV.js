import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getStorage } from "firebase-admin/storage";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { sendEmail } from "./lib/sendEmail.js";

export const submitCV = onCall(
  { invoker: "public", timeoutSeconds: 60 },
  async (request) => {
    const { name, phone, fileName, fileURL, storagePath } = request.data;

    if (!name || !phone || !storagePath) {
      throw new HttpsError("invalid-argument", "name, phone, and storagePath are required.");
    }

    const db = getFirestore();
    const bucket = getStorage().bucket();

    // Download file from Storage for email attachment
    const file = bucket.file(storagePath);
    const [fileBuffer] = await file.download();
    const contentBytes = fileBuffer.toString("base64");

    // Determine content type
    const ext = (fileName || storagePath).split(".").pop().toLowerCase();
    const contentTypeMap = {
      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
    };
    const contentType = contentTypeMap[ext] || "application/octet-stream";

    // Send email with CV attachment
    await sendEmail({
      to: ["lucy@spa-company.com"],
      subject: `New CV Submission — ${name}`,
      html: `
        <h2>New CV Submission — Spa Company Indonesia</h2>
        <table style="border-collapse:collapse; width:100%; max-width:600px;">
          <tr><td style="padding:8px; font-weight:bold;">Name</td><td style="padding:8px;">${name}</td></tr>
          <tr><td style="padding:8px; font-weight:bold;">WhatsApp</td><td style="padding:8px;">${phone}</td></tr>
          <tr><td style="padding:8px; font-weight:bold;">File</td><td style="padding:8px;"><a href="${fileURL}">${fileName || 'Download'}</a></td></tr>
        </table>
        <p style="margin-top:16px; color:#666; font-size:12px;">CV file is also attached to this email.</p>
      `,
      attachments: [
        {
          name: fileName || `cv.${ext}`,
          contentBytes,
          contentType,
        },
      ],
    });

    // Save record to Firestore
    await db.collection("cvSubmissions").add({
      name,
      phone,
      fileName,
      fileURL,
      storagePath,
      createdAt: Timestamp.now(),
    });

    return { success: true };
  }
);
