import { initializeApp } from "firebase-admin/app";

initializeApp();

export { sendLoginCode } from "./src/sendLoginCode.js";
export { verifyLoginCode } from "./src/verifyLoginCode.js";
export { sendFormNotification } from "./src/sendFormNotification.js";
export { fetchJobs } from "./src/fetchJobs.js";
export { importJobs } from "./src/importJobs.js";
export { submitCV } from "./src/submitCV.js";
