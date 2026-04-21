import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineString } from "firebase-functions/params";

const msTenantId = defineString("MS_TENANT_ID");
const msClientId = defineString("MS_CLIENT_ID");
const msClientSecret = defineString("MS_CLIENT_SECRET");
const msSenderEmail = defineString("MS_SENDER_EMAIL");

export const sendFormNotification = onCall({ invoker: "public" }, async (request) => {
  const { type, data, recipients, senderEmail } = request.data;

  if (!type || !data || !recipients?.length) {
    throw new HttpsError("invalid-argument", "type, data, and recipients are required.");
  }

  const allowedTypes = ["contact", "job"];
  if (!allowedTypes.includes(type)) {
    throw new HttpsError("invalid-argument", "Invalid form type.");
  }

  const subject = type === "contact"
    ? `New contact message from ${data.name || "Unknown"}`
    : `New job application from ${data.fullName || "Unknown"}`;

  const html = type === "contact"
    ? buildContactEmail(data)
    : buildJobEmail(data);

  const accessToken = await getMsGraphToken();

  const sender = senderEmail || msSenderEmail.value();
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${sender}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject,
          body: { contentType: "HTML", content: html },
          toRecipients: recipients.map((email) => ({
            emailAddress: { address: email },
          })),
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new HttpsError("internal", `Failed to send email: ${errorText}`);
  }

  return { success: true };
});

function buildContactEmail(d) {
  return `
    <h2>New Contact Form Submission — DMJ Europe</h2>
    <table style="border-collapse:collapse; width:100%; max-width:600px;">
      <tr><td style="padding:8px; font-weight:bold;">Name</td><td style="padding:8px;">${d.name || "—"}</td></tr>
      <tr><td style="padding:8px; font-weight:bold;">Email</td><td style="padding:8px;"><a href="mailto:${d.email}">${d.email || "—"}</a></td></tr>
      <tr><td style="padding:8px; font-weight:bold;">Company</td><td style="padding:8px;">${d.company || "—"}</td></tr>
      <tr><td style="padding:8px; font-weight:bold;">Phone</td><td style="padding:8px;">${d.phone || "—"}</td></tr>
      <tr><td style="padding:8px; font-weight:bold;">Message</td><td style="padding:8px;">${d.message || "—"}</td></tr>
    </table>
  `;
}

function buildJobEmail(d) {
  return `
    <h2>New Job Application — DMJ Europe</h2>
    <table style="border-collapse:collapse; width:100%; max-width:600px;">
      <tr><td style="padding:8px; font-weight:bold;">Full Name</td><td style="padding:8px;">${d.fullName || "—"}</td></tr>
      <tr><td style="padding:8px; font-weight:bold;">Nationality</td><td style="padding:8px;">${d.nationality || "—"}</td></tr>
      <tr><td style="padding:8px; font-weight:bold;">Email</td><td style="padding:8px;"><a href="mailto:${d.email}">${d.email || "—"}</a></td></tr>
      <tr><td style="padding:8px; font-weight:bold;">Phone</td><td style="padding:8px;">${d.phone || "—"}</td></tr>
      <tr><td style="padding:8px; font-weight:bold;">Country</td><td style="padding:8px;">${d.currentCountry || "—"}</td></tr>
      <tr><td style="padding:8px; font-weight:bold;">Visa Status</td><td style="padding:8px;">${d.visaStatus || "—"}</td></tr>
      <tr><td style="padding:8px; font-weight:bold;">Deployment Length</td><td style="padding:8px;">${d.deploymentLength || "—"} months</td></tr>
      <tr><td style="padding:8px; font-weight:bold;">Current Salary</td><td style="padding:8px;">&euro;${d.currentSalary || "—"}/mo</td></tr>
      <tr><td style="padding:8px; font-weight:bold;">Expected Salary</td><td style="padding:8px;">&euro;${d.expectedSalary || "—"}/mo</td></tr>
      <tr><td style="padding:8px; font-weight:bold;">Industry</td><td style="padding:8px;">${d.industry || "—"}</td></tr>
      <tr><td style="padding:8px; font-weight:bold;">Availability</td><td style="padding:8px;">${d.availability || "—"}</td></tr>
      ${d.message ? `<tr><td style="padding:8px; font-weight:bold;">Message</td><td style="padding:8px;">${d.message}</td></tr>` : ""}
    </table>
  `;
}

async function getMsGraphToken() {
  const tokenUrl = `https://login.microsoftonline.com/${msTenantId.value()}/oauth2/v2.0/token`;

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: msClientId.value(),
      client_secret: msClientSecret.value(),
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new HttpsError("internal", `Failed to get MS Graph token: ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}
