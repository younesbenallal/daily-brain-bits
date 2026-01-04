import { Client } from "@notionhq/client";
import { runNotionSelfTest } from "../src/testing";

const DATABASE_ID = "REPLACE_ME";

const token = process.env.NOTION_TOKEN ?? process.env.NOTION_API_KEY ?? "";
const databaseId = process.env.NOTION_DATABASE_ID ?? DATABASE_ID;

if (!token) {
  console.error("Missing NOTION_TOKEN or NOTION_API_KEY environment variable.");
  process.exit(1);
}

if (!databaseId || databaseId === "REPLACE_ME") {
  console.error("Set DATABASE_ID in the script or provide NOTION_DATABASE_ID.");
  process.exit(1);
}

const notion = new Client({ auth: token });

runNotionSelfTest({
  notion,
  databaseId,
  log: (message) => {
    console.log(message);
  },
})
  .then((result) => {
    console.log("Self-test complete.");
    console.log(`- Page: ${result.pageId}`);
    console.log(`- Before: ${result.beforeCount}`);
    console.log(`- After: ${result.afterCount}`);
    console.log(`- Added: ${result.added.length}`);
    console.log(`- Updated: ${result.updated.length}`);
    console.log(`- Removed: ${result.removed.length}`);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
