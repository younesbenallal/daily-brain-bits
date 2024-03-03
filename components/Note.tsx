import React from "react";

import { MDXRemote } from "next-mdx-remote/rsc";

import type { Note } from "@/db/schema/index";
import { DefaultWrapper } from "./default-wrapper";

export default function Note({ note }: { note: Note }) {
	return (
		<DefaultWrapper>
			<h2>{note.title || ""}</h2>
			<MDXRemote source={note.content} />
		</DefaultWrapper>
	);
}
