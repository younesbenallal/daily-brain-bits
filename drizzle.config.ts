import type { Config } from "drizzle-kit";

export default {
	schema: "./db/schema/index.ts",
	out: "./db/drizzle",
	driver: "pg",
	dbCredentials: {
		connectionString: String(process.env.DB_URL),
	},
	verbose: true,
	strict: true,
} satisfies Config;
