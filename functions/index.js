import { initializeApp } from "firebase-admin/app";

initializeApp();

export { sendLoginCode } from "./src/sendLoginCode.js";
export { verifyLoginCode } from "./src/verifyLoginCode.js";
export { processDocuments } from "./src/processDocuments.js";
export { submitToNotion } from "./src/submitToNotion.js";
export { importFromNotion } from "./src/importFromNotion.js";
export { migrateTherapists } from "./src/migrateTherapists.js";
export { enrichFromNotion } from "./src/enrichFromNotion.js";
export { createTherapistInNotion } from "./src/createTherapistInNotion.js";
export { sendFormNotification } from "./src/sendFormNotification.js";
