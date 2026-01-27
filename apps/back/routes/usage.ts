import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { baseRoute } from "../context";
import { countUserConnections, countUserDocuments } from "../utils/entitlements";

const usageSchema = z.object({
	noteCount: z.number().int(),
	sourceCount: z.number().int(),
});

const get = baseRoute
	.input(z.object({}).optional())
	.output(z.object({ usage: usageSchema }))
	.handler(async ({ context }) => {
		const userId = context.user?.id;
		if (!userId) {
			throw new ORPCError("Unauthorized");
		}

		const [noteCount, sourceCount] = await Promise.all([countUserDocuments(userId), countUserConnections(userId)]);

		return {
			usage: {
				noteCount,
				sourceCount,
			},
		};
	});

export const usageRouter = {
	get,
};
