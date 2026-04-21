import { defineString } from "firebase-functions/params";

const msTenantId = defineString("MS_TENANT_ID");
const msClientId = defineString("MS_CLIENT_ID");
const msClientSecret = defineString("MS_CLIENT_SECRET");
const msSenderEmail = defineString("MS_SENDER_EMAIL");

/**
 * Acquires an MS Graph access token using client credentials flow.
 */
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
    throw new Error(`Failed to get MS Graph token: ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Sends an email via Microsoft Graph API.
 *
 * @param {Object} params
 * @param {string[]} params.to - recipient email addresses
 * @param {string} params.subject - email subject
 * @param {string} params.html - HTML body content
 * @param {Array<{name: string, contentBytes: string, contentType: string}>} [params.attachments] - optional file attachments (contentBytes is base64)
 */
export async function sendEmail({ to, subject, html, attachments = [] }) {
  const accessToken = await getMsGraphToken();
  const sender = msSenderEmail.value();

  const message = {
    subject,
    body: { contentType: "HTML", content: html },
    toRecipients: to.map((email) => ({
      emailAddress: { address: email },
    })),
  };

  if (attachments.length > 0) {
    message.attachments = attachments.map((att) => ({
      "@odata.type": "#microsoft.graph.fileAttachment",
      name: att.name,
      contentBytes: att.contentBytes,
      contentType: att.contentType,
    }));
  }

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${sender}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send email via MS Graph: ${errorText}`);
  }

  return { success: true };
}
