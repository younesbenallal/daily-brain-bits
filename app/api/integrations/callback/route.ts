import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, res: NextResponse) {
	const requestUrl = new URL(req.url);
	const supabase = createClient();

	const {
		data: { user },
		error,
	} = await supabase.auth.getUser();

	if (!user || error) return NextResponse.redirect(requestUrl.origin + "/onboarding/?error=Could not authenticate user");

	const code = requestUrl.searchParams.get("code");

	console.log("code", code);
	console.log("user", user);
	const encoded = Buffer.from(`${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_SECRET_ID}`).toString("base64");

	// Exchange the authorization code for an access token
	const tokenResponse = await fetch("https://api.notion.com/v1/oauth/token", {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			Authorization: `Basic ${encoded}`,
		},
		body: JSON.stringify({
			grant_type: "authorization_code",
			code,
			redirect_uri: "http://localhost:4000/api/integrations/callback",
		}),
	});

	const { access_token, workspace_id, workspace_icon, workspace_name, ...tokens } = await tokenResponse.json();

	console.log({ access_token, workspace_id, workspace_icon, workspace_name, ...tokens });

	//console.log(await tokenResponse.json());

	await supabase
		.from("integrations")
		.upsert({ tool_name: "notion", access_token, user_id: user.id, metadata: { workspace_icon, workspace_id, workspace_name } });
	// Redirect the user to a success page or back to your app

	return NextResponse.redirect(requestUrl.origin + "/onboarding");
}
