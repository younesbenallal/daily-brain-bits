import { createClient } from "@/utils/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
	const requestUrl = new URL(request.url);
	console.log("🚀 ~ GET ~ requestUrl:", requestUrl);

	const code = requestUrl.searchParams.get("code");

	if (code) {
		const supabase = createClient();
		await supabase.auth.exchangeCodeForSession(code);
	}

	// URL to redirect to after sign in process completes
	return NextResponse.redirect(requestUrl.origin);
}
