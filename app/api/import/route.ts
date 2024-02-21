import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, res: NextResponse) {
	const body = await req.json();
	console.log(body);
	console.log(process.env.NODE_ENV);
	console.log(process.env.DB_USER);

	return NextResponse.json({ message: "ok" });
}

export async function OPTIONS(req: NextRequest, res: NextResponse) {
	return NextResponse.json({});
}
