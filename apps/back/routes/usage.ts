import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { sessionRoute } from "../context";
import { countUserConnections, countUserDocuments } from "../domains/billing/entitlements";

const usageSchema = z.object({
	noteCount: z.number().int(),
	sourceCount: z.number().int(),
});

const get = sessionRoute
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
