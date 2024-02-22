import { z } from "zod";

export const Note = z.object({
	title: z.string(),
	content: z.string(),
});

export const ArrayOfNotes = z.array(Note);

export type TNote = z.infer<typeof Note>;
