import Note from "@/components/note";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function Home() {
	const supabase = createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	console.log("user dash", user);

	if (!user) {
		return redirect("/login");
	}
	/* const user = await getOrCreateUser();
	if (!user) return redirect("/login");
	if (!user.isOnboarded) return redirect("/onboarding");

	const notesOfTheDay = await db.select().from(notes);

	return new Array(5).fill(null).map((i) => {
		const note = notesOfTheDay[getRandomInt(notesOfTheDay.length)];
		return <Note key={note.title} note={note} />;
	}); */
	return (
		<>
			<Note note={{ title: "Test", content: "This is a test" }}></Note>
		</>
	);
}

const getRandomInt = (max: number) => Math.floor(Math.random() * max);
