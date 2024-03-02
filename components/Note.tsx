import React from "react";

import { MDXRemote } from "next-mdx-remote/rsc";

import type { Note } from "@/db/schema/index";

export default function Note({ note }: { note: Note }) {
	return (
		<DefaultWrapper>
			<h2>{note.title || ""}</h2>
			<MDXRemote source={note.content} />
		</DefaultWrapper>
	);
}

interface DefaultWrapperProps extends React.ComponentPropsWithoutRef<"div"> {}
export function DefaultWrapper({ children, ...props }: DefaultWrapperProps) {
	return (
		<div className="h-screen xl:w-1/4 flex justify-center items-center ">
			<div className="bg-card text-card-foreground rounded-md p-8 space-y-5 snap-center">{children}</div>
		</div>
	);
}
