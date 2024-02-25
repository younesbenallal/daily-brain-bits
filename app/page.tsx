import { db } from "@/db";
import { notes } from "@/db/schema";

import Note from "@/components/Note";

export default async function Home() {
	const notesOfTheDay = (await db.select().from(notes)).slice(0, 5);
	console.log(notesOfTheDay);

	return (
		<main className="flex min-h-screen flex-col items-center">
			<div className="absolute top-[10%]">
				<img src="logo.svg" className="h-24 " />
			</div>

			{notesOfTheDay.map((note) => (
				<Note key={note.title} note={note} />
			))}
		</main>
	);
}
