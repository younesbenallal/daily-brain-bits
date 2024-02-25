import React from "react";

import { crimson } from "@/app/layout";
import { MDXRemote } from "next-mdx-remote/rsc";

import type { Note } from "@/db/schema/index";

export default function Note({ note }: { note: Note }) {
	return (
		<div className="h-screen xl:w-1/4 flex justify-center items-center">
			<div className="bg-card text-card-foreground rounded-md px-9 py-11 space-y-2">
				<h2 className={crimson.className + " font-semibold text-primary-600 text-3xl"}>{note.title || ""}</h2>
				<MDXRemote source={note.content} />
			</div>
		</div>
	);
}
