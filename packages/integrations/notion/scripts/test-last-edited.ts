import { Client } from "@notionhq/client";
import { runNotionLastEditedTimeTest } from "../src/testing";

const DATABASE_ID = "2de3d5af15788012bb9dca6175b2ad0f";

const token = process.env.NOTION_API_KEY ?? process.env.NOTION_TOKEN ?? "";
const databaseId = process.env.NOTION_DATABASE_ID ?? DATABASE_ID;

if (!token) {
  console.error("Missing NOTION_API_KEY or NOTION_TOKEN environment variable.");
  process.exit(1);
}

if (!databaseId || databaseId === "REPLACE_ME") {
  console.error("Set DATABASE_ID in the script or provide NOTION_DATABASE_ID.");
  process.exit(1);
}

const notion = new Client({ auth: token });

runNotionLastEditedTimeTest({
  notion,
  databaseId,
  log: (message) => {
    console.log(message);
  },
})
  .then((result) => {
    console.log("Last edited time test complete.");
    console.log(`- Baseline: ${result.baselineIso}`);
    console.log(`- Filter after: ${result.filterAfterIso}`);
    console.log(`- Expected IDs: ${result.expectedPageIds.length}`);
    console.log(`- Returned IDs: ${result.returnedPageIds.length}`);
    console.log(`- Missing IDs: ${result.missingPageIds.length}`);
    console.log(`- Extra IDs: ${result.extraPageIds.length}`);
    if (result.pageEditTimes.length > 0) {
      console.log("Observed last_edited_time values:");
      for (const entry of result.pageEditTimes) {
        console.log(`${entry.pageId} -> ${entry.lastEditedTime}`);
      }
    }

    if (result.missingPageIds.length > 0) {
      console.log("Missing page IDs:");
      console.log(result.missingPageIds.join("\n"));
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
