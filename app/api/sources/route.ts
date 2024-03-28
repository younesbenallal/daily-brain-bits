import { db } from "@/db";
import { sources, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, res: NextResponse) {
	const body = await req.json();
	const { apiKey, vaultName } = body;

	const user = await db.query.users.findFirst({ where: (users, { eq }) => eq(users.apiKey, apiKey) });

	if (user) {
		await db.insert(sources).values({ sourceName: "obsidian", userId: user.id, tokens: { vaultName } });
		return NextResponse.json({ status: "ok", userEmail: user.email });
	} else return NextResponse.json({ status: "nok" }, { status: 401 });
}

export async function OPTIONS(req: NextRequest, res: NextResponse) {
	return NextResponse.json({});
}
