import { account, db, integrationConnections, integrationScopeItems } from "@daily-brain-bits/db";
import { ORPCError } from "@orpc/server";
import { and, desc, eq, notInArray } from "drizzle-orm";
import { z } from "zod";
import { sessionRoute } from "../context";
import { syncNotionConnection } from "../domains/notion/sync-connection";

const notionDatabaseSchema = z.object({
	id: z.string().min(1),
	title: z.string().min(1),
	icon: z.string().nullable().optional(),
	url: z.string().nullable().optional(),
});

const notionStatusSchema = z.object({
	connected: z.boolean(),
	workspaceName: z.string().nullable().optional(),
	workspaceIcon: z.string().nullable().optional(),
	databases: z.array(notionDatabaseSchema),
});

type NotionConnectionTokens = {
	accessToken: string;
	refreshToken?: string | null;
};

type NotionConnectionConfig = {
	workspaceId?: string | null;
	workspaceName?: string | null;
	workspaceIcon?: string | null;
};

type NotionDatabaseResult = {
	id?: string;
	url?: string;
	title?: Array<{ plain_text?: string }>;
	icon?: {
		type?: "emoji" | "file" | "external";
		emoji?: string;
		file?: { url?: string };
		external?: { url?: string };
	} | null;
};

function parseConnectionConfig(value: unknown): NotionConnectionConfig {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		return {};
	}

	const record = value as Record<string, unknown>;
	return {
		workspaceId: typeof record.workspaceId === "string" ? record.workspaceId : null,
		workspaceName: typeof record.workspaceName === "string" ? record.workspaceName : null,
		workspaceIcon: typeof record.workspaceIcon === "string" ? record.workspaceIcon : null,
	};
}

function resolveNotionTitle(title: NotionDatabaseResult["title"]): string {
	if (!title || title.length === 0) {
		return "Untitled database";
	}
	const value = title
		.map((item) => item?.plain_text ?? "")
		.join("")
		.trim();
	return value.length > 0 ? value : "Untitled database";
}

function resolveNotionIcon(icon: NotionDatabaseResult["icon"]): string | null {
	if (!icon) {
		return null;
	}
	if (icon.type === "emoji" && icon.emoji) {
		return icon.emoji;
	}
	if (icon.type === "external" && icon.external?.url) {
		return icon.external.url;
	}
	if (icon.type === "file" && icon.file?.url) {
		return icon.file.url;
	}
	return null;
}

async function getActiveNotionConnection(userId: string) {
	const connections = await db
		.select({
			id: integrationConnections.id,
			accountExternalId: integrationConnections.accountExternalId,
			displayName: integrationConnections.displayName,
			configJson: integrationConnections.configJson,
			updatedAt: integrationConnections.updatedAt,
		})
		.from(integrationConnections)
		.where(and(eq(integrationConnections.userId, userId), eq(integrationConnections.kind, "notion"), eq(integrationConnections.status, "active")))
		.orderBy(desc(integrationConnections.updatedAt))
		.limit(1);

	const connection = connections[0] ?? null;
	if (!connection) {
		return null;
	}

	const [accountRow] = await db
		.select({
			accessToken: account.accessToken,
			refreshToken: account.refreshToken,
		})
		.from(account)
		.where(and(eq(account.userId, userId), eq(account.providerId, "notion"), eq(account.accountId, connection.accountExternalId)))
		.limit(1);

	const tokens: NotionConnectionTokens | null = accountRow?.accessToken
		? {
				accessToken: accountRow.accessToken,
				refreshToken: accountRow.refreshToken ?? null,
			}
		: null;

	if (!tokens) {
		return null;
	}

	return { connection, tokens };
}

