import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { defineString } from "firebase-functions/params";

const msTenantId = defineString("MS_TENANT_ID");
const msClientId = defineString("MS_CLIENT_ID");
const msClientSecret = defineString("MS_CLIENT_SECRET");
const msSenderEmail = defineString("MS_SENDER_EMAIL");

const ALLOWED_DOMAINS = ["spa-company.com", "spacompany-indonesia.com", "dmjeurope.com"];
const CODE_EXPIRY_MINUTES = 10;

export const sendLoginCode = onCall({ invoker: "public" }, async (request) => {
  const { email } = request.data;

  if (!email || typeof email !== "string") {
    throw new HttpsError("invalid-argument", "Email is required.");
  }

  const domain = email.split("@")[1]?.toLowerCase();
  if (!ALLOWED_DOMAINS.includes(domain)) {
    throw new HttpsError(
      "permission-denied",
      "Only @spa-company.com, @spacompany-indonesia.com, and @dmjeurope.com emails are allowed."
    );
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = Timestamp.fromMillis(
    Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000
  );

  const db = getFirestore();
  await db.collection("loginCodes").add({
    email: email.toLowerCase(),
    code,
    expiresAt,
    used: false,
    createdAt: Timestamp.now(),
  });

  // Send email via Microsoft Graph API
  const accessToken = await getMsGraphToken();

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${msSenderEmail.value()}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject: "Your login code for Spa Company Intake",
          body: {
            contentType: "HTML",
            content: `
              <h2>Your login code</h2>
              <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px;">${code}</p>
              <p>This code expires in ${CODE_EXPIRY_MINUTES} minutes.</p>
              <p>If you didn't request this code, you can safely ignore this email.</p>
            `,
          },
          toRecipients: [
            { emailAddress: { address: email } },
          ],
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

/**
 * Get an access token from Microsoft identity platform using client credentials flow.
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
    throw new HttpsError("internal", `Failed to get MS Graph token: ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}
