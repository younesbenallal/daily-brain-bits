import { db } from "@/db";
import { notes, users } from "@/db/schema";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

import Note from "@/components/note";
import { redirect } from "next/navigation";

import { eq } from "drizzle-orm";

import bcrypt from "bcrypt";

export default async function Home() {
	const { isAuthenticated, getUser } = getKindeServerSession();

	if (!isAuthenticated) return redirect("/login");
	const kindeUser = (await getUser())!;

	const user = (await db.select().from(users).where(eq(users.id, kindeUser.id)))[0];
	if (!user) {
		const apiKey = await generateApiKey();
		await db.insert(users).values({ id: kindeUser.id, email: kindeUser.email!, apiKey });
	}

	console.log("🚀 ~ Home ~ user:", user, kindeUser);

	if (!user.isOnboarded) return redirect("/onboarding");

	const notesOfTheDay = await db.select().from(notes);

	return new Array(5).fill(null).map((i) => {
		const note = notesOfTheDay[getRandomInt(notesOfTheDay.length)];
		return <Note key={note.title} note={note} />;
	});
}

const getRandomInt = (max: number) => Math.floor(Math.random() * max);

const generateApiKey = async () => {
	const saltRounds = 10;
	const token = crypto.randomUUID();
	return await bcrypt.hash(token, saltRounds);
};
