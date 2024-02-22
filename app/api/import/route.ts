import { NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { notes } from "@/db/schema";

import { ArrayOfNotes } from "@/types/zod-db";

export async function POST(req: NextRequest, res: NextResponse) {
	const body = await req.json();

	const validNotes = ArrayOfNotes.parse(body.notes);

	await db.insert(notes).values(validNotes);

	return NextResponse.json({ message: "ok" });
}

export async function OPTIONS(req: NextRequest, res: NextResponse) {
	return NextResponse.json({});
}
