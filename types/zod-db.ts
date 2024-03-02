import { z } from "zod";

export const Note = z.object({
	title: z.string(),
	content: z.string(),
	properties: z.record(z.string(), z.any()).optional(),
	links: z
		.array(
			z.object({
				link: z.string(),
				original: z.string(),
				displayText: z.string(),
				position: z.object({
					start: z.object({ line: z.number(), col: z.number(), offset: z.number() }),
					end: z.object({ line: z.number(), col: z.number(), offset: z.number() }),
				}),
			})
		)
		.optional(),
});

export const ArrayOfNotes = z.array(Note);

export type TNote = z.infer<typeof Note>;
