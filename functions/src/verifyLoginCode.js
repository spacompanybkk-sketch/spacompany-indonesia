import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { randomUUID } from "crypto";

const SESSION_EXPIRY_HOURS = 48;

export const verifyLoginCode = onCall(async (request) => {
  const { email, code } = request.data;

  if (!email || !code) {
    throw new HttpsError("invalid-argument", "Email and code are required.");
  }

  const db = getFirestore();
  const now = Timestamp.now();

  const codesSnap = await db
    .collection("loginCodes")
    .where("email", "==", email.toLowerCase())
    .where("code", "==", code)
    .where("used", "==", false)
    .limit(1)
    .get();

  if (codesSnap.empty) {
    throw new HttpsError("not-found", "Invalid or expired code.");
  }

  const codeDoc = codesSnap.docs[0];
  const codeData = codeDoc.data();

  if (codeData.expiresAt.toMillis() < now.toMillis()) {
    throw new HttpsError("deadline-exceeded", "Code has expired.");
  }

  await codeDoc.ref.update({ used: true });

  const ip = request.rawRequest?.ip || request.rawRequest?.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() || "unknown";

  const sessionToken = randomUUID();
  const expiresAt = Timestamp.fromMillis(
    Date.now() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000
  );

  await db.collection("sessions").add({
    email: email.toLowerCase(),
    ip,
    sessionToken,
    expiresAt,
    createdAt: Timestamp.now(),
  });

  return {
    sessionToken,
    email: email.toLowerCase(),
    expiresAt: expiresAt.toMillis(),
  };
});
