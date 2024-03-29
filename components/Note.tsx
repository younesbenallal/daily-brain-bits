import React from "react";

import { MDXRemote } from "next-mdx-remote/rsc";

import { DefaultWrapper } from "./default-wrapper";
import { Todo } from "@/types/lib";

export default function Note({ note }: { note: Todo }) {
	return (
		<DefaultWrapper>
			<h2>{note.title || ""}</h2>
			<MDXRemote source={note.content} />
		</DefaultWrapper>
	);
}