async function searchNotionDatabases(accessToken: string, query?: string | null) {
	const response = await fetch("https://api.notion.com/v1/search", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${accessToken}`,
			"Notion-Version": "2022-06-28",
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			query: query && query.length > 0 ? query : undefined,
			filter: {
				property: "object",
				value: "database",
			},
			page_size: 25,
		}),
	});

	if (!response.ok) {
		const errorBody = await response.text();
		throw new ORPCError("BAD_REQUEST", {
			message: "notion_search_failed",
			cause: errorBody,
		});
	}

	const payload = (await response.json()) as { results?: NotionDatabaseResult[] };
	return payload.results ?? [];
}

const status = sessionRoute
	.input(z.object({}).optional())
	.output(notionStatusSchema)
	.handler(async ({ context }) => {
		const userId = context.user?.id;
		if (!userId) {
			throw new ORPCError("Unauthorized");
		}

		const connectionBundle = await getActiveNotionConnection(userId);
		if (!connectionBundle) {
			return {
				connected: false,
				workspaceName: null,
				workspaceIcon: null,
				databases: [],
			};
		}

		const scopeItems = await db
			.select({
				scopeValue: integrationScopeItems.scopeValue,
				metadataJson: integrationScopeItems.metadataJson,
			})
			.from(integrationScopeItems)
			.where(
				and(
					eq(integrationScopeItems.connectionId, connectionBundle.connection.id),
					eq(integrationScopeItems.scopeType, "notion_database"),
					eq(integrationScopeItems.enabled, true),
				),
			);

		const databases = scopeItems.map((item) => {
			const metadata =
				item.metadataJson && typeof item.metadataJson === "object" && !Array.isArray(item.metadataJson)
					? (item.metadataJson as { title?: string; icon?: string | null; url?: string | null })
					: {};
			return {
				id: item.scopeValue,
				title: metadata.title ?? "Untitled database",
				icon: metadata.icon ?? null,
				url: metadata.url ?? null,
			};
		});

		const config = parseConnectionConfig(connectionBundle.connection.configJson);

		return {
			connected: true,
			workspaceName: config.workspaceName ?? null,
			workspaceIcon: config.workspaceIcon ?? null,
			databases,
		};
	});

const searchDatabases = sessionRoute
	.input(
		z.object({
			query: z.string().optional().nullable(),
		}),
	)
	.output(z.object({ databases: z.array(notionDatabaseSchema) }))
	.handler(async ({ context, input }) => {
		const userId = context.user?.id;
		if (!userId) {
			throw new ORPCError("Unauthorized");
		}

		const connectionBundle = await getActiveNotionConnection(userId);
		if (!connectionBundle) {
			throw new ORPCError("NOT_FOUND", { message: "notion_not_connected" });
		}

		const results = await searchNotionDatabases(connectionBundle.tokens.accessToken, input.query);
		const databases = results
			.filter((item) => typeof item.id === "string")
			.map((item) => ({
				id: item.id as string,
				title: resolveNotionTitle(item.title),
				icon: resolveNotionIcon(item.icon),
				url: item.url ?? null,
			}));

		return { databases };
	});

const setDatabases = sessionRoute
	.input(
		z.object({
			databases: z.array(notionDatabaseSchema),
		}),
	)
	.output(z.object({ saved: z.number() }))
	.handler(async ({ context, input }) => {
		const userId = context.user?.id;
		if (!userId) {
			throw new ORPCError("Unauthorized");
		}

		const connectionBundle = await getActiveNotionConnection(userId);
		if (!connectionBundle) {
			throw new ORPCError("NOT_FOUND", { message: "notion_not_connected" });
		}

		const connectionId = connectionBundle.connection.id;
		const now = new Date();
		const selectedIds = input.databases.map((database) => database.id);

		if (selectedIds.length > 0) {
			await db
				.update(integrationScopeItems)
				.set({
					enabled: false,
					updatedAt: now,
				})
				.where(
					and(
						eq(integrationScopeItems.connectionId, connectionId),
						eq(integrationScopeItems.scopeType, "notion_database"),
						notInArray(integrationScopeItems.scopeValue, selectedIds),
					),
				);
		} else {
			await db
				.update(integrationScopeItems)
				.set({
					enabled: false,
					updatedAt: now,
				})
				.where(and(eq(integrationScopeItems.connectionId, connectionId), eq(integrationScopeItems.scopeType, "notion_database")));
		}

		for (const database of input.databases) {
			await db
				.insert(integrationScopeItems)
				.values({
					connectionId,
					scopeType: "notion_database",
					scopeValue: database.id,
					enabled: true,
					metadataJson: {
						title: database.title,
						icon: database.icon ?? null,
						url: database.url ?? null,
					},
					updatedAt: now,
				})
				.onConflictDoUpdate({
					target: [integrationScopeItems.connectionId, integrationScopeItems.scopeType, integrationScopeItems.scopeValue],
					set: {
						enabled: true,
						metadataJson: {
							title: database.title,
							icon: database.icon ?? null,
							url: database.url ?? null,
						},
						updatedAt: now,
					},
				});
		}

		return { saved: input.databases.length };
	});

const syncNow = sessionRoute
	.input(z.object({}).optional())
	.output(
		z.object({
			success: z.boolean(),
			databasesSynced: z.number(),
			totalDocumentsImported: z.number(),
		}),
	)
	.handler(async ({ context }) => {
		const userId = context.user?.id;
		if (!userId) {
			throw new ORPCError("Unauthorized");
		}

		const connectionBundle = await getActiveNotionConnection(userId);
		if (!connectionBundle) {
			throw new ORPCError("NOT_FOUND", { message: "notion_not_connected" });
		}

		const result = await syncNotionConnection({
			connectionId: connectionBundle.connection.id,
			userId,
			tokens: connectionBundle.tokens,
			syncKind: "manual",
		});

		if (!result.success) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", { message: result.error ?? "sync_failed" });
		}

		return {
			success: result.success,
			databasesSynced: result.databasesSynced,
			totalDocumentsImported: result.totalDocumentsImported,
		};
	});

export const notionRouter = {
	status,
	databases: {
		search: searchDatabases,
		set: setDatabases,
	},
	sync: {
		now: syncNow,
	},
};
