import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, res: NextResponse) {
	const body = await req.json();
	const { apiKey, vaultName } = body;

	/* if (user) {
		await db.insert(integrations).values({ integrationName: "obsidian", userId: user.id, tokens: { vaultName } });
		return NextResponse.json({ status: "ok", userEmail: user.email });
	} else return NextResponse.json({ status: "nok" }, { status: 401 }); */
}

export async function OPTIONS(req: NextRequest, res: NextResponse) {
	return NextResponse.json({});
}
