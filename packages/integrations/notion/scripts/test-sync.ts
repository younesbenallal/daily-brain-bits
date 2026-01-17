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
		console.log(`- Initial cursor: ${result.initialCursor}`);
		console.log(`- Initial items: ${result.initialItems}`);
		console.log(`- Incremental items: ${result.incrementalItems}`);
		console.log(`- Missing IDs: ${result.missingPageIds.length}`);
		console.log(`- Extra IDs: ${result.extraPageIds.length}`);
		if (result.missingPageIds.length > 0) {
			console.log("Missing page IDs:");
			console.log(result.missingPageIds.join("\n"));
			process.exit(1);
		}
		if (result.extraPageIds.length > 0) {
			console.log("Extra page IDs:");
			console.log(result.extraPageIds.join("\n"));
			process.exit(1);
		}
	})
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
