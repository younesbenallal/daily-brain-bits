import app from "./server";
import { env } from "./utils/env";

const port = env.PORT ?? 3001;

export default {
	port,
	fetch: app.fetch,
};

console.log(`Server running on port ${port}`);
