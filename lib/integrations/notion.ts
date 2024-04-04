"use server";

import { getUser } from "@/lib/user";
import { Client } from "@notionhq/client";
import { getIntegrationByTool } from "../utils";

export const searchNotionDatabase = async (query: string) => {
	console.log("query", query);
	const user = await getUser();
	const notionIntegration = getIntegrationByTool(user, "notion");
	console.log("integration", notionIntegration);
	if (!notionIntegration) return null;
	const notion = new Client({ auth: notionIntegration.access_token! });

	const res = await notion.search({
		query,
		filter: {
			value: "database",
			property: "object",
		},
	});
	console.log("🚀 ~ searchNotionDatabase ~ res:", res);
	return res;
};
