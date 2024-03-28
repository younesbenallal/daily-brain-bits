import { db } from "@/db";
import { notes } from "@/db/schema";

import Note from "@/components/note";
import { redirect } from "next/navigation";

import { getOrCreateUser } from "../actions/users";

export default async function Home() {
	const user = await getOrCreateUser();
	if (!user) return redirect("/login");
	if (!user.isOnboarded) return redirect("/onboarding");

	const notesOfTheDay = await db.select().from(notes);

	return new Array(5).fill(null).map((i) => {
		const note = notesOfTheDay[getRandomInt(notesOfTheDay.length)];
		return <Note key={note.title} note={note} />;
	});
}

const getRandomInt = (max: number) => Math.floor(Math.random() * max);
