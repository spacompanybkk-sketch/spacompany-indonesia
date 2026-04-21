import { Client } from "@notionhq/client";
import { defineString } from "firebase-functions/params";

const notionKey = defineString("NOTION_API_KEY");

let client = null;

export function getNotionClient() {
  if (!client) {
    client = new Client({ auth: notionKey.value() });
  }
  return client;
}

export const CANDIDATES_DB_ID = "54319f2e7f104dcf948026a862f24d53";
export const DOCUMENTS_DB_ID = "300792677686803ba3b6e466a750b828";
export const JOBS_DB_ID = "6b4acaab9e5a4db6a17cc6ba6ca01743";
