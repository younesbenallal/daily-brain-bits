import { withAuth } from "@kinde-oss/kinde-auth-nextjs/middleware";
import { NextRequest } from "next/server";

export default function middleware(req: NextRequest) {
	return withAuth(req, { loginPage: "/login" });
}
export const config = {
	matcher: [
		{
			source: "/((?!login|_next|favicon.ico|public|logo.svg|api/auth).*)",
			missing: [
				{ type: "header", key: "next-router-prefetch" },
				{ type: "header", key: "purpose", value: "prefetch" },
			],
		},
	],
};
